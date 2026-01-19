#!/usr/bin/env node
/**
 * Extract building definitions from compiled JS to JSON.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractBuildings() {
  const distDir = path.join(__dirname, 'dist');
  const dataDir = path.join(__dirname, 'data');

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const files = [
    { source: 'building-library.js', output: 'standard-buildings.json' },
    { source: 'exotic-buildings.js', output: 'exotic-buildings.json' },
    { source: 'magic-buildings.js', output: 'magic-buildings.json' },
    { source: 'crafting-buildings.js', output: 'crafting-buildings.json' },
  ];

  let totalExtracted = 0;

  for (const file of files) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${file.source}`);
    console.log(`${'='.repeat(60)}`);

    try {
      // Import the compiled module
      const modulePath = path.join(distDir, file.source);
      const module = await import(modulePath);

      // Extract all exported building definitions
      const buildings = [];

      for (const [exportName, exportValue] of Object.entries(module)) {
        // Skip non-building exports (functions, arrays of buildings, etc.)
        if (exportName.startsWith('ALL_') ||
            exportName.startsWith('TIER_') ||
            exportName.includes('BUILDINGS') ||
            exportName.startsWith('get') ||
            exportName.startsWith('create') ||
            exportName.startsWith('describe') ||
            exportName === 'default') {
          continue;
        }

        // Check if it's a building definition (has required fields)
        if (exportValue &&
            typeof exportValue === 'object' &&
            !Array.isArray(exportValue) &&
            exportValue.id &&
            exportValue.name &&
            exportValue.layout) {
          buildings.push(exportValue);
          console.log(`  ✓ Extracted: ${exportValue.id} (${exportValue.name})`);
        }
      }

      if (buildings.length > 0) {
        const outputPath = path.join(dataDir, file.output);
        fs.writeFileSync(outputPath, JSON.stringify(buildings, null, 2), 'utf-8');
        console.log(`\n  ✓ Saved ${buildings.length} buildings to: ${file.output}`);
        totalExtracted += buildings.length;
      } else {
        console.log(`  ✗ No buildings extracted from ${file.source}`);
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${file.source}:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`EXTRACTION COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total buildings extracted: ${totalExtracted}`);
  console.log(`Output directory: ${dataDir}`);
  console.log(`${'='.repeat(60)}`);
}

extractBuildings().catch(console.error);
