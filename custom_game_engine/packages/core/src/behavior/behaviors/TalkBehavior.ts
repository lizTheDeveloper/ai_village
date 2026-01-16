/**
 * TalkBehavior - Agent conversation behavior
 *
 * Agent engages in conversation with another agent.
 * Handles:
 * - Stopping movement during conversation
 * - Updating relationships
 * - Exchanging messages
 * - Sharing memories about resource locations
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import { enableInteractionLLM } from '../../components/AgentComponent.js';
import type { ConversationComponent } from '../../components/ConversationComponent.js';
import type { RelationshipComponent } from '../../components/RelationshipComponent.js';
import type { SocialMemoryComponent } from '../../components/SocialMemoryComponent.js';
import type { IdentityComponent } from '../../components/IdentityComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { isInConversation, addMessage, startConversation } from '../../components/ConversationComponent.js';
import { updateRelationship, shareMemory } from '../../components/RelationshipComponent.js';
import { SpatialMemoryComponent, addSpatialMemory, getSpatialMemoriesByType } from '../../components/SpatialMemoryComponent.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

/** Probability of speaking each tick */
const SPEAK_CHANCE = 0.3;

/** Probability of sharing a memory each tick */
const SHARE_MEMORY_CHANCE = 0.15;

/** Sample messages for casual conversation */
const CASUAL_MESSAGES = [
  'Hello!',
  'How are you?',
  'Nice weather today.',
  'Have you seen any food around?',
  'I was just wandering.',
];

/**
 * TalkBehavior - Engage in conversation with another agent
 */
export class TalkBehavior extends BaseBehavior {
  readonly name = 'talk' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // NOTE: We do NOT disable steering - agents will stay near conversation center via "arrive" behavior

