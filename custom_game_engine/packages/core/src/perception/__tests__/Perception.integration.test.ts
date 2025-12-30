import { ComponentType } from '../../types/ComponentType.js';
/**
 * Integration tests for Perception Module
 *
 * Tests perception processors in realistic scenarios with multiple entities,
 * memory updates, and the full perception pipeline.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createVisionComponent } from '../../components/VisionComponent.js';
import { SpatialMemoryComponent } from '../../components/SpatialMemoryComponent.js';
import { VisionProcessor } from '../VisionProcessor.js';
import { HearingProcessor } from '../HearingProcessor.js';
import { MeetingDetector } from '../MeetingDetector.js';
import { PerceptionProcessor } from '../index.js';

describe('Perception Integration Tests', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: true });
  });

  describe('Full Perception Pipeline', () => {
    it('PerceptionProcessor runs all processors in order', () => {
      const perception = new PerceptionProcessor();

      // Create main agent
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(50, 50));
      const vision = createVisionComponent(30);
      (vision as any).canSeeResources = true;
      (vision as any).canSeeAgents = true;
      agent.addComponent(vision);
      agent.addComponent(new SpatialMemoryComponent());
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'Alice',
        behavior: 'wander',
      });
      (harness.world as any)._addEntity(agent);

      // Create a resource
      const resource = new EntityImpl(createEntityId(), 0);
      resource.addComponent(createPositionComponent(55, 50));
      resource.addComponent({
        type: ComponentType.Resource,
        resourceType: 'wood',
        amount: 100,
        harvestable: true,
      });
      (harness.world as any)._addEntity(resource);

      // Create a speaking agent
      const speaker = new EntityImpl(createEntityId(), 0);
      speaker.addComponent(createPositionComponent(45, 50));
      speaker.addComponent({
        type: ComponentType.Agent,
        name: 'Bob',
        behavior: 'idle',
        recentSpeech: 'Hello there!',
      });
      speaker.addComponent({
        type: ComponentType.Identity,
        name: 'Bob',
      });
      (harness.world as any)._addEntity(speaker);

      // Run full perception pipeline
      const result = perception.processAll(agent, harness.world);

      // Vision should have detected the resource
      expect(result.vision.seenResources).toContain(resource.id);

      // Hearing should have collected speech
      expect(result.hearing.heardSpeech.length).toBeGreaterThan(0);
      expect(result.hearing.heardSpeech[0].speaker).toBe('Bob');

      // Meeting detection should return not detected (no meeting call)
      expect(result.meeting.detected).toBe(false);
    });
  });

  describe('Vision and Memory Integration', () => {
    it('agent builds memory of resource locations over time', () => {
      const visionProcessor = new VisionProcessor();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      const vision = createVisionComponent(25);
      (vision as any).canSeeResources = true;
      agent.addComponent(vision);
      agent.addComponent(new SpatialMemoryComponent({ maxMemories: 100 })); // Store up to 100 memories
      (harness.world as any)._addEntity(agent);

      // Create multiple resources
      const positions = [
        { x: 10, y: 0, type: 'wood' },
        { x: 0, y: 15, type: 'stone' },
        { x: -5, y: 5, type: 'food' },
      ];

      for (const pos of positions) {
        const resource = new EntityImpl(createEntityId(), 0);
        resource.addComponent(createPositionComponent(pos.x, pos.y));
        resource.addComponent({
          type: ComponentType.Resource,
          resourceType: pos.type,
          amount: 50,
          harvestable: true,
        });
        (harness.world as any)._addEntity(resource);
      }

      // Process vision
      visionProcessor.process(agent, harness.world);

      // Check memory was updated
      const memory = agent.getComponent(ComponentType.SpatialMemory) as any;
      expect(memory.memories.length).toBe(3);

      // Check memory contains resource locations
      const resourceMemories = memory.memories.filter((m: any) => m.type === 'resource_location');
      expect(resourceMemories.length).toBe(3);

      // Verify memory positions
      const woodMemory = resourceMemories.find((m: any) => m.metadata?.resourceType === 'wood');
      expect(woodMemory).toBeDefined();
      expect(woodMemory.x).toBe(10);
      expect(woodMemory.y).toBe(0);
    });

    it('agent vision updates when resources deplete', () => {
      const visionProcessor = new VisionProcessor();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      const vision = createVisionComponent(20);
      (vision as any).canSeeResources = true;
      agent.addComponent(vision);
      agent.addComponent(new SpatialMemoryComponent());
      (harness.world as any)._addEntity(agent);

      // Create resource with positive amount
      const resource = new EntityImpl(createEntityId(), 0);
      resource.addComponent(createPositionComponent(5, 5));
      resource.addComponent({
        type: ComponentType.Resource,
        resourceType: 'stone',
        amount: 25,
        harvestable: true,
      });
      (harness.world as any)._addEntity(resource);

      // First vision check - should see resource
      let result = visionProcessor.process(agent, harness.world);
      expect(result.seenResources).toContain(resource.id);

      // Deplete resource
      resource.updateComponent('resource', (current: any) => ({
        ...current,
        amount: 0,
      }));

      // Second vision check - should NOT see depleted resource
      result = visionProcessor.process(agent, harness.world);
      expect(result.seenResources).not.toContain(resource.id);
    });

    it('agent detects plants and remembers their state', () => {
      const visionProcessor = new VisionProcessor();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(30));
      agent.addComponent(new SpatialMemoryComponent());
      (harness.world as any)._addEntity(agent);

      // Create a mature plant with seeds and fruit
      const plant = new EntityImpl(createEntityId(), 0);
      plant.addComponent(createPositionComponent(10, 10));
      plant.addComponent({
        type: ComponentType.Plant,
        speciesId: 'berry-bush',
        stage: 'mature',
        seedsProduced: 5,
        fruitCount: 8,
      });
      (harness.world as any)._addEntity(plant);

      // Process vision
      visionProcessor.process(agent, harness.world);

      // Check plant was seen
      const updatedVision = agent.getComponent(ComponentType.Vision) as any;
      expect(updatedVision.seenPlants).toContain(plant.id);

      // Check memory contains plant info
      const memory = agent.getComponent(ComponentType.SpatialMemory) as any;
      const plantMemory = memory.memories.find((m: any) => m.type === 'plant_location');
      expect(plantMemory).toBeDefined();
      expect(plantMemory.metadata.speciesId).toBe('berry-bush');
      expect(plantMemory.metadata.hasSeeds).toBe(true);
      expect(plantMemory.metadata.hasFruit).toBe(true);
    });
  });

  describe('Multi-Agent Hearing', () => {
    it('agent hears multiple speakers in range', () => {
      const hearingProcessor = new HearingProcessor(40);

      const listener = new EntityImpl(createEntityId(), 0);
      listener.addComponent(createPositionComponent(50, 50));
      listener.addComponent(createVisionComponent(20));
      (harness.world as any)._addEntity(listener);

      // Create multiple speaking agents
      const speakers = [
        { x: 45, y: 50, name: 'Alice', text: 'Hello!' },
        { x: 55, y: 50, name: 'Bob', text: 'Hi there!' },
        { x: 50, y: 55, name: 'Carol', text: 'Good morning!' },
      ];

      for (const s of speakers) {
        const speaker = new EntityImpl(createEntityId(), 0);
        speaker.addComponent(createPositionComponent(s.x, s.y));
        speaker.addComponent({
          type: ComponentType.Agent,
          name: s.name,
          behavior: 'talk',
          recentSpeech: s.text,
        });
        speaker.addComponent({
          type: ComponentType.Identity,
          name: s.name,
        });
        (harness.world as any)._addEntity(speaker);
      }

      // Process hearing
      const result = hearingProcessor.process(listener, harness.world);

      // Should hear all 3 speakers
      expect(result.heardSpeech).toHaveLength(3);

      const speakerNames = result.heardSpeech.map((s) => s.speaker);
      expect(speakerNames).toContain('Alice');
      expect(speakerNames).toContain('Bob');
      expect(speakerNames).toContain('Carol');
    });

    it('agent only hears agents within hearing range', () => {
      const hearingProcessor = new HearingProcessor(20); // Short range

      const listener = new EntityImpl(createEntityId(), 0);
      listener.addComponent(createPositionComponent(0, 0));
      listener.addComponent(createVisionComponent(20));
      (harness.world as any)._addEntity(listener);

      // Close speaker (in range)
      const closeSpeaker = new EntityImpl(createEntityId(), 0);
      closeSpeaker.addComponent(createPositionComponent(10, 0));
      closeSpeaker.addComponent({
        type: ComponentType.Agent,
        name: 'NearPerson',
        behavior: 'talk',
        recentSpeech: 'Close message',
      });
      closeSpeaker.addComponent({
        type: ComponentType.Identity,
        name: 'NearPerson',
      });
      (harness.world as any)._addEntity(closeSpeaker);

      // Far speaker (out of range)
      const farSpeaker = new EntityImpl(createEntityId(), 0);
      farSpeaker.addComponent(createPositionComponent(100, 100));
      farSpeaker.addComponent({
        type: ComponentType.Agent,
        name: 'FarPerson',
        behavior: 'talk',
        recentSpeech: 'Far message',
      });
      farSpeaker.addComponent({
        type: ComponentType.Identity,
        name: 'FarPerson',
      });
      (harness.world as any)._addEntity(farSpeaker);

      // Process hearing
      const result = hearingProcessor.process(listener, harness.world);

      // Should only hear close speaker
      expect(result.heardSpeech).toHaveLength(1);
      expect(result.heardSpeech[0].speaker).toBe('NearPerson');
    });
  });

  describe('Meeting Detection Flow', () => {
    it('agent responds to meeting call from known agent', () => {
      const meetingDetector = new MeetingDetector();

      // Create listening agent
      const listener = new EntityImpl(createEntityId(), 0);
      listener.addComponent(createPositionComponent(0, 0));
      listener.addComponent({
        type: ComponentType.Agent,
        name: 'Attendee',
        behavior: 'wander',
      });
      listener.addComponent({
        type: ComponentType.Identity,
        name: 'Attendee',
      });

      // Set up vision with meeting call
      const vision = createVisionComponent(30);
      (vision as any).heardSpeech = [
        { speaker: 'Leader', text: 'I am calling a meeting! Everyone gather around.' },
      ];
      listener.addComponent(vision);

      // Add relationship to increase attendance chance
      listener.addComponent({
        type: ComponentType.Relationship,
        relationships: new Map([
          ['leader-id', { familiarity: 100 }], // High familiarity = will attend
        ]),
      });

      (harness.world as any)._addEntity(listener);

      // Create meeting caller
      const caller = new EntityImpl('leader-id', 0);
      caller.addComponent(createPositionComponent(10, 10));
      caller.addComponent({
        type: ComponentType.Agent,
        name: 'Leader',
        behavior: 'call_meeting',
      });
      caller.addComponent({
        type: ComponentType.Identity,
        name: 'Leader',
      });
      caller.addComponent({
        type: ComponentType.Meeting,
        active: true,
        topic: 'Village planning',
      });
      (harness.world as any)._addEntity(caller);

      // Process meeting detection
      const result = meetingDetector.process(listener, harness.world);

      expect(result.detected).toBe(true);
      expect(result.callerName).toBe('Leader');
      expect(result.attending).toBe(true);

      // Verify behavior changed
      const updatedAgent = listener.getComponent(ComponentType.Agent) as any;
      expect(updatedAgent.behavior).toBe('attend_meeting');
      expect(updatedAgent.behaviorState.meetingCallerId).toBe('leader-id');
    });

    it('agent ignores meeting when already sleeping', () => {
      const meetingDetector = new MeetingDetector();

      const sleepingAgent = new EntityImpl(createEntityId(), 0);
      sleepingAgent.addComponent(createPositionComponent(0, 0));
      sleepingAgent.addComponent({
        type: ComponentType.Agent,
        name: 'SleepyPerson',
        behavior: 'forced_sleep', // Critical behavior - should not be interrupted
      });

      const vision = createVisionComponent(30);
      (vision as any).heardSpeech = [
        { speaker: 'Leader', text: 'Gather around everyone!' },
      ];
      sleepingAgent.addComponent(vision);

      (harness.world as any)._addEntity(sleepingAgent);

      const result = meetingDetector.process(sleepingAgent, harness.world);

      expect(result.detected).toBe(false);

      // Behavior should remain unchanged
      const agent = sleepingAgent.getComponent(ComponentType.Agent) as any;
      expect(agent.behavior).toBe('forced_sleep');
    });
  });

  describe('Perception in Movement Scenario', () => {
    it('agent perception updates as they move through world', () => {
      const visionProcessor = new VisionProcessor();

      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      const vision = createVisionComponent(15);
      (vision as any).canSeeResources = true;
      (vision as any).canSeeAgents = true;
      agent.addComponent(vision);
      agent.addComponent(new SpatialMemoryComponent());
      (harness.world as any)._addEntity(agent);

      // Create resources at different locations
      const resource1 = new EntityImpl(createEntityId(), 0);
      resource1.addComponent(createPositionComponent(10, 0)); // Close to start
      resource1.addComponent({
        type: ComponentType.Resource,
        resourceType: 'wood',
        amount: 50,
        harvestable: true,
      });
      (harness.world as any)._addEntity(resource1);

      const resource2 = new EntityImpl(createEntityId(), 0);
      resource2.addComponent(createPositionComponent(100, 0)); // Far from start
      resource2.addComponent({
        type: ComponentType.Resource,
        resourceType: 'stone',
        amount: 50,
        harvestable: true,
      });
      (harness.world as any)._addEntity(resource2);

      // Initial perception at start position
      let result = visionProcessor.process(agent, harness.world);
      expect(result.seenResources).toContain(resource1.id);
      expect(result.seenResources).not.toContain(resource2.id);

      // Move agent to far position
      agent.updateComponent('position', (current: any) => ({
        ...current,
        x: 100,
        y: 0,
      }));

      // Perception after move
      result = visionProcessor.process(agent, harness.world);
      expect(result.seenResources).not.toContain(resource1.id);
      expect(result.seenResources).toContain(resource2.id);
    });
  });
});
