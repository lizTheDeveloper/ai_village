import type { SystemId, ComponentType } from '../types.js';
import type { Entity } from './Entity.js';
import type { World } from './World.js';
import type { EventBus } from '../events/EventBus.js';
import type { GameEvent } from '../events/GameEvent.js';

/**
 * Optional metadata for system discoverability.
 * Helps agents understand system relationships without reading implementation.
 */
export interface SystemMetadata {
  /** System IDs that must run before this system (lower priority) */
  dependsOn?: readonly SystemId[];

  /** Components this system reads (beyond requiredComponents filter) */
  readsComponents?: readonly ComponentType[];

  /** Components this system modifies */
  writesComponents?: readonly ComponentType[];

  /** Category for organization */
  category?: 'infrastructure' | 'environment' | 'agent_core' | 'cognition' | 'social' | 'building' | 'economy' | 'combat' | 'divinity' | 'magic' | 'utility';

  /** Throttle interval in ticks (if not every tick) */
  throttleInterval?: number;

  /** Brief description of what this system does */
  description?: string;
}

/**
 * Systems contain game logic. They:
 * - Read component data
 * - Emit events
 * - Submit actions
 * - Never directly modify components (only via WorldMutator)
 */
export interface System {
  /** Unique identifier */
  readonly id: SystemId;

  /** Execution priority (lower = earlier) */
  readonly priority: number;

  /** Components required for this system to process an entity */
  readonly requiredComponents: ReadonlyArray<ComponentType>;

  /** Optional metadata for discoverability */
  readonly metadata?: SystemMetadata;

  /** Called once when system is registered */
  initialize?(world: World, eventBus: EventBus): void;

  /** Called each tick for entities with required components */
  update(
    world: World,
    entities: ReadonlyArray<Entity>,
    deltaTime: number
  ): void;

  /** Handle events from other systems */
  onEvent?(event: GameEvent): void;

  /** Called when system is unregistered */
  cleanup?(): void;
}

/**
 * Statistics for a system's performance.
 */
export interface SystemStats {
  readonly systemId: SystemId;
  readonly enabled: boolean;
  readonly avgTickTimeMs: number;
  readonly maxTickTimeMs: number;
  readonly lastEntityCount: number;
  readonly lastEventCount: number;
}
