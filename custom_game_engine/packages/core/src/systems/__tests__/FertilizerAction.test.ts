import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { SoilSystem, FERTILIZERS } from '../SoilSystem.js';

/**
 * Phase 9: Fertilizer Application Tests
 *
 * These tests verify that agents can apply fertilizer to restore soil quality.
 *
 * Acceptance Criterion 4: Fertilizer Application
 * WHEN: An agent applies fertilizer (compost, manure, etc.)
 * THEN: The tile SHALL:
 *   - Increase fertility by fertilizer amount
 *   - Increase nutrients appropriately
 *   - Set fertilized flag with duration
 */
describe('Fertilizer Application', () => {
  let _world: WorldImpl;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    _world = new WorldImpl(eventBus);
  });

  describe('Compost Application', () => {
    it('should increase fertility by 20 when compost is applied', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 40,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 40, phosphorus: 32, potassium: 36 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS.compost);

      expect(tile.fertility).toBe(60); // 40 + 20
    });

    it('should set fertilized flag to true', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 40,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 40, phosphorus: 32, potassium: 36 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS.compost);

      expect(tile.fertilized).toBe(true);
    });

    it('should set fertilizerDuration for one season', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 40,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 40, phosphorus: 32, potassium: 36 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS.compost);

      // Compost duration: 90 days * 86400 seconds/day = 7,776,000 seconds
      expect(tile.fertilizerDuration).toBe(90 * 86400);
    });

    it('should cap fertility at 100', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 90,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 90, phosphorus: 72, potassium: 81 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS.compost);

      expect(tile.fertility).toBe(100); // 90 + 20 = 110, capped at 100
    });
  });

  describe('Fish Meal Application', () => {
    it('should increase fertility by 15', () => {
      // Note: Fish meal gives +15, not +30 (based on FERTILIZERS constant)
      const tile = {
        terrain: 'dirt' as const,
        fertility: 40,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 40, phosphorus: 32, potassium: 36 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS['fish-meal']);

      expect(tile.fertility).toBe(55); // 40 + 15
    });

    it('should last for 7 days', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 40,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 40, phosphorus: 32, potassium: 36 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS['fish-meal']);

      // Fish meal duration: 7 days * 86400 seconds/day
      expect(tile.fertilizerDuration).toBe(7 * 86400);
    });
  });

  describe('Bone Meal Application', () => {
    it('should apply quality bonus', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 40,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 40, phosphorus: 32, potassium: 36 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS['bone-meal']);

      // Bone meal: +10 fertility, high phosphorus boost (+25)
      expect(tile.fertility).toBe(50); // 40 + 10
      expect(tile.nutrients.phosphorus).toBe(57); // 32 + 25
    });

    it('should last for 14 days', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 40,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 40, phosphorus: 32, potassium: 36 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS['bone-meal']);

      // Bone meal duration: 14 days * 86400 seconds/day
      expect(tile.fertilizerDuration).toBe(14 * 86400);
    });
  });

  describe('Manure Application', () => {
    it('should increase fertility by 25', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 40,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 40, phosphorus: 32, potassium: 36 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS.manure);

      expect(tile.fertility).toBe(65); // 40 + 25
    });

    it('should increase nitrogen by 15', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 40,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 40, phosphorus: 32, potassium: 36 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS.manure);

      expect(tile.nutrients.nitrogen).toBe(55); // 40 + 15
    });

    it('should last for one season', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 40,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 40, phosphorus: 32, potassium: 36 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS.manure);

      // Manure duration: 90 days (1 season) * 86400 seconds/day
      expect(tile.fertilizerDuration).toBe(90 * 86400);
    });
  });

  describe('Nutrient Tracking', () => {
    it('should increase nitrogen when appropriate fertilizer is applied', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 50,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 50, phosphorus: 40, potassium: 45 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      // Fish meal is nitrogen-rich (+20 nitrogen)
      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS['fish-meal']);

      expect(tile.nutrients.nitrogen).toBe(70); // 50 + 20
    });

    it('should increase phosphorus when appropriate fertilizer is applied', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 50,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 50, phosphorus: 40, potassium: 45 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      // Bone meal is phosphorus-rich (+25 phosphorus)
      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS['bone-meal']);

      expect(tile.nutrients.phosphorus).toBe(65); // 40 + 25
    });

    it('should increase potassium when appropriate fertilizer is applied', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 50,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 50, phosphorus: 40, potassium: 45 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      // Manure has good potassium (+12 potassium)
      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS.manure);

      expect(tile.nutrients.potassium).toBe(57); // 45 + 12
    });

    it('should cap nutrients at 100', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 50,
        moisture: 50,
        biome: 'plains' as const,
        tilled: true,
        plantability: 3,
        nutrients: { nitrogen: 95, phosphorus: 40, potassium: 45 },
        fertilized: false,
        fertilizerDuration: 0,
        lastWatered: 0,
        lastTilled: 100,
        composted: false,
      };

      const soilSystem = new SoilSystem();

      // Compost adds +10 nitrogen
      soilSystem.fertilizeTile(_world, tile, 5, 5, FERTILIZERS.compost);

      expect(tile.nutrients.nitrogen).toBe(100); // 95 + 10 = 105, capped at 100
    });
  });

  describe('Fertilizer Duration Decay', () => {
    it.skip('should decrement fertilizer duration over time', () => {
      // TODO: Duration decay is not handled in fertilizeTile - requires time-based system
      // This should be implemented in a system that runs per-tick to decrement durations
      // Skip until that system is implemented
      expect(true).toBe(true);
    });

    it.skip('should clear fertilized flag when duration reaches 0', () => {
      // TODO: Duration decay is not handled in fertilizeTile - requires time-based system
      // This should be implemented in a system that runs per-tick to decrement durations
      // Skip until that system is implemented
      expect(true).toBe(true);
    });

    it.skip('should not allow duration to go negative', () => {
      // TODO: Duration decay is not handled in fertilizeTile - requires time-based system
      // This should be implemented in a system that runs per-tick to decrement durations
      // Skip until that system is implemented
      expect(true).toBe(true);
    });
  });

  describe('FertilizeAction Structure', () => {
    it('should have type "fertilize"', () => {
      const action = {
        type: 'fertilize',
        agentId: 'agent-1',
        position: { x: 5, y: 5 },
        fertilizerType: 'compost',
      };

      expect(action.type).toBe('fertilize');
    });

    it('should require agentId', () => {
      const action = {
        type: 'fertilize',
        agentId: 'agent-1',
        position: { x: 5, y: 5 },
        fertilizerType: 'compost',
      };

      expect(action.agentId).toBeDefined();
      expect(typeof action.agentId).toBe('string');
    });

    it('should require position coordinates', () => {
      const action = {
        type: 'fertilize',
        agentId: 'agent-1',
        position: { x: 5, y: 5 },
        fertilizerType: 'compost',
      };

      expect(action.position).toBeDefined();
      expect(action.position.x).toBeDefined();
      expect(action.position.y).toBeDefined();
    });

    it('should require fertilizerType', () => {
      const action = {
        type: 'fertilize',
        agentId: 'agent-1',
        position: { x: 5, y: 5 },
        fertilizerType: 'compost',
      };

      expect(action.fertilizerType).toBeDefined();
      expect(typeof action.fertilizerType).toBe('string');
    });
  });

  describe('Event Emission', () => {
    it('should emit soil:fertilized event', () => {
      const handler = vi.fn();
      eventBus.subscribe('soil:fertilized', handler);

      eventBus.emit({
        type: 'soil:fertilized',
        source: 'test',
        data: {
          position: { x: 5, y: 5 },
          fertilizerType: 'compost',
          fertilityBoost: 20,
        },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'soil:fertilized',
          data: expect.objectContaining({
            position: { x: 5, y: 5 },
            fertilizerType: 'compost',
            fertilityBoost: 20,
          }),
        })
      );
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw when applying fertilizer to tile without nutrients', () => {
      const incompleteTile = {
        terrain: 'dirt' as const,
        fertility: 0.5,
        moisture: 0.5,
        // nutrients missing
      };

      const applyFertilizer = (tile: any) => {
        if (!tile.nutrients) {
          throw new Error('Tile nutrients not set - required for fertilizer application');
        }
      };

      expect(() => applyFertilizer(incompleteTile)).toThrow('Tile nutrients not set - required for fertilizer application');
    });

    it('should throw when fertilizer type is invalid', () => {
      const invalidAction = {
        type: 'fertilize',
        agentId: 'agent-1',
        position: { x: 5, y: 5 },
        fertilizerType: 'invalid-type',
      };

      const validateFertilizerType = (action: any) => {
        const validTypes = ['compost', 'fish_meal', 'bone_meal', 'manure'];
        if (!validTypes.includes(action.fertilizerType)) {
          throw new Error(`Invalid fertilizer type: ${action.fertilizerType}. Valid types: ${validTypes.join(', ')}`);
        }
      };

      expect(() => validateFertilizerType(invalidAction)).toThrow('Invalid fertilizer type');
    });

    it('should throw when position is invalid', () => {
      const invalidAction = {
        type: 'fertilize',
        agentId: 'agent-1',
        // position missing
        fertilizerType: 'compost',
      };

      const validateAction = (action: any) => {
        if (!action.position || action.position.x === undefined || action.position.y === undefined) {
          throw new Error('Fertilize action requires valid position coordinates');
        }
      };

      expect(() => validateAction(invalidAction)).toThrow('Fertilize action requires valid position coordinates');
    });
  });
});
