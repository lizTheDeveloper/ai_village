#!/usr/bin/env npx ts-node
/**
 * Automated PixelLab Sprite Batch Generator
 *
 * Reads the manifest from auto-queue-sprites.ts and automatically:
 * 1. Queues all sprites via the PixelLab API
 * 2. Respects rate limits (5 second delay between jobs)
 * 3. Polls for completion
 * 4. Downloads and saves completed sprites
 *
 * Usage:
 *   export PIXELLAB_API_KEY="your-key-here"
 *   npx ts-node scripts/batch-generate-sprites.ts [--batch-size N]
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
const POLL_INTERVAL_MS = 30000; // 30 seconds between status checks

interface SpriteQueueItem {
  id: string;
  type: 'character' | 'map_object';
  description: string;
  size: number;
  category: string;
}

interface JobState {
  pending: Record<string, { jobId: string; item: SpriteQueueItem; queuedAt: string }>;
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

function loadState(): JobState {
  if (fs.existsSync(STATE_PATH)) {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  }
  return {
    pending: {},
    completed: [],
    failed: [],
    lastUpdate: new Date().toISOString(),
  };
}

function saveState(state: JobState): void {
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

async function queueSprite(item: SpriteQueueItem): Promise<string> {
  const response = await apiRequest('/generate-image-pixflux', 'POST', {
    description: item.description,
    image_size: {
      height: item.size,
      width: item.size,
    },
    no_background: true,
  });

  return response.job_id || response.id;
}

async function checkJobStatus(jobId: string): Promise<any> {
  return await apiRequest(`/jobs/${jobId}`);
}

async function downloadImage(url: string, destPath: string): Promise<void> {
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

async function queueBatch(manifest: SpriteQueueItem[], state: JobState, batchSize: number): Promise<void> {
  console.log('\n=== Queueing Sprites ===\n');

  const toQueue = manifest.filter(item =>
    !state.completed.includes(item.id) &&
    !state.failed.includes(item.id) &&
    !state.pending[item.id]
  );

  const batch = toQueue.slice(0, batchSize);

  if (batch.length === 0) {
    console.log('No sprites to queue. All done or in progress.');
    return;
  }

  console.log(`Queueing ${batch.length} sprites...`);

  for (const item of batch) {
    try {
      console.log(`\n[${item.category}] ${item.id}`);
      console.log(`  Description: ${item.description}`);

      const jobId = await queueSprite(item);

      state.pending[item.id] = {
        jobId,
        item,
        queuedAt: new Date().toISOString(),
      };

      console.log(`  ✓ Queued: ${jobId}`);
      saveState(state);

      // Rate limiting
      if (batch.indexOf(item) < batch.length - 1) {
        console.log(`  Waiting ${DELAY_BETWEEN_JOBS_MS / 1000}s...`);
        await sleep(DELAY_BETWEEN_JOBS_MS);
      }
    } catch (err: any) {
      console.log(`  ✗ Failed: ${err.message}`);
      state.failed.push(item.id);
      saveState(state);
    }
  }

  console.log(`\n✓ Queued ${batch.length} sprites`);
}

async function pollAndDownload(state: JobState): Promise<void> {
  console.log('\n=== Checking Pending Jobs ===\n');

  const pendingIds = Object.keys(state.pending);

  if (pendingIds.length === 0) {
    console.log('No pending jobs.');
    return;
  }

  console.log(`Checking ${pendingIds.length} pending jobs...`);

  for (const spriteId of pendingIds) {
    const { jobId, item } = state.pending[spriteId];

    try {
      console.log(`\n[${item.category}] ${spriteId}`);

      const job = await checkJobStatus(jobId);

      if (job.status === 'completed' || job.image_url) {
        console.log(`  ✓ Completed! Downloading...`);

        // Create directory
        const spriteDir = path.join(SPRITES_DIR, spriteId);
        fs.mkdirSync(spriteDir, { recursive: true });

        // Download image
        const imageUrl = job.image_url || job.result?.image_url;
        if (imageUrl) {
          await downloadImage(imageUrl, path.join(spriteDir, 'sprite.png'));
          console.log(`    Downloaded sprite.png`);
        }

        // Save metadata
        fs.writeFileSync(
          path.join(spriteDir, 'metadata.json'),
          JSON.stringify({
            id: spriteId,
            category: item.category,
            type: item.type,
            size: item.size,
            description: item.description,
            pixellab_job_id: jobId,
            generated_at: new Date().toISOString(),
          }, null, 2)
        );

        // Move to completed
        delete state.pending[spriteId];
        state.completed.push(spriteId);
        console.log(`  ✓ Saved to ${spriteDir}`);

      } else if (job.status === 'processing' || job.status === 'queued') {
        console.log(`  ⏳ Status: ${job.status}`);
      } else if (job.status === 'failed') {
        console.log(`  ✗ Failed`);
        delete state.pending[spriteId];
        state.failed.push(spriteId);
      } else {
        console.log(`  ? Unknown status: ${job.status}`);
      }

      saveState(state);
      await sleep(1000); // Small delay between checks
    } catch (err: any) {
      console.log(`  ✗ Error checking: ${err.message}`);
    }
  }
}

async function runContinuous(batchSize: number): Promise<void> {
  console.log('\n🚀 Starting Automated Sprite Generation');
  console.log('Press Ctrl+C to stop\n');

  while (true) {
    const manifest = loadManifest();
    const state = loadState();

    // Show status
    console.log('\n=== Status ===');
    console.log(`Total in manifest: ${manifest.length}`);
    console.log(`Completed: ${state.completed.length}`);
    console.log(`Pending: ${Object.keys(state.pending).length}`);
    console.log(`Failed: ${state.failed.length}`);
    console.log(`Remaining: ${manifest.length - state.completed.length - state.failed.length - Object.keys(state.pending).length}`);

    // Queue new batch if needed
    if (Object.keys(state.pending).length < batchSize) {
      await queueBatch(manifest, state, batchSize - Object.keys(state.pending).length);
    }

    // Check and download
    await pollAndDownload(state);

    // Check if done
    const remaining = manifest.length - state.completed.length - state.failed.length;
    if (remaining === 0 && Object.keys(state.pending).length === 0) {
      console.log('\n✅ All sprites generated!');
      console.log(`Completed: ${state.completed.length}`);
      console.log(`Failed: ${state.failed.length}`);
      break;
    }

    // Wait before next poll
    console.log(`\n⏳ Waiting ${POLL_INTERVAL_MS / 1000}s before next check...`);
    await sleep(POLL_INTERVAL_MS);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let batchSize = 5; // Default: 5 concurrent jobs

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch-size' && args[i + 1]) {
      batchSize = parseInt(args[i + 1], 10);
      i++;
    }
  }

  if (!API_KEY) {
    console.error('\n❌ Error: PIXELLAB_API_KEY not set');
    console.log('\nSet your API key:');
    console.log('  export PIXELLAB_API_KEY="your-key-here"');
    console.log('Or add to .env file in custom_game_engine/\n');
    process.exit(1);
  }

  await runContinuous(batchSize);
}

main().catch(console.error);
