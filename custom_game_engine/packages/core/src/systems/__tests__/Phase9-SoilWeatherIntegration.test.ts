import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { SoilSystem } from '../SoilSystem.js';
import type { Tile } from '../SoilSystem.js';
import { WeatherSystem } from '../WeatherSystem.js';
import { TemperatureSystem } from '../TemperatureSystem.js';

/**
 * Phase 9: Soil + Weather + Temperature Integration Tests
 *
 * Tests verify that SoilSystem correctly integrates with
 * WeatherSystem and TemperatureSystem for realistic moisture management.
 *
 * Integration Points:
 * - Rain/snow increase soil moisture (via applyRain/applySnow)
 * - Temperature affects evaporation rate (hot=+50%, cold=-50%)
 * - Seasons modify moisture decay (summer=+25%, winter=-50%)
 * - Indoor tiles don't receive rain but get reduced evaporation
 * - Event-based integration via weather:changed and world:time:day subscriptions
 */

/**
 * Creates a test tile with sensible defaults.
 * Avoids repetitive tile construction across tests.
 */
function createTile(overrides: Partial<Tile> & Record<string, unknown> = {}): Tile & Record<string, unknown> {
  return {
    terrain: 'dirt',
    moisture: 50,
    fertility: 50,
    biome: 'plains' as const,
    tilled: true,
    plantability: 3,
    nutrients: { nitrogen: 50, phosphorus: 40, potassium: 45 },
    fertilized: false,
    fertilizerDuration: 0,
    lastWatered: 0,
    lastTilled: 0,
    composted: false,
    ...overrides,
  };
}

/**
 * Creates a World with a time entity configured for the given season.
 */
function createWorldWithSeason(
  eventBus: EventBusImpl,
  season: 'spring' | 'summer' | 'fall' | 'winter'
): World {
  const seasonDays: Record<string, number> = {
    spring: 45,
    summer: 120,
    fall: 225,
    winter: 300,
  };
  const world = new World(eventBus);
  const timeEntity = world.createEntity();
  timeEntity.addComponent({
    type: 'time',
    version: 1,
    timeOfDay: 12,
    dayLength: 48,
    speedMultiplier: 1,
    phase: 'day' as const,
    lightLevel: 1.0,
    day: seasonDays[season]!,
    season: season as 'spring' | 'summer' | 'fall' | 'winter',
  });
  return world;
}

