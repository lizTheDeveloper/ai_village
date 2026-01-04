#!/usr/bin/env tsx
/**
 * animate-combat.ts - Generate animated combat replays from combat logs
 *
 * Usage:
 *   ./scripts/animate-combat.ts \
 *     --combat-log "./recordings/gladiator_match_001.json" \
 *     --output-dir "./assets/combat_replays/match_001/"
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  CombatRecording,
  CombatReplay,
  CombatAnimation,
} from '../packages/renderer/src/production/CombatAnimator.js';

interface CLIOptions {
  combatLog: string;
  outputDir: string;
  pixellab?: boolean; // Use PixelLab MCP for generation
  cacheDir?: string; // Cache directory for animations
  parallel?: boolean; // Generate animations in parallel
}

async function main() {
  const program = new Command();

  program
    .name('animate-combat')
    .description('Generate animated combat replays from combat logs with PixelLab integration')
    .requiredOption('--combat-log <path>', 'Path to combat recording JSON file')
    .requiredOption('--output-dir <path>', 'Output directory for replay assets')
    .option('--pixellab', 'Use PixelLab MCP for animation generation (default: true)', true)
    .option('--cache-dir <path>', 'Cache directory for generated animations', './cache/combat_animations')
    .option('--parallel', 'Generate animations in parallel (faster but more resource-intensive)')
    .parse(process.argv);

  const options = program.opts<CLIOptions>();

  console.log('=== Combat Animation Generator ===');
  console.log(`Combat Log: ${options.combatLog}`);
  console.log(`Output: ${options.outputDir}`);
  console.log('');

  // Step 1: Load combat recording
  console.log('[1/5] Loading combat recording...');
  const recording = await loadCombatRecording(options.combatLog);
  console.log(`  Combat: ${recording.combatName}`);
  console.log(`  Duration: ${recording.endTick - recording.startTick} ticks`);
  console.log(`  Events: ${recording.events.length}`);
  console.log(`  Participants: ${recording.participants.join(', ')}`);
  console.log('');

  // Step 2: Extract unique operations
  console.log('[2/5] Analyzing combat operations...');
  const operations = extractUniqueOperations(recording);
  console.log(`  Unique operations: ${operations.size}`);
  for (const [hash, op] of operations.entries()) {
    console.log(`    - ${op.actor}: ${op.action} with ${op.weapon}`);
  }
  console.log('');

  // Step 3: Create characters in PixelLab
  console.log('[3/5] Creating characters...');
  const characters = await createCharacters(recording.participants);
  console.log(`  Created ${characters.size} characters`);
  console.log('');

  // Step 4: Generate animations
  console.log('[4/5] Generating animations...');
  const animations = await generateAnimations(
    operations,
    characters,
    options.parallel || false
  );
  console.log(`  Generated ${animations.size} animations`);
  console.log('');

  // Step 5: Build replay timeline
  console.log('[5/5] Building replay timeline...');
  const replay = buildReplay(recording, animations);
  console.log(`  Timeline frames: ${replay.timeline.length}`);
  console.log('');

  // Save replay data
  await fs.mkdir(options.outputDir, { recursive: true });
  await saveReplayData(replay, path.join(options.outputDir, 'replay.json'));
  console.log(`✓ Replay saved to: ${options.outputDir}`);
  console.log('');

  console.log('=== Combat Animation Complete ===');
  console.log('Replay ready for playback! ⚔️');
}

/**
 * Load combat recording from JSON file
 */
async function loadCombatRecording(filePath: string): Promise<CombatRecording> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Extract unique renderable operations
 */
function extractUniqueOperations(
  recording: CombatRecording
): Map<string, any> {
  const operations = new Map();

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

  return operations;
}

/**
 * Create characters in PixelLab
 */
async function createCharacters(participants: string[]): Promise<Map<string, string>> {
  const characters = new Map<string, string>();

  for (const actorId of participants) {
    console.log(`  Creating character: ${actorId}`);

    // Extract character description from actor ID
    // e.g., "Gladiator Red" -> "gladiator in red armor"
    const description = buildCharacterDescription(actorId);

    console.log(`    Description: ${description}`);

    // TODO: Call PixelLab MCP create_character
    // const result = await mcp__pixellab__create_character({
    //   description,
    //   n_directions: 8,
    //   size: 48,
    //   view: 'high top-down'
    // });

    // For now, use placeholder
    const characterId = `char_${actorId.toLowerCase().replace(/\s+/g, '_')}`;
    console.log(`    Character ID: ${characterId}`);

    characters.set(actorId, characterId);
  }

  return characters;
}

