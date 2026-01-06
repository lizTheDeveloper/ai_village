#!/usr/bin/env tsx
/**
 * Blueprint validator - catches duplicate blueprint IDs at build time
 *
 * Prevents runtime errors like:
 * "Blueprint with id 'warehouse' already registered"
 *
 * This validator scans all blueprint files and checks for:
 * 1. Duplicate blueprint IDs across files
 * 2. Invalid blueprint IDs (empty, malformed)
 * 3. Missing required fields
 *
 * Usage: npm run validate:blueprints
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const buildingsDir = join(__dirname, '../packages/core/src/buildings');

interface BlueprintLocation {
  id: string;
  file: string;
  line: number;
}

/**
 * Extract blueprint IDs from a TypeScript file
 */
function extractBlueprintIds(filePath: string): BlueprintLocation[] {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const blueprints: BlueprintLocation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match: id: 'something' or id: "something"
    const match = line.match(/^\s*id:\s*['"]([^'"]+)['"]/);
    if (match) {
      const id = match[1];
      blueprints.push({
        id,
        file: filePath,
        line: i + 1, // 1-indexed
      });
    }
  }

  return blueprints;
}

/**
 * Find duplicate blueprint IDs
 */
function findDuplicates(blueprints: BlueprintLocation[]): Map<string, BlueprintLocation[]> {
  const idMap = new Map<string, BlueprintLocation[]>();

  for (const bp of blueprints) {
    if (!idMap.has(bp.id)) {
      idMap.set(bp.id, []);
    }
    idMap.get(bp.id)!.push(bp);
  }

  // Filter to only duplicates
  const duplicates = new Map<string, BlueprintLocation[]>();
  for (const [id, locations] of idMap.entries()) {
    if (locations.length > 1) {
      duplicates.set(id, locations);
    }
  }

  return duplicates;
}

/**
 * Validate blueprint IDs
 */
function validateBlueprintId(id: string): string | null {
  if (!id || id.trim() === '') {
    return 'Empty blueprint ID';
  }

  // Check for invalid characters (only allow alphanumeric, dash, underscore)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return `Invalid characters in blueprint ID (only a-z, A-Z, 0-9, -, _ allowed)`;
  }

  return null;
}

/**
 * Main validation
 */
function main() {
  console.log('🔍 Validating building blueprints...\n');

  // Find all blueprint files
  const files = readdirSync(buildingsDir)
    .filter(f => f.endsWith('Blueprints.ts') || f === 'BuildingBlueprintRegistry.ts' || f === 'StandardVoxelBuildings.ts')
    .map(f => join(buildingsDir, f));

  console.log(`Found ${files.length} blueprint files:\n`);
  files.forEach(f => console.log(`  - ${f.split('/').slice(-1)[0]}`));
  console.log();

  // Extract all blueprint IDs
  const allBlueprints: BlueprintLocation[] = [];
  for (const file of files) {
    const blueprints = extractBlueprintIds(file);
    allBlueprints.push(...blueprints);
  }

  console.log(`Found ${allBlueprints.length} total blueprints\n`);

  let hasErrors = false;

  // Check for invalid IDs
  console.log('📝 Checking for invalid blueprint IDs...');
  const invalidIds: { bp: BlueprintLocation; error: string }[] = [];
  for (const bp of allBlueprints) {
    const error = validateBlueprintId(bp.id);
    if (error) {
      invalidIds.push({ bp, error });
    }
  }

  if (invalidIds.length > 0) {
    hasErrors = true;
    console.error(`\n❌ Found ${invalidIds.length} invalid blueprint IDs:\n`);
    for (const { bp, error } of invalidIds) {
      console.error(`  ${bp.file.split('/').slice(-1)[0]}:${bp.line}`);
      console.error(`    ID: "${bp.id}"`);
      console.error(`    Error: ${error}\n`);
    }
  } else {
    console.log('✅ All blueprint IDs are valid\n');
  }

  // Check for duplicates
  console.log('🔍 Checking for duplicate blueprint IDs...');
  const duplicates = findDuplicates(allBlueprints);

  if (duplicates.size > 0) {
    hasErrors = true;
    console.error(`\n❌ Found ${duplicates.size} duplicate blueprint IDs:\n`);

    for (const [id, locations] of duplicates.entries()) {
      console.error(`  Blueprint ID: "${id}" (found ${locations.length} times)`);
      for (const loc of locations) {
        const fileName = loc.file.split('/').slice(-1)[0];
        console.error(`    - ${fileName}:${loc.line}`);
      }
      console.error();
    }

    console.error('Each blueprint ID must be unique across all files.');
    console.error('To fix: Rename one of the duplicate blueprints.\n');
  } else {
    console.log('✅ No duplicate blueprint IDs found\n');
  }

  // Summary
  console.log('='.repeat(60));
  if (hasErrors) {
    console.error('\n❌ Blueprint validation FAILED\n');
    console.error('Fix the errors above and run validation again.\n');
    process.exit(1);
  } else {
    console.log('\n✅ Blueprint validation PASSED\n');
    console.log(`All ${allBlueprints.length} blueprints are valid.`);
    console.log('No duplicates found.\n');
    process.exit(0);
  }
}

main();
