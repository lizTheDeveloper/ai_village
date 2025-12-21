import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@ai-village/core': path.resolve(__dirname, '../packages/core/src'),
      '@ai-village/world': path.resolve(__dirname, '../packages/world/src'),
      '@ai-village/renderer': path.resolve(__dirname, '../packages/renderer/src'),
      '@ai-village/llm': path.resolve(__dirname, '../packages/llm/src'),
    },
  },
});
