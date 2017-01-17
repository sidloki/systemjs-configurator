import path from "path";
import resolveTree from "resolve-tree";
import deepExtend from "deep-extend";

export function configure() {
  return 42;
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
