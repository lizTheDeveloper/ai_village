/**
 * Core primitive types for Multiverse: The End of Eternity game engine.
 * These types are stable and never change.
 */

/** Globally unique identifier for entities */
export type EntityId = string;

/** Identifies a component type (e.g., "position", "agent", "needs") */
export type ComponentType = string;

/** Type-safe component type values - use for hasComponent/getComponent calls */
export { ComponentType as CT } from './types/ComponentType.js';

/** Type-safe building type values - use for building type comparisons */
export { BuildingType } from './types/BuildingType.js';

/** Identifies a system (e.g., "movement", "farming", "memory") */
export type SystemId = string;

/** Identifies an action type (e.g., "move", "talk", "craft") */
export type ActionType = string;

/**
 * Identifies an event type (e.g., "entity:created", "agent:action:completed")
 * Now typed via EventMap for compile-time safety - re-exported from events/EventMap.ts
 */
export type { EventType } from './events/EventMap.js';

/** Game tick counter - monotonically increasing */
export type Tick = number;

/** Timestamp in milliseconds since epoch */
export type Timestamp = number;

/** 3D position (z defaults to 0 for 2D compatibility) */
export interface Position {
  readonly x: number;
  readonly y: number;
  /** Z-level for future 3D support. 0 = surface level, negative = underground, positive = above ground */
  readonly z?: number;
}

/** 2D position without z-level (for legacy code and explicit 2D operations) */
export interface Position2D {
  readonly x: number;
  readonly y: number;
}

/** Feature flag configuration */
export interface FeatureConfig {
  readonly enabled: boolean;
  readonly version: number;
  readonly config?: Readonly<Record<string, unknown>>;
}

export interface FeatureFlags {
  readonly [feature: string]: FeatureConfig | boolean | undefined;
}

/** Game time tracking */
export interface GameTime {
  readonly totalTicks: Tick;
  readonly ticksPerHour: number;
  readonly hour: number; // 0-23
  readonly day: number; // 1-based
  readonly season: Season;
  readonly year: number;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** Constants */
export const CURRENT_SAVE_VERSION = 1;
export const GAME_VERSION = '0.1.0';
export const TICKS_PER_SECOND = 20;
export const MS_PER_TICK = 50;
export const CHUNK_SIZE = 32; // Re-exported from world package
