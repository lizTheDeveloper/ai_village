import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3010,
  },
  build: {
    outDir: 'dist',
  },
});
