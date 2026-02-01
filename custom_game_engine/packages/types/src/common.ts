/**
 * Common type definitions used across all packages.
 * These are the most fundamental types with zero dependencies.
 */

/**
 * Unique identifier for entities in the ECS system.
 */
export type EntityId = string;

/**
 * Component type identifier.
 */
export type ComponentType = string;

/**
 * Game tick counter - 20 ticks per second.
 */
export type Tick = number;

/**
 * In-game time representation.
 */
export interface GameTime {
  tick: Tick;
  day: number;
  hour: number;
  minute: number;
  season: Season;
  year: number;
}

/**
 * Seasons in the game world.
 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Feature flags for optional game features.
 */
export interface FeatureFlags {
  enableLLM?: boolean;
  enableMultiplayer?: boolean;
  enableDebugMode?: boolean;
  enableMetrics?: boolean;
  [key: string]: boolean | undefined;
}

/**
 * Priority levels for various queue systems.
 */
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Base interface for all components.
 * All component interfaces should extend this.
 */
export interface ComponentBase {
  /** Identifies the component type */
  readonly type: ComponentType;
  /** Schema version for migrations */
  readonly version: number;
}
