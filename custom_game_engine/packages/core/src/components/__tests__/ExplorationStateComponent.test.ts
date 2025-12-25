import { describe, it, expect, beforeEach } from 'vitest';
import { ExplorationStateComponent } from '../ExplorationStateComponent';

describe('ExplorationStateComponent', () => {
  let component: ExplorationStateComponent;

  beforeEach(() => {
    component = new ExplorationStateComponent();
  });

  describe('AC3: Exploration Covers Territory', () => {
    it('should mark sector as explored', () => {
      const sectorX = 2;
      const sectorY = 3;

      component.markSectorExplored(sectorX, sectorY, 100);

      expect(component.isSectorExplored(sectorX, sectorY)).toBe(true);
    });

    it('should not revisit recently explored sectors', () => {
      component.markSectorExplored(2, 3, 100);

      const shouldRevisit = component.shouldRevisitSector(2, 3, 150);

      expect(shouldRevisit).toBe(false);
    });

    it('should allow revisiting old sectors after 500 ticks', () => {
      component.markSectorExplored(2, 3, 100);

      const shouldRevisit = component.shouldRevisitSector(2, 3, 700);

      expect(shouldRevisit).toBe(true);
    });

    it('should identify frontier sectors (unexplored adjacent to explored)', () => {
      // Mark center sector as explored
      component.markSectorExplored(5, 5, 100);

      const frontier = component.getFrontierSectors();

      // Should include adjacent unexplored sectors
      expect(frontier.length).toBeGreaterThan(0);
      expect(frontier.some(s => s.x === 4 && s.y === 5)).toBe(true); // West
      expect(frontier.some(s => s.x === 6 && s.y === 5)).toBe(true); // East
      expect(frontier.some(s => s.x === 5 && s.y === 4)).toBe(true); // North
      expect(frontier.some(s => s.x === 5 && s.y === 6)).toBe(true); // South
    });

    it('should not include fully surrounded sectors in frontier', () => {
      // Mark center and all adjacent sectors as explored
      component.markSectorExplored(5, 5, 100);
      component.markSectorExplored(4, 5, 100);
      component.markSectorExplored(6, 5, 100);
      component.markSectorExplored(5, 4, 100);
      component.markSectorExplored(5, 6, 100);

      const frontier = component.getFrontierSectors();

      // Center sector should not be in frontier (fully surrounded)
      expect(frontier.some(s => s.x === 5 && s.y === 5)).toBe(false);
    });

    it('should track exploration radius based on settlement size', () => {
      component.setExplorationRadius(50);

      expect(component.getExplorationRadius()).toBe(50);
    });

    it('should scale exploration radius with settlement growth', () => {
      const initialRadius = component.getExplorationRadius();

      component.updateExplorationRadius(10); // 10 settlers

      const smallRadius = component.getExplorationRadius();

      component.updateExplorationRadius(50); // 50 settlers

      const largeRadius = component.getExplorationRadius();

      expect(largeRadius).toBeGreaterThan(smallRadius);
      expect(smallRadius).toBeGreaterThanOrEqual(initialRadius);
    });
  });

  describe('spiral exploration', () => {
    it('should calculate next spiral position', () => {
      const homeBase = { x: 100, y: 100 };
      component.initializeSpiral(homeBase);

      const firstPos = component.getNextSpiralPosition();

      expect(firstPos).toBeDefined();
      expect(firstPos?.x).toBeGreaterThanOrEqual(homeBase.x - 1);
      expect(firstPos?.y).toBeGreaterThanOrEqual(homeBase.y - 1);
    });

    it('should spiral outward from home base', () => {
      const homeBase = { x: 100, y: 100 };
      component.initializeSpiral(homeBase);

      const positions = [];
      for (let i = 0; i < 10; i++) {
        const pos = component.getNextSpiralPosition();
        if (pos) positions.push(pos);
      }

      // Positions should gradually move away from home
      const distances = positions.map(p =>
        Math.sqrt((p.x - homeBase.x) ** 2 + (p.y - homeBase.y) ** 2)
      );

      // Average distance should increase
      const firstHalf = distances.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const secondHalf = distances.slice(5).reduce((a, b) => a + b, 0) / 5;

      expect(secondHalf).toBeGreaterThan(firstHalf);
    });

    it('should reset spiral state', () => {
      const homeBase = { x: 100, y: 100 };
      component.initializeSpiral(homeBase);

      component.getNextSpiralPosition();
      component.getNextSpiralPosition();

      component.resetSpiral();

      const pos = component.getNextSpiralPosition();

      // Should start near home again (within 1 sector = 16 tiles)
      expect(Math.abs(pos!.x - homeBase.x)).toBeLessThan(20);
      expect(Math.abs(pos!.y - homeBase.y)).toBeLessThan(20);
    });
  });

  describe('sector metadata', () => {
    it('should track last explored timestamp for sector', () => {
      component.markSectorExplored(2, 3, 100);

      const sector = component.getSectorInfo(2, 3);

      expect(sector?.lastExplored).toBe(100);
    });

    it('should track exploration count for sector', () => {
      component.markSectorExplored(2, 3, 100);
      component.markSectorExplored(2, 3, 700); // Revisit

      const sector = component.getSectorInfo(2, 3);

      expect(sector?.explorationCount).toBe(2);
    });

    it('should track resources found in sector', () => {
      component.markSectorExplored(2, 3, 100);
      component.recordResourceFound(2, 3, 'wood', 150);

      const sector = component.getSectorInfo(2, 3);

      expect(sector?.resourcesFound).toContain('wood');
    });
  });

  describe('AC10: No Silent Fallbacks (CLAUDE.md Compliance)', () => {
    it('should throw error for invalid sector coordinates', () => {
      expect(() => {
        component.markSectorExplored(NaN, 5, 100);
      }).toThrow(/sector/i);
    });

    it('should throw error for negative sector coordinates', () => {
      expect(() => {
        component.markSectorExplored(-1, 5, 100);
      }).toThrow(/sector/i);
    });

    it('should throw error for invalid tick value', () => {
      expect(() => {
        component.markSectorExplored(2, 3, -1);
      }).toThrow(/tick/i);
    });

    it('should throw error for invalid exploration radius', () => {
      expect(() => {
        component.setExplorationRadius(-10);
      }).toThrow(/radius/i);
    });

    it('should throw error when spiral not initialized', () => {
      expect(() => {
        component.getNextSpiralPosition();
      }).toThrow(/spiral/i);
    });
  });

  describe('exploration statistics', () => {
    it('should calculate total explored sectors', () => {
      component.markSectorExplored(2, 3, 100);
      component.markSectorExplored(3, 4, 200);
      component.markSectorExplored(4, 5, 300);

      const count = component.getExploredSectorCount();

      expect(count).toBe(3);
    });

    it('should calculate exploration coverage percentage', () => {
      component.setExplorationRadius(32); // 4 sectors radius

      // Mark some sectors as explored
      for (let x = 0; x < 2; x++) {
        for (let y = 0; y < 2; y++) {
          component.markSectorExplored(x, y, 100);
        }
      }

      const coverage = component.getExplorationCoverage();

      expect(coverage).toBeGreaterThan(0);
      expect(coverage).toBeLessThanOrEqual(1);
    });
  });

  describe('sector prioritization', () => {
    it('should prioritize unexplored frontier sectors', () => {
      component.markSectorExplored(5, 5, 100);

      const priority = component.getSectorPriority(6, 5); // Adjacent unexplored

      expect(priority).toBeGreaterThan(0.5);
    });

    it('should deprioritize recently explored sectors', () => {
      component.markSectorExplored(5, 5, 100);

      const priority = component.getSectorPriority(5, 5, 150);

      expect(priority).toBeLessThan(0.3);
    });

    it('should prioritize sectors with known resources', () => {
      component.markSectorExplored(5, 5, 100);
      component.recordResourceFound(5, 5, 'wood', 100);

      const priority = component.getSectorPriority(5, 5, 700); // Long enough to revisit

      expect(priority).toBeGreaterThan(0.5);
    });
  });
});
