/**
 * Shim to make react-native-css nightly work with Expo 52+.
 *
 * Fixes:
 * 1. Provide expoMetroConfig.unstable_transformerPath if missing (used by react-native-css).
 * 2. For web, let PostCSS (e.g. Tailwind) process CSS/SASS files, inject result as JS.
 */
const path = require('path');
const fs = require('fs');
const { Buffer } = require('buffer');
const { pathToFileURL } = require('url');

// Fix #1: Inject unstable_transformerPath before other transformers load
const expoMetroConfig = require('@expo/metro-config');
if (!expoMetroConfig.unstable_transformerPath) {
  try {
    expoMetroConfig.unstable_transformerPath = require.resolve('metro-transform-worker');
  } catch {
    // Keep going; fallback resolution below may still find the worker.
  }
}

// Try to load react-native-css's transformer
let realTransformer;
try {
  const rncssDir = path.dirname(require.resolve('react-native-css/package.json'));
  realTransformer = require(path.join(rncssDir, 'dist/commonjs/metro/metro-transformer.js'));
} catch {
  // Keep going; we can fall back to Metro worker when needed.
}

// Load Metro transform worker as required by Expo's metro config (web needs this for codegen)
let worker;
try {
  if (expoMetroConfig.unstable_transformerPath) {
    worker = require(expoMetroConfig.unstable_transformerPath);
  }
} catch {
  // Keep going; try a direct worker fallback.
}
if (!worker) {
  try {
    worker = require('metro-transform-worker');
  } catch {
    // Keep undefined; transform fallback logic handles this.
  }
}

// Build-time PostCSS processor (lazy-load, module single instance)
let postcssProcessorPromise;

function getPluginsFromConfig(configModule) {
  const config = configModule && configModule.default ? configModule.default : configModule;
  if (!config || !config.plugins) {
    return [];
  }
  if (Array.isArray(config.plugins)) {
    return config.plugins;
  }
  if (typeof config.plugins === 'object') {
    return Object.values(config.plugins);
  }
  return [];
}

async function loadPostcssConfigModule(configFilePath) {
  if (configFilePath.endsWith('.mjs')) {
    return import(pathToFileURL(configFilePath).href);
  }
  return require(configFilePath);
}

async function getPostcssProcessor(projectRoot) {
  if (postcssProcessorPromise) return postcssProcessorPromise;

  postcssProcessorPromise = (async () => {
    let postcssProcessor = null;

    try {
      // Load user PostCSS config (if available), otherwise fallback to Tailwind's plugin.
      const postcss = require('postcss');
      let plugins = [];

      // Try loading the user's postcss.config.{mjs,js,cjs,json}
      let configLoaded = false;
      const configFiles = [
        'postcss.config.mjs',
        'postcss.config.js',
        'postcss.config.cjs',
        'postcss.config.json',
      ];

      for (const fname of configFiles) {
        const fpath = path.join(projectRoot, fname);
        if (!fs.existsSync(fpath)) continue;

        // Support both ESM (.mjs) and CJS configs without require('esm').
        try {
          const loadedConfig = await loadPostcssConfigModule(fpath);
          plugins = getPluginsFromConfig(loadedConfig);
          configLoaded = true;
          break;
        } catch {
          // Try next config variant.
        }
      }

      // If not loaded, fall back to @tailwindcss/postcss if available.
      if (!configLoaded) {
        try {
          const tailwindPostcss = require('@tailwindcss/postcss');
          plugins = [tailwindPostcss];
        } catch {
          // Keep passthrough behavior.
        }
      }

      // Still nothing: fallback to raw passthrough.
      postcssProcessor = plugins.length > 0 ? postcss(plugins) : null;
    } catch {
      // Keep passthrough behavior if PostCSS is unavailable.
      postcssProcessor = null;
    }

    return postcssProcessor;
  })();

  return postcssProcessorPromise;
}

function getTransformerOrNull(transformer) {
  return transformer && typeof transformer.transform === 'function' ? transformer : null;
}

async function runTransformWithFallback(primaryTransformer, fallbackTransformer, args) {
  const primary = getTransformerOrNull(primaryTransformer);
  if (primary) {
    return primary.transform(...args);
  }

  const fallback = getTransformerOrNull(fallbackTransformer);
  if (fallback) {
    return fallback.transform(...args);
  }

  throw new Error(
    'metro-transformer-shim: no available transformer (react-native-css or metro-transform-worker).'
  );
}

module.exports = {
  async transform(config, projectRoot, filePath, data, options) {
    const opts = options || {};
    const isCss = opts.type !== 'asset' && /\.(css|scss|sass)$/i.test(filePath);

    // Fix #2: For web CSS/SASS files, process with PostCSS and emit a JS style-injection module.
    if (opts.platform === 'web' && isCss) {
      const cssSource = data.toString();
      let processedCss = cssSource;

      try {
        const processor = await getPostcssProcessor(projectRoot);
        if (processor) {
          const result = await processor.process(cssSource, { from: filePath, to: filePath });
          processedCss = result.css;
        }
      } catch {
        // On PostCSS error, inject file contents directly for dev resilience.
      }

      // Wrap output as an ES5 IIFE for the Metro JS worker.
      const injectionJs = `
(function injectCss(){try{if(typeof document==='undefined')return;var e=document.getElementById(${JSON.stringify(
        filePath
      )});if(e)return;var s=document.createElement('style');s.id=${JSON.stringify(
        filePath
      )};s.textContent=${JSON.stringify(
        processedCss
      )};document.head.appendChild(s);}catch(e){}})();
//# sourceMappingURL=
`;

      return runTransformWithFallback(worker, realTransformer, [
        config,
        projectRoot,
        filePath,
        Buffer.from(injectionJs),
        { ...opts, type: 'js/module' },
      ]);
    }

    // Default: delegate to react-native-css transformer; Metro worker is a resilient fallback.
    return runTransformWithFallback(realTransformer, worker, [
      config,
      projectRoot,
      filePath,
      data,
      opts,
    ]);
  },
};
