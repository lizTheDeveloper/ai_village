import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.ts', // Exclude spec files (future work)
    ],
  },
  resolve: {
    alias: {
      '@village/core': path.resolve(__dirname, './packages/core/src'),
      '@ai-village/core': path.resolve(__dirname, './packages/core/src'),
      '@ai-village/world': path.resolve(__dirname, './packages/world/src'),
      '@ai-village/renderer': path.resolve(__dirname, './packages/renderer/src'),
      '@ai-village/llm': path.resolve(__dirname, './packages/llm/src'),
    },
  },
});
