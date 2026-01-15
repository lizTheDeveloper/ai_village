import { ComponentBase } from '../ecs/Component.js';
import type { Tick, EntityId } from '../types.js';

export type SpatialMemoryType =
  | 'resource_location'  // Remembered a food/resource spot
  | 'plant_location'     // Remembered a plant location
  | 'agent_seen'         // Saw another agent
  | 'danger'             // Dangerous location/entity
  | 'home'               // Safe/home location
  | 'lesson'             // Learned from experience (e.g., "campfire solves cold")
  | 'success'            // Successfully completed something (e.g., "built workbench")
  | 'failure'            // Failed attempt to learn from (e.g., "couldn't build - no materials")
  | 'knowledge'          // Learned from others (e.g., "Finn said gather food first")
  | 'terrain_landmark';  // Remembered significant terrain feature (peak, cliff, lake, etc.)

export interface SpatialMemory {
  type: SpatialMemoryType;
  x: number;
  y: number;
  entityId?: EntityId;   // Optional reference to entity
  strength: number;      // 0-100, higher = stronger memory
  createdAt: Tick;
  lastReinforced: Tick;
  metadata?: Record<string, unknown>; // Additional data
}

/**
 * Resource location memory (backwards compatibility)
 */
export interface ResourceLocationMemory {
  readonly id: string;
  readonly resourceType: string;
  readonly position: { x: number; y: number };
  readonly tick: number;
  readonly confidence: number; // 0-1, decays over time
}

/**
 * Chunk visit record - tracks how many times an agent has visited a chunk.
 * Used for chunk naming (Talker names chunks after 10+ visits).
 */
export interface ChunkVisit {
  chunkX: number;
  chunkY: number;
  visitCount: number;
  lastVisited: Tick;
  /** Name of this chunk (if agent has named it) */
  name?: string;
}

/**
 * Spatial memory component for remembering locations and spatial information
 */
export class SpatialMemoryComponent extends ComponentBase {
  public readonly type = 'spatial_memory';
  public memories: SpatialMemory[] = [];
  public maxMemories: number;
  public decayRate: number;
  private _resourceMemories: ResourceLocationMemory[] = [];
  private _memoryCounter: number = 0;

  /**
   * Chunk visit tracking - maps chunk coordinates to visit data.
   * Key format: "chunkX,chunkY"
   */
  public chunkVisits: Map<string, ChunkVisit> = new Map();

  constructor(options?: { maxMemories?: number; decayRate?: number }) {
    super();
    this.maxMemories = options?.maxMemories ?? 20;
    this.decayRate = options?.decayRate ?? 1.0;
  }

  /**
   * Record a resource location (backwards compatibility)
   */
  recordResourceLocation(
    resourceType: string,
    position: { x: number; y: number },
    tick: number
  ): void {
    const memory: ResourceLocationMemory = {
      id: `resource_loc_${this._memoryCounter++}`,
      resourceType,
      position: { x: position.x, y: position.y },
      tick,
      confidence: 1.0,
    };

    this._resourceMemories.push(memory);

    // Trim oldest memories if exceeding limit
    if (this._resourceMemories.length > this.maxMemories) {
      this._resourceMemories.shift();
    }
  }

  /**
   * Query resource locations (backwards compatibility)
   */
  queryResourceLocations(
    resourceType: string,
    currentTick?: number,
    agentPosition?: { x: number; y: number },
    maxResults?: number
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
      const decayRate = 0.001; // Confidence decays 0.1% per tick
      results = results.map((m) => ({
        ...m,
        confidence: Math.max(0, m.confidence - decayRate * (currentTick - m.tick)),
      }));
    }

    // Sort by confidence (highest first), then by distance if agent position provided
    if (agentPosition) {
      results.sort((a, b) => {
        // Primary: confidence
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        // Secondary: distance
        const distA = Math.sqrt(
          Math.pow(a.position.x - agentPosition.x, 2) +
          Math.pow(a.position.y - agentPosition.y, 2)
        );
        const distB = Math.sqrt(
          Math.pow(b.position.x - agentPosition.x, 2) +
          Math.pow(b.position.y - agentPosition.y, 2)
        );
        return distA - distB;
      });
    } else {
      results.sort((a, b) => b.confidence - a.confidence);
    }

