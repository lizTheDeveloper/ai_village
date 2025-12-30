/**
 * AcademicCostCalculator - Cost calculation for Academic/Wizard paradigm
 *
 * Costs: mana (primary), stamina (secondary)
 *
 * Academic magic is the most straightforward:
 * - Mana cost is the spell's base cost, reduced by ley line proximity
 * - Stamina cost is based on cast time (physical effort of casting)
 * - Both recover via rest
 * - Neither is terminal (you just can't cast without resources)
 */

import {
  BaseCostCalculator,
  type CastingContext,
  type SpellCost,
  type ResourceInitOptions,
} from '../CostCalculator.js';
import type { ComposedSpell, MagicComponent } from '../../../components/MagicComponent.js';

/**
 * Cost calculator for the Academic/Wizard magic paradigm.
 */
export class AcademicCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'academic';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];

    // =========================================================================
    // Mana Cost (Primary)
    // =========================================================================

    let manaCost = spell.manaCost;

    // Ley line proximity reduces mana cost by up to 30%
    if (context.ambientPower > 0) {
      const reduction = Math.min(0.3, context.ambientPower * 0.1);
      manaCost *= (1 - reduction);
    }

    // Focus item proficiency bonus can reduce cost slightly
    const focusBonus = this.getFocusBonus(caster);
    if (focusBonus > 0) {
      manaCost *= (1 - focusBonus * 0.001); // Up to 10% reduction at 100 bonus
    }

    // Group casting splits mana evenly
    if (context.isGroupCast && context.casterCount > 1) {
      manaCost = Math.ceil(manaCost / context.casterCount);
    }

    costs.push({
      type: 'mana',
      amount: Math.ceil(manaCost),
      source: 'spell_base',
    });

    // =========================================================================
    // Stamina Cost (Secondary)
    // =========================================================================

    // Base stamina cost is proportional to cast time
    let staminaCost = spell.castTime * 0.5;

    // Longer spells are more tiring
    if (spell.castTime > 20) {
      staminaCost *= 1.2;
    }

    // More powerful spells are also more draining
    if (spell.manaCost > 50) {
      staminaCost += (spell.manaCost - 50) * 0.1;
    }

    // Focus items reduce stamina cost
    if (focusBonus > 0) {
      staminaCost *= (1 - focusBonus * 0.002); // Up to 20% reduction at 100 bonus
    }

    costs.push({
      type: 'stamina',
      amount: Math.ceil(staminaCost),
      source: 'casting_effort',
    });

    return costs;
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Mana pool
    const manaMax = options?.maxOverrides?.mana ?? 100;
    const manaCurrent = options?.currentOverrides?.mana ?? manaMax;
    const manaRegen = options?.regenOverrides?.mana ?? 0.01;

    caster.resourcePools.mana = {
      type: 'mana',
      current: manaCurrent,
      maximum: manaMax,
      regenRate: manaRegen,
      locked: 0,
    };

    // Also set up mana pool in the legacy format
    if (!caster.manaPools) {
      caster.manaPools = [];
    }
    if (!caster.manaPools.find(p => p.source === 'arcane')) {
      caster.manaPools.push({
        source: 'arcane',
        current: manaCurrent,
        maximum: manaMax,
        regenRate: manaRegen,
        locked: 0,
      });
    }

    // Stamina pool
    const staminaMax = options?.maxOverrides?.stamina ?? 100;
    const staminaCurrent = options?.currentOverrides?.stamina ?? staminaMax;
    const staminaRegen = options?.regenOverrides?.stamina ?? 0.02;

    caster.resourcePools.stamina = {
      type: 'stamina',
      current: staminaCurrent,
      maximum: staminaMax,
      regenRate: staminaRegen,
      locked: 0,
    };

    // Set paradigm state
    if (!caster.paradigmState) {
      caster.paradigmState = {};
    }
    caster.paradigmState.academic = {
      custom: {
        spellsStudied: 0,
        schoolSpecializations: [],
      },
    };
  }

  /**
   * Get the focus item proficiency bonus.
   * This would come from checking equipped items with focus properties.
   */
  private getFocusBonus(caster: MagicComponent): number {
    // Check if caster has a focus bonus in their paradigm state
    const state = caster.paradigmState?.academic?.custom as Record<string, unknown> | undefined;
    return (state?.focusBonus as number) ?? 0;
  }
}
