/**
 * EmotionalCostCalculator - Cost calculation for Emotional/Passion paradigm
 *
 * Costs: emotion (primary), sanity (cumulative)
 *
 * Emotional magic is instinctual and powerful:
 * - Different emotions have different power/cost ratios
 * - Must genuinely FEEL the emotion to cast
 * - At 0 emotion = emotional burnout
 * - At 0 sanity = dominated by most-used emotion
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

/** Emotion configuration */
interface EmotionConfig {
  /** Power multiplier for this emotion */
  powerMultiplier: number;
  /** Cost multiplier for this emotion */
  costMultiplier: number;
  /** What this emotion is best for */
  favoredTechniques: string[];
  /** What this emotion is best against */
  favoredForms: string[];
}

/** Emotion configurations */
const EMOTION_CONFIGS: Record<string, EmotionConfig> = {
  rage: {
    powerMultiplier: 1.5,
    costMultiplier: 1.5,
    favoredTechniques: ['destroy', 'enhance'],
    favoredForms: ['fire', 'body'],
  },
  love: {
    powerMultiplier: 1.2,
    costMultiplier: 0.8,
    favoredTechniques: ['create', 'protect', 'enhance'],
    favoredForms: ['body', 'mind'],
  },
  fear: {
    powerMultiplier: 2.0,
    costMultiplier: 1.0,
    favoredTechniques: ['protect', 'perceive'],
    favoredForms: ['mind', 'air'],
  },
  grief: {
    powerMultiplier: 1.3,
    costMultiplier: 1.2,
    favoredTechniques: ['create', 'control'],
    favoredForms: ['water', 'spirit'],
  },
  joy: {
    powerMultiplier: 1.0,
    costMultiplier: 0.5,
    favoredTechniques: ['create', 'enhance'],
    favoredForms: ['image', 'air'],
  },
  disgust: {
    powerMultiplier: 1.1,
    costMultiplier: 1.1,
    favoredTechniques: ['transform', 'destroy'],
    favoredForms: ['body', 'earth'],
  },
  awe: {
    powerMultiplier: 1.8,
    costMultiplier: 1.3,
    favoredTechniques: ['perceive', 'summon'],
    favoredForms: ['spirit', 'void', 'time'],
  },
};

/**
 * Cost calculator for the Emotional/Passion magic paradigm.
 */
export class EmotionalCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'emotional';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    _context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.emotional;
    const emotion = (state?.dominantEmotion as string) ?? 'joy';
    const config = EMOTION_CONFIGS[emotion] ?? EMOTION_CONFIGS.joy;
    const stability = (state?.emotionalStability as number) ?? 100;

    // =========================================================================
    // Emotion Cost (Primary)
    // =========================================================================

    if (!config) {
      throw new Error(`Emotion config not found for ${emotion}`);
    }

    // Base cost scales with spell power
    let emotionCost = Math.ceil(spell.manaCost * config.costMultiplier);

    // Synergy: aligned spells cost less emotion
    const isSynergistic =
      config.favoredTechniques.includes(spell.technique) ||
      config.favoredForms.includes(spell.form);

    if (isSynergistic) {
      emotionCost = Math.ceil(emotionCost * 0.8);
    }

    // Instability increases cost
    if (stability < 50) {
      emotionCost = Math.ceil(emotionCost * (1 + (50 - stability) / 100));
    }

    costs.push({
      type: 'emotion',
      amount: emotionCost,
      source: `${emotion}_channel`,
      terminal: true, // 0 emotion = burnout
    });

    // =========================================================================
    // Sanity Cost (Cumulative strain)
    // =========================================================================

    // Base sanity strain
    let sanityCost = Math.ceil(spell.manaCost * 0.05);

    // High-power emotions cause more strain
    if (config.powerMultiplier > 1.3) {
      sanityCost = Math.ceil(sanityCost * 1.2);
    }

    // Prolonged use causes more strain
    if (spell.duration && spell.duration > 30) {
      sanityCost += Math.ceil(spell.duration / 30);
    }

    // Already unstable = more vulnerable
    if (stability < 50) {
      sanityCost = Math.ceil(sanityCost * 1.5);
    }

    costs.push({
      type: 'sanity',
      amount: sanityCost,
      source: 'emotional_strain',
      terminal: true, // 0 sanity = dominated by emotion
    });

    return costs;
  }

  /**
   * Get power multiplier for a spell based on emotion.
   */
  getPowerMultiplier(spell: ComposedSpell, caster: MagicComponent): number {
    const state = caster.paradigmState?.emotional;
    const emotion = (state?.dominantEmotion as string) ?? 'joy';
    const config = EMOTION_CONFIGS[emotion] ?? EMOTION_CONFIGS.joy;

    if (!config) {
      throw new Error(`Emotion config not found for ${emotion}`);
    }

    let multiplier = config.powerMultiplier;

    // Synergy bonus
    const isSynergistic =
      config.favoredTechniques.includes(spell.technique) ||
      config.favoredForms.includes(spell.form);

    if (isSynergistic) {
      multiplier *= 1.2;
    }

    return multiplier;
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Emotion pool
    const emotionMax = options?.maxOverrides?.emotion ?? 100;
    const emotionCurrent = options?.currentOverrides?.emotion ?? emotionMax;
    const emotionRegen = options?.regenOverrides?.emotion ?? 0.01;

    caster.resourcePools.emotion = {
      type: 'emotion',
      current: emotionCurrent,
      maximum: emotionMax,
      regenRate: emotionRegen, // Recovers over time
      locked: 0,
    };

    // Sanity pool
    const sanityMax = options?.maxOverrides?.sanity ?? 100;
    const sanityCurrent = options?.currentOverrides?.sanity ?? sanityMax;
    const sanityRegen = options?.regenOverrides?.sanity ?? 0.005;

    caster.resourcePools.sanity = {
      type: 'sanity',
      current: sanityCurrent,
      maximum: sanityMax,
      regenRate: sanityRegen, // Slow recovery
      locked: 0,
    };

    // Set paradigm state
    caster.paradigmState.emotional = {
      dominantEmotion: 'joy',
      emotionalStability: 100,
      custom: {
        emotionHistory: [], // Track which emotions have been used
        burnoutCount: 0,
        resonancePartners: [], // Others who resonate with similar emotions
      },
    };
  }

  /**
   * Override terminal effect for emotional-specific consequences.
   */
  protected override getTerminalEffect(
    costType: MagicCostType,
    trigger: 'zero' | 'max',
    caster: MagicComponent
  ): TerminalEffect {
    const state = caster.paradigmState?.emotional;
    const emotion = (state?.dominantEmotion as string) ?? 'unknown';

    if (costType === 'emotion') {
      return {
        type: 'emotional_burnout',
        dominantEmotion: emotion,
      };
    }

    if (costType === 'sanity') {
      return {
        type: 'sanity_zero',
        madnessType: 'emotional_dominance',
      };
    }

    return super.getTerminalEffect(costType, trigger, caster);
  }
}
