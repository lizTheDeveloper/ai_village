/**
 * InterestsSystem - Manages discussion hunger and interest dynamics over time
 *
 * This system handles the accumulation of desire to discuss topics:
 * - Discussion hunger grows over time since last discussed a topic
 * - Depth hunger grows when agents only have shallow interactions
 * - Topics discussed in conversations reduce hunger
 * - High-intensity interests accumulate hunger faster
 *
 * Part of Phase 1: Deep Conversation System
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { InterestsComponent, TopicId } from '../components/InterestsComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';

/**
 * InterestsSystem manages discussion hunger accumulation and decay.
 */
export class InterestsSystem implements System {
  public readonly id: SystemId = CT.Interests;
  public readonly priority: number = 46; // After basic needs, before mood
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Agent, CT.Interests];

  private isInitialized = false;
  private eventBus: EventBus | null = null;
  private world: World | null = null;

  /** How often to update interest hunger (in ticks) - every 2 game hours (100 ticks at 20 tps) */
  private readonly UPDATE_INTERVAL = 100;

  /** Tick counter for update intervals */
  private tickCount = 0;

  /** Base rate of hunger growth per update cycle (0-1 scale) */
  private readonly BASE_HUNGER_GROWTH = 0.02;

  /** Base rate of depth hunger growth per update cycle */
  private readonly BASE_DEPTH_HUNGER_GROWTH = 0.01;

  /** How much a good conversation satisfies a topic */
  private readonly TOPIC_SATISFACTION = 0.6;

  /** How much a deep conversation satisfies depth hunger */
  private readonly DEPTH_SATISFACTION = 0.5;

  /**
   * Initialize the system.
   */
  public initialize(world: World, eventBus: EventBus): void {
    if (this.isInitialized) {
      return;
    }

    this.world = world;
    this.eventBus = eventBus;

    // Subscribe to conversation events
    this.setupEventListeners(eventBus);

    this.isInitialized = true;
  }

  /**
   * Set up event listeners for conversation-related events.
   */
  private setupEventListeners(eventBus: EventBus): void {
    // When a conversation ends, check if it satisfied any interests
    eventBus.subscribe('conversation:ended', (event) => {
      const data = event.data as {
        participants: string[];
        messageCount?: number;
        topics?: TopicId[];
        depth?: number;
      };

      // Satisfy interests for all participants
      for (const agentId of data.participants) {
        this.handleConversationEnd(agentId, data.topics || [], data.depth || 0);
      }
    });

    // When an agent shares a topic they care about
    eventBus.subscribe('conversation:topic_shared', (event) => {
      const data = event.data as {
        speakerId: string;
        listenerId: string;
        topic: TopicId;
      };

      this.handleTopicShared(data.speakerId, data.listenerId, data.topic);
    });
  }

  /**
   * Handle end of conversation - satisfy discussed topics.
   */
  private handleConversationEnd(
    agentId: string,
    topics: TopicId[],
    depth: number
  ): void {
    if (!this.world) return;

    const entity = this.world.getEntity(agentId);
    if (!entity) return;

    const impl = entity as EntityImpl;
    const interests = impl.getComponent<InterestsComponent>(CT.Interests);
    if (!interests) return;

    const tick = this.world.tick;

    // Satisfy any topics that were discussed
    for (const topic of topics) {
      if (interests.hasInterest(topic)) {
        try {
          interests.satisfyTopic(topic, tick, this.TOPIC_SATISFACTION);
        } catch {
          // Topic not found, skip
        }
      }
    }

    // Satisfy depth hunger based on conversation depth
    if (depth > 0.5) {
      const depthSatisfaction = depth * this.DEPTH_SATISFACTION;
      interests.satisfyDepthHunger(depthSatisfaction);
    }
  }

  /**
   * Handle when someone shares a topic the listener cares about.
   * The listener learns that the speaker is an enthusiast.
   */
  private handleTopicShared(
    speakerId: string,
    listenerId: string,
    topic: TopicId
  ): void {
    if (!this.world) return;

    const listener = this.world.getEntity(listenerId);
    if (!listener) return;

    const impl = listener as EntityImpl;
    const interests = impl.getComponent<InterestsComponent>(CT.Interests);
    if (!interests) return;

    // If the listener has this interest, remember the speaker as an enthusiast
    if (interests.hasInterest(topic)) {
      try {
        interests.addKnownEnthusiast(topic, speakerId);
      } catch {
        // Topic not found, skip
      }
    }
  }

  /**
   * Main update loop.
   */
  public update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    this.tickCount++;

    // Only update at intervals for performance
    if (this.tickCount % this.UPDATE_INTERVAL !== 0) {
      return;
    }

    // Use SimulationScheduler to only process active entities
    const activeEntities = world.simulationScheduler.filterActiveEntities(entities, world.tick);

    for (const entity of activeEntities) {
      this.updateAgentInterests(entity as EntityImpl, world);
    }
  }

  /**
   * Update interest hunger for an agent based on time passed.
   */
  private updateAgentInterests(entity: EntityImpl, world: World): void {
    const interests = entity.getComponent<InterestsComponent>(CT.Interests);
    if (!interests) return;

    const personality = entity.getComponent<PersonalityComponent>(CT.Personality);
    const tick = world.tick;

    // Calculate personality modifiers
    const opennessModifier = personality ? 1 + (personality.openness - 0.5) * 0.5 : 1;
    const extraversionModifier = personality ? 1 + (personality.extraversion - 0.5) * 0.3 : 1;

    // Update hunger for each interest
    for (const interest of interests.interests) {
      // Calculate time since last discussed
      const ticksSinceDiscussed = interest.lastDiscussed !== null
        ? tick - interest.lastDiscussed
        : tick; // Never discussed = full duration

      // Hunger grows based on intensity and time
      // Higher intensity interests accumulate hunger faster
      const hungerGrowth = this.BASE_HUNGER_GROWTH * interest.intensity * opennessModifier;

      // Only grow if we haven't discussed recently (within last 1000 ticks)
      if (ticksSinceDiscussed > 500) {
        const newHunger = Math.min(1, interest.discussionHunger + hungerGrowth);
        if (newHunger !== interest.discussionHunger) {
          interest.discussionHunger = newHunger;
        }
      }
    }

    // Update depth hunger (grows for everyone, faster for open/extraverted)
    const depthGrowth = this.BASE_DEPTH_HUNGER_GROWTH * opennessModifier * extraversionModifier;
    const newDepthHunger = Math.min(1, interests.depthHunger + depthGrowth);
    if (newDepthHunger !== interests.depthHunger) {
      interests.depthHunger = newDepthHunger;
    }

    // Emit event if an interest is very hungry
    const hungryInterests = interests.getHungryInterests(0.8);
    if (hungryInterests.length > 0) {
      this.eventBus?.emit({
        type: 'interest:hungry',
        source: entity.id,
        data: {
          agentId: entity.id,
          topics: hungryInterests.map(i => i.topic),
          depthHunger: interests.depthHunger,
        },
      });
    }
  }

  /**
   * Get interest context for an agent (for LLM prompt building).
   */
  public getInterestContext(entity: EntityImpl): string {
    const interests = entity.getComponent<InterestsComponent>(CT.Interests);
    if (!interests || interests.interests.length === 0) {
      return '';
    }

    const parts: string[] = [];

    // Top interests
    const topInterests = interests.getTopInterests(3);
    if (topInterests.length > 0) {
      const interestDescriptions = topInterests.map(i => {
        const intensity = i.intensity > 0.7 ? 'passionate about' :
          i.intensity > 0.4 ? 'interested in' : 'curious about';
        return `${intensity} ${i.topic.replace(/_/g, ' ')}`;
      });
      parts.push(`Interests: ${interestDescriptions.join(', ')}`);
    }

    // Hungry interests (want to discuss)
    const hungryInterests = interests.getHungryInterests(0.6);
    if (hungryInterests.length > 0) {
      const hungryTopics = hungryInterests.slice(0, 2).map(i => i.topic.replace(/_/g, ' '));
      parts.push(`Wants to discuss: ${hungryTopics.join(', ')}`);
    }

    // Depth hunger
    if (interests.depthHunger > 0.6) {
      parts.push('Craving a meaningful conversation');
    }

    // Avoid topics
    if (interests.avoidTopics.length > 0) {
      parts.push(`Avoids talking about: ${interests.avoidTopics.join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Find good conversation partners based on shared interests.
   * Returns agent IDs sorted by compatibility.
   */
  public findInterestingPartners(
    entity: EntityImpl,
    _candidates: ReadonlyArray<Entity>
  ): string[] {
    const interests = entity.getComponent<InterestsComponent>(CT.Interests);
    if (!interests) return [];

    // Collect all known enthusiasts across all interests
    const enthusiastScores = new Map<string, number>();

    for (const interest of interests.interests) {
      // Score each enthusiast based on interest intensity and hunger
      const score = interest.intensity * (1 + interest.discussionHunger);
      for (const enthusiastId of interest.knownEnthusiasts) {
        enthusiastScores.set(
          enthusiastId,
          (enthusiastScores.get(enthusiastId) || 0) + score
        );
      }
    }

    // Sort by score and return top partners
    return Array.from(enthusiastScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }
}
