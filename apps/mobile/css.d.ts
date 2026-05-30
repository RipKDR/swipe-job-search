// Ambient declaration so TypeScript accepts side-effect CSS imports
// (e.g. `import '../global.css'`). Metro/NativeWind handle these at bundle time.
declare module '*.css';
