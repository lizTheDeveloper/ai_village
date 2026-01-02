import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ConversationComponent } from '../components/ConversationComponent.js';
import { isInConversation, endConversation } from '../components/ConversationComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import { updateCompositeSocial } from '../components/NeedsComponent.js';
import type { InterestsComponent } from '../components/InterestsComponent.js';
import {
  calculateConversationQuality,
  type ConversationQuality,
} from '../conversation/ConversationQuality.js';

export class CommunicationSystem implements System {
  public readonly id: SystemId = 'communication';
  public readonly priority: number = 15; // Run after AI (10), before movement (20)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Conversation,
  ];

  private readonly maxConversationDurationSeconds: number = 15; // 15 seconds of conversation
  private conversationStartTimes: Map<string, number> = new Map(); // entityId -> real-time start

  // Satisfaction amounts for quality-based social need updates
  private static readonly CONTACT_SATISFACTION = 0.3; // Any conversation satisfies contact need
  private static readonly DEPTH_SATISFACTION_MULTIPLIER = 0.4; // Quality-weighted depth satisfaction
  private static readonly BELONGING_SATISFACTION = 0.15; // Group activity satisfaction
  private static readonly TOPIC_SATISFACTION = 0.7; // Satisfaction for discussing a topic

  update(_world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const conversation = impl.getComponent<ConversationComponent>(CT.Conversation);

      if (!conversation || !isInConversation(conversation)) continue;

      const partnerId = conversation.partnerId;
      if (!partnerId) continue;

      // Check if partner still exists and is nearby
      const partner = _world.getEntity(partnerId);
      if (!partner) {
        // Partner no longer exists, end conversation
        this.endConversationForEntity(impl, null, _world, 0);
        continue;
      }

      // Track conversation time in real seconds, not ticks
      if (!this.conversationStartTimes.has(entity.id)) {
        this.conversationStartTimes.set(entity.id, Date.now());
      }

      const startTime = this.conversationStartTimes.get(entity.id)!;
      const durationSeconds = (Date.now() - startTime) / 1000;

      if (durationSeconds > this.maxConversationDurationSeconds) {
        // Conversation has gone on too long, end it with quality calculation
        const partnerImpl = partner as EntityImpl;
        const partnerConversation = partnerImpl.getComponent<ConversationComponent>(CT.Conversation);

        // Calculate conversation quality before ending
        const quality = this.calculateQuality(impl, partnerImpl, conversation);

        // End conversations for both parties
        this.endConversationForEntity(impl, partnerImpl, _world, durationSeconds, quality);

        if (partnerConversation) {
          partnerImpl.updateComponent<ConversationComponent>(CT.Conversation, endConversation);
          this.conversationStartTimes.delete(partnerId);
        }

        // Switch both agents back to wandering
        this.switchToWandering(impl);
        this.switchToWandering(partnerImpl);

        // Apply satisfaction based on quality
        this.applySatisfaction(impl, quality);
        this.applySatisfaction(partnerImpl, quality);

        // Update topic satisfaction for both participants
        this.updateTopicSatisfaction(impl, quality, _world);
        this.updateTopicSatisfaction(partnerImpl, quality, _world);

        // Emit enhanced conversation ended event
        _world.eventBus.emit({
          type: 'conversation:ended',
          source: entity.id,
          data: {
            conversationId: `conv-${entity.id}-${partnerId}`,
            participants: [entity.id, partnerId],
            agent1: entity.id,
            agent2: partnerId,
            duration: durationSeconds,
            topics: quality.topicsDiscussed,
            depth: quality.depth,
            messageCount: conversation.messages.length,
            quality: quality.overallQuality,
          },
        });
      }
    }
  }

  /**
   * Calculate conversation quality based on messages and participant interests.
   */
  private calculateQuality(
    entity1: EntityImpl,
    entity2: EntityImpl,
    conversation: ConversationComponent
  ): ConversationQuality {
    const interests1 = entity1.getComponent<InterestsComponent>(CT.Interests);
    const interests2 = entity2.getComponent<InterestsComponent>(CT.Interests);

    const durationTicks = conversation.messages.length > 0
      ? (conversation.messages[conversation.messages.length - 1]?.tick ?? 0) - conversation.startedAt
      : 0;

    return calculateConversationQuality(
      conversation.messages,
      interests1?.interests ?? [],
      interests2?.interests ?? [],
      durationTicks
    );
  }

  /**
   * End conversation for an entity and clean up state.
   */
  private endConversationForEntity(
    entity: EntityImpl,
    partner: EntityImpl | null,
    world: World,
    durationSeconds: number,
    quality?: ConversationQuality
  ): void {
    const conversation = entity.getComponent<ConversationComponent>(CT.Conversation);
    const partnerId = conversation?.partnerId;

    entity.updateComponent<ConversationComponent>(CT.Conversation, endConversation);
    this.conversationStartTimes.delete(entity.id);

    // Switch agent back to wandering
    this.switchToWandering(entity);

    // If no partner or quality, emit basic event
    if (!partner || !quality || !partnerId) {
      if (partnerId) {
        world.eventBus.emit({
          type: 'conversation:ended',
          source: entity.id,
          data: {
            conversationId: `conv-${entity.id}-${partnerId}`,
            participants: [entity.id, partnerId],
            agent1: entity.id,
            agent2: partnerId,
            duration: durationSeconds,
          },
        });
      }
    }
  }

  /**
   * Switch an agent back to wandering behavior.
   */
  private switchToWandering(entity: EntityImpl): void {
    const agent = entity.getComponent<AgentComponent>(CT.Agent);
    if (agent && agent.behavior === 'talk') {
      entity.updateComponent<AgentComponent>(CT.Agent, (current) => ({
        ...current,
        behavior: 'wander',
        behaviorState: {},
      }));
    }
  }

  /**
   * Apply satisfaction to an entity's needs based on conversation quality.
   */
  private applySatisfaction(entity: EntityImpl, quality: ConversationQuality): void {
    const needs = entity.getComponent<NeedsComponent>(CT.Needs);
    const interests = entity.getComponent<InterestsComponent>(CT.Interests);

    if (needs) {
      // Contact need always satisfied by any conversation
      needs.socialContact = Math.min(1.0, needs.socialContact + CommunicationSystem.CONTACT_SATISFACTION);

      // Depth satisfaction based on conversation quality
      const depthSatisfaction = quality.overallQuality * CommunicationSystem.DEPTH_SATISFACTION_MULTIPLIER;
      needs.socialDepth = Math.min(1.0, needs.socialDepth + depthSatisfaction);

      // Belonging gets a small boost from any social interaction
      needs.socialBelonging = Math.min(1.0, needs.socialBelonging + CommunicationSystem.BELONGING_SATISFACTION);

      // Update composite social score
      updateCompositeSocial(needs);
    }

    if (interests) {
      // Reduce depth hunger based on quality
      const hungerReduction = quality.overallQuality * 0.5;
      interests.depthHunger = Math.max(0, interests.depthHunger - hungerReduction);
    }
  }

  /**
   * Update topic satisfaction for discussed topics.
   */
  private updateTopicSatisfaction(
    entity: EntityImpl,
    quality: ConversationQuality,
    world: World
  ): void {
    const interests = entity.getComponent<InterestsComponent>(CT.Interests);
    if (!interests) return;

    const currentTick = world.tick;

    for (const interest of interests.interests) {
      if (quality.topicsDiscussed.includes(interest.topic)) {
        // This topic was discussed - reduce hunger based on depth
        const satisfaction = quality.depth * CommunicationSystem.TOPIC_SATISFACTION;
        interest.discussionHunger = Math.max(0, interest.discussionHunger - satisfaction);
        interest.lastDiscussed = currentTick;
      }
    }
  }
}
