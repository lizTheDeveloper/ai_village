/**
 * AfterlifeComponent - Tracks spiritual needs of deceased agents in the Underworld
 *
 * When agents die and transition to the Underworld, their physical needs become
 * irrelevant. Instead, souls have spiritual needs that determine their ultimate fate:
 * - Coherence: How well they maintain their identity and memories
 * - Tether: Connection to the mortal world through remembrance
 * - Peace: Acceptance of death and resolution of unfinished business
 * - Solitude: Loneliness in the realm of the dead
 *
 * Possible outcomes:
 * - Shade: Lost identity (coherence = 0)
 * - Passed On: Peacefully departed (tether = 0, peace > 0.8)
 * - Restless Ghost: Unfinished business (peace < 0.2)
 * - Ancestor Kami: Protective spirit (peace > 0.8, coherence > 0.5, has descendants)
 */

import type { Component } from '../ecs/Component.js';

/**
 * Cause of death affects starting peace level
 */
export type CauseOfDeath =
  | 'old_age'      // Peaceful, high starting peace
  | 'starvation'   // Moderate peace
  | 'combat'       // Low peace, violent death
  | 'accident'     // Low peace, sudden
  | 'disease'      // Moderate peace
  | 'exposure'     // Moderate peace
  | 'sacrifice'    // High peace if willing
  | 'murder'       // Very low peace
  | 'unknown';     // Moderate peace

/**
 * Get starting peace based on cause of death
 */
export function getStartingPeace(cause: CauseOfDeath): number {
  switch (cause) {
    case 'old_age': return 0.8;
    case 'sacrifice': return 0.7;
    case 'disease': return 0.5;
    case 'starvation': return 0.4;
    case 'exposure': return 0.4;
    case 'unknown': return 0.4;
    case 'accident': return 0.3;
    case 'combat': return 0.2;
    case 'murder': return 0.1;
  }
}

/**
 * AfterlifeComponent tracks the spiritual state of deceased agents
 */
export interface AfterlifeComponent extends Component {
  type: 'afterlife';

  // ============================================================================
  // Core Afterlife Needs (0-1 scale)
  // ============================================================================

  /** Identity/memory integrity - at 0, becomes a shade */
  coherence: number;

  /** Connection to mortal world - at 0, passes on */
  tether: number;

  /** Acceptance of death - below 0.2, becomes restless */
  peace: number;

  /** Loneliness - high solitude accelerates coherence decay */
  solitude: number;

  // ============================================================================
  // Death Context
  // ============================================================================

  /** What killed them */
  causeOfDeath: CauseOfDeath;

  /** Game tick when death occurred */
  deathTick: number;

  /** Where they died */
  deathLocation: { x: number; y: number };

  /** Summary of death for their memories */
  deathMemory?: string;

  // ============================================================================
  // Unfinished Business
  // ============================================================================

  /** Goal IDs from GoalsComponent that were incomplete */
  unfinishedGoals: string[];

  /** Entity IDs of important relationships */
  unresolvedRelationships: string[];

  // ============================================================================
  // Family/Lineage Tracking (for ancestor magic)
  // ============================================================================

  /** Living descendant entity IDs */
  descendants: string[];

  /** Family name for shrine identification */
  familyName?: string;

  /** Connects to GeneticComponent lineage */
  bloodlineId?: string;

  // ============================================================================
  // Soul State
  // ============================================================================

  /** True if coherence < 0.1 - lost identity, wanders aimlessly */
  isShade: boolean;

  /** True if tether < 0.1 && peace > 0.8 - peacefully departed */
  hasPassedOn: boolean;

  /** True if peace < 0.2 - may haunt, attempt escape */
  isRestless: boolean;

  /** True if transformed into protective ancestor spirit */
  isAncestorKami: boolean;

  /** Kami rank if transformed */
  kamiRank?: 'minor' | 'local' | 'regional';

  // ============================================================================
  // Ancestor Kami Properties (populated on transformation)
  // ============================================================================

  /** What this ancestor can grant to descendants */
  availableBlessings?: string[];

  /** What this ancestor inflicts when neglected */
  availableCurses?: string[];

  /** What offerings please this ancestor */
  preferredOfferings?: string[];

  /** What actions anger this ancestor */
  taboos?: string[];

  // ============================================================================
  // Tracking
  // ============================================================================

  /** How many times they've been remembered (prayers, offerings) */
  timesRemembered: number;

  /** Last tick when remembered */
  lastRememberedTick: number;

  /** Times visited by living (necromancy, dreams, portals) */
  visitsFromLiving: number;

  /** Count of each offering type received */
  offeringsReceived: Record<string, number>;
}

/**
 * Options for creating an AfterlifeComponent
 */
