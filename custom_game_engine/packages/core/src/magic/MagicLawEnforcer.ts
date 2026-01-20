/**
 * MagicLawEnforcer - Validates spell casting against paradigm laws
 *
 * The law enforcer checks whether a spell can be cast within a paradigm,
 * calculates costs, evaluates risks, and determines consequences.
 */

import type {
  MagicParadigm,
  MagicLaw,
  MagicRisk,
  MagicChannel,
  MagicCostType,
  ForbiddenCombination,
  ResonantCombination,
  ParadigmInteraction,
} from './MagicParadigm.js';
import type { ComposedSpell, MagicComponent, MagicTechnique, MagicForm } from '../components/MagicComponent.js';
import { costCalculatorRegistry } from './costs/CostCalculatorRegistry.js';
import { createDefaultContext } from './costs/CostCalculator.js';
import type { CastingContext } from './costs/CostCalculator.js';

// ============================================================================
// Validation Results
// ============================================================================

/** Result of validating a spell against a paradigm */
export interface SpellValidationResult {
  /** Whether the spell can be cast */
  valid: boolean;

  /** Reasons why the spell cannot be cast */
  errors: string[];

  /** Warnings that don't prevent casting but should be noted */
  warnings: string[];

  /** Calculated cost for this spell */
  costs: SpellCost[];

  /** Potential risks based on paradigm and caster state */
  risks: EvaluatedRisk[];

  /** Bonus effects from resonant combinations */
  bonuses: SpellBonus[];

  /** Channel requirements for casting */
  requiredChannels: MagicChannel[];

  /** Power multiplier from all sources */
  powerMultiplier: number;

  /** Law check results */
  lawChecks: LawCheckResult[];
}

/** A calculated spell cost */
export interface SpellCost {
  type: MagicCostType;
  amount: number;
  source: string;  // Why this cost exists
}

/** An evaluated risk with probability */
export interface EvaluatedRisk {
  risk: MagicRisk;
  probability: number;
  mitigated: boolean;
  mitigationReason?: string;
}

/** A bonus effect from resonant combinations or other sources */
export interface SpellBonus {
  source: string;
  effect: string;
  powerMultiplier: number;
}

// ============================================================================
// Law Enforcement Results
// ============================================================================

/** Result of checking a specific law */
export interface LawCheckResult {
  lawId: string;
  law: MagicLaw;
  passed: boolean;
  violation?: string;
  consequence?: string;
  canProceed: boolean;  // Whether casting can continue despite violation
  additionalCost?: SpellCost;
}

// ============================================================================
// Cross-Universe Magic Results
// ============================================================================

/** Result of evaluating cross-paradigm magic */
export interface CrossParadigmResult {
  /** Can the magic function at all? */
  canFunction: boolean;

  /** How well does it work? */
  functionality: 'full' | 'partial' | 'none' | 'inverted';

  /** Power modifier */
  powerModifier: number;

  /** Additional costs in the new paradigm */
  additionalCosts: SpellCost[];

  /** Additional risks */
  additionalRisks: EvaluatedRisk[];

  /** Does the magic transform? */
  transforms: boolean;

  /** Description of what happens */
  description: string;
}

// ============================================================================
// The Law Enforcer
// ============================================================================

/**
 * MagicLawEnforcer validates spell casting and enforces paradigm rules.
 */
export class MagicLawEnforcer {
  private paradigm: MagicParadigm;

  constructor(paradigm: MagicParadigm) {
    this.paradigm = paradigm;
  }

  /**
   * Validate whether a spell can be cast within this paradigm.
   */
  validateSpell(
    spell: ComposedSpell,
    caster: MagicComponent,
    context?: CastingContext
  ): SpellValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const costs: SpellCost[] = [];
    const risks: EvaluatedRisk[] = [];
    const bonuses: SpellBonus[] = [];
    const lawChecks: LawCheckResult[] = [];
    let powerMultiplier = 1.0;

