import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent, Prayer } from '../components/SpiritualComponent.js';
import { answerPrayer as answerPrayerOnAgent } from '../components/SpiritualComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import { DivineBodyModification } from './DivineBodyModification.js';
import type { PrayerConfig } from '../divinity/UniverseConfig.js';

/**
 * PrayerAnsweringSystem - Handles player and AI gods answering prayers
 *
 * Phase 2 of divinity system:
 * - Player can answer prayers by spending belief
 * - AI gods automatically answer some prayers based on their goals
 * - Answered prayers increase faith
 * - Unanswered prayers (after timeout) decrease faith
 *
 * For Phase 2 implementation:
 * - Player-controlled deities auto-answer prayers when they have enough belief
 * - In the future, this will be UI-driven player choice
 */
export class PrayerAnsweringSystem extends BaseSystem {
  public readonly id: SystemId = 'prayer_answering';
  public readonly priority: number = 117; // After prayer generation
  public readonly requiredComponents = [];

  protected readonly throttleInterval = 20; // Update once per second at 20 TPS

  // Prayer answering cost (from spec)
  private readonly ANSWER_PRAYER_COST = 75;

  // Divine healing cost (higher than a sign)
  private readonly DIVINE_HEALING_COST = 150;

  // Default prayer timeout (in ticks) - after this, prayer counts as unanswered
  private readonly DEFAULT_PRAYER_TIMEOUT = 7200; // 6 game hours at 20 TPS

  // DivineBodyModification for healing prayers
  private divineBodyMod: DivineBodyModification;

  constructor() {
    super();
    this.divineBodyMod = new DivineBodyModification({ believersOnly: true });
  }

  /**
   * Safely remove a prayer from the queue (handles deserialized plain objects)
   */
  private _removePrayer(deityComp: DeityComponent, prayerId: string): void {
    if (typeof deityComp.removePrayer === 'function') {
      deityComp.removePrayer(prayerId);
    } else if (deityComp.prayerQueue) {
      const index = deityComp.prayerQueue.findIndex(p => p.prayerId === prayerId);
      if (index !== -1) {
        deityComp.prayerQueue.splice(index, 1);
      }
    }
  }

  /**
   * Safely spend belief (handles deserialized plain objects)
   */
  private _spendBelief(deityComp: DeityComponent, amount: number): boolean {
    if (typeof deityComp.spendBelief === 'function') {
      return deityComp.spendBelief(amount);
    } else if (deityComp.belief && deityComp.belief.currentBelief >= amount) {
      deityComp.belief.currentBelief -= amount;
      deityComp.belief.totalBeliefSpent = (deityComp.belief.totalBeliefSpent || 0) + amount;
      return true;
    }
    return false;
  }

  /**
   * Safely answer a prayer (handles deserialized plain objects)
   */
  private _answerPrayer(deityComp: DeityComponent, prayerId: string, cost: number): boolean {
    if (typeof deityComp.answerPrayer === 'function') {
      return deityComp.answerPrayer(prayerId, cost);
    }
    // Manual implementation for plain objects
    if (!this._spendBelief(deityComp, cost)) {
      return false;
    }
    this._removePrayer(deityComp, prayerId);
    return true;
  }

  /**
   * Get the prayer config from the world's divine config
   */
  private getPrayerConfig(world: World): PrayerConfig | undefined {
    const divineConfig = world.divineConfig;
    return divineConfig?.powers?.prayers;
  }

  /**
   * Get the prayer timeout in ticks (converts from game hours in config)
   */
  private getPrayerTimeout(world: World): number {
    const prayerConfig = this.getPrayerConfig(world);
    if (prayerConfig?.prayerExpiryTime) {
      // Convert game hours to ticks (20 TPS * 60 seconds * 60 minutes = 72000 ticks per hour)
      // But we're running at a compressed timescale, so 6 game hours = 7200 ticks (100x compression)
      return prayerConfig.prayerExpiryTime * 1200; // ~1 minute per game hour at 20 TPS
    }
    return this.DEFAULT_PRAYER_TIMEOUT;
  }

  /**
   * Get the faith penalty for ignored prayers
   */
  private getIgnoredPrayerFaithPenalty(world: World): number {
    const prayerConfig = this.getPrayerConfig(world);
    return prayerConfig?.ignoredPrayerFaithPenalty ?? 0.02;
  }

  protected onUpdate(ctx: SystemContext): void {
    // Find all deities
    const deities = ctx.activeEntities.filter(e => e.components.has(CT.Deity));

    // Process each deity's prayer queue
    for (const deity of deities) {
      this._processDeityPrayers(deity, ctx.activeEntities, ctx.tick, ctx.world);
    }
  }

  /**
   * Process prayers for a single deity
   */
  private _processDeityPrayers(deityEntity: Entity, allEntities: ReadonlyArray<Entity>, currentTick: number, world: World): void {
    const deityComp = deityEntity.components.get(CT.Deity) as DeityComponent;
    if (!deityComp) return;

    // For player-controlled deities, automatically answer prayers if enough belief
    // In the future, this will be UI-driven
    if (deityComp.controller === 'player') {
      this._autoAnswerPrayers(deityEntity, deityComp, allEntities, currentTick, world);
    }

    // Check for timed-out prayers
    this._checkTimeoutPrayers(deityEntity, deityComp, allEntities, currentTick, world);
  }

