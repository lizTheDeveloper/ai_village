import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialMemoryComponent } from '../SpatialMemoryComponent';
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
    it('should throw error for invalid resource type', () => {
      expect(() => {
        component.recordResourceLocation('' as ResourceType, { x: 0, y: 0 }, 100);
      }).toThrow(/resource type/i);
    });

    it('should throw error for missing position coordinates', () => {
      expect(() => {
        component.recordResourceLocation('wood', { x: undefined, y: 10 } as any, 100);
      }).toThrow();
    });

    it('should throw error for invalid tick value', () => {
      expect(() => {
        component.recordResourceLocation('wood', { x: 10, y: 10 }, -1);
      }).toThrow();
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
});
