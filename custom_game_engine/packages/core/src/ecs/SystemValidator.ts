/**
 * SystemValidator - Development-time validation for system performance patterns
 *
 * Helps catch common performance antipatterns:
 * - Overly broad requiredComponents (causes iteration over too many entities)
 * - Missing activationComponents (system runs when it has nothing to do)
 * - Throttle intervals without stagger offsets (causes tick spikes)
 *
 * Usage:
 * ```typescript
 * // In development mode, validate systems on registration
 * if (import.meta.env.DEV) {
 *   SystemValidator.validate(system);
 * }
 * ```
 */

import type { System } from './System.js';
import type { ComponentType } from '../types.js';

export interface ValidationResult {
  systemId: string;
  warnings: string[];
  suggestions: string[];
}

/**
 * Validate a system for common performance issues.
 */
export function validateSystem(system: System): ValidationResult {
  const result: ValidationResult = {
    systemId: system.id,
    warnings: [],
    suggestions: [],
  };

  // Check 1: Empty requiredComponents with activationComponents
  // This is suspicious but sometimes valid for multi-entity-type systems
  if (system.requiredComponents.length === 0) {
    if (system.activationComponents && system.activationComponents.length > 0) {
      result.suggestions.push(
        `System has empty requiredComponents but specifies activationComponents [${system.activationComponents.join(', ')}]. ` +
        `If this system only processes entities with those components, add them to requiredComponents for faster filtering.`
      );
    } else {
      result.warnings.push(
        `System has empty requiredComponents and no activationComponents. ` +
        `This system will iterate ALL entities in the world. Add requiredComponents to filter.`
      );
    }
  }

  // Check 2: Only 'position' in requiredComponents
  // This is often a sign of broad filtering that should include more components
  if (
    system.requiredComponents.length === 1 &&
    system.requiredComponents[0] === 'position'
  ) {
    result.warnings.push(
      `System only requires 'position' component. ` +
      `This matches nearly all entities with spatial presence. ` +
      `Add more specific components (e.g., 'agent', 'building') to reduce iteration.`
    );
  }

  // Check 3: Missing activationComponents for non-critical systems
  if (!system.activationComponents || system.activationComponents.length === 0) {
    if (system.priority > 50) {
      // Lower priority = more critical, higher priority = utility
      result.suggestions.push(
        `System has no activationComponents. ` +
        `Consider adding activationComponents for O(1) early-exit when component type doesn't exist in world.`
      );
    }
  }

  return result;
}

/**
 * Validate multiple systems and detect stagger conflicts.
 */
export function validateSystemGroup(systems: System[]): {
  results: ValidationResult[];
  staggerWarnings: string[];
} {
  const results = systems.map(validateSystem);

  // Check for throttle interval collisions without stagger offsets
  const staggerWarnings: string[] = [];
  const intervalGroups: Map<number, System[]> = new Map();

  for (const system of systems) {
    // Access throttleInterval if it exists
    const throttleInterval = (system as System & { throttleInterval?: number }).throttleInterval;
    if (throttleInterval && throttleInterval > 0) {
      const group = intervalGroups.get(throttleInterval) || [];
      group.push(system);
      intervalGroups.set(throttleInterval, group);
    }
  }

  for (const [interval, group] of intervalGroups) {
    if (group.length > 3) {
      // More than 3 systems with same interval = potential tick spike
      const systemIds = group.map(s => s.id).join(', ');
      staggerWarnings.push(
        `${group.length} systems share throttleInterval=${interval}: [${systemIds}]. ` +
        `Consider adding throttleOffset to spread load (see STAGGER in SystemThrottleConfig.ts).`
      );
    }
  }

  return { results, staggerWarnings };
}

/**
 * Log validation results to console in development mode.
 */
export function logValidationResults(result: ValidationResult): void {
  if (result.warnings.length > 0 || result.suggestions.length > 0) {
    console.group(`[SystemValidator] ${result.systemId}`);
    for (const warning of result.warnings) {
      console.warn(`⚠️ ${warning}`);
    }
    for (const suggestion of result.suggestions) {
      console.info(`💡 ${suggestion}`);
    }
    console.groupEnd();
  }
}

export const SystemValidator = {
  validate: validateSystem,
  validateGroup: validateSystemGroup,
  log: logValidationResults,
};
