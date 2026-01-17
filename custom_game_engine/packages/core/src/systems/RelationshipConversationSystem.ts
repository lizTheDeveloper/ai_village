/**
 * RelationshipConversationSystem
 *
 * Deep Conversation System - Phase 6: Emergent Social Dynamics
 *
 * Updates relationships based on conversation quality:
 * - Builds familiarity, affinity, and trust through conversations
 * - Records known enthusiasts for topics
 * - Helps agents learn about each other's interests
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { SystemId, ComponentType, EntityId } from '../types.js';
import type { GameEvent } from '../events/GameEvent.js';
import type { RelationshipComponent } from '../components/RelationshipComponent.js';
import type { InterestsComponent } from '../components/InterestsComponent.js';
import type { SocialMemoryComponent } from '../components/SocialMemoryComponent.js';
import type { ConversationQuality } from '../conversation/ConversationQuality.js';
import type { TopicId } from '../components/InterestsComponent.js';

export class RelationshipConversationSystem implements System {
  public readonly id: SystemId = 'relationship_conversation';
  public readonly priority: number = 16; // After CommunicationSystem (15)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private world: World | null = null;

  init(world: World): void {
    this.world = world;

    // Listen for conversation:ended events - properly typed via EventMap
    world.eventBus.on<'conversation:ended'>('conversation:ended', (event) => {
      this.handleConversationEnded(event.data);
    });
  }

  update(_world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // This system is event-driven, no per-tick updates needed
  }

  /**
   * Handle conversation:ended events using EventMap-typed data.
   * EventMap defines: conversationId, participants, duration, agent1?, agent2?, topics?, depth?, messageCount?, quality?
   */
  private handleConversationEnded(data: GameEvent<'conversation:ended'>['data']): void {
    if (!this.world) return;

    // EventMap has agent1? and agent2? as optional EntityId
    if (!data.agent1 || !data.agent2) {
      console.warn('[RelationshipConversationSystem] Conversation ended without agent1/agent2:', data);
      return;
    }

    const agent1Id: EntityId = data.agent1;
    const agent2Id: EntityId = data.agent2;

    // EventMap has topics?: string[], but we treat them as TopicId (string union).
    // This is safe because ConversationSystem emits TopicId values, but EventMap uses string[] for flexibility.
    const topics: TopicId[] = (data.topics ?? []) as TopicId[];
    const qualityScore = data.quality ?? 0.5;
    const depth = data.depth ?? 0.5;

    const entity1 = this.world.getEntity(agent1Id);
    const entity2 = this.world.getEntity(agent2Id);

    if (!entity1 || !entity2) return;

    // Construct a ConversationQuality-like object from event data
    const quality: ConversationQuality = {
      depth,
      // Topic resonance scales with quality: low quality (0.2) → 0.36, high quality (0.8) → 0.84
      topicResonance: topics.length > 0 ? qualityScore * 0.8 + 0.2 : 0.3,
      informationExchange: qualityScore > 0.6 ? 0.7 : 0.4,
      emotionalConnection: qualityScore > 0.7 ? 0.8 : 0.5,
      durationFactor: 0.7,
      topicsDiscussed: topics,
      overallQuality: qualityScore,
    };

    // Cast Entity → EntityImpl: World.getEntity() returns public Entity interface,
    // but internal methods require EntityImpl for component mutation access.
    // This is safe because World stores EntityImpl instances.
    const entityImpl1 = entity1 as EntityImpl;
    const entityImpl2 = entity2 as EntityImpl;

    // Update relationships bidirectionally
    this.updateRelationship(entityImpl1, entityImpl2, quality);
    this.updateRelationship(entityImpl2, entityImpl1, quality);

    // Record known enthusiasts for discussed topics
    this.recordEnthusiasts(entityImpl1, entityImpl2, topics, quality);
    this.recordEnthusiasts(entityImpl2, entityImpl1, topics, quality);

    // Learn about partner's interests
    this.learnInterests(entityImpl1, entityImpl2, topics);
    this.learnInterests(entityImpl2, entityImpl1, topics);
  }

  private updateRelationship(
    self: EntityImpl,
    partner: EntityImpl,
    quality: ConversationQuality
  ): void {
    const relationshipComp = self.getComponent<RelationshipComponent>(CT.Relationship);
    if (!relationshipComp) return;

    let relationship = relationshipComp.relationships.get(partner.id);

    if (!relationship) {
      // Create new relationship
      relationship = {
        targetId: partner.id,
        familiarity: 0,
        affinity: 0,
        trust: 50,
        lastInteraction: this.world!.tick,
        interactionCount: 0,
        sharedMemories: 0,
        sharedMeals: 0,
        perceivedSkills: [],
      };
      relationshipComp.relationships.set(partner.id, relationship);
    }

    // Update based on conversation quality
    relationship.lastInteraction = this.world!.tick;
    relationship.interactionCount++;

    // Familiarity always increases
    const familiarityGain = 2 + quality.overallQuality * 3;
    relationship.familiarity = Math.min(100, relationship.familiarity + familiarityGain);

    // Affinity increases with good conversations
    if (quality.overallQuality > 0.5) {
      const affinityGain = (quality.overallQuality - 0.3) * 5;
      relationship.affinity = Math.min(100, Math.max(-100, relationship.affinity + affinityGain));
    }

    // Trust grows with emotional connection
    if (quality.emotionalConnection > 0.5) {
      const trustGain = quality.emotionalConnection * 3;
      relationship.trust = Math.min(100, relationship.trust + trustGain);
    }

    // Shared information counts as shared memories
    if (quality.informationExchange > 0.3) {
      relationship.sharedMemories++;
    }
  }

  private recordEnthusiasts(
    self: EntityImpl,
    partner: EntityImpl,
    topics: TopicId[],
    quality: ConversationQuality
  ): void {
    const interests = self.getComponent<InterestsComponent>(CT.Interests);
    if (!interests) return;

    // Only record if conversation was good
    if (quality.topicResonance < 0.4) return;

    for (const interest of interests.interests) {
      if (topics.includes(interest.topic)) {
        // This person is good to talk to about this topic
        if (!interest.knownEnthusiasts.includes(partner.id)) {
          interest.knownEnthusiasts.push(partner.id);

          // Limit to prevent unbounded growth
          if (interest.knownEnthusiasts.length > 5) {
            interest.knownEnthusiasts.shift();
          }
        }
      }
    }
  }

  private learnInterests(
    learner: EntityImpl,
    teacher: EntityImpl,
    topicsDiscussed: TopicId[]
  ): void {
    const socialMemory = learner.getComponent<SocialMemoryComponent>(CT.SocialMemory);
    if (!socialMemory) return;

    // Type guard: Check if component has proper internal structure
    // After deserialization, the private _socialMemories Map might not exist
    if (!this.hasSocialMemoriesMap(socialMemory)) {
      console.warn(
        `[RelationshipConversationSystem] SocialMemoryComponent for ${learner.id} missing internal Map (deserialization issue)`
      );
      return;
    }

    // Check existing memory to avoid duplicates
    const existingMemory = socialMemory.socialMemories?.get(teacher.id);
    const existingFacts = existingMemory?.knownFacts ?? [];

    // Add known facts about partner's interests
    for (const topic of topicsDiscussed) {
      // Don't duplicate facts
      const alreadyKnown = existingFacts.some(f => f.fact === `interested in ${topic}`);

      if (!alreadyKnown) {
        // Check if method exists (can be lost during deserialization)
        if (typeof socialMemory.learnAboutAgent === 'function') {
          socialMemory.learnAboutAgent({
            agentId: teacher.id,
            fact: `interested in ${topic}`,
            confidence: 0.7,
            source: 'conversation',
          });
        } else {
          console.warn(
            `[RelationshipConversationSystem] SocialMemoryComponent for ${learner.id} missing learnAboutAgent method (deserialization issue)`
          );
        }
      }
    }
  }

  /**
   * Type guard: Check if SocialMemoryComponent has valid internal structure.
   * After deserialization, class methods and private fields may be lost.
   */
  private hasSocialMemoriesMap(component: SocialMemoryComponent): boolean {
    // Check if the component has the internal _socialMemories Map
    // We use 'in' operator to check property existence without type casting
    return '_socialMemories' in component && component['_socialMemories' as keyof typeof component] instanceof Map;
  }
}
