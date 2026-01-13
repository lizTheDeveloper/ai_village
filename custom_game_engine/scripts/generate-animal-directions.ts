#!/usr/bin/env npx ts-node
/**
 * Generate 8-directional sprites for animals
 * Proper workflow:
 * 1. Generate south (base view)
 * 2. Generate east (using south as reference)
 * 3. West = horizontal flip of east
 * 4. Generate other directions using south/east as references
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

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

// Parse command line arguments
// Usage: npx ts-node generate-animal-directions.ts [variant_id] [description]
// Example: npx ts-node generate-animal-directions.ts sheep_white "white woolly sheep"
const args = process.argv.slice(2);
const variantId = args[0] || 'sheep_white';
const description = args[1] || 'white woolly sheep';

const ANIMALS = [
  { id: variantId, name: description, size: 64 }, // Animals always 64x64
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

async function flipImageHorizontal(inputPath: string, outputPath: string): Promise<void> {
  const img = await loadImage(inputPath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');

  // Flip horizontally
  ctx.translate(img.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

async function generateWithReference(
  description: string,
  referenceImagePath: string,
  size: number
): Promise<string> {
  // Load reference image as base64
  const referenceBuffer = fs.readFileSync(referenceImagePath);
  const referenceBase64 = referenceBuffer.toString('base64');

  const response = await apiRequest('/generate-image-pixflux', 'POST', {
    description,
    init_image: {
      type: 'base64',
      base64: referenceBase64,
    },
    init_image_strength: 75, // Lower value for more freedom to turn
    image_size: { height: size, width: size },
    no_background: true,
  });

  if (!response.image || !response.image.base64) {
    throw new Error('No image in API response');
  }

  return response.image.base64;
}

async function generateBase(description: string, size: number): Promise<string> {
  const response = await apiRequest('/generate-image-pixflux', 'POST', {
    description,
    image_size: { height: size, width: size },
    no_background: true,
  });

  if (!response.image || !response.image.base64) {
    throw new Error('No image in API response');
  }

  return response.image.base64;
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
    const animalDir = path.join(SPRITES_DIR, animal.id);
    fs.mkdirSync(animalDir, { recursive: true });

    try {
      // Step 1: Generate SOUTH (base view)
      console.log(`  Step 1: Generating south (base)...`);
      const southDesc = `Realistic ${animal.name} as a quadruped animal on all four legs, facing south, viewed from above, natural animal pose, pixel art, top-down perspective`;
      const southBase64 = await generateBase(southDesc, animal.size);
      const southPath = path.join(animalDir, 'south.png');
      fs.writeFileSync(southPath, Buffer.from(southBase64, 'base64'));
      console.log(`    ✓ south.png`);
      completed++;

      await sleep(DELAY_MS);

      // Step 2: Generate EAST (using south as reference)
      console.log(`  Step 2: Generating east (with south reference)...`);
      const eastDesc = `Realistic ${animal.name} as a quadruped animal on all four legs, facing east, side profile view from above, natural animal pose, pixel art, top-down perspective`;
      const eastBase64 = await generateWithReference(eastDesc, southPath, animal.size);
      const eastPath = path.join(animalDir, 'east.png');
      fs.writeFileSync(eastPath, Buffer.from(eastBase64, 'base64'));
      console.log(`    ✓ east.png`);
      completed++;

      // Step 3: WEST = flip of east
      console.log(`  Step 3: Generating west (flip of east)...`);
      const westPath = path.join(animalDir, 'west.png');
      await flipImageHorizontal(eastPath, westPath);
      console.log(`    ✓ west.png (flipped)`);
      completed++;

      await sleep(DELAY_MS);

      // Step 4: Generate other directions using south as reference
      const otherDirections = [
        { name: 'north', desc: 'facing north, viewed from above showing back' },
        { name: 'northeast', desc: 'facing northeast, viewed from above at 45 degree angle' },
        { name: 'southeast', desc: 'facing southeast, viewed from above at 45 degree angle' },
        { name: 'southwest', desc: 'facing southwest, viewed from above at 45 degree angle' },
        { name: 'northwest', desc: 'facing northwest, viewed from above at 45 degree angle' },
      ];

      for (const dir of otherDirections) {
        console.log(`  Generating ${dir.name} (with south reference)...`);
        const desc = `Realistic ${animal.name} as a quadruped animal on all four legs, ${dir.desc}, natural animal pose, pixel art, top-down perspective`;
        const base64 = await generateWithReference(desc, southPath, animal.size);
        const dirPath = path.join(animalDir, `${dir.name}.png`);
        fs.writeFileSync(dirPath, Buffer.from(base64, 'base64'));
        console.log(`    ✓ ${dir.name}.png`);
        completed++;

        if (dir !== otherDirections[otherDirections.length - 1]) {
          await sleep(DELAY_MS);
        }
      }

      // Save metadata
      fs.writeFileSync(
        path.join(animalDir, 'metadata.json'),
        JSON.stringify({
          id: animal.id,
          name: animal.name,
          description: animal.name,  // API expects 'description' field
          category: 'animal',         // API expects 'category' field
          size: animal.size,
          directions: ['south', 'southwest', 'west', 'northwest', 'north', 'northeast', 'east', 'southeast'],
          generated_at: new Date().toISOString(),
          generation_method: 'reference_workflow',
          notes: 'South first, east with south ref, west flipped from east, others with south ref'
        }, null, 2)
      );

      console.log(`    ✓ ${animal.name} complete! (${completed}/${total})`);

    } catch (err: any) {
      console.error(`    ✗ Failed: ${err.message}`);
    }

    // Delay between animals
    if (animal !== ANIMALS[ANIMALS.length - 1]) {
      console.log(`    Waiting ${DELAY_MS / 1000}s...`);
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n✅ Complete! Generated ${completed}/${total} directional sprites`);
}

main().catch(console.error);
