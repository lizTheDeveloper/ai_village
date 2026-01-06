/**
 * AllomancyCostCalculator - Cost calculation for Allomancy paradigm (Mistborn style)
 *
 * Costs: metal_reserves (primary), physical strain
 *
 * Allomancy burns metals for power:
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
import type { ComposedSpell, MagicComponent } from '@ai-village/core';

/** Allomantic metals */
type AllomanticMetal =
  | 'iron' | 'steel'      // Physical pushing/pulling
  | 'tin' | 'pewter'      // Physical enhancement
  | 'zinc' | 'brass'      // Emotional manipulation
  | 'copper' | 'bronze'   // Mental allomancy
  | 'gold' | 'electrum'   // Temporal
  | 'chromium' | 'nicrosil' // Enhancement
  | 'cadmium' | 'bendalloy' // Temporal
  | 'aluminum' | 'duralumin' // God metals
  | 'atium' | 'lerasium';    // God metals

/** Burn rate affects power vs consumption */
type BurnRate = 'gentle' | 'normal' | 'flared' | 'duralumin_boosted';

const BURN_RATE_MULTIPLIERS: Record<BurnRate, { power: number; cost: number }> = {
  gentle: { power: 0.5, cost: 0.3 },
  normal: { power: 1.0, cost: 1.0 },
  flared: { power: 2.0, cost: 3.0 },
  duralumin_boosted: { power: 10.0, cost: 100.0 }, // All at once
};

/**
 * Cost calculator for the Allomancy magic paradigm.
 */
export class AllomancyCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'allomancy';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.allomancy;
    const burnRate = (context.custom?.burnRate ?? 'normal') as BurnRate;
    const metal = this.getRequiredMetal(spell);

    // =========================================================================
    // Metal Reserve Cost (Primary)
    // =========================================================================

    const rateModifier = BURN_RATE_MULTIPLIERS[burnRate] ?? BURN_RATE_MULTIPLIERS.normal;
    let metalCost = Math.ceil(spell.manaCost * 0.5 * rateModifier.cost);

    // God metals are more efficient but rarer
    if (metal === 'atium' || metal === 'lerasium') {
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
    // Duralumin Burn (Special: burns all at once)
    // =========================================================================

    if (burnRate === 'duralumin_boosted') {
      // Duralumin itself is consumed
      costs.push({
        type: 'metal_duralumin',
        amount: 20,
        source: 'duralumin_burn',
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
  private getRequiredMetal(spell: ComposedSpell): AllomanticMetal {
    // Map spell forms to metals
    const formToMetal: Record<string, AllomanticMetal> = {
      metal: 'steel',
      body: 'pewter',
      mind: 'copper',
      fire: 'brass', // Emotional
      spirit: 'bronze',
      time: 'cadmium',
    };

    const techniqueToMetal: Record<string, AllomanticMetal> = {
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
    const metals: AllomanticMetal[] = ['iron', 'steel', 'tin', 'pewter', 'zinc', 'brass', 'copper', 'bronze'];

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
    caster.paradigmState.allomancy = {
      mistingType: undefined, // Or specific metal if misting
      isSavant: false,
      savantLevels: {} as Record<AllomanticMetal, number>,
      custom: {
        metalsBurned: 0,
        duraluminBurns: 0,
        pewterDragging: false,
      },
    };
  }

  /**
   * Override terminal effect for allomancy-specific consequences.
   */
  protected override getTerminalEffect(
    costType: string,
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

    return super.getTerminalEffect(costType as any, trigger, _caster);
  }

  /**
   * Strain is cumulative.
   */
  protected override isCumulativeCost(costType: string): boolean {
    return costType === 'strain' || super.isCumulativeCost(costType as any);
  }
}
