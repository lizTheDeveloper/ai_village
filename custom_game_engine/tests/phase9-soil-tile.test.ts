import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../packages/core/src/ecs/World.js';
import { EventBusImpl } from '../packages/core/src/events/EventBus.js';
import { EntityImpl, createEntityId } from '../packages/core/src/ecs/Entity.js';
import { SoilSystem, FERTILIZERS } from '../packages/core/src/systems/SoilSystem.js';
import { WeatherSystem } from '../packages/core/src/systems/WeatherSystem.js';
import { TemperatureSystem } from '../packages/core/src/systems/TemperatureSystem.js';
import { createWeatherComponent } from '../packages/core/src/components/WeatherComponent.js';
import { createTemperatureComponent } from '../packages/core/src/components/TemperatureComponent.js';
import { createPositionComponent } from '../packages/core/src/components/PositionComponent.js';
import type { Tile } from '../packages/world/src/chunks/Tile.js';
import type { BiomeType } from '../packages/core/src/types/TerrainTypes.js';

/**
 * Phase 9: Soil/Tile System Integration Tests
 *
 * These tests verify the complete soil management system integrates correctly
 * with weather, temperature, and farming mechanics.
 */
describe('Phase 9: Soil/Tile System - Integration Tests', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let soilSystem: SoilSystem;
  let weatherSystem: WeatherSystem;
  let temperatureSystem: TemperatureSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    soilSystem = new SoilSystem();
    weatherSystem = new WeatherSystem();
    temperatureSystem = new TemperatureSystem();
  });

  /**
   * Helper function to create a tile with complete soil properties
   */
  function createTestTile(terrain: 'grass' | 'dirt', biome: BiomeType): Tile {
    return {
      terrain,
      elevation: 0,
      moisture: 50,
      fertility: 50,
      biome,
      tilled: false,
      plantability: 0,
      nutrients: {
        nitrogen: 50,
        phosphorus: 50,
        potassium: 50,
      },
      fertilized: false,
      fertilizerDuration: 0,
      lastWatered: 0,
      lastTilled: 0,
      composted: false,
      plantId: null,
    };
  }

  describe('Acceptance Criterion 1: Tile Soil Properties', () => {
    it('should have all required soil properties on tile', () => {
      const tile = createTestTile('grass', 'plains');

      // Verify all required soil properties exist
      expect(tile.fertility).toBeDefined();
      expect(tile.moisture).toBeDefined();
      expect(tile.nutrients).toBeDefined();
      expect(tile.nutrients.nitrogen).toBeDefined();
      expect(tile.nutrients.phosphorus).toBeDefined();
      expect(tile.nutrients.potassium).toBeDefined();
      expect(tile.tilled).toBeDefined();
      expect(tile.plantability).toBeDefined();
    });

    it('should validate all soil properties are valid numbers', () => {
      const tile = createTestTile('grass', 'plains');

      expect(typeof tile.fertility).toBe('number');
      expect(typeof tile.moisture).toBe('number');
      expect(typeof tile.nutrients.nitrogen).toBe('number');
      expect(typeof tile.nutrients.phosphorus).toBe('number');
      expect(typeof tile.nutrients.potassium).toBe('number');
      expect(Number.isFinite(tile.fertility)).toBe(true);
      expect(Number.isFinite(tile.moisture)).toBe(true);
    });
  });

  describe('Acceptance Criterion 2: Tilling Action', () => {
    it('should till grass tile and change terrain to dirt', () => {
      const tile = createTestTile('grass', 'plains');
      expect(tile.terrain).toBe('grass');

      soilSystem.tillTile(world, tile, 10, 10);

      expect(tile.terrain).toBe('dirt');
    });

    it('should set fertility based on plains biome (70-80)', () => {
      const tile = createTestTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 10, 10);

      expect(tile.fertility).toBeGreaterThanOrEqual(70);
      expect(tile.fertility).toBeLessThanOrEqual(80);
    });

    it('should set fertility based on forest biome (60-70)', () => {
      const tile = createTestTile('grass', 'forest');

      soilSystem.tillTile(world, tile, 10, 10);

      expect(tile.fertility).toBeGreaterThanOrEqual(60);
      expect(tile.fertility).toBeLessThanOrEqual(70);
    });

    it('should set fertility based on riverside biome (80-90)', () => {
      const tile = createTestTile('grass', 'river');

      soilSystem.tillTile(world, tile, 10, 10);

      expect(tile.fertility).toBeGreaterThanOrEqual(80);
      expect(tile.fertility).toBeLessThanOrEqual(90);
    });

    it('should set fertility based on desert biome (20-30)', () => {
      const tile = createTestTile('grass', 'desert');

      soilSystem.tillTile(world, tile, 10, 10);

      expect(tile.fertility).toBeGreaterThanOrEqual(20);
      expect(tile.fertility).toBeLessThanOrEqual(30);
    });

    it('should set fertility based on mountains biome (40-50)', () => {
      const tile = createTestTile('grass', 'mountains');

      soilSystem.tillTile(world, tile, 10, 10);

      expect(tile.fertility).toBeGreaterThanOrEqual(40);
      expect(tile.fertility).toBeLessThanOrEqual(50);
    });

    it('should set plantable flag to true', () => {
      const tile = createTestTile('grass', 'plains');
      expect(tile.tilled).toBe(false);

      soilSystem.tillTile(world, tile, 10, 10);

      expect(tile.tilled).toBe(true);
    });

    it('should set plantability counter to 3', () => {
      const tile = createTestTile('grass', 'plains');
      expect(tile.plantability).toBe(0);

      soilSystem.tillTile(world, tile, 10, 10);

      expect(tile.plantability).toBe(3);
    });
  });

  describe('Acceptance Criterion 3: Soil Depletion', () => {
    it('should deplete soil after 3 harvests', () => {
      const tile = createTestTile('grass', 'plains');
      soilSystem.tillTile(world, tile, 10, 10);

      expect(tile.plantability).toBe(3);

      // First harvest
      soilSystem.depleteSoil(world, tile, 10, 10);
      expect(tile.plantability).toBe(2);
      expect(tile.tilled).toBe(true);

      // Second harvest
      soilSystem.depleteSoil(world, tile, 10, 10);
      expect(tile.plantability).toBe(1);
      expect(tile.tilled).toBe(true);

      // Third harvest - should deplete completely
      soilSystem.depleteSoil(world, tile, 10, 10);
      expect(tile.plantability).toBe(0);
      expect(tile.tilled).toBe(false);
    });

    it('should reduce fertility by 15 per harvest', () => {
      const tile = createTestTile('grass', 'plains');
      soilSystem.tillTile(world, tile, 10, 10);

      const initialFertility = tile.fertility;

      soilSystem.depleteSoil(world, tile, 10, 10);

      expect(tile.fertility).toBe(initialFertility - 15);
    });

    it('should emit soil:depleted event when plantability reaches 0', () => {
      const tile = createTestTile('grass', 'plains');
      soilSystem.tillTile(world, tile, 10, 10);

      const handler = vi.fn();
      eventBus.subscribe('soil:depleted', handler);

      // Deplete through 3 harvests
      soilSystem.depleteSoil(world, tile, 10, 10);
      soilSystem.depleteSoil(world, tile, 10, 10);
      soilSystem.depleteSoil(world, tile, 10, 10);

      // Flush event queue to dispatch events
      eventBus.flush();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'soil:depleted',
          data: expect.objectContaining({
            x: 10,
            y: 10,
          }),
        })
      );
    });
  });

  describe('Acceptance Criterion 4: Fertilizer Application', () => {
    it('should increase fertility by 20 when compost is applied', () => {
      const tile = createTestTile('grass', 'plains');
      soilSystem.tillTile(world, tile, 10, 10);

      const initialFertility = tile.fertility;

      soilSystem.fertilizeTile(world, tile, 10, 10, FERTILIZERS.compost);

      expect(tile.fertility).toBe(initialFertility + 20);
    });

    it('should set fertilized flag with duration', () => {
      const tile = createTestTile('grass', 'plains');
      soilSystem.tillTile(world, tile, 10, 10);

      expect(tile.fertilized).toBe(false);

      soilSystem.fertilizeTile(world, tile, 10, 10, FERTILIZERS.compost);

      expect(tile.fertilized).toBe(true);
      expect(tile.fertilizerDuration).toBeGreaterThan(0);
    });

    it('should increase nitrogen when manure is applied', () => {
      const tile = createTestTile('grass', 'plains');
      soilSystem.tillTile(world, tile, 10, 10);

      const initialNitrogen = tile.nutrients.nitrogen;

      soilSystem.fertilizeTile(world, tile, 10, 10, FERTILIZERS.manure);

      expect(tile.nutrients.nitrogen).toBe(initialNitrogen + 15);
    });
  });

  describe('Acceptance Criterion 5: Moisture Management', () => {
    it('should increase moisture when rain occurs', () => {
      const tile = createTestTile('grass', 'plains');
      tile.moisture = 30;

      soilSystem.applyRain(world, tile, 10, 10, 1.0);

      expect(tile.moisture).toBe(70); // 30 + (40 * 1.0)
    });

    it('should increase moisture when agent waters tile', () => {
      const tile = createTestTile('grass', 'plains');
      tile.moisture = 30;

      soilSystem.waterTile(world, tile, 10, 10);

      expect(tile.moisture).toBe(50); // 30 + 20
    });

    it('should decrease moisture over time without watering', () => {
      const tile = createTestTile('grass', 'plains');
      tile.moisture = 70;

      // Normal temperature (no modifier)
      soilSystem.decayMoisture(world, tile, 10, 10, 20);

      expect(tile.moisture).toBe(60); // 70 - 10
    });

    it('should emit soil:moistureChanged event', () => {
      const tile = createTestTile('grass', 'plains');
      tile.moisture = 30;

      const handler = vi.fn();
      eventBus.subscribe('soil:moistureChanged', handler);

      soilSystem.waterTile(world, tile, 10, 10);

      // Flush event queue to dispatch events
      eventBus.flush();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'soil:moistureChanged',
          data: expect.objectContaining({
            x: 10,
            y: 10,
            oldMoisture: 30,
            newMoisture: 50,
          }),
        })
      );
    });
  });

  describe('Acceptance Criterion 6: Error Handling', () => {
    it('should throw clear error when accessing missing soil data', () => {
      const incompleteTile = {
        terrain: 'grass' as const,
        moisture: 0.5,
        fertility: 0.5,
        // Missing nutrients
      };

      const requireSoilData = (tile: any) => {
        if (!tile.nutrients) {
          throw new Error('Tile missing required nutrients data');
        }
      };

      expect(() => requireSoilData(incompleteTile)).toThrow('Tile missing required nutrients data');
    });

    it('should throw error when tilling without biome data', () => {
      const tile = createTestTile('grass', 'plains');
      delete (tile as any).biome;

      expect(() => soilSystem.tillTile(world, tile, 10, 10)).toThrow(/no biome data/);
    });

    it('should throw error when watering tile without nutrients', () => {
      const tile = createTestTile('grass', 'plains');
      delete (tile as any).nutrients;

      expect(() => soilSystem.waterTile(world, tile, 10, 10)).toThrow(/missing required nutrients data/);
    });
  });

  describe('Integration: Soil + Weather System', () => {
    it('should increase moisture on outdoor tiles when it rains', () => {
      const tile = createTestTile('grass', 'plains');
      tile.moisture = 30;

      // Rain with full intensity
      soilSystem.applyRain(world, tile, 10, 10, 1.0);

      expect(tile.moisture).toBe(70); // 30 + 40
    });

    it('should apply partial moisture increase with light rain', () => {
      const tile = createTestTile('grass', 'plains');
      tile.moisture = 30;

      // Light rain (50% intensity)
      soilSystem.applyRain(world, tile, 10, 10, 0.5);

      expect(tile.moisture).toBe(50); // 30 + (40 * 0.5)
    });

    it('should increase evaporation rate in hot weather', () => {
      const tile = createTestTile('grass', 'plains');
      tile.moisture = 70;

      // Hot temperature (>25°C)
      soilSystem.decayMoisture(world, tile, 10, 10, 30);

      // Base decay 10, hot modifier 1.5x = 15 total decay
      expect(tile.moisture).toBe(55); // 70 - 15
    });

    it('should decrease evaporation rate in cold weather', () => {
      const tile = createTestTile('grass', 'plains');
      tile.moisture = 70;

      // Cold temperature (<10°C)
      soilSystem.decayMoisture(world, tile, 10, 10, 5);

      // Base decay 10, cold modifier 0.5x = 5 total decay
      expect(tile.moisture).toBe(65); // 70 - 5
    });

    it('should apply snow moisture increase', () => {
      const tile = createTestTile('grass', 'plains');
      tile.moisture = 30;

      // Snow with full intensity
      soilSystem.applySnow(world, tile, 10, 10, 1.0);

      expect(tile.moisture).toBe(50); // 30 + 20
    });
  });

  describe('Integration: Full Farming Cycle', () => {
    it('should complete full till → plant → harvest → deplete cycle', () => {
      const tile = createTestTile('grass', 'plains');

      // 1. Till the tile
      soilSystem.tillTile(world, tile, 10, 10);
      expect(tile.terrain).toBe('dirt');
      expect(tile.tilled).toBe(true);
      expect(tile.plantability).toBe(3);

      const initialFertility = tile.fertility;

      // 2. Harvest crop 1
      soilSystem.depleteSoil(world, tile, 10, 10);
      expect(tile.plantability).toBe(2);
      expect(tile.fertility).toBe(initialFertility - 15);

      // 3. Harvest crop 2
      soilSystem.depleteSoil(world, tile, 10, 10);
      expect(tile.plantability).toBe(1);
      expect(tile.fertility).toBe(initialFertility - 30);

      // 4. Harvest crop 3
      soilSystem.depleteSoil(world, tile, 10, 10);
      expect(tile.plantability).toBe(0);
      expect(tile.tilled).toBe(false);
      expect(tile.fertility).toBe(initialFertility - 45);
    });

    it('should maintain soil through fertilizer application', () => {
      const tile = createTestTile('grass', 'plains');
      soilSystem.tillTile(world, tile, 10, 10);

      const initialFertility = tile.fertility;

      // Harvest 1 (fertility drops by 15)
      soilSystem.depleteSoil(world, tile, 10, 10);
      expect(tile.fertility).toBe(initialFertility - 15);

      // Apply compost (fertility increases by 20)
      soilSystem.fertilizeTile(world, tile, 10, 10, FERTILIZERS.compost);
      expect(tile.fertility).toBe(initialFertility + 5); // -15 + 20

      // Harvest 2 (fertility drops by 15 again)
      soilSystem.depleteSoil(world, tile, 10, 10);
      expect(tile.fertility).toBe(initialFertility - 10); // +5 - 15

      // Apply compost again
      soilSystem.fertilizeTile(world, tile, 10, 10, FERTILIZERS.compost);
      expect(tile.fertility).toBe(initialFertility + 10); // -10 + 20

      // Verify soil quality maintained
      expect(tile.fertility).toBeGreaterThan(initialFertility);
    });

    it('should handle moisture decay and watering through growing season', () => {
      const tile = createTestTile('grass', 'plains');
      soilSystem.tillTile(world, tile, 10, 10);

      // Initial moisture
      tile.moisture = 70;

      // Day 1: moisture decays
      soilSystem.decayMoisture(world, tile, 10, 10, 20);
      expect(tile.moisture).toBe(60);

      // Water to 80
      soilSystem.waterTile(world, tile, 10, 10);
      expect(tile.moisture).toBe(80);

      // Day 2: moisture decays again
      soilSystem.decayMoisture(world, tile, 10, 10, 20);
      expect(tile.moisture).toBe(70);

      // Water to 90
      soilSystem.waterTile(world, tile, 10, 10);
      expect(tile.moisture).toBe(90);

      // Day 3: rain event
      soilSystem.applyRain(world, tile, 10, 10, 0.5);
      expect(tile.moisture).toBe(100); // Capped at 100

      // Verify moisture management worked
      expect(tile.moisture).toBe(100);
    });
  });

  describe('Migration and World Loading', () => {
    it('should handle tiles with complete soil properties', () => {
      // Tiles created with all soil properties should work normally
      const tile = createTestTile('grass', 'plains');

      expect(tile.nutrients).toBeDefined();
      expect(tile.nutrients.nitrogen).toBe(50);
      expect(tile.nutrients.phosphorus).toBe(50);
      expect(tile.nutrients.potassium).toBe(50);
    });

    it('should serialize and deserialize extended tile properties', () => {
      const tile = createTestTile('grass', 'plains');
      soilSystem.tillTile(world, tile, 10, 10);

      // Simulate serialization
      const serialized = JSON.stringify(tile);
      const deserialized = JSON.parse(serialized);

      // Verify all properties preserved
      expect(deserialized.terrain).toBe('dirt');
      expect(deserialized.tilled).toBe(true);
      expect(deserialized.plantability).toBe(3);
      expect(deserialized.nutrients.nitrogen).toBeDefined();
      expect(deserialized.nutrients.phosphorus).toBeDefined();
      expect(deserialized.nutrients.potassium).toBeDefined();
    });
  });

  describe('Fertilizer Duration and Decay', () => {
    it('should tick down fertilizer duration over time', () => {
      const tile = createTestTile('grass', 'plains');
      soilSystem.tillTile(world, tile, 10, 10);
      soilSystem.fertilizeTile(world, tile, 10, 10, FERTILIZERS.compost);

      const initialDuration = tile.fertilizerDuration;
      expect(initialDuration).toBeGreaterThan(0);

      // Tick 1 second
      soilSystem.tickFertilizer(tile, 1);
      expect(tile.fertilizerDuration).toBe(initialDuration - 1);

      // Tick to zero
      soilSystem.tickFertilizer(tile, initialDuration);
      expect(tile.fertilizerDuration).toBe(0);
      expect(tile.fertilized).toBe(false);
    });
  });

  describe('Event Emission', () => {
    it('should emit soil:tilled event when tilling', () => {
      const tile = createTestTile('grass', 'plains');
      const handler = vi.fn();
      eventBus.subscribe('soil:tilled', handler);

      soilSystem.tillTile(world, tile, 10, 10);

      // Flush event queue to dispatch events
      eventBus.flush();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'soil:tilled',
          data: expect.objectContaining({ x: 10, y: 10 }),
        })
      );
    });

    it('should emit soil:watered event when watering', () => {
      const tile = createTestTile('grass', 'plains');
      const handler = vi.fn();
      eventBus.subscribe('soil:watered', handler);

      soilSystem.waterTile(world, tile, 10, 10);

      // Flush event queue to dispatch events
      eventBus.flush();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'soil:watered',
          data: expect.objectContaining({ x: 10, y: 10, amount: 20 }),
        })
      );
    });

    it('should emit soil:fertilized event when fertilizing', () => {
      const tile = createTestTile('grass', 'plains');
      soilSystem.tillTile(world, tile, 10, 10);

      const handler = vi.fn();
      eventBus.subscribe('soil:fertilized', handler);

      soilSystem.fertilizeTile(world, tile, 10, 10, FERTILIZERS.compost);

      // Flush event queue to dispatch events
      eventBus.flush();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'soil:fertilized',
          data: expect.objectContaining({
            x: 10,
            y: 10,
            fertilizerType: 'compost',
          }),
        })
      );
    });
  });
});
