import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../ecs/index.js';
import { NeedsSystem } from '../systems/NeedsSystem.js';
import { PlantSystem } from '../systems/PlantSystem.js';
import { MemoryFormationSystem } from '../systems/MemoryFormationSystem.js';
import { StateMutatorSystem } from '../systems/StateMutatorSystem.js';
import { EventBusImpl } from '../events/EventBus.js';
import { PlantComponent } from '../components/PlantComponent.js';

/**
 * Tests for silent fallback violations per CLAUDE.md
 *
 * These tests verify that systems throw errors when encountering invalid state
 * instead of silently continuing with fallback values.
 *
 * Per CLAUDE.md: "NEVER use fallback values to mask errors. If data is missing
 * or invalid, crash immediately with a clear error message."
 */

describe('Silent Fallback Violations', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
  });

  describe('NeedsSystem error handling', () => {
    it('should throw when entity lacks needs component', () => {
      // Arrange
      const stateMutator = new StateMutatorSystem();
      const needsSystem = new NeedsSystem();
      needsSystem.setStateMutatorSystem(stateMutator);

      // Create entity WITHOUT needs component
      const entity = world.createEntity();

      // Add other components but deliberately exclude needs component
      (entity as any).addComponent('agent', { behavior: 'idle' });
      (entity as any).addComponent('movement', {
        velocityX: 0,
        velocityY: 0,
        speed: 1.0
      });

      // Act & Assert
      // Per CLAUDE.md: Should throw, not warn and continue
      expect(() => {
        needsSystem.update(world, [entity], 1.0);
      }).toThrow(/needs component/i);
    });

    it('should include entity ID in error message', () => {
      // Arrange
      const stateMutator = new StateMutatorSystem();
      const needsSystem = new NeedsSystem();
      needsSystem.setStateMutatorSystem(stateMutator);

      const entity = world.createEntity();
      (entity as any).addComponent('agent', { behavior: 'idle' });

      // Act & Assert
      try {
        needsSystem.update(world, [entity], 1.0);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(entity.id);
      }
    });
  });

  describe('PlantSystem error handling', () => {
    it('should throw when speciesLookup is not set and unknown species requested', () => {
      // Arrange
      const plantSystem = new PlantSystem(eventBus);

      // Create plant entity with unknown species
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'unknown_species_12345',
        position: { x: 0, y: 0 },
        stage: 'seed',
        health: 100,
        hydration: 70,
        nutrition: 80,
      });
      (entity as any).addComponent(plant);

      // DO NOT set speciesLookup - this should cause error

      // Act & Assert
      // Per CLAUDE.md: Should throw, not return fallback species
      expect(() => {
        plantSystem.update(world, [entity], 1.0);
      }).toThrow(/species/i);
    });

    it('should include species ID in error message', () => {
      // Arrange
      const plantSystem = new PlantSystem(eventBus);

      const unknownSpeciesId = 'definitely_not_a_real_species';
      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: unknownSpeciesId,
        position: { x: 0, y: 0 },
        stage: 'seed',
        health: 100,
        hydration: 70,
        nutrition: 80,
      });
      (entity as any).addComponent(plant);

      // Act & Assert
      try {
        plantSystem.update(world, [entity], 1.0);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(unknownSpeciesId);
      }
    });

    it('should suggest available species in error message', () => {
      // Arrange
      const plantSystem = new PlantSystem(eventBus);

      // Set up species lookup with known species
      const knownSpecies = ['wheat', 'carrot', 'tomato'];
      plantSystem.setSpeciesLookup((id: string) => {
        if (!knownSpecies.includes(id)) {
          throw new Error(`Unknown species: ${id}. Available: ${knownSpecies.join(', ')}`);
        }
        return {
          id,
          name: id,
          category: 'crop' as const,
          biomes: ['plains'],
          rarity: 'common' as const,
          stageTransitions: [],
          baseGenetics: {
            growthRate: 1.0,
            yieldAmount: 1.0,
            diseaseResistance: 50,
            droughtTolerance: 50,
            coldTolerance: 50,
            flavorProfile: 50,
            mutations: [],
          },
          seedsPerPlant: 3,
          seedDispersalRadius: 5,
          requiresDormancy: false,
          optimalTemperatureRange: [15, 25] as [number, number],
          optimalMoistureRange: [30, 70] as [number, number],
          preferredSeasons: ['spring'],
          properties: {},
          sprites: {
            seed: 'seed',
            sprout: 'sprout',
            vegetative: 'veg',
            flowering: 'flower',
            fruiting: 'fruit',
            mature: 'mature',
            seeding: 'seeding',
            withered: 'withered',
          },
        };
      });

      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'unknown_species',
        position: { x: 0, y: 0 },
        stage: 'seed',
        health: 100,
        hydration: 70,
        nutrition: 80,
      });
      (entity as any).addComponent(plant);

      // Act & Assert
      try {
        plantSystem.update(world, [entity], 1.0);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toMatch(/available/i);
        expect(message).toContain('wheat');
        expect(message).toContain('carrot');
        expect(message).toContain('tomato');
      }
    });
  });

  describe('MemoryFormationSystem error handling', () => {
    it('should throw when conversation:utterance event lacks speakerId', () => {
      // Arrange
      const memorySystem = new MemoryFormationSystem(eventBus);

      // Create agent with memory component
      const agent = world.createEntity();
      agent.addComponent('agent', { behavior: 'idle' });
      agent.addComponent('episodic_memory', {
        memories: [],
        formMemory: () => {},
      });

      // Emit conversation event WITHOUT speakerId (invalid)
      eventBus.emit({
        type: 'conversation:utterance',
        source: 'test',
        data: {
          // speakerId: missing!
          listenerId: agent.id,
          message: 'Hello',
          conversationId: 'test-conv',
        },
      });

      // Act & Assert
      // Per CLAUDE.md: Should throw, not skip with console.error
      expect(() => {
        memorySystem.update(world, [agent], 1.0);
      }).toThrow(/speakerId/i);
    });

    it('should throw when conversation:utterance event lacks listenerId', () => {
      // Arrange
      const memorySystem = new MemoryFormationSystem(eventBus);

      const agent = world.createEntity();
      agent.addComponent('agent', { behavior: 'idle' });
      agent.addComponent('episodic_memory', {
        memories: [],
        formMemory: () => {},
      });

      // Emit conversation event WITHOUT listenerId (invalid)
      eventBus.emit({
        type: 'conversation:utterance',
        source: 'test',
        data: {
          speakerId: agent.id,
          // listenerId: missing!
          message: 'Hello',
          conversationId: 'test-conv',
        },
      });

      // Act & Assert
      expect(() => {
        memorySystem.update(world, [agent], 1.0);
      }).toThrow(/listenerId/i);
    });

    it('should include event details in error message', () => {
      // Arrange
      const memorySystem = new MemoryFormationSystem(eventBus);

      const agent = world.createEntity();
      agent.addComponent('agent', { behavior: 'idle' });
      agent.addComponent('episodic_memory', {
        memories: [],
        formMemory: () => {},
      });

      const testConversationId = 'test-conversation-123';
      eventBus.emit({
        type: 'conversation:utterance',
        source: 'test',
        data: {
          speakerId: agent.id,
          // listenerId missing
          message: 'Test message',
          conversationId: testConversationId,
        },
      });

      // Act & Assert
      try {
        memorySystem.update(world, [agent], 1.0);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain('conversation:utterance');
        expect(message).toContain(testConversationId);
      }
    });

    it('should throw when conversation:started event has invalid participants', () => {
      // Arrange
      const memorySystem = new MemoryFormationSystem(eventBus);

      const agent = world.createEntity();
      agent.addComponent('agent', { behavior: 'idle' });
      agent.addComponent('episodic_memory', {
        memories: [],
        formMemory: () => {},
      });

      // Emit conversation:started with only 1 participant (invalid - needs 2+)
      eventBus.emit({
        type: 'conversation:started',
        source: 'test',
        data: {
          participants: [agent.id], // Only 1 participant - invalid!
          conversationId: 'test-conv',
        },
      });

      // Act & Assert
      expect(() => {
        memorySystem.update(world, [agent], 1.0);
      }).toThrow(/participants/i);
    });

    it('should throw when conversation:started event lacks participants', () => {
      // Arrange
      const memorySystem = new MemoryFormationSystem(eventBus);

      const agent = world.createEntity();
      agent.addComponent('agent', { behavior: 'idle' });
      agent.addComponent('episodic_memory', {
        memories: [],
        formMemory: () => {},
      });

      // Emit conversation:started WITHOUT participants (invalid)
      eventBus.emit({
        type: 'conversation:started',
        source: 'test',
        data: {
          // participants: missing!
          conversationId: 'test-conv',
        },
      });

      // Act & Assert
      expect(() => {
        memorySystem.update(world, [agent], 1.0);
      }).toThrow(/participants/i);
    });
  });

  describe('Error message quality', () => {
    it('NeedsSystem error should explain what to check', () => {
      // Arrange
      const stateMutator = new StateMutatorSystem();
      const needsSystem = new NeedsSystem();
      needsSystem.setStateMutatorSystem(stateMutator);

      const entity = world.createEntity();
      (entity as any).addComponent('agent', { behavior: 'idle' });

      // Act & Assert
      try {
        needsSystem.update(world, [entity], 1.0);
        expect.fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message.toLowerCase();
        // Should explain what's wrong and ideally how to fix
        expect(message).toMatch(/needs.*component/);
        expect(message).toContain(entity.id);
      }
    });

    it('PlantSystem error should explain how to fix', () => {
      // Arrange
      const plantSystem = new PlantSystem(eventBus);

      const entity = world.createEntity();
      const plant = new PlantComponent({
        speciesId: 'unknown_species',
        position: { x: 0, y: 0 },
        stage: 'seed',
        health: 100,
        hydration: 70,
        nutrition: 80,
      });
      (entity as any).addComponent(plant);

      // Act & Assert
      try {
        plantSystem.update(world, [entity], 1.0);
        expect.fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message.toLowerCase();
        // Should mention species and ideally suggest setting lookup
        expect(message).toMatch(/species/);
      }
    });

    it('MemoryFormationSystem error should include event type', () => {
      // Arrange
      const memorySystem = new MemoryFormationSystem(eventBus);

      const agent = world.createEntity();
      agent.addComponent('agent', { behavior: 'idle' });
      agent.addComponent('episodic_memory', {
        memories: [],
        formMemory: () => {},
      });

      eventBus.emit({
        type: 'conversation:utterance',
        source: 'test',
        data: {
          speakerId: agent.id,
          // listenerId missing
          message: 'Test',
          conversationId: 'test-conv',
        },
      });

      // Act & Assert
      try {
        memorySystem.update(world, [agent], 1.0);
        expect.fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        // Should mention the event type and what's missing
        expect(message).toContain('conversation:utterance');
        expect(message).toMatch(/listenerId/i);
      }
    });
  });
});
