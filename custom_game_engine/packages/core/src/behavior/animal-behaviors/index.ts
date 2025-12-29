/**
 * Animal Behaviors Module
 *
 * Exports all animal behavior components for the AnimalBrainSystem.
 *
 * Part of Phase 5 of the AISystem decomposition (work-order: ai-system-refactor)
 */

// Base interface and abstract class
export {
  type IAnimalBehavior,
  type AnimalBehaviorResult,
  BaseAnimalBehavior,
} from './AnimalBehavior.js';

// Individual behaviors
export { GrazeBehavior } from './GrazeBehavior.js';
export { FleeBehavior } from './FleeBehavior.js';
export { RestBehavior, IdleBehavior } from './RestBehavior.js';

// Brain system
export {
  AnimalBrainSystem,
  type BehaviorRegistry,
  createAnimalBrainSystem,
} from './AnimalBrainSystem.js';
