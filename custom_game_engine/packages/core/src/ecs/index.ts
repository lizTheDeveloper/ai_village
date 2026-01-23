/**
 * Entity-Component-System architecture.
 */

export * from './Component.js';
export * from './ComponentRegistry.js';
export * from './Entity.js';
export { EntityImpl, createEntityId } from './Entity.js';
export * from './System.js';
export * from './SystemRegistry.js';
export * from './SystemHelpers.js';
export * from './QueryBuilder.js';
export * from './World.js';
export * from './SimulationScheduler.js';
export * from './CachedQuery.js';
export {
  type SystemContext,
  SystemContextImpl,
  BaseSystem,
  type ComponentAccessor,
  ComponentAccessorImpl,
  createSystemContext,
  type EntityWithDistance,
} from './SystemContext.js';

// Re-export World class and types explicitly
export { World } from './World.js';
export type { WorldMutator, ITile, TerrainType, IPlanet } from './World.js';
export type { Entity } from './Entity.js';
export type { Component } from './Component.js';