    const conversation = entity.getComponent<ConversationComponent>(ComponentType.Conversation);
    const relationship = entity.getComponent<RelationshipComponent>(ComponentType.Relationship);
    const spatialMemory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);
    const socialMemory = entity.getComponent<SocialMemoryComponent>(ComponentType.SocialMemory);
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);

    // Check if we need to start a new conversation
    // This happens when 'talk' behavior is selected via priority-based decision
    // with a partnerId in behaviorState, but conversation isn't active yet
    if (conversation && !isInConversation(conversation) && agent?.behaviorState?.partnerId) {
      let targetPartnerId = agent.behaviorState.partnerId as string;

      // Resolve 'nearest' to actual agent ID
      if (targetPartnerId === 'nearest') {
        const position = entity.components.get(ComponentType.Position) as { x: number; y: number } | undefined;
        if (position) {
          const nearbyAgents = world
            .query()
            .with(ComponentType.Agent)
            .with(ComponentType.Position)
            .with(ComponentType.Conversation)
            .executeEntities()
            .filter((other) => {
              if (other.id === entity.id) return false;
              const otherConv = other.components.get(ComponentType.Conversation) as ConversationComponent | undefined;
              return otherConv && !isInConversation(otherConv);
            });

          if (nearbyAgents.length > 0) {
            // Find closest agent
            let closest = nearbyAgents[0];
            let closestDist = Infinity;
            for (const other of nearbyAgents) {
              const otherPos = other.components.get(ComponentType.Position) as { x: number; y: number } | undefined;
              if (!otherPos) continue;
              const dist = Math.hypot(otherPos.x - position.x, otherPos.y - position.y);
              if (dist < closestDist) {
                closest = other;
                closestDist = dist;
              }
            }
            targetPartnerId = closest!.id;
          } else {
            // No available partners found - stay in current behavior, don't fall back to wander
            return { complete: true, reason: 'No available conversation partners' };
          }
        }
      }

      const partner = world.getEntity(targetPartnerId);

      if (partner) {
        const partnerConversation = partner.components.get(ComponentType.Conversation) as ConversationComponent | undefined;
        const partnerAgent = partner.components.get(ComponentType.Agent) as AgentComponent | undefined;

        // Only start if partner is available (not already talking to someone else)
        if (partnerConversation && !isInConversation(partnerConversation)) {
          // Calculate conversation center (midpoint between the two agents) for spatial stickiness
          const myPos = entity.components.get(ComponentType.Position) as { x: number; y: number } | undefined;
          const partnerPos = partner.components.get(ComponentType.Position) as { x: number; y: number } | undefined;

          let centerX: number | undefined;
          let centerY: number | undefined;

          if (myPos && partnerPos) {
            centerX = (myPos.x + partnerPos.x) / 2;
            centerY = (myPos.y + partnerPos.y) / 2;
          }

          // Start conversation for both agents with spatial center
          entity.updateComponent<ConversationComponent>(ComponentType.Conversation, (current) =>
            startConversation(current, targetPartnerId, world.tick, entity.id, centerX, centerY)
          );
          (partner as EntityImpl).updateComponent<ConversationComponent>(ComponentType.Conversation, (current) =>
            startConversation(current, entity.id, world.tick, partner.id, centerX, centerY)
          );

          // Enable interaction-triggered LLM for autonomic agents in conversation
          // This allows NPCs who normally use scripted behavior to use LLM during social interactions
          entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => {
            if (current.tier === 'autonomic') {
              return enableInteractionLLM(current, world.tick);
            }
            return current;
          });
          (partner as EntityImpl).updateComponent<AgentComponent>(ComponentType.Agent, (current) => {
            if (current.tier === 'autonomic') {
              return enableInteractionLLM(current, world.tick);
            }
            return current;
          });

          // Set up conversation partner in behaviorState - but DO NOT change behavior
          // Talk is not a mode that supersedes other modes - talking happens alongside doing things
          (partner as EntityImpl).updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
            ...current,
            // DO NOT change behavior - keep current behavior
            behaviorState: { ...current.behaviorState, conversationPartnerId: entity.id },
          }));

          // Emit conversation started event
          world.eventBus.emit({
            type: 'conversation:started',
            source: entity.id,
            data: {
              participants: [entity.id, targetPartnerId],
              initiator: entity.id,
              agent1: entity.id,
              agent2: targetPartnerId,
            },
          });

          // NOTE: We no longer emit behavior:change for partner since we don't change their behavior
          // Partner stays in their current behavior while conversation is active

          // Continue to conversation logic below
        } else {
          // Partner is busy - stay in current behavior, don't fall back to wander
          return { complete: true, reason: 'Partner unavailable for conversation' };
        }
      } else {
        // Partner doesn't exist - stay in current behavior, don't fall back to wander
        return { complete: true, reason: 'Partner not found' };
      }
    }

    // Re-fetch conversation after potentially starting it
    const activeConversation = entity.getComponent<ConversationComponent>(ComponentType.Conversation);

    if (!activeConversation || !isInConversation(activeConversation)) {
      // Not in conversation and no partner to start with - stay in current behavior
      return { complete: true, reason: 'Not in conversation' };
    }

    const partnerId = activeConversation.partnerId;
    if (!partnerId) {
      return { complete: true, reason: 'No conversation partner' };
    }

    const activePartner = world.getEntity(partnerId);
    if (!activePartner) {
      // Partner no longer exists, end conversation - stay in current behavior
      entity.updateComponent<ConversationComponent>(ComponentType.Conversation, (current) => ({
        ...current,
        isActive: false,
        partnerId: null,
      }));
      return { complete: true, reason: 'Partner no longer exists' };
    }

    // Apply spatial stickiness: steer toward conversation center instead of stopping completely
    if (activeConversation.conversationCenterX !== undefined && activeConversation.conversationCenterY !== undefined) {
      entity.updateComponent(ComponentType.Steering, (current: any) => ({
        ...current,
        behavior: 'arrive',
        target: {
          x: activeConversation.conversationCenterX,
          y: activeConversation.conversationCenterY,
        },
        arrivalRadius: 8, // Allow agents to move around within ~8 tiles of center
      }));
    } else {
      // No conversation center set, stop moving (fallback for old conversations)
      this.stopMovement(entity);
    }

    // Update relationship (get to know each other better)
    if (relationship) {
      entity.updateComponent<RelationshipComponent>(ComponentType.Relationship, (current) =>
        updateRelationship(current, partnerId, world.tick, 2)
      );
    }

    // Update social memory (record this interaction for both parties)
    if (socialMemory) {
      const partnerIdentity = activePartner.components.get(ComponentType.Identity) as IdentityComponent | undefined;
      const partnerName = partnerIdentity?.name || 'someone';

      socialMemory.recordInteraction({
        agentId: partnerId,
        interactionType: 'conversation',
        sentiment: 0.2, // Neutral-positive for casual conversation
        timestamp: world.tick,
        trustDelta: 0.02, // Small trust increase from conversation
        impression: `Had a conversation with ${partnerName}`,
      });
    }

    // Also record for partner
    const partnerSocialMemory = activePartner.components.get(ComponentType.SocialMemory) as SocialMemoryComponent | undefined;
    if (partnerSocialMemory) {
      const myIdentity = entity.getComponent<IdentityComponent>(ComponentType.Identity);
      const myName = myIdentity?.name || 'someone';

      partnerSocialMemory.recordInteraction({
        agentId: entity.id,
        interactionType: 'conversation',
        sentiment: 0.2,
        timestamp: world.tick,
        trustDelta: 0.02,
        impression: `Had a conversation with ${myName}`,
      });
    }

    // Chance to speak
    if (Math.random() < SPEAK_CHANCE) {
      this.speak(entity, activePartner as EntityImpl, activeConversation, world);
    }

    // Chance to share a memory about food location
    if (Math.random() < SHARE_MEMORY_CHANCE && spatialMemory && relationship) {
      this.shareResourceMemory(entity, activePartner as EntityImpl, spatialMemory, relationship, world, partnerId);
    }

    // Chance to share a named landmark
    if (Math.random() < SHARE_MEMORY_CHANCE && spatialMemory && relationship) {
      this.shareLandmarkName(entity, activePartner as EntityImpl, spatialMemory, world, partnerId);
    }
  }

  private speak(
    entity: EntityImpl,
    partner: EntityImpl,
    conversation: ConversationComponent,
    world: World
  ): void {
    const message = CASUAL_MESSAGES[Math.floor(Math.random() * CASUAL_MESSAGES.length)] || 'Hello!';

    entity.updateComponent<ConversationComponent>(ComponentType.Conversation, (current) =>
      addMessage(current, entity.id, message, world.tick)
    );

    // Partner also adds conversation to their component
    partner.updateComponent<ConversationComponent>(ComponentType.Conversation, (current) =>
      addMessage(current, entity.id, message, world.tick)
    );

    // Emit conversation:utterance event for episodic memory formation
    world.eventBus.emit({
      type: 'conversation:utterance',
      source: entity.id,
      data: {
        conversationId: `${entity.id}-${conversation.partnerId}`,
        speaker: entity.id,
        speakerId: entity.id,
        listenerId: conversation.partnerId ?? undefined,
        message: message,
      },
    });
  }

  private shareResourceMemory(
    entity: EntityImpl,
    partner: EntityImpl,
    spatialMemory: SpatialMemoryComponent,
    _relationship: RelationshipComponent,
    world: World,
    partnerId: string
  ): void {
    const foodMemories = getSpatialMemoriesByType(spatialMemory, 'resource_location').filter(
      (m) => m.metadata?.resourceType === 'food' && m.strength > 50
    );

    if (foodMemories.length === 0) {
      return;
    }

    const sharedMemory = foodMemories[0];
    if (!sharedMemory) return;

    // Add this memory to partner's spatial memory
    const partnerSpatialMemory = partner.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);

    if (partnerSpatialMemory) {
      addSpatialMemory(
        partnerSpatialMemory,
        {
          type: 'resource_location',
          x: sharedMemory.x,
          y: sharedMemory.y,
          entityId: sharedMemory.entityId,
          metadata: sharedMemory.metadata,
        },
        world.tick,
        70 // Shared memories start with less strength
      );

      // Track that information was shared
      entity.updateComponent<RelationshipComponent>(ComponentType.Relationship, (current) =>
        shareMemory(current, partnerId)
      );

      // Emit information shared event
      world.eventBus.emit({
        type: 'information:shared',
        source: entity.id,
        data: {
          from: entity.id,
          to: partnerId,
          informationType: 'resource_location',
          content: { x: sharedMemory.x, y: sharedMemory.y, entityId: sharedMemory.entityId },
          memoryType: 'resource_location',
        },
      });
    }
  }

  private shareLandmarkName(
    entity: EntityImpl,
    partner: EntityImpl,
    spatialMemory: SpatialMemoryComponent,
    world: World,
    partnerId: string
  ): void {
    // Find named landmarks in agent's spatial memory
    const landmarkMemories = getSpatialMemoriesByType(spatialMemory, 'terrain_landmark').filter(
      (m) => m.metadata?.name && m.metadata?.namedBy && m.strength > 60
    );

    if (landmarkMemories.length === 0) {
      return;
    }

    const sharedLandmark = landmarkMemories[0];
    if (!sharedLandmark || !sharedLandmark.metadata?.name) return;

    const landmarkName = sharedLandmark.metadata.name as string;
    const featureType = sharedLandmark.metadata.featureType || 'place';

    // Add this named landmark to partner's spatial memory
    const partnerSpatialMemory = partner.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);

    if (partnerSpatialMemory) {
      addSpatialMemory(
        partnerSpatialMemory,
        {
          type: 'terrain_landmark',
          x: sharedLandmark.x,
          y: sharedLandmark.y,
          metadata: {
            ...sharedLandmark.metadata,
            learnedFrom: entity.id, // Track who taught them this name
          },
        },
        world.tick,
        75 // Named landmarks are important knowledge
      );

      // Add to partner's episodic memory
      const partnerMemory = partner.getComponent(ComponentType.Memory);
      const myIdentity = entity.getComponent<IdentityComponent>(ComponentType.Identity);
      const myName = myIdentity?.name || 'someone';

      if (partnerMemory && 'addMemory' in partnerMemory) {
        (partnerMemory as any).addMemory({
          id: `learned_landmark_${landmarkName}_${world.tick}`,
          type: 'knowledge',
          content: `${myName} told me about ${featureType} called "${landmarkName}"`,
          createdAt: world.tick,
          importance: 70,
        });
      }

      // Emit information shared event
      world.eventBus.emit({
        type: 'information:shared',
        source: entity.id,
        data: {
          from: entity.id,
          to: partnerId,
          informationType: 'landmark_name',
          content: {
            x: sharedLandmark.x,
            y: sharedLandmark.y,
            name: landmarkName,
            featureType,
          },
          memoryType: 'terrain_landmark',
        },
      });
    }
  }
}

