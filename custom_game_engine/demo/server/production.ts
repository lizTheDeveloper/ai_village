/**
 * MVEE Production server — serves Vite-built static files + LLM proxy routes.
 * Used in the Docker container for Hetzner deployment.
 *
 * LLM proxy routes (/api/llm/check-availability, /api/llm/chat) are needed
 * because the browser client cannot call external LLM APIs directly due to CORS.
 * These mirror the Vite dev server middleware in vite.config.ts.
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createUniverseApiRouter } from '../src/universe-api.js';
import { multiverseStorage } from '../src/multiverse-storage.js';
import { planetStorage } from '../src/planet-storage.js';
import { createAdminApiRouter } from './admin-api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const BASE_PATH = process.env.BASE_PATH || '/mvee';

// ============================================================
// PIXELLAB SPRITE GENERATION
// ============================================================

const PIXELLAB_API_KEY = process.env.PIXELLAB_API_KEY || '';
const PIXELLAB_API_BASE = 'https://api.pixellab.ai/v1';

// Runtime sprite directory — writable at runtime, served as static files.
// Uses a Docker volume mount for persistence across deploys.
const RUNTIME_SPRITES_DIR = process.env.SPRITES_DIR
  || path.resolve(__dirname, '..', 'runtime-sprites');

interface SpriteJob {
  folderId: string;
  description: string;
  traits: Record<string, unknown>;
  status: 'queued' | 'generating' | 'complete' | 'failed';
  queuedAt: number;
  error?: string;
}

const spriteJobs = new Map<string, SpriteJob>();

// Rate limiter: one generation at a time, 5s between calls
let generationBusy = false;
const generationQueue: string[] = [];

async function pixelLabRequest(endpoint: string, body: Record<string, unknown>): Promise<any> {
  const response = await fetch(`${PIXELLAB_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PIXELLAB_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PixelLab API ${response.status}: ${text}`);
  }

  return response.json();
}

function classifyCreatureType(traits: Record<string, unknown>): 'static' | 'humanoid' | 'quadruped' {
  if (!traits || !traits.species) return 'static';

  const legCount = (traits.legs as number) || (traits.legCount as number) || 2;
  const species = ((traits.species as string) || '').toLowerCase();

  if (legCount === 4 ||
      ['dog', 'cat', 'horse', 'cow', 'sheep', 'goat', 'deer', 'pig', 'rabbit'].includes(species)) {
    return 'quadruped';
  }

  return 'humanoid';
}

async function processSprite(job: SpriteJob): Promise<void> {
  job.status = 'generating';
  const spriteDir = path.join(RUNTIME_SPRITES_DIR, job.folderId);
  fs.mkdirSync(spriteDir, { recursive: true });

  try {
    const creatureType = classifyCreatureType(job.traits);

    if (creatureType === 'static') {
      // Single image generation (trees, rocks, items, plants)
      const size = (job.traits.size as number) || 48;
      const result = await pixelLabRequest('/generate-image-pixflux', {
        description: job.description,
        image_size: { height: size, width: size },
        no_background: true,
        ...(job.traits.apiParams as Record<string, unknown> || {}),
      });

      if (!result.image?.base64) throw new Error('No image in PixelLab response');

      const imageBuffer = Buffer.from(result.image.base64, 'base64');
      fs.writeFileSync(path.join(spriteDir, 'south.png'), imageBuffer);
      fs.writeFileSync(path.join(spriteDir, 'sprite.png'), imageBuffer);
    } else {
      // Character generation (humanoid/quadruped) — 8 directional sprites
      const size = (job.traits.size as number) || 48;
      const directions = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];
      const directionDescriptions: Record<string, string> = {
        'south': 'facing toward the camera, front view from above',
        'south-west': 'facing southwest, angled front-left view from above',
        'west': 'facing left, side profile view from above',
        'north-west': 'facing northwest, angled back-left view from above',
        'north': 'facing away from camera, rear view from above',
        'north-east': 'facing northeast, angled back-right view from above',
        'east': 'facing right, side profile view from above',
        'south-east': 'facing southeast, angled front-right view from above',
      };

      const spritesDir = path.join(spriteDir, 'sprites');
      fs.mkdirSync(spritesDir, { recursive: true });

      for (const direction of directions) {
        const dirDesc = directionDescriptions[direction];
        const fullDescription = creatureType === 'quadruped'
          ? `${job.description} as a quadruped animal on all four legs, ${dirDesc}, pixel art style, top-down perspective, transparent background`
          : `${job.description}, ${dirDesc}, pixel art style, top-down perspective, transparent background`;

        const result = await pixelLabRequest('/generate-image-pixflux', {
          description: fullDescription,
          image_size: { width: size, height: size },
          no_background: true,
          ...(job.traits.apiParams as Record<string, unknown> || {}),
        });

        if (!result.image?.base64) throw new Error(`No image for direction ${direction}`);

        const imageBuffer = Buffer.from(result.image.base64, 'base64');
        fs.writeFileSync(path.join(spritesDir, `${direction}.png`), imageBuffer);

        // Also save south.png at root for status check compatibility
        if (direction === 'south') {
          fs.writeFileSync(path.join(spriteDir, 'south.png'), imageBuffer);
        }

        // Rate limit between directions (2s)
        if (direction !== 'south-east') {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    // Save metadata
    fs.writeFileSync(path.join(spriteDir, 'metadata.json'), JSON.stringify({
      id: job.folderId,
      description: job.description,
      traits: job.traits,
      generated_at: new Date().toISOString(),
      status: 'complete',
    }, null, 2));

    job.status = 'complete';
    console.log(`[SpriteGen] Complete: ${job.folderId}`);
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : String(error);
    console.error(`[SpriteGen] Failed ${job.folderId}:`, job.error);
  }
}

async function processQueue(): Promise<void> {
  if (generationBusy || generationQueue.length === 0) return;

  generationBusy = true;
  const folderId = generationQueue.shift()!;
  const job = spriteJobs.get(folderId);

  if (job && job.status === 'queued') {
    await processSprite(job);
    // 5s cooldown between generations
    await new Promise(r => setTimeout(r, 5000));
  }

  generationBusy = false;
  // Process next in queue
  if (generationQueue.length > 0) {
    processQueue();
  }
}

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

// Sprite generation — calls PixelLab API directly in production.
// Mounted at both base-path and root because the client uses bare /api/ paths.
for (const prefix of [BASE_PATH, '']) {
  app.post(`${prefix}/api/sprites/generate`, (req, res) => {
    if (!PIXELLAB_API_KEY) {
      res.status(503).json({ status: 'failed', error: 'Sprite generation not configured (no PIXELLAB_API_KEY)' });
      return;
    }

    const { folderId, description, traits } = req.body;
    if (!folderId || !description) {
      res.status(400).json({ error: 'Missing folderId or description' });
      return;
    }

    // Sanitize folderId — prevent path traversal
    if (folderId.includes('..') || folderId.includes('/') || folderId.includes('\\')) {
      res.status(400).json({ error: 'Invalid folderId' });
      return;
    }

    // Check if sprite already exists (build-time or runtime)
    const buildTimePath = path.join(DIST_DIR, 'assets', 'sprites', 'pixellab', folderId, 'south.png');
    const runtimePath = path.join(RUNTIME_SPRITES_DIR, folderId, 'south.png');
    if (fs.existsSync(buildTimePath) || fs.existsSync(runtimePath)) {
      res.json({ status: 'complete', folderId });
      return;
    }

    // Check if already queued/generating
    if (spriteJobs.has(folderId)) {
      const job = spriteJobs.get(folderId)!;
      res.json({ status: job.status, folderId });
      return;
    }

    // Queue new job
    const job: SpriteJob = {
      folderId,
      description,
      traits: traits || {},
      status: 'queued',
      queuedAt: Date.now(),
    };
    spriteJobs.set(folderId, job);
    generationQueue.push(folderId);

    console.log(`[SpriteGen] Queued: ${folderId}`);
    res.json({ status: 'queued', folderId, message: 'Sprite generation queued' });

    // Kick off processing
    processQueue();
  });

  app.get(`${prefix}/api/sprites/generate/status/:folderId`, (req, res) => {
    const { folderId } = req.params;

    // Check if sprite exists on disk (build-time or runtime)
    const buildTimePath = path.join(DIST_DIR, 'assets', 'sprites', 'pixellab', folderId, 'south.png');
    const runtimePath = path.join(RUNTIME_SPRITES_DIR, folderId, 'south.png');
    if (fs.existsSync(buildTimePath) || fs.existsSync(runtimePath)) {
      res.json({ status: 'complete', folderId });
      return;
    }

    const job = spriteJobs.get(folderId);
    if (!job) {
      res.status(404).json({ status: 'not_found', folderId });
      return;
    }

    res.json({ status: job.status, folderId, error: job.error });
  });
}

// Admin API routes — Lore Bible admin SPA data endpoints (auth-gated)
const adminApiRouter = createAdminApiRouter();
app.use(`${BASE_PATH}/admin/api`, adminApiRouter);

// Admin SPA — Preact app served from admin/ directory (no build step)
const ADMIN_DIR = path.resolve(__dirname, '..', 'admin');
app.use(`${BASE_PATH}/admin`, express.static(ADMIN_DIR, { fallthrough: true }));
// SPA fallback for admin routes — serve admin/index.html for non-file requests
app.get(`${BASE_PATH}/admin/{*splat}`, (req, res, next) => {
  if (req.path.startsWith(`${BASE_PATH}/admin/api`)) return next();
  if (path.extname(req.path)) { res.status(404).send('Not found'); return; }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(ADMIN_DIR, 'index.html'));
});

// Multiverse API routes — universe, snapshot, player, passage management
const universeRouter = createUniverseApiRouter();
app.use(`${BASE_PATH}/api/multiverse`, universeRouter);

// Planet API routes — used by PlanetClient for planet listing, stats, and liveness probes
app.get(`${BASE_PATH}/api/planets/stats`, async (_req, res) => {
  try {
    const stats = await planetStorage.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to get planet stats' });
  }
});

app.get(`${BASE_PATH}/api/planets`, async (_req, res) => {
  try {
    const planets = await planetStorage.listPlanets();
    res.json({ success: true, planets });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list planets' });
  }
});

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
// hashed build artifacts (in /assets/) = immutable/1yr,
// non-hashed JS (play-gate.js, matrix-auth.js) = short cache to allow updates.
app.use((_req, res, next) => {
  const ext = path.extname(_req.path).toLowerCase();
  const isHashedAsset = _req.path.includes('/assets/');
  if (ext === '.html' || !ext) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  } else if (isHashedAsset && (ext === '.js' || ext === '.css' || ext === '.wasm')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  next();
});

// Serve runtime-generated sprites — mounted BEFORE build-time static files
// so dynamically generated sprites are found at the same URL paths.
// Runtime sprites live at RUNTIME_SPRITES_DIR/{folderId}/south.png etc.
// and are served at /assets/sprites/pixellab/{folderId}/south.png
const spriteStaticOpts = { fallthrough: true, maxAge: '1h' };
app.use('/assets/sprites/pixellab', express.static(RUNTIME_SPRITES_DIR, spriteStaticOpts));
app.use(`${BASE_PATH}/assets/sprites/pixellab`, express.static(RUNTIME_SPRITES_DIR, spriteStaticOpts));

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
  // Admin SPA is handled by its own route — don't serve game.html for /admin/ paths
  if (req.path.startsWith(`${BASE_PATH}/admin`)) return next();

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

  // Ensure runtime sprites directory exists
  fs.mkdirSync(RUNTIME_SPRITES_DIR, { recursive: true });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] MVEE production server on port ${PORT} (base: ${BASE_PATH})`);
    console.log(`[server] Multiverse API mounted at ${BASE_PATH}/api/multiverse`);
    console.log(`[server] Runtime sprites: ${RUNTIME_SPRITES_DIR}`);
    if (PIXELLAB_API_KEY) {
      console.log(`[server] PixelLab sprite generation: ENABLED`);
    } else {
      console.warn(`[server] PixelLab sprite generation: DISABLED (no PIXELLAB_API_KEY)`);
    }
  });
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
