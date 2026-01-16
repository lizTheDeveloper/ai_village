/**
 * Behavior Module
 *
 * This module contains behavior management for agents:
 * - BehaviorRegistry: Central registry for behavior handlers
 * - Individual behavior implementations (to be extracted from AISystem)
 *
 * Part of Phase 6 of the AISystem decomposition (work-order: ai-system-refactor)
 */

// Behavior Registry
export {
  BehaviorRegistry,
  getBehaviorRegistry,
  initBehaviorRegistry,
  registerBehavior,
  registerBehaviorWithContext,
  executeBehavior,
  type BehaviorHandler,
  type ContextBehaviorHandler,
  type AnyBehaviorHandler,
  type BehaviorMeta,
} from './BehaviorRegistry.js';

// Behavior Context - the modern API for behaviors
export {
  type BehaviorContext,
  type BehaviorResult,
  type EntityWithDistance,
  type SpatialQueryOptions,
  type MoveOptions,
  BehaviorContextImpl,
  createBehaviorContext,
} from './BehaviorContext.js';

// Animal Behaviors (from Phase 5)
export {
  type IAnimalBehavior,
  type AnimalBehaviorResult,
  BaseAnimalBehavior,
  GrazeBehavior,
  FleeBehavior,
  RestBehavior,
  IdleBehavior,
  AnimalBrainSystem,
  type BehaviorRegistry as AnimalBehaviorRegistry,
  createAnimalBrainSystem,
} from './animal-behaviors/index.js';

// Agent Behaviors - all behavior implementations
export * from './behaviors/index.js';
