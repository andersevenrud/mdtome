/**
 * mdtome
 *
 * Copyright (c) 2018, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence MIT
 */
const {readFile, readFileSync, writeJson, writeFile, copy, ensureDir} = require('fs-extra');
const path = require('path');
const fg = require('fast-glob');
const hjs = require('highlight.js');
const ejs = require('ejs');
const yaml = require('js-yaml');
const marked = require('marked');
const {Renderer} = marked;
const minify = require('html-minifier').minify;
const signale = require('signale');
const deepmerge = require('deepmerge');
const xmlbuilder = require('xmlbuilder');
const webpack = require('webpack');
const root = process.cwd();
const npm = require(path.resolve(__dirname, '../package.json'));
const production = process.env.NODE_ENV === 'production';

/**
 * Creates the mdtome config
 */
const createConfig = config => deepmerge({
  input: path.resolve(root),
  output: path.resolve(root, '_book'),
  dist: path.resolve(__dirname, '..', 'dist'),
  verbose: false,
  watch: false,
  plugins: [],
  minify: {
    collapseWhitespace: true
  },
  marked: {
    breaks: false,
    smartLists: true,
    xhtml: true,
  },
  sitemap: {
    enabled: true,
    priority: 0.5,
    changefreq: 'weekly'
  },
  template: {
    title: 'mdtome',
    url: 'http://localhost',
    language: 'en',
    filename: path.resolve(__dirname, 'template.ejs'),
    scripts: [
      'main.js'
    ],
    styles: [
      'https://fonts.googleapis.com/css?family=Roboto:400,400i,700',
      'https://fonts.googleapis.com/css?family=Roboto+Mono:400,700',
      'main.css'
    ],
    resources: [
      'favicon.ico'
    ],
    metadata: {
      description: '',
      author: '',
      generator: `mdtome ${npm.version}`
    }
  }
}, config);

/**
 * Initializes plugins
 */
const initializePlugins = config => {
  const iface = instance => ({
    ...instance
  });

  const load = plugin => {
    try {
      if (typeof plugin === 'function') {
        return iface(plugin(config));
      } else if (typeof plugin === 'string') {
        return iface(require(plugin)(config));
      }
    } catch (e) {
      signale.warn(e);
    }

    return null;
  };

  const queue = config.plugins
    .map(load)
    .filter(plugin => !!plugin)
    .map(plugin => Promise.resolve(plugin));

  return Promise.all(queue);
};

/**
 * Compiles a list of markdown compiled files to html
 */
const renderHtml = (config, resolver, plugins) => base => (template, menu, metadata, markdown) => {
  const res = str => resolver.link(
    typeof str === 'function' ? str(config, metadata) : str,
    base
  );

  const data = {
    menu,
    menu_before: '', // TODO
    menu_after: '', // TODO
    body: markdown,
    body_before: '', // TODO
    body_after: '', // TODO
    header_before: '', // TODO
    header_after: '', // TODO
    scripts: config.template.scripts.map(res),
    styles: config.template.styles.map(res),
    baseTitle: config.template.title,
    language: config.template.language,
    metadata: {
      description: '',
      ...config.template.metadata,
      ...metadata
    },
    title: [metadata.title, config.template.title]
      .filter(str => !!str)
      .join(' - ')
  };

  const opts = {
    async: true
  };

  return ejs.render(template, data, opts);
};

/**
 * Generator: Sitemap
 */
const buildSitemap = (config, resolver) => {
  const {enabled, priority, changefreq} = config.sitemap;
  const destination = path.resolve(config.output, 'sitemap.xml');

  return input => {
    if (enabled) {
      const list = input.files.map(({filename}) => resolver.url(filename));
      const xml = xmlbuilder.create('urlset');
      xml.att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');
      xml.att('xmlns:news', 'http://www.google.com/schemas/sitemap-news/0.9');
      xml.att('xmlns:xhtml', 'http://www.w3.org/1999/xhtml');
      xml.att('xmlns:mobile', 'http://www.google.com/schemas/sitemap-mobile/1.0');
      xml.att('xmlns:image', 'http://www.google.com/schemas/sitemap-image/1.1');

      list.forEach(file => {
        const el = xml.ele('url');
        el.ele('loc', file);
        el.ele('changefreq', changefreq);
        el.ele('priority', String(priority));
      });

      const sitemap = xml.end({pretty: true});

      return writeFile(destination, sitemap)
        .then(() => signale.success('Wrote', path.relative(config.output, destination)))
        .catch(e => signale.warn(e));
    }

    return Promise.resolve(true);
  };
};

