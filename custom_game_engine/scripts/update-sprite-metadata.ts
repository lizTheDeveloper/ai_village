#!/usr/bin/env npx ts-node
/**
 * Update existing sprite metadata files with descriptions from the registry
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPRITES_DIR = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');
const REGISTRY_PATH = path.join(__dirname, '../packages/renderer/assets/sprites/animal-variant-registry.json');

interface VariantRegistryEntry {
  id: string;
  variant: string;
  description: string;
}

interface AnimalEntry {
  base_id: string;
  variants: VariantRegistryEntry[];
  variant_count: number;
}

interface VariantRegistry {
  version: string;
  animals: Record<string, AnimalEntry>;
}

async function main(): Promise<void> {
  console.log('🔧 Updating sprite metadata files...\n');

  // Load registry
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('❌ Registry not found:', REGISTRY_PATH);
    process.exit(1);
  }

  const registry: VariantRegistry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
  console.log(`📖 Loaded registry with ${Object.keys(registry.animals).length} animal types\n`);

  // Create a lookup map: id -> description
  const descriptionMap = new Map<string, string>();
  for (const animal of Object.values(registry.animals)) {
    for (const variant of animal.variants) {
      descriptionMap.set(variant.id, variant.description);
    }
  }

  console.log(`📋 Registry contains ${descriptionMap.size} variant descriptions\n`);

  // Scan sprite directories
  if (!fs.existsSync(SPRITES_DIR)) {
    console.error('❌ Sprites directory not found:', SPRITES_DIR);
    process.exit(1);
  }

  const folders = fs.readdirSync(SPRITES_DIR);
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const folder of folders) {
    const folderPath = path.join(SPRITES_DIR, folder);
    const metadataPath = path.join(folderPath, 'metadata.json');

    if (!fs.statSync(folderPath).isDirectory()) {
      continue;
    }

    if (!fs.existsSync(metadataPath)) {
      console.log(`⚠️  No metadata: ${folder}`);
      skipped++;
      continue;
    }

    try {
      // Read existing metadata
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      // Check if already has description and category
      if (metadata.description && metadata.category) {
        console.log(`✓ Already has metadata: ${folder}`);
        skipped++;
        continue;
      }

      // Look up description from registry
      const description = descriptionMap.get(folder);
      if (!description) {
        console.log(`⚠️  No registry entry for: ${folder}`);
        skipped++;
        continue;
      }

      // Update metadata
      metadata.description = description;
      metadata.category = 'animal';

      // Write back
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`✓ Updated: ${folder} -> "${description}"`);
      updated++;

    } catch (err: any) {
      console.error(`❌ Error processing ${folder}:`, err.message);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
