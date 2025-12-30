/**
 * CostRecoveryManager - Handles regeneration and recovery of magic resources
 *
 * Different cost types recover in different ways:
 * - rest: Recovers during sleep/rest periods
 * - ritual: Requires specific rituals to recover
 * - time: Naturally decays/recovers over time
 * - sacrifice: Must sacrifice something to recover
 * - quest: Must complete tasks to recover
 * - prayer: Recovers through devotion (divine magic)
 */

import type { MagicCostType, MagicParadigm, CostRecoveryMethod } from '../MagicParadigm.js';
import type { MagicComponent } from '../../components/MagicComponent.js';
import type { SpellCost } from './CostCalculator.js';

/**
 * Manages recovery of magic resources across all paradigms.
 */
export class CostRecoveryManager {
  /**
   * Apply passive regeneration to all resource pools.
   * Called each game tick.
   *
   * @param caster The caster's MagicComponent
   * @param deltaTime Time elapsed since last update (in ticks)
   */
  applyPassiveRegeneration(caster: MagicComponent, deltaTime: number): void {
    // Regenerate resource pools
    for (const [_costType, pool] of Object.entries(caster.resourcePools)) {
      if (pool && pool.regenRate !== 0) {
        const regen = pool.regenRate * deltaTime;
        if (regen > 0) {
          // Positive regen: recover towards maximum
          pool.current = Math.min(pool.maximum, pool.current + regen);
        } else {
          // Negative regen: decay towards zero (e.g., attention)
          pool.current = Math.max(0, pool.current + regen);
        }
      }
    }

    // Regenerate mana pools
    for (const manaPool of caster.manaPools) {
      if (manaPool.regenRate > 0) {
        const regen = manaPool.regenRate * deltaTime;
        manaPool.current = Math.min(manaPool.maximum, manaPool.current + regen);
      }
    }
  }

  /**
   * Apply rest recovery (sleeping, meditating).
   * Multiplies regen rates while resting.
   *
   * @param caster The caster's MagicComponent
   * @param restDuration Duration of rest in ticks
   * @param paradigm The caster's paradigm for cost definitions
   * @param restMultiplier How much faster regen is during rest (default 5x)
   */
  applyRestRecovery(
    caster: MagicComponent,
    restDuration: number,
    paradigm: MagicParadigm,
    restMultiplier: number = 5
  ): void {
    for (const [costType, pool] of Object.entries(caster.resourcePools)) {
      if (!pool) continue;

      // Check if this cost type recovers via rest
      const costDef = paradigm.costs.find(c => c.type === costType);
      if (costDef?.recoveryMethod === 'rest' || pool.regenRate > 0) {
        const baseRegen = pool.regenRate > 0 ? pool.regenRate : 0.01;
        const recovery = baseRegen * restDuration * restMultiplier;

        // For cumulative costs (corruption), rest doesn't help
        if (costDef?.cumulative) continue;

        pool.current = Math.min(pool.maximum, pool.current + recovery);
      }
    }

    // Rest also recovers mana pools
    for (const manaPool of caster.manaPools) {
      const baseRegen = manaPool.regenRate > 0 ? manaPool.regenRate : 0.01;
      const recovery = baseRegen * restDuration * restMultiplier;
      manaPool.current = Math.min(manaPool.maximum, manaPool.current + recovery);
    }
  }

  /**
   * Apply ritual recovery for a specific cost type.
   *
   * @param caster The caster's MagicComponent
   * @param ritualType The type of ritual performed
   * @param costType The cost type to recover
   * @param amount Amount to recover
   */
  applyRitualRecovery(
    caster: MagicComponent,
    _ritualType: string,
    costType: MagicCostType,
    amount: number
  ): void {
    const pool = caster.resourcePools[costType];
    if (pool) {
      pool.current = Math.min(pool.maximum, pool.current + amount);
    }
  }

