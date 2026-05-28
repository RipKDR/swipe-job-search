module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // react-native-dotenv removed — secrets now loaded via .env.local + expo-constants
      // nativewind/babel removed — Expo 56's babel-preset-expo handles nativewind configuration
      "react-native-reanimated/plugin", // Must be second for reanimated to work
      ["babel-plugin-module-resolver", {
        root: ["."],
        alias: {
          "@": ".",
        }
      }]
    ]
  };
};
