/**
 * CombatAnimator - Generate pixel art animations from combat logs
 *
 * Uses PixelLab API directly to create animated combat replays from
 * recorded combat events with renderable operations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  PixelLabAPI,
  createPixelLabClient,
  type ViewAngle,
  type Direction,
} from './PixelLabAPI.js';

/** Combat log event with renderable operation */
export interface CombatLogEvent {
  tick: number;
  actor: string; // e.g., "Gladiator Red"
  action: string; // e.g., "thrusts", "bashes", "slashes"
  weapon?: string; // e.g., "scarlet spear", "azure mace"
  target?: string; // e.g., "Gladiator Blue's left leg"
  damage?: number;

  // Renderable operation for animation generation
  renderableOperation?: {
    actor: string;
    action: string;
    weapon: string;
    target: string;
    spritePrompt: string; // Full prompt for PixelLab
  };
}

/** Combat recording with all events */
export interface CombatRecording {
  recordingId: string;
  combatName: string;
  startTick: number;
  endTick: number;
  participants: CombatParticipant[];
  events: CombatLogEvent[];
  metadata?: {
    arena?: string;
    season?: string;
    episode?: string;
  };
}

/** Combat participant with appearance info */
export interface CombatParticipant {
  id: string;
  name: string;
  description: string; // Full description for PixelLab
  armorColor?: string;
  weapon?: string;
}

/** Generated character sprite */
export interface CharacterSprite {
  participantId: string;
  description: string;
  imageBase64: string; // Base64 PNG
  imageSize: { width: number; height: number };
  generatedAt: number;
}

/** Generated combat animation */
export interface CombatAnimation {
  operationHash: string; // Hash of action+weapon for caching
  actor: string;
  action: string;
  weapon?: string;

  // Animation frames
  frames: string[]; // Array of Base64 PNGs
  frameCount: number;
  frameRate: number;

  // Generation metadata
  generatedAt: number;
}

/** Combat replay with animations */
export interface CombatReplay {
  recordingId: string;
  combatName: string;
  characters: Map<string, CharacterSprite>; // participantId -> sprite
  animations: Map<string, CombatAnimation>; // operationHash -> animation
  timeline: CombatReplayFrame[];
}

/** Single frame in combat replay */
export interface CombatReplayFrame {
  tick: number;
  actors: {
    actorId: string;
    animationHash: string; // Which animation to play
    frameIndex: number; // Which frame of the animation
    direction: Direction;
  }[];
}

/** Animation generation config */
export interface AnimationConfig {
  spriteSize: number; // Character sprite size (e.g., 48, 64)
  animationSize: number; // Animation frame size (fixed at 64 for animate-with-text)
  frameCount: number; // Number of animation frames (2-20)
  view: ViewAngle;
  outputDir: string;
}

const DEFAULT_CONFIG: AnimationConfig = {
  spriteSize: 64,
  animationSize: 64, // animate-with-text is fixed at 64x64
  frameCount: 8,
  view: 'high top-down',
  outputDir: './assets/combat_animations',
};

/**
 * Combat Animator - Generate animations from combat logs using PixelLab API
 */
export class CombatAnimator {
  private api: PixelLabAPI;
  private config: AnimationConfig;
  private characterCache = new Map<string, CharacterSprite>();
  private animationCache = new Map<string, CombatAnimation>();

