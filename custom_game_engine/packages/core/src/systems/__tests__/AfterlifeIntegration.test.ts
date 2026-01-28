/**
 * Integration tests for AfterlifeNeedsSystem with AfterlifeComponent
 *
 * Tests the complete spiritual needs lifecycle in the underworld:
 * 1. AfterlifeComponent → Soul enters underworld with initial state
 * 2. AfterlifeNeedsSystem → Processes spiritual needs decay/recovery
 * 3. Outcomes → Shade, Passed On, Restless based on need states
 * 4. Remembrance → Prayers/offerings affect soul state
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMinimalWorld } from '../../__tests__/fixtures/worldFixtures.js';
import type { World } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { AfterlifeNeedsSystem } from '../AfterlifeNeedsSystem.js';
import { StateMutatorSystem } from '../StateMutatorSystem.js';
import { createIdentityComponent } from '../../components/IdentityComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import { createRealmLocationComponent } from '../../components/RealmLocationComponent.js';
import { createAfterlifeComponent, recordRemembrance, recordVisit, resolveGoal } from '../../components/AfterlifeComponent.js';
import type { AfterlifeComponent } from '../../components/AfterlifeComponent.js';

describe('Afterlife System Integration', () => {
  let world: World;
  let afterlifeSystem: AfterlifeNeedsSystem;
  let stateMutator: StateMutatorSystem;

  beforeEach(() => {
    const harness = createMinimalWorld();
    world = harness.world;

    // Create and register StateMutatorSystem
    stateMutator = new StateMutatorSystem();
    harness.registerSystem('StateMutatorSystem', stateMutator);

    // Create and register AfterlifeNeedsSystem
    afterlifeSystem = new AfterlifeNeedsSystem();
    harness.registerSystem('AfterlifeNeedsSystem', afterlifeSystem);
  });

  describe('soul enters underworld', () => {
    it('should start with full coherence and calculated tether/peace', () => {
      const entityId = createEntityId();
      const entity = new EntityImpl(entityId, 0);

      const currentTick = 1000;
      world.setTick(currentTick);

      // Create soul in underworld
      entity.addComponent(createIdentityComponent('Newly Dead Soul'));
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createRealmLocationComponent('underworld'));
      entity.addComponent(createAgentComponent('idle', 20, true, 0));

      const afterlife = createAfterlifeComponent({
        causeOfDeath: 'old_age',
        deathTick: currentTick,
        deathLocation: { x: 100, y: 100 },
        unresolvedRelationships: ['agent1', 'agent2'],
        descendants: ['child1'],
      });

      entity.addComponent(afterlife);
      world.addEntity(entity);

      // Verify initial state
      expect(afterlife.coherence).toBe(1.0); // Full identity
      expect(afterlife.tether).toBeGreaterThan(0.3); // Has relationships
      expect(afterlife.peace).toBeGreaterThan(0.5); // Old age = peaceful
      expect(afterlife.solitude).toBe(0); // Not lonely yet
      expect(afterlife.isShade).toBe(false);
      expect(afterlife.hasPassedOn).toBe(false);
    });

    it('should set lower peace for violent deaths', () => {
      const murderSoul = createAfterlifeComponent({
        causeOfDeath: 'murder',
        deathTick: 0,
        deathLocation: { x: 0, y: 0 },
      });

      const oldAgeSoul = createAfterlifeComponent({
        causeOfDeath: 'old_age',
        deathTick: 0,
        deathLocation: { x: 0, y: 0 },
      });

      // Murder death should have lower peace than old age
      expect(murderSoul.peace).toBeLessThan(oldAgeSoul.peace);
      expect(murderSoul.isRestless).toBe(true); // Murder = very low peace (< 0.2)
      expect(oldAgeSoul.isRestless).toBe(false); // Old age = peaceful
    });

    it('should reduce peace for unfinished goals', () => {
      const soulWithGoals = createAfterlifeComponent({
        causeOfDeath: 'old_age',
        deathTick: 0,
        deathLocation: { x: 0, y: 0 },
        unfinishedGoals: ['goal1', 'goal2', 'goal3'],
      });

      const soulWithoutGoals = createAfterlifeComponent({
        causeOfDeath: 'old_age',
        deathTick: 0,
        deathLocation: { x: 0, y: 0 },
        unfinishedGoals: [],
      });

      // Unfinished goals reduce peace
      expect(soulWithGoals.peace).toBeLessThan(soulWithoutGoals.peace);
      expect(soulWithGoals.unfinishedGoals.length).toBe(3);
    });
  });

  describe('spiritual needs decay', () => {
    it('should process coherence decay in underworld', () => {
      const entityId = createEntityId();
      const entity = new EntityImpl(entityId, 0);

      entity.addComponent(createIdentityComponent('Fading Soul'));
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createRealmLocationComponent('underworld'));
      entity.addComponent(createAgentComponent('idle', 20, true, 0));

      const afterlife = createAfterlifeComponent({
        causeOfDeath: 'old_age',
        deathTick: 0,
        deathLocation: { x: 0, y: 0 },
      });

      entity.addComponent(afterlife);
      world.addEntity(entity);

      const initialCoherence = afterlife.coherence;

      // Advance time in underworld - need to run multiple updates
      // First update: registers deltas
      // Second update: applies deltas
      const oneGameMinute = 60;
      const ticksPerMinute = 1200; // 20 TPS * 60 seconds

      // First cycle: register deltas
      world.setTick(world.tick + ticksPerMinute);
      afterlifeSystem.update(world, [entity], oneGameMinute);
      stateMutator.update(world, [entity], oneGameMinute);

      // Second cycle: apply deltas
      world.setTick(world.tick + ticksPerMinute);
      afterlifeSystem.update(world, [entity], oneGameMinute);
      stateMutator.update(world, [entity], oneGameMinute);

      // Note: StateMutatorSystem creates a new component object via updateComponent,
      // so we must re-fetch to see updated values
      const updated = entity.getComponent('afterlife');
      expect(updated).toBeDefined();
      expect(updated!.coherence).toBeLessThan(initialCoherence);
    });

    it('should eventually become shade with no interaction', () => {
      const entityId = createEntityId();
      const entity = new EntityImpl(entityId, 0);

      entity.addComponent(createIdentityComponent('Lonely Soul'));
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createRealmLocationComponent('underworld'));
      entity.addComponent(createAgentComponent('idle', 20, true, 0));

      const afterlife = createAfterlifeComponent({
        causeOfDeath: 'combat',
        deathTick: 0,
        deathLocation: { x: 0, y: 0 },
      });

      // Start near shade threshold
      afterlife.coherence = 0.15;
      afterlife.solitude = 0.9;

      entity.addComponent(afterlife);
      world.addEntity(entity);

      expect(afterlife.isShade).toBe(false);

      // Long time passes - simulate many game minutes
      // BASE_COHERENCE_DECAY = 0.0001 per minute
      // Starting coherence = 0.15
      // Need to decay by 0.05 to reach 0.1
      // 0.05 / 0.0001 = 500 minutes needed
      const chunkSize = 60; // 1 game minute
      const numChunks = 600; // 600 game minutes

      for (let i = 0; i < numChunks; i++) {
        world.setTick(world.tick + 1200); // 1 game minute in ticks
        afterlifeSystem.update(world, [entity], chunkSize);
        stateMutator.update(world, [entity], chunkSize);
      }

      // Note: StateMutatorSystem creates a new component object via updateComponent,
      // so we must re-fetch to see updated values
      const updated = entity.getComponent('afterlife');
      expect(updated).toBeDefined();
      expect(updated!.coherence).toBeLessThan(0.1);
      expect(updated!.isShade).toBe(true);
    });

    it('should pass on when tether low and peace high', () => {
      const entityId = createEntityId();
      const entity = new EntityImpl(entityId, 0);

      entity.addComponent(createIdentityComponent('Peaceful Soul'));
      entity.addComponent(createPositionComponent(0, 0));
      entity.addComponent(createRealmLocationComponent('underworld'));
      entity.addComponent(createAgentComponent('idle', 20, true, 0));

      const afterlife = createAfterlifeComponent({
        causeOfDeath: 'old_age',
        deathTick: 0,
        deathLocation: { x: 0, y: 0 },
        unfinishedGoals: [], // No unfinished business
      });

      // Set conditions for passing on
      afterlife.tether = 0.05; // Almost no connection
      afterlife.peace = 0.9;   // Very peaceful

      entity.addComponent(afterlife);
      world.addEntity(entity);

      expect(afterlife.hasPassedOn).toBe(false);

      // Advance tick and update systems
      world.setTick(world.tick + 1200); // 1 game minute
      afterlifeSystem.update(world, [entity], 60);
      stateMutator.update(world, [entity], 60);

      expect(afterlife.hasPassedOn).toBe(true);
    });
  });

  describe('remembrance mechanics', () => {
    it('should restore tether and reduce solitude on remembrance', () => {
      const currentTick = 5000;
      world.setTick(currentTick);

      const afterlife = createAfterlifeComponent({
        causeOfDeath: 'old_age',
        deathTick: currentTick - 1000,
        deathLocation: { x: 0, y: 0 },
      });

      // Build up solitude and decay tether
      afterlife.solitude = 0.8;
      afterlife.tether = 0.4;

      const initialSolitude = afterlife.solitude;
      const initialTether = afterlife.tether;

      // Simulate prayer/offering
      recordRemembrance(afterlife, currentTick, 'incense');

      expect(afterlife.solitude).toBeLessThan(initialSolitude);
      expect(afterlife.tether).toBeGreaterThan(initialTether);
      expect(afterlife.timesRemembered).toBe(1);
      expect(afterlife.offeringsReceived['incense']).toBe(1);
    });

    it('should grant extra peace for preferred offerings', () => {
      const currentTick = 5000;

      const afterlife = createAfterlifeComponent({
        causeOfDeath: 'old_age',
        deathTick: currentTick - 1000,
        deathLocation: { x: 0, y: 0 },
      });

      // Set preferred offerings
      afterlife.preferredOfferings = ['rice', 'sake'];
      afterlife.peace = 0.5;

      const initialPeace = afterlife.peace;

      // Offer non-preferred item
      recordRemembrance(afterlife, currentTick, 'incense');
      const peaceAfterIncense = afterlife.peace;

      // Offer preferred item
      recordRemembrance(afterlife, currentTick, 'sake');
      const peaceAfterSake = afterlife.peace;

      // Preferred offering should grant more peace
      expect(peaceAfterSake).toBeGreaterThan(peaceAfterIncense);
    });

    it('should have major impact from living visits', () => {
      const currentTick = 5000;

      const afterlife = createAfterlifeComponent({
        causeOfDeath: 'old_age',
        deathTick: currentTick - 1000,
        deathLocation: { x: 0, y: 0 },
      });

      afterlife.solitude = 0.9;
      afterlife.tether = 0.3;
      afterlife.peace = 0.4;

      const initialSolitude = afterlife.solitude;
      const initialTether = afterlife.tether;
      const initialPeace = afterlife.peace;

      // Necromancer visits the soul
      recordVisit(afterlife, currentTick);

      // Visit should have major impact
      expect(afterlife.solitude).toBeLessThan(initialSolitude - 0.2); // Major reduction
      expect(afterlife.tether).toBeGreaterThan(initialTether + 0.1); // Major boost
      expect(afterlife.peace).toBeGreaterThan(initialPeace);
      expect(afterlife.visitsFromLiving).toBe(1);
    });

    it('should resolve goals and increase peace', () => {
      const afterlife = createAfterlifeComponent({
        causeOfDeath: 'combat',
        deathTick: 0,
        deathLocation: { x: 0, y: 0 },
        unfinishedGoals: ['goal1', 'goal2', 'goal3'],
      });

      const initialPeace = afterlife.peace;
      expect(afterlife.unfinishedGoals.length).toBe(3);

      // Goal completed by successor
      resolveGoal(afterlife, 'goal1');

      expect(afterlife.unfinishedGoals.length).toBe(2);
      expect(afterlife.peace).toBeGreaterThan(initialPeace);
      expect(afterlife.unfinishedGoals).not.toContain('goal1');
    });
  });

  describe('concurrent souls', () => {
    it('should process multiple souls independently', () => {
      const souls: EntityImpl[] = [];

      for (let i = 0; i < 5; i++) {
        const entityId = createEntityId();
        const entity = new EntityImpl(entityId, 0);

        entity.addComponent(createIdentityComponent(`Soul ${i}`));
        entity.addComponent(createPositionComponent(i * 10, i * 10));
        entity.addComponent(createRealmLocationComponent('underworld'));
        entity.addComponent(createAgentComponent('idle', 20, true, 0));

        const afterlife = createAfterlifeComponent({
          causeOfDeath: 'old_age',
          deathTick: 0,
          deathLocation: { x: i * 10, y: i * 10 },
        });

        entity.addComponent(afterlife);
        world.addEntity(entity);
        souls.push(entity);
      }

      // Verify all have afterlife
      for (const soul of souls) {
        expect(soul.components.has('afterlife')).toBe(true);
      }

      // Process afterlife needs
      const oneMinute = 60;
      world.setTick(world.tick + 1200); // 1 game minute in ticks
      afterlifeSystem.update(world, souls, oneMinute);
      stateMutator.update(world, souls, oneMinute);

      // Each should decay independently
      for (const soul of souls) {
        const afterlife = soul.components.get('afterlife') as AfterlifeComponent;
        expect(afterlife.coherence).toBeLessThan(1.0);
      }
    });
  });
});
