export default {
  plugins: {
    "@tailwindcss/postcss": {
      config: './tailwind.config.js',
    },
    // react-native-css PostCSS plugin is incompatible with Node v24 + React 19 ESM.
    // On web, Tailwind CSS handles styling directly — the plugin is only needed
    // for the NativeWind integration on Android/iOS native builds.
    // 'react-native-css': {
    //   config: './metro.config.js',
    // },
  },
};
