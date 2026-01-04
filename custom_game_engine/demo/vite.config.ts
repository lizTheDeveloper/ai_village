import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // Load .env files from parent directory (custom_game_engine/)
  envDir: path.resolve(__dirname, '..'),

  server: {
    port: 3000,
    host: '0.0.0.0', // Listen on all network interfaces for VM deployment
    proxy: {
      '/api/generate-sprite': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/save-alien-species': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/alien-species': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    headers: {
      // Force no caching in development to prevent stale code issues
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    },
  },
  resolve: {
    alias: {
      '@ai-village/core': path.resolve(__dirname, '../packages/core/src/index.ts'),
      '@ai-village/world': path.resolve(__dirname, '../packages/world/src/index.ts'),
      '@ai-village/renderer': path.resolve(__dirname, '../packages/renderer/src/index.ts'),
      '@ai-village/llm': path.resolve(__dirname, '../packages/llm/src/index.ts'),
    },
  },
  build: {
    // Enable cache busting in production builds
    rollupOptions: {
      output: {
        // Add content hash to filenames for cache busting
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
      },
    },
  },
});
