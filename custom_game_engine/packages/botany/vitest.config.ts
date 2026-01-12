import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
  resolve: {
    alias: {
      '@ai-village/core': path.resolve(__dirname, '../core/src'),
      '@ai-village/botany': path.resolve(__dirname, './src'),
    },
  },
});
