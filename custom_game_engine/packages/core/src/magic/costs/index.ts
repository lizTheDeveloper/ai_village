/**
 * Magic Costs System
 *
 * This module provides paradigm-specific cost calculation, deduction, and recovery
 * for the magic system. Each paradigm has unique costs that reflect its nature.
 *
 * Usage:
 * ```typescript
 * import { costCalculatorRegistry, costRecoveryManager } from './magic/costs';
 *
 * // Get calculator for a paradigm
 * const calculator = costCalculatorRegistry.get('academic');
 *
 * // Calculate costs for a spell
 * const costs = calculator.calculateCosts(spell, caster, context);
 *
 * // Check affordability
 * const affordability = calculator.canAfford(costs, caster);
 *
 * // Deduct costs
 * const result = calculator.deductCosts(costs, caster, paradigm);
 *
 * // Apply passive regeneration (each tick)
 * costRecoveryManager.applyPassiveRegeneration(caster, deltaTime);
 * ```
 */

// Core types and interfaces
export type {
  ParadigmCostCalculator,
  CastingContext,
  SpellCost,
  AffordabilityResult,
  DeductionResult,
  TerminalEffect,
  ResourceInitOptions,
} from './CostCalculator.js';

export {
  BaseCostCalculator,
  createDefaultContext,
} from './CostCalculator.js';

// Registry
export {
  CostCalculatorRegistry,
  costCalculatorRegistry,
} from './CostCalculatorRegistry.js';

// Recovery
export {
  CostRecoveryManager,
  costRecoveryManager,
} from './CostRecoveryManager.js';

// Paradigm-specific calculators
export { AcademicCostCalculator } from './calculators/AcademicCostCalculator.js';
export { PactCostCalculator } from './calculators/PactCostCalculator.js';
export { NameCostCalculator } from './calculators/NameCostCalculator.js';
export { BreathCostCalculator } from './calculators/BreathCostCalculator.js';
export { DivineCostCalculator } from './calculators/DivineCostCalculator.js';
export { BloodCostCalculator } from './calculators/BloodCostCalculator.js';
export { EmotionalCostCalculator } from './calculators/EmotionalCostCalculator.js';
export { DivineCastingCalculator } from './calculators/DivineCastingCalculator.js';

// Registration helper
export { registerAllCostCalculators } from './calculators/registerAll.js';
