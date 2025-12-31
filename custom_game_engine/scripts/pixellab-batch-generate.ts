#!/usr/bin/env npx ts-node
/**
 * PixelLab Batch Generator
 *
 * Slowly drip-generates assets from the manifest file, respecting rate limits.
 * Run this script periodically to gradually build up your asset library.
 *
 * Usage:
 *   npx ts-node scripts/pixellab-batch-generate.ts [command] [options]
 *
 * Commands:
 *   status     - Show generation progress
 *   generate   - Generate next batch of assets (default: 1 at a time)
 *   download   - Download all completed assets
 *   check      - Check status of pending jobs
 *
 * Options:
 *   --count N  - Number of items to generate (default: 1)
 *   --type T   - Asset type: character, tileset, isometric, object (default: any)
 *
 * Examples:
 *   npx ts-node scripts/pixellab-batch-generate.ts status
 *   npx ts-node scripts/pixellab-batch-generate.ts generate --count 2
 *   npx ts-node scripts/pixellab-batch-generate.ts generate --type tileset
 *   npx ts-node scripts/pixellab-batch-generate.ts download
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MANIFEST_PATH = path.join(__dirname, 'pixellab-batch-manifest.json');
const STATE_PATH = path.join(__dirname, 'pixellab-batch-state.json');
const ASSETS_PATH = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');

interface PendingCharacter {
  id: string;
  desc: string;
  proportions?: string;
}

interface PendingTileset {
  id: string;
  lower: string;
  upper: string;
  transition?: string;
}

interface PendingIsometric {
  id: string;
  desc: string;
}

interface PendingObject {
  id: string;
  desc: string;
  width: number;
  height: number;
}

interface GenerationState {
  version: number;
  lastRun: string;
  pendingJobs: {
    characterIds: Record<string, string>; // localId -> pixellabId
    tilesetIds: Record<string, string>;
    isometricIds: Record<string, string>;
    objectIds: Record<string, string>;
  };
  completedToday: number;
  dailyLimit: number;
}

function loadManifest(): any {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
}

function loadState(): GenerationState {
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
    version: 1,
    lastRun: new Date().toISOString(),
    pendingJobs: {
      characterIds: {},
      tilesetIds: {},
      isometricIds: {},
      objectIds: {},
    },
    completedToday: 0,
    dailyLimit: 50, // Conservative default
  };
}

function saveState(state: GenerationState): void {
  state.lastRun = new Date().toISOString();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function countPending(manifest: any): { characters: number; tilesets: number; isometric: number; objects: number } {
  let characters = 0;
  let tilesets = 0;
  let isometric = 0;
  let objects = 0;

  // Count characters
  for (const species of Object.values(manifest.characters) as any[]) {
    characters += species.pending?.length || 0;
  }

  // Count tilesets
  for (const category of Object.values(manifest.tilesets) as any[]) {
    tilesets += category.pending?.length || 0;
  }

  // Count isometric
  isometric = manifest.isometric_tiles?.pending?.length || 0;

  // Count objects
  objects = manifest.map_objects?.pending?.length || 0;

  return { characters, tilesets, isometric, objects };
}

function countCompleted(manifest: any): { characters: number; tilesets: number; isometric: number; objects: number } {
  let characters = 0;
  let tilesets = 0;
  let isometric = 0;
  let objects = 0;

  // Count characters
  for (const species of Object.values(manifest.characters) as any[]) {
    characters += species.completed?.length || 0;
  }

  // Count tilesets
  for (const category of Object.values(manifest.tilesets) as any[]) {
    tilesets += category.completed?.length || 0;
  }

  // Count isometric
  isometric = manifest.isometric_tiles?.completed?.length || 0;

  // Count objects
  objects = manifest.map_objects?.completed?.length || 0;

  return { characters, tilesets, isometric, objects };
}

function showStatus(): void {
  const manifest = loadManifest();
  const state = loadState();
  const pending = countPending(manifest);
  const completed = countCompleted(manifest);

  console.log('\n=== PixelLab Batch Generation Status ===\n');

  console.log('Completed Assets:');
  console.log(`  Characters: ${completed.characters}`);
  console.log(`  Tilesets:   ${completed.tilesets}`);
  console.log(`  Isometric:  ${completed.isometric}`);
  console.log(`  Objects:    ${completed.objects}`);
  console.log(`  TOTAL:      ${completed.characters + completed.tilesets + completed.isometric + completed.objects}`);

  console.log('\nPending Assets:');
  console.log(`  Characters: ${pending.characters}`);
  console.log(`  Tilesets:   ${pending.tilesets}`);
  console.log(`  Isometric:  ${pending.isometric}`);
  console.log(`  Objects:    ${pending.objects}`);
  console.log(`  TOTAL:      ${pending.characters + pending.tilesets + pending.isometric + pending.objects}`);

  const pendingJobCount =
    Object.keys(state.pendingJobs.characterIds).length +
    Object.keys(state.pendingJobs.tilesetIds).length +
    Object.keys(state.pendingJobs.isometricIds).length +
    Object.keys(state.pendingJobs.objectIds).length;

  console.log('\nActive Jobs:');
  console.log(`  In Queue:       ${pendingJobCount}`);
  console.log(`  Generated Today: ${state.completedToday}`);
  console.log(`  Last Run:       ${state.lastRun || 'Never'}`);

  // Show pending job details
  if (pendingJobCount > 0) {
    console.log('\nPending Job IDs:');
    for (const [localId, pixelId] of Object.entries(state.pendingJobs.characterIds)) {
      console.log(`  Character: ${localId} -> ${pixelId}`);
    }
    for (const [localId, pixelId] of Object.entries(state.pendingJobs.tilesetIds)) {
      console.log(`  Tileset: ${localId} -> ${pixelId}`);
    }
  }

  console.log('\n--- Run with "generate" to create more assets ---\n');
}

function getNextPendingCharacter(manifest: any): { species: string; character: PendingCharacter } | null {
  for (const [species, data] of Object.entries(manifest.characters) as [string, any][]) {
    if (data.pending && data.pending.length > 0) {
      return { species, character: data.pending[0] };
    }
  }
  return null;
}

function getNextPendingTileset(manifest: any): { category: string; tileset: PendingTileset } | null {
  for (const [category, data] of Object.entries(manifest.tilesets) as [string, any][]) {
    if (data.pending && data.pending.length > 0) {
      return { category, tileset: data.pending[0] };
    }
  }
  return null;
}

function getNextPendingIsometric(manifest: any): PendingIsometric | null {
  const pending = manifest.isometric_tiles?.pending;
  return pending && pending.length > 0 ? pending[0] : null;
}

function getNextPendingObject(manifest: any): PendingObject | null {
  const pending = manifest.map_objects?.pending;
  return pending && pending.length > 0 ? pending[0] : null;
}

function markCharacterQueued(manifest: any, species: string, characterId: string): void {
  const speciesData = manifest.characters[species];
  if (!speciesData) return;

  const idx = speciesData.pending.findIndex((c: PendingCharacter) => c.id === characterId);
  if (idx >= 0) {
    const [removed] = speciesData.pending.splice(idx, 1);
    // Don't add to completed yet - that happens after download
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function markTilesetQueued(manifest: any, category: string, tilesetId: string): void {
  const categoryData = manifest.tilesets[category];
  if (!categoryData) return;

  const idx = categoryData.pending.findIndex((t: PendingTileset) => t.id === tilesetId);
  if (idx >= 0) {
    categoryData.pending.splice(idx, 1);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

async function generateAssets(count: number, typeFilter?: string): Promise<void> {
  const manifest = loadManifest();
  const state = loadState();

  console.log(`\nGenerating up to ${count} assets...`);
  console.log('(This script outputs MCP commands - run them in Claude Code)\n');

  let generated = 0;

  while (generated < count) {
    // Determine what to generate next
    let assetType: string | null = null;

    if (!typeFilter || typeFilter === 'character') {
      const nextChar = getNextPendingCharacter(manifest);
      if (nextChar) {
        assetType = 'character';
        console.log(`\n--- Character ${generated + 1}: ${nextChar.character.id} ---`);
        console.log(`Species: ${nextChar.species}`);
        console.log(`Description: ${nextChar.character.desc}`);
        console.log(`\nMCP Command:`);
        console.log(`mcp__pixellab__create_character(`);
        console.log(`  description="${nextChar.character.desc}",`);
        console.log(`  name="${nextChar.character.id}",`);
        console.log(`  size=48,`);
        console.log(`  n_directions=8,`);
        console.log(`  view="high top-down",`);
        console.log(`  detail="medium detail",`);
        console.log(`  outline="single color black outline",`);
        console.log(`  shading="basic shading"`);
        console.log(`)`);

        // Mark as queued (will be moved to completed after download)
        markCharacterQueued(manifest, nextChar.species, nextChar.character.id);
        generated++;
        continue;
      }
    }

    if (!typeFilter || typeFilter === 'tileset') {
      const nextTileset = getNextPendingTileset(manifest);
      if (nextTileset) {
        assetType = 'tileset';
        console.log(`\n--- Tileset ${generated + 1}: ${nextTileset.tileset.id} ---`);
        console.log(`Category: ${nextTileset.category}`);
        console.log(`Lower: ${nextTileset.tileset.lower}`);
        console.log(`Upper: ${nextTileset.tileset.upper}`);
        console.log(`Transition: ${nextTileset.tileset.transition || 'auto'}`);
        console.log(`\nMCP Command:`);
        console.log(`mcp__pixellab__create_topdown_tileset(`);
        console.log(`  lower_description="${nextTileset.tileset.lower}",`);
        console.log(`  upper_description="${nextTileset.tileset.upper}",`);
        if (nextTileset.tileset.transition) {
          console.log(`  transition_description="${nextTileset.tileset.transition}",`);
          console.log(`  transition_size=0.5,`);
        }
        console.log(`  tile_size={"width": 32, "height": 32},`);
        console.log(`  view="high top-down"`);
        console.log(`)`);

        markTilesetQueued(manifest, nextTileset.category, nextTileset.tileset.id);
        generated++;
        continue;
      }
    }

    if (!typeFilter || typeFilter === 'isometric') {
      const nextIso = getNextPendingIsometric(manifest);
      if (nextIso) {
        console.log(`\n--- Isometric Tile ${generated + 1}: ${nextIso.id} ---`);
        console.log(`Description: ${nextIso.desc}`);
        console.log(`\nMCP Command:`);
        console.log(`mcp__pixellab__create_isometric_tile(`);
        console.log(`  description="${nextIso.desc}",`);
        console.log(`  size=32`);
        console.log(`)`);
        generated++;
        continue;
      }
    }

    if (!typeFilter || typeFilter === 'object') {
      const nextObj = getNextPendingObject(manifest);
      if (nextObj) {
        console.log(`\n--- Map Object ${generated + 1}: ${nextObj.id} ---`);
        console.log(`Description: ${nextObj.desc}`);
        console.log(`Size: ${nextObj.width}x${nextObj.height}`);
        console.log(`\nMCP Command:`);
        console.log(`mcp__pixellab__create_map_object(`);
        console.log(`  description="${nextObj.desc}",`);
        console.log(`  width=${nextObj.width},`);
        console.log(`  height=${nextObj.height},`);
        console.log(`  view="high top-down"`);
        console.log(`)`);
        generated++;
        continue;
      }
    }

    // Nothing left to generate
    console.log('\nNo more pending assets of the requested type!');
    break;
  }

  state.completedToday += generated;
  saveState(state);

  console.log(`\n=== Generated ${generated} asset requests ===`);
  console.log('Copy the MCP commands above and run them in Claude Code.');
  console.log('After they complete, run "download" to save the assets.\n');
}

// Parse command line arguments
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

// Execute command
switch (command) {
  case 'status':
    showStatus();
    break;
  case 'generate':
    generateAssets(count, typeFilter);
    break;
  case 'download':
    console.log('\nTo download completed assets, use Claude Code to:');
    console.log('1. Run mcp__pixellab__list_characters() to see completed characters');
    console.log('2. For each, run mcp__pixellab__get_character(id) to get download URLs');
    console.log('3. Use curl to download the rotation images\n');
    break;
  case 'check':
    console.log('\nTo check job status, run in Claude Code:');
    console.log('  mcp__pixellab__list_characters()');
    console.log('  mcp__pixellab__list_topdown_tilesets()');
    console.log('  mcp__pixellab__list_isometric_tiles()\n');
    break;
  default:
    console.log(`Unknown command: ${command}`);
    console.log('Valid commands: status, generate, download, check');
}
