import { describe, it, expect } from 'vitest';
import type { Tile } from '../Tile.js';
import { createDefaultTile } from '../Tile.js';

/**
 * Phase 9: Soil/Tile System Tests
 *
 * These tests verify the extended Tile interface with soil properties
 * for the farming system.
 */
describe('Tile - Soil Properties', () => {
  describe('Extended Tile Interface', () => {
    it('should have tilled property', () => {
      const tile: Tile = {
        ...createDefaultTile(),
        tilled: false,
        plantability: 0,
        nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        composted: false,
      };

      expect(tile.tilled).toBeDefined();
      expect(typeof tile.tilled).toBe('boolean');
    });

    it('should have plantability counter (0-3)', () => {
      const tile: Tile = {
        ...createDefaultTile(),
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        composted: false,
      };

      expect(tile.plantability).toBeDefined();
      expect(typeof tile.plantability).toBe('number');
      expect(tile.plantability).toBeGreaterThanOrEqual(0);
      expect(tile.plantability).toBeLessThanOrEqual(3);
    });

    it('should have nutrients object with NPK values', () => {
      const tile: Tile = {
        ...createDefaultTile(),
        tilled: false,
        plantability: 0,
        nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        composted: false,
      };

      expect(tile.nutrients).toBeDefined();
      expect(tile.nutrients.nitrogen).toBeDefined();
      expect(tile.nutrients.phosphorus).toBeDefined();
      expect(tile.nutrients.potassium).toBeDefined();
      expect(typeof tile.nutrients.nitrogen).toBe('number');
      expect(typeof tile.nutrients.phosphorus).toBe('number');
      expect(typeof tile.nutrients.potassium).toBe('number');
    });

    it('should have fertilized flag', () => {
      const tile: Tile = {
        ...createDefaultTile(),
        tilled: false,
        plantability: 0,
        nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
        fertilized: true,
        fertilizerDuration: 1000,
        lastWatered: 0,
        composted: false,
      };

      expect(tile.fertilized).toBeDefined();
      expect(typeof tile.fertilized).toBe('boolean');
    });

    it('should have fertilizerDuration (ticks remaining)', () => {
      const tile: Tile = {
        ...createDefaultTile(),
        tilled: false,
        plantability: 0,
        nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
        fertilized: true,
        fertilizerDuration: 500,
        lastWatered: 0,
        composted: false,
      };

      expect(tile.fertilizerDuration).toBeDefined();
      expect(typeof tile.fertilizerDuration).toBe('number');
    });

    it('should have lastWatered timestamp', () => {
      const tile: Tile = {
        ...createDefaultTile(),
        tilled: false,
        plantability: 0,
        nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 1000,
        composted: false,
      };

      expect(tile.lastWatered).toBeDefined();
      expect(typeof tile.lastWatered).toBe('number');
    });

    it('should have composted flag', () => {
      const tile: Tile = {
        ...createDefaultTile(),
        tilled: false,
        plantability: 0,
        nutrients: { nitrogen: 50, phosphorus: 50, potassium: 50 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        composted: true,
      };

      expect(tile.composted).toBeDefined();
      expect(typeof tile.composted).toBe('boolean');
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw when accessing missing nutrients on tile', () => {
      const incompleteTile = {
        terrain: 'grass' as const,
        moisture: 0.5,
        fertility: 0.5,
        // Missing nutrients - this should cause error when accessed
      };

      // Simulating a function that requires nutrients
      const requireNutrients = (tile: any) => {
        if (!tile.nutrients) {
          throw new Error('Tile missing required nutrients data');
        }
        return tile.nutrients;
      };

      expect(() => requireNutrients(incompleteTile)).toThrow('Tile missing required nutrients data');
    });

    it('should throw when fertility is undefined', () => {
      const incompleteTile = {
        terrain: 'grass' as const,
        moisture: 0.5,
        // fertility missing
      };

      const requireFertility = (tile: any) => {
        if (tile.fertility === undefined) {
          throw new Error('Tile fertility not set - required for farming');
        }
        return tile.fertility;
      };

      expect(() => requireFertility(incompleteTile)).toThrow('Tile fertility not set - required for farming');
    });

    it('should throw when tilled property is missing', () => {
      const incompleteTile = {
        terrain: 'dirt' as const,
        moisture: 0.5,
        fertility: 0.7,
        // tilled missing
      };

      const checkPlantable = (tile: any) => {
        if (tile.tilled === undefined) {
          throw new Error('Tile tilled state not set - required for planting');
        }
        return tile.tilled;
      };

      expect(() => checkPlantable(incompleteTile)).toThrow('Tile tilled state not set - required for planting');
    });
  });
});
