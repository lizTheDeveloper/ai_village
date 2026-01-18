/**
 * NameCostCalculator - Cost calculation for True Name/Deep Grammar paradigm
 *
 * Costs: time (cast time), sanity (mental strain), attention (cumulative)
 *
 * Name magic is knowledge-based, not pool-based:
 * - Time cost is actual casting duration (not deducted from pool)
 * - Sanity cost represents mental strain of holding true names
 * - Attention accumulates and attracts "listeners" at thresholds
 * - Sanity recovers via rest; attention decays over time
 */

import {
  BaseCostCalculator,
  type CastingContext,
  type SpellCost,
  type ResourceInitOptions,
  type TerminalEffect,
} from '../CostCalculator.js';
import type { ComposedSpell, MagicComponent } from '../../../components/MagicComponent.js';
import type { MagicCostType } from '../../MagicParadigm.js';

/**
 * Cost calculator for the True Name/Deep Grammar magic paradigm.
 */
export class NameCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'names';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    _context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.names;
    const knownNames = (state?.knownNames as string[])?.length ?? 0;

    // =========================================================================
    // Time Cost (Informational - affects cast time)
    // =========================================================================

    // More names known = more complex mental state = longer casting
    const timeMultiplier = 1 + (knownNames * 0.05);
    const timeCost = Math.ceil(spell.castTime * timeMultiplier);

    costs.push({
      type: 'time',
      amount: timeCost,
      source: 'name_complexity',
    });

    // =========================================================================
    // Sanity Cost (Mental strain of holding names)
    // =========================================================================

    // Base sanity cost scales with spell power
    let sanityCost = Math.ceil(spell.manaCost * 0.1);

    // Speaking powerful names (high mana cost) is more taxing
    if (spell.manaCost > 30) {
      sanityCost += Math.ceil((spell.manaCost - 30) * 0.05);
    }

    // More names known increases mental strain
    if (knownNames > 10) {
      sanityCost = Math.ceil(sanityCost * (1 + (knownNames - 10) * 0.02));
    }

    costs.push({
      type: 'sanity',
      amount: sanityCost,
      source: 'holding_names',
      terminal: true, // 0 sanity = madness
    });

    // =========================================================================
    // Attention (Cumulative - draws listeners)
    // =========================================================================

    // Speaking names always draws some attention
    let attentionGain = 1;

    // More powerful names draw more attention
    if (spell.manaCost > 20) {
      attentionGain += Math.floor(spell.manaCost / 20);
    }

    // Spirit and void forms draw extra attention
    if (spell.form === 'spirit' || spell.form === 'void') {
      attentionGain *= 2;
    }

    costs.push({
      type: 'attention',
      amount: attentionGain,
      source: 'speaking_names',
    });

    return costs;
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Sanity pool
    const sanityMax = options?.maxOverrides?.sanity ?? 100;
    const sanityCurrent = options?.currentOverrides?.sanity ?? sanityMax;
    const sanityRegen = options?.regenOverrides?.sanity ?? 0.005;

    caster.resourcePools.sanity = {
      type: 'sanity',
      current: sanityCurrent,
      maximum: sanityMax,
      regenRate: sanityRegen, // Slow passive recovery
      locked: 0,
    };

    // Attention pool - starts at 0, decays over time
    const attentionMax = options?.maxOverrides?.attention ?? 100;

    caster.resourcePools.attention = {
      type: 'attention',
      current: options?.currentOverrides?.attention ?? 0,
      maximum: attentionMax,
      regenRate: -0.001, // Negative = decay over time
      locked: 0,
    };

    // Set paradigm state
    caster.paradigmState.names = {
      knownNames: [],
      custom: {
        attentionThresholds: {
          10: 'minor_listeners', // Small spirits notice
          25: 'moderate_listeners', // Named entities notice
          50: 'major_listeners', // Powerful beings notice
          75: 'ancient_listeners', // Ancient powers notice
        },
        lastAttentionEvent: undefined,
      },
    };
  }

  /**
   * Override terminal effect for name-specific consequences.
   */
  protected override getTerminalEffect(
    costType: MagicCostType,
    trigger: 'zero' | 'max',
    caster: MagicComponent
  ): TerminalEffect {
    switch (costType) {
      case 'sanity':
        return {
          type: 'sanity_zero',
          madnessType: 'name_madness', // Speaks in true names uncontrollably
        };
      case 'attention':
        // Attention at max doesn't cause terminal effect directly,
        // but triggers risk events
        return {
          type: 'death',
          cause: 'Consumed by entities drawn to your voice',
        };
      default:
        return super.getTerminalEffect(costType, trigger, caster);
    }
  }

  /**
   * Override cumulative check - attention is cumulative.
   */
  protected override isCumulativeCost(costType: MagicCostType): boolean {
    return costType === 'attention' || super.isCumulativeCost(costType);
  }
}
