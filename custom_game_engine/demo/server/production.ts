/**
 * MVEE Production server — serves Vite-built static files + LLM proxy routes.
 * Used in the Docker container for Hetzner deployment.
 *
 * LLM proxy routes (/api/llm/check-availability, /api/llm/chat) are needed
 * because the browser client cannot call external LLM APIs directly due to CORS.
 * These mirror the Vite dev server middleware in vite.config.ts.
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createUniverseApiRouter } from '../src/universe-api.js';
import { multiverseStorage } from '../src/multiverse-storage.js';
import { planetStorage } from '../src/planet-storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const BASE_PATH = process.env.BASE_PATH || '/mvee';

const app = express();
app.use(express.json({ limit: '50mb' }));

// Allowlisted LLM provider hostnames — prevents SSRF via the proxy endpoints
const ALLOWED_LLM_HOSTS = new Set([
  'api.groq.com',
  'api.cerebras.ai',
  'api.openai.com',
]);

function isAllowedLLMUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === 'https:' && ALLOWED_LLM_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

// Resolve LLM API key for a given provider base URL
function getLLMApiKey(baseUrl: string): string {
  if (baseUrl.includes('groq.com')) {
    return process.env.GROQ_API_KEY || '';
  } else if (baseUrl.includes('cerebras.ai')) {
    return process.env.CEREBRAS_API_KEY || '';
  } else if (baseUrl.includes('api.openai.com')) {
    return process.env.OPENAI_API_KEY || '';
  }
  return '';
}

// LLM availability check proxy — avoids CORS from browser
// Mounted under BASE_PATH so Traefik's PathPrefix('/mvee') routing reaches it
app.get(`${BASE_PATH}/api/llm/check-availability`, async (req, res) => {
  const baseUrl = req.query.baseUrl as string;
  if (!baseUrl) {
    res.status(400).json({ available: false, error: 'Missing baseUrl parameter' });
    return;
  }
  if (!isAllowedLLMUrl(baseUrl)) {
    res.status(403).json({ available: false, error: 'Provider not allowed' });
    return;
  }

  try {
    const apiKey = getLLMApiKey(baseUrl);
    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${baseUrl}/models`, { method: 'GET', headers, signal: controller.signal });
    clearTimeout(timeoutId);

    res.json({ available: response.ok });
  } catch (error) {
    res.json({ available: false, error: String(error) });
  }
});

// LLM chat proxy — forwards chat completions requests to provider
app.post(`${BASE_PATH}/api/llm/chat`, async (req, res) => {
  try {
    const requestData = req.body;
    const baseUrl: string = requestData.baseUrl || 'https://api.groq.com/openai/v1';

    if (!isAllowedLLMUrl(baseUrl)) {
      res.status(403).json({ error: 'Provider not allowed' });
      return;
    }

    let apiKey: string = requestData.apiKey || '';
    if (!apiKey) apiKey = getLLMApiKey(baseUrl);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const { baseUrl: _baseUrl, apiKey: _apiKey, ...forwardBody } = requestData;

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
      res.status(response.status).json({ error: errorText });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// ============================================================
// POSTCARD GALLERY — in-memory store for universe postcards
// ============================================================

const postcards: unknown[] = [];

// List all postcards
app.get(`${BASE_PATH}/api/postcards`, (_req, res) => {
  res.json({ postcards });
});

// HEAD check (used by PostcardSharingService to detect server availability)
app.head(`${BASE_PATH}/api/postcards`, (_req, res) => {
  res.sendStatus(200);
});

// Upload a postcard
app.post(`${BASE_PATH}/api/postcards`, (req, res) => {
  const postcard = req.body;
  if (!postcard || !postcard.title) {
    res.status(400).json({ error: 'Invalid postcard: title is required' });
    return;
  }
  postcards.push(postcard);
  res.status(201).json({ success: true, count: postcards.length });
});

// Multiverse API routes — universe, snapshot, player, passage management
const universeRouter = createUniverseApiRouter();
app.use(`${BASE_PATH}/api/multiverse`, universeRouter);

// Health check under base path for Traefik routing
app.get(`${BASE_PATH}/api/health`, (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), env: 'production' });
});

// COOP/COEP headers for SharedArrayBuffer support.
// Use 'credentialless' instead of 'require-corp' — it still enables SAB
// but doesn't block cross-origin resources (analytics, fonts) that lack
// Cross-Origin-Resource-Policy headers.
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  next();
});

// Cache policy: HTML = never cache (so deploys are picked up immediately),
// hashed build artifacts = immutable/1yr, everything else = 1 day.
app.use((_req, res, next) => {
  const ext = path.extname(_req.path).toLowerCase();
  if (ext === '.html' || !ext) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  } else if (ext === '.js' || ext === '.css' || ext === '.wasm') {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
  next();
});

// Serve static files at root (for absolute sprite paths like /assets/sprites/...)
// AND under the base path (for Vite-generated references like /mvee/assets/...)
// express.static handles MIME types correctly — .png → image/png, .js → application/javascript
const staticOpts = {
  // Fall through to next middleware if file not found (don't 404 here)
  fallthrough: true,
};
app.use(express.static(DIST_DIR, staticOpts));
app.use(BASE_PATH, express.static(DIST_DIR, staticOpts));

// SPA fallback — serve game.html for navigation requests ONLY.
// Requests with file extensions (images, scripts, etc.) that weren't found by
// express.static above should 404, NOT get the SPA HTML fallback.
// This prevents sprites from getting text/html content-type.
app.get('/{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith(`${BASE_PATH}/api/`)) return next();

  // If the path has a file extension, it's a static asset request that wasn't
  // found — return 404 instead of serving game.html as text/html
  if (path.extname(req.path)) {
    res.status(404).send('Not found');
    return;
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.sendFile(path.join(DIST_DIR, 'game.html'));
});

async function start() {
  await multiverseStorage.init();
  await planetStorage.init();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] MVEE production server on port ${PORT} (base: ${BASE_PATH})`);
    console.log(`[server] Multiverse API mounted at ${BASE_PATH}/api/multiverse`);
  });
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