/**
 * Generator: Webpack
 */
const buildWebpack = config => {
  const webpackConfig = require(path.resolve(__dirname, '../webpack.config.js'));
  webpackConfig.output = webpackConfig.output || {};
  webpackConfig.output.path = path.resolve(config.output);

  return input => {
    return new Promise((resolve, reject) => {
      const compiler = webpack(webpackConfig);

      compiler.run((err, stats) => {
        return err ? reject(err) : resolve(stats.toString());
      });
    })
      .then(stats => console.log(stats))
      .then(() => input);
  };
};

/**
 * Generator: Static files
 */
const buildStatic = config => {
  return input => {
    const promises = input.resources.map(resource => {
      const source = path.resolve(config.input, resource);
      const destination = path.resolve(config.output, resource);

      return  ensureDir(path.dirname(destination))
        .then(() => copy(source, destination))
        .then(() => signale.success('Copied', path.relative(config.output, destination)))
        .catch(e => signale.warn(e));
    });

    return Promise.all(promises)
      .then(() => input);
  };
};

/**
 * Generator: Search Database
 */
const buildSearchDatabase = (config, resolver) => {
  const destination = path.resolve(config.output, 'search.json');

  return input => {
    const json = input.files.map((iter, index) => {
      const {metadata} = input.parsed[index];

      return {
        href: resolver.url(iter.filename),
        ...metadata
      };
    });

    return writeJson(destination, json)
      .then(() => signale.success('Wrote', path.relative(config.output, destination)))
      .catch(e => signale.warn(e));
  };
};

/**
 * Resolver
 */
const createResolver = config => {
  const strip = name => name
    .replace(/^\/+/, '')
    .replace(/\.md$/, '.html')
    .replace('README.html', '');

  const link = (str, base = '') => {
    if (str.match(/^https?:/) !== null) {
      return str;
    }

    const first = str.substr(0, 1);
    if (first === '#') {
      return str;
    } else if (first === '.') {
      return strip(str);
    }

    const [name, hash] = str.split('#');
    const h = hash ? `#${hash}` : '';
    const n = strip(name);

    if (base.length > 0) {
      // TODO: This needs to be more clever
      const dots = base.split('/') || [];
      const prefix = dots.map(() => '..').join('/');
      const href = (prefix ? `${prefix}/` : prefix) + n;

      return href + h;
    }

    return n + h;
  };

  const url = filename => {
    const relative = link(filename);
    return config.template.url.replace(/\/?$/, '/') + relative;
  };

  return {link, url};
};

/**
 * Parser
 */
