/**
 * IncarnationComponent - Tracks a soul's incarnation into physical bodies
 *
 * Souls can:
 * - Incarnate into a single body (normal life)
 * - Incarnate into multiple bodies simultaneously (rare, concurrent incarnations)
 * - Exist without a body (death, astral projection, between lives)
 * - Be bound to objects (lich phylacteries)
 *
 * This component lives on SOUL entities, not Agent entities.
 */

import type { Component } from '../ecs/Component.js';

/** Record of a single incarnation */
export interface IncarnationRecord {
  /** Body entity ID */
  bodyId: string;

  /** When this incarnation began */
  incarnationStartTick: number;

  /** When this incarnation ended (undefined if still alive) */
  incarnationEndTick?: number;

  /** How the incarnation ended */
  deathCause?: string;

  /** Body type */
  bodyType: 'mortal' | 'construct' | 'spirit' | 'bound_object';

  /** Species if mortal */
  species?: string;

  /** Name of the incarnated body */
  bodyName?: string;

  /** Was this the primary incarnation at the time? */
  wasPrimary: boolean;
}

/** Soul binding types */
export type SoulBindingType =
  | 'incarnated'      // Normal soul-in-body
  | 'concurrent'      // Multiple bodies at once
  | 'phylactery'      // Bound to object (lich)
  | 'astral'          // Temporarily separated (astral projection)
  | 'disembodied'     // Between lives, in afterlife
  | 'imprisoned';     // Trapped in object/gem/etc

export interface SoulBinding {
  /** Entity ID of body/object */
  targetId: string;

  /** Type of binding */
  bindingType: SoulBindingType;

  /** Strength of binding (0-1, 1 = unbreakable) */
  bindingStrength: number;

  /** When this binding was created */
  createdTick: number;

  /** Is this the primary binding? (conscious control) */
  isPrimary: boolean;
}

export interface IncarnationComponent extends Component {
  type: 'incarnation';

  /**
   * Current active bindings (bodies, phylacteries, etc.)
   * Empty if soul is disembodied
   */
  currentBindings: SoulBinding[];

  /**
   * Primary binding (where conscious control is focused)
   * Most souls have one primary binding
   * Advanced souls can split attention between multiple
   */
  primaryBindingId?: string;

  /**
   * Complete history of all incarnations
   * Preserved across all lives
   */
  incarnationHistory: IncarnationRecord[];

  /**
   * Current incarnation state
   */
  state: 'incarnated' | 'disembodied' | 'astral_projection' | 'bound_to_object';

  /**
   * Can this soul split across multiple bodies?
   * Requires high wisdom/power
   */
  canConcurrentIncarnate: boolean;

  /**
   * Maximum concurrent incarnations allowed
   * Default: 1 (most souls)
   * Advanced: 2-5 (very wise souls, demigods)
   */
  maxConcurrentIncarnations: number;
}

/**
 * Create IncarnationComponent for a newly created soul
 */
export function createIncarnationComponent(
  initialBodyId?: string,
  currentTick?: number,
  bodyType: 'mortal' | 'construct' | 'spirit' | 'bound_object' = 'mortal'
): IncarnationComponent {
  const currentBindings: SoulBinding[] = [];
  const incarnationHistory: IncarnationRecord[] = [];

  // If creating with initial body (birth)
  if (initialBodyId && currentTick !== undefined) {
    const binding: SoulBinding = {
      targetId: initialBodyId,
      bindingType: 'incarnated',
      bindingStrength: 1.0,
      createdTick: currentTick,
      isPrimary: true,
    };
    currentBindings.push(binding);

    // Start incarnation record (will be completed on death)
    incarnationHistory.push({
      bodyId: initialBodyId,
      incarnationStartTick: currentTick,
      bodyType,
      wasPrimary: true,
    });
  }

  return {
    type: 'incarnation',
    version: 1,
    currentBindings,
    primaryBindingId: initialBodyId,
    incarnationHistory,
    state: initialBodyId ? 'incarnated' : 'disembodied',
    canConcurrentIncarnate: false,
    maxConcurrentIncarnations: 1,
  };
}

/**
 * Add a new incarnation (soul entering body)
 */
