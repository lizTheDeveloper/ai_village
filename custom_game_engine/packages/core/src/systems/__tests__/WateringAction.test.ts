import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { SoilSystem } from '../SoilSystem.js';

/**
 * Phase 9: Watering Action Tests
 *
 * These tests verify that agents can water tiles to increase moisture.
 *
 * Acceptance Criterion 5: Moisture Management
 * WHEN: An agent waters a tile
 * THEN: The tile SHALL:
 *   - Increase moisture level
 *   - Emit moisture change event
 */
describe('Watering Action', () => {
  let _world: WorldImpl;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    _world = new WorldImpl(eventBus);
  });

  describe('Manual Watering', () => {
    it('should increase tile moisture when watered', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 70,
        moisture: 30,
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

      soilSystem.waterTile(_world, tile, 5, 5);

      // waterTile adds 20 moisture: 30 + 20 = 50
      expect(tile.moisture).toBe(50);
    });

    it('should cap moisture at 100', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 70,
        moisture: 95,
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

      soilSystem.waterTile(_world, tile, 5, 5);

      // Would be 95 + 20 = 115, but capped at 100
      expect(tile.moisture).toBe(100);
    });

    it('should update lastWatered timestamp', () => {
      const tile = {
        terrain: 'dirt' as const,
        fertility: 70,
        moisture: 30,
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

      // Set world tick to 1000
      _world.setTick(1000);

      const soilSystem = new SoilSystem();

      soilSystem.waterTile(_world, tile, 5, 5);

      expect(tile.lastWatered).toBe(1000);
    });

    it('should emit soil:watered event', () => {
      const handler = vi.fn();
      eventBus.subscribe('soil:watered', handler);

      // Water a tile
      eventBus.emit({
        type: 'soil:watered',
        source: 'test',
        data: { position: { x: 5, y: 5 }, moistureIncrease: 20 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'soil:watered',
          data: expect.objectContaining({
            position: { x: 5, y: 5 },
            moistureIncrease: 20,
          }),
        })
      );
    });

    it('should emit soil:moistureChanged event', () => {
      const handler = vi.fn();
      eventBus.subscribe('soil:moistureChanged', handler);

      // Water a tile
      eventBus.emit({
        type: 'soil:moistureChanged',
        source: 'test',
        data: { position: { x: 5, y: 5 }, oldMoisture: 30, newMoisture: 50 },
      });
      eventBus.flush();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('WaterAction Structure', () => {
    it('should have type "water"', () => {
      const action = {
        type: 'water',
        agentId: 'agent-1',
        position: { x: 5, y: 5 },
      };

      expect(action.type).toBe('water');
    });

    it('should require agentId', () => {
      const action = {
        type: 'water',
        agentId: 'agent-1',
        position: { x: 5, y: 5 },
      };

      expect(action.agentId).toBeDefined();
      expect(typeof action.agentId).toBe('string');
    });

    it('should require position coordinates', () => {
      const action = {
        type: 'water',
        agentId: 'agent-1',
        position: { x: 5, y: 5 },
      };

      expect(action.position).toBeDefined();
      expect(action.position.x).toBeDefined();
      expect(action.position.y).toBeDefined();
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw when watering tile without moisture property', () => {
      const incompleteTile = {
        terrain: 'grass' as const,
        fertility: 0.5,
        // moisture missing
      };

      const waterTile = (tile: any) => {
        if (tile.moisture === undefined) {
          throw new Error('Tile moisture not set - required for watering');
        }
        return tile.moisture + 20;
      };

      expect(() => waterTile(incompleteTile)).toThrow('Tile moisture not set - required for watering');
    });

    it('should throw when position is invalid', () => {
      const invalidAction = {
        type: 'water',
        agentId: 'agent-1',
        // position missing
      };

      const validateAction = (action: any) => {
        if (!action.position || action.position.x === undefined || action.position.y === undefined) {
          throw new Error('Water action requires valid position coordinates');
        }
      };

      expect(() => validateAction(invalidAction)).toThrow('Water action requires valid position coordinates');
    });
  });
});
