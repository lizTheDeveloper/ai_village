import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { Entity } from '../ecs/Entity.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';
import type {
  MergeCompatibilityComponent,
  BranchCompatibility,
  MergeConflict,
  MergeResult,
} from '../components/MergeCompatibilityComponent.js';
import type { UniverseSnapshot, VersionedEntity } from '../persistence/types.js';
import {
  findCommonAncestor,
  compareAgentStates,
  compareAgentSkills,
  findEntity,
  replaceEntity,
  addEntity,
  findComponent,
  markBranchAsMerged,
} from '../multiverse/MergeHelpers.js';

/**
 * TimelineMergerSystem - Check branch compatibility and merge compatible timelines
 *
 * This system manages timeline_merger ships and the process of collapsing compatible
 * probability branches to reduce timeline proliferation.
 *
 * Priority: 95 (after passage traversal, works with timeline_merger ships)
 * Throttle: 100 ticks (5 seconds)
 *
 * Merge rules:
 * - Branches must share common ancestor
 * - Divergence must be < 0.3
 * - All conflicts must be resolvable
 * - timeline_merger ship must have coherence >= 0.75
 *
 * Conflict resolution:
 * - agent_state: take higher skills
 * - building_exists: keep building
 * - item_quantity: take max
 * - terrain_difference: keep branch1 (unresolvable usually)
 *
 * Spec reference: openspec/specs/grand-strategy/10-MULTIVERSE-MECHANICS.md
 * Per CLAUDE.md: No silent fallbacks, crash on invalid data
 */
export class TimelineMergerSystem extends BaseSystem {
  public readonly id: SystemId = 'timeline_merger';
  public readonly priority: number = 95;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = [CT.Spaceship, CT.MergeCompatibility] as const;
  protected readonly throttleInterval = 100; // Every 5 seconds at 20 TPS

  private lastUpdate = 0;

  // ============================================================================
  // Performance optimizations: Caching and object pooling
  // ============================================================================

  /** Cached entity ID maps for fast lookups (reused between ticks) */
  private entityMapCache = {
    agents1: new Map<string, VersionedEntity>(),
    agents2: new Map<string, VersionedEntity>(),
    buildings1: new Map<string, VersionedEntity>(),
    buildings2: new Map<string, VersionedEntity>(),
  };

  /** Reusable conflict object pool to avoid allocations */
  private conflictPool: MergeConflict[] = [];
  private conflictPoolIndex = 0;

  /** LRU cache for compatibility checks (key: branch1Id:branch2Id) */
  private compatibilityCache = new Map<string, {
    result: BranchCompatibility;
    tick: number;
  }>();
  private readonly COMPATIBILITY_CACHE_SIZE = 100;
  private readonly COMPATIBILITY_CACHE_TTL = 6000; // 5 minutes at 20 TPS

  /** Reusable working objects for merge operations */
  private workingMergeResult: MergeResult = {
    success: false,
  };

  /**
   * Initialize event listeners
   */
  protected onInitialize(world: World, eventBus: EventBus): void {
    // Listen for timeline merge requests (could be triggered by UI or other systems)
    this.events.subscribe('timeline:merge_requested', (event) => {
      const e = event as {
        data?: {
          branch1Id: string;
          branch2Id: string;
          mergerShipId: string;
        };
      };

      if (!e.data) {
        throw new Error('timeline:merge_requested event missing data field');
      }

      if (!e.data.branch1Id || !e.data.branch2Id || !e.data.mergerShipId) {
        throw new Error(
          'timeline:merge_requested event requires branch1Id, branch2Id, and mergerShipId'
        );
      }

      // Handle merge request will be processed in update()
    });
  }

