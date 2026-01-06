/**
 * BeliefTypes - The belief resource system that powers divinity
 *
 * Belief is the fundamental resource of the divine economy. It is generated
 * by agents through worship, accumulated by deities, and spent on divine actions.
 */

// ============================================================================
// Belief Activity Types
// ============================================================================

/** Activities that generate belief */
export type BeliefActivity =
  | 'passive_faith'       // Just existing as a believer (lowest)
  | 'prayer'              // Active prayer
  | 'meditation'          // Deep communion
  | 'ritual'              // Formal ceremony
  | 'sacrifice'           // Giving up something valuable
  | 'pilgrimage'          // Journey to sacred site
  | 'proselytizing'       // Converting others
  | 'creation'            // Creating religious art/texts
  | 'miracle_witness';    // Witnessing divine action (highest)

/** Base belief generation rates per activity (per game hour) */
export const BELIEF_GENERATION_RATES: Record<BeliefActivity, number> = {
  passive_faith: 0.01,
  prayer: 0.1,
  meditation: 0.15,
  ritual: 0.3,
  sacrifice: 0.5,         // Base, scales with sacrifice value
  pilgrimage: 1.0,        // One-time bonus on arrival
  proselytizing: 0.2,     // Plus bonus for conversions
  creation: 0.5,
  miracle_witness: 5.0,   // Massive one-time boost
};

// ============================================================================
// Belief Generation
// ============================================================================

/** Factors affecting belief generation from an agent */
export interface BeliefGeneration {
  /** Agent's faith level (0-1) */
  faith: number;

  /** Time spent in religious activity (game hours) */
  devotionTime: number;

  /** Current activity type */
  activityType: BeliefActivity;

  /** Bonus from praying at temples/sacred sites */
  sacredSiteBonus: number;

  /** Bonus from group worship */
  communalBonus: number;

  /** Multiplier during crises, miracles, religious fervor */
  fervorMultiplier: number;

  /** Actual belief generated per tick */
  beliefPerTick: number;
}

/** Calculate belief generation for an agent */
export interface BeliefCalculation {
  agentId: string;
  deityId: string;

  baseRate: number;
  faithMultiplier: number;
  activityMultiplier: number;
  siteBonus: number;
  communalBonus: number;
  fervorBonus: number;

  finalRate: number;
}

// ============================================================================
// Belief State
// ============================================================================

/** A deity's belief state */
export interface DeityBeliefState {
  /** Current belief reserves */
  currentBelief: number;

  /** Current generation rate (per game hour) */
  beliefPerHour: number;

  /** Historical maximum generation rate */
  peakBeliefRate: number;

  /** Lifetime belief accumulated */
  totalBeliefEarned: number;

  /** Lifetime belief spent */
  totalBeliefSpent: number;

  /** Threshold for basic manifestation powers */
  manifestationThreshold: number;

  /** Threshold for avatar creation */
  avatarThreshold: number;

  /** Current decay rate (per game hour) */
  decayRate: number;

  /** Last time belief-generating activity occurred */
  lastActivityTime: number;

  /** Is deity at risk of fading? */
  fadingRisk: boolean;
}

/** Default belief thresholds */
export const BELIEF_THRESHOLDS = {
  /** Minimum to exist stably */
  minimum: 10,

  /** Can perform minor miracles */
  minor_powers: 100,

  /** Can perform moderate miracles */
  moderate_powers: 500,

  /** Can create angels */
  angel_creation: 2000,

  /** Can manifest avatar */
  avatar_creation: 5000,

  /** Can perform world-shaping acts */
  world_shaping: 10000,
} as const;

// ============================================================================
// Belief Decay
// ============================================================================

/** Decay configuration */
export interface BeliefDecayConfig {
  /** Normal decay rate (percentage per game hour) */
  normalDecayRate: number;

  /** Accelerated decay when no prayers received */
  noActivityDecayRate: number;

  /** Hours without activity before accelerated decay */
  noActivityThreshold: number;

  /** Critical decay when no believers remain */
  criticalDecayRate: number;

