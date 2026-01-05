#!/usr/bin/env npx ts-node
/**
 * PixelLab Background Daemon
 *
 * Runs continuously, generating sprites on-demand as agents are born.
 * Uses synchronous PixelLab API (/generate-image-pixflux) to generate
 * and save sprites immediately with rate limiting.
 *
 * Setup:
 *   export PIXELLAB_API_KEY="your-api-key"
 *
 * Usage:
 *   npx ts-node scripts/pixellab-daemon.ts
 *   # Or run in background:
 *   nohup npx ts-node scripts/pixellab-daemon.ts > pixellab-daemon.log 2>&1 &
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
const QUEUE_PATH = path.join(__dirname, '../sprite-generation-queue.json');
const STATE_PATH = path.join(__dirname, 'pixellab-daemon-state.json');
const ASSETS_PATH = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');

// Configuration
const CHECK_INTERVAL_MS = 60000; // Check for new jobs every 60 seconds when idle
const DELAY_AFTER_QUEUE_MS = 5000; // Wait 5 seconds between generations (rate limiting)

type AssetType = 'character' | 'animal' | 'tileset' | 'isometric_tile' | 'map_object' | 'item';

interface DaemonState {
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

function loadQueue(): any[] {
  if (!fs.existsSync(QUEUE_PATH)) {
    return [];
  }
  try {
    const content = fs.readFileSync(QUEUE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    log(`Error loading queue: ${err}`);
    return [];
  }
}

function saveQueue(queue: any[]): void {
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
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

// Synchronous image generation - returns base64 image immediately
async function generateSprite(description: string, size: number = 48): Promise<string> {
  const result = await apiRequest('/generate-image-pixflux', 'POST', {
    description,
    image_size: {
      height: size,
      width: size,
    },
    no_background: true,
  });

  if (!result.image || !result.image.base64) {
    throw new Error('No image in API response');
  }

  return result.image.base64;
}

// Save sprite from base64 data
async function saveSprite(localId: string, category: string, base64Data: string, description: string, size: number): Promise<boolean> {
  try {
    const spriteDir = path.join(ASSETS_PATH, localId);
    fs.mkdirSync(spriteDir, { recursive: true });

    // Save image from base64
    const imageBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(path.join(spriteDir, 'sprite.png'), imageBuffer);

    // Save metadata
    fs.writeFileSync(
      path.join(spriteDir, 'metadata.json'),
      JSON.stringify({
        id: localId,
        category: category,
        size: size,
        description: description,
        generated_at: new Date().toISOString(),
      }, null, 2)
    );

    return true;
  } catch (err) {
    log(`  Error saving sprite: ${err}`);
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
  log(`Rate limit delay: ${DELAY_AFTER_QUEUE_MS / 1000}s between generations`);
  log(`Idle check interval: ${CHECK_INTERVAL_MS / 1000}s`);
  log('Press Ctrl+C to stop\n');

  const state = loadState();
  state.startedAt = new Date().toISOString();

  while (true) {
    try {
      // Check on-demand queue first (higher priority)
      const queue = loadQueue();
      const queueJob = queue.find((job: any) => job.status === 'queued');

      if (queueJob) {
        // Process on-demand sprite generation request
        log(`\n[Queue] Generating: ${queueJob.folderId}`);
        log(`  ${queueJob.description}`);

        try {
          // Determine size from traits or default to 48
          const size = queueJob.traits?.size || 48;

          // Generate sprite synchronously
          const base64Data = await generateSprite(queueJob.description, size);
          log(`  ✓ Generated sprite`);

          // Save to animals category (or determine from traits)
          const category = queueJob.traits?.category || 'animals';
          const success = await saveSprite(
            queueJob.folderId,
            category,
            base64Data,
            queueJob.description,
            size
          );

          if (success) {
            // Mark as complete and remove from queue
            queueJob.status = 'complete';
            queueJob.completedAt = Date.now();
            const updatedQueue = queue.filter((j: any) => j.folderId !== queueJob.folderId);
            saveQueue(updatedQueue);

            state.totalGenerated++;
            state.totalDownloaded++;
            saveState(state);

            log(`  ✓ Saved: ${queueJob.folderId}`);
            log(`  ✓ Removed from queue (${updatedQueue.length} remaining)`);
          } else {
            // Mark as failed
            queueJob.status = 'failed';
            saveQueue(queue);
          }

          // Rate limiting
          log(`  Waiting ${DELAY_AFTER_QUEUE_MS / 1000}s...`);
          await sleep(DELAY_AFTER_QUEUE_MS);
          continue;

        } catch (err: any) {
          log(`  ✗ Error: ${err.message}`);
          queueJob.status = 'failed';
          saveQueue(queue);

          if (err.message.includes('rate') || err.message.includes('limit') || err.message.includes('429')) {
            log('  Rate limited - waiting longer before retry');
            await sleep(CHECK_INTERVAL_MS);
          }
          continue;
        }
      }

      // No queue jobs - check manifest
      const manifest = loadManifest();

      // Get next pending job
      const nextJob = getNextPendingJob(manifest);
      if (!nextJob) {
        log('No more pending jobs in manifest or queue. Waiting for new entries...');
        await sleep(CHECK_INTERVAL_MS);
        continue;
      }

      log(`\nGenerating ${nextJob.type}: ${nextJob.localId}`);
      log(`  ${nextJob.description}`);

      try {
        // Determine size based on asset type
        let size = 48;
        if (nextJob.type === 'animal') size = 32;
        if (nextJob.extra?.width) size = nextJob.extra.width;

        // Generate sprite synchronously
        const base64Data = await generateSprite(nextJob.description, size);
        log(`  ✓ Generated sprite`);

        // Save immediately
        const success = await saveSprite(nextJob.localId, nextJob.category, base64Data, nextJob.description, size);

        if (success) {
          markJobQueued(manifest, nextJob.localId, nextJob.category);
          markJobCompleted(manifest, nextJob.localId, nextJob.category);
          saveManifest(manifest);

          state.totalGenerated++;
          state.totalDownloaded++;
          saveState(state);

          log(`  ✓ Saved: ${nextJob.localId}`);
        }

        // Rate limiting
        log(`  Waiting ${DELAY_AFTER_QUEUE_MS / 1000}s...`);
        await sleep(DELAY_AFTER_QUEUE_MS);

      } catch (err: any) {
        log(`  ✗ Error: ${err.message}`);
        if (err.message.includes('rate') || err.message.includes('limit') || err.message.includes('429')) {
          log('  Rate limited - waiting longer before retry');
          await sleep(CHECK_INTERVAL_MS);
        } else {
          // Mark as queued (remove from pending) to avoid infinite retries
          markJobQueued(manifest, nextJob.localId, nextJob.category);
          saveManifest(manifest);
        }
      }

      // Count remaining
      const countPending = (section: any) => {
        if (!section) return 0;
        let count = 0;
        if (section.pending) count += section.pending.length;
        for (const value of Object.values(section)) {
          if (value && typeof value === 'object' && (value as any).pending) {
            count += (value as any).pending.length;
          }
        }
        return count;
      };

      const remaining =
        countPending(manifest.humanoids) +
        countPending(manifest.animals) +
        countPending(manifest.building_tiles) +
        countPending(manifest.tilesets) +
        countPending(manifest.map_objects) +
        countPending(manifest.items);

      log(`--- Progress: ${state.totalGenerated} generated | ${remaining} remaining ---\n`);

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
