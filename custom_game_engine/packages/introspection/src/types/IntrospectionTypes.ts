/**
 * Type definitions for GameIntrospectionAPI
 *
 * Unified types for introspection, queries, mutations, and observability.
 * Supports "pit of success" patterns with validation, caching, and reversibility.
 */

import type { ComponentSchema } from './ComponentSchema.js';
import type { ComponentCategory } from './CategoryTypes.js';
import type { MutationSource } from '../mutation/MutationEvent.js';
import type { CacheStats } from '../cache/RenderCache.js';

// Re-export existing types for convenience
export type { MutationSource };
export type { CacheStats };

/**
 * Simulation mode from SimulationScheduler
 */
export type SimulationMode = 'ALWAYS' | 'PROXIMITY' | 'PASSIVE';

/**
 * Visibility level for schema introspection
 */
export type VisibilityLevel = 'full' | 'llm' | 'player';

/**
 * Function to unsubscribe from entity watching
 */
export type UnsubscribeFunction = () => void;

// ============================================================================
// Entity Queries
// ============================================================================

/**
 * Result of entity introspection with schema metadata
 */
export interface EntityIntrospectionResult {
  /** Entity ID */
  id: string;

  /** Component data (filtered by requested components if specified) */
  components: Record<string, any>;

  /** Component schemas for introspected components */
  schemas: Record<string, ComponentSchema>;

  /** Metadata about the entity and query */
  metadata: {
    /** Simulation mode (ALWAYS, PROXIMITY, PASSIVE) */
    simulationMode: SimulationMode;

    /** Last tick this entity was updated */
    lastUpdate: number;

    /** Whether this result came from cache */
    cacheHit: boolean;
  };
}

/**
 * Spatial bounds for entity queries
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Time range for queries
 */
export interface TimeRange {
  /** Start tick (inclusive) */
  start: number;

  /** End tick (inclusive) */
  end: number;
}

/**
 * Query parameters for entity search
 */
export interface EntityQuery {
  /** Filter to entities with these component types */
  componentFilters?: string[];

  /** Spatial bounds to search within */
  bounds?: Bounds;

  /** Maximum number of results to return */
  limit?: number;

  /** Offset for pagination */
  offset?: number;

  /** Filter by simulation mode */
  simulationMode?: SimulationMode;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Request for a validated mutation
 */
export interface SafeMutationRequest {
  /** Entity ID to mutate */
  entityId: string;

  /** Component type to mutate */
  componentType: string;

  /** Field name within the component */
  field: string;

  /** New value to set */
  value: any;

  /** Reason for the mutation (for audit trail) */
  reason?: string;

  /** Whether to validate the mutation (default: true) */
  validate?: boolean;

  /** Source of the mutation */
  source?: MutationSource;
}

/**
 * Extended result of a mutation attempt (includes metrics and audit trail)
 * More detailed than the base MutationResult from mutation/MutationService
 */
export interface SafeMutationResult {
  /** Whether the mutation succeeded */
  success: boolean;

  /** Previous value before mutation */
  oldValue: any;

  /** New value after mutation */
  newValue: any;

  /** Validation errors if mutation failed */
  validationErrors?: string[];

  /** Undo ID for reverting this mutation */
  undoId?: string;

  /** Metrics about the mutation */
  metrics: {
    /** Latency in milliseconds */
    latency: number;

    /** Number of cache entries invalidated */
    cacheInvalidations: number;
  };
}

/**
 * Result of batch mutation operation
 */
export interface BatchMutationResult {
  /** Whether all mutations succeeded */
  success: boolean;

  /** Individual mutation results */
  results: SafeMutationResult[];

  /** Number of successful mutations */
  successCount: number;

  /** Number of failed mutations */
  failureCount: number;

  /** Whether the batch was rolled back due to failure */
  rolledBack: boolean;

  /** Error message if batch failed */
  error?: string;
}

/**
 * Result of undo operation
 */
export interface UndoResult {
  /** Whether the undo succeeded */
  success: boolean;

  /** Number of mutations undone */
  count: number;

  /** Error message if undo failed */
  error?: string;
}

/**
 * Result of redo operation
 */
export interface RedoResult {
  /** Whether the redo succeeded */
  success: boolean;

