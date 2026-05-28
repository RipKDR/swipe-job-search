const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const nativewindConfig = withNativewind(config, {
  // inline variables break PlatformColor in CSS variables
  inlineVariables: false,
  // We add className support manually via useCssElement
  globalClassNamePolyfill: false,
});

// Expo 52 doesn't export unstable_transformerPath from @expo/metro-config,
// but react-native-css nightly needs it. Replace the transformerPath with
// our shim that injects the missing export before loading the real transformer.
nativewindConfig.transformerPath = path.resolve(
  __dirname,
  "metro-transformer-shim.js"
);

module.exports = nativewindConfig;
