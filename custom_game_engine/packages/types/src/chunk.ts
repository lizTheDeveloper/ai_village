/**
 * Chunk and World interfaces.
 *
 * These interfaces define the contract between core and world packages
 * without creating circular dependencies.
 */

import type { EntityId, Priority } from './common.js';
import type { ITile } from './terrain.js';

/**
 * Chunk interface - represents a 32x32 tile region of the world.
 */
export interface IChunk {
  readonly x: number;
  readonly y: number;
  generated: boolean;
  tiles: unknown[];
  entities: Set<EntityId>;
}

/**
 * ChunkManager interface for tile access and chunk management.
 */
export interface IChunkManager {
  getChunk(chunkX: number, chunkY: number): IChunk | undefined;
  hasChunk(chunkX: number, chunkY: number): boolean;
  getLoadedChunks?(): Array<{ x: number; y: number; tiles: unknown[] }>;
}

/**
 * TerrainGenerator interface for generating chunks on-demand.
 */
export interface ITerrainGenerator {
  generateChunk(chunk: IChunk, world: IWorldMutator): void;
}

/**
 * BackgroundChunkGenerator interface for asynchronous chunk pre-generation.
 */
export interface IBackgroundChunkGenerator {
  queueChunk(request: {
    chunkX: number;
    chunkY: number;
    priority: Priority;
    requestedBy: string;
  }): void;
  queueChunkGrid(
    centerX: number,
    centerY: number,
    radius: number,
    priority: Priority,
    requestedBy: string
  ): void;
  processQueue(world: IWorld, currentTick: number): void;
}

/**
 * Planet configuration.
 */
export interface IPlanetConfig {
  id: string;
  name: string;
  type: string;
  seed: string;
  gravity?: number;
  atmosphereDensity?: number;
  isTidallyLocked?: boolean;
  isStarless?: boolean;
  dayLengthHours?: number;
  skyColor?: string;
  description?: string;
}

/**
 * Planet interface for multi-planet support.
 *
 * Each planet has its own:
 * - ChunkManager for terrain storage
 * - TerrainGenerator with planet-specific parameters
 * - Named locations registry
 * - Entity tracking
 */
export interface IPlanet {
  /** Planet configuration */
  readonly config: IPlanetConfig;

  /** Get chunk manager for this planet */
  readonly chunkManager: IChunkManager;

  /** Get a chunk, generating terrain if needed */
  getChunk(chunkX: number, chunkY: number, world?: IWorldMutator): IChunk;

  /** Get tile at world coordinates */
  getTileAt(worldX: number, worldY: number): ITile | undefined;

  /** Planet ID shortcut */
  readonly id: string;

  /** Planet name shortcut */
  readonly name: string;

  /** Planet type shortcut */
  readonly type: string;

  /** Add entity to this planet's tracking */
  addEntity(entityId: string): void;

  /** Remove entity from this planet's tracking */
  removeEntity(entityId: string): void;

  /** Check if entity is on this planet */
  hasEntity(entityId: string): boolean;

  /** Get all entity IDs on this planet */
  readonly entities: ReadonlySet<string>;

  /** Get entity count on this planet */
  readonly entityCount: number;

  /** Name a location on this planet */
  nameLocation(
    chunkX: number,
    chunkY: number,
    name: string,
    namedBy: string,
    tick: number,
    description?: string
  ): void;

  /** Find a named location */
  findLocation(name: string): { chunkX: number; chunkY: number } | undefined;

  /** Get the name of a location */
  getLocationName(chunkX: number, chunkY: number): string | undefined;
}

/**
 * Minimal World interface for type contracts.
 * The actual World class has many more methods, but this defines
 * the minimal interface needed for cross-package contracts.
 */
export interface IWorld {
  readonly tick: number;
  readonly entities: ReadonlyMap<EntityId, IEntity>;
  getEntity(id: EntityId): IEntity | undefined;
}

/**
 * World mutator interface - extends IWorld with mutation capabilities.
 */
export interface IWorldMutator extends IWorld {
  createEntity(archetype?: string): IEntity;
  removeEntity(id: EntityId): boolean;
}

/**
 * Minimal Entity interface for type contracts.
 */
export interface IEntity {
  readonly id: EntityId;
  hasComponent(type: string): boolean;
  getComponent<T>(type: string): T | undefined;
}
