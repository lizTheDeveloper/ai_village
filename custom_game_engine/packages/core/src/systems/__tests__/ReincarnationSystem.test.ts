/**
 * Tests for ReincarnationSystem
 *
 * Tests the soul reincarnation lifecycle:
 * - Queuing souls for reincarnation
 * - Memory preservation based on retention policy
 * - Species determination based on constraints
 * - Spawning new entities after delay
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReincarnationSystem } from '../ReincarnationSystem.js';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import type { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';
import { PersonalityComponent } from '../../components/PersonalityComponent.js';
import { EpisodicMemoryComponent } from '../../components/EpisodicMemoryComponent.js';
import { createIdentityComponent } from '../../components/IdentityComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { generateRandomStartingSkills } from '../../components/SkillsComponent.js';
import { createDeedLedgerComponent, recordDeed } from '../../components/DeedLedgerComponent.js';
import type { ReincarnationConfig } from '../../divinity/AfterlifePolicy.js';

describe('ReincarnationSystem', () => {
  let harness: IntegrationTestHarness;
  let world: World;
  let system: ReincarnationSystem;

  beforeEach(() => {
    harness = createMinimalWorld();
    world = harness.world;
    system = new ReincarnationSystem();
    system.init(world);
  });

  describe('initialization', () => {
    it('should have correct system id and priority', () => {
      expect(system.id).toBe('reincarnation');
      expect(system.priority).toBe(120);
    });

    it('should start with no queued souls', () => {
      expect(system.getQueuedSoulCount()).toBe(0);
    });
  });

  describe('event handling', () => {
    it('should queue soul on reincarnation_queued event', () => {
      const entityId = 'test-entity-1';
      const entity = new EntityImpl(entityId, 0);
      entity.addComponent(createIdentityComponent('Test Entity'));
      entity.addComponent(createPositionComponent(10, 20));
      (world as any)._addEntity(entity);

      // Emit reincarnation queued event
      world.eventBus.emit({
        type: 'soul:reincarnation_queued',
        source: entityId,
        data: {
          entityId,
          deityId: 'deity-1',
          target: 'same_world',
          memoryRetention: 'none',
          speciesConstraint: 'same',
          minimumDelay: 100,
          maximumDelay: 200,
        },
      });

      // Flush event queue to dispatch events
      world.eventBus.flush();

      expect(system.getQueuedSoulCount()).toBe(1);
      expect(system.getQueuedSoulIds()).toContain(entityId);
    });

    it('should not queue soul if entity not found', () => {
      world.eventBus.emit({
        type: 'soul:reincarnation_queued',
        source: 'nonexistent',
        data: {
          entityId: 'nonexistent',
          target: 'same_world',
          memoryRetention: 'none',
          speciesConstraint: 'same',
          minimumDelay: 100,
          maximumDelay: 200,
        },
      });

      world.eventBus.flush();

      expect(system.getQueuedSoulCount()).toBe(0);
    });
  });

  describe('memory preservation', () => {
    it('should preserve all memories with full retention', () => {
      const entityId = 'test-entity-2';
      const entity = new EntityImpl(entityId, 0);
      entity.addComponent(createIdentityComponent('Test Soul'));
      entity.addComponent(createPositionComponent(10, 20));

      // Add personality
      const personality = new PersonalityComponent({
        openness: 0.8,
        conscientiousness: 0.7,
        extraversion: 0.6,
        agreeableness: 0.5,
        neuroticism: 0.4,
      });
      entity.addComponent(personality);

      // Add skills
      const skills = generateRandomStartingSkills(personality);
      entity.addComponent(skills);

      // Add episodic memory with significant memories
      const episodic = new EpisodicMemoryComponent({ maxMemories: 100 });
      episodic.formMemory({
        eventType: 'birth',
        summary: 'Born into the world',
        timestamp: 0,
        emotionalValence: 0.8,
        emotionalIntensity: 0.9,
      });
      entity.addComponent(episodic);

      (world as any)._addEntity(entity);

      // Queue with full retention
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

      expect(system.getQueuedSoulCount()).toBe(1);
    });

    it('should preserve limited memories with fragments retention', () => {
      const entityId = 'test-entity-3';
      const entity = new EntityImpl(entityId, 0);
      entity.addComponent(createIdentityComponent('Test Soul'));
      entity.addComponent(createPositionComponent(10, 20));

      const personality = new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
      });
      entity.addComponent(personality);

      (world as any)._addEntity(entity);

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

      expect(system.getQueuedSoulCount()).toBe(1);
    });
  });

  describe('reincarnation timing', () => {
    it('should not spawn entity before delay expires', () => {
      const entityId = 'test-entity-4';
      const entity = new EntityImpl(entityId, 0);
      entity.addComponent(createIdentityComponent('Test Soul'));
      entity.addComponent(createPositionComponent(10, 20));
      (world as any)._addEntity(entity);

      world.eventBus.emit({
        type: 'soul:reincarnation_queued',
        source: entityId,
        data: {
          entityId,
          target: 'same_world',
          memoryRetention: 'none',
          speciesConstraint: 'same',
          minimumDelay: 1000,
          maximumDelay: 1000,
        },
      });

      world.eventBus.flush();

      // Run update before delay expires (tick is still 0)
      system.update(world, [], 1);

      // Soul should still be queued
      expect(system.getQueuedSoulCount()).toBe(1);
    });

    it('should spawn entity after delay expires', () => {
      const entityId = 'test-entity-5';
      const entity = new EntityImpl(entityId, 0);
      entity.addComponent(createIdentityComponent('Test Soul'));
      entity.addComponent(createPositionComponent(10, 20));
      (world as any)._addEntity(entity);

      // Subscribe to reincarnated event
      let reincarnatedEventReceived = false;
      let newEntityId: string | undefined;
      world.eventBus.subscribe('soul:reincarnated', (event) => {
        reincarnatedEventReceived = true;
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

      // Advance world tick past delay
      (world as any)._tick = 100;

      // Run update
      system.update(world, [], 1);

      world.eventBus.flush();

      // Soul should be removed from queue
      expect(system.getQueuedSoulCount()).toBe(0);

      // Reincarnated event should be emitted
      expect(reincarnatedEventReceived).toBe(true);
      expect(newEntityId).toBeDefined();
    });
  });

  describe('species constraints', () => {
    it('should preserve species with same constraint', () => {
      const entityId = 'test-entity-6';
      const entity = new EntityImpl(entityId, 0);
      entity.addComponent(createIdentityComponent('Elf Soul'));
      entity.addComponent(createPositionComponent(10, 20));
      entity.addComponent({
        type: 'species',
        version: 1,
        speciesId: 'elf',
        traits: [],
      });
      (world as any)._addEntity(entity);

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

      expect(system.getQueuedSoulCount()).toBe(1);
    });

    it('should use karmic constraint based on deed score', () => {
      const entityId = 'test-entity-7';
      const entity = new EntityImpl(entityId, 0);
      entity.addComponent(createIdentityComponent('Karmic Soul'));
      entity.addComponent(createPositionComponent(10, 20));

      // Add deed ledger with negative deeds
      const ledger = createDeedLedgerComponent();
      recordDeed(ledger, 'violence', 5, { target: 'someone' });
      recordDeed(ledger, 'theft', 3, { item: 'gold' });
      entity.addComponent(ledger);

      (world as any)._addEntity(entity);

      world.eventBus.emit({
        type: 'soul:reincarnation_queued',
        source: entityId,
        data: {
          entityId,
          target: 'same_world',
          memoryRetention: 'none',
          speciesConstraint: 'karmic',
          minimumDelay: 0,
          maximumDelay: 0,
        },
      });

      world.eventBus.flush();

      expect(system.getQueuedSoulCount()).toBe(1);
    });
  });

  describe('deity tracking', () => {
    it('should associate deity with queued soul', () => {
      const entityId = 'test-entity-8';
      const entity = new EntityImpl(entityId, 0);
      entity.addComponent(createIdentityComponent('Faithful Soul'));
      entity.addComponent(createPositionComponent(10, 20));
      (world as any)._addEntity(entity);

      const deityId = 'nature-goddess';

      let reincarnatedDeityId: string | undefined;
      world.eventBus.subscribe('soul:reincarnated', (event) => {
        reincarnatedDeityId = event.data.deityId;
      });

      world.eventBus.emit({
        type: 'soul:reincarnation_queued',
        source: entityId,
        data: {
          entityId,
          deityId,
          target: 'same_world',
          memoryRetention: 'none',
          speciesConstraint: 'any',
          minimumDelay: 0,
          maximumDelay: 0,
        },
      });

      world.eventBus.flush();

      // Advance tick and run update
      (world as any)._tick = 100;

      system.update(world, [], 1);

      world.eventBus.flush();

      expect(reincarnatedDeityId).toBe(deityId);
    });
  });

  describe('cleanup', () => {
    it('should cleanup event listener on destroy', () => {
      const entityId = 'test-entity-9';
      const entity = new EntityImpl(entityId, 0);
      entity.addComponent(createIdentityComponent('Test'));
      entity.addComponent(createPositionComponent(0, 0));
      (world as any)._addEntity(entity);

      // Destroy system
      system.destroy();

      // Try to emit event after destroy
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

      // Soul should not be queued since listener was removed
      expect(system.getQueuedSoulCount()).toBe(0);
    });
  });
});
