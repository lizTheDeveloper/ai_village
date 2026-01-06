#!/usr/bin/env npx ts-node
/**
 * Generate sprites for all animal variants
 * Wrapper around generate-animal-directions.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_PATH = path.join(__dirname, '../packages/renderer/assets/sprites/animal-variant-registry.json');

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

async function generateAllAnimals() {
  console.log('🎨 Generating all animal sprites with reference workflow\n');

  // Load registry
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));

  const allVariants: Array<{ id: string; description: string }> = [];

  // Collect all variants
  for (const [baseSpecies, animalData] of Object.entries(registry.animals) as [string, AnimalData][]) {
    for (const variant of animalData.variants) {
      allVariants.push({
        id: variant.id,
        description: variant.description,
      });
    }
  }

  console.log(`Total variants to generate: ${allVariants.length}\n`);

  let completed = 0;
  let failed = 0;

  for (const variant of allVariants) {
    console.log(`\n[${ completed + 1}/${allVariants.length}] Generating ${variant.id}...`);
    console.log(`Description: ${variant.description}\n`);

    try {
      // Call generate-animal-directions.ts with variant ID and description
      execSync(
        `npx ts-node scripts/generate-animal-directions.ts "${variant.id}" "${variant.description}"`,
        {
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit',
        }
      );

      completed++;
      console.log(`\n✓ ${variant.id} complete (${completed}/${allVariants.length})`);
    } catch (error) {
      failed++;
      console.error(`\n✗ ${variant.id} failed`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Batch complete!`);
  console.log(`   Successful: ${completed}/${allVariants.length}`);
  console.log(`   Failed: ${failed}/${allVariants.length}`);
}

generateAllAnimals().catch(console.error);