  /** Minimum belief floor for gods with written history */
  mythPersistenceFloor: number;
}

/** Default decay configuration */
export const DEFAULT_BELIEF_DECAY: BeliefDecayConfig = {
  normalDecayRate: 0.001,         // 0.1% per hour
  noActivityDecayRate: 0.005,     // 0.5% per hour
  noActivityThreshold: 24,        // 24 game hours
  criticalDecayRate: 0.02,        // 2% per hour
  mythPersistenceFloor: 1,        // Can't go below 1 if myths exist
};

// ============================================================================
// Belief Allocation (for agents who believe in multiple deities)
// ============================================================================

/** How an agent allocates belief among deities */
export interface BeliefAllocation {
  /** Deity receiving belief */
  deityId: string;

  /** Strength of belief in this deity (0-1) */
  beliefStrength: number;

  /** Nature of the relationship */
  relationship: BeliefRelationshipType;

  /** Percentage of agent's belief output going to this deity */
  allocationPercentage: number;
}

/** Types of belief relationships */
export type BeliefRelationshipType =
  | 'worship'         // Full devotion
  | 'respect'         // Acknowledge power without full worship
  | 'fear'            // Believe out of fear
  | 'transactional';  // Pray for specific benefits

// ============================================================================
// Belief Transfer
// ============================================================================

/** Transfer of belief between entities */
export interface BeliefTransfer {
  /** Source (deity or special entity) */
  sourceId: string;
  sourceType: 'deity' | 'angel' | 'artifact' | 'ritual';

  /** Destination deity */
  destinationId: string;

  /** Amount transferred */
  amount: number;

  /** Reason for transfer */
  reason: BeliefTransferReason;

  /** When it occurred */
  timestamp: number;
}

/** Reasons for belief transfer */
export type BeliefTransferReason =
  | 'angel_maintenance'    // Deity funding an angel
  | 'avatar_maintenance'   // Deity maintaining avatar
  | 'divine_gift'          // Gift to another deity
  | 'tribute'              // Vassal paying tribute
  | 'theft'                // Stolen via divine conflict
  | 'schism'               // Split during schism
  | 'merger'               // Combined during syncretism
  | 'ritual_channeling';   // Believers channeling to specific deity

// ============================================================================
// Belief Events
// ============================================================================

/** Events related to belief changes */
export interface BeliefEvent {
  type: BeliefEventType;
  deityId: string;
  amount: number;
  timestamp: number;
  details: Record<string, unknown>;
}

export type BeliefEventType =
  | 'belief_gained'
  | 'belief_spent'
  | 'belief_decayed'
  | 'belief_transferred'
  | 'threshold_reached'
  | 'threshold_lost'
  | 'fading_warning'
  | 'faith_surge';        // Mass belief gain from miracle/event

// ============================================================================
// Factory Functions
// ============================================================================

/** Create initial belief state for a new deity */
export function createInitialBeliefState(initialBelief: number = 0): DeityBeliefState {
  return {
    currentBelief: initialBelief,
    beliefPerHour: 0,
    peakBeliefRate: 0,
    totalBeliefEarned: initialBelief,
    totalBeliefSpent: 0,
    manifestationThreshold: BELIEF_THRESHOLDS.minor_powers,
    avatarThreshold: BELIEF_THRESHOLDS.avatar_creation,
    decayRate: DEFAULT_BELIEF_DECAY.normalDecayRate,
    lastActivityTime: Date.now(),
    fadingRisk: initialBelief < BELIEF_THRESHOLDS.minimum,
  };
}

/** Calculate belief generation from an activity */
export function calculateBeliefGeneration(
  activity: BeliefActivity,
  faith: number,
  modifiers: {
    sacredSiteBonus?: number;
    communalBonus?: number;
    fervorMultiplier?: number;
  } = {}
): number {
  const baseRate = BELIEF_GENERATION_RATES[activity];
  const {
    sacredSiteBonus = 0,
    communalBonus = 0,
    fervorMultiplier = 1,
  } = modifiers;

  return baseRate * faith * (1 + sacredSiteBonus + communalBonus) * fervorMultiplier;
}
