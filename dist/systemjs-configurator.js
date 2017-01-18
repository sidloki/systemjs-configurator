import path from 'path';
import fs from 'fs';
import resolveTree from 'resolve-tree';
import deepExtend from 'deep-extend';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var defaultExcludes = ["systemjs"];

function buildConfig() {
  var _ref,
      _ref$basedir,
      basedir,
      _ref$outfile,
      outfile,
      _ref$excludes,
      excludes,
      meta,
      config,
      pkgs,
      mapPath,
      pkgConfig,
      overrides,
      _createSystemConfig,
      _createSystemConfig2,
      _arguments = arguments;

  return Promise.resolve().then(function () {
    _ref = _arguments.length > 0 && _arguments[0] !== undefined ? _arguments[0] : {};
    _ref$basedir = _ref.basedir;
    basedir = _ref$basedir === undefined ? process.cwd() : _ref$basedir;
    _ref$outfile = _ref.outfile;
    outfile = _ref$outfile === undefined ? null : _ref$outfile;
    _ref$excludes = _ref.excludes;
    excludes = _ref$excludes === undefined ? [] : _ref$excludes;
    meta = void 0;
    config = void 0;
    pkgs = void 0;
    mapPath = void 0;
    pkgConfig = void 0;
    overrides = void 0;


    config = {
      paths: {},
      map: {},
      packages: {}
    };

    meta = JSON.parse(fs.readFileSync(path.join(basedir, "package.json"), "utf-8"));

    if (meta.overrides) {
      overrides = meta.overrides;
    } else {
      overrides = {};
    }

    defaultExcludes.map(function (name) {
      if (!excludes.includes(name)) {
        excludes.push(name);
      }
    });

    return exports.resolveDependencyTree(meta, basedir, { excludes: excludes, overrides: overrides });
  }).then(function (_resp) {
    pkgs = _resp;

    addPackages(config, pkgs);

    _createSystemConfig = createSystemConfig(meta);
    _createSystemConfig2 = _slicedToArray(_createSystemConfig, 2);
    mapPath = _createSystemConfig2[0];
    pkgConfig = _createSystemConfig2[1];


    config.paths[meta.name] = path.join(mapPath, "/");
    config.packages[meta.name] = pkgConfig;

    if (outfile) {
      exports.writeConfig(config, outfile);
    }

    return config;
  });
}

function writeConfig(config, outfile) {
  var configJson = JSON.stringify(config, null, 2);
  fs.writeFileSync(outfile, "SystemJS.config(" + configJson + ");");
}

function addPackages(config, pkgs) {
  var parent = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  pkgs.map(function (pkg) {
    addPackage(config, pkg, parent);
  });
  pkgs.map(function (pkg) {
    addPackages(config, pkg.dependencies, pkg);
  });
}

function addPackage(config, pkg) {
  var parent = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  var name = pkg.meta.name;
  var pkgConfig = Object.assign({}, pkg.config);
  var mapPath = pkg.mapPath;

  if (!config.map) {
    config.map = {};
  }
  if (!config.packages) {
    config.packages = {};
  }

  if (!config.packages[mapPath]) {
    config.packages[mapPath] = pkgConfig;
  } else {
    deepExtend(config.packages[mapPath], pkgConfig);
  }

  if (config.map[name] && config.map[name] !== mapPath && parent) {
    var parentPkgConfig = config.packages[parent.mapPath];
    if (!parentPkgConfig.map) {
      parentPkgConfig.map = {};
    }
    parentPkgConfig.map[name] = mapPath;
  } else {
    config.map[name] = mapPath;
  }
}

function createSystemConfig(meta) {
  var rootdir = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";

  var mapping = void 0,
      config = void 0,
      main = void 0,
      systemConfig = void 0;

  config = {};

  if (meta.systemjs) {
    systemConfig = Object.assign({}, meta.systemjs);
  }

  if (systemConfig && systemConfig.main) {
    main = systemConfig.main;
  } else if (meta["module"]) {
    main = meta["module"];
    config.format = "esm";
  } else if (meta["jsnext:main"]) {
    main = meta["jsnext:main"];
    config.format = "esm";
  } else {
    main = meta["main"];
  }

  if (meta.directories && meta.directories.lib) {
    mapping = meta.directories.lib;
  } else {
    mapping = main ? path.dirname(main) : "";
  }

  mapping = path.normalize(mapping);

  if (main) {
    main = path.normalize(main);
    if (main.indexOf(mapping) === 0) {
      main = path.relative(mapping, main);
    }
    config["main"] = main;
  }

  if (systemConfig) {
    delete systemConfig["main"];
    Object.assign(config, systemConfig);
  }

  if (rootdir) {
    mapping = path.join(rootdir, mapping);
  }

  return [mapping, config];
}

function resolveDependencyTree(meta, basedir) {
  var _ref2 = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
      _ref2$excludes = _ref2.excludes,
      excludes = _ref2$excludes === undefined ? [] : _ref2$excludes,
      _ref2$overrides = _ref2.overrides,
      overrides = _ref2$overrides === undefined ? {} : _ref2$overrides;

  return new Promise(function (resolve, reject) {
    var options = {
      basedir: path.resolve(basedir),
      lookups: ["peerDependencies", "dependencies"]
    };

    resolveTree.manifest(meta, options, function (error, tree) {
      if (error) {
        reject(error);
      } else {
        (function () {

          var normalizeTree = function normalizeTree(tree) {
            var normalizedTree = [];

            tree.map(function (treeItem) {
              if (!isExcluded(treeItem.meta)) {
                normalizedTree.push(normalizeTreeItem(treeItem));
              }
            });

            return normalizedTree;
          };

          var normalizeTreeItem = function normalizeTreeItem(treeItem) {
            var meta = Object.assign({}, treeItem.meta);
            var dependencies = [];
            var root = path.relative(options.basedir, treeItem.root);
            var override = overrides[meta.name + "@" + meta.version];
            var mapPath = void 0,
                config = void 0;

            if (!override) {
              override = overrides[meta.name];
            }

            if (override) {
              deepExtend(meta, override);
            }

            if (treeItem.dependencies) {
              treeItem.dependencies.map(function (treeItem) {
                if (!isExcluded(treeItem.meta)) {
                  dependencies.push(normalizeTreeItem(treeItem));
                }
              });
            }

            var _createSystemConfig3 = createSystemConfig(meta, root);

            var _createSystemConfig4 = _slicedToArray(_createSystemConfig3, 2);

            mapPath = _createSystemConfig4[0];
            config = _createSystemConfig4[1];


            return {
              root: root,
              mapPath: mapPath,
              config: config,
              meta: meta,
              dependencies: dependencies
            };
          };

          var isExcluded = function isExcluded(meta) {
            var name = meta.name;
            var version = meta.version;
            return excludes.includes(name) || excludes.includes(name + "@" + version);
          };

          resolve(normalizeTree(tree));
        })();
      }
    });
  });
}

export { defaultExcludes, buildConfig, writeConfig, addPackages, addPackage, createSystemConfig, resolveDependencyTree };