    // Check if caster knows this paradigm
    const knownParadigms = caster.knownParadigmIds || [];
    if (!knownParadigms.includes(this.paradigm.id)) {
      errors.push(`Caster does not know the ${this.paradigm.name} paradigm`);
    }

    // Check if technique is available in this paradigm
    const availableTechniques = this.paradigm.availableTechniques || [];
    if (availableTechniques.length > 0 && !availableTechniques.includes(spell.technique)) {
      errors.push(`Technique '${spell.technique}' is not available in ${this.paradigm.name}`);
    }

    // Check if form is available in this paradigm
    const availableForms = this.paradigm.availableForms || [];
    if (availableForms.length > 0 && !availableForms.includes(spell.form)) {
      errors.push(`Form '${spell.form}' is not available in ${this.paradigm.name}`);
    }

    // Check for forbidden combinations
    const forbidden = this.checkForbiddenCombination(spell.technique, spell.form);
    if (forbidden) {
      errors.push(`Forbidden combination: ${forbidden.reason}`);
      if (forbidden.consequence) {
        warnings.push(`Attempting this would cause: ${forbidden.consequence}`);
      }
    }

    // Check for resonant combinations (bonuses)
    const resonant = this.checkResonantCombination(spell.technique, spell.form);
    if (resonant) {
      bonuses.push({
        source: 'resonant_combination',
        effect: resonant.bonusEffect,
        powerMultiplier: resonant.powerMultiplier ?? 1.0,
      });
      powerMultiplier *= resonant.powerMultiplier ?? 1.0;
    }

    // Calculate costs using paradigm-specific calculator
    if (!costCalculatorRegistry.has(this.paradigm.id)) {
      errors.push(
        `No cost calculator registered for paradigm '${this.paradigm.id}'. ` +
        `Ensure registerAllCostCalculators() is called during initialization.`
      );
      // Return early - cannot proceed without cost calculator
      return {
        valid: false,
        errors,
        warnings,
        costs: [],
        risks: [],
        bonuses: [],
        requiredChannels: [],
        powerMultiplier: 1.0,
        lawChecks: [],
      };
    }

    const calculator = costCalculatorRegistry.get(this.paradigm.id);

    // Create casting context with available information or use provided context
    const ctx: CastingContext = context ?? createDefaultContext();

    // Calculate paradigm-specific costs
    const calculatedCosts = calculator.calculateCosts(spell, caster, ctx);
    costs.push(...calculatedCosts);

    // Check affordability
    const affordability = calculator.canAfford(calculatedCosts, caster);
    if (!affordability.canAfford) {
      for (const missing of affordability.missing) {
        errors.push(`Insufficient ${missing.type}: need ${missing.amount} more`);
      }
    }

    // Warn about terminal effects
    if (affordability.wouldBeTerminal) {
      warnings.push(affordability.warning ?? 'This cast would have terminal effects');
    }

    // Check laws
    for (const law of this.paradigm.laws) {
      const lawResult = this.checkLaw(law, spell, caster);
      lawChecks.push(lawResult);
      if (!lawResult.passed) {
        if (!lawResult.canProceed) {
          errors.push(lawResult.violation ?? `Violates ${law.name}`);
        } else {
          warnings.push(lawResult.violation ?? `Bends ${law.name}`);
        }
        if (lawResult.additionalCost) {
          costs.push(lawResult.additionalCost);
        }
      }
    }

    // Get required channels
    const requiredChannels = this.paradigm.channels.filter(
      c => c.requirement === 'required'
    );

