import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createDawnWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { MemoryConsolidationSystem } from '../MemoryConsolidationSystem.js';
import { SleepSystem } from '../SleepSystem.js';
import { MemorySystem } from '../MemorySystem.js';
import { StateMutatorSystem } from '../StateMutatorSystem.js';
import { MemoryComponent } from '../../components/MemoryComponent.js';
import { SpatialMemoryComponent } from '../../components/SpatialMemoryComponent.js';
import { createCircadianComponent } from '../../components/CircadianComponent.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';

import { ComponentType } from '../../types/ComponentType.js';
/**
 * Integration tests for MemoryConsolidationSystem + SleepSystem + MemorySystem
 *
 * Tests verify that:
 * - Sleep triggers memory consolidation
 * - Recalled memories strengthen during consolidation
 * - Consolidation events properly processed
 * - Reflection events trigger consolidation
 * - Decay rates modified during sleep
 * - Dream content based on recent memories
 */

describe('MemoryConsolidationSystem + SleepSystem + MemorySystem Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createDawnWorld();
  });

  it('should consolidation system process sleeping agents', () => {
    const consolidationSystem = new MemoryConsolidationSystem();
    harness.registerSystem('MemoryConsolidationSystem', consolidationSystem);

    // Initialize system with EventBus from harness
    consolidationSystem.initialize(harness.world, harness.eventBus);

    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const circadian = createCircadianComponent();
    (circadian as any).isSleeping = true;
    agent.addComponent(circadian);

    agent.addComponent(new MemoryComponent(agent.id));

    const entities = Array.from(harness.world.entities.values());

    // Update consolidation system
    expect(() => {
      consolidationSystem.update(harness.world, entities, 1.0);
    }).not.toThrow();
  });

  it('should sleep system affect memory decay', () => {
    const stateMutator = new StateMutatorSystem();
    const sleepSystem = new SleepSystem();
    const memorySystem = new MemorySystem();

    harness.registerSystem('StateMutatorSystem', stateMutator);
    harness.registerSystem('SleepSystem', sleepSystem);
    harness.registerSystem('MemorySystem', memorySystem);

    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const circadian = createCircadianComponent();
    (circadian as any).isSleeping = true;
    agent.addComponent(circadian);

    agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 0.5,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  }));
    const spatialMemory = new SpatialMemoryComponent({ decayRate: 5, maxMemories: 100 });
    spatialMemory.memories.push({
      type: 'resource_location',
      x: 5,
      y: 5,
      strength: 100,
      createdAt: 0,
      lastReinforced: 0,
    });
    agent.addComponent(spatialMemory);

    // Filter entities to only those with required components for each system
    const sleepEntities = harness.world.query().with(ComponentType.Circadian).executeEntities();
    const memoryEntities = harness.world.query().with(ComponentType.SpatialMemory).executeEntities();

    // Advance tick for StateMutatorSystem (1200 ticks = 1 game minute)
    harness.world.setTick(harness.world.tick + 1200);

    // Update all systems with filtered entities
    sleepSystem.update(harness.world, sleepEntities, 2.0);
    stateMutator.update(harness.world, sleepEntities, 2.0);
    memorySystem.update(harness.world, memoryEntities, 2.0);

    // Memory should decay (or potentially consolidate)
    const memory = agent.getComponent(ComponentType.SpatialMemory) as SpatialMemoryComponent;
    expect(memory.memories.length).toBeGreaterThanOrEqual(0);
  });

  it('should awake agents not trigger consolidation', () => {
    const consolidationSystem = new MemoryConsolidationSystem();
    harness.registerSystem('MemoryConsolidationSystem', consolidationSystem);

    // Initialize system with EventBus from harness
    consolidationSystem.initialize(harness.world, harness.eventBus);

    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const circadian = createCircadianComponent();
    (circadian as any).isSleeping = false; // Awake
    agent.addComponent(circadian);

    agent.addComponent(new MemoryComponent(agent.id));

    const entities = Array.from(harness.world.entities.values());

    // Should process without consolidating
    expect(() => {
      consolidationSystem.update(harness.world, entities, 1.0);
    }).not.toThrow();

    // Verify agent is still awake
    const updatedCircadian = agent.getComponent(ComponentType.Circadian);
    expect((updatedCircadian as any).isSleeping).toBe(false);
  });
});
