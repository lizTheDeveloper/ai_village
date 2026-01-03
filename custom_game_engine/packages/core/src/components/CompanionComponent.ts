/**
 * CompanionComponent - Tracks state of the Ophanim companion
 *
 * The companion is a celestial guide that evolves alongside the player's
 * civilization, providing tutorial help, emotional support, and strategic advice.
 *
 * Evolution Tiers:
 * - Tier 0: Primordial (dormant, basic awareness)
 * - Tier 1: Awakening (first baby born)
 * - Tier 2: Emotional Depth (Goddess of Wisdom manifests)
 * - Tier 3: Social Awareness (first dimensional travel)
 * - Tier 4: Emotional Complexity (second dimensional travel)
 * - Tier 5: Transcendent (civilization creates universe)
 */

import { ComponentBase } from '../ecs/Component.js';

// ============================================================================
// Type Definitions
// ============================================================================

export type EvolutionTier = 0 | 1 | 2 | 3 | 4 | 5;

export type DimensionalBreachType = 'time' | 'universe' | null;

/** Memory of player actions/preferences */
export interface PlayerMemory {
  readonly id: string;
  readonly type: 'preference' | 'history' | 'conversation' | 'promise' | 'nickname';
  readonly content: string;
  readonly timestamp: number;
  readonly importance: number; // 0-1
}

/** Companion's self-memory */
export interface SelfMemory {
  readonly id: string;
  readonly type: 'emotional_history' | 'prediction' | 'growth' | 'bond';
  readonly content: string;
  readonly timestamp: number;
  readonly emotionalValence: number; // -1 to 1
}

/** Companion needs that affect behavior */
export interface CompanionNeeds {
  connection: number; // 0-1: Desire to interact with player
  purpose: number; // 0-1: Feeling useful and helpful
  rest: number; // 0-1: Mental energy
  stimulation: number; // 0-1: New experiences
  appreciation: number; // 0-1: Feeling valued
}

/** Plotline state tracking */
export interface PlotlineState {
  firstLossSeen: boolean;
  prophecyHinted: boolean;
  betrayalWitnessed: boolean;
  partnershipDeepened: boolean;
  reunionOccurred: boolean;
}

// ============================================================================
// Component
// ============================================================================

export class CompanionComponent extends ComponentBase {
  public readonly type = 'companion';

  /** Current evolution tier (0-5) */
  public evolutionTier: EvolutionTier;

  /** Current emotional state (sprite key) */
  public currentEmotion: string;

  /** Trust score with player (0-1) */
  public trustScore: number;

  /** Which dimensional breach happened first (for Tier 3→4) */
  public firstDimensionalBreach: DimensionalBreachType;

  /** Number of play sessions (increments on load) */
  public sessionCount: number;

  /** Memories about the player */
  public playerMemories: PlayerMemory[];

  /** Companion's own memories */
  public companionMemories: SelfMemory[];

  /** Companion's needs state */
  public needs: CompanionNeeds;

  /** Plotline state */
  public plotlines: PlotlineState;

  /** Last tick emotion was updated (for cooldowns) */
  public lastEmotionUpdateTick: number;

  /** Last tick needs were updated */
  public lastNeedsUpdateTick: number;

  /** Last tick player interacted */
  public lastInteractionTick: number;

  /** Total positive interactions (for evolution criteria) */
  public positiveInteractions: number;

  /** Tick when companion was created */
  public createdAtTick: number;

  constructor(options?: Partial<CompanionComponent>) {
    super();

    // Defaults
    this.evolutionTier = 0;
    this.currentEmotion = 'alert'; // Tier 0 default
    this.trustScore = 0.0;
    this.firstDimensionalBreach = null;
    this.sessionCount = 0;
    this.playerMemories = [];
    this.companionMemories = [];
    this.needs = {
      connection: 0.5,
      purpose: 0.5,
      rest: 1.0, // Starts fully rested
      stimulation: 0.3, // Starts curious
      appreciation: 0.5,
    };
    this.plotlines = {
      firstLossSeen: false,
      prophecyHinted: false,
      betrayalWitnessed: false,
      partnershipDeepened: false,
      reunionOccurred: false,
    };
    this.lastEmotionUpdateTick = 0;
    this.lastNeedsUpdateTick = 0;
    this.lastInteractionTick = 0;
    this.positiveInteractions = 0;
    this.createdAtTick = 0;

    // Apply overrides
    if (options) {
      Object.assign(this, options);
    }
  }

