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
const deepmerge = require('deepmerge');
const {ensureDir} = require('fs-extra');
const defaultConfiguration = require('./config.js');
const createParser = require('./build/parser.js');
const createLoader = require('./build/loader.js');
const createResolver = require('./build/resolver.js');
const createPublisher = require('./build/publisher.js');
const createGenerators = require('./build/generators.js');

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
 * Main Application
 */
module.exports = (cfg) => {
  const config = deepmerge(defaultConfiguration, cfg);

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
