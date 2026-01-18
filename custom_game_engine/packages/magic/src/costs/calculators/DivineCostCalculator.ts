/**
 * DivineCostCalculator - Cost calculation for Divine/Priest paradigm
 *
 * Costs: favor (primary), karma (for misaligned actions)
 *
 * Divine magic channels power from gods:
 * - Favor represents standing with deity
 * - Prayer regenerates favor
 * - Aligned spells may GAIN favor
 * - Spells against deity's nature cost karma
 * - At 0 favor = forsaken by deity
 */

import {
  BaseCostCalculator,
  type CastingContext,
  type SpellCost,
  type ResourceInitOptions,
  type TerminalEffect,
} from '../CostCalculator.js';
import type { ComposedSpell, MagicComponent } from '@ai-village/core';

/** Deity domain alignments */
interface DeityAlignment {
  favoredTechniques: string[];
  favoredForms: string[];
  forbiddenTechniques: string[];
  forbiddenForms: string[];
}

/** Default deity alignments by type */
const DEFAULT_DEITY_ALIGNMENTS: Record<string, DeityAlignment> = {
  neutral: {
    favoredTechniques: [],
    favoredForms: [],
    forbiddenTechniques: [],
    forbiddenForms: [],
  },
  healing: {
    favoredTechniques: [], // No favorites - healing is expected
    favoredForms: [],
    forbiddenTechniques: ['destroy'], // Forbid destruction
    forbiddenForms: [],
  },
  life: {
    favoredTechniques: ['create', 'enhance', 'protect'],
    favoredForms: ['body', 'plant', 'animal'],
    forbiddenTechniques: ['destroy'],
    forbiddenForms: ['void', 'spirit'],
  },
  death: {
    favoredTechniques: ['destroy', 'perceive', 'control'],
    favoredForms: ['spirit', 'void', 'body'],
    forbiddenTechniques: ['create'],
    forbiddenForms: ['plant'],
  },
  nature: {
    favoredTechniques: ['create', 'transform', 'control'],
    favoredForms: ['plant', 'animal', 'water', 'earth'],
    forbiddenTechniques: ['destroy'],
    forbiddenForms: ['void', 'metal'],
  },
  war: {
    favoredTechniques: ['destroy', 'enhance', 'protect'],
    favoredForms: ['fire', 'metal', 'body'],
    forbiddenTechniques: [],
    forbiddenForms: [],
  },
  knowledge: {
    favoredTechniques: ['perceive', 'transform', 'create'],
    favoredForms: ['mind', 'image', 'time'],
    forbiddenTechniques: ['destroy'],
    forbiddenForms: [],
  },
};

/**
 * Cost calculator for the Divine/Priest magic paradigm.
 */
