/**
 * StragglerRecoverySystem - Handles ships left behind during fleet β-space jumps
 *
 * This system handles:
 * - Tracking stranded ships (ships with StragglerComponent)
 * - Processing solo jump attempts (risky - high failure rate)
 * - Matching rescue squadrons to stragglers
 * - Applying accelerated decoherence to stranded ships
 * - Marking ships as 'lost' after too long stranded
 *
 * Priority: 430 (after CrewStressSystem at 420)
 *
 * Stragglers occur when fleet coherence is insufficient (<0.7) during β-jump.
 * Ships that fail alignment are left behind in the previous β-branch.
 *
 * Reference: openspec/specs/grand-strategy/05-SHIP-FLEET-HIERARCHY.md lines 1350-1377
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { StragglerComponent } from '../components/StragglerComponent.js';
import {
  updateDecoherenceRate,
  updateContaminationRisk,
  calculateSoloJumpSuccessChance,
  shouldMarkAsLost,
  createStragglerComponent,
} from '../components/StragglerComponent.js';
import { createCorruptedShipComponent } from '../components/CorruptedComponent.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';
import type { SquadronComponent } from '../components/SquadronComponent.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Solo jump attempt result
 */
interface SoloJumpResult {
  success: boolean;
  reason?: string;
  targetBranch?: string;
  coherenceLoss?: number;
}

/**
 * Rescue assignment result
 */
interface RescueAssignmentResult {
  success: boolean;
  reason?: string;
}

// ============================================================================
// System
// ============================================================================

