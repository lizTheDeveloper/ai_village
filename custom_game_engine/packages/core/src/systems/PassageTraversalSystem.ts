/**
 * PassageTraversalSystem - Manages inter-universe passage stability and traversal
 *
 * Priority: 90 (after ship systems, before end-of-tick)
 * Throttle: 20 ticks (1 second at 20 TPS)
 *
 * Responsibilities:
 * - Decay passage stability over time
 * - Handle ship traversal attempts (coherence, energy, risk checks)
 * - Track traffic and congestion
 * - Collapse passages when stability hits zero
 *
 * Per spec: openspec/specs/grand-strategy/10-MULTIVERSE-MECHANICS.md
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type {
  PassageExtendedComponent,
  PassageTraffic,
} from '../components/PassageExtendedComponent.js';
import {
  canShipTraverse,
  calculateCongestion,
} from '../components/PassageExtendedComponent.js';
import type { PassageComponent } from '../components/PassageComponent.js';
import type { SpaceshipComponent } from '../navigation/SpaceshipComponent.js';

/**
 * Result of a ship traversal attempt.
 */
export interface ShipTraversalResult {
  success: boolean;
  reason?: string;
  energyCost?: number;
  timeCost?: number;
  contaminationLevel?: number;
}

/**
 * PassageTraversalSystem manages the lifecycle and traversal mechanics of
 * inter-universe passages.
 *
 * This system handles:
 * 1. Stability decay over time (threads decay fastest)
 * 2. Ship traversal validation (coherence, size, type checks)
 * 3. Traffic congestion tracking
 * 4. Passage collapse when stability reaches zero
 */
