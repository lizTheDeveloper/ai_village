#!/usr/bin/env tsx
/**
 * render-soul-sprite.ts - Generate sprites based on soul reincarnation tier
 *
 * Implements the Soul Sprite Progression System where visual complexity
 * reflects spiritual complexity through reincarnation count.
 *
 * Usage:
 *   # Generate sprites for a soul with 3 reincarnations (Tier 3: 32×32, 8 directions)
 *   PIXELLAB_API_TOKEN=your_token ./scripts/render-soul-sprite.ts \
 *     --name "Elder Sage" \
 *     --description "wise elderly human wizard with long white beard and blue robes" \
 *     --reincarnations 3 \
 *     --output-dir "./assets/sprites/souls/elder_sage/"
 *
 *   # Generate max-quality sprites for an animal (no soul progression)
 *   ./scripts/render-soul-sprite.ts \
 *     --name "Forest Wolf" \
 *     --description "grey wolf with thick fur" \
 *     --animal \
 *     --output-dir "./assets/sprites/animals/wolf/"
 *
 *   # Preview tier info without generating (dry run)
 *   ./scripts/render-soul-sprite.ts \
 *     --reincarnations 5 \
 *     --dry-run
 */

import { Command } from 'commander';
import {
  SoulSpriteRenderer,
  getTierDescription,
  type SoulEntity,
  type AnimalEntity,
} from '../packages/renderer/src/production/SoulSpriteRenderer.js';

interface CLIOptions {
  name: string;
  description?: string;
  reincarnations?: string;
  animal?: boolean;
  species?: string;
  outputDir: string;
  apiToken?: string;
  dryRun?: boolean;
}

async function main() {
  const program = new Command();

  program
    .name('render-soul-sprite')
    .description('Generate sprites based on soul reincarnation tier using PixelLab API')
    .requiredOption('--name <name>', 'Entity name')
    .requiredOption('--output-dir <path>', 'Output directory for sprites')
    .option('--description <desc>', 'Character appearance description')
    .option('--reincarnations <count>', 'Reincarnation count (determines tier)', '1')
    .option('--animal', 'Generate as animal (max quality, no soul progression)')
    .option('--species <species>', 'Species type (for animals)')
    .option('--api-token <token>', 'PixelLab API token (or set PIXELLAB_API_TOKEN)')
    .option('--dry-run', 'Show tier info without generating sprites')
    .parse(process.argv);

  const options = program.opts<CLIOptions>();

  // Get API token
  const apiToken = options.apiToken || process.env.PIXELLAB_API_TOKEN;

  if (!apiToken && !options.dryRun) {
    console.error('Error: PixelLab API token required.');
    console.error('  Set PIXELLAB_API_TOKEN environment variable');
    console.error('  Or use --api-token <token>');
    console.error('  Or use --dry-run to preview tier info');
    process.exit(1);
  }

  const reincarnations = parseInt(options.reincarnations || '1', 10);
  const isAnimal = options.animal || false;

  console.log('=== Soul Sprite Renderer ===');
  console.log(`Name: ${options.name}`);

  if (isAnimal) {
    console.log(`Type: Animal (max quality)`);
    console.log(`Species: ${options.species || 'unknown'}`);
  } else {
    console.log(`Type: Ensouled Being`);
    console.log(`Reincarnations: ${reincarnations}`);
    const tier = Math.min(Math.max(reincarnations, 1), 8);
    console.log(`Tier: ${tier} - ${getTierDescription(tier)}`);
  }

  if (options.description) {
    console.log(`Description: ${options.description}`);
  }
  console.log(`Output: ${options.outputDir}`);
  console.log('');

  // Show tier progression table
  if (options.dryRun || !options.description) {
    console.log('=== Soul Sprite Progression Tiers ===');
    console.log('');
    console.log('| Tier | Lives | Size   | Directions | Animations              |');
    console.log('|------|-------|--------|------------|-------------------------|');
    console.log('| 1    | 1     | 16×16  | 1 (south)  | None                    |');
    console.log('| 2    | 2     | 24×24  | 4 cardinal | None                    |');
    console.log('| 3    | 3     | 32×32  | 8 full     | None                    |');
    console.log('| 4    | 4     | 40×40  | 8 full     | Walk                    |');
    console.log('| 5    | 5     | 48×48  | 8 full     | Walk, Run               |');
    console.log('| 6    | 6     | 56×56  | 8 full     | Walk, Run, Idle         |');
    console.log('| 7    | 7     | 64×64  | 8 full     | Walk, Run, Idle, Attack |');
    console.log('| 8+   | 8+    | 64×64  | 8 full     | All + Effects           |');
    console.log('');
    console.log('Animals: Always 64×64, 8 directions, full animations');
    console.log('');

    if (options.dryRun) {
      console.log('Dry run complete. Use without --dry-run to generate sprites.');
      return;
    }

    if (!options.description) {
      console.error('Error: --description is required to generate sprites');
      process.exit(1);
    }
  }

  // Create renderer
  const renderer = new SoulSpriteRenderer(apiToken);

  let spriteSet;

  if (isAnimal) {
    // Generate animal sprites (max quality)
    const animal: AnimalEntity = {
      id: options.name.toLowerCase().replace(/\s+/g, '_'),
      name: options.name,
      description: options.description!,
      species: options.species || 'unknown',
    };

    console.log('Generating animal sprites (max quality)...');
    console.log('');
    spriteSet = await renderer.generateAnimalSprites(animal);
  } else {
    // Generate soul sprites based on reincarnation tier
    const soul: SoulEntity = {
      id: options.name.toLowerCase().replace(/\s+/g, '_'),
      name: options.name,
      description: options.description!,
      reincarnationCount: reincarnations,
    };

    console.log('Generating soul sprites...');
    console.log('');
    spriteSet = await renderer.generateSoulSprites(soul);
  }

  // Save to disk
  console.log('\nSaving sprite set...');
  await renderer.saveSpriteSet(spriteSet, options.outputDir);

  console.log('');
  console.log('=== Generation Complete ===');
  console.log(`Entity: ${options.name}`);
  console.log(`Tier: ${spriteSet.tier} (${getTierDescription(spriteSet.tier)})`);
  console.log(`Size: ${spriteSet.config.size}×${spriteSet.config.size}`);
  console.log(`Directions: ${spriteSet.sprites.size}`);
  console.log(`Animations: ${spriteSet.animations.size}`);
  console.log(`Output: ${options.outputDir}`);
  console.log('');
  console.log('Sprite generation complete! ✨');
}

// Run if called directly
main().catch((error) => {
  console.error('Error:', error.message);
  if (error.message.includes('401')) {
    console.error('  Invalid API token. Check your PIXELLAB_API_TOKEN.');
  } else if (error.message.includes('402')) {
    console.error('  Insufficient credits. Add credits to your PixelLab account.');
  } else if (error.message.includes('429')) {
    console.error('  Rate limited. Wait and try again.');
  }
  process.exit(1);
});
