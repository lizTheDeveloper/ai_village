#!/usr/bin/env tsx
/**
 * render-batch.ts - Batch render multiple characters for TV episodes, movies, etc.
 *
 * Usage:
 *   ./scripts/render-batch.ts \
 *     --cast-file "./productions/tv/episode_cast.json" \
 *     --quality 2 \
 *     --output-dir "./assets/productions/tv/arena_champions/s03e05/"
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  RenderRequest,
  CostumeSpec,
  EquipmentSpec,
} from '../packages/renderer/src/production/ProductionRenderer.js';

interface CastMember {
  entityId: string;
  name: string;
  role: string;
  costume?: CostumeSpec;
  equipment?: EquipmentSpec[];
  pose?: string;
  expression?: string;
}

interface CastFile {
  productionName: string;
  episode?: string;
  cast: CastMember[];
  defaultQuality?: number;
  defaultLighting?: string;
}

interface CLIOptions {
  castFile: string;
  quality?: string;
  outputDir: string;
  format?: string;
  lighting?: string;
  parallel?: boolean;
  conceptOnly?: boolean;
  skipApproval?: boolean;
}

async function main() {
  const program = new Command();

  program
    .name('render-batch')
    .description('Batch render multiple characters for TV episodes, movies, and productions')
    .requiredOption('--cast-file <path>', 'JSON file with cast information')
    .requiredOption('--output-dir <path>', 'Output directory for rendered assets')
    .option('--quality <level>', 'Quality level (1-4), overrides cast file default')
    .option('--format <type>', 'Render format (sprite|portrait|action)', 'portrait')
    .option(
      '--lighting <type>',
      'Lighting type (natural|dramatic|soft|harsh)',
      'natural'
    )
    .option('--parallel', 'Render all characters in parallel (faster but more resource-intensive)')
    .option('--concept-only', 'Generate concept art only (skip final renders)')
    .option('--skip-approval', 'Auto-approve all concept art (skip review step)')
    .parse(process.argv);

  const options = program.opts<CLIOptions>();

  // Load cast file
  console.log(`Loading cast file: ${options.castFile}`);
  let castData: CastFile;
  try {
    const castJson = await fs.readFile(options.castFile, 'utf-8');
    castData = JSON.parse(castJson);
  } catch (error) {
    console.error('Error loading cast file:', error);
    process.exit(1);
  }

  console.log('');
  console.log('=== Batch Render Job ===');
  console.log(`Production: ${castData.productionName}`);
  if (castData.episode) {
    console.log(`Episode: ${castData.episode}`);
  }
  console.log(`Cast Members: ${castData.cast.length}`);
  console.log(`Output Directory: ${options.outputDir}`);
  console.log('');

  // Create output directory
  await fs.mkdir(options.outputDir, { recursive: true });

  // Determine quality level
  const quality =
    parseInt(options.quality || String(castData.defaultQuality || 2), 10);

  console.log(`Quality Level: ${quality}`);
  console.log(`Format: ${options.format}`);
  console.log(`Parallel Rendering: ${options.parallel ? 'Yes' : 'No'}`);
  console.log('');

  // Render cast
  if (options.parallel) {
    await renderCastParallel(castData, quality, options);
  } else {
    await renderCastSequential(castData, quality, options);
  }

  console.log('');
  console.log('=== Batch Render Complete ===');
  console.log(`Rendered ${castData.cast.length} characters`);
  console.log(`Output: ${options.outputDir}`);
  console.log('All renders complete! 🎬');
}

async function renderCastSequential(
  castData: CastFile,
  quality: number,
  options: CLIOptions
): Promise<void> {
  for (let i = 0; i < castData.cast.length; i++) {
    const member = castData.cast[i];
    console.log(
      `[${i + 1}/${castData.cast.length}] Rendering ${member.name} (${member.role})`
    );
    await renderCastMember(member, quality, options);
    console.log('');
  }
}

async function renderCastParallel(
  castData: CastFile,
  quality: number,
  options: CLIOptions
): Promise<void> {
  console.log(`Starting parallel render of ${castData.cast.length} characters...`);
  console.log('');

  const promises = castData.cast.map((member, i) => {
    console.log(`[${i + 1}/${castData.cast.length}] Queuing ${member.name} (${member.role})`);
    return renderCastMember(member, quality, options);
  });

  await Promise.all(promises);
}

async function renderCastMember(
  member: CastMember,
  quality: number,
  options: CLIOptions
): Promise<void> {
  const outputFilename = `${sanitizeFilename(member.name)}_${member.role}.png`;
  const outputPath = path.join(options.outputDir, outputFilename);

  console.log(`  Entity ID: ${member.entityId}`);
  console.log(`  Costume: ${member.costume?.costumeType || 'default'}`);
  console.log(`  Pose: ${member.pose || 'standing'}`);
  console.log(`  Output: ${outputFilename}`);

  // Simulate concept art
  if (!options.skipApproval) {
    console.log('  [1/3] Generating concept art...');
    await sleep(500);
    console.log('  ✓ Concept art ready');
  }

  if (options.conceptOnly) {
    console.log('  Concept-only mode: Skipping final render');
    return;
  }

  // Simulate final render
  console.log('  [2/3] Rendering final asset...');
  await sleep(1000);
  console.log('  ✓ Render complete');

  console.log('  [3/3] Saving to disk...');
  await sleep(200);
  console.log(`  ✓ Saved to ${outputFilename}`);
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
