/**
 * SongCostCalculator - Cost calculation for Song/Bardic paradigm
 *
 * Costs: voice (primary), stamina (physical exertion), harmony (group bonus)
 *
 * Song magic works through music and voice:
 * - Voice represents magical singing ability
 * - Sustained songs drain stamina
 * - Harmony with other singers amplifies power
 * - Different song types have different costs
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
 * Cost calculator for the Song/Bardic magic paradigm.
 */
export class SongCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'song';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.song;
    const hasInstrument = (state?.hasInstrument ?? false) as boolean;
    const choirSize = (context.custom?.choirSize ?? 1) as number;

    // =========================================================================
    // Voice Cost (Primary)
    // =========================================================================

    let voiceCost = Math.ceil(spell.manaCost * 0.35);

    // Using an instrument reduces voice strain
    if (hasInstrument) {
      voiceCost = Math.ceil(voiceCost * 0.7);
    }

    // Choir singing distributes the cost
    if (choirSize > 1) {
      voiceCost = Math.ceil(voiceCost / Math.sqrt(choirSize));
    }

    // Power words are more taxing
    if (this.isPowerWordSpell(spell)) {
      voiceCost = Math.ceil(voiceCost * 1.5);
    }

    costs.push({
      type: 'voice',
      amount: voiceCost,
      source: 'magical_singing',
      terminal: true,
    });

    // =========================================================================
    // Stamina Cost (Physical exertion)
    // =========================================================================

    let staminaCost = Math.ceil(spell.manaCost * 0.15);

    // Dancing while singing costs more stamina
    if (context.custom?.dancing) {
      staminaCost = Math.ceil(staminaCost * 2);
    }

    // Seated performance is easier
    if (context.custom?.seated) {
      staminaCost = Math.ceil(staminaCost * 0.5);
    }

    costs.push({
      type: 'stamina',
      amount: staminaCost,
      source: 'performance_exertion',
    });

    // =========================================================================
    // Harmony Bonus (Reduces costs with choir)
    // =========================================================================

    if (choirSize > 1) {
      // Harmony can actually reduce total cost further
      const harmonyBonus = Math.min(20, (choirSize - 1) * 5);
      if (harmonyBonus > 0) {
        costs.push({
          type: 'voice',
          amount: -harmonyBonus, // Negative = refund
          source: 'choir_harmony',
        });
      }
    }

    return costs;
  }

  /**
   * Check if spell uses power words (Words of Power).
   * Control technique represents commanding/compelling effects in song magic.
   */
  private isPowerWordSpell(spell: ComposedSpell): boolean {
    return spell.technique === 'control' || spell.technique === 'destroy';
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Voice pool - magical singing capacity
    const voiceMax = options?.maxOverrides?.voice ?? 100;
    const voiceStart = options?.currentOverrides?.voice ?? 100;

    caster.resourcePools.voice = {
      type: 'voice',
      current: voiceStart,
      maximum: voiceMax,
      regenRate: 1, // Moderate recovery
      locked: 0,
    };

    // Stamina pool - physical endurance
    const staminaMax = options?.maxOverrides?.stamina ?? 100;

    caster.resourcePools.stamina = {
      type: 'stamina',
      current: options?.currentOverrides?.stamina ?? 100,
      maximum: staminaMax,
      regenRate: 2, // Faster recovery than voice
      locked: 0,
    };

    // Set paradigm state
    caster.paradigmState.song = {
      hasInstrument: false,
      instrumentType: undefined,
      currentSong: undefined,
      custom: {
        songsLearned: [],
        instrumentProficiencies: {},
        choirExperience: 0,
      },
    };
  }

  /**
   * Override terminal effect for song-specific consequences.
   */
  protected override getTerminalEffect(
    costType: string,
    trigger: 'zero' | 'max',
    _caster: MagicComponent
  ): TerminalEffect {
    if (costType === 'voice' && trigger === 'zero') {
      return {
        type: 'voice_zero',
        silenced: true,
      };
    }

    if (costType === 'stamina' && trigger === 'zero') {
      return {
        type: 'exhaustion',
        cause: 'Too exhausted to perform',
      };
    }

    return super.getTerminalEffect(costType as any, trigger, _caster);
  }
}
