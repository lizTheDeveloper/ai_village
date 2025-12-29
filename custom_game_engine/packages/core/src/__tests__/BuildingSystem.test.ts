import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl } from '../ecs/index.js';
import { EventBusImpl } from '../events/EventBus.js';
import { BuildingSystem } from '../systems/BuildingSystem.js';
import { createBuildingComponent, type BuildingComponent } from '../components/BuildingComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createInventoryComponent } from '../components/InventoryComponent.js';

describe('BuildingSystem', () => {
  let world: WorldImpl;
  let system: BuildingSystem;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    system = new BuildingSystem();
    system.initialize(world, eventBus);
  });

  describe('initialization', () => {
    it('should register with correct priority', () => {
      expect(system.priority).toBe(16);
    });

    it('should require building and position components', () => {
      expect(system.requiredComponents).toContain('building');
      expect(system.requiredComponents).toContain('position');
    });

    it('should have correct system id', () => {
      expect(system.id).toBe('building');
    });

    it('should subscribe to building:placement:confirmed event', () => {
      const subscribeSpy = vi.spyOn(world.eventBus, 'subscribe');
      const newSystem = new BuildingSystem();
      newSystem.initialize(world, eventBus);

      expect(subscribeSpy).toHaveBeenCalledWith('building:placement:confirmed', expect.any(Function));
    });

    it('should subscribe to building:complete event', () => {
      const subscribeSpy = vi.spyOn(world.eventBus, 'subscribe');
      const newSystem = new BuildingSystem();
      newSystem.initialize(world, eventBus);

      expect(subscribeSpy).toHaveBeenCalledWith('building:complete', expect.any(Function));
    });

    it('should only initialize once', () => {
      const subscribeSpy = vi.spyOn(world.eventBus, 'subscribe');
      const newSystem = new BuildingSystem();

      newSystem.initialize(world, eventBus);
      newSystem.initialize(world, eventBus); // Second call should be ignored

      // Should subscribe exactly once per event
      const callCount = subscribeSpy.mock.calls.filter(
        call => call[0] === 'building:placement:confirmed'
      ).length;
      expect(callCount).toBe(1);
    });
  });

  describe('construction progress', () => {
    it('should advance construction progress over time', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('workbench', 1, 0);
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      const entities = world.query().with('building').with('position').executeEntities();
      system.update(world, entities, 1.0); // 1 second

      const buildingAfter = entity.getComponent('building') as BuildingComponent;
      expect(buildingAfter.progress).toBeGreaterThan(0);
    });

    it('should mark building as complete when progress reaches 100', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('workbench', 1, 99.5); // Almost done
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      const entities = world.query().with('building').with('position').executeEntities();
      system.update(world, entities, 5.0); // Enough time to finish

      const buildingAfter = entity.getComponent('building') as BuildingComponent;
      expect(buildingAfter.isComplete).toBe(true);
      expect(buildingAfter.progress).toBe(100);
    });

    it('should emit building:complete event when construction finishes', () => {
      const completeHandler = vi.fn();
      world.eventBus.subscribe('building:complete', completeHandler);

      const entity = world.createEntity();
      const building = createBuildingComponent('workbench', 1, 99.5);
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      const entities = world.query().with('building').with('position').executeEntities();
      system.update(world, entities, 5.0);

      world.eventBus.flush();
      expect(completeHandler).toHaveBeenCalled();
      expect(completeHandler.mock.calls[0][0].data.buildingType).toBe('workbench');
    });

    it('should not advance progress for completed buildings', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('workbench', 1, 100);
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      const entities = world.query().with('building').with('position').executeEntities();
      system.update(world, entities, 10.0);

      const buildingAfter = entity.getComponent('building') as BuildingComponent;
      expect(buildingAfter.progress).toBe(100);
    });

    it('should not exceed 100% progress', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('workbench', 1, 95);
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      const entities = world.query().with('building').with('position').executeEntities();
      system.update(world, entities, 100.0); // Very long time

      const buildingAfter = entity.getComponent('building') as BuildingComponent;
      expect(buildingAfter.progress).toBeLessThanOrEqual(100);
    });
  });

  describe('error handling - validation', () => {
    it('should throw when entity missing BuildingComponent', () => {
      const entity = world.createEntity();
      entity.addComponent(createPositionComponent(10, 10));

      // Force add to query results without building component
      const entities = [entity];

      expect(() => system.update(world, entities, 1.0)).toThrow(/missing BuildingComponent/);
    });

    it('should throw when entity missing PositionComponent', () => {
      const entity = world.createEntity();
      entity.addComponent(createBuildingComponent('workbench', 1, 0));

      // Force add to query results without position component
      const entities = [entity];

      expect(() => system.update(world, entities, 1.0)).toThrow(/missing PositionComponent/);
    });

    it('should throw on unknown building type during placement', () => {
      expect(() => {
        world.eventBus.emit({
          type: 'building:placement:confirmed',
          source: 'test',
          data: {
            blueprintId: 'invalid-building-type',
            position: { x: 10, y: 10 },
            rotation: 0,
          },
        });
      }).toThrow(/Unknown building type/);
    });

    it('should throw when building completion event for non-existent entity', () => {
      expect(() => {
        world.eventBus.emit({
          type: 'building:complete',
          source: 'test',
          data: {
            entityId: 'non-existent-entity',
            buildingType: 'workbench',
          },
        });
      }).toThrow(/Entity .* not found/);
    });
  });

  describe('building placement', () => {
    it('should create building entity on placement event', () => {
      const initialEntityCount = world.query().executeEntities().length;

      world.eventBus.emit({
        type: 'building:placement:confirmed',
        source: 'test',
        data: {
          blueprintId: 'workbench',
          position: { x: 10, y: 10 },
          rotation: 0,
        },
      });

      const newEntityCount = world.query().executeEntities().length;
      expect(newEntityCount).toBe(initialEntityCount + 1);
    });

    it('should create building at correct position', () => {
      world.eventBus.emit({
        type: 'building:placement:confirmed',
        source: 'test',
        data: {
          blueprintId: 'workbench',
          position: { x: 15, y: 20 },
          rotation: 0,
        },
      });

      const buildings = world.query().with('building').with('position').executeEntities();
      const building = buildings[buildings.length - 1]; // Get last added
      const position = building.components.get('position') as any;

      expect(position.x).toBe(15);
      expect(position.y).toBe(20);
    });

    it('should start building at 0% progress', () => {
      world.eventBus.emit({
        type: 'building:placement:confirmed',
        source: 'test',
        data: {
          blueprintId: 'workbench',
          position: { x: 10, y: 10 },
          rotation: 0,
        },
      });

      const buildings = world.query().with('building').executeEntities();
      const building = buildings[buildings.length - 1];
      const buildingComp = building.components.get('building') as BuildingComponent;

      expect(buildingComp.progress).toBe(0);
      expect(buildingComp.isComplete).toBe(false);
    });

    it('should emit construction:started event', () => {
      const startHandler = vi.fn();
      world.eventBus.subscribe('construction:started', startHandler);

      world.eventBus.emit({
        type: 'building:placement:confirmed',
        source: 'test',
        data: {
          blueprintId: 'workbench',
          position: { x: 10, y: 10 },
          rotation: 0,
        },
      });

      world.eventBus.flush();
      expect(startHandler).toHaveBeenCalled();
      expect(startHandler.mock.calls[0][0].data.blueprintId).toBe('workbench');
    });

    it('should emit building:placement:complete event', () => {
      const completeHandler = vi.fn();
      world.eventBus.subscribe('building:placement:complete', completeHandler);

      world.eventBus.emit({
        type: 'building:placement:confirmed',
        source: 'test',
        data: {
          blueprintId: 'workbench',
          position: { x: 10, y: 10 },
          rotation: 0,
        },
      });

      world.eventBus.flush();
      expect(completeHandler).toHaveBeenCalled();
    });
  });

  describe('fuel system for crafting stations', () => {
    it('should initialize forge with fuel on completion', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('forge', 1, 100);
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      // Trigger completion
      world.eventBus.emit({
        type: 'building:complete',
        source: entity.id,
        data: {
          entityId: entity.id,
          buildingType: 'forge',
        },
      });

      const buildingAfter = entity.getComponent('building') as BuildingComponent;
      expect(buildingAfter.fuelRequired).toBe(true);
      expect(buildingAfter.currentFuel).toBeGreaterThan(0);
      expect(buildingAfter.maxFuel).toBeGreaterThan(0);
    });

    it('should consume fuel when crafting is active', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('forge', 1, 100);
      building.fuelRequired = true;
      building.currentFuel = 50;
      building.maxFuel = 100;
      building.fuelConsumptionRate = 1.0;
      building.activeRecipe = 'iron_sword';
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      const initialFuel = building.currentFuel;

      const entities = world.query().with('building').with('position').executeEntities();
      system.update(world, entities, 10.0); // 10 seconds

      const buildingAfter = entity.getComponent('building') as BuildingComponent;
      expect(buildingAfter.currentFuel).toBeLessThan(initialFuel);
    });

    it('should stop crafting when fuel runs out', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('forge', 1, 100);
      building.fuelRequired = true;
      building.currentFuel = 1;
      building.maxFuel = 100;
      building.fuelConsumptionRate = 1.0;
      building.activeRecipe = 'iron_sword';
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      const entities = world.query().with('building').with('position').executeEntities();
      system.update(world, entities, 5.0); // Consume all fuel

      const buildingAfter = entity.getComponent('building') as BuildingComponent;
      expect(buildingAfter.currentFuel).toBe(0);
      expect(buildingAfter.activeRecipe).toBeNull();
    });

    it('should emit station:fuel_low event when fuel drops below threshold', () => {
      const lowHandler = vi.fn();
      world.eventBus.subscribe('station:fuel_low', lowHandler);

      const entity = world.createEntity();
      const building = createBuildingComponent('forge', 1, 100);
      building.fuelRequired = true;
      building.currentFuel = 25; // Just above 20% of 100
      building.maxFuel = 100;
      building.fuelConsumptionRate = 1.0;
      building.activeRecipe = 'iron_sword';
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      const entities = world.query().with('building').with('position').executeEntities();
      system.update(world, entities, 10.0); // Drop below 20%

      world.eventBus.flush();
      expect(lowHandler).toHaveBeenCalled();
    });

    it('should emit station:fuel_empty event when fuel reaches zero', () => {
      const emptyHandler = vi.fn();
      world.eventBus.subscribe('station:fuel_empty', emptyHandler);

      const entity = world.createEntity();
      const building = createBuildingComponent('forge', 1, 100);
      building.fuelRequired = true;
      building.currentFuel = 1;
      building.maxFuel = 100;
      building.fuelConsumptionRate = 1.0;
      building.activeRecipe = 'iron_sword';
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      const entities = world.query().with('building').with('position').executeEntities();
      system.update(world, entities, 5.0);

      world.eventBus.flush();
      expect(emptyHandler).toHaveBeenCalled();
    });

    it('should not consume fuel for stations without fuel requirement', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('workbench', 1, 100);
      building.fuelRequired = false;
      building.currentFuel = 0;
      building.activeRecipe = 'wooden_sword';
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      const entities = world.query().with('building').with('position').executeEntities();
      system.update(world, entities, 10.0);

      const buildingAfter = entity.getComponent('building') as BuildingComponent;
      expect(buildingAfter.currentFuel).toBe(0);
      expect(buildingAfter.activeRecipe).toBe('wooden_sword'); // Still crafting
    });
  });

  describe('storage buildings', () => {
    it('should add inventory component to storage building on completion', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('storage-chest', 1, 100);
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      // Trigger completion
      world.eventBus.emit({
        type: 'building:complete',
        source: entity.id,
        data: {
          entityId: entity.id,
          buildingType: 'storage-chest',
        },
      });

      const inventory = entity.getComponent('inventory');
      expect(inventory).toBeDefined();
    });

    it('should set correct capacity for storage-chest', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('storage-chest', 1, 100);
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      world.eventBus.emit({
        type: 'building:complete',
        source: entity.id,
        data: {
          entityId: entity.id,
          buildingType: 'storage-chest',
        },
      });

      const inventory = entity.getComponent('inventory') as any;
      expect(inventory.maxSlots).toBe(20);
    });

    it('should not add inventory to non-storage buildings', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('workbench', 1, 100);
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      world.eventBus.emit({
        type: 'building:complete',
        source: entity.id,
        data: {
          entityId: entity.id,
          buildingType: 'workbench',
        },
      });

      const inventory = entity.getComponent('inventory');
      expect(inventory).toBeUndefined();
    });
  });

  describe('governance buildings', () => {
    it('should add town hall component on completion', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('town-hall', 1, 100);
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      world.eventBus.emit({
        type: 'building:complete',
        source: entity.id,
        data: {
          entityId: entity.id,
          buildingType: 'town-hall',
        },
      });

      const townHall = entity.getComponent('town_hall');
      expect(townHall).toBeDefined();
    });

    it('should add census bureau component on completion', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('census-bureau', 1, 100);
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      world.eventBus.emit({
        type: 'building:complete',
        source: entity.id,
        data: {
          entityId: entity.id,
          buildingType: 'census-bureau',
        },
      });

      const census = entity.getComponent('census_bureau');
      expect(census).toBeDefined();
    });

    it('should add weather station component on completion', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('weather-station', 1, 100);
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      world.eventBus.emit({
        type: 'building:complete',
        source: entity.id,
        data: {
          entityId: entity.id,
          buildingType: 'weather-station',
        },
      });

      const weather = entity.getComponent('weather_station');
      expect(weather).toBeDefined();
    });

    it('should add health clinic component on completion', () => {
      const entity = world.createEntity();
      const building = createBuildingComponent('health-clinic', 1, 100);
      entity.addComponent(building);
      entity.addComponent(createPositionComponent(10, 10));

      world.eventBus.emit({
        type: 'building:complete',
        source: entity.id,
        data: {
          entityId: entity.id,
          buildingType: 'health-clinic',
        },
      });

      const clinic = entity.getComponent('health_clinic');
      expect(clinic).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty entity list', () => {
      expect(() => system.update(world, [], 1.0)).not.toThrow();
    });

    it('should handle very small deltaTime', () => {
      const entity = world.createEntity();
      entity.addComponent(createBuildingComponent('workbench', 1, 0));
      entity.addComponent(createPositionComponent(10, 10));

      const entities = world.query().with('building').with('position').executeEntities();

      expect(() => system.update(world, entities, 0.001)).not.toThrow();
    });

    it('should handle very large deltaTime', () => {
      const entity = world.createEntity();
      entity.addComponent(createBuildingComponent('workbench', 1, 0));
      entity.addComponent(createPositionComponent(10, 10));

      const entities = world.query().with('building').with('position').executeEntities();

      expect(() => system.update(world, entities, 1000.0)).not.toThrow();

      const building = entity.getComponent('building') as BuildingComponent;
      expect(building.progress).toBeLessThanOrEqual(100);
    });
  });
});
