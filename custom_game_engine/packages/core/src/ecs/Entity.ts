import type { EntityId, ComponentType, Tick } from '../types.js';
import type { Component } from './Component.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * An entity is an ID with a collection of components.
 * Entities don't have behavior - systems provide that.
 */
export interface Entity {
  /** Globally unique identifier */
  readonly id: EntityId;

  /** When this entity was created */
  readonly createdAt: Tick;

  /** Increments on any component change (for change detection) */
  readonly version: number;

  /** All components attached to this entity */
  readonly components: ReadonlyMap<ComponentType, Component>;
}

/**
 * Create a new entity ID.
 */
export function createEntityId(): EntityId {
  return uuidv4();
}

/**
 * Internal mutable entity implementation.
 */
export class EntityImpl implements Entity {
  public readonly id: EntityId;
  public readonly createdAt: Tick;
  public version: number = 0;
  private _components = new Map<ComponentType, Component>();

  constructor(id: EntityId, createdAt: Tick) {
    this.id = id;
    this.createdAt = createdAt;
  }

  get components(): ReadonlyMap<ComponentType, Component> {
    return this._components;
  }

  addComponent(component: Component): void {
    this._components.set(component.type, component);
    this.version++;
  }

  updateComponent<T extends Component>(
    type: ComponentType,
    updater: (current: T) => T
  ): void {
    const current = this._components.get(type) as T | undefined;
    if (!current) {
      throw new Error(
        `Entity ${this.id} does not have component of type "${type}"`
      );
    }
    const updated = updater(current);
    this._components.set(type, updated);
    this.version++;
  }

  removeComponent(type: ComponentType): void {
    if (!this._components.delete(type)) {
      throw new Error(
        `Entity ${this.id} does not have component of type "${type}"`
      );
    }
    this.version++;
  }

  hasComponent(type: ComponentType): boolean {
    return this._components.has(type);
  }

  getComponent<T extends Component>(type: ComponentType): T | undefined {
    return this._components.get(type) as T | undefined;
  }
}
