/**
 * SympathyCostCalculator - Cost calculation for Sympathy paradigm (Name of the Wind style)
 *
 * Costs: alar (mental focus), slippage (heat/energy loss), links
 *
 * Sympathy magic works through connections:
 * - Alar is the mental focus maintaining the binding
 * - Slippage is energy lost as heat
 * - Better link quality reduces slippage
 * - Multiple bindings divide alar
 */

import {
  BaseCostCalculator,
  type CastingContext,
  type SpellCost,
  type ResourceInitOptions,
  type TerminalEffect,
} from '../CostCalculator.js';
import type { MagicCostType } from '../MagicParadigm.js';
import type { ComposedSpell, MagicComponent } from '@ai-village/core';

/** Link quality affects efficiency */
type LinkQuality = 'poor' | 'moderate' | 'good' | 'excellent' | 'perfect';

const LINK_EFFICIENCY: Record<LinkQuality, number> = {
  poor: 0.1,      // 90% slippage
  moderate: 0.3,  // 70% slippage
  good: 0.5,      // 50% slippage
  excellent: 0.7, // 30% slippage
  perfect: 0.9,   // 10% slippage
};

/**
 * Cost calculator for the Sympathy magic paradigm.
 */
export class SympathyCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'sympathy';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.sympathy;
    const activeBindings = (state?.activeBindings ?? 0) as number;
    const linkQuality = (context.custom?.linkQuality ?? 'moderate') as LinkQuality;

    // =========================================================================
    // Alar Cost (Mental focus)
    // =========================================================================

    let alarCost = Math.ceil(spell.manaCost * 0.4);

    // Multiple bindings divide concentration
    if (activeBindings > 0) {
      alarCost = Math.ceil(alarCost * (1 + activeBindings * 0.3));
    }

    // Some techniques require more focus
    // 'control' encompasses binding operations in sympathy magic
    if (spell.technique === 'control') {
      alarCost = Math.ceil(alarCost * 1.3);
    }

    costs.push({
      type: 'alar',
      amount: alarCost,
      source: 'mental_binding',
      terminal: true,
    });

    // =========================================================================
    // Slippage Cost (Energy lost as heat)
    // =========================================================================

    const efficiency = LINK_EFFICIENCY[linkQuality] ?? 0.3;
    const slippageRate = 1 - efficiency;

    // Slippage is proportional to energy moved through the link
    let slippageCost = Math.ceil(spell.manaCost * slippageRate);

    // Fire spells have less slippage (already heat)
    if (spell.form === 'fire') {
      slippageCost = Math.ceil(slippageCost * 0.5);
    }

    // Cold/water spells have more slippage (cooling requires energy)
    if (spell.form === 'water') {
      slippageCost = Math.ceil(slippageCost * 1.5);
    }

    costs.push({
      type: 'slippage',
      amount: slippageCost,
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
    // Alar pool - mental focus capacity
    const alarMax = options?.maxOverrides?.alar ?? 100;
    const alarStart = options?.currentOverrides?.alar ?? 80;

    caster.resourcePools.alar = {
      type: 'alar',
      current: alarStart,
      maximum: alarMax,
      regenRate: 1, // Moderate recovery
      locked: 0,
    };

    // Slippage accumulation (heat buildup in body)
    caster.resourcePools.slippage = {
      type: 'slippage',
      current: options?.currentOverrides?.slippage ?? 0,
      maximum: options?.maxOverrides?.slippage ?? 100,
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
    caster.paradigmState.sympathy = {
      activeBindings: 0,
      currentLinks: [],
      custom: {
        alarStrength: 50, // Base mental strength
        bindingExperience: 0,
        knownBindingPrinciples: [],
      },
    };
  }

  /**
   * Override terminal effect for sympathy-specific consequences.
   */
  protected override getTerminalEffect(
    costType: MagicCostType,
    trigger: 'zero' | 'max',
    _caster: MagicComponent
  ): TerminalEffect {
    if (costType === 'alar' && trigger === 'zero') {
      return {
        type: 'alar_break',
        cause: 'Mind cracked - all bindings shatter, stunned',
      };
    }

    if (costType === 'slippage' && trigger === 'max') {
      return {
        type: 'slippage_burn',
        severity: 'critical',
      };
    }

    return super.getTerminalEffect(costType, trigger, _caster);
  }

  /**
   * Slippage is cumulative.
   */
  protected override isCumulativeCost(costType: MagicCostType): boolean {
    return costType === 'slippage' || super.isCumulativeCost(costType);
  }
}
