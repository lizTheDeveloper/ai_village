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
    environment: 'node',
  },
});
