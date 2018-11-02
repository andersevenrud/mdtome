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

module.exports = config => {
  const strip = name => name
    .replace(/^\/+/, '')
    .replace(/\.md$/, '.html')
    .replace(config.structure.readme.replace('.md', '.html'), ''/*'index.html'*/);

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

    if (base.length > 1) {
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
    return config.url.replace(/\/?$/, '/') + relative;
  };

  return {link, url};
};
