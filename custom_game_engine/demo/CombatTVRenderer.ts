/**
 * CombatTVRenderer - Generate TV-ready combat replays with PixelLab animations
 *
 * This is a reusable pipeline that:
 * 1. Analyzes a combat recording to extract all unique character+action combinations
 * 2. Detects which animations are missing
 * 3. Generates characters and animations via PixelLab MCP
 * 4. Downloads all assets
 * 5. Creates a complete manifest for playback
 *
 * Usage:
 *   const renderer = new CombatTVRenderer();
 *   const result = await renderer.renderForTV(combatRecording);
 *   // result contains manifest, asset paths, and any generation jobs
 *
 * Or via CLI:
 *   npx tsx demo/CombatTVRenderer.ts demo/public/mock-recordings/fae-vs-angels.json
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface CombatRecording {
  recordingId: string;
  title: string;
  description: string;
  combatLog: CombatLogEntry[];
  combatants: Combatant[];
  background: BackgroundConfig;
  frames: CombatFrame[];
  ecsMetadata?: {
    winner: string | null;
    outcome: string;
  };
}

export interface CombatLogEntry {
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

export interface Combatant {
  name: string;
  type: string;
  color: string;
  weapons: Array<{ name: string; type: string; color: string }>;
}

export interface BackgroundConfig {
  type: string;
  name: string;
  prompt: string;
  color: string;
}

export interface CombatFrame {
  tick: number;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  entities: Array<{
    entityId: string;
    entityType: string;
    x: number;
    y: number;
    facingAngle: number;
    animation: { state: string; frame: number };
  }>;
}

export interface AnimationRequirement {
  characterId: string;
  characterType: string;
  characterName: string;
  characterDescription: string;
  action: string;
  actionDescription: string;
  weapon: string;
  templateAnimation: string;
  animationName: string; // Unique name for this animation
}

export interface TVManifest {
  combatId: string;
  title: string;
  generatedAt: string;
  pixelLabCharacters: Record<string, string>; // characterId -> pixelLabId
  characters: Record<string, CharacterManifest>;
  background: {
    tileId?: string;
    name: string;
    description: string;
    path: string;
    size: number;
    fallbackColor: string;
  };
  actionMapping: Record<string, string>; // action -> animationName
  recordingFile: string;
}

export interface CharacterManifest {
  name: string;
  type: string;
  description: string;
  rotations: Record<string, string>; // direction -> path
  animations: Record<string, AnimationManifest>;
}

export interface AnimationManifest {
  template: string;
  description: string;
  frames: number;
  directions: string[];
  path: string; // path template with {direction} and {frame}
}

export interface GenerationJob {
  type: 'character' | 'animation' | 'background';
  id: string;
  description: string;
  params: Record<string, unknown>;
  status: 'pending' | 'queued' | 'completed' | 'failed';
  pixelLabJobId?: string;
  pixelLabCharacterId?: string;
}

export interface TVRenderResult {
  manifest: TVManifest;
  outputDir: string;
  generationJobs: GenerationJob[];
  missingAnimations: AnimationRequirement[];
  mcpCommands: string[]; // Commands to run via MCP
}

// ============================================================================
// ANIMATION TEMPLATE MAPPING
// ============================================================================

/**
 * Map combat action verbs to PixelLab animation templates
 * Each unique action should get a distinct animation for variety
 */