  /** Number of mutations redone */
  count: number;

  /** Error message if redo failed */
  error?: string;
}

/**
 * Entry in mutation history
 */
export interface MutationHistoryEntry {
  /** Unique ID for this mutation */
  id: string;

  /** Entity ID that was mutated */
  entityId: string;

  /** Component type that was mutated */
  componentType: string;

  /** Field that was mutated */
  field: string;

  /** Old value before mutation */
  oldValue: any;

  /** New value after mutation */
  newValue: any;

  /** Tick when mutation occurred */
  tick: number;

  /** Source of the mutation */
  source: MutationSource;

  /** Reason for the mutation */
  reason?: string;

  /** Whether this mutation has been undone */
  undone: boolean;
}

// ============================================================================
// Building Management
// ============================================================================

/**
 * Request to place a building
 */
export interface PlaceBuildingRequest {
  /** Blueprint ID to place */
  blueprintId: string;

  /** Position to place the building */
  position: { x: number; y: number };

  /** Owner entity ID (optional) */
  owner?: string;

  /** Whether to check for collisions (default: true) */
  checkCollisions?: boolean;

  /** Rotation in degrees (0, 90, 180, 270) */
  rotation?: number;
}

/**
 * Result of building placement
 */
export interface PlaceBuildingResult {
  /** Whether placement succeeded */
  success: boolean;

  /** ID of the placed building entity */
  buildingId?: string;

  /** Error message if placement failed */
  error?: string;

  /** Collision information if placement failed */
  collisions?: Array<{
    /** Entity ID of colliding entity */
    entityId: string;

    /** Type of colliding entity */
    type: string;

    /** Position of collision */
    position: { x: number; y: number };
  }>;
}

/**
 * Information about a placed building
 */
export interface BuildingInfo {
  /** Building entity ID */
  id: string;

  /** Blueprint ID */
  blueprintId: string;

  /** Building name */
  name: string;

  /** Building category */
  category: string;

  /** Current position */
  position: { x: number; y: number };

  /** Owner entity ID */
  owner?: string;

  /** Building state (active, under_construction, abandoned, etc.) */
  state: string;

  /** Creation tick */
  createdAt: number;
}

/**
 * Information about a building blueprint
 */
export interface BlueprintInfo {
  /** Blueprint ID */
  id: string;

  /** Blueprint name */
  name: string;

  /** Blueprint category */
  category: string;

  /** Description */
  description: string;

  /** Dimensions */
  dimensions: { width: number; height: number; depth: number };

  /** Resource costs */
  costs: Record<string, number>;

  /** Required skills */
  requiredSkills?: Record<string, number>;
}

// ============================================================================
// Skills & Progression
// ============================================================================

/**
 * Result of skill XP grant
 */
export interface SkillProgressionResult {
  /** Whether XP was granted successfully */
  success: boolean;

  /** Skill name */
  skill: string;

  /** Previous level */
  previousLevel: number;

  /** New level */
  newLevel: number;

  /** Previous XP */
  previousXP: number;

  /** New XP */
  newXP: number;

  /** Whether the entity leveled up */
  leveledUp: boolean;

  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Behavioral Control
// ============================================================================

/**
 * Request to trigger a behavior
 */
export interface TriggerBehaviorRequest {
  /** Entity ID to trigger behavior on */
  entityId: string;

  /** Behavior name to trigger */
  behavior: string;

  /** Parameters for the behavior */
  params?: Record<string, any>;

  /** Whether to validate the behavior exists */
  validate?: boolean;
}

/**
 * Result of behavior trigger
 */
export interface BehaviorResult {
  /** Whether the behavior was triggered successfully */
  success: boolean;

  /** Behavior name */
  behavior: string;

  /** Error message if failed */
  error?: string;

  /** Behavior state if available */
  state?: any;
}

// ============================================================================
// Observability
// ============================================================================

/**
 * Options for watching entity changes
 */
export interface WatchOptions {
  /** Filter to specific component types */
  components?: string[];

  /** Filter to specific fields */
  fields?: string[];

  /** Callback when entity changes */
  onChange: (event: EntityChangeEvent) => void;

