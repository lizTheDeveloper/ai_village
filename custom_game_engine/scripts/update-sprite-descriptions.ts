#!/usr/bin/env npx tsx
/**
 * Update all sprite metadata.json files with rich BASE descriptions
 *
 * IMPORTANT: Descriptions should NOT include art style (like "SNES", "256-color palette").
 * Art style is determined by the PLANET and applied at generation time.
 *
 * Base descriptions include:
 * - Species name and variant
 * - Species-specific visual details (fur, ears, tail, etc.)
 * - Category context (wild, domesticated, etc.)
 * - Biome visual hints (forest colors, desert tones, etc.)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  buildBaseDescription,
  parseSpriteId,
  loadAnimalSpeciesData,
} from './sprite-description-builder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPRITES_DIR = path.join(__dirname, '../packages/renderer/assets/sprites/pixellab');

// Load animal species data once
const animalData = loadAnimalSpeciesData();
console.log(`Loaded ${Object.keys(animalData).length} animal species`);

// Track statistics
let updated = 0;
let skipped = 0;
let errors = 0;

function updateSpriteMetadata(spritePath: string): void {
  const metadataPath = path.join(spritePath, 'metadata.json');

  if (!fs.existsSync(metadataPath)) {
    return;
  }

  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    const spriteId = metadata.id || path.basename(spritePath);

    // Skip non-animal sprites (items, buildings, etc.)
    const category = metadata.category || '';
    if (category.includes('items') || category.includes('building') || category.includes('tileset')) {
      skipped++;
      return;
    }

    // Parse sprite ID to get species and variant
    const { species, variant } = parseSpriteId(spriteId);

    // Get animal info if available
    const animalInfo = animalData[species.toLowerCase()];

    // Determine biome from animal data
    let biome: string | undefined;
    if (animalInfo?.biomes?.length) {
      biome = animalInfo.biomes[0];
    }

    // Build BASE description (NO art style - that comes from the planet)
    const baseDescription = buildBaseDescription({
      species,
      variant,
      biome,
      category: animalInfo?.category || metadata.category,
    });

    // Save original description if not already saved
    if (!metadata.original_description) {
      metadata.original_description = metadata.description;
    }

    // Update description (base only, no art style)
    metadata.description = baseDescription;

    // Remove artStyle from metadata - it's planet-specific, not sprite-specific
    delete metadata.artStyle;

    metadata.enriched_at = new Date().toISOString();

    // Write updated metadata
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    updated++;

    if (updated % 50 === 0) {
      console.log(`Progress: ${updated} updated, ${skipped} skipped, ${errors} errors`);
    }
  } catch (err) {
    console.error(`Error updating ${spritePath}:`, err);
    errors++;
  }
}

function main(): void {
  console.log('Updating sprite descriptions (base only, no art style)...');
  console.log(`Sprites directory: ${SPRITES_DIR}`);
  console.log('Art style will be applied at generation time based on planet.');
  console.log('');

  // Get all sprite folders
  const spriteFolders = fs.readdirSync(SPRITES_DIR)
    .filter(f => {
      const fullPath = path.join(SPRITES_DIR, f);
      return fs.statSync(fullPath).isDirectory();
    })
    .map(f => path.join(SPRITES_DIR, f));

  console.log(`Found ${spriteFolders.length} sprite folders`);
  console.log('');

  // Update each sprite
  for (const folder of spriteFolders) {
    updateSpriteMetadata(folder);
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${spriteFolders.length}`);
}

main();
