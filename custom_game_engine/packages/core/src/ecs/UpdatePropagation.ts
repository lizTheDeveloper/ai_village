/**
 * UpdatePropagation - Minecraft Redstone-style update propagation
 *
 * Instead of polling all entities every tick, entities queue updates
 * when their state changes, and updates propagate to neighbors.
 *
 * Key concepts:
 * - Update Queue: Entities queue themselves when they need processing
 * - Propagation: When an entity updates, it can queue its neighbors
 * - Budget: Only N updates processed per tick to prevent cascades
 * - Priority: Closer/more important updates processed first
 *
 * Usage:
 *   // When a lever is flipped:
 *   propagation.queueUpdate(leverId, 'signal_changed', 10);
 *
 *   // When processing the lever, queue connected wires:
 *   propagation.propagateToNeighbors(leverId, radius, 'signal_changed');
 *
 *   // In game loop:
 *   const updates = propagation.processUpdates(100); // max 100 per tick
 *   for (const update of updates) {
 *     handleUpdate(update);
 *   }
 */

import type { EntityId } from '../types.js';

/** Update type identifier */
export type UpdateType = string;

/** Queued update entry */
export interface UpdateEntry {
  entityId: EntityId;
  type: UpdateType;
  priority: number;
  queuedTick: number;
  sourceId?: EntityId;  // What triggered this update
  data?: unknown;       // Optional payload
}

/** Propagation rule for automatic neighbor updates */
export interface PropagationRule {
  /** Update type that triggers this rule */
  triggerType: UpdateType;
  /** Update type to send to neighbors */
  propagateType: UpdateType;
  /** Maximum propagation distance */
  maxRadius: number;
  /** Priority decay per hop (reduces priority as signal travels) */
  priorityDecay: number;
  /** Maximum hops before propagation stops */
  maxHops: number;
  /** Optional filter function for which entities receive propagation */
  filter?: (entityId: EntityId) => boolean;
}

/** Configuration for UpdatePropagation */
export interface UpdatePropagationConfig {
  /** Maximum updates to process per tick (default: 200) */
  updatesPerTick: number;
  /** Maximum queue size before oldest entries are dropped (default: 10000) */
  maxQueueSize: number;
  /** Whether to dedupe queued updates for same entity+type (default: true) */
  dedupeUpdates: boolean;
  /** Default priority for updates without explicit priority (default: 5) */
  defaultPriority: number;
}

const DEFAULT_CONFIG: UpdatePropagationConfig = {
  updatesPerTick: 200,
  maxQueueSize: 10000,
  dedupeUpdates: true,
  defaultPriority: 5,
};

/**
 * UpdatePropagation manages the update queue and propagation rules.
 *
 * Like Minecraft's block update system:
 * - Entities don't poll for changes, they receive updates
 * - Updates propagate through connected entities
 * - Processing is budgeted to prevent lag spikes
 */
export class UpdatePropagation {
  private config: UpdatePropagationConfig;

  /** Priority queue of pending updates */
  private queue: UpdateEntry[] = [];

  /** Set for deduplication: "entityId:type" */
  private queued: Set<string> = new Set();

  /** Registered propagation rules */
  private rules: Map<UpdateType, PropagationRule[]> = new Map();

  /** Neighbor lookup function (provided by world) */
  private getNeighbors: ((entityId: EntityId, radius: number) => EntityId[]) | null = null;

  /** Current tick */
  private currentTick = 0;

  /** Statistics */
  private stats = {
    totalQueued: 0,
    processedThisTick: 0,
    propagationsThisTick: 0,
    droppedDueToCap: 0,
    dedupedUpdates: 0,
  };

  constructor(config: Partial<UpdatePropagationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the neighbor lookup function.
   * This should be provided by the World to find nearby entities.
   */
  setNeighborLookup(fn: (entityId: EntityId, radius: number) => EntityId[]): void {
    this.getNeighbors = fn;
  }

  /**
   * Register a propagation rule.
   * When an update of triggerType is processed, it automatically
   * queues propagateType updates on neighbors.
   */
  registerRule(rule: PropagationRule): void {
    let rules = this.rules.get(rule.triggerType);
    if (!rules) {
      rules = [];
      this.rules.set(rule.triggerType, rules);
    }
    rules.push(rule);
  }

  /**
   * Queue an update for an entity.
   *
   * @param entityId Entity to update
   * @param type Update type (e.g., 'signal_changed', 'block_placed')
   * @param priority Higher = processed sooner (default: 5)
   * @param sourceId Entity that caused this update (for chain tracking)
   * @param data Optional payload for the update handler
   */
  queueUpdate(
    entityId: EntityId,
    type: UpdateType,
    priority: number = this.config.defaultPriority,
    sourceId?: EntityId,
    data?: unknown
  ): boolean {
    // Deduplication check
    if (this.config.dedupeUpdates) {
      const key = `${entityId}:${type}`;
      if (this.queued.has(key)) {
        this.stats.dedupedUpdates++;
        return false;
      }
      this.queued.add(key);
    }

    // Queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove lowest priority item
      this.queue.sort((a, b) => b.priority - a.priority);
      const dropped = this.queue.pop();
      if (dropped && this.config.dedupeUpdates) {
        this.queued.delete(`${dropped.entityId}:${dropped.type}`);
      }
      this.stats.droppedDueToCap++;
    }

    const entry: UpdateEntry = {
      entityId,
      type,
      priority,
      queuedTick: this.currentTick,
      sourceId,
      data,
    };

    // Insert in priority order (binary search for efficiency)
    const insertIdx = this.findInsertIndex(priority);
    this.queue.splice(insertIdx, 0, entry);

    this.stats.totalQueued++;
    return true;
  }

