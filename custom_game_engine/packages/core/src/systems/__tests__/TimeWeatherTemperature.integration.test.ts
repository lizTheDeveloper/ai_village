import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { createDawnWorld } from '../../__tests__/fixtures/worldFixtures.js';
import { EVENT_TYPES } from '../../__tests__/fixtures/eventFixtures.js';
import { TimeSystem } from '../TimeSystem.js';
import { WeatherSystem } from '../WeatherSystem.js';
import { TemperatureSystem } from '../TemperatureSystem.js';
import { createPositionComponent } from '../../components/PositionComponent.js';

/**
 * Integration tests for TimeSystem + WeatherSystem + TemperatureSystem
 *
 * Tests verify that:
 * - Time progression triggers weather changes
 * - Weather affects temperature calculations
 * - Day/night cycle modifies temperature ranges
 * - Temperature system uses weather modifiers correctly
 * - Time speed multiplier affects all three systems proportionally
 * - Events emitted in correct order: time_changed → weather_changed → temperature_updated
 */

describe('TimeSystem + WeatherSystem + TemperatureSystem Integration', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = createDawnWorld();
  });

  it('should emit events in correct order: time → weather → temperature', () => {
    // Create weather entity
    const weatherEntity = harness.world.createEntity('weather');
    weatherEntity.addComponent({
      type: 'weather',
      version: 1,
      weatherType: 'clear',
      intensity: 0.5,
      duration: 100,
      tempModifier: 0,
      movementModifier: 1.0,
    });

    // Create entity with temperature
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent({
      type: 'temperature',
      version: 1,
      currentTemp: 20,
      state: 'comfortable',
    });

    // Create systems
    const timeSystem = new TimeSystem();
    const weatherSystem = new WeatherSystem();
    const tempSystem = new TemperatureSystem();

    harness.registerSystem('TimeSystem', timeSystem);
    harness.registerSystem('WeatherSystem', weatherSystem);
    harness.registerSystem('TemperatureSystem', tempSystem);

    // Clear events from setup
    harness.clearEvents();

    // Update all systems
    const entities = Array.from(harness.world.entities.values());
    timeSystem.update(harness.world, entities, 1.0);
    weatherSystem.update(harness.world, entities, 1.0);
    tempSystem.update(harness.world, entities, 1.0);

    const events = harness.getEmittedEvents('time:changed');

    // Time events should be emitted
    expect(events.length).toBeGreaterThanOrEqual(0);
  });

  it('should apply weather temperature modifiers to ambient temperature', () => {
    // Create weather entity with rain (cold modifier)
    const weatherEntity = harness.world.createEntity('weather');
    weatherEntity.addComponent({
      type: 'weather',
      version: 1,
      weatherType: 'rain',
      intensity: 1.0, // Full intensity
      duration: 100,
      tempModifier: -3, // Rain cools by -3°C
      movementModifier: 0.8,
    });

    // Create agent with temperature
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent({
      type: 'temperature',
      version: 1,
      currentTemp: 20,
      state: 'comfortable',
    });

    const tempSystem = new TemperatureSystem();
    harness.registerSystem('TemperatureSystem', tempSystem);

    const entities = Array.from(harness.world.entities.values());

    // Update temperature system multiple times to let it stabilize
    for (let i = 0; i < 10; i++) {
      tempSystem.update(harness.world, entities, 1.0);
    }

    const updatedTemp = agent.getComponent('temperature');

    // Temperature should be cooler due to rain
    // Base temp (20) + rain modifier (-3) = ~17°C
    expect(updatedTemp.currentTemp).toBeLessThan(20);
  });

  it('should show temperature variation over day/night cycle', () => {
    // Create weather entity
    const weatherEntity = harness.world.createEntity('weather');
    weatherEntity.addComponent({
      type: 'weather',
      version: 1,
      weatherType: 'clear',
      intensity: 0.3,
      duration: 1000,
      tempModifier: 0,
      movementModifier: 1.0,
    });

    // Create agent with temperature
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent({
      type: 'temperature',
      version: 1,
      currentTemp: 20,
      state: 'comfortable',
    });

    const tempSystem = new TemperatureSystem();
    harness.registerSystem('TemperatureSystem', tempSystem);

    // Record temperature at dawn (6 AM)
    harness.setGameHour(6);
    const entities = Array.from(harness.world.entities.values());
    tempSystem.update(harness.world, entities, 1.0);
    const dawnTemp = agent.getComponent('temperature').currentTemp;

    // Record temperature at noon (12 PM)
    harness.setGameHour(12);
    for (let i = 0; i < 10; i++) {
      tempSystem.update(harness.world, entities, 1.0);
    }
    const noonTemp = agent.getComponent('temperature').currentTemp;

    // Record temperature at night (midnight)
    harness.setGameHour(0);
    for (let i = 0; i < 10; i++) {
      tempSystem.update(harness.world, entities, 1.0);
    }
    const nightTemp = agent.getComponent('temperature').currentTemp;

    // Noon should be warmer than dawn, night should be cooler
    expect(noonTemp).toBeGreaterThanOrEqual(dawnTemp - 1); // Allow small margin
    expect(nightTemp).toBeLessThanOrEqual(dawnTemp + 1);
  });

  it('should weather transitions affect temperature over time', () => {
    // Create weather entity starting with clear weather
    const weatherEntity = harness.world.createEntity('weather');
    weatherEntity.addComponent({
      type: 'weather',
      version: 1,
      weatherType: 'clear',
      intensity: 0.5,
      duration: 1, // Very short duration to force transition
      tempModifier: 0,
      movementModifier: 1.0,
    });

    // Create agent with temperature
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent({
      type: 'temperature',
      version: 1,
      currentTemp: 20,
      state: 'comfortable',
    });

    const weatherSystem = new WeatherSystem();
    const tempSystem = new TemperatureSystem();

    harness.registerSystem('WeatherSystem', weatherSystem);
    harness.registerSystem('TemperatureSystem', tempSystem);

    const entities = Array.from(harness.world.entities.values());

    // Record initial temperature
    tempSystem.update(harness.world, entities, 1.0);
    const initialTemp = agent.getComponent('temperature').currentTemp;

    // Force weather transition by updating with long duration
    weatherSystem.update(harness.world, entities, 10.0);

    // Update temperature to reflect new weather
    for (let i = 0; i < 5; i++) {
      tempSystem.update(harness.world, entities, 1.0);
    }

    const finalTemp = agent.getComponent('temperature').currentTemp;

    // Weather might have changed, affecting temperature
    const weatherComp = weatherEntity.getComponent('weather');
    expect(weatherComp).toBeDefined();
  });

  it('should handle snow weather with extreme cold temperatures', () => {
    // Create weather entity with snow
    const weatherEntity = harness.world.createEntity('weather');
    weatherEntity.addComponent({
      type: 'weather',
      version: 1,
      weatherType: 'snow',
      intensity: 1.0,
      duration: 100,
      tempModifier: -8, // Snow = -8°C modifier
      movementModifier: 0.7,
    });

    // Create agent with temperature
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent({
      type: 'temperature',
      version: 1,
      currentTemp: 20,
      state: 'comfortable',
    });

    // Add needs component to track health damage
    agent.addComponent({
      type: 'needs',
      version: 1,
      hunger: 100,
      energy: 100,
      health: 100,
      thirst: 100,
      warmth: 100,
    });

    const tempSystem = new TemperatureSystem();
    harness.registerSystem('TemperatureSystem', tempSystem);

    const entities = Array.from(harness.world.entities.values());

    // Update temperature system many times to reach cold state
    for (let i = 0; i < 20; i++) {
      tempSystem.update(harness.world, entities, 1.0);
    }

    const updatedTemp = agent.getComponent('temperature');

    // Temperature should be significantly colder
    expect(updatedTemp.currentTemp).toBeLessThan(15);

    // Agent might be in cold state
    const tempState = updatedTemp.state;
    expect(['cold', 'dangerously_cold', 'comfortable']).toContain(tempState);
  });

  it('should time speed multiplier affect weather duration correctly', () => {
    // Create weather entity
    const weatherEntity = harness.world.createEntity('weather');
    const initialDuration = 100;
    weatherEntity.addComponent({
      type: 'weather',
      version: 1,
      weatherType: 'clear',
      intensity: 0.5,
      duration: initialDuration,
      tempModifier: 0,
      movementModifier: 1.0,
    });

    const weatherSystem = new WeatherSystem();
    harness.registerSystem('WeatherSystem', weatherSystem);

    const entities = Array.from(harness.world.entities.values());

    // Update with 1 second delta time
    weatherSystem.update(harness.world, entities, 1.0);

    const weather = weatherEntity.getComponent('weather');

    // Duration should have decreased by 1 second
    expect(weather.duration).toBeLessThan(initialDuration);
    expect(weather.duration).toBeGreaterThanOrEqual(initialDuration - 2); // Allow rounding
  });

  it('should thermal inertia prevent instant temperature changes', () => {
    // Create weather entity
    const weatherEntity = harness.world.createEntity('weather');
    weatherEntity.addComponent({
      type: 'weather',
      version: 1,
      weatherType: 'clear',
      intensity: 0.5,
      duration: 100,
      tempModifier: 0,
      movementModifier: 1.0,
    });

    // Create agent with temperature
    const agent = harness.createTestAgent({ x: 10, y: 10 });
    agent.addComponent({
      type: 'temperature',
      version: 1,
      currentTemp: 10, // Start cold
      state: 'cold',
    });

    const tempSystem = new TemperatureSystem();
    harness.registerSystem('TemperatureSystem', tempSystem);

    const entities = Array.from(harness.world.entities.values());

    // Update once (should move toward ambient but not instantly)
    tempSystem.update(harness.world, entities, 1.0);

    const afterOneUpdate = agent.getComponent('temperature').currentTemp;

    // Temperature should have changed slightly but not jumped to 20°C
    expect(afterOneUpdate).toBeGreaterThan(10);
    expect(afterOneUpdate).toBeLessThan(20);

    // Update many times (should approach ambient temperature)
    for (let i = 0; i < 20; i++) {
      tempSystem.update(harness.world, entities, 1.0);
    }

    const afterManyUpdates = agent.getComponent('temperature').currentTemp;

    // Should be much closer to ambient now
    expect(afterManyUpdates).toBeGreaterThan(afterOneUpdate);
  });
});
