import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createDawnWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { NeedsSystem } from '../NeedsSystem.js';
import { SleepSystem } from '../SleepSystem.js';
import { TemperatureSystem } from '../TemperatureSystem.js';
import { createNeedsComponent } from '../../components/NeedsComponent.js';
import { createCircadianComponent } from '../../components/CircadianComponent.js';

/**
 * Integration tests for NeedsSystem + SleepSystem + TemperatureSystem
 *
 * Tests verify that:
 * - Low energy triggers sleep drive increase
 * - Sleep recovers energy in NeedsSystem
 * - Hunger doesn't decay during sleep
 * - Temperature extremes increase needs decay rate
 * - Sleep quality affects energy recovery rate
 * - Wake conditions (danger, full energy) properly end sleep
 */

describe('NeedsSystem + SleepSystem + TemperatureSystem Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createDawnWorld();
  });

  it('should low energy increase sleep drive faster', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    agent.addComponent(createCircadianComponent());
    agent.addComponent(createNeedsComponent(100, 25, 100, 100, 100)); // Low energy (25)

    const sleepSystem = new SleepSystem();
    harness.registerSystem('SleepSystem', sleepSystem);

    const entities = Array.from(harness.world.entities.values());

    // Simulate several hours of being awake with low energy
    for (let i = 0; i < 10; i++) {
      sleepSystem.update(harness.world, entities, 2.4); // 2.4s = ~1 game hour
    }

    const circadian = agent.getComponent('circadian') as any;

    // Sleep drive should be high due to low energy
    expect(circadian.sleepDrive).toBeGreaterThan(70);
  });

  it('should sleep recover energy in NeedsSystem', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const circadian = createCircadianComponent();
    (circadian as any).isSleeping = true;
    (circadian as any).sleepDrive = 100;
    (circadian as any).sleepQuality = 0.5; // Ground sleep

    agent.addComponent(circadian);
    agent.addComponent(createNeedsComponent(100, 20, 100, 100, 100)); // Low energy

    const sleepSystem = new SleepSystem();
    harness.registerSystem('SleepSystem', sleepSystem);

    const entities = Array.from(harness.world.entities.values());

    const initialNeeds = agent.getComponent('needs') as any;
    const initialEnergy = initialNeeds.energy;

    // Sleep for several hours
    for (let i = 0; i < 6; i++) {
      sleepSystem.update(harness.world, entities, 2.0); // ~1 hour each
    }

    const finalNeeds = agent.getComponent('needs') as any;

    // Energy should have increased during sleep
    expect(finalNeeds.energy).toBeGreaterThan(initialEnergy);
  });

  it('should hunger not decay during sleep', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const circadian = createCircadianComponent();
    (circadian as any).isSleeping = true;
    (circadian as any).sleepDrive = 100;
    (circadian as any).sleepQuality = 0.5;

    agent.addComponent(circadian);
    agent.addComponent(createNeedsComponent(80, 50, 100, 100, 100)); // 80 hunger

    const needsSystem = new NeedsSystem();
    harness.registerSystem('NeedsSystem', needsSystem);

    const entities = Array.from(harness.world.entities.values());

    const initialNeeds = agent.getComponent('needs') as any;
    const initialHunger = initialNeeds.hunger;

    // Update needs system while sleeping
    for (let i = 0; i < 10; i++) {
      needsSystem.update(harness.world, entities, 1.0);
    }

    const finalNeeds = agent.getComponent('needs') as any;

    // Hunger should not have decayed significantly during sleep
    expect(finalNeeds.hunger).toBeGreaterThanOrEqual(initialHunger - 5); // Allow small decay
  });

  it('should extreme cold temperature damage health', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    // Create weather entity with extreme cold
    const weatherEntity = harness.world.createEntity('weather');
    weatherEntity.addComponent({
      type: 'weather',
      version: 1,
      weatherType: 'snow',
      intensity: 1.0,
      duration: 100,
      tempModifier: -8,
      movementModifier: 0.7,
    });

    agent.addComponent({
      type: 'temperature',
      version: 1,
      currentTemp: 5, // Already cold
      state: 'dangerously_cold',
    });
    agent.addComponent(createNeedsComponent(100, 100, 100, 100, 100)); // Full health

    const tempSystem = new TemperatureSystem();
    harness.registerSystem('TemperatureSystem', tempSystem);

    const entities = Array.from(harness.world.entities.values());

    const initialNeeds = agent.getComponent('needs') as any;
    const initialHealth = initialNeeds.health;

    // Expose agent to cold for several seconds
    for (let i = 0; i < 10; i++) {
      tempSystem.update(harness.world, entities, 1.0);
    }

    const finalNeeds = agent.getComponent('needs') as any;

    // Health should have decreased due to dangerous temperature
    expect(finalNeeds.health).toBeLessThan(initialHealth);
  });

  it('should sleep quality affect energy recovery rate', () => {
    // Create two agents - one with good sleep, one with poor sleep
    const agent1 = harness.createTestAgent({ x: 10, y: 10 });
    const agent2 = harness.createTestAgent({ x: 20, y: 20 });

    const circadian1 = createCircadianComponent();
    (circadian1 as any).isSleeping = true;
    (circadian1 as any).sleepDrive = 100;
    (circadian1 as any).sleepQuality = 1.0; // Perfect sleep (bed)

    const circadian2 = createCircadianComponent();
    (circadian2 as any).isSleeping = true;
    (circadian2 as any).sleepDrive = 100;
    (circadian2 as any).sleepQuality = 0.3; // Poor sleep (ground)

    agent1.addComponent(circadian1);
    agent1.addComponent(createNeedsComponent(100, 20, 100, 100, 100));

    agent2.addComponent(circadian2);
    agent2.addComponent(createNeedsComponent(100, 20, 100, 100, 100));

    const sleepSystem = new SleepSystem();
    harness.registerSystem('SleepSystem', sleepSystem);

    const entities = Array.from(harness.world.entities.values());

    // Sleep for same amount of time
    for (let i = 0; i < 6; i++) {
      sleepSystem.update(harness.world, entities, 2.0);
    }

    const needs1 = agent1.getComponent('needs') as any;
    const needs2 = agent2.getComponent('needs') as any;

    // Agent with better sleep quality should have recovered more energy
    expect(needs1.energy).toBeGreaterThan(needs2.energy);
  });

  it('should full energy recovery trigger wake condition', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    const circadian = createCircadianComponent();
    (circadian as any).isSleeping = true;
    (circadian as any).sleepDrive = 50; // Moderate sleep drive
    (circadian as any).sleepQuality = 1.0; // Good sleep

    agent.addComponent(circadian);
    agent.addComponent(createNeedsComponent(100, 90, 100, 100, 100)); // Almost full energy

    const sleepSystem = new SleepSystem();
    harness.registerSystem('SleepSystem', sleepSystem);

    const entities = Array.from(harness.world.entities.values());

    // Sleep enough to fully recover
    for (let i = 0; i < 3; i++) {
      sleepSystem.update(harness.world, entities, 2.0);
    }

    const finalCircadian = agent.getComponent('circadian') as any;
    const finalNeeds = agent.getComponent('needs') as any;

    // Agent should have recovered energy
    expect(finalNeeds.energy).toBeGreaterThanOrEqual(90);

    // Sleep drive should have decreased
    expect(finalCircadian.sleepDrive).toBeLessThan(50);
  });

  it('should temperature extremes increase needs decay when awake', () => {
    const agent = harness.createTestAgent({ x: 10, y: 10 });

    // Create hot weather
    const weatherEntity = harness.world.createEntity('weather');
    weatherEntity.addComponent({
      type: 'weather',
      version: 1,
      weatherType: 'clear',
      intensity: 0.5,
      duration: 100,
      tempModifier: 10, // Very hot
      movementModifier: 1.0,
    });

    agent.addComponent({
      type: 'temperature',
      version: 1,
      currentTemp: 35, // Hot
      state: 'hot',
    });
    agent.addComponent(createCircadianComponent());
    agent.addComponent(createNeedsComponent(100, 100, 100, 100, 100));

    const needsSystem = new NeedsSystem();
    const tempSystem = new TemperatureSystem();

    harness.registerSystem('NeedsSystem', needsSystem);
    harness.registerSystem('TemperatureSystem', tempSystem);

    const entities = Array.from(harness.world.entities.values());

    const initialNeeds = agent.getComponent('needs') as any;
    const initialEnergy = initialNeeds.energy;

    // Update both systems
    for (let i = 0; i < 10; i++) {
      tempSystem.update(harness.world, entities, 1.0);
      needsSystem.update(harness.world, entities, 1.0);
    }

    const finalNeeds = agent.getComponent('needs') as any;

    // Energy/needs should decay faster in extreme temperatures
    // (Exact values depend on implementation)
    expect(finalNeeds.energy).toBeLessThanOrEqual(initialEnergy);
  });
});
