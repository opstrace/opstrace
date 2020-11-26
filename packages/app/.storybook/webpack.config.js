/**
 * Copyright 2020 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const path = require("path");

module.exports = ({ config }) => {
  config.entry = {
    "main.js": config.entry
  };
  config.output = {
    path: config.output.path,
    publicPath: config.output.publicPath,
    filename: "[name]",
    globalObject: "self"
  };

  config.module.rules = config.module.rules.filter(
    rule => rule.test.toString() !== /\.css$/.toString()
  );

  config.module.rules.unshift(
    {
      test: /\.(ts|tsx)$/,
      use: [
        {
          loader: require.resolve("babel-loader"),
          options: {
            customize: require.resolve(
              "babel-preset-react-app/webpack-overrides"
            ),
            plugins: [
              "@babel/plugin-proposal-optional-chaining",
              "@babel/plugin-proposal-class-properties",
              "@babel/plugin-syntax-dynamic-import",
              [require.resolve("@loadable/babel-plugin")],
              [require.resolve("babel-plugin-styled-components")],
              [
                require.resolve("babel-plugin-named-asset-import"),
                {
                  loaderMap: {
                    svg: {
                      ReactComponent:
                        "@svgr/webpack?-svgo,+titleProp,+ref![path]"
                    }
                  }
                }
              ]
            ],
            // This is a feature of `babel-loader` for webpack (not Babel itself).
            // It enables caching results in ./node_modules/.cache/babel-loader/
            // directory for faster rebuilds.
            cacheDirectory: true,
            // See #6846 for context on why cacheCompression is disabled
            cacheCompression: false
          }
        }
      ]
    },
    {
      test: /\.css$/,
      use: ["style-loader", "css-loader"]
    },
    {
      test: /\.ttf$/,
      use: ["file-loader"]
    }
  );

  config.resolve.alias = {
    ...config.resolve.alias,
    client: path.resolve("src/client/"),
    server: path.resolve("src/server/"),
    state: path.resolve("src/state/")
  };

  config.node = { fs: "empty" }; // See https://github.com/tree-sitter/tree-sitter/issues/466

  config.resolve.extensions.push(".ts", ".tsx", ".json", ".mjs");
  config.devServer = {
    hot: true,
    inline: true
  };
  return config;
};
