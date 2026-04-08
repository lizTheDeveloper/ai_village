/**
 * FerromancyCostCalculator - Cost calculation for Ferromancy paradigm (CrucibleBorn style)
 *
 * Costs: metal_reserves (primary), physical strain
 *
 * Ferromancy burns metals for power:
 * - Each metal grants specific abilities
 * - Must have ingested the metal to burn it
 * - Burn rate determines power output
 * - Flaring increases power but burns metal faster
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

/** Ferromancy metals */
type FerromancyMetal =
  | 'iron' | 'steel'      // Physical pushing/pulling
  | 'tin' | 'pewter'      // Physical enhancement
  | 'zinc' | 'brass'      // Emotional manipulation
  | 'copper' | 'bronze'   // Mental ferromancy
  | 'gold' | 'electrum'   // Temporal
  | 'chromium' | 'nicrosil' // Enhancement
  | 'cadmium' | 'bendalloy' // Temporal
  | 'aluminum' | 'amplium' // God metals
  | 'temporite' | 'chorium';    // God metals

/** Burn rate affects power vs consumption */
type BurnRate = 'gentle' | 'normal' | 'flared' | 'amplium_boosted';

const BURN_RATE_MULTIPLIERS: Record<BurnRate, { power: number; cost: number }> = {
  gentle: { power: 0.5, cost: 0.3 },
  normal: { power: 1.0, cost: 1.0 },
  flared: { power: 2.0, cost: 3.0 },
  amplium_boosted: { power: 10.0, cost: 100.0 }, // All at once
};

/**
 * Cost calculator for the Ferromancy magic paradigm.
 */
export class FerromancyCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'ferromancy';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.ferromancy;
    const burnRate = (context.custom?.burnRate ?? 'normal') as BurnRate;
    const metal = this.getRequiredMetal(spell);

    // =========================================================================
    // Metal Reserve Cost (Primary)
    // =========================================================================

    const rateModifier = BURN_RATE_MULTIPLIERS[burnRate] ?? BURN_RATE_MULTIPLIERS.normal;
    let metalCost = Math.ceil(spell.manaCost * 0.5 * rateModifier.cost);

    // God metals are more efficient but rarer
    if (metal === 'temporite' || metal === 'chorium') {
      metalCost = Math.ceil(metalCost * 0.3);
    }

    costs.push({
      type: `metal_${metal}`,
      amount: metalCost,
      source: 'metal_burning',
      terminal: true,
    });

    // =========================================================================
    // Physical Strain (For pewter-burning and flaring)
    // =========================================================================

    if (metal === 'pewter' || burnRate === 'flared') {
      const strainCost = burnRate === 'flared' ? 10 : 5;
      costs.push({
        type: 'strain',
        amount: strainCost,
        source: 'physical_exertion',
      });
    }

    // =========================================================================
    // Amplium Burn (Special: burns all at once)
    // =========================================================================

    if (burnRate === 'amplium_boosted') {
      // Amplium itself is consumed
      costs.push({
        type: 'metal_amplium',
        amount: 20,
        source: 'amplium_burn',
        terminal: true,
      });
    }

    // =========================================================================
    // Savant Reduction (Long-term burners get efficiency)
    // =========================================================================

    const savantLevel = (state?.savantLevels?.[metal] ?? 0) as number;
    if (savantLevel > 0) {
      const reduction = Math.min(savantLevel * 2, 20);
      costs.push({
        type: `metal_${metal}`,
        amount: -reduction,
        source: 'savant_efficiency',
      });
    }

    return costs;
  }

  /**
   * Determine which metal a spell requires based on its form/technique.
   */
  private getRequiredMetal(spell: ComposedSpell): FerromancyMetal {
    // Map spell forms to metals
    const formToMetal: Record<string, FerromancyMetal> = {
      metal: 'steel',
      body: 'pewter',
      mind: 'copper',
      fire: 'brass', // Emotional
      spirit: 'bronze',
      time: 'cadmium',
    };

    const techniqueToMetal: Record<string, FerromancyMetal> = {
      push: 'steel',
      pull: 'iron',
      enhance: 'pewter',
      perceive: 'tin',
      control: 'zinc',
      protect: 'copper',
    };

    return (
      techniqueToMetal[spell.technique] ??
      formToMetal[spell.form] ??
      'steel'
    );
  }

  initializeResourcePools(
    caster: MagicComponent,
    _options?: ResourceInitOptions
  ): void {
    // Initialize common metal reserves
    const baseMetal = 100; // Default metal capacity
    const metals: FerromancyMetal[] = ['iron', 'steel', 'tin', 'pewter', 'zinc', 'brass', 'copper', 'bronze'];

    for (const metal of metals) {
      const metalType = `metal_${metal}` as const;
      caster.resourcePools[metalType] = {
        type: metalType,
        current: Math.floor(baseMetal / 2),
        maximum: baseMetal,
        regenRate: 0, // Must ingest metals
        locked: 0,
      };
    }

    // Physical strain pool
    caster.resourcePools.strain = {
      type: 'strain',
      current: 0,
      maximum: 100,
      regenRate: -1, // Slowly recovers
      locked: 0,
    };

    // Set paradigm state
    caster.paradigmState.ferromancy = {
      ore_attunedType: undefined, // Or specific metal if ore_attuned
      isSavant: false,
      savantLevels: {} as Record<FerromancyMetal, number>,
      custom: {
        metalsBurned: 0,
        ampliumBurns: 0,
        pewterDragging: false,
      },
    };
  }

  /**
   * Override terminal effect for ferromancy-specific consequences.
   */
  protected override getTerminalEffect(
    costType: MagicCostType,
    trigger: 'zero' | 'max',
    _caster: MagicComponent
  ): TerminalEffect {
    if (costType.startsWith('metal_') && trigger === 'zero') {
      const metal = costType.replace('metal_', '');
      return {
        type: 'metal_depleted',
        metalType: metal,
      };
    }

    if (costType === 'strain' && trigger === 'max') {
      return {
        type: 'pewter_collapse',
        cause: 'Physical collapse from over-exertion',
      };
    }

    return super.getTerminalEffect(costType, trigger, _caster);
  }

  /**
   * Strain is cumulative.
   */
  protected override isCumulativeCost(costType: MagicCostType): boolean {
    return costType === 'strain' || super.isCumulativeCost(costType);
  }
}
