/**
 * Shim to make react-native-css nightly work with Expo 52.
 *
 * Two problems fixed:
 * 1. Expo 52's @expo/metro-config doesn't export unstable_transformerPath,
 *    which react-native-css nightly reads at module load time.
 * 2. For web, Expo 52's Babel transformer can't parse CSS files — we process
 *    them through PostCSS and wrap the output as a style-injection JS module.
 */
const path = require('path');
const fs = require('fs');

// Fix #1: inject unstable_transformerPath before the real transformer loads
const expoMetroConfig = require('@expo/metro-config');
if (!expoMetroConfig.unstable_transformerPath) {
  expoMetroConfig.unstable_transformerPath = require.resolve('metro-transform-worker');
}

const rncssDir = path.dirname(require.resolve('react-native-css/package.json'));
const realTransformer = require(path.join(rncssDir, 'dist/commonjs/metro/metro-transformer.js'));

const worker = require(expoMetroConfig.unstable_transformerPath);

// Build-time PostCSS processor (lazy-loaded once)
let postcssProcessor = null;
function getPostcssProcessor(projectRoot) {
  if (postcssProcessor) return postcssProcessor;
  try {
    const postcss = require('postcss');
    const configPath = path.join(projectRoot, 'postcss.config.mjs');
    // Dynamically load the postcss config plugins
    // tailwind v4 uses @tailwindcss/postcss
    const tailwindPostcss = require('@tailwindcss/postcss');
    postcssProcessor = postcss([tailwindPostcss]);
  } catch (e) {
    // Fallback: no PostCSS processing, inject raw CSS
    postcssProcessor = null;
  }
  return postcssProcessor;
}

module.exports = {
  async transform(config, projectRoot, filePath, data, options) {
    const isCss = options.type !== 'asset' && /\.(s?css|sass)$/.test(filePath);

    // Fix #2: For web CSS files, run PostCSS and return a style-injection JS module
    if (options.platform === 'web' && isCss) {
      const cssSource = data.toString('utf8');
      let processedCss = cssSource;
      try {
        const processor = getPostcssProcessor(projectRoot);
        if (processor) {
          const result = await processor.process(cssSource, { from: filePath, to: filePath });
          processedCss = result.css;
        }
      } catch (_) {
        // On failure, inject raw CSS — better than crashing
      }

      // Wrap as a JS module that injects a <style> tag
      const injectionJs = `
(function webCssInjection() {
  if (typeof document === 'undefined') return;
  var existing = document.getElementById(${JSON.stringify(filePath)});
  if (existing) return;
  var s = document.createElement('style');
  s.id = ${JSON.stringify(filePath)};
  s.textContent = ${JSON.stringify(processedCss)};
  document.head.appendChild(s);
})();
`;
      return worker.transform(
        config,
        projectRoot,
        filePath,
        Buffer.from(injectionJs),
        { ...options, type: 'js/module' },
      );
    }

    return realTransformer.transform(config, projectRoot, filePath, data, options);
  },
};