  /**
   * Update - check for active merge operations and process them
   */
  protected onUpdate(ctx: SystemContext): void {
    // Throttle updates
    if (ctx.world.tick - this.lastUpdate < this.throttleInterval) {
      return;
    }
    this.lastUpdate = ctx.world.tick;

    // Find all timeline_merger ships
    const mergerShips = ctx.world.query()
      .with(CT.Spaceship)
      .with(CT.MergeCompatibility)
      .executeEntities();

    for (const ship of mergerShips) {
      const spaceshipComp = ship.getComponent<SpaceshipComponent>(CT.Spaceship);
      const mergeComp = ship.getComponent<MergeCompatibilityComponent>(CT.MergeCompatibility);

      if (!spaceshipComp) {
        throw new Error(`Ship ${ship.id} missing required Spaceship component`);
      }

      if (!mergeComp) {
        throw new Error(`Ship ${ship.id} missing required MergeCompatibility component`);
      }

      // Only process timeline_merger ships
      if (spaceshipComp.ship_type !== 'timeline_merger') {
        continue;
      }

      // Check if ship has an active merge operation
      if (mergeComp.activeMerge) {
        this.processActiveMerge(ctx, ship, spaceshipComp, mergeComp);
      }
    }
  }

  /**
   * Process an active merge operation
   */
  private processActiveMerge(
    ctx: SystemContext,
    ship: Entity,
    spaceshipComp: SpaceshipComponent,
    mergeComp: MergeCompatibilityComponent
  ): void {
    if (!mergeComp.activeMerge) return;

    const { branch1Id, branch2Id, status } = mergeComp.activeMerge;

    switch (status) {
      case 'checking_compatibility':
        // Load both branches and check compatibility
        // Note: In a real implementation, we'd load UniverseSnapshots from persistence
        // For now, we'll simulate this check
        console.warn(
          `[TimelineMergerSystem] Compatibility check not yet implemented. ` +
          `Would check ${branch1Id} vs ${branch2Id}`
        );

        // Move to next stage (simulated success)
        mergeComp.activeMerge.status = 'resolving_conflicts';
        break;

      case 'resolving_conflicts':
        // Resolve conflicts between branches
        console.warn(
          `[TimelineMergerSystem] Conflict resolution not yet implemented. ` +
          `Would resolve conflicts between ${branch1Id} and ${branch2Id}`
        );

        // Move to next stage
        mergeComp.activeMerge.status = 'creating_merged_universe';
        break;

      case 'creating_merged_universe':
        // Create merged universe from compatible branches
        console.warn(
          `[TimelineMergerSystem] Universe creation not yet implemented. ` +
          `Would merge ${branch1Id} and ${branch2Id}`
        );

        // Move to final stage
        mergeComp.activeMerge.status = 'marking_branches_merged';
        break;

      case 'marking_branches_merged':
        // Mark original branches as merged
        markBranchAsMerged(branch1Id, 'merged_universe_id');
        markBranchAsMerged(branch2Id, 'merged_universe_id');

        // Emit completion event
        this.events.emit('timeline:merge_completed', {
          branch1Id,
          branch2Id,
          mergedUniverseId: 'merged_universe_id',
          mergerShipId: ship.id,
        });

        // Clear active merge
        delete mergeComp.activeMerge;
        break;
    }
  }

