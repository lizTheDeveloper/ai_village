import type { SystemId, ComponentType } from '../types.js';
import type { Entity } from './Entity.js';
import type { World } from './World.js';
import type { EventBus } from '../events/EventBus.js';
import type { GameEvent } from '../events/GameEvent.js';

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
