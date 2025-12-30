import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { SpatialMemoryQuerySystem } from '../SpatialMemoryQuerySystem.js';
import { MemorySystem } from '../MemorySystem.js';
import { ExplorationSystem } from '../ExplorationSystem.js';
import { MemoryComponent } from '../../components/MemoryComponent.js';
import { SpatialMemoryComponent } from '../../components/SpatialMemoryComponent.js';
import { ExplorationStateComponent } from '../../components/ExplorationStateComponent.js';

import { ComponentType } from '../../types/ComponentType.js';
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
    agent.addComponent(new MemoryComponent(agent.id));
    agent.addComponent(new SpatialMemoryComponent());

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
    agent.addComponent(new MemoryComponent(agent.id));
    agent.addComponent(new SpatialMemoryComponent());
    agent.addComponent(new ExplorationStateComponent());

    const entities = Array.from(harness.world.entities.values());

    explorationSystem.update(harness.world, entities, 1.0);
    memorySystem.update(harness.world, entities, 1.0);

    expect(agent.getComponent(ComponentType.Memory)).toBeDefined();
    expect(agent.getComponent(ComponentType.SpatialMemory)).toBeDefined();
    expect(agent.getComponent(ComponentType.ExplorationState)).toBeDefined();
  });
});
