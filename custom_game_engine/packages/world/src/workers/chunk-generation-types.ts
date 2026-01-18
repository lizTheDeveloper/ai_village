/**
 * Type definitions for chunk generation worker communication
 */

import type { PlanetConfig } from '../planet/PlanetTypes.js';

/**
 * Request to generate a chunk in the worker thread
 */
export interface GenerateChunkRequest {
  type: 'generate';
  requestId: string;
  chunkX: number;
  chunkY: number;
  seed: string;
  planetConfig?: PlanetConfig;
}

/**
 * Successful chunk generation response
 */
export interface ChunkGeneratedMessage {
  type: 'chunk-generated';
  requestId: string;
  chunkX: number;
  chunkY: number;
  tiles: any[];
  timestamp: number;
  success: boolean;
}

/**
 * Chunk generation error response
 */
export interface ChunkGenerationError {
  type: 'error';
  requestId: string;
  error: string;
  chunkX: number;
  chunkY: number;
}

/**
 * Worker ready signal
 */
export interface WorkerReadyMessage {
  type: 'ready';
}

export type WorkerRequest = GenerateChunkRequest;
export type WorkerResponse = ChunkGeneratedMessage | ChunkGenerationError | WorkerReadyMessage;
