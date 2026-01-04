/**
 * CombatAnimator - Generate pixel art animations from combat logs
 *
 * Integrates with PixelLab MCP to create animated combat replays from
 * recorded combat events with renderable operations.
 */

import type { World } from '@ai-village/core';

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
  participants: string[]; // Entity IDs of combatants
  events: CombatLogEvent[];
  metadata?: {
    arena?: string;
    season?: string;
    episode?: string;
  };
}

/** Generated combat animation */
export interface CombatAnimation {
  operationHash: string; // Hash of action+weapon for caching
  actor: string;
  action: string;
  weapon?: string;

  // PixelLab character and animation IDs
  characterId: string;
  animationName: string;

  // Generated sprite data
  spriteSheetUrl?: string;
  frameCount?: number;
  frameRate?: number;

  // Generation metadata
  generatedAt: number;
  pixelLabJobId?: string;
}

/** Combat replay with animations */
export interface CombatReplay {
  recordingId: string;
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
  }[];
}

/**
 * Combat Animator - Generate animations from combat logs
 */
export class CombatAnimator {
  private animationCache = new Map<string, CombatAnimation>();
  private characterCache = new Map<string, string>(); // actorId -> PixelLab characterId

  constructor(private world: World) {}

  /**
   * Generate animations for a combat recording
   */
  async generateAnimations(recording: CombatRecording): Promise<CombatReplay> {
    console.log(`[CombatAnimator] Generating animations for: ${recording.combatName}`);
    console.log(`  Events: ${recording.events.length}`);
    console.log(`  Participants: ${recording.participants.join(', ')}`);

    // Step 1: Extract unique renderable operations
    const operations = this.extractUniqueOperations(recording);
    console.log(`  Unique operations: ${operations.size}`);

    // Step 2: Ensure characters exist
    await this.ensureCharactersCreated(recording.participants);

    // Step 3: Generate animations for each unique operation
    for (const [hash, operation] of operations.entries()) {
      if (!this.animationCache.has(hash)) {
        const animation = await this.generateAnimation(operation);
        this.animationCache.set(hash, animation);
      }
    }

    // Step 4: Build replay timeline
    const timeline = this.buildTimeline(recording);

    return {
      recordingId: recording.recordingId,
      animations: this.animationCache,
      timeline,
    };
  }

