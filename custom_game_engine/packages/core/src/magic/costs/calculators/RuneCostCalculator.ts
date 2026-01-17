/**
 * RuneCostCalculator - Cost calculation for Rune/Inscription paradigm
 *
 * Costs: runic_power (primary), materials (crafting), time (inscription)
 *
 * Rune magic works through carved symbols:
 * - Runic power represents mastery of rune forms
 * - Requires materials for permanent inscriptions
 * - More powerful with better materials
 * - Can be pre-prepared for instant activation
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

/** Material qualities for rune carving */
type MaterialQuality = 'poor' | 'common' | 'good' | 'fine' | 'masterwork';

const MATERIAL_MULTIPLIERS: Record<MaterialQuality, number> = {
  poor: 1.5,      // Higher cost, less effective
  common: 1.0,
  good: 0.85,
  fine: 0.7,
  masterwork: 0.5,
};

/**
 * Cost calculator for the Rune/Inscription magic paradigm.
 */
export class RuneCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'rune';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.rune;
    const materialQuality = (context.custom?.materialQuality ?? 'common') as MaterialQuality;
    const isPrepared = (state?.preparedRunes?.includes(spell.id)) as boolean;

    // =========================================================================
    // Runic Power Cost (Primary)
    // =========================================================================

    let runicCost = Math.ceil(spell.manaCost * 0.3);

    // Material quality affects cost
    const qualityMult = MATERIAL_MULTIPLIERS[materialQuality] ?? 1.0;
    runicCost = Math.ceil(runicCost * qualityMult);

    // Pre-prepared runes cost much less to activate
    if (isPrepared) {
      runicCost = Math.ceil(runicCost * 0.2);
    }

    // Complex rune combinations cost more
    if (this.isComplexRuneSpell(spell)) {
      runicCost = Math.ceil(runicCost * 1.4);
    }

    costs.push({
      type: 'runic_power',
      amount: runicCost,
      source: 'rune_activation',
      terminal: true,
    });

    // =========================================================================
    // Material Cost (For inscriptions)
    // =========================================================================

    if (!isPrepared) {
      // Fresh inscriptions require materials
      const materialCost = Math.ceil(spell.manaCost * 0.2);

      costs.push({
        type: 'materials',
        amount: materialCost,
        source: 'inscription_materials',
      });
    }

    // =========================================================================
    // Time Cost (Inscription takes time)
    // =========================================================================

    if (!isPrepared && !context.custom?.quickCast) {
      // Proper inscription takes extra time (represented as a multiplier)
      const timeCost = Math.ceil(spell.castTime * 0.5);

      costs.push({
        type: 'inscription_time',
        amount: timeCost,
        source: 'carving_time',
      });
    }

    return costs;
  }

  /**
   * Check if spell requires complex rune combinations.
   */
  private isComplexRuneSpell(spell: ComposedSpell): boolean {
    // 'control' encompasses binding operations in runic magic
    const complexTechniques = ['transform', 'control'];
    const complexForms = ['time', 'void', 'spirit'];

    return (
      complexTechniques.includes(spell.technique) ||
      complexForms.includes(spell.form)
    );
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Runic power pool - mastery of rune forms
    const runicMax = options?.maxOverrides?.runic_power ?? 100;
    const runicStart = options?.currentOverrides?.runic_power ?? 50;

    caster.resourcePools.runic_power = {
      type: 'runic_power',
      current: runicStart,
      maximum: runicMax,
      regenRate: 0.5, // Slow meditation-based recovery
      locked: 0,
    };

    // Materials pool (abstracted material availability)
    caster.resourcePools.materials = {
      type: 'materials',
      current: options?.currentOverrides?.materials ?? 50,
      maximum: options?.maxOverrides?.materials ?? 100,
      regenRate: 0, // Must acquire materials
      locked: 0,
    };

    // Set paradigm state
    caster.paradigmState.rune = {
      preparedRunes: [] as string[],
      knownRunes: [],
      preferredMaterial: 'stone',
      custom: {
        inscriptionsCreated: 0,
        runesDiscovered: [],
        materialPreferences: {},
      },
    };
  }

  /**
   * Override terminal effect for rune-specific consequences.
   */
  protected override getTerminalEffect(
    costType: MagicCostType,
    trigger: 'zero' | 'max',
    _caster: MagicComponent
  ): TerminalEffect {
    if (costType === 'runic_power' && trigger === 'zero') {
      return {
        type: 'runic_exhaustion',
        cause: 'Runic knowledge strained - cannot inscribe until recovered',
      };
    }

    if (costType === 'materials' && trigger === 'zero') {
      return {
        type: 'material_shortage',
        materialType: 'inscription',
      };
    }

    return super.getTerminalEffect(costType, trigger, _caster);
  }
}
