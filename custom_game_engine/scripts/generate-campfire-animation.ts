#!/usr/bin/env npx ts-node
/**
 * Generate animated campfire using PixelLab's /animate-with-text endpoint
 * This creates a simple looping fire animation without directional views
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

const PIXELLAB_API_KEY = process.env.PIXELLAB_API_KEY;
if (!PIXELLAB_API_KEY) {
  console.error('Error: PIXELLAB_API_KEY not found in .env');
  process.exit(1);
}

const API_BASE = 'https://api.pixellab.ai';

async function apiRequest(endpoint: string, method: string, body?: any): Promise<any> {
  const url = `${API_BASE}${endpoint}`;
  const headers: any = {
    'Authorization': `Bearer ${PIXELLAB_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

async function generateCampfireAnimation() {
  console.log('🔥 Generating animated campfire using /animate-with-text...\n');

  const outputDir = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab/campfire_flames');
  fs.mkdirSync(outputDir, { recursive: true });

  // Step 1: Load reference campfire image
  console.log('Step 1: Loading reference campfire image...');

  const refImagePath = '/tmp/campfire_ref.png';
  const refImageBuffer = fs.readFileSync(refImagePath);
  const referenceImage = refImageBuffer.toString('base64');
  console.log('  ✓ Reference image loaded\n');

  // Step 2: Animate the campfire
  console.log('Step 2: Animating flames...');

  const animParams = {
    description: 'Small campfire with flickering orange and yellow flames, pixel art style',
    action: 'flames flickering and dancing, embers glowing brighter and dimmer',
    reference_image: {
      type: 'base64',
      base64: referenceImage,
    },
    image_size: { width: 64, height: 64 },
    n_frames: 6,
  };

  console.log('  Description:', animParams.description);
  console.log('  Action:', animParams.action);
  console.log('  Frames:', animParams.n_frames);
  console.log('\n  Calling API...');

  const result = await apiRequest('/v1/animate-with-text', 'POST', animParams);

  if (!result.images || result.images.length === 0) {
    throw new Error('No animation frames in API response');
  }

  console.log(`  ✓ Received ${result.images.length} frames\n`);

  // Save frames
  console.log('  Saving frames...');
  for (let i = 0; i < result.images.length; i++) {
    const framePath = path.join(outputDir, `frame_${i.toString().padStart(3, '0')}.png`);
    const imageData = result.images[i];

    // Handle both data URL format and plain base64
    let base64Data: string;
    if (typeof imageData === 'string') {
      base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    } else {
      // If it's already a buffer or object, convert to base64
      base64Data = imageData.base64 || imageData;
    }

    fs.writeFileSync(framePath, Buffer.from(base64Data, 'base64'));
    console.log(`    ✓ frame_${i.toString().padStart(3, '0')}.png`);
  }

  // Save metadata
  const metadata = {
    id: 'campfire_flames',
    name: 'Campfire Flames',
    size: animParams.image_size.width,
    frames: result.images.length,
    fps: 8,
    loop: true,
    category: 'map_objects',
    description: animParams.description,
    generated_at: new Date().toISOString(),
  };

  const metadataPath = path.join(outputDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`\n  ✓ metadata.json`);

  console.log('\n✨ Campfire animation complete!');
  console.log(`   Output: ${outputDir}`);
  console.log(`   Frames: ${result.images.length} @ ${metadata.fps}fps`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateCampfireAnimation().catch((err) => {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  });
}
