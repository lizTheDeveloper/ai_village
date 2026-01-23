/**
 * PlanetStorage - Server-side file-based storage for planets
 *
 * Stores planet metadata, biosphere data, terrain chunks, and named locations.
 * Enables cross-player/cross-save planet sharing for the persistent world system.
 *
 * Key concept: Planets are shared across all saves. Multiple save games can
 * reference the same planet, sharing terrain modifications. Only entity state
 * (agents, items, buildings-as-entities) is per-save.
 *
 * Directory structure:
 * /data/
 *   planets/
 *     {planetId}/
 *       metadata.json       - Planet config + stats
 *       biosphere.json.gz   - Compressed biosphere data (57s LLM generation)
 *       locations.json      - Named locations (global lore)
 *       chunks/
 *         {x},{y}.json.gz   - Compressed terrain chunk
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory - relative to demo folder (same as MultiverseStorage)
const DATA_DIR = path.join(__dirname, '../multiverse-data');

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export interface PlanetMetadata {
  id: string;
  name: string;
  type: 'magical' | 'terrestrial' | 'crystal' | 'desert' | 'volcanic' | 'oceanic';
  seed: string;
  createdAt: number;
  lastAccessedAt: number;
  /** Number of unique saves that have used this planet */
  saveCount: number;
  /** Total chunks generated */
  chunkCount: number;
  /** Whether biosphere has been generated */
  hasBiosphere: boolean;
  /** Planet configuration parameters */
  config: PlanetConfig;
}

export interface PlanetConfig {
  seed: string;
  type: string;
  /** Terrain generation parameters */
  terrain?: {
    baseElevation?: number;
    mountainFrequency?: number;
    waterLevel?: number;
    forestDensity?: number;
  };
  /** Climate parameters */
  climate?: {
    temperatureBase?: number;
    rainfallBase?: number;
    seasonStrength?: number;
  };
}

export interface BiosphereData {
  $schema?: string;
  $version?: number;
  /** Species definitions */
  species: Array<{
    id: string;
    name: string;
    type: 'plant' | 'animal' | 'fungus';
    traits: Record<string, unknown>;
    habitat: string[];
    diet?: string[];
  }>;
  /** Food web relationships */
  foodWeb: Array<{
    predator: string;
    prey: string;
    strength: number;
  }>;
  /** Ecological niches */
  niches?: Array<{
    id: string;
    name: string;
    conditions: Record<string, unknown>;
    species: string[];
  }>;
  /** Generation metadata */
  generatedAt: number;
  generationDurationMs?: number;
}

export interface NamedLocation {
  chunkX: number;
  chunkY: number;
  tileX?: number;
  tileY?: number;
  name: string;
  namedBy: string; // Player ID
  namedAt: number;
  description?: string;
  category?: 'landmark' | 'settlement' | 'resource' | 'danger' | 'mystery';
}

export interface SerializedChunk {
  x: number;
  y: number;
  /** RLE or delta compressed tile data */
  tiles: unknown;
  /** Compression method used */
  compression: 'rle' | 'delta' | 'full';
  /** Entity IDs in this chunk (for reference only) */
  entityIds?: string[];
  /** Last modification timestamp */
  modifiedAt: number;
  /** Who last modified this chunk */
  modifiedBy?: string;
  /** Checksum for integrity */
  checksum: string;
}

export interface ChunkListEntry {
  x: number;
  y: number;
  modifiedAt: number;
  fileSize: number;
}

// ============================================================
// PLANET STORAGE CLASS
// ============================================================

/**
 * PlanetStorage - File-based storage for the planet sharing system
 */
export class PlanetStorage {
  private initialized = false;

