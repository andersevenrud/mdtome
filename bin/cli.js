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
const signale = require('signale');
const minimist = require('minimist');
const path = require('path');
const {existsSync, readJsonSync} = require('fs-extra');

const mdtome = require('../src/mdtome.js');
const defaultConfiguration = require('../src/config.js');

const root = process.cwd();
const configFilename = path.resolve(root, '.mdtome');
const bookFilename = path.resolve(root, 'book.json');
const hasConfig = existsSync(configFilename);
const hasBook = existsSync(bookFilename);
const configuration = hasConfig ? require(configFilename) : {};
const book = hasBook ? readJsonSync(bookFilename) : {};
const argv = options => minimist(process.argv.slice(2), options);
const clean = options => Object.keys(options)
  .filter(key => typeof options[key] !== 'undefined')
  .reduce((result, key) => ({...result, [key]: options[key]}), {});

// Get command-line arguments
const {verbose, input, output, watch, pdf} = argv({
  string: ['input', 'output', 'pdf'],
  boolean: ['verbose', 'watch'],
  alias: {i: 'input', o: 'output', v: 'verbose'},
  default: {}
});

// Create config for mdtome
const config = clean({
  verbose,
  title: book.title || path.basename(process.cwd()),
  input: input || book.root,
  logging: true,
  output,
  watch,
  structure: {
    ...defaultConfiguration.structure,
    ...(book.structure || {})
  },
  template: {
    metadata: {
      description: book.description || ''
    }
  },
  ...configuration
});

// Use the mdtome API
mdtome(config, {pdf})
  .then(() => {
    signale.success('Done');
    process.exit(0);
  })
  .catch(error => {
    signale.fatal(error);
    process.exit(1);
  });
