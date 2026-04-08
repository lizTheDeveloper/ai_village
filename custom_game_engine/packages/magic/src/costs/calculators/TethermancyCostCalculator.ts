/**
 * TethermancyCostCalculator - Cost calculation for Tethermancy paradigm (Chorus of Resonance style)
 *
 * Costs: attunement (mental focus), drift (heat/energy loss), links
 *
 * Tethermancy magic works through connections:
 * - Attunement is the mental focus maintaining the binding
 * - Drift is energy lost as heat
 * - Better link quality reduces drift
 * - Multiple bindings divide attunement
 */

import {
  BaseCostCalculator,
  type CastingContext,
  type SpellCost,
  type ResourceInitOptions,
  type TerminalEffect,
} from '../CostCalculator.js';
import type { MagicCostType } from '../../MagicParadigm.js';
import type { ComposedSpell, MagicComponent } from '@ai-village/core';

/** Link quality affects efficiency */
type LinkQuality = 'poor' | 'moderate' | 'good' | 'excellent' | 'perfect';

const LINK_EFFICIENCY: Record<LinkQuality, number> = {
  poor: 0.1,      // 90% drift
  moderate: 0.3,  // 70% drift
  good: 0.5,      // 50% drift
  excellent: 0.7, // 30% drift
  perfect: 0.9,   // 10% drift
};

/**
 * Cost calculator for the Tethermancy magic paradigm.
 */
export class TethermancyCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'tethermancy';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.tethermancy;
    const activeBindings = (state?.activeBindings ?? 0) as number;
    const linkQuality = (context.custom?.linkQuality ?? 'moderate') as LinkQuality;

    // =========================================================================
    // Attunement Cost (Mental focus)
    // =========================================================================

    let attunementCost = Math.ceil(spell.manaCost * 0.4);

    // Multiple bindings divide concentration
    if (activeBindings > 0) {
      attunementCost = Math.ceil(attunementCost * (1 + activeBindings * 0.3));
    }

    // Some techniques require more focus
    // 'control' encompasses binding operations in tethermancy magic
    if (spell.technique === 'control') {
      attunementCost = Math.ceil(attunementCost * 1.3);
    }

    costs.push({
      type: 'attunement',
      amount: attunementCost,
      source: 'mental_binding',
      terminal: true,
    });

    // =========================================================================
    // Drift Cost (Energy lost as heat)
    // =========================================================================

    const efficiency = LINK_EFFICIENCY[linkQuality] ?? 0.3;
    const driftRate = 1 - efficiency;

    // Drift is proportional to energy moved through the link
    let driftCost = Math.ceil(spell.manaCost * driftRate);

    // Fire spells have less drift (already heat)
    if (spell.form === 'fire') {
      driftCost = Math.ceil(driftCost * 0.5);
    }

    // Cold/water spells have more drift (cooling requires energy)
    if (spell.form === 'water') {
      driftCost = Math.ceil(driftCost * 1.5);
    }

    costs.push({
      type: 'drift',
      amount: driftCost,
      source: 'binding_inefficiency',
    });

    // =========================================================================
    // Link Cost (Using link materials)
    // =========================================================================

    if (!context.custom?.hasEstablishedLink) {
      // Need to create a new link
      costs.push({
        type: 'link_material',
        amount: 1,
        source: 'sympathetic_link',
      });
    }

    return costs;
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Attunement pool - mental focus capacity
    const attunementMax = options?.maxOverrides?.attunement ?? 100;
    const attunementStart = options?.currentOverrides?.attunement ?? 80;

    caster.resourcePools.attunement = {
      type: 'attunement',
      current: attunementStart,
      maximum: attunementMax,
      regenRate: 1, // Moderate recovery
      locked: 0,
    };

    // Drift accumulation (heat buildup in body)
    caster.resourcePools.drift = {
      type: 'drift',
      current: options?.currentOverrides?.drift ?? 0,
      maximum: options?.maxOverrides?.drift ?? 100,
      regenRate: -2, // Dissipates naturally
      locked: 0,
    };

    // Link materials available
    caster.resourcePools.link_material = {
      type: 'link_material',
      current: options?.currentOverrides?.link_material ?? 10,
      maximum: options?.maxOverrides?.link_material ?? 50,
      regenRate: 0, // Must collect
      locked: 0,
    };

    // Set paradigm state
    caster.paradigmState.tethermancy = {
      activeBindings: 0,
      currentLinks: [],
      custom: {
        attunementStrength: 50, // Base mental strength
        bindingExperience: 0,
        knownBindingPrinciples: [],
      },
    };
  }

  /**
   * Override terminal effect for tethermancy-specific consequences.
   */
  protected override getTerminalEffect(
    costType: MagicCostType,
    trigger: 'zero' | 'max',
    _caster: MagicComponent
  ): TerminalEffect {
    if (costType === 'attunement' && trigger === 'zero') {
      return {
        type: 'attunement_break',
        cause: 'Mind cracked - all bindings shatter, stunned',
      };
    }

    if (costType === 'drift' && trigger === 'max') {
      return {
        type: 'drift_burn',
        severity: 'critical',
      };
    }

    return super.getTerminalEffect(costType, trigger, _caster);
  }

  /**
   * Drift is cumulative.
   */
  protected override isCumulativeCost(costType: MagicCostType): boolean {
    return costType === 'drift' || super.isCumulativeCost(costType);
  }
}
