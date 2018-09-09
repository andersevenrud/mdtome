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
const root = process.cwd();
const npm = require(path.resolve(__dirname, '../package.json'));

module.exports = {
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
  structure: {
    readme: 'README.md',
    summary: 'SUMMARY.md',
    glossary: 'GLOSSARY.md',
    languages: 'LANGS.md'
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
};
