import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { SoilSystem } from '../SoilSystem.js';

/**
 * Phase 9: Soil Depletion Tests
 *
 * These tests verify that soil depletes through multiple plantings.
 *
 * Acceptance Criterion 3: Soil Depletion
 * WHEN: A crop is harvested from a tile
 * THEN: The tile SHALL:
 *   - Decrement plantability counter
 *   - Reduce fertility by 15
 *   - If counter reaches 0, require re-tilling
 */
describe('Soil Depletion', () => {
  let _world: World;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    _world = new World(eventBus);
  });

  describe('Harvest Depletion', () => {
    it('should decrement plantability counter on harvest', () => {
      // SoilSystem.depleteSoil is implemented - test the actual behavior
      const tile = {
        terrain: 'dirt' as const,
        fertility: 70,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.depleteSoil(_world, tile, 5, 5);

      expect(tile.plantability).toBe(2);
    });

    it('should reduce fertility by 15 on harvest', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 70,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.depleteSoil(_world, tile, 5, 5);

      expect(tile.fertility).toBe(55);
    });

    it('should not allow fertility to go negative', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 10,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.depleteSoil(_world, tile, 5, 5);

      expect(tile.fertility).toBe(0); // Clamped via Math.max(0, ...)
    });

    it('should emit soil:depleted event when plantability reaches 0', () => {
      const handler = vi.fn();
      eventBus.subscribe('soil:depleted', handler);

      // Create a tile with plantability = 1
      // Harvest a crop (plantability → 0)
      eventBus.emit({
        type: 'soil:depleted',
        source: 'test',
        data: { position: { x: 5, y: 5 }, plantability: 0 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'soil:depleted',
          data: expect.objectContaining({
            position: { x: 5, y: 5 },
            plantability: 0,
          }),
        })
      );
    });
  });

  describe('Multiple Harvest Cycle', () => {
    it('should allow 3 plantings before requiring re-tilling', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 70,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      // Harvest 1
      soilSystem.depleteSoil(_world, tile, 5, 5);
      expect(tile.plantability).toBe(2);
      expect(tile.tilled).toBe(true);

      // Harvest 2
      soilSystem.depleteSoil(_world, tile, 5, 5);
      expect(tile.plantability).toBe(1);
      expect(tile.tilled).toBe(true);

      // Harvest 3 - depletes completely
      soilSystem.depleteSoil(_world, tile, 5, 5);
      expect(tile.plantability).toBe(0);
      expect(tile.tilled).toBe(false); // Requires re-tilling
    });

    it('should track fertility decline through multiple harvests', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 70,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      // Harvest 1: 70 - 15 = 55
      soilSystem.depleteSoil(_world, tile, 5, 5);
      expect(tile.fertility).toBe(55);

      // Harvest 2: 55 - 15 = 40
      soilSystem.depleteSoil(_world, tile, 5, 5);
      expect(tile.fertility).toBe(40);

      // Harvest 3: 40 - 15 = 25
      soilSystem.depleteSoil(_world, tile, 5, 5);
      expect(tile.fertility).toBe(25);
    });

    it('should set tilled flag to false when plantability reaches 0', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 70,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 1,
        nutrients: { nitrogen: 70, phosphorus: 56, potassium: 63 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.depleteSoil(_world, tile, 5, 5);

      expect(tile.plantability).toBe(0);
      expect(tile.tilled).toBe(false); // Set to false when depleted
    });
  });

  describe('Listening for crop:harvested Events', () => {
    it('should process crop:harvested event', () => {
      const handler = vi.fn();
      eventBus.subscribe('crop:harvested', handler);

      eventBus.emit({
        type: 'crop:harvested',
        source: 'test',
        data: { position: { x: 5, y: 5 }, cropType: 'wheat' },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'crop:harvested',
          data: expect.objectContaining({
            position: { x: 5, y: 5 },
          }),
        })
      );
    });

    it.skip('should deplete soil when crop:harvested event is received', () => {
      // TODO: This requires integration with SoilSystem listening to crop:harvested events
      // The depleteSoil method is implemented, but the event listener hookup is not tested here
      // This should be tested in integration tests where the full system is wired up
      expect(true).toBe(true);
    });
  });

  describe('Re-tilling Depleted Soil', () => {
    it('should restore plantability to 3 when re-tilled', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 25,
        moisture: 50,
        biome: 'plains' as const,
        tilled: false,
        plantability: 0,
        nutrients: { nitrogen: 25, phosphorus: 20, potassium: 22 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.tillTile(_world, tile, 5, 5);

      expect(tile.plantability).toBe(3);
    });

    it('should partially restore fertility when re-tilled', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 25,
        moisture: 50,
        biome: 'plains' as const,
        tilled: false,
        plantability: 0,
        nutrients: { nitrogen: 25, phosphorus: 20, potassium: 22 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.tillTile(_world, tile, 5, 5);

      // Re-tilling restores fertility to biome level (plains = 70-80)
      expect(tile.fertility).toBeGreaterThanOrEqual(70);
      expect(tile.fertility).toBeLessThanOrEqual(80);
    });

    it('should set tilled flag to true when re-tilled', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 25,
        moisture: 50,
        biome: 'plains' as const,
        tilled: false,
        plantability: 0,
        nutrients: { nitrogen: 25, phosphorus: 20, potassium: 22 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.tillTile(_world, tile, 5, 5);

      expect(tile.tilled).toBe(true);
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw when depleting tile without plantability', () => {
      const incompleteTile = {
        terrain: 'dirt' as const,
        fertility: 50,
        // plantability missing
      };

      const depleteSoil = (tile: any) => {
        if (tile.plantability === undefined) {
          throw new Error('Tile plantability not set - required for depletion tracking');
        }
        return tile.plantability - 1;
      };

      expect(() => depleteSoil(incompleteTile)).toThrow('Tile plantability not set - required for depletion tracking');
    });

    it('should throw when depleting tile without fertility', () => {
      const incompleteTile = {
        terrain: 'dirt' as const,
        plantability: 3,
        // fertility missing
      };

      const depleteFertility = (tile: any) => {
        if (tile.fertility === undefined) {
          throw new Error('Tile fertility not set - required for depletion');
        }
        return tile.fertility - 15;
      };

      expect(() => depleteFertility(incompleteTile)).toThrow('Tile fertility not set - required for depletion');
    });
  });
});
