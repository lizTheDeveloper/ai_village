/**
 * Generate Combat Animations
 *
 * Reads a combat recording and generates pixel art animations
 * using the PixelLab MCP tools for each unique combat action.
 *
 * This script:
 * 1. Loads a combat recording JSON
 * 2. Creates PixelLab characters for each combatant
 * 3. Generates animations for unique combat actions
 * 4. Saves results to an animations manifest
 *
 * Usage:
 *   npx tsx demo/generate-combat-animations.ts <recording.json>
 *
 * Example:
 *   npx tsx demo/generate-combat-animations.ts demo/public/mock-recordings/fae-vs-angels.json
 *
 * Note: This script outputs instructions for using PixelLab MCP tools.
 * The actual generation happens via Claude Code's MCP integration.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface CombatRecording {
  recordingId: string;
  title: string;
  description: string;
  combatLog: CombatLogEntry[];
  combatants: Combatant[];
  background: Background;
  ecsMetadata?: {
    winner: string | null;
    outcome: string;
    usedRealCombatSystem: boolean;
  };
}

interface CombatLogEntry {
  tick: number;
  attacker: string;
  defender: string;
  action: string;
  weapon: string;
  bodyPart: string;
  damage: string;
  renderableOperation: {
    actor: string;
    actorType: string;
    action: string;
    weapon: string;
    target: string;
    spritePrompt: string;
  };
}

interface Combatant {
  name: string;
  type: string;
  color: string;
  weapons: Array<{ name: string; type: string; color: string }>;
}

interface Background {
  type: string;
  name: string;
  prompt: string;
  color: string;
}

interface AnimationJob {
  actor: string;
  actorType: string;
  action: string;
  weapon: string;
  spritePrompt: string;
  templateAnimation: string;
}

// ============================================================================
// ACTION TO ANIMATION MAPPING
// ============================================================================

/**
 * Map combat actions to PixelLab animation templates
 * Available templates from mcp__pixellab__animate_character:
 * - backflip, breathing-idle, cross-punch, crouched-walking, crouching
 * - drinking, falling-back-death, fight-stance-idle-8-frames, fireball
 * - flying-kick, front-flip, getting-up, high-kick, hurricane-kick
 * - jumping-1/2, lead-jab, leg-sweep, picking-up, pull-heavy-object
 * - pushing, roundhouse-kick, running-*, running-slide, sad-walk
 * - scary-walk, surprise-uppercut, taking-punch, throw-object
 * - two-footed-jump, walk, walking-*
 */
function mapActionToTemplate(action: string, weaponType?: string): string {
  const lowerAction = action.toLowerCase();

  // Thrusting/stabbing actions
  if (lowerAction.includes('thrust') || lowerAction.includes('stab') || lowerAction.includes('jab')) {
    return 'lead-jab';
  }

  // Slashing/sweeping actions
  if (lowerAction.includes('slash') || lowerAction.includes('sweep') || lowerAction.includes('swing')) {
    return 'roundhouse-kick'; // Sweeping motion
  }

  // Bashing/crushing actions
  if (lowerAction.includes('bash') || lowerAction.includes('smash') || lowerAction.includes('crush')) {
    return 'cross-punch';
  }

  // Special attacks
  if (lowerAction.includes('kick')) {
    return 'high-kick';
  }

  if (lowerAction.includes('uppercut')) {
    return 'surprise-uppercut';
  }

  // Magic/energy attacks
  if (lowerAction.includes('phase') || lowerAction.includes('warp') || lowerAction.includes('transmute')) {
    return 'fireball';
  }

  if (lowerAction.includes('smite') || lowerAction.includes('consecrate') || lowerAction.includes('purif')) {
    return 'fireball';
  }

  if (lowerAction.includes('lash') || lowerAction.includes('tentacle')) {
    return 'leg-sweep';
  }

  if (lowerAction.includes('inscribe') || lowerAction.includes('devour') || lowerAction.includes('annotate')) {
    return 'fireball';
  }

  // Movement-based attacks
  if (lowerAction.includes('charge') || lowerAction.includes('lunge')) {
    return 'flying-kick';
  }

  if (lowerAction.includes('trample') || lowerAction.includes('gouge')) {
    return 'running-6-frames';
  }

  if (lowerAction.includes('eviscerate')) {
    return 'hurricane-kick';
  }

  // Defensive actions
  if (lowerAction.includes('block') || lowerAction.includes('defend') || lowerAction.includes('parry')) {
    return 'fight-stance-idle-8-frames';
  }

  if (lowerAction.includes('dodge') || lowerAction.includes('evade')) {
    return 'running-slide';
  }

  // Death/defeat
  if (lowerAction.includes('fall') || lowerAction.includes('defeat') || lowerAction.includes('death')) {
    return 'falling-back-death';
  }

  // Default based on weapon type
  if (weaponType) {
    const lowerWeapon = weaponType.toLowerCase();
    if (lowerWeapon.includes('sword') || lowerWeapon.includes('blade')) {
      return 'lead-jab';
    }
    if (lowerWeapon.includes('axe') || lowerWeapon.includes('mace')) {
      return 'cross-punch';
    }
    if (lowerWeapon.includes('spear') || lowerWeapon.includes('trident')) {
      return 'lead-jab';
    }
  }

  // Generic attack fallback
  return 'cross-punch';
}

