/**
 * MutationVectorComponent - Entity-local storage for mutation rates
 *
 * This component enables the StateMutatorSystem to apply smooth per-tick
 * state changes WITHOUT the GC pressure of updateComponent() calls.
 *
 * Instead of storing deltas in an external Map and calling getEntity() +
 * updateComponent() every batch, rates are stored ON the entity and
 * mutated in place.
 *
 * Benefits:
 * - Runs every tick = smooth interpolation (no jumpy values)
 * - No getEntity() calls = no world lookups
 * - No updateComponent() = no object allocations
 * - Derivative support = effects can decay naturally
 * - Entity-local storage = no external Map, no cleanup functions
 *
 * @example
 * ```typescript
 * // Set a mutation rate (e.g., hunger decreasing)
 * setMutationRate(entity, 'needs.hunger', -0.0008 / 60, {
 *   min: 0,
 *   max: 1,
 *   source: 'needs_system'
 * });
 *
 * // Set a healing-over-time with decay
 * setMutationRate(entity, 'body.health', 0.5, {
 *   derivative: -0.1,  // Rate decays over time
 *   min: 0,
 *   max: 100,
 *   source: 'bandage',
 *   totalAmount: 20  // Stop after 20 hp healed
 * });
 * ```
 */

import type { Entity } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';

/**
 * A single mutation field tracking rate of change
 */
export interface MutationField {
  /** Current rate of change per second */
  rate: number;

  /** Rate of change of rate per second (for decay/acceleration) */
  derivative: number;

  /** Minimum bound (optional) */
  min?: number;

  /** Maximum bound (optional) */
  max?: number;

  /** Source system for debugging */
  source: string;

  /** Tick at which this mutation expires (optional) */
  expiresAt?: number;

  /** Total amount to apply before expiring (optional, for bandages/potions) */
  totalAmount?: number;

  /** Amount applied so far (tracked internally) */
  appliedAmount?: number;
}

/**
 * MutationVectorComponent - stores mutation rates ON the entity
 * for efficient per-tick application by StateMutatorSystem
 */
export interface MutationVectorComponent {
  type: 'mutation_vector';
  version: 1;

  /**
   * Map of field paths to their mutation rates
   * Field paths are dot-separated: "needs.hunger", "body.health"
   */
  fields: Record<string, MutationField>;
}

/**
 * Create a new MutationVectorComponent
 */
export function createMutationVectorComponent(): MutationVectorComponent {
  return {
    type: 'mutation_vector',
    version: 1,
    fields: {},
  };
}

/**
 * Options for setting a mutation rate
 */
export interface MutationRateOptions {
  /** Rate of change of rate per second (for decay/acceleration) */
  derivative?: number;
  /** Minimum bound */
  min?: number;
  /** Maximum bound */
  max?: number;
  /** Source system for debugging */
  source?: string;
  /** Tick at which this mutation expires */
  expiresAt?: number;
  /** Total amount to apply before expiring */
  totalAmount?: number;
}

/**
 * Set a mutation rate on an entity.
 * Creates MutationVectorComponent if needed.
 *
 * @param entity - The entity to set the mutation on
 * @param fieldPath - Dot-separated path like "needs.hunger" or "body.health"
 * @param rate - Rate of change per second (negative for decrease)
 * @param options - Additional options for bounds, decay, expiration
 *
 * @example
 * ```typescript
 * // Hunger decreases slowly
 * setMutationRate(entity, 'needs.hunger', -0.0008 / 60, {
 *   min: 0, max: 1, source: 'needs_system'
 * });
 *
 * // Health regenerates with decay
 * setMutationRate(entity, 'body.health', 0.5, {
 *   derivative: -0.05,  // Slows down over time
 *   min: 0, max: 100,
 *   source: 'regen'
 * });
 *
 * // Bandage heals fixed amount
 * setMutationRate(entity, 'body.health', 2, {
 *   min: 0, max: 100,
 *   totalAmount: 20,  // Stop after 20 healed
 *   source: 'bandage'
 * });
 * ```
 */
export function setMutationRate(
  entity: Entity,
  fieldPath: string,
  rate: number,
  options?: MutationRateOptions
): void {
  let mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);

  if (!mv) {
    mv = createMutationVectorComponent();
    // Type-safe: Use EntityImpl interface which exposes addComponent
    // Type guard: check if entity has addComponent method (EntityImpl)
    if ('addComponent' in entity && typeof entity.addComponent === 'function') {
      entity.addComponent(mv);
    } else {
      throw new Error('Cannot add component: entity does not support addComponent');
    }
  }

  mv.fields[fieldPath] = {
    rate,
    derivative: options?.derivative ?? 0,
    min: options?.min,
    max: options?.max,
    source: options?.source ?? 'unknown',
    expiresAt: options?.expiresAt,
    totalAmount: options?.totalAmount,
    appliedAmount: options?.totalAmount !== undefined ? 0 : undefined,
  };
}

