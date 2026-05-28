const path = require('path');

module.exports = {
  extends: ['expo'],
  rules: {
    'no-undef': 'off',
    'react-native/no-inline-styles': 'error',
    'react-native/no-color-literals': 'error',
    'react-native/no-raw-text': 'error',
    'react-native/no-single-element-style-arrays': 'error',
    'react-native/no-unused-styles': 'error',
    'react-native/no-inline-styles': 'error',
    'react-native/no-color-literals': 'error',
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: path.resolve(__dirname, 'tsconfig.json'),
      },
      node: {
        paths: [path.resolve(__dirname), path.resolve(__dirname, '../../packages/shared/src')],
      },
    },
  },
  plugins: ['import', 'react-native'],
};
