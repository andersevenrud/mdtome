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
const fg = require('fast-glob');
const signale = require('signale');
const {readFile, readFileSync} = require('fs-extra');

module.exports = (config, options, resolver, plugins) => {
  const fgp = '**/*.md';
  const fgo = {cwd: config.input, ignore: [
    config.structure.summary,
    'node_modules'
  ]};

  const readFiles = list => Promise.all(list.map(filename => {
    const source = path.resolve(config.input, filename);
    const destination = path.resolve(config.output, filename)
      .replace(/\.md$/, '.html')
      .replace('README.html', 'index.html');

    return readFile(source, 'utf8')
      .then(contents => ({filename, source, destination, contents}))
      .catch(error => {
        if (config.logging) {
          signale.warn(error);
        }

        return null;
      });
  }));

  const load = (changed = []) => {
    const templateRaw = options.pdf
      ? readFileSync(config.pdf.template, 'utf8')
      : readFileSync(config.web.template, 'utf8');

    const summary = readFileSync(path.resolve(config.input, config.structure.summary), 'utf8');
    const partial = changed.length > 0;
    const list = partial ? Promise.resolve(changed) : fg(fgp, fgo);

    return plugins.template(templateRaw, options.pdf)
      .then(template => {
        return list
          .then(readFiles)
          .then(files => files.filter(iter => !!iter))
          .then(files => ({partial, files, template, summary}));
      });
  };

  return {load};
};
