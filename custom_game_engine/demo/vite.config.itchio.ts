/**
 * Vite config for Itch.io HTML5 distribution.
 *
 * Differences from vite.config.ts:
 * - base: './' for relative paths (required by Itch.io iframe embed)
 * - Entry point: game.html -> index.html (Itch.io looks for index.html)
 * - No dev-server-only plugins (orchestrator registration, LLM proxy, animation queue)
 * - Output to dist-itchio/
 * - Chunking optimized for browser caching
 *
 * IMPORTANT - Itch.io setup required for SharedArrayBuffer:
 * In your Itch.io game settings, enable "Cross-Origin Isolation" to allow
 * SharedArrayBuffer (used by web workers for zero-copy communication).
 * Without it, the game still works but falls back to postMessage mode.
 *
 * Build: npm run build:itchio
 * Package: npm run package:itchio  (creates itchio-dist.zip)
 */

import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Version stamping
const commitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
})();

export default defineConfig({
  // Relative base path required for Itch.io - assets must use ./ prefix
  base: './',

  // Load .env from parent directory for API keys (VITE_GROQ_API_KEY etc.)
  envDir: path.resolve(__dirname, '..'),

  define: {
    __BUILD_COMMIT__: JSON.stringify(commitHash),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
    __BUILD_VERSION__: JSON.stringify(`0.1.0-${commitHash}`),
  },

  plugins: [
    {
      name: 'rename-game-to-index',
      closeBundle() {
        // Itch.io requires index.html as entry point
        const outDir = path.resolve(__dirname, 'dist-itchio');
        const gameHtml = path.join(outDir, 'game.html');
        const indexHtml = path.join(outDir, 'index.html');
        if (fs.existsSync(gameHtml) && !fs.existsSync(indexHtml)) {
          fs.renameSync(gameHtml, indexHtml);
        }
      },
    },
  ],

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
      // Stub out Node.js modules that are imported by server-side code
      'fs': path.resolve(__dirname, '../packages/llm/src/browser-stubs/fs.ts'),
      'path': path.resolve(__dirname, '../packages/llm/src/browser-stubs/path.ts'),
    },
  },

  worker: {
    format: 'es',
    plugins: () => [],
  },

  build: {
    outDir: 'dist-itchio',
    emptyOutDir: true,
    // Target modern browsers (Chrome 92+, Firefox 79+, Safari 15.2+)
    // These all support SharedArrayBuffer with COOP/COEP
    target: ['chrome92', 'firefox79', 'safari15'],
    rollupOptions: {
      // Exclude Node.js-only modules from browser bundle
      external: ['sharp'],
      input: {
        // Build game.html as index.html - Itch.io requires index.html as entry
        index: path.resolve(__dirname, 'game.html'),
      },
      output: {
        // Content-hash filenames for cache busting
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // Manual chunk splitting to optimize browser caching:
        // - vendor chunks (rarely change) cached separately from game code
        // - All engine packages in ONE chunk to avoid TDZ errors from circular deps
        //   (core <-> world <-> botany have 30+ circular import cycles)
        manualChunks(id) {
          // Three.js / rendering (large, rarely changes)
          if (id.includes('node_modules/three')) {
            return 'vendor-three';
          }
          // Browser stubs for fs/path MUST be in vendor chunk — node_modules
          // code imports these, and putting them in engine causes TDZ errors
          // when vendor initializes before engine
          if (id.includes('browser-stubs/')) {
            return 'vendor';
          }
          // All engine packages in a single chunk — circular deps between
          // core/world/botany/magic/divinity/reproduction/llm/renderer cause
          // TDZ ReferenceErrors when split into separate chunks
          if (id.includes('/packages/') && id.includes('/src/')) {
            return 'engine';
          }
          // Other node_modules
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
