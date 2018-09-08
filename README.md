# mdtome

**Markdown Tome** - A Gitbook clone.

* Fast
* Simple
* Compatible with Gitbook structure(s)
* Produces optimized builds
* Creates sitemaps by default

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
  template: {
    title: 'My Awesome Tome',
    hostname: 'http://my-website.com',
    basedir: '/'
  }
};
```

See `index.js -> createConfig()` for a full list of options. *TODO: Add table here*

## Usage

The generated output will be in `_book/` by default.

### CLI

Simply run this command in your project root directory:

```bash
mdtome [--input=path] [--output=path] [--verbose]
```

Or if you have mdtome as a dependency in your project:

```bash
npx mdtome [--input=path] [--output=path] [--verbose]
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

## TODO

* Watching
* Localization support
* PDF Generation
* Plugins
* Plugin: Typed quotes
* Plugin: Google Analytics
* Plugin: Google AdSense
* Customization: CSS/JS entry points
* UI: Highlight links based on scroll

## License

MIT
