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
const path = require('path');
const xmlbuilder = require('xmlbuilder');
const {writeFile} = require('fs-extra');
const signale = require('signale');

module.exports = (config, options, resolver) => {
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
        .then(() => {
          if (config.logging) {
            signale.success('Wrote', path.relative(config.output, destination))
          }
        })
        .catch(e => signale.warn(e));
    }

    return Promise.resolve(true);
  };
};
