import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 3032,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