/**
 * Standalone function for use with BehaviorRegistry (legacy).
 * @deprecated Use talkBehaviorWithContext for new code
 */
export function talkBehavior(entity: EntityImpl, world: World): void {
  const behavior = new TalkBehavior();
  behavior.execute(entity, world);
}

// ============================================================================
// Modern BehaviorContext Version
// ============================================================================

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('talk', talkBehaviorWithContext);
 */
export function talkBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  const conversation = ctx.getComponent<ConversationComponent>(CT.Conversation);
  const relationship = ctx.getComponent<RelationshipComponent>(CT.Relationship);
  const spatialMemory = ctx.getComponent<SpatialMemoryComponent>(CT.SpatialMemory);
  const socialMemory = ctx.getComponent<SocialMemoryComponent>(CT.SocialMemory);

  // Check if we need to start a new conversation
  if (conversation && !isInConversation(conversation) && ctx.agent.behaviorState?.partnerId) {
    let targetPartnerId = ctx.agent.behaviorState.partnerId as string;

    // Resolve 'nearest' to actual agent ID
    if (targetPartnerId === 'nearest') {
      const nearbyAgents = ctx.getEntitiesInRadius(50, [CT.Agent, CT.Conversation], {
        filter: (other) => {
          if (other.id === ctx.entity.id) return false;
          const otherConv = (other as EntityImpl).getComponent<ConversationComponent>(CT.Conversation);
          return otherConv ? !isInConversation(otherConv) : false;
        }
      });

      if (nearbyAgents.length > 0) {
        targetPartnerId = nearbyAgents[0]!.entity.id;
      } else {
        return ctx.complete('No available conversation partners');
      }
    }

    const partner = ctx.getEntity(targetPartnerId);
    if (!partner) {
      return ctx.complete('Partner not found');
    }

    const partnerImpl = partner as EntityImpl;
    const partnerConversation = partnerImpl.getComponent<ConversationComponent>(CT.Conversation);

    // Only start if partner is available
    if (partnerConversation && !isInConversation(partnerConversation)) {
      // Calculate conversation center
      const partnerPos = partnerImpl.getComponent(CT.Position) as { x: number; y: number } | undefined;
      let centerX: number | undefined;
      let centerY: number | undefined;

      if (partnerPos) {
        centerX = (ctx.position.x + partnerPos.x) / 2;
        centerY = (ctx.position.y + partnerPos.y) / 2;
      }

      // Start conversation for both agents
      ctx.updateComponent<ConversationComponent>(CT.Conversation, (current) =>
        startConversation(current, targetPartnerId, ctx.tick, ctx.entity.id, centerX, centerY)
      );
      partnerImpl.updateComponent<ConversationComponent>(CT.Conversation, (current) =>
        startConversation(current, ctx.entity.id, ctx.tick, partner.id, centerX, centerY)
      );

      // Enable interaction-triggered LLM for autonomic agents
      ctx.updateComponent<AgentComponent>(CT.Agent, (current) => {
        if (current.tier === 'autonomic') {
          return enableInteractionLLM(current, ctx.tick);
        }
        return current;
      });
      partnerImpl.updateComponent<AgentComponent>(CT.Agent, (current) => {
        if (current.tier === 'autonomic') {
          return enableInteractionLLM(current, ctx.tick);
        }
        return current;
      });

      // Set up conversation partner in behaviorState
      partnerImpl.updateComponent<AgentComponent>(CT.Agent, (current) => ({
        ...current,
        behaviorState: { ...current.behaviorState, conversationPartnerId: ctx.entity.id },
      }));

      // Emit conversation started event
      ctx.emit({
        type: 'conversation:started',
        data: {
          participants: [ctx.entity.id, targetPartnerId],
          initiator: ctx.entity.id,
          agent1: ctx.entity.id,
          agent2: targetPartnerId,
        },
      });
    } else {
      return ctx.complete('Partner unavailable for conversation');
    }
  }

  // Re-fetch conversation after potentially starting it
  const activeConversation = ctx.getComponent<ConversationComponent>(CT.Conversation);

  if (!activeConversation || !isInConversation(activeConversation)) {
    return ctx.complete('Not in conversation');
  }

  const partnerId = activeConversation.partnerId;
  if (!partnerId) {
    return ctx.complete('No conversation partner');
  }

  const activePartner = ctx.getEntity(partnerId);
  if (!activePartner) {
    // Partner no longer exists, end conversation
    ctx.updateComponent<ConversationComponent>(CT.Conversation, (current) => ({
      ...current,
      isActive: false,
      partnerId: null,
    }));
    return ctx.complete('Partner no longer exists');
  }

  // Apply spatial stickiness: steer toward conversation center
  if (activeConversation.conversationCenterX !== undefined && activeConversation.conversationCenterY !== undefined) {
    ctx.updateComponent(CT.Steering, (current: any) => ({
      ...current,
      behavior: 'arrive',
      target: {
        x: activeConversation.conversationCenterX,
        y: activeConversation.conversationCenterY,
      },
      arrivalRadius: 8,
    }));
  } else {
    // No conversation center set, stop moving
    ctx.stopMovement();
  }

  // Update relationship
  if (relationship) {
    ctx.updateComponent<RelationshipComponent>(CT.Relationship, (current) =>
      updateRelationship(current, partnerId, ctx.tick, 2)
    );
  }

  // Update social memory
  if (socialMemory) {
    const partnerIdentity = (activePartner as EntityImpl).getComponent<IdentityComponent>(CT.Identity);
    const partnerName = partnerIdentity?.name || 'someone';

    socialMemory.recordInteraction({
      agentId: partnerId,
      interactionType: 'conversation',
      sentiment: 0.2,
      timestamp: ctx.tick,
      trustDelta: 0.02,
      impression: `Had a conversation with ${partnerName}`,
    });
  }

  // Also record for partner
  const partnerSocialMemory = (activePartner as EntityImpl).getComponent<SocialMemoryComponent>(CT.SocialMemory);
  if (partnerSocialMemory) {
    const myIdentity = ctx.getComponent<IdentityComponent>(CT.Identity);
    const myName = myIdentity?.name || 'someone';

    partnerSocialMemory.recordInteraction({
      agentId: ctx.entity.id,
      interactionType: 'conversation',
      sentiment: 0.2,
      timestamp: ctx.tick,
      trustDelta: 0.02,
      impression: `Had a conversation with ${myName}`,
    });
  }

  // Chance to speak
  if (Math.random() < SPEAK_CHANCE) {
    const message = CASUAL_MESSAGES[Math.floor(Math.random() * CASUAL_MESSAGES.length)] || 'Hello!';

    ctx.updateComponent<ConversationComponent>(CT.Conversation, (current) =>
      addMessage(current, ctx.entity.id, message, ctx.tick)
    );

    // Partner also adds conversation to their component
    (activePartner as EntityImpl).updateComponent<ConversationComponent>(CT.Conversation, (current) =>
      addMessage(current, ctx.entity.id, message, ctx.tick)
    );

    // Emit conversation:utterance event
    ctx.emit({
      type: 'conversation:utterance',
      data: {
        conversationId: `${ctx.entity.id}-${partnerId}`,
        speaker: ctx.entity.id,
        speakerId: ctx.entity.id,
        listenerId: partnerId,
        message: message,
      },
    });
  }

  // Chance to share a memory about food location
  if (Math.random() < SHARE_MEMORY_CHANCE && spatialMemory && relationship) {
    const foodMemories = getSpatialMemoriesByType(spatialMemory, 'resource_location').filter(
      (m) => m.metadata?.resourceType === 'food' && m.strength > 50
    );

    if (foodMemories.length > 0) {
      const sharedMemory = foodMemories[0]!;
      const partnerSpatialMemory = (activePartner as EntityImpl).getComponent<SpatialMemoryComponent>(CT.SpatialMemory);

      if (partnerSpatialMemory) {
        addSpatialMemory(
          partnerSpatialMemory,
          {
            type: 'resource_location',
            x: sharedMemory.x,
            y: sharedMemory.y,
            entityId: sharedMemory.entityId,
            metadata: sharedMemory.metadata,
          },
          ctx.tick,
          70
        );

        ctx.updateComponent<RelationshipComponent>(CT.Relationship, (current) =>
          shareMemory(current, partnerId)
        );

        ctx.emit({
          type: 'information:shared',
          data: {
            from: ctx.entity.id,
            to: partnerId,
            informationType: 'resource_location',
            content: { x: sharedMemory.x, y: sharedMemory.y, entityId: sharedMemory.entityId },
            memoryType: 'resource_location',
          },
        });
      }
    }
  }

  // Chance to share a named landmark
  if (Math.random() < SHARE_MEMORY_CHANCE && spatialMemory && relationship) {
    const landmarkMemories = getSpatialMemoriesByType(spatialMemory, 'terrain_landmark').filter(
      (m) => m.metadata?.name && m.metadata?.namedBy && m.strength > 60
    );

    if (landmarkMemories.length > 0) {
      const sharedLandmark = landmarkMemories[0]!;
      if (sharedLandmark.metadata?.name) {
        const landmarkName = sharedLandmark.metadata.name as string;
        const featureType = sharedLandmark.metadata.featureType || 'place';
        const partnerSpatialMemory = (activePartner as EntityImpl).getComponent<SpatialMemoryComponent>(CT.SpatialMemory);

        if (partnerSpatialMemory) {
          addSpatialMemory(
            partnerSpatialMemory,
            {
              type: 'terrain_landmark',
              x: sharedLandmark.x,
              y: sharedLandmark.y,
              metadata: {
                ...sharedLandmark.metadata,
                learnedFrom: ctx.entity.id,
              },
            },
            ctx.tick,
            75
          );

          // Add to partner's episodic memory
          const partnerMemory = (activePartner as EntityImpl).getComponent(CT.Memory);
          const myIdentity = ctx.getComponent<IdentityComponent>(CT.Identity);
          const myName = myIdentity?.name || 'someone';

          if (partnerMemory && 'addMemory' in partnerMemory) {
            (partnerMemory as any).addMemory({
              id: `learned_landmark_${landmarkName}_${ctx.tick}`,
              type: 'knowledge',
              content: `${myName} told me about ${featureType} called "${landmarkName}"`,
              createdAt: ctx.tick,
              importance: 70,
            });
          }

          ctx.emit({
            type: 'information:shared',
            data: {
              from: ctx.entity.id,
              to: partnerId,
              informationType: 'landmark_name',
              content: {
                x: sharedLandmark.x,
                y: sharedLandmark.y,
                name: landmarkName,
                featureType,
              },
              memoryType: 'terrain_landmark',
            },
          });
        }
      }
    }
  }
}
