/**
 * SpatialGrid Tests
 *
 * Test suite for high-performance spatial hashing system.
 * Covers insert, update, remove, queries, and performance characteristics.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialGrid } from '../SpatialGrid.js';

describe('SpatialGrid', () => {
  let grid: SpatialGrid;

  beforeEach(() => {
    grid = new SpatialGrid(10);
  });

  describe('constructor', () => {
    it('should create grid with default cell size', () => {
      const defaultGrid = new SpatialGrid();
      expect(defaultGrid.size()).toBe(0);
    });

    it('should create grid with custom cell size', () => {
      const customGrid = new SpatialGrid(20);
      expect(customGrid.size()).toBe(0);
    });

    it('should throw error for invalid cell size', () => {
      expect(() => new SpatialGrid(0)).toThrow('Cell size must be positive');
      expect(() => new SpatialGrid(-10)).toThrow('Cell size must be positive');
    });
  });

  describe('insert', () => {
    it('should insert entity at position', () => {
      grid.insert('entity1', 5, 5);
      expect(grid.size()).toBe(1);
    });

    it('should insert multiple entities', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity2', 15, 15);
      grid.insert('entity3', 25, 25);
      expect(grid.size()).toBe(3);
    });

    it('should handle re-insertion (replace)', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity1', 15, 15);
      expect(grid.size()).toBe(1);
    });

    it('should insert entities in same cell', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity2', 6, 6);
      grid.insert('entity3', 7, 7);
      expect(grid.size()).toBe(3);
    });

    it('should handle negative coordinates', () => {
      grid.insert('entity1', -5, -5);
      grid.insert('entity2', -15, -15);
      expect(grid.size()).toBe(2);
    });
  });

  describe('remove', () => {
    it('should remove entity', () => {
      grid.insert('entity1', 5, 5);
      grid.remove('entity1');
      expect(grid.size()).toBe(0);
    });

    it('should remove specific entity from multiple', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity2', 15, 15);
      grid.remove('entity1');
      expect(grid.size()).toBe(1);
    });

    it('should handle removing non-existent entity', () => {
      grid.remove('nonexistent');
      expect(grid.size()).toBe(0);
    });

    it('should remove entity from cell with multiple entities', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity2', 6, 6);
      grid.insert('entity3', 7, 7);
      grid.remove('entity2');
      expect(grid.size()).toBe(2);
    });
  });

  describe('update', () => {
    it('should update entity position within same cell', () => {
      grid.insert('entity1', 5, 5);
      grid.update('entity1', 5, 5, 6, 6);
      expect(grid.size()).toBe(1);

      const nearby = grid.getEntitiesNear(6, 6, 2);
      expect(nearby).toContain('entity1');
    });

    it('should update entity position to different cell', () => {
      grid.insert('entity1', 5, 5);
      grid.update('entity1', 5, 5, 25, 25);
      expect(grid.size()).toBe(1);

      const nearOld = grid.getEntitiesNear(5, 5, 2);
      expect(nearOld).not.toContain('entity1');

      const nearNew = grid.getEntitiesNear(25, 25, 2);
      expect(nearNew).toContain('entity1');
    });

    it('should handle updating non-existent entity', () => {
      grid.update('nonexistent', 5, 5, 15, 15);
      expect(grid.size()).toBe(0);
    });

    it('should update multiple entities independently', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity2', 15, 15);
      grid.update('entity1', 5, 5, 10, 10);
      expect(grid.size()).toBe(2);
    });
  });

  describe('getEntitiesNear', () => {
    beforeEach(() => {
      // Set up grid with entities at known positions
      grid.insert('entity1', 0, 0);
      grid.insert('entity2', 5, 5);
      grid.insert('entity3', 15, 15);
      grid.insert('entity4', 25, 25);
      grid.insert('entity5', 50, 50);
    });

    it('should find entities within radius', () => {
      const nearby = grid.getEntitiesNear(0, 0, 10);
      expect(nearby).toContain('entity1');
      expect(nearby).toContain('entity2');
      expect(nearby.length).toBeGreaterThanOrEqual(2);
    });

    it('should not find entities outside radius', () => {
      const nearby = grid.getEntitiesNear(0, 0, 10);
      expect(nearby).not.toContain('entity5');
    });

    it('should handle zero radius', () => {
      const nearby = grid.getEntitiesNear(0, 0, 0);
      expect(nearby).toContain('entity1');
    });

    it('should handle large radius', () => {
      const nearby = grid.getEntitiesNear(0, 0, 100);
      expect(nearby.length).toBe(5);
    });

    it('should handle negative coordinates', () => {
      grid.insert('entity6', -10, -10);
      const nearby = grid.getEntitiesNear(-10, -10, 5);
      expect(nearby).toContain('entity6');
    });

    it('should return empty array when no entities nearby', () => {
      const nearby = grid.getEntitiesNear(1000, 1000, 10);
      expect(nearby).toEqual([]);
    });

    it('should not modify working array (return copy)', () => {
      const nearby1 = grid.getEntitiesNear(0, 0, 10);
      const nearby2 = grid.getEntitiesNear(50, 50, 10);
      expect(nearby1).not.toBe(nearby2);
    });
  });

  describe('getEntitiesInBounds', () => {
    beforeEach(() => {
      grid.insert('entity1', 0, 0);
      grid.insert('entity2', 5, 5);
      grid.insert('entity3', 15, 15);
      grid.insert('entity4', 25, 25);
      grid.insert('entity5', 50, 50);
    });

    it('should find entities in bounds', () => {
      const inBounds = grid.getEntitiesInBounds(0, 0, 10, 10);
      expect(inBounds).toContain('entity1');
      expect(inBounds).toContain('entity2');
    });

    it('should not find entities outside bounds', () => {
      const inBounds = grid.getEntitiesInBounds(0, 0, 10, 10);
      expect(inBounds).not.toContain('entity4');
      expect(inBounds).not.toContain('entity5');
    });

    it('should handle single-cell bounds', () => {
      const inBounds = grid.getEntitiesInBounds(0, 0, 1, 1);
      expect(inBounds).toContain('entity1');
    });

    it('should handle large bounds', () => {
      const inBounds = grid.getEntitiesInBounds(0, 0, 100, 100);
      expect(inBounds.length).toBe(5);
    });

    it('should handle negative bounds', () => {
      grid.insert('entity6', -10, -10);
      const inBounds = grid.getEntitiesInBounds(-15, -15, -5, -5);
      expect(inBounds).toContain('entity6');
    });

    it('should return empty array when no entities in bounds', () => {
      const inBounds = grid.getEntitiesInBounds(1000, 1000, 2000, 2000);
      expect(inBounds).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all entities', () => {
      grid.insert('entity1', 5, 5);
      grid.insert('entity2', 15, 15);
      grid.insert('entity3', 25, 25);
      grid.clear();
      expect(grid.size()).toBe(0);
    });

    it('should allow re-insertion after clear', () => {
      grid.insert('entity1', 5, 5);
      grid.clear();
      grid.insert('entity1', 5, 5);
      expect(grid.size()).toBe(1);
    });
  });

  describe('cell boundary conditions', () => {
    it('should handle entities on cell boundaries', () => {
      grid.insert('entity1', 10, 10); // Exactly on cell boundary
      grid.insert('entity2', 20, 20); // Another boundary
      expect(grid.size()).toBe(2);
    });

    it('should correctly assign entities to cells', () => {
      // Cell size = 10
      // Cell (0,0): x=[0,9], y=[0,9]
      // Cell (1,1): x=[10,19], y=[10,19]
      grid.insert('entity1', 9, 9); // Cell (0,0)
      grid.insert('entity2', 10, 10); // Cell (1,1)

      // Query centered at (5,5) with radius 10 should find entity1
      const nearby1 = grid.getEntitiesNear(5, 5, 10);
      expect(nearby1).toContain('entity1');

      // Query centered at (15,15) with radius 10 should find entity2
      const nearby2 = grid.getEntitiesNear(15, 15, 10);
      expect(nearby2).toContain('entity2');
    });
  });

  describe('performance characteristics', () => {
    it('should handle large number of entities efficiently', () => {
      const startTime = performance.now();

      // Insert 4000 entities in a grid pattern
      for (let i = 0; i < 4000; i++) {
        const x = (i % 100) * 5;
        const y = Math.floor(i / 100) * 5;
        grid.insert(`entity${i}`, x, y);
      }

      const insertTime = performance.now() - startTime;
      expect(grid.size()).toBe(4000);
      expect(insertTime).toBeLessThan(100); // Should be fast
    });

    it('should query large grid efficiently', () => {
      // Insert 4000 entities
      for (let i = 0; i < 4000; i++) {
        const x = (i % 100) * 5;
        const y = Math.floor(i / 100) * 5;
        grid.insert(`entity${i}`, x, y);
      }

      const startTime = performance.now();

      // Perform 100 queries
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 500;
        const y = Math.random() * 500;
        grid.getEntitiesNear(x, y, 15);
      }

      const queryTime = performance.now() - startTime;
      expect(queryTime).toBeLessThan(50); // Should be very fast
    });

    it('should update large grid efficiently', () => {
      // Insert 1000 entities
      for (let i = 0; i < 1000; i++) {
        grid.insert(`entity${i}`, i * 2, i * 2);
      }

      const startTime = performance.now();

      // Update all entities
      for (let i = 0; i < 1000; i++) {
        grid.update(`entity${i}`, i * 2, i * 2, i * 2 + 1, i * 2 + 1);
      }

      const updateTime = performance.now() - startTime;
      expect(updateTime).toBeLessThan(50); // Should be fast
    });
  });

  describe('edge cases', () => {
    it('should handle very large coordinates', () => {
      grid.insert('entity1', 1000000, 1000000);
      const nearby = grid.getEntitiesNear(1000000, 1000000, 10);
      expect(nearby).toContain('entity1');
    });

    it('should handle floating point coordinates', () => {
      grid.insert('entity1', 5.5, 5.5);
      grid.insert('entity2', 5.9, 5.9);
      expect(grid.size()).toBe(2);
    });

    it('should handle same entity ID at different positions over time', () => {
      grid.insert('entity1', 5, 5);
      grid.remove('entity1');
      grid.insert('entity1', 15, 15);
      expect(grid.size()).toBe(1);

      const nearOld = grid.getEntitiesNear(5, 5, 2);
      expect(nearOld).not.toContain('entity1');

      const nearNew = grid.getEntitiesNear(15, 15, 2);
      expect(nearNew).toContain('entity1');
    });
  });
});
