import fs from "fs";
import path from "path";
import { assert } from "chai";
import { stub } from "sinon";

import * as configurator from "../src/index";

const configFilePath = "./test/system.config.js";


function parseConfigFile(filePath) {
  let content = fs.readFileSync(filePath);
  return JSON.parse(content.slice("SystemJS.config(".length, content.length - 2));
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

    it("should have defaults for build options", () => {
      let config = configurator.buildConfig();
      assert(config.packages["systemjs-configurator"]);
    });

    it("should not write config file if no file path is given", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-no-deps");

      stub(configurator, "writeConfig");

      configurator.buildConfig({basedir:basedir});

      assert.isFalse(configurator.writeConfig.called);

      configurator.writeConfig.restore();
    });

    it("should write config file if file path is given", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-no-deps");

      stub(configurator, "writeConfig");

      configurator.buildConfig({basedir: basedir, outfile:configFilePath});
      assert.isTrue(configurator.writeConfig.calledOnce);

      configurator.writeConfig.restore();
    });

    it("should create paths entry for main package", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-no-deps");
      let config = configurator.buildConfig({basedir:basedir});
      assert.equal(config.paths["dummy-pkg/"], "dist/");
    });

    it("should create packages entry for main package with main config", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-no-deps");
      let config = configurator.buildConfig({basedir:basedir});
      assert.deepEqual(config.packages["dummy-pkg"], { main: "index.js" });
    });

    it("should not create map entry for main package", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-no-deps");
      let config = configurator.buildConfig({basedir:basedir});
      assert.equal(Object.keys(config.map).length, 0);
    });

    it("should raise an error if a package dependency cannot be found", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-missing-dep");
      assert.throws(() => {
        configurator.buildConfig({basedir:basedir});
      });
    });

    it("should create map config for dependencies", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-deps");
      let config = configurator.buildConfig({basedir:basedir});
      assert.equal(config.map.a, "node_modules/a");
      assert.equal(config.map.b, "node_modules/b");
      assert.equal(config.map.c, "node_modules/c");
    });

    it("should create packages config for dependencies", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-deps");
      let config = configurator.buildConfig({basedir:basedir});
      assert.deepEqual(config.packages["node_modules/a"], {main: "index.js"});
      assert.deepEqual(config.packages["node_modules/b"], {main: "index.js"});
      assert.deepEqual(config.packages["node_modules/c"], {main: "index.js"});
    });

    it("should resolve circular dependencies", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-circular-deps");
      let config = configurator.buildConfig({basedir: basedir});
      assert.deepEqual(Object.keys(config.map), ["a", "b", "c"]);
      assert.deepEqual(Object.keys(config.packages), ["dummy-pkg", "node_modules/a", "node_modules/b", "node_modules/c"]);
    });

    it("should resolve deep dependencies", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-deep-deps");
      let config = configurator.buildConfig({basedir: basedir});
      assert.equal(config.map.b1, "node_modules/b/node_modules/b1");
      assert.equal(config.map.b2, "node_modules/b/node_modules/b2");
      assert(config.packages["node_modules/b/node_modules/b1"]);
      assert(config.packages["node_modules/b/node_modules/b2"]);
    });

    it("should resolve different package versions", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-different-versions");
      let config = configurator.buildConfig({basedir: basedir});
      assert.notEqual(config.map.a, "node_modules/c/node_modules/a");
      assert.notEqual(config.map.b, "node_modules/c/node_modules/b");
      assert.equal(config.packages["node_modules/c"].map.a, "node_modules/c/node_modules/a");
      assert.equal(config.packages["node_modules/c"].map.b, "node_modules/c/node_modules/b");
    });

    it("should always exclude default excludes", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-systemjs-dep");
      let config = configurator.buildConfig({basedir: basedir});
      assert(!config.map.systemjs);
      assert(!config.packages["node_modules/systemjs"]);
    });

    it("should exclude given excludes", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-deps");
      let excludes = ["a", "b"];
      let config = configurator.buildConfig({basedir: basedir, excludes: excludes});
      excludes.map((name) => {
        assert(!config.map[name]);
        assert(!config.packages[`node_modules/${name}`]);
      });
    });

    it("should include given includes", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-no-deps");
      let includes = ["a", "b"];
      let config = configurator.buildConfig({basedir: basedir, includes: includes});
      includes.map((name) => {
        assert(config.map[name]);
        assert(config.packages[`node_modules/${name}`]);
      });
    });

    it("should use overrides entry of main package manifest", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-overrides");
      let config = configurator.buildConfig({basedir: basedir});
      assert(config.map.text);
      assert.deepEqual(config.packages["node_modules/systemjs-plugin-text"], {main: "text.js"});
    });

    it("should use given overrides", () => {
      let basedir = path.join(__dirname, "fixtures/pkg-deps");
      let overrides = {
        a: {
          main: "a.js"
        }
      };
      let config = configurator.buildConfig({basedir: basedir, overrides: overrides});
      assert.deepEqual(config.packages["node_modules/a"], {main: "a.js"});
    });
  });

  describe("#createPackage()", () => {

    let dir, meta, options;

    beforeEach(() => {
      dir = __dirname;
      options = {
        basedir: __dirname,
        overrides: {}
      };
      meta = {
        name: "test-package",
        version: "1.0.0",
        main: "dist/js/main.js",
        directories: {
          lib: "dist"
        }
      };
    });

    it("should use directories.lib as location path", () => {
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.location, "dist");
    });

    it("should prepend package dir to locatin path", () => {
      dir = path.join(options.basedir, "path/to/package");
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.location, "path/to/package/dist");
    });

    it("should use base dir of main if no directories.lib in meta", () => {
      delete meta["directories"];
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.location, "dist/js");
    });

    it("should make main path relative to location path", () => {
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.config.main, "js/main.js");
    });

    it("should normalize location path", () => {
      meta.directories.lib = "./dist";
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.location, "dist");
    });

    it("should normalize main path", () => {
      meta.main = "./dist/js/main.js";
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.config.main, "js/main.js");
    });

    it("should normalize paths if package directory is base directory", () => {
      meta.directories.lib = "./dist";
      meta.main = "./dist/main.js";
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.config.main, "main.js");
      assert.equal(pkg.location, "dist");
    });

    it("should normalize paths if package directory is not empty string", () => {
      meta.directories.lib = "./dist";
      meta.main = "./dist/main.js";
      dir = path.join(options.basedir, "path/to/package");
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.config.main, "main.js");
      assert.equal(pkg.location, "path/to/package/dist");
    });

    it("should normalize location path if path is empty string", () => {
      delete meta["main"];
      delete meta["directories"];
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.location, ".");
    });

    it("should use 'module' entry to create main path", () => {
      meta.module = "dist/js/main.esm.js";
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.config.format, "esm");
      assert.equal(pkg.config.main, "js/main.esm.js");
    });

    it("should use 'jsnext:main' entry to create main path", () => {
      meta["jsnext:main"] = "dist/js/main.esm.js";
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.config.format, "esm");
      assert.equal(pkg.config.main, "js/main.esm.js");
    });

    it("should not create main config if no main is set", () => {
      delete meta["main"];
      let pkg = configurator.createPackage(dir, meta, options);
      assert(!pkg.config.main);
    });

    it("should create location path if no main is set", () => {
      delete meta["main"];
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.location, "dist");
    });

    it("should prepend location path with package directory if no main is set", () => {
      delete meta["main"];
      dir = path.join(options.basedir, "path/to/package");
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.location, "path/to/package/dist");
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
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.config.format, "global");
      assert.equal(pkg.config.main, "js/main.system.js");
      assert.deepEqual(pkg.config.meta, meta.systemjs.meta);
    });

    it("should notice if 'systemjs.main' entry is relative to location path", () => {
      meta.systemjs = {
        main: "js/main.system.js"
      };
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.location, "dist");
      assert.equal(pkg.config.main, "js/main.system.js");
    });

    it("should notice if 'main' entry is relative to location path", () => {
      meta.main = "js/main.js";
      let pkg = configurator.createPackage(dir, meta, options);
      assert.equal(pkg.location, "dist");
      assert.equal(pkg.config.main, "js/main.js");
    });
  });
});
