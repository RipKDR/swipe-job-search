'use strict';
const React = require('react');
module.exports = {
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  useSegments: () => [],
  usePathname: () => '/',
  useGlobalSearchParams: () => ({}),
  Slot: ({ children }) => children || null,
  Stack: { Screen: () => null, Navigator: ({ children }) => children || null },
  Tabs: { Screen: () => null, Navigator: ({ children }) => children || null },
  router: { push: () => {}, replace: () => {}, back: () => {} },
  Link: ({ children }) => React.createElement('a', null, children),
  Redirect: () => null,
  withLayoutContext: (x) => x,
  useLocalSearchParams: () => ({}),
  ExpoRoot: ({ children }) => children || null,
};