  /**
   * Check if two branches can be merged
   *
   * Rules:
   * - Must share common ancestor
   * - Divergence must be < 0.3
   * - All conflicts must be resolvable
   *
   * OPTIMIZED: Uses LRU cache for repeated checks, early exits
   *
   * @param branch1 - First universe snapshot
   * @param branch2 - Second universe snapshot
   * @param currentTick - Current world tick for cache invalidation
   * @returns Compatibility result
   */
  public checkBranchCompatibility(
    branch1: UniverseSnapshot,
    branch2: UniverseSnapshot,
    currentTick?: number
  ): BranchCompatibility {
    // Check cache first (key is sorted to handle both orderings)
    const cacheKey = branch1.identity.id < branch2.identity.id
      ? `${branch1.identity.id}:${branch2.identity.id}`
      : `${branch2.identity.id}:${branch1.identity.id}`;

    if (currentTick !== undefined) {
      const cached = this.compatibilityCache.get(cacheKey);
      if (cached && (currentTick - cached.tick) < this.COMPATIBILITY_CACHE_TTL) {
        return cached.result;
      }
    }

    // Early exit: Check for common ancestor first (cheapest check)
    const commonAncestor = findCommonAncestor(branch1, branch2);
    if (!commonAncestor) {
      const result: BranchCompatibility = {
        compatible: false,
        reason: 'no_common_ancestor',
        conflicts: [],
        divergenceScore: 1.0,
      };
      this.cacheCompatibilityResult(cacheKey, result, currentTick);
      return result;
    }

    // Early exit: Quick divergence estimate before full conflict search
    const entityCountDiff = Math.abs(branch1.entities.length - branch2.entities.length);
    const maxEntities = Math.max(branch1.entities.length, branch2.entities.length);
    if (maxEntities > 0 && (entityCountDiff / maxEntities) > 0.3) {
      const result: BranchCompatibility = {
        compatible: false,
        reason: 'too_divergent',
        conflicts: [],
        divergenceScore: entityCountDiff / maxEntities,
      };
      this.cacheCompatibilityResult(cacheKey, result, currentTick);
      return result;
    }

    // Find all conflicts (expensive operation)
    const conflicts = this.findMergeConflicts(branch1, branch2);

    // Calculate precise divergence score
    const divergenceScore = maxEntities > 0 ? conflicts.length / maxEntities : 0;

    // Early exit: Check divergence threshold
    if (divergenceScore > 0.3) {
      const result: BranchCompatibility = {
        compatible: false,
        reason: 'too_divergent',
        conflicts,
        divergenceScore,
      };
      this.cacheCompatibilityResult(cacheKey, result, currentTick);
      return result;
    }

    // Early exit: Check resolvability during iteration (avoid .every())
    for (let i = 0; i < conflicts.length; i++) {
      if (!conflicts[i].resolvable) {
        const result: BranchCompatibility = {
          compatible: false,
          reason: 'unresolvable_conflicts',
          conflicts,
          divergenceScore,
        };
        this.cacheCompatibilityResult(cacheKey, result, currentTick);
        return result;
      }
    }

    // Compatible!
    const result: BranchCompatibility = {
      compatible: true,
      conflicts,
      divergenceScore,
    };
    this.cacheCompatibilityResult(cacheKey, result, currentTick);
    return result;
  }

  /**
   * Cache compatibility result with LRU eviction
   */
  private cacheCompatibilityResult(
    key: string,
    result: BranchCompatibility,
    tick: number | undefined
  ): void {
    if (tick === undefined) return;

    // LRU eviction: remove oldest if cache is full
    if (this.compatibilityCache.size >= this.COMPATIBILITY_CACHE_SIZE) {
      const firstKey = this.compatibilityCache.keys().next().value;
      if (firstKey) {
        this.compatibilityCache.delete(firstKey);
      }
    }

    this.compatibilityCache.set(key, { result, tick });
  }

  /**
   * Find merge conflicts between two branches
   *
   * Compares:
   * - Agent states (health, position, skills)
   * - Building existence
   * - Item quantities
   * - Terrain differences
   *
   * OPTIMIZED: Single-pass with Map-based lookups, object pooling, zero allocations in loops
   *
   * @param branch1 - First universe snapshot
   * @param branch2 - Second universe snapshot
   * @returns List of conflicts
   */
  public findMergeConflicts(
    branch1: UniverseSnapshot,
    branch2: UniverseSnapshot
  ): MergeConflict[] {
    // Reset conflict pool for reuse
    this.conflictPoolIndex = 0;

    // Build entity maps (single pass, Map-based O(1) lookups)
    this.buildEntityMaps(branch1, branch2);

    // Process agent conflicts
    this.findAgentConflicts(this.entityMapCache.agents1, this.entityMapCache.agents2);

    // Process building conflicts
    this.findBuildingConflicts(this.entityMapCache.buildings1, this.entityMapCache.buildings2);

    // Return conflicts found (slice to actual count)
    return this.conflictPool.slice(0, this.conflictPoolIndex);
  }