  /** Throttle notifications (milliseconds) */
  throttle?: number;
}

/**
 * Event emitted when entity changes
 */
export interface EntityChangeEvent {
  /** Entity ID that changed */
  entityId: string;

  /** Tick when change occurred */
  tick: number;

  /** List of changes */
  changes: Array<{
    /** Component type that changed */
    componentType: string;

    /** Field that changed */
    field: string;

    /** Old value */
    oldValue: any;

    /** New value */
    newValue: any;
  }>;
}

// CacheStats is re-exported from ../cache/RenderCache.js above

// ============================================================================
// Snapshots & Time Travel
// ============================================================================

/**
 * Snapshot ID (opaque)
 */
export type SnapshotId = string;

/**
 * Entity state within a snapshot
 */
export interface EntityState {
  /** Entity ID */
  id: string;

  /** Serialized component data */
  components: Record<string, unknown>;
}

/**
 * Full entity snapshot with metadata
 */
export interface EntitySnapshot {
  /** Snapshot ID */
  id: SnapshotId;

  /** Tick when snapshot was created */
  createdAt: number;

  /** Custom metadata */
  metadata: Record<string, any>;

  /** Entity states */
  entities: Map<string, EntityState>;

  /** Snapshot metrics */
  metrics: {
    /** Time taken to create snapshot (ms) */
    creationLatency: number;

    /** Number of entities in snapshot */
    entityCount: number;
  };
}

/**
 * Snapshot metadata (for listing)
 */
export interface SnapshotMetadata {
  /** Snapshot ID */
  id: SnapshotId;

  /** Tick when snapshot was created */
  createdAt: number;

  /** Number of entities in snapshot */
  entityCount: number;

  /** Custom metadata */
  metadata: Record<string, any>;
}

/**
 * Result of snapshot restoration
 */
export interface RestoreResult {
  /** Whether restoration succeeded */
  success: boolean;

  /** Number of entities restored */
  entitiesRestored: number;

  /** Snapshot metadata */
  snapshot?: {
    /** Snapshot ID */
    id: SnapshotId;

    /** Tick when snapshot was created */
    createdAt: number;

    /** Custom metadata */
    metadata: Record<string, any>;
  };

  /** Error message if restoration failed */
  error?: string;
}

// ============================================================================
// Economic & Environmental
// ============================================================================

/**
 * Economic metrics for resources
 */
export interface EconomicMetrics {
  /** Resource prices by resource type */
  prices: Record<string, {
    /** Current price */
    current: number;

    /** Average price over time range */
    average: number;

    /** Minimum price over time range */
    min: number;

    /** Maximum price over time range */
    max: number;

    /** Price trend (positive = rising, negative = falling) */
    trend: number;
  }>;

  /** Trade volume by resource type */
  tradeVolume: Record<string, {
    /** Total quantity traded */
    quantity: number;

    /** Number of trades */
    tradeCount: number;

    /** Total value traded */
    value: number;
  }>;

  /** Market participants */
  participants: {
    /** Number of buyers */
    buyers: number;

    /** Number of sellers */
    sellers: number;

    /** Number of active traders */
    activeTraders: number;
  };
}

/**
 * Environmental state
 */
export interface EnvironmentalState {
  /** Weather conditions */
  weather: {
    /** Temperature in Celsius */
    temperature: number;

    /** Precipitation (0-1) */
    precipitation: number;

    /** Wind speed */
    windSpeed: number;

    /** Wind direction in degrees */
    windDirection: number;

    /** Cloud cover (0-1) */
    cloudCover: number;

    /** Current weather type */
    type: string;
  };

  /** Time information */
  time: {
    /** Current tick */
    tick: number;

    /** Time of day (0-24 hours) */
    timeOfDay: number;

    /** Day number */
    day: number;

    /** Season */
    season: string;

    /** Moon phase (0-1) */
    moonPhase: number;
  };

  /** Soil conditions (if bounds specified) */
  soil?: {
    /** Average moisture (0-1) */
    moisture: number;

    /** Average fertility (0-1) */
    fertility: number;

    /** Average temperature */
    temperature: number;
  };

  /** Light levels (if bounds specified) */
  light?: {
    /** Average sunlight (0-1) */
    sunlight: number;

    /** Average ambient light (0-1) */
    ambient: number;
  };
}
