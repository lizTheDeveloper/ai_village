import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // Load .env files from parent directory (custom_game_engine/)
  envDir: path.resolve(__dirname, '..'),

  server: {
    port: 3000,
    host: '0.0.0.0', // Listen on all network interfaces for VM deployment
  },
  resolve: {
    alias: {
      '@ai-village/core': path.resolve(__dirname, '../packages/core/src/index.ts'),
      '@ai-village/world': path.resolve(__dirname, '../packages/world/src/index.ts'),
      '@ai-village/renderer': path.resolve(__dirname, '../packages/renderer/src/index.ts'),
      '@ai-village/llm': path.resolve(__dirname, '../packages/llm/src/index.ts'),
    },
  },
});
