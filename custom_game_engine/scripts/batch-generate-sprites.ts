#!/usr/bin/env npx ts-node
/**
 * Automated PixelLab Sprite Batch Generator
 *
 * Reads the manifest from auto-queue-sprites.ts and automatically:
 * 1. Generates sprites via the PixelLab API (synchronous)
 * 2. Saves sprites immediately
 * 3. Respects rate limits (5 second delay between jobs)
 *
 * Usage:
 *   export PIXELLAB_API_KEY="your-key-here"
 *   npx ts-node scripts/batch-generate-sprites.ts
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
const MANIFEST_PATH = path.join(__dirname, 'sprite-queue-manifest.json');
const STATE_PATH = path.join(__dirname, 'batch-sprite-state.json');
const SPRITES_DIR = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');

// Rate limiting
const DELAY_BETWEEN_JOBS_MS = 5000; // 5 seconds between submissions

interface SpriteQueueItem {
  id: string;
  type: 'character' | 'map_object';
  description: string;
  size: number;
  category: string;
}

interface SimpleState {
  completed: string[];
  failed: string[];
  lastUpdate: string;
}

function loadManifest(): SpriteQueueItem[] {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`Manifest not found at ${MANIFEST_PATH}`);
    console.log('Run: npx ts-node scripts/auto-queue-sprites.ts first');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
}

function loadState(): SimpleState {
  if (fs.existsSync(STATE_PATH)) {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  }
  return {
    completed: [],
    failed: [],
    lastUpdate: new Date().toISOString(),
  };
}

function saveState(state: SimpleState): void {
  state.lastUpdate = new Date().toISOString();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
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

async function generateAndSaveSprite(item: SpriteQueueItem): Promise<void> {
  console.log(`\n[${item.category}] ${item.id}`);
  console.log(`  Description: ${item.description}`);
  console.log(`  Size: ${item.size}x${item.size}`);

  // Call API (synchronous - returns image immediately)
  const response = await apiRequest('/generate-image-pixflux', 'POST', {
    description: item.description,
    image_size: {
      height: item.size,
      width: item.size,
    },
    no_background: true,
  });

  if (!response.image || !response.image.base64) {
    throw new Error('No image in API response');
  }

  // Create directory
  const spriteDir = path.join(SPRITES_DIR, item.id);
  fs.mkdirSync(spriteDir, { recursive: true });

  // Save image from base64
  const imageBuffer = Buffer.from(response.image.base64, 'base64');
  fs.writeFileSync(path.join(spriteDir, 'sprite.png'), imageBuffer);
  console.log(`  ✓ Saved sprite.png`);

  // Save metadata
  fs.writeFileSync(
    path.join(spriteDir, 'metadata.json'),
    JSON.stringify({
      id: item.id,
      category: item.category,
      type: item.type,
      size: item.size,
      description: item.description,
      generated_at: new Date().toISOString(),
      usage_usd: response.usage?.usd || 0,
    }, null, 2)
  );

  console.log(`  ✓ Saved to ${spriteDir}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBatch(): Promise<void> {
  console.log('\n🚀 Starting Automated Sprite Generation\n');

  const manifest = loadManifest();
  const state = loadState();

  // Filter to remaining items
  const remaining = manifest.filter(item =>
    !state.completed.includes(item.id) &&
    !state.failed.includes(item.id)
  );

  if (remaining.length === 0) {
    console.log('✅ All sprites already generated!');
    console.log(`Total: ${state.completed.length} completed, ${state.failed.length} failed`);
    return;
  }

  console.log('=== Status ===');
  console.log(`Total in manifest: ${manifest.length}`);
  console.log(`Completed: ${state.completed.length}`);
  console.log(`Failed: ${state.failed.length}`);
  console.log(`Remaining: ${remaining.length}\n`);

  // Process each sprite
  for (let i = 0; i < remaining.length; i++) {
    const item = remaining[i];

    try {
      await generateAndSaveSprite(item);
      state.completed.push(item.id);
      saveState(state);

      // Rate limiting (except for last item)
      if (i < remaining.length - 1) {
        console.log(`  Waiting ${DELAY_BETWEEN_JOBS_MS / 1000}s...`);
        await sleep(DELAY_BETWEEN_JOBS_MS);
      }
    } catch (err: any) {
      console.log(`  ✗ Failed: ${err.message}`);
      state.failed.push(item.id);
      saveState(state);

      // Continue with rate limiting
      if (i < remaining.length - 1) {
        console.log(`  Waiting ${DELAY_BETWEEN_JOBS_MS / 1000}s...`);
        await sleep(DELAY_BETWEEN_JOBS_MS);
      }
    }
  }

  console.log('\n✅ Batch complete!');
  console.log(`Completed: ${state.completed.length}`);
  console.log(`Failed: ${state.failed.length}`);
}

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error('\n❌ Error: PIXELLAB_API_KEY not set');
    console.log('\nSet your API key:');
    console.log('  export PIXELLAB_API_KEY="your-key-here"');
    console.log('Or add to .env file in custom_game_engine/\n');
    process.exit(1);
  }

  await runBatch();
}

main().catch(console.error);
