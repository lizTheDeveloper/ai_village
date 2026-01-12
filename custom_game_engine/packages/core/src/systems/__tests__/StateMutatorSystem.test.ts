import { describe, it, expect, beforeEach } from 'vitest';
import { StateMutatorSystem } from '../StateMutatorSystem.js';
import { World } from '../../World.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';

describe('StateMutatorSystem', () => {
  let world: World;
  let system: StateMutatorSystem;

  beforeEach(() => {
    world = new World();
    system = new StateMutatorSystem();
  });

  describe('Delta Application Ordering', () => {
    it('should apply healing (positive deltas) before damage (negative deltas)', () => {
      // Create entity with 0.1 health (near death)
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Needs,
        hunger: 0.5,
        thirst: 0.5,
        energy: 0.5,
        health: 0.1, // Near death
        maxMana: 100,
        mana: 50,
      } as NeedsComponent);

      // Register damage that would kill if applied first
      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: -0.15, // Would bring health to -0.05 (dead)
        min: 0,
        source: 'poison_damage',
      });

      // Register healing that saves the entity
      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: +0.2, // Heals +0.2
        max: 1.0,
        source: 'healing_spell',
      });

      // Force update by advancing ticks
      world.setTick(1200); // 1 game minute
      system.update(world, [], 60); // 60 seconds elapsed

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;

      // Expected result if healing applied first:
      // 0.1 + 0.2 = 0.3 (healing)
      // 0.3 - 0.15 = 0.15 (then damage)
      // Entity survives with 0.15 health

      // If damage applied first:
      // 0.1 - 0.15 = -0.05 → clamped to 0 (dead)
      // 0 + 0.2 = 0.2 (healing can't bring back from death)

      // Verify entity survived because healing was applied first
      expect(needs.health).toBeGreaterThan(0);
      expect(needs.health).toBeCloseTo(0.15, 2);
    });

    it('should apply multiple healing deltas before damage deltas', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: CT.Needs,
        hunger: 0.5,
        thirst: 0.5,
        energy: 0.5,
        health: 0.05, // Very low health
        maxMana: 100,
        mana: 50,
      } as NeedsComponent);

      // Register multiple healing sources
      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: +0.1, // First heal
        max: 1.0,
        source: 'bandage',
      });

      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: +0.15, // Second heal
        max: 1.0,
        source: 'potion',
      });

      // Register damage
      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: -0.2, // Damage
        min: 0,
        source: 'bleed',
      });

      // Force update
      world.setTick(1200);
      system.update(world, [], 60);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;

      // Expected: 0.05 + 0.1 + 0.15 - 0.2 = 0.1
      expect(needs.health).toBeGreaterThan(0);
      expect(needs.health).toBeCloseTo(0.1, 2);
    });

    it('should handle zero deltas (buffs) separately from healing/damage', () => {
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

      // Register zero delta (buff marker)
      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'energy',
        deltaPerMinute: 0, // Buff marker
        source: 'buff_marker',
      });

      // Register healing
      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: +0.1,
        max: 1.0,
        source: 'regen',
      });

      // Register damage
      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: -0.05,
        min: 0,
        source: 'poison',
      });

      world.setTick(1200);
      system.update(world, [], 60);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;

      // Healing applied before damage: 0.5 + 0.1 - 0.05 = 0.55
      expect(needs.health).toBeCloseTo(0.55, 2);
      // Energy unchanged by zero delta
      expect(needs.energy).toBe(0.5);
    });
  });

  describe('Basic Delta Application', () => {
    it('should apply positive delta correctly', () => {
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

      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: +0.2,
        max: 1.0,
        source: 'test_heal',
      });

      world.setTick(1200);
      system.update(world, [], 60);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBeCloseTo(0.7, 2);
    });

    it('should apply negative delta correctly', () => {
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

      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: -0.2,
        min: 0,
        source: 'test_damage',
      });

      world.setTick(1200);
      system.update(world, [], 60);

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

      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: -0.5,
        min: 0,
        source: 'massive_damage',
      });

      world.setTick(1200);
      system.update(world, [], 60);

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

      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: +0.5,
        max: 1.0,
        source: 'overheal',
      });

      world.setTick(1200);
      system.update(world, [], 60);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBe(1.0); // Clamped to max
    });
  });

  describe('Delta Cleanup', () => {
    it('should remove delta when cleanup function is called', () => {
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

      const cleanup = system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: -0.1,
        min: 0,
        source: 'dispellable_damage',
      });

      // Call cleanup (simulating dispel)
      cleanup();

      // Update should not apply the delta
      world.setTick(1200);
      system.update(world, [], 60);

      const needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBe(0.5); // Unchanged
    });

    it('should auto-expire delta based on totalAmount', () => {
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

      // Register delta with total amount limit
      system.registerDelta({
        entityId: entity.id,
        componentType: CT.Needs,
        field: 'health',
        deltaPerMinute: +0.1,
        totalAmount: 0.1, // Only heal 0.1 total
        max: 1.0,
        source: 'bandage',
      });

      // First update: applies 0.1
      world.setTick(1200);
      system.update(world, [], 60);

      let needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBeCloseTo(0.6, 2);

      // Second update: delta should be expired, no change
      world.setTick(2400);
      system.update(world, [], 60);

      needs = entity.getComponent(CT.Needs) as NeedsComponent;
      expect(needs.health).toBeCloseTo(0.6, 2); // No additional healing
    });
  });
});
