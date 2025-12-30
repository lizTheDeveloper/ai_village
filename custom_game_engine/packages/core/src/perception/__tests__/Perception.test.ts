import { ComponentType } from '../../types/ComponentType.js';
/**
 * Unit tests for Perception Module
 *
 * Tests VisionProcessor, HearingProcessor, and MeetingDetector classes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { WorldImpl } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createVisionComponent } from '../../components/VisionComponent.js';
import { SpatialMemoryComponent } from '../../components/SpatialMemoryComponent.js';
import { VisionProcessor } from '../VisionProcessor.js';
import { HearingProcessor } from '../HearingProcessor.js';
import { MeetingDetector, isMeetingCall } from '../MeetingDetector.js';

describe('VisionProcessor', () => {
  let visionProcessor: VisionProcessor;
  let world: WorldImpl;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    visionProcessor = new VisionProcessor();
  });

  describe('process', () => {
    it('returns empty result when entity has no vision component', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      (world as any)._addEntity(agent);

      const result = visionProcessor.process(agent, world);

      expect(result.seenResources).toHaveLength(0);
      expect(result.seenPlants).toHaveLength(0);
      expect(result.seenAgents).toHaveLength(0);
    });

    it('returns empty result when entity has no memory component', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(20));
      (world as any)._addEntity(agent);

      const result = visionProcessor.process(agent, world);

      expect(result.seenResources).toHaveLength(0);
      expect(result.seenPlants).toHaveLength(0);
      expect(result.seenAgents).toHaveLength(0);
    });

    it('detects resources within vision range', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      const vision = createVisionComponent(20);
      (vision as any).canSeeResources = true;
      agent.addComponent(vision);
      agent.addComponent(new SpatialMemoryComponent());
      (world as any)._addEntity(agent);

      // Create resource within range
      const resource = new EntityImpl(createEntityId(), 0);
      resource.addComponent(createPositionComponent(10, 0));
      resource.addComponent({
        type: ComponentType.Resource,
        resourceType: 'wood',
        amount: 50,
        harvestable: true,
      });
      (world as any)._addEntity(resource);

      const result = visionProcessor.process(agent, world);

      expect(result.seenResources).toContain(resource.id);
    });

    it('does not detect resources outside vision range', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      const vision = createVisionComponent(10);
      (vision as any).canSeeResources = true;
      agent.addComponent(vision);
      agent.addComponent(new SpatialMemoryComponent());
      (world as any)._addEntity(agent);

      // Create resource outside range
      const resource = new EntityImpl(createEntityId(), 0);
      resource.addComponent(createPositionComponent(50, 50));
      resource.addComponent({
        type: ComponentType.Resource,
        resourceType: 'wood',
        amount: 50,
        harvestable: true,
      });
      (world as any)._addEntity(resource);

      const result = visionProcessor.process(agent, world);

      expect(result.seenResources).not.toContain(resource.id);
    });

    it('detects plants within vision range', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(15));
      agent.addComponent(new SpatialMemoryComponent());
      (world as any)._addEntity(agent);

      // Create plant within range
      const plant = new EntityImpl(createEntityId(), 0);
      plant.addComponent(createPositionComponent(5, 5));
      plant.addComponent({
        type: ComponentType.Plant,
        speciesId: 'berry-bush',
        stage: 'mature',
        seedsProduced: 3,
        fruitCount: 5,
      });
      (world as any)._addEntity(plant);

      const result = visionProcessor.process(agent, world);

      expect(result.seenPlants).toContain(plant.id);
    });

    it('detects other agents within vision range', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      const vision = createVisionComponent(20);
      (vision as any).canSeeAgents = true;
      agent.addComponent(vision);
      agent.addComponent(new SpatialMemoryComponent());
      (world as any)._addEntity(agent);

      // Create other agent within range
      const otherAgent = new EntityImpl(createEntityId(), 0);
      otherAgent.addComponent(createPositionComponent(10, 10));
      otherAgent.addComponent({
        type: ComponentType.Agent,
        name: 'Bob',
        behavior: 'wander',
      });
      (world as any)._addEntity(otherAgent);

      const result = visionProcessor.process(agent, world);

      expect(result.seenAgents).toContain(otherAgent.id);
    });

    it('does not include self in seen agents', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      const vision = createVisionComponent(20);
      (vision as any).canSeeAgents = true;
      agent.addComponent(vision);
      agent.addComponent(new SpatialMemoryComponent());
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'Alice',
        behavior: 'idle',
      });
      (world as any)._addEntity(agent);

      const result = visionProcessor.process(agent, world);

      expect(result.seenAgents).not.toContain(agent.id);
    });

    it('updates VisionComponent with seen entities', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      const vision = createVisionComponent(20);
      (vision as any).canSeeAgents = true;
      (vision as any).canSeeResources = true;
      agent.addComponent(vision);
      agent.addComponent(new SpatialMemoryComponent());
      (world as any)._addEntity(agent);

      // Create visible entities
      const resource = new EntityImpl(createEntityId(), 0);
      resource.addComponent(createPositionComponent(5, 0));
      resource.addComponent({
        type: ComponentType.Resource,
        resourceType: 'stone',
        amount: 100,
        harvestable: true,
      });
      (world as any)._addEntity(resource);

      visionProcessor.process(agent, world);

      const updatedVision = agent.getComponent(ComponentType.Vision) as any;
      expect(updatedVision.seenResources).toContain(resource.id);
    });
  });
});

describe('HearingProcessor', () => {
  let hearingProcessor: HearingProcessor;
  let world: WorldImpl;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    hearingProcessor = new HearingProcessor(50); // 50 tile hearing range
  });

  describe('process', () => {
    it('returns empty result when entity has no vision component', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      (world as any)._addEntity(agent);

      const result = hearingProcessor.process(agent, world);

      expect(result.heardSpeech).toHaveLength(0);
    });

    it('collects speech from nearby agents', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(20));
      (world as any)._addEntity(agent);

      // Create speaking agent
      const speaker = new EntityImpl(createEntityId(), 0);
      speaker.addComponent(createPositionComponent(10, 0));
      speaker.addComponent({
        type: ComponentType.Agent,
        name: 'Bob',
        behavior: 'talk',
        recentSpeech: 'Hello everyone!',
      });
      speaker.addComponent({
        type: ComponentType.Identity,
        name: 'Bob',
      });
      (world as any)._addEntity(speaker);

      const result = hearingProcessor.process(agent, world);

      expect(result.heardSpeech).toHaveLength(1);
      expect(result.heardSpeech[0].speaker).toBe('Bob');
      expect(result.heardSpeech[0].text).toBe('Hello everyone!');
    });

    it('does not hear speech from agents outside hearing range', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(20));
      (world as any)._addEntity(agent);

      // Create speaking agent far away
      const speaker = new EntityImpl(createEntityId(), 0);
      speaker.addComponent(createPositionComponent(100, 100));
      speaker.addComponent({
        type: ComponentType.Agent,
        name: 'FarAway',
        behavior: 'talk',
        recentSpeech: 'Can you hear me?',
      });
      (world as any)._addEntity(speaker);

      const result = hearingProcessor.process(agent, world);

      expect(result.heardSpeech).toHaveLength(0);
    });

    it('does not include own speech', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(20));
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'Alice',
        behavior: 'talk',
        recentSpeech: 'I am talking',
      });
      (world as any)._addEntity(agent);

      const result = hearingProcessor.process(agent, world);

      expect(result.heardSpeech).toHaveLength(0);
    });

    it('updates VisionComponent with heard speech', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(createVisionComponent(20));
      (world as any)._addEntity(agent);

      const speaker = new EntityImpl(createEntityId(), 0);
      speaker.addComponent(createPositionComponent(5, 5));
      speaker.addComponent({
        type: ComponentType.Agent,
        name: 'Carol',
        behavior: 'talk',
        recentSpeech: 'Test message',
      });
      speaker.addComponent({
        type: ComponentType.Identity,
        name: 'Carol',
      });
      (world as any)._addEntity(speaker);

      hearingProcessor.process(agent, world);

      const updatedVision = agent.getComponent(ComponentType.Vision) as any;
      expect(updatedVision.heardSpeech).toHaveLength(1);
      expect(updatedVision.heardSpeech[0].text).toBe('Test message');
    });
  });

  describe('canHear', () => {
    it('returns true for entities within hearing range', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));

      const target = new EntityImpl(createEntityId(), 0);
      target.addComponent(createPositionComponent(30, 0));

      expect(hearingProcessor.canHear(agent, target)).toBe(true);
    });

    it('returns false for entities outside hearing range', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));

      const target = new EntityImpl(createEntityId(), 0);
      target.addComponent(createPositionComponent(100, 0));

      expect(hearingProcessor.canHear(agent, target)).toBe(false);
    });
  });
});

describe('MeetingDetector', () => {
  let meetingDetector: MeetingDetector;
  let world: WorldImpl;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    meetingDetector = new MeetingDetector();
  });

  describe('isMeetingCall', () => {
    it('detects "calling a meeting" phrase', () => {
      expect(isMeetingCall('I am calling a meeting')).toBe(true);
    });

    it('detects "gather around" phrase', () => {
      expect(isMeetingCall('Everyone gather around please')).toBe(true);
    });

    it('returns false for regular speech', () => {
      expect(isMeetingCall('Hello, how are you?')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isMeetingCall('CALLING A MEETING NOW')).toBe(true);
    });
  });

  describe('process', () => {
    it('returns detected=false when no agent component', () => {
      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent(createPositionComponent(0, 0));
      (world as any)._addEntity(entity);

      const result = meetingDetector.process(entity, world);

      expect(result.detected).toBe(false);
    });

    it('returns detected=false when no heard speech', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'Alice',
        behavior: 'idle',
      });
      agent.addComponent(createVisionComponent(20));
      (world as any)._addEntity(agent);

      const result = meetingDetector.process(agent, world);

      expect(result.detected).toBe(false);
    });

    it('does not interrupt sleep behaviors', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'Alice',
        behavior: 'forced_sleep', // Uninterruptible
      });
      const vision = createVisionComponent(20);
      (vision as any).heardSpeech = [{ speaker: 'Bob', text: 'Calling a meeting!' }];
      agent.addComponent(vision);
      (world as any)._addEntity(agent);

      const result = meetingDetector.process(agent, world);

      expect(result.detected).toBe(false);
    });

    it('does not interrupt attend_meeting behavior', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'Alice',
        behavior: 'attend_meeting', // Already attending
      });
      const vision = createVisionComponent(20);
      (vision as any).heardSpeech = [{ speaker: 'Carol', text: 'Gather around!' }];
      agent.addComponent(vision);
      (world as any)._addEntity(agent);

      const result = meetingDetector.process(agent, world);

      expect(result.detected).toBe(false);
    });

    it('detects meeting call from heard speech', () => {
      const agent = new EntityImpl(createEntityId(), 0);
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent({
        type: ComponentType.Agent,
        name: 'Alice',
        behavior: 'wander',
      });
      const vision = createVisionComponent(20);
      (vision as any).heardSpeech = [{ speaker: 'Bob', text: 'I am calling a meeting!' }];
      agent.addComponent(vision);
      (world as any)._addEntity(agent);

      // Create the meeting caller
      const caller = new EntityImpl(createEntityId(), 0);
      caller.addComponent(createPositionComponent(10, 0));
      caller.addComponent({
        type: ComponentType.Agent,
        name: 'Bob',
        behavior: 'call_meeting',
      });
      caller.addComponent({
        type: ComponentType.Identity,
        name: 'Bob',
      });
      caller.addComponent({
        type: ComponentType.Meeting,
        active: true,
      });
      (world as any)._addEntity(caller);

      // Mock Math.random to control attendance decision
      const originalRandom = Math.random;
      Math.random = () => 0.1; // Will attend (< 0.5)

      const result = meetingDetector.process(agent, world);

      Math.random = originalRandom;

      expect(result.detected).toBe(true);
      expect(result.callerName).toBe('Bob');
    });
  });
});
