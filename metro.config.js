/* metro.config.js for the mobile app */
/* import the getSentryExpoConfig function from the @sentry/react-native/metro module */
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

/* define the config as a type of MetroConfig from the expo/metro-config module */
/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

/* export the config */
/* export the config */
module.exports = config;
/* end of metro.config.js for the mobile app */