  /**
   * Build entity maps for fast lookups (single pass over entities)
   * OPTIMIZED: Reuses Map instances, single iteration categorizes all entities
   */
  private buildEntityMaps(branch1: UniverseSnapshot, branch2: UniverseSnapshot): void {
    // Clear existing maps
    this.entityMapCache.agents1.clear();
    this.entityMapCache.agents2.clear();
    this.entityMapCache.buildings1.clear();
    this.entityMapCache.buildings2.clear();

    // Single pass over branch1 entities
    for (let i = 0; i < branch1.entities.length; i++) {
      const entity = branch1.entities[i];
      const components = entity.components;

      // Check component types in single pass
      let hasIdentity = false;
      let hasBuilding = false;

      for (let j = 0; j < components.length; j++) {
        const compType = components[j].type;
        if (compType === 'identity') hasIdentity = true;
        else if (compType === 'building') hasBuilding = true;

        // Early exit if we found both
        if (hasIdentity && hasBuilding) break;
      }

      if (hasIdentity) {
        this.entityMapCache.agents1.set(entity.id, entity);
      }
      if (hasBuilding) {
        this.entityMapCache.buildings1.set(entity.id, entity);
      }
    }

    // Single pass over branch2 entities
    for (let i = 0; i < branch2.entities.length; i++) {
      const entity = branch2.entities[i];
      const components = entity.components;

      let hasIdentity = false;
      let hasBuilding = false;

      for (let j = 0; j < components.length; j++) {
        const compType = components[j].type;
        if (compType === 'identity') hasIdentity = true;
        else if (compType === 'building') hasBuilding = true;

        if (hasIdentity && hasBuilding) break;
      }

      if (hasIdentity) {
        this.entityMapCache.agents2.set(entity.id, entity);
      }
      if (hasBuilding) {
        this.entityMapCache.buildings2.set(entity.id, entity);
      }
    }
  }

  /**
   * Find agent conflicts using Map-based lookups
   * OPTIMIZED: O(1) lookups, object pooling, zero allocations
   */
  private findAgentConflicts(
    agents1: Map<string, VersionedEntity>,
    agents2: Map<string, VersionedEntity>
  ): void {
    // Check agents in branch1
    for (const [id, agent1] of agents1) {
      const agent2 = agents2.get(id);

      if (!agent2) {
        // Agent exists in branch1 but not branch2
        this.addConflict('agent_state', id, 'exists', 'missing', true);
        continue;
      }

      // Agent exists in both, check if states differ
      if (compareAgentStates(agent1, agent2)) {
        this.addConflict('agent_state', id, agent1, agent2, true);
      }
    }

    // Check for agents in branch2 but not branch1
    for (const [id, agent2] of agents2) {
      if (!agents1.has(id)) {
        this.addConflict('agent_state', id, 'missing', 'exists', true);
      }
    }
  }

  /**
   * Find building conflicts using Map-based lookups
   * OPTIMIZED: O(1) lookups, object pooling, zero allocations
   */
  private findBuildingConflicts(
    buildings1: Map<string, VersionedEntity>,
    buildings2: Map<string, VersionedEntity>
  ): void {
    // Check buildings in branch1
    for (const [id, _building1] of buildings1) {
      if (!buildings2.has(id)) {
        this.addConflict('building_exists', id, 'exists', 'missing', true);
      }
    }

    // Check for buildings in branch2 but not branch1
    for (const [id, _building2] of buildings2) {
      if (!buildings1.has(id)) {
        this.addConflict('building_exists', id, 'missing', 'exists', true);
      }
    }
  }

  /**
   * Add conflict to pool (reuses objects to avoid allocations)
   */
  private addConflict(
    conflictType: MergeConflictType,
    entityId: string,
    parentValue: unknown,
    forkValue: unknown,
    resolvable: boolean
  ): void {
    // Reuse object from pool or create new one
    if (this.conflictPoolIndex < this.conflictPool.length) {
      const conflict = this.conflictPool[this.conflictPoolIndex];
      conflict.conflictType = conflictType;
      conflict.entityId = entityId;
      conflict.parentValue = parentValue;
      conflict.forkValue = forkValue;
      conflict.resolvable = resolvable;
    } else {
      this.conflictPool.push({
        conflictType,
        entityId,
        parentValue,
        forkValue,
        resolvable,
      });
    }
    this.conflictPoolIndex++;
  }

