/**
 * VoidCostCalculator - Cost calculation for Void magic
 *
 * Costs: health (primary), corruption (cumulative)
 *
 * Void magic is the dark alternative to arcane:
 * - Health is the primary cost (life force burned)
 * - Corruption ALWAYS accumulates (but slower than blood)
 * - No mana requirement - the desperate can always attempt it
 * - 1.5x power vs equivalent mana spell
 * - Casting at critical health is allowed but suicidal
 *
 * Part of Phase 30: Magic System Paradigm Implementation
 */

import {
  BaseCostCalculator,
  type CastingContext,
  type SpellCost,
  type AffordabilityResult,
  type ResourceInitOptions,
  type TerminalEffect,
} from '../CostCalculator.js';
import type { MagicCostType } from '../../MagicParadigm.js';
import type { ComposedSpell, MagicComponent } from '../../../components/MagicComponent.js';

/** Minimum health fraction required to cast (caster must have > 10% health) */
const MIN_HEALTH_FRACTION = 0.1;

/** Base corruption gained per void spell cast */
const BASE_CORRUPTION_PER_CAST = 5;

/**
 * Cost calculator for Void magic.
 *
 * Void magic costs health and accumulates corruption.
 * It is 1.5x more powerful than equivalent arcane spells.
 */
export class VoidCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'void';

  calculateCosts(
    spell: ComposedSpell,
    _caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];

    // =========================================================================
    // Health Cost (Primary) - 1.5x mana equivalent, scaled down
    // =========================================================================

    // Health cost scales with spell power. At manaCost=20, healthCost=15.
    let healthCost = Math.ceil(spell.manaCost * 0.75);

    // Group casting distributes the health cost
    if (context.isGroupCast && context.casterCount > 1) {
      healthCost = Math.ceil(healthCost / context.casterCount);
    }

    // Void technique synergy: destroy/void combos cost slightly less
    if (spell.technique === 'destroy' || spell.form === 'void') {
      healthCost = Math.ceil(healthCost * 0.85);
    }

    costs.push({
      type: 'health',
      amount: healthCost,
      source: 'void_life_drain',
      terminal: true, // Health reaching zero = death
    });

    // =========================================================================
    // Corruption (Always accumulates)
    // =========================================================================

    // Corruption accumulates every cast - void magic taints the soul
    let corruptionGain = BASE_CORRUPTION_PER_CAST;

    // More powerful spells cause more corruption
    if (spell.manaCost > 40) {
      corruptionGain += Math.ceil((spell.manaCost - 40) * 0.1);
    }

    // Destructive techniques cause more corruption
    if (spell.technique === 'destroy') {
      corruptionGain += 2;
    }

    costs.push({
      type: 'corruption',
      amount: corruptionGain,
      source: 'void_taint',
      terminal: true, // 100 corruption = transformation
    });

    return costs;
  }

  /**
   * Override affordability to allow casting at critically low health
   * (as per spec: "Can be cast even at low health (risky)").
   *
   * Void magic is always "affordable" as long as caster is alive,
   * but warns if health is critically low.
   */
  override canAfford(costs: SpellCost[], caster: MagicComponent): AffordabilityResult {
    const missing: SpellCost[] = [];
    let wouldBeTerminal = false;
    let warning: string | undefined;

    for (const cost of costs) {
      if (cost.type === 'health') {
        const pool = caster.resourcePools.health;
        if (!pool) {
          // No health pool — cannot cast (entity isn't alive)
          missing.push({ type: 'health', amount: cost.amount, source: 'no_health_pool' });
          continue;
        }

        const available = pool.current - pool.locked;
        const minRequired = pool.maximum * MIN_HEALTH_FRACTION;

        // Must have more than the minimum threshold
        if (available <= minRequired) {
          missing.push({ type: 'health', amount: cost.amount, source: 'insufficient_health' });
          continue;
        }

        // Warn if health would drop below half after cast
        const remaining = available - cost.amount;
        if (remaining < pool.maximum * 0.5) {
          wouldBeTerminal = remaining <= 0;
          warning = remaining <= 0
            ? 'Void casting would be fatal'
            : `Void casting leaves only ${Math.floor((remaining / pool.maximum) * 100)}% health`;
        }
      } else if (cost.type === 'corruption') {
        // Corruption never blocks casting - it's always possible to accumulate more
        const pool = caster.resourcePools.corruption;
        if (pool && pool.current >= pool.maximum) {
          wouldBeTerminal = true;
          warning = 'Already fully corrupted - casting will trigger transformation';
        }
      }
    }

    return { canAfford: missing.length === 0, missing, wouldBeTerminal, warning };
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Health pool - void mages draw from their life force
    const healthMax = options?.maxOverrides?.health ?? 100;
    const healthCurrent = options?.currentOverrides?.health ?? healthMax;
    const healthRegen = options?.regenOverrides?.health ?? 0.01;

    caster.resourcePools.health = {
      type: 'health',
      current: healthCurrent,
      maximum: healthMax,
      regenRate: healthRegen,
      locked: 0,
    };

    // Corruption pool - starts at 0, never recovers
    const corruptionMax = options?.maxOverrides?.corruption ?? 100;

    caster.resourcePools.corruption = {
      type: 'corruption',
      current: options?.currentOverrides?.corruption ?? 0,
      maximum: corruptionMax,
      regenRate: 0, // Corruption never recovers
      locked: 0,
    };

    // Set paradigm state
    if (!caster.paradigmState) {
      caster.paradigmState = {};
    }
    caster.paradigmState.void = {
      custom: {
        voidSpellsCast: 0,
        corruptionMilestones: [],
      },
    };
  }

  /**
   * Override terminal effects for void-specific consequences.
   */
  protected override getTerminalEffect(
    costType: MagicCostType,
    trigger: 'zero' | 'max',
    _caster: MagicComponent
  ): TerminalEffect {
    switch (costType) {
      case 'health':
        return { type: 'death', cause: 'Life force consumed by Void magic' };
      case 'corruption':
        return {
          type: 'corruption_threshold',
          newForm: 'void_touched',
          corruptionLevel: 100,
        };
      default:
        return super.getTerminalEffect(costType, trigger, _caster);
    }
  }
}
