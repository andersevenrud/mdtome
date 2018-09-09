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
const signale = require('signale');
const minify = require('html-minifier').minify;
const puppeteer = require('puppeteer');
const {ensureDir, writeFile} = require('fs-extra');

const production = process.env.NODE_ENV === 'production';

const createPdf = (html, destination) => puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox']
})
  .then(browser => {
    return browser.newPage()
      .then(page => {
        return page.setContent(html)
          .then(() => page.emulateMedia('screen'))
          .then(() => page.pdf({
            path: destination
          }));
      })
      .then(result => {
        browser.close();

        return result;
      });
  });

module.exports = (config, options) => {
  const publish = input => {

    if (options.pdf) {
      const destination = path.resolve(options.pdf);
      return createPdf(input.pdf, destination)
        .then(() => {
          if (config.logging) {
            signale.success('Wrote', options.pdf);
          }

          return input;
        });
    }

    const promises = input.files.map((file, index) => {
      const html = input.html[index];
      return ensureDir(path.dirname(file.destination))
        .then(() => {
          const contents = production ? minify(html, config.minify) : html;
          return writeFile(file.destination, contents)
            .then(() => {
              if (config.logging) {
                signale.success('Wrote', path.relative(config.output, file.destination));
              }
            })
            .catch(e => signale.warn(e));
        });
    });

    return Promise.all(promises)
      .then(() => input);
  };

  return {publish};
};
