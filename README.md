# SystemJS Configurator

[![Build Status][travis-image]][travis-url]
[![Code Coverage][codecov-image]][codecov-url]

A tool to build SystemJS configurations for your Node.js project and all its
package dependencies.

## Installation

```bash
yarn add systemjs-configurator --dev
```

Or

```bash
npm install systemjs-configurator --save-dev
```

## Usage

```javascript
const configurator = require("systemjs-configurator");

// Some optional params
const options = {
  basedir: "path/to/dir",
  outfile: "path/to/out/file",
  excludes: ["package-a", "package-b", ...]
};

configurator
  .buildConfig(options)
  .then((config) => {
    console.log(config);
  })
  .catch((error) => {
    console.log("Coniguration error");
    console.log(error);
  });
```

**options:**
- `basedir`: The path to your project's base direcotry
  (default: `process.cwd()`).
- `outfile`: The file path to write out the config to. If not defined no file
  will be written (default: `null`).
- `excludes`: An list of package names to exclude from the configuration
  (default: `[]`).

## Examples ##

- [`bootstrap`](./example/bootstrap): Shows you, how to override the
  `package.json` of a dependency so that it works with SystemJS. Given
  this [package.json](./example/bootstrap/package.json) the following
  [systemjs.config.js](./example/bootstrap/systemjs.config.js)
  is created.


## License ##

Released under the [MIT license][license].



[travis-url]: https://travis-ci.org/sidloki/systemjs-configurator
[travis-image]: https://travis-ci.org/sidloki/systemjs-configurator.svg?branch=master
[codecov-url]: https://codecov.io/gh/sidloki/systemjs-configurator
[codecov-image]: https://codecov.io/gh/sidloki/systemjs-configurator/branch/master/graph/badge.svg
[license]: ./LICENSE
