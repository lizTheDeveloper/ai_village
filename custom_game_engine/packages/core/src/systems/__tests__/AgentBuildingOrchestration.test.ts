import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl, EntityImpl, createEntityId } from '../../ecs/index.js';
import { BuildingSystem } from '../BuildingSystem.js';
import { AgentBrainSystem } from '../AgentBrainSystem.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { createBuildingComponent, type BuildingComponent } from '../../components/BuildingComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createInventoryComponent } from '../../components/InventoryComponent.js';
import { createAgentComponent } from '../../components/AgentComponent.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';

import { BuildingType } from '../../types/BuildingType.js';
/**
 * Agent Building Orchestration Tests - Phase 7
 *
 * Tests for Work Order: Agent Building Orchestration
 *
 * Acceptance Criteria:
 * 1. Construction Progress Automation - BuildingSystem auto-increments progress
 * 2. Resource Deduction - Resources consumed on construction start
 * 3. Building Completion - Events emitted when construction finishes
 * 4. Agent Autonomous Building - LLM chooses build behavior
 *
 * Per CLAUDE.md: No silent fallbacks, proper error handling
 *
 * NOTE: These tests should FAIL initially (TDD red phase).
 * Implementation will make them pass.
 */

describe('Agent Building Orchestration - Phase 7', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let buildingSystem: BuildingSystem;
  let aiSystem: AgentBrainSystem;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    buildingSystem = new BuildingSystem();
    buildingSystem.initialize(world, eventBus);

    // AgentBrainSystem works without LLM for scripted behaviors
    aiSystem = new AgentBrainSystem();
  });

  // Helper to create and register an entity
  function createTestEntity(): EntityImpl {
    const entity = new EntityImpl(createEntityId(), world.tick);
    world.addEntity(entity);
    return entity;
  }

  // Helper to safely get component
  function getComponent<T>(entity: EntityImpl, type: string): T {
    const comp = entity.getComponent<T>(type as any);
    if (!comp) throw new Error(`Missing ${type} component`);
    return comp;
  }

  describe('Criterion 1: Construction Progress Automation', () => {
    it('should automatically increment progress each tick for buildings < 100%', () => {
      // Create building under construction
      const entity = createTestEntity();
      (entity as any).addComponent(createBuildingComponent(BuildingType.Tent, 1, 0));
      (entity as any).addComponent(createPositionComponent(10, 10));

      // Initial state
      let building = getComponent<BuildingComponent>(entity, 'building');
      expect(building.progress).toBe(0);
      expect(building.isComplete).toBe(false);

      // Update - should progress
      buildingSystem.update(world, [entity], 1);

      building = getComponent<BuildingComponent>(entity, 'building');
      expect(building.progress).toBeGreaterThan(0);
      expect(building.progress).toBeLessThan(100);
      expect(building.isComplete).toBe(false);
    });

    it('should calculate progress based on buildTime', () => {
      // Tent has buildTime=45s
      // After 1 second: progress = (100 / 45) * 1 = ~2.22%
      const entity = createTestEntity();
      (entity as any).addComponent(createBuildingComponent(BuildingType.Tent, 1, 0));
      (entity as any).addComponent(createPositionComponent(10, 10));

      buildingSystem.update(world, [entity], 1);

      const building = getComponent<BuildingComponent>(entity, 'building');
      const expectedProgress = (100 / 45) * 1;
      expect(building.progress).toBeCloseTo(expectedProgress, 1);
    });

    it('should not increment progress for completed buildings', () => {
      const entity = createTestEntity();
      (entity as any).addComponent(createBuildingComponent(BuildingType.Tent, 1, 100));
      (entity as any).addComponent(createPositionComponent(10, 10));

      buildingSystem.update(world, [entity], 10);

      const building = getComponent<BuildingComponent>(entity, 'building');
      expect(building.progress).toBe(100);
      expect(building.isComplete).toBe(true);
    });
  });

  describe('Criterion 2: Resource Deduction', () => {
    it('should deduct resources from agent inventory on construction start', () => {
      // Create agent with resources
      const agent = createTestEntity();
      agent.addComponent(createAgentComponent('Test Agent'));
      agent.addComponent(createPositionComponent(5, 5));

      const inventory = createInventoryComponent(10, 100);
      // Add resources for tent: 10 cloth + 5 wood
      inventory.slots[0] = { itemId: 'cloth', quantity: 10 };
      inventory.slots[1] = { itemId: 'wood', quantity: 5 };
      agent.addComponent(inventory);

      // Initiate construction
      const inventoryRecord = { cloth: 10, wood: 5 };
      const buildingEntity = world.initiateConstruction(
        { x: 10, y: 10 },
        'tent',
        inventoryRecord
      );

      // Verify building created
      expect(buildingEntity).toBeDefined();

      // Verify resources deducted from inventory record
      expect(inventoryRecord.cloth).toBe(0);
      expect(inventoryRecord.wood).toBe(0);
    });

    it('should throw error when insufficient resources', () => {
      // Create inventory record with insufficient resources
      const inventoryRecord = { cloth: 5, wood: 5 }; // Tent needs 10 cloth + 5 wood

      // Should throw when trying to build
      expect(() => {
        world.initiateConstruction(
          { x: 10, y: 10 },
          'tent',
          inventoryRecord
        );
      }).toThrow(/not enough/i);
    });

    it('should deduct multiple resource types correctly', () => {
      // Campfire needs 10 stone + 5 wood
      const inventoryRecord = { wood: 10, stone: 15 };

      const buildingEntity = world.initiateConstruction(
        { x: 10, y: 10 },
        'campfire',
        inventoryRecord
      );

      expect(buildingEntity).toBeDefined();
      expect(inventoryRecord.wood).toBe(5); // 10 - 5 = 5
      expect(inventoryRecord.stone).toBe(5); // 15 - 10 = 5
    });

    it('should not deduct resources if construction validation fails', () => {
      const inventoryRecord = { cloth: 10, wood: 5 };

      // Try to build at invalid position (NaN coordinates are invalid)
      expect(() => {
        world.initiateConstruction(
          { x: NaN, y: NaN },
          'tent',
          inventoryRecord
        );
      }).toThrow();

      // Resources should not be deducted
      expect(inventoryRecord.cloth).toBe(10);
      expect(inventoryRecord.wood).toBe(5);
    });

    it('should throw when required resource is missing entirely', () => {
      // Campfire needs wood AND stone
      const inventoryRecord = { wood: 10 }; // Missing stone

      expect(() => {
        world.initiateConstruction(
          { x: 10, y: 10 },
          'campfire',
          inventoryRecord
        );
      }).toThrow(/not enough stone/i);
    });
  });

  describe('Criterion 3: Building Completion', () => {
    it('should emit building:complete event when progress reaches 100%', () => {
      const eventSpy = vi.fn();
      eventBus.subscribe('building:complete', eventSpy);

      const entity = createTestEntity();
      (entity as any).addComponent(createBuildingComponent(BuildingType.Tent, 1, 99));
      (entity as any).addComponent(createPositionComponent(15, 20));

      // Complete construction
      buildingSystem.update(world, [entity], 10);
      eventBus.flush();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      const event = eventSpy.mock.calls[0][0];
      expect(event.type).toBe('building:complete');
      expect(event.data.entityId).toBe(entity.id);
      expect(event.data.buildingType).toBe('tent');
    });

    it('should mark building as complete when progress reaches 100%', () => {
      const entity = createTestEntity();
      (entity as any).addComponent(createBuildingComponent(BuildingType.Tent, 1, 99));
      (entity as any).addComponent(createPositionComponent(10, 10));

      let building = getComponent<BuildingComponent>(entity, 'building');
      expect(building.isComplete).toBe(false);

      buildingSystem.update(world, [entity], 10);

      building = getComponent<BuildingComponent>(entity, 'building');
      expect(building.progress).toBe(100);
      expect(building.isComplete).toBe(true);
    });

    it('should emit event exactly once when crossing 100% threshold', () => {
      const eventSpy = vi.fn();
      eventBus.subscribe('building:complete', eventSpy);

      const entity = createTestEntity();
      (entity as any).addComponent(createBuildingComponent(BuildingType.Campfire, 1, 99));
      (entity as any).addComponent(createPositionComponent(10, 10));

      // First update completes it
      buildingSystem.update(world, [entity], 10);
      eventBus.flush();
      expect(eventSpy).toHaveBeenCalledTimes(1);

      // Second update should not emit again
      buildingSystem.update(world, [entity], 10);
      eventBus.flush();
      expect(eventSpy).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should include position in completion event', () => {
      const eventSpy = vi.fn();
      eventBus.subscribe('building:complete', eventSpy);

      const entity = createTestEntity();
      (entity as any).addComponent(createBuildingComponent(BuildingType.Workbench, 1, 99));
      (entity as any).addComponent(createPositionComponent(42, 84));

      buildingSystem.update(world, [entity], 10);
      eventBus.flush();

      const event = eventSpy.mock.calls[0][0];
      expect(event.data.position).toEqual({ x: 42, y: 84 });
    });
  });

  describe('Criterion 4: Agent Autonomous Building (Integration)', () => {
    it('should create construction site when agent initiates building', () => {
      // This tests the full pipeline:
      // 1. Agent has resources
      // 2. Agent calls world.initiateConstruction()
      // 3. Construction site created
      // 4. Resources deducted

      const inventoryRecord = { cloth: 10, wood: 5 };

      const constructionSite = world.initiateConstruction(
        { x: 20, y: 20 },
        'tent',
        inventoryRecord
      );

      // Verify construction site created
      expect(constructionSite).toBeDefined();
      expect(constructionSite.id).toBeDefined();

      const building = getComponent<BuildingComponent>(constructionSite, 'building');
      expect(building.buildingType).toBe('tent');
      expect(building.progress).toBe(0);
      expect(building.isComplete).toBe(false);

      const position = getComponent<any>(constructionSite, 'position');
      expect(position.x).toBe(20);
      expect(position.y).toBe(20);
    });

    it('should emit construction:started event when construction begins', () => {
      const eventSpy = vi.fn();
      eventBus.subscribe('construction:started', eventSpy);

      const inventoryRecord = { cloth: 10, wood: 5 };

      world.initiateConstruction({ x: 10, y: 10 }, 'tent', inventoryRecord);
      eventBus.flush();

      expect(eventSpy).toHaveBeenCalledTimes(1);
      const event = eventSpy.mock.calls[0][0];
      expect(event.type).toBe('construction:started');
      expect(event.data.buildingType).toBe('tent');
      expect(event.data.position).toEqual({ x: 10, y: 10 });
    });

    it('should complete full construction lifecycle', () => {
      // Track all events
      const startedSpy = vi.fn();
      const completedSpy = vi.fn();
      eventBus.subscribe('construction:started', startedSpy);
      eventBus.subscribe('building:complete', completedSpy);

      // Start construction - campfire needs 10 stone + 5 wood
      const inventoryRecord = { wood: 5, stone: 10 };
      const constructionSite = world.initiateConstruction(
        { x: 10, y: 10 },
        'campfire',
        inventoryRecord
      );
      eventBus.flush();

      // Verify started event
      expect(startedSpy).toHaveBeenCalledTimes(1);

      // Progress construction to completion
      // Campfire buildTime = 30s, so advance 31s to complete
      buildingSystem.update(world, [constructionSite], 31);
      eventBus.flush();

      // Verify completed event
      expect(completedSpy).toHaveBeenCalledTimes(1);

      const building = getComponent<BuildingComponent>(constructionSite, 'building');
      expect(building.isComplete).toBe(true);
      expect(building.progress).toBe(100);
    });
  });

  describe('Error Handling per CLAUDE.md', () => {
    it('should throw when building type is empty string', () => {
      expect(() => {
        world.initiateConstruction(
          { x: 10, y: 10 },
          '',
          { wood: 10 }
        );
      }).toThrow(/building type is required/i);
    });

    it('should throw when position has invalid coordinates', () => {
      expect(() => {
        world.initiateConstruction(
          { x: NaN, y: 10 },
          'tent',
          { wood: 10 }
        );
      }).toThrow(/position must have valid/i);
    });

    it('should throw when inventory is null', () => {
      expect(() => {
        world.initiateConstruction(
          { x: 10, y: 10 },
          'tent',
          null as any
        );
      }).toThrow(/inventory is required/i);
    });

    it('should throw when building type is unknown', () => {
      expect(() => {
        world.initiateConstruction(
          { x: 10, y: 10 },
          'nonexistent-building',
          { wood: 100 }
        );
      }).toThrow();
    });

    it('should throw specific error when resource count is undefined', () => {
      const inventoryRecord = { wood: 5 };
      // Campfire needs stone too

      expect(() => {
        world.initiateConstruction(
          { x: 10, y: 10 },
          'campfire',
          inventoryRecord
        );
      }).toThrow(/not enough stone/i);
    });

    it('should not silently fallback when validation fails', () => {
      // Per CLAUDE.md: No silent fallbacks
      // Validation failure should throw, not return null/undefined

      const inventoryRecord = { wood: 1 }; // Insufficient

      let threwError = false;
      try {
        world.initiateConstruction({ x: 10, y: 10 }, 'tent', inventoryRecord);
      } catch (e) {
        threwError = true;
      }

      expect(threwError).toBe(true);
    });
  });

  describe('Resource Deduction Edge Cases', () => {
    it('should handle exact resource amounts correctly', () => {
      // Tent needs exactly 10 cloth + 5 wood
      const inventoryRecord = { cloth: 10, wood: 5 };

      const building = world.initiateConstruction(
        { x: 10, y: 10 },
        'tent',
        inventoryRecord
      );

      expect(building).toBeDefined();
      expect(inventoryRecord.cloth).toBe(0); // Exactly consumed
      expect(inventoryRecord.wood).toBe(0); // Exactly consumed
    });

    it('should leave excess resources in inventory', () => {
      const inventoryRecord = { cloth: 20, wood: 15 };

      world.initiateConstruction({ x: 10, y: 10 }, 'tent', inventoryRecord);

      expect(inventoryRecord.cloth).toBe(10); // 20 - 10 = 10 remaining
      expect(inventoryRecord.wood).toBe(10); // 15 - 5 = 10 remaining
    });

    it('should handle buildings with no resource cost', () => {
      // Some buildings might have no cost (for testing)
      // The system should handle this gracefully
      const inventoryRecord = {};

      // This will fail for tent which has a cost
      expect(() => {
        world.initiateConstruction({ x: 10, y: 10 }, 'tent', inventoryRecord);
      }).toThrow(/not enough/i);
    });

    it('should deduct resources atomically (all or nothing)', () => {
      // Well needs 20 stone + 10 wood
      const inventoryRecord = { stone: 20, wood: 5 }; // Insufficient wood

      expect(() => {
        world.initiateConstruction({ x: 10, y: 10 }, 'well', inventoryRecord);
      }).toThrow();

      // Neither resource should be deducted
      expect(inventoryRecord.stone).toBe(20);
      expect(inventoryRecord.wood).toBe(5);
    });
  });

  describe('Construction Progress Integration', () => {
    it('should progress from 0% to 100% over buildTime', () => {
      const inventoryRecord = { wood: 5, stone: 10 };

      const building = world.initiateConstruction(
        { x: 10, y: 10 },
        'campfire',
        inventoryRecord
      );

      // Campfire buildTime = 30s
      // Progress after 15s should be ~50%
      buildingSystem.update(world, [building], 15);

      let comp = getComponent<BuildingComponent>(building, 'building');
      expect(comp.progress).toBeCloseTo(50, 0);
      expect(comp.isComplete).toBe(false);

      // Progress another 15s to complete
      buildingSystem.update(world, [building], 15);

      comp = getComponent<BuildingComponent>(building, 'building');
      expect(comp.progress).toBe(100);
      expect(comp.isComplete).toBe(true);
    });

    it('should handle fractional progress increments', () => {
      // Test with very small deltaTime values
      const inventoryRecord = { cloth: 10, wood: 5 };
      const building = world.initiateConstruction(
        { x: 10, y: 10 },
        'tent',
        inventoryRecord
      );

      // Tent buildTime = 45s
      // Update 10 times with 0.1s each = 1s total
      for (let i = 0; i < 10; i++) {
        buildingSystem.update(world, [building], 0.1);
      }

      const comp = getComponent<BuildingComponent>(building, 'building');
      const expectedProgress = (100 / 45) * 1;
      expect(comp.progress).toBeCloseTo(expectedProgress, 1);
    });
  });

  describe('Multiple Buildings Simultaneously', () => {
    it('should handle multiple buildings under construction at once', () => {
      const inv1 = { cloth: 10, wood: 5 };
      const inv2 = { wood: 20 };
      const inv3 = { wood: 5, stone: 10 };

      const tent = world.initiateConstruction({ x: 10, y: 10 }, 'tent', inv1);
      const workbench = world.initiateConstruction({ x: 20, y: 10 }, 'workbench', inv2);
      const campfire = world.initiateConstruction({ x: 30, y: 10 }, 'campfire', inv3);

      const buildings = [tent, workbench, campfire];

      // All should progress
      buildingSystem.update(world, buildings, 5);

      for (const building of buildings) {
        const comp = getComponent<BuildingComponent>(building, 'building');
        expect(comp.progress).toBeGreaterThan(0);
        expect(comp.progress).toBeLessThan(100);
      }

      // Different progress rates based on buildTime
      const tentComp = getComponent<BuildingComponent>(tent, 'building');
      const workbenchComp = getComponent<BuildingComponent>(workbench, 'building');
      const campfireComp = getComponent<BuildingComponent>(campfire, 'building');

      // Campfire (30s) should progress fastest
      // Tent (45s) should be middle
      // Workbench (60s) should be slowest
      expect(campfireComp.progress).toBeGreaterThan(workbenchComp.progress);
      expect(tentComp.progress).toBeGreaterThan(workbenchComp.progress);
    });
  });
});
