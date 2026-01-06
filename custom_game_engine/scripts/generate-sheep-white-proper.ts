#!/usr/bin/env npx ts-node
/**
 * Generate white sheep with proper reference image workflow:
 * 1. Generate south (base)
 * 2. Generate east (using south as reference)
 * 3. West = flip of east
 * 4. Generate other directions using south/east as references
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

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

  const params = {
    description: description,
    reference_image: {
      type: 'base64',
      base64: referenceBase64,
    },
    image_size: { width: size, height: size },
    view: 'high top-down',
    detail: 'medium detail',
    outline: 'single color black outline',
    shading: 'basic shading',
  };

  const result = await apiRequest('/generate-image-pixflux', params);

  if (!result.image || !result.image.base64) {
    throw new Error('No image in API response');
  }

  return result.image.base64;
}

async function generateBase(description: string, size: number): Promise<string> {
  const params = {
    description: description,
    image_size: { width: size, height: size },
    view: 'high top-down',
    detail: 'medium detail',
    outline: 'single color black outline',
    shading: 'basic shading',
    no_background: true,
  };

  const result = await apiRequest('/generate-image-pixflux', params);

  if (!result.image || !result.image.base64) {
    throw new Error('No image in API response');
  }

  return result.image.base64;
}

async function generateSheepWhite() {
  console.log('🐑 Generating white sheep with proper reference workflow...\n');

  const variantId = 'sheep_white';
  const baseDescription = 'white woolly sheep with fluffy wool';
  const size = 48;

  const spriteDir = path.join(SPRITES_DIR, variantId);
  fs.mkdirSync(spriteDir, { recursive: true });

  // Step 1: Generate SOUTH (base view)
  console.log('Step 1: Generating south (base view)...');
  const southDesc = `${baseDescription}, facing south, viewed from above, pixel art style`;
  const southBase64 = await generateBase(southDesc, size);
  const southPath = path.join(spriteDir, 'south.png');
  fs.writeFileSync(southPath, Buffer.from(southBase64, 'base64'));
  console.log('  ✓ south.png saved\n');

  await sleep(DELAY_MS);

  // Step 2: Generate EAST (using south as reference)
  console.log('Step 2: Generating east (using south as reference)...');
  const eastDesc = `${baseDescription}, facing east, side profile view from above, pixel art style`;
  const eastBase64 = await generateWithReference(eastDesc, southPath, size);
  const eastPath = path.join(spriteDir, 'east.png');
  fs.writeFileSync(eastPath, Buffer.from(eastBase64, 'base64'));
  console.log('  ✓ east.png saved\n');

  // Step 3: WEST = flip of east
  console.log('Step 3: Generating west (flip of east)...');
  const westPath = path.join(spriteDir, 'west.png');
  await flipImageHorizontal(eastPath, westPath);
  console.log('  ✓ west.png saved (flipped from east)\n');

  await sleep(DELAY_MS);

  // Step 4: Generate other directions using south/east as references
  const diagonals = [
    { name: 'southeast', desc: 'facing southeast, viewed from above at 45 degree angle' },
    { name: 'southwest', desc: 'facing southwest, viewed from above at 45 degree angle' },
    { name: 'northeast', desc: 'facing northeast, viewed from above at 45 degree angle' },
    { name: 'northwest', desc: 'facing northwest, viewed from above at 45 degree angle' },
  ];

  for (const diagonal of diagonals) {
    console.log(`Step: Generating ${diagonal.name} (using south as reference)...`);
    const diagonalDesc = `${baseDescription}, ${diagonal.desc}, pixel art style`;
    const diagonalBase64 = await generateWithReference(diagonalDesc, southPath, size);
    const diagonalPath = path.join(spriteDir, `${diagonal.name}.png`);
    fs.writeFileSync(diagonalPath, Buffer.from(diagonalBase64, 'base64'));
    console.log(`  ✓ ${diagonal.name}.png saved\n`);

    await sleep(DELAY_MS);
  }

  // Generate NORTH using south as reference
  console.log('Step: Generating north (using south as reference)...');
  const northDesc = `${baseDescription}, facing north, viewed from above showing back, pixel art style`;
  const northBase64 = await generateWithReference(northDesc, southPath, size);
  const northPath = path.join(spriteDir, 'north.png');
  fs.writeFileSync(northPath, Buffer.from(northBase64, 'base64'));
  console.log('  ✓ north.png saved\n');

  // Save metadata
  const metadata = {
    id: variantId,
    base_species: 'sheep',
    variant: 'white',
    description: baseDescription,
    size: size,
    directions: ['south', 'southwest', 'west', 'northwest', 'north', 'northeast', 'east', 'southeast'],
    generated_at: new Date().toISOString(),
    generation_method: 'reference_workflow',
    notes: 'South generated first, east with south reference, west flipped from east, others with south reference'
  };

  const metadataPath = path.join(spriteDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log('✓ metadata.json saved');

  console.log(`\n✨ White sheep complete!`);
  console.log(`   Output: ${spriteDir}`);
  console.log(`   Method: Reference workflow (south → east → flip west → others)`);
}

// Run
generateSheepWhite().catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