export interface AfterlifeComponentOptions {
  causeOfDeath: CauseOfDeath;
  deathTick: number;
  deathLocation: { x: number; y: number };
  deathMemory?: string;
  unfinishedGoals?: string[];
  unresolvedRelationships?: string[];
  descendants?: string[];
  familyName?: string;
  bloodlineId?: string;
}

/**
 * Create an AfterlifeComponent for a newly deceased agent
 */
export function createAfterlifeComponent(options: AfterlifeComponentOptions): AfterlifeComponent {
  const startingPeace = getStartingPeace(options.causeOfDeath);

  // Reduce peace for each unfinished goal
  const goalPenalty = (options.unfinishedGoals?.length ?? 0) * 0.1;
  const adjustedPeace = Math.max(0.1, startingPeace - goalPenalty);

  // Starting tether based on relationships
  const relationshipCount = (options.unresolvedRelationships?.length ?? 0) +
                           (options.descendants?.length ?? 0);
  const startingTether = Math.min(1.0, 0.3 + relationshipCount * 0.1);

  return {
    type: 'afterlife',
    version: 1,

    // Core needs
    coherence: 1.0,  // Full identity at death
    tether: startingTether,
    peace: adjustedPeace,
    solitude: 0.0,  // Not lonely yet

    // Death context
    causeOfDeath: options.causeOfDeath,
    deathTick: options.deathTick,
    deathLocation: options.deathLocation,
    deathMemory: options.deathMemory,

    // Unfinished business
    unfinishedGoals: options.unfinishedGoals ?? [],
    unresolvedRelationships: options.unresolvedRelationships ?? [],

    // Family
    descendants: options.descendants ?? [],
    familyName: options.familyName,
    bloodlineId: options.bloodlineId,

    // State
    isShade: false,
    hasPassedOn: false,
    isRestless: adjustedPeace < 0.2,
    isAncestorKami: false,

    // Tracking
    timesRemembered: 0,
    lastRememberedTick: options.deathTick,
    visitsFromLiving: 0,
    offeringsReceived: {},
  };
}

/**
 * Record that a soul was remembered (prayer, offering, etc.)
 */
export function recordRemembrance(
  afterlife: AfterlifeComponent,
  currentTick: number,
  offeringType?: string
): void {
  afterlife.timesRemembered++;
  afterlife.lastRememberedTick = currentTick;

  // Refresh tether
  afterlife.tether = Math.min(1.0, afterlife.tether + 0.05);

  // Reduce solitude
  afterlife.solitude = Math.max(0, afterlife.solitude - 0.1);

  // Track offering
  if (offeringType) {
    afterlife.offeringsReceived[offeringType] =
      (afterlife.offeringsReceived[offeringType] ?? 0) + 1;

    // Favorite foods give extra peace
    if (afterlife.preferredOfferings?.includes(offeringType)) {
      afterlife.peace = Math.min(1.0, afterlife.peace + 0.05);
    }
  }
}

/**
 * Record a visit from the living
 */
export function recordVisit(afterlife: AfterlifeComponent, currentTick: number): void {
  afterlife.visitsFromLiving++;
  afterlife.lastRememberedTick = currentTick;

  // Major tether refresh
  afterlife.tether = Math.min(1.0, afterlife.tether + 0.15);

  // Major solitude reduction
  afterlife.solitude = Math.max(0, afterlife.solitude - 0.3);

  // Some peace from connection
  afterlife.peace = Math.min(1.0, afterlife.peace + 0.05);
}

/**
 * Mark a goal as resolved (completed by successors or accepted as unfinished)
 */
export function resolveGoal(afterlife: AfterlifeComponent, goalId: string): void {
  const index = afterlife.unfinishedGoals.indexOf(goalId);
  if (index !== -1) {
    afterlife.unfinishedGoals.splice(index, 1);
    // Gain peace from resolution
    afterlife.peace = Math.min(1.0, afterlife.peace + 0.15);
    // Update restless state
    afterlife.isRestless = afterlife.peace < 0.2;
  }
}

/**
 * Check if soul qualifies to become an Ancestor Kami
 */
export function canBecomeAncestorKami(afterlife: AfterlifeComponent): boolean {
  return (
    !afterlife.isAncestorKami &&
    !afterlife.isShade &&
    afterlife.peace > 0.8 &&
    afterlife.coherence > 0.5 &&
    afterlife.tether > 0.3 &&
    afterlife.descendants.length > 0
  );
}

/**
 * Helper to check soul state
 */
export function getSoulState(afterlife: AfterlifeComponent):
  'shade' | 'passed_on' | 'restless' | 'ancestor_kami' | 'wandering' {
  if (afterlife.isShade) return 'shade';
  if (afterlife.hasPassedOn) return 'passed_on';
  if (afterlife.isAncestorKami) return 'ancestor_kami';
  if (afterlife.isRestless) return 'restless';
  return 'wandering';
}
