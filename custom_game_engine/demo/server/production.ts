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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const BASE_PATH = process.env.BASE_PATH || '/mvee';

const app = express();
app.use(express.json());

// Resolve LLM API key for a given provider base URL
function getLLMApiKey(baseUrl: string): string {
  if (baseUrl.includes('groq.com')) {
    return process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '';
  } else if (baseUrl.includes('cerebras.ai')) {
    return process.env.CEREBRAS_API_KEY || process.env.VITE_CEREBRAS_API_KEY || '';
  } else if (baseUrl.includes('api.openai.com')) {
    return process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
  }
  return '';
}

// LLM availability check proxy — avoids CORS from browser
app.get('/api/llm/check-availability', async (req, res) => {
  const baseUrl = req.query.baseUrl as string;
  if (!baseUrl) {
    res.status(400).json({ available: false, error: 'Missing baseUrl parameter' });
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
app.post('/api/llm/chat', async (req, res) => {
  try {
    const requestData = req.body;
    const baseUrl: string = requestData.baseUrl || 'https://api.groq.com/openai/v1';

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

// Health check (both at root and under base path)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), env: 'production' });
});

// COOP/COEP headers for SharedArrayBuffer support
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Serve static files at root (for absolute sprite paths like /assets/sprites/...)
// AND under the base path (for Vite-generated references like /mvee/assets/...)
// express.static handles MIME types correctly — .png → image/png, .js → application/javascript
const staticOpts = {
  maxAge: '1d',
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
  if (req.path.startsWith('/api/')) return next();

  // If the path has a file extension, it's a static asset request that wasn't
  // found — return 404 instead of serving game.html as text/html
  if (path.extname(req.path)) {
    res.status(404).send('Not found');
    return;
  }

  res.sendFile(path.join(DIST_DIR, 'game.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] MVEE production server on port ${PORT} (base: ${BASE_PATH})`);
});
