/**
 * DirtyTracker - Minecraft-style entity change tracking
 *
 * Tracks which entities have been modified each tick, allowing systems
 * to skip unchanged entities for massive performance gains.
 *
 * ## Usage in Systems
 *
 * ```typescript
 * // Option 1: Only process entities with changed position
 * update(world: World, entities: Entity[]): void {
 *   const dirtyPositions = world.dirtyTracker.getDirtyByComponent('position');
 *   for (const entity of entities) {
 *     if (!dirtyPositions.has(entity.id)) continue; // Skip unchanged
 *     // Process entity with changed position...
 *   }
 * }
 *
 * // Option 2: Check if specific entity changed
 * if (world.dirtyTracker.isComponentDirty(entityId, 'health')) {
 *   // React to health change
 * }
 *
 * // Option 3: Get all dirty entities (any component)
 * const dirty = world.dirtyTracker.getDirtyEntities();
 * ```
 *
 * ## Integration
 * - Automatically tracks addComponent, updateComponent, removeComponent
 * - Cleared at end of each tick by GameLoop
 * - History kept for last N ticks (configurable)
 *
 * Performance: Reduces O(entities) to O(changed entities) per system
 */

import type { ComponentType, EntityId } from '../types.js';

/** Change event type */
export type ChangeType = 'add' | 'update' | 'remove';

/** Record of a single entity change */
export interface ChangeRecord {
  entityId: EntityId;
  componentType: ComponentType;
  changeType: ChangeType;
  tick: number;
}

/** Configuration for DirtyTracker */
export interface DirtyTrackerConfig {
  /** Maximum history ticks to keep (default: 5) */
  historyTicks: number;
  /** Whether to track component-level granularity (default: true) */
  trackComponents: boolean;
}

const DEFAULT_CONFIG: DirtyTrackerConfig = {
  historyTicks: 5,
  trackComponents: true,
};

/**
 * DirtyTracker maintains sets of changed entities per tick.
 *
 * Key optimization: Systems can query "what changed?" instead of
 * iterating all entities and checking state.
 */
export class DirtyTracker {
  private config: DirtyTrackerConfig;

  /** Current tick number */
  private currentTick = 0;

  /** Entities changed this tick (any component) */
  private dirtyEntities: Set<EntityId> = new Set();

  /** Entities changed this tick, grouped by component type */
  private dirtyByComponent: Map<ComponentType, Set<EntityId>> = new Map();

  /** Entities that were added this tick */
  private addedEntities: Set<EntityId> = new Set();

  /** Entities that were removed this tick */
  private removedEntities: Set<EntityId> = new Set();

  /** History of changes for rollback/debugging (ring buffer by tick) */
  private history: Map<number, ChangeRecord[]> = new Map();

  /** Statistics */
  private stats = {
    totalMarks: 0,
    marksThisTick: 0,
    entitiesMarkedThisTick: 0,
    componentsTracked: 0,
  };

