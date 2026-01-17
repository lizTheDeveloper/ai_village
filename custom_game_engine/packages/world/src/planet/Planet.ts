/**
 * Planet - A visitable location within a universe
 *
 * Each planet has its own:
 * - Terrain generation parameters (via PlanetConfig)
 * - ChunkManager for storing generated chunks
 * - ChunkNameRegistry for named locations
 * - Set of entities currently on this planet
 */

import { ChunkManager } from '../chunks/ChunkManager.js';
import { ChunkNameRegistry } from '../chunks/ChunkNameRegistry.js';
import { TerrainGenerator } from '../terrain/TerrainGenerator.js';
import type { Chunk } from '../chunks/Chunk.js';
import type { Tile } from '../chunks/Tile.js';
import type { PlanetConfig, PlanetSnapshot } from './PlanetTypes.js';
import type { WorldMutator, GodCraftedDiscoverySystem } from '@ai-village/core';

/**
 * Planet class - manages terrain and entities for a single planet.
 */
export class Planet {
  /** Planet configuration (type, parameters, allowed biomes) */
  readonly config: PlanetConfig;

  /** Chunk manager for this planet's terrain */
  readonly chunkManager: ChunkManager;

  /** Named locations registry */
  readonly nameRegistry: ChunkNameRegistry;

  /** Terrain generator configured for this planet */
  private terrainGenerator: TerrainGenerator;

  /** Entity IDs currently on this planet */
  private _entities: Set<string> = new Set();

  /** Optional GodCraftedDiscoverySystem for spawning content */
  private godCraftedSpawner?: GodCraftedDiscoverySystem;

  constructor(config: PlanetConfig, godCraftedSpawner?: GodCraftedDiscoverySystem) {
    this.config = config;
    this.chunkManager = new ChunkManager(2); // Default load radius
    this.nameRegistry = new ChunkNameRegistry();
    this.terrainGenerator = new TerrainGenerator(config.seed, godCraftedSpawner, config);
    this.godCraftedSpawner = godCraftedSpawner;
  }

  // ===========================================================================
  // Terrain Access
  // ===========================================================================

  /**
   * Get a chunk, generating terrain if needed.
   */
  getChunk(chunkX: number, chunkY: number, world?: WorldMutator): Chunk {
    const chunk = this.chunkManager.getChunk(chunkX, chunkY);

    // Generate terrain if not yet generated
    if (!chunk.generated && world) {
      this.terrainGenerator.generateChunk(chunk, world);
    }

    return chunk;
  }

  /**
   * Get a tile at world coordinates.
   */
  getTileAt(worldX: number, worldY: number): Tile | undefined {
    const CHUNK_SIZE = 32;
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);
    const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk = this.chunkManager.getChunk(chunkX, chunkY);
    return chunk.tiles[localY * CHUNK_SIZE + localX];
  }

  /**
   * Get the terrain generator for this planet.
   */
  getTerrainGenerator(): TerrainGenerator {
    return this.terrainGenerator;
  }

  // ===========================================================================
  // Entity Management
  // ===========================================================================

  /**
   * Get all entity IDs on this planet.
   */
  get entities(): ReadonlySet<string> {
    return this._entities;
  }

  /**
   * Add an entity to this planet.
   */
  addEntity(entityId: string): void {
    this._entities.add(entityId);
  }

  /**
   * Remove an entity from this planet.
   */
  removeEntity(entityId: string): void {
    this._entities.delete(entityId);
  }

  /**
   * Check if an entity is on this planet.
   */
  hasEntity(entityId: string): boolean {
    return this._entities.has(entityId);
  }

  /**
   * Get the number of entities on this planet.
   */
  get entityCount(): number {
    return this._entities.size;
  }

  // ===========================================================================
  // Named Locations
  // ===========================================================================

  /**
   * Name a chunk location.
   */
  nameLocation(
    chunkX: number,
    chunkY: number,
    name: string,
    namedBy: string,
    tick: number,
    description?: string
  ): void {
    this.nameRegistry.setName(chunkX, chunkY, name, namedBy, tick, description);
  }

  /**
   * Find a named location.
   */
  findLocation(name: string): { chunkX: number; chunkY: number } | undefined {
    return this.nameRegistry.findByName(name);
  }

  /**
   * Get the name of a chunk location.
   */
  getLocationName(chunkX: number, chunkY: number): string | undefined {
    return this.nameRegistry.getName(chunkX, chunkY)?.name;
  }

  // ===========================================================================
  // Metadata
  // ===========================================================================

  /**
   * Get planet ID.
   */
  get id(): string {
    return this.config.id;
  }

  /**
   * Get planet name.
   */
  get name(): string {
    return this.config.name;
  }

  /**
   * Get planet type.
   */
  get type(): string {
    return this.config.type;
  }

  /**
   * Record a visit to this planet.
   */
  recordVisit(): void {
    this.config.visitCount = (this.config.visitCount ?? 0) + 1;
  }

  /**
   * Mark planet as discovered.
   */
  markDiscovered(discoveredBy: string, tick: number): void {
    if (this.config.discoveredAt === undefined) {
      this.config.discoveredAt = tick;
      this.config.discoveredBy = discoveredBy;
    }
  }

  // ===========================================================================
  // Serialization
  // ===========================================================================

  /**
   * Create a snapshot for persistence.
   */
  toSnapshot(): PlanetSnapshot {
    // Get named locations from registry
    const namedLocations: PlanetSnapshot['namedLocations'] = [];
    for (const { chunkX, chunkY, name: data } of this.nameRegistry.getAllNames()) {
      namedLocations.push({
        chunkX,
        chunkY,
        name: data.name,
        namedBy: data.namedBy,
        namedAt: data.namedAt,
        description: data.description,
      });
    }

    return {
      $schema: 'https://aivillage.dev/schemas/planet-snapshot/v1',
      config: this.config,
      namedLocations: namedLocations.length > 0 ? namedLocations : undefined,
    };
  }

  /**
   * Restore from a snapshot.
   */
  static fromSnapshot(snapshot: PlanetSnapshot, godCraftedSpawner?: GodCraftedDiscoverySystem): Planet {
    const planet = new Planet(snapshot.config, godCraftedSpawner);

    // Restore named locations
    if (snapshot.namedLocations) {
      for (const loc of snapshot.namedLocations) {
        planet.nameLocation(
          loc.chunkX,
          loc.chunkY,
          loc.name,
          loc.namedBy,
          loc.namedAt,
          loc.description
        );
      }
    }

    return planet;
  }

  // ===========================================================================
  // Chunk Statistics
  // ===========================================================================

  /**
   * Get number of generated chunks.
   */
  get generatedChunkCount(): number {
    let count = 0;
    for (const chunk of this.chunkManager.getLoadedChunks()) {
      if (chunk.generated) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get all generated chunks.
   */
  getGeneratedChunks(): Chunk[] {
    const chunks: Chunk[] = [];
    for (const chunk of this.chunkManager.getLoadedChunks()) {
      if (chunk.generated) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }
}

/**
 * Create a new planet from configuration.
 */
export function createPlanet(config: PlanetConfig, godCraftedSpawner?: GodCraftedDiscoverySystem): Planet {
  return new Planet(config, godCraftedSpawner);
}
