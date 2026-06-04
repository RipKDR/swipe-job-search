import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@hi-hired/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest-tw-shim.ts'],
    include: ['**/*.test.{ts,tsx}', '!**/node_modules/**', '!**/.claude/**'],
    exclude: ['node_modules', '.claude'],
  },
  define: {
    __DEV__: true,
  },
});
