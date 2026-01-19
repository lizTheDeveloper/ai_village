/**
 * UniverseForkMetadata Component - Tracks universe forking and divergence
 *
 * Tracks why and how this universe was forked from a parent timeline.
 * Measures divergence, canon events, merge compatibility, and travel restrictions.
 *
 * Reference: openspec/specs/grand-strategy/10-MULTIVERSE-MECHANICS.md
 */

import type { CausalViolation } from '../trade/HilbertTime.js';

/**
 * Base component interface
 */
interface Component {
  type: string;
  version: number;
}

/**
 * Fork trigger - why this universe was created
 */
export type ForkTrigger =
  | { type: 'causal_violation'; violation: CausalViolation }
  | { type: 'player_choice'; reason: string }
  | { type: 'natural_divergence'; event: CriticalEvent; probability: number }
  | { type: 'timeline_merger_split'; mergerShipId: string };

/**
 * Critical event that can trigger natural divergence
 */
export interface CriticalEvent {
  type: 'binary_choice' | 'multi_choice';
  description: string;
  option1Probability?: number;
  option2Probability?: number;
  options?: Array<{ name: string; probability: number }>;
}

/**
 * Divergence event - tracks significant timeline differences
 */
export interface DivergenceEvent {
  tick: string;  // Serialized bigint - τ when divergence occurred
  eventType: string;  // 'agent_death', 'building_created', etc.
  description: string;
  divergenceImpact: number;  // 0-1, how much this event diverged timeline
}

/**
 * Canon event - events resistant to timeline changes
 */
export interface CanonEvent {
  tick: string;  // Serialized bigint - τ when canon event occurred
  eventType: string;
  description: string;
  resistanceStrength: number;  // 0-1, how hard to change
  wasAltered: boolean;  // Did this fork alter canon?
  alteration?: {
    forkTick: string;  // Serialized bigint
    originalOutcome: string;
    actualOutcome: string;
    divergenceImpact: number;
  };
  convergence?: {
    attempting: boolean;
    convergenceStrength: number;  // 0-1
    estimatedConvergenceTick: string;  // Serialized bigint
  };
}

/**
 * Merge conflict types
 */
export interface MergeConflict {
  conflictType: 'agent_state' | 'building_exists' | 'item_quantity' | 'terrain_difference';
  entityId: string;
  parentValue: unknown;
  forkValue: unknown;
  resolvable: boolean;
}

/**
 * UniverseForkMetadata Component
 *
 * Tracks fork details for a universe. Attached to a universe-level entity
 * or stored in snapshot metadata.
 */
export interface UniverseForkMetadataComponent extends Component {
  type: 'universe_fork_metadata';
  version: number;

  /**
   * Fork trigger - why this universe was created
   */
  forkTrigger: ForkTrigger;

  /**
   * Parent universe information
   */
  parentUniverse: {
    universeId: string;
    universeName: string;
    forkTick: string;  // Serialized bigint - τ in parent when fork occurred
    multiverseTick: string;  // Serialized bigint - absolute multiverse time
  };

  /**
   * Divergence tracking
   */
  divergence: {
    divergenceScore: number;  // 0-1, how different from parent
    majorDifferences: DivergenceEvent[];
    lastDivergenceUpdate: string;  // Serialized bigint - τ when last recalculated
  };

  /**
   * Canon events inherited from parent
   */
  canonEvents: CanonEvent[];

  /**
   * Merge compatibility
   */
  mergeability: {
    compatibleWithParent: boolean;
    compatibleBranches: string[];  // Other universe IDs
    mergeConflicts: MergeConflict[];
  };

  /**
   * Travel restrictions
   */
  isolation: {
    allowTravelTo: boolean;    // Can ships enter this universe?
    allowTravelFrom: boolean;  // Can ships leave?
    quarantineReason?: string;  // If quarantined
  };
}

/**
 * Factory function to create UniverseForkMetadata component
 */
export function createUniverseForkMetadata(
  forkTrigger: ForkTrigger,
  parentUniverseId: string,
  parentUniverseName: string,
  forkTick: bigint,
  multiverseTick: bigint
): UniverseForkMetadataComponent {
  return {
    type: 'universe_fork_metadata',
    version: 1,

    forkTrigger,

    parentUniverse: {
      universeId: parentUniverseId,
      universeName: parentUniverseName,
      forkTick: forkTick.toString(),
      multiverseTick: multiverseTick.toString(),
    },

    divergence: {
      divergenceScore: 0,  // Starts identical to parent
      majorDifferences: [],
      lastDivergenceUpdate: forkTick.toString(),
    },

    canonEvents: [],  // Inherited from parent by UniverseForkingSystem

    mergeability: {
      compatibleWithParent: true,  // Initially compatible
      compatibleBranches: [],
      mergeConflicts: [],
    },

    isolation: {
      allowTravelTo: true,
      allowTravelFrom: true,
    },
  };
}

