# Usage

The generated output will be in `_book/` by default.

## CLI

Simply run this command in your project root directory:

```bash
mdtome [--input=path] [--output=path] [--pdf=path] [--verbose] [--watch]
```

Or if you have mdtome as a dependency in your project:

```bash
npx mdtome [--input=path] [--output=path] [--pdf=path] [--verbose] [--watch]
```

> Note, use `NODE_ENV=production mdtome ...` to make an optimized build.

## API

```javascript
const mdtome = require('mdtome');

mdtome({
  /* Configuration options here */
  /* Same as the .mdtome file */
}) // -> Promise
```

### Plugins

```
module.exports = {
  // Per page render
  render: html => Promise.resolve(html)

  // Template loading
  template => (html, pdf) => Promise.resolve(html)
};
```