  /**
   * Apply prayer recovery (for divine magic).
   *
   * @param caster The caster's MagicComponent
   * @param prayerDuration Duration of prayer in ticks
   * @param devotionLevel The caster's devotion level (0-1)
   */
  applyPrayerRecovery(
    caster: MagicComponent,
    prayerDuration: number,
    devotionLevel: number
  ): void {
    const favorPool = caster.resourcePools.favor;
    if (favorPool) {
      // Prayer recovery scales with devotion
      const baseRecovery = 0.02; // 2% per tick at full devotion
      const recovery = baseRecovery * prayerDuration * devotionLevel;
      favorPool.current = Math.min(favorPool.maximum, favorPool.current + recovery);
    }
  }

  /**
   * Apply quest completion recovery.
   *
   * @param caster The caster's MagicComponent
   * @param questId The completed quest ID
   * @param rewards Array of cost recoveries
   */
  applyQuestRecovery(
    caster: MagicComponent,
    _questId: string,
    rewards: SpellCost[]
  ): void {
    for (const reward of rewards) {
      const pool = caster.resourcePools[reward.type];
      if (pool) {
        pool.current = Math.min(pool.maximum, pool.current + reward.amount);
      }
    }
  }

  /**
   * Apply sacrifice recovery.
   *
   * @param caster The caster's MagicComponent
   * @param sacrificeType What was sacrificed
   * @param sacrificeValue Value of the sacrifice
   * @param costType Which cost type to recover
   */
  applySacrificeRecovery(
    caster: MagicComponent,
    sacrificeType: string,
    sacrificeValue: number,
    costType: MagicCostType
  ): void {
    const pool = caster.resourcePools[costType];
    if (pool) {
      // Convert sacrifice value to recovery amount
      // Different sacrifice types may have different efficiencies
      const efficiency = this.getSacrificeEfficiency(sacrificeType, costType);
      const recovery = sacrificeValue * efficiency;
      pool.current = Math.min(pool.maximum, pool.current + recovery);
    }
  }

  /**
   * Get recovery rate for a specific cost type and method.
   */
  getRecoveryRate(
    costType: MagicCostType,
    method: CostRecoveryMethod,
    paradigm: MagicParadigm
  ): number {
    const costDef = paradigm.costs.find(c => c.type === costType);
    if (!costDef?.recoverable) return 0;
    if (costDef.recoveryMethod !== method) return 0;

    // Default recovery rates by method
    const baseRates: Record<CostRecoveryMethod, number> = {
      rest: 0.01,      // 1% per tick while resting
      ritual: 0,        // Varies by ritual
      time: 0.001,      // 0.1% per tick passively
      sacrifice: 0,     // Varies by sacrifice
      quest: 0,         // Instant on completion
      reunion: 0,       // Instant on reunion
    };

    return baseRates[method] ?? 0;
  }

  /**
   * Get sacrifice efficiency for converting sacrifice to recovery.
   */
  private getSacrificeEfficiency(
    sacrificeType: string,
    costType: MagicCostType
  ): number {
    // Default efficiency mapping
    // This could be extended with paradigm-specific rules
    const efficiencies: Record<string, Record<MagicCostType, number>> = {
      blood: {
        health: 0.5,
        blood: 1.0,
        corruption: 0,
        favor: 0.3,
        mana: 0.2,
      } as Record<MagicCostType, number>,
      gold: {
        karma: 0.1,
        favor: 0.2,
      } as Record<MagicCostType, number>,
      time: {
        mana: 0.5,
        stamina: 0.8,
      } as Record<MagicCostType, number>,
    };

    return efficiencies[sacrificeType]?.[costType] ?? 0.1;
  }

  /**
   * Check if a cost type can recover via a specific method.
   */
  canRecoverVia(
    costType: MagicCostType,
    method: CostRecoveryMethod,
    paradigm: MagicParadigm
  ): boolean {
    const costDef = paradigm.costs.find(c => c.type === costType);
    return costDef?.recoverable === true && costDef.recoveryMethod === method;
  }
}

/**
 * Singleton instance of the cost recovery manager.
 */
export const costRecoveryManager = new CostRecoveryManager();
