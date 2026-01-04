/**
 * Unit tests for BehaviorRegistry
 *
 * Tests behavior registration, execution, and management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createMovementComponent } from '../../components/MovementComponent.js';
import type { World } from '../../ecs/World.js';

import {
  BehaviorRegistry,
  getBehaviorRegistry,
  initBehaviorRegistry,
  registerBehavior,
  executeBehavior,
} from '../BehaviorRegistry.js';

// Helper to create a mock entity
function createMockEntity(): EntityImpl {
  const entity = new EntityImpl(createEntityId(), 0);
  (entity as any).addComponent(createPositionComponent(50, 50));
  (entity as any).addComponent(createMovementComponent());
  return entity;
}

// Helper to create a mock world
function createMockWorld(): World {
  return {
    tick: 100,
    eventBus: {
      emit: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
    query: vi.fn().mockReturnValue({
      with: vi.fn().mockReturnThis(),
      executeEntities: vi.fn().mockReturnValue([]),
    }),
  } as unknown as World;
}

describe('BehaviorRegistry', () => {
  let registry: BehaviorRegistry;

  beforeEach(() => {
    registry = new BehaviorRegistry();
  });

  describe('register', () => {
    it('registers a behavior handler', () => {
      const handler = vi.fn();
      registry.register('wander', handler);

      expect(registry.has('wander')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('registers behavior with metadata', () => {
      const handler = vi.fn();
      registry.register('gather', handler, {
        description: 'Gather resources',
        priority: 50,
      });

      const meta = registry.get('gather');
      expect(meta).toBeDefined();
      expect(meta?.description).toBe('Gather resources');
      expect(meta?.priority).toBe(50);
    });

    it('overwrites existing behavior', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      registry.register('wander', handler1);
      registry.register('wander', handler2);

      expect(registry.size).toBe(1);
      expect(registry.get('wander')?.handler).toBe(handler2);
    });
  });

  describe('unregister', () => {
    it('removes a registered behavior', () => {
      registry.register('wander', vi.fn());
      expect(registry.has('wander')).toBe(true);

      const result = registry.unregister('wander');

      expect(result).toBe(true);
      expect(registry.has('wander')).toBe(false);
    });

    it('returns false for non-existent behavior', () => {
      const result = registry.unregister('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('executes registered behavior', () => {
      const handler = vi.fn();
      registry.register('wander', handler);

      const entity = createMockEntity();
      const world = createMockWorld();

      const result = registry.execute('wander', entity, world);

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith(entity, world);
    });

    it('returns false for unknown behavior', () => {
      const entity = createMockEntity();
      const world = createMockWorld();

      const result = registry.execute('unknown', entity, world);

      expect(result).toBe(false);
    });

    it('uses fallback for unknown behavior', () => {
      const fallback = vi.fn();
      registry.setFallback(fallback);

      const entity = createMockEntity();
      const world = createMockWorld();

      const result = registry.execute('unknown', entity, world);

      expect(result).toBe(true);
      expect(fallback).toHaveBeenCalledWith(entity, world);
    });
  });

  describe('getRegisteredBehaviors', () => {
    it('returns all registered behavior names', () => {
      registry.register('wander', vi.fn());
      registry.register('gather', vi.fn());
      registry.register('build', vi.fn());

      const behaviors = registry.getRegisteredBehaviors();

      expect(behaviors).toHaveLength(3);
      expect(behaviors).toContain('wander');
      expect(behaviors).toContain('gather');
      expect(behaviors).toContain('build');
    });
  });

  describe('registerFrom', () => {
    it('copies behaviors from another registry', () => {
      const other = new BehaviorRegistry();
      other.register('wander', vi.fn());
      other.register('gather', vi.fn());

      registry.registerFrom(other);

      expect(registry.has('wander')).toBe(true);
      expect(registry.has('gather')).toBe(true);
      expect(registry.size).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all behaviors', () => {
      registry.register('wander', vi.fn());
      registry.register('gather', vi.fn());
      expect(registry.size).toBe(2);

      registry.clear();

      expect(registry.size).toBe(0);
    });
  });
});

describe('Global Registry Functions', () => {
  beforeEach(() => {
    // Reset global registry
    initBehaviorRegistry();
  });

  it('getBehaviorRegistry returns singleton', () => {
    const registry1 = getBehaviorRegistry();
    const registry2 = getBehaviorRegistry();

    expect(registry1).toBe(registry2);
  });

  it('initBehaviorRegistry resets the singleton', () => {
    const registry1 = getBehaviorRegistry();
    registry1.register('test', vi.fn());

    initBehaviorRegistry();
    const registry2 = getBehaviorRegistry();

    expect(registry2.has('test')).toBe(false);
  });

  it('registerBehavior uses global registry', () => {
    const handler = vi.fn();
    registerBehavior('global-test', handler);

    expect(getBehaviorRegistry().has('global-test')).toBe(true);
  });

  it('executeBehavior uses global registry', () => {
    const handler = vi.fn();
    registerBehavior('exec-test', handler);

    const entity = createMockEntity();
    const world = createMockWorld();

    executeBehavior('exec-test', entity, world);

    expect(handler).toHaveBeenCalledWith(entity, world);
  });
});