export class DivineCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'divine';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.divine;
    const deityType = this.getDeityType(state?.deityId as string | undefined);
    const alignment = DEFAULT_DEITY_ALIGNMENTS[deityType] ?? DEFAULT_DEITY_ALIGNMENTS.life;

    // Get faith level from SpiritualComponent if available
    const spiritual = context.spiritualComponent;
    const faithLevel = spiritual?.faith ?? 0.5; // Default to neutral faith

    // =========================================================================
    // Favor Cost (Primary)
    // =========================================================================

    let favorCost = Math.ceil(spell.manaCost * 0.3);

    // High faith reduces favor costs, low faith increases them
    // Faith 0.0 = +50% cost, Faith 0.5 = neutral, Faith 1.0 = -30% cost
    // Only apply faith modifier if spiritualComponent exists
    if (spiritual) {
      const faithModifier = 1.5 - (faithLevel * 0.8);
      favorCost = Math.ceil(favorCost * faithModifier);
    }

    // Recent prayer reduces costs (spiritual connection)
    if (spiritual && spiritual.lastPrayerTime !== undefined) {
      const timeSinceLastPrayer = context.tick - spiritual.lastPrayerTime;
      // Within last minute (1200 ticks) = bonus
      if (timeSinceLastPrayer < 1200) {
        favorCost = Math.ceil(favorCost * 0.8);
      }
    }

    // Aligned spells cost less - or even gain favor!
    if (!alignment) {
      throw new Error('Deity alignment not found');
    }
    const isAligned = this.isAlignedSpell(spell, alignment);
    const isForbidden = this.isForbiddenSpell(spell, alignment);

    if (isAligned) {
      // Aligned spells cost much less
      favorCost = Math.max(0, favorCost - 15);

      // Very aligned spells might actually GAIN favor
      if (favorCost === 0) {
        // This spell is so aligned it pleases the deity
        // We'll handle favor gain separately (not as a cost)
      }
    }

    // Always include favor cost (even if 0 for aligned spells)
    costs.push({
      type: 'favor',
      amount: favorCost,
      source: 'divine_channel',
      terminal: favorCost > 0, // Only terminal if actually costing favor
    });

    // =========================================================================
    // Karma Cost (For misaligned actions)
    // =========================================================================

    if (isForbidden) {
      // Using forbidden magic costs karma AND extra favor
      const karmaCost = 20;
      costs.push({
        type: 'karma',
        amount: karmaCost,
        source: 'against_deity_nature',
      });

      // Also increase favor cost
      const extraFavorCost = Math.ceil(spell.manaCost * 0.2);
      costs.push({
        type: 'favor',
        amount: extraFavorCost,
        source: 'forbidden_magic_penalty',
        terminal: true,
      });
    }

    // =========================================================================
    // Crisis of Faith Penalty
    // =========================================================================

    if (spiritual?.crisisOfFaith) {
      // Divine magic is severely impaired during crisis of faith
      costs.push({
        type: 'favor',
        amount: Math.ceil(spell.manaCost * 0.5),
        source: 'crisis_of_faith_penalty',
        terminal: true,
      });
    }

    // =========================================================================
    // Vision Bonus
    // =========================================================================

    if (spiritual?.hasReceivedVision && isAligned) {
      // Agents who have received visions are more connected
      // Refund some favor for aligned spells
      costs.push({
        type: 'favor',
        amount: -Math.ceil(spell.manaCost * 0.1),
        source: 'divine_vision_connection',
      });
    }

    return costs;
  }

  /**
   * Check if a spell is aligned with the deity's domains.
   */
  private isAlignedSpell(spell: ComposedSpell, alignment: DeityAlignment): boolean {
    // Spell must have BOTH favored technique AND favored form to be truly aligned
    return (
      alignment.favoredTechniques.includes(spell.technique) &&
      alignment.favoredForms.includes(spell.form)
    );
  }

  /**
   * Check if a spell is forbidden by the deity.
   */
  private isForbiddenSpell(spell: ComposedSpell, alignment: DeityAlignment): boolean {
    return (
      alignment.forbiddenTechniques.includes(spell.technique) ||
      alignment.forbiddenForms.includes(spell.form)
    );
  }

  /**
   * Get deity type from deity ID.
   */
  private getDeityType(deityId?: string): string {
    // In a real implementation, this would look up the deity
    // For now, default to a neutral domain with no alignments
    if (!deityId) return 'neutral';

    // Parse domain from deity ID if present
    const domains = ['life', 'death', 'nature', 'war', 'knowledge'];
    for (const domain of domains) {
      if (deityId.toLowerCase().includes(domain)) {
        return domain;
      }
    }

    // Map healing deities to life domain
    if (deityId.toLowerCase().includes('heal')) {
      return 'healing'; // Use custom healing domain
    }

    return 'neutral';
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Favor pool - starts at 50 (neutral standing)
    const favorMax = options?.maxOverrides?.favor ?? 100;
    const favorCurrent = options?.currentOverrides?.favor ?? 50;

    caster.resourcePools.favor = {
      type: 'favor',
      current: favorCurrent,
      maximum: favorMax,
      regenRate: 0, // No passive regen - must pray
      locked: 0,
    };

    // Karma pool - starts at 0, accumulates (lower is better)
    const karmaMax = options?.maxOverrides?.karma ?? 100;

    caster.resourcePools.karma = {
      type: 'karma',
      current: options?.currentOverrides?.karma ?? 0,
      maximum: karmaMax,
      regenRate: 0, // Must atone to reduce
      locked: 0,
    };

    // Set paradigm state
    caster.paradigmState.divine = {
      deityId: 'life_deity', // Default to life deity for testing
      deityStanding: 'neutral',
      custom: {
        prayerStreak: 0,
        miraclesWitnessed: 0,
        sacrificesMade: 0,
      },
    };
  }

  /**
   * Override terminal effect for divine-specific consequences.
   */
  protected override getTerminalEffect(
    costType: string,
    trigger: 'zero' | 'max',
    caster: MagicComponent
  ): TerminalEffect {
    const state = caster.paradigmState?.divine;

    if (costType === 'favor') {
      return {
        type: 'favor_zero',
        patronAction: `forsaken_by_${(state?.deityId as string) ?? 'unknown'}`,
      };
    }

    // Karma at max = major divine punishment
    if (costType === 'karma' && trigger === 'max') {
      return {
        type: 'death',
        cause: 'Divine punishment for accumulated sins',
      };
    }

    return super.getTerminalEffect(costType as MagicCostType, trigger, caster);
  }

  /**
   * Override cumulative check - karma is cumulative.
   */
  protected override isCumulativeCost(costType: string): boolean {
    return costType === 'karma' || super.isCumulativeCost(costType as MagicCostType);
  }
}
