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

    // Simulate 720 game minutes (12 game hours) - should max out sleep drive with tired multiplier
    // With corrected rate: 5.5 / 60 = 0.0917 per game minute (base)
    // With tired multiplier (1.5x): 0.0917 * 1.5 = 0.1375 per game minute
    // After 720 minutes: 0 + (0.1375 * 720) = 99 → clamped to 100
    for (let i = 0; i < 720; i++) {
      world.setTick(world.tick + 1200); // Advance 1 game minute
      sleepSystem.update(world, entities, 2.0);
      stateMutator.update(world, entities, 2.0); // Apply sleep drive deltas
    }

    const circadian = agent.getComponent(ComponentType.Circadian) as any;

    // With tired multiplier (1.5x), rate is 8.25/hour (correct)
    // 8.25 * 12 = 99 (should be near max)
    expect(circadian.sleepDrive).toBeGreaterThan(90);
    expect(circadian.sleepDrive).toBeLessThanOrEqual(100);
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

    // Simulate 360 game minutes (6 game hours) of sleep
    // With corrected rate: -17 / 60 = -0.283 per game minute
    // After 360 minutes: 100 - (0.283 * 360) = 100 - 102 = 0 (clamped)
    for (let i = 0; i < 360; i++) {
      world.setTick(world.tick + 1200); // Advance 1 game minute
      sleepSystem.update(world, entities, 2.0);
      stateMutator.update(world, entities, 2.0); // Apply sleep drive deltas
    }

    const updatedCircadian = agent.getComponent(ComponentType.Circadian) as any;

    // Sleep drive should be nearly depleted after 6 game hours
    // Rate: -17 / 60 = -0.283 per game minute (correct: -17 per hour)
    // After 6 hours: 100 - (17 * 6) = 100 - 102 = 0 (clamped)
    expect(updatedCircadian.sleepDrive).toBeLessThan(10); // Should be nearly depleted
    expect(updatedCircadian.sleepDrive).toBeCloseTo(0, 0); // Should be ~0 after 6 hours
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

    // Simulate 600 game minutes (10 game hours) of sleep
    // With corrected rates: energy recovery = 0.1 * 0.5 / 60 = 0.000833 per game minute
    // After 600 minutes: 0.1 + (0.000833 * 600) = 0.1 + 0.5 = 0.6 energy
    for (let i = 0; i < 600; i++) {
      world.setTick(world.tick + 1200); // Advance 1 game minute
      sleepSystem.update(world, entities, 2.0);
      stateMutator.update(world, entities, 2.0); // Apply energy recovery deltas
    }

    const needs = agent.getComponent(ComponentType.Needs) as any;

    // Energy recovery: 0.1 * quality / 60 = 0.000833 per game minute (with quality 0.5)
    // After 600 game minutes: 0.1 + (0.000833 * 600) ≈ 0.6
    // Note: Rate is 10% per game hour (correct), so 10 hours = 100% recovery
    expect(needs.energy).toBeGreaterThan(0.1); // Energy should increase
    expect(needs.energy).toBeCloseTo(0.6, 1); // ~60% energy after 10 game hours
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

    // Simulate 180 game minutes (3 game hours) of sleep
    // With corrected rates: sleep drive depletion = -17 / 60 = -0.283 per game minute
    // After 180 minutes: 50 - (0.283 * 180) = 50 - 51 = 0 (clamped)
    for (let i = 0; i < 180; i++) {
      world.setTick(world.tick + 1200); // Advance 1 game minute
      sleepSystem.update(world, entities, 2.0);
      stateMutator.update(world, entities, 2.0); // Apply sleep drive deltas
    }

    const updatedCircadian = agent.getComponent(ComponentType.Circadian) as any;

    // Sleep drive should DECREASE during sleep, not increase
    // Depletion rate: -17 / 60 = -0.283 per game minute (correct: -17 per hour)
    // After 180 game minutes (3 hours): 50 - (0.283 * 180) ≈ 0
    expect(updatedCircadian.sleepDrive).toBeLessThan(50); // Should decrease
    expect(updatedCircadian.sleepDrive).toBeCloseTo(0, 0); // Should be near 0 after 3 hours
  });
});