/**
 * Build character description from actor name
 */
function buildCharacterDescription(actorName: string): string {
  // Parse actor name (e.g., "Gladiator Red" -> gladiator in red armor)
  const parts = actorName.toLowerCase().split(' ');

  if (parts.length >= 2 && parts[0] === 'gladiator') {
    const color = parts[1];
    return `gladiator in ${color} armor`;
  }

  return actorName.toLowerCase();
}

/**
 * Generate animations for all operations
 */
async function generateAnimations(
  operations: Map<string, any>,
  characters: Map<string, string>,
  parallel: boolean
): Promise<Map<string, any>> {
  const animations = new Map();

  if (parallel) {
    console.log('  Generating all animations in parallel...');
    const promises = Array.from(operations.entries()).map(([hash, op]) =>
      generateAnimation(hash, op, characters)
    );
    const results = await Promise.all(promises);
    results.forEach(([hash, animation]) => animations.set(hash, animation));
  } else {
    for (const [hash, op] of operations.entries()) {
      const [_, animation] = await generateAnimation(hash, op, characters);
      animations.set(hash, animation);
    }
  }

  return animations;
}

/**
 * Generate single animation
 */
async function generateAnimation(
  hash: string,
  operation: any,
  characters: Map<string, string>
): Promise<[string, any]> {
  console.log(`    Generating: ${operation.actor} - ${operation.action} with ${operation.weapon}`);

  const characterId = characters.get(operation.actor);
  if (!characterId) {
    throw new Error(`Character not found: ${operation.actor}`);
  }

  // Build action description
  const actionDescription = `${operation.action} with ${operation.weapon}`;

  // Map action to template
  const templateId = mapActionToTemplate(operation.action);

  console.log(`      Action: ${actionDescription}`);
  console.log(`      Template: ${templateId}`);

  // TODO: Call PixelLab MCP animate_character
  // const result = await mcp__pixellab__animate_character({
  //   character_id: characterId,
  //   action_description: actionDescription,
  //   template_animation_id: templateId
  // });

  // For now, return placeholder
  const animation = {
    operationHash: hash,
    actor: operation.actor,
    action: operation.action,
    weapon: operation.weapon,
    characterId,
    animationName: actionDescription,
    templateId,
    frameCount: 8,
    frameRate: 12,
    generatedAt: Date.now(),
  };

  return [hash, animation];
}

/**
 * Map combat action to PixelLab animation template
 */
function mapActionToTemplate(action: string): string {
  const actionLower = action.toLowerCase();

  if (actionLower.includes('thrust') || actionLower.includes('stab')) {
    return 'lead-jab';
  }

  if (actionLower.includes('slash') || actionLower.includes('swing')) {
    return 'roundhouse-kick';
  }

  if (actionLower.includes('bash') || actionLower.includes('smash')) {
    return 'cross-punch';
  }

  if (actionLower.includes('block') || actionLower.includes('defend')) {
    return 'fight-stance-idle-8-frames';
  }

  if (actionLower.includes('dodge') || actionLower.includes('evade')) {
    return 'running-slide';
  }

  return 'cross-punch'; // Default
}

/**
 * Build replay timeline
 */
function buildReplay(recording: CombatRecording, animations: Map<string, any>): any {
  const timeline = [];

  // Simple timeline: just mark when each animation should play
  for (const event of recording.events) {
    if (event.renderableOperation) {
      const hash = `${event.renderableOperation.actor}_${event.renderableOperation.action}_${event.renderableOperation.weapon}`
        .toLowerCase()
        .replace(/\s+/g, '_');

      timeline.push({
        tick: event.tick,
        actor: event.actor,
        animationHash: hash,
        target: event.target,
        damage: event.damage,
      });
    }
  }

  return {
    recordingId: recording.recordingId,
    combatName: recording.combatName,
    animations: Object.fromEntries(animations),
    timeline,
  };
}

/**
 * Save replay data to JSON
 */
async function saveReplayData(replay: any, outputPath: string): Promise<void> {
  await fs.writeFile(outputPath, JSON.stringify(replay, null, 2), 'utf-8');
  console.log(`  Saved replay data: ${outputPath}`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
