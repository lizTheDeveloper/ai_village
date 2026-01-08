/**
 * SocialFatigueSystem
 *
 * Manages social fatigue for agents in conversations.
 *
 * Core Mechanics:
 * - Agents accumulate fatigue while in active conversations
 * - Fatigue recovers when not in conversation
 * - Introverts tire faster and recover slower
 * - Extroverts tire slower and can handle more social interaction
 *
 * Fatigue Calculation:
 * - Fatigue rate is inversely proportional to extraversion
 * - Introverts (extraversion 0.0): ~2x faster fatigue accumulation
 * - Extroverts (extraversion 1.0): ~0.5x slower fatigue accumulation
 * - Fatigue threshold also scales with extraversion
 *
 * When fatigue exceeds threshold:
 * - Agent gets a strong signal to leave the conversation
 * - TalkerPromptBuilder surfaces this to the LLM
 * - Agent should choose to leave/end conversation
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { SystemId, ComponentType } from '../types.js';
import type { ConversationComponent } from '../components/ConversationComponent.js';
import { isInConversation } from '../components/ConversationComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';

export class SocialFatigueSystem implements System {
  public readonly id: SystemId = 'social_fatigue';
  public readonly priority: number = 16; // After CommunicationSystem (15)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [
    CT.Conversation,
  ];

  // Fatigue accumulation and recovery rates
  // At 20 TPS:
  // - Introverts (extraversion 0.0): ~60 seconds to threshold (1200 ticks)
  // - Extroverts (extraversion 1.0): ~7.2 minutes to threshold (8654 ticks)
  private static readonly BASE_FATIGUE_ACCUMULATION_PER_TICK = 0.0208; // Base rate per tick in conversation
  private static readonly BASE_FATIGUE_RECOVERY_PER_TICK = 0.015; // Recovery rate when alone (proportionally reduced)
  private static readonly FATIGUE_MULTIPLIER_MIN = 0.5; // Extroverts (extraversion = 1.0)
  private static readonly FATIGUE_MULTIPLIER_MAX = 2.0; // Introverts (extraversion = 0.0)

  // Fatigue threshold scaling (when to leave conversation)
  private static readonly THRESHOLD_MIN = 50; // Introverts can only handle up to 50 fatigue
  private static readonly THRESHOLD_MAX = 90; // Extroverts can handle up to 90 fatigue

  init(_world: World): void {
    // Initialize personality-based fatigue thresholds for all agents
    const agents = _world.query().with(CT.Conversation).with(CT.Personality).executeEntities();

    for (const agent of agents) {
      const impl = agent as EntityImpl;
      this.initializeFatigueThreshold(impl);
    }
  }

  update(world: World, entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const conversation = impl.getComponent<ConversationComponent>(CT.Conversation);
      const personality = impl.getComponent<PersonalityComponent>(CT.Personality);

      if (!conversation) continue;

      // Update fatigue based on conversation state
      if (isInConversation(conversation)) {
        this.accumulateFatigue(impl, conversation, personality, world);
      } else {
        this.recoverFatigue(impl, conversation, personality);
      }
    }
  }

  /**
   * Initialize fatigue threshold based on personality.
   * Called once when system starts or when agent is created.
   */
  private initializeFatigueThreshold(entity: EntityImpl): void {
    const personality = entity.getComponent<PersonalityComponent>(CT.Personality);
    const conversation = entity.getComponent<ConversationComponent>(CT.Conversation);

    if (!personality || !conversation) return;

    const extraversion = personality.extraversion ?? 0.5;

    // Scale threshold based on extraversion
    // Introverts (0.0) → 50 threshold
    // Moderates (0.5) → 70 threshold
    // Extroverts (1.0) → 90 threshold
    const threshold = SocialFatigueSystem.THRESHOLD_MIN +
      (extraversion * (SocialFatigueSystem.THRESHOLD_MAX - SocialFatigueSystem.THRESHOLD_MIN));

    entity.updateComponent<ConversationComponent>(CT.Conversation, (current) => ({
      ...current,
      fatigueThreshold: threshold,
    }));
  }

  /**
   * Accumulate fatigue while in conversation.
   * Introverts tire faster, extroverts tire slower.
   */
  private accumulateFatigue(
    entity: EntityImpl,
    conversation: ConversationComponent,
    personality: PersonalityComponent | undefined,
    world: World
  ): void {
    const extraversion = personality?.extraversion ?? 0.5;

    // Calculate fatigue multiplier based on extraversion
    // Introverts (0.0) → 2.0x fatigue rate (tire fast)
    // Moderates (0.5) → 1.25x fatigue rate
    // Extroverts (1.0) → 0.5x fatigue rate (tire slowly)
    const fatigueMultiplier = SocialFatigueSystem.FATIGUE_MULTIPLIER_MAX -
      (extraversion * (SocialFatigueSystem.FATIGUE_MULTIPLIER_MAX - SocialFatigueSystem.FATIGUE_MULTIPLIER_MIN));

    const fatigueIncrease = SocialFatigueSystem.BASE_FATIGUE_ACCUMULATION_PER_TICK * fatigueMultiplier;

    const newFatigue = Math.min(100, conversation.socialFatigue + fatigueIncrease);

    entity.updateComponent<ConversationComponent>(CT.Conversation, (current) => ({
      ...current,
      socialFatigue: newFatigue,
    }));

    // Emit warning event when fatigue exceeds threshold
    if (newFatigue >= conversation.fatigueThreshold && conversation.socialFatigue < conversation.fatigueThreshold) {
      world.eventBus.emit({
        type: 'conversation:fatigue_threshold_exceeded',
        source: entity.id,
        data: {
          agentId: entity.id,
          fatigue: newFatigue,
          threshold: conversation.fatigueThreshold,
          extraversion,
        },
      });
    }
  }

  /**
   * Recover fatigue when not in conversation.
   * Extroverts recover faster, introverts recover slower.
   */
  private recoverFatigue(
    entity: EntityImpl,
    conversation: ConversationComponent,
    personality: PersonalityComponent | undefined
  ): void {
    if (conversation.socialFatigue <= 0) return; // Already fully recovered

    const extraversion = personality?.extraversion ?? 0.5;

    // Recovery rate scales with extraversion
    // Introverts (0.0) → 0.5x recovery rate (recover slowly)
    // Moderates (0.5) → 0.75x recovery rate
    // Extroverts (1.0) → 1.0x recovery rate (recover quickly)
    const recoveryMultiplier = 0.5 + (extraversion * 0.5);

    const fatigueDecrease = SocialFatigueSystem.BASE_FATIGUE_RECOVERY_PER_TICK * recoveryMultiplier;

    const newFatigue = Math.max(0, conversation.socialFatigue - fatigueDecrease);

    entity.updateComponent<ConversationComponent>(CT.Conversation, (current) => ({
      ...current,
      socialFatigue: newFatigue,
    }));
  }
}
