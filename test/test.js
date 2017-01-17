import fs from "fs";
import path from "path";
import { assert } from "chai";
import { spy, stub } from "sinon";

import * as configurator from "../src/index";

const configFilePath = "./test/system.config.js";


function parseConfigFile(filePath) {
  let content = fs.readFileSync(filePath);
  return JSON.parse(content.slice("SystemJS.config(".length, content.length - 2));
}

function readManifest(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"));
}

function walkTree(tree, f) {
  tree.map((pkg) => {
    f(pkg);
    walkTree(pkg.dependencies, f);
  });
}

describe("Configurator", () => {
  describe("#writeConfig()", () => {

    afterEach(() => {
      try {
        fs.unlinkSync(configFilePath);
      } catch (e) {
        //
      }
    });

    it("creates systemjs config file for a given config object", () => {
      let c = {
        map: {
          app: "path/to/app/dist/folder"
        }
      };
      configurator.writeConfig(c, configFilePath);
      assert.deepEqual(c, parseConfigFile(configFilePath));
    });

  });

  describe("#buildConfig()", () => {

    before(() => {
      stub(configurator, "writeConfig");
    });

    after(() =>  {
      configurator.writeConfig.restore();
    });

    it("should not write config file if no file path is given", async () => {
      await configurator.buildConfig();
      assert.isFalse(configurator.writeConfig.called);
    });

    it("should write config file if file path is given", async () => {
      await configurator.buildConfig({outFile:configFilePath});
      assert.isTrue(configurator.writeConfig.calledOnce);
    });

    it("should create paths entry for package", async () => {
      let basedir = path.join(__dirname, "fixtures/pkg-no-deps");
      let config = await configurator.buildConfig({packageDir:basedir});
      assert.equal(config.paths["no-deps"], "dist/");
    });

    it("should create config file if package has no dependencies", async () => {
      let basedir = path.join(__dirname, "fixtures/pkg-no-deps");
      let config = await configurator.buildConfig({packageDir:basedir});
      assert.equal(Object.keys(config.map).length, 0);
      assert.equal(Object.keys(config.packages).length, 1);
    });

    it("should apply overrides entry of package manifest", async () => {
      let basedir = path.join(__dirname, "fixtures/pkg-with-overrides");
      let meta = readManifest(basedir);

      spy(configurator, "resolveDependencyTree");

      let config = await configurator.buildConfig({packageDir:basedir});
      let args = configurator.resolveDependencyTree.getCall(0).args;

      assert.deepEqual(args[2].overrides, meta.overrides);

      configurator.resolveDependencyTree.restore();
    });
  });

  describe("#createSystemConfig()", () => {

    let meta;

    beforeEach(() => {
      meta = {
        name: "test-package",
        version: "1.0.0",
        main: "dist/js/main.js",
        directories: {
          lib: "dist"
        }
      };
    });

    it("should use directories.lib as mapping path", () => {
      let [mapping,] = configurator.createSystemConfig(meta);
      assert.equal(mapping, "dist");
    });

    it("should prepend root directory to mapping path", () => {
      let [mapping,] = configurator.createSystemConfig(meta, "node_modules/test-package");
      assert.equal(mapping, "node_modules/test-package/dist");
    });

    it("should use base dir of main if no directories.lib in meta", () => {
      delete meta["directories"];
      let [mapping,] = configurator.createSystemConfig(meta);
      assert.equal(mapping, "dist/js");
    });

    it("should make main path relative to mapping path", () => {
      let [, config] = configurator.createSystemConfig(meta);
      assert.equal(config.main, "js/main.js");
    });

    it("should normalize mapping path", () => {
      meta.directories.lib = "./dist";
      let [mapping, config] = configurator.createSystemConfig(meta);
      assert.equal(mapping, "dist");
      assert.equal(config.main, "js/main.js");
    });

    it("should normalize main path", () => {
      meta.main = "./dist/js/main.js";
      let [mapping, config] = configurator.createSystemConfig(meta);
      assert.equal(mapping, "dist");
      assert.equal(config.main, "js/main.js");
    });

    it("should normalize paths if root directory is not set", () => {
      meta.directories.lib = "./dist";
      meta.main = "./dist/main.js";
      let [mapping, config] = configurator.createSystemConfig(meta);
      assert.equal(mapping, "dist");
      assert.equal(config.main, "main.js");
    });

    it("should normalize paths if root directory is set", () => {
      meta.directories.lib = "./dist";
      meta.main = "./dist/main.js";
      let [mapping, config] = configurator.createSystemConfig(meta, "node_modules/test-package");
      assert.equal(config.main, "main.js");
      assert.equal(mapping, "node_modules/test-package/dist");
    });

    it("should normalize mapping path if empty", () => {
      delete meta["main"];
      delete meta["directories"];
      let [mapping,] = configurator.createSystemConfig(meta);
      assert.equal(mapping, ".");
    });

    it("should use 'module' entry to create main path", () => {
      meta.module = "dist/js/main.esm.js";
      let [, config] = configurator.createSystemConfig(meta);
      assert.equal(config.format, "esm");
      assert.equal(config.main, "js/main.esm.js");
    });

    it("should use 'jsnext:main' entry to create main path", () => {
      meta["jsnext:main"] = "dist/js/main.esm.js";
      let [, config] = configurator.createSystemConfig(meta);
      assert.equal(config.format, "esm");
      assert.equal(config.main, "js/main.esm.js");
    });

    it("should not create main config if no main is set", () => {
      delete meta["main"];
      let [, config] = configurator.createSystemConfig(meta);
      assert.isFalse(!!config.main);
    });

    it("should create mapping path if no main is set", () => {
      delete meta["main"];
      let [mapping,] = configurator.createSystemConfig(meta);
      assert.equal(mapping, "dist");
    });

    it("should prepend mapping path with root directory if no main is set", () => {
      delete meta["main"];
      let [mapping,] = configurator.createSystemConfig(meta, "node_modules/test-package");
      assert.equal(mapping, "node_modules/test-package/dist");
    });

    it("should apply 'systemjs' entry if set", () => {
      meta.systemjs = {
        main: "dist/js/main.system.js",
        format: "global",
        meta: {
          deps: ["jquery"],
          exports: "$"
        }
      };
      let [, config] = configurator.createSystemConfig(meta);
      assert.equal(config.format, "global");
      assert.equal(config.main, "js/main.system.js");
      assert.deepEqual(config.meta, meta.systemjs.meta);
    });

    it("should notice if 'systemjs.main' entry is relative path", () => {
      meta.systemjs = {
        main: "js/main.system.js"
      };
      let [, config] = configurator.createSystemConfig(meta);
      assert.equal(config.main, "js/main.system.js");
    });

    it("should notice if 'main' entry is relative path", () => {
      meta.main = "js/main.js";
      let [mapping, config] = configurator.createSystemConfig(meta);
      assert.equal(config.main, "js/main.js");
      assert.equal(mapping, "dist");
    });
  });

  describe("#resolveDependencyTree()", async () => {

    let basedir, meta;

    beforeEach(() => {
      basedir = path.join(__dirname, "fixtures/resolve-tree");
      meta = readManifest(basedir);
    });

    it("attaches systemjs config to item", async () => {
      let depTree = await configurator.resolveDependencyTree(meta, basedir);

      walkTree(depTree, (pkg) => {
        assert.isOk(pkg.mapPath);
        assert.isOk(pkg.config);
      });
    });

    it("normalizes root directory to relative path", async () => {
      let depTree = await configurator.resolveDependencyTree(meta, basedir);
      walkTree(depTree, (pkg) => {
        assert.isFalse(path.isAbsolute(pkg.root));
      });
    });

    it("should exclude package by names", async () => {
      let excludes = ["a", "b1"];
      let depTree = await configurator.resolveDependencyTree(meta, basedir, {excludes: excludes});

      walkTree(depTree, (pkg) => {
        assert.isFalse(excludes.includes(pkg.meta.name));
      });
    });

    it("should exclude packages by name and version", async () => {
      let excludes = ["a@2.0.0", "b1@1.0.0"];
      let depTree = await configurator.resolveDependencyTree(meta, basedir, {excludes: excludes});

      walkTree(depTree, (pkg) => {
        assert.isFalse(excludes.includes(`${pkg.meta.name}@${pkg.meta.version}`));
      });
    });

    it("should not exclude packages with other version", async () => {
      let excludes = ["a@1.0.0"];
      let depTree = await configurator.resolveDependencyTree(meta, basedir, {excludes: excludes});
      let matches = [];

      walkTree(depTree, (pkg) => {
        if (pkg.meta.name === "a") {
          matches.push(pkg);
        }
      });
      assert.isTrue(matches.length > 0);
      matches.map((pkg) => {
        assert.notEqual(pkg.meta.version, "1.0.0");
      });
    });

    it("should assign overrides to package manifest", async () => {
      let overrides = {
        "a": { "main": "newMainA.js" },
        "b1": { "main": "newMainB1.js"}
      };
      let depTree = await configurator.resolveDependencyTree(meta, basedir, {overrides: overrides});

      walkTree(depTree, (pkg) => {
        let override = overrides[pkg.meta.name];
        if (override) {
          assert.equal(pkg.meta.main, override.main);
        }
      });
    });


    it("should deeply extend package manifest if override is given", async () => {
      let overrides = {
        "a@2.0.0": {
          "jspm": {
            "directories": {
              "lib": "lib"
            },
            "deps": [
              "jquery@3.0.0"
            ]
          }
        }
      };
      let depTree = await configurator.resolveDependencyTree(meta, basedir, {overrides: overrides});

      walkTree(depTree, (pkg) => {
        let override = overrides[`${pkg.meta.name}@${pkg.meta.version}`];
        if (override) {
          assert.equal(pkg.meta.jspm.directories.lib, "lib");
          assert.equal(pkg.meta.jspm.directories.dist, "dist");
          assert.deepEqual(pkg.meta.jspm.deps, override.jspm.deps);
        }
      });
    });

    it("should assign overrides to package manifest by version", async () => {
      let overrides = {
        "a@2.0.0": { "main": "newMainA.js" },
        "b1@1.0.0": { "main": "newMainB1.js"}
      };
      let depTree = await configurator.resolveDependencyTree(meta, basedir, {overrides: overrides});

      walkTree(depTree, (pkg) => {
        let override = overrides[`${pkg.meta.name}@${pkg.meta.version}`];
        if (override) {
          assert.equal(pkg.meta.main, override.main);
        }
      });
    });

    it("should prefer versionized override to common override", async () => {
      let overrides = {
        "a": { "main": "newMainA.js" },
        "a@2.0.0": { "main": "newMainA_V2.js" }
      };
      let depTree = await configurator.resolveDependencyTree(meta, basedir, {overrides: overrides});
      let matches = [];

      walkTree(depTree, (pkg) => {
        if (pkg.meta.name === "a" && pkg.meta.version === "2.0.0") {
          matches.push(pkg);
        }
      });
      assert.isTrue(matches.length > 0);
      matches.map((pkg) => {
        assert.equal(pkg.meta.main, "newMainA_V2.js");
      });
    });

    it("should raise an error if dependency cannot be resolved", async () => {
      meta.dependencies["doesnotexist"] = null;
      try {
        await configurator.resolveDependencyTree(meta, basedir);
      } catch (error) {
        assert(error);
      }
    });
  });
  describe("#addPackage", () => {

    let pkg;

    before(() => {
      pkg = {
        meta: { name: "dummy-package" },
        mapPath: "path/to/dummy/package",
        config: {
          main: "path/to/dummy/main/file"
        }
      };
    });

    it("initializes config if config has no map and packages property", async () => {
      let config = {};
      configurator.addPackage(config, pkg);
      assert.ok(config.map);
      assert.ok(config.packages);
    });

    it("creates map config", async () => {
      let config = {};
      configurator.addPackage(config, pkg);
      assert.equal(config.map[pkg.meta.name], pkg.mapPath);
    });

    it("creates package config", async () => {
      let config = {};
      configurator.addPackage(config, pkg);
      assert.deepEqual(config.packages[pkg.mapPath], pkg.config);
    });

    it("raises error if ", async () => {
      let config = {};
      configurator.addPackage(config, pkg);
      assert.deepEqual(config.packages[pkg.mapPath], pkg.config);
    });
  });
  
  describe("#addPackages", () => {

    let basedir, meta;

    before(() => {
      basedir = path.join(__dirname, "fixtures/resolve-tree");
      meta = readManifest(basedir);
    });

    it("creates map config for deep dependencies", async () => {
      let config = {};
      let pkgs = await configurator.resolveDependencyTree(meta, basedir);

      configurator.addPackages(config, pkgs);

      assert.ok(config.map["b1"]);
      assert.ok(config.map["b2"]);
    });

    it("creates package config for deep dependencies", async () => {
      let config = {};
      let pkgs = await configurator.resolveDependencyTree(meta, basedir);

      configurator.addPackages(config, pkgs);

      assert.ok(config.packages["node_modules/b/node_modules/b1"]);
      assert.ok(config.packages["node_modules/b/node_modules/b2"]);
    });

    it("handles multiple package versions", async () => {
      let config = {};
      let pkgs = await configurator.resolveDependencyTree(meta, basedir);

      configurator.addPackages(config, pkgs);

      assert.ok(config.packages["node_modules/c"]["map"]["a"]);
      assert.ok(config.packages["node_modules/c"]["map"]["b"]);
    });
  });
});
