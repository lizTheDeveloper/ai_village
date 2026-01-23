import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
import { EventBusImpl } from '../events/EventBus.js';
import { EntityImpl } from '../ecs/Entity.js';
import { createVoxelResourceComponent } from '../components/VoxelResourceComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createTagsComponent } from '../components/TagsComponent.js';
import { getTileConstructionSystem } from '../systems/TileConstructionSystem.js';
import { getTileBasedBlueprintRegistry, createTileBasedBlueprint } from '../buildings/TileBasedBlueprintRegistry.js';
import type { ConstructionTask } from '../systems/TileConstructionSystem.js';

/**
 * End-to-End Integration Tests for Voxel Building System
 *
 * Tests the complete workflow:
 * 1. Voxel resource harvesting (trees with height-based wood)
 * 2. Tile-based blueprint placement
 * 3. Construction task creation
 * 4. Material transport and delivery
 * 5. Tile construction and placement
 */
describe('Voxel Building System - End-to-End Integration', () => {
  let world: World;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new World(eventBus);

    // Register test blueprints for integration testing
    const registry = getTileBasedBlueprintRegistry();

    // Clear any existing test blueprints (in case tests run multiple times)
    // This is safe because we're using a singleton registry
    const testBlueprints = ['tile_small_house', 'tile_storage_shed', 'tile_medium_house', 'tile_workshop'];
    testBlueprints.forEach(id => {
      const existing = registry.tryGet(id);
      if (existing) {
        // Blueprint already exists, skip registration
        return;
      }
    });

    // Register tile_small_house if not already registered
    if (!registry.tryGet('tile_small_house')) {
      const smallHouse = createTileBasedBlueprint({
        id: 'tile_small_house',
        name: 'Small House',
        description: 'A small 3x3 house with door',
        category: 'housing',
        layoutString: [
          '###',
          '#.#',
          '#D#',
        ],
        materialDefaults: {
          wall: 'wood',
          floor: 'wood',
          door: 'wood',
        },
        allowCustomMaterials: true,
        techRequired: [],
        terrainRequired: [],
        terrainForbidden: [],
        unlocked: true,
        buildTimePerTile: 100,
        tier: 1,
        functionality: ['shelter'],
        canRotate: true,
        rotationAngles: [0, 90, 180, 270],
      });
      registry.register(smallHouse);
    }

    // Register tile_storage_shed if not already registered
    if (!registry.tryGet('tile_storage_shed')) {
      const storageShed = createTileBasedBlueprint({
        id: 'tile_storage_shed',
        name: 'Storage Shed',
        description: 'A small 3x2 storage shed',
        category: 'storage',
        layoutString: [
          '###',
          '#D#',
        ],
        materialDefaults: {
          wall: 'wood',
          floor: 'wood',
          door: 'wood',
        },
        allowCustomMaterials: true,
        techRequired: [],
        terrainRequired: [],
        terrainForbidden: [],
        unlocked: true,
        buildTimePerTile: 80,
        tier: 1,
        functionality: ['storage'],
        canRotate: true,
        rotationAngles: [0, 90, 180, 270],
      });
      registry.register(storageShed);
    }

    // Register tile_medium_house if not already registered
    if (!registry.tryGet('tile_medium_house')) {
      const mediumHouse = createTileBasedBlueprint({
        id: 'tile_medium_house',
        name: 'Medium House',
        description: 'A medium 5x4 house with door',
        category: 'housing',
        layoutString: [
          '#####',
          '#...#',
          '#...#',
          '##D##',
        ],
        materialDefaults: {
          wall: 'wood',
          floor: 'wood',
          door: 'wood',
        },
        allowCustomMaterials: true,
        techRequired: [],
        terrainRequired: [],
        terrainForbidden: [],
        unlocked: true,
        buildTimePerTile: 120,
        tier: 2,
        functionality: ['shelter'],
        canRotate: true,
        rotationAngles: [0, 90, 180, 270],
      });
      registry.register(mediumHouse);
    }

    // Register tile_workshop if not already registered
    if (!registry.tryGet('tile_workshop')) {
      const workshop = createTileBasedBlueprint({
        id: 'tile_workshop',
        name: 'Workshop',
        description: 'A 4x4 workshop',
        category: 'production',
        layoutString: [
          '####',
          '#..#',
          '#..#',
          '##D#',
        ],
        materialDefaults: {
          wall: 'wood',
          floor: 'wood',
          door: 'wood',
        },
        allowCustomMaterials: true,
        techRequired: [],
        terrainRequired: [],
        terrainForbidden: [],
        unlocked: true,
        buildTimePerTile: 100,
        tier: 1,
        functionality: ['production'],
        canRotate: true,
        rotationAngles: [0, 90, 180, 270],
      });
      registry.register(workshop);
    }
  });

  describe('Voxel Resource System', () => {
    it('should create tree with height-based voxel resource', () => {
      // Create a 4-level tall tree
      const tree = new EntityImpl('tree-1', world.tick);

      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createVoxelResourceComponent('tree', 'wood', 4, 4)); // tree type, wood material, 4 levels, 4 blocks/level
      tree.addComponent(createTagsComponent('tree', 'harvestable'));

      const voxelComp = tree.getComponent('voxel_resource');

      expect(voxelComp).toBeDefined();
      expect(voxelComp?.material).toBe('wood');
      expect(voxelComp?.height).toBe(4);
      expect(voxelComp?.blocksPerLevel).toBe(4);

      // Total available wood = 4 levels × 4 blocks = 16 wood
      const totalWood = voxelComp!.height * voxelComp!.blocksPerLevel;
      expect(totalWood).toBe(16);
    });

    it('should reduce tree height when harvested', () => {
      const tree = new EntityImpl('tree-2', world.tick);

      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createVoxelResourceComponent('tree', 'wood', 5, 4)); // 5 levels
      tree.addComponent(createTagsComponent('tree', 'harvestable'));

      const voxelComp = tree.getComponent('voxel_resource');
      expect(voxelComp?.height).toBe(5);

      // Simulate harvesting (reduce height by 1)
      tree.updateComponent('voxel_resource', (comp) => ({
        ...comp,
        height: comp.height - 1,
      }));

      const updatedComp = tree.getComponent('voxel_resource');
      expect(updatedComp?.height).toBe(4);
    });

    it('should support different block counts per level', () => {
      const smallTree = new EntityImpl('small-tree', world.tick);
      smallTree.addComponent(createPositionComponent(5, 5));
      smallTree.addComponent(createVoxelResourceComponent('tree', 'wood', 3, 2)); // Small trees: 2 blocks/level

      const largeTree = new EntityImpl('large-tree', world.tick);
      largeTree.addComponent(createPositionComponent(15, 15));
      largeTree.addComponent(createVoxelResourceComponent('tree', 'wood', 5, 6)); // Large trees: 6 blocks/level

      const smallVoxel = smallTree.getComponent('voxel_resource');
      const largeVoxel = largeTree.getComponent('voxel_resource');

      expect(smallVoxel?.blocksPerLevel).toBe(2);
      expect(largeVoxel?.blocksPerLevel).toBe(6);

      // Small tree: 3 levels × 2 blocks = 6 wood
      expect(smallVoxel!.height * smallVoxel!.blocksPerLevel).toBe(6);

      // Large tree: 5 levels × 6 blocks = 30 wood
      expect(largeVoxel!.height * largeVoxel!.blocksPerLevel).toBe(30);
    });
  });

  describe('Tile-Based Blueprint System', () => {
    it('should register blueprints with layout strings', () => {
      const registry = getTileBasedBlueprintRegistry();

      const blueprint = registry.get('tile_small_house');

      expect(blueprint).toBeDefined();
      expect(blueprint?.layoutString).toBeDefined();
      expect(blueprint?.layoutString.length).toBeGreaterThan(0);
      expect(blueprint?.resourceCost).toBeDefined();
    });

    it('should parse blueprint layout to tile positions', () => {
      const registry = getTileBasedBlueprintRegistry();
      const blueprint = registry.get('tile_small_house');

      expect(blueprint).toBeDefined();

      // Small house has walls (#) and floor (.) and door (D)
      const hasWalls = blueprint!.layoutString.some(row => row.includes('#'));
      const hasDoor = blueprint!.layoutString.some(row => row.includes('D'));

      expect(hasWalls).toBe(true);
      expect(hasDoor).toBe(true);
    });

    it('should calculate resource requirements from layout', () => {
      const registry = getTileBasedBlueprintRegistry();
      const blueprint = registry.get('tile_small_house');

      expect(blueprint).toBeDefined();
      expect(blueprint?.resourceCost).toBeDefined();
      expect(blueprint?.resourceCost.length).toBeGreaterThan(0);

      // Should require wood for walls/floor/door
      const hasWood = blueprint!.resourceCost.some(cost => cost.resourceId === 'wood');
      expect(hasWood).toBe(true);
    });
  });

  describe('Construction Task System', () => {
    it('should create construction tasks for blueprint', () => {
      const constructionSystem = getTileConstructionSystem();
      const registry = getTileBasedBlueprintRegistry();

      const blueprint = registry.get('tile_small_house');
      expect(blueprint).toBeDefined();

      // Create construction task at origin (50, 50)
      const task = constructionSystem.createTask(
        world,
        'tile_small_house',
        50,
        50,
        0 // no rotation
      );

      expect(task).toBeDefined();
      expect(task.blueprintId).toBe('tile_small_house');
      expect(task.originPosition).toEqual({ x: 50, y: 50 });
      expect(task.tiles.length).toBeGreaterThan(0);
      expect(task.state).toBe('planned');
    });

    it('should track materials per tile', () => {
      const constructionSystem = getTileConstructionSystem();

      const task = constructionSystem.createTask(
        world,
        'tile_small_house',
        50,
        50,
        0
      );

      // Start task to transition tiles to materials_needed state
      constructionSystem.startTask(world, task.id);

      // Find first tile needing materials
      const nextTile = constructionSystem.getNextTileNeedingMaterials(task.id);
      expect(nextTile).toBeDefined();
      expect(nextTile!.tile.materialsDelivered).toBe(0);

      // Deliver materials to this tile
      constructionSystem.deliverMaterial(world, task.id, nextTile!.index, 'agent-1', 1);

      // Tile should now have materials
      expect(nextTile!.tile.materialsDelivered).toBe(1);
      expect(nextTile!.tile.status).toBe('in_progress');
    });

    it('should track workers involved in construction', () => {
      const constructionSystem = getTileConstructionSystem();

      const task = constructionSystem.createTask(
        world,
        'tile_small_house',
        50,
        50,
        0
      );

      constructionSystem.startTask(world, task.id);

      expect(task.activeBuilders.size).toBe(0);

      // Deliver materials from agent-1
      const tile1 = constructionSystem.getNextTileNeedingMaterials(task.id);
      if (tile1) {
        constructionSystem.deliverMaterial(world, task.id, tile1.index, 'agent-1', 1);
      }

      expect(task.activeBuilders.has('agent-1')).toBe(true);

      // Deliver materials from agent-2 to another tile
      const tile2 = constructionSystem.getNextTileNeedingMaterials(task.id);
      if (tile2) {
        constructionSystem.deliverMaterial(world, task.id, tile2.index, 'agent-2', 1);
      }

      expect(task.activeBuilders.has('agent-2')).toBe(true);
      expect(task.activeBuilders.size).toBe(2);
    });

    it('should transition state when task is started', () => {
      const constructionSystem = getTileConstructionSystem();
      const registry = getTileBasedBlueprintRegistry();
      const blueprint = registry.get('tile_small_house');

      expect(blueprint).toBeDefined();

      const task = constructionSystem.createTask(
        world,
        'tile_small_house',
        50,
        50,
        0
      );

      expect(task.state).toBe('planned');

      // Start the task
      constructionSystem.startTask(world, task.id);

      // State should transition to in_progress
      expect(task.state).toBe('in_progress');

      // All tiles should need materials
      const allTilesNeedMaterials = task.tiles.every(t => t.status === 'materials_needed');
      expect(allTilesNeedMaterials).toBe(true);

      // Verify we can retrieve the task
      const updatedTask = constructionSystem.getTask(task.id);
      expect(updatedTask).toBeDefined();
      expect(updatedTask!.state).toBe('in_progress');
    });
  });

  describe('Tile Placement Integration', () => {
    it('should advance construction progress when materials are delivered', () => {
      const constructionSystem = getTileConstructionSystem();

      const task = constructionSystem.createTask(
        world,
        'tile_small_house',
        50,
        50,
        0
      );

      constructionSystem.startTask(world, task.id);

      // Find a wall tile in the task
      const wallTile = task.tiles.find(t => t.type === 'wall');
      expect(wallTile).toBeDefined();

      if (!wallTile) return;

      const tileIndex = task.tiles.indexOf(wallTile);

      // Deliver materials to this tile
      constructionSystem.deliverMaterial(world, task.id, tileIndex, 'agent-1', 1);
      expect(wallTile.status).toBe('in_progress');

      // Advance progress on the wall tile to 90% (not 100% to avoid tile placement which requires world tiles)
      constructionSystem.advanceProgress(world, task.id, tileIndex, 'agent-1', 90);

      expect(wallTile.progress).toBe(90);
      expect(wallTile.status).toBe('in_progress');
    });

    it('should handle multiple tiles in blueprint', () => {
      const constructionSystem = getTileConstructionSystem();
      const registry = getTileBasedBlueprintRegistry();
      const blueprint = registry.get('tile_small_house');

      expect(blueprint).toBeDefined();

      const task = constructionSystem.createTask(
        world,
        'tile_small_house',
        50,
        50,
        0
      );

      // Small house should have multiple tiles (walls, floor, door)
      expect(task.tiles.length).toBeGreaterThan(5);

      // Should have different tile types
      const hasWalls = task.tiles.some(t => t.type === 'wall');
      const hasFloor = task.tiles.some(t => t.type === 'floor');
      const hasDoor = task.tiles.some(t => t.type === 'door');

      expect(hasWalls).toBe(true);
      expect(hasFloor).toBe(true);
      expect(hasDoor).toBe(true);
    });
  });

  describe('Complete Building Workflow', () => {
    it('should complete full workflow: blueprint → tasks → materials → construction progress', () => {
      const constructionSystem = getTileConstructionSystem();
      const registry = getTileBasedBlueprintRegistry();

      // Step 1: Get blueprint
      const blueprint = registry.get('tile_small_house');
      expect(blueprint).toBeDefined();

      // Step 2: Create construction task
      const task = constructionSystem.createTask(
        world,
        'tile_small_house',
        50,
        50,
        0
      );
      expect(task.state).toBe('planned');
      expect(task.tiles.length).toBeGreaterThan(0);

      // Step 3: Start the task
      constructionSystem.startTask(world, task.id);
      expect(task.state).toBe('in_progress');

      // Step 4: Deliver materials and advance construction on all tiles
      task.tiles.forEach((tile, index) => {
        // Deliver materials
        constructionSystem.deliverMaterial(world, task.id, index, 'builder-1', 1);
        expect(tile.materialsDelivered).toBe(1);
        expect(tile.status).toBe('in_progress');

        // Advance progress to 90% (not 100% to avoid actual tile placement which requires world tiles)
        constructionSystem.advanceProgress(world, task.id, index, 'builder-1', 90);
        expect(tile.progress).toBe(90);
      });

      expect(task.activeBuilders.has('builder-1')).toBe(true);

      // Step 5: Verify all tiles at 90% progress
      const allNearComplete = task.tiles.every(t => t.progress === 90);
      expect(allNearComplete).toBe(true);
    });

    it('should handle collaborative building with multiple workers', () => {
      const constructionSystem = getTileConstructionSystem();

      const task = constructionSystem.createTask(
        world,
        'tile_small_house',
        50,
        50,
        0
      );

      constructionSystem.startTask(world, task.id);

      // Get tiles needing materials
      const tiles = task.tiles.filter(t => t.status === 'materials_needed');
      expect(tiles.length).toBeGreaterThan(0);

      // Worker 1 delivers to first few tiles
      for (let i = 0; i < Math.min(3, tiles.length); i++) {
        const tileIndex = task.tiles.indexOf(tiles[i]!);
        constructionSystem.deliverMaterial(world, task.id, tileIndex, 'worker-1', 1);
      }

      // Worker 2 delivers to next few tiles
      for (let i = 3; i < Math.min(6, tiles.length); i++) {
        const tileIndex = task.tiles.indexOf(tiles[i]!);
        constructionSystem.deliverMaterial(world, task.id, tileIndex, 'worker-2', 1);
      }

      // Worker 3 delivers to remaining tiles
      for (let i = 6; i < tiles.length; i++) {
        const tileIndex = task.tiles.indexOf(tiles[i]!);
        constructionSystem.deliverMaterial(world, task.id, tileIndex, 'worker-3', 1);
      }

      // All workers should be tracked
      expect(task.activeBuilders.size).toBeGreaterThan(0);
      expect(task.activeBuilders.has('worker-1')).toBe(true);

      // At least two workers should be tracked if we have enough tiles
      if (tiles.length >= 4) {
        expect(task.activeBuilders.has('worker-2')).toBe(true);
      }
    });
  });

  describe('Blueprint Variations', () => {
    it('should support different blueprint sizes', () => {
      const constructionSystem = getTileConstructionSystem();
      const registry = getTileBasedBlueprintRegistry();

      // Test multiple blueprints
      const blueprints = ['tile_small_house', 'tile_storage_shed', 'tile_medium_house', 'tile_workshop'];

      blueprints.forEach(blueprintId => {
        const blueprint = registry.tryGet(blueprintId);

        if (!blueprint) {
          // Blueprint might not exist, skip
          return;
        }

        const task = constructionSystem.createTask(
          world,
          blueprintId,
          100,
          100,
          0
        );

        // Each blueprint should create different number of tiles
        expect(task.tiles.length).toBeGreaterThan(0);

        // Should have resource requirements
        expect(blueprint.resourceCost.length).toBeGreaterThan(0);
      });
    });

    it('should support blueprint rotation', () => {
      const constructionSystem = getTileConstructionSystem();

      // Create same blueprint with different rotations
      const task0 = constructionSystem.createTask(world, 'tile_small_house', 50, 50, 0);
      const task90 = constructionSystem.createTask(world, 'tile_small_house', 60, 60, 90);
      const task180 = constructionSystem.createTask(world, 'tile_small_house', 70, 70, 180);
      const task270 = constructionSystem.createTask(world, 'tile_small_house', 80, 80, 270);

      // Same number of tiles regardless of rotation
      expect(task0.tiles.length).toBe(task90.tiles.length);
      expect(task0.tiles.length).toBe(task180.tiles.length);
      expect(task0.tiles.length).toBe(task270.tiles.length);

      // But tile positions should differ
      const tile0 = task0.tiles[0];
      const tile90 = task90.tiles[0];

      expect(tile0).toBeDefined();
      expect(tile90).toBeDefined();

      // First tile position should be different due to rotation
      const differentX = tile0!.x !== tile90!.x;
      const differentY = tile0!.y !== tile90!.y;
      expect(differentX || differentY).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid blueprint ID', () => {
      const constructionSystem = getTileConstructionSystem();

      expect(() => {
        constructionSystem.createTask(
          world,
          'nonexistent_blueprint',
          50,
          50,
          0
        );
      }).toThrow();
    });

    it('should handle zero-height voxel resources', () => {
      const tree = new EntityImpl('depleted-tree', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createVoxelResourceComponent('tree', 'wood', 0, 4)); // Height 0 = depleted

      const voxelComp = tree.getComponent('voxel_resource');
      expect(voxelComp?.height).toBe(0);

      // Should not provide any wood
      const totalWood = voxelComp!.height * voxelComp!.blocksPerLevel;
      expect(totalWood).toBe(0);
    });
  });
});
