/**
 * InterestEvolutionSystem
 *
 * Deep Conversation System - Phase 7.1: Interest Evolution
 *
 * Makes interests dynamic and responsive to life:
 * - Strengthen through skill practice
 * - Decay through neglect
 * - Emerge from significant experiences
 * - Transfer through mentorship in conversations
 *
 * This creates a living interest landscape where agents' passions
 * evolve naturally based on their experiences and social interactions.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { SystemId, ComponentType } from '../types.js';
import type { InterestsComponent, Interest, TopicId, InterestSource } from '../components/InterestsComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import { getTopicCategory } from '../components/InterestsComponent.js';
import type { GameEvent } from '../events/GameEvent.js';
import type { EventType } from '../events/EventMap.js';
import type { World } from '../ecs/World.js';

/**
 * Skill to interest mappings
 */
interface SkillInterestMapping {
  skill: string; // SkillType
  topic: TopicId;
  strengthenRate: number; // Per skill level gained
}

const SKILL_INTEREST_MAPPINGS: SkillInterestMapping[] = [
  { skill: 'farming', topic: 'farming', strengthenRate: 0.01 },
  { skill: 'woodworking', topic: 'woodworking', strengthenRate: 0.01 },
  { skill: 'stonecraft', topic: 'stonecraft', strengthenRate: 0.01 },
  { skill: 'cooking', topic: 'cooking', strengthenRate: 0.01 },
  { skill: 'building', topic: 'building', strengthenRate: 0.01 },
  { skill: 'foraging', topic: 'foraging', strengthenRate: 0.01 },
  { skill: 'hunting', topic: 'hunting', strengthenRate: 0.01 },
];

/**
 * Experience triggers that create new interests
 */
interface ExperienceTrigger {
  eventType: string;
  newInterest: TopicId;
  intensity: number;
  condition?: (agent: EntityImpl, event: GameEvent, world: World) => boolean;
}

const EXPERIENCE_TRIGGERS: ExperienceTrigger[] = [
  {
    eventType: 'agent:death',
    newInterest: 'mortality',
    intensity: 0.6,
    // Only if they witnessed it or were close
    condition: (agent, event, world) => {
      // For now, simple proximity check
      // Could check relationships in future
      return true;
    },
  },
  {
    eventType: 'deity:miracle',
    newInterest: 'the_gods',
    intensity: 0.7,
  },
  {
    eventType: 'building:completed',
    newInterest: 'building',
    intensity: 0.4,
    condition: (agent, event) => {
      // Only if they built it
      if ('builderId' in event.data && typeof event.data.builderId === 'string') {
        return event.data.builderId === agent.id;
      }
      return false;
    },
  },
  {
    eventType: 'agent:born',
    newInterest: 'family',
    intensity: 0.8,
    condition: (agent, event) => {
      // Only for parents
      if ('parentIds' in event.data && Array.isArray(event.data.parentIds)) {
        return event.data.parentIds.includes(agent.id);
      }
      return false;
    },
  },
  {
    eventType: 'prayer:answered',
    newInterest: 'the_gods',
    intensity: 0.6,
    condition: (agent, event) => {
      return event.source === agent.id;
    },
  },
  {
    eventType: 'trauma:experienced',
    newInterest: 'mortality', // Trauma makes agents think about mortality and meaning
    intensity: 0.5,
    condition: (agent, event) => {
      // Only for the agent who experienced trauma
      if ('agentId' in event.data && typeof event.data.agentId === 'string') {
        return event.data.agentId === agent.id;
      }
      return false;
    },
  },
  {
    eventType: 'discovery:created',
    newInterest: 'work', // Making discoveries leads to interest in work/craft
    intensity: 0.7,
    condition: (agent, event) => {
      // Only for the agent who made the discovery
      if ('generatedBy' in event.data && typeof event.data.generatedBy === 'string') {
        return event.data.generatedBy === agent.id;
      }
      return false;
    },
  },
  {
    eventType: 'profession:work_completed',
    newInterest: 'craftsmanship', // High quality work leads to pride in craftsmanship
    intensity: 0.3,
    condition: (agent, event) => {
      // Only for the working agent, and only if quality is high
      if ('agentId' in event.data && typeof event.data.agentId === 'string' &&
          'quality' in event.data && typeof event.data.quality === 'number') {
        return event.data.agentId === agent.id && event.data.quality >= 0.7;
      }
      return false;
    },
  },
];

/**
 * Decay rates by interest source (using string keys for flexibility)
 */
