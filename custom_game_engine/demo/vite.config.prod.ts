/**
 * Vite config for Hetzner production deployment.
 *
 * Differences from dev vite.config.ts:
 * - base: '/mvee/' for path-based deployment (play.multiversestudios.xyz/mvee/)
 * - No dev-server-only plugins (orchestrator, LLM proxy, animation queue, cache control)
 * - Output to dist/
 * - Injects BUILD_VERSION and BUILD_COMMIT for version stamping
 * - Entry point: game.html (served as index.html by production server)
 *
 * Build: npm run build:prod (from custom_game_engine/)
 */

import { defineConfig } from 'vite';
import path from 'path';
import { execSync } from 'child_process';

// Version stamping
const commitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
})();

const buildTimestamp = new Date().toISOString();

export default defineConfig({
  base: '/mvee/',

  envDir: path.resolve(__dirname, '..'),

  define: {
    __BUILD_COMMIT__: JSON.stringify(commitHash),
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
    __BUILD_VERSION__: JSON.stringify(`0.1.0-${commitHash}`),
  },

  plugins: [],

  resolve: {
    alias: {
      '@ai-village/core': path.resolve(__dirname, '../packages/core/src/index.ts'),
      '@ai-village/botany': path.resolve(__dirname, '../packages/botany/src/index.ts'),
      '@ai-village/persistence': path.resolve(__dirname, '../packages/persistence/src/index.ts'),
      '@ai-village/metrics': path.resolve(__dirname, '../packages/metrics/src/index.ts'),
      '@ai-village/reproduction': path.resolve(__dirname, '../packages/reproduction/src/index.ts'),
      '@ai-village/divinity': path.resolve(__dirname, '../packages/divinity/src/index.ts'),
      '@ai-village/magic': path.resolve(__dirname, '../packages/magic/src/index.ts'),
      '@ai-village/world': path.resolve(__dirname, '../packages/world/src/index.ts'),
      '@ai-village/renderer': path.resolve(__dirname, '../packages/renderer/src/index.ts'),
      '@ai-village/llm': path.resolve(__dirname, '../packages/llm/src/index.ts'),
      '@ai-village/shared-worker': path.resolve(__dirname, '../packages/shared-worker/src/index.ts'),
      '@ai-village/agents': path.resolve(__dirname, '../packages/agents/src/index.ts'),
      '@ai-village/language': path.resolve(__dirname, '../packages/language/src/index.ts'),
      '@ai-village/introspection': path.resolve(__dirname, '../packages/introspection/src/index.ts'),
      'fs': path.resolve(__dirname, '../packages/llm/src/browser-stubs/fs.ts'),
      'path': path.resolve(__dirname, '../packages/llm/src/browser-stubs/path.ts'),
    },
  },

  worker: {
    format: 'es',
    plugins: () => [],
    rollupOptions: {
      external: ['@nicepkg/wllama'],
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: 'hidden', // Generate .map files for debugging but don't expose via sourceMappingURL
    target: ['chrome92', 'firefox79', 'safari15'],
    rollupOptions: {
      // Only externalize Node.js-native modules that can't run in the browser.
      // All browser packages (pixi.js, d3, chart.js, dexie) MUST be bundled —
      // there is no import map in game.html to resolve bare specifiers.
      external: (id: string) => {
        const externals = ['sharp', '@nicepkg/wllama'];
        return externals.some(pkg => id === pkg || id.startsWith(pkg + '/'));
      },
      input: {
        index: path.resolve(__dirname, 'game.html'),
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // All engine packages in ONE chunk to avoid TDZ errors from circular deps
        // (core <-> world <-> botany have 30+ circular import cycles that cause
        // ReferenceError: Cannot access 'X' before initialization when split)
        manualChunks(id) {
          // Browser stubs for fs/path MUST be in vendor chunk — node_modules
          // code imports these, and putting them in engine causes TDZ errors
          // when vendor initializes before engine
          if (id.includes('browser-stubs/')) return 'vendor';
          if (id.includes('/packages/') && id.includes('/src/')) return 'engine';
          if (id.includes('node_modules/')) return 'vendor';
        },
      },
    },
  },
});
