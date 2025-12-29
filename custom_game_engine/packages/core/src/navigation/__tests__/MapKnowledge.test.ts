import { describe, it, expect, beforeEach } from 'vitest';
import {
  MapKnowledge,
  worldToSector,
  sectorToWorld,
  getSectorKey,
  SECTOR_SIZE,
} from '../MapKnowledge.js';

describe('MapKnowledge', () => {
  let mapKnowledge: MapKnowledge;

  beforeEach(() => {
    mapKnowledge = new MapKnowledge();
  });

  describe('coordinate conversion', () => {
    it('converts world coordinates to sector coordinates', () => {
      // Sector size is 16, so (0-15) -> sector 0, (16-31) -> sector 1
      expect(worldToSector(0, 0)).toEqual({ sectorX: 0, sectorY: 0 });
      expect(worldToSector(15, 15)).toEqual({ sectorX: 0, sectorY: 0 });
      expect(worldToSector(16, 16)).toEqual({ sectorX: 1, sectorY: 1 });
      expect(worldToSector(32, 48)).toEqual({ sectorX: 2, sectorY: 3 });
    });

    it('handles negative coordinates', () => {
      expect(worldToSector(-1, -1)).toEqual({ sectorX: -1, sectorY: -1 });
      expect(worldToSector(-16, -16)).toEqual({ sectorX: -1, sectorY: -1 });
      expect(worldToSector(-17, -17)).toEqual({ sectorX: -2, sectorY: -2 });
    });

    it('converts sector coordinates to world center', () => {
      const result = sectorToWorld(0, 0);
      expect(result.worldX).toBe(SECTOR_SIZE / 2);
      expect(result.worldY).toBe(SECTOR_SIZE / 2);
    });

    it('generates unique sector keys', () => {
      expect(getSectorKey(0, 0)).toBe('0,0');
      expect(getSectorKey(5, -3)).toBe('5,-3');
      expect(getSectorKey(-2, 7)).toBe('-2,7');
    });
  });

  describe('worn paths (traffic tracking)', () => {
    it('records traversal between sectors', () => {
      // Move from sector (0,0) to sector (1,0) - east
      mapKnowledge.recordTraversal(8, 8, 24, 8, 100);

      // Check traffic was recorded
      const sector = mapKnowledge.getSector(0, 0);
      expect(sector.pathTraffic.get('e')).toBe(1);
    });

    it('accumulates traffic on repeated traversals', () => {
      // Multiple traversals east
      for (let i = 0; i < 5; i++) {
        mapKnowledge.recordTraversal(8, 8, 24, 8, 100 + i);
      }

      const sector = mapKnowledge.getSector(0, 0);
      expect(sector.pathTraffic.get('e')).toBe(5);
    });

    it('records bidirectional traffic', () => {
      mapKnowledge.recordTraversal(8, 8, 24, 8, 100);

      // From sector should have east traffic
      const fromSector = mapKnowledge.getSector(0, 0);
      expect(fromSector.pathTraffic.get('e')).toBe(1);

      // To sector should have west traffic (reverse direction)
      const toSector = mapKnowledge.getSector(1, 0);
      expect(toSector.pathTraffic.get('w')).toBe(1);
    });

    it('returns lower path weight for high-traffic paths', () => {
      // No traffic - base cost
      const baseCost = mapKnowledge.getPathWeight(0, 0, 'e');
      expect(baseCost).toBe(1.0);

      // Add traffic
      for (let i = 0; i < 100; i++) {
        mapKnowledge.recordTraversal(8, 8, 24, 8, i);
      }

      // High traffic - reduced cost
      const reducedCost = mapKnowledge.getPathWeight(0, 0, 'e');
      expect(reducedCost).toBeLessThan(1.0);
    });

    it('does not record same-sector movement', () => {
      // Movement within same sector
      mapKnowledge.recordTraversal(5, 5, 10, 10, 100);

      const sector = mapKnowledge.getSector(0, 0);
      // No direction-based traffic should be recorded
      expect(sector.pathTraffic.size).toBe(0);
      // But lastVisited should be updated
      expect(sector.lastVisited).toBe(100);
    });
  });

  describe('resource areas', () => {
    it('records resource sightings', () => {
      mapKnowledge.recordResourceSighting(20, 20, 'food', 80, 100);

      const sector = mapKnowledge.getSector(1, 1);
      expect(sector.resourceAbundance.get('food')).toBeGreaterThan(0);
      expect(sector.explored).toBe(true);
    });

    it('smoothly updates abundance on repeated sightings', () => {
      // First sighting: updated = 0 * 0.7 + 100 * 0.3 = 30
      mapKnowledge.recordResourceSighting(20, 20, 'food', 100, 100);
      const first = mapKnowledge.getSector(1, 1).resourceAbundance.get('food')!;
      expect(first).toBe(30);

      // Second sighting with higher abundance moves toward new value
      // updated = 30 * 0.7 + 80 * 0.3 = 21 + 24 = 45
      mapKnowledge.recordResourceSighting(20, 20, 'food', 80, 110);
      const second = mapKnowledge.getSector(1, 1).resourceAbundance.get('food')!;

      // Should be moving toward new value
      expect(second).toBeGreaterThan(first);
      expect(second).toBeLessThan(80);
    });

    it('records resource depletion', () => {
      // Initial sighting
      mapKnowledge.recordResourceSighting(20, 20, 'wood', 80, 100);
      const initial = mapKnowledge.getSector(1, 1).resourceAbundance.get('wood')!;

      // Depletion
      mapKnowledge.recordResourceDepletion(20, 20, 'wood', 200);
      const depleted = mapKnowledge.getSector(1, 1).resourceAbundance.get('wood')!;

      expect(depleted).toBeLessThan(initial * 0.5);
    });

    it('finds resource areas sorted by abundance and proximity', () => {
      // Multiple resource areas at different distances
      mapKnowledge.recordResourceSighting(20, 20, 'food', 90, 100); // Close, high
      mapKnowledge.recordResourceSighting(100, 100, 'food', 95, 100); // Far, highest
      mapKnowledge.recordResourceSighting(40, 40, 'food', 50, 100); // Medium, lower

      const results = mapKnowledge.findResourceAreas('food', 10, 10, 5);

      expect(results.length).toBeGreaterThan(0);
      // Closest high-abundance should be first
      expect(results[0].sectorX).toBe(1);
      expect(results[0].sectorY).toBe(1);
    });

    it('ignores low-abundance areas in search', () => {
      mapKnowledge.recordResourceSighting(20, 20, 'stone', 5, 100); // Very low

      const results = mapKnowledge.findResourceAreas('stone', 10, 10, 5);
      expect(results.length).toBe(0);
    });
  });

  describe('occupancy tracking', () => {
    it('tracks agent occupancy in sectors', () => {
      mapKnowledge.updateOccupancy(20, 20, 1);
      mapKnowledge.updateOccupancy(20, 20, 1);

      const sector = mapKnowledge.getSector(1, 1);
      expect(sector.currentOccupancy).toBe(2);
    });

    it('decrements occupancy when agents leave', () => {
      mapKnowledge.updateOccupancy(20, 20, 1);
      mapKnowledge.updateOccupancy(20, 20, -1);

      const sector = mapKnowledge.getSector(1, 1);
      expect(sector.currentOccupancy).toBe(0);
    });

    it('finds crowded sectors', () => {
      // Create a crowded sector
      for (let i = 0; i < 5; i++) {
        mapKnowledge.updateOccupancy(20, 20, 1);
      }

      const crowded = mapKnowledge.getCrowdedSectors(3);
      expect(crowded.length).toBe(1);
      expect(crowded[0].x).toBe(1);
      expect(crowded[0].y).toBe(1);
    });
  });

  describe('exploration', () => {
    it('marks sectors as explored on visit', () => {
      mapKnowledge.recordTraversal(8, 8, 24, 8, 100);

      const toSector = mapKnowledge.getSector(1, 0);
      expect(toSector.explored).toBe(true);
    });

    it('suggests unexplored directions for exploration', () => {
      // Mark some sectors as explored
      mapKnowledge.recordTraversal(8, 8, 24, 8, 100); // East explored
      mapKnowledge.recordTraversal(8, 8, 8, 24, 100); // South explored

      const bestDir = mapKnowledge.getBestExplorationDirection(8, 8);

      // Should prefer unexplored direction (not east or south)
      expect(bestDir).not.toBeNull();
      expect(['n', 'w', 'ne', 'nw', 'sw'].includes(bestDir!)).toBe(true);
    });
  });

  describe('area descriptions', () => {
    it('describes unexplored areas', () => {
      const desc = mapKnowledge.describeArea(500, 500);
      expect(desc).toBe('unexplored area');
    });

    it('describes explored areas with resources', () => {
      // Need abundance >= 30 to show in description
      // Formula: updated = current * 0.7 + abundance * 0.3
      // Need multiple sightings to build up abundance above 30
      mapKnowledge.recordResourceSighting(20, 20, 'food', 100, 100); // -> 30
      mapKnowledge.recordResourceSighting(20, 20, 'food', 100, 110); // -> 51
      mapKnowledge.recordResourceSighting(20, 20, 'food', 100, 120); // -> 65.7

      const desc = mapKnowledge.describeArea(20, 20);
      expect(desc).toContain('food');
    });

    it('includes crowding in description', () => {
      mapKnowledge.recordResourceSighting(20, 20, 'food', 80, 100);
      for (let i = 0; i < 5; i++) {
        mapKnowledge.updateOccupancy(20, 20, 1);
      }

      const desc = mapKnowledge.describeArea(20, 20);
      expect(desc).toContain('crowded');
    });

    it('uses named areas', () => {
      mapKnowledge.recordResourceSighting(20, 20, 'food', 80, 100);
      mapKnowledge.nameArea(20, 20, 'Berry Grove');

      const desc = mapKnowledge.describeArea(20, 20);
      expect(desc).toContain('Berry Grove');
    });
  });

  describe('decay', () => {
    it('decays traffic over time', () => {
      // Build up traffic
      for (let i = 0; i < 100; i++) {
        mapKnowledge.recordTraversal(8, 8, 24, 8, i);
      }

      const before = mapKnowledge.getSector(0, 0).pathTraffic.get('e')!;

      // Decay
      mapKnowledge.decay(1000);

      const after = mapKnowledge.getSector(0, 0).pathTraffic.get('e')!;
      expect(after).toBeLessThan(before);
    });

    it('removes very low traffic', () => {
      mapKnowledge.recordTraversal(8, 8, 24, 8, 0);

      // Decay many times
      for (let i = 0; i < 1000; i++) {
        mapKnowledge.decay(i * 100);
      }

      const traffic = mapKnowledge.getSector(0, 0).pathTraffic.get('e');
      expect(traffic).toBeUndefined();
    });
  });

  describe('serialization', () => {
    it('serializes and deserializes correctly', () => {
      // Set up some state
      mapKnowledge.recordTraversal(8, 8, 24, 8, 100);
      mapKnowledge.recordResourceSighting(20, 20, 'food', 80, 100);
      mapKnowledge.nameArea(20, 20, 'Test Area');

      // Serialize
      const serialized = mapKnowledge.serialize();

      // Deserialize
      const restored = MapKnowledge.deserialize(serialized as any);

      // Check state preserved
      expect(restored.getSector(0, 0).pathTraffic.get('e')).toBe(1);
      expect(restored.getSector(1, 1).resourceAbundance.get('food')).toBeGreaterThan(0);
      expect(restored.getSector(1, 1).areaName).toBe('Test Area');
    });
  });
});
