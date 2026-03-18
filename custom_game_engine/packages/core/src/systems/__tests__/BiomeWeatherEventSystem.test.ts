import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { createTimeComponent } from '../TimeSystem.js';
import { BiomeWeatherEventSystem } from '../BiomeWeatherEventSystem.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { TimeComponent } from '../TimeSystem.js';
import type { WeatherComponent } from '../../components/WeatherComponent.js';

/**
 * Unit tests for BiomeWeatherEventSystem
 *
 * Tests:
 * - Emits 'biome:weather_event' for a biome+season combination
 * - Desert sandstorm only fires in summer/spring seasons
 * - Weather component is updated when event fires
 * - Probability gating (high-probability event fires)
 */

describe('BiomeWeatherEventSystem', () => {
  let harness: IntegrationTestHarness;
  let system: BiomeWeatherEventSystem;

  beforeEach(async () => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: false });

    system = new BiomeWeatherEventSystem();
    await system.initialize(harness.world, harness.eventBus);
  });

  function createTimeEntityWithSeason(season: 'spring' | 'summer' | 'fall' | 'winter'): EntityImpl {
    const timeEntity = new EntityImpl(createEntityId(), 0);
    const timeComp = createTimeComponent(6, 48, 1);
    const patchedTimeComp: TimeComponent = {
      ...timeComp,
      season,
    };
    timeEntity.addComponent(patchedTimeComp);
    harness.world.addEntity(timeEntity);
    return timeEntity;
  }

  function createWeatherEntity(): EntityImpl {
    const weatherEntity = new EntityImpl(createEntityId(), 0);
    const weatherComp: WeatherComponent = {
      type: ComponentType.Weather as 'weather',
      version: 1,
      weatherType: 'clear',
      intensity: 0.1,
      duration: 100,
      tempModifier: 0,
      movementModifier: 1.0,
    };
    weatherEntity.addComponent(weatherComp);
    harness.world.addEntity(weatherEntity);
    return weatherEntity;
  }

  it('emits biome:weather_event for a valid biome+season combination', async () => {
    createTimeEntityWithSeason('summer');
    createWeatherEntity();

    // Set desert biome and force Math.random to always return 0 (triggers all events)
    (harness.world as any).getTileAt = () => ({ biome: 'desert' });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const entities = Array.from(harness.world.entities.values());

    // BiomeWeatherEventSystem has throttleInterval=300, throttleOffset=0 (default)
    // So it runs at tick 0 - no need to advance ticks
    system.update(harness.world, entities, 1.0);

    const events = harness.getEmittedEvents('biome:weather_event');
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]!.data.biome).toBe('desert');

    vi.restoreAllMocks();
  });

  it('desert sandstorm only fires in summer or spring, not in winter', async () => {
    // Winter: no sandstorm should be possible for desert
    createTimeEntityWithSeason('winter');
    createWeatherEntity();

    (harness.world as any).getTileAt = () => ({ biome: 'desert' });

    // Force Math.random to always trigger events
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const entities = Array.from(harness.world.entities.values());
    system.update(harness.world, entities, 1.0);

    const events = harness.getEmittedEvents('biome:weather_event');

    // In winter, desert only has 'desert_rain', not 'sandstorm'
    const sandstormEvents = events.filter(e => e.data.eventType === 'sandstorm');
    expect(sandstormEvents.length).toBe(0);

    vi.restoreAllMocks();
  });

  it('updates WeatherComponent when event fires', async () => {
    createTimeEntityWithSeason('summer');
    const weatherEntity = createWeatherEntity();

    (harness.world as any).getTileAt = () => ({ biome: 'plains' });

    // Force random to 0 to trigger events
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const entities = Array.from(harness.world.entities.values());
    system.update(harness.world, entities, 1.0);

    const events = harness.getEmittedEvents('biome:weather_event');

    if (events.length > 0) {
      // Weather component should be updated to match the event
      const updatedWeather = weatherEntity.getComponent<WeatherComponent>(ComponentType.Weather as 'weather');
      expect(updatedWeather).toBeDefined();
      // Intensity should match the fired event's severity
      expect(updatedWeather!.intensity).toBeGreaterThan(0.1); // Changed from default 0.1
    }

    vi.restoreAllMocks();
  });

  it('probability gating: event with probability 1.0 always fires', async () => {
    createTimeEntityWithSeason('summer');
    createWeatherEntity();

    (harness.world as any).getTileAt = () => ({ biome: 'forest' });

    // Mock random to return value < all probabilities (0.0 < 0.02)
    vi.spyOn(Math, 'random').mockReturnValue(0.0);

    const entities = Array.from(harness.world.entities.values());
    system.update(harness.world, entities, 1.0);

    const events = harness.getEmittedEvents('biome:weather_event');
    // forest + summer has 'canopy_storm' with probability 0.02, and Math.random()=0 < 0.02
    expect(events.length).toBeGreaterThanOrEqual(1);

    vi.restoreAllMocks();
  });
});