const DECAY_RATES: Record<string, number> = {
  skill: 0.02,       // Skills decay slowly (muscle memory)
  personality: 0.01, // Core interests very stable
  innate: 0.0,       // Innate interests never decay
  childhood: 0.08,   // Childhood interests fade fast
  experience: 0.05,  // Life experiences fade moderately
  question: 0.10,    // Children's questions change rapidly
  learned: 0.04,     // Learned interests moderately stable
  social: 0.03,      // Social interests fairly stable
};

/**
 * Interest mutation event types
 */
export type InterestMutationEvent =
  | 'interest:emerged'
  | 'interest:strengthened'
  | 'interest:weakened'
  | 'interest:lost'
  | 'interest:transferred';

export interface InterestMutationEventData {
  agentId: string;
  agentName: string;
  topic: TopicId;
  oldIntensity?: number;
  newIntensity: number;
  source: InterestSource;
  trigger?: string; // Specific event that caused it
}

export class InterestEvolutionSystem extends BaseSystem {
  public readonly id: SystemId = 'interest_evolution';
  public readonly priority: number = 18; // After FriendshipSystem (17)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Agent,
    CT.Interests,
  ];
  // Only run when interests components exist (O(1) activation check)
  public readonly activationComponents = [CT.Interests] as const;

  // Check for decay once per game month at 20 TPS
  protected readonly throttleInterval = 30 * 24 * 1200; // 1 month at 20 TPS

  // Thresholds for mutation events
  private static readonly EMERGENCE_THRESHOLD = 0.3;
  private static readonly LOSS_THRESHOLD = 0.1;
  private static readonly SIGNIFICANT_CHANGE = 0.2;

  // Ticks in a week (for decay calculation)
  private static readonly WEEK_IN_TICKS = 7 * 24 * 1200; // 7 days * 24 hours * 1200 ticks/hour

  protected onInitialize(): void {
    // Listen for experience triggers (all using typed events)
    this.events.on('agent:death', (_data, event) => this.handleExperience(event, this.world));
    this.events.on('deity:miracle', (_data, event) => this.handleExperience(event, this.world));
    this.events.on('building:completed', (_data, event) => this.handleExperience(event, this.world));
    this.events.on('agent:born', (_data, event) => this.handleExperience(event, this.world));
    this.events.on('prayer:answered', (_data, event) => this.handleExperience(event, this.world));
    this.events.on('trauma:experienced', (_data, event) => this.handleExperience(event, this.world));
    this.events.on('discovery:created', (_data, event) => this.handleExperience(event, this.world));
    this.events.on('profession:work_completed', (_data, event) => this.handleExperience(event, this.world));

    // Listen for skill increases
    this.events.on('skill:level_up', (_data, event) => this.handleSkillGrowth(event, this.world));

    // Listen for conversations (mentorship transfer)
    this.events.on('conversation:ended', (_data, event) => this.handleMentorship(event, this.world));
  }

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      this.processDecay(entity, ctx.world);
    }
  }

  /**
   * Process interest decay for an agent
   */
  private processDecay(agent: EntityImpl, world: World): void {
    const interests = agent.getComponent<InterestsComponent>(CT.Interests);
    if (!interests) return;

    const currentTick = world.tick;

    // Process each interest
    for (const interest of [...interests.interests]) { // Copy array since we might remove items
      // Skip innate interests (they never decay)
      if (interest.source === 'innate') continue;

      // Calculate time since last discussion
      const ticksSinceDiscussion = interest.lastDiscussed
        ? currentTick - interest.lastDiscussed
        : currentTick - agent.createdAt;

      // Only decay if at least a week has passed
      if (ticksSinceDiscussion >= InterestEvolutionSystem.WEEK_IN_TICKS) {
        const weeksNeglected = Math.floor(ticksSinceDiscussion / InterestEvolutionSystem.WEEK_IN_TICKS);
        const decayRate = DECAY_RATES[interest.source] || 0.05;
        const decay = decayRate * weeksNeglected;

        const oldIntensity = interest.intensity;
        interest.intensity = Math.max(0, interest.intensity - decay);

        // Emit events for significant changes
        if (oldIntensity > InterestEvolutionSystem.LOSS_THRESHOLD &&
            interest.intensity <= InterestEvolutionSystem.LOSS_THRESHOLD) {
          this.emitMutationEvent(world, agent, interest, 'interest:lost', oldIntensity);
        } else if (oldIntensity - interest.intensity >= InterestEvolutionSystem.SIGNIFICANT_CHANGE) {
          this.emitMutationEvent(world, agent, interest, 'interest:weakened', oldIntensity);
        }

        // Remove interests that decayed to zero
        if (interest.intensity <= 0) {
          interests.removeInterest(interest.topic);
        }
      }
    }
  }

  /**
   * Handle skill increases - strengthen related interests
   */
  private handleSkillGrowth(event: GameEvent<'skill:level_up'>, world: World): void {
    const { agentId, skillId } = event.data;
    const agent = world.getEntity(agentId);
    if (!agent || !(agent instanceof EntityImpl)) return;

    const mapping = SKILL_INTEREST_MAPPINGS.find(m => m.skill === skillId);
    if (!mapping) return;

    const interests = agent.getComponent<InterestsComponent>(CT.Interests);
    if (!interests) return;

    let interest = interests.getInterest(mapping.topic);
    const oldIntensity = interest?.intensity || 0;
    const increase = mapping.strengthenRate;

    if (!interest) {
      // Create new interest from skill
      interest = {
        topic: mapping.topic,
        category: getTopicCategory(mapping.topic),
        intensity: increase,
        source: 'skill',
        lastDiscussed: null,
        discussionHunger: 0.5,
        knownEnthusiasts: [],
      };
      interests.addInterest(interest);

      if (increase >= InterestEvolutionSystem.EMERGENCE_THRESHOLD) {
        this.emitMutationEvent(world, agent, interest, 'interest:emerged', 0, `skill:${skillId}`);
      }
    } else {
      // Strengthen existing interest
      interest.intensity = Math.min(1.0, interest.intensity + increase);

      if (interest.intensity - oldIntensity >= InterestEvolutionSystem.SIGNIFICANT_CHANGE) {
        this.emitMutationEvent(world, agent, interest, 'interest:strengthened', oldIntensity, `skill:${skillId}`);
      }
    }
  }

  /**
   * Handle life experiences - create new interests
   */
  private handleExperience(event: GameEvent, world: World): void {
    const trigger = EXPERIENCE_TRIGGERS.find(t => t.eventType === event.type);
    if (!trigger) return;

    // Find affected agents
    const affectedAgents = this.findAffectedAgents(event, world);

    for (const agent of affectedAgents) {
      if (trigger.condition && !trigger.condition(agent, event, world)) continue;

      const interests = agent.getComponent<InterestsComponent>(CT.Interests);
      if (!interests) continue;

      let interest = interests.getInterest(trigger.newInterest);

      if (!interest) {
        // Create new interest from experience
        interest = {
          topic: trigger.newInterest,
          category: getTopicCategory(trigger.newInterest),
          intensity: trigger.intensity,
          source: 'experience',
          lastDiscussed: null,
          discussionHunger: 0.8, // High hunger to discuss new experience
          knownEnthusiasts: [],
        };
        interests.addInterest(interest);
        this.emitMutationEvent(world, agent, interest, 'interest:emerged', 0, event.type);
      } else {
        // Strengthen existing interest
        const oldIntensity = interest.intensity;
        interest.intensity = Math.min(1.0, interest.intensity + trigger.intensity * 0.3);

        if (interest.intensity - oldIntensity >= InterestEvolutionSystem.SIGNIFICANT_CHANGE) {
          this.emitMutationEvent(world, agent, interest, 'interest:strengthened', oldIntensity, event.type);
        }
      }
    }
  }

  /**
   * Handle mentorship - transfer interests during high-quality conversations
   */
  private handleMentorship(event: GameEvent<'conversation:ended'>, world: World): void {
    const { agent1, agent2, topics, quality } = event.data;

    // Check if topics were discussed and quality is high enough
    const topicsDiscussed = topics || [];
    const overallQuality = quality || 0;

    if (topicsDiscussed.length === 0) return;
    if (overallQuality < 0.6) return; // Only high-quality conversations transfer

    if (!agent1 || !agent2) return;

    const entity1 = world.getEntity(agent1);
    const entity2 = world.getEntity(agent2);
    if (!entity1 || !entity2) return;
    if (!(entity1 instanceof EntityImpl) || !(entity2 instanceof EntityImpl)) return;

    // Bidirectional transfer
    this.transferInterests(entity1, entity2, topicsDiscussed as TopicId[], overallQuality, world);
    this.transferInterests(entity2, entity1, topicsDiscussed as TopicId[], overallQuality, world);
  }

  /**
   * Transfer interests from teacher to student through conversation
   */
  private transferInterests(
    student: EntityImpl,
    teacher: EntityImpl,
    topics: TopicId[],
    quality: number,
    world: World
  ): void {
    const studentInterests = student.getComponent<InterestsComponent>(CT.Interests);
    const teacherInterests = teacher.getComponent<InterestsComponent>(CT.Interests);
    if (!studentInterests || !teacherInterests) return;

    const studentAgent = student.getComponent<AgentComponent>(CT.Agent);
    const studentAge = studentAgent?.ageCategory || 'adult';

    // Receptivity by age - younger agents more impressionable
    const receptivity = {
      child: 0.8,
      teen: 0.6,
      adult: 0.3,
      elder: 0.1,
    }[studentAge];

    for (const topic of topics) {
      const teacherInterest = teacherInterests.getInterest(topic);
      if (!teacherInterest || teacherInterest.intensity < 0.6) continue;

      const transferAmount = teacherInterest.intensity * receptivity * quality * 0.1;

      let studentInterest = studentInterests.getInterest(topic);
      const oldIntensity = studentInterest?.intensity || 0;

      if (!studentInterest) {
        // Create new learned interest
        studentInterest = {
          topic,
          category: getTopicCategory(topic),
          intensity: transferAmount,
          source: 'learned',
          lastDiscussed: world.tick,
          discussionHunger: 0.3,
          knownEnthusiasts: [teacher.id],
        };
        studentInterests.addInterest(studentInterest);

        if (transferAmount >= InterestEvolutionSystem.EMERGENCE_THRESHOLD) {
          const teacherIdentity = teacher.getComponent<IdentityComponent>(CT.Identity);
          this.emitMutationEvent(
            world,
            student,
            studentInterest,
            'interest:transferred',
            0,
            teacherIdentity?.name || teacher.id
          );
        }
      } else {
        // Strengthen existing interest
        studentInterest.intensity = Math.min(1.0, studentInterest.intensity + transferAmount);

        if (studentInterest.intensity - oldIntensity >= InterestEvolutionSystem.SIGNIFICANT_CHANGE) {
          const teacherIdentity = teacher.getComponent<IdentityComponent>(CT.Identity);
          this.emitMutationEvent(
            world,
            student,
            studentInterest,
            'interest:transferred',
            oldIntensity,
            teacherIdentity?.name || teacher.id
          );
        }
      }
    }
  }

  /**
   * Emit interest mutation event
   */
  private emitMutationEvent(
    world: World,
    agent: EntityImpl,
    interest: Interest,
    eventType: InterestMutationEvent,
    oldIntensity?: number,
    trigger?: string
  ): void {
    // Determine mutation type based on event type and intensity changes
    let mutationType: 'strengthened' | 'weakened' | 'created' | 'abandoned';
    const eventTypeStr = eventType as string;
    if (eventTypeStr === 'interest:created') {
      mutationType = 'created';
    } else if (eventTypeStr === 'interest:abandoned') {
      mutationType = 'abandoned';
    } else if ((oldIntensity || 0) < interest.intensity) {
      mutationType = 'strengthened';
    } else {
      mutationType = 'weakened';
    }

    // Map InterestSource to event source type
    const mapSource = (src: string): 'conversation' | 'experience' | 'reflection' | 'hearsay' => {
      switch (src) {
        case 'conversation':
        case 'hearsay':
        case 'reflection':
          return src;
        case 'skill':
        case 'innate':
        case 'book':
        default:
          return 'experience';
      }
    };

    // Extract influencer ID from trigger if it's an agent ID (not an event type)
    let influencerId: string | undefined;
    if (trigger) {
      // If trigger looks like an entity ID (UUID format), use it as influencer
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(trigger)) {
        influencerId = trigger;
      }
      // If trigger starts with "skill:", it's not an influencer
      // If trigger is an event type like "agent:death", it's not an influencer
    }

    // Emit typed event
    this.events.emit('interest:mutated', {
      agentId: agent.id,
      topic: interest.topic,
      oldStrength: oldIntensity || 0,
      newStrength: interest.intensity,
      mutationType,
      source: mapSource(interest.source),
      influencerId,
    }, agent.id);
  }

  /**
   * Find agents affected by an event
   */
  private findAffectedAgents(event: GameEvent, world: World): EntityImpl[] {
    // For now, just return the source agent
    // In future, could check proximity, relationships, etc.
    const source = world.getEntity(event.source);
    if (!source || !(source instanceof EntityImpl)) return [];

    // For death events, could include witnesses
    // For miracle events, could include all nearby agents
    // etc.

    return [source];
  }
}
