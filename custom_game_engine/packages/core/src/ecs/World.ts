import type {
  EntityId,
  ComponentType,
  Tick,
  GameTime,
  FeatureFlags,
  Season,
} from '../types.js';
import type { Component } from './Component.js';
import type { Entity } from './Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { IQueryBuilder } from './QueryBuilder.js';
import { QueryBuilder } from './QueryBuilder.js';

/**
 * Read-only view of the world state.
 * Systems use this to query data.
 */
export interface World {
  /** Current game tick */
  readonly tick: Tick;

  /** Current game time */
  readonly gameTime: GameTime;

  /** All entities */
  readonly entities: ReadonlyMap<EntityId, Entity>;

  /** Event bus for communication */
  readonly eventBus: EventBus;

  /** Query entities */
  query(): IQueryBuilder;

  /** Get single entity */
  getEntity(id: EntityId): Entity | undefined;

  /** Get component from entity */
  getComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType
  ): T | undefined;

  /** Check if entity has component */
  hasComponent(entityId: EntityId, componentType: ComponentType): boolean;

  /** Get entities in a chunk */
  getEntitiesInChunk(chunkX: number, chunkY: number): ReadonlyArray<EntityId>;

  /** Get entities in a rectangle */
  getEntitiesInRect(
    x: number,
    y: number,
    width: number,
    height: number
  ): ReadonlyArray<EntityId>;

  /** Get feature flags */
  readonly features: FeatureFlags;

  /** Check if feature is enabled */
  isFeatureEnabled(feature: string): boolean;
}

/**
 * Mutable operations on the world.
 * Only the game loop should have access to this.
 */
export interface WorldMutator extends World {
  /** Create a new entity */
  createEntity(archetype: string): EntityId;

  /** Destroy an entity */
  destroyEntity(id: EntityId, reason: string): void;

  /** Add component to entity */
  addComponent(entityId: EntityId, component: Component): void;

  /** Update component on entity */
  updateComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType,
    updater: (current: T) => T
  ): void;

  /** Remove component from entity */
  removeComponent(entityId: EntityId, componentType: ComponentType): void;

  /** Advance game tick */
  advanceTick(): void;

  /** Set feature flag */
  setFeature(feature: string, enabled: boolean): void;
}

/**
 * Implementation of World.
 * Internal - should only be created by GameLoop.
 */
export class WorldImpl implements WorldMutator {
  private _tick: Tick = 0;
  private _gameTime: GameTime;
  private _entities = new Map<EntityId, Entity>();
  private _features: Map<string, boolean> = new Map();
  private _eventBus: EventBus;

