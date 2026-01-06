/**
 * DivineCastingCalculator - Cost calculation for Gods using mortal magic
 *
 * Gods can use ANY mortal magic paradigm, but pay with belief instead.
 *
 * Key characteristics:
 * - Mortal magic is trivially easy for gods
 * - Cost is a tiny fraction of what mortals pay, converted to belief
 * - If witnesses see the miracle, gods GAIN belief
 * - Net effect is usually positive (more belief gained than spent)
 * - No witnesses = no belief gain (just the cost)
 */

import {
  BaseCostCalculator,
  type CastingContext,
  type SpellCost,
  type ResourceInitOptions,
} from '../CostCalculator.js';
import type { ComposedSpell, MagicComponent } from '@ai-village/core';

/**
 * Extended context for divine casting that includes witness information.
 */
export interface DivineCastingContext extends CastingContext {
  /** Entity IDs who can perceive this miracle */
  witnessIds: string[];

  /** Devotion levels of each witness to this deity (0-1) */
  witnessDevotions: number[];

  /** The deity ID performing the miracle */
  deityId: string;
}

/**
 * Result of a divine miracle including belief economics.
 */
export interface DivineMiracleResult {
  /** Belief spent to perform the miracle */
  beliefSpent: number;

  /** Belief gained from witnesses */
  beliefGained: number;

  /** Net belief change */
  netBelief: number;

  /** Whether the miracle was witnessed by anyone */
  wasWitnessed: boolean;

  /** Individual belief gains per witness */
  witnessContributions: { witnessId: string; beliefGained: number }[];
}

/**
 * Cost calculator for gods using mortal magic.
 *
 * This is a special calculator that:
 * 1. Converts mortal spell costs to a tiny belief cost
 * 2. Calculates belief gained from witnesses
 * 3. Tracks net belief change
 */
export class DivineCastingCalculator extends BaseCostCalculator {
  readonly paradigmId = 'divine_casting';

  /**
   * Belief cost is a tiny fraction of mortal cost.
   * Base formula: total_mortal_cost * 0.001 = belief_cost
   */
  private readonly MORTAL_TO_BELIEF_RATIO = 0.001;

  /**
   * Minimum belief cost for any spell.
   */
  private readonly MIN_BELIEF_COST = 1;

  calculateCosts(
    spell: ComposedSpell,
    _caster: MagicComponent,
    _context: CastingContext
  ): SpellCost[] {
    // Estimate what a mortal would pay
    const mortalCost = this.estimateMortalCost(spell);

    // Gods pay a tiny fraction in belief
    const beliefCost = Math.max(
      this.MIN_BELIEF_COST,
      Math.ceil(mortalCost * this.MORTAL_TO_BELIEF_RATIO)
    );

    return [{
      type: 'belief',
      amount: beliefCost,
      source: 'divine_channeling',
    }];
  }

  /**
   * Calculate the complete miracle result including witness belief gains.
   * This is the main method to use for divine magic.
   */
  calculateMiracleResult(
    spell: ComposedSpell,
    context: DivineCastingContext
  ): DivineMiracleResult {
    // Calculate belief cost
    const costs = this.calculateCosts(spell, {} as MagicComponent, context);
    const beliefSpent = costs.find(c => c.type === 'belief')?.amount ?? this.MIN_BELIEF_COST;

    // Calculate belief gained from witnesses
    const { totalGain, contributions } = this.calculateBeliefGain(
      spell,
      context.witnessIds,
      context.witnessDevotions
    );

    return {
      beliefSpent,
      beliefGained: totalGain,
      netBelief: totalGain - beliefSpent,
      wasWitnessed: context.witnessIds.length > 0,
      witnessContributions: contributions,
    };
  }

