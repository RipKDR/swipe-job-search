import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@hi-hired/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      'expo-modules-core': path.resolve(__dirname, './__test-shims__/expo-modules-core.ts'),
      'expo-image': path.resolve(__dirname, './__test-shims__/expo-image.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}', '!**/node_modules/**', '!**/.claude/**'],
    exclude: ['node_modules', '.claude'],
  },
  define: {
    __DEV__: true,
  },
});
