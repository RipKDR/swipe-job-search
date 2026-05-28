// Preload script for Node v24 compatibility.
// Node v24 strictly enforces the "exports" field in package.json.
// Many npm packages (metro*, etc.) don't declare all internal subpaths.
// This script patches exports fields on ALL packages with incomplete exports.

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const nodeModulesDir = path.join(rootDir, 'node_modules');

// Packages that often lack internal subpath exports
const pkgPatterns = [
  'metro',
  'metro-cache',
  'metro-cache-key',
  'metro-config',
  'metro-core',
  'metro-file-map',
  'metro-minify-terser',
  'metro-resolver',
  'metro-runtime',
  'metro-source-map',
  'metro-symbolicate',
  'metro-babel-transformer',
  'metro-transform-plugins',
  'metro-transform-worker',
];

function patchAllExports() {
  for (const name of pkgPatterns) {
    const pkgDir = path.join(nodeModulesDir, name);
    const pkgPath = path.join(pkgDir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (!pkg.exports || typeof pkg.exports !== 'object' || Array.isArray(pkg.exports)) continue;

      // Check if it uses private/* pattern (incomplete exports)
      const hasPrivatePattern = './private/*' in pkg.exports;
      if (!hasPrivatePattern) continue;

      // Find the actual source directory
      const mainFile = pkg.main || 'index.js';
      const mainDir = path.dirname(mainFile);
      const mainDirAbsolute = path.join(pkgDir, mainDir);
      if (!fs.existsSync(mainDirAbsolute)) continue;

      // Walk the source directory and add all .js files to exports
      let changed = false;
      const walk = (dir, prefix) => {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            walk(full, rel);
          } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.flow')) {
            const key = `./${rel.replace(/\.js$/, '')}`;
            if (!(key in pkg.exports)) {
              pkg.exports[key] = `./${rel}`;
              changed = true;
            }
          }
        }
      };
      walk(mainDirAbsolute, mainDir);

      if (changed) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        console.log(`[node-v24] Patched exports for ${name} (${Object.keys(pkg.exports).length} entries)`);
      }
    } catch (e) {
      console.error(`[node-v24] Failed to patch ${name}:`, e.message);
    }
  }
}

patchAllExports();
