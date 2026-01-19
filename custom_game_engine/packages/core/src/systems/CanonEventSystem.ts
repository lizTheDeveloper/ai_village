import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { CanonEventComponent, CanonEventConvergence } from '../components/CanonEventComponent.js';
import type { DivergenceTrackingComponent } from '../components/DivergenceTrackingComponent.js';

/**
 * CanonEventSystem - Manages canon events (narrative anchors that resist change)
 *
 * Canon events are events with high narrative weight that are "resistant to change"
 * across timelines. They represent narrative inevitability - events that tend to
 * happen even when timelines diverge.
 *
 * Properties of canon events:
 * - High Probability: Event has >90% chance of occurring
 * - Causal Convergence: Multiple paths lead to same outcome
 * - Narrative Weight: Event is thematically significant
 * - Timeline Anchor: Event stabilizes surrounding timeline
 *
 * This system:
 * 1. Checks if canon events should occur despite divergence
 * 2. Attempts to nudge timeline back to canon (convergence)
 * 3. Calculates timeline stability based on canon adherence
 *
 * Canon events have "gravity" pulling timeline back to canon outcome.
 *
 * Priority: 260 (after divergence tracking)
 * Throttle: 500 ticks (25 seconds)
 *
 * @see CanonEventComponent - Component defining canon events
 * @see DivergenceTrackingSystem - Tracks timeline divergence
 */