const createParser = (config, resolver, plugins) => {
  const resources = [];
  const renderer = new Renderer();
  const originalLink = (...args) => Renderer.prototype.link.apply(renderer, args);
  const originalHeading = (...args) => Renderer.prototype.heading.apply(renderer, args);
  const originalImage = (...args) => Renderer.prototype.image.apply(renderer, args);

  marked.setOptions({
    ...config.marked,
    highlight: code => hjs.highlightAuto(code).value,
    renderer
  });

  const customHeading = (text, level) => {
    if (level === 1) {
      return '';
    }

    return `<span class="header">${text}</span>`;
  };

  const customLink = base => (href, title, text) => {
    const newHref = resolver.link(href, base);

    return originalLink(newHref, title, text);
  };

  const customImage = (base, dirname) => (href, title, text) => {
    const newHref = resolver.link(href);

    if (href.match(/^https?:/) === null) {
      const original = path.resolve(dirname, href);
      const relative = path.relative(config.input, original);

      resources.push(relative);
    }

    return originalImage(newHref, title, text);
  };

  const extract = contents => {
    const re = /---[\r\n](.*)[\r\n]---/;
    let str = contents.trim();
    let metadata = {};

    const matchMeta = str.match(re);
    if (matchMeta !== null) {
      const ystr = matchMeta.splice(1, matchMeta.length - 1)
        .map(str => str.trim())
        .filter(str => str.length > 0)
        .join('\n');

      try {
        metadata = yaml.safeLoad(ystr);
      } catch (e) {
        signale.error(e);
      }

      str = str.replace(re, '').trim();
    }

    const matchTitle = str.match(/^#+ (.*)/);
    if (matchTitle !== null) {
      metadata.title = matchTitle[1].trim();
    }

    return {metadata, str};
  };

  const parse = input => {
    const parsed = input.files.map(({filename, source, contents}) => {
      const {metadata, str} = extract(contents);
      const base = path.dirname(filename);
      const dirname = path.dirname(source);

      renderer.link = customLink(base);
      renderer.heading = customHeading;

      const menu = marked(input.summary);

      renderer.link = customLink(base);
      renderer.image = customImage(base, dirname);
      renderer.heading = originalHeading;

      const markdown = marked(str);
      return {menu, metadata, markdown};
    });

    return Promise.resolve({...input, parsed, resources});
  };

  const render = input => {
    const promises = input.files.map((iter, index) => {
      const base = path.dirname(iter.filename);

      return renderHtml(config, resolver, plugins)(base)(
        input.template,
        input.parsed[index].menu,
        input.parsed[index].metadata,
        input.parsed[index].markdown
      ).then(html => ({index, html}));
    });

    return Promise.all(promises)
      .then(results => {
        const html = input.files.map((iter, index) => {
          const found = results.find(v => v.index === index);
          return found ? found.html : '';
        });

        return {...input, html};
      });
  };

  return {parse, render};
};

/**
 * File Loader
 */
const createLoader = config => {
  const fgp = '**/*.md';
  const fgo = {cwd: config.input, ignore: ['SUMMARY.md', 'node_modules']};

  const readFiles = list => Promise.all(list.map(filename => {
    const source = path.resolve(config.input, filename);
    const destination = path.resolve(config.output, filename)
      .replace(/\.md$/, '.html')
      .replace('README.html', 'index.html');

    return readFile(source, 'utf8')
      .then(contents => ({filename, source, destination, contents}));
  }));

  const load = () => {
    const template = readFileSync(config.template.filename, 'utf8');
    const summary = readFileSync(path.resolve(config.input, 'SUMMARY.md'), 'utf8');

    return fg(fgp, fgo)
      .then(readFiles)
      .then(files => ({files, template, summary}));
  };

  return {load};
};

/**
 * Publisher Factory
 */
const createPublisher = config => {
  const publish = input => {
    const promises = input.files.map((file, index) => {
      const html = input.html[index];
      return ensureDir(path.dirname(file.destination))
        .then(() => {
          const contents = production ? minify(html, config.minify) : html;
          return writeFile(file.destination, contents)
            .then(() => signale.success('Wrote', path.relative(config.output, file.destination)))
            .catch(e => signale.warn(e));
        });
    });

    return Promise.all(promises)
      .then(() => input);
  };

  return {publish};
};

/**
 * Generator Factory
 */
const createGenerators = (config, resolver) => {
  const generators = [
    buildStatic(config, resolver),
    buildSitemap(config, resolver),
    buildSearchDatabase(config, resolver),
    buildWebpack(config, resolver)
  ];

  const generate = input => Promise.all(generators.map(gen => {
    return gen(input).then(() => input);
  }));

  return {generate};
};

/**
 * Main Application
 */
module.exports = (cfg) => {
  const config = createConfig({...cfg});

  return initializePlugins(config)
    .then(plugins => {
      const resolver = createResolver(config);
      const loader = createLoader(config, resolver, plugins);
      const parser = createParser(config, resolver, plugins);
      const publisher = createPublisher(config, resolver, plugins);
      const generators = createGenerators(config, resolver, plugins);

      return ensureDir(config.output)
        .then(() => loader.load())
        .then(parser.parse)
        .then(parser.render)
        .then(publisher.publish)
        .then(generators.generate);
    });
};
