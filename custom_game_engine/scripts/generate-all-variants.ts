#!/usr/bin/env npx ts-node
/**
 * Generate All Animal Sprite Variants
 * Creates sprites for all color/pattern variants defined in the variant registry
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
const REGISTRY_PATH = path.join(__dirname, '../packages/renderer/assets/sprites/animal-variant-registry.json');
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

// Size mapping from animal species data
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

interface Variant {
  id: string;
  variant: string;
  description: string;
}

interface AnimalData {
  base_id: string;
  variants: Variant[];
}

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

function variantExists(variantId: string): boolean {
  const variantDir = path.join(SPRITES_DIR, variantId);
  if (!fs.existsSync(variantDir)) return false;

  // Check if all 8 directions exist
  return DIRECTIONS.every(d => fs.existsSync(path.join(variantDir, `${d.name}.png`)));
}

async function generateVariantSprite(
  variant: Variant,
  baseSpecies: string,
  direction: typeof DIRECTIONS[0]
): Promise<void> {
  const size = SIZE_MAP[baseSpecies] || 48;

  // Create description with color/pattern variant
  const description = `Realistic ${variant.description} as a quadruped animal on all four legs, ${direction.description}, natural animal pose, pixel art, top-down perspective`;

  const response = await apiRequest('/generate-image-pixflux', 'POST', {
    description,
    image_size: { height: size, width: size },
    no_background: true,
  });

  if (!response.image || !response.image.base64) {
    throw new Error('No image in API response');
  }

  const variantDir = path.join(SPRITES_DIR, variant.id);
  fs.mkdirSync(variantDir, { recursive: true });

  const imageBuffer = Buffer.from(response.image.base64, 'base64');
  fs.writeFileSync(path.join(variantDir, `${direction.name}.png`), imageBuffer);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error('PIXELLAB_API_KEY not set');
    process.exit(1);
  }

  // Load variant registry
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

  console.log('🎨 Generating All Animal Sprite Variants\n');
  console.log(`Total variants: ${registry.variant_count}`);
  console.log(`Directions per variant: ${DIRECTIONS.length}`);
  console.log(`Total sprites to generate: ${registry.variant_count * DIRECTIONS.length}\n`);

  // Collect all variants that need generation
  const toGenerate: Array<{ variant: Variant; baseSpecies: string }> = [];

  for (const [baseSpecies, animalData] of Object.entries(registry.animals) as [string, AnimalData][]) {
    for (const variant of animalData.variants) {
      if (!variantExists(variant.id)) {
        toGenerate.push({ variant, baseSpecies });
      }
    }
  }

  if (toGenerate.length === 0) {
    console.log('✅ All variants already generated!');
    return;
  }

  console.log(`Found ${toGenerate.length} variants to generate\n`);

  let completed = 0;
  const totalSprites = toGenerate.length * DIRECTIONS.length;

  for (const { variant, baseSpecies } of toGenerate) {
    const size = SIZE_MAP[baseSpecies] || 48;
    console.log(`\n[${variant.id.toUpperCase()}] (${size}x${size})`);
    console.log(`  Species: ${baseSpecies}`);
    console.log(`  Variant: ${variant.variant}`);
    console.log(`  Description: ${variant.description}`);

    for (let i = 0; i < DIRECTIONS.length; i++) {
      const direction = DIRECTIONS[i];

      try {
        console.log(`  [${direction.name}]`);
        await generateVariantSprite(variant, baseSpecies, direction);
        completed++;
        console.log(`    ✓ Saved ${direction.name}.png (${completed}/${totalSprites})`);

        if (i < DIRECTIONS.length - 1 || toGenerate.indexOf({ variant, baseSpecies }) < toGenerate.length - 1) {
          console.log(`    Waiting ${DELAY_MS / 1000}s...`);
          await sleep(DELAY_MS);
        }
      } catch (err: any) {
        console.error(`    ✗ Failed: ${err.message}`);
      }
    }

    // Save metadata
    const variantDir = path.join(SPRITES_DIR, variant.id);
    fs.writeFileSync(
      path.join(variantDir, 'metadata.json'),
      JSON.stringify({
        id: variant.id,
        base_species: baseSpecies,
        variant: variant.variant,
        description: variant.description,
        size: SIZE_MAP[baseSpecies],
        directions: DIRECTIONS.map(d => d.name),
        generated_at: new Date().toISOString(),
      }, null, 2)
    );
  }

  console.log(`\n✅ Complete! Generated ${completed}/${totalSprites} variant sprites`);
}

main().catch(console.error);
