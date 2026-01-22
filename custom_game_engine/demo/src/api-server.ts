#!/usr/bin/env tsx
/**
 * Multiverse API Server (Port 3001)
 *
 * Persistence and multiverse management server, separate from the game runtime server (8766).
 *
 * API Namespaces:
 *
 * /api/multiverse/*  - Universe/multiverse operations
 *   - /api/universe, /api/universes - Universe CRUD (Phase 2: → /api/multiverse/universe/*)
 *   - /api/passage, /api/passages   - Inter-universe connections (Phase 2: → /api/multiverse/passage/*)
 *   - /api/player/*                 - Player registration (Phase 2: → /api/multiverse/player/*)
 *   - /api/multiverse/stats         - Multiverse statistics (already correct)
 *
 * /api/souls/*  - Soul repository (eternal storage)
 *   - /api/save-soul              - Save soul (Phase 2: → /api/souls/save)
 *   - /api/soul-repository/stats  - Repository stats (Phase 2: → /api/souls/stats)
 *   - /api/generate-soul-sprite   - Generate sprite (Phase 2: → /api/souls/sprite)
 *
 * /api/species/*  - Alien species database
 *   - /api/alien-species          - List species (Phase 2: → /api/species)
 *   - /api/save-alien-species     - Save species (Phase 2: → /api/species/save)
 *   - /api/generate-sprite        - Generate sprite (Phase 2: → /api/species/sprite)
 *
 * See docs/API_NAMESPACE_MIGRATION.md for the full migration plan.
 */

import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { generateSprite, saveAlienSpecies, getAllAlienSpecies } from './alien-api.js';
import { SoulRepositorySystem } from '../../packages/core/src/systems/SoulRepositorySystem.js';
import { createUniverseApiRouter } from './universe-api.js';
import { multiverseStorage } from './multiverse-storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// Log all requests to /api/ for debugging
app.use('/api', (req, res, next) => {
  const bodySize = req.headers['content-length'] || 'unknown';
  console.log(`[API] ${req.method} ${req.path} (body: ${bodySize} bytes)`);
  next();
});

// Error handler for body parsing (e.g., payload too large, invalid JSON)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.too.large') {
    console.error(`[API] Request body too large: ${req.path} (${req.headers['content-length']} bytes)`);
    return res.status(413).json({ error: 'Request body too large' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    console.error(`[API] Invalid JSON in request: ${req.path}`);
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next(err);
});

// Initialize soul repository (server-side persistence)
const soulRepository = new SoulRepositorySystem();

// Soul repository endpoint
app.post('/api/save-soul', async (req, res) => {
  try {
    const soulData = req.body;
    console.log(`[API] Receiving soul: ${soulData.name} (${soulData.archetype})`);

    // Create a minimal world mock for the repository system
    const mockWorld = {
      tick: Date.now(),
      getEntity: (id: string) => {
        // Return a mock entity with the soul data
        return {
          id,
          components: new Map([
            ['soul_identity', {
              soulName: soulData.name,
              soulBirthTick: soulData.soulBirthTick || Date.now(),
            }]
          ])
        };
      }
    } as any;

    // Save soul to repository
    await (soulRepository as any).backupSoul(mockWorld, soulData);

    res.json({ success: true, message: `Soul ${soulData.name} saved to repository` });
  } catch (error: any) {
    console.error('[API] Error saving soul:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get repository stats
app.get('/api/soul-repository/stats', (req, res) => {
  try {
    const stats = soulRepository.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('[API] Error getting repository stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Soul sprite generation endpoint
app.post('/api/generate-soul-sprite', async (req, res) => {
  try {
    const { soulId, name, description, reincarnationCount, species } = req.body;

    console.log(`[API] Generating sprite for soul: ${name} (${reincarnationCount} incarnations)`);

    // Get PixelLab API key from environment
    const apiKey = process.env.PIXELLAB_API_KEY || process.env.PIXELLAB_API_TOKEN;
    if (!apiKey) {
      throw new Error('PIXELLAB_API_KEY environment variable not set');
    }

    // Import SoulSpriteRenderer
    const { SoulSpriteRenderer } = await import('../../packages/renderer/src/production/SoulSpriteRenderer.js');
    const renderer = new SoulSpriteRenderer(apiKey);

    // Generate sprites
    console.log(`[API] Calling generateSoulSprites...`);
    const spriteSet = await renderer.generateSoulSprites({
      id: soulId,
      name,
      description: description || `${species || 'human'} character with ${reincarnationCount} incarnations`,
      reincarnationCount,
      species,
    });

    console.log(`[API] Generated sprite set - tier: ${spriteSet.tier}, sprites count: ${spriteSet.sprites.size}`);

    // Debug: check sprite data type
    for (const [dir, sprite] of spriteSet.sprites.entries()) {
      console.log(`[API] Sprite ${dir} type: ${typeof sprite}, is string: ${typeof sprite === 'string'}`);
      if (typeof sprite === 'object') {
        console.log(`[API] Sprite ${dir} object keys:`, Object.keys(sprite));
      }
    }

    // Save to disk
    const spritePath = path.join(__dirname, `../../packages/renderer/assets/sprites/pixellab/soul_${soulId}`);
    console.log(`[API] Saving sprite set to: ${spritePath}`);
    await renderer.saveSpriteSet(spriteSet, spritePath);

    console.log(`[API] Sprite saved successfully to: soul_${soulId}`);

    // Update soul repository with spriteFolderId
    try {
      const repositoryPath = path.join(__dirname, '../soul-repository');
      const indexPath = path.join(repositoryPath, 'index.json');
      const indexData = JSON.parse(await fs.readFile(indexPath, 'utf-8'));

      const soulMetadata = indexData.souls[soulId];
      if (soulMetadata) {
        const soulFilePath = path.join(repositoryPath, soulMetadata.filePath);
        const soulData = JSON.parse(await fs.readFile(soulFilePath, 'utf-8'));
        soulData.spriteFolderId = `soul_${soulId}`;
        await fs.writeFile(soulFilePath, JSON.stringify(soulData, null, 2));
        console.log(`[API] Updated soul repository with spriteFolderId: soul_${soulId}`);
      }
    } catch (error) {
      console.error('[API] Failed to update soul repository:', error);
    }

    res.json({
      success: true,
      spriteFolderId: `soul_${soulId}`,
      tier: spriteSet.tier,
      config: spriteSet.config,
    });
  } catch (error: any) {
    console.error('[API] Error generating soul sprite:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API routes
app.post('/api/generate-sprite', generateSprite);
app.post('/api/save-alien-species', saveAlienSpecies);
app.get('/api/alien-species', getAllAlienSpecies);

// Universe/Multiverse API routes
const universeRouter = createUniverseApiRouter();
app.use('/api', universeRouter);

// Start server
async function startServer() {
  // Initialize multiverse storage
  await multiverseStorage.init();

  app.listen(PORT, () => {
    console.log(`[API Server] Running on port ${PORT}`);
    console.log(`[API Server] Soul sprite generation available at /api/generate-soul-sprite`);
    console.log(`[API Server] Multiverse API available at /api/universe, /api/universes, /api/passage, etc.`);
  });
}

startServer().catch((error) => {
  console.error('[API Server] Failed to start:', error);
  process.exit(1);
});
