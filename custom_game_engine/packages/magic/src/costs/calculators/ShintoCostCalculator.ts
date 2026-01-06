/**
 * ShintoCostCalculator - Cost calculation for Shinto/Kami paradigm
 *
 * Costs: purity (primary), respect (for kami relationships)
 *
 * Shinto magic works with kami spirits:
 * - Purity represents spiritual cleanliness
 * - Pollution reduces magic effectiveness
 * - Respect for kami enables greater powers
 * - Rituals restore purity
 */

import {
  BaseCostCalculator,
  type CastingContext,
  type SpellCost,
  type ResourceInitOptions,
  type TerminalEffect,
} from '../CostCalculator.js';
import type { ComposedSpell, MagicComponent } from '@ai-village/core';

/** Pollution sources that reduce purity */
type PollutionSource = 'death' | 'blood' | 'disease' | 'corruption' | 'violation';

/**
 * Cost calculator for the Shinto/Kami magic paradigm.
 */
export class ShintoCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'shinto';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.shinto;
    const purity = caster.resourcePools.purity?.current ?? 50;

    // =========================================================================
    // Purity Cost (Primary)
    // =========================================================================

    // Base cost depends on spell type
    let purityCost = Math.ceil(spell.manaCost * 0.25);

    // Spells dealing with impure things cost more purity
    if (this.isImpureSpell(spell)) {
      purityCost = Math.ceil(purityCost * 1.5);
    }

    // Spells aligned with nature cost less
    if (this.isNatureAligned(spell)) {
      purityCost = Math.max(0, purityCost - 10);
    }

    // Low purity makes all costs higher
    if (purity < 30) {
      purityCost = Math.ceil(purityCost * 1.3);
    }

    costs.push({
      type: 'purity',
      amount: purityCost,
      source: 'spiritual_channel',
      terminal: true,
    });

    // =========================================================================
    // Respect Cost (For kami-powered spells)
    // =========================================================================

    // If spell requires kami assistance
    if (context.custom?.requiresKami || spell.form === 'spirit') {
      const respectCost = Math.ceil(spell.manaCost * 0.15);
      const kamiId = (state?.activeKamiId ?? 'local_kami') as string;

      costs.push({
        type: 'respect',
        amount: respectCost,
        source: `kami_favor_${kamiId}`,
      });
    }

    return costs;
  }

  /**
   * Check if a spell deals with spiritually impure things.
   */
  private isImpureSpell(spell: ComposedSpell): boolean {
    const impureForms = ['void', 'body']; // Death-related
    const impureTechniques = ['destroy', 'control']; // Forceful manipulation

    return (
      impureForms.includes(spell.form) ||
      impureTechniques.includes(spell.technique)
    );
  }

  /**
   * Check if spell is aligned with nature.
   */
  private isNatureAligned(spell: ComposedSpell): boolean {
    const natureForms = ['plant', 'animal', 'water', 'earth', 'air'];
    const natureTechniques = ['perceive', 'create', 'enhance'];

    return (
      natureForms.includes(spell.form) &&
      natureTechniques.includes(spell.technique)
    );
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Purity pool - starts at 75 (relatively clean)
    const purityMax = options?.maxOverrides?.purity ?? 100;
    const purityCurrent = options?.currentOverrides?.purity ?? 75;

    caster.resourcePools.purity = {
      type: 'purity',
      current: purityCurrent,
      maximum: purityMax,
      regenRate: 0.5, // Slow natural purification
      locked: 0,
    };

    // Respect pool - tracks relationship with kami
    const respectMax = options?.maxOverrides?.respect ?? 100;
    const respectCurrent = options?.currentOverrides?.respect ?? 30;

    caster.resourcePools.respect = {
      type: 'respect',
      current: respectCurrent,
      maximum: respectMax,
      regenRate: 0, // Must earn through offerings
      locked: 0,
    };

    // Set paradigm state
    caster.paradigmState.shinto = {
      activeKamiId: undefined,
      pollutionSources: [] as PollutionSource[],
      lastPurificationRitual: 0,
      custom: {
        offeringsMade: 0,
        shrinesVisited: [],
        kamiRelationships: {},
      },
    };
  }

  /**
   * Override terminal effect for shinto-specific consequences.
   */
  protected override getTerminalEffect(
    costType: string,
    trigger: 'zero' | 'max',
    _caster: MagicComponent
  ): TerminalEffect {
    if (costType === 'purity' && trigger === 'zero') {
      return {
        type: 'purity_zero',
        pollution: 'spiritual_defilement',
      };
    }

    if (costType === 'respect' && trigger === 'zero') {
      return {
        type: 'respect_zero',
        offendedKami: 'unknown',
      };
    }

    return super.getTerminalEffect(costType as any, trigger, _caster);
  }
}
