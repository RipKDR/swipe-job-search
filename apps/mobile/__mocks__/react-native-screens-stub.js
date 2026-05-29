'use strict';
const React = require('react');
module.exports = {
  enableScreens: function() {},
  screensEnabled: function() { return false; },
  Screen: function(props) { return React.createElement('div', null, props && props.children); },
  ScreenContainer: function(props) { return React.createElement('div', null, props && props.children); },
  NativeScreen: function(props) { return React.createElement('div', null, props && props.children); },
  ScreenStack: function(props) { return React.createElement('div', null, props && props.children); },
  SearchBar: function() { return null; },
  FullWindowOverlay: function(props) { return props && props.children || null; },
  ScreenStackHeaderConfig: function() { return null; },
  default: undefined,
};
