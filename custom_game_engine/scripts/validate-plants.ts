#!/usr/bin/env tsx
/**
 * Plant Validation and Fix Script
 *
 * This script validates all plant species definitions and automatically fixes common issues:
 * - Converts genetic distribution objects { min, max, mean, variance } to mean values
 * - Renames 'yield' to 'yieldAmount'
 * - Renames 'genetics' to 'baseGenetics'
 * - Adds missing required fields with defaults
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface GeneticDistribution {
  min: number;
  max: number;
  mean: number;
  variance: number;
}

function isDistribution(value: any): value is GeneticDistribution {
  return value &&
    typeof value === 'object' &&
    typeof value.min === 'number' &&
    typeof value.max === 'number' &&
    typeof value.mean === 'number' &&
    typeof value.variance === 'number';
}

function fixGeneticValue(value: number | GeneticDistribution): number {
  if (isDistribution(value)) {
    return value.mean;
  }
  return value;
}

function fixPlantFile(filePath: string): boolean {
  console.log(`\nProcessing: ${path.basename(filePath)}`);
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let fixes: string[] = [];

  // Fix genetics property name
  if (content.includes('  genetics: {')) {
    content = content.replace(/(\s+)genetics: {/g, '$1baseGenetics: {');
    modified = true;
    fixes.push('Renamed genetics -> baseGenetics');
  }

  // Fix yield property name in genetics
  if (content.includes('    yield: ')) {
    content = content.replace(/(\s+)yield: /g, '$1yieldAmount: ');
    modified = true;
    fixes.push('Renamed yield -> yieldAmount');
  }

  // Fix genetic distribution objects - convert to mean values
  // Match patterns like: growthRate: { min: X, max: Y, mean: Z, variance: W }
  const distributionPattern = /(\w+):\s*\{\s*min:\s*([\d.]+),\s*max:\s*([\d.]+),\s*mean:\s*([\d.]+),\s*variance:\s*([\d.]+)\s*\}/g;
  const matches = [...content.matchAll(distributionPattern)];

  if (matches.length > 0) {
    content = content.replace(distributionPattern, (match, propName, min, max, mean, variance) => {
      return `${propName}: ${mean}`;
    });
    modified = true;
    fixes.push(`Converted ${matches.length} genetic distributions to mean values`);
  }

  // Add missing required genetic properties
  // Find all baseGenetics blocks and ensure they have all required properties
  const geneticsBlockPattern = /baseGenetics:\s*\{([^}]+)\}/gs;
  const geneticsMatches = [...content.matchAll(geneticsBlockPattern)];

  for (const match of geneticsMatches) {
    const block = match[1];
    const defaults = {
      droughtTolerance: '50',
      coldTolerance: '50',
      flavorProfile: '50'
    };

    let updatedBlock = block;
    let addedProps: string[] = [];

    for (const [prop, defaultValue] of Object.entries(defaults)) {
      if (!block.includes(`${prop}:`)) {
        // Add the missing property before the closing brace
        updatedBlock += `,\n    ${prop}: ${defaultValue}`;
        addedProps.push(prop);
      }
    }

    if (addedProps.length > 0) {
      content = content.replace(match[0], `baseGenetics: {${updatedBlock}}`);
      modified = true;
      fixes.push(`Added missing genetic properties: ${addedProps.join(', ')}`);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✓ Fixed: ${fixes.join(', ')}`);
    return true;
  } else {
    console.log(`  ✓ No fixes needed`);
    return false;
  }
}

function main() {
  console.log('=== Plant Species Validation and Fix ===\n');

  const plantSpeciesDir = path.join(__dirname, '../packages/world/src/plant-species');

  const plantFiles = [
    'mountain-plants.ts',
    'tropical-plants.ts',
    'wetland-plants.ts',
  ];

  let totalFixed = 0;

  for (const file of plantFiles) {
    const filePath = path.join(plantSpeciesDir, file);
    if (fs.existsSync(filePath)) {
      if (fixPlantFile(filePath)) {
        totalFixed++;
      }
    } else {
      console.log(`  ✗ File not found: ${file}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Files processed: ${plantFiles.length}`);
  console.log(`Files fixed: ${totalFixed}`);
  console.log(`\nRun 'npm run build' to verify all fixes.`);
}

main();
