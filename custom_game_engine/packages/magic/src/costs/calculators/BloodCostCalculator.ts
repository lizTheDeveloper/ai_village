/**
 * BloodCostCalculator - Cost calculation for Blood/Crimson Art paradigm
 *
 * Costs: blood (primary), health (secondary), corruption (cumulative), lifespan (rare)
 *
 * Blood magic is primal and dangerous:
 * - Blood is the primary cost (literal blood drawn)
 * - Health damage is secondary (from blood loss strain)
 * - Corruption ALWAYS accumulates
 * - Lifespan only costs for major rituals
 * - Can use other creatures' blood to reduce personal cost
 * - At 100 corruption = physical transformation
 */

import {
  BaseCostCalculator,
  type CastingContext,
  type SpellCost,
  type ResourceInitOptions,
  type TerminalEffect,
} from '../CostCalculator.js';
import type { ComposedSpell, MagicComponent } from '@ai-village/core';
import type { BodyComponent, Injury } from '@ai-village/core';

/**
 * Cost calculator for the Blood/Crimson Art magic paradigm.
 */
export class BloodCostCalculator extends BaseCostCalculator {
  readonly paradigmId = 'blood';

  calculateCosts(
    spell: ComposedSpell,
    caster: MagicComponent,
    context: CastingContext
  ): SpellCost[] {
    const costs: SpellCost[] = [];
    const state = caster.paradigmState?.blood;

    // Get body component from casting context for blood loss injuries
    const body = context.bodyComponent;

    // Check if using sacrificial blood (other's blood)
    const usingSacrificialBlood = (state?.custom as Record<string, unknown>)?.sacrificialBloodAvailable ?? false;
    const sacrificialBloodAmount = (state?.custom as Record<string, unknown>)?.sacrificialBloodAmount ?? 0;

    // =========================================================================
    // Blood Cost (Primary)
    // =========================================================================

    let bloodCost = Math.ceil(spell.manaCost * 0.2);

    // If using sacrificial blood, reduce personal cost
    if (usingSacrificialBlood && (sacrificialBloodAmount as number) > 0) {
      const reduction = Math.min(bloodCost * 0.8, sacrificialBloodAmount as number);
      bloodCost = Math.ceil(bloodCost - reduction);
    }

    if (bloodCost > 0) {
      costs.push({
        type: 'blood',
        amount: bloodCost,
        source: 'blood_sacrifice',
        terminal: true, // 0 blood = death
      });

      // If entity has body component, apply blood loss as injuries
      if (body) {
        this.applyBloodLossThroughInjuries(body, bloodCost);
      }
    }

    // =========================================================================
    // Health Cost (Secondary - strain from blood loss)
    // =========================================================================

    // Health cost is proportional to mana cost
    let healthCost = Math.ceil(spell.manaCost * 0.1);

    // Sustained spells cause more strain
    if (spell.duration && spell.duration > 60) {
      healthCost += Math.ceil(spell.duration / 60);
    }

    if (healthCost > 0) {
      costs.push({
        type: 'health',
        amount: healthCost,
        source: 'blood_loss_strain',
        terminal: true, // 0 health = death
      });
    }

    // =========================================================================
    // Corruption (Always accumulates)
    // =========================================================================

    // Blood magic ALWAYS causes corruption
    let corruptionGain = Math.ceil(spell.manaCost * 0.1);

    // More corruption for dark techniques
    if (spell.technique === 'destroy' || spell.form === 'void' || spell.form === 'spirit') {
      corruptionGain = Math.ceil(corruptionGain * 1.5);
    }

    // Group casting spreads corruption among all participants
    if (context.isGroupCast && context.casterCount > 1) {
      corruptionGain = Math.ceil(corruptionGain / context.casterCount);
    }

    costs.push({
      type: 'corruption',
      amount: corruptionGain,
      source: 'crimson_taint',
      terminal: true, // 100 corruption = transformation
    });

    // =========================================================================
    // Lifespan (Only for major rituals)
    // =========================================================================

    // Soul magic or resurrection costs years of life
    const isSoulMagic = spell.form === 'spirit' &&
      (spell.technique === 'create' || spell.technique === 'control');

    // Very powerful spells also cost lifespan
    const isMajorRitual = spell.manaCost > 100;

    if (isSoulMagic || isMajorRitual) {
      const lifespanCost = isSoulMagic ? 5 : Math.ceil(spell.manaCost / 50);
      costs.push({
        type: 'lifespan',
        amount: lifespanCost,
        source: isSoulMagic ? 'soul_commerce' : 'major_ritual',
        terminal: true, // 0 lifespan = immediate death
      });
    }

    return costs;
  }

