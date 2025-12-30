/**
 * DeityEmergenceSystem - Phase 4: Emergent Gods
 *
 * Detects when collective belief patterns should crystallize into a new deity.
 *
 * Emergence Process:
 * 1. Proto-belief: Scattered superstitions, no coherent entity
 * 2. Coalescence: Beliefs uniting around a concept
 * 3. Crystallization: Entity forming, getting name
 * 4. Establishment: Full deity, accumulating power
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import { DeityComponent, type DivineDomain } from '../components/DeityComponent.js';
import type {
  DeityOrigin,
  PerceivedPersonality
} from '../divinity/DeityTypes.js';

/** Tracked belief contribution from proto_deity_belief events */
interface ProtoDeityBelief {
  concept: DivineDomain | null;
  totalBelief: number;
  contributors: Set<string>;
  lastContribution: number;
}

// ============================================================================
// Emergence Detection
// ============================================================================

/** Configuration for emergence detection */
export interface EmergenceConfig {
  /** Minimum believers to trigger emergence */
  minBelievers: number;

  /** Minimum average faith strength */
  minAverageStrength: number;

  /** How concentrated beliefs must be (0-1) */
  minCohesion: number;

  /** Minimum belief points accumulated */
  minBeliefPoints: number;

  /** Check interval in ticks */
  checkInterval: number;
}

/** Default emergence configuration */
export const DEFAULT_EMERGENCE_CONFIG: EmergenceConfig = {
  minBelievers: 3,
  minAverageStrength: 0.6,
  minCohesion: 0.7,
  minBeliefPoints: 100,
  checkInterval: 1200, // ~1 minute at 20 TPS
};

/** A pattern of shared belief among agents */
export interface BeliefPattern {
  /** What concept they're all believing in */
  concept: DivineDomain;

  /** Agents who share this belief */
  agentIds: string[];

  /** Average faith strength */
  averageStrength: number;

  /** How cohesive the belief is (similar perceptions) */
  cohesion: number;

  /** Total belief points accumulated */
  totalBelief: number;

  /** Trigger that caused this pattern */
  trigger: DeityOrigin;

  /** When pattern first detected */
  firstDetected: number;
}

/** Agent's perception of an emerging deity */
export interface AgentPerception {
  agentId: string;

  /** Suggested name for the entity */
  suggestedName?: string;

  /** Domains they associate with it */
  domains: Map<DivineDomain, number>;

  /** Personality traits they perceive */
  personality: Partial<PerceivedPersonality>;

  /** How strongly they believe */
  faithStrength: number;
}

// ============================================================================
// DeityEmergenceSystem
// ============================================================================

export class DeityEmergenceSystem implements System {
  public readonly id = 'DeityEmergenceSystem';
  public readonly name = 'DeityEmergenceSystem';
  public readonly priority = 100;
  public readonly requiredComponents = [];

  private config: EmergenceConfig;
  private lastCheck: number = 0;
  // Stored for future event emission (deity_emerged event)
  // TODO: Use this to emit deity_emerged events when deities are created
  // private _eventBus?: EventBus;

  // Track belief contributions from proto_deity_belief events
  // Key is inferred concept (or 'unknown' if no concept detected)
  private protoDeityBeliefs: Map<string, ProtoDeityBelief> = new Map();

  constructor(config: Partial<EmergenceConfig> = {}) {
    this.config = { ...DEFAULT_EMERGENCE_CONFIG, ...config };
  }

  initialize(_world: World, eventBus: EventBus): void {
    // Subscribe to proto_deity_belief events from PrayerSystem
    // These are emitted when prayers cannot be routed to an existing deity
    // and might contribute to emerging a new one
    (eventBus.subscribe as any)('divinity:proto_deity_belief', (event: any) => {
      const data = event.data as {
        agentId: string;
        prayerContent: string;
        beliefContributed: number;
        timestamp: number;
        concept?: string;
      };

      this.trackProtoDeityBelief(data);
    });
  }