    // Limit results
    if (maxResults !== undefined && maxResults > 0) {
      results = results.slice(0, maxResults);
    }

    return results;
  }

  /**
   * Get all resource memories (readonly)
   */
  get resourceMemories(): readonly ResourceLocationMemory[] {
    return Object.freeze([...this._resourceMemories]);
  }
}

/**
 * Add or reinforce a spatial memory
 */
export function addSpatialMemory(
  component: SpatialMemoryComponent,
  memory: Omit<SpatialMemory, 'strength' | 'createdAt' | 'lastReinforced'>,
  currentTick: Tick,
  initialStrength: number = 100
): void {
  if (!component) {
    throw new Error('addSpatialMemory: component parameter is required');
  }

  // Check if similar memory already exists
  const existingIndex = component.memories.findIndex(
    (m) =>
      m.type === memory.type &&
      (memory.entityId
        ? m.entityId === memory.entityId
        : Math.abs(m.x - memory.x) < 2 && Math.abs(m.y - memory.y) < 2)
  );

  if (existingIndex >= 0) {
    // Reinforce existing memory
    const existing = component.memories[existingIndex]!;
    existing.strength = Math.min(100, existing.strength + 20);
    existing.lastReinforced = currentTick;
    existing.x = memory.x; // Update position
    existing.y = memory.y;
  } else {
    // Add new memory
    const newMemory: SpatialMemory = {
      ...memory,
      strength: initialStrength,
      createdAt: currentTick,
      lastReinforced: currentTick,
    };

    component.memories.push(newMemory);

    // Remove weakest memory if over limit
    if (component.memories.length > component.maxMemories) {
      component.memories.sort((a, b) => a.strength - b.strength);
      component.memories.shift();
    }
  }
}

/**
 * Get strongest spatial memory of a specific type
 */
export function getStrongestSpatialMemory(
  component: SpatialMemoryComponent,
  type: SpatialMemoryType
): SpatialMemory | null {
  if (!component) {
    throw new Error('getStrongestSpatialMemory: component parameter is required');
  }

  const matching = component.memories.filter((m) => m.type === type);
  if (matching.length === 0) return null;

  return matching.reduce((strongest, current) =>
    current.strength > strongest.strength ? current : strongest
  );
}

/**
 * Get all spatial memories of a type, sorted by strength
 */
export function getSpatialMemoriesByType(
  component: SpatialMemoryComponent,
  type: SpatialMemoryType
): SpatialMemory[] {
  if (!component) {
    throw new Error('getSpatialMemoriesByType: component parameter is required');
  }

  return component.memories
    .filter((m) => m.type === type)
    .sort((a, b) => b.strength - a.strength);
}

/**
 * Get all spatial memories within a radius of a location, sorted by distance
 */
export function getSpatialMemoriesByLocation(
  component: SpatialMemoryComponent,
  location: { x: number; y: number },
  radius: number
): SpatialMemory[] {
  if (!component) {
    throw new Error('getSpatialMemoriesByLocation: component parameter is required');
  }
  if (!location || typeof location.x !== 'number' || typeof location.y !== 'number') {
    throw new Error('getSpatialMemoriesByLocation: valid location with x and y coordinates is required');
  }
  if (typeof radius !== 'number') {
    throw new Error('getSpatialMemoriesByLocation: radius parameter is required');
  }
  if (radius < 0) {
    throw new Error('getSpatialMemoriesByLocation: radius must be non-negative');
  }

  const radiusSquared = radius * radius;

  // Filter by squared distance (avoid sqrt in hot path)
  const filtered = component.memories.filter((m) => {
    const dx = m.x - location.x;
    const dy = m.y - location.y;
    return dx * dx + dy * dy <= radiusSquared;
  });

  // Sort by actual distance (ascending - closest first)
  return filtered.sort((a, b) => {
    const dxA = a.x - location.x;
    const dyA = a.y - location.y;
    const dxB = b.x - location.x;
    const dyB = b.y - location.y;
    return (dxA * dxA + dyA * dyA) - (dxB * dxB + dyB * dyB);
  });
}

