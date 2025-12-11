module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      overrideBrowserslist: [
        'last 3 versions',
        'Safari >= 9',
        'iOS >= 9',
        'Chrome >= 53',
        'ChromeAndroid >= 53',
        'Firefox >= 88',
        'Edge >= 79',
        'Android >= 4.4'
      ],
      grid: false,
      flexbox: 'no-2009'
    }
  }
};
