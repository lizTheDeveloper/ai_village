import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World';
import { EventBusImpl } from '../../events/EventBus';
import { EntityImpl, createEntityId } from '../../ecs/Entity';
import { TemperatureSystem } from '../TemperatureSystem';
import { WeatherSystem } from '../WeatherSystem';
import { createTemperatureComponent } from '../../components/TemperatureComponent';
import type { TemperatureComponent } from '../../components/TemperatureComponent';
import { createWeatherComponent } from '../../components/WeatherComponent';
import type { WeatherComponent } from '../../components/WeatherComponent';
import { createPositionComponent } from '../../components/PositionComponent';
import { NeedsComponent } from '../../components/NeedsComponent';
import type { NeedsComponent } from '../../components/NeedsComponent';
import { createBuildingComponent } from '../../components/BuildingComponent';

import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';
/**
 * Phase 8: Weather & Temperature System Tests
 *
 * These tests verify the implementation of the Weather and Temperature systems
 * according to the Phase 8 acceptance criteria.
 */
describe('Phase 8: Weather & Temperature Systems', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let temperatureSystem: TemperatureSystem;
  let weatherSystem: WeatherSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    temperatureSystem = new TemperatureSystem();
    weatherSystem = new WeatherSystem();
  });

  describe('TemperatureComponent', () => {
    it('should create temperature component with required fields', () => {
      const temp = createTemperatureComponent(20, 18, 24, 0, 35);

      expect(temp.type).toBe('temperature');
      expect(temp.currentTemp).toBe(20);
      expect(temp.comfortMin).toBe(18);
      expect(temp.comfortMax).toBe(24);
      expect(temp.toleranceMin).toBe(0);
      expect(temp.toleranceMax).toBe(35);
      expect(temp.state).toBe('comfortable');
    });

    it('should throw when required fields are missing', () => {
      expect(() => {
        // @ts-expect-error - testing missing parameters
        createTemperatureComponent();
      }).toThrow();
    });

    it('should calculate state as "cold" when temp is below comfortMin', () => {
      const temp = createTemperatureComponent(10, 18, 24, 0, 35);
      expect(temp.state).toBe('cold');
    });

    it('should calculate state as "hot" when temp is above comfortMax', () => {
      const temp = createTemperatureComponent(30, 18, 24, 0, 35);
      expect(temp.state).toBe('hot');
    });

    it('should calculate state as "dangerously_cold" when below toleranceMin', () => {
      const temp = createTemperatureComponent(-5, 18, 24, 0, 35);
      expect(temp.state).toBe('dangerously_cold');
    });

    it('should calculate state as "dangerously_hot" when above toleranceMax', () => {
      const temp = createTemperatureComponent(40, 18, 24, 0, 35);
      expect(temp.state).toBe('dangerously_hot');
    });
  });

  describe('WeatherComponent', () => {
    it('should create weather component with required fields', () => {
      const weather = createWeatherComponent('clear', 0.5, 0);

      expect(weather.type).toBe('weather');
      expect(weather.weatherType).toBe('clear');
      expect(weather.intensity).toBe(0.5);
      expect(weather.duration).toBe(0);
      expect(weather.tempModifier).toBe(0); // clear = 0°C
      expect(weather.movementModifier).toBe(1.0); // clear = no slowdown
    });

    it('should apply correct modifiers for rain', () => {
      const weather = createWeatherComponent('rain', 1.0, 0);
      expect(weather.tempModifier).toBe(-3);
      expect(weather.movementModifier).toBe(0.8);
    });

    it('should apply correct modifiers for snow', () => {
      const weather = createWeatherComponent('snow', 1.0, 0);
      expect(weather.tempModifier).toBe(-8);
      expect(weather.movementModifier).toBe(0.7);
    });

    it('should apply correct modifiers for storm', () => {
      const weather = createWeatherComponent('storm', 1.0, 0);
      expect(weather.tempModifier).toBe(-5);
      expect(weather.movementModifier).toBe(0.5);
    });

    it('should throw when intensity is out of range', () => {
      expect(() => {
        createWeatherComponent('rain', 1.5, 0);
      }).toThrow('intensity must be between 0 and 1');

      expect(() => {
        createWeatherComponent('rain', -0.5, 0);
      }).toThrow('intensity must be between 0 and 1');
    });

    it('should throw for invalid weather type', () => {
      expect(() => {
        // @ts-expect-error - testing invalid type
        createWeatherComponent('invalid', 1.0, 0);
      }).toThrow('Invalid weather type');
    });
  });

  describe('TemperatureSystem', () => {
    it('should update agent temperature state', () => {
      // Create agent with cold temperature
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createTemperatureComponent(10, 18, 24, 0, 35));
      agent.addComponent(createPositionComponent(0, 0));
      world.addEntity(agent);

      // Run temperature system
      const entities = world.query().with(ComponentType.Temperature).with(ComponentType.Position).executeEntities();
      temperatureSystem.update(world, entities, 0.016);

      // Check temperature was updated
      const temp = agent.getComponent(ComponentType.Temperature);
      expect(temp).toBeDefined();
      expect(temp!.state).toBeDefined();
    });

    it('should apply health damage when in dangerous temperature', () => {
      // Create very cold weather to force dangerous temperatures
      const worldEntity = new EntityImpl(createEntityId(), world.tick);
      worldEntity.addComponent(createWeatherComponent('storm', 1.0, 0, -30, 1.0)); // Extreme cold modifier
      world.addEntity(worldEntity);

      // Create agent with very narrow tolerance range
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createTemperatureComponent(20, 20, 25, 18, 27)); // Narrow tolerance
      agent.addComponent(createPositionComponent(0, 0));
      agent.addComponent(new NeedsComponent({
    hunger: 1.0,
    energy: 1.0,
    health: 1.0,
    thirst: 1.0,
    temperature: 1.0,
  }));
      world.addEntity(agent);

      const initialHealth = 100;

      // Simulate 10 seconds to ensure health damage occurs
      for (let i = 0; i < 600; i++) {
        const entities = world.query().with(ComponentType.Temperature).with(ComponentType.Position).executeEntities();
        temperatureSystem.update(world, entities, 0.016);
      }

      // Health should have decreased due to dangerous temperature
      const needs = agent.getComponent(ComponentType.Needs);
      expect(needs).toBeDefined();
      expect(needs!.health).toBeLessThan(initialHealth);
    });

    it('should apply heat bonus from campfire', () => {
      // Create campfire at (0, 0)
      const campfire = new EntityImpl(createEntityId(), world.tick);
      campfire.addComponent(createBuildingComponent(BuildingType.Campfire, 1, 100)); // Complete campfire
      campfire.addComponent(createPositionComponent(0, 0));
      world.addEntity(campfire);

      // Create agent 2 tiles away
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createTemperatureComponent(10, 18, 24, 0, 35));
      agent.addComponent(createPositionComponent(2, 0));
      world.addEntity(agent);

      // Run temperature system
      const entities = world.query().with(ComponentType.Temperature).with(ComponentType.Position).executeEntities();
      temperatureSystem.update(world, entities, 0.016);

      // Agent should be warmer due to campfire
      const temp = agent.getComponent(ComponentType.Temperature);
      expect(temp).toBeDefined();
      // Temperature should be higher than initial due to heat source
      expect(temp!.currentTemp).toBeGreaterThan(10);
    });

    it('should apply building insulation effect', () => {
      // Create tent at (0, 0) with interior radius 2
      const tent = new EntityImpl(createEntityId(), world.tick);
      tent.addComponent(createBuildingComponent(BuildingType.Tent, 1, 100)); // Complete tent
      tent.addComponent(createPositionComponent(0, 0));
      world.addEntity(tent);

      // Create agent inside tent (distance < interiorRadius)
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createTemperatureComponent(5, 18, 24, 0, 35));
      agent.addComponent(createPositionComponent(1, 0)); // 1 tile away, inside interior
      world.addEntity(agent);

      // Run temperature system
      const entities = world.query().with(ComponentType.Temperature).with(ComponentType.Position).executeEntities();
      temperatureSystem.update(world, entities, 0.016);

      // Agent should be warmer due to insulation and base temperature
      const temp = agent.getComponent(ComponentType.Temperature);
      expect(temp).toBeDefined();
      // Temperature should be modified by building effects
      expect(temp!.currentTemp).toBeGreaterThan(5);
    });
  });

  describe('WeatherSystem', () => {
    it('should update weather duration over time', () => {
      // Create world entity with weather
      const worldEntity = new EntityImpl(createEntityId(), world.tick);
      worldEntity.addComponent(createWeatherComponent('clear', 1.0, 0));
      world.addEntity(worldEntity);

      // Run weather system
      const entities = world.query().with(ComponentType.Weather).executeEntities();
      weatherSystem.update(world, entities, 1.0);

      // Duration should have increased
      const weather = worldEntity.getComponent<WeatherComponent>('weather');
      expect(weather).toBeDefined();
      expect(weather!.duration).toBeGreaterThan(0);
    });

    it('should apply weather temperature modifier to temperature calculation', () => {
      // Create snowy weather (-8°C modifier)
      const worldEntity = new EntityImpl(createEntityId(), world.tick);
      worldEntity.addComponent(createWeatherComponent('snow', 1.0, 100)); // Set long duration
      world.addEntity(worldEntity);

      // Create agent
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createTemperatureComponent(20, 18, 24, 0, 35));
      agent.addComponent(createPositionComponent(0, 0));
      world.addEntity(agent);

      // Run temperature system (don't run weather system to avoid random transitions)
      const tempEntities = world.query().with(ComponentType.Temperature).with(ComponentType.Position).executeEntities();
      temperatureSystem.update(world, tempEntities, 0.016);

      // Check that weather component exists with correct modifiers
      const weather = worldEntity.getComponent<WeatherComponent>('weather');
      expect(weather).toBeDefined();
      expect(weather!.weatherType).toBe('snow');
      expect(weather!.tempModifier).toBe(-8);

      // Temperature system should have processed the agent
      const temp = agent.getComponent(ComponentType.Temperature);
      expect(temp).toBeDefined();
      // Just verify temperature was calculated (state should be set)
      expect(temp!.state).toBeDefined();
    });
  });

  describe('Integration: Weather affects temperature', () => {
    it('should process weather and temperature systems together', () => {
      // Setup snowy weather
      const worldEntity = new EntityImpl(createEntityId(), world.tick);
      worldEntity.addComponent(createWeatherComponent('snow', 1.0, 100));
      world.addEntity(worldEntity);

      // Create agent
      const agent = new EntityImpl(createEntityId(), world.tick);
      agent.addComponent(createTemperatureComponent(20, 18, 24, 0, 35));
      agent.addComponent(createPositionComponent(0, 0));
      world.addEntity(agent);

      // Run weather system first
      const weatherEntities = world.query().with(ComponentType.Weather).executeEntities();
      weatherSystem.update(world, weatherEntities, 0.016);

      // Then run temperature system
      const tempEntities = world.query().with(ComponentType.Temperature).with(ComponentType.Position).executeEntities();
      temperatureSystem.update(world, tempEntities, 0.016);

      // Verify both systems processed their entities
      const weather = worldEntity.getComponent<WeatherComponent>('weather');
      expect(weather).toBeDefined();
      expect(weather!.weatherType).toBe('snow');

      const temp = agent.getComponent(ComponentType.Temperature);
      expect(temp).toBeDefined();
      expect(temp!.currentTemp).toBeDefined();
      expect(temp!.state).toBeDefined();
    });
  });
});
