const path = require("path");

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
