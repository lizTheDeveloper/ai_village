import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // Load .env files from parent directory (custom_game_engine/)
  envDir: path.resolve(__dirname, '..'),

  plugins: [
    {
      name: 'selective-cache-control',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';

          // Apply no-cache only to HTML, JS, CSS, JSON (code files)
          // Allow caching of images, sprites, fonts, etc.
          if (url.match(/\.(html?|jsx?|tsx?|css|json)$/i) || url === '/' || !url.includes('.')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          } else if (url.match(/\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot)$/i)) {
            // Cache static assets (sprites, images, fonts) for 1 hour in dev
            res.setHeader('Cache-Control', 'public, max-age=3600');
          }

          next();
        });
      },
    },
    {
      name: 'register-with-orchestrator',
      configureServer(server) {
        server.httpServer?.once('listening', async () => {
          const port = server.config.server.port || 3000;
          const url = `http://localhost:${port}`;

          const payload = {
            name: 'game-dev-server',
            port,
            type: 'vite',
            status: 'ready',
            timestamp: Date.now(),
            pid: process.pid,
            url
          };

          try {
            const response = await fetch('http://localhost:3030/api/servers/register', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });

            if (response.ok) {
              console.log(`[register-with-orchestrator] Successfully registered at ${url} with orchestrator`);
            } else {
              console.warn(`[register-with-orchestrator] Failed to register: ${response.status} ${response.statusText}`);
            }
          } catch (error) {
            console.warn('[register-with-orchestrator] Could not register with orchestrator (orchestrator may not be running):', error instanceof Error ? error.message : String(error));
          }
        });
      },
    },
  ],

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
