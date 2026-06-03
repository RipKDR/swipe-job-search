import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    server: {
      deps: {
        // Inline these so Vite processes them (Node.js can't load .ts entrypoints)
        inline: ['expo', 'expo-notifications', 'expo-constants', 'react-native-screens', 'expo-router'],
      },
    },
  },
  define: {
    __DEV__: 'true',
  },
  resolve: {
    alias: [
      // .js CJS stubs — avoid TS transform issues (Vite serves .js as-is)
      { find: /^expo(\/.*)?$/, replacement: path.resolve(__dirname, '__mocks__/expo-stub.js') },
      { find: 'expo-notifications', replacement: path.resolve(__dirname, '__mocks__/expo-notifications-stub.js') },
      { find: 'react-native-screens', replacement: path.resolve(__dirname, '__mocks__/react-native-screens-stub.js') },
      { find: 'expo-router', replacement: path.resolve(__dirname, '__mocks__/expo-router-stub.js') },
      { find: '@/components/tw/image', replacement: path.resolve(__dirname, 'vitest-tw-image-shim.ts') },
      { find: '@/components/tw', replacement: path.resolve(__dirname, 'vitest-tw-shim.ts') },
      { find: '@', replacement: path.resolve(__dirname, './') },
      { find: 'react-native', replacement: 'react-native-web' },
    ],
  },
});