  /**
   * Attempt timeline merge operation for timeline_merger ship
   *
   * Checks ship coherence, compatibility, and performs merge if valid.
   *
   * @param mergerShip - Spaceship component of timeline_merger
   * @param branch1 - First universe snapshot
   * @param branch2 - Second universe snapshot
   * @returns Merge result
   */
  public attemptTimelineMerge(
    mergerShip: SpaceshipComponent,
    branch1: UniverseSnapshot,
    branch2: UniverseSnapshot
  ): MergeResult {
    // Early exit: Check ship type (cheapest check)
    if (mergerShip.ship_type !== 'timeline_merger') {
      this.workingMergeResult.success = false;
      this.workingMergeResult.reason = 'invalid_ship_type';
      delete this.workingMergeResult.mergedUniverseId;
      delete this.workingMergeResult.conflictsResolved;
      delete this.workingMergeResult.requiredCoherence;
      delete this.workingMergeResult.actualCoherence;
      delete this.workingMergeResult.conflicts;
      return this.workingMergeResult;
    }

    // Early exit: Check coherence (timeline_merger requires 0.75)
    if (mergerShip.crew.coherence < 0.75) {
      this.workingMergeResult.success = false;
      this.workingMergeResult.reason = 'insufficient_coherence';
      this.workingMergeResult.requiredCoherence = 0.75;
      this.workingMergeResult.actualCoherence = mergerShip.crew.coherence;
      delete this.workingMergeResult.mergedUniverseId;
      delete this.workingMergeResult.conflictsResolved;
      delete this.workingMergeResult.conflicts;
      return this.workingMergeResult;
    }

    // Check compatibility (pass undefined for tick since not in system context)
    const compatibility = this.checkBranchCompatibility(branch1, branch2, undefined);

    if (!compatibility.compatible) {
      // Reuse working object to avoid allocation
      this.workingMergeResult.success = false;
      this.workingMergeResult.reason = compatibility.reason || 'incompatible_branches';
      this.workingMergeResult.conflicts = compatibility.conflicts;
      delete this.workingMergeResult.mergedUniverseId;
      delete this.workingMergeResult.conflictsResolved;
      delete this.workingMergeResult.requiredCoherence;
      delete this.workingMergeResult.actualCoherence;
      return this.workingMergeResult;
    }

    // Merge branches
    const mergedUniverse = this.mergeBranches(branch1, branch2, compatibility);

    // Record merge in metadata
    // (In a real implementation, we'd save the merged universe and update metadata)

    // Reuse working object to avoid allocation
    this.workingMergeResult.success = true;
    this.workingMergeResult.mergedUniverseId = mergedUniverse.identity.id;
    this.workingMergeResult.conflictsResolved = compatibility.conflicts.length;
    delete this.workingMergeResult.reason;
    delete this.workingMergeResult.conflicts;
    delete this.workingMergeResult.requiredCoherence;
    delete this.workingMergeResult.actualCoherence;
    return this.workingMergeResult;
  }

  /**
   * Merge two compatible branches
   *
   * Creates new universe by:
   * 1. Starting with branch1 as base
   * 2. Resolving each conflict
   * 3. Creating new universe ID and metadata
   * 4. Marking original branches as merged
   *
   * OPTIMIZED: Structured clone instead of JSON.parse/stringify, direct property assignment
   *
   * @param branch1 - First universe snapshot
   * @param branch2 - Second universe snapshot
   * @param compatibility - Compatibility result with conflicts
   * @returns Merged universe snapshot
   */
  public mergeBranches(
    branch1: UniverseSnapshot,
    branch2: UniverseSnapshot,
    compatibility: BranchCompatibility
  ): UniverseSnapshot {
    // Deep clone branch1 as base (faster than JSON.parse/stringify)
    const merged: UniverseSnapshot = structuredClone(branch1);

    // Resolve each conflict (early exit on error)
    const conflicts = compatibility.conflicts;
    for (let i = 0; i < conflicts.length; i++) {
      const conflict = conflicts[i];
      if (!conflict.resolvable) {
        throw new Error(
          `Unresolvable conflict: ${conflict.conflictType} on ${conflict.entityId}`
        );
      }
      this.resolveConflict(merged, conflict, branch1, branch2);
    }

    // Update merged universe identity (direct assignment, no spread)
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 11);
    merged.identity.id = `merged_${timestamp}_${randomSuffix}`;
    merged.identity.name = `${branch1.identity.name} + ${branch2.identity.name} [Merged]`;
    merged.identity.parentId = findCommonAncestor(branch1, branch2) || undefined;
    merged.identity.createdAt = timestamp;

