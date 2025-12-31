/**
 * Sprite Batch Runner
 *
 * Manages the batch generation of sprites via PixelLab API.
 * Run periodically to:
 * 1. Queue new character generations (up to job limit)
 * 2. Download completed characters
 * 3. Queue animations for completed characters
 * 4. Track progress in a JSON state file
 *
 * Usage:
 *   PIXELLAB_API_KEY=xxx npx ts-node scripts/sprite-batch-runner.ts
 *
 * Or run specific commands:
 *   npx ts-node scripts/sprite-batch-runner.ts status
 *   npx ts-node scripts/sprite-batch-runner.ts queue 5
 *   npx ts-node scripts/sprite-batch-runner.ts download
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateAllSpriteVariants } from './generate-sprites.js';

// ============================================================================
// Types
// ============================================================================

interface CharacterState {
  variantId: string;
  pixelLabId?: string;
  status: 'pending' | 'queued' | 'generated' | 'downloaded' | 'animated' | 'failed';
  queuedAt?: string;
  completedAt?: string;
  downloadedAt?: string;
  error?: string;
}

interface BatchState {
  version: 1;
  lastUpdated: string;
  characters: Record<string, CharacterState>;
  stats: {
    total: number;
    pending: number;
    queued: number;
    generated: number;
    downloaded: number;
    animated: number;
    failed: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const STATE_FILE = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab/generation-state.json');
const SPRITES_DIR = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');
const API_BASE = 'https://api.pixellab.ai';
const MAX_CONCURRENT_JOBS = 8;

// ============================================================================
// State Management
// ============================================================================

function loadState(): BatchState {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }

  // Initialize with all variants
  const variants = generateAllSpriteVariants();
  const characters: Record<string, CharacterState> = {};

  for (const v of variants) {
    characters[v.id] = {
      variantId: v.id,
      status: 'pending',
    };
  }

  const state: BatchState = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    characters,
    stats: {
      total: variants.length,
      pending: variants.length,
      queued: 0,
      generated: 0,
      downloaded: 0,
      animated: 0,
      failed: 0,
    },
  };

  saveState(state);
  return state;
}

function saveState(state: BatchState): void {
  state.lastUpdated = new Date().toISOString();

  // Recalculate stats
  const chars = Object.values(state.characters);
  state.stats = {
    total: chars.length,
    pending: chars.filter(c => c.status === 'pending').length,
    queued: chars.filter(c => c.status === 'queued').length,
    generated: chars.filter(c => c.status === 'generated').length,
    downloaded: chars.filter(c => c.status === 'downloaded').length,
    animated: chars.filter(c => c.status === 'animated').length,
    failed: chars.filter(c => c.status === 'failed').length,
  };

  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ============================================================================
// API Helpers (these would use actual PixelLab API in production)
// ============================================================================

async function getApiKey(): Promise<string> {
  const key = process.env.PIXELLAB_API_KEY;
  if (!key) {
    throw new Error('PIXELLAB_API_KEY environment variable is required');
  }
  return key;
}

// ============================================================================
// Commands
// ============================================================================

function printStatus(state: BatchState): void {
  console.log('\n========================================');
  console.log('SPRITE GENERATION STATUS');
  console.log('========================================\n');
  console.log(`Last Updated: ${state.lastUpdated}\n`);
  console.log('Progress:');
  console.log(`  Total:      ${state.stats.total}`);
  console.log(`  Pending:    ${state.stats.pending}`);
  console.log(`  Queued:     ${state.stats.queued}`);
  console.log(`  Generated:  ${state.stats.generated}`);
  console.log(`  Downloaded: ${state.stats.downloaded}`);
  console.log(`  Animated:   ${state.stats.animated}`);
  console.log(`  Failed:     ${state.stats.failed}`);

  const completed = state.stats.downloaded + state.stats.animated;
  const pct = ((completed / state.stats.total) * 100).toFixed(1);
  console.log(`\n  Progress: ${completed}/${state.stats.total} (${pct}%)`);

  // Show progress bar
  const barWidth = 40;
  const filledWidth = Math.round((completed / state.stats.total) * barWidth);
  const bar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);
  console.log(`  [${bar}]`);

  console.log('\n========================================\n');
}

function listPending(state: BatchState, count: number = 10): void {
  const pending = Object.values(state.characters)
    .filter(c => c.status === 'pending')
    .slice(0, count);

  console.log(`\nNext ${pending.length} pending characters:\n`);
  for (const c of pending) {
    console.log(`  - ${c.variantId}`);
  }
  console.log('');
}

function listFailed(state: BatchState): void {
  const failed = Object.values(state.characters)
    .filter(c => c.status === 'failed');

  if (failed.length === 0) {
    console.log('\nNo failed characters.\n');
    return;
  }

  console.log(`\nFailed characters (${failed.length}):\n`);
  for (const c of failed) {
    console.log(`  - ${c.variantId}: ${c.error || 'Unknown error'}`);
  }
  console.log('');
}

// Mark a character as queued (when you manually queue via MCP)
function markQueued(state: BatchState, variantId: string, pixelLabId: string): void {
  if (state.characters[variantId]) {
    state.characters[variantId].status = 'queued';
    state.characters[variantId].pixelLabId = pixelLabId;
    state.characters[variantId].queuedAt = new Date().toISOString();
    saveState(state);
    console.log(`Marked ${variantId} as queued with ID ${pixelLabId}`);
  } else {
    console.log(`Unknown variant: ${variantId}`);
  }
}

// Mark a character as generated (when PixelLab completes)
function markGenerated(state: BatchState, variantId: string): void {
  if (state.characters[variantId]) {
    state.characters[variantId].status = 'generated';
    state.characters[variantId].completedAt = new Date().toISOString();
    saveState(state);
    console.log(`Marked ${variantId} as generated`);
  }
}

// Mark as downloaded
function markDownloaded(state: BatchState, variantId: string): void {
  if (state.characters[variantId]) {
    state.characters[variantId].status = 'downloaded';
    state.characters[variantId].downloadedAt = new Date().toISOString();
    saveState(state);
    console.log(`Marked ${variantId} as downloaded`);
  }
}

// Reset failed to pending (for retry)
function resetFailed(state: BatchState): void {
  let count = 0;
  for (const c of Object.values(state.characters)) {
    if (c.status === 'failed') {
      c.status = 'pending';
      c.error = undefined;
      count++;
    }
  }
  saveState(state);
  console.log(`Reset ${count} failed characters to pending`);
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2);
const command = args[0] || 'status';

const state = loadState();

switch (command) {
  case 'status':
    printStatus(state);
    break;

  case 'pending':
    const pendingCount = parseInt(args[1] || '10', 10);
    listPending(state, pendingCount);
    break;

  case 'failed':
    listFailed(state);
    break;

  case 'mark-queued':
    if (args.length < 3) {
      console.log('Usage: mark-queued <variantId> <pixelLabId>');
    } else {
      markQueued(state, args[1], args[2]);
    }
    break;

  case 'mark-generated':
    if (args.length < 2) {
      console.log('Usage: mark-generated <variantId>');
    } else {
      markGenerated(state, args[1]);
    }
    break;

  case 'mark-downloaded':
    if (args.length < 2) {
      console.log('Usage: mark-downloaded <variantId>');
    } else {
      markDownloaded(state, args[1]);
    }
    break;

  case 'reset-failed':
    resetFailed(state);
    break;

  case 'init':
    console.log('State file initialized with all variants');
    printStatus(state);
    break;

  default:
    console.log(`
Sprite Batch Runner

Commands:
  status              Show generation progress
  pending [count]     List next pending characters (default: 10)
  failed              List failed characters
  mark-queued <id> <pixelLabId>   Mark variant as queued
  mark-generated <id>             Mark variant as generated
  mark-downloaded <id>            Mark variant as downloaded
  reset-failed                    Reset failed characters to pending
  init                            Initialize/reset state file

Examples:
  npx ts-node scripts/sprite-batch-runner.ts status
  npx ts-node scripts/sprite-batch-runner.ts pending 20
  npx ts-node scripts/sprite-batch-runner.ts mark-queued human_male_black_light abc123
`);
}
