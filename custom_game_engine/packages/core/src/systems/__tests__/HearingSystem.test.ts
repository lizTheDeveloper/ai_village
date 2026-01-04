import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl, EntityImpl, createEntityId } from '../../ecs/index.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { HearingProcessor } from '../../perception/HearingProcessor.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { createVisionComponent } from '../../components/VisionComponent.js';
import { createIdentityComponent } from '../../components/IdentityComponent.js';

import { ComponentType } from '../../types/ComponentType.js';
function createTestAgent(world: WorldImpl, name: string, x: number, y: number): EntityImpl {
  const entity = new EntityImpl(createEntityId(), world.tick);

  (entity as any).addComponent(createIdentityComponent(name));
  (entity as any).addComponent(createPositionComponent(x, y));
  (entity as any).addComponent(createAgentComponent());
  (entity as any).addComponent(createVisionComponent(10)); // 10 tile vision/hearing range

  // Add entity to world using internal method (same pattern as AgentEntity.ts:69)
  (world as any)._addEntity(entity);
  return entity;
}

describe('Hearing System', () => {
  let world: WorldImpl;
  let hearingProcessor: HearingProcessor;

  beforeEach(() => {
    // Create WorldImpl with minimal dependencies
    const eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    // Create HearingProcessor for direct testing
    hearingProcessor = new HearingProcessor();
  });

  it('should allow agents to hear nearby speech', () => {
    // Create two agents close together (within hearing range of 10 tiles)
    const speaker = createTestAgent(world, 'Alice', 100, 100);
    const listener = createTestAgent(world, 'Bob', 105, 100); // 5 tiles away

    // Make Alice speak
    speaker.updateComponent('agent', (current: any) => ({
      ...current,
      recentSpeech: 'Hello, is anyone there?'
    }));

    // Process hearing for Bob
    hearingProcessor.process(listener, world);

    // Check that Bob heard Alice
    const vision = listener.getComponent(ComponentType.Vision) as any;
    expect(vision.heardSpeech).toBeDefined();
    expect(vision.heardSpeech.length).toBe(1);
    expect(vision.heardSpeech[0].speaker).toBe('Alice');
    expect(vision.heardSpeech[0].text).toBe('Hello, is anyone there?');
  });

  it('should not hear speech from agents too far away', () => {
    // Create two agents far apart (beyond hearing range of 10 tiles)
    const speaker = createTestAgent(world, 'Alice', 100, 100);
    const listener = createTestAgent(world, 'Bob', 200, 200); // ~141 tiles away

    // Make Alice speak
    speaker.updateComponent('agent', (current: any) => ({
      ...current,
      recentSpeech: 'Hello, is anyone there?'
    }));

    // Process hearing for Bob
    hearingProcessor.process(listener, world);

    // Check that Bob did NOT hear Alice
    const vision = listener.getComponent(ComponentType.Vision) as any;
    expect(vision.heardSpeech).toEqual([]);
  });

  it('should hear multiple agents speaking', () => {
    // Create three agents all close together
    const speaker1 = createTestAgent(world, 'Alice', 100, 100);
    const speaker2 = createTestAgent(world, 'Charlie', 102, 100);
    const listener = createTestAgent(world, 'Bob', 105, 100);

    // Make Alice and Charlie speak
    speaker1.updateComponent('agent', (current: any) => ({
      ...current,
      recentSpeech: 'Hello everyone!'
    }));

    speaker2.updateComponent('agent', (current: any) => ({
      ...current,
      recentSpeech: 'Good morning!'
    }));

    // Process hearing for Bob
    hearingProcessor.process(listener, world);

    // Check that Bob heard both Alice and Charlie
    const vision = listener.getComponent(ComponentType.Vision) as any;
    expect(vision.heardSpeech).toBeDefined();
    expect(vision.heardSpeech.length).toBe(2);

    const speakers = vision.heardSpeech.map((s: any) => s.speaker);
    expect(speakers).toContain('Alice');
    expect(speakers).toContain('Charlie');
  });

  it('should not hear own speech', () => {
    // Create a speaking agent
    const agent = createTestAgent(world, 'Bob', 100, 100);

    // Make Bob speak
    agent.updateComponent('agent', (current: any) => ({
      ...current,
      recentSpeech: 'I am talking to myself!'
    }));

    // Process hearing for Bob
    hearingProcessor.process(agent, world);

    // Check that Bob did NOT hear himself
    const vision = agent.getComponent(ComponentType.Vision) as any;
    expect(vision.heardSpeech).toEqual([]);
  });

  it('should only hear agents with recent speech', () => {
    // Create two agents close together
    createTestAgent(world, 'Alice', 100, 100); // Speaker with no speech
    const listener = createTestAgent(world, 'Bob', 105, 100);

    // Alice has no recent speech (undefined)
    // Don't set recentSpeech at all

    // Process hearing for Bob
    hearingProcessor.process(listener, world);

    // Check that Bob heard nothing
    const vision = listener.getComponent(ComponentType.Vision) as any;
    expect(vision.heardSpeech).toEqual([]);
  });
});
