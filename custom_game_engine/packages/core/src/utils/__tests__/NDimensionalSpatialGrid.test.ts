import { describe, it, expect } from 'vitest';
import { NDimensionalSpatialGrid } from '../NDimensionalSpatialGrid.js';

describe('NDimensionalSpatialGrid', () => {
  describe('constructor', () => {
    it('creates grid with valid dimensions', () => {
      expect(() => new NDimensionalSpatialGrid(1)).not.toThrow();
      expect(() => new NDimensionalSpatialGrid(2)).not.toThrow();
      expect(() => new NDimensionalSpatialGrid(6)).not.toThrow();
    });

    it('throws on invalid dimensions', () => {
      expect(() => new NDimensionalSpatialGrid(0)).toThrow('Dimensions must be 1-6');
      expect(() => new NDimensionalSpatialGrid(7)).toThrow('Dimensions must be 1-6');
      expect(() => new NDimensionalSpatialGrid(-1)).toThrow('Dimensions must be 1-6');
    });

    it('throws on invalid cell size', () => {
      expect(() => new NDimensionalSpatialGrid(2, 0)).toThrow('Cell size must be positive');
      expect(() => new NDimensionalSpatialGrid(2, -10)).toThrow('Cell size must be positive');
    });
  });

  describe('1D grid', () => {
    it('adds and queries entities in 1D', () => {
      const grid = new NDimensionalSpatialGrid(1, 10);

      grid.add('e1', [5]);
      grid.add('e2', [15]);
      grid.add('e3', [50]);

      const results = grid.query([5], 12);
      expect(results).toContain('e1');
      expect(results).toContain('e2');
      expect(results).not.toContain('e3');
    });
  });

  describe('2D grid', () => {
    it('adds entities to grid', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [10, 20]);

      const stats = grid.getStats();
      expect(stats.entityCount).toBe(1);
      expect(stats.dimensions).toBe(2);
    });

    it('throws when adding duplicate entity', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [10, 20]);
      expect(() => grid.add('e1', [30, 40])).toThrow('already exists');
    });

    it('queries nearby entities', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [10, 10]);
      grid.add('e2', [12, 12]);
      grid.add('e3', [100, 100]);

      const results = grid.query([10, 10], 5);
      expect(results).toContain('e1');
      expect(results).toContain('e2');
      expect(results).not.toContain('e3');
    });

    it('handles large query radius', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [0, 0]);
      grid.add('e2', [50, 50]);
      grid.add('e3', [100, 100]);

      const results = grid.query([0, 0], 80);
      expect(results).toContain('e1');
      expect(results).toContain('e2');
      expect(results).not.toContain('e3');
    });

    it('handles negative coordinates', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [-10, -20]);
      grid.add('e2', [-5, -15]);

      const results = grid.query([-10, -20], 10);
      expect(results).toContain('e1');
      expect(results).toContain('e2');
    });

    it('queries with asymmetric ranges', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [10, 10]);
      grid.add('e2', [20, 12]);
      grid.add('e3', [12, 30]);

      // Wide X range, narrow Y range
      const results = grid.queryAsymmetric([10, 10], [15, 5]);
      expect(results).toContain('e1');
      expect(results).toContain('e2');
      expect(results).not.toContain('e3'); // Too far in Y
    });
  });

  describe('3D grid', () => {
    it('handles 3D spatial queries', () => {
      const grid = new NDimensionalSpatialGrid(3, 10);

      grid.add('e1', [10, 10, 10]);
      grid.add('e2', [12, 12, 12]);
      grid.add('e3', [50, 50, 50]);

      const results = grid.query([10, 10, 10], 5);
      expect(results).toContain('e1');
      expect(results).toContain('e2');
      expect(results).not.toContain('e3');
    });
  });

  describe('4D grid (position + environment)', () => {
    it('handles 4D queries', () => {
      const grid = new NDimensionalSpatialGrid(4, 15);

      // [x, y, temperature, humidity]
      grid.add('e1', [10, 10, 20, 50]);
      grid.add('e2', [12, 12, 22, 52]);
      grid.add('e3', [10, 10, 80, 50]); // Same position, different temp

      const results = grid.query([10, 10, 20, 50], 5);
      expect(results).toContain('e1');
      expect(results).toContain('e2');
      expect(results).not.toContain('e3'); // Too far in temperature dimension
    });

    it('uses asymmetric ranges for different dimension sensitivities', () => {
      const grid = new NDimensionalSpatialGrid(4, 15);

      grid.add('e1', [10, 10, 20, 50]);
      grid.add('e2', [50, 10, 22, 52]);
      grid.add('e3', [10, 10, 35, 50]);

      // Wide position range, narrow environmental range
      const results = grid.queryAsymmetric([10, 10, 20, 50], [45, 45, 10, 10]);
      expect(results).toContain('e1');
      expect(results).toContain('e2'); // Within position range
      expect(results).not.toContain('e3'); // Temperature out of range
    });
  });

  describe('update', () => {
    it('updates entity position', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [10, 10]);
      expect(grid.update('e1', [100, 100])).toBe(true);

      const results = grid.query([100, 100], 5);
      expect(results).toContain('e1');

      const oldResults = grid.query([10, 10], 5);
      expect(oldResults).not.toContain('e1');
    });

    it('returns false for non-existent entity', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);
      expect(grid.update('nonexistent', [10, 10])).toBe(false);
    });

    it('efficiently handles update within same cell', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [10, 10]);
      expect(grid.update('e1', [12, 12])).toBe(true); // Same cell

      const stats = grid.getStats();
      expect(stats.cellCount).toBe(1); // Should still be in same cell
    });
  });

  describe('remove', () => {
    it('removes entity from grid', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [10, 10]);
      expect(grid.remove('e1')).toBe(true);

      const results = grid.query([10, 10], 5);
      expect(results).not.toContain('e1');
    });

    it('returns false for non-existent entity', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);
      expect(grid.remove('nonexistent')).toBe(false);
    });

    it('cleans up empty cells', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [10, 10]);
      grid.remove('e1');

      const stats = grid.getStats();
      expect(stats.cellCount).toBe(0);
    });
  });

  describe('getPosition', () => {
    it('returns entity position', () => {
      const grid = new NDimensionalSpatialGrid(3, 15);

      grid.add('e1', [10, 20, 30]);
      const pos = grid.getPosition('e1');

      expect(pos).toEqual([10, 20, 30]);
    });

    it('returns undefined for non-existent entity', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);
      expect(grid.getPosition('nonexistent')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('removes all entities', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [10, 10]);
      grid.add('e2', [20, 20]);
      grid.clear();

      const stats = grid.getStats();
      expect(stats.entityCount).toBe(0);
      expect(stats.cellCount).toBe(0);
    });
  });

  describe('getStats', () => {
    it('returns accurate statistics', () => {
      const grid = new NDimensionalSpatialGrid(3, 20);

      grid.add('e1', [10, 10, 10]);
      grid.add('e2', [12, 12, 12]); // Same cell
      grid.add('e3', [100, 100, 100]); // Different cell

      const stats = grid.getStats();
      expect(stats.entityCount).toBe(3);
      expect(stats.cellCount).toBe(2);
      expect(stats.dimensions).toBe(3);
      expect(stats.cellSize).toBe(20);
      expect(stats.avgEntitiesPerCell).toBe(1.5);
    });

    it('handles empty grid', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      const stats = grid.getStats();
      expect(stats.entityCount).toBe(0);
      expect(stats.cellCount).toBe(0);
      expect(stats.avgEntitiesPerCell).toBe(0);
    });
  });

  describe('coordinate normalization', () => {
    it('normalizes coordinates to grid dimensions', () => {
      const grid = new NDimensionalSpatialGrid(3, 15);

      // Provide only 2 coords, should pad with 0
      grid.add('e1', [10, 20]);
      const pos = grid.getPosition('e1');
      expect(pos).toEqual([10, 20, 0]);
    });

    it('truncates extra coordinates', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      // Provide 4 coords, should use only first 2
      grid.add('e1', [10, 20, 30, 40]);
      const pos = grid.getPosition('e1');
      expect(pos).toEqual([10, 20]);
    });
  });

  describe('edge cases', () => {
    it('handles zero coordinates', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [0, 0]);
      const results = grid.query([0, 0], 5);
      expect(results).toContain('e1');
    });

    it('handles very large coordinates', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [10000, 10000]);
      const results = grid.query([10000, 10000], 5);
      expect(results).toContain('e1');
    });

    it('handles exact boundary distances', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [0, 0]);
      grid.add('e2', [10, 0]); // Exactly 10 units away

      const results = grid.query([0, 0], 10);
      expect(results).toContain('e1');
      expect(results).toContain('e2'); // Should be included (distance <= radius)
    });

    it('handles queries with zero radius', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [10, 10]);
      grid.add('e2', [10, 10]); // Same position

      const results = grid.query([10, 10], 0);
      expect(results).toContain('e1');
      expect(results).toContain('e2');
    });
  });

  describe('6D grid (maximum dimensions)', () => {
    it('handles 6D queries', () => {
      const grid = new NDimensionalSpatialGrid(6, 15);

      grid.add('e1', [10, 10, 10, 10, 10, 10]);
      grid.add('e2', [12, 12, 12, 12, 12, 12]);
      grid.add('e3', [100, 10, 10, 10, 10, 10]);

      const results = grid.query([10, 10, 10, 10, 10, 10], 5);
      expect(results).toContain('e1');
      expect(results).toContain('e2');
      expect(results).not.toContain('e3');
    });

    it('verifies 3^6 = 729 neighbor cells', () => {
      const grid = new NDimensionalSpatialGrid(6, 15);

      grid.add('e1', [0, 0, 0, 0, 0, 0]);

      // Add entities at cell boundaries to verify full neighbor check
      for (let i = 0; i < 6; i++) {
        const coords = [0, 0, 0, 0, 0, 0];
        coords[i] = 14; // Just within same cell
        grid.add(`edge${i}`, coords);
      }

      const results = grid.query([0, 0, 0, 0, 0, 0], 20);
      expect(results.length).toBeGreaterThan(6); // Should find all edge entities
    });
  });

  describe('large query fallback', () => {
    it('falls back to full scan for very large asymmetric queries', () => {
      const grid = new NDimensionalSpatialGrid(2, 15);

      grid.add('e1', [10, 10]);
      grid.add('e2', [500, 10]);
      grid.add('e3', [10, 500]);

      // Query with huge range (would generate >10k cells)
      const results = grid.queryAsymmetric([10, 10], [1000, 1000]);

      expect(results).toContain('e1');
      expect(results).toContain('e2');
      expect(results).toContain('e3');
    });

    it('uses optimized path for moderate asymmetric queries', () => {
      const grid = new NDimensionalSpatialGrid(4, 15);

      grid.add('e1', [10, 10, 20, 50]);
      grid.add('e2', [50, 10, 22, 52]);
      grid.add('e3', [10, 10, 35, 50]);

      // Moderate asymmetric query (should use cell-based approach)
      const results = grid.queryAsymmetric([10, 10, 20, 50], [45, 45, 10, 10]);

      expect(results).toContain('e1');
      expect(results).toContain('e2');
      expect(results).not.toContain('e3');
    });

    it('handles 6D asymmetric query with large ranges without RangeError', () => {
      const grid = new NDimensionalSpatialGrid(6, 15);

      // Add test entities in 6D space
      grid.add('e1', [50, 50, 50, 50, 50, 50]);
      grid.add('e2', [100, 50, 50, 50, 50, 50]);
      grid.add('e3', [50, 100, 50, 50, 50, 50]);
      grid.add('e4', [200, 200, 200, 200, 200, 200]); // Far away

      // Query with large ranges in 6D (would generate 7^6 = 117,649 cells without fallback)
      // With cellSize=15 and range=100: ceil(100/15) = 7 cells per dimension
      // 7^6 = 117,649 cells, which exceeds MAX_CELLS (10,000)
      const results = grid.queryAsymmetric(
        [50, 50, 50, 50, 50, 50],
        [100, 100, 100, 100, 100, 100]
      );

      // Should fall back to full scan and correctly find entities within range
      expect(results).toContain('e1');
      expect(results).toContain('e2');
      expect(results).toContain('e3');
      expect(results).not.toContain('e4'); // Outside range
    });

    it('verifies cell count estimation triggers fallback correctly', () => {
      const grid = new NDimensionalSpatialGrid(6, 15);

      grid.add('e1', [0, 0, 0, 0, 0, 0]);

      // Range of 100 with cellSize 15: ceil(100/15) = 7 cells per dimension
      // (2*7+1)^6 = 15^6 = 11,390,625 cells >> 10,000 MAX_CELLS
      // Should trigger fallback without throwing RangeError
      expect(() => {
        grid.queryAsymmetric([0, 0, 0, 0, 0, 0], [100, 100, 100, 100, 100, 100]);
      }).not.toThrow();
    });
  });
});