  /**
   * Extract unique renderable operations from combat log
   */
  private extractUniqueOperations(
    recording: CombatRecording
  ): Map<string, CombatLogEvent['renderableOperation']> {
    const operations = new Map<string, CombatLogEvent['renderableOperation']>();

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
   * Ensure PixelLab characters exist for all participants
   */
  private async ensureCharactersCreated(participants: string[]): Promise<void> {
    for (const actorId of participants) {
      if (!this.characterCache.has(actorId)) {
        console.log(`[CombatAnimator] Creating character for: ${actorId}`);

        // Get entity from world
        const entity = this.world.getEntity(actorId);
        if (!entity) {
          console.warn(`[CombatAnimator] Entity not found: ${actorId}`);
          continue;
        }

        // Build character description from entity
        const description = this.buildCharacterDescription(entity);

        // TODO: Call PixelLab MCP create_character
        // For now, use placeholder
        const characterId = `char_${actorId}`;

        console.log(`  Description: ${description}`);
        console.log(`  Character ID: ${characterId}`);

        this.characterCache.set(actorId, characterId);
      }
    }
  }

  /**
   * Build character description for PixelLab
   */
  private buildCharacterDescription(entity: any): string {
    // Extract entity traits
    const species = entity.getComponent?.('species')?.species || 'humanoid';
    const gender = entity.getComponent?.('gender')?.gender;
    const name = entity.getComponent?.('name')?.name || 'fighter';

    // Check for gladiator/combat-specific traits
    const equipment = entity.getComponent?.('equipment');
    const appearance = entity.getComponent?.('appearance');

    const parts: string[] = [];

    if (gender) parts.push(gender);
    parts.push(species);
    parts.push('gladiator');

    if (appearance?.armorColor) {
      parts.push(`in ${appearance.armorColor} armor`);
    }

    if (equipment?.weapon) {
      parts.push(`with ${equipment.weapon}`);
    }

    return parts.join(' ');
  }

  /**
   * Generate animation for a renderable operation
   */
  private async generateAnimation(
    operation: CombatLogEvent['renderableOperation']
  ): Promise<CombatAnimation> {
    if (!operation) {
      throw new Error('No renderable operation provided');
    }

    console.log(`[CombatAnimator] Generating animation:`);
    console.log(`  Actor: ${operation.actor}`);
    console.log(`  Action: ${operation.action} with ${operation.weapon}`);
    console.log(`  Prompt: ${operation.spritePrompt}`);

    const characterId = this.characterCache.get(operation.actor);
    if (!characterId) {
      throw new Error(`Character not found for actor: ${operation.actor}`);
    }

    // Build action description for PixelLab
    const actionDescription = `${operation.action} with ${operation.weapon}`;

    // TODO: Call PixelLab MCP animate_character
    // mcp__pixellab__animate_character({
    //   character_id: characterId,
    //   action_description: actionDescription,
    //   template_animation_id: this.mapActionToTemplate(operation.action)
    // })

    // For now, return placeholder
    const hash = this.hashOperation(operation.actor, operation.action, operation.weapon);

    return {
      operationHash: hash,
      actor: operation.actor,
      action: operation.action,
      weapon: operation.weapon,
      characterId,
      animationName: actionDescription,
      frameCount: 8,
      frameRate: 12,
      generatedAt: Date.now(),
    };
  }

  /**
   * Map combat action to PixelLab animation template
   */
  private mapActionToTemplate(action: string): string {
    const actionLower = action.toLowerCase();

    // Map to available PixelLab templates
    if (actionLower.includes('thrust') || actionLower.includes('stab')) {
      return 'lead-jab'; // Thrust-like motion
    }

    if (actionLower.includes('slash') || actionLower.includes('swing')) {
      return 'roundhouse-kick'; // Wide swing motion
    }

    if (actionLower.includes('bash') || actionLower.includes('smash')) {
      return 'cross-punch'; // Heavy strike
    }

    if (actionLower.includes('block') || actionLower.includes('defend')) {
      return 'fight-stance-idle-8-frames';
    }

    if (actionLower.includes('dodge') || actionLower.includes('evade')) {
      return 'running-slide';
    }

    // Default to a generic attack
    return 'cross-punch';
  }

  /**
   * Build replay timeline from combat events
   */
  private buildTimeline(recording: CombatRecording): CombatReplayFrame[] {
    const frames: CombatReplayFrame[] = [];
    const actorStates = new Map<string, { animationHash: string; frameIndex: number }>();

    // Initialize actor states
    for (const actorId of recording.participants) {
      actorStates.set(actorId, {
        animationHash: 'idle',
        frameIndex: 0,
      });
    }

    // Process events tick by tick
    for (let tick = recording.startTick; tick <= recording.endTick; tick++) {
      // Get events for this tick
      const tickEvents = recording.events.filter((e) => e.tick === tick);

      // Update actor states based on events
      for (const event of tickEvents) {
        if (event.renderableOperation) {
          const hash = this.hashOperation(
            event.renderableOperation.actor,
            event.renderableOperation.action,
            event.renderableOperation.weapon
          );

          actorStates.set(event.actor, {
            animationHash: hash,
            frameIndex: 0,
          });
        }
      }

      // Advance frame indices
      for (const [actorId, state] of actorStates.entries()) {
        const animation = this.animationCache.get(state.animationHash);
        if (animation && animation.frameCount) {
          state.frameIndex = (state.frameIndex + 1) % animation.frameCount;
        }
      }

      // Create frame
      frames.push({
        tick,
        actors: Array.from(actorStates.entries()).map(([actorId, state]) => ({
          actorId,
          animationHash: state.animationHash,
          frameIndex: state.frameIndex,
        })),
      });
    }

    return frames;
  }

  /**
   * Get animation by hash
   */
  getAnimation(hash: string): CombatAnimation | undefined {
    return this.animationCache.get(hash);
  }

  /**
   * Clear animation cache
   */
  clearCache(): void {
    this.animationCache.clear();
    this.characterCache.clear();
  }
}

/**
 * Helper: Load combat recording from JSON file
 */
export async function loadCombatRecording(filePath: string): Promise<CombatRecording> {
  // TODO: Implement file loading
  throw new Error('Not implemented');
}

/**
 * Helper: Save combat replay to file
 */
export async function saveCombatReplay(
  replay: CombatReplay,
  outputPath: string
): Promise<void> {
  // TODO: Implement file saving
  throw new Error('Not implemented');
}
