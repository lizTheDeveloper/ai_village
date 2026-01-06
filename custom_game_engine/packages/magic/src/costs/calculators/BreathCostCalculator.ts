/**
 * BreathCostCalculator - Cost calculation for Breath/BioChromatic paradigm
 *
 * Costs: health (represents Breaths - units of life essence)
 *
 * Breath magic (Warbreaker-inspired):
 * - Everyone is born with 1 Breath
 * - Breaths can be given, stored, stolen
 * - Simple commands cost 0 Breaths (use existing Awakened)
 * - Awakening objects consumes Breaths
 * - Permanent Awakening is expensive
 * - At 0 Breaths = Drab (grey, emotionally muted)
 * - Heightening tiers unlock at: 50, 200, 600, 1000, 2000, 10000, 50000
 */

import {
  BaseCostCalculator,
  type CastingContext,
  type SpellCost,
  type ResourceInitOptions,
  type TerminalEffect,
  type AffordabilityResult,
} from '../CostCalculator.js';
import type { ComposedSpell, MagicComponent } from '@ai-village/core';

/** Heightening tier thresholds */
const HEIGHTENING_THRESHOLDS = [50, 200, 600, 1000, 2000, 10000, 50000];

/**
 * Cost calculator for the Breath/BioChromatic magic paradigm.
 */
export class BreathCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'breath';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    _context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];

    // Breath cost varies dramatically by spell type
    let breathCost = this.calculateBreathCost(spell, caster);

    // Always include breath cost (even if 0) to show it was calculated
    costs.push({
      type: 'health', // Using health as Breaths
      amount: breathCost,
      source: this.getBreathSource(spell),
      terminal: breathCost > 0, // 0 Breaths = Drab (only terminal if actually costing)
    });

    return costs;
  }

  /**
   * Calculate Breath cost based on spell type.
   */
  private calculateBreathCost(spell: ComposedSpell, _caster: MagicComponent): number {
    // Commanding existing Awakened objects: 0 Breaths
    if (spell.technique === 'control' && spell.effectId?.includes('command')) {
      return 0;
    }

    // Basic Awakening (temporary)
    if (spell.technique === 'enhance' || spell.technique === 'control') {
      // Temporary effects scale with power
      return Math.max(1, Math.ceil(spell.manaCost / 10));
    }

    // Creation or Transformation
    if (spell.technique === 'create' || spell.technique === 'transform') {
      // Permanent Awakening is expensive
      if (spell.duration === undefined) {
        // Permanent: high cost, scales with power
        const baseCost = Math.max(50, spell.manaCost);

        // Lifeless (simple commands) are cheaper
        if (spell.effectId?.includes('lifeless')) {
          return Math.ceil(baseCost * 0.5);
        }

        // Full sentience is most expensive
        if (spell.effectId?.includes('sentient')) {
          return baseCost * 2;
        }

        return baseCost;
      } else {
        // Temporary effects
        return Math.ceil(spell.manaCost / 5);
      }
    }

    // Other techniques (perceive, etc.)
    return Math.max(1, Math.ceil(spell.manaCost / 20));
  }

  /**
   * Get the source description for Breath costs.
   */
  private getBreathSource(spell: ComposedSpell): string {
    if (spell.duration === undefined) {
      if (spell.effectId?.includes('sentient')) {
        return 'sentient_awakening';
      }
      return 'permanent_awakening';
    }
    return 'breath_investment';
  }

  /**
   * Override affordability check with Drab warning.
   */
  override canAfford(costs: SpellCost[], caster: MagicComponent): AffordabilityResult {
    const result = super.canAfford(costs, caster);

    const breathCost = costs.find(c => c.type === 'health')?.amount ?? 0;
    const state = caster.paradigmState?.breath;
    const currentBreaths = (state?.breathCount as number) ?? caster.resourcePools.health?.current ?? 1;

    // Add warning if this would reduce to 0 Breaths
    if (currentBreaths - breathCost <= 0) {
      result.wouldBeTerminal = true;
      result.warning = 'This will drain all your Breaths and make you a Drab!';
    } else if (currentBreaths - breathCost < 10) {
      result.warning = 'You will have very few Breaths remaining.';
    }

    // Check if this would drop a Heightening tier
    const currentTier = this.getHeighteningTier(currentBreaths);
    const afterTier = this.getHeighteningTier(currentBreaths - breathCost);
    if (afterTier < currentTier) {
      const tierWarning = `This will drop you from ${this.getTierName(currentTier)} to ${this.getTierName(afterTier)}.`;
      result.warning = result.warning ? `${result.warning} ${tierWarning}` : tierWarning;
    }

    return result;
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Health pool represents Breaths
    // Everyone starts with 1 Breath, max is unlimited
    const breathsMax = options?.maxOverrides?.health ?? 50000;
    const breathsCurrent = options?.currentOverrides?.health ?? 1;

    caster.resourcePools.health = {
      type: 'health',
      current: breathsCurrent,
      maximum: breathsMax,
      regenRate: 0, // Breaths don't regenerate
      locked: 0,
    };

    // Calculate initial Heightening tier
    const tier = this.getHeighteningTier(breathsCurrent);

    // Set paradigm state
    caster.paradigmState.breath = {
      breathCount: breathsCurrent,
      heighteningTier: tier,
      custom: {
        awakenedObjects: [], // Track Awakened items
        colorDrained: 0, // Track color consumed
      },
    };
  }

  /**
   * Get Heightening tier for a Breath count.
   */
  private getHeighteningTier(breaths: number): number {
    for (let i = HEIGHTENING_THRESHOLDS.length - 1; i >= 0; i--) {
      const threshold = HEIGHTENING_THRESHOLDS[i];
      if (threshold !== undefined && breaths >= threshold) {
        return i + 1;
      }
    }
    return 0;
  }

  /**
   * Get tier name.
   */
  private getTierName(tier: number): string {
    const names = [
      'Drab',
      'First Heightening',
      'Second Heightening',
      'Third Heightening',
      'Fourth Heightening',
      'Fifth Heightening',
      'Sixth Heightening',
      'Seventh Heightening',
    ];
    return names[tier] ?? `Tier ${tier}`;
  }

  /**
   * Override terminal effect for Breath-specific consequences.
   */
  protected override getTerminalEffect(
    costType: string,
    trigger: 'zero' | 'max',
    caster: MagicComponent
  ): TerminalEffect {
    if (costType === 'health') {
      return {
        type: 'drab',
        breathsRemaining: 0,
      };
    }
    return super.getTerminalEffect(costType as any, trigger, caster);
  }
}
