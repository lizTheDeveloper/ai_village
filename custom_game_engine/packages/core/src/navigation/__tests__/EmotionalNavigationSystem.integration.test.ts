/**
 * Integration tests for EmotionalNavigationSystem
 *
 * Tests the emotional navigation system with full ECS context.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { EmotionalNavigationSystem } from '../EmotionalNavigationSystem.js';
import { createSpaceshipComponent } from '../SpaceshipComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('EmotionalNavigationSystem Integration Tests', () => {
  let harness: IntegrationTestHarness;
  let system: EmotionalNavigationSystem;

  beforeEach(() => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: true });
    system = new EmotionalNavigationSystem();
    system.initialize(harness.world, harness.eventBus);
  });

  describe('System Basics', () => {
    it('has correct system properties', () => {
      expect(system.id).toBe('emotional_navigation');
      expect(system.priority).toBe(150);
      expect(system.requiredComponents).toContain(CT.Spaceship);
      expect(system.requiredComponents).toContain(CT.Position);
    });

    it('updates without errors when no ships exist', () => {
      expect(() => {
        system.update(harness.world, [], 0.05);
      }).not.toThrow();
    });
  });

  describe('Ship Processing', () => {
    it('processes ships that can navigate beta-space', () => {
      // Create a threshold ship (can navigate beta-space)
      const ship = new EntityImpl(createEntityId(), 0);
      ship.addComponent(createPositionComponent(100, 100));
      ship.addComponent(createSpaceshipComponent('threshold_ship', 'Explorer'));
      (harness.world as any)._addEntity(ship);

      // Update system
      system.update(harness.world, [ship], 0.05);

      // Ship should be processed without errors
      const shipComp = ship.getComponent(CT.Spaceship);
      expect(shipComp).toBeDefined();
    });

    it('skips worldships that cannot navigate beta-space', () => {
      const worldship = new EntityImpl(createEntityId(), 0);
      worldship.addComponent(createPositionComponent(100, 100));
      worldship.addComponent(createSpaceshipComponent('worldship', 'Big Ship'));
      (harness.world as any)._addEntity(worldship);

      // Update system
      system.update(harness.world, [worldship], 0.05);

      // Worldship should not change (it can't navigate)
      const shipComp = worldship.getComponent(CT.Spaceship);
      expect(shipComp).toBeDefined();
      expect(shipComp?.navigation.can_navigate_beta_space).toBe(false);
    });

    it('processes multiple navigable ships', () => {
      const ship1 = new EntityImpl(createEntityId(), 0);
      ship1.addComponent(createPositionComponent(100, 100));
      ship1.addComponent(createSpaceshipComponent('threshold_ship', 'Ship 1'));

      const ship2 = new EntityImpl(createEntityId(), 0);
      ship2.addComponent(createPositionComponent(200, 200));
      ship2.addComponent(createSpaceshipComponent('story_ship', 'Ship 2'));

      (harness.world as any)._addEntity(ship1);
      (harness.world as any)._addEntity(ship2);

      // Update system
      system.update(harness.world, [ship1, ship2], 0.05);

      // Both ships should be processed
      expect(ship1.getComponent(CT.Spaceship)).toBeDefined();
      expect(ship2.getComponent(CT.Spaceship)).toBeDefined();
    });
  });

  describe('Crew Coherence', () => {
    it('calculates zero coherence for ships with no crew', () => {
      const ship = new EntityImpl(createEntityId(), 0);
      ship.addComponent(createPositionComponent(100, 100));
      const shipComp = createSpaceshipComponent('threshold_ship', 'Empty Ship');
      ship.addComponent(shipComp);
      (harness.world as any)._addEntity(ship);

      system.update(harness.world, [ship], 0.05);

      const updatedShip = ship.getComponent(CT.Spaceship);
      expect(updatedShip?.crew.member_ids).toHaveLength(0);
      expect(updatedShip?.crew.coherence).toBe(0);
    });

    it('maintains crew emotional state', () => {
      const ship = new EntityImpl(createEntityId(), 0);
      ship.addComponent(createPositionComponent(100, 100));
      const shipComp = createSpaceshipComponent('story_ship', 'Crewed Ship');
      ship.addComponent(shipComp);
      (harness.world as any)._addEntity(ship);

      system.update(harness.world, [ship], 0.05);

      const updatedShip = ship.getComponent(CT.Spaceship);
      expect(updatedShip?.crew.collective_emotional_state).toBeDefined();
      expect(updatedShip?.crew.collective_emotional_state.emotions).toBeDefined();
    });
  });

  describe('Narrative Weight', () => {
    it('accumulates narrative weight over time', () => {
      const ship = new EntityImpl(createEntityId(), 0);
      ship.addComponent(createPositionComponent(100, 100));
      const shipComp = createSpaceshipComponent('story_ship', 'Narrative Ship');
      ship.addComponent(shipComp);
      (harness.world as any)._addEntity(ship);

      const initialWeight = shipComp.narrative.accumulated_weight;

      // Update multiple times to accumulate weight
      for (let i = 0; i < 5; i++) {
        system.update(harness.world, [ship], 0.05);
      }

      const updatedShip = ship.getComponent(CT.Spaceship);
      expect(updatedShip?.narrative.accumulated_weight).toBeGreaterThanOrEqual(initialWeight);
    });
  });

  describe('Throttling', () => {
    it('throttles updates based on UPDATE_INTERVAL', () => {
      const ship = new EntityImpl(createEntityId(), 0);
      ship.addComponent(createPositionComponent(100, 100));
      const shipComp = createSpaceshipComponent('threshold_ship', 'Test Ship');
      ship.addComponent(shipComp);
      (harness.world as any)._addEntity(ship);

      const initialWeight = shipComp.narrative.accumulated_weight;

      // Call update immediately - should be throttled
      system.update(harness.world, [ship], 0.05);
      system.update(harness.world, [ship], 0.05);

      const updatedShip = ship.getComponent(CT.Spaceship);
      // Weight should only increase once due to throttling
      expect(updatedShip?.narrative.accumulated_weight).toBeLessThan(initialWeight + 1.0);
    });
  });
});
