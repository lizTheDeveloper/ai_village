#!/usr/bin/env npx ts-node
/**
 * PixelLab Background Daemon
 *
 * Runs continuously in the background, keeping the PixelLab queue filled.
 * When a job completes, it downloads the asset and queues a new one.
 *
 * Setup:
 *   export PIXELLAB_API_KEY="your-api-key"
 *
 * Usage:
 *   npx ts-node scripts/pixellab-daemon.ts
 *   # Or run in background:
 *   nohup npx ts-node scripts/pixellab-daemon.ts > pixellab.log 2>&1 &
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if exists
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

const API_KEY = process.env.PIXELLAB_API_KEY;
const API_BASE = 'https://api.pixellab.ai/v1';
const MANIFEST_PATH = path.join(__dirname, 'pixellab-batch-manifest.json');
const STATE_PATH = path.join(__dirname, 'pixellab-daemon-state.json');
const ASSETS_PATH = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');

// Configuration
const MAX_CONCURRENT_JOBS = 5; // Keep this many jobs in the queue
const CHECK_INTERVAL_MS = 60000; // Check every 60 seconds
const DELAY_AFTER_QUEUE_MS = 5000; // Wait after queuing a new job

type AssetType = 'character' | 'animal' | 'tileset' | 'isometric_tile' | 'map_object' | 'item';

interface JobInfo {
  pixelLabId: string;
  localId: string;
  type: AssetType;
  category: string; // e.g., 'humanoids.humans', 'animals.livestock', 'building_tiles.walls'
  queuedAt: string;
  description: string;
}

interface DaemonState {
  activeJobs: JobInfo[];
  totalGenerated: number;
  totalDownloaded: number;
  startedAt: string;
  lastCheck: string;
}

function log(msg: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${msg}`);
}

function loadState(): DaemonState {
  if (fs.existsSync(STATE_PATH)) {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  }
  return {
    activeJobs: [],
    totalGenerated: 0,
    totalDownloaded: 0,
    startedAt: new Date().toISOString(),
    lastCheck: new Date().toISOString(),
  };
}

function saveState(state: DaemonState): void {
  state.lastCheck = new Date().toISOString();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function loadManifest(): any {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
}

function saveManifest(manifest: any): void {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

async function apiRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  if (!API_KEY) {
    throw new Error('PIXELLAB_API_KEY not set');
  }

  const url = `${API_BASE}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }

  return response.json();
}

async function createCharacter(description: string, name: string, proportions?: any): Promise<string> {
  const body: any = {
    description,
    name,
    size: 48,
    n_directions: 8,
    view: 'high top-down',
    detail: 'medium detail',
    outline: 'single color black outline',
    shading: 'basic shading',
  };

  // Apply species-specific proportions if provided
  if (proportions) {
    body.proportions = JSON.stringify(proportions);
  }

  const result = await apiRequest('/characters', 'POST', body);
  return result.character_id || result.id;
}

async function createTileset(lower: string, upper: string, transition?: string): Promise<string> {
  const body: any = {
    lower_description: lower,
    upper_description: upper,
    tile_size: { width: 32, height: 32 },
    view: 'high top-down',
  };
  if (transition) {
    body.transition_description = transition;
    body.transition_size = 0.5;
  }
  const result = await apiRequest('/tilesets/topdown', 'POST', body);
  return result.tileset_id || result.id;
}

async function createIsometricTile(description: string, size: number = 32): Promise<string> {
  const result = await apiRequest('/tiles/isometric', 'POST', {
    description,
    size,
    tile_shape: 'block',
    detail: 'medium detail',
    shading: 'basic shading',
    outline: 'single color outline',
  });
  return result.tile_id || result.id;
}

async function createMapObject(description: string, width: number = 48, height: number = 48): Promise<string> {
  const result = await apiRequest('/objects/map', 'POST', {
    description,
    width,
    height,
    view: 'high top-down',
    detail: 'medium detail',
    shading: 'medium shading',
    outline: 'single color outline',
  });
  return result.object_id || result.id;
}

async function createAnimal(description: string, name: string): Promise<string> {
  // Animals use character API but with different proportions
  const result = await apiRequest('/characters', 'POST', {
    description,
    name,
    size: 32, // Smaller than humanoids
    n_directions: 8,
    view: 'high top-down',
    detail: 'medium detail',
    outline: 'single color black outline',
    shading: 'basic shading',
    proportions: '{"type": "preset", "name": "chibi"}', // Better for animals
  });
  return result.character_id || result.id;
}

async function getCharacterStatus(id: string): Promise<{ status: string; data?: any }> {
  try {
    const result = await apiRequest(`/characters/${id}`);
    // Check if completed (has rotations or status is completed)
    if (result.status === 'completed' || result.rotations || (result.frames?.rotations)) {
      return { status: 'completed', data: result };
    } else if (result.status === 'failed') {
      return { status: 'failed', data: result };
    }
    return { status: 'processing', data: result };
  } catch (err: any) {
    if (err.message.includes('404')) {
      return { status: 'not_found' };
    }
    throw err;
  }
}

async function getTilesetStatus(id: string): Promise<{ status: string; data?: any }> {
  try {
    const result = await apiRequest(`/tilesets/topdown/${id}`);
    if (result.status === 'completed' || result.image_url || result.download_url) {
      return { status: 'completed', data: result };
    } else if (result.status === 'failed') {
      return { status: 'failed', data: result };
    }
    return { status: 'processing', data: result };
  } catch (err: any) {
    if (err.message.includes('404')) {
      return { status: 'not_found' };
    }
    throw err;
  }
}

async function getIsometricTileStatus(id: string): Promise<{ status: string; data?: any }> {
  try {
    const result = await apiRequest(`/tiles/isometric/${id}`);
    if (result.status === 'completed' || result.image_url || result.download_url) {
      return { status: 'completed', data: result };
    } else if (result.status === 'failed') {
      return { status: 'failed', data: result };
    }
    return { status: 'processing', data: result };
  } catch (err: any) {
    if (err.message.includes('404')) {
      return { status: 'not_found' };
    }
    throw err;
  }
}

async function getMapObjectStatus(id: string): Promise<{ status: string; data?: any }> {
  try {
    const result = await apiRequest(`/objects/map/${id}`);
    if (result.status === 'completed' || result.image_url || result.download_url) {
      return { status: 'completed', data: result };
    } else if (result.status === 'failed') {
      return { status: 'failed', data: result };
    }
    return { status: 'processing', data: result };
  } catch (err: any) {
    if (err.message.includes('404')) {
      return { status: 'not_found' };
    }
    throw err;
  }
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
}

async function downloadCharacter(job: JobInfo, data: any): Promise<boolean> {
  try {
    const charDir = path.join(ASSETS_PATH, job.localId);
    const rotationsDir = path.join(charDir, 'rotations');
    fs.mkdirSync(rotationsDir, { recursive: true });

    const rotations = data.rotations || data.frames?.rotations || {};
    const directions = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];

    for (const dir of directions) {
      const url = rotations[dir];
      if (url) {
        await downloadFile(url, path.join(rotationsDir, `${dir}.png`));
      }
    }

    // Create metadata - include species info from category
    const speciesName = job.category.split('.')[1] || 'unknown';
    const metadata = {
      id: job.localId,
      name: job.localId,
      pixellab_id: job.pixelLabId,
      species: speciesName,
      category: job.category,
      size: 48,
      directions: 8,
      view: 'high top-down',
      style: {
        outline: 'single color black outline',
        shading: 'basic shading',
        detail: 'medium detail',
      },
      rotations: directions,
      animations: {},
    };
    fs.writeFileSync(path.join(charDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    return true;
  } catch (err) {
    log(`  Error downloading: ${err}`);
    return false;
  }
}

async function downloadTileset(job: JobInfo, data: any): Promise<boolean> {
  try {
    const tilesetDir = path.join(ASSETS_PATH, '../tilesets', job.localId);
    fs.mkdirSync(tilesetDir, { recursive: true });

    const imgUrl = data.image_url || data.download_url;
    if (imgUrl) {
      await downloadFile(imgUrl, path.join(tilesetDir, 'tileset.png'));
    }

    fs.writeFileSync(path.join(tilesetDir, 'metadata.json'), JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    log(`  Error downloading tileset: ${err}`);
    return false;
  }
}

async function downloadIsometricTile(job: JobInfo, data: any): Promise<boolean> {
  try {
    const tilesDir = path.join(ASSETS_PATH, '../tiles/building', job.localId);
    fs.mkdirSync(tilesDir, { recursive: true });

    const imgUrl = data.image_url || data.download_url;
    if (imgUrl) {
      await downloadFile(imgUrl, path.join(tilesDir, 'tile.png'));
    }

    const metadata = {
      id: job.localId,
      pixellab_id: job.pixelLabId,
      category: job.category,
      description: job.description,
    };
    fs.writeFileSync(path.join(tilesDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    return true;
  } catch (err) {
    log(`  Error downloading isometric tile: ${err}`);
    return false;
  }
}

async function downloadMapObject(job: JobInfo, data: any): Promise<boolean> {
  try {
    const objectsDir = path.join(ASSETS_PATH, '../objects', job.localId);
    fs.mkdirSync(objectsDir, { recursive: true });

    const imgUrl = data.image_url || data.download_url;
    if (imgUrl) {
      await downloadFile(imgUrl, path.join(objectsDir, 'object.png'));
    }

    const metadata = {
      id: job.localId,
      pixellab_id: job.pixelLabId,
      category: job.category,
      description: job.description,
    };
    fs.writeFileSync(path.join(objectsDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    return true;
  } catch (err) {
    log(`  Error downloading map object: ${err}`);
    return false;
  }
}

async function downloadItem(job: JobInfo, data: any): Promise<boolean> {
  try {
    const itemsDir = path.join(ASSETS_PATH, '../items', job.localId);
    fs.mkdirSync(itemsDir, { recursive: true });

    const imgUrl = data.image_url || data.download_url;
    if (imgUrl) {
      await downloadFile(imgUrl, path.join(itemsDir, 'icon.png'));
    }

    const metadata = {
      id: job.localId,
      pixellab_id: job.pixelLabId,
      category: job.category,
      description: job.description,
    };
    fs.writeFileSync(path.join(itemsDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    return true;
  } catch (err) {
    log(`  Error downloading item: ${err}`);
    return false;
  }
}

async function downloadAnimal(job: JobInfo, data: any): Promise<boolean> {
  try {
    const animalDir = path.join(ASSETS_PATH, '../animals', job.localId);
    const rotationsDir = path.join(animalDir, 'rotations');
    fs.mkdirSync(rotationsDir, { recursive: true });

    const rotations = data.rotations || data.frames?.rotations || {};
    const directions = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];

    for (const dir of directions) {
      const url = rotations[dir];
      if (url) {
        await downloadFile(url, path.join(rotationsDir, `${dir}.png`));
      }
    }

    const metadata = {
      id: job.localId,
      pixellab_id: job.pixelLabId,
      size: 32,
      directions: 8,
      category: job.category,
      rotations: directions,
      animations: {},
    };
    fs.writeFileSync(path.join(animalDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    return true;
  } catch (err) {
    log(`  Error downloading animal: ${err}`);
    return false;
  }
}

interface PendingJob {
  type: AssetType;
  localId: string;
  description: string;
  category: string;
  extra?: any;
}

function getNextPendingJob(manifest: any): PendingJob | null {
  // Priority order: humanoids, animals, building_tiles, tilesets, map_objects, items, plants

  // 1. Humanoids (characters with 8 directions)
  if (manifest.humanoids) {
    for (const [species, data] of Object.entries(manifest.humanoids) as [string, any][]) {
      if (data.pending && data.pending.length > 0) {
        const item = data.pending[0];
        return {
          type: 'character',
          localId: item.id,
          description: item.desc,
          category: `humanoids.${species}`,
          extra: {
            proportions: data.proportions,
            bodyPlan: data.bodyPlan,
            height: data.height,
          },
        };
      }
    }
  }

  // 2. Animals (smaller characters)
  if (manifest.animals) {
    for (const [category, data] of Object.entries(manifest.animals) as [string, any][]) {
      if (data.pending && data.pending.length > 0) {
        const item = data.pending[0];
        return {
          type: 'animal',
          localId: item.id,
          description: item.desc,
          category: `animals.${category}`,
        };
      }
    }
  }

  // 3. Building tiles (isometric tiles)
  if (manifest.building_tiles) {
    for (const [tileType, data] of Object.entries(manifest.building_tiles) as [string, any][]) {
      if (data.pending && data.pending.length > 0) {
        const item = data.pending[0];
        return {
          type: 'isometric_tile',
          localId: item.id,
          description: item.desc,
          category: `building_tiles.${tileType}`,
        };
      }
    }
  }

  // 4. Tilesets (terrain transitions)
  if (manifest.tilesets) {
    for (const [category, data] of Object.entries(manifest.tilesets) as [string, any][]) {
      if (data.pending && data.pending.length > 0) {
        const item = data.pending[0];
        return {
          type: 'tileset',
          localId: item.id,
          description: `${item.lower} → ${item.upper}`,
          category: `tilesets.${category}`,
          extra: item,
        };
      }
    }
  }

  // 5. Map objects (trees, rocks, decorations)
  if (manifest.map_objects) {
    if (manifest.map_objects.pending && manifest.map_objects.pending.length > 0) {
      const item = manifest.map_objects.pending[0];
      return {
        type: 'map_object',
        localId: item.id,
        description: item.desc,
        category: 'map_objects',
        extra: { width: item.width || 48, height: item.height || 48 },
      };
    }
  }

  // 6. Items (inventory icons)
  if (manifest.items) {
    for (const [category, data] of Object.entries(manifest.items) as [string, any][]) {
      if (data.pending && data.pending.length > 0) {
        const item = data.pending[0];
        return {
          type: 'item',
          localId: item.id,
          description: item.desc,
          category: `items.${category}`,
          extra: { width: 32, height: 32 },
        };
      }
    }
  }

  // 7. Plants (would need multiple stages - complex, skip for now)
  // TODO: Each plant needs 8 growth stages generated

  return null;
}

function markJobQueued(manifest: any, localId: string, category: string): void {
  // category is like "humanoids.humans" or "animals.livestock" or "map_objects"
  const parts = category.split('.');

  if (parts.length === 2) {
    const [section, subsection] = parts;
    const data = manifest[section]?.[subsection];
    if (data?.pending) {
      const idx = data.pending.findIndex((item: any) => item.id === localId);
      if (idx >= 0) {
        data.pending.splice(idx, 1);
      }
    }
  } else if (parts.length === 1) {
    // Direct section like "map_objects"
    const data = manifest[parts[0]];
    if (data?.pending) {
      const idx = data.pending.findIndex((item: any) => item.id === localId);
      if (idx >= 0) {
        data.pending.splice(idx, 1);
      }
    }
  }
}

function markJobCompleted(manifest: any, localId: string, category: string): void {
  // category is like "humanoids.humans" or "animals.livestock" or "map_objects"
  const parts = category.split('.');

  if (parts.length === 2) {
    const [section, subsection] = parts;
    const data = manifest[section]?.[subsection];
    if (data) {
      if (!data.completed) {
        data.completed = [];
      }
      if (!data.completed.includes(localId)) {
        data.completed.push(localId);
      }
    }
  } else if (parts.length === 1) {
    // Direct section like "map_objects"
    const data = manifest[parts[0]];
    if (data) {
      if (!data.completed) {
        data.completed = [];
      }
      if (!data.completed.includes(localId)) {
        data.completed.push(localId);
      }
    }
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ Main Loop ============

async function runDaemon(): Promise<void> {
  if (!API_KEY) {
    console.error('Error: PIXELLAB_API_KEY not set.');
    console.log('Set it with: export PIXELLAB_API_KEY="your-key"');
    console.log('Or add to .env file in custom_game_engine/');
    process.exit(1);
  }

  log('=== PixelLab Daemon Started ===');
  log(`Max concurrent jobs: ${MAX_CONCURRENT_JOBS}`);
  log(`Check interval: ${CHECK_INTERVAL_MS / 1000}s`);
  log('Press Ctrl+C to stop\n');

  const state = loadState();
  state.startedAt = new Date().toISOString();

  while (true) {
    try {
      const manifest = loadManifest();

      // 1. Check status of active jobs
      const stillActive: JobInfo[] = [];

      for (const job of state.activeJobs) {
        log(`Checking ${job.type}: ${job.localId}`);

        try {
          // Get status based on asset type
          let statusResult: { status: string; data?: any };
          switch (job.type) {
            case 'character':
            case 'animal':
              statusResult = await getCharacterStatus(job.pixelLabId);
              break;
            case 'tileset':
              statusResult = await getTilesetStatus(job.pixelLabId);
              break;
            case 'isometric_tile':
              statusResult = await getIsometricTileStatus(job.pixelLabId);
              break;
            case 'map_object':
            case 'item':
              statusResult = await getMapObjectStatus(job.pixelLabId);
              break;
            default:
              statusResult = { status: 'unknown' };
          }

          const { status, data } = statusResult;

          if (status === 'completed') {
            log(`  ✓ Completed! Downloading...`);

            // Download based on asset type
            let success = false;
            switch (job.type) {
              case 'character':
                success = await downloadCharacter(job, data);
                break;
              case 'animal':
                success = await downloadAnimal(job, data);
                break;
              case 'tileset':
                success = await downloadTileset(job, data);
                break;
              case 'isometric_tile':
                success = await downloadIsometricTile(job, data);
                break;
              case 'map_object':
                success = await downloadMapObject(job, data);
                break;
              case 'item':
                success = await downloadItem(job, data);
                break;
            }

            if (success) {
              markJobCompleted(manifest, job.localId, job.category);
              state.totalDownloaded++;
              log(`  ✓ Downloaded: ${job.localId}`);
            }
          } else if (status === 'failed' || status === 'not_found') {
            log(`  ✗ ${status} - removing from queue`);
          } else {
            log(`  ⏳ Still processing...`);
            stillActive.push(job);
          }
        } catch (err: any) {
          log(`  Error checking: ${err.message}`);
          stillActive.push(job); // Keep in queue to retry
        }

        await sleep(1000); // Small delay between checks
      }

      state.activeJobs = stillActive;

      // 2. Fill queue if there's space
      while (state.activeJobs.length < MAX_CONCURRENT_JOBS) {
        const nextJob = getNextPendingJob(manifest);
        if (!nextJob) {
          log('No more pending jobs in manifest.');
          break;
        }

        log(`Queuing ${nextJob.type}: ${nextJob.localId}`);
        log(`  ${nextJob.description}`);

        try {
          let pixelLabId: string;

          // Create job based on asset type
          switch (nextJob.type) {
            case 'character': {
              const props = nextJob.extra?.proportions;
              pixelLabId = await createCharacter(nextJob.description, nextJob.localId, props);
              break;
            }
            case 'animal':
              pixelLabId = await createAnimal(nextJob.description, nextJob.localId);
              break;
            case 'tileset': {
              const extra = nextJob.extra as any;
              pixelLabId = await createTileset(extra.lower, extra.upper, extra.transition);
              break;
            }
            case 'isometric_tile':
              pixelLabId = await createIsometricTile(nextJob.description);
              break;
            case 'map_object': {
              const extra = nextJob.extra as any;
              pixelLabId = await createMapObject(nextJob.description, extra?.width || 48, extra?.height || 48);
              break;
            }
            case 'item': {
              const extra = nextJob.extra as any;
              pixelLabId = await createMapObject(nextJob.description, extra?.width || 32, extra?.height || 32);
              break;
            }
            default:
              throw new Error(`Unknown job type: ${nextJob.type}`);
          }

          log(`  ✓ Queued: ${pixelLabId}`);

          state.activeJobs.push({
            pixelLabId,
            localId: nextJob.localId,
            type: nextJob.type,
            category: nextJob.category,
            queuedAt: new Date().toISOString(),
            description: nextJob.description,
          });

          markJobQueued(manifest, nextJob.localId, nextJob.category);
          state.totalGenerated++;

          saveManifest(manifest);
          await sleep(DELAY_AFTER_QUEUE_MS);
        } catch (err: any) {
          log(`  ✗ Error: ${err.message}`);
          if (err.message.includes('rate') || err.message.includes('limit') || err.message.includes('429')) {
            log('  Rate limited - waiting for next cycle');
            break;
          }
        }
      }

      // 3. Save state and show summary
      saveState(state);

      log(`\n--- Status: ${state.activeJobs.length}/${MAX_CONCURRENT_JOBS} active | ${state.totalGenerated} queued | ${state.totalDownloaded} downloaded ---`);

      // Count remaining across all sections
      let remaining = 0;

      // Helper to count pending in nested sections
      const countPending = (section: any) => {
        if (!section) return 0;
        let count = 0;
        if (section.pending) {
          count += section.pending.length;
        }
        for (const value of Object.values(section)) {
          if (value && typeof value === 'object' && (value as any).pending) {
            count += (value as any).pending.length;
          }
        }
        return count;
      };

      remaining += countPending(manifest.humanoids);
      remaining += countPending(manifest.animals);
      remaining += countPending(manifest.building_tiles);
      remaining += countPending(manifest.tilesets);
      remaining += countPending(manifest.map_objects);
      remaining += countPending(manifest.items);
      remaining += countPending(manifest.plants);

      log(`--- Remaining in manifest: ${remaining} ---\n`);

      if (remaining === 0 && state.activeJobs.length === 0) {
        log('=== All jobs complete! Daemon finished. ===');
        break;
      }

      // 4. Wait before next check
      log(`Sleeping ${CHECK_INTERVAL_MS / 1000}s until next check...`);
      await sleep(CHECK_INTERVAL_MS);

    } catch (err: any) {
      log(`Error in main loop: ${err.message}`);
      await sleep(CHECK_INTERVAL_MS);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('\nShutting down...');
  const state = loadState();
  saveState(state);
  log('State saved. Goodbye!');
  process.exit(0);
});

runDaemon().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
