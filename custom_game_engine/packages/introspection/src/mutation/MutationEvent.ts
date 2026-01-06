/**
 * Event types for the mutation system
 */

/**
 * Source of a mutation (who initiated the change)
 */
export type MutationSource = 'dev' | 'user' | 'system';

/**
 * Event emitted when a component field is mutated
 */
export interface MutationEvent {
  /** ID of the entity that was mutated */
  entityId: string;

  /** Type of component that was mutated */
  componentType: string;

  /** Name of the field that changed */
  fieldName: string;

  /** Previous value before mutation */
  oldValue: unknown;

  /** New value after mutation */
  newValue: unknown;

  /** When the mutation occurred (milliseconds since epoch) */
  timestamp: number;

  /** Who initiated the mutation */
  source: MutationSource;
}

/**
 * Handler function for mutation events
 */
export type MutationEventHandler = (event: MutationEvent) => void;

/**
 * Event types that can be listened to
 */
export type MutationEventType = 'mutated' | 'mutation_failed';

/**
 * Event emitted when a mutation fails validation
 */
export interface MutationFailedEvent {
  /** ID of the entity that mutation was attempted on */
  entityId: string;

  /** Type of component that mutation was attempted on */
  componentType: string;

  /** Name of the field that mutation was attempted on */
  fieldName: string;

  /** Value that was attempted to be set */
  attemptedValue: unknown;

  /** Reason for failure */
  reason: string;

  /** When the mutation was attempted */
  timestamp: number;

  /** Who initiated the mutation */
  source: MutationSource;
}
