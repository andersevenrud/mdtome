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
const {readFile, writeFile, copy, ensureDir, mkdirp} = require('fs-extra');
const path = require('path');
const mle = require('markdown-link-extractor');
const hjs = require('highlight.js');
const ejs = require('ejs');
const yaml = require('js-yaml');
const marked = require('marked');
const minify = require('html-minifier').minify;
const signale = require('signale');
const deepmerge = require('deepmerge');
const xmlbuilder = require('xmlbuilder');
const webpack = require('webpack');
const fg = require('fast-glob');
const root = process.cwd();
const npm = require(path.resolve(__dirname, '../package.json'));
const production = process.env.NODE_ENV === 'production';
const union = array => array.filter((elem, pos, arr) => arr.indexOf(elem) === pos);

/**
 * Creates the mdtome config
 */
const createConfig = config => {
  const resolve = (base, link) => link.match(/^https?:/)
    ? link
    : base + link;

  const defaults = {
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
      hostname: 'http://localhost',
      basedir: '/',
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
  };

  const result = deepmerge(defaults, config);
  const {basedir, scripts, styles} = result.template;

  Object.assign(result.template, {
    scripts: scripts.map(s => resolve(basedir, s)),
    styles: styles.map(s => resolve(basedir, s)),
  });

  return result;
};

/**
 * Resolves an internal link
 */
const resolveInternalLink = (config, href) => {
  const [name, hash] = href.split('#');

  const h = hash ? `#${hash}` : '';
  const n = name
    .replace(/(README\.md)$/, '')
    .replace(/\/(\w+)\.md$/, '/$1.html');

  if (['#', '.'].indexOf(n.substr(0, 1)) !== -1) {
    return n + h;
  }

  const basedir = config.template.basedir.replace(/\/?$/, '/');
  return basedir + n.replace(/^\/?/, '') + h;
};

/**
 * Resolves a href link
 */
const resolveLink = (config, href) => href.match(/^https?:/)
  ? href
  : resolveInternalLink(config, href);

/**
 * Creates a unique list of files
 */
const uniqueFileList = list => union(list.map(str => str.match('#') ? str.substr(0, str.indexOf('#')) : str));

/**
 * Reads the main template
 */
const readTemplate = config => readFile(config.template.filename, 'utf8');

/**
 * Sets the marked options
 */
const setMarkedOptions = (config, context) => marked.setOptions({
  ...config.marked,
  ...context
});

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
 * Creates the Markdown renderer instance
 */
const createMarkdownRenderer = (config, type) => {
  const renderer = new marked.Renderer();

  if (type === 'menu') {
    // Makes sure headings are rendered as non-header HTML elements
    renderer.heading = (text, level) => {
      if (level === 1) {
        return '';
      }

      const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
      return `<span class="header">${escapedText}</span>`;
    };
  }

  // Resolves link URLs
  renderer.link = (href, title, text) => {
    const newHref = resolveLink(config, href);
    return `<a href="${newHref}" title="${title}">${text}</a>`;
  };

  return renderer;
};

/**
 * Parses a markdown, including YAML metadata
 */
const parseMarkdown = raw => {
  let str = raw.trim();
  let title = '';
  let metadata = {};

  const matchMeta = str.match(/---[\r\n](.*)[\r\n]---/);
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

    str = str.replace(/---[\r\n](.*)[\r\n]---/, '').trim();
  }

  const matchTitle = str.match(/^#(.*)/);
  if (matchTitle !== null) {
    title = matchTitle[1].trim();
  }

  return {metadata, title, markdown: marked(str)};
};

/**
 * Compiles the summary (menu)
 */
const compileSummary = (config, plugins) => {
  const filename = path.resolve(config.input, 'SUMMARY.md');

  setMarkedOptions(config, {
    renderer: createMarkdownRenderer(config, 'menu')
  });

  return readFile(filename, 'utf8')
    .then(raw => {
      const list = mle(raw);
      const files = uniqueFileList(list);
      const menu = marked(raw);

      return {files, menu};
    });
};

/**
 * Compiles a list of files to markdown
 */