const ACTION_TO_TEMPLATE: Record<string, string> = {
  // Thrusting/stabbing
  'thrusts': 'lead-jab',
  'stabs': 'lead-jab',
  'jabs': 'lead-jab',
  'pierces': 'lead-jab',

  // Slashing/sweeping
  'slashes': 'roundhouse-kick',
  'sweeps': 'leg-sweep',
  'swings': 'roundhouse-kick',
  'cuts': 'roundhouse-kick',

  // Bashing/crushing
  'bashes': 'cross-punch',
  'smashes': 'cross-punch',
  'crushes': 'cross-punch',
  'pounds': 'cross-punch',

  // Kicks
  'kicks': 'high-kick',
  'stomps': 'high-kick',

  // Special attacks
  'uppercuts': 'surprise-uppercut',
  'backflips': 'backflip',
  'spins': 'hurricane-kick',

  // Magic/energy - give each a different template for variety
  'reality-warps around': 'fireball',
  'phase-shifts through': 'running-slide',
  'transmutes spacetime against': 'hurricane-kick',
  'enchants the air to strike': 'throw-object',
  'warps': 'fireball',
  'blasts': 'fireball',
  'channels': 'fireball',

  // Divine attacks - variety
  'smites': 'high-kick',
  'consecrates wrath upon': 'surprise-uppercut',
  'channels divine fury at': 'cross-punch',
  'purifies violently': 'flying-kick',
  'blesses': 'fireball',

  // Tentacle/creature attacks
  'lashes': 'leg-sweep',
  'constricts': 'leg-sweep',
  'inscribes forbidden knowledge on': 'fireball',
  'devours the sanity of': 'hurricane-kick',
  'annotates painfully': 'throw-object',

  // Animal attacks
  'gores': 'flying-kick',
  'tramples': 'running-6-frames',
  'slices': 'roundhouse-kick',
  'eviscerates': 'hurricane-kick',

  // Movement-based
  'charges': 'flying-kick',
  'lunges': 'flying-kick',
  'leaps': 'jumping-1',

  // Defensive
  'blocks': 'fight-stance-idle-8-frames',
  'parries': 'fight-stance-idle-8-frames',
  'dodges': 'running-slide',

  // Death/defeat
  'falls': 'falling-back-death',
  'collapses': 'falling-back-death',
};

/**
 * Get animation template for an action, with fallback logic
 */
function getTemplateForAction(action: string): string {
  // Direct match
  if (ACTION_TO_TEMPLATE[action]) {
    return ACTION_TO_TEMPLATE[action];
  }

  // Partial match
  const lowerAction = action.toLowerCase();
  for (const [key, template] of Object.entries(ACTION_TO_TEMPLATE)) {
    if (lowerAction.includes(key) || key.includes(lowerAction)) {
      return template;
    }
  }

  // Fallback based on keywords
  if (lowerAction.includes('magic') || lowerAction.includes('spell') || lowerAction.includes('cast')) {
    return 'fireball';
  }
  if (lowerAction.includes('punch') || lowerAction.includes('hit') || lowerAction.includes('strike')) {
    return 'cross-punch';
  }
  if (lowerAction.includes('kick')) {
    return 'high-kick';
  }
  if (lowerAction.includes('dodge') || lowerAction.includes('evade')) {
    return 'running-slide';
  }

  // Default
  return 'cross-punch';
}

// ============================================================================
// CHARACTER DESCRIPTION BUILDER
// ============================================================================

const CHARACTER_DESCRIPTIONS: Record<string, (color: string) => string> = {
  'transcendent_fae': (color) =>
    `ethereal fairy creature with iridescent butterfly wings, glowing with magical energy, translucent ${color} skin, mystical aura, fantasy sprite`,

  'celestial_angel': (color) =>
    `divine angel with large golden feathered wings and glowing halo, radiant white robes with ${color} trim, holy warrior, celestial being`,

  'tentacle_book_monster': (color) =>
    `eldritch horror made of ancient leather-bound books with writhing tentacle pages, ink dripping, glowing ${color} runes, dark magical tome creature, Lovecraftian`,

  'weaponized_deer': (color) =>
    `fierce battle deer with ${color} fur, holding a rusty machete in its mouth, battle scars, wild determined eyes, antlers decorated with trophies`,

  'gladiator': (color) =>
    `roman gladiator warrior in ${color} leather armor, muscular, battle-ready stance, ancient fighter with scars`,

  'demon': (color) =>
    `fearsome demon with ${color} skin, horns, glowing eyes, dark flames, infernal creature`,

  'wizard': (color) =>
    `powerful wizard in ${color} robes, long beard, magical staff, arcane symbols floating around`,

  'knight': (color) =>
    `armored knight in ${color} plate armor, sword and shield, heraldic symbols, noble warrior`,

  'dragon': (color) =>
    `fierce dragon with ${color} scales, large wings, breathing fire, reptilian eyes, powerful claws`,

  'undead': (color) =>
    `undead skeleton warrior with ${color} ghostly glow, ancient armor, hollow eyes, death knight`,
};

