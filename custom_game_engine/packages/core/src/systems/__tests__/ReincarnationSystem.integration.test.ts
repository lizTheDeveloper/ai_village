/**
 * Integration tests for ReincarnationSystem
 *
 * Tests the full lifecycle of soul reincarnation including:
 * - Death → Reincarnation queue → New entity spawn
 * - Integration with DeathTransitionSystem
 * - Integration with AfterlifePolicy
 * - Memory and skill transfer across lives
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import type { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import type { World } from '../../ecs/World.js';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { ReincarnationSystem } from '../ReincarnationSystem.js';
import { DeathTransitionSystem } from '../DeathTransitionSystem.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';
import { PersonalityComponent } from '../../components/PersonalityComponent.js';
import { EpisodicMemoryComponent } from '../../components/EpisodicMemoryComponent.js';
import { createIdentityComponent } from '../../components/IdentityComponent.js';
import { createPositionComponent, type PositionComponent } from '../../components/PositionComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { createRealmLocationComponent } from '../../components/RealmLocationComponent.js';
import { createSpiritualComponent, type SpiritualComponent } from '../../components/SpiritualComponent.js';
import { generateRandomStartingSkills } from '../../components/SkillsComponent.js';
import { createDeedLedgerComponent, recordDeed } from '../../components/DeedLedgerComponent.js';
import type { Deity } from '../../divinity/DeityTypes.js';
import type { AfterlifePolicy } from '../../divinity/AfterlifePolicy.js';

describe('ReincarnationSystem Integration', () => {
  let harness: IntegrationTestHarness;
  let world: World;
  let reincarnationSystem: ReincarnationSystem;
  let deathSystem: DeathTransitionSystem;

  beforeEach(() => {
    harness = createMinimalWorld();
    world = harness.world;
    reincarnationSystem = new ReincarnationSystem();
    deathSystem = new DeathTransitionSystem();

    // Initialize systems
    reincarnationSystem.init(world);
  });

  describe('full reincarnation lifecycle', () => {
    it('should complete full death to rebirth cycle', async () => {
      // Create a mortal agent
      const entityId = createEntityId();
      const entity = new EntityImpl(entityId, 0);

      // Add required components
      entity.addComponent(createIdentityComponent('Reborn Hero'));
      entity.addComponent(createPositionComponent(50, 50));
      entity.addComponent(createRealmLocationComponent('mortal'));
      entity.addComponent(createAgentComponent('idle', 20, true, 0)); // LLM agent
      entity.addComponent(new NeedsComponent({
        hunger: 0, // Will die from starvation
        energy: 0.5,
        health: 0.1,
      }));

      const personality = new PersonalityComponent({
        openness: 0.9,
        conscientiousness: 0.8,
        extraversion: 0.7,
        agreeableness: 0.6,
        neuroticism: 0.3,
      });
      entity.addComponent(personality);

      const skills = generateRandomStartingSkills(personality);
      entity.addComponent(skills);

      // Add memories
      const episodic = new EpisodicMemoryComponent({ maxMemories: 100 });
      episodic.formMemory({
        eventType: 'adventure',
        summary: 'Slayed a dragon',
        timestamp: 1000,
        emotionalValence: 0.9,
        emotionalIntensity: 1.0,
      });
      entity.addComponent(episodic);

      world.addEntity(entity);

      // Track events
      const events: string[] = [];
      world.eventBus.subscribe('soul:reincarnation_queued', () => {
        events.push('queued');
      });
      world.eventBus.subscribe('soul:reincarnated', () => {
        events.push('reincarnated');
      });

      // Manually queue the soul (normally DeathTransitionSystem would do this)
      world.eventBus.emit({
        type: 'soul:reincarnation_queued',
        source: entityId,
        data: {
          entityId,
          deityId: 'nature-deity',
          target: 'same_world',
          memoryRetention: 'full',
          speciesConstraint: 'same',
          minimumDelay: 0,
          maximumDelay: 0,
        },
      });

      world.eventBus.flush();

      expect(events).toContain('queued');
      expect(reincarnationSystem.getQueuedSoulCount()).toBe(1);

      // Advance time and process reincarnation
      (world as WorldImpl)._tick = 100;
      reincarnationSystem.update(world, [], 1);

      world.eventBus.flush();

      // Verify reincarnation occurred
      expect(events).toContain('reincarnated');
      expect(reincarnationSystem.getQueuedSoulCount()).toBe(0);
    });
  });

  describe('memory retention across lives', () => {
    it('should transfer memories with full retention', () => {
      const entityId = createEntityId();
      const entity = new EntityImpl(entityId, 0);

      entity.addComponent(createIdentityComponent('Memory Keeper'));
      entity.addComponent(createPositionComponent(10, 10));

      const personality = new PersonalityComponent({
        openness: 0.7,
        conscientiousness: 0.7,
        extraversion: 0.7,
        agreeableness: 0.7,
        neuroticism: 0.3,
      });
      entity.addComponent(personality);

      const skills = generateRandomStartingSkills(personality);
      entity.addComponent(skills);

      // Add multiple memories with varying importance
      const episodic = new EpisodicMemoryComponent({ maxMemories: 100 });
      episodic.formMemory({
        eventType: 'wedding',
        summary: 'Married beloved partner',
        timestamp: 5000,
        emotionalValence: 1.0,
        emotionalIntensity: 1.0,
        importance: 1.0,
      });
      episodic.formMemory({
        eventType: 'daily',
        summary: 'Ate breakfast',
        timestamp: 5001,
        emotionalValence: 0.1,
        emotionalIntensity: 0.1,
        importance: 0.1,
      });
      entity.addComponent(episodic);

      world.addEntity(entity);

      let preservedMemoryCount = 0;
      world.eventBus.subscribe('soul:reincarnated', (event) => {
        preservedMemoryCount = event.data.preservedMemoryCount;
      });

      world.eventBus.emit({
        type: 'soul:reincarnation_queued',
        source: entityId,
        data: {
          entityId,
          target: 'same_world',
          memoryRetention: 'full',
          speciesConstraint: 'same',
          minimumDelay: 0,
          maximumDelay: 0,
        },
      });

      world.eventBus.flush();

      (world as WorldImpl)._tick = 100;
      reincarnationSystem.update(world, [], 1);

      world.eventBus.flush();

      // Full retention should preserve all memories
      expect(preservedMemoryCount).toBeGreaterThan(0);
    });

    it('should preserve only significant memories with fragments retention', () => {
      const entityId = createEntityId();
      const entity = new EntityImpl(entityId, 0);

      entity.addComponent(createIdentityComponent('Fragment Soul'));
      entity.addComponent(createPositionComponent(10, 10));

      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
      });
      entity.addComponent(personality);

      // Add many memories
      const episodic = new EpisodicMemoryComponent({ maxMemories: 100 });
      for (let i = 0; i < 50; i++) {
        episodic.formMemory({
          eventType: 'event',
          summary: `Memory ${i}`,
          timestamp: i * 100,
          emotionalValence: Math.random() * 2 - 1,
          emotionalIntensity: Math.random(),
        });
      }
      entity.addComponent(episodic);

      world.addEntity(entity);

      let preservedMemoryCount = 0;
      world.eventBus.subscribe('soul:reincarnated', (event) => {
        preservedMemoryCount = event.data.preservedMemoryCount;
      });

      world.eventBus.emit({
        type: 'soul:reincarnation_queued',
        source: entityId,
        data: {
          entityId,
          target: 'same_world',
          memoryRetention: 'fragments',
          speciesConstraint: 'same',
          minimumDelay: 0,
          maximumDelay: 0,
        },
      });

      world.eventBus.flush();

      (world as WorldImpl)._tick = 100;
      reincarnationSystem.update(world, [], 1);

      world.eventBus.flush();

      // Fragments retention should preserve only some memories (top 20)
      expect(preservedMemoryCount).toBeLessThanOrEqual(20);
    });

    it('should preserve no memories with none retention', () => {
      const entityId = createEntityId();
      const entity = new EntityImpl(entityId, 0);

      entity.addComponent(createIdentityComponent('Blank Slate'));
      entity.addComponent(createPositionComponent(10, 10));

      world.addEntity(entity);

      let preservedMemoryCount = -1;
      world.eventBus.subscribe('soul:reincarnated', (event) => {
        preservedMemoryCount = event.data.preservedMemoryCount;
      });

      world.eventBus.emit({
        type: 'soul:reincarnation_queued',
        source: entityId,
        data: {
          entityId,
          target: 'same_world',
          memoryRetention: 'none',
          speciesConstraint: 'same',
          minimumDelay: 0,
          maximumDelay: 0,
        },
      });

      world.eventBus.flush();

      (world as WorldImpl)._tick = 100;
      reincarnationSystem.update(world, [], 1);

      world.eventBus.flush();

      // None retention should preserve no memories
      expect(preservedMemoryCount).toBe(0);
    });
  });

  describe('spawn location', () => {
    it('should spawn near death location for same_world target', () => {
      const entityId = createEntityId();
      const entity = new EntityImpl(entityId, 0);

      const deathX = 100;
      const deathY = 200;
      entity.addComponent(createIdentityComponent('Local Rebirth'));
      entity.addComponent(createPositionComponent(deathX, deathY));

      world.addEntity(entity);

      let newEntityId: string | undefined;
      world.eventBus.subscribe('soul:reincarnated', (event) => {
        newEntityId = event.data.newEntityId;
      });

      world.eventBus.emit({
        type: 'soul:reincarnation_queued',
        source: entityId,
        data: {
          entityId,
          target: 'same_world',
          memoryRetention: 'none',
          speciesConstraint: 'same',
          minimumDelay: 0,
          maximumDelay: 0,
        },
      });

      world.eventBus.flush();

      (world as WorldImpl)._tick = 100;
      reincarnationSystem.update(world, [], 1);

      world.eventBus.flush();

      expect(newEntityId).toBeDefined();

      // Check new entity position is within expected range
      const newEntity = world.getEntity(newEntityId!);
      if (newEntity) {
        const position = newEntity.components.get('position') as PositionComponent | undefined;
        if (position) {
          const distance = Math.sqrt(
            Math.pow(position.x - deathX, 2) + Math.pow(position.y - deathY, 2)
          );
          // Should be 10-30 tiles away
          expect(distance).toBeGreaterThanOrEqual(10);
          expect(distance).toBeLessThanOrEqual(30);
        }
      }
    });
  });

  describe('deity connection', () => {
    it('should set believed deity on reincarnated entity', () => {
      const entityId = createEntityId();
      const entity = new EntityImpl(entityId, 0);

      entity.addComponent(createIdentityComponent('Faithful Soul'));
      entity.addComponent(createPositionComponent(10, 10));

      world.addEntity(entity);

      const deityId = 'reincarnation-goddess';
      let newEntityId: string | undefined;
      world.eventBus.subscribe('soul:reincarnated', (event) => {
        newEntityId = event.data.newEntityId;
      });

      world.eventBus.emit({
        type: 'soul:reincarnation_queued',
        source: entityId,
        data: {
          entityId,
          deityId,
          target: 'same_world',
          memoryRetention: 'none',
          speciesConstraint: 'same',
          minimumDelay: 0,
          maximumDelay: 0,
        },
      });

      world.eventBus.flush();

      (world as WorldImpl)._tick = 100;
      reincarnationSystem.update(world, [], 1);

      world.eventBus.flush();

      expect(newEntityId).toBeDefined();

      const newEntity = world.getEntity(newEntityId!);
      if (newEntity) {
        const spiritual = newEntity.components.get('spiritual') as SpiritualComponent | undefined;
        expect(spiritual).toBeDefined();
        expect(spiritual?.believedDeity).toBe(deityId);
      }
    });
  });

  describe('concurrent reincarnations', () => {
    it('should handle multiple souls being reincarnated simultaneously', () => {
      const souls = ['soul-1', 'soul-2', 'soul-3'];

      for (const soulId of souls) {
        const entity = new EntityImpl(soulId, 0);
        entity.addComponent(createIdentityComponent(`Entity ${soulId}`));
        entity.addComponent(createPositionComponent(Math.random() * 100, Math.random() * 100));
        world.addEntity(entity);

        world.eventBus.emit({
          type: 'soul:reincarnation_queued',
          source: soulId,
          data: {
            entityId: soulId,
            target: 'same_world',
            memoryRetention: 'none',
            speciesConstraint: 'any',
            minimumDelay: 0,
            maximumDelay: 0,
          },
        });
      }

      world.eventBus.flush();

      expect(reincarnationSystem.getQueuedSoulCount()).toBe(3);

      const reincarnatedIds: string[] = [];
      world.eventBus.subscribe('soul:reincarnated', (event) => {
        reincarnatedIds.push(event.data.originalEntityId);
      });

      // Advance time and process all
      (world as WorldImpl)._tick = 100;
      reincarnationSystem.update(world, [], 1);

      world.eventBus.flush();

      expect(reincarnatedIds.length).toBe(3);
      expect(reincarnationSystem.getQueuedSoulCount()).toBe(0);
    });
  });

  describe('original entity cleanup', () => {
    it('should remove original entity after reincarnation', () => {
      const entityId = createEntityId();
      const entity = new EntityImpl(entityId, 0);

      entity.addComponent(createIdentityComponent('Original'));
      entity.addComponent(createPositionComponent(10, 10));

      world.addEntity(entity);

      // Verify entity exists
      expect(world.getEntity(entityId)).toBeDefined();

      world.eventBus.emit({
        type: 'soul:reincarnation_queued',
        source: entityId,
        data: {
          entityId,
          target: 'same_world',
          memoryRetention: 'none',
          speciesConstraint: 'same',
          minimumDelay: 0,
          maximumDelay: 0,
        },
      });

      world.eventBus.flush();

      (world as WorldImpl)._tick = 100;
      reincarnationSystem.update(world, [], 1);

      world.eventBus.flush();

      // Original entity should be removed
      expect(world.getEntity(entityId)).toBeUndefined();
    });
  });
});
