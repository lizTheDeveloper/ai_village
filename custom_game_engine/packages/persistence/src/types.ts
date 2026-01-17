/**
 * Core persistence types - Schema versioning and serialization
 */

import type { TerrainSnapshot, PlanetSnapshot } from '@ai-village/world';
import type { UniverseDivineConfig } from '@ai-village/divinity';

// ============================================================================
// Base Versioning
// ============================================================================

export interface Versioned {
  $schema: string;
  $version: number;
}

// ============================================================================
// Component Serialization
// ============================================================================

export interface VersionedComponent extends Versioned {
  $schema: 'https://aivillage.dev/schemas/component/v1';
  type: string;
  data: unknown;
}

export interface VersionedEntity extends Versioned {
  $schema: 'https://aivillage.dev/schemas/entity/v1';
  id: string;
  components: VersionedComponent[];
}

// ============================================================================
// Universe & Multiverse
// ============================================================================

export interface MultiverseTime {
  /** Ticks since multiverse creation (never decreases) */
  absoluteTick: string;  // Serialized bigint

  /** Real-world timestamp when multiverse was created */
  originTimestamp: number;

  /** Current real-world timestamp */
  currentTimestamp: number;

  /** Real-world seconds elapsed since creation */
  realTimeElapsed: number;
}

export interface UniverseTime {
  /** Universe this time belongs to */
  universeId: string;

  /** Ticks since THIS universe was created/forked */
  universeTick: string;  // Serialized bigint

  /** Time scale relative to multiverse (1.0 = normal, 2.0 = 2x speed) */
  timeScale: number;

  /** Game day within this universe */
  day: number;

  /** Time of day (0-24) */
  timeOfDay: number;

  /** Current phase */
  phase: 'dawn' | 'day' | 'dusk' | 'night';

  /** If forked, the parent universe tick when fork occurred */
  forkPoint?: {
    parentUniverseId: string;
    parentUniverseTick: string;  // Serialized bigint
    multiverseTick: string;      // Serialized bigint
  };

  /** Whether time is paused in this universe */
  paused: boolean;

  /** Accumulated pause time (real seconds) */
  pausedDuration: number;
}

// ============================================================================
// Zone Serialization
// ============================================================================

export type ZoneType =
  | 'farming'
  | 'storage'
  | 'industry'
  | 'housing'
  | 'social'
  | 'pasture'
  | 'wilderness'
  | 'restricted';

export interface ZoneSnapshot extends Versioned {
  $schema: 'https://aivillage.dev/schemas/zone/v1';

  /** Zone ID */
  id: string;

  /** Zone type */
  type: ZoneType;

  /** Priority (1-10, higher = stronger influence) */
  priority: number;

  /** Tiles in this zone (array of "x,y" keys) */
  tiles: string[];

  /** Tick when created */
  createdAt: number;
}

// ============================================================================
// Passage Serialization
// ============================================================================

export interface PassageSnapshot extends Versioned {
  $schema: 'https://aivillage.dev/schemas/passage/v1';

  /** Passage ID */
  id: string;

  /** Source universe ID */
  sourceUniverseId: string;

  /** Target universe ID */
  targetUniverseId: string;

  /** Passage type */
  type: 'thread' | 'bridge' | 'gate' | 'confluence';

  /** Whether passage is currently active */
  active: boolean;
}

// ============================================================================
// Planet Serialization
// ============================================================================

/**
 * Planet terrain snapshot - combines planet config with its terrain data.
 * Each planet has its own ChunkManager and terrain.
 */
export interface PlanetTerrainSnapshot extends Versioned {
  $schema: 'https://aivillage.dev/schemas/planet-terrain/v1';

  /** Planet configuration and metadata (from PlanetSnapshot in @ai-village/world) */
  planet: PlanetSnapshot;

  /** Terrain data for this planet (compressed chunks) */
  terrain: TerrainSnapshot | null;
}

/**
 * Intra-universe portal snapshot (planet-to-planet travel).
 * Distinct from Passage which is universe-to-universe.
 */
export interface PlanetPortalSnapshot extends Versioned {
  $schema: 'https://aivillage.dev/schemas/planet-portal/v1';

  /** Portal ID */
  id: string;

  /** Source planet ID */
  fromPlanetId: string;

  /** Target planet ID */
  toPlanetId: string;

  /** Portal location on source planet */
  fromPosition?: { x: number; y: number };

  /** Portal location on target planet */
  toPosition?: { x: number; y: number };

  /** Whether portal is discovered */
  discovered: boolean;

  /** Whether portal is active/usable */
  activated: boolean;

  /** Whether travel works both ways */
  bidirectional: boolean;

  /** Cost to use portal (item IDs and quantities) */
  usageCost?: Array<{ itemId: string; quantity: number }>;

  /** Who discovered this portal */
  discoveredBy?: string;

  /** Tick when discovered */
  discoveredAt?: number;
}

// ============================================================================
// World State
// ============================================================================

export interface WorldSnapshot {
  /**
   * Legacy terrain data (for backward compatibility).
   * New saves use planets array instead.
   * @deprecated Use planets array for new saves
   */
  terrain: TerrainSnapshot | null;

  /** Zone configuration */
  zones: ZoneSnapshot[];

  /**
   * All planets in this universe (Phase 4+).
   * Each planet has its own terrain and config.
   */
  planets?: PlanetTerrainSnapshot[];

  /**
   * Active planet ID (where the player/camera is focused).
   * If undefined, defaults to first planet or legacy terrain.
   */
  activePlanetId?: string;

  /**
   * Portals between planets within this universe.
   */
  planetPortals?: PlanetPortalSnapshot[];

  // NOTE: Weather state is stored as WeatherComponent on entities (already serialized)
  // NOTE: Building data is stored in tiles (walls/doors/windows) and BuildingComponent entities (already serialized)
}