/**
 * Add to an existing mutation rate (accumulate rates from multiple sources)
 *
 * If no mutation exists for this field, creates one.
 * If one exists, adds to the rate (useful for stacking effects).
 *
 * @example
 * ```typescript
 * // Multiple damage sources stack
 * addMutationRate(entity, 'body.health', -1, { source: 'poison' });
 * addMutationRate(entity, 'body.health', -0.5, { source: 'bleeding' });
 * // Total rate is now -1.5/second
 * ```
 */
export function addMutationRate(
  entity: Entity,
  fieldPath: string,
  rate: number,
  options?: MutationRateOptions
): void {
  const mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);

  if (!mv || !mv.fields[fieldPath]) {
    // No existing mutation - just set it
    setMutationRate(entity, fieldPath, rate, options);
    return;
  }

  // Add to existing rate
  const existing = mv.fields[fieldPath];
  existing.rate += rate;

  // Update bounds if provided and more restrictive
  if (options?.min !== undefined) {
    existing.min = existing.min !== undefined
      ? Math.max(existing.min, options.min)
      : options.min;
  }
  if (options?.max !== undefined) {
    existing.max = existing.max !== undefined
      ? Math.min(existing.max, options.max)
      : options.max;
  }
}

/**
 * Clear a mutation rate.
 *
 * @param entity - The entity to clear the mutation from
 * @param fieldPath - The field path to clear
 */
export function clearMutationRate(entity: Entity, fieldPath: string): void {
  const mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);
  if (mv?.fields[fieldPath]) {
    delete mv.fields[fieldPath];
  }
}

/**
 * Clear all mutation rates from a specific source.
 *
 * @example
 * ```typescript
 * // Remove all poison effects
 * clearMutationsBySource(entity, 'poison');
 * ```
 */
export function clearMutationsBySource(entity: Entity, source: string): void {
  const mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);
  if (!mv) return;

  for (const [fieldPath, field] of Object.entries(mv.fields)) {
    if (field.source === source) {
      delete mv.fields[fieldPath];
    }
  }
}

/**
 * Get current mutation rate for a field.
 *
 * @returns The rate per second, or 0 if no mutation registered
 */
export function getMutationRate(entity: Entity, fieldPath: string): number {
  const mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);
  return mv?.fields[fieldPath]?.rate ?? 0;
}

/**
 * Get full mutation field data for a field.
 *
 * @returns The MutationField or undefined if not registered
 */
export function getMutationField(entity: Entity, fieldPath: string): MutationField | undefined {
  const mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);
  return mv?.fields[fieldPath];
}

/**
 * Check if entity has any active mutations
 */
export function hasMutations(entity: Entity): boolean {
  const mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);
  return mv !== undefined && Object.keys(mv.fields).length > 0;
}

/**
 * Get all active mutation field paths for an entity
 */
export function getMutationFieldPaths(entity: Entity): string[] {
  const mv = entity.getComponent<MutationVectorComponent>(CT.MutationVector);
  return mv ? Object.keys(mv.fields) : [];
}

/**
 * Type-safe field path constants to avoid typos
 */
export const MUTATION_PATHS = {
  // Needs
  NEEDS_HUNGER: 'needs.hunger',
  NEEDS_ENERGY: 'needs.energy',
  NEEDS_THIRST: 'needs.thirst',

  // Body/Health
  BODY_HEALTH: 'body.health',
  BODY_BLOOD_LEVEL: 'body.bloodLevel',

  // Animal needs
  ANIMAL_HUNGER: 'animal.hunger',
  ANIMAL_THIRST: 'animal.thirst',
  ANIMAL_ENERGY: 'animal.energy',
  ANIMAL_AGE: 'animal.age',
  ANIMAL_STRESS: 'animal.stress',

  // Sleep
  CIRCADIAN_SLEEP_DRIVE: 'circadian.sleepDrive',

  // Temperature
  TEMPERATURE_CURRENT: 'temperature.currentTemp',

  // Building
  BUILDING_CONDITION: 'building.condition',

  // Assembly
  ASSEMBLY_PROGRESS: 'assembly_machine.progress',

  // Afterlife
  AFTERLIFE_COHERENCE: 'afterlife.coherence',
  AFTERLIFE_TETHER: 'afterlife.tether',
  AFTERLIFE_SOLITUDE: 'afterlife.solitude',
  AFTERLIFE_PEACE: 'afterlife.peace',

  // Swimming
  AGENT_OXYGEN: 'agent.oxygen',

  // Magic
  MANA_CURRENT: 'mana.current',
  MANA_STAMINA: 'mana.stamina',
} as const;

export type MutationPath = (typeof MUTATION_PATHS)[keyof typeof MUTATION_PATHS];