export function incarnateIntoBody(
  component: IncarnationComponent,
  bodyId: string,
  currentTick: number,
  bodyType: 'mortal' | 'construct' | 'spirit' | 'bound_object' = 'mortal',
  bodyName?: string,
  species?: string
): IncarnationComponent {
  // Check if concurrent incarnation is allowed
  if (component.currentBindings.length >= component.maxConcurrentIncarnations) {
    throw new Error(
      `Soul cannot incarnate into more than ${component.maxConcurrentIncarnations} bodies simultaneously`
    );
  }

  const isPrimary = component.currentBindings.length === 0;

  const binding: SoulBinding = {
    targetId: bodyId,
    bindingType: component.currentBindings.length > 0 ? 'concurrent' : 'incarnated',
    bindingStrength: 1.0,
    createdTick: currentTick,
    isPrimary,
  };

  const incarnationRecord: IncarnationRecord = {
    bodyId,
    incarnationStartTick: currentTick,
    bodyType,
    bodyName,
    species,
    wasPrimary: isPrimary,
  };

  return {
    ...component,
    currentBindings: [...component.currentBindings, binding],
    primaryBindingId: isPrimary ? bodyId : component.primaryBindingId,
    incarnationHistory: [...component.incarnationHistory, incarnationRecord],
    state: component.currentBindings.length > 0 ? 'incarnated' : 'incarnated',
  };
}

/**
 * Remove incarnation (death, soul leaving body)
 */
export function endIncarnation(
  component: IncarnationComponent,
  bodyId: string,
  currentTick: number,
  deathCause?: string
): IncarnationComponent {
  // Remove binding
  const updatedBindings = component.currentBindings.filter(b => b.targetId !== bodyId);

  // Complete incarnation record
  const updatedHistory = component.incarnationHistory.map(record => {
    if (record.bodyId === bodyId && !record.incarnationEndTick) {
      return {
        ...record,
        incarnationEndTick: currentTick,
        deathCause,
      };
    }
    return record;
  });

  // Update primary if this was the primary body
  let newPrimaryId = component.primaryBindingId;
  if (component.primaryBindingId === bodyId) {
    // Set new primary to first remaining binding
    newPrimaryId = updatedBindings.length > 0 ? updatedBindings[0]?.targetId : undefined;
  }

  return {
    ...component,
    currentBindings: updatedBindings,
    primaryBindingId: newPrimaryId,
    incarnationHistory: updatedHistory,
    state: updatedBindings.length === 0 ? 'disembodied' : 'incarnated',
  };
}

/**
 * Bind soul to phylactery (lich transformation)
 */
export function bindToPhylactery(
  component: IncarnationComponent,
  phylacteryId: string,
  currentTick: number
): IncarnationComponent {
  const binding: SoulBinding = {
    targetId: phylacteryId,
    bindingType: 'phylactery',
    bindingStrength: 1.0,
    createdTick: currentTick,
    isPrimary: false, // Phylactery is backup, not primary
  };

  return {
    ...component,
    currentBindings: [...component.currentBindings, binding],
  };
}

/**
 * Start astral projection (soul temporarily leaves body)
 */
export function beginAstralProjection(
  component: IncarnationComponent,
  bodyId: string
): IncarnationComponent {
  const updatedBindings = component.currentBindings.map(binding => {
    if (binding.targetId === bodyId) {
      return {
        ...binding,
        bindingType: 'astral' as SoulBindingType,
        bindingStrength: 0.5, // Weakened during projection
      };
    }
    return binding;
  });

  return {
    ...component,
    currentBindings: updatedBindings,
    state: 'astral_projection',
  };
}

/**
 * End astral projection (soul returns to body)
 */
export function endAstralProjection(
  component: IncarnationComponent,
  bodyId: string
): IncarnationComponent {
  const updatedBindings = component.currentBindings.map(binding => {
    if (binding.targetId === bodyId && binding.bindingType === 'astral') {
      return {
        ...binding,
        bindingType: 'incarnated' as SoulBindingType,
        bindingStrength: 1.0,
      };
    }
    return binding;
  });

  return {
    ...component,
    currentBindings: updatedBindings,
    state: 'incarnated',
  };
}

/**
 * Get total number of lives lived by this soul
 */
export function getLivesLived(component: IncarnationComponent): number {
  // Count completed incarnations + current incarnations
  const completedLives = component.incarnationHistory.filter(
    record => record.incarnationEndTick !== undefined
  ).length;

  const currentLives = component.currentBindings.filter(
    binding => binding.bindingType === 'incarnated' || binding.bindingType === 'concurrent'
  ).length;

  return completedLives + currentLives;
}

/**
 * Get current primary body ID
 */
export function getPrimaryBodyId(component: IncarnationComponent): string | undefined {
  return component.primaryBindingId;
}

/**
 * Check if soul is currently incarnated
 */
export function isIncarnated(component: IncarnationComponent): boolean {
  return component.currentBindings.some(
    b => b.bindingType === 'incarnated' || b.bindingType === 'concurrent'
  );
}
