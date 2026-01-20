/**
 * TimelineMergerOperationComponent - Tracks active timeline merger operations
 *
 * Attached to timeline_merger ships when they initiate merge operations.
 * Tracks scanning, compatibility calculation, execution, and completion phases.
 *
 * Reference: openspec/specs/grand-strategy/10-MULTIVERSE-MECHANICS.md
 */

import type { Component, ComponentSchema } from '../ecs/Component.js';

/**
 * Timeline merger operation state
 */
export type MergerState =
  | 'scanning'      // Phase 1: Scanning both universes (0-25%)
  | 'calculating'   // Phase 2: Computing compatibility and merge strategy (25-50%)
  | 'executing'     // Phase 3: Executing merge (50-100%)
  | 'completed'     // Phase 4: Merge complete
  | 'failed';       // Merge failed due to incompatibility

/**
 * Conflict resolution strategy
 */
export type MergeStrategy =
  | 'keep_source'   // Use state from source universe
  | 'keep_target'   // Use state from target universe
  | 'hybrid'        // Average numeric values, concatenate memories
  | 'fork';         // Conflict too large, abort or create sub-fork

/**
 * Entity conflict in merge operation
 */
export interface EntityConflict {
  /** Entity ID present in both timelines */
  entityId: string;

  /** Type of conflict */
  conflictType:
    | 'position_difference'      // Entity in different locations
    | 'state_difference'         // Different component states
    | 'exists_in_one'            // Entity exists in one timeline only
    | 'incompatible_history';    // Causal history conflicts

  /** Strategy to resolve this conflict */
  resolutionStrategy: MergeStrategy;

  /** Can this conflict be resolved? */
  resolvable: boolean;

  /** Why conflict cannot be resolved (if resolvable = false) */
  reason?: string;
}

/**
 * Timeline merger operation component
 */
export interface TimelineMergerOperationComponent extends Component {
  type: 'timeline_merger_operation';

  /** Timeline merger ship performing operation */
  mergerShipId: string;

  /** Source universe to merge FROM */
  sourceUniverseId: string;

  /** Target universe to merge INTO */
  targetUniverseId: string;

  /** Current operation state */
  state: MergerState;

  /** Merge progress (0-100%) */
  mergeProgress: number;

  /** Compatibility score (0.0-1.0), calculated in scanning phase */
  compatibilityScore: number | null;

  /**
   * Compatibility factors breakdown
   */
  compatibilityFactors: {
    /** History divergence factor (0-1, higher = more similar) */
    historyDivergence: number;

    /** Physics compatibility factor (0-1, higher = more compatible) */
    physicsCompatibility: number;

    /** Population overlap factor (0-1, higher = more overlap) */
    populationOverlap: number;

    /** Paradox penalty factor (0-1, higher = fewer paradoxes) */
    paradoxCount: number;
  } | null;

  /** Detected conflicts between timelines */
  conflicts: EntityConflict[];

  /** Entity reconciliation map (entityId -> strategy) */
  reconciliationMap: Map<string, MergeStrategy>;

  /** Tick when operation started */
  startTick: bigint;

  /** Tick when operation completed (if completed) */
  completeTick: bigint | null;

  /** Energy cost for merge operation (paid upfront) */
  energyCost: number;

  /** Error message if merge failed */
  errorMessage: string | null;

  /** Entities preserved from source */
  entitiesPreserved: number;

  /** Entities merged (hybrid strategy) */
  entitiesMerged: number;

  /** Entities discarded (conflict resolution) */
  entitiesDiscarded: number;
}

/**
 * Create timeline merger operation component
 */
export function createTimelineMergerOperation(
  mergerShipId: string,
  sourceUniverseId: string,
  targetUniverseId: string,
  startTick: bigint
): TimelineMergerOperationComponent {
  return {
    type: 'timeline_merger_operation',
    version: 1,
    mergerShipId,
    sourceUniverseId,
    targetUniverseId,
    state: 'scanning',
    mergeProgress: 0,
    compatibilityScore: null,
    compatibilityFactors: null,
    conflicts: [],
    reconciliationMap: new Map(),
    startTick,
    completeTick: null,
    energyCost: 10000,  // Fixed cost per merge
    errorMessage: null,
    entitiesPreserved: 0,
    entitiesMerged: 0,
    entitiesDiscarded: 0,
  };
}

/**
 * Component schema for validation
 */
export const TimelineMergerOperationSchema: ComponentSchema<TimelineMergerOperationComponent> = {
  type: 'timeline_merger_operation',
  version: 1,
  fields: [
    { name: 'mergerShipId', type: 'string', required: true },
    { name: 'sourceUniverseId', type: 'string', required: true },
    { name: 'targetUniverseId', type: 'string', required: true },
    { name: 'state', type: 'string', required: true },
    { name: 'mergeProgress', type: 'number', required: true },
    { name: 'compatibilityScore', type: 'number', required: false },
    { name: 'compatibilityFactors', type: 'object', required: false },
    { name: 'conflicts', type: 'object', required: true },
    { name: 'reconciliationMap', type: 'object', required: true },
    { name: 'startTick', type: 'number', required: true },
    { name: 'completeTick', type: 'number', required: false },
    { name: 'energyCost', type: 'number', required: true },
    { name: 'errorMessage', type: 'string', required: false },
    { name: 'entitiesPreserved', type: 'number', required: true },
    { name: 'entitiesMerged', type: 'number', required: true },
    { name: 'entitiesDiscarded', type: 'number', required: true },
  ],
  validate: (data: unknown): data is TimelineMergerOperationComponent => {
    if (typeof data !== 'object' || data === null) return false;
    if (!('type' in data) || data.type !== 'timeline_merger_operation') return false;
    if (!('mergerShipId' in data) || typeof data.mergerShipId !== 'string') return false;
    if (!('sourceUniverseId' in data) || typeof data.sourceUniverseId !== 'string') return false;
    if (!('targetUniverseId' in data) || typeof data.targetUniverseId !== 'string') return false;
    if (!('state' in data) || typeof data.state !== 'string') return false;
    return true;
  },
  createDefault: () => createTimelineMergerOperation('', '', '', 0n),
};
