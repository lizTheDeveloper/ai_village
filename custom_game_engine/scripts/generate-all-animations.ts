#!/usr/bin/env npx ts-node
/**
 * Generate walking animations for all animal variants
 * Wrapper around generate-walking-animations.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_PATH = path.join(__dirname, '../packages/renderer/assets/sprites/animal-variant-registry.json');
const SPRITES_DIR = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');

interface Variant {
  id: string;
  variant: string;
  description: string;
}

interface AnimalData {
  base_id: string;
  variants: Variant[];
  variant_count: number;
}

async function generateAllAnimations() {
  console.log('🎬 Generating walking animations for all animals\n');

  // Load registry
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

  const allVariants: string[] = [];

  // Collect all variants that have sprites
  for (const [baseSpecies, animalData] of Object.entries(registry.animals) as [string, AnimalData][]) {
    for (const variant of animalData.variants) {
      // Check if sprite directory exists
      const spriteDir = path.join(SPRITES_DIR, variant.id);
      if (fs.existsSync(spriteDir)) {
        allVariants.push(variant.id);
      } else {
        console.log(`⚠ Skipping ${variant.id} (sprites not found)`);
      }
    }
  }

  console.log(`Total animations to generate: ${allVariants.length}\n`);

  let completed = 0;
  let failed = 0;

  for (const variantId of allVariants) {
    console.log(`\n[${completed + 1}/${allVariants.length}] Generating ${variantId} animations...`);

    try {
      // Call generate-walking-animations.ts with variant ID
      execSync(
        `npx ts-node scripts/generate-walking-animations.ts "${variantId}"`,
        {
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit',
        }
      );

      completed++;
      console.log(`\n✓ ${variantId} animations complete (${completed}/${allVariants.length})`);
    } catch (error) {
      failed++;
      console.error(`\n✗ ${variantId} animations failed`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Batch complete!`);
  console.log(`   Successful: ${completed}/${allVariants.length}`);
  console.log(`   Failed: ${failed}/${allVariants.length}`);
}

generateAllAnimations().catch(console.error);
