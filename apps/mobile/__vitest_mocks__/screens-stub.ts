module.exports = {
  enableScreens: () => {},
  screensEnabled: () => false,
  Screen: ({ children }: any) => require('react').createElement('div', null, children),
  ScreenContainer: ({ children }: any) => require('react').createElement('div', null, children),
  NativeScreen: ({ children }: any) => require('react').createElement('div', null, children),
  ScreenStack: ({ children }: any) => require('react').createElement('div', null, children),
  SearchBar: () => null,
  FullWindowOverlay: ({ children }: any) => children,
  ScreenStackHeaderConfig: () => null,
  default: undefined,
};