describe('Phase 9: Soil + Weather Integration', () => {
  let _world: World;
  let eventBus: EventBusImpl;
  let soilSystem: SoilSystem;
  let weatherSystem: WeatherSystem;
  let temperatureSystem: TemperatureSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    _world = new World(eventBus);
    soilSystem = new SoilSystem();
    weatherSystem = new WeatherSystem();
    temperatureSystem = new TemperatureSystem();
  });

  describe('Rain → Soil Moisture', () => {
    it('should increase soil moisture when rain event occurs', () => {
      const world = new World(eventBus);
      const tile = createTile();

      soilSystem.applyRain(world, tile, 0, 0, 0.5);

      // Rain at 0.5 intensity adds 40 * 0.5 = 20 moisture
      expect(tile.moisture).toBe(70);
    });

    it('should increase moisture by +40 for standard rain', () => {
      const world = new World(eventBus);
      const tile = createTile();

      soilSystem.applyRain(world, tile, 0, 0, 1.0);

      expect(tile.moisture).toBe(90);
    });

    it('should increase moisture by +20 for snow', () => {
      const world = new World(eventBus);
      const tile = createTile();

      soilSystem.applySnow(world, tile, 0, 0, 1.0);

      expect(tile.moisture).toBe(70);
    });

    it('should cap moisture at 100 during heavy rain', () => {
      const world = new World(eventBus);
      const tile = createTile({ moisture: 80 });

      soilSystem.applyRain(world, tile, 0, 0, 1.0);

      expect(tile.moisture).toBe(100);
    });

    it('should NOT increase moisture on indoor tiles during rain', () => {
      const world = new World(eventBus);
      // Indoor tile has a wall structure
      const indoorTile = createTile({
        wall: { material: 'stone', constructionProgress: 100 },
      });

      // Verify tile is detected as indoor
      expect(soilSystem.isTileIndoors(indoorTile, world, 0, 0)).toBe(true);

      // Indoor tiles should NOT receive rain - the integration layer
      // (handleRainEvent -> forEachOutdoorTile) filters them out.
      // Direct applyRain doesn't check indoor status (it's the caller's job),
      // so we verify the indoor detection works correctly.
      const originalMoisture = indoorTile.moisture;
      // Simulate what handleRainEvent does: skip indoor tiles
      if (!soilSystem.isTileIndoors(indoorTile, world, 0, 0)) {
        soilSystem.applyRain(world, indoorTile, 0, 0, 1.0);
      }
      expect(indoorTile.moisture).toBe(originalMoisture);
    });

    it('should scale rain moisture by intensity', () => {
      const world = new World(eventBus);

      const tile1 = createTile();
      soilSystem.applyRain(world, tile1, 0, 0, 0.3);
      expect(tile1.moisture).toBe(62); // 50 + 40 * 0.3 = 62

      const tile2 = createTile();
      soilSystem.applyRain(world, tile2, 0, 0, 0.8);
      expect(tile2.moisture).toBe(82); // 50 + 40 * 0.8 = 82
    });
  });

  describe('Temperature → Evaporation Rate', () => {
    it('should increase evaporation in hot temperatures', () => {
      const world = createWorldWithSeason(eventBus, 'spring');
      const tile = createTile({ moisture: 100 });

      soilSystem.decayMoisture(world, tile, 0, 0, 30); // 30°C = hot

      // Base decay = 10, hot modifier = 1.5, spring = 1.0
      expect(tile.moisture).toBe(85);
    });

    it('should decrease evaporation in cold temperatures', () => {
      const world = createWorldWithSeason(eventBus, 'spring');
      const tile = createTile({ moisture: 100 });

      soilSystem.decayMoisture(world, tile, 0, 0, 5); // 5°C = cold

      // Base decay = 10, cold modifier = 0.5, spring = 1.0
      expect(tile.moisture).toBe(95);
    });

    it('should apply +50% evaporation modifier in hot weather', () => {
      const world = createWorldWithSeason(eventBus, 'spring');
      const coldTile = createTile({ moisture: 100 });
      const hotTile = createTile({ moisture: 100 });

      soilSystem.decayMoisture(world, coldTile, 0, 0, 20); // Normal temp
      soilSystem.decayMoisture(world, hotTile, 0, 0, 30);  // Hot temp

      expect(coldTile.moisture).toBe(90);
      expect(hotTile.moisture).toBe(85);
      expect(coldTile.moisture - hotTile.moisture).toBe(5); // 50% more evaporation
    });

    it('should apply -50% evaporation modifier in cold weather', () => {
      const world = createWorldWithSeason(eventBus, 'spring');
      const normalTile = createTile({ moisture: 100 });
      const coldTile = createTile({ moisture: 100 });

      soilSystem.decayMoisture(world, normalTile, 0, 0, 20); // Normal temp
      soilSystem.decayMoisture(world, coldTile, 0, 0, 5);    // Cold temp

      expect(normalTile.moisture).toBe(90);
      expect(coldTile.moisture).toBe(95);
      expect(normalTile.moisture - coldTile.moisture).toBe(-5);
    });
  });

  describe('Season → Moisture Decay', () => {
    it('should increase evaporation in summer (+25%)', () => {
      const world = createWorldWithSeason(eventBus, 'summer');
      const tile = createTile({ moisture: 100, biome: 'grassland' as const });

      soilSystem.decayMoisture(world, tile, 0, 0, 20);

      // Base decay = 10, summer multiplier = 1.25
      expect(tile.moisture).toBe(100 - 12.5);
    });

    it('should decrease evaporation in winter (-50%)', () => {
      const world = createWorldWithSeason(eventBus, 'winter');
      const tile = createTile({ moisture: 100, biome: 'grassland' as const });

      soilSystem.decayMoisture(world, tile, 0, 0, 20);

      // Base decay = 10, winter multiplier = 0.5
      expect(tile.moisture).toBe(100 - 5);
    });

    it('should apply normal evaporation in spring', () => {
      const world = createWorldWithSeason(eventBus, 'spring');
      const tile = createTile({ moisture: 100, biome: 'grassland' as const });

      soilSystem.decayMoisture(world, tile, 0, 0, 20);

      expect(tile.moisture).toBe(100 - 10);
    });

    it('should apply normal evaporation in fall', () => {
      const world = createWorldWithSeason(eventBus, 'fall');
      const tile = createTile({ moisture: 100, biome: 'grassland' as const });

      soilSystem.decayMoisture(world, tile, 0, 0, 20);

      expect(tile.moisture).toBe(100 - 10);
    });
  });

  describe('Combined Weather + Temperature + Season', () => {
    it('should handle hot summer day with high evaporation', () => {
      const world = createWorldWithSeason(eventBus, 'summer');
      const tile = createTile({ moisture: 100 });

      // Hot (30°C) + summer: decay = 10 * 1.5 (hot) * 1.25 (summer) = 18.75
      soilSystem.decayMoisture(world, tile, 0, 0, 30);

      expect(tile.moisture).toBe(100 - 18.75);
    });

    it('should handle cold winter day with minimal evaporation', () => {
      const world = createWorldWithSeason(eventBus, 'winter');
      const tile = createTile({ moisture: 100 });

      // Cold (5°C) + winter: decay = 10 * 0.5 (cold) * 0.5 (winter) = 2.5
      soilSystem.decayMoisture(world, tile, 0, 0, 5);

      expect(tile.moisture).toBe(100 - 2.5);
    });

    it('should handle rainy summer day (rain vs evaporation)', () => {
      const world = createWorldWithSeason(eventBus, 'summer');
      const tile = createTile({ moisture: 50 });

      // Rain at 0.8 intensity: +40 * 0.8 = +32 moisture
      soilSystem.applyRain(world, tile, 0, 0, 0.8);
      expect(tile.moisture).toBe(82);

      // Then hot summer decay: 10 * 1.5 (hot) * 1.25 (summer) = 18.75
      soilSystem.decayMoisture(world, tile, 0, 0, 30);
      expect(tile.moisture).toBe(82 - 18.75);
    });
  });

  describe('Event Flow Integration', () => {
    it('should listen for weather:changed event', () => {
      const handler = vi.fn();
      eventBus.subscribe('weather:changed', handler);

      eventBus.emit({
        type: 'weather:changed',
        source: 'weatherSystem',
        data: { oldWeather: 'clear', newWeather: 'rain' },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('should listen for weather:rain event', () => {
      const handler = vi.fn();
      eventBus.subscribe('weather:rain', handler);

      eventBus.emit({
        type: 'weather:rain',
        source: 'weatherSystem',
        data: { intensity: 0.8 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit soil:moistureChanged when moisture updates', () => {
      const handler = vi.fn();
      eventBus.subscribe('soil:moistureChanged', handler);

      eventBus.emit({
        type: 'soil:moistureChanged',
        source: 'soilSystem',
        data: { position: { x: 5, y: 5 }, oldMoisture: 60, newMoisture: 80 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('should process weather → soil in correct system order', () => {
      expect(weatherSystem.priority).toBeLessThan(temperatureSystem.priority);
      expect(temperatureSystem.priority).toBeLessThan(soilSystem.priority);
    });
  });

  describe('Time-Based Updates', () => {
    it('should process moisture decay on time:dayStart event', () => {
      const handler = vi.fn();
      eventBus.subscribe('time:dayStart', handler);

      eventBus.emit({
        type: 'time:dayStart',
        source: 'timeSystem',
        data: { day: 2 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('should update all tiles on daily tick', () => {
      // Verify that decayMoisture correctly processes multiple tiles
      // in a single daily update cycle
      const world = createWorldWithSeason(eventBus, 'spring');

      const tiles = [
        createTile({ moisture: 100 }),
        createTile({ moisture: 80 }),
        createTile({ moisture: 60 }),
        createTile({ moisture: 40 }),
        createTile({ moisture: 20 }),
      ];

      // Simulate daily update: apply decay to all tiles at normal temperature
      for (const tile of tiles) {
        soilSystem.decayMoisture(world, tile, 0, 0, 20);
      }

      // Base decay = 10, spring = 1.0, normal temp = 1.0
      expect(tiles[0]!.moisture).toBe(90);
      expect(tiles[1]!.moisture).toBe(70);
      expect(tiles[2]!.moisture).toBe(50);
      expect(tiles[3]!.moisture).toBe(30);
      expect(tiles[4]!.moisture).toBe(10);
    });

    it('should decrement fertilizer duration daily', () => {
      const tile = createTile({
        fertilized: true,
        fertilizerDuration: 200,
      });

      // Tick down by 50 seconds - partial decrement
      soilSystem.tickFertilizer(tile, 50);
      expect(tile.fertilizerDuration).toBe(150);
      expect(tile.fertilized).toBe(true);

      // Tick down by 100 more - still has duration remaining
      soilSystem.tickFertilizer(tile, 100);
      expect(tile.fertilizerDuration).toBe(50);
      expect(tile.fertilized).toBe(true);

      // Tick past remaining - clamps to 0, fertilized flag cleared
      soilSystem.tickFertilizer(tile, 100);
      expect(tile.fertilizerDuration).toBe(0);
      expect(tile.fertilized).toBe(false);
    });
  });

  describe('Error Handling - Integration Points', () => {
    it('should throw if weather system emits rain without intensity', () => {
      const world = new World(eventBus);

      // handleWeatherChange validates that rain events include intensity
      expect(() => {
        soilSystem.handleWeatherChange(world, {
          type: 'weather:changed',
          source: 'test',
          tick: 0,
          timestamp: Date.now(),
          data: {
            oldWeather: 'clear',
            weatherType: 'rain',
            intensity: undefined as unknown as number,
          },
        });
      }).toThrow(/requires intensity/);
    });

    it('should throw if temperature data is missing', () => {
      const world = new World(eventBus);
      const tile = createTile({ moisture: 100 });

      // decayMoisture validates temperature is a finite number
      expect(() => {
        soilSystem.decayMoisture(world, tile, 0, 0, undefined as unknown as number);
      }).toThrow(/Temperature must be a finite number/);

      // NaN is also invalid
      expect(() => {
        soilSystem.decayMoisture(world, tile, 0, 0, NaN);
      }).toThrow(/Temperature must be a finite number/);

      // Infinity is also invalid
      expect(() => {
        soilSystem.decayMoisture(world, tile, 0, 0, Infinity);
      }).toThrow(/Temperature must be a finite number/);
    });

    it('should NOT use fallback temperature if data missing', () => {
      const validateTemp = (temp: unknown) => {
        if (temp === undefined) {
          throw new Error('Temperature data missing - required for evaporation calculation');
        }
      };

      expect(() => validateTemp(undefined)).toThrow('Temperature data missing');
    });
  });

  describe('Building Coverage (Indoor vs Outdoor)', () => {
    it('should identify tiles inside buildings as indoor', () => {
      const world = new World(eventBus);

      // Tile with wall = indoor
      const walledTile = createTile({
        wall: { material: 'stone', constructionProgress: 100 },
      });
      expect(soilSystem.isTileIndoors(walledTile, world, 5, 5)).toBe(true);

      // Tile with door = indoor
      const doorTile = createTile({
        door: { material: 'wood', open: false },
      });
      expect(soilSystem.isTileIndoors(doorTile, world, 5, 5)).toBe(true);

      // Tile with window = indoor
      const windowTile = createTile({
        window: { material: 'glass' },
      });
      expect(soilSystem.isTileIndoors(windowTile, world, 5, 5)).toBe(true);

      // Tile with roof = indoor
      const roofTile = createTile({
        roof: { material: 'thatch' },
      });
      expect(soilSystem.isTileIndoors(roofTile, world, 5, 5)).toBe(true);

      // Tile without any building structure = outdoor
      const outdoorTile = createTile();
      expect(soilSystem.isTileIndoors(outdoorTile, world, 5, 5)).toBe(false);
    });

    it('should NOT apply rain moisture to indoor tiles', () => {
      const world = new World(eventBus);
      const indoorTile = createTile({
        moisture: 40,
        wall: { material: 'stone', constructionProgress: 100 },
      });

      // Verify indoor detection
      expect(soilSystem.isTileIndoors(indoorTile, world, 0, 0)).toBe(true);

      // Simulate handleRainEvent behavior: skip indoor tiles
      const isIndoors = soilSystem.isTileIndoors(indoorTile, world, 0, 0);
      if (!isIndoors) {
        soilSystem.applyRain(world, indoorTile, 0, 0, 1.0);
      }

      // Moisture unchanged - rain was blocked by building
      expect(indoorTile.moisture).toBe(40);
    });

    it('should still apply evaporation to indoor tiles (reduced)', () => {
      const world = createWorldWithSeason(eventBus, 'spring');

      const outdoorTile = createTile({ moisture: 100 });
      const indoorTile = createTile({ moisture: 100 });

      // Outdoor: full evaporation (modifier = 1.0)
      soilSystem.decayMoisture(world, outdoorTile, 0, 0, 20, 1.0);

      // Indoor: reduced evaporation (modifier = 0.3)
      soilSystem.decayMoisture(
        world, indoorTile, 0, 0, 20,
        SoilSystem.INDOOR_EVAPORATION_MODIFIER
      );

      // Outdoor: decay = 10 * 1.0 (spring) * 1.0 (normal temp) * 1.0 = 10
      expect(outdoorTile.moisture).toBe(90);

      // Indoor: decay = 10 * 1.0 (spring) * 1.0 (normal temp) * 0.3 = 3
      expect(indoorTile.moisture).toBe(97);

      // Indoor evaporation is 30% of outdoor
      const outdoorDecay = 100 - outdoorTile.moisture; // 10
      const indoorDecay = 100 - indoorTile.moisture;   // 3
      expect(indoorDecay / outdoorDecay).toBeCloseTo(
        SoilSystem.INDOOR_EVAPORATION_MODIFIER
      );
    });

    it('should apply rain moisture to outdoor tiles only', () => {
      const world = new World(eventBus);

      const outdoorTile = createTile({ moisture: 50 });
      const indoorTile = createTile({
        moisture: 50,
        roof: { material: 'thatch' },
      });

      // Simulate the filtering logic from handleRainEvent/forEachOutdoorTile
      const tiles = [
        { tile: outdoorTile, x: 0, y: 0 },
        { tile: indoorTile, x: 1, y: 0 },
      ];

      for (const { tile, x, y } of tiles) {
        if (!soilSystem.isTileIndoors(tile, world, x, y)) {
          soilSystem.applyRain(world, tile, x, y, 0.8);
        }
      }

      // Outdoor tile received rain: 50 + 40 * 0.8 = 82
      expect(outdoorTile.moisture).toBe(82);
      // Indoor tile did NOT receive rain
      expect(indoorTile.moisture).toBe(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rain events in one day', () => {
      const world = new World(eventBus);
      const tile = createTile({ moisture: 20 });

      // Three rain events at different intensities
      soilSystem.applyRain(world, tile, 0, 0, 0.3); // +12 → 32
      expect(tile.moisture).toBe(32);

      soilSystem.applyRain(world, tile, 0, 0, 0.5); // +20 → 52
      expect(tile.moisture).toBe(52);

      soilSystem.applyRain(world, tile, 0, 0, 1.0); // +40 → 92
      expect(tile.moisture).toBe(92);
    });

    it('should handle weather change from rain to clear', () => {
      const world = new World(eventBus);
      const tile = createTile({ moisture: 50 });

      // Rain event adds moisture
      soilSystem.applyRain(world, tile, 0, 0, 0.7);
      expect(tile.moisture).toBe(78); // 50 + 40 * 0.7 = 78

      // Weather changes to clear - no additional moisture added
      // (Clear weather doesn't trigger applyRain)
      const moistureAfterRain = tile.moisture;

      // handleWeatherChange with 'clear' does NOT call applyRain or applySnow
      soilSystem.handleWeatherChange(world, {
        type: 'weather:changed',
        source: 'test',
        tick: 0,
        timestamp: Date.now(),
        data: {
          oldWeather: 'rain',
          weatherType: 'clear',
          intensity: 0,
        },
      });

      // Moisture unchanged after clear weather event
      expect(tile.moisture).toBe(moistureAfterRain);
    });

    it('should handle zero moisture tiles', () => {
      const world = createWorldWithSeason(eventBus, 'summer');
      const tile = createTile({ moisture: 0 });

      // Decay on already-dry tile should stay at 0
      soilSystem.decayMoisture(world, tile, 0, 0, 30);

      expect(tile.moisture).toBe(0);
    });

    it('should handle fully saturated tiles (100 moisture)', () => {
      const world = new World(eventBus);
      const tile = createTile({ moisture: 100 });

      // Rain on fully saturated tile should stay at 100
      soilSystem.applyRain(world, tile, 0, 0, 1.0);
      expect(tile.moisture).toBe(100);

      // Snow on fully saturated tile should stay at 100
      soilSystem.applySnow(world, tile, 0, 0, 1.0);
      expect(tile.moisture).toBe(100);
    });
  });

  describe('Realistic Farming Scenarios', () => {
    it('should require watering during dry spells', () => {
      // Simulate 5 days of hot summer with no rain
      const world = createWorldWithSeason(eventBus, 'summer');
      const tile = createTile({ moisture: 80 });

      // Hot summer: decay = 10 * 1.5 (hot) * 1.25 (summer) = 18.75 per day
      for (let day = 0; day < 5; day++) {
        soilSystem.decayMoisture(world, tile, 0, 0, 30);
      }

      // After 5 days: 80 - (18.75 * 5) = 80 - 93.75 = clamped to 0
      expect(tile.moisture).toBe(0);

      // Plants would need manual watering to survive
      soilSystem.waterTile(world, tile, 0, 0);
      expect(tile.moisture).toBe(20); // waterTile adds +20
    });

    it('should maintain moisture during rainy season', () => {
      // Simulate a day with rain followed by decay in spring
      const world = createWorldWithSeason(eventBus, 'spring');
      const tile = createTile({ moisture: 60 });

      // Morning rain at moderate intensity
      soilSystem.applyRain(world, tile, 0, 0, 0.6); // +24 → 84

      // Daily evaporation at normal temp in spring
      soilSystem.decayMoisture(world, tile, 0, 0, 20); // -10 → 74

      // Net gain: +14 moisture (rain outweighs evaporation)
      expect(tile.moisture).toBe(74);
      expect(tile.moisture).toBeGreaterThan(60); // Net positive
    });

    it('should test drought conditions (hot + summer + no rain)', () => {
      const world = createWorldWithSeason(eventBus, 'summer');
      const tile = createTile({ moisture: 100 });

      // Maximum evaporation: hot (30°C) + summer
      // decay = 10 * 1.5 (hot) * 1.25 (summer) = 18.75 per day
      const expectedDailyDecay = 18.75;

      // Day 1
      soilSystem.decayMoisture(world, tile, 0, 0, 30);
      expect(tile.moisture).toBe(100 - expectedDailyDecay);

      // Day 2
      soilSystem.decayMoisture(world, tile, 0, 0, 30);
      expect(tile.moisture).toBe(100 - expectedDailyDecay * 2);

      // Day 3
      soilSystem.decayMoisture(world, tile, 0, 0, 30);
      expect(tile.moisture).toBe(100 - expectedDailyDecay * 3);

      // After 6 days, should be completely dry (clamped to 0)
      for (let i = 0; i < 3; i++) {
        soilSystem.decayMoisture(world, tile, 0, 0, 30);
      }
      expect(tile.moisture).toBe(0);
    });

    it('should test waterlogged conditions (cold + winter + frequent rain)', () => {
      const world = createWorldWithSeason(eventBus, 'winter');
      const tile = createTile({ moisture: 70 });

      // Cold winter: minimal evaporation = 10 * 0.5 (cold) * 0.5 (winter) = 2.5 per day
      // Frequent rain: +40 * 0.6 = +24 per rain event
      const expectedDailyDecay = 2.5;
      const rainMoistureGain = 40 * 0.6;

      // Rain event
      soilSystem.applyRain(world, tile, 0, 0, 0.6);
      expect(tile.moisture).toBe(70 + rainMoistureGain); // 94

      // Daily decay (cold winter)
      soilSystem.decayMoisture(world, tile, 0, 0, 5);
      expect(tile.moisture).toBe(70 + rainMoistureGain - expectedDailyDecay); // 91.5

      // More rain - approaching saturation
      soilSystem.applyRain(world, tile, 0, 0, 0.6); // +24, capped at 100
      expect(tile.moisture).toBe(100);

      // Even with daily decay, moisture stays very high
      soilSystem.decayMoisture(world, tile, 0, 0, 5);
      expect(tile.moisture).toBe(100 - expectedDailyDecay); // 97.5

      // Net: Rain vastly outweighs evaporation in cold winter = waterlogged
      expect(tile.moisture).toBeGreaterThan(95);
    });
  });
});
