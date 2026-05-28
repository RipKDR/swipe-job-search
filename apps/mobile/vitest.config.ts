import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: [
      { find: '@/components/tw', replacement: path.resolve(__dirname, 'vitest-tw-shim.ts') },
      { find: '@', replacement: path.resolve(__dirname, './') },
      { find: 'react-native', replacement: 'react-native-web' },
    ],
  },
});
