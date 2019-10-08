const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  target: 'web',
  entry: {
		"app": './index.ts',
		"editor.worker": 'monaco-editor/esm/vs/editor/editor.worker.js',
    "ts.worker": 'monaco-editor/esm/vs/language/typescript/ts.worker'
    },
    resolve: {
        modules: [ 'node_modules' ],
        extensions: [".ts", ".js"]
      },
	output: {
		globalObject: 'self',
		filename: '[name].[contenthash].bundle.js',
		path: path.resolve(__dirname, 'dist')
    },
    node: {
        fs: "empty",
        net: "empty",
        process: true
    },
    plugins: [
        new CopyPlugin([
          { from: 'launch-stack.svg' }
        ]),
        new CompressionPlugin({
          filename: 'br/[path][query]',
          algorithm: 'brotliCompress',
          test: /\.js$/,
          compressionOptions: { level: 11 },
          threshold: 10240,
          // minRatio: 0.8,
          deleteOriginalAssets: false,
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
          inject: true,
          template: 'index.html',
          chunks: ['app'],
        })
      ],
	module: {
		rules: [
        {
            test: /\.ts?$/,
            use: "ts-loader",
            exclude: /node_modules/
        },
        {
			test: /\.css$/,
			use: [ 'style-loader', 'css-loader' ]
        },
        {
            test: /\.js$/,
            loader: 'string-replace-loader',
            options: {
              search: 'process.versions.node',
              replace: '\'10.16.3\'',
              flags: 'g'
            }
        }]
  }
};