import nativewind from "nativewind/preset";
module.exports = {
  content: [
    "./app/**/*.(js|jsx|ts|tsx)",
    "./components/**/*.(js|jsx|ts|tsx)",
    "./lib/**/*.(js|jsx|ts|tsx)"
  ],
  presets: [nativewind],
  theme: {
    extend: {
      colors: {
        // Hi-Hired design tokens (match shared later; AU-friendly, accessible)
        primary: "#6366f1",
        accent: "#22c55e"
      }
    }
  },  
  plugins: []
};
