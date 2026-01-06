#!/usr/bin/env npx ts-node
/**
 * Generate walking animations for any animal
 * Creates south, north, east animations (west will be flipped from east)
 *
 * Usage: npx ts-node generate-walking-animations.ts [variant_id]
 * Example: npx ts-node generate-walking-animations.ts sheep_white
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

async function flipAnimationHorizontal(inputDir: string, outputDir: string, frameCount: number): Promise<void> {
  fs.mkdirSync(outputDir, { recursive: true });

  for (let i = 0; i < frameCount; i++) {
    const inputPath = path.join(inputDir, `frame_${i.toString().padStart(3, '0')}.png`);
    const outputPath = path.join(outputDir, `frame_${i.toString().padStart(3, '0')}.png`);

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
}

async function generateWalkingAnimation(
  direction: string,
  referenceImagePath: string,
  outputDir: string
): Promise<number> {
  console.log(`  Generating ${direction} walking animation...`);

  // Load reference image
  const referenceBuffer = fs.readFileSync(referenceImagePath);
  const referenceBase64 = referenceBuffer.toString('base64');

  const params = {
    description: 'white woolly sheep walking',
    action: 'walking naturally, legs moving in walking motion',
    reference_image: {
      type: 'base64',
      base64: referenceBase64,
    },
    image_size: { width: 64, height: 64 },
    n_frames: 8,
  };

  const result = await apiRequest('/animate-with-text', params);

  if (!result.images || result.images.length === 0) {
    throw new Error('No animation frames in API response');
  }

  // Save frames
  fs.mkdirSync(outputDir, { recursive: true });
  for (let i = 0; i < result.images.length; i++) {
    const framePath = path.join(outputDir, `frame_${i.toString().padStart(3, '0')}.png`);
    const imageData = result.images[i];

    let base64Data: string;
    if (typeof imageData === 'string') {
      base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    } else {
      base64Data = imageData.base64 || imageData;
    }

    fs.writeFileSync(framePath, Buffer.from(base64Data, 'base64'));
  }

  console.log(`    ✓ ${result.images.length} frames saved`);
  return result.images.length;
}

async function generateWalkingAnimations(variantId: string) {
  console.log(`🐾 Generating ${variantId} walking animations...\n`);

  const animalDir = path.join(SPRITES_DIR, variantId);
  const animationsDir = path.join(animalDir, 'animations');
  const walkingDir = path.join(animationsDir, 'walking');

  // Check if reference sprites exist
  const southRef = path.join(animalDir, 'south.png');
  const northRef = path.join(animalDir, 'north.png');
  const eastRef = path.join(animalDir, 'east.png');

  if (!fs.existsSync(southRef) || !fs.existsSync(northRef) || !fs.existsSync(eastRef)) {
    console.error('Error: Reference sprites not found. Generate sheep sprites first.');
    process.exit(1);
  }

  // Generate south walking animation
  console.log('Step 1: Generating south walking animation...');
  const southDir = path.join(walkingDir, 'south');
  const southFrames = await generateWalkingAnimation('south', southRef, southDir);

  await sleep(DELAY_MS);

  // Generate north walking animation
  console.log('\nStep 2: Generating north walking animation...');
  const northDir = path.join(walkingDir, 'north');
  const northFrames = await generateWalkingAnimation('north', northRef, northDir);

  await sleep(DELAY_MS);

  // Generate east walking animation
  console.log('\nStep 3: Generating east walking animation...');
  const eastDir = path.join(walkingDir, 'east');
  const eastFrames = await generateWalkingAnimation('east', eastRef, eastDir);

  // Generate west by flipping east
  console.log('\nStep 4: Generating west (flip of east)...');
  const westDir = path.join(walkingDir, 'west');
  await flipAnimationHorizontal(eastDir, westDir, eastFrames);
  console.log(`    ✓ ${eastFrames} frames flipped`);

  // Save animation metadata
  const metadata = {
    animation: 'walking',
    directions: ['south', 'north', 'east', 'west'],
    frames_per_direction: southFrames,
    fps: 8,
    loop: true,
    generated_at: new Date().toISOString(),
    notes: 'East and west share the same animation (west is flipped)'
  };

  const metadataPath = path.join(walkingDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`\n✓ metadata.json saved`);

  console.log(`\n✨ Sheep walking animations complete!`);
  console.log(`   Output: ${walkingDir}`);
  console.log(`   Directions: south, north, east, west (flipped)`);
  console.log(`   Frames per direction: ${southFrames} @ 8fps`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const variantId = args[0] || 'sheep_white';

// Run
generateWalkingAnimations(variantId).catch((err) => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
