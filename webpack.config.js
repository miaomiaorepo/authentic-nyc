const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

module.exports = {
  mode: "development",
  entry: {
    app: "./src/index.ts",
  },
  devtool: "inline-source-map",
  devServer: {
    static: "./dist",
    hot: true,
    port: 9000,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.(json|geojson)$/,
        type: "json",
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/img", to: "img" },
        { from: "src/data", to: "data" },
      ],
    }),
    new HtmlWebpackPlugin({
      template: "src/index.html",
      inject: "body",
    }),
  ],
};
