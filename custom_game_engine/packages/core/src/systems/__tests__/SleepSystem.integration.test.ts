import { describe, it, expect } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { SleepSystem } from '../SleepSystem.js';
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

    // Create system
    const sleepSystem = new SleepSystem();

    // Simulate 18 hours of game time
    // At 48s/day, 1 hour = 2 seconds real time
    // 18 hours = 36 seconds real time
    const deltaTime = 36; // 36 seconds = 18 game hours

    // Run the system
    sleepSystem.update(world, [agent], deltaTime);

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

    const sleepSystem = new SleepSystem();

    // Simulate 12 hours (should be enough with tired multiplier)
    const deltaTime = 24; // 24 seconds = 12 game hours

    sleepSystem.update(world, [agent], deltaTime);

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

    const sleepSystem = new SleepSystem();

    // Simulate 6 hours of sleep
    const deltaTime = 12; // 12 seconds = 6 game hours

    sleepSystem.update(world, [agent], deltaTime);

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

    const sleepSystem = new SleepSystem();

    // Simulate 6 hours of sleep
    const deltaTime = 12; // 12 seconds = 6 game hours

    sleepSystem.update(world, [agent], deltaTime);

    const needs = agent.getComponent(ComponentType.Needs) as any;

    // Energy recovery: 0.1/hour * 0.5 quality * 6 hours = 0.3 energy
    // Starting from 0.1 (10%), should reach 0.4 (40%)
    expect(needs.energy).toBeCloseTo(0.4, 1);
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

    const sleepSystem = new SleepSystem();

    // Simulate 2 hours of sleep
    const deltaTime = 4; // 4 seconds = 2 game hours

    sleepSystem.update(world, [agent], deltaTime);

    const updatedCircadian = agent.getComponent(ComponentType.Circadian) as any;

    // Sleep drive should DECREASE, not increase
    // 50 - (17 * 2) = 16
    expect(updatedCircadian.sleepDrive).toBeLessThan(50);
    expect(updatedCircadian.sleepDrive).toBeCloseTo(16, 0);
  });
});
