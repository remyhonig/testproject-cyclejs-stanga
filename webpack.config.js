module.exports = {
  entry: './src/index.js',
  output: {
    filename: './dist/*'
  },
  target: 'node',
  devtool: 'source-map',
  module: {
    loaders: [
      {
        test: /.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: ['es2015']
        }
      }
    ]
  }
};