  /**
   * Initialize storage directories
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await fs.mkdir(path.join(DATA_DIR, 'planets'), { recursive: true });

    this.initialized = true;
    console.log('[PlanetStorage] Initialized at', path.join(DATA_DIR, 'planets'));
  }

  // ============================================================
  // PLANET MANAGEMENT
  // ============================================================

  /**
   * Create a new planet
   */
  async createPlanet(metadata: PlanetMetadata): Promise<void> {
    await this.init();

    const planetDir = path.join(DATA_DIR, 'planets', metadata.id);
    const chunksDir = path.join(planetDir, 'chunks');

    // Check if already exists
    try {
      await fs.access(planetDir);
      console.log(`[PlanetStorage] Planet ${metadata.id} already exists`);
      return;
    } catch {
      // Doesn't exist, continue with creation
    }

    await fs.mkdir(chunksDir, { recursive: true });

    // Write metadata
    await fs.writeFile(
      path.join(planetDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Initialize empty locations file
    await fs.writeFile(
      path.join(planetDir, 'locations.json'),
      JSON.stringify({ locations: [], lastUpdated: Date.now() }, null, 2)
    );

    console.log(`[PlanetStorage] Created planet ${metadata.id} (${metadata.name})`);
  }

  /**
   * Get planet metadata
   */
  async getPlanetMetadata(planetId: string): Promise<PlanetMetadata | null> {
    await this.init();

    const metadataPath = path.join(DATA_DIR, 'planets', planetId, 'metadata.json');

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /**
   * Update planet metadata
   */
  async updatePlanetMetadata(planetId: string, updates: Partial<PlanetMetadata>): Promise<void> {
    await this.init();

    const existing = await this.getPlanetMetadata(planetId);
    if (!existing) {
      throw new Error(`Planet ${planetId} not found`);
    }

    const updated = { ...existing, ...updates };
    const metadataPath = path.join(DATA_DIR, 'planets', planetId, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(updated, null, 2));
  }

  /**
   * List all planets
   */
  async listPlanets(): Promise<PlanetMetadata[]> {
    await this.init();

    const planetsDir = path.join(DATA_DIR, 'planets');

    try {
      const dirs = await fs.readdir(planetsDir, { withFileTypes: true });
      const planets: PlanetMetadata[] = [];

      for (const dir of dirs) {
        if (!dir.isDirectory()) continue;

        const metadata = await this.getPlanetMetadata(dir.name);
        if (!metadata) continue;

        planets.push(metadata);
      }

      // Sort by last accessed time (newest first)
      return planets.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * Delete a planet (marks as deleted per conservation rules)
   */
  async deletePlanet(planetId: string): Promise<void> {
    await this.init();

    const metadata = await this.getPlanetMetadata(planetId);
    if (!metadata) {
      throw new Error(`Planet ${planetId} not found`);
    }

    await this.updatePlanetMetadata(planetId, {
      name: `[DELETED] ${metadata.name}`,
    });

    console.log(`[PlanetStorage] Marked planet ${planetId} as deleted (preserved per conservation rules)`);
  }

  /**
   * Record that a save has accessed this planet (increments saveCount)
   */
  async recordPlanetAccess(planetId: string): Promise<void> {
    await this.init();

    const metadata = await this.getPlanetMetadata(planetId);
    if (!metadata) {
      throw new Error(`Planet ${planetId} not found`);
    }

    await this.updatePlanetMetadata(planetId, {
      lastAccessedAt: Date.now(),
      saveCount: metadata.saveCount + 1,
    });
  }

  // ============================================================
  // BIOSPHERE MANAGEMENT
  // ============================================================

  /**
   * Save biosphere data (compressed)
   */
  async saveBiosphere(planetId: string, biosphere: BiosphereData): Promise<void> {
    await this.init();

    const biospherePath = path.join(DATA_DIR, 'planets', planetId, 'biosphere.json.gz');

    // Compress and write
    const jsonData = JSON.stringify(biosphere);
    await this.compressAndWrite(jsonData, biospherePath);

    // Update metadata
    await this.updatePlanetMetadata(planetId, {
      hasBiosphere: true,
    });

    console.log(`[PlanetStorage] Saved biosphere for ${planetId} (${biosphere.species.length} species)`);
  }

  /**
   * Get biosphere data
   */
  async getBiosphere(planetId: string): Promise<BiosphereData | null> {
    await this.init();

    const biospherePath = path.join(DATA_DIR, 'planets', planetId, 'biosphere.json.gz');

    try {
      const content = await this.decompressAndRead(biospherePath);
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  // ============================================================
  // CHUNK MANAGEMENT
  // ============================================================

  /**
   * Save a terrain chunk (compressed)
   */
  async saveChunk(planetId: string, chunk: SerializedChunk): Promise<void> {
    await this.init();

    const chunkPath = path.join(
      DATA_DIR,
      'planets',
      planetId,
      'chunks',
      `${chunk.x},${chunk.y}.json.gz`
    );

    // Compress and write
    const jsonData = JSON.stringify(chunk);
    await this.compressAndWrite(jsonData, chunkPath);

    // Update chunk count in metadata
    const metadata = await this.getPlanetMetadata(planetId);
    if (metadata) {
      // Only increment if this is a new chunk
      const existingChunk = await this.getChunk(planetId, chunk.x, chunk.y);
      if (!existingChunk) {
        await this.updatePlanetMetadata(planetId, {
          chunkCount: metadata.chunkCount + 1,
        });
      }
    }
  }

  /**
   * Get a terrain chunk
   */
  async getChunk(planetId: string, x: number, y: number): Promise<SerializedChunk | null> {
    await this.init();

    const chunkPath = path.join(
      DATA_DIR,
      'planets',
      planetId,
      'chunks',
      `${x},${y}.json.gz`
    );

    try {
      const content = await this.decompressAndRead(chunkPath);
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  /**
   * Batch get multiple chunks
   */
  async batchGetChunks(
    planetId: string,
    coords: Array<{ x: number; y: number }>
  ): Promise<Map<string, SerializedChunk>> {
    await this.init();

    const results = new Map<string, SerializedChunk>();

    // Load chunks in parallel for performance
    const promises = coords.map(async ({ x, y }) => {
      const chunk = await this.getChunk(planetId, x, y);
      if (chunk) {
        results.set(`${x},${y}`, chunk);
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * List all generated chunks for a planet
   */
  async listChunks(planetId: string): Promise<ChunkListEntry[]> {
    await this.init();

    const chunksDir = path.join(DATA_DIR, 'planets', planetId, 'chunks');

    try {
      const files = await fs.readdir(chunksDir);
      const entries: ChunkListEntry[] = [];

      for (const file of files) {
        if (!file.endsWith('.json.gz')) continue;

        // Parse coordinates from filename (e.g., "5,10.json.gz")
        const match = file.match(/^(-?\d+),(-?\d+)\.json\.gz$/);
        if (!match) continue;

        const x = parseInt(match[1], 10);
        const y = parseInt(match[2], 10);

        const stats = await fs.stat(path.join(chunksDir, file));

        entries.push({
          x,
          y,
          modifiedAt: stats.mtimeMs,
          fileSize: stats.size,
        });
      }

      return entries;
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * Delete a chunk (for testing/cleanup only)
   */
  async deleteChunk(planetId: string, x: number, y: number): Promise<boolean> {
    await this.init();

    const chunkPath = path.join(
      DATA_DIR,
      'planets',
      planetId,
      'chunks',
      `${x},${y}.json.gz`
    );

    try {
      await fs.unlink(chunkPath);

      // Update chunk count
      const metadata = await this.getPlanetMetadata(planetId);
      if (metadata && metadata.chunkCount > 0) {
        await this.updatePlanetMetadata(planetId, {
          chunkCount: metadata.chunkCount - 1,
        });
      }

      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }

  // ============================================================
  // NAMED LOCATIONS
  // ============================================================

  /**
   * Add a named location
   */
  async addNamedLocation(planetId: string, location: NamedLocation): Promise<void> {
    await this.init();

    const locationsPath = path.join(DATA_DIR, 'planets', planetId, 'locations.json');

    let data: { locations: NamedLocation[]; lastUpdated: number };

    try {
      const content = await fs.readFile(locationsPath, 'utf-8');
      data = JSON.parse(content);
    } catch {
      data = { locations: [], lastUpdated: Date.now() };
    }

    // Check for duplicate at same position
    const existingIndex = data.locations.findIndex(
      l => l.chunkX === location.chunkX && l.chunkY === location.chunkY &&
           l.tileX === location.tileX && l.tileY === location.tileY
    );

    if (existingIndex >= 0) {
      // Update existing location
      data.locations[existingIndex] = location;
    } else {
      // Add new location
      data.locations.push(location);
    }

    data.lastUpdated = Date.now();

    await fs.writeFile(locationsPath, JSON.stringify(data, null, 2));
    console.log(`[PlanetStorage] Named location "${location.name}" added to planet ${planetId}`);
  }

  /**
   * Get all named locations for a planet
   */
  async getNamedLocations(planetId: string): Promise<NamedLocation[]> {
    await this.init();

    const locationsPath = path.join(DATA_DIR, 'planets', planetId, 'locations.json');

    try {
      const content = await fs.readFile(locationsPath, 'utf-8');
      const data = JSON.parse(content);
      return data.locations || [];
    } catch (error: any) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  /**
   * Remove a named location
   */
  async removeNamedLocation(
    planetId: string,
    chunkX: number,
    chunkY: number,
    name: string
  ): Promise<boolean> {
    await this.init();

    const locationsPath = path.join(DATA_DIR, 'planets', planetId, 'locations.json');

    try {
      const content = await fs.readFile(locationsPath, 'utf-8');
      const data = JSON.parse(content);

      const initialLength = data.locations.length;
      data.locations = data.locations.filter(
        (l: NamedLocation) => !(l.chunkX === chunkX && l.chunkY === chunkY && l.name === name)
      );

      if (data.locations.length < initialLength) {
        data.lastUpdated = Date.now();
        await fs.writeFile(locationsPath, JSON.stringify(data, null, 2));
        return true;
      }

      return false;
    } catch (error: any) {
      if (error.code === 'ENOENT') return false;
      throw error;
    }
  }

  // ============================================================
  // STATISTICS
  // ============================================================

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    planetCount: number;
    totalChunks: number;
    totalBiospheres: number;
    totalNamedLocations: number;
  }> {
    await this.init();

    const planets = await this.listPlanets();

    let totalChunks = 0;
    let totalBiospheres = 0;
    let totalNamedLocations = 0;

    for (const planet of planets) {
      totalChunks += planet.chunkCount;
      if (planet.hasBiosphere) totalBiospheres++;

      const locations = await this.getNamedLocations(planet.id);
      totalNamedLocations += locations.length;
    }

    return {
      planetCount: planets.length,
      totalChunks,
      totalBiospheres,
      totalNamedLocations,
    };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Compute checksum of data
   */
  computeChecksum(data: string): string {
    // Simple hash - matches MultiverseStorage pattern
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Compress and write data to file
   */
  private async compressAndWrite(data: string, filePath: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const readable = Readable.from([data]);
    const gzip = createGzip();
    const writable = createWriteStream(filePath);

    await pipeline(readable, gzip, writable);
  }

  /**
   * Read and decompress data from file
   */
  private async decompressAndRead(filePath: string): Promise<string> {
    const chunks: Buffer[] = [];

    const readable = createReadStream(filePath);
    const gunzip = createGunzip();

    gunzip.on('data', (chunk) => chunks.push(chunk));

    await pipeline(readable, gunzip);

    return Buffer.concat(chunks).toString('utf-8');
  }

  /**
   * Generate planet ID from seed and type
   */
  static generatePlanetId(seed: string, type: string): string {
    // Simple hash of seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hashHex = Math.abs(hash).toString(16).slice(0, 8);

    return `planet:${type}:${hashHex}`;
  }

  // ============================================================
  // ENTITY OPERATIONS
  // ============================================================

  /**
   * Save a batch of entities (merges with existing).
   * Entities are stored as a single compressed file per planet.
   */
  async saveEntities(planetId: string, entities: Array<{
    id: string;
    components: Record<string, unknown>;
    createdAt: number;
  }>): Promise<void> {
    const planetDir = path.join(DATA_DIR, 'planets', planetId);
    await fs.mkdir(planetDir, { recursive: true });

    const entitiesPath = path.join(planetDir, 'entities.json.gz');

    // Load existing entities and merge
    let existing: Map<string, any> = new Map();
    try {
      const data = await this.decompressAndRead(entitiesPath);
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed.entities)) {
        for (const e of parsed.entities) {
          existing.set(e.id, e);
        }
      }
    } catch {
      // No existing file, start fresh
    }

    // Merge new entities (overwrites existing with same ID)
    for (const entity of entities) {
      existing.set(entity.id, entity);
    }

    // Write back
    const output = JSON.stringify({
      entities: Array.from(existing.values()),
      lastSavedAt: Date.now(),
      count: existing.size,
    });

    await this.compressAndWrite(output, entitiesPath);
  }

  /**
   * Get all saved entities for a planet.
   */
  async getEntities(planetId: string): Promise<Array<{
    id: string;
    components: Record<string, unknown>;
    createdAt: number;
  }>> {
    const entitiesPath = path.join(DATA_DIR, 'planets', planetId, 'entities.json.gz');

    try {
      const data = await this.decompressAndRead(entitiesPath);
      const parsed = JSON.parse(data);
      return parsed.entities ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Clear all entities for a planet.
   */
  async clearEntities(planetId: string): Promise<void> {
    const entitiesPath = path.join(DATA_DIR, 'planets', planetId, 'entities.json.gz');

    try {
      await fs.unlink(entitiesPath);
    } catch {
      // File may not exist
    }
  }
}

// Export singleton instance
export const planetStorage = new PlanetStorage();
