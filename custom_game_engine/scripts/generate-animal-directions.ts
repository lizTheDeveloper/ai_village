#!/usr/bin/env npx ts-node
/**
 * Generate 8-directional sprites for animals
 * Creates north, northeast, east, southeast, south, southwest, west, northwest views
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const SPRITES_DIR = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');
const DELAY_MS = 5000;

const ANIMALS = [
  { id: 'chicken', name: 'chicken', size: 48 },
  { id: 'cow', name: 'cow', size: 64 },
  { id: 'sheep', name: 'sheep', size: 48 },
  { id: 'horse', name: 'horse', size: 64 },
  { id: 'dog', name: 'dog', size: 48 },
  { id: 'cat', name: 'cat', size: 48 },
  { id: 'rabbit', name: 'rabbit', size: 48 },
  { id: 'deer', name: 'deer', size: 48 },
  { id: 'pig', name: 'pig', size: 48 },
  { id: 'goat', name: 'goat', size: 48 },
];

const DIRECTIONS = [
  { name: 'south', description: 'facing south, viewed from above' },
  { name: 'southwest', description: 'facing southwest, viewed from above at 45 degree angle' },
  { name: 'west', description: 'facing west, side profile view from above' },
  { name: 'northwest', description: 'facing northwest, viewed from above at 45 degree angle' },
  { name: 'north', description: 'facing north, viewed from above showing back' },
  { name: 'northeast', description: 'facing northeast, viewed from above at 45 degree angle' },
  { name: 'east', description: 'facing east, side profile view from above' },
  { name: 'southeast', description: 'facing southeast, viewed from above at 45 degree angle' },
];

async function apiRequest(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}

async function generateDirectionalSprite(
  animal: typeof ANIMALS[0],
  direction: typeof DIRECTIONS[0]
): Promise<void> {
  const description = `Realistic ${animal.name} as a quadruped animal on all four legs, ${direction.description}, natural animal pose, pixel art, top-down perspective`;

  console.log(`  [${direction.name}] ${description.substring(0, 80)}...`);

  const response = await apiRequest('/generate-image-pixflux', 'POST', {
    description,
    image_size: { height: animal.size, width: animal.size },
    no_background: true,
  });

  if (!response.image || !response.image.base64) {
    throw new Error('No image in API response');
  }

  const animalDir = path.join(SPRITES_DIR, animal.id);
  fs.mkdirSync(animalDir, { recursive: true });

  const imageBuffer = Buffer.from(response.image.base64, 'base64');
  fs.writeFileSync(path.join(animalDir, `${direction.name}.png`), imageBuffer);
  console.log(`    ✓ Saved ${direction.name}.png`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error('PIXELLAB_API_KEY not set');
    process.exit(1);
  }

  console.log('🚀 Generating 8-directional animal sprites\n');
  console.log(`Animals: ${ANIMALS.length}`);
  console.log(`Directions per animal: ${DIRECTIONS.length}`);
  console.log(`Total sprites to generate: ${ANIMALS.length * DIRECTIONS.length}\n`);

  let completed = 0;
  const total = ANIMALS.length * DIRECTIONS.length;

  for (const animal of ANIMALS) {
    console.log(`\n[${animal.name.toUpperCase()}] (${animal.size}x${animal.size})`);

    for (let i = 0; i < DIRECTIONS.length; i++) {
      const direction = DIRECTIONS[i];

      try {
        await generateDirectionalSprite(animal, direction);
        completed++;
        console.log(`    Progress: ${completed}/${total}`);

        if (i < DIRECTIONS.length - 1 || animal !== ANIMALS[ANIMALS.length - 1]) {
          console.log(`    Waiting ${DELAY_MS / 1000}s...`);
          await sleep(DELAY_MS);
        }
      } catch (err: any) {
        console.error(`    ✗ Failed: ${err.message}`);
      }
    }

    // Save metadata
    const animalDir = path.join(SPRITES_DIR, animal.id);
    fs.writeFileSync(
      path.join(animalDir, 'directions-metadata.json'),
      JSON.stringify({
        id: animal.id,
        name: animal.name,
        size: animal.size,
        directions: DIRECTIONS.map(d => d.name),
        generated_at: new Date().toISOString(),
      }, null, 2)
    );
  }

  console.log(`\n✅ Complete! Generated ${completed}/${total} directional sprites`);
}

main().catch(console.error);
