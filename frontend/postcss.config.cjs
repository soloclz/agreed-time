module.exports = {
  plugins: {
    autoprefixer: {
      overrideBrowserslist: [
        'last 2 versions',
        'Safari >= 12',
        'iOS >= 12',
        'Chrome >= 90',
        'Firefox >= 88',
        'Edge >= 90'
      ]
    }
  }
};
