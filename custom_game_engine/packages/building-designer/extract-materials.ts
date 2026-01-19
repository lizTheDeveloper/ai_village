/**
 * Extract material effects from TypeScript to JSON
 * Run with: npx tsx extract-materials.ts
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { MATERIAL_EFFECTS } from './src/material-effects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outputPath = join(__dirname, 'data', 'material-effects.json');

// Create directory if it doesn't exist
mkdirSync(dirname(outputPath), { recursive: true });

// Convert to JSON
const jsonData = JSON.stringify(MATERIAL_EFFECTS, null, 2);

// Write to file
writeFileSync(outputPath, jsonData);

console.log(`✓ Extracted ${Object.keys(MATERIAL_EFFECTS).length} materials`);
console.log(`✓ Saved to: ${outputPath}`);

// Print sample
const sampleMaterials = ['wood', 'stone', 'dreamweave', 'star_iron', 'creation_stone'];
console.log('\nSample materials:');
for (const name of sampleMaterials) {
  if (name in MATERIAL_EFFECTS) {
    const mat = MATERIAL_EFFECTS[name as keyof typeof MATERIAL_EFFECTS];
    console.log(`\n${name}:`);
    console.log(`  durability: ${mat.durability}`);
    console.log(`  element: ${mat.element}`);
    console.log(`  description: ${mat.description.substring(0, 60)}...`);
    console.log(`  specialEffects: ${mat.specialEffects.length} effects`);
  }
}
