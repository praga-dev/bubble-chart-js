const path = require("path");
const webpack = require("webpack");

/** @type {import('webpack').Configuration} */
const commonConfig = {
  entry: "./src/index.ts",
  target: "web",
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    // Required for debug tree-shaking: replaces process.env.NODE_ENV at build time.
    // With this + Terser, `if (process.env.NODE_ENV !== "production") { ... }` blocks
    // are eliminated from the production bundle. Without it, debug code ships (but no-ops).
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
    }),
  ],
  optimization: {
    minimize: true,
  },
};

/** UMD Build (Browser + Node.js) */
const umdConfig = {
  ...commonConfig,
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bubbleChart.umd.js",
    library: "BubbleChart",
    libraryTarget: "umd",
    globalObject: "this",
    umdNamedDefine: true,
  },
};

/** ESM Build (Modern JavaScript) */
const esmConfig = {
  ...commonConfig,
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bubbleChart.esm.js",
    library: {
      type: "module",
    },
  },
  experiments: {
    outputModule: true, // Required for ESM builds
  },
};

/** CommonJS Build (Node.js) */
const cjsConfig = {
  ...commonConfig,
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bubbleChart.cjs.js",
    library: {
      type: "commonjs2",
    },
  },
};

module.exports = [umdConfig, esmConfig, cjsConfig];
