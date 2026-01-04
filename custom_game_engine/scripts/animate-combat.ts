#!/usr/bin/env tsx
/**
 * animate-combat.ts - Generate animated combat replays from combat logs
 *
 * Uses PixelLab API directly to generate character sprites and animations.
 *
 * Usage:
 *   PIXELLAB_API_TOKEN=your_token ./scripts/animate-combat.ts \
 *     --combat-log "./examples/gladiator_match_001.json" \
 *     --output-dir "./assets/combat_replays/match_001/"
 */

import { Command } from 'commander';
import {
  CombatAnimator,
  loadCombatRecording,
} from '../packages/renderer/src/production/CombatAnimator.js';

interface CLIOptions {
  combatLog: string;
  outputDir: string;
  apiToken?: string;
  spriteSize?: string;
  frameCount?: string;
  dryRun?: boolean;
}

async function main() {
  const program = new Command();

  program
    .name('animate-combat')
    .description('Generate animated combat replays from combat logs using PixelLab API')
    .requiredOption('--combat-log <path>', 'Path to combat recording JSON file')
    .requiredOption('--output-dir <path>', 'Output directory for replay assets')
    .option('--api-token <token>', 'PixelLab API token (or set PIXELLAB_API_TOKEN env var)')
    .option('--sprite-size <size>', 'Character sprite size in pixels', '64')
    .option('--frame-count <count>', 'Number of animation frames (2-20)', '8')
    .option('--dry-run', 'Parse combat log and show what would be generated (no API calls)')
    .parse(process.argv);

  const options = program.opts<CLIOptions>();

  // Get API token
  const apiToken = options.apiToken || process.env.PIXELLAB_API_TOKEN;

  if (!apiToken && !options.dryRun) {
    console.error('Error: PixelLab API token required.');
    console.error('  Set PIXELLAB_API_TOKEN environment variable');
    console.error('  Or use --api-token <token>');
    console.error('  Or use --dry-run to preview without API calls');
    process.exit(1);
  }

  console.log('=== Combat Animation Generator ===');
  console.log(`Combat Log: ${options.combatLog}`);
  console.log(`Output: ${options.outputDir}`);
  console.log(`Sprite Size: ${options.spriteSize}px`);
  console.log(`Frame Count: ${options.frameCount}`);
  if (options.dryRun) {
    console.log(`Mode: DRY RUN (no API calls)`);
  }
  console.log('');

  // Load combat recording
  console.log('[1/2] Loading combat recording...');
  const recording = await loadCombatRecording(options.combatLog);

  console.log(`  Combat: ${recording.combatName}`);
  console.log(`  Duration: ${recording.endTick - recording.startTick} ticks`);
  console.log(`  Events: ${recording.events.length}`);
  console.log(`  Participants: ${recording.participants.map((p) => p.name).join(', ')}`);
  console.log('');

  // Show what will be generated
  const operations = new Map<string, any>();
  for (const event of recording.events) {
    if (event.renderableOperation) {
      const hash = `${event.renderableOperation.actor}_${event.renderableOperation.action}_${event.renderableOperation.weapon}`
        .toLowerCase()
        .replace(/\s+/g, '_');
      if (!operations.has(hash)) {
        operations.set(hash, event.renderableOperation);
      }
    }
  }

  console.log('Operations to animate:');
  for (const [hash, op] of operations.entries()) {
    console.log(`  - ${op.actor}: ${op.action} with ${op.weapon}`);
  }
  console.log('');

  if (options.dryRun) {
    console.log('=== Dry Run Complete ===');
    console.log(`Would generate ${recording.participants.length} character sprites`);
    console.log(`Would generate ${operations.size} unique animations`);
    console.log('');
    console.log('Run without --dry-run to generate assets.');
    return;
  }

  // Create animator and generate replay
  console.log('[2/2] Generating replay with PixelLab API...');
  console.log('');

  const animator = new CombatAnimator(apiToken, {
    spriteSize: parseInt(options.spriteSize || '64', 10),
    frameCount: parseInt(options.frameCount || '8', 10),
    view: 'high top-down',
    outputDir: options.outputDir,
  });

  const replay = await animator.generateReplay(recording);

  // Save replay to disk
  console.log('\nSaving replay assets...');
  await animator.saveReplay(replay, options.outputDir);

  console.log('');
  console.log('=== Combat Animation Complete ===');
  console.log(`Output: ${options.outputDir}`);
  console.log(`  sprites/     - Character base sprites`);
  console.log(`  animations/  - Animation frame sequences`);
  console.log(`  replay.json  - Timeline and metadata`);
  console.log('');
  console.log('Replay ready for playback! ⚔️');
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
