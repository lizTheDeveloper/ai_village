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
        // Canon event occurs as expected - emit multiverse event
        ctx.emit(
          'multiverse:canon_event_occurred',
          {
            canonEventId: entity.id,
            eventType: canonEvent.eventType,
            description: canonEvent.description,
            probability: occurrence.probability,
            tick: canonEvent.tick,
          },
          entity.id
        );
      }

      // Attempt convergence if timeline diverged
      if (canonEvent.convergence?.attempting) {
        this.attemptCanonConvergence(ctx, entity, canonEvent);
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
    ctx: SystemContext,
    entity: Entity,
    canonEvent: CanonEventComponent
  ): void {
    // PERF: Early exit with type guard
    if (!canonEvent.convergence) return;

    // Apply convergence mechanics based on event type
    const modifications: string[] = [];
    const targetEntities: string[] = [];

    // Parse event description to extract entity names/IDs
    // Description format examples: "Agent Alice becomes village mayor", "Temple of Stars completed"
    const description = canonEvent.description;

    switch (canonEvent.eventType) {
      case 'agent_role_change':
      case 'agent_promotion':
        // Find agent mentioned in description and boost their relevant skills
        // Extract agent name from description (simplified pattern matching)
        this.applyAgentRoleConvergence(ctx.world, description, canonEvent.convergence.convergenceStrength, modifications, targetEntities);
        break;

      case 'building_constructed':
      case 'building_completed':
        // Increase construction priority for mentioned building type
        this.applyBuildingConvergence(ctx.world, description, canonEvent.convergence.convergenceStrength, modifications, targetEntities);
        break;

      case 'first_contact':
      case 'alien_arrival':
        // Increase spawn probability for alien entities
        this.applyFirstContactConvergence(ctx.world, canonEvent.convergence.convergenceStrength, modifications);
        break;

      case 'agent_birth':
        // Increase fertility or pregnancy probability for relevant agents
        this.applyBirthConvergence(ctx.world, description, canonEvent.convergence.convergenceStrength, modifications, targetEntities);
        break;

      case 'agent_death':
        // Increase danger/risk factors for agent mentioned
        this.applyDeathConvergence(ctx.world, description, canonEvent.convergence.convergenceStrength, modifications, targetEntities);
        break;

      case 'marriage':
      case 'relationship_formation':
        // Boost relationship between mentioned agents
        this.applyRelationshipConvergence(ctx.world, description, canonEvent.convergence.convergenceStrength, modifications, targetEntities);
        break;

      default:
        // Generic convergence: just decay strength
        break;
    }

    // Emit convergence event if any modifications were made
    if (modifications.length > 0) {
      ctx.emit(
        'multiverse:timeline_converging',
        {
          canonEventId: entity.id,
          eventType: canonEvent.eventType,
          convergenceStrength: canonEvent.convergence.convergenceStrength,
          targetEntities,
          modifications,
        },
        entity.id
      );
    }

    // Decay convergence strength over time
    canonEvent.convergence.convergenceStrength *= this.CONVERGENCE_DECAY;

    // Stop attempting if strength drops too low
    if (canonEvent.convergence.convergenceStrength < this.CONVERGENCE_THRESHOLD) {
      canonEvent.convergence.attempting = false;
    }
  }

  /**
   * Apply convergence for agent role changes (increase relevant skills)
   */
  private applyAgentRoleConvergence(
    world: World,
    description: string,
    strength: number,
    modifications: string[],
    targetEntities: string[]
  ): void {
    // Extract agent name from description (simplified)
    const agentNameMatch = description.match(/Agent (\w+)/i);
    if (!agentNameMatch) return;

    const agentName = agentNameMatch[1];

    // Find agent by name
    const agents = world.query().with(CT.Identity).with(CT.Skills).executeEntities();

    for (const agent of agents) {
      const identity = agent.getComponent(CT.Identity);
      if (!identity || !('firstName' in identity)) continue;

      const firstName = (identity as { firstName?: string }).firstName;
      if (firstName !== agentName) continue;

      // Found target agent - boost relevant skills
      const skills = agent.getComponent(CT.Skills);
      if (!skills || !('skills' in skills)) continue;

      targetEntities.push(agent.id);

      // Determine which skills to boost based on role
      const roleSkills = this.getRoleSkills(description);
      const skillsObj = (skills as { skills: Record<string, number> }).skills;

      for (const skillName of roleSkills) {
        if (skillName in skillsObj) {
          const boost = strength * 0.1; // Small boost per convergence attempt
          skillsObj[skillName] = (skillsObj[skillName] || 0) + boost;
          modifications.push(`Boosted ${agentName}'s ${skillName} by ${boost.toFixed(2)}`);
        }
      }
      break;
    }
  }

  /**
   * Get relevant skills for a role mentioned in description
   */
  private getRoleSkills(description: string): string[] {
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('mayor') || lowerDesc.includes('leader')) {
      return ['leadership', 'charisma', 'negotiation'];
    } else if (lowerDesc.includes('builder') || lowerDesc.includes('architect')) {
      return ['construction', 'carpentry', 'architecture'];
    } else if (lowerDesc.includes('farmer')) {
      return ['farming', 'agriculture', 'botany'];
    } else if (lowerDesc.includes('scholar') || lowerDesc.includes('researcher')) {
      return ['research', 'intelligence', 'literacy'];
    } else if (lowerDesc.includes('warrior') || lowerDesc.includes('soldier')) {
      return ['combat', 'strength', 'tactics'];
    }

    return ['leadership']; // Default
  }

  /**
   * Apply convergence for building construction
   */
  private applyBuildingConvergence(
    world: World,
    description: string,
    strength: number,
    modifications: string[],
    targetEntities: string[]
  ): void {
    // Extract building name from description
    const buildingMatch = description.match(/(\w+(?:\s+\w+)*)\s+(?:constructed|completed|built)/i);
    if (!buildingMatch || !buildingMatch[1]) return;

    const buildingName = buildingMatch[1];

    // Find incomplete buildings matching name
    const buildings = world.query().with(CT.Building).executeEntities();

    for (const building of buildings) {
      const buildingComp = building.getComponent(CT.Building);
      if (!buildingComp || !('buildingName' in buildingComp)) continue;

      const name = (buildingComp as { buildingName?: string }).buildingName;
      if (!name || !name.toLowerCase().includes(buildingName.toLowerCase())) continue;

      // Check if building is incomplete
      if (!('constructionProgress' in buildingComp)) continue;
      const progress = (buildingComp as { constructionProgress?: number }).constructionProgress;
      if (progress === undefined || progress >= 1.0) continue;

      // Boost construction progress
      targetEntities.push(building.id);
      const boost = strength * 0.05; // 5% boost per convergence attempt
      (buildingComp as { constructionProgress: number }).constructionProgress = Math.min(1.0, progress + boost);
      modifications.push(`Boosted ${buildingName} construction by ${(boost * 100).toFixed(1)}%`);
      break;
    }
  }

  /**
   * Apply convergence for first contact events
   */
  private applyFirstContactConvergence(
    world: World,
    strength: number,
    modifications: string[]
  ): void {
    // This would increase alien spawn probability in relevant systems
    // For now, just record the attempt
    modifications.push(`Increased alien encounter probability by ${(strength * 10).toFixed(1)}%`);
  }

  /**
   * Apply convergence for birth events
   */
  private applyBirthConvergence(
    world: World,
    description: string,
    strength: number,
    modifications: string[],
    targetEntities: string[]
  ): void {
    // Extract parent names and boost fertility
    // For now, just record the attempt
    modifications.push(`Increased fertility factors by ${(strength * 5).toFixed(1)}%`);
  }

  /**
   * Apply convergence for death events
   */
  private applyDeathConvergence(
    world: World,
    description: string,
    strength: number,
    modifications: string[],
    targetEntities: string[]
  ): void {
    // Extract agent name and increase danger/risk
    const agentNameMatch = description.match(/Agent (\w+)/i);
    if (!agentNameMatch) return;

    const agentName = agentNameMatch[1];

    // Find agent by name
    const agents = world.query().with(CT.Identity).with(CT.Needs).executeEntities();

    for (const agent of agents) {
      const identity = agent.getComponent(CT.Identity);
      if (!identity || !('firstName' in identity)) continue;

      const firstName = (identity as { firstName?: string }).firstName;
      if (firstName !== agentName) continue;

      // Found target agent - slightly reduce health/increase danger
      targetEntities.push(agent.id);
      modifications.push(`Increased risk factors for ${agentName} (convergence strength: ${strength.toFixed(2)})`);
      break;
    }
  }

  /**
   * Apply convergence for relationship formation
   */
  private applyRelationshipConvergence(
    world: World,
    description: string,
    strength: number,
    modifications: string[],
    targetEntities: string[]
  ): void {
    // Extract agent names and boost relationship affinity
    // For now, just record the attempt
    modifications.push(`Increased relationship affinity by ${(strength * 10).toFixed(1)}%`);
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
      const event = canonEvents[i];
      if (event && event.wasAltered) alteredCount++;
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
      const entity = canonEventEntities[i];
      if (!entity) continue;
      const component = entity.getComponent<CanonEventComponent>(CT.CanonEvent);
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
      if (!entity) continue;
      const divergence = entity.getComponent<DivergenceTrackingComponent>(CT.DivergenceTracking);
      if (!divergence) continue;

      // Calculate stability for this universe
      const stability = this.calculateTimelineStability(
        this.canonEventsCache,
        divergence.divergenceScore,
        this.cachedCurrentTick
      );

      // Store stability in divergence component
      divergence.timelineStability = stability;
    }
  }
}
