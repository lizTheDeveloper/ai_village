#!/usr/bin/env npx ts-node
/**
 * Automatic Sprite Queue Generator
 *
 * Scans all game data files (animals, plants, items, etc.) and automatically
 * queues PixelLab sprite generation for anything that doesn't have sprites yet.
 *
 * Usage:
 *   npx ts-node scripts/auto-queue-sprites.ts [--dry-run] [--type animals|plants|items|all]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPRITES_DIR = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');
const WORLD_DATA_DIR = path.join(__dirname, '../packages/world/src');

interface SpriteQueueItem {
  id: string;
  type: 'character' | 'map_object';
  description: string;
  size: number;
  category: string;
}

// Check if a sprite already exists for this ID
function hasSprite(id: string): boolean {
  const spritePath = path.join(SPRITES_DIR, id);
  return fs.existsSync(spritePath) && fs.existsSync(path.join(spritePath, 'metadata.json'));
}

// Scan plant species files
async function scanPlants(): Promise<SpriteQueueItem[]> {
  const queue: SpriteQueueItem[] = [];
  const plantFiles = [
    'plant-species/wild-plants.ts',
    'plant-species/medicinal-plants.ts',
    'plant-species/magical-plants.ts',
    'plant-species/mountain-plants.ts',
    'plant-species/wetland-plants.ts',
    'plant-species/tropical-plants.ts'
  ];

  for (const file of plantFiles) {
    const filePath = path.join(WORLD_DATA_DIR, file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract plant IDs from "id: 'plant_name'" pattern
    const idMatches = content.matchAll(/id:\s*['"]([^'"]+)['"]/g);
    const nameMatches = content.matchAll(/name:\s*['"]([^'"]+)['"]/g);

    const ids = Array.from(idMatches).map(m => m[1]);
    const names = Array.from(nameMatches).map(m => m[1]);

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const name = names[i] || id;

      if (!hasSprite(id)) {
        queue.push({
          id,
          type: 'map_object',
          description: `${name} plant, pixel art, top-down view`,
          size: 32,
          category: 'plants'
        });
      }
    }
  }

  return queue;
}

// Scan animal species files
async function scanAnimals(): Promise<SpriteQueueItem[]> {
  const queue: SpriteQueueItem[] = [];
  const animalFile = path.join(WORLD_DATA_DIR, 'species/animalSpecies.ts');

  if (!fs.existsSync(animalFile)) {
    console.warn('Animal species file not found:', animalFile);
    return queue;
  }

  const content = fs.readFileSync(animalFile, 'utf-8');

  // Extract animal definitions
  const speciesMatches = content.matchAll(/export const (\w+):\s*AnimalSpecies\s*=\s*{[^}]*id:\s*['"]([^'"]+)['"][^}]*name:\s*['"]([^'"]+)['"]/gs);

  for (const match of speciesMatches) {
    const [, , id, name] = match;

    if (!hasSprite(id)) {
      queue.push({
        id,
        type: 'character',
        description: `${name}, natural animal pose, top-down view, pixel art`,
        size: id.includes('cow') || id.includes('horse') ? 64 : 48,
        category: 'animals'
      });
    }
  }

  return queue;
}

// Scan humanoid species
async function scanHumanoids(): Promise<SpriteQueueItem[]> {
  const queue: SpriteQueueItem[] = [];
  const speciesFile = path.join(WORLD_DATA_DIR, 'species/SpeciesRegistry.ts');

  if (!fs.existsSync(speciesFile)) {
    console.warn('Species registry file not found:', speciesFile);
    return queue;
  }

  const content = fs.readFileSync(speciesFile, 'utf-8');

  // Extract species IDs
  const speciesMatches = content.matchAll(/id:\s*['"]([^'"]+)['"][^}]*name:\s*['"]([^'"]+)['"]/gs);

  for (const match of speciesMatches) {
    const [, id, name] = match;

    // Check if any variant exists
    const hasAnyVariant = fs.readdirSync(SPRITES_DIR).some(dir => dir.startsWith(id + '_'));

    if (!hasAnyVariant) {
      queue.push({
        id: `${id}_default`,
        type: 'character',
        description: `${name} humanoid character, simple clothing, pixel art`,
        size: 48,
        category: 'humanoids'
      });
    }
  }

  return queue;
}

// Generate MCP command for queueing
function generateMCPCommand(item: SpriteQueueItem): string {
  if (item.type === 'character') {
    return `mcp__pixellab__create_character(
  description="${item.description}",
  name="${item.id}",
  size=${item.size},
  n_directions=8,
  view="high top-down",
  detail="medium detail",
  outline="single color black outline",
  shading="basic shading"
)`;
  } else {
    return `mcp__pixellab__create_map_object(
  description="${item.description}",
  width=${item.size},
  height=${item.size},
  view="high top-down",
  detail="medium detail",
  outline="single color outline",
  shading="medium shading"
)`;
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const typeFilter = args.find(arg => arg.startsWith('--type='))?.split('=')[1] || 'all';

  console.log('🔍 Scanning game data files for missing sprites...\n');

  let allQueue: SpriteQueueItem[] = [];

  if (typeFilter === 'all' || typeFilter === 'plants') {
    const plants = await scanPlants();
    allQueue.push(...plants);
    console.log(`📦 Found ${plants.length} plants needing sprites`);
  }

  if (typeFilter === 'all' || typeFilter === 'animals') {
    const animals = await scanAnimals();
    allQueue.push(...animals);
    console.log(`📦 Found ${animals.length} animals needing sprites`);
  }

  if (typeFilter === 'all' || typeFilter === 'humanoids') {
    const humanoids = await scanHumanoids();
    allQueue.push(...humanoids);
    console.log(`📦 Found ${humanoids.length} humanoids needing sprites`);
  }

  console.log(`\n📊 Total: ${allQueue.length} sprites to generate\n`);

  if (allQueue.length === 0) {
    console.log('✅ All sprites up to date!');
    return;
  }

  // Group by category
  const byCategory = allQueue.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SpriteQueueItem[]>);

  // Display queue
  for (const [category, items] of Object.entries(byCategory)) {
    console.log(`\n## ${category.toUpperCase()} (${items.length})`);
    for (const item of items.slice(0, 5)) {
      console.log(`  - ${item.id}`);
    }
    if (items.length > 5) {
      console.log(`  ... and ${items.length - 5} more`);
    }
  }

  if (dryRun) {
    console.log('\n🏃 Dry run - no sprites queued');
    console.log('Run without --dry-run to queue sprites');
  } else {
    console.log('\n📋 MCP Commands to queue (copy to Claude Code):');
    console.log('=' .repeat(60));
    for (const item of allQueue.slice(0, 10)) {
      console.log(generateMCPCommand(item));
      console.log('');
    }
    if (allQueue.length > 10) {
      console.log(`... and ${allQueue.length - 10} more items`);
    }
  }

  // Save manifest
  const manifestPath = path.join(__dirname, 'sprite-queue-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(allQueue, null, 2));
  console.log(`\n💾 Saved full queue to: ${manifestPath}`);
}

main().catch(console.error);
