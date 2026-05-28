const path = require('path');

module.exports = {
  extends: ['expo'],
  rules: {
    'no-undef': 'off',
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
  plugins: ['import'],
};
