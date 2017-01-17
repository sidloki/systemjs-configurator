import path from "path";
import fs from "fs";
import resolveTree from "resolve-tree";
import deepExtend from "deep-extend";


export async function buildConfig({
    packageDir=process.cwd(), outFile=null, excludes=[]
  } = {}) {

  let meta, lookups, config, depTree;

  config = {
    paths: {},
    map: {},
    packages: {}
  };

  meta = JSON.parse(
    fs.readFileSync(path.join(packageDir, "package.json"), "utf-8")
  );

  depTree = await resolveDependencyTree(meta, packageDir);

  if (outFile) {
    exports.writeConfig(config, outFile);
  }

  return config;
}

export function writeConfig(config, outFile) {
  let configJson = JSON.stringify(config, null, 2);
  fs.writeFileSync(outFile, `SystemJS.config(${configJson});`);
}

export function createSystemConfig(meta, rootdir="") {
  let mapping, config, main;

  config = {};

  if (meta.systemjs && meta.systemjs.main) {
    main = meta.systemjs.main;
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

  if (rootdir) {
    mapping = path.join(rootdir, mapping);
  }

  if (meta.systemjs) {
    Object.assign(config, meta.systemjs);
  }

  if (main) {
    if (main.indexOf(mapping) === 0) {
      main = path.relative(mapping, main);
    }
    config["main"] = main;
  }

  return [mapping, config];
}

export function resolveDependencyTree(meta, basedir, {excludes=[], overrides={}}={}) {
  return new Promise((resolve, reject) => {
    let deps = {};
    let options = {
      basedir: path.resolve(basedir),
      lookups: ["peerDependencies", "dependencies"]
    };

    resolveTree.manifest(meta, options, (error, tree) => {
      if (error) {
        reject(error);
      } else {

        const normalizeTree = (tree) => {
          let normalizedTree = [];

          tree.map((depPkg) => {
            if (!isExcluded(depPkg)) {
              normalizedTree.push(normalizePackage(depPkg));
            }
          });

          return normalizedTree;
        };

        const isExcluded = (pkg) => {
          let name = pkg.meta.name;
          let version = pkg.meta.version;
          return (excludes.includes(name) || excludes.includes(`${name}@${version}`));
        };

        const normalizePackage = (pkg) => {
          let meta = Object.assign({}, pkg.meta);
          let dependencies = [];
          let root = path.relative(options.basedir, pkg.root);
          let override = overrides[`${pkg.meta.name}@${pkg.meta.version}`];

          if (!override) {
            override = overrides[pkg.meta.name];
          }

          if (override) {
            deepExtend(meta, override);
          }

          if (pkg.dependencies) {
            pkg.dependencies.map((depPkg) => {
              if (!isExcluded(depPkg)) {
                dependencies.push(normalizePackage(depPkg));
              }
            });
          }

          return {
            root: root,
            meta: meta,
            dependencies: dependencies
          };
        };

        resolve(normalizeTree(tree));
      }
    })
  });
}