  initializeResourcePools(
    caster: MagicComponent,
    options?: ResourceInitOptions
  ): void {
    // Blood pool
    const bloodMax = options?.maxOverrides?.blood ?? 100;
    const bloodCurrent = options?.currentOverrides?.blood ?? bloodMax;
    const bloodRegen = options?.regenOverrides?.blood ?? 0.005; // Very slow

    caster.resourcePools.blood = {
      type: 'blood',
      current: bloodCurrent,
      maximum: bloodMax,
      regenRate: bloodRegen,
      locked: 0,
    };

    // Health pool
    const healthMax = options?.maxOverrides?.health ?? 100;
    const healthCurrent = options?.currentOverrides?.health ?? healthMax;
    const healthRegen = options?.regenOverrides?.health ?? 0.01;

    caster.resourcePools.health = {
      type: 'health',
      current: healthCurrent,
      maximum: healthMax,
      regenRate: healthRegen,
      locked: 0,
    };

    // Corruption pool - starts at 0
    const corruptionMax = options?.maxOverrides?.corruption ?? 100;

    caster.resourcePools.corruption = {
      type: 'corruption',
      current: options?.currentOverrides?.corruption ?? 0,
      maximum: corruptionMax,
      regenRate: 0, // Never recovers
      locked: 0,
    };

    // Lifespan pool - represents years remaining
    const lifespanMax = options?.maxOverrides?.lifespan ?? 80;
    const lifespanCurrent = options?.currentOverrides?.lifespan ?? lifespanMax;

    caster.resourcePools.lifespan = {
      type: 'lifespan',
      current: lifespanCurrent,
      maximum: lifespanMax,
      regenRate: 0, // Never recovers
      locked: 0,
    };

    // Set paradigm state
    caster.paradigmState.blood = {
      bloodDebt: 0,
      custom: {
        sacrificialBloodAvailable: false,
        sacrificialBloodAmount: 0,
        corruptionMilestones: [],
        bloodBondTargets: [],
      },
    };
  }

  /**
   * Override terminal effect for blood-specific consequences.
   */
  protected override getTerminalEffect(
    costType: string,
    trigger: 'zero' | 'max',
    caster: MagicComponent
  ): TerminalEffect {
    switch (costType) {
      case 'blood':
      case 'health':
        return {
          type: 'death',
          cause: costType === 'blood' ? 'Bled out from blood magic' : 'Died from blood loss strain',
        };
      case 'corruption':
        return {
          type: 'corruption_threshold',
          newForm: this.getCorruptedForm(caster),
          corruptionLevel: 100,
        };
      case 'lifespan':
        return {
          type: 'death',
          cause: 'Life force expended through blood magic',
        };
      default:
        return super.getTerminalEffect(costType as any, trigger, caster);
    }
  }

  /**
   * Get the corrupted form based on blood magic style.
   */
  private getCorruptedForm(_caster: MagicComponent): string {
    // The form depends on how much of each technique was used
    // For now, return a generic form
    return 'blood_fiend';
  }

  /**
   * Apply blood cost as actual injuries to body parts.
   * Blood magic literally draws blood from the caster.
   */
  private applyBloodLossThroughInjuries(body: BodyComponent, bloodCost: number): void {
    // Distribute blood loss across non-vital parts
    const nonVitalParts = Object.values(body.parts).filter(p => !p.vital);

    if (nonVitalParts.length === 0) return;

    // Select random part(s) to draw blood from
    const bloodPerPart = bloodCost / nonVitalParts.length;
    const bleedRate = bloodCost * 0.1; // Convert to bleed rate

    for (const part of nonVitalParts) {
      // Add a small cut that bleeds
      const injury: Injury = {
        id: `blood_magic_${Date.now()}_${part.id}`,
        type: 'cut',
        severity: bloodCost > 50 ? 'severe' : bloodCost > 20 ? 'moderate' : 'minor',
        bleedRate: bleedRate / nonVitalParts.length,
        painLevel: bloodCost * 0.2,
        healingProgress: 0,
        timestamp: Date.now(),
      };

      part.injuries.push(injury);

      // Apply damage to the part
      part.health = Math.max(0, part.health - bloodPerPart);
    }

    // Increase blood loss tracker
    body.bloodLoss = Math.min(100, body.bloodLoss + bloodCost * 0.5);
  }
}
