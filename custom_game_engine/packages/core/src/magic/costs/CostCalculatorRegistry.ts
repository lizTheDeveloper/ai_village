/**
 * CostCalculatorRegistry - Singleton registry for paradigm cost calculators
 *
 * Manages all paradigm-specific cost calculators and provides lookup.
 */

import type { ParadigmCostCalculator } from './CostCalculator.js';

/**
 * Registry for paradigm cost calculators.
 * Use the singleton `costCalculatorRegistry` exported from this module.
 */
export class CostCalculatorRegistry {
  private calculators: Map<string, ParadigmCostCalculator> = new Map();

  /**
   * Register a cost calculator for a paradigm.
   *
   * @param calculator The calculator to register
   * @throws Error if a calculator is already registered for this paradigm
   */
  register(calculator: ParadigmCostCalculator): void {
    if (this.calculators.has(calculator.paradigmId)) {
      throw new Error(
        `Calculator already registered for paradigm: ${calculator.paradigmId}`
      );
    }
    this.calculators.set(calculator.paradigmId, calculator);
  }

  /**
   * Register a calculator, replacing any existing one.
   *
   * @param calculator The calculator to register
   */
  registerOrReplace(calculator: ParadigmCostCalculator): void {
    this.calculators.set(calculator.paradigmId, calculator);
  }

  /**
   * Get a calculator for a paradigm.
   *
   * @param paradigmId The paradigm ID
   * @returns The cost calculator
   * @throws Error if no calculator is registered for this paradigm
   */
  get(paradigmId: string): ParadigmCostCalculator {
    const calculator = this.calculators.get(paradigmId);
    if (!calculator) {
      throw new Error(
        `No cost calculator registered for paradigm: ${paradigmId}. ` +
          `Available: ${this.getRegisteredParadigms().join(', ')}`
      );
    }
    return calculator;
  }

  /**
   * Check if a calculator is registered for a paradigm.
   *
   * @param paradigmId The paradigm ID
   */
  has(paradigmId: string): boolean {
    return this.calculators.has(paradigmId);
  }

  /**
   * Get all registered paradigm IDs.
   */
  getRegisteredParadigms(): string[] {
    return Array.from(this.calculators.keys());
  }

  /**
   * Unregister a calculator.
   *
   * @param paradigmId The paradigm ID to unregister
   * @returns true if a calculator was removed
   */
  unregister(paradigmId: string): boolean {
    return this.calculators.delete(paradigmId);
  }

  /**
   * Clear all registered calculators.
   * Useful for testing.
   */
  clear(): void {
    this.calculators.clear();
  }
}

/**
 * Singleton instance of the cost calculator registry.
 * Import this to access the global registry.
 */
export const costCalculatorRegistry = new CostCalculatorRegistry();