export class PassageTraversalSystem extends BaseSystem {
  public readonly id: SystemId = 'passage_traversal';
  public readonly priority: number = 90; // After ship systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.PassageExtended,
  ];
  protected readonly throttleInterval = 20; // Every 1 second (20 ticks)

  // Zero-allocation working objects - reused across update cycles
  private readonly workingTraffic: PassageTraffic = {
    totalCrossings: 0,
    lastCrossing: 0,
    congestion: 0,
  };

  // Cache for contamination levels between universe pairs
  private readonly contaminationCache = new Map<string, number>();
  private static readonly SAME_UNIVERSE_CONTAMINATION = 0.0;
  private static readonly CROSS_UNIVERSE_CONTAMINATION = 0.3;

  // Performance constants
  private static readonly MIN_STABILITY_THRESHOLD = 0.1;
  private static readonly HIGH_CONGESTION_THRESHOLD = 0.8;
  private static readonly CONGESTION_EPSILON = 0.01;

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Single-pass algorithm - combine stability and congestion updates
    for (const entity of ctx.activeEntities) {
      const comps = ctx.components(entity);
      const passageExt = comps.optional<PassageExtendedComponent>(CT.PassageExtended);

      // Early exit - no component
      if (!passageExt) continue;

      // Get base passage component (cached component access)
      const passage = comps.optional<PassageComponent>(CT.Passage);
      if (!passage) {
        console.error(
          `[PassageTraversalSystem] Entity ${entity.id} has passage_extended but missing base passage component`
        );
        continue;
      }

      // Early exit - collapsed passage with no stability
      if (passageExt.stability === 0 && !passage.active) continue;

      // Inline stability update - avoid function call overhead
      const decayRate = passageExt.decayRate;
      if (decayRate > 0) {
        const newStability = Math.max(0, passageExt.stability - decayRate);

        if (newStability !== passageExt.stability) {
          // Calculate congestion inline while we have the data
          const newCongestion = calculateCongestion(passageExt.traffic, tick);
          const congestionChanged = Math.abs(newCongestion - passageExt.traffic.congestion) > PassageTraversalSystem.CONGESTION_EPSILON;

          // Check for collapse
          const collapsed = newStability === 0 && passage.active;

          // Single atomic update - combine stability + congestion
          if (congestionChanged) {
            comps.update<PassageExtendedComponent>(CT.PassageExtended, (current) => ({
              ...current,
              stability: newStability,
              traffic: {
                ...current.traffic,
                congestion: newCongestion,
              },
            }));
          } else {
            comps.update<PassageExtendedComponent>(CT.PassageExtended, (current) => ({
              ...current,
              stability: newStability,
            }));
          }

          // Handle collapse
          if (collapsed) {
            comps.update<PassageComponent>(CT.Passage, (current) => ({
              ...current,
              active: false,
              state: 'collapsing',
            }));

            ctx.emit(
              'passage:collapsed',
              {
                passageId: passage.passageId,
              },
              entity.id
            );
          }
        } else if (passageExt.traffic.totalCrossings > 0) {
          // No stability change, but update congestion if needed
          const newCongestion = calculateCongestion(passageExt.traffic, tick);
          if (Math.abs(newCongestion - passageExt.traffic.congestion) > PassageTraversalSystem.CONGESTION_EPSILON) {
            comps.update<PassageExtendedComponent>(CT.PassageExtended, (current) => ({
              ...current,
              traffic: {
                ...current.traffic,
                congestion: newCongestion,
              },
            }));
          }
        }
      } else if (passageExt.traffic.totalCrossings > 0) {
        // No decay (confluence), but update congestion
        const newCongestion = calculateCongestion(passageExt.traffic, tick);
        if (Math.abs(newCongestion - passageExt.traffic.congestion) > PassageTraversalSystem.CONGESTION_EPSILON) {
          comps.update<PassageExtendedComponent>(CT.PassageExtended, (current) => ({
            ...current,
            traffic: {
              ...current.traffic,
              congestion: newCongestion,
            },
          }));
        }
      }
    }
  }


  /**
   * Attempt ship traversal through a passage.
   *
   * This validates all requirements (coherence, energy, size, type) and
   * updates passage state if successful.
   *
   * @param ship - Ship attempting traversal
   * @param passage - Base passage component
   * @param passageExt - Extended passage metadata
   * @param tick - Current universe tick
   * @returns Traversal result with success status and details
   */
  traversePassage(
    ship: SpaceshipComponent,
    passage: PassageComponent,
    passageExt: PassageExtendedComponent,
    tick: number
  ): ShipTraversalResult {
    // Early exits - check cheapest conditions first
    // Check passage state (cheapest - single boolean + string comparison)
    if (!passage.active || passage.state !== 'active') {
      return {
        success: false,
        reason: `Passage not active (state: ${passage.state})`,
      };
    }

    // Check stability (cheap - single number comparison)
    if (passageExt.stability < PassageTraversalSystem.MIN_STABILITY_THRESHOLD) {
      return {
        success: false,
        reason: `Passage too unstable (stability: ${passageExt.stability.toFixed(2)})`,
      };
    }

    // Check if ship can traverse (more expensive - function call with multiple checks)
    const canTraverse = canShipTraverse(ship, passageExt);
    if (!canTraverse.canTraverse) {
      return {
        success: false,
        reason: canTraverse.reason,
      };
    }

    // Calculate contamination level (cached, avoids repeated lookups)
    const contaminationLevel = this.getContaminationLevel(
      passage.sourceUniverseId,
      passage.targetUniverseId
    );

    // Inline time cost calculation - avoid extra variables
    const congestion = passageExt.traffic.congestion;
    const baseTimeCost = passageExt.traversalCost.timeCost;

    // Success - return costs
    return {
      success: true,
      energyCost: passageExt.traversalCost.energyCost,
      timeCost: Math.ceil(baseTimeCost * (1 + congestion)),
      contaminationLevel,
    };
  }

  /**
   * Record successful traversal - update traffic stats.
   * Uses zero-allocation working object for performance.
   */
  recordTraversal(
    passageExt: PassageExtendedComponent,
    tick: number,
    updateFn: (current: PassageExtendedComponent) => PassageExtendedComponent
  ): void {
    // Reuse working object - zero allocations
    this.workingTraffic.totalCrossings = passageExt.traffic.totalCrossings + 1;
    this.workingTraffic.lastCrossing = tick;
    this.workingTraffic.congestion = calculateCongestion(this.workingTraffic, tick);

    updateFn({
      ...passageExt,
      traffic: {
        totalCrossings: this.workingTraffic.totalCrossings,
        lastCrossing: this.workingTraffic.lastCrossing,
        congestion: this.workingTraffic.congestion,
      },
    });
  }

  /**
   * Check if passage can be traversed right now.
   *
   * Unlike traversePassage(), this just checks readiness without
   * performing the full traversal validation.
   */
  canTraversePassage(
    passage: PassageComponent,
    passageExt: PassageExtendedComponent
  ): { canTraverse: boolean; reason?: string } {
    // Early exits - check cheapest conditions first
    if (!passage.active) {
      return { canTraverse: false, reason: 'Passage not active' };
    }

    if (passage.state !== 'active') {
      return { canTraverse: false, reason: `Passage ${passage.state}` };
    }

    if (passage.cooldown > 0) {
      return {
        canTraverse: false,
        reason: `On cooldown (${passage.cooldown} ticks)`,
      };
    }

    if (passageExt.stability < PassageTraversalSystem.MIN_STABILITY_THRESHOLD) {
      return {
        canTraverse: false,
        reason: `Unstable (${passageExt.stability.toFixed(2)})`,
      };
    }

    return { canTraverse: true };
  }

  /**
   * Get contamination level from timeline mixing (memoized).
   *
   * This would ideally query the divergence between universes.
   * For now, return a cached value.
   *
   * TODO: Integrate with UniverseForkMetadata when implemented
   */
  private getContaminationLevel(
    sourceUniverseId: string,
    targetUniverseId: string
  ): number {
    // Early exit - same universe = zero contamination
    if (sourceUniverseId === targetUniverseId) {
      return PassageTraversalSystem.SAME_UNIVERSE_CONTAMINATION;
    }

    // Cache key for universe pair (order-independent)
    const cacheKey = sourceUniverseId < targetUniverseId
      ? `${sourceUniverseId}:${targetUniverseId}`
      : `${targetUniverseId}:${sourceUniverseId}`;

    // Check cache
    let contamination = this.contaminationCache.get(cacheKey);
    if (contamination === undefined) {
      // TODO: Calculate divergence score between universes
      contamination = PassageTraversalSystem.CROSS_UNIVERSE_CONTAMINATION;
      this.contaminationCache.set(cacheKey, contamination);
    }

    return contamination;
  }

  /**
   * Force collapse a passage (e.g., for defense strategy).
   */
  collapsePassage(
    passage: PassageComponent,
    entityId: string,
    updatePassageFn: (current: PassageComponent) => PassageComponent,
    ctx: SystemContext
  ): void {
    updatePassageFn({
      ...passage,
      active: false,
      state: 'collapsing',
    });

    ctx.emit(
      'passage:collapsed',
      {
        passageId: passage.passageId,
      },
      entityId
    );
  }

  /**
   * Stabilize a passage (e.g., by expending resources).
   *
   * @param amount - Stability to add (0-1)
   */
  stabilizePassage(
    passageExt: PassageExtendedComponent,
    amount: number,
    updateFn: (current: PassageExtendedComponent) => PassageExtendedComponent
  ): void {
    const newStability = Math.min(1.0, passageExt.stability + amount);

    updateFn({
      ...passageExt,
      stability: newStability,
    });
  }
}