  // Spatial indices (will be populated as needed)
  private chunkIndex = new Map<string, Set<EntityId>>();

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
    this._gameTime = {
      totalTicks: 0,
      ticksPerHour: 1200, // 1 hour = 1 minute real time at 20 TPS
      hour: 6, // Start at dawn
      day: 1,
      season: 'spring',
      year: 1,
    };
  }

  get tick(): Tick {
    return this._tick;
  }

  get gameTime(): GameTime {
    return this._gameTime;
  }

  get entities(): ReadonlyMap<EntityId, Entity> {
    return this._entities;
  }

  get eventBus(): EventBus {
    return this._eventBus;
  }

  get features(): FeatureFlags {
    const flags: Record<string, boolean> = {};
    for (const [key, value] of this._features) {
      flags[key] = value;
    }
    return flags;
  }

  query(): IQueryBuilder {
    return new QueryBuilder(this);
  }

  getEntity(id: EntityId): Entity | undefined {
    return this._entities.get(id);
  }

  getComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType
  ): T | undefined {
    const entity = this._entities.get(entityId);
    if (!entity) return undefined;
    return entity.components.get(componentType) as T | undefined;
  }

  hasComponent(entityId: EntityId, componentType: ComponentType): boolean {
    const entity = this._entities.get(entityId);
    return entity?.components.has(componentType) ?? false;
  }

  getEntitiesInChunk(chunkX: number, chunkY: number): ReadonlyArray<EntityId> {
    const key = `${chunkX},${chunkY}`;
    return Array.from(this.chunkIndex.get(key) ?? []);
  }

  getEntitiesInRect(
    x: number,
    y: number,
    width: number,
    height: number
  ): ReadonlyArray<EntityId> {
    return this.query().inRect(x, y, width, height).execute();
  }

  isFeatureEnabled(feature: string): boolean {
    return this._features.get(feature) ?? false;
  }

  // Mutator methods

  createEntity(_archetype: string): EntityId {
    throw new Error('createEntity not yet implemented - need archetype system');
  }

  destroyEntity(id: EntityId, reason: string): void {
    const entity = this._entities.get(id);
    if (!entity) {
      throw new Error(`Entity ${id} does not exist`);
    }

    // Remove from spatial index
    const pos = entity.components.get('position') as
      | { chunkX: number; chunkY: number }
      | undefined;
    if (pos) {
      const key = `${pos.chunkX},${pos.chunkY}`;
      this.chunkIndex.get(key)?.delete(id);
    }

    this._entities.delete(id);

    // Emit event
    this._eventBus.emit({
      type: 'entity:destroyed',
      source: 'world',
      data: {
        entityId: id,
        reason,
        finalState: Object.fromEntries(entity.components),
      },
    });
  }

  addComponent(entityId: EntityId, component: Component): void {
    const entity = this._entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    // Cast to internal implementation to mutate
    const entityImpl = entity as any;
    entityImpl.addComponent(component);

    // Update spatial index if position component
    if (component.type === 'position') {
      const pos = component as unknown as { chunkX: number; chunkY: number };
      const key = `${pos.chunkX},${pos.chunkY}`;
      if (!this.chunkIndex.has(key)) {
        this.chunkIndex.set(key, new Set());
      }
      this.chunkIndex.get(key)!.add(entityId);
    }

    this._eventBus.emit({
      type: 'entity:component:added',
      source: 'world',
      data: { entityId, componentType: component.type },
    });
  }

  updateComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType,
    updater: (current: T) => T
  ): void {
    const entity = this._entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    const entityImpl = entity as any;
    entityImpl.updateComponent(componentType, updater);
  }

  removeComponent(entityId: EntityId, componentType: ComponentType): void {
    const entity = this._entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    // Update spatial index if removing position
    if (componentType === 'position') {
      const pos = entity.components.get('position') as
        | { chunkX: number; chunkY: number }
        | undefined;
      if (pos) {
        const key = `${pos.chunkX},${pos.chunkY}`;
        this.chunkIndex.get(key)?.delete(entityId);
      }
    }

    const entityImpl = entity as any;
    entityImpl.removeComponent(componentType);

    this._eventBus.emit({
      type: 'entity:component:removed',
      source: 'world',
      data: { entityId, componentType },
    });
  }

  advanceTick(): void {
    this._tick++;
    this._gameTime = this.calculateGameTime(this._tick);
  }

  setFeature(feature: string, enabled: boolean): void {
    this._features.set(feature, enabled);
  }

  private calculateGameTime(tick: Tick): GameTime {
    const totalTicks = tick;
    const ticksPerHour = this._gameTime.ticksPerHour;
    const totalHours = Math.floor(totalTicks / ticksPerHour);

    const hour = totalHours % 24;
    const totalDays = Math.floor(totalHours / 24);
    const day = (totalDays % 28) + 1; // 28 days per season
    const totalSeasons = Math.floor(totalDays / 28);
    const seasonIndex = totalSeasons % 4;
    const year = Math.floor(totalSeasons / 4) + 1;

    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];

    return {
      totalTicks,
      ticksPerHour,
      hour,
      day,
      season: seasons[seasonIndex]!,
      year,
    };
  }

  // For testing/debugging
  _addEntity(entity: Entity): void {
    this._entities.set(entity.id, entity);
  }
}
