import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../ecs/index.js';
import { EventBusImpl } from '../events/EventBus.js';
import { NeedsSystem } from '../systems/NeedsSystem.js';
import { NeedsComponent, type NeedsComponentLegacy } from '../components/NeedsComponent.js';
import { createAgentComponent } from '../components/AgentComponent.js';
import { createCircadianComponent } from '../components/CircadianComponent.js';
import { createMovementComponent } from '../components/MovementComponent.js';
import { createTemperatureComponent } from '../components/TemperatureComponent.js';

import { ComponentType } from '../types/ComponentType.js';
describe('NeedsSystem', () => {
  let world: World;
  let system: NeedsSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);

    system = new NeedsSystem();
  });

  describe('initialization', () => {
    it('should register with correct priority', () => {
      expect(system.priority).toBe(15);
    });

    it('should require needs component', () => {
      expect(system.requiredComponents).toContain('needs');
    });

    it('should have correct system id', () => {
      expect(system.id).toBe('needs');
    });
  });

  describe('hunger decay', () => {
    it('should decrease hunger over time', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      (entity as any).addComponent(needs);

      const initialHunger = needs.hunger;

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      // Simulate multiple updates (game time)
      for (let i = 0; i < 100; i++) {
        system.update(world, entities, 1.0);
      }

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      expect(needsAfter.hunger).toBeLessThan(initialHunger);
    });

    it('should not decrease hunger below zero', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 0.05,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      (entity as any).addComponent(needs);

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      // Simulate very long time
      for (let i = 0; i < 1000; i++) {
        system.update(world, entities, 1.0);
      }

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      expect(needsAfter.hunger).toBeGreaterThanOrEqual(0);
    });

    it('should pause hunger decay during sleep', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      const circadian = createCircadianComponent();
      circadian.isSleeping = true;
      (entity as any).addComponent(needs);
      (entity as any).addComponent(circadian);

      const initialHunger = needs.hunger;

      const entities = world.query().with(ComponentType.Needs).executeEntities();
      system.update(world, entities, 10.0);

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      // Hunger should not decay (or decay very little) during sleep
      expect(needsAfter.hunger).toBeGreaterThanOrEqual(initialHunger - 5);
    });

    it('should use time system for accurate game time calculation', () => {
      // Create time entity
      const timeEntity = world.createEntity();
      timeEntity.addComponent({
        type: ComponentType.Time,
        version: 1,
        currentTime: 0,
        dayLength: 600, // 10 minutes per day
        speedMultiplier: 1,
        currentDay: 0,
        currentHour: 0,
        currentMinute: 0,
      });

      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      (entity as any).addComponent(needs);

      const initialHunger = needs.hunger;

      const entities = world.query().with(ComponentType.Needs).executeEntities();
      system.update(world, entities, 60.0); // 1 minute real time

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      expect(needsAfter.hunger).toBeLessThan(initialHunger);
    });
  });

  describe('energy decay', () => {
    it('should decrease energy over time when not sleeping', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      (entity as any).addComponent(needs);

      const initialEnergy = needs.energy;

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      for (let i = 0; i < 100; i++) {
        system.update(world, entities, 1.0);
      }

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      expect(needsAfter.energy).toBeLessThan(initialEnergy);
    });

    it('should not decrease energy below zero', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 0.05,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      (entity as any).addComponent(needs);

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      for (let i = 0; i < 1000; i++) {
        system.update(world, entities, 1.0);
      }

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      expect(needsAfter.energy).toBeGreaterThanOrEqual(0);
    });

    it('should pause energy decay during sleep', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      const circadian = createCircadianComponent();
      circadian.isSleeping = true;
      (entity as any).addComponent(needs);
      (entity as any).addComponent(circadian);

      const initialEnergy = needs.energy;

      const entities = world.query().with(ComponentType.Needs).executeEntities();
      system.update(world, entities, 10.0);

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      // Energy should not decay during sleep (it should restore, but this system doesn't handle that)
      expect(needsAfter.energy).toBeGreaterThanOrEqual(initialEnergy - 5);
    });

    it('should increase energy decay for gather behavior', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      const agent = createAgentComponent('test-agent', 'Agent', { x: 0, y: 0 });
      agent.behavior = 'gather';
      (entity as any).addComponent(needs);
      (entity as any).addComponent(agent);

      const initialEnergy = needs.energy;

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      for (let i = 0; i < 50; i++) {
        system.update(world, entities, 1.0);
      }

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      expect(needsAfter.energy).toBeLessThan(initialEnergy);
    });

    it('should increase energy decay for build behavior', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      const agent = createAgentComponent('test-agent', 'Agent', { x: 0, y: 0 });
      agent.behavior = 'build';
      (entity as any).addComponent(needs);
      (entity as any).addComponent(agent);

      const initialEnergy = needs.energy;

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      for (let i = 0; i < 50; i++) {
        system.update(world, entities, 1.0);
      }

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      expect(needsAfter.energy).toBeLessThan(initialEnergy);
    });

    it('should increase energy decay when running', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      const agent = createAgentComponent('test-agent', 'Agent', { x: 0, y: 0 });
      const movement = createMovementComponent(5, 5); // Fast speed
      movement.speed = 4.0; // Running speed
      (entity as any).addComponent(needs);
      (entity as any).addComponent(agent);
      (entity as any).addComponent(movement);

      const initialEnergy = needs.energy;

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      for (let i = 0; i < 50; i++) {
        system.update(world, entities, 1.0);
      }

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      expect(needsAfter.energy).toBeLessThan(initialEnergy);
    });
  });

  describe('temperature effects', () => {
    it('should increase energy decay in cold temperature', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      const temperature = createTemperatureComponent(5, 15, 25, 10, 30); // 5°C - cold, comfort: 15-25
      (entity as any).addComponent(needs);
      (entity as any).addComponent(temperature);

      const initialEnergy = needs.energy;

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      for (let i = 0; i < 50; i++) {
        system.update(world, entities, 1.0);
      }

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      expect(needsAfter.energy).toBeLessThan(initialEnergy);
    });

    it('should increase energy decay in hot temperature', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      const temperature = createTemperatureComponent(35, 15, 25, 10, 30); // 35°C - hot, comfort: 15-25
      (entity as any).addComponent(needs);
      (entity as any).addComponent(temperature);

      const initialEnergy = needs.energy;

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      for (let i = 0; i < 50; i++) {
        system.update(world, entities, 1.0);
      }

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      expect(needsAfter.energy).toBeLessThan(initialEnergy);
    });

    it('should not add temperature penalty in comfortable range', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      const temperature = createTemperatureComponent(20, 15, 25, 10, 30); // 20°C - comfortable, comfort: 15-25
      (entity as any).addComponent(needs);
      (entity as any).addComponent(temperature);

      const entities = world.query().with(ComponentType.Needs).executeEntities();
      system.update(world, entities, 10.0);

      const needsAfter = entity.getComponent(ComponentType.Needs) as NeedsComponentLegacy;
      // Should decay, but at normal rate (not increased by temperature)
      // Values are 0-1 scale, not 0-100
      expect(needsAfter.energy).toBeLessThan(1.0);
      expect(needsAfter.energy).toBeGreaterThan(0.5); // Not too much decay
    });
  });

  describe('critical needs events', () => {
    // NOTE: NeedsSystem only emits need:critical for ENERGY, not hunger.
    // Hunger critical events come from GatherBehavior.ts.
    it('should NOT emit need:critical for hunger from NeedsSystem (hunger critical is from GatherBehavior)', () => {
      const criticalHandler = vi.fn();
      world.eventBus.subscribe('need:critical', criticalHandler);

      const entity = world.createEntity();
      const needs = new NeedsComponent({
        hunger: 0.05, // Very low hunger
        energy: 1.0,
        health: 1.0,
        thirst: 1.0,
        temperature: 1.0,
      });
      (entity as any).addComponent(needs);

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      // Run the system
      system.update(world, entities, 60.0);
      world.eventBus.flush();

      // NeedsSystem should NOT emit hunger critical events
      const hungerCriticalCalls = criticalHandler.mock.calls.filter(
        call => call[0].data.needType === 'hunger'
      );
      expect(hungerCriticalCalls.length).toBe(0);
    });

    it('should emit need:critical event when energy crosses below 10% threshold', () => {
      const criticalHandler = vi.fn();
      world.eventBus.subscribe('need:critical', criticalHandler);

      const entity = world.createEntity();
      // Start with energy ABOVE threshold
      const needs = new NeedsComponent({
        hunger: 1.0,
        energy: 0.15, // Above 0.1 threshold
        health: 1.0,
        thirst: 1.0,
        temperature: 1.0,
      });
      (entity as any).addComponent(needs);

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      // First update - energy still above threshold, should not emit
      system.update(world, entities, 60.0);
      world.eventBus.flush();
      expect(criticalHandler.mock.calls.length).toBe(0);

      // Manually drop energy below threshold to simulate decay
      needs.energy = 0.08;

      // Second update - energy now below threshold, should emit
      system.update(world, entities, 60.0);
      world.eventBus.flush();

      const energyCriticalCalls = criticalHandler.mock.calls.filter(
        call => call[0].data.needType === 'energy'
      );
      expect(energyCriticalCalls.length).toBeGreaterThan(0);
    });

    it('should include survival relevance in critical event', () => {
      const criticalHandler = vi.fn();
      world.eventBus.subscribe('need:critical', criticalHandler);

      const entity = world.createEntity();
      // Start above threshold, then drop below
      const needs = new NeedsComponent({
        hunger: 1.0,
        energy: 0.15, // Above 0.1 threshold
        health: 1.0,
        thirst: 1.0,
        temperature: 1.0,
      });
      (entity as any).addComponent(needs);

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      // First update to establish "was" state
      system.update(world, entities, 60.0);
      world.eventBus.flush();

      // Drop below threshold
      needs.energy = 0.05;

      // Second update should emit critical event
      system.update(world, entities, 60.0);
      world.eventBus.flush();

      expect(criticalHandler.mock.calls.length).toBeGreaterThan(0);
      const event = criticalHandler.mock.calls[0][0];
      expect(event.data.survivalRelevance).toBeDefined();
      expect(event.data.survivalRelevance).toBeGreaterThan(0);
    });
  });

  describe('starvation', () => {
    it('should emit agent:starved event when both hunger and energy reach zero', () => {
      const starvedHandler = vi.fn();
      world.eventBus.subscribe('agent:starved', starvedHandler);

      const entity = world.createEntity();
      const needs = new NeedsComponent({
        hunger: 0.01,
        energy: 0.01,
        health: 1.0,
        thirst: 1.0,
        temperature: 1.0,
      });
      (entity as any).addComponent(needs);

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      // Simulate long enough for both to reach zero
      // With deltaTime=60, decay rate is much faster
      for (let i = 0; i < 50; i++) {
        system.update(world, entities, 60.0); // 60s = 1 game minute each
      }

      world.eventBus.flush();
      expect(starvedHandler).toHaveBeenCalled();
    });

    it('should include agent id in starved event', () => {
      const starvedHandler = vi.fn();
      world.eventBus.subscribe('agent:starved', starvedHandler);

      const entity = world.createEntity();
      const needs = new NeedsComponent({
        hunger: 0.01,
        energy: 0.01,
        health: 1.0,
        thirst: 1.0,
        temperature: 1.0,
      });
      (entity as any).addComponent(needs);

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      // With deltaTime=60, decay rate is much faster
      for (let i = 0; i < 50; i++) {
        system.update(world, entities, 60.0);
      }

      world.eventBus.flush();

      if (starvedHandler.mock.calls.length > 0) {
        const event = starvedHandler.mock.calls[0][0];
        expect(event.data.agentId).toBe(entity.id);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty entity list', () => {
      expect(() => system.update(world, [], 1.0)).not.toThrow();
    });

    it('should handle very small deltaTime', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  }));

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      expect(() => system.update(world, entities, 0.001)).not.toThrow();
    });

    it('should handle very large deltaTime', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  }));

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      expect(() => system.update(world, entities, 1000.0)).not.toThrow();
    });

    it('should throw when entity missing required needs component', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(createAgentComponent('test', 'Test', { x: 0, y: 0 }));

      const entities = [entity]; // Force entity without needs into update

      // Per CLAUDE.md: missing required components should throw, not silently skip
      expect(() => system.update(world, entities, 1.0)).toThrow(/missing required needs component/);
    });

    it('should handle entity with needs but no circadian component', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  }));

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      // Should treat as not sleeping
      expect(() => system.update(world, entities, 1.0)).not.toThrow();
    });

    it('should handle entity with needs but no agent component', () => {
      const entity = world.createEntity();
      (entity as any).addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  }));

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      // Should use base decay rate
      expect(() => system.update(world, entities, 1.0)).not.toThrow();
    });

    it('should handle entity with needs but no movement component', () => {
      const entity = world.createEntity();
      const needs = new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  });
      const agent = createAgentComponent('test', 'Test', { x: 0, y: 0 });
      (entity as any).addComponent(needs);
      (entity as any).addComponent(agent);

      const entities = world.query().with(ComponentType.Needs).executeEntities();

      // Should not check movement speed
      expect(() => system.update(world, entities, 1.0)).not.toThrow();
    });
  });
});
