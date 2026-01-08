import { describe, it, expect } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { SleepSystem } from '../SleepSystem.js';
import { StateMutatorSystem } from '../StateMutatorSystem.js';
import { createTimeComponent } from '../TimeSystem.js';
import { createCircadianComponent } from '../../components/CircadianComponent.js';
import { NeedsComponent } from '../../components/NeedsComponent.js';

import { ComponentType } from '../../types/ComponentType.js';
/**
 * Integration tests for SleepSystem
 *
 * These tests actually RUN the system to verify agents sleep correctly.
 * Unit tests verify math, integration tests verify behavior.
 */

describe('SleepSystem Integration', () => {
  it('agent should seek sleep after ~18 hours awake', () => {
    // Create world with time entity
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);
    const timeEntity = new EntityImpl(createEntityId(), 0);
    timeEntity.addComponent(createTimeComponent(6, 48, 1)); // 6 AM, 48s/day, 1x speed
    (world as any)._addEntity(timeEntity);

    // Create agent
    const agent = new EntityImpl(createEntityId(), 0);
    agent.addComponent(createCircadianComponent()); // sleepDrive starts at 0
    agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  })); // full energy

    (world as any)._addEntity(agent);

    // Create and wire StateMutatorSystem (required for SleepSystem)
    const stateMutator = new StateMutatorSystem();
    const sleepSystem = new SleepSystem();
    sleepSystem.setStateMutatorSystem(stateMutator);

    // Only pass entities with circadian component
    const entities = world.query().with(ComponentType.Circadian).executeEntities();

    // Simulate 18 hours of game time
    // At 48s/day, 1 hour = 2 seconds real time
    // 18 hours = 36 seconds real time, split into game minutes
    for (let i = 0; i < 18; i++) {
      world.setTick(world.tick + 1200); // Advance 1 game minute
      sleepSystem.update(world, entities, 2.0); // 2s = ~1 game hour
      stateMutator.update(world, entities, 2.0); // Apply sleep drive deltas
    }

    // Get updated circadian component
    const circadian = agent.getComponent(ComponentType.Circadian) as any;

    // Sleep drive should be around 95-100 after 18 hours
    // Base rate: 5.5/hour * 18 = 99
    expect(circadian.sleepDrive).toBeGreaterThan(95);
    expect(circadian.sleepDrive).toBeLessThanOrEqual(100);
  });

  it('agent should accumulate sleep drive faster when tired', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);
    const timeEntity = new EntityImpl(createEntityId(), 0);
    timeEntity.addComponent(createTimeComponent(6, 48, 1));
    (world as any)._addEntity(timeEntity);

    const agent = new EntityImpl(createEntityId(), 0);
    agent.addComponent(createCircadianComponent());
    agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 0.25,
    health: 1.0,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  })); // LOW energy (25)

    (world as any)._addEntity(agent);

    // Create and wire StateMutatorSystem (required for SleepSystem)
    const stateMutator = new StateMutatorSystem();
    const sleepSystem = new SleepSystem();
    sleepSystem.setStateMutatorSystem(stateMutator);

    // Only pass entities with circadian component
    const entities = world.query().with(ComponentType.Circadian).executeEntities();

    // Simulate 12 hours (should be enough with tired multiplier)
    // 12 hours = 24 seconds, split into game minutes
    for (let i = 0; i < 12; i++) {
      world.setTick(world.tick + 1200); // Advance 1 game minute
      sleepSystem.update(world, entities, 2.0); // 2s = ~1 game hour
      stateMutator.update(world, entities, 2.0); // Apply sleep drive deltas
    }

    const circadian = agent.getComponent(ComponentType.Circadian) as any;

    // With tired multiplier (1.5x), rate is 8.25/hour
    // 8.25 * 12 = 99
    expect(circadian.sleepDrive).toBeGreaterThan(95);
  });

  it('agent should deplete sleep drive after 6 hours of sleep', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);
    const timeEntity = new EntityImpl(createEntityId(), 0);
    timeEntity.addComponent(createTimeComponent(22, 48, 1)); // 10 PM (night)
    (world as any)._addEntity(timeEntity);

    const agent = new EntityImpl(createEntityId(), 0);
    const circadian = createCircadianComponent();
    (circadian as any).sleepDrive = 100; // Start at max
    (circadian as any).isSleeping = true; // Agent is sleeping
    (circadian as any).sleepQuality = 0.5; // Default quality

    agent.addComponent(circadian);
    agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 0.5,
    health: 1.0,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  })); // Half energy

    (world as any)._addEntity(agent);

    // Create and wire StateMutatorSystem (required for SleepSystem)
    const stateMutator = new StateMutatorSystem();
    const sleepSystem = new SleepSystem();
    sleepSystem.setStateMutatorSystem(stateMutator);

    // Only pass entities with circadian component
    const entities = world.query().with(ComponentType.Circadian).executeEntities();

    // Simulate 6 hours of sleep
    // 6 hours = 12 seconds, split into game minutes
    for (let i = 0; i < 6; i++) {
      world.setTick(world.tick + 1200); // Advance 1 game minute
      sleepSystem.update(world, entities, 2.0); // 2s = ~1 game hour
      stateMutator.update(world, entities, 2.0); // Apply sleep drive deltas
    }

    const updatedCircadian = agent.getComponent(ComponentType.Circadian) as any;

    // Sleep drive should be nearly depleted
    // Rate: -17/hour * 6 = -102 (clamped to 0)
    expect(updatedCircadian.sleepDrive).toBe(0);
  });

  it('agent should recover energy while sleeping', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);
    const timeEntity = new EntityImpl(createEntityId(), 0);
    timeEntity.addComponent(createTimeComponent(22, 48, 1));
    (world as any)._addEntity(timeEntity);

    const agent = new EntityImpl(createEntityId(), 0);
    const circadian = createCircadianComponent();
    (circadian as any).sleepDrive = 100;
    (circadian as any).isSleeping = true;
    (circadian as any).sleepQuality = 0.5; // Ground sleep

    agent.addComponent(circadian);
    agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 0.1,
    health: 1.0,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  })); // Very low energy

    (world as any)._addEntity(agent);

    // Create and wire StateMutatorSystem (required for SleepSystem)
    const stateMutator = new StateMutatorSystem();
    const sleepSystem = new SleepSystem();
    sleepSystem.setStateMutatorSystem(stateMutator);

    // Only pass entities with circadian component
    const entities = world.query().with(ComponentType.Circadian).executeEntities();

    // Simulate 6 hours of sleep
    // 6 hours = 12 seconds, split into game minutes
    for (let i = 0; i < 6; i++) {
      world.setTick(world.tick + 1200); // Advance 1 game minute
      sleepSystem.update(world, entities, 2.0); // 2s = ~1 game hour
      stateMutator.update(world, entities, 2.0); // Apply energy recovery deltas
    }

    const needs = agent.getComponent(ComponentType.Needs) as any;

    // Energy recovery: 0.1 * quality * 60 = 3.0 per game minute
    // With quality 0.5: 3.0/min * 0.5 = 1.5/min
    // Starting from 0.1, reaches cap (1.0) within first minute
    expect(needs.energy).toBe(1.0); // Should reach energy cap
    expect(needs.energy).toBeLessThanOrEqual(1.0);
  });

  it('agent should NOT accumulate sleep drive while sleeping', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);
    const timeEntity = new EntityImpl(createEntityId(), 0);
    timeEntity.addComponent(createTimeComponent(22, 48, 1));
    (world as any)._addEntity(timeEntity);

    const agent = new EntityImpl(createEntityId(), 0);
    const circadian = createCircadianComponent();
    (circadian as any).sleepDrive = 50; // Mid-range
    (circadian as any).isSleeping = true;

    agent.addComponent(circadian);
    agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 0.5,
    health: 1.0,
    hungerDecayRate: 0.42,
    energyDecayRate: 0.5,
  }));

    (world as any)._addEntity(agent);

    // Create and wire StateMutatorSystem (required for SleepSystem)
    const stateMutator = new StateMutatorSystem();
    const sleepSystem = new SleepSystem();
    sleepSystem.setStateMutatorSystem(stateMutator);

    // Only pass entities with circadian component
    const entities = world.query().with(ComponentType.Circadian).executeEntities();

    // Simulate 2 hours of sleep
    // 2 hours = 4 seconds, split into game minutes
    for (let i = 0; i < 2; i++) {
      world.setTick(world.tick + 1200); // Advance 1 game minute
      sleepSystem.update(world, entities, 2.0); // 2s = ~1 game hour
      stateMutator.update(world, entities, 2.0); // Apply sleep drive deltas
    }

    const updatedCircadian = agent.getComponent(ComponentType.Circadian) as any;

    // Sleep drive should DECREASE, not increase
    // Depletion rate: -17 * 60 = -1020 per game minute
    // After even 1 game minute, sleep drive drops to 0 (50 - 1020 = clamped to 0)
    expect(updatedCircadian.sleepDrive).toBe(0);
  });
});