    // Evaluate risks
    for (const risk of this.paradigm.risks) {
      const evaluated = this.evaluateRisk(risk, spell, caster);
      risks.push(evaluated);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      costs,
      risks,
      bonuses,
      requiredChannels,
      powerMultiplier,
      lawChecks,
    };
  }

  /**
   * Validate that a caster's paradigm combinations are allowed.
   * Throws an error if the caster has conflicting paradigms.
   */
  validateCasterParadigms(caster: MagicComponent): void {
    // Get the caster's known paradigms
    const knownParadigms = caster.knownParadigmIds || [];

    // Check for forbidden paradigm combinations
    const forbiddenCombos = [
      { paradigms: ['divine', 'pact'], reason: 'Divine and Pact magic are fundamentally incompatible' },
      { paradigms: ['divine', 'blood'], reason: 'Divine magic and blood magic cannot coexist' },
      { paradigms: ['academic', 'wild'], reason: 'Academic study conflicts with wild chaos magic' },
    ];

    for (const combo of forbiddenCombos) {
      const hasBoth = combo.paradigms.every(p => knownParadigms.includes(p));
      if (hasBoth) {
        // EXOTIC PLOT EVENT: paradigm_conflict_detected
        // This is a catastrophic magical event - incompatible paradigms colliding
        // Note: We need access to eventBus, which may require injecting it into MagicLawEnforcer
        // For now, we'll throw the error which will be caught by the MagicSystem
        // The MagicSystem should emit the event when catching this specific error
        throw new Error(`PARADIGM_CONFLICT:${combo.paradigms[0]}:${combo.paradigms[1]}:${combo.reason}`);
      }
    }

    // Check if current paradigm conflicts with any known paradigms
    if (this.paradigm.conflictingParadigms) {
      for (const conflictingId of this.paradigm.conflictingParadigms) {
        if (knownParadigms.includes(conflictingId)) {
          // EXOTIC PLOT EVENT: paradigm_conflict_detected
          throw new Error(
            `PARADIGM_CONFLICT:${this.paradigm.id}:${conflictingId}:Paradigm ${this.paradigm.name} conflicts with known paradigm: ${conflictingId}`
          );
        }
      }
    }
  }

  /**
   * Check if a technique + form combination is forbidden.
   */
  checkForbiddenCombination(
    technique: MagicTechnique,
    form: MagicForm
  ): ForbiddenCombination | undefined {
    return this.paradigm.forbiddenCombinations?.find(
      fc => fc.technique === technique && fc.form === form
    );
  }

  /**
   * Check if a technique + form combination has special resonance.
   */
  checkResonantCombination(
    technique: MagicTechnique,
    form: MagicForm
  ): ResonantCombination | undefined {
    return this.paradigm.resonantCombinations?.find(
      rc => rc.technique === technique && rc.form === form
    );
  }

  /**
   * Check a specific law against a spell.
   */
  checkLaw(
    law: MagicLaw,
    spell: ComposedSpell,
    caster: MagicComponent
  ): LawCheckResult {
    // Initialize paradigmState if undefined (can happen after deserialization)
    if (!caster.paradigmState) {
      caster.paradigmState = {};
    }

    const paradigmState = caster.paradigmState[this.paradigm.id];

    switch (law.type) {
      case 'conservation':
        // Conservation law: energy must balance
        // Check if spell costs are appropriate for its effects
        const costToEffectRatio = spell.manaCost / (spell.duration || 1);
        if (costToEffectRatio < 0.1) {
          return {
            lawId: law.id,
            law,
            passed: false,
            violation: 'Spell effect exceeds available energy - conservation violated',
            canProceed: false,
          };
        }
        return { lawId: law.id, law, passed: true, canProceed: true };

      case 'oath_binding':
        // Check if spell violates any pact terms
        if (paradigmState?.pactTerms && paradigmState.pactTerms.length > 0) {
          // Check each pact term for violations
          for (const term of paradigmState.pactTerms) {
            // Pact terms like "no_harm_innocents", "serve_patron", "no_fire_magic"
            if (term === 'no_harm_innocents' && spell.form === 'spirit' && spell.technique === 'destroy') {
              return {
                lawId: law.id,
                law,
                passed: false,
                violation: `Spell violates pact term: ${term}`,
                consequence: 'Patron displeasure, service debt increased',
                canProceed: false,
              };
            }
            if (term === 'no_fire_magic' && spell.form === 'fire') {
              return {
                lawId: law.id,
                law,
                passed: false,
                violation: `Spell violates pact term: ${term}`,
                consequence: 'Pact breach penalty',
                canProceed: false,
              };
            }
          }
        }
        return { lawId: law.id, law, passed: true, canProceed: true };

      case 'consent':
        // Divine magic: check deity standing
        if (paradigmState?.deityStanding === 'forsaken') {
          return {
            lawId: law.id,
            law,
            passed: false,
            violation: 'Your deity has forsaken you - divine magic unavailable',
            canProceed: false,
          };
        }
        if (paradigmState?.deityStanding === 'disfavored') {
          // Disfavored can cast but at reduced power with additional cost
          return {
            lawId: law.id,
            law,
            passed: true,
            canProceed: true,
            additionalCost: {
              type: 'favor',
              amount: Math.ceil(spell.manaCost * 0.5),
              source: 'deity_disfavor_penalty',
            },
          };
        }
        return { lawId: law.id, law, passed: true, canProceed: true };

      case 'sacrifice':
        // Sacrifice law: greater effects need greater sacrifice
        if (spell.manaCost > 50) {
          return {
            lawId: law.id,
            law,
            passed: true,
            canProceed: true,
            additionalCost: {
              type: 'health',
              amount: Math.floor(spell.manaCost / 10),
              source: 'sacrifice_law',
            },
          };
        }
        return { lawId: law.id, law, passed: true, canProceed: true };

      case 'true_names':
        // Must know the true name of the target for name magic
        const knownNames = paradigmState?.knownNames ?? [];
        // If spell targets a specific entity by name, verify we know it
        if (spell.form === 'spirit' || spell.technique === 'control') {
          // For targeting spells, check if we know any names
          if (knownNames.length === 0) {
            return {
              lawId: law.id,
              law,
              passed: false,
              violation: 'You know no true names - name magic is unavailable',
              canProceed: false,
            };
          }
        }
        return { lawId: law.id, law, passed: true, canProceed: true };

      case 'secrecy':
        // Speaking names draws attention from outer entities
        // This always "passes" but may have consequences
        const attentionRisk = spell.manaCost > 30 ? 0.1 : 0.05;
        return {
          lawId: law.id,
          law,
          passed: true,
          canProceed: true,
          consequence: `${Math.round(attentionRisk * 100)}% chance of drawing unwanted attention`,
        };

      case 'equivalent_exchange':
        // Must give something of equal value
        return {
          lawId: law.id,
          law,
          passed: true,
          canProceed: true,
          additionalCost: {
            type: 'material',
            amount: spell.manaCost,
            source: 'equivalent_exchange',
          },
        };

      default:
        return { lawId: law.id, law, passed: true, canProceed: true };
    }
  }

  /**
   * Evaluate a risk for a specific spell and caster.
   */
  evaluateRisk(
    risk: MagicRisk,
    spell: ComposedSpell,
    caster: MagicComponent
  ): EvaluatedRisk {
    let probability = risk.probability;
    let mitigated = false;
    let mitigationReason: string | undefined;

    // Adjust probability based on proficiency
    const techProf = caster.techniqueProficiency?.[spell.technique] ?? 0;
    const formProf = caster.formProficiency?.[spell.form] ?? 0;
    const avgProf = (techProf + formProf) / 2;

    if (risk.mitigatable && avgProf > 50) {
      probability *= 1 - (avgProf - 50) / 100;
      mitigated = true;
      mitigationReason = `Proficiency (${avgProf.toFixed(0)})`;
    }

    // Adjust based on corruption/addiction for relevant risks
    if (risk.trigger === 'corruption' && (caster.corruption ?? 0) > 50) {
      probability *= 1.5;
    }

    if (risk.trigger === 'addiction' && (caster.addictionLevel ?? 0) > 50) {
      probability *= 1.5;
    }

    return {
      risk,
      probability: Math.min(1, Math.max(0, probability)),
      mitigated,
      mitigationReason,
    };
  }

  /**
   * Evaluate cross-paradigm magic when a caster from one paradigm uses magic in another.
   */
  evaluateCrossParadigm(
    spell: ComposedSpell,
    _caster: MagicComponent,
    interaction?: ParadigmInteraction
  ): CrossParadigmResult {
    if (!interaction) {
      // Default: partial functionality
      return {
        canFunction: true,
        functionality: 'partial',
        powerModifier: 0.5,
        additionalCosts: [],
        additionalRisks: [],
        transforms: false,
        description: 'Foreign magic operates at reduced power',
      };
    }

    const additionalCosts: SpellCost[] = [];
    const additionalRisks: EvaluatedRisk[] = [];

    // Add additional costs from interaction
    if (interaction.additionalCosts) {
      for (const costType of interaction.additionalCosts) {
        additionalCosts.push({
          type: costType,
          amount: Math.ceil(spell.manaCost * 0.2),
          source: 'cross_paradigm_cost',
        });
      }
    }

    // Add additional risks from interaction
    if (interaction.additionalRisks) {
      for (const trigger of interaction.additionalRisks) {
        additionalRisks.push({
          risk: {
            trigger,
            consequence: 'attention_gained',
            severity: 'moderate',
            probability: 0.3,
            mitigatable: false,
          },
          probability: 0.3,
          mitigated: false,
        });
      }
    }

    return {
      canFunction: interaction.functionality !== 'none',
      functionality: interaction.functionality,
      powerModifier: interaction.powerModifier,
      additionalCosts,
      additionalRisks,
      transforms: interaction.transforms,
      description: interaction.description,
    };
  }

  /**
   * Calculate the total power of a spell after all modifiers.
   */
  calculatePower(
    spell: ComposedSpell,
    caster: MagicComponent,
    validation: SpellValidationResult
  ): number {
    // Base power from spell
    let power = spell.manaCost;

    // Apply paradigm power scaling
    const techProf = caster.techniqueProficiency?.[spell.technique] ?? 0;
    const formProf = caster.formProficiency?.[spell.form] ?? 0;
    const avgProf = (techProf + formProf) / 2;

    switch (this.paradigm.powerScaling) {
      case 'linear':
        power *= 1 + avgProf / 100;
        break;
      case 'exponential':
        power *= Math.pow(1.02, avgProf);
        break;
      case 'logarithmic':
        power *= 1 + Math.log10(avgProf + 1);
        break;
      case 'step':
        // Power increases in discrete steps every 25 proficiency
        power *= 1 + Math.floor(avgProf / 25) * 0.5;
        break;
      case 'threshold':
        // Only unlocks at certain thresholds
        if (avgProf >= 75) power *= 3;
        else if (avgProf >= 50) power *= 2;
        else if (avgProf >= 25) power *= 1.5;
        break;
    }

    // Apply power ceiling
    if (this.paradigm.powerCeiling !== undefined) {
      power = Math.min(power, this.paradigm.powerCeiling);
    }

    // Apply validation multipliers
    power *= validation.powerMultiplier;

    return power;
  }

  /**
   * Check if group casting is allowed and calculate the bonus.
   */
  calculateGroupCastingBonus(casterCount: number): number {
    if (!this.paradigm.allowsGroupCasting || casterCount <= 1) {
      return 1.0;
    }

    const baseMultiplier = this.paradigm.groupCastingMultiplier ?? 1.5;
    // Diminishing returns for each additional caster
    return 1 + (baseMultiplier - 1) * Math.sqrt(casterCount - 1);
  }

  /**
   * Get information about the paradigm for display.
   */
  getParadigmInfo(): {
    name: string;
    description: string;
    sources: string[];
    laws: string[];
    risks: string[];
  } {
    return {
      name: this.paradigm.name,
      description: this.paradigm.description,
      sources: this.paradigm.sources.map(s => s.name),
      laws: this.paradigm.laws.map(l => l.name),
      risks: this.paradigm.risks.map(r => `${r.trigger} -> ${r.consequence}`),
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a law enforcer for a paradigm.
 */
export function createLawEnforcer(paradigm: MagicParadigm): MagicLawEnforcer {
  return new MagicLawEnforcer(paradigm);
}
