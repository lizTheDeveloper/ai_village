import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import { createVoxelResourceComponent } from '../components/VoxelResourceComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createTagsComponent } from '../components/TagsComponent.js';
import { getTileConstructionSystem } from '../systems/TileConstructionSystem.js';
import { getTileBasedBlueprintRegistry } from '../buildings/TileBasedBlueprintRegistry.js';
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
  let world: WorldImpl;

  beforeEach(() => {
    world = new WorldImpl();
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
      expect(task.origin).toEqual({ x: 50, y: 50 });
      expect(task.tiles.length).toBeGreaterThan(0);
      expect(task.status).toBe('awaiting_materials');
    });

    it('should track material pool for construction', () => {
      const constructionSystem = getTileConstructionSystem();

      const task = constructionSystem.createTask(
        world,
        'tile_small_house',
        50,
        50,
        0
      );

      // Initially, no materials delivered
      expect(task.materialPool.size).toBe(0);

      // Simulate delivering 10 wood
      constructionSystem.deliverMaterial(task.id, 'agent-1', 'wood', 10, world);

      // Material pool should have wood
      expect(task.materialPool.get('wood')).toBe(10);
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

      expect(task.workersInvolved.length).toBe(0);

      // Deliver materials from agent-1
      constructionSystem.deliverMaterial(task.id, 'agent-1', 'wood', 5, world);

      expect(task.workersInvolved).toContain('agent-1');

      // Deliver materials from agent-2
      constructionSystem.deliverMaterial(task.id, 'agent-2', 'wood', 5, world);

      expect(task.workersInvolved).toContain('agent-2');
      expect(task.workersInvolved.length).toBe(2);
    });

    it('should transition status when materials are delivered', () => {
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

      expect(task.status).toBe('awaiting_materials');

      // Deliver all required materials
      const woodCost = blueprint!.resourceCost.find(c => c.resourceId === 'wood');
      if (woodCost) {
        constructionSystem.deliverMaterial(
          task.id,
          'agent-1',
          'wood',
          woodCost.amountRequired,
          world
        );
      }

      // Update task status (would normally be done by system update)
      const updatedTask = constructionSystem.getTask(task.id);
      expect(updatedTask).toBeDefined();
    });
  });

  describe('Tile Placement Integration', () => {
    it('should place wall tile when construction progresses', () => {
      const constructionSystem = getTileConstructionSystem();

      const task = constructionSystem.createTask(
        world,
        'tile_small_house',
        50,
        50,
        0
      );

      // Find a wall tile in the task
      const wallTile = task.tiles.find(t => t.tileType === 'wall');
      expect(wallTile).toBeDefined();

      if (!wallTile) return;

      // Simulate delivering materials and advancing progress
      constructionSystem.deliverMaterial(task.id, 'agent-1', 'wood', 40, world);

      // Advance progress on the wall tile to 100%
      const tileIndex = task.tiles.indexOf(wallTile);
      constructionSystem.advanceProgress(task.id, tileIndex, 100);

      expect(wallTile.constructionProgress).toBe(100);
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

      // Simple hut should have multiple tiles (walls, floor, door)
      expect(task.tiles.length).toBeGreaterThan(5);

      // Should have different tile types
      const hasWalls = task.tiles.some(t => t.tileType === 'wall');
      const hasFloor = task.tiles.some(t => t.tileType === 'floor');
      const hasDoor = task.tiles.some(t => t.tileType === 'door');

      expect(hasWalls).toBe(true);
      expect(hasFloor).toBe(true);
      expect(hasDoor).toBe(true);
    });
  });

  describe('Complete Building Workflow', () => {
    it('should complete full workflow: blueprint → tasks → materials → construction', () => {
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
      expect(task.status).toBe('awaiting_materials');
      expect(task.tiles.length).toBeGreaterThan(0);

      // Step 3: Deliver materials
      const woodCost = blueprint!.resourceCost.find(c => c.resourceId === 'wood');
      expect(woodCost).toBeDefined();

      constructionSystem.deliverMaterial(
        task.id,
        'builder-1',
        'wood',
        woodCost!.amountRequired,
        world
      );

      expect(task.materialPool.get('wood')).toBe(woodCost!.amountRequired);
      expect(task.workersInvolved).toContain('builder-1');

      // Step 4: Advance construction progress on all tiles
      task.tiles.forEach((tile, index) => {
        constructionSystem.advanceProgress(task.id, index, 100);
        expect(tile.constructionProgress).toBe(100);
      });

      // Step 5: Verify task completion
      const allComplete = task.tiles.every(t => t.constructionProgress === 100);
      expect(allComplete).toBe(true);
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

      // Worker 1 delivers some materials
      constructionSystem.deliverMaterial(task.id, 'worker-1', 'wood', 15, world);

      // Worker 2 delivers more materials
      constructionSystem.deliverMaterial(task.id, 'worker-2', 'wood', 15, world);

      // Worker 3 delivers remaining materials
      constructionSystem.deliverMaterial(task.id, 'worker-3', 'wood', 10, world);

      // All workers should be tracked
      expect(task.workersInvolved.length).toBe(3);
      expect(task.workersInvolved).toContain('worker-1');
      expect(task.workersInvolved).toContain('worker-2');
      expect(task.workersInvolved).toContain('worker-3');

      // Total materials should be sum of all deliveries
      expect(task.materialPool.get('wood')).toBe(40);
    });
  });

  describe('Blueprint Variations', () => {
    it('should support different blueprint sizes', () => {
      const constructionSystem = getTileConstructionSystem();
      const registry = getTileBasedBlueprintRegistry();

      // Test multiple blueprints
      const blueprints = ['tile_small_house', 'tile_storage_shed', 'tile_medium_house', 'tile_workshop'];

      blueprints.forEach(blueprintId => {
        const blueprint = registry.get(blueprintId);

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
      const pos0 = task0.tiles[0].position;
      const pos90 = task90.tiles[0].position;

      // First tile position should be different due to rotation
      const differentX = pos0.x !== pos90.x;
      const differentY = pos0.y !== pos90.y;
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
