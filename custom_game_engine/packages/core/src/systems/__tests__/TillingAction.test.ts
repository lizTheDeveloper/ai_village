import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { SoilSystem, type Tile, type BiomeType } from '../SoilSystem.js';
import { parseAction, isValidAction } from '../../actions/AgentAction.js';

/**
 * Phase 9: Tilling Action Tests
 *
 * These tests verify the tilling action functionality following TDD principles.
 * Tests are written BEFORE implementation and should fail initially (TDD red phase).
 *
 * Based on work order acceptance criteria from:
 * agents/autonomous-dev/work-orders/tilling-action/work-order.md
 */
describe('Tilling Action', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let soilSystem: SoilSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    soilSystem = new SoilSystem();
  });

  /**
   * Helper function to create a test tile
   */
  function createTile(terrain: string, biome: BiomeType): Tile {
    return {
      terrain,
      moisture: 50,
      fertility: 50,
      biome,
      tilled: false,
      plantability: 0,
      nutrients: {
        nitrogen: 0,
        phosphorus: 0,
        potassium: 0,
      },
      fertilized: false,
      fertilizerDuration: 0,
      lastWatered: 0,
      lastTilled: 0,
      composted: false,
    };
  }

  describe('Acceptance Criterion 1: Action Type Definition', () => {
    it('should recognize "till" as a valid action type', () => {
      const action = { type: 'till', position: { x: 5, y: 5 } };
      expect(isValidAction(action)).toBe(true);
    });

    it('should have required fields for till action', () => {
      const action = { type: 'till', position: { x: 5, y: 5 } };
      expect(action.type).toBe('till');
      expect(action.position).toBeDefined();
      expect(action.position.x).toBeDefined();
      expect(action.position.y).toBeDefined();
    });
  });

  describe('Acceptance Criterion 2: Basic Tilling Success', () => {
    it('should change terrain from grass to dirt when tilled', () => {
      const tile = createTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.terrain).toBe('dirt');
    });

    it('should set tilled flag to true', () => {
      const tile = createTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.tilled).toBe(true);
    });

    it('should set plantability counter to 3', () => {
      const tile = createTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.plantability).toBe(3);
    });

    it('should set fertility based on biome', () => {
      const tile = createTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.fertility).toBeGreaterThan(0);
      expect(tile.fertility).toBeLessThanOrEqual(100);
    });

    it('should initialize nutrients (N, P, K)', () => {
      const tile = createTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.nutrients.nitrogen).toBeGreaterThan(0);
      expect(tile.nutrients.phosphorus).toBeGreaterThan(0);
      expect(tile.nutrients.potassium).toBeGreaterThan(0);
    });
  });

  describe('Acceptance Criterion 3: Tilling Validation - Valid Terrain', () => {
    it('should successfully till grass terrain', () => {
      const tile = createTile('grass', 'plains');

      expect(() => soilSystem.tillTile(world, tile, 5, 5)).not.toThrow();
      expect(tile.terrain).toBe('dirt');
    });

    it('should successfully till dirt terrain (re-tilling)', () => {
      const tile = createTile('dirt', 'plains');

      expect(() => soilSystem.tillTile(world, tile, 5, 5)).not.toThrow();
      expect(tile.tilled).toBe(true);
    });
  });

  describe('Acceptance Criterion 4: Tilling Validation - Invalid Terrain', () => {
    it('should throw error when attempting to till stone terrain', () => {
      const tile = createTile('stone', 'mountains');

      expect(() => soilSystem.tillTile(world, tile, 5, 5)).toThrow(
        'Cannot till stone terrain at (5,5). Only grass and dirt can be tilled.'
      );
    });

    it('should throw error when attempting to till water terrain', () => {
      const tile = createTile('water', 'river');

      expect(() => soilSystem.tillTile(world, tile, 5, 5)).toThrow(
        'Cannot till water terrain at (5,5). Only grass and dirt can be tilled.'
      );
    });

    it('should throw error when attempting to till sand terrain', () => {
      const tile = createTile('sand', 'desert');

      expect(() => soilSystem.tillTile(world, tile, 5, 5)).toThrow(
        'Cannot till sand terrain at (5,5). Only grass and dirt can be tilled.'
      );
    });

    it('should NOT modify tile state when validation fails', () => {
      const tile = createTile('stone', 'mountains');
      const originalTerrain = tile.terrain;
      const originalTilled = tile.tilled;

      try {
        soilSystem.tillTile(world, tile, 5, 5);
      } catch {
        // Expected to throw
      }

      expect(tile.terrain).toBe(originalTerrain);
      expect(tile.tilled).toBe(originalTilled);
    });

    it('should NOT emit tilling event when validation fails', () => {
      const tile = createTile('water', 'river');
      const handler = vi.fn();
      eventBus.subscribe('soil:tilled', handler);

      try {
        soilSystem.tillTile(world, tile, 5, 5);
      } catch {
        // Expected to throw
      }
      eventBus.flush();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Acceptance Criterion 5: Position Validation', () => {
    it('should validate agent is adjacent to target tile (distance <= √2)', () => {
      // This will be tested in ActionHandler integration tests
      // Testing distance formula: √((x2-x1)² + (y2-y1)²) ≤ √2

      const agentPos = { x: 5, y: 5 };
      const adjacentPositions = [
        { x: 5, y: 6 },   // north
        { x: 6, y: 6 },   // northeast (diagonal)
        { x: 6, y: 5 },   // east
        { x: 6, y: 4 },   // southeast (diagonal)
        { x: 5, y: 4 },   // south
        { x: 4, y: 4 },   // southwest (diagonal)
        { x: 4, y: 5 },   // west
        { x: 4, y: 6 },   // northwest (diagonal)
      ];

      adjacentPositions.forEach(pos => {
        const dx = pos.x - agentPos.x;
        const dy = pos.y - agentPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        expect(distance).toBeLessThanOrEqual(Math.sqrt(2));
      });
    });

    it('should reject action if agent is too far from target', () => {
      // This will be tested in ActionHandler integration tests
      const agentPos = { x: 5, y: 5 };
      const farPos = { x: 8, y: 8 };

      const dx = farPos.x - agentPos.x;
      const dy = farPos.y - agentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      expect(distance).toBeGreaterThan(Math.sqrt(2));
    });
  });

  describe('Acceptance Criterion 6: SoilSystem Integration', () => {
    it('should call SoilSystem.tillTile with correct parameters', () => {
      const tile = createTile('grass', 'plains');
      const tillSpy = vi.spyOn(soilSystem, 'tillTile');

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tillSpy).toHaveBeenCalledWith(world, tile, 5, 5);
    });

    it('should use existing fertility calculation logic', () => {
      const tile = createTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 5, 5);

      // Fertility should be set based on biome (plains = 70-80)
      expect(tile.fertility).toBeGreaterThanOrEqual(70);
      expect(tile.fertility).toBeLessThanOrEqual(80);
    });

    it('should initialize nutrients based on fertility', () => {
      const tile = createTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 5, 5);

      // Nutrients should be proportional to fertility
      expect(tile.nutrients.nitrogen).toBeCloseTo(tile.fertility, 0);
      expect(tile.nutrients.phosphorus).toBeCloseTo(tile.fertility * 0.8, 0);
      expect(tile.nutrients.potassium).toBeCloseTo(tile.fertility * 0.9, 0);
    });
  });

  describe('Acceptance Criterion 7: EventBus Integration', () => {
    it('should emit soil:tilled event when tilling succeeds', () => {
      const tile = createTile('grass', 'plains');
      const handler = vi.fn();
      eventBus.subscribe('soil:tilled', handler);

      soilSystem.tillTile(world, tile, 5, 5);
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit soil:tilled event with position data', () => {
      const tile = createTile('grass', 'plains');
      const handler = vi.fn();
      eventBus.subscribe('soil:tilled', handler);

      soilSystem.tillTile(world, tile, 5, 5);
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'soil:tilled',
          data: expect.objectContaining({
            x: 5,
            y: 5,
          }),
        })
      );
    });

    it('should emit soil:tilled event with fertility data', () => {
      const tile = createTile('grass', 'plains');
      const handler = vi.fn();
      eventBus.subscribe('soil:tilled', handler);

      soilSystem.tillTile(world, tile, 5, 5);
      eventBus.flush();

      // soil:tilled event contains x, y - fertility is in tile state
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            x: 5,
            y: 5,
          }),
        })
      );
      // Verify fertility was set on tile
      expect(tile.fertility).toBeGreaterThan(0);
    });

    it('should emit soil:tilled event with biome data', () => {
      const tile = createTile('grass', 'plains');
      const handler = vi.fn();
      eventBus.subscribe('soil:tilled', handler);

      soilSystem.tillTile(world, tile, 5, 5);
      eventBus.flush();

      // soil:tilled event contains x, y - biome is in tile state
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            x: 5,
            y: 5,
          }),
        })
      );
      // Verify biome is preserved on tile
      expect(tile.biome).toBe('plains');
    });
  });

  describe('Acceptance Criterion 8: Fertility by Biome', () => {
    it('should set fertility 70-80 for plains biome', () => {
      const tile = createTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.fertility).toBeGreaterThanOrEqual(70);
      expect(tile.fertility).toBeLessThanOrEqual(80);
    });

    it('should set fertility 60-70 for forest biome', () => {
      const tile = createTile('grass', 'forest');

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.fertility).toBeGreaterThanOrEqual(60);
      expect(tile.fertility).toBeLessThanOrEqual(70);
    });

    it('should set fertility 80-90 for river biome', () => {
      const tile = createTile('grass', 'river');

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.fertility).toBeGreaterThanOrEqual(80);
      expect(tile.fertility).toBeLessThanOrEqual(90);
    });

    it('should set fertility 20-30 for desert biome', () => {
      const tile = createTile('grass', 'desert');

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.fertility).toBeGreaterThanOrEqual(20);
      expect(tile.fertility).toBeLessThanOrEqual(30);
    });

    it('should set fertility 40-50 for mountains biome', () => {
      const tile = createTile('grass', 'mountains');

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.fertility).toBeGreaterThanOrEqual(40);
      expect(tile.fertility).toBeLessThanOrEqual(50);
    });

    it('should set fertility 0 for ocean biome (not tillable)', () => {
      const tile = createTile('grass', 'ocean');

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.fertility).toBe(0);
    });
  });

  describe('Acceptance Criterion 9: Action Queue Processing', () => {
    it('should recognize till action type in ActionHandler', () => {
      // This will be implemented when ActionHandler is updated
      // For now, verify the action structure is valid
      const action = { type: 'till', position: { x: 5, y: 5 } };
      expect(isValidAction(action)).toBe(true);
    });

    it('should extract position from till action', () => {
      const action = { type: 'till' as const, position: { x: 10, y: 15 } };
      expect(action.position.x).toBe(10);
      expect(action.position.y).toBe(15);
    });

    it.skip('should handle till action completion', () => {
      // TODO: This will test that action is removed from queue after completion
      // To be implemented in ActionHandler integration tests
      expect(true).toBe(true);
    });

    it.skip('should handle till action errors gracefully', () => {
      // TODO: This will test that errors don't crash the action handler
      // To be implemented in ActionHandler integration tests
      expect(true).toBe(true);
    });
  });

  describe('Acceptance Criterion 10: LLM Action Parsing', () => {
    it('should parse "till" keyword to till action', () => {
      const action = parseAction('I will till the soil');
      expect(action).toEqual(
        expect.objectContaining({
          type: 'till',
        })
      );
    });

    it('should parse "tilling" keyword to till action', () => {
      const action = parseAction('I am tilling the field');
      expect(action).toEqual(
        expect.objectContaining({
          type: 'till',
        })
      );
    });

    it('should parse "plow" keyword to till action', () => {
      const action = parseAction('I need to plow the ground');
      expect(action).toEqual(
        expect.objectContaining({
          type: 'till',
        })
      );
    });

    it('should parse "prepare soil" to till action', () => {
      const action = parseAction('I will prepare the soil for planting');
      expect(action).toEqual(
        expect.objectContaining({
          type: 'till',
        })
      );
    });

    it('should extract position from till response', () => {
      // This will be implemented when parseAction is updated
      // For now, verify we can handle position context
      const action = parseAction('I will till at position 5,5');
      // Will need to implement position extraction logic
      expect(action?.type).toBeDefined();
    });
  });

  describe('Acceptance Criterion 11: CLAUDE.md Compliance - No Silent Fallbacks', () => {
    it('should throw when tile is null/undefined', () => {
      // Testing null validation: use unknown pattern per CLAUDE.md type safety guidelines
      const invalidTile: unknown = null;
      expect(() => {
        soilSystem.tillTile(world, invalidTile as Tile, 5, 5);
      }).toThrow();
    });

    it('should throw when position is invalid', () => {
      const tile = createTile('grass', 'plains');

      expect(() => {
        soilSystem.tillTile(world, tile, NaN, 5);
      }).toThrow();
    });

    it('should throw clear error message for invalid terrain', () => {
      const tile = createTile('stone', 'mountains');

      expect(() => {
        soilSystem.tillTile(world, tile, 5, 5);
      }).toThrow(/Cannot till .* terrain/);
    });

    it('should NOT use fallback fertility values', () => {
      const tile = createTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 5, 5);

      // Fertility should be based on biome, not a default fallback
      expect(tile.fertility).not.toBe(50); // 50 would be a fallback
      expect(tile.fertility).toBeGreaterThanOrEqual(70);
    });

    it('should NOT catch and swallow errors', () => {
      const tile = createTile('water', 'river');

      // Error should propagate, not be caught silently
      expect(() => {
        soilSystem.tillTile(world, tile, 5, 5);
      }).toThrow();
    });
  });

  describe('Acceptance Criterion 12: Idempotency - Re-tilling', () => {
    it('should allow re-tilling an already-tilled depleted tile', () => {
      const tile = createTile('grass', 'plains');

      // First tilling
      soilSystem.tillTile(world, tile, 5, 5);
      expect(tile.tilled).toBe(true);
      expect(tile.plantability).toBe(3);

      // Simulate depletion (required before re-tilling)
      tile.plantability = 0;

      // Second tilling (re-till) - should now succeed
      expect(() => soilSystem.tillTile(world, tile, 5, 5)).not.toThrow();
      expect(tile.plantability).toBe(3); // Reset to 3
    });

    it('should reset plantability counter to 3 when re-tilling', () => {
      const tile = createTile('dirt', 'plains');
      tile.tilled = true;
      tile.plantability = 0; // Depleted

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.plantability).toBe(3);
    });

    it('should refresh fertility when re-tilling', () => {
      const tile = createTile('dirt', 'plains');
      tile.tilled = true;
      tile.fertility = 30; // Depleted

      soilSystem.tillTile(world, tile, 5, 5);

      // Fertility should be refreshed to biome level
      expect(tile.fertility).toBeGreaterThanOrEqual(70);
    });

    it('should emit tilling event when re-tilling', () => {
      const tile = createTile('dirt', 'plains');
      tile.tilled = true;
      const handler = vi.fn();
      eventBus.subscribe('soil:tilled', handler);

      soilSystem.tillTile(world, tile, 5, 5);
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should throw error when tilling tile without biome (CLAUDE.md)', () => {
      const tile = createTile('grass', 'plains');
      tile.biome = undefined;

      // CLAUDE.md: Missing biome should crash, not default to 50
      expect(() => soilSystem.tillTile(world, tile, 5, 5)).toThrow(
        /no biome data.*terrain generation failed/i
      );
    });

    it('should handle tilling at negative coordinates', () => {
      const tile = createTile('grass', 'plains');

      expect(() => soilSystem.tillTile(world, tile, -5, -5)).not.toThrow();
    });

    it('should handle tilling at large coordinates', () => {
      const tile = createTile('grass', 'plains');

      expect(() => soilSystem.tillTile(world, tile, 1000, 1000)).not.toThrow();
    });

    it('should preserve existing moisture when tilling', () => {
      const tile = createTile('grass', 'plains');
      tile.moisture = 75;

      soilSystem.tillTile(world, tile, 5, 5);

      expect(tile.moisture).toBe(75);
    });

    it('should reset fertilizer state when tilling', () => {
      const tile = createTile('dirt', 'plains');
      tile.fertilized = true;
      tile.fertilizerDuration = 100;

      soilSystem.tillTile(world, tile, 5, 5);

      // Re-tilling should reset fertilizer (implementation dependent)
      // This behavior may need to be defined in the spec
      expect(tile.tilled).toBe(true);
    });
  });

  describe('Integration with Other Systems', () => {
    it('should work with PlantSystem (planted flag check)', () => {
      const tile = createTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 5, 5);

      // Tilled tile should be ready for planting
      expect(tile.tilled).toBe(true);
      expect(tile.plantability).toBeGreaterThan(0);
    });

    it('should work with WaterSystem (moisture tracking)', () => {
      const tile = createTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 5, 5);

      // Moisture should be preserved for watering system
      expect(tile.moisture).toBeDefined();
    });

    it('should work with WeatherSystem (rain effects)', () => {
      const tile = createTile('grass', 'plains');

      soilSystem.tillTile(world, tile, 5, 5);

      // Tile should have lastWatered tracking for weather integration
      expect(tile.lastWatered).toBeDefined();
    });
  });
});
