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
const hjs = require('highlight.js');
const path = require('path');
const yaml = require('js-yaml');
const marked = require('marked');
const ejs = require('ejs');
const signale = require('signale');
const {Renderer} = marked;

/**
 * Compiles a list of markdown compiled files to pdf
 */
const renderPdf = (config, resolver, plugins) => (template, pages) => {
  const data = {
    language: 'en',
    title: config.title,
    pages
  };

  const opts = {
    async: true
  };

  return ejs.render(template, data, opts);
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
    body: markdown,
    url: config.url,
    scripts: config.web.scripts.map(res),
    styles: config.web.styles.map(res),
    addons: config.web.addons,
    baseTitle: config.title,
    language: 'en',
    metadata: {
      description: '',
      ...config.web.metadata,
      ...metadata
    },
    title: [metadata.title, config.title]
      .filter(str => !!str)
      .join(' - ')
  };

  const opts = {
    async: true
  };

  return ejs.render(template, data, opts)
    .then(html => plugins.render(html));
};

module.exports = (config, options, resolver, plugins) => {
  let resources = [];
  let toc = [];

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

  const customLink = (base, table) => (href, title, text) => {
    const newHref = resolver.link(href, base);
    if (table) {
      const [link] = href.split('#');
      if (toc.indexOf(link) === -1) {
        toc.push(link);
      }
    }

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

      renderer.link = customLink(base, true);
      renderer.heading = customHeading;

      const menu = marked(input.summary);

      renderer.link = customLink(base, false);
      renderer.image = customImage(base, dirname);
      renderer.heading = originalHeading;

      const markdown = marked(str);
      return {menu, metadata, markdown};
    });

    return Promise.resolve({...input, parsed, toc, resources});
  };

  const render = input => {
    resources = [];
    toc = [];

    if (options.pdf) {
      const pages = input.toc.map(filename => {
        const index = input.files.findIndex(iter => iter.filename === filename);
        if (index === -1) {
          signale.warn('Could not find page in TOC for', filename);
          return '';
        }

        return input.parsed[index].markdown;
      });

      return renderPdf(config, resolver, plugins)(
        input.template,
        pages
      )
        .then(pdf => ({...input, pdf}));
    }

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
