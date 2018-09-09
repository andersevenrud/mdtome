# mdtome

**Markdown Tome** - A Gitbook clone.

* Fast
* Simple
* Compatible with Gitbook structure(s)
* Produces optimized builds
* Creates sitemaps by default
* Can generate PDFs

## Requirements

Node 8.x or later.

## Installation

```
npm install -g mdtome
```

> You can also install this locally in your projects.

## Configuration

Create a file named `.mdtome`

```javascript
module.exports = {
  input: '.',
  title: 'My Awesome Tome',
  url: 'http://my-website.com'
};
```

See `src/config.js` for a full list of options. *TODO: Add table here*

*Regular Gitbook `book.json` file is also supported, but will not allow you to make any customization.*

## Usage

The generated output will be in `_book/` by default.

### CLI

Simply run this command in your project root directory:

```bash
mdtome [--input=path] [--output=path] [--pdf=path] [--verbose] [--watch]
```

Or if you have mdtome as a dependency in your project:

```bash
npx mdtome [--input=path] [--output=path] [--pdf=path] [--verbose] [--watch]
```

> Note, use `NODE_ENV=production mdtome ...` to make an optimized build.

### API

```javascript
const mdtome = require('mdtome');

mdtome({
  /* Configuration options here */
  /* Same as the .mdtome file */
}) // -> Promise
```

## Benchmarks

Using https://github.com/bagder/everything-curl

* Gitbook: `23.79s user 0.73s system 108% cpu 22.495 total`
* mdtome: `4.18s user 0.18s system 110% cpu 3.952 total`

System: i5-4670K + SSD

## TODO

* Generation: Glossary
* Generation: Languages
* Plugin: Typed quotes
* Plugin: Google Analytics
* Plugin: Google AdSense
* Customization: CSS/JS entry points
* UI: Highlight links based on scroll

## License

MIT