  /**
   * Track belief contributed by a prayer that might spawn a new deity
   */
  private trackProtoDeityBelief(data: {
    agentId: string;
    prayerContent: string;
    beliefContributed: number;
    timestamp: number;
    concept?: string;
  }): void {
    // Infer concept from prayer content if not provided
    const concept = data.concept || this.inferDomainFromPrayer(data.prayerContent) || 'unknown';

    if (!this.protoDeityBeliefs.has(concept)) {
      this.protoDeityBeliefs.set(concept, {
        concept: concept === 'unknown' ? null : concept as DivineDomain,
        totalBelief: 0,
        contributors: new Set(),
        lastContribution: data.timestamp,
      });
    }

    const tracked = this.protoDeityBeliefs.get(concept)!;
    tracked.totalBelief += data.beliefContributed;
    tracked.contributors.add(data.agentId);
    tracked.lastContribution = data.timestamp;
  }

  update(world: World): void {
    const currentTick = world.tick;

    // Only check periodically
    if (currentTick - this.lastCheck < this.config.checkInterval) {
      return;
    }

    this.lastCheck = currentTick;

    // First, check if any proto_deity_beliefs have accumulated enough to trigger emergence
    this.checkProtoDeityEmergence(world, currentTick);

    // Scan for belief patterns from agent data
    const patterns = this.detectBeliefPatterns(world);

    // Incorporate tracked proto_deity_belief data into patterns
    for (const pattern of patterns) {
      const tracked = this.protoDeityBeliefs.get(pattern.concept);
      if (tracked) {
        // Add accumulated belief from events to pattern total
        pattern.totalBelief += tracked.totalBelief;
        // Merge contributors
        for (const contributor of tracked.contributors) {
          if (!pattern.agentIds.includes(contributor)) {
            pattern.agentIds.push(contributor);
          }
        }
      }
    }

    // Check if any patterns meet emergence threshold
    for (const pattern of patterns) {
      if (this.shouldEmerge(pattern)) {
        this.emergeDeity(world, pattern, currentTick);
        // Clear tracked data for this concept after emergence
        this.protoDeityBeliefs.delete(pattern.concept);
      }
    }

    // Clean up stale proto-deity beliefs (older than 10 minutes at 20 TPS)
    const staleThreshold = currentTick - 12000;
    for (const [concept, tracked] of this.protoDeityBeliefs) {
      if (tracked.lastContribution < staleThreshold) {
        this.protoDeityBeliefs.delete(concept);
      }
    }
  }

  /**
   * Check if any proto_deity_beliefs have accumulated enough for emergence
   * This provides faster emergence when many prayers target the same concept
   */
  private checkProtoDeityEmergence(world: World, currentTick: number): void {
    for (const [conceptKey, tracked] of this.protoDeityBeliefs) {
      // Skip if not enough belief accumulated
      if (tracked.totalBelief < this.config.minBeliefPoints) continue;
      // Skip if not enough contributors
      if (tracked.contributors.size < this.config.minBelievers) continue;

      // Skip unknown concepts
      if (!tracked.concept) continue;

      // Create a pattern from tracked data
      const agentIds = Array.from(tracked.contributors);
      const pattern: BeliefPattern = {
        concept: tracked.concept,
        agentIds,
        averageStrength: tracked.totalBelief / agentIds.length / 10, // Estimate
        cohesion: 0.8, // Assume high cohesion for event-driven data
        totalBelief: tracked.totalBelief,
        trigger: this.determineTrigger(world, agentIds, tracked.concept),
        firstDetected: tracked.lastContribution,
      };

      if (this.shouldEmerge(pattern)) {
        this.emergeDeity(world, pattern, currentTick);
        this.protoDeityBeliefs.delete(conceptKey);
      }
    }
  }

