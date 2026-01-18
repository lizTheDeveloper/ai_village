import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import { DeityComponent, type BeliefActivity } from '../components/DeityComponent.js';
import type { BeliefEconomyConfig } from '../divinity/UniverseConfig.js';

/**
 * Belief generation rates per hour (in-game time) by activity type
 * From spec: belief-and-deity-system.md
 */
const BELIEF_RATES_PER_HOUR: Record<BeliefActivity, number> = {
  passive_faith: 0.01,
  prayer: 0.1,
  meditation: 0.15,
  ritual: 0.3,
  sacrifice: 0.5, // Base, can scale up to 2.0
  pilgrimage: 1.0,
  proselytizing: 0.2,
  creation: 0.5,
  miracle_witness: 5.0,
};

/**
 * BeliefGenerationSystem - Phase 1 of divinity system
 *
 * Generates belief from agents with faith and flows it to deities.
 *
 * Per spec:
 * - Agents generate belief through religious activity
 * - Generation rate depends on faith, spirituality, and activity type
 * - Belief accumulates in deity entities
 * - Deities experience decay without active worship
 */
export class BeliefGenerationSystem extends BaseSystem {
  public readonly id: SystemId = 'belief_generation';
  public readonly priority: number = 115; // After belief formation
  public readonly requiredComponents = [];
  // Only run when deity components exist (O(1) activation check)
  public readonly activationComponents = ['deity'] as const;

  protected readonly throttleInterval: number = 200; // VERY_SLOW - 10 seconds (belief generation is a slow process)

  /**
   * Get the belief economy config from the world's divine config
   */
  private getBeliefEconomyConfig(): BeliefEconomyConfig | undefined {
    const divineConfig = this.world.divineConfig;
    return divineConfig?.beliefEconomy;
  }

  protected onUpdate(ctx: SystemContext): void {
    const { activeEntities, tick } = ctx;

    // Find all deities
    const deities = activeEntities.filter(e => e.components.has(CT.Deity));

    // Process each deity
    for (const deity of deities) {
      this._processDeity(deity, activeEntities, tick);
    }
  }

  /**
   * Process a deity: generate belief from believers and apply decay
   */
  private _processDeity(deityEntity: Entity, allEntities: ReadonlyArray<Entity>, currentTick: number): void {
    const deityComp = deityEntity.components.get(CT.Deity) as DeityComponent;
    if (!deityComp) return;

    // Fix believers Set if it was corrupted by serialization
    if (!(deityComp.believers instanceof Set)) {
      // If believers was serialized, it's either an object {} or an array
      if (Array.isArray(deityComp.believers)) {
        deityComp.believers = new Set(deityComp.believers);
      } else {
        // Plain object - convert to empty Set (will be repopulated below)
        deityComp.believers = new Set();
      }
    }

    // Get belief economy config for multipliers
    const beliefConfig = this.getBeliefEconomyConfig();

    let totalBeliefGenerated = 0;

    // Find all believers of this deity
    const believers = allEntities.filter(e => {
      if (!e.components.has(CT.Spiritual)) return false;
      const spiritual = e.components.get(CT.Spiritual) as SpiritualComponent;

      // Check if this agent believes in this deity
      return spiritual.believedDeity === deityEntity.id && spiritual.faith > 0;
    });

    // Update the deity's believers Set
    deityComp.believers.clear();
    for (const believerEntity of believers) {
      deityComp.believers.add(believerEntity.id);
    }

    // Generate belief from each believer
    for (const believerEntity of believers) {
      const beliefAmount = this._generateBeliefFromAgent(believerEntity, currentTick, beliefConfig);
      if (beliefAmount > 0) {
        totalBeliefGenerated += beliefAmount;

        // Directly manipulate belief state (methods may be missing due to serialization)
        if (typeof deityComp.addBelief === 'function') {
          deityComp.addBelief(beliefAmount, currentTick);
        } else {
          // Fallback: directly update belief state
          deityComp.belief.currentBelief += beliefAmount;
          deityComp.belief.totalBeliefEarned += beliefAmount;
          deityComp.belief.lastActivityTick = currentTick;
        }
      }
    }

    // Update belief generation rate
    if (typeof deityComp.updateBeliefRate === 'function') {
      deityComp.updateBeliefRate(totalBeliefGenerated * this.throttleInterval);
    } else {
      // Fallback: directly update rate
      deityComp.belief.beliefPerTick = totalBeliefGenerated * this.throttleInterval;
      deityComp.belief.peakBeliefRate = Math.max(deityComp.belief.peakBeliefRate, deityComp.belief.beliefPerTick);
    }

    // Apply decay with config multiplier
    const decayMultiplier = beliefConfig?.decayMultiplier ?? 1.0;
    if (typeof deityComp.applyDecay === 'function') {
      deityComp.applyDecay(currentTick, decayMultiplier);
    } else {
      // Fallback: manually apply decay
      const ticksSinceActivity = currentTick - deityComp.belief.lastActivityTick;
      let decay = deityComp.belief.decayRate;
      if (ticksSinceActivity > 2400) {
        decay *= 5;
      }
      decay *= decayMultiplier;
      const decayAmount = deityComp.belief.currentBelief * decay;
      deityComp.belief.currentBelief = Math.max(0, deityComp.belief.currentBelief - decayAmount);
    }

    // Emit event if belief was generated
    if (totalBeliefGenerated > 0) {
      this.events.emit('belief:generated', {
        deityId: deityEntity.id,
        amount: totalBeliefGenerated,
        believers: believers.length,
        currentBelief: deityComp.belief.currentBelief,
      });
    }
  }

  /**
   * Generate belief from a single agent
   */
  private _generateBeliefFromAgent(
    entity: Entity,
    currentTick: number,
    beliefConfig?: BeliefEconomyConfig
  ): number {
    const spiritual = entity.components.get(CT.Spiritual) as SpiritualComponent;
    const personality = entity.components.get(CT.Personality) as PersonalityComponent;

    if (!spiritual || !personality) return 0;

    // Determine activity type based on agent's recent behavior
    // Check if agent has prayed recently (within last second = 20 ticks at 20 TPS)
    const timeSinceLastPrayer = currentTick - (spiritual.lastPrayerTime ?? -1000);
    const isCurrentlyPraying = timeSinceLastPrayer <= 20;

    const activity: BeliefActivity = isCurrentlyPraying ? 'prayer' : 'passive_faith';

    // Get base rate for this activity
    const baseRate = BELIEF_RATES_PER_HOUR[activity];

    // Apply activity-specific multiplier from config
    const activityMultiplier = beliefConfig?.activityMultipliers?.[activity] ?? 1.0;

    // Apply global generation multiplier from config
    const globalMultiplier = beliefConfig?.generationMultiplier ?? 1.0;

    // Modifiers
    const faithMultiplier = spiritual.faith; // 0-1
    const spiritualityMultiplier = personality.spirituality ?? 0.5; // 0-1

    // Calculate belief generated this tick
    // Convert per-hour rate to per-second rate (divide by 3600)
    // Then adjust for update interval (20 ticks = 1 second)
    const beliefPerSecond = baseRate / 3600;
    const beliefThisUpdate = beliefPerSecond * faithMultiplier * spiritualityMultiplier * activityMultiplier * globalMultiplier;

    return beliefThisUpdate;
  }
}