  constructor(apiToken?: string, config: Partial<AnimationConfig> = {}) {
    this.api = apiToken ? new PixelLabAPI(apiToken) : createPixelLabClient();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate full combat replay from recording
   */
  async generateReplay(recording: CombatRecording): Promise<CombatReplay> {

    // Step 1: Generate character sprites
    for (const participant of recording.participants) {
      if (!this.characterCache.has(participant.id)) {
        const sprite = await this.generateCharacterSprite(participant);
        this.characterCache.set(participant.id, sprite);
      } else {
      }
    }

    // Step 2: Extract unique operations
    const operations = this.extractUniqueOperations(recording);

    // Step 3: Generate animations for each operation
    for (const [hash, operation] of operations.entries()) {
      if (!this.animationCache.has(hash)) {
        const animation = await this.generateAnimation(operation, recording.participants);
        this.animationCache.set(hash, animation);
      } else {
      }
    }

    // Step 4: Build replay timeline
    const timeline = this.buildTimeline(recording);

    return {
      recordingId: recording.recordingId,
      combatName: recording.combatName,
      characters: this.characterCache,
      animations: this.animationCache,
      timeline,
    };
  }

  /**
   * Generate character sprite using PixelLab API
   */
  async generateCharacterSprite(participant: CombatParticipant): Promise<CharacterSprite> {
    const description = this.buildCharacterDescription(participant);


    const response = await this.api.generateImageBitforge({
      description,
      image_size: {
        width: this.config.spriteSize,
        height: this.config.spriteSize,
      },
      view: this.config.view,
      direction: 'south',
      detail: 'high detail',
      shading: 'detailed shading',
      outline: 'single color outline',
      no_background: true,
    });

    return {
      participantId: participant.id,
      description,
      imageBase64: response.image,
      imageSize: {
        width: this.config.spriteSize,
        height: this.config.spriteSize,
      },
      generatedAt: Date.now(),
    };
  }

  /**
   * Build character description for PixelLab
   */
  private buildCharacterDescription(participant: CombatParticipant): string {
    if (participant.description) {
      return participant.description;
    }

    // Build from parts
    const parts: string[] = ['gladiator'];

    if (participant.armorColor) {
      parts.push(`in ${participant.armorColor} armor`);
    }

    if (participant.weapon) {
      parts.push(`wielding ${participant.weapon}`);
    }

    return parts.join(' ');
  }

  /**
   * Extract unique renderable operations from combat log
   */
  private extractUniqueOperations(
    recording: CombatRecording
  ): Map<string, NonNullable<CombatLogEvent['renderableOperation']>> {
    const operations = new Map<string, NonNullable<CombatLogEvent['renderableOperation']>>();

    for (const event of recording.events) {
      if (event.renderableOperation) {
        const hash = this.hashOperation(
          event.renderableOperation.actor,
          event.renderableOperation.action,
          event.renderableOperation.weapon
        );

        if (!operations.has(hash)) {
          operations.set(hash, event.renderableOperation);
        }
      }
    }

    return operations;
  }

  /**
   * Hash an operation for caching (actor + action + weapon)
   */
  private hashOperation(actor: string, action: string, weapon: string): string {
    return `${actor}_${action}_${weapon}`.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Generate animation for a combat operation
   */
  async generateAnimation(
    operation: NonNullable<CombatLogEvent['renderableOperation']>,
    participants: CombatParticipant[]
  ): Promise<CombatAnimation> {
    // Find participant to get reference sprite
    const participant = participants.find((p) => p.name === operation.actor);
    if (!participant) {
      throw new Error(`Participant not found: ${operation.actor}`);
    }

    const characterSprite = this.characterCache.get(participant.id);
    if (!characterSprite) {
      throw new Error(`Character sprite not found for: ${operation.actor}`);
    }

    // Build action description
    const actionDescription = this.buildActionDescription(operation);

    // Generate animation frames using PixelLab API
    const response = await this.api.animateWithText({
      description: characterSprite.description,
      action: actionDescription,
      image_size: {
        width: this.config.animationSize,
        height: this.config.animationSize,
      },
      reference_image: characterSprite.imageBase64,
      n_frames: this.config.frameCount,
      view: this.config.view,
      direction: 'south',
    });

    const hash = this.hashOperation(operation.actor, operation.action, operation.weapon);

    return {
      operationHash: hash,
      actor: operation.actor,
      action: operation.action,
      weapon: operation.weapon,
      frames: response.images,
      frameCount: response.images.length,
      frameRate: 12,
      generatedAt: Date.now(),
    };
  }

  /**
   * Build action description for animation
   */
  private buildActionDescription(
    operation: NonNullable<CombatLogEvent['renderableOperation']>
  ): string {
    // Map combat actions to animation-friendly descriptions
    const action = operation.action.toLowerCase();
    const weapon = operation.weapon;

    if (action.includes('thrust') || action.includes('stab')) {
      return `thrusting forward with ${weapon}, piercing attack`;
    }

    if (action.includes('slash') || action.includes('swing')) {
      return `slashing with ${weapon}, sweeping horizontal attack`;
    }

    if (action.includes('bash') || action.includes('smash')) {
      return `bashing with ${weapon}, heavy overhead strike`;
    }

    if (action.includes('block') || action.includes('defend')) {
      return `blocking with ${weapon}, defensive stance`;
    }

    if (action.includes('dodge') || action.includes('evade')) {
      return 'dodging to the side, evasive movement';
    }

    // Default: use the original action
    return `${action} with ${weapon}`;
  }

  /**
   * Build replay timeline from combat events
   */
  private buildTimeline(recording: CombatRecording): CombatReplayFrame[] {
    const frames: CombatReplayFrame[] = [];
    const actorStates = new Map<
      string,
      { animationHash: string; frameIndex: number; framesRemaining: number }
    >();

    // Initialize actor states to idle
    for (const participant of recording.participants) {
      actorStates.set(participant.id, {
        animationHash: 'idle',
        frameIndex: 0,
        framesRemaining: 0,
      });
    }

    // Build frame-by-frame timeline
    for (let tick = recording.startTick; tick <= recording.endTick; tick++) {
      // Get events for this tick
      const tickEvents = recording.events.filter((e) => e.tick === tick);

      // Start new animations for events
      for (const event of tickEvents) {
        if (event.renderableOperation) {
          const hash = this.hashOperation(
            event.renderableOperation.actor,
            event.renderableOperation.action,
            event.renderableOperation.weapon
          );

          const animation = this.animationCache.get(hash);
          const participant = recording.participants.find(
            (p) => p.name === event.actor
          );

          if (participant && animation) {
            actorStates.set(participant.id, {
              animationHash: hash,
              frameIndex: 0,
              framesRemaining: animation.frameCount,
            });
          }
        }
      }

      // Build frame for this tick
      const actors: CombatReplayFrame['actors'] = [];

      for (const [actorId, state] of actorStates.entries()) {
        actors.push({
          actorId,
          animationHash: state.animationHash,
          frameIndex: state.frameIndex,
          direction: 'south', // TODO: Calculate from positions
        });

        // Advance animation state
        if (state.framesRemaining > 0) {
          state.frameIndex++;
          state.framesRemaining--;

          // Reset to idle when animation completes
          if (state.framesRemaining === 0) {
            state.animationHash = 'idle';
            state.frameIndex = 0;
          }
        }
      }

      frames.push({ tick, actors });
    }

    return frames;
  }

  /**
   * Save replay to disk
   */
  async saveReplay(replay: CombatReplay, outputDir: string): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });

