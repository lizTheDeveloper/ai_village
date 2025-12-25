import { ComponentBase } from '../ecs/Component.js';
import type { ResourceType } from './ResourceComponent.js';

export interface ResourceLocationMemory {
  readonly id: string;
  readonly resourceType: ResourceType;
  readonly position: { x: number; y: number };
  readonly tick: number;
  readonly confidence: number; // 0-1, decays over time
}

/**
 * SpatialMemoryComponent stores and queries resource location memories
 * Extends episodic memory with spatial queries for navigation
 */
export class SpatialMemoryComponent extends ComponentBase {
  public readonly type = 'spatial_memory';
  private _resourceMemories: ResourceLocationMemory[] = [];
  private _maxMemories: number = 500;
  private _memoryCounter: number = 0;

  constructor(data?: { maxMemories?: number }) {
    super();
    if (data?.maxMemories !== undefined) {
      if (data.maxMemories < 0) {
        throw new Error('maxMemories must be non-negative');
      }
      this._maxMemories = data.maxMemories;
    }
  }

  /**
   * Record a new resource location memory
   * @throws Error if required fields missing or invalid
   */
  recordResourceLocation(
    resourceType: ResourceType,
    position: { x: number; y: number },
    tick: number
  ): void {
    // NO FALLBACKS - validate all inputs per CLAUDE.md
    if (!resourceType) {
      throw new Error('SpatialMemory requires valid resource type');
    }
    if (position === undefined || position.x === undefined || position.y === undefined) {
      throw new Error('SpatialMemory requires valid position with x and y coordinates');
    }
    if (tick < 0) {
      throw new Error('SpatialMemory requires non-negative tick value');
    }

    const memory: ResourceLocationMemory = {
      id: `resource_loc_${this._memoryCounter++}`,
      resourceType,
      position: { x: position.x, y: position.y },
      tick,
      confidence: 1.0, // Fresh memory starts at full confidence
    };

    this._resourceMemories.push(memory);

    // Trim oldest memories if exceeding limit
    if (this._resourceMemories.length > this._maxMemories) {
      this._resourceMemories.shift();
    }
  }

  /**
   * Query resource locations by type with ranking
   * @param resourceType - Type of resource to find
   * @param currentTick - Current game tick for confidence decay
   * @param agentPosition - Optional agent position for distance ranking
   * @param limit - Maximum number of results
   * @returns Sorted array of memories (best first)
   */
  queryResourceLocations(
    resourceType: ResourceType,
    currentTick?: number,
    agentPosition?: { x: number; y: number },
    limit?: number
  ): ResourceLocationMemory[] {
    if (!resourceType) {
      throw new Error('queryResourceLocations requires resourceType parameter');
    }

    // Filter by resource type
    let results = this._resourceMemories.filter(
      (m) => m.resourceType === resourceType
    );

    // Apply confidence decay if currentTick provided
    if (currentTick !== undefined) {
      results = results.map((memory) => {
        const age = currentTick - memory.tick;
        const confidence = this._calculateConfidence(age);
        return { ...memory, confidence };
      });
    }

    // Sort: Primary by confidence (higher first), Secondary by recency, Tertiary by distance
    if (agentPosition) {
      results.sort((a, b) => {
        // Primary: Higher confidence wins
        const confidenceDiff = b.confidence - a.confidence;
        if (Math.abs(confidenceDiff) > 0.01) {
          return confidenceDiff;
        }

        // Secondary: More recent wins
        if (a.tick !== b.tick) {
          return b.tick - a.tick;
        }

        // Tertiary: Closer wins
        const distA = this._distance(a.position, agentPosition);
        const distB = this._distance(b.position, agentPosition);
        return distA - distB;
      });
    } else {
      // Sort by confidence first, then recency
      results.sort((a, b) => {
        const confidenceDiff = b.confidence - a.confidence;
        if (Math.abs(confidenceDiff) > 0.01) {
          return confidenceDiff;
        }
        return b.tick - a.tick;
      });
    }

    // Apply limit if specified
    if (limit !== undefined && limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * Calculate confidence based on memory age
   * Recent memories (< 500 ticks) have confidence > 0.9
   * Decays after 500 ticks
   */
  private _calculateConfidence(age: number): number {
    if (age < 0) {
      throw new Error('Age cannot be negative');
    }

    // Minimal decay for very recent memories (0-50 ticks)
    if (age <= 50) {
      return 1.0;
    }

    // Slow linear decay from 50 to 500 ticks (stays > 0.9)
    if (age <= 500) {
      return 1.0 - (age - 50) / 4500; // At 500 ticks: ~0.9
    }

    // Faster exponential decay after 500 ticks
    // At 600 ticks (100 past threshold): should be < 0.8
    // Half-life of ~200 ticks after threshold
    const excessAge = age - 500;
    const decayFactor = Math.exp(-0.00347 * excessAge); // ln(2)/200 ≈ 0.00347
    return Math.max(0.0, 0.9 * decayFactor);
  }

  /**
   * Calculate Euclidean distance between two points
   */
  private _distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get all resource memories (readonly)
   */
  get resourceMemories(): readonly ResourceLocationMemory[] {
    return Object.freeze([...this._resourceMemories]);
  }

  /**
   * Clear all memories (for testing)
   */
  clearMemories(): void {
    this._resourceMemories = [];
    this._memoryCounter = 0;
  }

  /**
   * Validate and set confidence value (for testing validation)
   * @throws Error if confidence out of bounds
   */
  // Unused method - kept for potential future testing
  // private __setConfidence(value: number): void {
  //   if (value < 0 || value > 1) {
  //     throw new Error('SpatialMemory confidence must be between 0 and 1');
  //   }
  // }
}
