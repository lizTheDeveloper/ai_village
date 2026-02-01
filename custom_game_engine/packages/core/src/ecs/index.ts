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
export * from './DirtyTracker.js';
export * from './ChunkTickScheduler.js';
export * from './UpdatePropagation.js';
export {
  type SystemContext,
  SystemContextImpl,
  BaseSystem,
  type ComponentAccessor,
  ComponentAccessorImpl,
  createSystemContext,
  type EntityWithDistance,
} from './SystemContext.js';

// World and WorldImpl are exported via the `export *` above from World.js
// World is both a value (constructor alias for WorldImpl) and a type (interface)
export type { Entity } from './Entity.js';
export type { Component } from './Component.js';

// ChunkStateManager - Minecraft-style lazy chunk loading for entity simulation
// Reduces chunks processed by 95% using ACTIVE/LAZY/UNLOADED states
export * from './ChunkStateManager.js';
export {
  ChunkStateManager,
  ChunkState,
  chunkStateManager,
  type ChunkStateConfig,
  type ChunkInfo,
} from './ChunkStateManager.js';

// EntityDemotion - Factorio-style optimization for passive objects
// 10x memory reduction by storing resources/items as lightweight data instead of full entities
export * from './EntityDemotion.js';
export {
  ResourceDataStore,
  DroppedItemDataStore,
  resourceDataStore,
  droppedItemDataStore,
  demoteResourceEntity,
  promoteResourceRecord,
  type ResourceRecord,
  type DroppedItemRecord,
} from './EntityDemotion.js';