  /**
   * Scan all agents for shared belief patterns
   */
  private detectBeliefPatterns(world: World): BeliefPattern[] {
    const patterns: BeliefPattern[] = [];

    // Get all agents with spiritual components
    const spiritualAgents = Array.from(world.entities.values())
      .filter(e => e.components.has(CT.Agent) && e.components.has(CT.Spiritual));

    // Group by shared concepts (domains they might be attributing events to)
    // For now, we'll look for agents praying to similar concepts
    const conceptGroups = new Map<DivineDomain, Set<string>>();

    for (const entity of spiritualAgents) {
      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;

      if (!spiritual) continue;

      // If they already believe in a deity, skip
      if (spiritual.believedDeity) {
        continue;
      }

      // Check their recent prayers for domain patterns
      // TODO: This is simplified - in full implementation, would analyze
      // prayer content, memory patterns, and conversational attribution
      for (const prayer of spiritual.prayers) {
        const inferredDomain = this.inferDomainFromPrayer(prayer.content);
        if (inferredDomain) {
          if (!conceptGroups.has(inferredDomain)) {
            conceptGroups.set(inferredDomain, new Set());
          }
          conceptGroups.get(inferredDomain)!.add(entity.id);
        }
      }
    }

    // Convert groups to patterns
    for (const [domain, agentIds] of conceptGroups) {
      if (agentIds.size >= this.config.minBelievers) {
        const pattern = this.analyzePattern(world, domain, Array.from(agentIds));
        if (pattern) {
          patterns.push(pattern);
        }
      }
    }

    return patterns;
  }

  /**
   * Analyze a group of agents to determine if they form a cohesive pattern
   */
  private analyzePattern(
    world: World,
    concept: DivineDomain,
    agentIds: string[]
  ): BeliefPattern | null {
    const perceptions: AgentPerception[] = [];

    for (const agentId of agentIds) {
      const entity = world.getEntity(agentId);
      if (!entity) continue;

      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;

      if (!spiritual) continue;

      // Get this agent's perception of the emerging entity
      const perception = this.extractPerception(entity, spiritual, concept);
      perceptions.push(perception);
    }

    // Calculate cohesion (how similar are their perceptions?)
    const cohesion = this.calculateCohesion(perceptions);

    // Calculate average strength
    const averageStrength = perceptions.reduce((sum, p) => sum + p.faithStrength, 0) / perceptions.length;

    // Calculate total belief points
    const totalBelief = perceptions.reduce((sum, p) => sum + p.faithStrength * 10, 0);

    // Determine trigger
    const trigger = this.determineTrigger(world, agentIds, concept);

    return {
      concept,
      agentIds,
      averageStrength,
      cohesion,
      totalBelief,
      trigger,
      firstDetected: world.tick,
    };
  }

  /**
   * Extract an agent's perception of an emerging deity
   */
  private extractPerception(
    entity: Entity,
    spiritual: SpiritualComponent,
    primaryDomain: DivineDomain
  ): AgentPerception {
    const domains = new Map<DivineDomain, number>();
    domains.set(primaryDomain, 0.8); // Primary domain starts strong

    // Build personality perception from agent's own personality
    // (agents tend to imagine gods that reflect their values)
    const personalityComp = entity.components.get(CT.Personality) as PersonalityComponent | undefined;
    const deityPersonality: Partial<PerceivedPersonality> = {};

    if (personalityComp) {
      // Map agent personality to perceived deity personality
      deityPersonality.benevolence = personalityComp.openness > 0.7 ? 0.6 : 0.3;
      deityPersonality.mysteriousness = personalityComp.openness > 0.5 ? 0.6 : 0.4;
      deityPersonality.interventionism = personalityComp.neuroticism > 0.5 ? 0.5 : 0.3;
    }

    return {
      agentId: entity.id,
      domains,
      personality: deityPersonality,
      faithStrength: spiritual.faith,
    };
  }

  /**
   * Calculate how cohesive (similar) a set of perceptions are
   */
  private calculateCohesion(perceptions: AgentPerception[]): number {
    if (perceptions.length < 2) {
      throw new Error('Cannot calculate cohesion with less than 2 perceptions');
    }

    // Calculate variance in personality perceptions
    let totalVariance = 0;
    let traitCount = 0;

    const traits: Array<keyof PerceivedPersonality> = [
      'benevolence', 'interventionism', 'wrathfulness',
      'mysteriousness', 'generosity', 'consistency'
    ];

    for (const trait of traits) {
      const values = perceptions
        .map(p => p.personality[trait])
        .filter((v): v is number => v !== undefined);

      if (values.length > 0) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        totalVariance += variance;
        traitCount++;
      }
    }

