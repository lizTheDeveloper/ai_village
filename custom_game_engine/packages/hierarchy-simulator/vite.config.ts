import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  server: {
    port: 3031,
    host: true,
    open: false
  },
  resolve: {
    alias: {
      '@ai-village/core': path.resolve(__dirname, '../core/src'),
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