    // Save character sprites
    const spritesDir = path.join(outputDir, 'sprites');
    await fs.mkdir(spritesDir, { recursive: true });

    for (const [id, sprite] of replay.characters) {
      const filename = `${id.toLowerCase().replace(/\s+/g, '_')}.png`;
      const filepath = path.join(spritesDir, filename);
      await fs.writeFile(filepath, Buffer.from(sprite.imageBase64, 'base64'));
    }

    // Save animation frames
    const animationsDir = path.join(outputDir, 'animations');
    await fs.mkdir(animationsDir, { recursive: true });

    for (const [hash, animation] of replay.animations) {
      const animDir = path.join(animationsDir, hash);
      await fs.mkdir(animDir, { recursive: true });

      for (let i = 0; i < animation.frames.length; i++) {
        const frame = animation.frames[i];
        if (!frame) continue;
        const filename = `frame_${String(i).padStart(3, '0')}.png`;
        const filepath = path.join(animDir, filename);
        await fs.writeFile(filepath, Buffer.from(frame, 'base64'));
      }
    }

    // Save replay metadata
    const metadata = {
      recordingId: replay.recordingId,
      combatName: replay.combatName,
      characters: Array.from(replay.characters.entries()).map(([id, sprite]) => ({
        id,
        description: sprite.description,
        spriteFile: `sprites/${id.toLowerCase().replace(/\s+/g, '_')}.png`,
      })),
      animations: Array.from(replay.animations.entries()).map(([hash, anim]) => ({
        hash,
        actor: anim.actor,
        action: anim.action,
        weapon: anim.weapon,
        frameCount: anim.frameCount,
        frameRate: anim.frameRate,
        framesDir: `animations/${hash}/`,
      })),
      timeline: replay.timeline,
    };

    await fs.writeFile(
      path.join(outputDir, 'replay.json'),
      JSON.stringify(metadata, null, 2)
    );
  }

  /**
   * Get animation by hash
   */
  getAnimation(hash: string): CombatAnimation | undefined {
    return this.animationCache.get(hash);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.characterCache.clear();
    this.animationCache.clear();
  }
}

/**
 * Load combat recording from JSON file
 */
export async function loadCombatRecording(filePath: string): Promise<CombatRecording> {
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Convert simple participants array to full objects if needed
  if (data.participants && typeof data.participants[0] === 'string') {
    data.participants = (data.participants as string[]).map((name: string) => ({
      id: name,
      name: name,
      description: buildDescriptionFromName(name),
    }));
  }

  return data;
}

/**
 * Build description from participant name (e.g., "Gladiator Red" -> "gladiator in red armor")
 */
function buildDescriptionFromName(name: string): string {
  const parts = name.toLowerCase().split(' ');

  if (parts.length >= 2 && parts[0] === 'gladiator') {
    return `gladiator in ${parts[1]} armor`;
  }

  return name.toLowerCase();
}