/**
 * Get the N most recently reinforced memories, sorted by recency
 */
export function getRecentSpatialMemories(
  component: SpatialMemoryComponent,
  count: number
): SpatialMemory[] {
  if (!component) {
    throw new Error('getRecentSpatialMemories: component parameter is required');
  }
  if (typeof count !== 'number') {
    throw new Error('getRecentSpatialMemories: count parameter is required');
  }
  if (count < 1) {
    throw new Error('getRecentSpatialMemories: count must be >= 1');
  }

  // Sort by lastReinforced (descending - most recent first)
  const sorted = [...component.memories].sort((a, b) => b.lastReinforced - a.lastReinforced);

  // Return top N
  return sorted.slice(0, count);
}

/**
 * Get all spatial memories with strength >= threshold, sorted by strength
 */
export function getSpatialMemoriesByImportance(
  component: SpatialMemoryComponent,
  threshold: number
): SpatialMemory[] {
  if (!component) {
    throw new Error('getSpatialMemoriesByImportance: component parameter is required');
  }
  if (typeof threshold !== 'number') {
    throw new Error('getSpatialMemoriesByImportance: threshold parameter is required');
  }
  if (threshold < 0 || threshold > 100) {
    throw new Error('getSpatialMemoriesByImportance: threshold must be between 0 and 100');
  }

  return component.memories
    .filter((m) => m.strength >= threshold)
    .sort((a, b) => b.strength - a.strength);
}

// ============================================================================
// Chunk Visit Tracking
// ============================================================================

/**
 * Record a visit to a chunk.
 * Increments visit count and updates last visited timestamp.
 */
export function recordChunkVisit(
  component: SpatialMemoryComponent,
  chunkX: number,
  chunkY: number,
  currentTick: Tick
): void {
  const key = `${chunkX},${chunkY}`;
  const existing = component.chunkVisits.get(key);

  if (existing) {
    existing.visitCount++;
    existing.lastVisited = currentTick;
  } else {
    component.chunkVisits.set(key, {
      chunkX,
      chunkY,
      visitCount: 1,
      lastVisited: currentTick,
    });
  }
}

/**
 * Get chunk visit data.
 */
export function getChunkVisit(
  component: SpatialMemoryComponent,
  chunkX: number,
  chunkY: number
): ChunkVisit | undefined {
  const key = `${chunkX},${chunkY}`;
  return component.chunkVisits.get(key);
}

/**
 * Get all chunks visited at least minVisits times.
 * Useful for finding frequently-visited chunks that should be named.
 */
export function getFrequentlyVisitedChunks(
  component: SpatialMemoryComponent,
  minVisits: number = 10
): ChunkVisit[] {
  return Array.from(component.chunkVisits.values())
    .filter((visit) => visit.visitCount >= minVisits)
    .sort((a, b) => b.visitCount - a.visitCount);
}

/**
 * Set a name for a chunk in the agent's memory.
 * This is the agent's personal name for the chunk.
 */
export function nameChunk(
  component: SpatialMemoryComponent,
  chunkX: number,
  chunkY: number,
  name: string
): void {
  const key = `${chunkX},${chunkY}`;
  const visit = component.chunkVisits.get(key);

  if (visit) {
    visit.name = name;
  } else {
    // Create visit record if it doesn't exist
    component.chunkVisits.set(key, {
      chunkX,
      chunkY,
      visitCount: 0,
      lastVisited: 0,
      name,
    });
  }
}

/**
 * Find a chunk by name in the agent's memory.
 * @returns { chunkX, chunkY } if found, undefined otherwise
 */
export function findChunkByName(
  component: SpatialMemoryComponent,
  name: string
): { chunkX: number; chunkY: number } | undefined {
  const searchName = name.toLowerCase().trim();

  for (const visit of component.chunkVisits.values()) {
    if (visit.name && visit.name.toLowerCase().trim() === searchName) {
      return { chunkX: visit.chunkX, chunkY: visit.chunkY };
    }
  }

  return undefined;
}
