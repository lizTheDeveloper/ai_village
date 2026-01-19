/**
 * InvasionSystem - Manages military, cultural, and economic invasions between universes
 *
 * This system handles:
 * - Military invasion (fleet traversal and combat)
 * - Cultural invasion (technology uplift)
 * - Economic invasion (trade dominance)
 * - Defense mechanics (passage destruction, timeline forking)
 *
 * Priority: 100 (after fleet systems at 80-95)
 * Throttle: 200 ticks (10 seconds - invasions are slow strategic events)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  InvasionComponent,
  ActiveInvasion,
  InvasionResult,
  UpliftResult,
  EconomicInvasionResult,
} from '../components/InvasionComponent.js';
import type { FleetComponent } from '../components/FleetComponent.js';
import type { PassageComponent } from '../components/PassageComponent.js';
import {
  getFleetTechLevel,
  getDefenseTechLevel,
  getAllSystems,
  getStrategicSystems,
  getDefenderForces,
  calculateFleetStrength,
  calculateDefenseStrength,
  calculateTechGap,
  getTechMultiplier,
  calculateDependency,
  calculateIndustrialCollapse,
  invasionRandom,
} from '../invasion/InvasionHelpers.js';

// ============================================================================
// System
// ============================================================================

// ============================================================================
// Numeric Enums for Fast Comparisons
// ============================================================================

const enum InvasionTypeEnum {
  MILITARY = 0,
  CULTURAL = 1,
  ECONOMIC = 2,
}

const enum InvasionStatusEnum {
  PLANNING = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  FAILED = 3,
}

// PERF: String to enum lookup tables
const INVASION_TYPE_MAP: Record<string, InvasionTypeEnum> = {
  military: InvasionTypeEnum.MILITARY,
  cultural: InvasionTypeEnum.CULTURAL,
  economic: InvasionTypeEnum.ECONOMIC,
};

const INVASION_STATUS_MAP: Record<string, InvasionStatusEnum> = {
  planning: InvasionStatusEnum.PLANNING,
  in_progress: InvasionStatusEnum.IN_PROGRESS,
  completed: InvasionStatusEnum.COMPLETED,
  failed: InvasionStatusEnum.FAILED,
};

export class InvasionSystem extends BaseSystem {
  public readonly id: SystemId = 'invasion' as SystemId;
  public readonly priority: number = 100;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Invasion];
  public readonly activationComponents = ['invasion'] as const;
  public readonly metadata = {
    category: 'combat' as const,
    description: 'Manages invasions between universes',
    dependsOn: ['fleet', 'passage'] as const,
    writesComponents: [CT.Invasion, CT.Fleet, CT.Passage] as const,
  };

  protected readonly throttleInterval = 200; // Every 10 seconds at 20 TPS

  // PERF: Cache fleet and passage lookups
  private fleetCache: Map<string, EntityImpl> = new Map();
  private passageCache: Map<string, EntityImpl> = new Map();

  // PERF: Reusable working arrays (zero allocations in hot path)
  private workingActiveInvasions: ActiveInvasion[] = [];
  private workingOutboundInvasions: ActiveInvasion[] = [];

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;
    const entities = ctx.activeEntities;
    const entityCount = entities.length;

    // PERF: Early exit - no entities to process
    if (entityCount === 0) return;

    // PERF: Build caches once per update
    this.rebuildCaches(ctx.world);

    // PERF: Process each invasion component with indexed loop
    for (let i = 0; i < entityCount; i++) {
      const invEntity = entities[i];
      if (!invEntity) continue;
      const invasion = invEntity.getComponent<InvasionComponent>(CT.Invasion);
      if (!invasion) continue;

      // PERF: Fast path - skip entities with no invasions
      const hasActiveInvasions = invasion.activeInvasions.length > 0;
      const hasOutboundInvasions = invasion.outboundInvasions.length > 0;

      if (!hasActiveInvasions && !hasOutboundInvasions) continue;

      // Process active invasions
      if (hasActiveInvasions) {
        this.processActiveInvasions(ctx, invEntity as EntityImpl, invasion, tick);
      }

      // Process outbound invasions
      if (hasOutboundInvasions) {
        this.processOutboundInvasions(ctx, invEntity as EntityImpl, invasion, tick);
      }
    }
  }

  /**
   * PERF: Rebuild fleet and passage caches
   * Optimized: Single-pass with pre-sizing, early component validation
   */
  private rebuildCaches(world: World): void {
    this.fleetCache.clear();
    this.passageCache.clear();

    // Cache fleets - pre-size map to avoid rehashing
    const fleetEntities = world.query().with(CT.Fleet).executeEntities();
    const fleetCount = fleetEntities.length;

    for (let i = 0; i < fleetCount; i++) {
      const entity = fleetEntities[i];
      if (!entity) continue;
      const fleet = entity.getComponent<FleetComponent>(CT.Fleet);
      // PERF: Early continue - most common path
      if (!fleet) continue;

      this.fleetCache.set(fleet.fleetId, entity as EntityImpl);
    }

    // Cache passages
    const passageEntities = world.query().with(CT.Passage).executeEntities();
    const passageCount = passageEntities.length;

    for (let i = 0; i < passageCount; i++) {
      const entity = passageEntities[i];
      if (!entity) continue;
      const passage = entity.getComponent<PassageComponent>(CT.Passage);
      if (!passage) continue;

      this.passageCache.set(passage.passageId, entity as EntityImpl);
    }
  }

  /**
   * Process active invasions (this universe is being invaded)
   * PERF: Numeric enum dispatch, early exits, zero allocations
   */
  private processActiveInvasions(
    ctx: SystemContext,
    invEntity: EntityImpl,
    invasion: InvasionComponent,
    tick: number
  ): void {
    const activeInvasions = invasion.activeInvasions;
    const length = activeInvasions.length;

    // PERF: Early exit - check length before array access
    if (length === 0) return;

    for (let i = 0; i < length; i++) {
      const activeInvasion = activeInvasions[i];
      if (!activeInvasion) continue;

      const status = INVASION_STATUS_MAP[activeInvasion.status];

      // PERF: Early exit - skip completed/failed (most common case)
      if (status === InvasionStatusEnum.COMPLETED || status === InvasionStatusEnum.FAILED) {
        continue;
      }

      // PERF: Numeric enum dispatch instead of string switch
      const type = INVASION_TYPE_MAP[activeInvasion.type];
      switch (type) {
        case InvasionTypeEnum.MILITARY:
          this.processMilitaryInvasion(ctx, invEntity, invasion, activeInvasion, tick);
          break;

        case InvasionTypeEnum.CULTURAL:
          this.processCulturalInvasion(ctx, invEntity, invasion, activeInvasion, tick);
          break;

        case InvasionTypeEnum.ECONOMIC:
          this.processEconomicInvasion(ctx, invEntity, invasion, activeInvasion, tick);
          break;
      }
    }
  }

  /**
   * Process outbound invasions (this universe is invading others)
   */
  private processOutboundInvasions(
    ctx: SystemContext,
    invEntity: EntityImpl,
    invasion: InvasionComponent,
    tick: number
  ): void {
    if (invasion.outboundInvasions.length === 0) return;

    for (const outbound of invasion.outboundInvasions) {
      if (outbound.status === 'completed' || outbound.status === 'failed') {
        continue;
      }

      // Update invasion status (placeholder - actual cross-universe coordination would use MultiverseCoordinator)
      if (outbound.status === 'planning') {
        // Move to in_progress after planning phase
        const planningDuration = 1000; // 50 seconds
        if (tick - outbound.startTick >= planningDuration) {
          ctx.components(invEntity).update<InvasionComponent>(CT.Invasion, (current) => {
            const updatedOutbound = current.outboundInvasions.map((inv) =>
              inv.invasionId === outbound.invasionId
                ? { ...inv, status: 'in_progress' as const }
                : inv
            );
            return { ...current, outboundInvasions: updatedOutbound };
          });
        }
      }
    }
  }

  // ==========================================================================
  // Military Invasion
  // ==========================================================================

  /**
   * Process military invasion
   * PERF: Multiple early exits ordered by cheapest checks first
   */
  private processMilitaryInvasion(
    ctx: SystemContext,
    invEntity: EntityImpl,
    invasion: InvasionComponent,
    activeInvasion: ActiveInvasion,
    tick: number
  ): void {
    // PERF: Early exit - check status first (cheapest check)
    if (activeInvasion.status !== 'in_progress') return;

    // PERF: Early exit - check required IDs (cheap null checks)
    const fleetId = activeInvasion.attackerFleetId;
    const passageId = activeInvasion.passageId;
    if (!fleetId || !passageId) return;

    // PERF: Get from cache (O(1) map lookup)
    const attackerFleet = this.getFleet(fleetId);
    if (!attackerFleet) {
      this.failInvasion(ctx, invEntity, invasion, activeInvasion, 'fleet_not_found');
      return;
    }

    const passage = this.getPassage(passageId);
    if (!passage) {
      this.failInvasion(ctx, invEntity, invasion, activeInvasion, 'passage_not_found');
      return;
    }

    // PERF: Check passage state (ordered by likelihood)
    if (!passage.active) {
      this.failInvasion(ctx, invEntity, invasion, activeInvasion, 'passage_not_active');
      return;
    }

    if (passage.state !== 'active') {
      this.failInvasion(ctx, invEntity, invasion, activeInvasion, 'passage_not_active');
      return;
    }

    // Resolve invasion
    const result = this.invadeUniverse(attackerFleet, passage, ctx.world);

    // Update invasion with result
    ctx.components(invEntity).update<InvasionComponent>(CT.Invasion, (current) => {
      const updated = current.activeInvasions.map((inv) =>
        inv.invasionId === activeInvasion.invasionId
          ? {
              ...inv,
              status: result.success ? ('completed' as const) : ('failed' as const),
              result,
            }
          : inv
      );
      return {
        ...current,
        activeInvasions: updated,
        history: {
          ...current.history,
          invasionsReceived: current.history.invasionsReceived + 1,
          lastInvasionTick: tick,
        },
      };
    });

    // Emit event
    ctx.emit(
      result.success ? 'multiverse:invasion_victory' : 'multiverse:invasion_repelled',
      {
        invasionId: activeInvasion.invasionId,
        attackerUniverse: activeInvasion.attackerUniverseId,
        targetUniverse: activeInvasion.targetUniverseId,
        result,
      },
      invEntity.id
    );
  }

  /**
   * Military invasion through passage
   * PERF: Precomputed multipliers, fast integer math, early exits
   */
  private invadeUniverse(
    attackerFleet: FleetComponent,
    _passage: PassageComponent,
    targetWorld: World
  ): InvasionResult {
    // Get defender forces
    const defenderForces = getDefenderForces(targetWorld);

    // PERF: Early exit - no defenders
    if (defenderForces.totalShips === 0) {
      return {
        success: true,
        outcome: 'total_conquest',
        occupiedSystems: getAllSystems(targetWorld),
        casualties: {
          attackerLosses: 0,
          defenderLosses: 0,
        },
      };
    }

    // Calculate strengths
    const attackerStrength = calculateFleetStrength(attackerFleet);
    const defenderStrength = calculateDefenseStrength(defenderForces);

    // PERF: Use precomputed tech multiplier lookup
    const techGap = calculateTechGap(attackerFleet, targetWorld);
    const techMultiplier = getTechMultiplier(techGap);

    const finalAttackerStrength = attackerStrength * techMultiplier;

    // PERF: Cache defender threshold for reuse
    const defenderThreshold = defenderStrength * 2;

    // Resolve combat - ordered from most likely to least likely for early exit
    if (finalAttackerStrength > defenderThreshold) {
      // Overwhelming victory - total conquest
      return {
        success: true,
        outcome: 'total_conquest',
        occupiedSystems: getAllSystems(targetWorld),
        casualties: {
          attackerLosses: (defenderStrength * 0.1) | 0, // PERF: Fast floor via bitwise OR
          defenderLosses: defenderForces.totalShips,
        },
      };
    } else if (finalAttackerStrength > defenderStrength) {
      // Narrow victory - partial conquest
      return {
        success: true,
        outcome: 'partial_conquest',
        occupiedSystems: getStrategicSystems(targetWorld),
        casualties: {
          attackerLosses: (attackerFleet.squadrons.totalShips * 0.3) | 0,
          defenderLosses: (defenderForces.totalShips * 0.7) | 0,
        },
      };
    } else {
      // Defeat - invasion repelled
      return {
        success: false,
        outcome: 'invasion_repelled',
        casualties: {
          attackerLosses: (attackerFleet.squadrons.totalShips * 0.6) | 0,
          defenderLosses: (defenderForces.totalShips * 0.4) | 0,
        },
      };
    }
  }

  // ==========================================================================
  // Cultural Invasion (Tech Uplift)
  // ==========================================================================

  /**
   * Process cultural invasion (technology uplift)
   */
  private processCulturalInvasion(
    ctx: SystemContext,
    invEntity: EntityImpl,
    invasion: InvasionComponent,
    activeInvasion: ActiveInvasion,
    tick: number
  ): void {
    if (activeInvasion.status !== 'in_progress') return;
    if (!activeInvasion.techPackage) return;

    // Perform tech uplift
    const result = this.performTechUplift(activeInvasion.techPackage);

    // Update invasion with result
    ctx.components(invEntity).update<InvasionComponent>(CT.Invasion, (current) => {
      const updated = current.activeInvasions.map((inv) =>
        inv.invasionId === activeInvasion.invasionId
          ? {
              ...inv,
              status: result.success ? ('completed' as const) : ('failed' as const),
              result,
            }
          : inv
      );
      return {
        ...current,
        activeInvasions: updated,
        history: {
          ...current.history,
          invasionsReceived: current.history.invasionsReceived + 1,
          lastInvasionTick: tick,
        },
      };
    });

    // Emit event
    ctx.emit(
      'multiverse:invasion_cultural_conquest',
      {
        invasionId: activeInvasion.invasionId,
        attackerUniverse: activeInvasion.attackerUniverseId,
        targetUniverse: activeInvasion.targetUniverseId,
        result,
      },
      invEntity.id
    );
  }

  /**
   * Technology uplift invasion
   */
  private performTechUplift(techPackage: {
    technologies: string[];
    totalEraJump: number;
    dependencyItems: string[];
  }): UpliftResult {
    // Calculate dependency level
    const dependencyLevel = calculateDependency(techPackage);

    // Cultural dominance proportional to dependency
    const culturalDominance = dependencyLevel * 0.8;

    return {
      success: true,
      outcome: 'cultural_conquest',
      dependencyLevel,
      culturalDominance,
      // tradeAgreement would be created here in full implementation
    };
  }

  // ==========================================================================
  // Economic Invasion
  // ==========================================================================

  /**
   * Process economic invasion (trade dominance)
   */
  private processEconomicInvasion(
    ctx: SystemContext,
    invEntity: EntityImpl,
    invasion: InvasionComponent,
    activeInvasion: ActiveInvasion,
    tick: number
  ): void {
    if (activeInvasion.status !== 'in_progress') return;
    if (!activeInvasion.tradeAgreementId) return;

    // Establish trade dominance
    const result = this.establishTradeDominance(activeInvasion.tradeAgreementId);

    // Update invasion with result
    ctx.components(invEntity).update<InvasionComponent>(CT.Invasion, (current) => {
      const updated = current.activeInvasions.map((inv) =>
        inv.invasionId === activeInvasion.invasionId
          ? {
              ...inv,
              status: result.success ? ('completed' as const) : ('failed' as const),
              result,
            }
          : inv
      );
      return {
        ...current,
        activeInvasions: updated,
        history: {
          ...current.history,
          invasionsReceived: current.history.invasionsReceived + 1,
          lastInvasionTick: tick,
        },
      };
    });

    // Emit event
    ctx.emit(
      'multiverse:invasion_economic_conquest',
      {
        invasionId: activeInvasion.invasionId,
        attackerUniverse: activeInvasion.attackerUniverseId,
        targetUniverse: activeInvasion.targetUniverseId,
        result,
      },
      invEntity.id
    );
  }

  /**
   * Economic invasion through trade dominance
   */
  private establishTradeDominance(_tradeAgreementId: string): EconomicInvasionResult {
    // Calculate industrial collapse from trade agreement
    const industrialCollapse = calculateIndustrialCollapse('', null);

    // Economic dependency proportional to industrial collapse
    const economicDependency = industrialCollapse * 0.9;

    return {
      success: true,
      outcome: 'economic_conquest',
      industrialCollapse,
      economicDependency,
      // tradeAgreement would be retrieved here in full implementation
    };
  }

  // ==========================================================================
  // Defense Mechanics
  // ==========================================================================

  /**
   * Destroy passage to prevent further invasion
   * 70% success rate
   * PERF: Use fast PRNG instead of Math.random()
   */
  public destroyPassage(
    ctx: SystemContext,
    passageEntity: EntityImpl,
    passage: PassageComponent
  ): { success: boolean; consequence?: string } {
    const success = invasionRandom.next() < 0.7;

    if (success) {
      ctx.components(passageEntity).update<PassageComponent>(CT.Passage, (current) => ({
        ...current,
        active: false,
        state: 'collapsing',
      }));

      ctx.emit(
        'multiverse:invasion_defense_activated',
        {
          strategy: 'passage_destruction',
          passageId: passage.passageId,
          success: true,
        },
        passageEntity.id
      );

      return {
        success: true,
        consequence:
          'Passage destroyed. Invader forces stranded. No further reinforcements.',
      };
    } else {
      ctx.emit(
        'multiverse:invasion_defense_activated',
        {
          strategy: 'passage_destruction',
          passageId: passage.passageId,
          success: false,
        },
        passageEntity.id
      );

      return {
        success: false,
        consequence: 'Passage destruction failed. Invader has secured the passage.',
      };
    }
  }

  /**
   * Fork timeline to escape invasion
   * Creates new branch where invasion never happened
   */
  public forkToEscapeInvasion(
    ctx: SystemContext,
    invasionId: string
  ): { success: boolean; newForkId?: string } {
    // In full implementation, this would use MultiverseCoordinator to create fork
    // For now, just emit event
    ctx.emit(
      'multiverse:invasion_defense_activated',
      {
        strategy: 'timeline_fork_escape',
        invasionId,
      },
      'system'
    );

    return {
      success: true,
      newForkId: `fork_escape_${Date.now()}`,
    };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Get fleet from cache
   */
  private getFleet(fleetId: string): FleetComponent | null {
    const entity = this.fleetCache.get(fleetId);
    if (!entity) return null;
    return entity.getComponent<FleetComponent>(CT.Fleet) ?? null;
  }

  /**
   * Get passage from cache
   */
  private getPassage(passageId: string): PassageComponent | null {
    const entity = this.passageCache.get(passageId);
    if (!entity) return null;
    return entity.getComponent<PassageComponent>(CT.Passage) ?? null;
  }

  /**
   * Fail invasion with reason
   */
  private failInvasion(
    ctx: SystemContext,
    invEntity: EntityImpl,
    invasion: InvasionComponent,
    activeInvasion: ActiveInvasion,
    reason: string
  ): void {
    ctx.components(invEntity).update<InvasionComponent>(CT.Invasion, (current) => {
      const updated = current.activeInvasions.map((inv) =>
        inv.invasionId === activeInvasion.invasionId
          ? {
              ...inv,
              status: 'failed' as const,
              result: { success: false, reason },
            }
          : inv
      );
      return { ...current, activeInvasions: updated };
    });

    ctx.emit(
      'multiverse:invasion_failed',
      {
        invasionId: activeInvasion.invasionId,
        reason,
      },
      invEntity.id
    );
  }
}
