/**
 * DreamCostCalculator - Cost calculation for Dream/Oneiromancy paradigm
 *
 * Costs: lucidity (primary), fatigue (physical exhaustion)
 *
 * Dream magic operates in the realm of sleep:
 * - Lucidity represents mental clarity in dreams
 * - Fatigue accumulates from extended dream activities
 * - Must be asleep or in trance to cast most spells
 * - More powerful at night
 */

import {
  BaseCostCalculator,
  type CastingContext,
  type SpellCost,
  type ResourceInitOptions,
  type TerminalEffect,
} from '../CostCalculator.js';
import type { ComposedSpell, MagicComponent } from '../../../components/MagicComponent.js';

/**
 * Cost calculator for the Dream/Oneiromancy magic paradigm.
 */
export class DreamCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'dream';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.dream;
    const isAsleep = (state?.sleeping ?? false) as boolean;
    const isNighttime = context.custom?.isNight ?? false;

    // =========================================================================
    // Lucidity Cost (Primary)
    // =========================================================================

    let lucidityBase = Math.ceil(spell.manaCost * 0.4);

    // Cheaper at night
    if (isNighttime) {
      lucidityBase = Math.ceil(lucidityBase * 0.7);
    }

    // Much more efficient while asleep
    if (isAsleep) {
      lucidityBase = Math.ceil(lucidityBase * 0.5);
    }

    // Mind spells are cheaper
    if (spell.form === 'mind' || spell.form === 'image') {
      lucidityBase = Math.ceil(lucidityBase * 0.8);
    }

    costs.push({
      type: 'lucidity',
      amount: lucidityBase,
      source: 'dream_focus',
      terminal: true,
    });

    // =========================================================================
    // Fatigue Cost (Physical exhaustion)
    // =========================================================================

    // Dream magic drains physical energy
    let fatigueCost = Math.ceil(spell.manaCost * 0.1);

    // Wake-casting is extremely exhausting
    if (!isAsleep) {
      fatigueCost = Math.ceil(fatigueCost * 3);
    }

    costs.push({
      type: 'fatigue',
      amount: fatigueCost,
      source: 'dream_exertion',
    });

    // =========================================================================
    // Special: Nightmare Cost (For dark dream magic)
    // =========================================================================

    if (this.isNightmareSpell(spell)) {
      costs.push({
        type: 'sanity',
        amount: Math.ceil(spell.manaCost * 0.2),
        source: 'nightmare_exposure',
      });
    }

    return costs;
  }

  /**
   * Check if spell involves nightmare/dark dream magic.
   */
  private isNightmareSpell(spell: ComposedSpell): boolean {
    const darkTechniques = ['destroy', 'control'];
    const darkForms = ['void', 'fear'];

    return (
      darkTechniques.includes(spell.technique) ||
      darkForms.includes(spell.form)
    );
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Lucidity pool - mental clarity
    const lucidityMax = options?.maxOverrides?.lucidity ?? 100;
    const lucidityStart = options?.currentOverrides?.lucidity ?? 80;

    caster.resourcePools.lucidity = {
      type: 'lucidity',
      current: lucidityStart,
      maximum: lucidityMax,
      regenRate: 2, // Recovers through sleep
      locked: 0,
    };

    // Fatigue pool - physical exhaustion (accumulates, lower is better)
    const fatigueMax = options?.maxOverrides?.fatigue ?? 100;

    caster.resourcePools.fatigue = {
      type: 'fatigue',
      current: options?.currentOverrides?.fatigue ?? 0,
      maximum: fatigueMax,
      regenRate: -0.5, // Slowly decreases (recovery)
      locked: 0,
    };

    // Sanity pool (for nightmare magic)
    caster.resourcePools.sanity = {
      type: 'sanity',
      current: options?.currentOverrides?.sanity ?? 100,
      maximum: 100,
      regenRate: 0.1, // Very slow natural recovery
      locked: 0,
    };

    // Set paradigm state
    caster.paradigmState.dream = {
      sleeping: false,
      currentDreamDepth: 0, // 0 = awake, 1-5 = dream levels
      lastSleepStart: 0,
      custom: {
        dreamRealmsVisited: [],
        lucidDreamingExperience: 0,
        nightmareResistance: 0,
      },
    };
  }

  /**
   * Override terminal effect for dream-specific consequences.
   */
  protected override getTerminalEffect(
    costType: string,
    trigger: 'zero' | 'max',
    _caster: MagicComponent
  ): TerminalEffect {
    if (costType === 'lucidity' && trigger === 'zero') {
      return {
        type: 'lucidity_zero',
        trappedInDream: true,
      };
    }

    if (costType === 'fatigue' && trigger === 'max') {
      return {
        type: 'exhaustion',
        cause: 'Physical collapse - forced unconsciousness',
      };
    }

    if (costType === 'sanity' && trigger === 'zero') {
      return {
        type: 'madness',
        madnessType: 'nightmare_induced',
      };
    }

    return super.getTerminalEffect(costType as any, trigger, _caster);
  }

  /**
   * Fatigue is cumulative.
   */
  protected override isCumulativeCost(costType: string): boolean {
    return costType === 'fatigue' || super.isCumulativeCost(costType as any);
  }
}
