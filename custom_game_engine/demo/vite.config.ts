import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { sharedArrayBufferPlugin } from './vite-sab-plugin.js';

// Queue file path for pixellab daemon
const QUEUE_FILE = path.resolve(__dirname, '../scripts/sprite-generation-queue.json');

// Load environment variables from parent directory
const envPath = path.resolve(__dirname, '../.env');
const envConfig = dotenv.config({ path: envPath }).parsed || {};

export default defineConfig({
  // Load .env files from parent directory (custom_game_engine/)
  envDir: path.resolve(__dirname, '..'),

  plugins: [
    // SharedArrayBuffer support (COOP/COEP headers)
    sharedArrayBufferPlugin(),
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
    {
      name: 'llm-availability-check',
      configureServer(server) {
        server.middlewares.use('/api/llm/check-availability', async (req, res, next) => {
          if (req.method !== 'GET') {
            next();
            return;
          }

          const url = new URL(req.url || '', `http://${req.headers.host}`);
          const baseUrl = url.searchParams.get('baseUrl');

          if (!baseUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ available: false, error: 'Missing baseUrl parameter' }));
            return;
          }

          try {
            // Determine API key based on provider URL
            let apiKey = '';
            if (baseUrl.includes('groq.com')) {
              apiKey = envConfig.GROQ_API_KEY || process.env.GROQ_API_KEY || '';
            } else if (baseUrl.includes('cerebras.ai')) {
              apiKey = envConfig.CEREBRAS_API_KEY || process.env.CEREBRAS_API_KEY || '';
            } else if (baseUrl.includes('api.openai.com')) {
              apiKey = envConfig.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
            }

            const headers: Record<string, string> = {};
            if (apiKey) {
              headers['Authorization'] = `Bearer ${apiKey}`;
            }

            // Make server-side request (no CORS issues)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${baseUrl}/models`, {
              method: 'GET',
              headers,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ available: response.ok }));
          } catch (error) {
            console.error('[llm-availability-check] Error:', error);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ available: false, error: String(error) }));
          }
        });
      },
    },
    {
      name: 'llm-chat-proxy',
      configureServer(server) {
        server.middlewares.use('/api/llm/chat', async (req, res, next) => {
          if (req.method !== 'POST') {
            next();
            return;
          }

          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              const requestData = JSON.parse(body);
              const baseUrl = requestData.baseUrl || 'https://api.groq.com/openai/v1';

              // Determine API key based on provider URL
              let apiKey = requestData.apiKey || '';
              if (!apiKey) {
                if (baseUrl.includes('groq.com')) {
                  apiKey = envConfig.GROQ_API_KEY || process.env.GROQ_API_KEY || '';
                } else if (baseUrl.includes('cerebras.ai')) {
                  apiKey = envConfig.CEREBRAS_API_KEY || process.env.CEREBRAS_API_KEY || '';
                } else if (baseUrl.includes('api.openai.com')) {
                  apiKey = envConfig.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
                }
              }

              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
              };
              if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
              }

              // Remove our proxy-specific fields before forwarding
              const { baseUrl: _, apiKey: __, ...forwardBody } = requestData;

              // Forward to LLM provider
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000);

              const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify(forwardBody),
                signal: controller.signal,
              });

              clearTimeout(timeoutId);

              if (!response.ok) {
                const errorText = await response.text();
                console.error('[llm-chat-proxy] Error:', response.status, errorText.substring(0, 200));
                res.writeHead(response.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: errorText }));
                return;
              }

              const data = await response.json();
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data));
            } catch (error) {
              console.error('[llm-chat-proxy] Error:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: String(error) }));
            }
          });
        });
      },
    },
    {
      name: 'animation-queue-api',
      configureServer(server) {
        server.middlewares.use('/api/animations/generate', (req, res, next) => {
          if (req.method !== 'POST') {
            next();
            return;
          }

          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });

          req.on('end', () => {
            try {
              const { folderId, animationName, actionDescription } = JSON.parse(body);

              // Load existing queue
              let queue = { sprites: [], animations: [], soul_sprites: [] };
              if (fs.existsSync(QUEUE_FILE)) {
                try {
                  queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
                  // Ensure arrays exist
                  queue.sprites = queue.sprites || [];
                  queue.animations = queue.animations || [];
                  queue.soul_sprites = queue.soul_sprites || [];
                } catch {
                  console.warn('[animation-queue-api] Could not parse queue file, using empty queue');
                }
              }

              // Check if already queued
              const alreadyQueued = queue.animations.some(
                (a: { folderId: string; animationName: string }) =>
                  a.folderId === folderId && a.animationName === animationName
              );

              if (alreadyQueued) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Already queued' }));
                return;
              }

              // Add to queue
              queue.animations.push({
                folderId,
                animationName,
                actionDescription,
                status: 'queued',
                queuedAt: new Date().toISOString(),
              });

              // Save queue
              fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));

              console.log(`[animation-queue-api] Queued ${animationName} for ${folderId}`);

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: `Queued ${animationName}` }));
            } catch (err) {
              console.error('[animation-queue-api] Error:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: String(err) }));
            }
          });
        });
      },
    },
  ],

  server: {
    port: 3000,
    host: '0.0.0.0', // Listen on all network interfaces for VM deployment
    proxy: {
      '/api/species': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/souls': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/multiverse': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
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
      // Stub out Node.js modules for browser
      'fs': path.resolve(__dirname, '../packages/llm/src/browser-stubs/fs.ts'),
      'path': path.resolve(__dirname, '../packages/llm/src/browser-stubs/path.ts'),
    },
  },
  worker: {
    format: 'es',
    plugins: [],
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
