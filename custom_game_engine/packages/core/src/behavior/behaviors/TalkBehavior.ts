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
import { ensureSocialMemoryComponent } from '../../components/SocialMemoryComponent.js';
import type { IdentityComponent } from '../../components/IdentityComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { SteeringComponent } from '../../components/SteeringComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { isInConversation, addMessage, startConversation, ensureConversationComponent } from '../../components/ConversationComponent.js';
import { updateRelationship, shareMemory, ensureRelationshipComponent } from '../../components/RelationshipComponent.js';
import { SpatialMemoryComponent, addSpatialMemory, getSpatialMemoriesByType } from '../../components/SpatialMemoryComponent.js';
import type { MemoryComponent } from '../../components/MemoryComponent.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

// Language system imports (optional - gracefully degrades if not available)
import type { LanguageKnowledgeComponent, LanguageComponent } from '@ai-village/language';

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
 * Synchronously translate English to alien using cached vocabulary only.
 * Falls back to English if any words are missing (no async LLM calls).
 *
 * @param englishText - Text to translate
 * @param language - Speaker's language component
 * @returns Translated text, or original if translation incomplete
 */
function translateEnglishToAlienSync(
  englishText: string,
  language: LanguageComponent
): string {
  if (language.knownWords.size === 0) {
    return englishText; // No vocabulary
  }

  let alienText = englishText;

  // Sort concepts by length (longest first) to handle compound words
  const sortedConcepts: string[] = (Array.from(language.knownWords.keys()) as string[])
    .sort((a: string, b: string) => b.length - a.length);

  for (const concept of sortedConcepts) {
    const wordData = language.knownWords.get(concept);
    if (!wordData) continue;

    // Simple word replacement (case-insensitive)
    const pattern = new RegExp(`\\b${escapeRegex(concept)}\\b`, 'gi');
    alienText = alienText.replace(pattern, wordData.word);
  }

  return alienText;
}

/**
 * Prepare message for listener based on proficiency (synchronous version)
 */
