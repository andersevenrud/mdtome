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
const SEARCH_FILE = window.location.origin.replace(/\/$/, '') + '/search.json';

import {h, app} from 'hyperapp';

const fetchDb = () => {
  let cache;
  let busy = false;

  return () => {
    if (busy) {
      return busy;
    } else if (cache) {
      return Promise.resolve(cache);
    }

    busy = fetch(SEARCH_FILE)
      .then(response => response.json())
      .then(json => {
        cache = json;
        busy = false;
        return cache;
      })
      .catch(error => {
        console.warn(error);
        busy = false;
      });

    return busy;
  };
};

const filter = (list, query) => list.filter(iter => {
  const x = [iter.title, iter.description]
    .filter(str => typeof str === 'string')
    .map(str => str.toLowerCase())
    .filter(str => str.match(query.toLowerCase()));

  return x.length > 0;
});

const init = () => {
  const m = document.getElementById('hamburger');
  const s = document.getElementById('search');
  const b = document.querySelector('body');

  const store = fetchDb();
  const main = document.querySelector('main');
  const content = document.getElementById('article');
  const results = document.getElementById('search-results');
  const links = document.querySelectorAll('#menu a');

  m.addEventListener('click', () => {
    b.classList.toggle('menu-expanded');
  });

  Array.from(links).forEach(el => el.addEventListener('click', () => {
    b.classList.remove('menu-expanded');
  }));

  const view = (state, actions) => h('input', {
    type: 'text',
    placeholder: 'Type here to search...',
    oninput: ev => actions.setInput(ev.target.value)
  });

  const searchApp = app({
    open: false,
    error: null,
    results: []
  }, {
    setResults: results => state => ({error: null, results}),
    setError: error => state => ({error, results: []}),
    setOpen: open => state => {
      if (open) {
        content.style.display = 'none';
        results.style.display = 'block';
        main.scrollTop = 0;
      } else {
        content.style.display = 'block';
        results.style.display = 'none';
      }

      return {open};
    },
  }, (state, actions) => {
    return h('div', {}, [
      h('h2', {}, 'Search results'),
      h('p', {}, `Showing ${state.results.length} results`),
      h('ol', {}, state.results.map(iter => h('li', {}, [
        h('h3', {}, h('a', {href: iter.href}, iter.title)),
        h('p', {}, iter.description)
      ])))
    ]);
  }, results);

  app({
    input: '',
  }, {
    setInput: input => (state, actions) => {
      const open = input.length > 0;

      searchApp.setOpen(open);

      actions.search();

      return {input};
    },

    search: () => (state, actions) => {
      store()
        .then(db => searchApp.setResults(filter(db, state.input)))
        .catch(error => searchApp.setError(error));
    }
  }, view, s);
};

window.addEventListener('DOMContentLoaded', init);
