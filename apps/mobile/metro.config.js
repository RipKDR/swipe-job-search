const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");
const path = require("path");
const fs = require("fs");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const nativewindConfig = withNativewind(config, {
  inlineVariables: false,
  globalClassNamePolyfill: false,
});

nativewindConfig.transformerPath = path.resolve(
  __dirname,
  "metro-transformer-shim.js"
);

// Web stub for native-only packages.
// Provides a Proxy that returns no-ops for any property access,
// so lazy require() calls inside Platform.OS gates don't crash.
const stubDir = path.join(__dirname, ".metro-stubs");
if (!fs.existsSync(stubDir)) fs.mkdirSync(stubDir, { recursive: true });

const stubContent = `
const handler = {
  get: function(target, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return new Proxy({}, handler);
    if (typeof prop === 'symbol') return undefined;
    return new Proxy(function() {}, handler);
  },
  apply: function(target, thisArg, args) {
    return new Proxy({}, handler);
  },
};
module.exports = new Proxy({}, handler);
`;

const stubPath = path.join(stubDir, "native-stub.js");
fs.writeFileSync(stubPath, stubContent);

// Packages to stub on web — both transitive deps (blockList can't reach)
// and direct requires inside Platform.OS gates.
const nativeOnlyPackages = new Set([
  "expo-secure-store",
  "expo-notifications",
  "expo-haptics",
  "expo-device",
  "expo-application",
  "expo-file-system",
  "expo-localization",
  "expo-image-picker",
  "expo-image",
  "posthog-react-native",
  "@posthog/core",
  "@posthog/core/surveys",
  "@opentelemetry/api",
]);

// Intercept ALL module resolution on web to stub native-only packages.
// This works for both direct imports AND transitive deps inside node_modules.
const parentResolveRequest = nativewindConfig.resolver.resolveRequest;
nativewindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && nativeOnlyPackages.has(moduleName)) {
    return { type: "sourceFile", filePath: stubPath };
  }
  // Delegate to parent resolver (nativewind/expo) for everything else
  if (parentResolveRequest) {
    return parentResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName);
};

module.exports = nativewindConfig;
