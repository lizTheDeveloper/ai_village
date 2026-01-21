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

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import { EntityImpl, type Entity } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import { DeityComponent, type DivineDomain } from '../components/DeityComponent.js';
import { createTagsComponent } from '../components/TagsComponent.js';
import { createIdentityComponent } from '../components/IdentityComponent.js';
import type {
  DeityOrigin,
  PerceivedPersonality
} from '../divinity/DeityTypes.js';
import { pendingApprovalRegistry } from '../crafting/PendingApprovalRegistry.js';
import type { LLMDecisionQueue } from '../decision/LLMDecisionProcessor.js';

/** Tracked belief contribution from proto_deity_belief events */
interface ProtoDeityBelief {
  concept: DivineDomain | null;
  totalBelief: number;
  contributors: Set<string>;
  lastContribution: number;
}

/** Pending LLM domain inference request */
interface PendingDomainInference {
  prayerContent: string;
  requestId: string;
  timestamp: number;
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

export class DeityEmergenceSystem extends BaseSystem {
  public readonly id = 'DeityEmergenceSystem';
  public readonly priority = 100;
  public readonly requiredComponents = [] as const;
  // Only run when spiritual components exist (need believers to form new deities)
  public readonly activationComponents = ['spiritual'] as const;
  protected readonly throttleInterval = DEFAULT_EMERGENCE_CONFIG.checkInterval; // ~1 minute at 20 TPS

  private config: EmergenceConfig;

  // Track belief contributions from proto_deity_belief events
  // Key is inferred concept (or 'unknown' if no concept detected)
  private protoDeityBeliefs: Map<string, ProtoDeityBelief> = new Map();

  // LLM integration for prayer domain inference
  private llmQueue: LLMDecisionQueue | null = null;
  private pendingDomainInferences = new Map<string, PendingDomainInference>();
  private domainInferenceCache = new Map<string, DivineDomain | null>();

  constructor(config: Partial<EmergenceConfig> = {}, llmQueue?: LLMDecisionQueue) {
    super();
    this.config = { ...DEFAULT_EMERGENCE_CONFIG, ...config };
    this.llmQueue = llmQueue || null;
  }

