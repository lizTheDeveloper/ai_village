#!/usr/bin/env tsx
/**
 * Generate only papers that don't already exist
 * Scans existing paper files and filters out papers that are already generated
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const paperDir = path.join(__dirname, '../packages/world/src/research-papers');
const specsDir = path.join(__dirname, 'paper-specs');

// Find all existing paper IDs
function getExistingPaperIds(): Set<string> {
  const existingIds = new Set<string>();
  const paperFiles = fs.readdirSync(paperDir).filter(f => f.endsWith('-papers.ts'));

  for (const file of paperFiles) {
    const content = fs.readFileSync(path.join(paperDir, file), 'utf-8');
    const matches = content.matchAll(/paperId:\s*['"]([^'"]+)['"]/g);
    for (const match of matches) {
      existingIds.add(match[1]!);
    }
  }

  return existingIds;
}

// Filter spec file to only include missing papers
function filterSpecFile(specPath: string, existingIds: Set<string>): any[] | null {
  const specs = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  const missingSpecs = specs.filter((spec: any) => !existingIds.has(spec.paperId));

  if (missingSpecs.length === 0) {
    return null; // All papers already exist
  }

  return missingSpecs;
}

// Main execution
console.log('Scanning for existing papers...');
const existingIds = getExistingPaperIds();
console.log(`Found ${existingIds.size} existing papers`);
console.log('');

// Find all spec files
const specFiles = fs.readdirSync(specsDir)
  .filter(f => f.endsWith('.json') && (
    f.startsWith('herbal_') ||
    f.startsWith('medicinal_') ||
    f.startsWith('advanced_herbal_') ||
    f.startsWith('magical_herbalism') ||
    f.startsWith('cooking_') ||
    f.startsWith('advanced_cooking_') ||
    f.startsWith('food_preservation') ||
    f.startsWith('culinary_arts_') ||
    f.startsWith('brewing_') ||
    f.startsWith('basic_construction_') ||
    f.startsWith('carpentry_') ||
    f.startsWith('masonry_') ||
    f.startsWith('advanced_construction_') ||
    f.startsWith('architectural_') ||
    f.startsWith('structural_engineering') ||
    f.startsWith('magical_construction') ||
    f.startsWith('monumental_') ||
    f.startsWith('underground_')
  ))
  .sort();

let totalToGenerate = 0;
let totalSkipped = 0;
const batchesToRun: Array<{ spec: string; output: string }> = [];

// Process each spec file
for (const specFile of specFiles) {
  const specPath = path.join(specsDir, specFile);
  const missingSpecs = filterSpecFile(specPath, existingIds);

  if (!missingSpecs) {
    const originalSpecs = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
    console.log(`✓ SKIP: ${specFile} (${originalSpecs.length} papers already exist)`);
    totalSkipped += originalSpecs.length;
    continue;
  }

  // Create filtered spec file
  const filteredSpecPath = path.join(specsDir, `filtered-${specFile}`);
  fs.writeFileSync(filteredSpecPath, JSON.stringify(missingSpecs, null, 2));

  const basename = specFile.replace('.json', '');
  const outputPath = path.join(paperDir, `${basename}-papers.ts`);

  console.log(`→ GENERATE: ${specFile} (${missingSpecs.length} new papers)`);
  batchesToRun.push({
    spec: filteredSpecPath,
    output: outputPath
  });

  totalToGenerate += missingSpecs.length;
}

console.log('');
console.log('='.repeat(60));
console.log(`Total papers: ${totalToGenerate + totalSkipped}`);
console.log(`Already exist: ${totalSkipped}`);
console.log(`To generate: ${totalToGenerate}`);
console.log('='.repeat(60));
console.log('');

if (totalToGenerate === 0) {
  console.log('All papers already exist! Nothing to generate.');
  process.exit(0);
}

// Ask for confirmation
console.log(`Ready to generate ${totalToGenerate} papers using Anthropic API.`);
console.log(`Estimated cost: ~$${Math.ceil(totalToGenerate * 0.03)}-${Math.ceil(totalToGenerate * 0.05)}`);
console.log(`Estimated time: ${Math.ceil(totalToGenerate / 6)} minutes`);
console.log('');

// Generate each batch
let current = 0;
for (const batch of batchesToRun) {
  current++;
  console.log(`[${current}/${batchesToRun.length}] Generating ${path.basename(batch.spec)}...`);

  try {
    execSync(
      `./generate-batch.sh "${batch.spec}" "${batch.output}"`,
      {
        cwd: __dirname,
        stdio: 'inherit'
      }
    );
  } catch (error) {
    console.error(`Failed to generate ${batch.spec}`);
  }

  // Clean up filtered spec file
  fs.unlinkSync(batch.spec);
}

console.log('');
console.log('='.repeat(60));
console.log('Generation complete!');
console.log('='.repeat(60));
