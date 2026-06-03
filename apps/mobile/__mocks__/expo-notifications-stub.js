'use strict';
module.exports = {
  getPermissionsAsync: () => Promise.resolve({ status: 'undetermined' }),
  requestPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
  getExpoPushTokenAsync: () => Promise.resolve({ data: '' }),
  setNotificationChannelAsync: () => Promise.resolve(),
  setNotificationHandler: () => {},
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  getLastNotificationResponseAsync: () => Promise.resolve(null),
  AndroidImportance: { MAX: 5 },
  AndroidNotificationPriority: { MAX: 5 },
  default: undefined,
};
