/**
 * Rotating proxy manager with health tracking.
 * Round-robin selection with automatic failure exclusion.
 */

const { HttpsProxyAgent } = require('https-proxy-agent');
const config = require('../config');
const { createLogger } = require('./logger');

const log = createLogger('proxy');

class ProxyManager {
  constructor() {
    this.proxies = [...config.proxies];
    this.currentIndex = 0;
    this.failures = new Map(); // proxy -> failure count
    this.maxFailures = 3;
    this.cooldownMs = 60000; // 1 minute cooldown after max failures
    this.lastFailure = new Map(); // proxy -> timestamp
  }

  /**
   * Get the next healthy proxy. Returns null if no proxies configured.
   */
  getNext() {
    if (this.proxies.length === 0) return null;

    const now = Date.now();
    const total = this.proxies.length;

    for (let i = 0; i < total; i++) {
      const idx = (this.currentIndex + i) % total;
      const proxy = this.proxies[idx];

      // Check if proxy is in cooldown
      const failures = this.failures.get(proxy) || 0;
      const lastFail = this.lastFailure.get(proxy) || 0;

      if (failures >= this.maxFailures) {
        if (now - lastFail < this.cooldownMs) {
          continue; // still cooling down, skip
        }
        // Reset after cooldown
        this.failures.set(proxy, 0);
      }

      this.currentIndex = (idx + 1) % total;
      return proxy;
    }

    log.warn('All proxies in cooldown, resetting all');
    this.failures.clear();
    this.currentIndex = 0;
    return this.proxies[0];
  }

  /**
   * Get an axios-compatible proxy agent.
   */
  getAgent() {
    const proxy = this.getNext();
    if (!proxy) return undefined;
    return new HttpsProxyAgent(proxy);
  }

  /**
   * Get proxy config for axios.
   */
  getAxiosConfig() {
    const proxy = this.getNext();
    if (!proxy) return {};

    return {
      proxy: false, // disable axios built-in proxy
      httpsAgent: new HttpsProxyAgent(proxy),
      httpAgent: new HttpsProxyAgent(proxy),
    };
  }

  /**
   * Report a proxy failure.
   */
  reportFailure(proxyUrl) {
    const count = (this.failures.get(proxyUrl) || 0) + 1;
    this.failures.set(proxyUrl, count);
    this.lastFailure.set(proxyUrl, Date.now());
    if (count >= this.maxFailures) {
      log.warn(`Proxy ${this.mask(proxyUrl)} excluded for ${this.cooldownMs / 1000}s after ${count} failures`);
    }
  }

  /**
   * Report a proxy success (resets failure count).
   */
  reportSuccess(proxyUrl) {
    this.failures.set(proxyUrl, 0);
  }

  /**
   * Mask proxy credentials for logging.
   */
  mask(proxyUrl) {
    try {
      const url = new URL(proxyUrl);
      if (url.password) url.password = '***';
      if (url.username) url.username = url.username.slice(0, 3) + '***';
      return url.toString();
    } catch {
      return '***invalid***';
    }
  }

  /**
   * Get proxy stats.
   */
  getStats() {
    return {
      total: this.proxies.length,
      healthy: this.proxies.filter(p => (this.failures.get(p) || 0) < this.maxFailures).length,
      cooldown: this.proxies.filter(p => (this.failures.get(p) || 0) >= this.maxFailures).length,
    };
  }
}

// Singleton
const proxyManager = new ProxyManager();

module.exports = proxyManager;