  /**
   * Automatically answer prayers (Phase 2 simple implementation)
   * In the future, player will choose which prayers to answer
   */
  private _autoAnswerPrayers(
    deityEntity: Entity,
    deityComp: DeityComponent,
    allEntities: ReadonlyArray<Entity>,
    _currentTick: number,
    world?: World
  ): void {
    // Only answer if we have enough belief
    if (deityComp.belief.currentBelief < this.ANSWER_PRAYER_COST) {
      return;
    }

    // Get next prayer (access directly - method may not exist after deserialization)
    const nextPrayer = deityComp.prayerQueue?.[0];
    if (!nextPrayer) return;

    // Find the agent who prayed
    const agent = allEntities.find(e => e.id === nextPrayer.agentId);
    if (!agent) {
      // Agent no longer exists, remove prayer
      deityComp.removePrayer(nextPrayer.prayerId);
      return;
    }

    // Get the full prayer from the agent's spiritual component
    const spiritual = agent.components.get(CT.Spiritual) as SpiritualComponent;
    if (!spiritual) {
      deityComp.removePrayer(nextPrayer.prayerId);
      return;
    }

    const prayer = spiritual.prayers.find(p => p.id === nextPrayer.prayerId);

    // Check if this is a healing prayer
    if (prayer && this._isHealingPrayer(prayer) && world) {
      // Try to answer with actual healing
      const healed = this._tryAnswerHealingPrayer(deityEntity, deityComp, agent, nextPrayer.prayerId, spiritual, world);
      if (healed) return; // Successfully healed, prayer answered
    }

    // Answer the prayer with a sign (default behavior)
    if (deityComp.answerPrayer(nextPrayer.prayerId, this.ANSWER_PRAYER_COST)) {
      // Update agent's spiritual component
      if (spiritual) {
        const updatedSpiritual = answerPrayerOnAgent(
          spiritual,
          nextPrayer.prayerId,
          'sign', // For now, all answers are "signs"
          deityEntity.id
        );
        (agent as EntityImpl).addComponent(updatedSpiritual);
      }

      // Emit event
      this.events.emitGeneric('prayer:answered', {
        deityId: deityEntity.id,
        agentId: nextPrayer.agentId,
        prayerId: nextPrayer.prayerId,
        responseType: 'sign',
      }, 'prayer_answering');
    }
  }

  /**
   * Check if a prayer is asking for healing
   */
  private _isHealingPrayer(prayer: Prayer): boolean {
    if (prayer.type !== 'help' && prayer.type !== 'plea') {
      return false;
    }

    // Check prayer content for healing-related keywords
    const healingKeywords = ['heal', 'health', 'wound', 'injury', 'hurt', 'pain', 'sick', 'cure', 'mend'];
    const content = prayer.content.toLowerCase();
    return healingKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * Try to answer a healing prayer with actual divine healing
   */
  private _tryAnswerHealingPrayer(
    deityEntity: Entity,
    deityComp: DeityComponent,
    agent: Entity,
    prayerId: string,
    spiritual: SpiritualComponent,
    world: World
  ): boolean {
    // Check if deity has enough belief for healing (more expensive than a sign)
    if (deityComp.belief.currentBelief < this.DIVINE_HEALING_COST) {
      return false;
    }

    // Check if agent needs healing
    const needs = agent.components.get(CT.Needs) as NeedsComponent | undefined;
    if (!needs || needs.health >= 0.9) {
      return false; // Agent doesn't need healing
    }

    // Try to perform divine healing
    const result = this.divineBodyMod.healBody(
      deityEntity.id,
      agent.id,
      world,
      'mend_wounds',
      'prayer_answer'
    );

    if (result && result.result === 'success') {
      // Healing successful - mark prayer as answered
      deityComp.removePrayer(prayerId);

      // Spend the additional belief cost (beyond what healBody already spent)
      // Note: DivineBodyModification has its own cost, we're just adding the prayer overhead
      deityComp.spendBelief(this.ANSWER_PRAYER_COST);

      // Update agent's spiritual component
      const updatedSpiritual = answerPrayerOnAgent(
        spiritual,
        prayerId,
        'vision', // Divine healing is more impactful than a sign
        deityEntity.id
      );
      (agent as EntityImpl).addComponent(updatedSpiritual);

      // Emit event
      this.events.emitGeneric('prayer:answered', {
        deityId: deityEntity.id,
        agentId: agent.id,
        prayerId,
        responseType: 'vision',
        healingApplied: true,
      }, 'prayer_answering');

      return true;
    }

    return false;
  }

  /**
   * Check for prayers that have timed out (unanswered for too long)
   */
  private _checkTimeoutPrayers(
    _deityEntity: Entity,
    deityComp: DeityComponent,
    allEntities: ReadonlyArray<Entity>,
    currentTick: number,
    world: World
  ): void {
    // Get timeout from config
    const prayerTimeout = this.getPrayerTimeout(world);
    const faithPenalty = this.getIgnoredPrayerFaithPenalty(world);

    const timedOutPrayers = deityComp.prayerQueue.filter(
      p => currentTick - p.timestamp > prayerTimeout
    );

    for (const prayer of timedOutPrayers) {
      // Find the agent
      const agent = allEntities.find(e => e.id === prayer.agentId);
      if (!agent) {
        // Agent no longer exists, remove prayer
        deityComp.removePrayer(prayer.prayerId);
        continue;
      }

      // Increment unanswered prayers count and potentially decrease faith
      const spiritual = agent.components.get(CT.Spiritual) as SpiritualComponent;
      if (spiritual) {
        const updatedSpiritual: SpiritualComponent = {
          ...spiritual,
          unansweredPrayers: spiritual.unansweredPrayers + 1,
          // Unanswered prayers decrease faith based on config penalty
          faith: Math.max(0, spiritual.faith - faithPenalty),
        };
        (agent as EntityImpl).addComponent(updatedSpiritual);
      }

      // Remove from queue
      deityComp.removePrayer(prayer.prayerId);
    }
  }
}
