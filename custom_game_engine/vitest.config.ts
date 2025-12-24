import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only run tests in packages directory (unit tests)
    // Exclude tests/ directory which contains Playwright E2E tests
    include: ['packages/**/*.{test,spec}.{js,ts}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/**', // Playwright E2E tests
    ],
    // Default environment for most tests
    // Individual test files can override with @vitest-environment comment
    environment: 'node',
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
    // Setup file to initialize test data (e.g., default recipes)
    setupFiles: ['./vitest.setup.ts'],
  },
});