const compileMarkdown = (config, plugins, files) => {
  setMarkedOptions(config, {
    renderer: createMarkdownRenderer(config, 'article'),
    highlight: code => hjs.highlightAuto(code).value,
  });

  return files
    .map(filename => {
      const source = path.resolve(config.input, filename);
      const destination = path.resolve(config.output, path.dirname(filename), 'index.html');

      return readFile(source, 'utf8')
        .then(raw => {
          if (config.verbose) {
            signale.await('Parsing', filename);
          }

          return raw;
        })
        .then(raw => parseMarkdown(raw))
        .then(result => ({source, destination, ...result}));
    });
};

/**
 * Compiles a list of markdown compiled files to html
 */
const compileHtml = (config, plugins, template, menu, parsed) => parsed
  .map(iter => {
    const res = str => typeof str === 'function' ? str(config, iter) : str;
    const data = {
      menu,
      menu_before: '', // TODO
      menu_after: '', // TODO
      body: iter.markdown,
      body_before: '', // TODO
      body_after: '', // TODO
      header_before: '', // TODO
      header_after: '', // TODO
      basedir: config.template.basedir,
      scripts: config.template.scripts.map(res),
      styles: config.template.styles.map(res),
      baseTitle: config.template.title,
      language: config.template.language,
      metadata: {
        description: '',
        ...config.template.metadata,
        ...iter.metadata
      },
      title: [iter.title || iter.metadata.title, config.template.title]
        .filter(str => !!str)
        .join(' - ')
    };

    const opts = {
      async: true
    };

    return ejs.render(template, data, opts)
      .then(html => ({...iter, html}));
  });

/**
 * Writes the final compiled result into the destination
 */
const writeResults = (config, results) => results
  .map(({source, destination, html}) => {
    return mkdirp(path.dirname(destination))
      .then(() => writeFile(destination, production ? minify(html, config.minify) : html))
      .then(() => {
        signale.success('Wrote', destination.replace(config.output, '').replace(/^\/|\\/, ''));
      })
      .catch(err => {
        signale.error(err);
      });
  });

/**
 * Copies a set of static resources into our destination
 */
const copyResources = config => {
  const internal = config.template.resources
    .map(filename => {
      const source = path.resolve(__dirname, 'resources', filename);
      return {source, filename};
    });

  const external = () => fg([
    '**/*',
    '!**/*.md',
    '!**/_layouts',
    '!**/_book',
    '!**/node_modules',
  ], {cwd: config.input})
    .then(list => list.map(filename => {
      const source = path.resolve(config.input, filename);
      return {source, filename};
    }));

  return external()
    .then(list => {
      return [...list, ...internal].map(({source, filename}) => {
        return copy(source, path.resolve(config.output, filename))
          .then(() => signale.success('Copied', filename))
          .catch(e => signale.warn('Failed to copy', filename, e));
      });
    });
};

/**
 * Writes our sitemap
 */
const writeSitemap = (config, plugins, files) => {
  const {enabled, priority, changefreq} = config.sitemap;

  if (enabled) {
    const list = union(files.map(f => resolveLink(config, f))
      .filter(href => href.match(/^(https?:|.|#)/) !== null))
      .map(href => config.template.hostname + href);

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
    const filename = path.resolve(config.output, 'sitemap.xml');

    return writeFile(filename, sitemap)
      .then(() => signale.success('Wrote sitemap.xml'))
      .catch(e => signale.warn('Failed to write sitemap.xml'. e));
  }

  return Promise.resolve(true);
};

const buildWebpack = (config) => {
  const webpackConfig = require(path.resolve(__dirname, '../webpack.config.js'));
  webpackConfig.output = webpackConfig.output || {};
  webpackConfig.output.path = path.resolve(config.output);

  return new Promise((resolve, reject) => {
    const compiler = webpack(webpackConfig);

    compiler.run((err, stats) => {
      return err ? reject(err) : resolve(stats.toString());
    });
  });
};

/*
 * Main Application
 */
module.exports = (cfg = {}) => {
  const config = createConfig({...cfg});

  return ensureDir(config.output)
    .then(() => buildWebpack(config))
    .then(stats => console.log(stats))
    .then(() => copyResources(config))
    .then(() => initializePlugins(config))
    .then(plugins => {
      return readTemplate(config)
        .then(template => {
          return compileSummary(config, plugins)
            .then(({files, menu}) => {
              return writeSitemap(config, plugins, files)
                .then(() => Promise.all(compileMarkdown(config, plugins, files)))
                .then(markdown => Promise.all(compileHtml(config, plugins, template, menu, markdown)))
                .then(html => Promise.all(writeResults(config, html)));
            });
        });
    });
};