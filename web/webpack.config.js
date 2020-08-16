const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
var cdkVersion = require('../lambda/package-lock.json').dependencies['@aws-cdk/core'].version;

module.exports = {
  mode: 'development',
  target: 'web',
  entry: {
		"app": './index.ts',
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
        new CopyPlugin({
          patterns: [
            {from: 'launch-stack.svg'}
          ],
        }),
        new CompressionPlugin({
          filename: 'br/[path][query]',
          algorithm: 'brotliCompress',
          test: /\.js$/,
          compressionOptions: { level: 11 },
          minRatio: 1,
          deleteOriginalAssets: false,
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
          inject: true,
          template: 'index.html',
          chunks: ['runtime', 'app'],
          templateParameters: {
            'cdkVersion': cdkVersion
          },
        }),
        new MonacoWebpackPlugin({
          languages: ['typescript'],
          features: [
              'bracketMatching',
              'clipboard',
              'coreCommands',
              'cursorUndo',
              'find',
              'format',
              'hover',
              'inPlaceReplace',
              'iPadShowKeyboard',
              'links',
              'suggest',
          ],
      }),
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
        },
        {
            test: /\.ttf$/,
            use: ['file-loader'],
        }]
  },
  optimization: {
    moduleIds: 'hashed',
    runtimeChunk: 'single'
  }
};