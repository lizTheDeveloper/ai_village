import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use node environment by default for better compatibility with file system tests
    // Tests that need jsdom should specify it with @vitest-environment jsdom
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.ts', // Exclude spec files (future work)
    ],
    // Allow tests to specify their own environment via @vitest-environment comment
    environmentMatchGlobs: [
      // Renderer tests need jsdom for DOM APIs
      ['packages/renderer/**/*.test.ts', 'jsdom'],
      // Metrics dashboard tests need jsdom for React
      ['packages/metrics-dashboard/**/*.test.ts', 'jsdom'],
    ],
  },
  resolve: {
    alias: {
      '@village/core': path.resolve(__dirname, './packages/core/src'),
      '@ai-village/core': path.resolve(__dirname, './packages/core/src'),
      '@ai-village/world': path.resolve(__dirname, './packages/world/src'),
      '@ai-village/renderer': path.resolve(__dirname, './packages/renderer/src'),
      '@ai-village/llm': path.resolve(__dirname, './packages/llm/src'),
      '@ai-village/magic': path.resolve(__dirname, './packages/magic/src'),
      '@ai-village/divinity': path.resolve(__dirname, './packages/divinity/src'),
      // metrics-dashboard internal alias
      '@': path.resolve(__dirname, './packages/metrics-dashboard/src'),
    },
  },
});
