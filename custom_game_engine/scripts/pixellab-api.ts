#!/usr/bin/env npx ts-node
/**
 * PixelLab API Batch Generator
 *
 * Directly calls the PixelLab API to generate assets over time.
 * Respects rate limits by processing one job at a time with delays.
 *
 * Setup:
 *   export PIXELLAB_API_KEY="your-api-key"
 *   # Or create .env file with PIXELLAB_API_KEY=...
 *
 * Usage:
 *   npx ts-node scripts/pixellab-api.ts status
 *   npx ts-node scripts/pixellab-api.ts generate [--count N] [--type character|tileset]
 *   npx ts-node scripts/pixellab-api.ts download
 *   npx ts-node scripts/pixellab-api.ts check
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
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }
}

const API_KEY = process.env.PIXELLAB_API_KEY;
const API_BASE = 'https://api.pixellab.ai/v1';
const MANIFEST_PATH = path.join(__dirname, 'pixellab-batch-manifest.json');
const STATE_PATH = path.join(__dirname, 'pixellab-api-state.json');
const ASSETS_PATH = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');

// Rate limiting
const DELAY_BETWEEN_JOBS_MS = 5000; // 5 seconds between job submissions
const DELAY_BETWEEN_CHECKS_MS = 30000; // 30 seconds between status checks

interface ApiState {
  pendingCharacters: Record<string, { pixelLabId: string; name: string; queuedAt: string }>;
  pendingTilesets: Record<string, { pixelLabId: string; name: string; queuedAt: string }>;
  completedToday: number;
  lastRun: string;
}

function loadState(): ApiState {
  if (fs.existsSync(STATE_PATH)) {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    // Reset daily counter if new day
    const today = new Date().toISOString().split('T')[0];
    const lastRunDay = state.lastRun?.split('T')[0];
    if (today !== lastRunDay) {
      state.completedToday = 0;
    }
    return state;
  }
  return {
    pendingCharacters: {},
    pendingTilesets: {},
    completedToday: 0,
    lastRun: new Date().toISOString(),
  };
}

function saveState(state: ApiState): void {
  state.lastRun = new Date().toISOString();
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
    throw new Error('PIXELLAB_API_KEY not set. Export it or add to .env file.');
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
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function createCharacter(description: string, name: string): Promise<string> {
  const result = await apiRequest('/characters', 'POST', {
    description,
    name,
    size: 48,
    n_directions: 8,
    view: 'high top-down',
    detail: 'medium detail',
    outline: 'single color black outline',
    shading: 'basic shading',
  });

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

async function getCharacter(id: string): Promise<any> {
  return apiRequest(`/characters/${id}`);
}

async function getTileset(id: string): Promise<any> {
  return apiRequest(`/tilesets/topdown/${id}`);
}

async function listCharacters(): Promise<any[]> {
  const result = await apiRequest('/characters?limit=50');
  return result.characters || result;
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ Commands ============

async function showStatus(): Promise<void> {
  const manifest = loadManifest();
  const state = loadState();

  console.log('\n=== PixelLab API Batch Status ===\n');

  // Count from manifest
  let pendingChars = 0, completedChars = 0;
  let pendingTilesets = 0, completedTilesets = 0;

  // Support both old 'characters' and new 'humanoids' structure
  const charSection = manifest.humanoids || manifest.characters || {};
  for (const species of Object.values(charSection) as any[]) {
    pendingChars += species.pending?.length || 0;
    completedChars += species.completed?.length || 0;
  }

  for (const category of Object.values(manifest.tilesets) as any[]) {
    pendingTilesets += category.pending?.length || 0;
    completedTilesets += category.completed?.length || 0;
  }

  console.log('Manifest:');
  console.log(`  Characters: ${completedChars} done, ${pendingChars} pending`);
  console.log(`  Tilesets:   ${completedTilesets} done, ${pendingTilesets} pending`);

  console.log('\nActive Jobs (queued via API):');
  console.log(`  Characters: ${Object.keys(state.pendingCharacters).length}`);
  console.log(`  Tilesets:   ${Object.keys(state.pendingTilesets).length}`);

  if (Object.keys(state.pendingCharacters).length > 0) {
    console.log('\n  Pending Characters:');
    for (const [localId, info] of Object.entries(state.pendingCharacters)) {
      console.log(`    - ${localId}: ${info.pixelLabId}`);
    }
  }

  console.log(`\nLast Run: ${state.lastRun || 'Never'}`);
  console.log('\n--- Commands: generate, download, check ---\n');
}

async function generateAssets(count: number, typeFilter?: string): Promise<void> {
  if (!API_KEY) {
    console.error('Error: PIXELLAB_API_KEY not set.');
    console.log('Export it: export PIXELLAB_API_KEY="your-key"');
    console.log('Or add to .env file in custom_game_engine/');
    return;
  }

  const manifest = loadManifest();
  const state = loadState();
  let generated = 0;

  console.log(`\nGenerating up to ${count} assets...\n`);

  while (generated < count) {
    // Try characters first
    if (!typeFilter || typeFilter === 'character') {
      const charSection = manifest.humanoids || manifest.characters || {};
      for (const [species, data] of Object.entries(charSection) as [string, any][]) {
        if (data.pending && data.pending.length > 0 && generated < count) {
          const char = data.pending[0];
          console.log(`Creating character: ${char.id}`);
          console.log(`  Description: ${char.desc}`);

          try {
            const pixelLabId = await createCharacter(char.desc, char.id);
            console.log(`  ✓ Queued as: ${pixelLabId}`);

            // Track in state
            state.pendingCharacters[char.id] = {
              pixelLabId,
              name: char.id,
              queuedAt: new Date().toISOString(),
            };

            // Remove from pending
            data.pending.shift();
            generated++;
            state.completedToday++;

            saveState(state);
            saveManifest(manifest);

            if (generated < count) {
              console.log(`  Waiting ${DELAY_BETWEEN_JOBS_MS / 1000}s before next job...`);
              await sleep(DELAY_BETWEEN_JOBS_MS);
            }
          } catch (err: any) {
            console.log(`  ✗ Error: ${err.message}`);
            if (err.message.includes('rate') || err.message.includes('limit')) {
              console.log('  Rate limited. Stopping.');
              return;
            }
          }
          break; // Only do one per species per loop
        }
      }
    }

    // Try tilesets
    if ((!typeFilter || typeFilter === 'tileset') && generated < count) {
      for (const [category, data] of Object.entries(manifest.tilesets) as [string, any][]) {
        if (data.pending && data.pending.length > 0 && generated < count) {
          const tileset = data.pending[0];
          console.log(`Creating tileset: ${tileset.id}`);
          console.log(`  ${tileset.lower} → ${tileset.upper}`);

          try {
            const pixelLabId = await createTileset(
              tileset.lower,
              tileset.upper,
              tileset.transition
            );
            console.log(`  ✓ Queued as: ${pixelLabId}`);

            // Track in state
            state.pendingTilesets[tileset.id] = {
              pixelLabId,
              name: tileset.id,
              queuedAt: new Date().toISOString(),
            };

            // Remove from pending
            data.pending.shift();
            generated++;
            state.completedToday++;

            saveState(state);
            saveManifest(manifest);

            if (generated < count) {
              console.log(`  Waiting ${DELAY_BETWEEN_JOBS_MS / 1000}s before next job...`);
              await sleep(DELAY_BETWEEN_JOBS_MS);
            }
          } catch (err: any) {
            console.log(`  ✗ Error: ${err.message}`);
            if (err.message.includes('rate') || err.message.includes('limit')) {
              console.log('  Rate limited. Stopping.');
              return;
            }
          }
          break;
        }
      }
    }

    // Check if anything was generated this iteration
    if (generated === 0) {
      console.log('No more pending assets to generate.');
      break;
    }
  }

  console.log(`\n=== Generated ${generated} assets ===\n`);
}

async function checkAndDownload(): Promise<void> {
  if (!API_KEY) {
    console.error('Error: PIXELLAB_API_KEY not set.');
    return;
  }

  const manifest = loadManifest();
  const state = loadState();

  console.log('\nChecking pending jobs and downloading completed assets...\n');

  // Check characters
  for (const [localId, info] of Object.entries(state.pendingCharacters)) {
    console.log(`Checking character: ${localId} (${info.pixelLabId})`);

    try {
      const char = await getCharacter(info.pixelLabId);

      if (char.status === 'completed' || char.rotations) {
        console.log(`  ✓ Completed! Downloading...`);

        // Create directory
        const charDir = path.join(ASSETS_PATH, localId);
        const rotationsDir = path.join(charDir, 'rotations');
        fs.mkdirSync(rotationsDir, { recursive: true });

        // Download rotations
        const directions = ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'];
        for (const dir of directions) {
          const url = char.rotations?.[dir] || char.frames?.rotations?.[dir];
          if (url) {
            const destFile = path.join(rotationsDir, `${dir}.png`);
            try {
              await downloadFile(url, destFile);
              console.log(`    Downloaded ${dir}.png`);
            } catch {
              console.log(`    Failed to download ${dir}.png`);
            }
          }
        }

        // Create metadata
        const metadata = {
          id: localId,
          name: info.name,
          pixellab_id: info.pixelLabId,
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

        // Move to completed in manifest
        const speciesMatch = localId.match(/^([a-z]+)_/);
        if (speciesMatch) {
          const speciesKey = speciesMatch[1] + 's'; // human -> humans
          const charSection = manifest.humanoids || manifest.characters || {};
          const speciesData = charSection[speciesKey];
          if (speciesData && !speciesData.completed.includes(localId)) {
            speciesData.completed.push(localId);
          }
        }

        // Remove from pending
        delete state.pendingCharacters[localId];
        console.log(`  ✓ Saved to ${charDir}`);
      } else if (char.status === 'processing' || char.pending_jobs) {
        console.log(`  ⏳ Still processing...`);
      } else if (char.status === 'failed') {
        console.log(`  ✗ Failed. Removing from queue.`);
        delete state.pendingCharacters[localId];
      }
    } catch (err: any) {
      console.log(`  ✗ Error: ${err.message}`);
    }

    await sleep(1000); // Small delay between checks
  }

  // Check tilesets
  for (const [localId, info] of Object.entries(state.pendingTilesets)) {
    console.log(`Checking tileset: ${localId} (${info.pixelLabId})`);

    try {
      const tileset = await getTileset(info.pixelLabId);

      if (tileset.status === 'completed' || tileset.download_url) {
        console.log(`  ✓ Completed! Downloading...`);

        // Create directory
        const tilesetDir = path.join(ASSETS_PATH, '../tilesets', localId);
        fs.mkdirSync(tilesetDir, { recursive: true });

        // Download tileset image
        if (tileset.image_url || tileset.download_url) {
          const imgUrl = tileset.image_url || tileset.download_url;
          await downloadFile(imgUrl, path.join(tilesetDir, 'tileset.png'));
          console.log(`    Downloaded tileset.png`);
        }

        // Save metadata
        fs.writeFileSync(
          path.join(tilesetDir, 'metadata.json'),
          JSON.stringify(tileset, null, 2)
        );

        // Remove from pending
        delete state.pendingTilesets[localId];
        console.log(`  ✓ Saved to ${tilesetDir}`);
      } else if (tileset.status === 'processing') {
        console.log(`  ⏳ Still processing...`);
      } else if (tileset.status === 'failed') {
        console.log(`  ✗ Failed. Removing from queue.`);
        delete state.pendingTilesets[localId];
      }
    } catch (err: any) {
      console.log(`  ✗ Error: ${err.message}`);
    }

    await sleep(1000);
  }

  saveState(state);
  saveManifest(manifest);

  console.log('\nDone checking.\n');
}

// ============ Main ============

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  let count = 1;
  let typeFilter: string | undefined;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--type' && args[i + 1]) {
      typeFilter = args[i + 1];
      i++;
    }
  }

  switch (command) {
    case 'status':
      await showStatus();
      break;
    case 'generate':
      await generateAssets(count, typeFilter);
      break;
    case 'download':
    case 'check':
      await checkAndDownload();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Commands: status, generate, download, check');
  }
}

main().catch(console.error);