  protected onInitialize(): void {
    // Subscribe to proto_deity_belief events from PrayerSystem
    // These are emitted when prayers cannot be routed to an existing deity
    // and might contribute to emerging a new one
    this.events.onGeneric('divinity:proto_deity_belief', (data: unknown) => {
      const typedData = data as {
        agentId: string;
        prayerContent: string;
        beliefContributed: number;
        timestamp: number;
        concept?: string;
      };

      this.trackProtoDeityBelief(typedData);
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

  protected onUpdate(ctx: SystemContext): void {
    // Process any completed LLM domain inference requests
    if (this.llmQueue) {
      this.processLLMDomainInferences();
    }

    // First, check if any proto_deity_beliefs have accumulated enough to trigger emergence
    this.checkProtoDeityEmergence(ctx.world, ctx.tick);

    // Scan for belief patterns from agent data
    const patterns = this.detectBeliefPatterns(ctx.world, ctx.activeEntities);

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
        this.emergeDeity(ctx.world, pattern, ctx.tick);
        // Clear tracked data for this concept after emergence
        this.protoDeityBeliefs.delete(pattern.concept);
      }
    }

    // Clean up stale proto-deity beliefs (older than 10 minutes at 20 TPS)
    const staleThreshold = ctx.tick - 12000;
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
  private detectBeliefPatterns(world: World, activeEntities: ReadonlyArray<Entity>): BeliefPattern[] {
    const patterns: BeliefPattern[] = [];

    // Get all agents with spiritual components
    const spiritualAgents = activeEntities
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
   * Infer domain from prayer content using LLM or fallback to keyword matching
   */
  private inferDomainFromPrayer(content: string): DivineDomain | null {
    // Check cache first
    if (this.domainInferenceCache.has(content)) {
      return this.domainInferenceCache.get(content)!;
    }

    // If LLM is available, queue inference request
    if (this.llmQueue) {
      this.requestLLMDomainInference(content);
    }

    // Always use keyword matching as immediate fallback
    return this.keywordMatchDomain(content);
  }

  /**
   * Request LLM-based domain inference (async)
   */
  private requestLLMDomainInference(prayerContent: string): void {
    const requestId = `domain_inference_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Skip if already pending
    if (this.pendingDomainInferences.has(prayerContent)) {
      return;
    }

    const prompt = this.buildDomainInferencePrompt(prayerContent);

    this.llmQueue!.requestDecision(requestId, prompt).catch(err => {
      console.error('[DeityEmergenceSystem] Failed to request domain inference:', err);
    });

    this.pendingDomainInferences.set(requestId, {
      prayerContent,
      requestId,
      timestamp: Date.now(),
    });
  }

  /**
   * Build LLM prompt for domain inference
   */
  private buildDomainInferencePrompt(prayerContent: string): string {
    const validDomains: DivineDomain[] = [
      'harvest', 'war', 'wisdom', 'craft', 'nature', 'death', 'love', 'chaos', 'order',
      'fortune', 'protection', 'healing', 'mystery', 'time', 'sky', 'earth', 'water',
      'fire', 'storm', 'hunt', 'home', 'travel', 'trade', 'justice', 'vengeance',
      'dreams', 'fear', 'beauty', 'trickery'
    ];

    return `Analyze the following prayer and classify it into the most appropriate divine domain.

Prayer: "${prayerContent}"

Available domains:
${validDomains.map(d => `- ${d}`).join('\n')}

Respond with ONLY a valid JSON object in this format:
{
  "domain": "domain_name",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

If the prayer doesn't clearly fit any domain, use "mystery" as the domain.`;
  }

  /**
   * Process completed LLM domain inference requests
   */
  private processLLMDomainInferences(): void {
    if (!this.llmQueue) return;

    const completedRequests: string[] = [];

    for (const [requestId, pending] of this.pendingDomainInferences.entries()) {
      const response = this.llmQueue.getDecision(requestId);
      if (!response) continue; // Still waiting

      try {
        // Parse LLM response
        const parsed = JSON.parse(response);
        const domain = parsed.domain as DivineDomain;

        // Validate domain
        const validDomains: DivineDomain[] = [
          'harvest', 'war', 'wisdom', 'craft', 'nature', 'death', 'love', 'chaos', 'order',
          'fortune', 'protection', 'healing', 'mystery', 'time', 'sky', 'earth', 'water',
          'fire', 'storm', 'hunt', 'home', 'travel', 'trade', 'justice', 'vengeance',
          'dreams', 'fear', 'beauty', 'trickery'
        ];

        if (validDomains.includes(domain)) {
          // Cache the result
          this.domainInferenceCache.set(pending.prayerContent, domain);

          // Update proto-deity beliefs if this prayer was already tracked
          const oldDomain = this.keywordMatchDomain(pending.prayerContent);
          if (oldDomain && oldDomain !== domain) {
            // Migrate belief from keyword-matched domain to LLM-inferred domain
            const oldKey = oldDomain;
            const newKey = domain;
            const oldTracked = this.protoDeityBeliefs.get(oldKey);
            if (oldTracked) {
              if (!this.protoDeityBeliefs.has(newKey)) {
                this.protoDeityBeliefs.set(newKey, {
                  concept: domain,
                  totalBelief: 0,
                  contributors: new Set(),
                  lastContribution: Date.now(),
                });
              }
              const newTracked = this.protoDeityBeliefs.get(newKey)!;
              newTracked.totalBelief += oldTracked.totalBelief;
              for (const contributor of oldTracked.contributors) {
                newTracked.contributors.add(contributor);
              }
            }
          }
        } else {
          console.warn('[DeityEmergenceSystem] LLM returned invalid domain:', domain);
          this.domainInferenceCache.set(pending.prayerContent, null);
        }
      } catch (error) {
        console.error('[DeityEmergenceSystem] Failed to parse LLM domain inference:', error);
        this.domainInferenceCache.set(pending.prayerContent, null);
      }

      completedRequests.push(requestId);
    }

    // Clean up completed requests
    for (const id of completedRequests) {
      this.pendingDomainInferences.delete(id);
    }

    // Clean up old cache entries (keep only last 1000)
    if (this.domainInferenceCache.size > 1000) {
      const entries = Array.from(this.domainInferenceCache.entries());
      const toDelete = entries.slice(0, entries.length - 1000);
      for (const [key] of toDelete) {
        this.domainInferenceCache.delete(key);
      }
    }
  }

  /**
   * Keyword-based domain matching (fallback when LLM unavailable or for immediate results)
   */
  private keywordMatchDomain(content: string): DivineDomain | null {
    const lower = content.toLowerCase();

    // Simple keyword matching
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
    if (lower.includes('craft') || lower.includes('build') || lower.includes('make')) {
      return 'craft';
    }
    if (lower.includes('fortune') || lower.includes('luck') || lower.includes('prosper')) {
      return 'fortune';
    }
    if (lower.includes('fire') || lower.includes('flame') || lower.includes('burn')) {
      return 'fire';
    }
    if (lower.includes('water') || lower.includes('sea') || lower.includes('ocean')) {
      return 'water';
    }
    if (lower.includes('earth') || lower.includes('stone') || lower.includes('mountain')) {
      return 'earth';
    }
    if (lower.includes('dream') || lower.includes('sleep') || lower.includes('vision')) {
      return 'dreams';
    }
    if (lower.includes('fear') || lower.includes('terror') || lower.includes('afraid')) {
      return 'fear';
    }
    if (lower.includes('justice') || lower.includes('fair') || lower.includes('law')) {
      return 'justice';
    }
    if (lower.includes('travel') || lower.includes('journey') || lower.includes('road')) {
      return 'travel';
    }
    if (lower.includes('home') || lower.includes('hearth') || lower.includes('family')) {
      return 'home';
    }
    if (lower.includes('hunt') || lower.includes('prey') || lower.includes('chase')) {
      return 'hunt';
    }
    if (lower.includes('trade') || lower.includes('merchant') || lower.includes('commerce')) {
      return 'trade';
    }
    if (lower.includes('beauty') || lower.includes('beautiful') || lower.includes('art')) {
      return 'beauty';
    }
    if (lower.includes('trick') || lower.includes('deceive') || lower.includes('cunning')) {
      return 'trickery';
    }
    if (lower.includes('vengeance') || lower.includes('revenge') || lower.includes('retribution')) {
      return 'vengeance';
    }
    if (lower.includes('time') || lower.includes('season') || lower.includes('cycle')) {
      return 'time';
    }
    if (lower.includes('chaos') || lower.includes('disorder') || lower.includes('random')) {
      return 'chaos';
    }
    if (lower.includes('order') || lower.includes('stability') || lower.includes('structure')) {
      return 'order';
    }
    if (lower.includes('nature') || lower.includes('wild') || lower.includes('forest')) {
      return 'nature';
    }
    if (lower.includes('mystery') || lower.includes('secret') || lower.includes('unknown')) {
      return 'mystery';
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
    // Cast required: world.createEntity() returns readonly Entity interface,
    // but internally creates mutable EntityImpl with addComponent method
    (deityEntity as EntityImpl).addComponent(deityComponent);

    // Add identity component for chat system and UI display
    const identityComponent = createIdentityComponent(identity.primaryName, 'deity');
    (deityEntity as EntityImpl).addComponent(identityComponent);

    // Add tags component for chat room membership (Divine Realm requires 'deity' tag)
    const tagsComponent = createTagsComponent('deity');
    (deityEntity as EntityImpl).addComponent(tagsComponent);

    // Register AI deity for auto-approval of believer creations
    // AI gods automatically scrutinize and approve their believers' inventions
    const personalityDesc = this.describePersonalityForScrutiny(identity.personality, pattern.concept);
    pendingApprovalRegistry.configureAIDeity({
      deityId: deityEntity.id,
      autoApproves: true,
      requireNovelty: true,
      requireCoherence: true,
      useLLM: true, // Use LLM for intelligent scrutiny
      deityPersonality: personalityDesc,
    });

    // Emit deity:emerged event for tracking and Fates Council processing
    this.events.emit('deity:emerged', {
      deityId: deityEntity.id,
      deityName: identity.primaryName,
      domain: pattern.concept,
      origin: 'proto_belief',
      believerCount: pattern.agentIds.length,
      initialBelief: pattern.totalBelief,
      tick: currentTick,
    });
  }

  /**
   * Generate a personality description for LLM scrutiny prompts
   */
  private describePersonalityForScrutiny(
    personality: PerceivedPersonality,
    domain: DivineDomain
  ): string {
    const traits: string[] = [];

    // Benevolence
    if (personality.benevolence > 0.5) {
      traits.push('kind and nurturing');
    } else if (personality.benevolence < -0.5) {
      traits.push('harsh and demanding');
    }

    // Interventionism
    if (personality.interventionism > 0.5) {
      traits.push('actively involved in mortal affairs');
    } else if (personality.interventionism < -0.5) {
      traits.push('distant and mysterious');
    }

    // Wrathfulness
    if (personality.wrathfulness > 0.7) {
      traits.push('quick to anger');
    } else if (personality.wrathfulness < 0.3) {
      traits.push('patient and forgiving');
    }

    // Consistency
    if (personality.consistency > 0.7) {
      traits.push('predictable and fair');
    } else if (personality.consistency < 0.3) {
      traits.push('capricious and unpredictable');
    }

    // Generosity
    if (personality.generosity > 0.7) {
      traits.push('generous with blessings');
    } else if (personality.generosity < 0.3) {
      traits.push('expects much in return');
    }

    const traitStr = traits.length > 0 ? traits.join(', ') : 'inscrutable';
    return `a ${domain} deity who is ${traitStr}`;
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
