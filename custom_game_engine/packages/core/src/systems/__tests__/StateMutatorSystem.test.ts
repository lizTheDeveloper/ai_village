import { describe, it, expect, beforeEach } from 'vitest';
import { StateMutatorSystem } from '../StateMutatorSystem.js';
import { World } from '../../World.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import { setMutationRate, clearMutationRate, createMutationVectorComponent } from '../../components/MutationVectorComponent.js';

describe('StateMutatorSystem', () => {
  let world: World;
  let system: StateMutatorSystem;

  beforeEach(() => {
    world = new World();
    system = new StateMutatorSystem();
    // Initialize events (BaseSystem requires this for SystemContext)
    system['events'] = { cleanup: () => {}, emit: () => {} } as any;
  });

  describe('Basic Mutation Application', () => {
    it('should apply positive mutation rate correctly', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Needs,
        hunger: 0.5,
        thirst: 0.5,
        energy: 0.5,
        health: 0.5,
        maxMana: 100,
        mana: 50,
      } as NeedsComponent);

      // Set healing mutation (rate is per second)
      setMutationRate(entity, 'needs.health', 0.2, {
        max: 1.0,
        source: 'test_heal',
      });

      // Update system (1 second elapsed)
      system.update(world, [entity], 1.0);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBeCloseTo(0.7, 2);
    });

    it('should apply negative mutation rate correctly', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Needs,
        hunger: 0.5,
        thirst: 0.5,
        energy: 0.5,
        health: 0.5,
        maxMana: 100,
        mana: 50,
      } as NeedsComponent);

      // Set damage mutation
      setMutationRate(entity, 'needs.health', -0.2, {
        min: 0,
        source: 'test_damage',
      });

      // Update system (1 second elapsed)
      system.update(world, [entity], 1.0);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBeCloseTo(0.3, 2);
    });

    it('should respect min bounds', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Needs,
        hunger: 0.5,
        thirst: 0.5,
        energy: 0.5,
        health: 0.1,
        maxMana: 100,
        mana: 50,
      } as NeedsComponent);

      setMutationRate(entity, 'needs.health', -0.5, {
        min: 0,
        source: 'massive_damage',
      });

      system.update(world, [entity], 1.0);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBe(0); // Clamped to min
    });

    it('should respect max bounds', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Needs,
        hunger: 0.5,
        thirst: 0.5,
        energy: 0.5,
        health: 0.9,
        maxMana: 100,
        mana: 50,
      } as NeedsComponent);

      setMutationRate(entity, 'needs.health', 0.5, {
        max: 1.0,
        source: 'overheal',
      });

      system.update(world, [entity], 1.0);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBe(1.0); // Clamped to max
    });
  });

  describe('Derivative (Rate Decay)', () => {
    it('should apply derivative to slow down healing over time', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Needs,
        hunger: 0.5,
        thirst: 0.5,
        energy: 0.5,
        health: 0.5,
        maxMana: 100,
        mana: 50,
      } as NeedsComponent);

      // Healing that decays over time
      setMutationRate(entity, 'needs.health', 0.2, {
        derivative: -0.1, // Rate decreases by 0.1 per second
        max: 1.0,
        source: 'decaying_heal',
      });

      // First second: rate is 0.2
      system.update(world, [entity], 1.0);
      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBeCloseTo(0.7, 2);

      // Second second: rate is now 0.1 (0.2 - 0.1)
      system.update(world, [entity], 1.0);
      expect(needs.health).toBeCloseTo(0.8, 2);

      // Third second: rate is now 0.0 (0.1 - 0.1)
      system.update(world, [entity], 1.0);
      expect(needs.health).toBeCloseTo(0.8, 2); // No change, rate decayed to 0
    });
  });

  describe('Total Amount Expiration', () => {
    it('should auto-expire mutation after totalAmount is reached', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Needs,
        hunger: 0.5,
        thirst: 0.5,
        energy: 0.5,
        health: 0.5,
        maxMana: 100,
        mana: 50,
      } as NeedsComponent);

      // Bandage that heals 0.1 total
      setMutationRate(entity, 'needs.health', 0.1, {
        totalAmount: 0.1,
        max: 1.0,
        source: 'bandage',
      });

      // First update: applies 0.1
      system.update(world, [entity], 1.0);
      let needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBeCloseTo(0.6, 2);

      // Second update: mutation should be expired, no change
      system.update(world, [entity], 1.0);
      needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBeCloseTo(0.6, 2); // No additional healing
    });
  });

  describe('Tick Expiration', () => {
    it('should auto-expire mutation at specified tick', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Needs,
        hunger: 0.5,
        thirst: 0.5,
        energy: 0.5,
        health: 0.5,
        maxMana: 100,
        mana: 50,
      } as NeedsComponent);

      // Mutation that expires at tick 100
      setMutationRate(entity, 'needs.health', 0.1, {
        expiresAt: 100,
        max: 1.0,
        source: 'timed_buff',
      });

      // Before expiration (tick 50)
      world.setTick(50);
      system.update(world, [entity], 1.0);
      let needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBeCloseTo(0.6, 2);

      // After expiration (tick 100)
      world.setTick(100);
      system.update(world, [entity], 1.0);
      needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBeCloseTo(0.6, 2); // Mutation expired, no more healing
    });
  });

  describe('Clearing Mutations', () => {
    it('should remove mutation when clearMutationRate is called', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Needs,
        hunger: 0.5,
        thirst: 0.5,
        energy: 0.5,
        health: 0.5,
        maxMana: 100,
        mana: 50,
      } as NeedsComponent);

      setMutationRate(entity, 'needs.health', -0.1, {
        min: 0,
        source: 'dispellable_damage',
      });

      // Clear the mutation (simulating dispel)
      clearMutationRate(entity, 'needs.health');

      // Update should not apply the mutation
      system.update(world, [entity], 1.0);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBe(0.5); // Unchanged
    });
  });

  describe('Multiple Mutations Same Field', () => {
    it('should override previous mutation on same field', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Needs,
        hunger: 0.5,
        thirst: 0.5,
        energy: 0.5,
        health: 0.5,
        maxMana: 100,
        mana: 50,
      } as NeedsComponent);

      // First mutation
      setMutationRate(entity, 'needs.health', 0.1, {
        max: 1.0,
        source: 'heal_1',
      });

      // Second mutation overrides first
      setMutationRate(entity, 'needs.health', -0.2, {
        min: 0,
        source: 'damage',
      });

      system.update(world, [entity], 1.0);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      // Only damage applies (0.5 - 0.2 = 0.3), healing was overwritten
      expect(needs.health).toBeCloseTo(0.3, 2);
    });
  });

  describe('Negligible Rate Cleanup', () => {
    it('should auto-remove mutations with negligible rates', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Needs,
        hunger: 0.5,
        thirst: 0.5,
        energy: 0.5,
        health: 0.5,
        maxMana: 100,
        mana: 50,
      } as NeedsComponent);
      entity.addComponent(createMutationVectorComponent());

      // Set a very small rate (below threshold)
      setMutationRate(entity, 'needs.health', 0.00001, {
        max: 1.0,
        source: 'tiny_heal',
      });

      // Update - mutation should be auto-removed due to negligible rate
      system.update(world, [entity], 1.0);

      // Second update - should not crash, mutation is gone
      system.update(world, [entity], 1.0);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      // Health barely changed
      expect(needs.health).toBeCloseTo(0.5, 2);
    });
  });
});
