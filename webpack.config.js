const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const mode = process.env.NODE_ENV || 'development';
const minimize = mode === 'production';
const plugins = [];

if (mode === 'production') {
  plugins.push(new OptimizeCSSAssetsPlugin({
    cssProcessorOptions: {
      discardComments: true
    },
  }));
}

module.exports = {
  mode,
  devtool: 'source-map',
  entry: {
    main: [
      path.resolve(__dirname, 'src/resources/app.js'),
      path.resolve(__dirname, 'src/resources/app.scss'),
    ]
  },
  optimization: {
    minimize,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css'
    }),
    ...plugins
  ],
  output: {
    path: path.resolve(__dirname, '_book')
  },
  module: {
    rules: [
      {
        test: /\.(svg|png|jpe?g|gif|webp)$/,
        use: [
          {
            loader: require.resolve('file-loader')
          }
        ]
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: require.resolve('css-loader'),
            options: {
              sourceMap: true
            }
          },
          {
            loader: require.resolve('sass-loader'),
            options: {
              minimize,
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.js$/,
        use: {
          loader: require.resolve('babel-loader')
        }
      }
    ]
  }
};
