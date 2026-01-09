import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use jsdom by default for most tests (React components need DOM)
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.spec.ts', // Exclude spec files (future work)
    ],
    // Override to use node environment for specific tests that need file system
    environmentMatchGlobs: [
      // MetricsStorage tests need node environment for file system access
      ['packages/core/src/__tests__/MetricsStorage.test.ts', 'node'],
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
