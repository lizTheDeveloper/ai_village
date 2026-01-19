/**
 * Tests for PromptRenderer.renderAvailableActions
 *
 * Validates behavior introspection - extracting available actions from the behavior registry
 * and filtering based on agent skills.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PromptRenderer } from '../PromptRenderer.js';

describe('PromptRenderer - renderAvailableActions', () => {
  // Mock behavior registry
  const createMockRegistry = (behaviors: Array<{ name: string; description?: string }>) => {
    const registry = new Map(behaviors.map(b => [b.name, { name: b.name, description: b.description }]));
    return {
      getRegisteredBehaviors: () => Array.from(registry.keys()),
      get: (name: string) => registry.get(name),
    };
  };

  // Mock entity
  const createMockEntity = (skills: Record<string, number> = {}) => ({
    id: 'test-agent',
    components: new Map([
      ['skills', { levels: skills }]
    ])
  });

  describe('universal actions', () => {
    it('should return universal actions for agent with no skills', () => {
      const entity = createMockEntity({});
      const registry = createMockRegistry([
        { name: 'wander', description: 'Random wandering' },
        { name: 'idle', description: 'Stand still' },
        { name: 'gather', description: 'Gather resources' },
        { name: 'talk', description: 'Engage in conversation' },
      ]);

      const actions = PromptRenderer.renderAvailableActions(entity, registry);

      expect(actions).toContain('wander: Random wandering');
      expect(actions).toContain('idle: Stand still');
      expect(actions).toContain('gather: Gather resources');
      expect(actions).toContain('talk: Engage in conversation');
    });
  });

  describe('skill-gated actions', () => {
    it('should include farming actions for agents with farming skill', () => {
      const entity = createMockEntity({ farming: 1 });
      const registry = createMockRegistry([
        { name: 'wander', description: 'Random wandering' },
        { name: 'plant', description: 'Plant seeds' },
        { name: 'till', description: 'Till soil' },
        { name: 'harvest', description: 'Harvest crops' },
      ]);

      const actions = PromptRenderer.renderAvailableActions(entity, registry);

      expect(actions).toContain('plant: Plant seeds');
      expect(actions).toContain('till: Till soil');
      expect(actions).toContain('harvest: Harvest crops');
    });

    it('should exclude farming actions for agents without farming skill', () => {
      const entity = createMockEntity({});
      const registry = createMockRegistry([
        { name: 'wander', description: 'Random wandering' },
        { name: 'plant', description: 'Plant seeds' },
        { name: 'till', description: 'Till soil' },
      ]);

      const actions = PromptRenderer.renderAvailableActions(entity, registry);

      expect(actions).toContain('wander: Random wandering');
      expect(actions).not.toContain('plant: Plant seeds');
      expect(actions).not.toContain('till: Till soil');
    });

    it('should include building actions for agents with building skill', () => {
      const entity = createMockEntity({ building: 1 });
      const registry = createMockRegistry([
        { name: 'build', description: 'Construct buildings' },
        { name: 'repair', description: 'Repair damaged buildings' },
      ]);

      const actions = PromptRenderer.renderAvailableActions(entity, registry);

      expect(actions).toContain('build: Construct buildings');
      expect(actions).toContain('repair: Repair damaged buildings');
    });

    it('should include animal handling actions for agents with level 2+', () => {
      const entityLow = createMockEntity({ animal_handling: 1 });
      const entityHigh = createMockEntity({ animal_handling: 2 });
      const registry = createMockRegistry([
        { name: 'wander', description: 'Random wandering' },
        { name: 'tame_animal', description: 'Tame wild animals' },
      ]);

      const actionsLow = PromptRenderer.renderAvailableActions(entityLow, registry);
      const actionsHigh = PromptRenderer.renderAvailableActions(entityHigh, registry);

      expect(actionsLow).toContain('wander: Random wandering');
      expect(actionsLow).not.toContain('tame_animal: Tame wild animals');
      expect(actionsHigh).toContain('tame_animal: Tame wild animals');
    });

    it('should include magic actions for agents with magic skill', () => {
      const entity = createMockEntity({ magic: 1 });
      const registry = createMockRegistry([
        { name: 'cast_spell', description: 'Cast magical spells' },
        { name: 'pray', description: 'Pray to the gods' },
        { name: 'meditate', description: 'Meditate to restore mana' },
      ]);

      const actions = PromptRenderer.renderAvailableActions(entity, registry);

      expect(actions).toContain('cast_spell: Cast magical spells');
      expect(actions).toContain('pray: Pray to the gods');
      expect(actions).toContain('meditate: Meditate to restore mana');
    });
  });

  describe('edge cases', () => {
    it('should return empty array when no registry provided', () => {
      const entity = createMockEntity({});
      const actions = PromptRenderer.renderAvailableActions(entity);

      expect(actions).toEqual([]);
    });

    it('should handle behaviors without descriptions', () => {
      const entity = createMockEntity({});
      const registry = createMockRegistry([
        { name: 'wander' }, // No description
      ]);

      const actions = PromptRenderer.renderAvailableActions(entity, registry);

      expect(actions).toContain('wander');
    });

    it('should handle entities without skills component', () => {
      const entity = {
        id: 'test-agent',
        components: new Map()
      };
      const registry = createMockRegistry([
        { name: 'wander', description: 'Random wandering' },
        { name: 'plant', description: 'Plant seeds' }, // Requires farming skill
      ]);

      const actions = PromptRenderer.renderAvailableActions(entity, registry);

      // Universal actions should be available
      expect(actions).toContain('wander: Random wandering');
      // Skill-gated actions should be filtered out
      expect(actions).not.toContain('plant: Plant seeds');
    });

    it('should allow custom behaviors by default', () => {
      const entity = createMockEntity({});
      const registry = createMockRegistry([
        { name: 'custom_action', description: 'A custom behavior' },
      ]);

      const actions = PromptRenderer.renderAvailableActions(entity, registry);

      expect(actions).toContain('custom_action: A custom behavior');
    });
  });

  describe('multi-skill agents', () => {
    it('should include actions from multiple skill categories', () => {
      const entity = createMockEntity({
        farming: 2,
        building: 1,
        crafting: 1,
        magic: 1
      });
      const registry = createMockRegistry([
        { name: 'wander', description: 'Random wandering' },
        { name: 'plant', description: 'Plant seeds' },
        { name: 'build', description: 'Construct buildings' },
        { name: 'craft', description: 'Craft items' },
        { name: 'cast_spell', description: 'Cast spells' },
      ]);

      const actions = PromptRenderer.renderAvailableActions(entity, registry);

      expect(actions).toContain('wander: Random wandering');
      expect(actions).toContain('plant: Plant seeds');
      expect(actions).toContain('build: Construct buildings');
      expect(actions).toContain('craft: Craft items');
      expect(actions).toContain('cast_spell: Cast spells');
    });
  });
});
