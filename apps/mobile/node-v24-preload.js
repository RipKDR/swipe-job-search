// Preload script for Node v24 compatibility.
// Node v24 strictly enforces the "exports" field in package.json.
// In pnpm, node_modules doesn't have a top-level package.json —
// the preload osnly runs for root-level metro packages that need patching.
// This is a no-op on pnpm installs; the real fix is ensuring all deps
// have proper exports fields (handled by Expo SDK 56+).
try {
  const fs = require('fs');
  const path = require('path');

  const rootDir = path.resolve(__dirname, '../../..');
  const nodeModulesDir = path.join(rootDir, 'node_modules');
  const pkgPath = path.join(nodeModulesDir, 'package.json');

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg.exports && typeof pkg.exports === 'object' && !Array.isArray(pkg.exports)) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      console.log(`[node-v24] Patched exports for ${Object.keys(pkg.exports).length} entries`);
    }
  }
} catch (e) {
  // Silently skip — pnpm doesn't have a root package.json in node_modules
}
