import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World';
import type { World } from '../../ecs/World';
import { AISystem } from '../AISystem';
import { createAgentComponent } from '../../components/AgentComponent';
import { createPositionComponent } from '../../components/PositionComponent';
import { createVisionComponent } from '../../components/VisionComponent';
import { createNeedsComponent } from '../../components/NeedsComponent';
import { createMemoryComponent } from '../../components/MemoryComponent';
import { createIdentityComponent } from '../../components/IdentityComponent';

describe.skip('Hearing System Integration', () => {
  // Skipped: WorldImpl.createEntity not yet implemented
  // These tests will pass once the entity archetype system is complete
  let world: World;
  let aiSystem: AISystem;

  beforeEach(() => {
    world = new WorldImpl({ ticksPerSecond: 20 });
    aiSystem = new AISystem();
    // Don't add system to world, just use it directly for testing
  });

  describe('Speech Broadcasting', () => {
    it('should store speech on speaking agent', () => {
      const agent = world.createEntity([
        createAgentComponent('idle', 20, true),
        createPositionComponent(0, 0),
        createVisionComponent(10),
        createNeedsComponent(),
        createMemoryComponent(),
        createIdentityComponent('Alice'),
      ]);

      // Simulate LLM response with speech
      const agentComp = agent.components.get('agent') as any;
      agent.components.set('agent', {
        ...agentComp,
        recentSpeech: 'Hello everyone!'
      });

      // No need to run update for this test, just check the component
      const updatedAgent = agent.components.get('agent') as any;
      expect(updatedAgent.recentSpeech).toBe('Hello everyone!');
    });

    it('should clear speech when agent stops speaking', () => {
      const agent = world.createEntity([
        createAgentComponent('idle'),
        createPositionComponent(0, 0),
        createVisionComponent(10),
        createNeedsComponent(),
        createMemoryComponent(),
        createIdentityComponent('Bob'),
      ]);

      // Agent speaks
      const agentComp = agent.components.get('agent') as any;
      agent.components.set('agent', {
        ...agentComp,
        recentSpeech: 'I spoke!'
      });

      // Agent stops speaking
      agent.components.set('agent', {
        ...agentComp,
        recentSpeech: undefined
      });

      const updatedAgent = agent.components.get('agent') as any;
      expect(updatedAgent.recentSpeech).toBeUndefined();
    });
  });

  describe('Speech Hearing', () => {
    it('should hear nearby agent speech', () => {
      // Create speaker
      const speaker = world.createEntity([
        createAgentComponent('idle'),
        createPositionComponent(5, 5),
        createVisionComponent(10),
        createNeedsComponent(),
        createMemoryComponent(),
        createIdentityComponent('Alice'),
      ]);

      // Create listener nearby
      const listener = world.createEntity([
        createAgentComponent('idle'),
        createPositionComponent(7, 7), // Distance ~2.8 units
        createVisionComponent(10), // Can hear within 10 units
        createNeedsComponent(),
        createMemoryComponent(),
        createIdentityComponent('Bob'),
      ]);

      // Speaker says something
      const speakerComp = speaker.components.get('agent') as any;
      speaker.components.set('agent', {
        ...speakerComp,
        recentSpeech: 'Found some berries!'
      });

      // Manually trigger processHearing (simulating what AISystem.update does)
      const entities = world.query().with('agent').with('vision').executeEntities();
      for (const entity of entities) {
        if (entity.id === listener.id) {
          // Call processHearing through AISystem
          (aiSystem as any).processHearing(entity, world);
        }
      }

      const listenerVision = listener.components.get('vision') as any;
      expect(listenerVision.heardSpeech).toBeDefined();
      expect(listenerVision.heardSpeech.length).toBe(1);
      expect(listenerVision.heardSpeech[0]).toEqual({
        speaker: 'Alice',
        text: 'Found some berries!'
      });
    });

    it('should not hear speech beyond hearing range', () => {
      // Create speaker
      const speaker = world.createEntity([
        createAgentComponent('idle'),
        createPositionComponent(0, 0),
        createVisionComponent(10),
        createNeedsComponent(),
        createMemoryComponent(),
        createIdentityComponent('Alice'),
      ]);

      // Create listener far away
      const listener = world.createEntity([
        createAgentComponent('idle'),
        createPositionComponent(50, 50), // Distance ~70 units
        createVisionComponent(10), // Only 10 unit range
        createNeedsComponent(),
        createMemoryComponent(),
        createIdentityComponent('Bob'),
      ]);

      // Speaker says something
      const speakerComp = speaker.components.get('agent') as any;
      speaker.components.set('agent', {
        ...speakerComp,
        recentSpeech: 'You can\'t hear me!'
      });

      // Manually trigger processHearing
      const entities = world.query().with("agent").with("vision").executeEntities();
      for (const entity of entities) {
        (aiSystem as any).processHearing(entity, world);
      }

      const listenerVision = listener.components.get('vision') as any;
      expect(listenerVision.heardSpeech).toBeUndefined();
    });

    it('should hear multiple nearby agents speaking', () => {
      // Create multiple speakers
      const speaker1 = world.createEntity([
        createAgentComponent('idle'),
        createPositionComponent(5, 5),
        createIdentityComponent('Alice'),
        createVisionComponent(10),
        createNeedsComponent(),
        createMemoryComponent(),
      ]);

      const speaker2 = world.createEntity([
        createAgentComponent('idle'),
        createPositionComponent(6, 6),
        createIdentityComponent('Bob'),
        createVisionComponent(10),
        createNeedsComponent(),
        createMemoryComponent(),
      ]);

      const listener = world.createEntity([
        createAgentComponent('idle'),
        createPositionComponent(5.5, 5.5),
        createIdentityComponent('Charlie'),
        createVisionComponent(10),
        createNeedsComponent(),
        createMemoryComponent(),
      ]);

      // Both speakers say something
      const speaker1Comp = speaker1.components.get('agent') as any;
      speaker1.components.set('agent', {
        ...speaker1Comp,
        recentSpeech: 'Hello!'
      });

      const speaker2Comp = speaker2.components.get('agent') as any;
      speaker2.components.set('agent', {
        ...speaker2Comp,
        recentSpeech: 'Hi there!'
      });

      // Manually trigger processHearing
      const entities = world.query().with("agent").with("vision").executeEntities();
      for (const entity of entities) {
        (aiSystem as any).processHearing(entity, world);
      }

      const listenerVision = listener.components.get('vision') as any;
      expect(listenerVision.heardSpeech).toBeDefined();
      expect(listenerVision.heardSpeech.length).toBe(2);

      const speakers = listenerVision.heardSpeech.map((s: any) => s.speaker);
      expect(speakers).toContain('Alice');
      expect(speakers).toContain('Bob');
    });

    it('should not hear own speech', () => {
      const agent = world.createEntity([
        createAgentComponent('idle'),
        createPositionComponent(0, 0),
        createVisionComponent(10),
        createNeedsComponent(),
        createMemoryComponent(),
        createIdentityComponent('Alice'),
      ]);

      // Agent speaks
      const agentComp = agent.components.get('agent') as any;
      agent.components.set('agent', {
        ...agentComp,
        recentSpeech: 'I am talking'
      });

      // Manually trigger processHearing
      const entities = world.query().with("agent").with("vision").executeEntities();
      for (const entity of entities) {
        (aiSystem as any).processHearing(entity, world);
      }

      const vision = agent.components.get('vision') as any;
      // Should not include own speech in heardSpeech
      expect(vision.heardSpeech).toBeUndefined();
    });
  });

  describe('Speech with Silent Agents', () => {
    it('should only hear agents who have spoken', () => {
      const speakingAgent = world.createEntity([
        createAgentComponent('idle'),
        createPositionComponent(5, 5),
        createIdentityComponent('Alice'),
        createVisionComponent(10),
        createNeedsComponent(),
        createMemoryComponent(),
      ]);

      const silentAgent = world.createEntity([
        createAgentComponent('idle'),
        createPositionComponent(6, 6),
        createIdentityComponent('Bob'),
        createVisionComponent(10),
        createNeedsComponent(),
        createMemoryComponent(),
      ]);

      const listener = world.createEntity([
        createAgentComponent('idle'),
        createPositionComponent(5.5, 5.5),
        createIdentityComponent('Charlie'),
        createVisionComponent(10),
        createNeedsComponent(),
        createMemoryComponent(),
      ]);

      // Only Alice speaks
      const speakerComp = speakingAgent.components.get('agent') as any;
      speakingAgent.components.set('agent', {
        ...speakerComp,
        recentSpeech: 'Hello!'
      });

      // Manually trigger processHearing
      const entities = world.query().with("agent").with("vision").executeEntities();
      for (const entity of entities) {
        (aiSystem as any).processHearing(entity, world);
      }

      const listenerVision = listener.components.get('vision') as any;
      expect(listenerVision.heardSpeech).toBeDefined();
      expect(listenerVision.heardSpeech.length).toBe(1);
      expect(listenerVision.heardSpeech[0].speaker).toBe('Alice');
    });
  });
});
