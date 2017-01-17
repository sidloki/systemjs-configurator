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

  });

  describe("#resolveDependencyTree()", async () => {

    let basedir, meta;

    beforeEach(() => {
      basedir = path.join(__dirname, "fixtures/resolve-tree");
      meta = JSON.parse(fs.readFileSync(path.join(basedir, "package.json"), "utf-8"))
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
        let depTree = await configurator.resolveDependencyTree(meta, basedir);
      } catch (error) {
        assert(error);
      }
    });
  });
});