// ============================================================================
// BUILD CHARACTER DESCRIPTION
// ============================================================================

function buildCharacterDescription(combatant: Combatant): string {
  const type = combatant.type.replace(/_/g, ' ');

  // Build description based on type
  switch (combatant.type) {
    case 'transcendent_fae':
      return `ethereal fairy creature with iridescent wings, glowing with magical energy, ${combatant.color} coloring, fantasy sprite`;

    case 'celestial_angel':
      return `divine angel with golden wings and halo, radiant white robes, holy warrior, ${combatant.color} coloring`;

    case 'tentacle_book_monster':
      return `eldritch horror made of ancient books with tentacle pages, ink dripping, dark magical tome creature, ${combatant.color} coloring`;

    case 'weaponized_deer':
      return `fierce deer holding a rusty machete in its mouth, battle-scarred, wild eyes, ${combatant.color} coloring`;

    case 'gladiator':
      return `roman gladiator in ${combatant.color} armor, muscular warrior, battle ready, ancient fighter`;

    default:
      return `${type}, ${combatant.color} coloring, fantasy creature, combat ready`;
  }
}

// ============================================================================
// EXTRACT UNIQUE ACTIONS
// ============================================================================

function extractUniqueActions(recording: CombatRecording): AnimationJob[] {
  const seenActions = new Set<string>();
  const jobs: AnimationJob[] = [];

  for (const entry of recording.combatLog) {
    const op = entry.renderableOperation;
    const key = `${op.actorType}|${op.action}|${op.weapon}`;

    if (!seenActions.has(key)) {
      seenActions.add(key);

      // Find combatant for this actor
      const combatant = recording.combatants.find(
        (c) => c.name === op.actor || c.type === op.actorType
      );

      const weapon = combatant?.weapons.find((w) => w.name === op.weapon);
      const templateAnimation = mapActionToTemplate(op.action, weapon?.type);

      jobs.push({
        actor: op.actor,
        actorType: op.actorType,
        action: op.action,
        weapon: op.weapon,
        spritePrompt: op.spritePrompt,
        templateAnimation,
      });
    }
  }

  return jobs;
}

// ============================================================================
// GENERATE ANIMATION MANIFEST
// ============================================================================

