/**
 * PactCostCalculator - Cost calculation for Pact/Warlock paradigm
 *
 * Costs: favor (primary), corruption (cumulative), soul_fragment (rare)
 *
 * Pact magic draws power from a patron entity:
 * - Favor is spent with each cast, represents standing with patron
 * - Corruption accumulates when using dark techniques (void, destroy)
 * - Soul fragments are only spent for major summons or permanent effects
 * - Favor recovers via quests/service; corruption NEVER recovers
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
 * Cost calculator for the Pact/Warlock magic paradigm.
 */
export class PactCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'pact';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    _context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.pact;

    // =========================================================================
    // Favor Cost (Primary)
    // =========================================================================

    // Base favor cost is proportional to spell power
    let favorCost = Math.ceil(spell.manaCost * 0.2);

    // Patron service owed reduces favor cost (patron wants to use you)
    const serviceOwed = (state?.serviceOwed as number) ?? 0;
    if (serviceOwed > 0) {
      favorCost = Math.ceil(favorCost * 0.8); // 20% discount when in debt
    }

    // Blood channel enhances but doesn't add favor cost
    // (the blood is an offering to the patron)

    costs.push({
      type: 'favor',
      amount: favorCost,
      source: 'patron_tithe',
      terminal: true, // 0 favor = patron revokes powers
    });

    // =========================================================================
    // Corruption (Cumulative, for dark techniques)
    // =========================================================================

    // Only accumulates when using dark magic
    const isDarkMagic =
      spell.technique === 'destroy' ||
      spell.form === 'void' ||
      spell.form === 'spirit';

    if (isDarkMagic) {
      const corruptionGain = Math.ceil(spell.manaCost * 0.05);
      costs.push({
        type: 'corruption',
        amount: corruptionGain,
        source: 'dark_taint',
        terminal: true, // 100 corruption = transformation
      });
    }

    // =========================================================================
    // Soul Fragments (Rare, for major effects)
    // =========================================================================

    // Only spent for major summons or permanent enchantments
    const isMajorSummon = spell.technique === 'summon' && spell.manaCost > 50;
    const isPermanent = spell.duration === undefined && spell.technique === 'create';

    if (isMajorSummon || isPermanent) {
      costs.push({
        type: 'soul_fragment',
        amount: 1,
        source: isMajorSummon ? 'major_summon' : 'permanent_creation',
        terminal: true, // 0 fragments = soul lost
      });
    }

    return costs;
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Favor pool - starts at 100 (good standing with patron)
    const favorMax = options?.maxOverrides?.favor ?? 100;
    const favorCurrent = options?.currentOverrides?.favor ?? favorMax;

    caster.resourcePools.favor = {
      type: 'favor',
      current: favorCurrent,
      maximum: favorMax,
      regenRate: 0, // No passive regen - must complete quests
      locked: 0,
    };

    // Corruption pool - starts at 0, accumulates
    const corruptionMax = options?.maxOverrides?.corruption ?? 100;

    caster.resourcePools.corruption = {
      type: 'corruption',
      current: options?.currentOverrides?.corruption ?? 0,
      maximum: corruptionMax,
      regenRate: 0, // Never recovers
      locked: 0,
    };

    // Soul fragments - everyone has 7
    const fragmentsMax = options?.maxOverrides?.soul_fragment ?? 7;
    const fragmentsCurrent = options?.currentOverrides?.soul_fragment ?? fragmentsMax;

    caster.resourcePools.soul_fragment = {
      type: 'soul_fragment',
      current: fragmentsCurrent,
      maximum: fragmentsMax,
      regenRate: 0, // Never recovers
      locked: 0,
    };

    // Set paradigm state
    caster.paradigmState.pact = {
      patronId: undefined,
      pactTerms: [],
      serviceOwed: 0,
      custom: {
        corruptionMilestones: [], // Track corruption effects
        patronGifts: [],
      },
    };
  }

  /**
   * Override terminal effect for pact-specific consequences.
   */
  protected override getTerminalEffect(
    costType: string,
    trigger: 'zero' | 'max',
    caster: MagicComponent
  ): TerminalEffect {
    const state = caster.paradigmState?.pact;

    switch (costType) {
      case 'favor':
        return {
          type: 'favor_zero',
          patronAction: 'Powers revoked. Patron demands immediate service or claims a soul fragment.',
        };
      case 'corruption':
        return {
          type: 'corruption_threshold',
          newForm: this.getCorruptedForm(state?.patronId as string | undefined),
          corruptionLevel: 100,
        };
      case 'soul_fragment':
        return {
          type: 'soul_lost',
          fragmentsRemaining: 0,
        };
      default:
        return super.getTerminalEffect(costType as any, trigger, caster);
    }
  }

  /**
   * Get the corrupted form based on patron type.
   */
  private getCorruptedForm(patronId?: string): string {
    // Different patrons cause different transformations
    const formsByPatron: Record<string, string> = {
      fiend: 'lesser_demon',
      aberration: 'twisted_one',
      fey: 'wild_touched',
      undead: 'revenant',
    };

    return formsByPatron[patronId ?? 'fiend'] ?? 'corrupted_creature';
  }
}