  /** Clone this component */
  clone(): CompanionComponent {
    return new CompanionComponent({
      evolutionTier: this.evolutionTier,
      currentEmotion: this.currentEmotion,
      trustScore: this.trustScore,
      firstDimensionalBreach: this.firstDimensionalBreach,
      sessionCount: this.sessionCount,
      playerMemories: [...this.playerMemories],
      companionMemories: [...this.companionMemories],
      needs: { ...this.needs },
      plotlines: { ...this.plotlines },
      lastEmotionUpdateTick: this.lastEmotionUpdateTick,
      lastNeedsUpdateTick: this.lastNeedsUpdateTick,
      lastInteractionTick: this.lastInteractionTick,
      positiveInteractions: this.positiveInteractions,
      createdAtTick: this.createdAtTick,
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add a player memory
 */
export function addPlayerMemory(
  companion: CompanionComponent,
  type: PlayerMemory['type'],
  content: string,
  timestamp: number,
  importance: number = 0.5
): void {
  if (!companion) {
    throw new Error('addPlayerMemory: companion parameter is required');
  }

  const memory: PlayerMemory = {
    id: `player_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    type,
    content,
    timestamp,
    importance,
  };

  companion.playerMemories.push(memory);

  // Limit memory count (keep most important)
  const MAX_PLAYER_MEMORIES = 100;
  if (companion.playerMemories.length > MAX_PLAYER_MEMORIES) {
    companion.playerMemories.sort((a, b) => b.importance - a.importance);
    companion.playerMemories = companion.playerMemories.slice(0, MAX_PLAYER_MEMORIES);
  }
}

/**
 * Add a self-memory
 */
export function addSelfMemory(
  companion: CompanionComponent,
  type: SelfMemory['type'],
  content: string,
  timestamp: number,
  emotionalValence: number = 0
): void {
  if (!companion) {
    throw new Error('addSelfMemory: companion parameter is required');
  }

  const memory: SelfMemory = {
    id: `self_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    type,
    content,
    timestamp,
    emotionalValence,
  };

  companion.companionMemories.push(memory);

  // Limit memory count
  const MAX_SELF_MEMORIES = 100;
  if (companion.companionMemories.length > MAX_SELF_MEMORIES) {
    companion.companionMemories = companion.companionMemories.slice(-MAX_SELF_MEMORIES);
  }
}

/**
 * Update companion needs
 */
export function updateNeed(
  companion: CompanionComponent,
  need: keyof CompanionNeeds,
  delta: number
): void {
  if (!companion) {
    throw new Error('updateNeed: companion parameter is required');
  }

  companion.needs[need] = Math.max(0, Math.min(1, companion.needs[need] + delta));
}

/**
 * Check if companion can evolve to next tier
 */
export function canEvolve(companion: CompanionComponent): boolean {
  if (!companion) {
    throw new Error('canEvolve: companion parameter is required');
  }

  if (companion.evolutionTier >= 5) {
    return false; // Already at max tier
  }

  // Evolution criteria are checked in CompanionSystem based on milestones
  // This just confirms we're not at max tier
  return true;
}

/**
 * Evolve companion to next tier
 */
export function evolveToNextTier(companion: CompanionComponent, currentTick: number): void {
  if (!companion) {
    throw new Error('evolveToNextTier: companion parameter is required');
  }

  if (companion.evolutionTier >= 5) {
    throw new Error('Companion already at maximum evolution tier');
  }

  companion.evolutionTier = (companion.evolutionTier + 1) as EvolutionTier;

  // Add self-memory about evolution
  addSelfMemory(
    companion,
    'growth',
    `Evolved to Tier ${companion.evolutionTier}`,
    currentTick,
    1.0 // Very positive
  );
}

/**
 * Set companion emotion
 */
export function setEmotion(
  companion: CompanionComponent,
  emotion: string,
  currentTick: number
): void {
  if (!companion) {
    throw new Error('setEmotion: companion parameter is required');
  }

  companion.currentEmotion = emotion;
  companion.lastEmotionUpdateTick = currentTick;
}
