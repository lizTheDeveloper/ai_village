/**
 * Admin API Routes — REST endpoints for the Lore Bible admin SPA.
 *
 * Provides read/write access to species data, sprites, songs, lore, items,
 * buildings, and voices. All routes require Matrix authentication.
 *
 * Read endpoints try Postgres first (via content-db), falling back to
 * hardcoded registries/files if the DB is unavailable.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  SPECIES_REGISTRY,
  type SpeciesTemplate,
} from '../../packages/core/src/species/SpeciesRegistry.js';
import { MAGICAL_SPECIES_REGISTRY } from '../../packages/core/src/species/MagicalSpeciesRegistry.js';
import { FOLKLORIST_SPECIES_REGISTRY } from '../../packages/core/src/species/FolkloristSpeciesRegistry.js';
import { SPRINT13_FOLKLORIST_SPECIES_REGISTRY } from '../../packages/core/src/species/Sprint13FolkloristSpeciesRegistry.js';
import { SPRINT14_FOLKLORIST_SPECIES_REGISTRY } from '../../packages/core/src/species/Sprint14FolkloristSpeciesRegistry.js';
import { MVEE_SONG_CATALOGUE } from '../../packages/core/src/data/mvee-songs.js';
import { NORN_SONG_CATALOGUE, type SongEntry } from '../../packages/core/src/lore/SongSystem.js';
import * as contentDb from './content-db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MATRIX_HOMESERVER = process.env.MATRIX_HOMESERVER || 'https://matrix.multiversestudios.xyz';

// Admin users allowed to access the admin API
const ADMIN_USERS = new Set([
  '@Lizthedeveloper:multiversestudios.xyz',
]);

// ============================================================================
// Auth Middleware
// ============================================================================

async function adminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header. Use Bearer <matrix_access_token>' });
    return;
  }

  const accessToken = authHeader.slice(7);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const whoamiRes = await fetch(`${MATRIX_HOMESERVER}/_matrix/client/v3/account/whoami`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!whoamiRes.ok) {
      res.status(401).json({ error: 'Invalid Matrix access token' });
      return;
    }

    const whoami = await whoamiRes.json() as { user_id: string };
    if (!ADMIN_USERS.has(whoami.user_id)) {
      res.status(403).json({ error: 'User not authorized for admin access' });
      return;
    }

    // Attach user info for downstream handlers
    (req as any).adminUser = whoami.user_id;
    next();
  } catch (error) {
    res.status(502).json({ error: 'Failed to validate token with Matrix homeserver' });
  }
}

// ============================================================================
// Combined Species Registry
// ============================================================================

function getAllSpecies(): Record<string, SpeciesTemplate> {
  return {
    ...SPECIES_REGISTRY,
    ...MAGICAL_SPECIES_REGISTRY,
    ...FOLKLORIST_SPECIES_REGISTRY,
    ...SPRINT13_FOLKLORIST_SPECIES_REGISTRY,
    ...SPRINT14_FOLKLORIST_SPECIES_REGISTRY,
  };
}

// ============================================================================
// Sprite Helpers
// ============================================================================

function getSpriteBaseDirs(): string[] {
  const runtimeDir = process.env.SPRITES_DIR
    || path.resolve(__dirname, '..', 'runtime-sprites');
  const buildTimeDir = path.resolve(__dirname, '..', 'public', 'assets', 'sprites', 'pixellab');
  const rendererDir = path.resolve(__dirname, '..', '..', 'packages', 'renderer', 'assets', 'sprites', 'pixellab');
  return [runtimeDir, buildTimeDir, rendererDir];
}

interface SpriteManifestEntry {
  folderId: string;
  hasSouth: boolean;
  hasDirections: boolean;
  metadata: Record<string, unknown> | null;
}

function getSpriteManifest(speciesId: string): SpriteManifestEntry | null {
  for (const baseDir of getSpriteBaseDirs()) {
    const spriteDir = path.join(baseDir, speciesId);
    if (fs.existsSync(spriteDir)) {
      const hasSouth = fs.existsSync(path.join(spriteDir, 'south.png'));
      const hasDirections = fs.existsSync(path.join(spriteDir, 'sprites'));
      let metadata: Record<string, unknown> | null = null;
      const metaPath = path.join(spriteDir, 'metadata.json');
      if (fs.existsSync(metaPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        } catch { /* skip corrupt metadata */ }
      }
      return { folderId: speciesId, hasSouth, hasDirections, metadata };
    }
  }
  return null;
}

// ============================================================================
// Items Helpers
// ============================================================================