/**
 * Divergence event type enum for fast array indexing
 */
export const enum DivergenceEventType {
  // High impact (0.3-1.0)
  AGENT_DEATH = 0,
  AGENT_BIRTH = 1,
  BUILDING_DESTROYED = 2,
  WAR_DECLARATION = 3,
  DEITY_EMERGENCE = 4,

  // Medium impact (0.1-0.3)
  BUILDING_CREATED = 5,
  MARRIAGE = 6,
  SKILL_MASTERY = 7,
  TRADE_AGREEMENT = 8,

  // Low impact (0-0.1)
  ITEM_CRAFTED = 9,
  AGENT_MOVED = 10,
  MOOD_CHANGE = 11,

  // Sentinel for unknown types
  UNKNOWN = 12,
}

/**
 * Divergence event impact constants - array-based for O(1) lookup
 * Impact values determine how much a single event diverges the timeline
 */
export const DIVERGENCE_EVENT_IMPACTS: ReadonlyArray<number> = [
  // High impact (0.3-1.0)
  0.5,   // AGENT_DEATH
  0.4,   // AGENT_BIRTH
  0.6,   // BUILDING_DESTROYED
  0.8,   // WAR_DECLARATION
  1.0,   // DEITY_EMERGENCE

  // Medium impact (0.1-0.3)
  0.2,   // BUILDING_CREATED
  0.15,  // MARRIAGE
  0.1,   // SKILL_MASTERY
  0.2,   // TRADE_AGREEMENT

  // Low impact (0-0.1)
  0.02,  // ITEM_CRAFTED
  0.01,  // AGENT_MOVED
  0.005, // MOOD_CHANGE

  // Unknown
  0.1,   // UNKNOWN (default)
];

/**
 * Fast string-to-enum lookup map for divergence event types
 * Cached for O(1) string-to-index conversion
 */
const DIVERGENCE_EVENT_TYPE_MAP = new Map<string, DivergenceEventType>([
  ['agent_death', DivergenceEventType.AGENT_DEATH],
  ['agent_birth', DivergenceEventType.AGENT_BIRTH],
  ['building_destroyed', DivergenceEventType.BUILDING_DESTROYED],
  ['war_declaration', DivergenceEventType.WAR_DECLARATION],
  ['deity_emergence', DivergenceEventType.DEITY_EMERGENCE],
  ['building_created', DivergenceEventType.BUILDING_CREATED],
  ['marriage', DivergenceEventType.MARRIAGE],
  ['skill_mastery', DivergenceEventType.SKILL_MASTERY],
  ['trade_agreement', DivergenceEventType.TRADE_AGREEMENT],
  ['item_crafted', DivergenceEventType.ITEM_CRAFTED],
  ['agent_moved', DivergenceEventType.AGENT_MOVED],
  ['mood_change', DivergenceEventType.MOOD_CHANGE],
]);

/**
 * Get divergence impact for event type - O(1) lookup
 */
export function getDivergenceImpact(eventType: string): number {
  const typeIndex = DIVERGENCE_EVENT_TYPE_MAP.get(eventType);
  if (typeIndex !== undefined) {
    const impact = DIVERGENCE_EVENT_IMPACTS[typeIndex];
    if (impact !== undefined) return impact;
  }
  const defaultImpact = DIVERGENCE_EVENT_IMPACTS[DivergenceEventType.UNKNOWN];
  return defaultImpact !== undefined ? defaultImpact : 0.1;
}

/**
 * Record a divergence event in the metadata - optimized for zero allocations
 */
export function recordDivergenceEvent(
  metadata: UniverseForkMetadataComponent,
  currentTick: bigint,
  eventType: string,
  description: string,
  impact?: number
): void {
  // Fast lookup using array-based impact table
  const divergenceImpact = impact ?? getDivergenceImpact(eventType);

  const event: DivergenceEvent = {
    tick: currentTick.toString(),
    eventType,
    description,
    divergenceImpact,
  };

  const diffs = metadata.divergence.majorDifferences;
  diffs.push(event);
  metadata.divergence.lastDivergenceUpdate = currentTick.toString();

  // Update divergence score - single-pass accumulation, inline min
  let totalImpact = 0;
  for (let i = 0; i < diffs.length; i++) {
    const diff = diffs[i];
    if (diff) {
      totalImpact += diff.divergenceImpact;
    }
  }
  const normalized = totalImpact / 10;
  metadata.divergence.divergenceScore = normalized < 1 ? normalized : 1;  // Inline min
}
