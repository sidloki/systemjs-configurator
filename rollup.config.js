import babel from "rollup-plugin-babel";

export default {
  entry: "src/index.js",
  format: "cjs",
  external: [
    "deep-extend",
    "fs",
    "path",
    "resolve-tree"
  ],
  plugins: [
    babel({
      babelrc: false,
      presets: [
        ["es2015", {"modules": false}]
      ],
      plugins: [
        "async-to-promises"
      ],
      exclude: "node_modules/**"
    })
  ],
	targets: [
		{ dest: "dist/systemjs-configurator.legacy.js", format: "cjs" },
		{ dest: "dist/systemjs-configurator.js", format: "es" }
	]
};
