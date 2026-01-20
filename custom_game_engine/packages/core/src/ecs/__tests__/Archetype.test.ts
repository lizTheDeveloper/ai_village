/**
 * Tests for archetype-based entity creation
 */

import { describe, it, expect } from 'vitest';
import { World } from '../World.js';
import { TypedEventBus } from '../../events/TypedEventBus.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('Archetype System', () => {
  let world: World;

  beforeEach(() => {
    const eventBus = new TypedEventBus();
    world = new World(eventBus);
  });

  describe('createEntity', () => {
    it('should create empty entity when no archetype specified', () => {
      const entity = world.createEntity();

      expect(entity).toBeDefined();
      expect(entity.id).toBeDefined();
      expect(entity.components.size).toBe(0);
    });

    it('should create building entity with position, renderable, tags, and physics', () => {
      const entity = world.createEntity('building');

      expect(entity.hasComponent(CT.Position)).toBe(true);
      expect(entity.hasComponent(CT.Renderable)).toBe(true);
      expect(entity.hasComponent(CT.Tags)).toBe(true);
      expect(entity.hasComponent(CT.Physics)).toBe(true);

      const tags = entity.getComponent(CT.Tags) as { tags: string[] };
      expect(tags.tags).toContain('building');
    });

    it('should create plant entity with position, renderable, tags, and physics', () => {
      const entity = world.createEntity('plant');

      expect(entity.hasComponent(CT.Position)).toBe(true);
      expect(entity.hasComponent(CT.Renderable)).toBe(true);
      expect(entity.hasComponent(CT.Tags)).toBe(true);
      expect(entity.hasComponent(CT.Physics)).toBe(true);

      const tags = entity.getComponent(CT.Tags) as { tags: string[] };
      expect(tags.tags).toContain('plant');
    });

    it('should create animal entity with position, renderable, tags, and physics', () => {
      const entity = world.createEntity('animal');

      expect(entity.hasComponent(CT.Position)).toBe(true);
      expect(entity.hasComponent(CT.Renderable)).toBe(true);
      expect(entity.hasComponent(CT.Tags)).toBe(true);
      expect(entity.hasComponent(CT.Physics)).toBe(true);

      const tags = entity.getComponent(CT.Tags) as { tags: string[] };
      expect(tags.tags).toContain('animal');
    });

    it('should create item entity with position, renderable, and tags', () => {
      const entity = world.createEntity('item');

      expect(entity.hasComponent(CT.Position)).toBe(true);
      expect(entity.hasComponent(CT.Renderable)).toBe(true);
      expect(entity.hasComponent(CT.Tags)).toBe(true);

      const tags = entity.getComponent(CT.Tags) as { tags: string[] };
      expect(tags.tags).toContain('item');
      expect(tags.tags).toContain('resource');
    });

    it('should create deity entity with deity tags', () => {
      const entity = world.createEntity('deity');

      expect(entity.hasComponent(CT.Tags)).toBe(true);

      const tags = entity.getComponent(CT.Tags) as { tags: string[] };
      expect(tags.tags).toContain('deity');
      expect(tags.tags).toContain('divine');
      expect(tags.tags).toContain('immortal');
    });

    it('should create companion entity with companion tags', () => {
      const entity = world.createEntity('companion');

      expect(entity.hasComponent(CT.Tags)).toBe(true);

      const tags = entity.getComponent(CT.Tags) as { tags: string[] };
      expect(tags.tags).toContain('companion');
      expect(tags.tags).toContain('divine');
      expect(tags.tags).toContain('immortal');
      expect(tags.tags).toContain('conversational');
    });

    it('should create spaceship entity with position, renderable, tags, and physics', () => {
      const entity = world.createEntity('spaceship');

      expect(entity.hasComponent(CT.Position)).toBe(true);
      expect(entity.hasComponent(CT.Renderable)).toBe(true);
      expect(entity.hasComponent(CT.Tags)).toBe(true);
      expect(entity.hasComponent(CT.Physics)).toBe(true);

      const tags = entity.getComponent(CT.Tags) as { tags: string[] };
      expect(tags.tags).toContain('spaceship');
      expect(tags.tags).toContain('vehicle');
    });

    it('should create minimal agent entity with just tags', () => {
      const entity = world.createEntity('agent');

      expect(entity.hasComponent(CT.Tags)).toBe(true);

      const tags = entity.getComponent(CT.Tags) as { tags: string[] };
      expect(tags.tags).toContain('agent');

      // Agent archetype is minimal - full agents use createWanderingAgent/createLLMAgent
      expect(entity.hasComponent(CT.Agent)).toBe(false);
      expect(entity.hasComponent(CT.Position)).toBe(false);
    });

    it('should throw error for invalid archetype', () => {
      expect(() => {
        world.createEntity('invalid_archetype');
      }).toThrow(/Unknown archetype/);
    });

    it('should list valid archetypes in error message', () => {
      try {
        world.createEntity('invalid_archetype');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('agent');
        expect(message).toContain('building');
        expect(message).toContain('plant');
        expect(message).toContain('animal');
        expect(message).toContain('item');
        expect(message).toContain('deity');
        expect(message).toContain('companion');
        expect(message).toContain('spaceship');
      }
    });
  });

  describe('Component customization after archetype creation', () => {
    it('should allow modifying archetype components after creation', () => {
      const entity = world.createEntity('building');

      const position = entity.getComponent(CT.Position) as { x: number; y: number };
      expect(position.x).toBe(0);
      expect(position.y).toBe(0);

      // Components can be modified after entity creation
      position.x = 100;
      position.y = 200;

      const updatedPosition = entity.getComponent(CT.Position) as { x: number; y: number };
      expect(updatedPosition.x).toBe(100);
      expect(updatedPosition.y).toBe(200);
    });

    it('should allow adding additional components to archetype entities', () => {
      const entity = world.createEntity('item');

      // Item archetype doesn't include Agent component
      expect(entity.hasComponent(CT.Agent)).toBe(false);

      // But we can add it manually if needed
      world.addComponent(entity.id, {
        type: 'agent',
        version: 1,
        behavior: 'idle',
        lastBehaviorChange: 0,
      });

      expect(entity.hasComponent(CT.Agent)).toBe(true);
    });
  });
});