  constructor(config: Partial<DirtyTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Mark an entity as dirty (changed).
   * Called automatically by World when components are modified.
   */
  markDirty(
    entityId: EntityId,
    componentType: ComponentType,
    changeType: ChangeType = 'update'
  ): void {
    // Track in main dirty set
    const wasClean = !this.dirtyEntities.has(entityId);
    this.dirtyEntities.add(entityId);

    // Track by component type
    if (this.config.trackComponents) {
      let componentSet = this.dirtyByComponent.get(componentType);
      if (!componentSet) {
        componentSet = new Set();
        this.dirtyByComponent.set(componentType, componentSet);
      }
      componentSet.add(entityId);
    }

    // Track adds/removes separately for entity lifecycle
    if (changeType === 'add') {
      // Note: This is for component adds, not entity creation
      // Entity creation should call markEntityAdded()
    } else if (changeType === 'remove') {
      // Component removal tracked here
    }

    // Record in history
    if (this.config.historyTicks > 0) {
      let tickHistory = this.history.get(this.currentTick);
      if (!tickHistory) {
        tickHistory = [];
        this.history.set(this.currentTick, tickHistory);
      }
      tickHistory.push({
        entityId,
        componentType,
        changeType,
        tick: this.currentTick,
      });
    }

    // Update stats
    this.stats.totalMarks++;
    this.stats.marksThisTick++;
    if (wasClean) {
      this.stats.entitiesMarkedThisTick++;
    }
  }

  /**
   * Mark an entity as newly created.
   */
  markEntityAdded(entityId: EntityId): void {
    this.addedEntities.add(entityId);
    this.dirtyEntities.add(entityId);
  }

  /**
   * Mark an entity as removed/destroyed.
   */
  markEntityRemoved(entityId: EntityId): void {
    this.removedEntities.add(entityId);
    // Don't add to dirtyEntities - it's gone
    this.dirtyEntities.delete(entityId);

    // Clean up from component sets
    for (const componentSet of this.dirtyByComponent.values()) {
      componentSet.delete(entityId);
    }
  }

  /**
   * Get all entities that changed this tick.
   */
  getDirtyEntities(): ReadonlySet<EntityId> {
    return this.dirtyEntities;
  }

  /**
   * Get entities that had a specific component changed this tick.
   */
  getDirtyByComponent(componentType: ComponentType): ReadonlySet<EntityId> {
    return this.dirtyByComponent.get(componentType) ?? EMPTY_SET;
  }

  /**
   * Get entities that were added this tick.
   */
  getAddedEntities(): ReadonlySet<EntityId> {
    return this.addedEntities;
  }

  /**
   * Get entities that were removed this tick.
   */
  getRemovedEntities(): ReadonlySet<EntityId> {
    return this.removedEntities;
  }

  /**
   * Check if an entity was modified this tick.
   */
  isDirty(entityId: EntityId): boolean {
    return this.dirtyEntities.has(entityId);
  }

  /**
   * Check if a specific component on an entity changed this tick.
   */
  isComponentDirty(entityId: EntityId, componentType: ComponentType): boolean {
    const componentSet = this.dirtyByComponent.get(componentType);
    return componentSet?.has(entityId) ?? false;
  }

  /**
   * Get change history for a specific tick.
   */
  getHistoryForTick(tick: number): readonly ChangeRecord[] {
    return this.history.get(tick) ?? [];
  }

  /**
   * Clear dirty state for a new tick.
   * Called by GameLoop at the start of each tick.
   */
  clearTick(): void {
    // Reset per-tick stats before clearing
    this.stats.marksThisTick = 0;
    this.stats.entitiesMarkedThisTick = 0;
    this.stats.componentsTracked = this.dirtyByComponent.size;

    // Clear current tick state
    this.dirtyEntities.clear();
    this.dirtyByComponent.clear();
    this.addedEntities.clear();
    this.removedEntities.clear();

    // Advance tick
    this.currentTick++;

    // Prune old history
    if (this.config.historyTicks > 0) {
      const oldestKeep = this.currentTick - this.config.historyTicks;
      for (const tick of this.history.keys()) {
        if (tick < oldestKeep) {
          this.history.delete(tick);
        }
      }
    }
  }

  /**
   * Get current tick number.
   */
  getTick(): number {
    return this.currentTick;
  }

  /**
   * Get statistics.
   */
  getStats(): Readonly<typeof this.stats> {
    return this.stats;
  }

  /**
   * Reset all state (for testing or world reset).
   */
  reset(): void {
    this.currentTick = 0;
    this.dirtyEntities.clear();
    this.dirtyByComponent.clear();
    this.addedEntities.clear();
    this.removedEntities.clear();
    this.history.clear();
    this.stats.totalMarks = 0;
    this.stats.marksThisTick = 0;
    this.stats.entitiesMarkedThisTick = 0;
    this.stats.componentsTracked = 0;
  }
}

/** Reusable empty set to avoid allocations */
const EMPTY_SET: ReadonlySet<EntityId> = new Set();
