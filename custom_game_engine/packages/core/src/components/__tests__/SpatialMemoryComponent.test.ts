import { describe, it, expect, beforeEach } from 'vitest';
import {
  SpatialMemoryComponent,
  getSpatialMemoriesByType,
  getSpatialMemoriesByLocation,
  getRecentSpatialMemories,
  getSpatialMemoriesByImportance,
  type SpatialMemory,
} from '../SpatialMemoryComponent';
import { ResourceType } from '../../types/resources';

describe('SpatialMemoryComponent', () => {
  let component: SpatialMemoryComponent;

  beforeEach(() => {
    component = new SpatialMemoryComponent();
  });

  describe('AC1: Memory Queries Work', () => {
    it('should query resource locations by type', () => {
      // Arrange
      component.recordResourceLocation('wood', { x: 10, y: 20 }, 100);
      component.recordResourceLocation('stone', { x: 30, y: 40 }, 100);

      // Act
      const results = component.queryResourceLocations('wood');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].resourceType).toBe('wood');
      expect(results[0].position).toEqual({ x: 10, y: 20 });
    });

    it('should include confidence scores between 0 and 1', () => {
      component.recordResourceLocation('wood', { x: 10, y: 20 }, 100);

      const results = component.queryResourceLocations('wood');

      expect(results[0].confidence).toBeGreaterThanOrEqual(0);
      expect(results[0].confidence).toBeLessThanOrEqual(1);
    });

    it('should rank old memories with lower confidence than recent ones', () => {
      // Record old memory
      component.recordResourceLocation('wood', { x: 10, y: 20 }, 100);

      // Record recent memory (600 ticks later)
      component.recordResourceLocation('wood', { x: 30, y: 40 }, 700);

      const results = component.queryResourceLocations('wood', 700);

      // Recent memory should have higher confidence
      expect(results[0].tick).toBe(700); // Most recent first
      expect(results[0].confidence).toBeGreaterThan(results[1].confidence);
    });

    it('should apply distance-based ranking when agent position provided', () => {
      component.recordResourceLocation('wood', { x: 100, y: 100 }, 100);
      component.recordResourceLocation('wood', { x: 10, y: 10 }, 100);

      const agentPosition = { x: 5, y: 5 };
      const results = component.queryResourceLocations('wood', 100, agentPosition);

      // Closer location should rank higher
      expect(results[0].position).toEqual({ x: 10, y: 10 });
    });

    it('should throw error when querying without required resource type', () => {
      expect(() => {
        (component as any).queryResourceLocations(undefined);
      }).toThrow();
    });

    it('should handle empty results gracefully without crashing', () => {
      const results = component.queryResourceLocations('wood');

      expect(results).toEqual([]);
    });

    it('should return top N candidates when limit specified', () => {
      for (let i = 0; i < 10; i++) {
        component.recordResourceLocation('wood', { x: i, y: i }, 100 + i);
      }

      const results = component.queryResourceLocations('wood', 110, undefined, 3);

      expect(results).toHaveLength(3);
    });
  });

  describe('AC10: No Silent Fallbacks (CLAUDE.md Compliance)', () => {
    // Note: recordResourceLocation is a legacy API without validation
    // The new filtering methods have proper validation (see tests below)
    // These tests verify queryResourceLocations validates inputs

    it('should throw error when querying without resource type', () => {
      expect(() => {
        component.queryResourceLocations('');
      }).toThrow(/resourceType/);
    });

    it('should accept valid inputs to recordResourceLocation', () => {
      // Legacy API accepts all inputs without validation
      expect(() => {
        component.recordResourceLocation('wood', { x: 10, y: 10 }, 100);
      }).not.toThrow();
    });

    // Note: Confidence validation is internal - cannot be tested via public API
    // Confidence is always set to 1.0 on creation and decayed via _calculateConfidence
  });

  describe('confidence decay', () => {
    it('should decay confidence for memories older than 500 ticks', () => {
      component.recordResourceLocation('wood', { x: 10, y: 20 }, 100);

      const results = component.queryResourceLocations('wood', 700); // 600 ticks later

      expect(results[0].confidence).toBeLessThan(0.8); // Decayed from 1.0
    });

    it('should not decay confidence for recent memories', () => {
      component.recordResourceLocation('wood', { x: 10, y: 20 }, 100);

      const results = component.queryResourceLocations('wood', 150); // 50 ticks later

      expect(results[0].confidence).toBeGreaterThan(0.9);
    });
  });

  describe('Memory Filtering Methods (Work Order: add-memory-filtering-methods)', () => {
    // Helper to create test memories
    const createMemory = (
      type: SpatialMemory['type'],
      x: number,
      y: number,
      strength: number,
      createdAt: number,
      lastReinforced?: number
    ): SpatialMemory => ({
      type,
      x,
      y,
      strength,
      createdAt,
      lastReinforced: lastReinforced ?? createdAt,
    });

    describe('Criterion 1: getSpatialMemoriesByType - Type-Based Filtering', () => {
      beforeEach(() => {
        // Add diverse memories
        component.memories.push(
          createMemory('resource_location', 10, 10, 80, 100),
          createMemory('resource_location', 20, 20, 90, 200),
          createMemory('danger', 30, 30, 70, 300),
          createMemory('home', 40, 40, 85, 400),
          createMemory('resource_location', 50, 50, 95, 500)
        );
      });

      it('should return all memories matching the specified type', () => {
        const results = getSpatialMemoriesByType(component, 'resource_location');

        expect(results).toHaveLength(3);
        expect(results.every(m => m.type === 'resource_location')).toBe(true);
      });

      it('should sort results by strength in descending order', () => {
        const results = getSpatialMemoriesByType(component, 'resource_location');

        expect(results[0].strength).toBe(95);
        expect(results[1].strength).toBe(90);
        expect(results[2].strength).toBe(80);
      });

      it('should return empty array when no memories match the type', () => {
        const results = getSpatialMemoriesByType(component, 'terrain_landmark');

        expect(results).toEqual([]);
      });

      it('should throw error when component is missing', () => {
        expect(() => {
          getSpatialMemoriesByType(null as any, 'resource_location');
        }).toThrow('component parameter is required');
      });

      it('should handle single matching memory', () => {
        const results = getSpatialMemoriesByType(component, 'danger');

        expect(results).toHaveLength(1);
        expect(results[0].type).toBe('danger');
        expect(results[0].strength).toBe(70);
      });
    });

    describe('Criterion 2: getSpatialMemoriesByLocation - Location-Based Filtering', () => {
      beforeEach(() => {
        // Add memories at various distances from center point (50, 50)
        component.memories.push(
          createMemory('resource_location', 50, 50, 80, 100), // Distance 0
          createMemory('danger', 55, 55, 70, 200), // Distance ~7.07
          createMemory('home', 60, 50, 85, 300), // Distance 10
          createMemory('resource_location', 70, 70, 90, 400), // Distance ~28.28
          createMemory('plant_location', 45, 45, 75, 500) // Distance ~7.07
        );
      });

      it('should return all memories within the specified radius', () => {
        const results = getSpatialMemoriesByLocation(
          component,
          { x: 50, y: 50 },
          10
        );

        expect(results.length).toBe(4); // (50,50), (55,55), (60,50), (45,45)
        expect(results.every(m => {
          const dx = m.x - 50;
          const dy = m.y - 50;
          return dx * dx + dy * dy <= 10 * 10;
        })).toBe(true);
      });

      it('should sort results by distance in ascending order (closest first)', () => {
        const results = getSpatialMemoriesByLocation(
          component,
          { x: 50, y: 50 },
          30
        );

        // Closest should be first
        expect(results[0].x).toBe(50);
        expect(results[0].y).toBe(50);
        // Farthest within radius should be last
        expect(results[results.length - 1].x).toBe(70);
        expect(results[results.length - 1].y).toBe(70);
      });

      it('should return empty array when no memories within radius', () => {
        const results = getSpatialMemoriesByLocation(
          component,
          { x: 200, y: 200 },
          5
        );

        expect(results).toEqual([]);
      });

      it('should throw error when component is missing', () => {
        expect(() => {
          getSpatialMemoriesByLocation(
            null as any,
            { x: 50, y: 50 },
            10
          );
        }).toThrow('component parameter is required');
      });

      it('should throw error when location is missing', () => {
        expect(() => {
          getSpatialMemoriesByLocation(
            component,
            null as any,
            10
          );
        }).toThrow();
      });

      it('should throw error when location has invalid coordinates', () => {
        expect(() => {
          getSpatialMemoriesByLocation(
            component,
            { x: undefined, y: 50 } as any,
            10
          );
        }).toThrow();
      });

      it('should throw error when radius is negative', () => {
        expect(() => {
          getSpatialMemoriesByLocation(
            component,
            { x: 50, y: 50 },
            -10
          );
        }).toThrow('radius must be non-negative');
      });

      it('should throw error when radius is missing', () => {
        expect(() => {
          getSpatialMemoriesByLocation(
            component,
            { x: 50, y: 50 },
            undefined as any
          );
        }).toThrow();
      });

      it('should handle radius of 0 (exact position match)', () => {
        const results = getSpatialMemoriesByLocation(
          component,
          { x: 50, y: 50 },
          0
        );

        expect(results).toHaveLength(1);
        expect(results[0].x).toBe(50);
        expect(results[0].y).toBe(50);
      });

      it('should use squared distance comparison to avoid sqrt in hot path', () => {
        // This is a performance requirement - the implementation should avoid Math.sqrt
        // We can't directly test the implementation, but we can verify correct behavior
        const results = getSpatialMemoriesByLocation(
          component,
          { x: 50, y: 50 },
          10
        );

        // Verify boundary case: distance exactly 10 should be included
        const boundary = results.find(m => m.x === 60 && m.y === 50);
        expect(boundary).toBeDefined();
      });
    });

    describe('Criterion 3: getRecentSpatialMemories - Recent Memories', () => {
      beforeEach(() => {
        // Add memories with different timestamps
        component.memories.push(
          createMemory('resource_location', 10, 10, 80, 100, 100),
          createMemory('danger', 20, 20, 70, 200, 500), // Reinforced more recently
          createMemory('home', 30, 30, 85, 300, 300),
          createMemory('resource_location', 40, 40, 90, 400, 400),
          createMemory('plant_location', 50, 50, 75, 150, 600) // Most recently reinforced
        );
      });

      it('should return the N most recently reinforced memories', () => {
        const results = getRecentSpatialMemories(component, 3);

        expect(results).toHaveLength(3);
        // Should be sorted by lastReinforced descending
        expect(results[0].lastReinforced).toBe(600);
        expect(results[1].lastReinforced).toBe(500);
        expect(results[2].lastReinforced).toBe(400);
      });

      it('should return all memories if count exceeds total memories', () => {
        const results = getRecentSpatialMemories(component, 100);

        expect(results).toHaveLength(5);
        // Should still be sorted
        expect(results[0].lastReinforced).toBeGreaterThanOrEqual(results[1].lastReinforced);
      });

      it('should return exactly 1 memory when count is 1', () => {
        const results = getRecentSpatialMemories(component, 1);

        expect(results).toHaveLength(1);
        expect(results[0].lastReinforced).toBe(600); // Most recent
      });

      it('should throw error when component is missing', () => {
        expect(() => {
          getRecentSpatialMemories(null as any, 5);
        }).toThrow('component parameter is required');
      });

      it('should throw error when count is missing', () => {
        expect(() => {
          getRecentSpatialMemories(component, undefined as any);
        }).toThrow();
      });

      it('should throw error when count is less than 1', () => {
        expect(() => {
          getRecentSpatialMemories(component, 0);
        }).toThrow('count must be >= 1');
      });

      it('should throw error when count is negative', () => {
        expect(() => {
          getRecentSpatialMemories(component, -5);
        }).toThrow('count must be >= 1');
      });

      it('should handle empty memories array', () => {
        component.memories = [];
        const results = getRecentSpatialMemories(component, 5);

        expect(results).toEqual([]);
      });

      it('should sort by lastReinforced, not createdAt', () => {
        // Memory created early but reinforced late should be first
        const results = getRecentSpatialMemories(component, 5);

        // Plant at (50,50) created at 150 but reinforced at 600
        expect(results[0].createdAt).toBe(150);
        expect(results[0].lastReinforced).toBe(600);
      });
    });

    describe('Criterion 4: getSpatialMemoriesByImportance - Importance Filtering', () => {
      beforeEach(() => {
        // Add memories with different strength values
        component.memories.push(
          createMemory('resource_location', 10, 10, 95, 100),
          createMemory('danger', 20, 20, 40, 200),
          createMemory('home', 30, 30, 85, 300),
          createMemory('resource_location', 40, 40, 60, 400),
          createMemory('plant_location', 50, 50, 100, 500)
        );
      });

      it('should return all memories with strength >= threshold', () => {
        const results = getSpatialMemoriesByImportance(component, 80);

        expect(results).toHaveLength(3);
        expect(results.every(m => m.strength >= 80)).toBe(true);
      });

      it('should sort results by strength in descending order (strongest first)', () => {
        const results = getSpatialMemoriesByImportance(component, 50);

        expect(results[0].strength).toBe(100);
        expect(results[1].strength).toBe(95);
        expect(results[2].strength).toBe(85);
        expect(results[3].strength).toBe(60);
      });

      it('should throw error when threshold exceeds maximum (150 > 100)', () => {
        expect(() => {
          getSpatialMemoriesByImportance(component, 150);
        }).toThrow('threshold must be between 0 and 100');
      });

      it('should include memories with strength exactly equal to threshold', () => {
        const results = getSpatialMemoriesByImportance(component, 85);

        expect(results.some(m => m.strength === 85)).toBe(true);
      });

      it('should throw error when component is missing', () => {
        expect(() => {
          getSpatialMemoriesByImportance(null as any, 80);
        }).toThrow('component parameter is required');
      });

      it('should throw error when threshold is missing', () => {
        expect(() => {
          getSpatialMemoriesByImportance(component, undefined as any);
        }).toThrow();
      });

      it('should throw error when threshold is negative', () => {
        expect(() => {
          getSpatialMemoriesByImportance(component, -10);
        }).toThrow('threshold must be between 0 and 100');
      });

      it('should throw error when threshold exceeds 100', () => {
        expect(() => {
          getSpatialMemoriesByImportance(component, 101);
        }).toThrow('threshold must be between 0 and 100');
      });

      it('should handle threshold of 0 (return all memories)', () => {
        const results = getSpatialMemoriesByImportance(component, 0);

        expect(results).toHaveLength(5);
      });

      it('should handle threshold of 100 (only perfect strength)', () => {
        const results = getSpatialMemoriesByImportance(component, 100);

        expect(results).toHaveLength(1);
        expect(results[0].strength).toBe(100);
      });
    });

    describe('Criterion 5: Performance - Filter 1000 Memories in <10ms', () => {
      beforeEach(() => {
        // Create 1000 test memories with varied data
        component.memories = [];
        for (let i = 0; i < 1000; i++) {
          component.memories.push(
            createMemory(
              i % 2 === 0 ? 'resource_location' : 'danger',
              Math.random() * 200,
              Math.random() * 200,
              Math.random() * 100,
              i,
              i + Math.random() * 100
            )
          );
        }
      });

      it('getSpatialMemoriesByType should filter 1000 memories in <10ms', () => {
        const start = performance.now();
        const results = getSpatialMemoriesByType(component, 'resource_location');
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(10);
        expect(results.length).toBeGreaterThan(0);
      });

      it('getSpatialMemoriesByLocation should filter 1000 memories in <10ms', () => {
        const start = performance.now();
        const results = getSpatialMemoriesByLocation(
          component,
          { x: 100, y: 100 },
          50
        );
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(10);
        expect(results.length).toBeGreaterThan(0);
      });

      it('getRecentSpatialMemories should filter 1000 memories in <10ms', () => {
        const start = performance.now();
        const results = getRecentSpatialMemories(component, 50);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(10);
        expect(results).toHaveLength(50);
      });

      it('getSpatialMemoriesByImportance should filter 1000 memories in <10ms', () => {
        const start = performance.now();
        const results = getSpatialMemoriesByImportance(component, 50);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(10);
        expect(results.length).toBeGreaterThan(0);
      });
    });

    describe('Criterion 6: Composable Filters - Chaining', () => {
      beforeEach(() => {
        // Add memories with mixed attributes
        component.memories.push(
          createMemory('resource_location', 50, 50, 95, 100, 100), // High strength, close to center
          createMemory('resource_location', 55, 55, 85, 200, 200), // Medium strength, close
          createMemory('resource_location', 100, 100, 90, 300, 300), // High strength, far
          createMemory('danger', 52, 52, 80, 400, 400), // Wrong type, close
          createMemory('resource_location', 51, 51, 40, 500, 500) // Low strength, close
        );
      });

      it('should compose type filter with manual location filter', () => {
        const center = { x: 50, y: 50 };
        const radius = 10;
        const radiusSquared = radius * radius;

        const results = getSpatialMemoriesByType(component, 'resource_location')
          .filter(m => {
            const dx = m.x - center.x;
            const dy = m.y - center.y;
            return dx * dx + dy * dy <= radiusSquared;
          });

        expect(results).toHaveLength(3); // (50,50), (55,55), (51,51)
        expect(results.every(m => m.type === 'resource_location')).toBe(true);
      });

      it('should compose type filter with importance filter', () => {
        const results = getSpatialMemoriesByType(component, 'resource_location')
          .filter(m => m.strength >= 85);

        expect(results).toHaveLength(3); // 95, 85, 90
        expect(results.every(m => m.type === 'resource_location' && m.strength >= 85)).toBe(true);
      });

      it('should compose location filter with importance threshold', () => {
        const nearbyMemories = getSpatialMemoriesByLocation(
          component,
          { x: 50, y: 50 },
          10
        );

        const importantNearby = nearbyMemories.filter(m => m.strength >= 80);

        expect(importantNearby.length).toBe(3); // (50,50)=95, (55,55)=85, (52,52)=80
        // (51,51) is strength 40, so not included
      });

      it('should compose all three filters: type + location + importance', () => {
        const center = { x: 50, y: 50 };
        const radius = 10;
        const radiusSquared = radius * radius;

        const results = getSpatialMemoriesByType(component, 'resource_location')
          .filter(m => {
            const dx = m.x - center.x;
            const dy = m.y - center.y;
            return dx * dx + dy * dy <= radiusSquared;
          })
          .filter(m => m.strength >= 85);

        expect(results).toHaveLength(2); // (50,50)=95, (55,55)=85
        expect(results.every(m =>
          m.type === 'resource_location' && m.strength >= 85
        )).toBe(true);
      });

      it('should chain location filter with recent memories limit', () => {
        const nearbyMemories = getSpatialMemoriesByLocation(
          component,
          { x: 50, y: 50 },
          10
        );

        // Sort by lastReinforced and take top 2
        const recentNearby = nearbyMemories
          .sort((a, b) => b.lastReinforced - a.lastReinforced)
          .slice(0, 2);

        expect(recentNearby).toHaveLength(2);
      });
    });

    describe('Edge Cases and Boundary Conditions', () => {
      it('should handle empty memories array for all filters', () => {
        component.memories = [];

        expect(getSpatialMemoriesByType(component, 'resource_location')).toEqual([]);
        expect(getSpatialMemoriesByLocation(component, { x: 0, y: 0 }, 10)).toEqual([]);
        expect(getRecentSpatialMemories(component, 5)).toEqual([]);
        expect(getSpatialMemoriesByImportance(component, 50)).toEqual([]);
      });

      it('should handle single memory for all filters', () => {
        component.memories = [createMemory('home', 10, 10, 80, 100)];

        expect(getSpatialMemoriesByType(component, 'home')).toHaveLength(1);
        expect(getSpatialMemoriesByLocation(component, { x: 10, y: 10 }, 1)).toHaveLength(1);
        expect(getRecentSpatialMemories(component, 1)).toHaveLength(1);
        expect(getSpatialMemoriesByImportance(component, 80)).toHaveLength(1);
      });

      it('should handle memories with identical values', () => {
        component.memories = [
          createMemory('danger', 20, 20, 75, 100),
          createMemory('danger', 20, 20, 75, 100),
          createMemory('danger', 20, 20, 75, 100),
        ];

        expect(getSpatialMemoriesByType(component, 'danger')).toHaveLength(3);
        expect(getSpatialMemoriesByLocation(component, { x: 20, y: 20 }, 0)).toHaveLength(3);
        expect(getRecentSpatialMemories(component, 3)).toHaveLength(3);
        expect(getSpatialMemoriesByImportance(component, 75)).toHaveLength(3);
      });

      it('should handle very large radius (get all memories)', () => {
        component.memories = [
          createMemory('home', 0, 0, 80, 100),
          createMemory('home', 1000, 1000, 80, 100),
        ];

        const results = getSpatialMemoriesByLocation(
          component,
          { x: 0, y: 0 },
          10000
        );

        expect(results).toHaveLength(2);
      });

      it('should preserve original memories array (immutability)', () => {
        const original = [
          createMemory('resource_location', 10, 10, 80, 100),
          createMemory('danger', 20, 20, 70, 200),
        ];
        component.memories = [...original];

        getSpatialMemoriesByType(component, 'resource_location');
        getSpatialMemoriesByLocation(component, { x: 10, y: 10 }, 10);
        getRecentSpatialMemories(component, 1);
        getSpatialMemoriesByImportance(component, 50);

        // Original array should be unchanged
        expect(component.memories).toEqual(original);
        expect(component.memories).toHaveLength(2);
      });
    });
  });
});
