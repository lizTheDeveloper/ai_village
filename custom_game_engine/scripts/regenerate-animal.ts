#!/usr/bin/env npx ts-node
/**
 * Regenerate Animal Sprite
 * Regenerates all 8 directions for a specific animal using PixFlux API
 *
 * Usage: npx ts-node scripts/regenerate-animal.ts <animal_id> [description]
 * Example: npx ts-node scripts/regenerate-animal.ts horse_brown "brown horse"
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
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
const SPRITES_DIR = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');
const DELAY_MS = 5000;

const DIRECTIONS = [
  { name: 'south', description: 'facing toward the camera, front view from above' },
  { name: 'southwest', description: 'facing southwest, angled front-left view from above' },
  { name: 'west', description: 'facing left, side profile view from above' },
  { name: 'northwest', description: 'facing northwest, angled back-left view from above' },
  { name: 'north', description: 'facing away from camera, rear view from above' },
  { name: 'northeast', description: 'facing northeast, angled back-right view from above' },
  { name: 'east', description: 'facing right, side profile view from above' },
  { name: 'southeast', description: 'facing southeast, angled front-right view from above' },
];

// Size mapping
const SIZE_MAP: Record<string, number> = {
  chicken: 48,
  cow: 64,
  sheep: 48,
  horse: 64,
  dog: 48,
  cat: 48,
  rabbit: 48,
  deer: 48,
  pig: 48,
  goat: 48,
};

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateDirection(
  animalId: string,
  description: string,
  direction: typeof DIRECTIONS[0],
  size: number
): Promise<void> {
  // Create description with direction
  const fullDescription = `${description} as a quadruped animal on all four legs, ${direction.description}, natural animal pose, pixel art style, top-down perspective, transparent background`;

  console.log(`  [${direction.name}] Generating...`);

  const response = await apiRequest('/generate-image-pixflux', 'POST', {
    description: fullDescription,
    image_size: { height: size, width: size },
    no_background: true,
  });

  if (!response.image || !response.image.base64) {
    throw new Error('No image in API response');
  }

  const animalDir = path.join(SPRITES_DIR, animalId);
  fs.mkdirSync(animalDir, { recursive: true });

  const imageBuffer = Buffer.from(response.image.base64, 'base64');
  fs.writeFileSync(path.join(animalDir, `${direction.name}.png`), imageBuffer);

  console.log(`  [${direction.name}] ✓ Saved`);
}

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error('Error: PIXELLAB_API_KEY not set');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: npx ts-node scripts/regenerate-animal.ts <animal_id> [description]');
    console.log('Example: npx ts-node scripts/regenerate-animal.ts horse_brown "brown horse"');
    process.exit(1);
  }

  const animalId = args[0];

  // Extract base species from ID (e.g., "horse_brown" -> "horse")
  const baseSpecies = animalId.split('_')[0];
  const size = SIZE_MAP[baseSpecies] || 48;

  // Use provided description or generate from ID
  const description = args[1] || animalId.replace(/_/g, ' ');

  console.log(`\n🐴 Regenerating: ${animalId}`);
  console.log(`   Description: ${description}`);
  console.log(`   Size: ${size}x${size}`);
  console.log(`   Directions: ${DIRECTIONS.length}\n`);

  // Backup existing sprites if they exist
  const animalDir = path.join(SPRITES_DIR, animalId);
  const backupDir = path.join(SPRITES_DIR, `${animalId}_backup_${Date.now()}`);

  if (fs.existsSync(animalDir)) {
    console.log(`   Backing up existing sprites to ${animalId}_backup_*\n`);
    fs.renameSync(animalDir, backupDir);
  }

  // Generate all 8 directions
  for (let i = 0; i < DIRECTIONS.length; i++) {
    const direction = DIRECTIONS[i];

    try {
      await generateDirection(animalId, description, direction, size);

      // Rate limiting between requests
      if (i < DIRECTIONS.length - 1) {
        console.log(`   Waiting ${DELAY_MS / 1000}s...`);
        await sleep(DELAY_MS);
      }
    } catch (err: any) {
      console.error(`  [${direction.name}] ✗ Failed: ${err.message}`);
    }
  }

  // Save metadata
  const metadata = {
    id: animalId,
    base_species: baseSpecies,
    description: description,
    size: size,
    directions: DIRECTIONS.map(d => d.name),
    regenerated_at: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(animalDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log(`\n✅ Complete! Regenerated ${animalId}`);
  console.log(`   Location: ${animalDir}`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
