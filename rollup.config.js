import babel from "rollup-plugin-babel";

export default {
  entry: "src/index.js",
  format: "cjs",
  external: [
    "fs",
    "path"
  ],
  plugins: [
    babel({
      babelrc: false,
      presets: [
        ["es2015", {"modules": false}]
      ],
      exclude: "node_modules/**"
    })
  ],
	targets: [
		{ dest: "dist/systemjs-configurator.legacy.js", format: "cjs" },
		{ dest: "dist/systemjs-configurator.js", format: "es" }
	]
};
