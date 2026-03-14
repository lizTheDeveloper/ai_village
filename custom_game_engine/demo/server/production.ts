/**
 * MVEE Production server — serves Vite-built static files.
 * Used in the Docker container for Hetzner deployment.
 *
 * Unlike Precursors, MVEE is a pure client-side game (no server-side API routes).
 * The LLM proxy runs client-side via env vars (VITE_GROQ_API_KEY etc).
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const BASE_PATH = process.env.BASE_PATH || '/mvee';

const app = express();

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
