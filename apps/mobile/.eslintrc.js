const path = require('path');

module.exports = {
  extends: ['expo'],
  rules: {
    'no-undef': 'off',
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: path.resolve(path.join(__dirname, 'tsconfig.json')),
      },
      node: {
        paths: [path.resolve(path.join(__dirname, '../../packages/shared/src'))],
      }
    }
  },
  plugins: ['import', 'react-native'],
};
