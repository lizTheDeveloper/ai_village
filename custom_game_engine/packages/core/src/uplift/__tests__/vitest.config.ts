/**
 * Vitest Configuration for Uplift System Tests
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/uplift/**/*.ts'],
      exclude: [
        'src/uplift/__tests__/**',
        'src/uplift/index.ts',
      ],
    },
  },
});
