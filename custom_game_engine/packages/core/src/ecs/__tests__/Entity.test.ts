import { describe, it, expect, beforeEach } from 'vitest';
import { EntityImpl, createEntityId } from '../Entity.js';
import type { Component } from '../Component.js';

describe('Entity', () => {
  let entity: EntityImpl;

  beforeEach(() => {
    entity = new EntityImpl(createEntityId(), 0);
  });

  it('should create entity with unique ID', () => {
    const entity1 = new EntityImpl(createEntityId(), 0);
    const entity2 = new EntityImpl(createEntityId(), 0);
    expect(entity1.id).not.toBe(entity2.id);
    expect(entity1.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
  });

  it('should start with version 0', () => {
    expect(entity.version).toBe(0);
  });

  it('should start with no components', () => {
    expect(entity.components.size).toBe(0);
  });

  it('should add component and increment version', () => {
    const component: Component = { type: 'test', version: 1 };
    (entity as any).addComponent(component);

    expect(entity.components.size).toBe(1);
    expect(entity.components.get('test')).toBe(component);
    expect(entity.version).toBe(1);
  });

  it('should update component and increment version', () => {
    const component: Component = { type: 'test', version: 1 };
    (entity as any).addComponent(component);

    const initialVersion = entity.version;
    entity.updateComponent('test', () => ({ type: 'test', version: 2 }));

    expect(entity.version).toBe(initialVersion + 1);
    expect(entity.components.get('test')?.version).toBe(2);
  });

  it('should remove component and increment version', () => {
    const component: Component = { type: 'test', version: 1 };
    (entity as any).addComponent(component);

    const initialVersion = entity.version;
    entity.removeComponent('test');

    expect(entity.version).toBe(initialVersion + 1);
    expect(entity.components.size).toBe(0);
  });

  it('should throw when updating non-existent component', () => {
    expect(() => {
      entity.updateComponent('nonexistent', (c) => c);
    }).toThrow();
  });

  it('should throw when removing non-existent component', () => {
    expect(() => {
      entity.removeComponent('nonexistent');
    }).toThrow();
  });

  it('should check component existence', () => {
    expect(entity.hasComponent('test')).toBe(false);

    const component: Component = { type: 'test', version: 1 };
    (entity as any).addComponent(component);

    expect(entity.hasComponent('test')).toBe(true);
  });

  it('should get component', () => {
    const component: Component = { type: 'test', version: 1 };
    (entity as any).addComponent(component);

    expect(entity.getComponent('test')).toBe(component);
    expect(entity.getComponent('nonexistent')).toBeUndefined();
  });
});