    const averageVariance = traitCount > 0 ? totalVariance / traitCount : 0;

    // Convert variance to cohesion (low variance = high cohesion)
    // Variance of 0 = cohesion 1, variance of 1 = cohesion 0
    return Math.max(0, 1 - averageVariance);
  }

  /**
   * Determine what triggered this emergence pattern
   */
  private determineTrigger(
    _world: World,
    _agentIds: string[],
    domain: DivineDomain
  ): DeityOrigin {
    // Simplified trigger detection
    // In full implementation, would analyze:
    // - Recent events (trauma, prosperity, natural phenomena)
    // - Agent memories
    // - Cultural context

    // For now, use domain as a hint
    if (domain === 'death' || domain === 'fear') {
      return 'fear_manifestation';
    }
    if (domain === 'fortune' || domain === 'harvest') {
      return 'shared_prosperity';
    }
    if (domain === 'protection' || domain === 'healing') {
      return 'shared_trauma';
    }

    return 'natural_phenomenon';
  }

  /**
   * Infer domain from prayer content
   * TODO: In full implementation, use LLM to analyze prayer content
   */
  private inferDomainFromPrayer(content: string): DivineDomain | null {
    const lower = content.toLowerCase();

    // Simple keyword matching for now
    if (lower.includes('harvest') || lower.includes('crop') || lower.includes('food')) {
      return 'harvest';
    }
    if (lower.includes('heal') || lower.includes('sick') || lower.includes('health')) {
      return 'healing';
    }
    if (lower.includes('protect') || lower.includes('safe') || lower.includes('danger')) {
      return 'protection';
    }
    if (lower.includes('rain') || lower.includes('storm') || lower.includes('weather')) {
      return 'sky';
    }
    if (lower.includes('war') || lower.includes('battle') || lower.includes('enemy')) {
      return 'war';
    }
    if (lower.includes('love') || lower.includes('heart') || lower.includes('romance')) {
      return 'love';
    }
    if (lower.includes('wise') || lower.includes('wisdom') || lower.includes('knowledge')) {
      return 'wisdom';
    }
    if (lower.includes('death') || lower.includes('died') || lower.includes('afterlife')) {
      return 'death';
    }

    return null;
  }

  /**
   * Check if a pattern meets the threshold for emergence
   */
  private shouldEmerge(pattern: BeliefPattern): boolean {
    return (
      pattern.agentIds.length >= this.config.minBelievers &&
      pattern.averageStrength >= this.config.minAverageStrength &&
      pattern.cohesion >= this.config.minCohesion &&
      pattern.totalBelief >= this.config.minBeliefPoints
    );
  }

  /**
   * Create a new deity from a belief pattern
   */
  private emergeDeity(world: World, pattern: BeliefPattern, currentTick: number): void {
    // Create deity entity
    const deityEntity = world.createEntity();

    // Synthesize identity from believer perceptions
    const perceptions = pattern.agentIds.map(id => {
      const entity = world.getEntity(id);
      if (!entity) {
        throw new Error(`Agent ${id} not found when emerging deity`);
      }
      const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (!spiritual) {
        throw new Error(`Agent ${id} missing spiritual component when emerging deity`);
      }
      return this.extractPerception(entity, spiritual, pattern.concept);
    });

    const identity = this.synthesizeIdentity(perceptions, pattern);

    // Create deity component
    const deityComponent = new DeityComponent(identity.primaryName, 'ai');

    // Set up identity - update fields directly
    deityComponent.identity.primaryName = identity.primaryName;
    if (pattern.concept) {
      deityComponent.identity.domain = pattern.concept;
    }
    deityComponent.identity.perceivedPersonality = identity.personality;
    deityComponent.identity.traitConfidence = new Map([['domain', 0.3]]); // Low initial confidence

    // Add initial believers
    for (const agentId of pattern.agentIds) {
      deityComponent.addBeliever(agentId);

      // Update agent's spiritual component
      const agentEntity = world.getEntity(agentId);
      if (agentEntity) {
        const spiritual = agentEntity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
        if (spiritual) {
          spiritual.believedDeity = deityEntity.id;
        }
      }
    }

    // Set initial belief
    deityComponent.belief.currentBelief = pattern.totalBelief;
    deityComponent.belief.totalBeliefEarned = pattern.totalBelief;
    deityComponent.belief.lastActivityTick = currentTick;

    // Add component to entity
    (deityEntity as any).addComponent(deityComponent);

    // Note: Event emission commented out until event types are updated
    // world.eventBus.emit({
    //   type: 'deity_emerged',
    //   deityId: deityEntity.id,
    //   deityName: identity.primaryName,
    //   domain: pattern.concept,
    //   origin: pattern.trigger,
    //   believerCount: pattern.agentIds.length,
    //   tick: currentTick,
    // });
  }

  /**
   * Synthesize deity identity from believer perceptions
   */
  private synthesizeIdentity(
    perceptions: AgentPerception[],
    pattern: BeliefPattern
  ): { primaryName: string; personality: PerceivedPersonality } {
    // Generate name based on domain
    const primaryName = this.generateName(pattern.concept, perceptions);

    // Average personality traits
    const personality: PerceivedPersonality = {
      benevolence: 0,
      interventionism: 0,
      wrathfulness: 0.5,
      mysteriousness: 0.5,
      generosity: 0.5,
      consistency: 0.5,
      seriousness: 0.5,
      compassion: 0.5,
    };

    // Average each trait across perceptions
    const traits: Array<keyof PerceivedPersonality> = Object.keys(personality) as Array<keyof PerceivedPersonality>;

    for (const trait of traits) {
      const values = perceptions
        .map(p => p.personality[trait])
        .filter((v): v is number => v !== undefined);

      if (values.length > 0) {
        personality[trait] = values.reduce((sum, v) => sum + v, 0) / values.length;
      }
    }

    return { primaryName, personality };
  }

  /**
   * Generate a name for the emerging deity
   * In full implementation, would use LLM based on domain and cultural context
   */
  private generateName(domain: DivineDomain, perceptions: AgentPerception[]): string {
    // Check if any agents suggested a name
    const suggestedNames = perceptions
      .map(p => p.suggestedName)
      .filter((n): n is string => n !== undefined);

    if (suggestedNames.length > 0) {
      // Pick most common suggested name
      const nameCounts = new Map<string, number>();
      for (const name of suggestedNames) {
        nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
      }

      let mostCommon: string | undefined = suggestedNames[0];
      let maxCount = 0;
      for (const [name, count] of nameCounts) {
        if (count > maxCount) {
          mostCommon = name;
          maxCount = count;
        }
      }

      if (mostCommon) {
        return mostCommon;
      }
    }

    // Default names based on domain
    const defaultNames: Record<DivineDomain, string> = {
      harvest: 'The Provider',
      war: 'The Warrior',
      wisdom: 'The Sage',
      craft: 'The Maker',
      nature: 'The Wild One',
      death: 'The Reaper',
      love: 'The Heart',
      chaos: 'The Changer',
      order: 'The Lawkeeper',
      fortune: 'The Lucky One',
      protection: 'The Guardian',
      healing: 'The Healer',
      mystery: 'The Unknown',
      time: 'The Eternal',
      sky: 'The Sky Lord',
      earth: 'The Stone Mother',
      water: 'The Deep One',
      fire: 'The Flame',
      storm: 'The Stormcaller',
      hunt: 'The Hunter',
      home: 'The Hearth Keeper',
      travel: 'The Wanderer',
      trade: 'The Merchant',
      justice: 'The Judge',
      vengeance: 'The Avenger',
      dreams: 'The Dreamer',
      fear: 'The Shadow',
      beauty: 'The Beautiful One',
      trickery: 'The Trickster',
    };

    return defaultNames[domain];
  }
}
