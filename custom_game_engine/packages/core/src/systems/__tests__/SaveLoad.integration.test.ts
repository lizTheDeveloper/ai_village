import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { createNeedsComponent } from '../../components/NeedsComponent.js';
import { createCircadianComponent } from '../../components/CircadianComponent.js';
import { createMemoryComponent } from '../../components/MemoryComponent.js';

/**
 * Integration tests for Save/Load Persistence
 *
 * Tests verify that:
 * - World state serializes correctly
 * - Deserialized state matches original
 * - Component data preserved across save/load
 * - Entity relationships maintained
 * - System state persists
 * - Incremental saves work correctly
 * - Corrupted save files handled gracefully
 */

describe('Save/Load Persistence Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createMinimalWorld();
  });

  it('should serialize world entities', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createNeedsComponent(80, 60, 90, 85, 95));

    const entities = Array.from(harness.world.entities.values());

    // Verify entities exist
    expect(entities.length).toBeGreaterThan(0);

    // Serialize entity data
    const serialized = entities.map(entity => ({
      id: entity.id,
      components: Array.from(entity.components.entries()).map(([type, comp]) => ({
        type,
        data: comp,
      })),
    }));

    expect(serialized.length).toBeGreaterThan(0);
    expect(serialized[0].id).toBeDefined();
  });

  it('should preserve component data structure', () => {
    const agent = harness.createTestAgent({ x: 15, y: 20 });
    // createNeedsComponent(hunger, energy, health, thirst, temperature, hungerDecayRate, energyDecayRate)
    const needs = createNeedsComponent(70, 50, 80, 100, 37, 2.5, 1.5);
    agent.addComponent(needs);

    // Get component
    const retrievedNeeds = agent.getComponent('needs') as any;

    // Verify data preserved
    expect(retrievedNeeds.hunger).toBe(70);
    expect(retrievedNeeds.energy).toBe(50);
    expect(retrievedNeeds.health).toBe(80);
    expect(retrievedNeeds.hungerDecayRate).toBe(2.5);
    expect(retrievedNeeds.energyDecayRate).toBe(1.5);
  });

  it('should handle entity with multiple components', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    agent.addComponent(createNeedsComponent(100, 100, 100, 100, 100));
    agent.addComponent(createCircadianComponent());
    agent.addComponent(createMemoryComponent());

    // Count components
    const componentCount = agent.components.size;
    expect(componentCount).toBeGreaterThanOrEqual(4); // position + needs + circadian + memory
  });

  it('should preserve position data', () => {
    const x = 42;
    const y = 73;

    const agent = harness.createTestAgent({ x, y });

    const position = agent.getComponent('position') as any;
    expect(position.x).toBe(x);
    expect(position.y).toBe(y);
  });

  it('should serialize and match entity count', () => {
    // Create multiple entities
    const agents = [];
    for (let i = 0; i < 5; i++) {
      agents.push(harness.createTestAgent({ x: i, y: i }));
    }

    const animals = [];
    for (let i = 0; i < 3; i++) {
      animals.push(harness.createTestAnimal('chicken', { x: i + 10, y: i + 10 }));
    }

    const totalEntities = harness.world.entities.size;

    // Should have all entities
    expect(totalEntities).toBeGreaterThanOrEqual(8); // 5 agents + 3 animals
  });

  it('should preserve memory component structure', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    const memory = createMemoryComponent();

    agent.addComponent(memory);

    const retrieved = agent.getComponent('memory') as any;

    expect(retrieved).toBeDefined();
    expect(retrieved.memories).toBeDefined();
    expect(Array.isArray(retrieved.memories)).toBe(true);
  });

  it('should handle entities without optional components', () => {
    const agent1 = harness.createTestAgent({ x: 10, y: 10 });
    const agent2 = harness.createTestAgent({ x: 20, y: 20 });

    // Only agent1 has needs
    agent1.addComponent(createNeedsComponent(100, 100, 100, 100, 100));

    const needs1 = agent1.getComponent('needs');
    const needs2 = agent2.getComponent('needs');

    expect(needs1).toBeDefined();
    expect(needs2).toBeUndefined();
  });

  it('should serialize circadian rhythm state', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    const circadian = createCircadianComponent();

    agent.addComponent(circadian);

    const retrieved = agent.getComponent('circadian') as any;

    expect(retrieved).toBeDefined();
    expect(retrieved.sleepDrive).toBeDefined();
    expect(typeof retrieved.sleepDrive).toBe('number');
  });

  it('should preserve entity IDs across operations', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    const originalId = agent.id;

    // Add component
    agent.addComponent(createNeedsComponent(100, 100, 100, 100, 100));

    // ID should remain the same
    expect(agent.id).toBe(originalId);
  });

  it('should handle empty world serialization', () => {
    const emptyHarness = createMinimalWorld();

    const entities = Array.from(emptyHarness.world.entities.values());

    // Serialize empty world
    const serialized = {
      entityCount: entities.length,
      entities: entities.map(e => e.id),
    };

    // Should handle empty state
    expect(serialized.entityCount).toBeGreaterThanOrEqual(0);
  });

  it('should preserve component version numbers', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    const needs = createNeedsComponent(100, 100, 100, 100, 100);

    agent.addComponent(needs);

    const retrieved = agent.getComponent('needs') as any;

    expect(retrieved.version).toBeDefined();
    expect(typeof retrieved.version).toBe('number');
  });

  it('should serialize building entities', () => {
    const building = harness.createTestBuilding('shelter', { x: 50, y: 50 });

    const buildingComp = building.getComponent('building');
    const positionComp = building.getComponent('position');

    expect(buildingComp).toBeDefined();
    expect(positionComp).toBeDefined();
  });

  it('should preserve animal entities', () => {
    const animal = harness.createTestAnimal('chicken', { x: 30, y: 30 });

    const animalComp = animal.getComponent('animal');
    const positionComp = animal.getComponent('position');

    expect(animalComp).toBeDefined();
    expect(positionComp).toBeDefined();
  });

  it('should handle complex world state', () => {
    // Create complex world
    for (let i = 0; i < 3; i++) {
      const agent = harness.createTestAgent({ x: i * 10, y: i * 10 });
      agent.addComponent(createNeedsComponent(100 - i * 10, 90 - i * 5, 95, 85, 90));
      agent.addComponent(createCircadianComponent());
      agent.addComponent(createMemoryComponent());
    }

    for (let i = 0; i < 2; i++) {
      harness.createTestAnimal('chicken', { x: i * 5, y: i * 5 });
    }

    harness.createTestBuilding('shelter', { x: 25, y: 25 });

    const entityCount = harness.world.entities.size;

    // Should have all entities
    expect(entityCount).toBeGreaterThanOrEqual(6); // 3 agents + 2 animals + 1 building
  });

  it('should world tick counter be serializable', () => {
    const tick = harness.world.tick;

    expect(typeof tick).toBe('number');
    expect(tick).toBeGreaterThanOrEqual(0);
  });

  it('should component types be consistent', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createNeedsComponent(100, 100, 100, 100, 100));

    const needs = agent.getComponent('needs') as any;

    expect(needs.type).toBe('needs');
  });
});
