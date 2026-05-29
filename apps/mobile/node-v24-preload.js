// Preload script for Node v24 compatibility.
// Node v24 strictly enforces the "exports" field in package.json.
// Many npm packages (metro*, etc.) don't declare all internal subpaths.
// This script patches exports fields on ALL packages with incomplete exports.

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(path.join( __dirname, '../..'));
const nodeModulesDir = path.join(rootDir, 'node_modules');

    try {
    const pkg = JSON.parse(fs.readFileSync(path.join(nodeModulesDir, 'package.json'), 'utf-8'));
    if (!pkg.exports || typeof pkg.exports !== 'object' || Array.isArray(pkg.exports)) return;

    fs.writeFileSync(path.join(nodeModulesDir, 'package.json'), JSON.stringify(pkg, null, 2));
    console.log(`[node-v24] Patched exports for package.json (${Object.keys(pkg.exports).length} entries)`);
  } catch (e) {
    console.error(`[node-v24] Failed to patch package.json:`, e.message);
  } finally {
    console.log(`[node-v24] Done`);
  }
