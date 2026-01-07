/**
 * Core persistence types - Schema versioning and serialization
 */

import type { UniverseDivineConfig } from '../divinity/UniverseConfig.js';

/**
 * TerrainSnapshot interface - defined here to avoid circular dependency with world package.
 * This must match the structure in @ai-village/world/chunks/types.ts
 */
export interface TerrainSnapshot {
  $schema: 'https://aivillage.dev/schemas/terrain/v1';
  $version: 1;
  chunkSize: number;
  generatedChunkCount: number;
  chunkIndex: Array<{
    key: string;
    x: number;
    y: number;
    generated: boolean;
    tileCount: number;
    entityCount: number;
    checksum: string;
  }>;
  chunks: Record<string, unknown>;
  checksums: {
    overall: string;
    perChunk: Record<string, string>;
  };
}

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
// World State
// ============================================================================

export interface WorldSnapshot {
  /** Terrain data (compressed) */
  terrain: TerrainSnapshot | null;

  /** Zone configuration */
  zones: ZoneSnapshot[];

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
