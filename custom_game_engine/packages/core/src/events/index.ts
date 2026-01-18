/**
 * Event system for decoupled communication between systems.
 */

export * from './GameEvent.js';
export * from './EventBus.js';
export type { EventBus } from './EventBus.js';
export * from './EventMap.js';
export * from './EventFilters.js';
export { SystemEventManager, createTypedEmitter, EventEmitters, type TypedEmitter, type TypedEventHandler } from './TypedEventEmitter.js';

// Domain event modules
export * from './domains/index.js';

// Domain helpers
export * from './helpers/DomainEvents.js';
