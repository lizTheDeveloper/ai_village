#!/usr/bin/env npx ts-node
/**
 * Generate SNES-style (16-bit) body parts using PixelLab API
 * Uses reference image for consistent style
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
const envPath = path.join(__dirname, '../../../.env');
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
const DELAY_MS = 5000; // 5 seconds between generations

const SNES_REFERENCE_ID = '762d156d-60dc-4822-915b-af55bc06fb49';
const STYLE = '16-bit SNES era pixel art, RPG style like Chrono Trigger';
const OUTPUT_DIR = path.join(__dirname, '../assets/parts/snes');

interface PartSpec {
  id: string;
  category: 'head' | 'body' | 'hair' | 'accessory';
  description: string;
  width: number;
  height: number;
  tags: string[];
}

// SNES Parts Library (64x64 to 64x96)
const SNES_PARTS: PartSpec[] = [
  // HEADS (8 variations)
  { id: 'head_round_pale', category: 'head', description: `${STYLE}, human head, round face, pale skin, front view, neutral, no hair`, width: 64, height: 64, tags: ['round', 'pale'] },
  { id: 'head_round_tan', category: 'head', description: `${STYLE}, human head, round face, tan skin, front view, smiling, no hair`, width: 64, height: 64, tags: ['round', 'tan'] },
  { id: 'head_round_dark', category: 'head', description: `${STYLE}, human head, round face, dark brown skin, front view, serious, no hair`, width: 64, height: 64, tags: ['round', 'dark'] },
  { id: 'head_square_pale', category: 'head', description: `${STYLE}, human head, square jaw, pale skin, front view, stern, no hair`, width: 64, height: 64, tags: ['square', 'pale'] },
  { id: 'head_square_tan', category: 'head', description: `${STYLE}, human head, square jaw, tan skin, front view, confident, no hair`, width: 64, height: 64, tags: ['square', 'tan'] },
  { id: 'head_oval_pale', category: 'head', description: `${STYLE}, human head, oval face, pale skin, front view, gentle smile, no hair`, width: 64, height: 64, tags: ['oval', 'pale'] },
  { id: 'head_oval_dark', category: 'head', description: `${STYLE}, human head, oval face, dark skin, front view, wise, no hair`, width: 64, height: 64, tags: ['oval', 'dark'] },
  { id: 'head_angular_pale', category: 'head', description: `${STYLE}, human head, angular face, pale skin, front view, intense, no hair`, width: 64, height: 64, tags: ['angular', 'pale'] },

  // BODIES (5 variations)
  { id: 'body_athletic', category: 'body', description: `${STYLE}, human body, athletic muscular build, arms and legs, standing, no head`, width: 64, height: 96, tags: ['athletic'] },
  { id: 'body_stocky', category: 'body', description: `${STYLE}, human body, stocky broad build, arms and legs, standing, no head`, width: 64, height: 96, tags: ['stocky'] },
  { id: 'body_thin', category: 'body', description: `${STYLE}, human body, thin lanky build, arms and legs, standing, no head`, width: 64, height: 96, tags: ['thin'] },
  { id: 'body_average', category: 'body', description: `${STYLE}, human body, average build, arms and legs, standing, no head`, width: 64, height: 96, tags: ['average'] },
  { id: 'body_heavy', category: 'body', description: `${STYLE}, human body, heavy-set build, arms and legs, standing, no head`, width: 64, height: 96, tags: ['heavy'] },

  // HAIR (12 variations)
  { id: 'hair_spiky_brown', category: 'hair', description: `${STYLE}, short spiky brown hair, anime style, top view`, width: 64, height: 64, tags: ['short', 'spiky', 'brown'] },
  { id: 'hair_spiky_blonde', category: 'hair', description: `${STYLE}, short spiky blonde hair, hero style, top view`, width: 64, height: 64, tags: ['short', 'spiky', 'blonde'] },
  { id: 'hair_short_black', category: 'hair', description: `${STYLE}, short neat black hair, professional cut, top view`, width: 64, height: 64, tags: ['short', 'neat', 'black'] },
  { id: 'hair_short_red', category: 'hair', description: `${STYLE}, short messy red hair, wild style, top view`, width: 64, height: 64, tags: ['short', 'messy', 'red'] },
  { id: 'hair_medium_wavy_red', category: 'hair', description: `${STYLE}, medium wavy red hair, flowing, top view`, width: 64, height: 72, tags: ['medium', 'wavy', 'red'] },
  { id: 'hair_medium_straight_brown', category: 'hair', description: `${STYLE}, medium straight brown hair with bangs, top view`, width: 64, height: 72, tags: ['medium', 'straight', 'brown'] },
  { id: 'hair_long_blonde', category: 'hair', description: `${STYLE}, long flowing blonde hair, princess style, top view`, width: 64, height: 80, tags: ['long', 'wavy', 'blonde'] },
  { id: 'hair_long_black', category: 'hair', description: `${STYLE}, long straight black hair, silky, top view`, width: 64, height: 80, tags: ['long', 'straight', 'black'] },
  { id: 'hair_long_curly_brown', category: 'hair', description: `${STYLE}, long curly brown hair, voluminous, top view`, width: 64, height: 80, tags: ['long', 'curly', 'brown'] },
  { id: 'hair_ponytail_blonde', category: 'hair', description: `${STYLE}, ponytail blonde hair, high and tight, top view`, width: 64, height: 72, tags: ['ponytail', 'blonde'] },
  { id: 'hair_ponytail_brown', category: 'hair', description: `${STYLE}, ponytail brown hair, casual, top view`, width: 64, height: 72, tags: ['ponytail', 'brown'] },
  { id: 'hair_bald', category: 'hair', description: `${STYLE}, bald head, smooth skin, no hair, top view`, width: 64, height: 64, tags: ['bald'] },

  // ACCESSORIES (6 variations)
  { id: 'accessory_glasses_round', category: 'accessory', description: `${STYLE}, round eyeglasses, thin gold frames, front view`, width: 64, height: 64, tags: ['glasses', 'round'] },
  { id: 'accessory_beard_short', category: 'accessory', description: `${STYLE}, short brown beard, neat goatee, front view`, width: 64, height: 64, tags: ['beard', 'short'] },
  { id: 'accessory_beard_long', category: 'accessory', description: `${STYLE}, long grey wizard beard, flowing, front view`, width: 64, height: 80, tags: ['beard', 'long'] },
  { id: 'accessory_hat_wizard', category: 'accessory', description: `${STYLE}, wizard hat, tall pointed purple with stars`, width: 64, height: 80, tags: ['hat', 'wizard'] },
  { id: 'accessory_crown', category: 'accessory', description: `${STYLE}, gold crown, ornate with red jewels, royal`, width: 64, height: 64, tags: ['crown', 'royal'] },
  { id: 'accessory_eyepatch', category: 'accessory', description: `${STYLE}, black eyepatch, pirate style, front view`, width: 64, height: 64, tags: ['eyepatch', 'pirate'] },

  // EXOTIC MONSTER BODIES (10 variations)
  { id: 'body_tentacles', category: 'body', description: `${STYLE}, octopus tentacle body, multiple tentacles, slimy texture, standing pose`, width: 64, height: 96, tags: ['tentacles', 'aquatic', 'monster'] },
  { id: 'body_dragon_wings', category: 'body', description: `${STYLE}, humanoid body with large dragon wings spread, scaly texture`, width: 80, height: 96, tags: ['wings', 'dragon', 'flying'] },
  { id: 'body_furry_beast', category: 'body', description: `${STYLE}, werewolf furry body, thick brown fur, clawed arms and legs`, width: 64, height: 96, tags: ['furry', 'beast', 'wolf'] },
  { id: 'body_slime', category: 'body', description: `${STYLE}, slime ooze body, translucent green gelatinous form, dripping`, width: 64, height: 96, tags: ['slime', 'ooze', 'liquid'] },
  { id: 'body_scales_lizard', category: 'body', description: `${STYLE}, lizardfolk scaly body, green scales, reptilian arms and tail`, width: 64, height: 96, tags: ['scales', 'lizard', 'reptile'] },
  { id: 'body_robot', category: 'body', description: `${STYLE}, robotic cyborg body, metal plating, mechanical joints, wires`, width: 64, height: 96, tags: ['robot', 'cyborg', 'metal'] },
  { id: 'body_ethereal_ghost', category: 'body', description: `${STYLE}, ghostly ethereal body, translucent wispy form, floating`, width: 64, height: 96, tags: ['ghost', 'ethereal', 'spirit'] },
  { id: 'body_insect_chitin', category: 'body', description: `${STYLE}, insectoid body, hard chitin exoskeleton, multiple arms`, width: 64, height: 96, tags: ['insect', 'chitin', 'bug'] },
  { id: 'body_plant_vine', category: 'body', description: `${STYLE}, plant creature body, green vines and leaves, woody texture`, width: 64, height: 96, tags: ['plant', 'vine', 'nature'] },
  { id: 'body_crystalline', category: 'body', description: `${STYLE}, crystal golem body, transparent faceted crystals, glowing`, width: 64, height: 96, tags: ['crystal', 'golem', 'mineral'] },

  // EXOTIC MONSTER HEADS (8 variations)
  { id: 'head_dragon', category: 'head', description: `${STYLE}, dragon head, reptilian with horns, green scales, fierce`, width: 64, height: 64, tags: ['dragon', 'scales', 'horns'] },
  { id: 'head_demon', category: 'head', description: `${STYLE}, demon head, red skin with horns, glowing eyes, menacing`, width: 64, height: 64, tags: ['demon', 'horns', 'evil'] },
  { id: 'head_skull', category: 'head', description: `${STYLE}, skeleton skull head, bone white, empty eye sockets`, width: 64, height: 64, tags: ['skull', 'undead', 'bone'] },
  { id: 'head_cat', category: 'head', description: `${STYLE}, cat head, feline features with whiskers and ears, furry`, width: 64, height: 64, tags: ['cat', 'feline', 'furry'] },
  { id: 'head_octopus', category: 'head', description: `${STYLE}, octopus head, tentacle face like Cthulhu, aquatic`, width: 64, height: 64, tags: ['octopus', 'tentacles', 'lovecraft'] },
  { id: 'head_robot', category: 'head', description: `${STYLE}, robot head, metal with glowing visor, mechanical`, width: 64, height: 64, tags: ['robot', 'metal', 'visor'] },
  { id: 'head_slime', category: 'head', description: `${STYLE}, slime head, gelatinous blob with eyes, translucent`, width: 64, height: 64, tags: ['slime', 'blob', 'eyes'] },
  { id: 'head_bird', category: 'head', description: `${STYLE}, bird head, eagle-like with beak and feathers`, width: 64, height: 64, tags: ['bird', 'eagle', 'beak'] },
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

async function generateWithReference(
  description: string,
  referenceImagePath: string | null,
  width: number,
  height: number
): Promise<string> {
  const requestBody: any = {
    description,
    image_size: { height, width },
    no_background: true,
    outline: 'selective outline',
    shading: 'medium shading',
    detail: 'medium detail',
  };

  // If reference image provided, include it
  if (referenceImagePath && fs.existsSync(referenceImagePath)) {
    const referenceBuffer = fs.readFileSync(referenceImagePath);
    const referenceBase64 = referenceBuffer.toString('base64');
    requestBody.init_image = {
      type: 'base64',
      base64: referenceBase64,
    };
    requestBody.init_image_strength = 300; // Medium influence
  }

  const response = await apiRequest('/generate-image-pixflux', 'POST', requestBody);

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
    console.error('❌ PIXELLAB_API_KEY not set in .env');
    process.exit(1);
  }

  console.log('🎨 SNES Parts Generation');
  console.log(`Total parts: ${SNES_PARTS.length}`);
  console.log(`Output: ${OUTPUT_DIR}/\n`);

  // Create output directories
  const categories = new Set(SNES_PARTS.map(p => p.category));
  for (const category of categories) {
    const categoryDir = path.join(OUTPUT_DIR, category);
    fs.mkdirSync(categoryDir, { recursive: true });
  }

  // Track progress
  let completed = 0;
  let failed = 0;
  const failedParts: string[] = [];

  // Load existing progress if available
  const progressFile = path.join(__dirname, 'generation-progress.json');
  let completedIds: Set<string> = new Set();
  let referenceImagePath: string | null = null;

  if (fs.existsSync(progressFile)) {
    const progress = JSON.parse(fs.readFileSync(progressFile, 'utf-8'));
    completedIds = new Set(progress.completed || []);
    referenceImagePath = progress.referenceImage || null;
    console.log(`📋 Resuming from previous run (${completedIds.size} already completed)\n`);
    if (referenceImagePath) {
      console.log(`📸 Using reference: ${referenceImagePath}\n`);
    }
  }

  for (const part of SNES_PARTS) {
    // Skip if already completed
    if (completedIds.has(part.id)) {
      console.log(`⏭️  [${completed + failed + 1}/${SNES_PARTS.length}] Skipping ${part.id} (already exists)`);
      completed++;
      continue;
    }

    console.log(`\n🔨 [${completed + failed + 1}/${SNES_PARTS.length}] Generating ${part.id}`);
    console.log(`   Category: ${part.category}`);
    console.log(`   Size: ${part.width}x${part.height}`);
    console.log(`   Description: ${part.description.substring(0, 80)}...`);
    if (referenceImagePath) {
      console.log(`   Using reference: ${path.basename(referenceImagePath)}`);
    } else {
      console.log(`   ⚠️  No reference (first part)`);
    }

    try {
      // Generate with reference image (or without for first part)
      const base64 = await generateWithReference(
        part.description,
        referenceImagePath,
        part.width,
        part.height
      );

      // Save to file
      const outputPath = path.join(OUTPUT_DIR, part.category, `${part.id}.png`);
      fs.writeFileSync(outputPath, Buffer.from(base64, 'base64'));

      console.log(`   ✅ Saved to ${part.category}/${part.id}.png`);
      completed++;

      // Use first generated part as reference for all subsequent parts
      if (!referenceImagePath) {
        referenceImagePath = outputPath;
        console.log(`   📸 Using this as reference for remaining parts`);
      }

      // Save progress (including reference)
      completedIds.add(part.id);
      fs.writeFileSync(
        progressFile,
        JSON.stringify({
          completed: Array.from(completedIds),
          referenceImage: referenceImagePath
        }, null, 2)
      );

      // Rate limiting delay (except for last item)
      if (part !== SNES_PARTS[SNES_PARTS.length - 1]) {
        console.log(`   ⏳ Waiting ${DELAY_MS / 1000}s for rate limit...`);
        await sleep(DELAY_MS);
      }

    } catch (err: any) {
      console.error(`   ❌ Failed: ${err.message}`);
      failed++;
      failedParts.push(part.id);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Generation complete!`);
  console.log(`   Successful: ${completed}/${SNES_PARTS.length}`);
  console.log(`   Failed: ${failed}/${SNES_PARTS.length}`);

  if (failedParts.length > 0) {
    console.log(`\n❌ Failed parts:`);
    failedParts.forEach(id => console.log(`   - ${id}`));
  }

  console.log(`\n📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`\nNext steps:`);
  console.log(`1. Review generated parts in ${OUTPUT_DIR}`);
  console.log(`2. Update src/parts.ts to load from these PNG files`);
  console.log(`3. Test in the sprite generator test screen`);
}

main().catch(console.error);
