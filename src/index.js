import path from "path";
import fs from "fs";
import resolveTree from "resolve-tree";
import deepExtend from "deep-extend";


export async function buildConfig({
    packageDir=process.cwd(), outFile=null, excludes=[]
  } = {}) {

  let meta, config;

  config = {
    paths: {},
    map: {},
    packages: {}
  };

  meta = JSON.parse(
    fs.readFileSync(path.join(packageDir, "package.json"), "utf-8")
  );

  await resolveDependencyTree(meta, packageDir, {excludes: excludes});

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

  mapping = path.normalize(mapping);

  if (meta.systemjs) {
    Object.assign(config, meta.systemjs);
  }

  if (main) {
    main = path.normalize(main);
    if (main.indexOf(mapping) === 0) {
      main = path.relative(mapping, main);
    }
    config["main"] = main;
  }

  if (rootdir) {
    mapping = path.join(rootdir, mapping);
  }

  return [mapping, config];
}

export function resolveDependencyTree(meta, basedir, {excludes=[], overrides={}}={}) {
  return new Promise((resolve, reject) => {
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

          tree.map((treeItem) => {
            if (!isExcluded(treeItem.meta)) {
              normalizedTree.push(normalizeTreeItem(treeItem));
            }
          });

          return normalizedTree;
        };

        const normalizeTreeItem = (treeItem) => {
          let meta = Object.assign({}, treeItem.meta);
          let dependencies = [];
          let root = path.relative(options.basedir, treeItem.root);
          let override = overrides[`${meta.name}@${meta.version}`];

          if (!override) {
            override = overrides[meta.name];
          }

          if (override) {
            deepExtend(meta, override);
          }

          if (treeItem.dependencies) {
            treeItem.dependencies.map((treeItem) => {
              if (!isExcluded(treeItem.meta)) {
                dependencies.push(normalizeTreeItem(treeItem));
              }
            });
          }

          return {
            root: root,
            meta: meta,
            dependencies: dependencies
          };
        };

        const isExcluded = (meta) => {
          let name = meta.name;
          let version = meta.version;
          return (excludes.includes(name) || excludes.includes(`${name}@${version}`));
        };

        resolve(normalizeTree(tree));
      }
    });
  });
}
