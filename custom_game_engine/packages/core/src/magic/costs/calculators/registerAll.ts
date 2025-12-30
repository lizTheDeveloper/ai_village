/**
 * Registration of all paradigm cost calculators
 *
 * Call registerAllCostCalculators() at startup to register all
 * built-in paradigm calculators with the global registry.
 */

import { costCalculatorRegistry } from '../CostCalculatorRegistry.js';
import { AcademicCostCalculator } from './AcademicCostCalculator.js';
import { PactCostCalculator } from './PactCostCalculator.js';
import { NameCostCalculator } from './NameCostCalculator.js';
import { BreathCostCalculator } from './BreathCostCalculator.js';
import { DivineCostCalculator } from './DivineCostCalculator.js';
import { BloodCostCalculator } from './BloodCostCalculator.js';
import { EmotionalCostCalculator } from './EmotionalCostCalculator.js';
import { DivineCastingCalculator } from './DivineCastingCalculator.js';

/**
 * Register all built-in cost calculators with the global registry.
 *
 * Call this once at application startup before using any magic systems.
 */
export function registerAllCostCalculators(): void {
  // Core paradigms
  costCalculatorRegistry.registerOrReplace(new AcademicCostCalculator());
  costCalculatorRegistry.registerOrReplace(new PactCostCalculator());
  costCalculatorRegistry.registerOrReplace(new NameCostCalculator());
  costCalculatorRegistry.registerOrReplace(new BreathCostCalculator());
  costCalculatorRegistry.registerOrReplace(new DivineCostCalculator());
  costCalculatorRegistry.registerOrReplace(new BloodCostCalculator());
  costCalculatorRegistry.registerOrReplace(new EmotionalCostCalculator());

  // Special calculators
  costCalculatorRegistry.registerOrReplace(new DivineCastingCalculator());
}

/**
 * Get all registered paradigm IDs.
 */
export function getRegisteredParadigms(): string[] {
  return costCalculatorRegistry.getRegisteredParadigms();
}

/**
 * Check if all core paradigms are registered.
 */
export function verifyCoreParadigmsRegistered(): boolean {
  const coreParadigms = [
    'academic',
    'pact',
    'names',
    'breath',
    'divine',
    'blood',
    'emotional',
    'divine_casting',
  ];

  return coreParadigms.every(id => costCalculatorRegistry.has(id));
}