    // Mark original branches as merged
    markBranchAsMerged(branch1.identity.id, merged.identity.id);
    markBranchAsMerged(branch2.identity.id, merged.identity.id);

    return merged;
  }

  /**
   * Conflict resolution strategies lookup table
   * OPTIMIZED: Lookup table instead of switch statement
   */
  private readonly conflictResolvers = {
    agent_state: this.resolveAgentConflict.bind(this),
    building_exists: this.resolveBuildingConflict.bind(this),
    item_quantity: this.resolveItemConflict.bind(this),
    terrain_difference: this.resolveTerrainConflict.bind(this),
  };

  /**
   * Resolve individual merge conflict
   *
   * Resolution strategies:
   * - agent_state: take agent with higher skills
   * - building_exists: keep building (add if missing)
   * - item_quantity: take max quantity
   * - terrain_difference: keep branch1 terrain (unresolvable)
   *
   * OPTIMIZED: Lookup table instead of switch, separate methods for better inlining
   *
   * @param merged - Merged universe (mutated in place)
   * @param conflict - Conflict to resolve
   * @param branch1 - First branch
   * @param branch2 - Second branch
   */
  public resolveConflict(
    merged: UniverseSnapshot,
    conflict: MergeConflict,
    branch1: UniverseSnapshot,
    branch2: UniverseSnapshot
  ): void {
    const resolver = this.conflictResolvers[conflict.conflictType];
    resolver(merged, conflict, branch1, branch2);
  }

  private resolveAgentConflict(
    merged: UniverseSnapshot,
    conflict: MergeConflict,
    branch1: UniverseSnapshot,
    branch2: UniverseSnapshot
  ): void {
    const agent1 = findEntity(branch1, conflict.entityId);
    const agent2 = findEntity(branch2, conflict.entityId);

    if (!agent1 && !agent2) {
      throw new Error(`Agent ${conflict.entityId} not found in either branch`);
    }

    // Early exit: Agent only in branch2
    if (!agent1) {
      addEntity(merged, agent2!);
      return;
    }

    // Early exit: Agent only in branch1
    if (!agent2) {
      return; // Already in merged
    }

    // Both exist, take agent with higher skills
    const skillComparison = compareAgentSkills(agent1, agent2);
    const betterAgent = skillComparison >= 0 ? agent1 : agent2;

    replaceEntity(merged, conflict.entityId, betterAgent);
  }

  private resolveBuildingConflict(
    merged: UniverseSnapshot,
    conflict: MergeConflict,
    branch1: UniverseSnapshot,
    branch2: UniverseSnapshot
  ): void {
    const building1 = findEntity(branch1, conflict.entityId);
    const building2 = findEntity(branch2, conflict.entityId);

    // Keep whichever building exists
    const building = building1 || building2;

    if (!building) {
      throw new Error(`Building ${conflict.entityId} not found in either branch`);
    }

    // Check if already in merged
    const existingBuilding = findEntity(merged, conflict.entityId);

    if (!existingBuilding) {
      addEntity(merged, building);
    }
  }

  private resolveItemConflict(
    merged: UniverseSnapshot,
    conflict: MergeConflict,
    _branch1: UniverseSnapshot,
    _branch2: UniverseSnapshot
  ): void {
    // Take max quantity
    const qty1 = conflict.parentValue as number;
    const qty2 = conflict.forkValue as number;
    const maxQty = Math.max(qty1, qty2);

    // Update item quantity in merged universe
    const item = findEntity(merged, conflict.entityId);

    if (item) {
      const itemComp = findComponent(item, 'item');

      if (itemComp && typeof itemComp.data === 'object' && itemComp.data !== null) {
        (itemComp.data as { quantity?: number }).quantity = maxQty;
      }
    }
  }

  private resolveTerrainConflict(
    _merged: UniverseSnapshot,
    _conflict: MergeConflict,
    _branch1: UniverseSnapshot,
    _branch2: UniverseSnapshot
  ): void {
    // Cannot resolve terrain differences - keep branch1 terrain
    // (Terrain changes are fundamental and rarely merge-compatible)
    // No-op: merged already has branch1's terrain
  }
}