function generateAnimationManifest(recording: CombatRecording): {
  characters: Array<{
    name: string;
    type: string;
    description: string;
    pixelLabParams: object;
  }>;
  animations: Array<{
    actor: string;
    action: string;
    weapon: string;
    templateAnimation: string;
    actionDescription: string;
  }>;
  background: {
    prompt: string;
    fallbackColor: string;
  };
} {
  // Build character creation params
  const characters = recording.combatants.map((combatant) => ({
    name: combatant.name,
    type: combatant.type,
    description: buildCharacterDescription(combatant),
    pixelLabParams: {
      description: buildCharacterDescription(combatant),
      name: combatant.name,
      size: 48,
      n_directions: 8,
      view: 'high top-down',
      detail: 'high detail',
      shading: 'detailed shading',
      outline: 'single color black outline',
    },
  }));

  // Extract unique actions and map to animations
  const actionJobs = extractUniqueActions(recording);
  const animations = actionJobs.map((job) => ({
    actor: job.actor,
    action: job.action,
    weapon: job.weapon,
    templateAnimation: job.templateAnimation,
    actionDescription: `${job.action} with ${job.weapon}`,
  }));

  return {
    characters,
    animations,
    background: {
      prompt: recording.background.prompt,
      fallbackColor: recording.background.color,
    },
  };
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx demo/generate-combat-animations.ts <recording.json>');
    console.log('\nAvailable recordings:');
    const recordingsDir = path.join(import.meta.dirname, 'public', 'mock-recordings');
    const files = fs.readdirSync(recordingsDir).filter((f) => f.endsWith('.json'));
    files.forEach((f) => console.log(`  - ${f}`));
    process.exit(0);
  }

  const inputPath = args[0]!;
  const fullPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  console.log(`[AnimGen] Loading recording: ${path.basename(fullPath)}`);
  const recording: CombatRecording = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));

  console.log(`[AnimGen] Title: ${recording.title}`);
  console.log(`[AnimGen] Combatants: ${recording.combatants.map((c) => c.name).join(' vs ')}`);
  console.log(`[AnimGen] Combat log entries: ${recording.combatLog.length}`);

  // Generate animation manifest
  const manifest = generateAnimationManifest(recording);

  console.log(`\n[AnimGen] Animation Manifest Generated:`);
  console.log(`  Characters: ${manifest.characters.length}`);
  console.log(`  Unique animations: ${manifest.animations.length}`);

  // Save manifest
  const outputPath = fullPath.replace('.json', '-animations.json');
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\n[AnimGen] Saved manifest to: ${path.basename(outputPath)}`);

  // Print PixelLab MCP instructions
  console.log('\n' + '='.repeat(70));
  console.log('PIXELLAB MCP COMMANDS TO RUN');
  console.log('='.repeat(70));

  console.log('\n## Step 1: Create Characters\n');
  for (const char of manifest.characters) {
    console.log(`### ${char.name}`);
    console.log('```');
    console.log(`mcp__pixellab__create_character(`);
    console.log(`  description: "${char.description}",`);
    console.log(`  name: "${char.name}",`);
    console.log(`  size: 48,`);
    console.log(`  n_directions: 8,`);
    console.log(`  view: "high top-down",`);
    console.log(`  detail: "high detail"`);
    console.log(`)`);
    console.log('```\n');
  }

  console.log('\n## Step 2: Generate Animations (after characters complete)\n');
  for (const anim of manifest.animations) {
    console.log(`### ${anim.actor} - ${anim.action}`);
    console.log('```');
    console.log(`mcp__pixellab__animate_character(`);
    console.log(`  character_id: "<${anim.actor.replace(/\s+/g, '_')}_character_id>",`);
    console.log(`  template_animation_id: "${anim.templateAnimation}",`);
    console.log(`  action_description: "${anim.actionDescription}"`);
    console.log(`)`);
    console.log('```\n');
  }

  console.log('\n## Step 3: Generate Background\n');
  console.log('```');
  console.log(`mcp__pixellab__create_isometric_tile(`);
  console.log(`  description: "${manifest.background.prompt}",`);
  console.log(`  size: 64,`);
  console.log(`  tile_shape: "thick tile"`);
  console.log(`)`);
  console.log('```\n');

  console.log('='.repeat(70));
  console.log('\nNote: Run the create_character commands first, wait for them to complete,');
  console.log('then use the returned character_id values to run animate_character.\n');
}

main();