function loadItemsFromDisk(): Record<string, unknown[]> {
  const itemsDir = path.resolve(__dirname, '..', '..', 'packages', 'core', 'data', 'items');
  const categories: Record<string, unknown[]> = {};

  if (!fs.existsSync(itemsDir)) return categories;

  for (const file of fs.readdirSync(itemsDir)) {
    if (!file.endsWith('.json')) continue;
    const categoryName = file.replace('.json', '');
    try {
      const data = JSON.parse(fs.readFileSync(path.join(itemsDir, file), 'utf-8'));
      categories[categoryName] = Array.isArray(data) ? data : (data.items || data.resourceItems || [data]);
    } catch { /* skip corrupt files */ }
  }
  return categories;
}

// ============================================================================
// Router Factory
// ============================================================================

export function createAdminApiRouter(): Router {
  const router = Router();

  // Auth gate on all admin API routes
  router.use(adminAuth);

  // ------------------------------------------------------------------
  // GET /admin/api/species — list all species with config summary
  // ------------------------------------------------------------------
  router.get('/species', async (_req: Request, res: Response) => {
    try {
      const dbRows = await contentDb.listAllSpecies();
      if (dbRows !== null) {
        const summary = dbRows.map((s: any) => ({
          speciesId: s.species_id,
          speciesName: s.species_name,
          commonName: s.common_name,
          description: s.description,
          sizeCategory: s.size_category,
          lifespanType: s.lifespan_type,
          sapient: s.sapient,
          cross_game_compatible: s.cross_game_compatible ?? false,
          native_game: s.native_game ?? 'mvee',
          hasSprite: getSpriteManifest(s.species_id) !== null,
        }));
        res.json({ count: summary.length, species: summary, source: 'db' });
        return;
      }
    } catch (err) {
      // Fall through to hardcoded fallback
    }

    const all = getAllSpecies();
    const summary = Object.values(all).map((s) => ({
      speciesId: s.speciesId,
      speciesName: s.speciesName,
      commonName: s.commonName,
      description: s.description,
      sizeCategory: s.sizeCategory,
      lifespanType: s.lifespanType,
      sapient: s.sapient,
      cross_game_compatible: s.cross_game_compatible ?? false,
      native_game: s.native_game ?? 'mvee',
      hasSprite: getSpriteManifest(s.speciesId) !== null,
    }));
    res.json({ count: summary.length, species: summary });
  });

  // ------------------------------------------------------------------
  // GET /admin/api/species/:id — full species detail
  // ------------------------------------------------------------------
  router.get('/species/:id', async (req: Request, res: Response) => {
    const id = req.params.id;

    try {
      const dbRow = await contentDb.getSpeciesById(id);
      if (dbRow !== null) {
        const sprite = getSpriteManifest(id);
        const songs = [...MVEE_SONG_CATALOGUE];
        const nornSongs = [...NORN_SONG_CATALOGUE];

        const species = {
          ...dbRow,
          innate_traits: typeof dbRow.innate_traits === 'string'
            ? JSON.parse(dbRow.innate_traits)
            : dbRow.innate_traits,
          compatible_species: typeof dbRow.compatible_species === 'string'
            ? JSON.parse(dbRow.compatible_species)
            : dbRow.compatible_species,
        };

        res.json({
          species,
          sprite,
          songs: { mvee: songs, norn: nornSongs },
          lore: { note: 'Lore is generated at runtime by the game simulation. Start a game to populate lore entries.' },
          items: { note: 'Items are not species-specific. Use GET /admin/api/species/:id/items for all items.' },
          source: 'db',
        });
        return;
      }
    } catch (err) {
      // Fall through to hardcoded fallback
    }

    const all = getAllSpecies();
    const species = all[id];
    if (!species) {
      res.status(404).json({ error: `Species '${id}' not found` });
      return;
    }

    const sprite = getSpriteManifest(species.speciesId);
    const songs = [...MVEE_SONG_CATALOGUE];
    const nornSongs = [...NORN_SONG_CATALOGUE];

    res.json({
      species,
      sprite,
      songs: { mvee: songs, norn: nornSongs },
      lore: { note: 'Lore is generated at runtime by the game simulation. Start a game to populate lore entries.' },
      items: { note: 'Items are not species-specific. Use GET /admin/api/species/:id/items for all items.' },
    });
  });

  // ------------------------------------------------------------------
  // PUT /admin/api/species/:id — upsert a species
  // ------------------------------------------------------------------
  router.put('/species/:id', async (req: Request, res: Response) => {
    try {
      const row = await contentDb.upsertSpecies({ ...req.body, species_id: req.params.id });
      res.json(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Postgres unavailable') {
        res.status(503).json({ error: 'Content database not available' });
        return;
      }
      res.status(500).json({ error: msg });
    }
  });

  // ------------------------------------------------------------------
  // DELETE /admin/api/species/:id — delete a species
  // ------------------------------------------------------------------
  router.delete('/species/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await contentDb.deleteSpecies(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: `Species '${req.params.id}' not found` });
        return;
      }
      res.status(204).send();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'Postgres unavailable') {
        res.status(503).json({ error: 'Content database not available' });
        return;
      }
      res.status(500).json({ error: msg });
    }
  });

  // ------------------------------------------------------------------
  // GET /admin/api/species/:id/sprites — sprite manifest + phenotype info
  // ------------------------------------------------------------------
  router.get('/species/:id/sprites', (req: Request, res: Response) => {
    const all = getAllSpecies();
    const species = all[req.params.id];
    if (!species) {
      res.status(404).json({ error: `Species '${req.params.id}' not found` });
      return;
    }

    const manifest = getSpriteManifest(species.speciesId);
    // Also check for alternative folder names (underscored variants)
    const altId = species.speciesId.replace(/-/g, '_');
    const altManifest = altId !== species.speciesId ? getSpriteManifest(altId) : null;

    const phenotype = {
      bodyPlanId: species.bodyPlanId,
      sizeCategory: species.sizeCategory,
      averageHeight: species.averageHeight,
      averageWeight: species.averageWeight,
    };

    res.json({
      speciesId: species.speciesId,
      phenotype,
      sprite: manifest || altManifest,
      spritePath: manifest
        ? `/assets/sprites/pixellab/${manifest.folderId}/south.png`
        : null,
    });
  });

  // ------------------------------------------------------------------
  // GET /admin/api/species/:id/audio — voice manifest, voice modes
  // ------------------------------------------------------------------
  router.get('/species/:id/audio', (req: Request, res: Response) => {
    const all = getAllSpecies();
    const species = all[req.params.id];
    if (!species) {
      res.status(404).json({ error: `Species '${req.params.id}' not found` });
      return;
    }

    // No per-species TTS/voice system exists — voice modes are text narration styles
    res.json({
      speciesId: species.speciesId,
      voiceModes: ['live', 'chronicle', 'bardic', 'reporter'],
      note: 'Voice modes are text narration styles, not audio. No per-species TTS integration exists.',
      nativeLanguageId: species.nativeLanguageId ?? null,
    });
  });

  // ------------------------------------------------------------------
  // GET /admin/api/species/:id/songs — song catalogue entries + MP3 paths
  // ------------------------------------------------------------------
  router.get('/species/:id/songs', async (req: Request, res: Response) => {
    const all = getAllSpecies();
    const species = all[req.params.id];
    if (!species) {
      res.status(404).json({ error: `Species '${req.params.id}' not found` });
      return;
    }

    try {
      const dbSongs = await contentDb.listSongs();
      if (dbSongs !== null) {
        const mvee = dbSongs
          .filter((s: any) => s.catalog === 'mvee')
          .map((s: any) => ({ ...s, mp3Path: s.mp3_path || `/audio/mvee/${s.filename}` }));
        const norn = dbSongs
          .filter((s: any) => s.catalog === 'norn')
          .map((s: any) => ({ ...s, mp3Path: s.mp3_path || `/audio/norn/${s.filename}` }));
        res.json({
          speciesId: species.speciesId,
          note: 'Songs are global, not per-species. Both catalogues included.',
          mvee,
          norn,
          source: 'db',
        });
        return;
      }
    } catch (err) {
      // Fall through to hardcoded fallback
    }

    // Songs are global (not per-species), served from /audio/mvee/ and /audio/norn/
    const mvee = MVEE_SONG_CATALOGUE.map((s) => ({
      ...s,
      mp3Path: `/audio/mvee/${s.filename}`,
    }));
    const norn = NORN_SONG_CATALOGUE.map((s) => ({
      ...s,
      mp3Path: `/audio/norn/${s.filename}`,
    }));

    res.json({
      speciesId: species.speciesId,
      note: 'Songs are global, not per-species. Both catalogues included.',
      mvee,
      norn,
    });
  });

  // ------------------------------------------------------------------
  // POST /admin/api/songs — upsert a song
  // ------------------------------------------------------------------
  router.post('/songs', async (req: Request, res: Response) => {
    try {
      const row = await contentDb.upsertSong(req.body);
      if (row === null) {
        res.status(503).json({ error: 'Content database not available' });
        return;
      }
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ------------------------------------------------------------------
  // DELETE /admin/api/songs/:catalog/:filename — delete a song
  // ------------------------------------------------------------------
  router.delete('/songs/:catalog/:filename', async (req: Request, res: Response) => {
    try {
      const deleted = await contentDb.deleteSong(req.params.catalog, req.params.filename);
      if (deleted === null) {
        res.status(503).json({ error: 'Content database not available' });
        return;
      }
      if (!deleted) {
        res.status(404).json({ error: `Song '${req.params.filename}' in catalog '${req.params.catalog}' not found` });
        return;
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ------------------------------------------------------------------
  // GET /admin/api/species/:id/lore — lore entries, docs, unlock events
  // ------------------------------------------------------------------
  router.get('/species/:id/lore', (req: Request, res: Response) => {
    const all = getAllSpecies();
    const species = all[req.params.id];
    if (!species) {
      res.status(404).json({ error: `Species '${req.params.id}' not found` });
      return;
    }

    // Lore is generated at runtime by LoreExportCollector — not available as static data.
    // Return species description and cross-game metadata as the static lore baseline.
    res.json({
      speciesId: species.speciesId,
      staticLore: {
        description: species.description,
        traveler_epithet: species.traveler_epithet ?? null,
        precursors_lineage: species.precursors_lineage ?? null,
        socialStructure: species.socialStructure ?? null,
        nativeLanguageId: species.nativeLanguageId ?? null,
      },
      runtimeLore: {
        note: 'Dynamic lore (myths, schisms, syncretisms, holy texts, beliefs, rituals) is generated by the game simulation at runtime via the LoreExportCollector system. Query the metrics server at port 8766 for live lore data.',
        categories: ['myth', 'schism', 'syncretism', 'holy_text', 'belief', 'ritual', 'narrative_sediment'],
      },
    });
  });

  // ------------------------------------------------------------------
  // GET /admin/api/species/:id/items — items (global, not species-specific)
  // ------------------------------------------------------------------
  router.get('/species/:id/items', (req: Request, res: Response) => {
    const all = getAllSpecies();
    const species = all[req.params.id];
    if (!species) {
      res.status(404).json({ error: `Species '${req.params.id}' not found` });
      return;
    }

    const categories = loadItemsFromDisk();
    const allItems = Object.values(categories).flat();

    res.json({
      speciesId: species.speciesId,
      note: 'Items are global and not species-specific. No biome affinity data exists on item definitions.',
      totalItems: allItems.length,
      categories: Object.fromEntries(
        Object.entries(categories).map(([k, v]) => [k, { count: v.length, items: v }])
      ),
    });
  });

  // ------------------------------------------------------------------
  // GET /admin/api/items — list all items, optionally filtered by category
  // ------------------------------------------------------------------
  router.get('/items', async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const dbItems = await contentDb.listItems(category);
      if (dbItems !== null) {
        res.json({ count: dbItems.length, items: dbItems, source: 'db' });
        return;
      }
    } catch (err) {
      // Fall through to disk fallback
    }

    const categories = loadItemsFromDisk();
    const allItems = Object.values(categories).flat();
    res.json({
      count: allItems.length,
      items: allItems,
      categories: Object.fromEntries(
        Object.entries(categories).map(([k, v]) => [k, { count: v.length, items: v }])
      ),
    });
  });

  // ------------------------------------------------------------------
  // PUT /admin/api/items/:id — upsert an item
  // ------------------------------------------------------------------
  router.put('/items/:id', async (req: Request, res: Response) => {
    try {
      const row = await contentDb.upsertItem(req.body);
      if (row === null) {
        res.status(503).json({ error: 'Content database not available' });
        return;
      }
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ------------------------------------------------------------------
  // DELETE /admin/api/items/:id — delete an item
  // ------------------------------------------------------------------
  router.delete('/items/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await contentDb.deleteItem(req.params.id);
      if (deleted === null) {
        res.status(503).json({ error: 'Content database not available' });
        return;
      }
      if (!deleted) {
        res.status(404).json({ error: `Item '${req.params.id}' not found` });
        return;
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ------------------------------------------------------------------
  // GET /admin/api/lore — list lore fragments, optionally by category
  // ------------------------------------------------------------------
  router.get('/lore', async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const dbFragments = await contentDb.listLoreFragments(category);
      if (dbFragments !== null) {
        res.json({ count: dbFragments.length, fragments: dbFragments, source: 'db' });
        return;
      }
    } catch (err) {
      // Fall through to empty fallback
    }

    res.json({
      count: 0,
      fragments: [],
      note: 'Content database not available. Dynamic lore is generated at runtime by the game simulation.',
    });
  });

  // ------------------------------------------------------------------
  // GET /admin/api/lore/:fragmentId — get a single lore fragment
  // ------------------------------------------------------------------
  router.get('/lore/:fragmentId', async (req: Request, res: Response) => {
    try {
      const fragment = await contentDb.getLoreFragment(req.params.fragmentId);
      if (fragment === null) {
        res.status(404).json({ error: `Lore fragment '${req.params.fragmentId}' not found` });
        return;
      }
      res.json(fragment);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ------------------------------------------------------------------
  // PUT /admin/api/lore/:fragmentId — upsert a lore fragment
  // ------------------------------------------------------------------
  router.put('/lore/:fragmentId', async (req: Request, res: Response) => {
    try {
      const row = await contentDb.upsertLoreFragment(req.body);
      if (row === null) {
        res.status(503).json({ error: 'Content database not available' });
        return;
      }
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ------------------------------------------------------------------
  // DELETE /admin/api/lore/:fragmentId — delete a lore fragment
  // ------------------------------------------------------------------
  router.delete('/lore/:fragmentId', async (req: Request, res: Response) => {
    try {
      const deleted = await contentDb.deleteLoreFragment(req.params.fragmentId);
      if (deleted === null) {
        res.status(503).json({ error: 'Content database not available' });
        return;
      }
      if (!deleted) {
        res.status(404).json({ error: `Lore fragment '${req.params.fragmentId}' not found` });
        return;
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ------------------------------------------------------------------
  // GET /admin/api/buildings — list buildings, optionally by category
  // ------------------------------------------------------------------
  router.get('/buildings', async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const dbBuildings = await contentDb.listBuildings(category);
      if (dbBuildings !== null) {
        res.json({ count: dbBuildings.length, buildings: dbBuildings, source: 'db' });
        return;
      }
    } catch (err) {
      // Fall through to empty fallback
    }

    res.json({ count: 0, buildings: [] });
  });

  // ------------------------------------------------------------------
  // PUT /admin/api/buildings/:id — upsert a building
  // ------------------------------------------------------------------
  router.put('/buildings/:id', async (req: Request, res: Response) => {
    try {
      const row = await contentDb.upsertBuilding(req.body);
      if (row === null) {
        res.status(503).json({ error: 'Content database not available' });
        return;
      }
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ------------------------------------------------------------------
  // DELETE /admin/api/buildings/:id — delete a building
  // ------------------------------------------------------------------
  router.delete('/buildings/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await contentDb.deleteBuilding(req.params.id);
      if (deleted === null) {
        res.status(503).json({ error: 'Content database not available' });
        return;
      }
      if (!deleted) {
        res.status(404).json({ error: `Building '${req.params.id}' not found` });
        return;
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ------------------------------------------------------------------
  // GET /admin/api/voices — list voice configs, optionally by species_id
  // ------------------------------------------------------------------
  router.get('/voices', async (req: Request, res: Response) => {
    try {
      const speciesId = req.query.species_id as string | undefined;
      const dbVoices = await contentDb.listVoiceConfigs(speciesId);
      if (dbVoices !== null) {
        res.json({ count: dbVoices.length, voices: dbVoices, source: 'db' });
        return;
      }
    } catch (err) {
      // Fall through to empty fallback
    }

    res.json({ count: 0, voices: [] });
  });

  // ------------------------------------------------------------------
  // PUT /admin/api/voices — upsert a voice config
  // ------------------------------------------------------------------
  router.put('/voices', async (req: Request, res: Response) => {
    try {
      const row = await contentDb.upsertVoiceConfig(req.body);
      if (row === null) {
        res.status(503).json({ error: 'Content database not available' });
        return;
      }
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // ------------------------------------------------------------------
  // DELETE /admin/api/voices/:speciesId/:voiceId — delete a voice config
  // ------------------------------------------------------------------
  router.delete('/voices/:speciesId/:voiceId', async (req: Request, res: Response) => {
    try {
      const deleted = await contentDb.deleteVoiceConfig(req.params.speciesId, req.params.voiceId);
      if (deleted === null) {
        res.status(503).json({ error: 'Content database not available' });
        return;
      }
      if (!deleted) {
        res.status(404).json({ error: `Voice config for species '${req.params.speciesId}' / voice '${req.params.voiceId}' not found` });
        return;
      }
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
