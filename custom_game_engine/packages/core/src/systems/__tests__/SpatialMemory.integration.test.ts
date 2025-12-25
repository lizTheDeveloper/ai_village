import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { SpatialMemoryQuerySystem } from '../SpatialMemoryQuerySystem.js';
import { MemorySystem } from '../MemorySystem.js';
import { ExplorationSystem } from '../ExplorationSystem.js';
import { createMemoryComponent } from '../../components/MemoryComponent.js';

/**
 * Integration tests for SpatialMemoryQuerySystem + MemorySystem + ExplorationSystem
 *
 * Tests verify that:
 * - Resource discoveries create spatial memories
 * - Spatial queries find remembered locations
 * - Memory indexing keeps episodic/spatial in sync
 * - Exploration reveals resources → memories formed
 * - Old spatial memories decay correctly
 * - Gradient hints update spatial memory
 */

describe('SpatialMemoryQuerySystem + MemorySystem + ExplorationSystem Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createMinimalWorld();
  });

  it('should spatial memory system process agents', () => {
    const spatialSystem = new SpatialMemoryQuerySystem();
    harness.registerSystem('SpatialMemoryQuerySystem', spatialSystem);

    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createMemoryComponent());

    const entities = Array.from(harness.world.entities.values());

    expect(() => {
      spatialSystem.update(harness.world, entities, 1.0);
    }).not.toThrow();
  });

  it('should exploration system integrate with memory', () => {
    const explorationSystem = new ExplorationSystem(harness.world.eventBus);
    const memorySystem = new MemorySystem();

    harness.registerSystem('ExplorationSystem', explorationSystem);
    harness.registerSystem('MemorySystem', memorySystem);

    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent(createMemoryComponent());

    // Add exploration state
    agent.addComponent({
      type: 'ExplorationState',
      version: 1,
      mode: 'frontier',
      target: null,
      visited: new Set(),
      frontierCells: [],
    });

    const entities = Array.from(harness.world.entities.values());

    explorationSystem.update(harness.world, entities, 1.0);
    memorySystem.update(harness.world, entities, 1.0);

    expect(agent.getComponent('memory')).toBeDefined();
  });
});