function prepareMessageForListenerSync(
  originalEnglish: string,
  alienText: string,
  sourceLanguageId: string,
  listenerKnowledge: LanguageKnowledgeComponent
): string {
  const proficiency = listenerKnowledge.knownLanguages?.get(sourceLanguageId)?.proficiency ?? 0;

  // Fluent (≥90%) → see English
  if (proficiency >= 0.9) {
    return originalEnglish;
  }

  // None (<10%) → see alien
  if (proficiency < 0.1) {
    return alienText;
  }

  // Partial (10-90%) → see mixed based on known words
  const englishWords = originalEnglish.split(/\s+/);
  const alienWords = alienText.split(/\s+/);
  const maxLen = Math.max(englishWords.length, alienWords.length);
  const mixedWords: string[] = new Array(maxLen);

  const vocab = listenerKnowledge.knownLanguages?.get(sourceLanguageId)?.vocabularyLearning;

  for (let i = 0; i < maxLen; i++) {
    const englishWord = englishWords[i];
    const alienWord = alienWords[i];

    if (!alienWord || !englishWord) {
      mixedWords[i] = alienWord || englishWord || '';
      continue;
    }

    // If alien word differs from English, check if listener knows it
    if (alienWord !== englishWord) {
      const meaning = vocab?.get(alienWord.toLowerCase())?.inferredMeaning;
      mixedWords[i] = meaning ? englishWord : alienWord;
    } else {
      mixedWords[i] = englishWord;
    }
  }

  return mixedWords.join(' ');
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * TalkBehavior - Engage in conversation with another agent
 */
export class TalkBehavior extends BaseBehavior {
  readonly name = 'talk' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    // NOTE: We do NOT disable steering - agents will stay near conversation center via "arrive" behavior

    const relationship = entity.getComponent<RelationshipComponent>(ComponentType.Relationship);
    const spatialMemory = entity.getComponent<SpatialMemoryComponent>(ComponentType.SpatialMemory);
    // SocialMemoryComponent is now lazy-initialized on first social interaction
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);

    // Check if we need to start a new conversation
    // This happens when 'talk' behavior is selected via priority-based decision
    // with a partnerId in behaviorState, but conversation isn't active yet
    if (agent?.behaviorState?.partnerId) {
      // Ensure conversation component exists before trying to start conversation
      const conversation = ensureConversationComponent(entity, 10);

      if (!isInConversation(conversation)) {
      const partnerIdValue = agent.behaviorState.partnerId;
      if (typeof partnerIdValue !== 'string') {
        return { complete: true, reason: 'Invalid partnerId type' };
      }
      let targetPartnerId = partnerIdValue;

      // Resolve 'nearest' to actual agent ID
      if (targetPartnerId === 'nearest') {
        const position = entity.getComponent<PositionComponent>(ComponentType.Position);
        if (position) {
          const nearbyAgents = world
            .query()
            .with(ComponentType.Agent)
            .with(ComponentType.Position)
            .with(ComponentType.Conversation)
            .executeEntities()
            .filter((other) => {
              if (other.id === entity.id) return false;
              const otherConv = (other as EntityImpl).getComponent<ConversationComponent>(ComponentType.Conversation);
              return otherConv && !isInConversation(otherConv);
            });

          if (nearbyAgents.length > 0) {
            // Find closest agent
            let closest = nearbyAgents[0];
            let closestDist = Infinity;
            for (const other of nearbyAgents) {
              const otherPos = (other as EntityImpl).getComponent<PositionComponent>(ComponentType.Position);
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
        const partnerImpl = partner as EntityImpl;
        // Ensure partner has conversation component before checking if they're in conversation
        const partnerConversation = ensureConversationComponent(partnerImpl, 10);

        // Only start if partner is available (not already talking to someone else)
        if (!isInConversation(partnerConversation)) {
          // Calculate conversation center (midpoint between the two agents) for spatial stickiness
          const myPos = entity.getComponent<PositionComponent>(ComponentType.Position);
          const partnerPos = partnerImpl.getComponent<PositionComponent>(ComponentType.Position);

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
          // Cast required: partner from world.getEntity() returns Entity, need EntityImpl for mutation
          partnerImpl.updateComponent<ConversationComponent>(ComponentType.Conversation, (current) =>
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
          // Cast required: partner from world.getEntity() returns Entity, need EntityImpl for mutation
          partnerImpl.updateComponent<AgentComponent>(ComponentType.Agent, (current) => {
            if (current.tier === 'autonomic') {
              return enableInteractionLLM(current, world.tick);
            }
            return current;
          });

          // Set up conversation partner in behaviorState - but DO NOT change behavior
          // Talk is not a mode that supersedes other modes - talking happens alongside doing things
          // Cast required: partner from world.getEntity() returns Entity, need EntityImpl for mutation
          partnerImpl.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
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
    const centerX = activeConversation.conversationCenterX;
    const centerY = activeConversation.conversationCenterY;
    if (centerX !== undefined && centerY !== undefined) {
      entity.updateComponent<SteeringComponent>(ComponentType.Steering, (current) => ({
        ...current,
        behavior: 'arrive',
        target: { x: centerX, y: centerY },
        slowingRadius: 8, // Allow agents to move around within ~8 tiles of center
      }));
    } else {
      // No conversation center set, stop moving (fallback for old conversations)
      this.stopMovement(entity);
    }

    // Update relationship (get to know each other better)
    // Lazy initialization: create component if it doesn't exist
    ensureRelationshipComponent(entity);
    entity.updateComponent<RelationshipComponent>(ComponentType.Relationship, (current) =>
      updateRelationship(current, partnerId, world.tick, 2)
    );

    // Update social memory (record this interaction for both parties)
    // Lazy-initialize SocialMemoryComponent on first social interaction
    const activePartnerImpl = activePartner as EntityImpl;
    const partnerIdentity = activePartnerImpl.getComponent<IdentityComponent>(ComponentType.Identity);
    const partnerName = partnerIdentity?.name || 'someone';

    const lazySocialMemory = ensureSocialMemoryComponent(entity);
    lazySocialMemory.recordInteraction({
      agentId: partnerId,
      interactionType: 'conversation',
      sentiment: 0.2, // Neutral-positive for casual conversation
      timestamp: world.tick,
      trustDelta: 0.02, // Small trust increase from conversation
      impression: `Had a conversation with ${partnerName}`,
    });

    // Also record for partner
    const myIdentity = entity.getComponent<IdentityComponent>(ComponentType.Identity);
    const myName = myIdentity?.name || 'someone';

    const partnerLazySocialMemory = ensureSocialMemoryComponent(activePartnerImpl);
    partnerLazySocialMemory.recordInteraction({
      agentId: entity.id,
      interactionType: 'conversation',
      sentiment: 0.2,
      timestamp: world.tick,
      trustDelta: 0.02,
      impression: `Had a conversation with ${myName}`,
    });

    // Chance to speak
    if (Math.random() < SPEAK_CHANCE) {
      this.speak(entity, activePartnerImpl, activeConversation, world);
    }

    // Chance to share a memory about food location
    if (Math.random() < SHARE_MEMORY_CHANCE && spatialMemory && relationship) {
      this.shareResourceMemory(entity, activePartnerImpl, spatialMemory, relationship, world, partnerId);
    }

    // Chance to share a named landmark
    if (Math.random() < SHARE_MEMORY_CHANCE && spatialMemory && relationship) {
      this.shareLandmarkName(entity, activePartnerImpl, spatialMemory, world, partnerId);
    }
  }

  private speak(
    entity: EntityImpl,
    partner: EntityImpl,
    conversation: ConversationComponent,
    world: World
  ): void {
    const message = CASUAL_MESSAGES[Math.floor(Math.random() * CASUAL_MESSAGES.length)] || 'Hello!';

    // Default messages (English) - may be translated if language system available
    let speakerMessage = message;
    let listenerMessage = message;

    // Attempt post-hoc translation (LLM thinks in English, we translate at message boundary)
    try {
      const speakerKnowledge = entity.getComponent<LanguageKnowledgeComponent>('language_knowledge');
      const listenerKnowledge = partner.getComponent<LanguageKnowledgeComponent>('language_knowledge');

      if (speakerKnowledge?.nativeLanguages?.[0] && listenerKnowledge) {
        const nativeLanguageId = speakerKnowledge.nativeLanguages[0];

        // Get speaker's language component from world
        // Note: Language components are stored on a separate entity (the language itself)
        const languageEntity = world.getEntity(nativeLanguageId);
        if (languageEntity) {
          const speakerLanguage = languageEntity.getComponent<LanguageComponent>('language');

          if (speakerLanguage) {
            // Translate English → Alien (speaker's native language)
            // Uses cached vocabulary only (no async LLM calls)
            const alienText = translateEnglishToAlienSync(message, speakerLanguage);

            // Prepare message for listener based on their proficiency
            listenerMessage = prepareMessageForListenerSync(
              message,              // original English
              alienText,           // alien version
              nativeLanguageId,    // speaker's language ID
              listenerKnowledge    // listener's knowledge
            );

            // Speaker sees their own native language
            speakerMessage = alienText;
          }
        }
      }
    } catch (error) {
      // Language system not available or error occurred - gracefully degrade to English
      // Silent fallback (no console output per code quality rules)
    }

    // ADD SPEAKER'S VERSION TO SPEAKER'S CONVERSATION
    entity.updateComponent<ConversationComponent>(ComponentType.Conversation, (current) =>
      addMessage(current, entity.id, speakerMessage, world.tick)
    );

    // ADD LISTENER'S VERSION TO LISTENER'S CONVERSATION
    partner.updateComponent<ConversationComponent>(ComponentType.Conversation, (current) =>
      addMessage(current, entity.id, listenerMessage, world.tick)
    );

    // Emit conversation:utterance event for episodic memory formation
    // Original English is preserved for LLM context
    world.eventBus.emit({
      type: 'conversation:utterance',
      source: entity.id,
      data: {
        conversationId: `${entity.id}-${conversation.partnerId}`,
        speaker: entity.id,
        speakerId: entity.id,
        listenerId: conversation.partnerId ?? undefined,
        message: message, // Original English for memory/LLM
        alienMessage: speakerMessage !== message ? speakerMessage : undefined,
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

    // Type guard to ensure name is a string
    const nameValue = sharedLandmark.metadata.name;
    if (typeof nameValue !== 'string') return;
    const landmarkName = nameValue;

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
      const partnerMemory = partner.getComponent<MemoryComponent>(ComponentType.Memory);
      const myIdentity = entity.getComponent<IdentityComponent>(ComponentType.Identity);
      const myName = myIdentity?.name || 'someone';

      // Type guard: check if partnerMemory has addMemory method
      if (partnerMemory && 'addMemory' in partnerMemory && typeof partnerMemory.addMemory === 'function') {
        partnerMemory.addMemory({
          id: `learned_landmark_${landmarkName}_${world.tick}`,
          type: 'knowledge',
          content: `${myName} told me about ${featureType} called "${landmarkName}"`,
          importance: 70,
          timestamp: world.tick,
          location: { x: sharedLandmark.x, y: sharedLandmark.y },
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
  const relationship = ctx.getComponent<RelationshipComponent>(CT.Relationship);
  const spatialMemory = ctx.getComponent<SpatialMemoryComponent>(CT.SpatialMemory);
  // SocialMemoryComponent is now lazy-initialized on first social interaction

  // Check if we need to start a new conversation
  if (ctx.agent.behaviorState?.partnerId) {
    // Ensure conversation component exists before trying to start conversation
    const conversation = ensureConversationComponent(ctx.entity, 10);

    if (!isInConversation(conversation)) {
    const partnerIdValue = ctx.agent.behaviorState.partnerId;
    if (typeof partnerIdValue !== 'string') {
      return ctx.complete('Invalid partnerId type');
    }
    let targetPartnerId = partnerIdValue;

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
    // Ensure partner has conversation component before checking if they're in conversation
    const partnerConversation = ensureConversationComponent(partnerImpl, 10);

    // Only start if partner is available
    if (!isInConversation(partnerConversation)) {
      // Calculate conversation center
      const partnerPos = partnerImpl.getComponent<PositionComponent>(CT.Position);
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
  const centerX = activeConversation.conversationCenterX;
  const centerY = activeConversation.conversationCenterY;
  if (centerX !== undefined && centerY !== undefined) {
    ctx.updateComponent<SteeringComponent>(CT.Steering, (current) => ({
      ...current,
      behavior: 'arrive',
      target: { x: centerX, y: centerY },
      slowingRadius: 8,
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

  // Update social memory - lazy-initialize on first interaction
  const activePartnerImpl = activePartner as EntityImpl;
  const partnerIdentity = activePartnerImpl.getComponent<IdentityComponent>(CT.Identity);
  const partnerName = partnerIdentity?.name || 'someone';

  const lazySocialMemory = ensureSocialMemoryComponent(ctx.entity);
  lazySocialMemory.recordInteraction({
    agentId: partnerId,
    interactionType: 'conversation',
    sentiment: 0.2,
    timestamp: ctx.tick,
    trustDelta: 0.02,
    impression: `Had a conversation with ${partnerName}`,
  });

  // Also record for partner
  const myIdentity = ctx.getComponent<IdentityComponent>(CT.Identity);
  const myName = myIdentity?.name || 'someone';

  const partnerLazySocialMemory = ensureSocialMemoryComponent(activePartnerImpl);
  partnerLazySocialMemory.recordInteraction({
    agentId: ctx.entity.id,
    interactionType: 'conversation',
    sentiment: 0.2,
    timestamp: ctx.tick,
    trustDelta: 0.02,
    impression: `Had a conversation with ${myName}`,
  });

  // Chance to speak
  if (Math.random() < SPEAK_CHANCE) {
    const message = CASUAL_MESSAGES[Math.floor(Math.random() * CASUAL_MESSAGES.length)] || 'Hello!';

    // Default messages (English) - may be translated if language system available
    let speakerMessage = message;
    let listenerMessage = message;

    // Attempt post-hoc translation (LLM thinks in English, we translate at message boundary)
    try {
      const speakerKnowledge = ctx.getComponent<LanguageKnowledgeComponent>('language_knowledge');
      const listenerKnowledge = activePartnerImpl.getComponent<LanguageKnowledgeComponent>('language_knowledge');

      if (speakerKnowledge?.nativeLanguages?.[0] && listenerKnowledge) {
        const nativeLanguageId = speakerKnowledge.nativeLanguages[0];

        // Get speaker's language component from world
        const languageEntity = ctx.getEntity(nativeLanguageId);
        if (languageEntity) {
          const speakerLanguage = languageEntity.getComponent<LanguageComponent>('language');

          if (speakerLanguage) {
            // Translate English → Alien (speaker's native language)
            const alienText = translateEnglishToAlienSync(message, speakerLanguage);

            // Prepare message for listener based on their proficiency
            listenerMessage = prepareMessageForListenerSync(
              message,
              alienText,
              nativeLanguageId,
              listenerKnowledge
            );

            // Speaker sees their own native language
            speakerMessage = alienText;
          }
        }
      }
    } catch (error) {
      // Language system not available - gracefully degrade to English
    }

    ctx.updateComponent<ConversationComponent>(CT.Conversation, (current) =>
      addMessage(current, ctx.entity.id, speakerMessage, ctx.tick)
    );

    // Partner also adds conversation to their component
    activePartnerImpl.updateComponent<ConversationComponent>(CT.Conversation, (current) =>
      addMessage(current, ctx.entity.id, listenerMessage, ctx.tick)
    );

    // Emit conversation:utterance event
    ctx.emit({
      type: 'conversation:utterance',
      data: {
        conversationId: `${ctx.entity.id}-${partnerId}`,
        speaker: ctx.entity.id,
        speakerId: ctx.entity.id,
        listenerId: partnerId,
        message: message, // Original English for memory/LLM
        alienMessage: speakerMessage !== message ? speakerMessage : undefined,
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
      const partnerSpatialMemory = activePartnerImpl.getComponent<SpatialMemoryComponent>(CT.SpatialMemory);

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
        // Type guard to ensure name is a string
        const nameValue = sharedLandmark.metadata.name;
        if (typeof nameValue !== 'string') return;
        const landmarkName = nameValue;

        const featureType = sharedLandmark.metadata.featureType || 'place';
        const partnerSpatialMemory = activePartnerImpl.getComponent<SpatialMemoryComponent>(CT.SpatialMemory);

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
          const partnerMemory = activePartnerImpl.getComponent<MemoryComponent>(CT.Memory);
          const myIdentity = ctx.getComponent<IdentityComponent>(CT.Identity);
          const myName = myIdentity?.name || 'someone';

          // Type guard: check if partnerMemory has addMemory method
          if (partnerMemory && 'addMemory' in partnerMemory && typeof partnerMemory.addMemory === 'function') {
            partnerMemory.addMemory({
              id: `learned_landmark_${landmarkName}_${ctx.tick}`,
              type: 'knowledge',
              content: `${myName} told me about ${featureType} called "${landmarkName}"`,
              importance: 70,
              timestamp: ctx.tick,
              location: { x: sharedLandmark.x, y: sharedLandmark.y },
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
