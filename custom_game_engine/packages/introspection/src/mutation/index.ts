/**
 * Phase 2B: Mutation Layer
 *
 * Provides validated, reversible component mutations with event emission.
 */

export { MutationService } from './MutationService.js';
export type { MutationResult, MutationRequest } from './MutationService.js';

export { ValidationService } from './ValidationService.js';
export type { ValidationResult } from './ValidationService.js';

export { UndoStack } from './UndoStack.js';
export type { MutationCommand } from './UndoStack.js';

export type {
  MutationEvent,
  MutationEventHandler,
  MutationSource,
  MutationFailedEvent,
} from './MutationEvent.js';
