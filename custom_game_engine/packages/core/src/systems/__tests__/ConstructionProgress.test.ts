import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl, EntityImpl, createEntityId } from '../../ecs/index.js';
import { BuildingSystem } from '../BuildingSystem.js';
import { createBuildingComponent, isUnderConstruction, getRemainingWork, type BuildingComponent } from '../../components/BuildingComponent.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { createPositionComponent } from '../../components/PositionComponent.js';

/**
 * Construction Progress Tests - Phase 7
 *
 * Tests for REQ-CON-001 and REQ-CON-002:
 * - Construction progress advancement based on time
 * - Construction completion and event emission
 * - Error handling per CLAUDE.md (no silent fallbacks)
 *
 * NOTE: These tests verify the CURRENT implementation.
 * The implementation is MVP - it advances construction automatically without workers.
 * Future work orders will add:
 * - Worker assignment
 * - Skill bonuses
 * - Tool bonuses
 * - Resource validation
 * - Terrain validation
 */

describe('Construction Progress System - Phase 7', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let buildingSystem: BuildingSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    buildingSystem = new BuildingSystem();
  });

  // Helper to create and register an entity
  function createTestEntity(): EntityImpl {
    const entity = new EntityImpl(createEntityId(), world.tick);
    (world as any)._addEntity(entity);
    return entity;
  }

  // Helper to safely get building component
  function getBuildingComponent(entity: EntityImpl): BuildingComponent {
    const building = entity.getComponent<BuildingComponent>('building');
    if (!building) throw new Error('Missing building component');
    return building;
  }

  describe('Construction Progress Advancement', () => {
    it('should advance construction progress based on time elapsed', () => {
      // Create a building under construction
      const entity = createTestEntity();
      entity.addComponent(createBuildingComponent('tent', 1, 0));
      entity.addComponent(createPositionComponent(0, 0));

      // Advance time by 1 second
      buildingSystem.update(world, [entity], 1);

      const building = getBuildingComponent(entity);

      // Tent has buildTime=45s, so 1 second should give ~2.22% progress
      expect(building.progress).toBeGreaterThan(0);
      expect(building.progress).toBeLessThan(100);
      expect(building.isComplete).toBe(false);
    });

    it('should advance different buildings at different rates based on buildTime', () => {
      // Create tent (buildTime=45s)
      const tent = createTestEntity();
      tent.addComponent(createBuildingComponent('tent', 1, 0));
      tent.addComponent(createPositionComponent(0, 0));

      // Create campfire (buildTime=30s)
      const campfire = createTestEntity();
      campfire.addComponent(createBuildingComponent('campfire', 1, 0));
      campfire.addComponent(createPositionComponent(10, 10));

      // Advance 1 second
      buildingSystem.update(world, [tent, campfire], 1);

      const tentBuilding = getBuildingComponent(tent);
      const campfireBuilding = getBuildingComponent(campfire);

      // Campfire should progress faster (shorter buildTime)
      expect(campfireBuilding.progress).toBeGreaterThan(tentBuilding.progress);
    });

    it('should clamp progress to 100% maximum', () => {
      // Create building at 99%
      const entity = createTestEntity();
      entity.addComponent(createBuildingComponent('tent', 1, 99));
      entity.addComponent(createPositionComponent(0, 0));

      // Advance by a large amount of time
      buildingSystem.update(world, [entity], 1000);

      const building = getBuildingComponent(entity);

      // Should be clamped to 100, not exceed it
      expect(building.progress).toBe(100);
      expect(building.isComplete).toBe(true);
    });

    it('should skip completed buildings', () => {
      // Create completed building
      const entity = createTestEntity();
      entity.addComponent(createBuildingComponent('tent', 1, 100));
      entity.addComponent(createPositionComponent(0, 0));

      // Advance time
      buildingSystem.update(world, [entity], 10);

      const building = getBuildingComponent(entity);

      // Progress should stay at 100
      expect(building.progress).toBe(100);
      expect(building.isComplete).toBe(true);
    });

    it('should handle multiple simultaneous constructions', () => {
      const building1 = createTestEntity();
      building1.addComponent(createBuildingComponent('tent', 1, 0));
      building1.addComponent(createPositionComponent(0, 0));

      const building2 = createTestEntity();
      building2.addComponent(createBuildingComponent('workbench', 1, 0));
      building2.addComponent(createPositionComponent(10, 0));

      const building3 = createTestEntity();
      building3.addComponent(createBuildingComponent('campfire', 1, 0));
      building3.addComponent(createPositionComponent(20, 0));

      const buildings = [building1, building2, building3];

      // All should progress
      buildingSystem.update(world, buildings, 5);

      for (const building of buildings) {
        const comp = getBuildingComponent(building);
        expect(comp.progress).toBeGreaterThan(0);
      }
    });
  });

  describe('Construction Completion', () => {
    it('should mark building as complete when progress reaches 100%', () => {
      const entity = createTestEntity();
      entity.addComponent(createBuildingComponent('tent', 1, 99));
      entity.addComponent(createPositionComponent(0, 0));

      // Advance enough to complete
      buildingSystem.update(world, [entity], 10);

      const building = getBuildingComponent(entity);

      expect(building.progress).toBe(100);
      expect(building.isComplete).toBe(true);
    });

    it('should emit "building:complete" event on completion', () => {
      const eventSpy = vi.fn();
      eventBus.subscribe('building:complete', eventSpy);

      const entity = createTestEntity();
      entity.addComponent(createBuildingComponent('tent', 1, 99));
      entity.addComponent(createPositionComponent(16, 32));

      // Complete construction
      buildingSystem.update(world, [entity], 10);

      // Flush event queue to trigger handlers
      eventBus.flush();

      // Verify event was emitted
      expect(eventSpy).toHaveBeenCalledTimes(1);

      const event = eventSpy.mock.calls[0][0];
      expect(event.type).toBe('building:complete');
      expect(event.data.buildingType).toBe('tent');
      expect(event.data.position).toEqual({ x: 16, y: 32 });
    });

    it('should emit event with correct entity ID and building type', () => {
      const eventSpy = vi.fn();
      eventBus.subscribe('building:complete', eventSpy);

      const entity = createTestEntity();
      entity.addComponent(createBuildingComponent('campfire', 1, 99));
      entity.addComponent(createPositionComponent(0, 0));

      buildingSystem.update(world, [entity], 10);
      eventBus.flush();

      const event = eventSpy.mock.calls[0][0];
      expect(event.data.entityId).toBe(entity.id);
      expect(event.data.buildingType).toBe('campfire');
      expect(event.source).toBe(entity.id);
    });

    it('should only emit event once when crossing 100% threshold', () => {
      const eventSpy = vi.fn();
      eventBus.subscribe('building:complete', eventSpy);

      const entity = createTestEntity();
      entity.addComponent(createBuildingComponent('tent', 1, 99));
      entity.addComponent(createPositionComponent(0, 0));

      // First update completes construction
      buildingSystem.update(world, [entity], 10);
      eventBus.flush();
      expect(eventSpy).toHaveBeenCalledTimes(1);

      // Second update should not emit again (already complete)
      buildingSystem.update(world, [entity], 10);
      eventBus.flush();
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Helper Functions', () => {
    it('isUnderConstruction should return true for progress < 100', () => {
      const building = createBuildingComponent('tent', 1, 50);
      expect(isUnderConstruction(building)).toBe(true);
    });

    it('isUnderConstruction should return false for progress = 100', () => {
      const building = createBuildingComponent('tent', 1, 100);
      expect(isUnderConstruction(building)).toBe(false);
    });

    it('getRemainingWork should return correct amount', () => {
      const building = createBuildingComponent('tent', 1, 30);
      expect(getRemainingWork(building)).toBe(70);
    });

    it('getRemainingWork should return 0 for completed buildings', () => {
      const building = createBuildingComponent('tent', 1, 100);
      expect(getRemainingWork(building)).toBe(0);
    });

    it('getRemainingWork should not return negative values', () => {
      const building = createBuildingComponent('tent', 1, 100);
      expect(getRemainingWork(building)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling per CLAUDE.md', () => {
    it('should throw when entity missing BuildingComponent', () => {
      const entity = createTestEntity();
      entity.addComponent(createPositionComponent(0, 0));
      // Missing building component

      expect(() => {
        buildingSystem.update(world, [entity], 1);
      }).toThrow(/missing BuildingComponent/i);
    });

    it('should throw when entity missing PositionComponent', () => {
      const entity = createTestEntity();
      entity.addComponent(createBuildingComponent('tent', 1, 0));
      // Missing position component

      expect(() => {
        buildingSystem.update(world, [entity], 1);
      }).toThrow(/missing PositionComponent/i);
    });

    it('should throw when building type is unknown', () => {
      const entity = createTestEntity();
      // Create building with invalid type (bypass type checking for test)
      const invalidBuilding = createBuildingComponent('tent', 1, 0);
      (invalidBuilding as any).buildingType = 'invalid-building-type';

      entity.addComponent(invalidBuilding);
      entity.addComponent(createPositionComponent(0, 0));

      expect(() => {
        buildingSystem.update(world, [entity], 1);
      }).toThrow(/unknown building type/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle construction at exactly 100% progress', () => {
      const entity = createTestEntity();
      entity.addComponent(createBuildingComponent('tent', 1, 100));
      entity.addComponent(createPositionComponent(0, 0));

      const building = getBuildingComponent(entity);

      // Should already be complete
      expect(building.isComplete).toBe(true);
      expect(building.progress).toBe(100);

      // Update should not change anything
      buildingSystem.update(world, [entity], 1);

      const updatedBuilding = getBuildingComponent(entity);
      expect(updatedBuilding.progress).toBe(100);
      expect(updatedBuilding.isComplete).toBe(true);
    });

    it('should handle progress from 99% to 101% (clamped to 100%)', () => {
      const entity = createTestEntity();
      entity.addComponent(createBuildingComponent('tent', 1, 99));
      entity.addComponent(createPositionComponent(0, 0));

      // Large deltaTime that would push past 100%
      buildingSystem.update(world, [entity], 1000);

      const building = getBuildingComponent(entity);
      expect(building.progress).toBe(100);
      expect(building.progress).not.toBeGreaterThan(100);
    });

    it('should handle zero deltaTime', () => {
      const entity = createTestEntity();
      entity.addComponent(createBuildingComponent('tent', 1, 50));
      entity.addComponent(createPositionComponent(0, 0));

      buildingSystem.update(world, [entity], 0);

      const building = getBuildingComponent(entity);

      // Progress should not change
      expect(building.progress).toBe(50);
    });

    it('should handle negative progress (clamped to 0)', () => {
      // Create building with negative progress (edge case)
      const building = createBuildingComponent('tent', 1, -10);

      // createBuildingComponent should clamp to 0
      expect(building.progress).toBe(0);
      expect(building.progress).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration with Building Types', () => {
    it('should use correct buildTime for each building type', () => {
      // Test known buildTimes from BuildingSystem
      const buildTimes: Record<string, number> = {
        'campfire': 30,
        'tent': 45,
        'storage-chest': 45,
        'workbench': 60,
        'lean-to': 60,
        'well': 90,
      };

      for (const [buildingType, expectedTime] of Object.entries(buildTimes)) {
        const entity = createTestEntity();
        entity.addComponent(createBuildingComponent(buildingType as any, 1, 0));
        entity.addComponent(createPositionComponent(0, 0));

        // Advance 1 second
        buildingSystem.update(world, [entity], 1);

        const building = getBuildingComponent(entity);
        const expectedProgress = (100 / expectedTime) * 1;

        // Allow small floating point error
        expect(building.progress).toBeCloseTo(expectedProgress, 2);
      }
    });

    it('should create building with correct tier', () => {
      const tier2Building = createBuildingComponent('tent', 2, 0);
      expect(tier2Building.tier).toBe(2);

      const tier3Building = createBuildingComponent('workbench', 3, 0);
      expect(tier3Building.tier).toBe(3);
    });

    it('should clamp tier to valid range (1-3)', () => {
      const tooLow = createBuildingComponent('tent', 0, 0);
      expect(tooLow.tier).toBe(1);

      const tooHigh = createBuildingComponent('tent', 10, 0);
      expect(tooHigh.tier).toBe(3);
    });
  });

  describe('BuildingComponent Properties', () => {
    it('should set correct properties for storage buildings', () => {
      const storageChest = createBuildingComponent('storage-chest', 1, 0);
      expect(storageChest.storageCapacity).toBe(20);
      expect(storageChest.blocksMovement).toBe(true);
    });

    it('should set correct properties for heat sources', () => {
      const campfire = createBuildingComponent('campfire', 1, 0);
      expect(campfire.providesHeat).toBe(true);
      expect(campfire.heatRadius).toBe(3);
      expect(campfire.heatAmount).toBe(10);
      expect(campfire.blocksMovement).toBe(false); // Can walk through campfire
    });

    it('should set correct properties for shelters', () => {
      const tent = createBuildingComponent('tent', 1, 0);
      expect(tent.insulation).toBe(0.5);
      expect(tent.baseTemperature).toBe(8);
      expect(tent.weatherProtection).toBe(0.7);
      expect(tent.interior).toBe(true);
      expect(tent.interiorRadius).toBe(2);
    });
  });
});