export class StragglerRecoverySystem extends BaseSystem {
  public readonly id: SystemId = 'straggler_recovery' as SystemId;
  public readonly priority: number = 430;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Straggler];
  public readonly activationComponents = ['straggler'] as const;
  public readonly metadata = {
    category: 'combat',
    description: 'Handles ships left behind during fleet β-space jumps',
    dependsOn: ['crew_stress' as SystemId, 'heart_chamber_network' as SystemId],
    writesComponents: [CT.Straggler, CT.Spaceship, CT.Squadron] as const,
  } as const;

  protected readonly throttleInterval = 50; // Every 2.5 seconds at 20 TPS

  // ========================================================================
  // State Management
  // ========================================================================

  /**
   * PERF: Cache straggler entities by status
   * Allows fast filtering by recovery status
   * GC: Uses object literals instead of Sets
   */
  private stragglersByStatus: Record<string, Record<string, boolean>> = {
    stranded: Object.create(null),
    attempting_solo_jump: Object.create(null),
    awaiting_rescue: Object.create(null),
    recovered: Object.create(null),
    lost: Object.create(null),
  };

  /**
   * PERF: Cache squadron entities for rescue matching
   */
  private squadronEntityCache: Record<string, EntityImpl | null> = Object.create(null);
  private cacheValidTick = -1;
  private readonly CACHE_LIFETIME = 100; // Rebuild cache every 5 seconds

  /**
   * PERF: Dirty tracking - track stragglers that changed this tick
   * GC: Uses object literal instead of Set
   */
  private dirtyStragglersThisTick: Record<string, boolean> = Object.create(null);

  // GC: Pre-allocated result array for getStragglersByStatus
  private workingStatusArray: string[] = [];

  // ========================================================================
  // System Update
  // ========================================================================

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // PERF: Rebuild cache if stale
    const needsRebuild = tick - this.cacheValidTick > this.CACHE_LIFETIME;
    if (needsRebuild) {
      this.rebuildCache(ctx.world);
      this.cacheValidTick = tick;
    }

    // GC: Clear dirty tracking by deleting keys
    for (const key in this.dirtyStragglersThisTick) {
      delete this.dirtyStragglersThisTick[key];
    }

    // Process all stragglers
    for (const entity of ctx.activeEntities) {
      const straggler = entity.getComponent<StragglerComponent>(CT.Straggler);
      if (!straggler) continue;

      const ship = entity.getComponent<SpaceshipComponent>(CT.Spaceship);
      if (!ship) continue;

      // Process straggler based on recovery status
      this.processStraggler(ctx.world, entity as EntityImpl, straggler, ship, tick);
    }

    // GC: Check if any stragglers changed (object has keys)
    let hasDirty = false;
    for (const _ in this.dirtyStragglersThisTick) {
      hasDirty = true;
      break;
    }
    if (hasDirty) {
      this.rebuildStatusCache(ctx.world);
    }
  }

  // ========================================================================
  // Cache Management
  // ========================================================================

  private rebuildCache(world: World): void {
    // GC: Clear by deleting keys instead of creating new object
    for (const key in this.squadronEntityCache) {
      delete this.squadronEntityCache[key];
    }

    // Cache all squadrons
    const squadrons = world.query().with(CT.Squadron).executeEntities();
    for (const squadronEntity of squadrons) {
      this.squadronEntityCache[squadronEntity.id] = squadronEntity as EntityImpl;
    }

    // Rebuild status cache
    this.rebuildStatusCache(world);
  }

  private rebuildStatusCache(world: World): void {
    // GC: Clear status objects by deleting keys
    for (const status in this.stragglersByStatus) {
      const statusObj = this.stragglersByStatus[status]!;
      for (const key in statusObj) {
        delete statusObj[key];
      }
    }

    // Rebuild from all stragglers
    const stragglers = world.query().with(CT.Straggler).executeEntities();
    for (const stragglerEntity of stragglers) {
      const straggler = stragglerEntity.getComponent<StragglerComponent>(CT.Straggler);
      if (!straggler) continue;

      const statusObj = this.stragglersByStatus[straggler.recoveryStatus];
      if (statusObj) {
        statusObj[stragglerEntity.id] = true;
      }
    }
  }

  // ========================================================================
  // Straggler Processing
  // ========================================================================

  /**
   * Process a single straggler based on recovery status
   */
  private processStraggler(
    world: World,
    entity: EntityImpl,
    straggler: StragglerComponent,
    ship: SpaceshipComponent,
    tick: number
  ): void {
    // Update decoherence and contamination risk
    updateDecoherenceRate(straggler, tick);
    updateContaminationRisk(straggler, tick);

    // Apply accelerated coherence loss
    this.applyCoherenceLoss(ship, straggler);

    // Check if ship should be marked as lost
    if (shouldMarkAsLost(straggler, tick)) {
      this.markAsLost(world, entity, straggler);
      return;
    }

    // Process based on recovery status
    switch (straggler.recoveryStatus) {
      case 'stranded':
        // Check if rescue is available
        this.checkForRescueOpportunity(world, entity, straggler);
        break;

      case 'attempting_solo_jump':
        // Solo jump attempts are handled via public API
        // This status is temporary while jump is processed
        break;

      case 'awaiting_rescue':
        // Check if rescue squadron arrived
        this.checkRescueProgress(world, entity, straggler);
        break;

      case 'recovered':
        // Remove straggler component (recovery complete)
        entity.removeComponent(CT.Straggler);
        this.emitRecoveredEvent(world, entity.id, straggler);
        break;

      case 'lost':
        // Ship is lost - mark for corruption or removal
        this.handleLostShip(world, entity, straggler);
        break;
    }
  }

  /**
   * Apply accelerated coherence loss to stranded ship
   */
  private applyCoherenceLoss(ship: SpaceshipComponent, straggler: StragglerComponent): void {
    const coherenceLoss = straggler.coherenceLossPerTick * straggler.decoherenceRate;
    ship.crew.coherence = Math.max(0, ship.crew.coherence - coherenceLoss);
  }

  // ========================================================================
  // Public API - Mark Ship as Straggler
  // ========================================================================

  /**
   * Mark a ship as straggler (left behind during fleet jump)
   *
   * @param world - ECS World
   * @param shipId - Ship entity ID
   * @param fleetId - Original fleet ID
   * @param squadronId - Original squadron ID
   * @param branchId - β-branch ID where ship was left
   */
  public markAsStraggler(
    world: World,
    shipId: string,
    fleetId: string,
    squadronId: string,
    branchId: string
  ): void {
    const shipEntity = world.getEntity(shipId) as EntityImpl;
    if (!shipEntity) {
      throw new Error(`Ship entity ${shipId} not found`);
    }

    // Check if already a straggler
    if (shipEntity.hasComponent(CT.Straggler)) {
      console.warn(`[StragglerRecoverySystem] Ship ${shipId} already marked as straggler`);
      return;
    }

    // Create straggler component
    const straggler = createStragglerComponent(fleetId, squadronId, branchId, world.tick);

    // Add component
    shipEntity.addComponent(straggler);

    // Mark as dirty (GC: object literal instead of Set)
    this.dirtyStragglersThisTick[shipId] = true;

    // Emit event
    world.eventBus.emit({
      type: 'straggler:ship_stranded',
      source: shipId,
      data: {
        shipId,
        fleetId,
        squadronId,
        branchId,
        tick: world.tick,
      },
    });
  }

  // ========================================================================
  // Public API - Solo Jump Attempt
  // ========================================================================

  /**
   * Attempt solo β-space jump for a straggler ship
   *
   * @param world - ECS World
   * @param shipId - Ship entity ID
   * @param targetBranch - Target β-branch ID
   * @returns SoloJumpResult
   */
  public attemptSoloJump(
    world: World,
    shipId: string,
    targetBranch: string
  ): SoloJumpResult {
    const shipEntity = world.getEntity(shipId);
    if (!shipEntity) {
      return { success: false, reason: 'Ship entity not found' };
    }

    const straggler = shipEntity.getComponent<StragglerComponent>(CT.Straggler);
    if (!straggler) {
      return { success: false, reason: 'Ship is not a straggler' };
    }

    const ship = shipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
    if (!ship) {
      return { success: false, reason: 'Ship component not found' };
    }

    // Update status
    straggler.recoveryStatus = 'attempting_solo_jump';
    straggler.soloJumpAttempts++;

    // Calculate success chance
    const successChance = calculateSoloJumpSuccessChance(ship.crew.coherence, straggler);

    // Emit attempt event
    world.eventBus.emit({
      type: 'straggler:solo_jump_attempted',
      source: shipId,
      data: {
        shipId,
        targetBranch,
        attempt: straggler.soloJumpAttempts,
        successChance,
        coherence: ship.crew.coherence,
      },
    });

    // Determine success
    const roll = Math.random();
    const success = roll < successChance;

    if (success) {
      // Solo jump succeeded!
      // Update ship navigation state to reflect successful β-space jump
      if (!ship.navigation.visited_branches.includes(targetBranch)) {
        ship.navigation.visited_branches.push(targetBranch);
      }

      // Apply minor coherence loss from solo jump stress
      const coherenceLoss = 0.05;
      ship.crew.coherence = Math.max(0, ship.crew.coherence - coherenceLoss);

      // Mark straggler as recovered
      straggler.recoveryStatus = 'recovered';
      this.dirtyStragglersThisTick[shipId] = true;

      // Emit success event
      world.eventBus.emit({
        type: 'straggler:solo_jump_succeeded',
        source: shipId,
        data: {
          shipId,
          targetBranch,
          attempt: straggler.soloJumpAttempts,
          coherenceLoss,
          newCoherence: ship.crew.coherence,
        },
      });

      return {
        success: true,
        targetBranch,
        coherenceLoss,
      };
    } else {
      // Solo jump failed - apply penalties
      const coherenceLoss = 0.1 + straggler.soloJumpAttempts * 0.05;
      ship.crew.coherence = Math.max(0, ship.crew.coherence - coherenceLoss);

      // Increase contamination risk
      straggler.contaminationRisk = Math.min(1, straggler.contaminationRisk + 0.1);

      // Revert to stranded status
      straggler.recoveryStatus = 'stranded';
      this.dirtyStragglersThisTick[shipId] = true;

      // Emit failure event
      world.eventBus.emit({
        type: 'straggler:solo_jump_failed',
        source: shipId,
        data: {
          shipId,
          targetBranch,
          attempt: straggler.soloJumpAttempts,
          coherenceLoss,
          newCoherence: ship.crew.coherence,
          newContaminationRisk: straggler.contaminationRisk,
        },
      });

      return {
        success: false,
        reason: 'Solo jump failed (insufficient coherence)',
        coherenceLoss,
      };
    }
  }

  // ========================================================================
  // Public API - Rescue Squadron Assignment
  // ========================================================================

  /**
   * Assign a rescue squadron to a straggler
   *
   * @param world - ECS World
   * @param stragglerId - Straggler ship entity ID
   * @param rescueSquadronId - Rescue squadron entity ID
   * @returns RescueAssignmentResult
   */
  public assignRescueSquadron(
    world: World,
    stragglerId: string,
    rescueSquadronId: string
  ): RescueAssignmentResult {
    const stragglerEntity = world.getEntity(stragglerId);
    if (!stragglerEntity) {
      return { success: false, reason: 'Straggler entity not found' };
    }

    const straggler = stragglerEntity.getComponent<StragglerComponent>(CT.Straggler);
    if (!straggler) {
      return { success: false, reason: 'Entity is not a straggler' };
    }

    const rescueSquadronEntity = world.getEntity(rescueSquadronId);
    if (!rescueSquadronEntity) {
      return { success: false, reason: 'Rescue squadron entity not found' };
    }

    const rescueSquadron = rescueSquadronEntity.getComponent<SquadronComponent>(CT.Squadron);
    if (!rescueSquadron) {
      return { success: false, reason: 'Rescue squadron component not found' };
    }

    // Update straggler status
    straggler.recoveryStatus = 'awaiting_rescue';
    straggler.rescueSquadronId = rescueSquadronId;
    this.dirtyStragglersThisTick[stragglerId] = true;

    // Emit event
    world.eventBus.emit({
      type: 'straggler:rescue_assigned',
      source: stragglerId,
      data: {
        stragglerId,
        rescueSquadronId,
        squadronName: rescueSquadron.name,
        stragglerBranch: straggler.strandedAtBranch,
      },
    });

    return { success: true };
  }

  // ========================================================================
  // Public API - Recover Straggler
  // ========================================================================

  /**
   * Recover a straggler ship (called when rescue arrives or solo jump succeeds)
   *
   * @param world - ECS World
   * @param stragglerId - Straggler ship entity ID
   */
  public recoverStraggler(world: World, stragglerId: string): void {
    const stragglerEntity = world.getEntity(stragglerId);
    if (!stragglerEntity) {
      throw new Error(`Straggler entity ${stragglerId} not found`);
    }

    const straggler = stragglerEntity.getComponent<StragglerComponent>(CT.Straggler);
    if (!straggler) {
      throw new Error(`Entity ${stragglerId} is not a straggler`);
    }

    // Update status to recovered
    straggler.recoveryStatus = 'recovered';
    this.dirtyStragglersThisTick[stragglerId] = true;

    // Emit recovery event
    this.emitRecoveredEvent(world, stragglerId, straggler);
  }

  // ========================================================================
  // Helper Functions
  // ========================================================================

  /**
   * Check if rescue squadron is available for a straggler
   */
  private checkForRescueOpportunity(
    world: World,
    entity: EntityImpl,
    straggler: StragglerComponent
  ): void {
    // Query all squadrons with rescue mission type
    const squadrons = world.query().with(CT.Squadron).executeEntities();

    for (const squadronEntity of squadrons) {
      const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
      if (!squadron) continue;

      // Check if squadron has rescue mission type
      if (squadron.mission.type !== 'rescue') continue;

      // Check if squadron is engaged (in combat or already on active mission)
      if (squadron.mission.status === 'engaged') continue;

      // Get flagship to check navigation state
      const flagshipEntity = world.getEntity(squadron.flagshipId);
      if (!flagshipEntity) continue;

      const flagship = flagshipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
      if (!flagship) continue;

      // Check if flagship has visited the straggler's β-branch
      // (squadron must be at or near the straggler's location to rescue)
      const isNearStraggler = flagship.navigation.visited_branches.includes(
        straggler.strandedAtBranch
      );

      if (!isNearStraggler) continue;

      // Check squadron coherence (must be stable enough to rescue)
      if (squadron.coherence.average < 0.5) continue;

      // Check squadron has capacity (not full of rescued ships already)
      if (squadron.ships.shipIds.length >= 10) continue;

      // Rescue squadron found! Auto-assign
      const assignResult = this.assignRescueSquadron(world, entity.id, squadronEntity.id);

      if (assignResult.success) {
        // Successfully assigned rescue squadron
        break;
      }
    }
  }

  /**
   * Check if rescue squadron has arrived
   */
  private checkRescueProgress(
    world: World,
    entity: EntityImpl,
    straggler: StragglerComponent
  ): void {
    if (!straggler.rescueSquadronId) return;

    // Get rescue squadron entity
    const rescueSquadronEntity = world.getEntity(straggler.rescueSquadronId);
    if (!rescueSquadronEntity) {
      // Rescue squadron no longer exists - revert to stranded status
      straggler.recoveryStatus = 'stranded';
      straggler.rescueSquadronId = undefined;
      this.dirtyStragglersThisTick[entity.id] = true;
      return;
    }

    const rescueSquadron = rescueSquadronEntity.getComponent<SquadronComponent>(CT.Squadron);
    if (!rescueSquadron) {
      // Rescue squadron lost component - revert to stranded status
      straggler.recoveryStatus = 'stranded';
      straggler.rescueSquadronId = undefined;
      this.dirtyStragglersThisTick[entity.id] = true;
      return;
    }

    // Get flagship to check navigation state
    const flagshipEntity = world.getEntity(rescueSquadron.flagshipId);
    if (!flagshipEntity) return;

    const flagship = flagshipEntity.getComponent<SpaceshipComponent>(CT.Spaceship);
    if (!flagship) return;

    // Check if rescue squadron reached straggler's β-branch
    const hasReachedStraggler = flagship.navigation.visited_branches.includes(
      straggler.strandedAtBranch
    );

    if (hasReachedStraggler) {
      // Rescue squadron arrived! Recover straggler
      this.recoverStraggler(world, entity.id);

      // Emit specific rescue event (different from solo jump recovery)
      world.eventBus.emit({
        type: 'straggler:rescued',
        source: entity.id,
        data: {
          stragglerId: entity.id,
          rescueSquadronId: straggler.rescueSquadronId,
          squadronName: rescueSquadron.name,
          stragglerBranch: straggler.strandedAtBranch,
          ticksStranded: world.tick - straggler.strandedTick,
        },
      });
    }
  }

  /**
   * Mark ship as lost
   */
  private markAsLost(world: World, entity: EntityImpl, straggler: StragglerComponent): void {
    if (straggler.recoveryStatus === 'lost') return;

    straggler.recoveryStatus = 'lost';
    this.dirtyStragglersThisTick[entity.id] = true;

    // Emit lost event
    world.eventBus.emit({
      type: 'straggler:lost',
      source: entity.id,
      data: {
        shipId: entity.id,
        fleetId: straggler.originalFleetId,
        squadronId: straggler.originalSquadronId,
        ticksStranded: world.tick - straggler.strandedTick,
        contaminationRisk: straggler.contaminationRisk,
        decoherenceRate: straggler.decoherenceRate,
        reason: straggler.contaminationRisk > 0.8
          ? 'timeline_contamination'
          : 'exceeded_time_threshold',
      },
    });
  }

  /**
   * Handle lost ship (mark as corrupted, preserve for recovery)
   */
  private handleLostShip(world: World, entity: EntityImpl, straggler: StragglerComponent): void {
    // Following Conservation of Game Matter principles:
    // Do NOT delete entity - mark as corrupted for potential recovery

    // Create corruption component with ship-specific data
    const corruptedComponent = createCorruptedShipComponent(
      world.tick,
      straggler.originalFleetId,
      straggler.originalSquadronId,
      straggler.contaminationRisk,
      straggler.decoherenceRate
    );

    // Add corruption marker
    entity.addComponent(corruptedComponent);

    // Remove straggler component (ship is now corrupted, not recovering)
    entity.removeComponent(CT.Straggler);
  }

  /**
   * Emit recovery event
   */
  private emitRecoveredEvent(
    world: World,
    stragglerId: string,
    straggler: StragglerComponent
  ): void {
    world.eventBus.emit({
      type: 'straggler:recovered',
      source: stragglerId,
      data: {
        shipId: stragglerId,
        fleetId: straggler.originalFleetId,
        squadronId: straggler.originalSquadronId,
        ticksStranded: world.tick - straggler.strandedTick,
        recoveryMethod: straggler.rescueSquadronId ? 'rescue' : 'solo_jump',
        soloJumpAttempts: straggler.soloJumpAttempts,
      },
    });
  }

  // ========================================================================
  // Query API
  // ========================================================================

  /**
   * Get all stragglers by recovery status
   * GC: Uses pre-allocated array to avoid allocations
   *
   * @param status - Recovery status to filter by
   * @returns Array of straggler entity IDs
   */
  public getStragglersByStatus(status: string): string[] {
    const statusObj = this.stragglersByStatus[status];
    if (!statusObj) return [];

    // GC: Clear and reuse pre-allocated array
    this.workingStatusArray.length = 0;
    for (const id in statusObj) {
      this.workingStatusArray.push(id);
    }
    return this.workingStatusArray;
  }

  /**
   * Get count of stragglers by status
   * GC: Counts keys without allocation
   *
   * @param status - Recovery status to count
   * @returns Number of stragglers with that status
   */
  public getStragglerCount(status: string): number {
    const statusObj = this.stragglersByStatus[status];
    if (!statusObj) return 0;

    let count = 0;
    for (const _ in statusObj) {
      count++;
    }
    return count;
  }

  /**
   * Get total straggler count across all statuses
   * GC: Counts keys without allocation
   */
  public getTotalStragglerCount(): number {
    let total = 0;
    for (const status in this.stragglersByStatus) {
      const statusObj = this.stragglersByStatus[status]!;
      for (const _ in statusObj) {
        total++;
      }
    }
    return total;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: StragglerRecoverySystem | null = null;

export function getStragglerRecoverySystem(): StragglerRecoverySystem {
  if (!systemInstance) {
    systemInstance = new StragglerRecoverySystem();
  }
  return systemInstance;
}