export interface UniverseSnapshot extends Versioned {
  $schema: 'https://aivillage.dev/schemas/universe/v1';

  /** Universe identity */
  identity: {
    id: string;
    name: string;
    createdAt: number;
    schemaVersion: number;
    parentId?: string;
    forkedAtTick?: string;
  };

  /** Universe time */
  time: UniverseTime;

  /** Universe divine config - controls divine powers, belief economy, etc. */
  config: Partial<UniverseDivineConfig> | Record<string, never>;

  /** All entities in this universe */
  entities: VersionedEntity[];

  /** World state */
  worldState: WorldSnapshot;

  /** Checksums */
  checksums: {
    entities: string;
    components: string;
    worldState: string;
  };
}

export interface MultiverseSnapshot extends Versioned {
  $schema: 'https://aivillage.dev/schemas/multiverse/v1';

  /** Multiverse time state */
  time: MultiverseTime;

  /** Multiverse-level config */
  config: unknown;
}

// ============================================================================
// Save File
// ============================================================================

/**
 * Snapshot decay policy - controls how long a snapshot persists
 * Decay is measured in universe-relative time (tau = causality delta)
 */
export interface SnapshotDecayPolicy {
  /**
   * Decay after this many universe-ticks (tau).
   * Example: 1200 ticks/min at 20 TPS → 24000 ticks = 20 min
   */
  decayAfterTicks?: number;

  /**
   * Never decay (canonical events, important milestones)
   */
  neverDecay?: boolean;

  /**
   * Reason for preservation (for debugging/logging)
   */
  preservationReason?: string;
}

export interface SaveFileHeader {
  /** When this save was created */
  createdAt: number;

  /** Last save time */
  lastSavedAt: number;

  /** Total play time (real seconds) */
  playTime: number;

  /** Game version that created this save */
  gameVersion: string;

  /** Save file format version */
  formatVersion: number;

  /** Save name */
  name: string;

  /** Optional description */
  description?: string;

  /** Screenshot (base64 PNG) */
  screenshot?: string;

  /**
   * Snapshot decay policy (client-controlled)
   * Default: decay after 24 hours of universe-time
   */
  decayPolicy?: SnapshotDecayPolicy;
}

export interface SaveFileChecksums {
  /** SHA256 of entire save file (excluding this field) */
  overall: string;

  /** Per-universe checksums */
  universes: Record<string, string>;

  /** Multiverse state checksum */
  multiverse: string;
}

export interface SaveFile extends Versioned {
  $schema: 'https://aivillage.dev/schemas/savefile/v1';
  $version: 1;

  /** Save metadata */
  header: SaveFileHeader;

  /** Multiverse state */
  multiverse: MultiverseSnapshot;

  /** All universes in this save */
  universes: UniverseSnapshot[];

  /** Passage connections between universes */
  passages: PassageSnapshot[];

  /** Player state */
  player?: unknown;

  /** God-crafted queue (microgenerator content) */
  godCraftedQueue?: {
    version: number;
    entries: unknown[];  // QueueEntry[] from microgenerators
  };

  /** Integrity checksums */
  checksums: SaveFileChecksums;
}

// ============================================================================
// Migration
// ============================================================================

export interface Migration<T = unknown> {
  component: string;
  fromVersion: number;
  toVersion: number;
  description: string;
  migrate: (data: unknown, context?: MigrationContext) => T;
}

export interface MigrationContext {
  entity?: unknown;  // Entity (avoid circular dep)
  world?: unknown;   // World (avoid circular dep)
}

export interface MigrationResult {
  /** Did migration produce a component split? */
  _split?: boolean;

  /** If split, the resulting components */
  components?: unknown[];

  /** Otherwise, the single migrated component */
  [key: string]: unknown;
}

// ============================================================================
// Serialization
// ============================================================================

export interface ComponentSerializer<T> {
  /** Serialize component to versioned format */
  serialize(component: T): VersionedComponent;

  /** Deserialize from versioned format */
  deserialize(data: VersionedComponent, context?: MigrationContext): T;

  /** Migrate from old version to current */
  migrate(from: number, data: unknown, context?: MigrationContext): unknown;

  /** Validate deserialized data */
  validate(data: unknown): data is T;

  /** Current version this serializer handles */
  readonly currentVersion: number;
}

// ============================================================================
// Storage
// ============================================================================

export interface SaveMetadata {
  key: string;
  name: string;
  createdAt: number;
  lastSavedAt: number;
  playTime: number;
  gameVersion: string;
  formatVersion: number;
  fileSize: number;
  screenshot?: string;
}

export interface StorageInfo {
  backend: string;
  usedBytes: number;
  availableBytes?: number;
  totalBytes?: number;
  quotaExceeded: boolean;
}

export interface StorageBackend {
  /** Save a file */
  save(key: string, data: SaveFile): Promise<void>;

  /** Load a file */
  load(key: string): Promise<SaveFile | null>;

  /** List all saves */
  list(): Promise<SaveMetadata[]>;

  /** Delete a save */
  delete(key: string): Promise<void>;

  /** Get save metadata without loading full file */
  getMetadata(key: string): Promise<SaveMetadata | null>;

  /** Check available space */
  getStorageInfo(): Promise<StorageInfo>;
}

// ============================================================================
// Error Types
// ============================================================================

export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly fromVersion: number,
    public readonly toVersion: number
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class SerializationError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly data: unknown
  ) {
    super(message);
    this.name = 'SerializationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ChecksumMismatchError extends Error {
  constructor(
    message: string,
    public readonly expected: string,
    public readonly actual: string
  ) {
    super(message);
    this.name = 'ChecksumMismatchError';
  }
}
