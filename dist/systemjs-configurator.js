import path from 'path';
import fs from 'fs';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var defaultExcludes = ["systemjs"];

function buildConfig() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref$basedir = _ref.basedir,
      basedir = _ref$basedir === undefined ? process.cwd() : _ref$basedir,
      _ref$outfile = _ref.outfile,
      outfile = _ref$outfile === undefined ? null : _ref$outfile,
      _ref$excludes = _ref.excludes,
      excludes = _ref$excludes === undefined ? [] : _ref$excludes,
      _ref$includes = _ref.includes,
      includes = _ref$includes === undefined ? [] : _ref$includes,
      _ref$overrides = _ref.overrides,
      overrides = _ref$overrides === undefined ? {} : _ref$overrides;

  var meta = readManifest(basedir);
  var options = {
    basedir: path.resolve(basedir),
    excludes: [].concat(defaultExcludes, _toConsumableArray(excludes)),
    overrides: Object.assign({}, meta.overrides, overrides)
  };

  var pkg = createPackage(basedir, meta, options);
  var config = {
    paths: _defineProperty({}, pkg.name + "/", pkg.location + "/"),
    map: {},
    packages: _defineProperty({}, pkg.name, pkg.config)
  };

  includes.map(function (name) {
    if (!pkg.dependencies[name]) {
      pkg.dependencies[name] = true;
    }
  });

  addDependecies(config, pkg, options);

  if (outfile) {
    exports.writeConfig(config, outfile);
  }

  return config;
}

function writeConfig(config, outfile) {
  var configJson = JSON.stringify(config, null, 2);
  fs.writeFileSync(outfile, "SystemJS.config(" + configJson + ");");
}

function readManifest(dir) {
  var file = path.join(dir, "package.json");
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function findManifest(name, fromdir) {
  var dir = path.join(fromdir, "node_modules", name);
  try {
    var meta = readManifest(dir);
    return [dir, meta];
  } catch (error) {
    var nextdir = path.join(fromdir, "..");
    if (nextdir === fromdir) {
      throw new Error("Cannot find manifest for \"" + name + "\".");
    }
    return findManifest(name, nextdir);
  }
}

function createPackage(dir, meta, options) {
  var pkg = {};
  var override = options.overrides[meta.name + "@" + meta.version] || options.overrides[meta.name];

  Object.assign(meta, override);

  pkg.name = meta.name;
  pkg.version = meta.version;
  pkg.dir = path.relative(options.basedir, path.resolve(dir));
  pkg.config = {};

  if (meta.systemjs && meta.systemjs.main) {
    pkg.config.main = meta.systemjs.main;
    delete meta.systemjs["main"];
  } else if (meta["module"]) {
    pkg.config.main = meta["module"];
    pkg.config.format = "esm";
  } else if (meta["jsnext:main"]) {
    pkg.config.main = meta["jsnext:main"];
    pkg.config.format = "esm";
  } else {
    pkg.config.main = meta["main"];
    // pkg.config.format = "cjs";
  }

  if (meta.directories && meta.directories.lib) {
    pkg.location = meta.directories.lib;
  } else {
    pkg.location = pkg.config.main ? path.dirname(pkg.config.main) : "";
  }

  pkg.location = path.normalize(pkg.location);

  if (pkg.config.main) {
    pkg.config.main = path.normalize(pkg.config.main);
    if (pkg.config.main.indexOf(pkg.location) === 0) {
      pkg.config.main = path.relative(pkg.location, pkg.config.main);
    }
  }

  if (meta.systemjs) {
    Object.assign(pkg.config, meta.systemjs);
  }

  pkg.location = path.join(pkg.dir, pkg.location);

  pkg.dependencies = Object.assign({}, meta.dependencies);

  return pkg;
}

function addDependecies(config, pkg, options) {
  Object.keys(pkg.dependencies).reduce(function (deps, name) {
    var _findManifest = findManifest(name, path.join(options.basedir, pkg.dir)),
        _findManifest2 = _slicedToArray(_findManifest, 2),
        dir = _findManifest2[0],
        meta = _findManifest2[1];

    var dep = createPackage(dir, meta, options);
    if (!config.packages[dep.location] && options.excludes.indexOf(dep.name + "@" + dep.version) < 0 && options.excludes.indexOf(dep.name) < 0) {
      addPackage(config, dep, pkg);
      deps.push(dep);
    }
    return deps;
  }, []).map(function (dep) {
    addDependecies(config, dep, options);
  });
}

function addPackage(config, pkg, parent) {
  if (!config.map[pkg.name]) {
    config.map[pkg.name] = pkg.location;
  } else {
    if (!config.packages[parent.location].map) {
      config.packages[parent.location].map = {};
    }
    config.packages[parent.location].map[pkg.name] = pkg.location;
  }

  config.packages[pkg.location] = pkg.config;
}

export { buildConfig, writeConfig, createPackage };
