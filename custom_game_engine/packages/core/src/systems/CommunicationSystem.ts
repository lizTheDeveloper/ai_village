import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ConversationComponent } from '../components/ConversationComponent.js';
import { isInConversation, endConversation, joinConversation } from '../components/ConversationComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { CircadianComponent } from '../components/CircadianComponent.js';
import { updateCompositeSocial } from '../components/NeedsComponent.js';
import type { InterestsComponent } from '../components/InterestsComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
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

  // Satisfaction amounts for quality-based social need updates
  private static readonly CONTACT_SATISFACTION = 0.3; // Any conversation satisfies contact need
  private static readonly DEPTH_SATISFACTION_MULTIPLIER = 0.4; // Quality-weighted depth satisfaction
  private static readonly BELONGING_SATISFACTION = 0.15; // Group activity satisfaction
  private static readonly TOPIC_SATISFACTION = 0.7; // Satisfaction for discussing a topic

  // Personality-based conversation joining
  private static readonly MIN_JOIN_RADIUS = 20; // Introverted agents (extraversion = 0) join from 20 tiles
  private static readonly MAX_JOIN_RADIUS = 30; // Extraverted agents (extraversion = 1) join from 30 tiles

  update(_world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // First pass: Check for agents who might want to join conversations based on personality
    for (const entity of entities) {
      const impl = entity as EntityImpl;

      // Skip sleeping agents - they can't join conversations
      const circadian = impl.getComponent<CircadianComponent>(CT.Circadian);
      if (circadian?.isSleeping) continue;

      const conversation = impl.getComponent<ConversationComponent>(CT.Conversation);

      // Skip agents already in conversations
      if (conversation && isInConversation(conversation)) continue;

      // Try to join nearby conversations based on personality
      this.tryJoinNearbyConversation(impl, _world);
    }

    // Second pass: Manage active conversations
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const conversation = impl.getComponent<ConversationComponent>(CT.Conversation);

      if (!conversation || !isInConversation(conversation)) continue;

      const partnerId = conversation.partnerId;
      if (!partnerId) continue;

      // Check if partner still exists
      const partner = _world.getEntity(partnerId);
      if (!partner) {
        // Partner no longer exists, end conversation
        this.endConversationForEntity(impl, null, _world, 0);
        continue;
      }

      // Conversations now continue indefinitely until agents explicitly leave via tool call
      // or partner is removed from the world
    }
  }

  /**
   * Try to join a nearby conversation based on personality and heard speech.
   * Extraverted agents will join from farther away than introverted agents.
   */
  private tryJoinNearbyConversation(entity: EntityImpl, world: World): void {
    const personality = entity.getComponent<PersonalityComponent>(CT.Personality);
    const position = entity.getComponent<PositionComponent>(CT.Position);
    const vision = entity.getComponent<VisionComponent>(CT.Vision);

    if (!personality || !position || !vision || !vision.heardSpeech) return;

    // Calculate join radius based on extraversion (0-1.0 scale)
    const extraversion = personality.extraversion ?? 0.5; // Default to moderate if missing
    const joinRadius = CommunicationSystem.MIN_JOIN_RADIUS +
      (extraversion * (CommunicationSystem.MAX_JOIN_RADIUS - CommunicationSystem.MIN_JOIN_RADIUS));

    // Check each heard speech to see if speaker is within join radius
    for (const heardSpeech of vision.heardSpeech) {
      const speaker = world.getEntity(heardSpeech.speaker);
      if (!speaker) continue;

      const speakerPosition = (speaker as EntityImpl).getComponent<PositionComponent>(CT.Position);
      if (!speakerPosition) continue;

      // Calculate distance to speaker
      const dx = speakerPosition.x - position.x;
      const dy = speakerPosition.y - position.y;
      const distanceSquared = dx * dx + dy * dy;
      const joinRadiusSquared = joinRadius * joinRadius;

      // If speaker is within join radius, try to join their conversation
      if (distanceSquared <= joinRadiusSquared) {
        const speakerConversation = (speaker as EntityImpl).getComponent<ConversationComponent>(CT.Conversation);

        // Only join if speaker is actually in an active conversation
        if (speakerConversation && isInConversation(speakerConversation)) {
          this.joinExistingConversation(entity, speaker as EntityImpl, world);
          break; // Join only one conversation at a time
        }
      }
    }
  }

  /**
   * Join an agent to an existing conversation.
   */
  private joinExistingConversation(
    joiner: EntityImpl,
    conversationMember: EntityImpl,
    world: World
  ): void {
    const memberConversation = conversationMember.getComponent<ConversationComponent>(CT.Conversation);
    if (!memberConversation || !isInConversation(memberConversation)) return;

    // Update joiner's conversation component to join
    joiner.updateComponent<ConversationComponent>(CT.Conversation, (current) =>
      joinConversation(current, joiner.id)
    );

    // Update all existing participants to include the new joiner
    const participantIds = memberConversation.participantIds.length > 0
      ? memberConversation.participantIds
      : (memberConversation.partnerId ? [memberConversation.partnerId] : []);

    for (const participantId of participantIds) {
      const participant = world.getEntity(participantId);
      if (!participant) continue;

      (participant as EntityImpl).updateComponent<ConversationComponent>(CT.Conversation, (current) =>
        joinConversation(current, joiner.id)
      );
    }

    // Emit event
    world.eventBus.emit({
      type: 'conversation:joined',
      source: joiner.id,
      data: {
        conversationId: `conv-${memberConversation.partnerId || participantIds[0]}`,
        joinerId: joiner.id,
        participants: [...participantIds, joiner.id],
      },
    });
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