  /**
   * Calculate belief gained from witnesses seeing the miracle.
   *
   * Each witness generates belief based on:
   * - Their existing devotion to this deity
   * - The impressiveness of the spell (spectacle multiplier)
   * - The power of the spell
   */
  calculateBeliefGain(
    spell: ComposedSpell,
    witnessIds: string[],
    witnessDevotions: number[]
  ): { totalGain: number; contributions: { witnessId: string; beliefGained: number }[] } {
    if (witnessIds.length === 0) {
      return { totalGain: 0, contributions: [] };
    }

    const spectacleMultiplier = this.getSpectacleMultiplier(spell);
    const basePower = spell.manaCost;
    const contributions: { witnessId: string; beliefGained: number }[] = [];
    let totalGain = 0;

    for (let i = 0; i < witnessIds.length; i++) {
      const witnessId = witnessIds[i]!;
      const devotion = witnessDevotions[i] ?? 0.1; // Default 10% devotion for unbelievers

      // Base gain: 1-5 per witness depending on spell power
      // Multiplied by devotion (0-1) and spectacle
      // High devotion = more impressed by miracles
      // But even low devotion gives some gain (people notice miracles!)

      const baseGain = 1 + (basePower * 0.1);
      const devotionFactor = 0.3 + (devotion * 0.7); // 30% even for non-believers, up to 100%
      const witnessGain = Math.ceil(baseGain * devotionFactor * spectacleMultiplier);

      contributions.push({ witnessId, beliefGained: witnessGain });
      totalGain += witnessGain;
    }

    return { totalGain, contributions };
  }

  /**
   * Get spectacle multiplier based on how impressive the spell is.
   * More dramatic effects generate more belief from witnesses.
   */
  private getSpectacleMultiplier(spell: ComposedSpell): number {
    const techniqueMultipliers: Record<string, number> = {
      create: 1.5,     // Creation is impressive
      destroy: 1.2,    // Destruction is dramatic
      transform: 1.3,  // Transformation is magical
      protect: 0.8,    // Subtle, less impressive
      enhance: 0.9,    // Not very visible
      summon: 2.0,     // Summoning is VERY impressive
      perceive: 0.5,   // Not visually impressive
      control: 1.0,    // Depends on what's controlled
    };

    const formMultipliers: Record<string, number> = {
      fire: 1.5,       // Fire is dramatic
      water: 1.2,      // Water is impressive
      earth: 1.0,      // Earth is solid
      air: 1.1,        // Wind effects
      body: 1.3,       // Healing is impressive
      mind: 0.5,       // Invisible effect
      spirit: 1.8,     // Very impressive
      plant: 0.9,      // Nature magic
      animal: 1.2,     // Animal effects
      image: 1.4,      // Illusions are impressive
      void: 2.0,       // Terrifying and impressive
      time: 2.5,       // Extremely impressive
      space: 2.5,      // Extremely impressive
      metal: 1.1,      // Metalworking
    };

    const techMult = techniqueMultipliers[spell.technique] ?? 1.0;
    const formMult = formMultipliers[spell.form] ?? 1.0;

    return techMult * formMult;
  }

  /**
   * Estimate what a mortal would pay for this spell.
   * This is used to calculate the god's (much smaller) belief cost.
   */
  private estimateMortalCost(spell: ComposedSpell): number {
    // Base cost is the mana cost
    let cost = spell.manaCost;

    // Add secondary costs based on spell type
    // (These would be more accurate if we knew the paradigm)

    // Long duration spells have additional sustaining cost
    if (spell.duration && spell.duration > 30) {
      cost += spell.duration * 0.1;
    }

    // Cast time represents effort
    cost += spell.castTime * 0.5;

    return cost;
  }

  /**
   * Gods don't use standard resource pools.
   * Belief is tracked at the deity component level.
   */
  initializeResourcePools(
    caster: MagicComponent,
    _options?: ResourceInitOptions
  ): void {
    // Mark as divine caster
    caster.paradigmState.divine_casting = {
      custom: {
        totalMiraclesPerformed: 0,
        totalBeliefSpent: 0,
        totalBeliefGained: 0,
      },
    };
  }

  /**
   * Check if a context includes divine casting information.
   */
  isDivineCastingContext(context: CastingContext): context is DivineCastingContext {
    return 'witnessIds' in context && 'deityId' in context;
  }
}

/**
 * Helper function to create a divine casting context.
 */
export function createDivineCastingContext(
  tick: number,
  deityId: string,
  witnessIds: string[],
  witnessDevotions: number[]
): DivineCastingContext {
  return {
    tick,
    timeOfDay: 0.5,
    ambientPower: 1.0, // Gods have full access to ambient power
    isGroupCast: false,
    casterCount: 1,
    witnessIds,
    witnessDevotions,
    deityId,
  };
}
