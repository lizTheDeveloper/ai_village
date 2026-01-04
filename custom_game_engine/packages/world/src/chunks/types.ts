/**
 * Type definitions for chunk serialization
 */

import type { Tile } from './Tile.js';

/**
 * Compression encoding strategies
 */
export type CompressionEncoding = 'rle' | 'delta' | 'full';

/**
 * Complete terrain snapshot for save files
 */
export interface TerrainSnapshot {
  $schema: 'https://aivillage.dev/schemas/terrain/v1';
  $version: 1;

  /** Chunk size (32 for current implementation) */
  chunkSize: number;

  /** Number of generated chunks */
  generatedChunkCount: number;

  /** Chunk index for quick lookup */
  chunkIndex: ChunkIndexEntry[];

  /** Compressed chunk data */
  chunks: Record<string, SerializedChunk>;

  /** Checksums for validation */
  checksums: {
    overall: string;
    perChunk: Record<string, string>;
  };
}

/**
 * Index entry for a single chunk
 */
export interface ChunkIndexEntry {
  /** Chunk key "x,y" */
  key: string;

  /** Chunk X coordinate */
  x: number;

  /** Chunk Y coordinate */
  y: number;

  /** Whether chunk has been generated */
  generated: boolean;

  /** Number of tiles (should always be 1024) */
  tileCount: number;

  /** Number of entities in chunk */
  entityCount: number;

  /** Chunk checksum */
  checksum: string;
}

/**
 * Serialized chunk with compressed tile data
 */
export interface SerializedChunk {
  /** Chunk X coordinate */
  x: number;

  /** Chunk Y coordinate */
  y: number;

  /** Whether chunk has been generated */
  generated: boolean;

  /** Compressed tile data */
  tiles: CompressedTileData;

  /** Entity IDs in this chunk */
  entityIds: string[];
}

/**
 * Compressed tile data with encoding strategy
 */
export interface CompressedTileData {
  /** Compression strategy used */
  encoding: CompressionEncoding;

  /** Compressed data (format depends on encoding) */
  data: RLEData[] | DeltaData | Tile[];
}

/**
 * Run-length encoded tile data
 */
export interface RLEData {
  /** Serialized tile */
  tile: SerializedTile;

  /** Number of consecutive occurrences */
  count: number;
}

/**
 * Delta-encoded tile data
 */
export interface DeltaData {
  /** Base tile (most common) */
  base: SerializedTile;

  /** Differences from base */
  diffs: Array<{
    /** Tile index (0-1023) */
    index: number;

    /** Different tile at this index */
    tile: SerializedTile;
  }>;
}

/**
 * Serialized tile (JSON-safe)
 */
export interface SerializedTile {
  terrain: string;
  floor?: string;
  elevation: number;
  moisture: number;
  fertility: number;
  biome?: string;
  wall?: any;
  door?: any;
  window?: any;
  tilled: boolean;
  plantability: number;
  nutrients: {
    nitrogen: number;
    phosphorus: number;
    potassium: number;
  };
  fertilized: boolean;
  fertilizerDuration: number;
  lastWatered: number;
  lastTilled: number;
  composted: boolean;
  plantId: string | null;
  fluid?: any;
  mineable?: boolean;
  embeddedResource?: string;
  resourceAmount?: number;
  ceilingSupported?: boolean;
}
