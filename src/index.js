import path from "path";
import fs from "fs";

const defaultExcludes = ["systemjs"];

export function buildConfig({
    basedir=process.cwd(), outfile=null, excludes=[], includes=[],
    overrides={}} = {}
) {

  let meta = readManifest(basedir);
  let options = {
    basedir: path.resolve(basedir),
    excludes: [...defaultExcludes, ...excludes],
    overrides: Object.assign({}, meta.overrides, overrides)
  };

  let pkg = createPackage(basedir, meta, options);
  let config = {
    paths: {
      [`${pkg.name}/`]: `${pkg.location}/`
    },
    map: {},
    packages: {
      [pkg.name]: pkg.config
    }
  };

  includes.map((name) => {
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

export function writeConfig(config, outfile) {
  let configJson = JSON.stringify(config, null, 2);
  fs.writeFileSync(outfile, `SystemJS.config(${configJson});`);
}

function readManifest(dir) {
  let file = path.join(dir, "package.json");
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function findManifest(name, fromdir) {
  let dir = path.join(fromdir, "node_modules", name);
  try {
    let meta = readManifest(dir);
    return [dir, meta];
  } catch (error) {
    let nextdir = path.join(fromdir, "..");
    if (nextdir === fromdir) {
      throw new Error(`Cannot find manifest for "${name}".`);
    }
    return findManifest(name, nextdir);
  }
}

export function createPackage(dir, meta, options) {
  let pkg = {};
  let override = options.overrides[`${meta.name}@${meta.version}`] || options.overrides[meta.name];

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
  Object.keys(pkg.dependencies).reduce((deps, name) => {
    let [dir, meta] = findManifest(name, path.join(options.basedir, pkg.dir));
    let dep = createPackage(dir, meta, options);
    if (
      !config.packages[dep.location]
      && options.excludes.indexOf(`${dep.name}@${dep.version}`) < 0
      && options.excludes.indexOf(dep.name) < 0
    ) {
      addPackage(config, dep, pkg);
      deps.push(dep);
    }
    return deps;
  }, []).map((dep) => {
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
