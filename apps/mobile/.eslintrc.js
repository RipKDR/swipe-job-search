const path = require('path');

module.exports = {
  extends: ['expo'],
  rules: {
    'no-undef': 'off',
  },
  settings: {
    'import/resolver': {
      node: {
        paths: [path.resolve(__dirname, '../../packages/shared/src')],
      },
    },
  },
  plugins: ['import'],
};
