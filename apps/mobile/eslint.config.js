// Flat config (ESLint v9+). Replaces the legacy .eslintrc.js.
// Uses the flat preset bundled with eslint-config-expo.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'android/**',
      'ios/**',
      '.metro-stubs/**',
      'scripts/**',
    ],
  },
  ...expoConfig,
  {
    rules: {
      'no-undef': 'off',
      // eslint-plugin-react-hooks v7 promoted the experimental React Compiler
      // rules to errors by default. They flag optimization opportunities, not
      // runtime bugs, and were never enforced in this codebase before. Keep them
      // as warnings so they stay visible for incremental cleanup without breaking
      // CI / blocking the build.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/error-boundaries': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  {
    // Test setup defines anonymous mock components; display names add no value here.
    files: ['vitest.setup.ts', 'vitest-*.ts', '__mocks__/**', '__vitest_mocks__/**'],
    rules: {
      'react/display-name': 'off',
    },
  },
];
