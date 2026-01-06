#!/usr/bin/env npx ts-node
/**
 * Regenerate white sheep sprite with 8 directional views
 * Uses PixFlux API (for animals, not character API)
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
if (!API_KEY) {
  console.error('Error: PIXELLAB_API_KEY not found in .env');
  process.exit(1);
}

const API_BASE = 'https://api.pixellab.ai/v1';
const SPRITES_DIR = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');
const DELAY_MS = 5000;

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

async function apiRequest(endpoint: string, body: any): Promise<any> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateSheepWhite() {
  console.log('🐑 Regenerating white sheep sprite (8 directions)...\n');

  const variantId = 'sheep_white';
  const description = 'white woolly sheep';
  const size = 48;

  const spriteDir = path.join(SPRITES_DIR, variantId);
  fs.mkdirSync(spriteDir, { recursive: true });

  console.log(`Variant: ${variantId}`);
  console.log(`Description: ${description}`);
  console.log(`Size: ${size}×${size}px`);
  console.log(`Directions: ${DIRECTIONS.length}\n`);

  // Generate each direction
  for (let i = 0; i < DIRECTIONS.length; i++) {
    const direction = DIRECTIONS[i];
    console.log(`[${i + 1}/${DIRECTIONS.length}] Generating ${direction.name}...`);

    const fullDescription = `${description}, ${direction.description}, pixel art style, high top-down view, cute and simple, clear details`;

    const params = {
      description: fullDescription,
      image_size: { width: size, height: size },
      view: 'high top-down',
      detail: 'medium detail',
      outline: 'single color black outline',
      shading: 'basic shading',
    };

    try {
      const result = await apiRequest('/generate-image-pixflux', params);

      if (!result.image || !result.image.base64) {
        throw new Error('No image in API response');
      }

      // Save PNG
      const imageBuffer = Buffer.from(result.image.base64, 'base64');
      const imagePath = path.join(spriteDir, `${direction.name}.png`);
      fs.writeFileSync(imagePath, imageBuffer);
      console.log(`  ✓ Saved ${direction.name}.png`);

      // Rate limit delay (except on last iteration)
      if (i < DIRECTIONS.length - 1) {
        console.log(`  Waiting ${DELAY_MS / 1000}s (rate limit)...\n`);
        await sleep(DELAY_MS);
      }
    } catch (error) {
      console.error(`  ✗ Error generating ${direction.name}:`, error);
      throw error;
    }
  }

  // Save metadata
  const metadata = {
    id: variantId,
    base_species: 'sheep',
    variant: 'white',
    description: description,
    size: size,
    directions: DIRECTIONS.map(d => d.name),
    generated_at: new Date().toISOString(),
  };

  const metadataPath = path.join(spriteDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`\n✓ Saved metadata.json`);

  console.log(`\n✨ White sheep sprite complete!`);
  console.log(`   Output: ${spriteDir}`);
  console.log(`   Files: 8 directional PNGs + metadata.json`);
}

// Run
generateSheepWhite().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
