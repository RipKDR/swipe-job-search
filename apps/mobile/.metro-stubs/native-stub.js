
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