function buildCharacterDescription(combatant: Combatant): string {
  const descBuilder = CHARACTER_DESCRIPTIONS[combatant.type];
  if (descBuilder) {
    return descBuilder(combatant.color);
  }
  // Generic fallback
  const type = combatant.type.replace(/_/g, ' ');
  return `${type} creature, ${combatant.color} coloring, fantasy character, combat ready, detailed pixel art`;
}

// ============================================================================
// COMBAT TV RENDERER
// ============================================================================

export class CombatTVRenderer {
  private outputBaseDir: string;

  constructor(outputBaseDir: string = './demo/public/combat-assets') {
    this.outputBaseDir = outputBaseDir;
  }

  /**
   * Main entry point - analyze recording and generate TV-ready package
   */
  async renderForTV(recording: CombatRecording): Promise<TVRenderResult> {
    const combatId = this.generateCombatId(recording);
    const outputDir = path.join(this.outputBaseDir, combatId);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`COMBAT TV RENDERER - ${recording.title}`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Combat ID: ${combatId}`);
    console.log(`Output: ${outputDir}`);

    // Step 1: Extract all unique animation requirements
    console.log('\n[1/5] Analyzing combat log for animation requirements...');
    const requirements = this.extractAnimationRequirements(recording);
    console.log(`  Found ${requirements.length} unique animation requirements`);

    // Step 2: Check existing manifest for what's already generated
    console.log('\n[2/5] Checking existing assets...');
    const existingManifest = this.loadExistingManifest(outputDir);
    const missingAnimations = this.findMissingAnimations(requirements, existingManifest);
    console.log(`  Already have: ${requirements.length - missingAnimations.length} animations`);
    console.log(`  Missing: ${missingAnimations.length} animations`);

    // Step 3: Generate MCP commands for missing assets
    console.log('\n[3/5] Generating PixelLab MCP commands...');
    const { jobs, commands } = this.generateMCPCommands(recording, missingAnimations, existingManifest);
    console.log(`  Generated ${commands.length} MCP commands`);

    // Step 4: Build manifest
    console.log('\n[4/5] Building manifest...');
    const manifest = this.buildManifest(recording, combatId, requirements, existingManifest);

    // Step 5: Save manifest template
    console.log('\n[5/5] Saving manifest template...');
    fs.mkdirSync(outputDir, { recursive: true });
    const manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`  Saved: ${manifestPath}`);

    // Output MCP commands
    if (commands.length > 0) {
      console.log('\n' + '='.repeat(70));
      console.log('PIXELLAB MCP COMMANDS TO GENERATE MISSING ANIMATIONS');
      console.log('='.repeat(70));
      console.log('\nRun these commands to generate the missing animations:\n');
      commands.forEach((cmd, i) => {
        console.log(`// ${i + 1}. ${jobs[i]?.description || 'Command'}`);
        console.log(cmd);
        console.log('');
      });
    } else {
      console.log('\n All animations already generated! Ready for TV.');
    }

    return {
      manifest,
      outputDir,
      generationJobs: jobs,
      missingAnimations,
      mcpCommands: commands,
    };
  }

  /**
   * Extract all unique animation requirements from combat log
   */
  private extractAnimationRequirements(recording: CombatRecording): AnimationRequirement[] {
    const seen = new Set<string>();
    const requirements: AnimationRequirement[] = [];

    for (const entry of recording.combatLog) {
      const op = entry.renderableOperation;
      if (!op) continue;

      // Find combatant info
      const combatant = recording.combatants.find(
        c => c.name === op.actor || c.type === op.actorType
      );
      if (!combatant) continue;

      // Create unique key for this character+action combo
      const key = `${op.actorType}:${op.action}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Generate animation name from action
      const animationName = this.actionToAnimationName(op.action);
      const template = getTemplateForAction(op.action);

      requirements.push({
        characterId: this.typeToCharacterId(op.actorType),
        characterType: op.actorType,
        characterName: combatant.name,
        characterDescription: buildCharacterDescription(combatant),
        action: op.action,
        actionDescription: `${op.action} with ${op.weapon}`,
        weapon: op.weapon,
        templateAnimation: template,
        animationName,
      });
    }

    return requirements;
  }

  /**
   * Convert action string to valid animation name
   */
  private actionToAnimationName(action: string): string {
    return action
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Convert entity type to character ID
   */
  private typeToCharacterId(type: string): string {
    return type.toLowerCase().replace(/_/g, '-');
  }

  /**
   * Load existing manifest if it exists
   */
  private loadExistingManifest(outputDir: string): TVManifest | null {
    const manifestPath = path.join(outputDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Find which animations are missing from existing manifest
   */
  private findMissingAnimations(
    requirements: AnimationRequirement[],
    existingManifest: TVManifest | null
  ): AnimationRequirement[] {
    if (!existingManifest) {
      return requirements; // All missing
    }

    return requirements.filter(req => {
      const charManifest = existingManifest.characters[req.characterId];
      if (!charManifest) return true; // Character missing
      if (!charManifest.animations[req.animationName]) return true; // Animation missing
      return false;
    });
  }

  /**
   * Generate MCP commands for creating missing assets
   */
  private generateMCPCommands(
    recording: CombatRecording,
    missingAnimations: AnimationRequirement[],
    existingManifest: TVManifest | null
  ): { jobs: GenerationJob[]; commands: string[] } {
    const jobs: GenerationJob[] = [];
    const commands: string[] = [];

    // Group by character
    const byCharacter = new Map<string, AnimationRequirement[]>();
    for (const req of missingAnimations) {
      if (!byCharacter.has(req.characterId)) {
        byCharacter.set(req.characterId, []);
      }
      byCharacter.get(req.characterId)!.push(req);
    }

    // Check which characters need to be created
    const existingCharacters = existingManifest?.pixelLabCharacters || {};

    for (const [charId, anims] of byCharacter) {
      const firstAnim = anims[0]!;

      // Create character if not exists
      if (!existingCharacters[charId]) {
        const job: GenerationJob = {
          type: 'character',
          id: charId,
          description: `Create character: ${firstAnim.characterName}`,
          params: {
            description: firstAnim.characterDescription,
            name: firstAnim.characterName,
            size: 48,
            n_directions: 8,
            view: 'high top-down',
            detail: 'high detail',
            shading: 'detailed shading',
            outline: 'single color black outline',
          },
          status: 'pending',
        };
        jobs.push(job);

        commands.push(`mcp__pixellab__create_character({
  description: "${firstAnim.characterDescription}",
  name: "${firstAnim.characterName}",
  size: 48,
  n_directions: 8,
  view: "high top-down",
  detail: "high detail",
  shading: "detailed shading",
  outline: "single color black outline"
})`);
      }

      // Create animations for this character
      for (const anim of anims) {
        const job: GenerationJob = {
          type: 'animation',
          id: `${charId}:${anim.animationName}`,
          description: `Animate ${anim.characterName}: ${anim.action}`,
          params: {
            character_id: `<${charId}_character_id>`,
            template_animation_id: anim.templateAnimation,
            action_description: anim.actionDescription,
            animation_name: anim.animationName,
          },
          status: 'pending',
        };
        jobs.push(job);

        const charIdPlaceholder = existingCharacters[charId] || `<${charId}_character_id>`;
        commands.push(`mcp__pixellab__animate_character({
  character_id: "${charIdPlaceholder}",
  template_animation_id: "${anim.templateAnimation}",
  action_description: "${anim.actionDescription}",
  animation_name: "${anim.animationName}"
})`);
      }
    }

    // Background tile if needed
    if (!existingManifest?.background?.tileId) {
      const bgJob: GenerationJob = {
        type: 'background',
        id: 'background',
        description: `Create background: ${recording.background.name}`,
        params: {
          description: recording.background.prompt,
          size: 64,
          tile_shape: 'thick tile',
        },
        status: 'pending',
      };
      jobs.push(bgJob);

      commands.push(`mcp__pixellab__create_isometric_tile({
  description: "${recording.background.prompt}",
  size: 64,
  tile_shape: "thick tile"
})`);
    }

    return { jobs, commands };
  }

  /**
   * Build the manifest structure
   */
  private buildManifest(
    recording: CombatRecording,
    combatId: string,
    requirements: AnimationRequirement[],
    existingManifest: TVManifest | null
  ): TVManifest {
    const characters: Record<string, CharacterManifest> = {};
    const actionMapping: Record<string, string> = {};

    // Build character manifests
    for (const req of requirements) {
      if (!characters[req.characterId]) {
        const combatant = recording.combatants.find(c => c.type === req.characterType);
        characters[req.characterId] = {
          name: req.characterName,
          type: req.characterType,
          description: req.characterDescription,
          rotations: this.buildRotationPaths(req.characterId),
          animations: {},
        };
      }

      // Add animation
      characters[req.characterId].animations[req.animationName] = {
        template: req.templateAnimation,
        description: req.actionDescription,
        frames: 6, // Most animations are 6 frames
        directions: ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'],
        path: `${req.characterId}/animations/${req.templateAnimation}/{direction}/frame_{frame}.png`,
      };

      // Add action mapping
      actionMapping[req.action] = req.animationName;
    }

    // Merge with existing manifest
    if (existingManifest) {
      for (const [charId, charManifest] of Object.entries(existingManifest.characters)) {
        if (!characters[charId]) {
          characters[charId] = charManifest;
        } else {
          // Merge animations
          characters[charId].animations = {
            ...charManifest.animations,
            ...characters[charId].animations,
          };
        }
      }
    }

    return {
      combatId,
      title: recording.title,
      generatedAt: new Date().toISOString(),
      pixelLabCharacters: existingManifest?.pixelLabCharacters || {},
      characters,
      background: existingManifest?.background || {
        name: recording.background.name,
        description: recording.background.prompt,
        path: 'background/tile.png',
        size: 64,
        fallbackColor: recording.background.color,
      },
      actionMapping,
      recordingFile: `../mock-recordings/${combatId}.json`,
    };
  }

  /**
   * Build rotation sprite paths for a character
   */
  private buildRotationPaths(characterId: string): Record<string, string> {
    const directions = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
    const paths: Record<string, string> = {};
    for (const dir of directions) {
      paths[dir] = `${characterId}/rotations/${dir}.png`;
    }
    return paths;
  }

  /**
   * Generate a combat ID from the recording
   */
  private generateCombatId(recording: CombatRecording): string {
    // Try to extract from recordingId
    if (recording.recordingId) {
      const match = recording.recordingId.match(/real_combat_([^_]+)/);
      if (match) return match[1];
    }
    // Fallback: generate from combatants
    const types = recording.combatants.map(c => c.type.split('_')[0]).join('-vs-');
    return types;
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx demo/CombatTVRenderer.ts <recording.json>');
    console.log('\nThis will analyze the combat recording and output:');
    console.log('  1. A manifest.json with all required animations');
    console.log('  2. MCP commands to generate any missing animations');
    console.log('\nExample:');
    console.log('  npx tsx demo/CombatTVRenderer.ts demo/public/mock-recordings/fae-vs-angels.json');
    process.exit(0);
  }

  const inputPath = args[0]!;
  const fullPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath);

  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    process.exit(1);
  }

  console.log(`Loading: ${fullPath}`);
  const recording: CombatRecording = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));

  const renderer = new CombatTVRenderer();
  const result = await renderer.renderForTV(recording);

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Output directory: ${result.outputDir}`);
  console.log(`Missing animations: ${result.missingAnimations.length}`);
  console.log(`MCP commands to run: ${result.mcpCommands.length}`);

  if (result.missingAnimations.length > 0) {
    console.log('\nMissing animations:');
    for (const anim of result.missingAnimations) {
      console.log(`  - ${anim.characterName}: ${anim.action} (${anim.templateAnimation})`);
    }
  }
}

main().catch(console.error);
