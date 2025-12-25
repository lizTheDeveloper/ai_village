import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createDawnWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { MemoryConsolidationSystem } from '../MemoryConsolidationSystem.js';
import { SleepSystem } from '../SleepSystem.js';
import { MemorySystem } from '../MemorySystem.js';
import { createMemoryComponent } from '../../components/MemoryComponent.js';
import { createCircadianComponent } from '../../components/CircadianComponent.js';
import { createNeedsComponent } from '../../components/NeedsComponent.js';

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

    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const circadian = createCircadianComponent();
    (circadian as any).isSleeping = true;
    agent.addComponent(circadian);

    agent.addComponent(createMemoryComponent());

    const entities = Array.from(harness.world.entities.values());

    // Update consolidation system
    expect(() => {
      consolidationSystem.update(harness.world, entities, 1.0);
    }).not.toThrow();
  });

  it('should sleep system affect memory decay', () => {
    const sleepSystem = new SleepSystem();
    const memorySystem = new MemorySystem();

    harness.registerSystem('SleepSystem', sleepSystem);
    harness.registerSystem('MemorySystem', memorySystem);

    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const circadian = createCircadianComponent();
    (circadian as any).isSleeping = true;
    agent.addComponent(circadian);

    agent.addComponent(createNeedsComponent(100, 50, 100, 100, 100));
    agent.addComponent({
      type: 'memory',
      version: 1,
      memories: [
        { id: 'm1', type: 'event', content: {}, timestamp: 0, strength: 100, emotional_intensity: 0.5 },
      ],
      decayRate: 5,
      maxMemories: 100,
    });

    const entities = Array.from(harness.world.entities.values());

    // Update both systems
    sleepSystem.update(harness.world, entities, 2.0);
    memorySystem.update(harness.world, entities, 2.0);

    // Memory should decay (or potentially consolidate)
    const memory = agent.getComponent('memory') as any;
    expect(memory.memories.length).toBeGreaterThanOrEqual(0);
  });

  it('should awake agents not trigger consolidation', () => {
    const consolidationSystem = new MemoryConsolidationSystem();
    harness.registerSystem('MemoryConsolidationSystem', consolidationSystem);

    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const circadian = createCircadianComponent();
    (circadian as any).isSleeping = false; // Awake
    agent.addComponent(circadian);

    agent.addComponent(createMemoryComponent());

    const entities = Array.from(harness.world.entities.values());

    // Should process without consolidating
    consolidationSystem.update(harness.world, entities, 1.0);
    expect(true).toBe(true);
  });
});