  /**
   * Queue updates for all neighbors of an entity.
   *
   * @param sourceId Source entity
   * @param radius Search radius for neighbors
   * @param type Update type to queue
   * @param priority Base priority (decays with distance)
   * @param data Optional payload
   */
  propagateToNeighbors(
    sourceId: EntityId,
    radius: number,
    type: UpdateType,
    priority: number = this.config.defaultPriority,
    data?: unknown
  ): number {
    if (!this.getNeighbors) {
      console.warn('[UpdatePropagation] No neighbor lookup function set');
      return 0;
    }

    const neighbors = this.getNeighbors(sourceId, radius);
    let queued = 0;

    for (const neighborId of neighbors) {
      if (neighborId !== sourceId) {
        // Priority decays with distance (simulated by order)
        const neighborPriority = Math.max(1, priority - 1);
        if (this.queueUpdate(neighborId, type, neighborPriority, sourceId, data)) {
          queued++;
        }
      }
    }

    this.stats.propagationsThisTick += queued;
    return queued;
  }

  /**
   * Process queued updates up to the per-tick budget.
   * Returns the updates that were processed this tick.
   */
  processUpdates(): UpdateEntry[] {
    this.currentTick++;
    this.stats.processedThisTick = 0;
    this.stats.propagationsThisTick = 0;

    const processed: UpdateEntry[] = [];
    const limit = Math.min(this.config.updatesPerTick, this.queue.length);

    for (let i = 0; i < limit; i++) {
      const entry = this.queue.shift();
      if (!entry) break;

      // Remove from dedupe set
      if (this.config.dedupeUpdates) {
        this.queued.delete(`${entry.entityId}:${entry.type}`);
      }

      processed.push(entry);
      this.stats.processedThisTick++;

      // Apply propagation rules
      const rules = this.rules.get(entry.type);
      if (rules && this.getNeighbors) {
        for (const rule of rules) {
          const neighbors = this.getNeighbors(entry.entityId, rule.maxRadius);
          for (const neighborId of neighbors) {
            if (neighborId === entry.entityId) continue;
            if (rule.filter && !rule.filter(neighborId)) continue;

            const newPriority = Math.max(1, entry.priority - rule.priorityDecay);
            this.queueUpdate(neighborId, rule.propagateType, newPriority, entry.entityId, entry.data);
          }
        }
      }
    }

    return processed;
  }

  /**
   * Check if an entity has pending updates.
   */
  hasPendingUpdate(entityId: EntityId, type?: UpdateType): boolean {
    if (type) {
      return this.queued.has(`${entityId}:${type}`);
    }
    // Check any update for this entity
    for (const key of this.queued) {
      if (key.startsWith(`${entityId}:`)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get the current queue length.
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get statistics.
   */
  getStats(): Readonly<typeof this.stats> {
    return this.stats;
  }

  /**
   * Clear all pending updates.
   */
  clear(): void {
    this.queue = [];
    this.queued.clear();
  }

  /**
   * Reset all state.
   */
  reset(): void {
    this.clear();
    this.rules.clear();
    this.currentTick = 0;
    this.stats.totalQueued = 0;
    this.stats.processedThisTick = 0;
    this.stats.propagationsThisTick = 0;
    this.stats.droppedDueToCap = 0;
    this.stats.dedupedUpdates = 0;
  }

  /**
   * Binary search to find insert position for priority ordering.
   * Higher priority = earlier in queue (index 0 = highest priority).
   */
  private findInsertIndex(priority: number): number {
    let left = 0;
    let right = this.queue.length;

    while (left < right) {
      const mid = (left + right) >>> 1;
      const midEntry = this.queue[mid];
      if (midEntry && midEntry.priority > priority) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }
}

/**
 * Common update types for game systems.
 */
export const UPDATE_TYPES = {
  // Block/tile updates
  BLOCK_PLACED: 'block:placed',
  BLOCK_REMOVED: 'block:removed',
  BLOCK_CHANGED: 'block:changed',

  // Signal propagation (redstone-like)
  SIGNAL_CHANGED: 'signal:changed',
  SIGNAL_ON: 'signal:on',
  SIGNAL_OFF: 'signal:off',

  // Entity updates
  ENTITY_MOVED: 'entity:moved',
  ENTITY_DAMAGED: 'entity:damaged',
  ENTITY_DIED: 'entity:died',

  // Resource updates
  RESOURCE_DEPLETED: 'resource:depleted',
  RESOURCE_REGENERATED: 'resource:regenerated',

  // Structure updates
  STRUCTURE_CHANGED: 'structure:changed',
  STRUCTURE_COLLAPSED: 'structure:collapsed',

  // Environmental updates
  LIGHT_CHANGED: 'light:changed',
  WATER_FLOW: 'water:flow',
  FIRE_SPREAD: 'fire:spread',
} as const;

export type StandardUpdateType = (typeof UPDATE_TYPES)[keyof typeof UPDATE_TYPES];