export class CanonEventSystem extends BaseSystem {
  public readonly id: SystemId = 'canon_event';
  public readonly priority: number = 260; // After divergence tracking (250)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.CanonEvent,
  ];
  public readonly activationComponents = [CT.CanonEvent] as const;

  /**
   * Systems that must run before this one
   */
  public readonly dependsOn = ['divergence_tracking'] as const;

  protected readonly throttleInterval = 500; // 25 seconds

  // PERF: Cached current tick as bigint to avoid repeated conversions
  private cachedCurrentTick = 0n;

  // PERF: Reusable occurrence result object (zero allocations in hot path)
  private readonly occurrenceResult = { shouldOccur: false, probability: 0 };

  /**
   * Update canon events: check occurrence and attempt convergence
   */
  protected onUpdate(ctx: SystemContext): void {
    const entities = ctx.world.query()
      .with(CT.CanonEvent)
      .executeEntities();

    // PERF: Convert tick to bigint once
    this.cachedCurrentTick = BigInt(ctx.world.tick);

    for (const entity of entities) {
      const canonEvent = entity.getComponent<CanonEventComponent>(CT.CanonEvent);
      if (!canonEvent) continue;

      // PERF: Early exit if event already altered and not attempting convergence
      if (canonEvent.wasAltered && !canonEvent.convergence?.attempting) continue;

      // Check if canon event should occur
      const occurrence = this.checkCanonEventOccurrence(canonEvent);

      if (occurrence.shouldOccur && !canonEvent.wasAltered) {
        // Canon event occurs as expected
        // TODO: Trigger actual event in game
        // For now, just log that it would occur
      }

      // Attempt convergence if timeline diverged
      if (canonEvent.convergence?.attempting) {
        this.attemptCanonConvergence(ctx.world, entity, canonEvent);
      }
    }

    // Calculate timeline stability for universes with canon events
    this.updateTimelineStability(ctx.world);
  }

  // PERF: Precompute constants for canon event checking
  private readonly CANON_EARLY_THRESHOLD = -100n;
  private readonly CANON_LATE_THRESHOLD = 10000n;
  private readonly CANON_BASE_PROBABILITY = 0.9;
  private readonly CANON_TIME_DIVISOR = 10000;
  private readonly CANON_TIME_PENALTY_WEIGHT = 0.5;

  /**
   * Check if canon event should occur despite timeline differences
   * Canon events have "gravity" pulling timeline back to canon
   *
   * Returns probability of occurrence (0-1) and whether it should occur
   */
  private checkCanonEventOccurrence(
    canonEvent: CanonEventComponent
  ): { shouldOccur: boolean; probability: number } {
    const canonTick = BigInt(canonEvent.tick);
    const ticksSinceCanon = this.cachedCurrentTick - canonTick;

    // PERF: Early exits first (most common cases)
    // Check if event was already altered
    if (canonEvent.wasAltered) {
      // Event already happened differently, no second chance
      this.occurrenceResult.shouldOccur = false;
      this.occurrenceResult.probability = 0;
      return this.occurrenceResult;
    }

    // Canon events can occur "late" if timeline diverged
    if (ticksSinceCanon < this.CANON_EARLY_THRESHOLD) {
      // Too early, event hasn't happened yet
      this.occurrenceResult.shouldOccur = false;
      this.occurrenceResult.probability = 0;
      return this.occurrenceResult;
    }

    if (ticksSinceCanon > this.CANON_LATE_THRESHOLD) {
      // Too late, window closed
      this.occurrenceResult.shouldOccur = false;
      this.occurrenceResult.probability = 0;
      return this.occurrenceResult;
    }

    // Calculate occurrence probability based on resistance
    const resistance = canonEvent.resistanceStrength;
    // PERF: Avoid Math.abs by checking sign first
    const timePenaltyBase = ticksSinceCanon < 0n ? -Number(ticksSinceCanon) : Number(ticksSinceCanon);
    const timePenalty = timePenaltyBase / this.CANON_TIME_DIVISOR;

    const probability = this.CANON_BASE_PROBABILITY * resistance * (1 - timePenalty * this.CANON_TIME_PENALTY_WEIGHT);

    this.occurrenceResult.shouldOccur = Math.random() < probability;
    this.occurrenceResult.probability = probability;

    return this.occurrenceResult;
  }

  // PERF: Precompute convergence constants
  private readonly CONVERGENCE_DECAY = 0.99;
  private readonly CONVERGENCE_THRESHOLD = 0.1;

  /**
   * Attempt to converge timeline back to canon
   * Generates "nudges" toward canon outcome
   *
   * Example: If canon says "Alice becomes mayor", increase Alice's leadership skill
   */
  private attemptCanonConvergence(
    world: World,
    entity: Entity,
    canonEvent: CanonEventComponent
  ): void {
    // PERF: Early exit with type guard
    if (!canonEvent.convergence) return;

    // TODO: Implement actual convergence mechanics based on event type
    // This would require:
    // 1. Parsing canonEvent.eventType and description
    // 2. Finding relevant entities (e.g., Agent Alice for "agent_role_change")
    // 3. Applying subtle modifiers to increase probability of canon outcome

    // Examples from spec:
    // - agent_role_change: Increase agent's relevant skills
    // - building_constructed: Increase building priority in city planning
    // - first_contact: Increase alien spawn probability

    // For now, just decay convergence strength over time
    canonEvent.convergence.convergenceStrength *= this.CONVERGENCE_DECAY;

    // Stop attempting if strength drops too low
    if (canonEvent.convergence.convergenceStrength < this.CONVERGENCE_THRESHOLD) {
      canonEvent.convergence.attempting = false;
    }
  }

  // PERF: Precompute stability calculation constants
  private readonly BASE_STABILITY = 0.5;
  private readonly DIVERGENCE_PENALTY_WEIGHT = 0.5;
  private readonly AGE_FACTOR_DIVISOR = 100000;
  private readonly AGE_BASE_WEIGHT = 0.5;

  /**
   * Calculate timeline stability based on canon adherence
   * High stability = resists change, low stability = chaotic
   *
   * Formula:
   * stability = (canonAdherence - divergencePenalty) * (0.5 + ageFactor * 0.5)
   *
   * Returns 0-1 (0 = unstable, 1 = very stable)
   */
  public calculateTimelineStability(
    canonEvents: CanonEventComponent[],
    divergenceScore: number,
    universeTick: bigint
  ): number {
    // PERF: Early exit for no canon events
    if (canonEvents.length === 0) {
      return this.BASE_STABILITY;
    }

    // PERF: Manual loop to count altered events (faster than filter)
    let alteredCount = 0;
    for (let i = 0; i < canonEvents.length; i++) {
      if (canonEvents[i].wasAltered) alteredCount++;
    }

    const canonAdherence = 1 - (alteredCount / canonEvents.length);

    // Divergence reduces stability
    const divergencePenalty = divergenceScore * this.DIVERGENCE_PENALTY_WEIGHT;

    // Age increases stability (older timelines are more "set")
    const universeTicks = Number(universeTick);
    const ageFactor = universeTicks < this.AGE_FACTOR_DIVISOR
      ? universeTicks / this.AGE_FACTOR_DIVISOR
      : 1;

    const stability = (canonAdherence - divergencePenalty) * (this.AGE_BASE_WEIGHT + ageFactor * this.AGE_BASE_WEIGHT);

    // PERF: Manual clamp (faster than Math.max/Math.min)
    return stability > 1 ? 1 : (stability < 0 ? 0 : stability);
  }

  // PERF: Reusable array for canon events (avoid allocation per update)
  private readonly canonEventsCache: CanonEventComponent[] = [];

  /**
   * Update timeline stability for all universes
   */
  private updateTimelineStability(world: World): void {
    // PERF: Get all canon events (cache query outside loop)
    const canonEventEntities = world.query()
      .with(CT.CanonEvent)
      .executeEntities();

    // PERF: Reuse array instead of map+filter
    this.canonEventsCache.length = 0;
    for (let i = 0; i < canonEventEntities.length; i++) {
      const component = canonEventEntities[i].getComponent<CanonEventComponent>(CT.CanonEvent);
      if (component) {
        this.canonEventsCache.push(component);
      }
    }

    // Get divergence tracking
    const divergenceEntities = world.query()
      .with(CT.DivergenceTracking)
      .executeEntities();

    for (let i = 0; i < divergenceEntities.length; i++) {
      const entity = divergenceEntities[i];
      const divergence = entity.getComponent<DivergenceTrackingComponent>(CT.DivergenceTracking);
      if (!divergence) continue;

      // Calculate stability for this universe
      const stability = this.calculateTimelineStability(
        this.canonEventsCache,
        divergence.divergenceScore,
        this.cachedCurrentTick
      );

      // TODO: Store stability somewhere (either in divergence component or separate component)
      // For now, stability is just calculated but not persisted
    }
  }
}
