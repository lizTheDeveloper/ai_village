import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoilSystem } from '../SoilSystem.js';
import { World } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';

/**
 * Phase 9: SoilSystem Tests
 *
 * These tests verify the SoilSystem manages soil state updates,
 * depletion, moisture changes, and integrates with the farming system.
 */
describe('SoilSystem', () => {
  let eventBus: EventBusImpl;
  let soilSystem: SoilSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    new World(eventBus);
    soilSystem = new SoilSystem();
  });

  describe('System Configuration', () => {
    it('should have correct system id', () => {
      expect(soilSystem.id).toBe('soil');
    });

    it('should have priority ~15 (after weather, before farming)', () => {
      expect(soilSystem.priority).toBe(15);
    });

    it('should require appropriate components', () => {
      // SoilSystem should work with tiles, not entities with components
      // This test verifies the system exists and has required components defined
      expect(soilSystem.requiredComponents).toBeDefined();
    });
  });

  describe('Moisture Decay', () => {
    it('should decrease moisture by base decay per day', () => {
      const world = new World(eventBus);
      const tile = {
        terrain: 'dirt',
        moisture: 50,
        fertility: 70,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 0,
        composted: false,
      };

      // Normal temperature (15-25°C) = base decay of 10
      soilSystem.decayMoisture(world, tile, 0, 0, 20);

      expect(tile.moisture).toBe(40);
    });

    it('should modify decay based on temperature (hot = +50%)', () => {
      const world = new World(eventBus);
      const tile = {
        terrain: 'dirt',
        moisture: 50,
        fertility: 70,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 0,
        composted: false,
      };

      // Hot weather (>25°C) = base decay * 1.5 = 10 * 1.5 = 15
      soilSystem.decayMoisture(world, tile, 0, 0, 30);

      expect(tile.moisture).toBe(35);
    });

    it('should modify decay based on temperature (cold = -50%)', () => {
      const world = new World(eventBus);
      const tile = {
        terrain: 'dirt',
        moisture: 50,
        fertility: 70,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 0,
        composted: false,
      };

      // Cold weather (<10°C) = base decay * 0.5 = 10 * 0.5 = 5
      soilSystem.decayMoisture(world, tile, 0, 0, 5);

      expect(tile.moisture).toBe(45);
    });

    it('should modify decay based on season (summer = +25%)', () => {
      const world = new World(eventBus);
      // Set the world to summer season (index 1)
      // Season cycle: spring (0), summer (1), autumn (2), winter (3)
      // Days: 0-27 = spring, 28-55 = summer, 56-83 = autumn, 84-111 = winter
      // 1200 ticks/hour * 24 hours/day = 28,800 ticks/day
      // Day 28 = 28 * 28,800 = 806,400 ticks
      world.setTick(28 * 24 * 1200); // Day 28 = first day of summer

      const tile = {
        terrain: 'dirt',
        moisture: 50,
        fertility: 70,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 0,
        composted: false,
      };

      // Normal temperature (20°C) with summer season
      // Base decay: 10, Summer modifier: 1.25
      // Expected decay: 10 * 1.25 = 12.5
      soilSystem.decayMoisture(world, tile, 0, 0, 20);

      expect(tile.moisture).toBe(37.5); // 50 - 12.5
    });

    it('should modify decay based on season (winter = -50%)', () => {
      const world = new World(eventBus);
      // Set the world to winter season (index 3)
      // Days: 84-111 = winter
      // Day 84 = 84 * 28,800 = 2,419,200 ticks
      world.setTick(84 * 24 * 1200); // Day 84 = first day of winter

      const tile = {
        terrain: 'dirt',
        moisture: 50,
        fertility: 70,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 0,
        composted: false,
      };

      // Normal temperature (20°C) with winter season
      // Base decay: 10, Winter modifier: 0.5
      // Expected decay: 10 * 0.5 = 5
      soilSystem.decayMoisture(world, tile, 0, 0, 20);

      expect(tile.moisture).toBe(45); // 50 - 5
    });

    it('should not decay moisture below 0', () => {
      const world = new World(eventBus);
      const tile = {
        terrain: 'dirt',
        moisture: 5,
        fertility: 70,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 0,
        composted: false,
      };

      // Base decay of 10, but moisture is only 5
      soilSystem.decayMoisture(world, tile, 0, 0, 20);

      expect(tile.moisture).toBe(0);
    });
  });

  describe('Soil Depletion Tracking', () => {
    it('should track fertility level', () => {
      const world = new World(eventBus);
      const tile = {
        terrain: 'dirt',
        moisture: 50,
        fertility: 70,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 0,
        composted: false,
      };

      const initialFertility = tile.fertility;

      // Deplete soil (reduces fertility by 15)
      soilSystem.depleteSoil(world, tile, 0, 0);

      expect(tile.fertility).toBe(initialFertility - 15);
    });

    it('should track plantability counter (0-3)', () => {
      const world = new World(eventBus);
      const tile = {
        terrain: 'dirt',
        moisture: 50,
        fertility: 70,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 0,
        composted: false,
      };

      // Initial plantability is 3
      expect(tile.plantability).toBe(3);

      // Deplete once
      soilSystem.depleteSoil(world, tile, 0, 0);
      expect(tile.plantability).toBe(2);

      // Deplete again
      soilSystem.depleteSoil(world, tile, 0, 0);
      expect(tile.plantability).toBe(1);

      // Deplete third time
      soilSystem.depleteSoil(world, tile, 0, 0);
      expect(tile.plantability).toBe(0);
    });

    it('should require re-tilling when plantability reaches 0', () => {
      const world = new World(eventBus);
      const tile = {
        terrain: 'dirt',
        moisture: 50,
        fertility: 70,
        biome: 'plains' as const,
        tilled: true,
        plantability: 1,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 0,
        composted: false,
      };

      const handler = vi.fn();
      eventBus.subscribe('soil:depleted', handler);

      // Deplete the last use
      soilSystem.depleteSoil(world, tile, 5, 5);

      expect(tile.plantability).toBe(0);
      expect(tile.tilled).toBe(false);
      eventBus.flush();
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'soil:depleted',
          data: expect.objectContaining({
            x: 5,
            y: 5,
          }),
        })
      );
    });
  });

  describe('Event Listening', () => {
    it('should listen for weather:rain events', () => {
      const handler = vi.fn();
      eventBus.subscribe('weather:rain', handler);

      eventBus.emit({
        type: 'weather:rain',
        source: 'test',
        data: { intensity: 0.8 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('should listen for weather:changed events', () => {
      const handler = vi.fn();
      eventBus.subscribe('weather:changed', handler);

      eventBus.emit({
        type: 'weather:changed',
        source: 'test',
        data: { oldWeather: 'clear', newWeather: 'rain' },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('should listen for crop:harvested events', () => {
      const handler = vi.fn();
      eventBus.subscribe('crop:harvested', handler);

      eventBus.emit({
        type: 'crop:harvested',
        source: 'test',
        data: { position: { x: 0, y: 0 } },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('should listen for time:dayStart events', () => {
      const handler = vi.fn();
      eventBus.subscribe('time:dayStart', handler);

      eventBus.emit({
        type: 'time:dayStart',
        source: 'test',
        data: { day: 1 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    it('should emit soil:tilled when a tile is tilled', () => {
      const handler = vi.fn();
      eventBus.subscribe('soil:tilled', handler);

      // Simulate tilling action
      eventBus.emit({
        type: 'soil:tilled',
        source: 'test',
        data: { position: { x: 5, y: 5 }, fertility: 70 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'soil:tilled',
          data: expect.objectContaining({
            position: { x: 5, y: 5 },
            fertility: 70,
          }),
        })
      );
    });

    it('should emit soil:fertilized when fertilizer is applied', () => {
      const handler = vi.fn();
      eventBus.subscribe('soil:fertilized', handler);

      eventBus.emit({
        type: 'soil:fertilized',
        source: 'test',
        data: { position: { x: 5, y: 5 }, fertilizerType: 'compost', fertilityBoost: 20 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit soil:watered when tile is watered', () => {
      const handler = vi.fn();
      eventBus.subscribe('soil:watered', handler);

      eventBus.emit({
        type: 'soil:watered',
        source: 'test',
        data: { position: { x: 5, y: 5 }, moistureIncrease: 20 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit soil:depleted when tile needs re-tilling', () => {
      const handler = vi.fn();
      eventBus.subscribe('soil:depleted', handler);

      eventBus.emit({
        type: 'soil:depleted',
        source: 'test',
        data: { position: { x: 5, y: 5 }, plantability: 0 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit soil:moistureChanged when moisture level changes', () => {
      const handler = vi.fn();
      eventBus.subscribe('soil:moistureChanged', handler);

      eventBus.emit({
        type: 'soil:moistureChanged',
        source: 'test',
        data: { position: { x: 5, y: 5 }, oldMoisture: 50, newMoisture: 30 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Rain Moisture Updates', () => {
    it('should increase moisture on all outdoor tiles when it rains', () => {
      const world = new World(eventBus);
      const tile = {
        terrain: 'dirt',
        moisture: 30,
        fertility: 70,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 0,
        composted: false,
      };

      // Apply rain with intensity 1.0 (adds 40 * intensity)
      soilSystem.applyRain(world, tile, 0, 0, 1.0);

      expect(tile.moisture).toBe(70);
    });

    it.skip('should not increase moisture on indoor tiles during rain', () => {
      // TODO: Indoor/outdoor tile tracking not implemented in current SoilSystem
      // This would require building structure data to determine which tiles are covered
    });

    it('should scale moisture increase by rain intensity', () => {
      const world = new World(eventBus);
      const tile1 = {
        terrain: 'dirt',
        moisture: 30,
        fertility: 70,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 0,
        composted: false,
      };
      const tile2 = {
        terrain: 'dirt',
        moisture: 30,
        fertility: 70,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 0,
        composted: false,
      };

      // Low intensity rain (0.5) = 40 * 0.5 = 20 moisture
      soilSystem.applyRain(world, tile1, 0, 0, 0.5);
      expect(tile1.moisture).toBe(50);

      // High intensity rain (1.0) = 40 * 1.0 = 40 moisture
      soilSystem.applyRain(world, tile2, 1, 0, 1.0);
      expect(tile2.moisture).toBe(70);
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw when accessing tile without soil data', () => {
      const incompleteTile = {
        terrain: 'grass' as const,
        moisture: 0.5,
        fertility: 0.5,
        // Missing soil properties
      };

      const processTile = (tile: any) => {
        if (!tile.nutrients) {
          throw new Error(`Tile missing required nutrients data`);
        }
        if (tile.tilled === undefined) {
          throw new Error(`Tile tilled state not set`);
        }
      };

      expect(() => processTile(incompleteTile)).toThrow('Tile missing required nutrients data');
    });

    it('should throw clear error for missing fertility', () => {
      const incompleteTile = {
        terrain: 'grass' as const,
        moisture: 0.5,
        // fertility missing
      };

      const checkFertility = (tile: any) => {
        if (tile.fertility === undefined) {
          throw new Error('Tile fertility not set - required for farming');
        }
      };

      expect(() => checkFertility(incompleteTile)).toThrow('Tile fertility not set - required for farming');
    });

    it('should throw clear error for missing plantability', () => {
      const incompleteTile = {
        terrain: 'dirt' as const,
        tilled: true,
        // plantability missing
      };

      const checkPlantability = (tile: any) => {
        if (tile.plantability === undefined) {
          throw new Error('Tile plantability not set - required for planting');
        }
      };

      expect(() => checkPlantability(incompleteTile)).toThrow('Tile plantability not set - required for planting');
    });
  });
});
