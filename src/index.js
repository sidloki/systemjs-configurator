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
