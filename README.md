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
  excludes: ["package-a", "package-b", ...],
  overrides: { "systemjs-plugin-text": {name: "text"} }
};

let config = configurator.buildConfig(options);

console.log(JSON.stringify(config, null, 2));

configurator.writeConfig(config, "systemjs.config.js");
```

**options:**
- `basedir`: The path to your project's base direcotry
  (default: `process.cwd()`).
- `outfile`: The file path to write out the config to. If not defined no file
  will be written (default: `null`).
- `excludes`: A list of package names to exclude from the configuration
  (default: `[]`).
- `overrides`: An object containing package overrides
  (default: `{}`).

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
