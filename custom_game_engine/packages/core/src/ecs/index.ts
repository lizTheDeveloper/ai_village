/**
 * Entity-Component-System architecture.
 */

export * from './Component.js';
export * from './ComponentRegistry.js';
export * from './Entity.js';
export * from './System.js';
export * from './SystemRegistry.js';
export * from './QueryBuilder.js';
export * from './World.js';

// Re-export types explicitly (export * doesn't re-export types)
export type { WorldMutator } from './World.js';
