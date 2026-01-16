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

// Re-export types explicitly (export * doesn't re-export types)
// Note: BiomeType is also exported from SoilSystem.ts - avoid duplicate exports
export type { World, WorldMutator, ITile, TerrainType } from './World.js';
export type { Entity } from './Entity.js';
export type { Component } from './Component.js';
