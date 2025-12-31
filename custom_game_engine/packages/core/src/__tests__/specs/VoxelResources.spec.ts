import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World';
import type { Entity } from '../../ecs/Entity';

/**
 * Voxel Resource System Specifications
 *
 * Per work order: Replace arbitrary resource amounts with 1:1 physical voxel mapping.
 * A 4-level-tall tree provides 4 levels × blocksPerLevel = actual wood blocks.
 *
 * Includes tree felling physics: cut base → tree falls → drops remaining wood.
 *
 * See: VOXEL_BUILDING_SYSTEM_PLAN.md Section 3
 */
describe('Voxel Resource System', () => {
  let world: WorldImpl;

  beforeEach(() => {
    world = new WorldImpl();
  });

  describe('Voxel Resource Component', () => {
    describe('component structure', () => {
      it('should create tree with voxel resource component', () => {
        const tree = world.createTree(10, 10, 4); // Z=4 (4 levels tall)

        const voxelResource = tree.getComponent('voxel_resource');
        expect(voxelResource).toBeDefined();
        expect(voxelResource.resourceId).toBe('wood');
        expect(voxelResource.maxHeight).toBe(4);
        expect(voxelResource.currentHeight).toBe(4);
      });

      it('should specify blocks per level', () => {
        const tree = world.createTree(10, 10, 4);

        const voxelResource = tree.getComponent('voxel_resource');
        expect(voxelResource.blocksPerLevel).toBe(4); // Default: 4 blocks per level
      });

      it('should calculate total available blocks', () => {
        const tree = world.createTree(10, 10, 4);

        const voxelResource = tree.getComponent('voxel_resource');
        const totalBlocks = voxelResource.currentHeight * voxelResource.blocksPerLevel;

        expect(totalBlocks).toBe(16); // 4 levels × 4 blocks/level = 16 wood
      });
    });

    describe('harvesting voxel resources', () => {
      it('should remove 1 level and give blocksPerLevel items', () => {
        const tree = world.createTree(10, 10, 4);
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        agent.harvestVoxelResource(tree);

        const voxelResource = tree.getComponent('voxel_resource');
        expect(voxelResource.currentHeight).toBe(3); // Was 4, now 3
        expect(agent.inventory.getItem('wood').count).toBe(4); // Got 4 wood blocks
      });

      it('should reduce tree height visually as harvested', () => {
        const tree = world.createTree(10, 10, 5);

        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        agent.harvestVoxelResource(tree); // Harvest 1 level

        const position = tree.getComponent('position');
        expect(position.z).toBe(4); // Height reduced from 5 to 4
      });

      it('should continue providing blocks until depleted', () => {
        const tree = world.createTree(10, 10, 3); // 3 levels × 4 blocks = 12 wood
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        agent.harvestVoxelResource(tree); // 1st harvest: 4 wood
        agent.harvestVoxelResource(tree); // 2nd harvest: 4 wood
        agent.harvestVoxelResource(tree); // 3rd harvest: 4 wood

        expect(agent.inventory.getItem('wood').count).toBe(12);
        expect(tree.getComponent('voxel_resource').currentHeight).toBe(0);
      });

      it('should remove tree entity when fully depleted', () => {
        const tree = world.createTree(10, 10, 1); // Only 1 level
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        agent.harvestVoxelResource(tree);

        expect(world.entities.has(tree.id)).toBe(false); // Tree removed
      });

      it('should throw if trying to harvest depleted resource', () => {
        const tree = world.createTree(10, 10, 1);
        const agent = world.createAgent({ position: { x: 10, y: 10 } });

        agent.harvestVoxelResource(tree); // Depletes tree

        expect(() => {
          agent.harvestVoxelResource(tree);
        }).toThrow('Resource depleted');
      });
    });

    describe('regeneration', () => {
      it('should support regeneration rate (levels per second)', () => {
        const tree = world.createTree(10, 10, 3);
        tree.updateComponent('voxel_resource', (comp) => ({
          ...comp,
          regenerationRate: 0.1 // 0.1 levels/sec = 1 level per 10 seconds
        }));

        const agent = world.createAgent({ position: { x: 10, y: 10 } });
        agent.harvestVoxelResource(tree); // Now at 2 levels

        world.tick(10); // 10 seconds pass

        const voxelResource = tree.getComponent('voxel_resource');
        expect(voxelResource.currentHeight).toBeCloseTo(3, 1); // Regenerated to 3
      });

      it('should not regenerate beyond maxHeight', () => {
        const tree = world.createTree(10, 10, 3);
        tree.updateComponent('voxel_resource', (comp) => ({
          ...comp,
          regenerationRate: 1.0 // 1 level/sec
        }));

        world.tick(100); // Way more time than needed

        const voxelResource = tree.getComponent('voxel_resource');
        expect(voxelResource.currentHeight).toBe(3); // Capped at maxHeight
      });
    });

    describe('other voxel resources', () => {
      it('should support stone resources', () => {
        const rock = world.createRock(20, 20, 3); // 3 levels tall

        const voxelResource = rock.getComponent('voxel_resource');
        expect(voxelResource.resourceId).toBe('stone');
        expect(voxelResource.maxHeight).toBe(3);
      });

      it('should support ore resources', () => {
        const ore = world.createOreDeposit(30, 30, 5, 'iron'); // 5 levels of iron

        const voxelResource = ore.getComponent('voxel_resource');
        expect(voxelResource.resourceId).toBe('iron');
        expect(voxelResource.maxHeight).toBe(5);
      });

      it('should support different blocksPerLevel for different resources', () => {
        const tree = world.createTree(10, 10, 4); // Trees: 4 blocks/level
        const rock = world.createRock(20, 20, 3); // Rocks: 2 blocks/level

        expect(tree.getComponent('voxel_resource').blocksPerLevel).toBe(4);
        expect(rock.getComponent('voxel_resource').blocksPerLevel).toBe(2);
      });
    });
  });

  describe('Tree Felling Physics', () => {
    describe('bottom-up harvesting (cutting base)', () => {
      it('should cause tree to fall when base (Z=0) is cut', () => {
        const tree = world.createTree(10, 10, 5); // 5 levels tall
        const agent = world.createAgent({ position: { x: 10, y: 10, z: 0 } }); // At ground level

        agent.harvestVoxelResource(tree); // Cut base

        const voxelResource = tree.getComponent('voxel_resource');
        expect(voxelResource.currentHeight).toBe(0); // Tree has fallen
      });

      it('should drop all remaining wood when tree falls', () => {
        const tree = world.createTree(10, 10, 5); // 5 levels × 4 blocks/level = 20 wood
        const agent = world.createAgent({ position: { x: 10, y: 10, z: 0 } });

        agent.harvestVoxelResource(tree); // Cut base

        // Agent got 4 wood from cutting, rest dropped on ground
        expect(agent.inventory.getItem('wood').count).toBe(4);

        // Check for dropped items at tree location
        const droppedItems = world.getItemsAt(10, 10);
        expect(droppedItems).toContainEqual({ itemId: 'wood', amount: 16 }); // Remaining 16 wood
      });

      it('should emit tree:felled event', () => {
        const tree = world.createTree(10, 10, 5);
        const agent = world.createAgent({ position: { x: 10, y: 10, z: 0 } });

        const events: any[] = [];
        world.eventBus.subscribe('tree:felled', (event) => events.push(event));

        agent.harvestVoxelResource(tree); // Cut base

        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('tree:felled');
        expect(events[0].data.woodDropped).toBe(16);
      });

      it('should create falling tree animation', () => {
        const tree = world.createTree(10, 10, 5);
        const agent = world.createAgent({ position: { x: 10, y: 10, z: 0 } });

        agent.harvestVoxelResource(tree); // Cut base

        // Check for animation entity
        const animations = world.query().with('animation').executeEntities();
        expect(animations).toHaveLength(1);
        expect(animations[0].getComponent('animation').animationType).toBe('falling_tree');
      });
    });

    describe('top-down harvesting (safe harvesting)', () => {
      it('should not cause tree to fall when cutting top levels', () => {
        const tree = world.createTree(10, 10, 5); // 5 levels tall
        const agent = world.createAgent({ position: { x: 10, y: 10, z: 4 } }); // At top

        agent.harvestVoxelResource(tree); // Cut top

        const voxelResource = tree.getComponent('voxel_resource');
        expect(voxelResource.currentHeight).toBe(4); // Still standing
      });

      it('should allow multiple top-down harvests', () => {
        const tree = world.createTree(10, 10, 5);
        const agent = world.createAgent({ position: { x: 10, y: 10, z: 4 } });

        agent.harvestVoxelResource(tree); // Harvest level 5 → now 4 tall
        agent.position.z = 3;
        agent.harvestVoxelResource(tree); // Harvest level 4 → now 3 tall
        agent.position.z = 2;
        agent.harvestVoxelResource(tree); // Harvest level 3 → now 2 tall

        const voxelResource = tree.getComponent('voxel_resource');
        expect(voxelResource.currentHeight).toBe(2); // Still standing
        expect(agent.inventory.getItem('wood').count).toBe(12); // 3 levels × 4 blocks
      });

      it('should remove tree when top-down harvesting reaches height 0', () => {
        const tree = world.createTree(10, 10, 2); // Small tree, 2 levels
        const agent = world.createAgent({ position: { x: 10, y: 10, z: 1 } });

        agent.harvestVoxelResource(tree); // Harvest top → now 1 tall
        agent.position.z = 0;
        agent.harvestVoxelResource(tree); // Harvest bottom → depleted

        expect(world.entities.has(tree.id)).toBe(false); // Tree removed (not "fell")
      });
    });

    describe('felling strategy implications', () => {
      it('should make bottom-up harvesting faster (one cut gets all wood)', () => {
        const tree1 = world.createTree(10, 10, 5);
        const tree2 = world.createTree(20, 20, 5);
        const agent = world.createAgent({ position: { x: 10, y: 10, z: 0 } });

        const startTime = world.tick;

        // Bottom-up: 1 harvest action
        agent.harvestVoxelResource(tree1);
        const bottomUpTime = world.tick - startTime;

        // Top-down: 5 harvest actions
        agent.position = { x: 20, y: 20, z: 4 };
        for (let i = 0; i < 5; i++) {
          agent.harvestVoxelResource(tree2);
          agent.position.z--;
        }
        const topDownTime = world.tick - startTime - bottomUpTime;

        expect(bottomUpTime).toBeLessThan(topDownTime);
      });

      it('should make top-down harvesting safer (no potential damage from falling)', () => {
        const tree = world.createTree(10, 10, 5);
        const agent = world.createAgent({ position: { x: 10, y: 10, z: 4 } });

        agent.harvestVoxelResource(tree); // Top-down harvest

        // No falling damage risk for agent
        expect(agent.health).toBe(100);
      });
    });
  });

  describe('Error Handling - No Fallbacks', () => {
    it('should throw if creating voxel resource with invalid height', () => {
      expect(() => {
        world.createTree(10, 10, -1); // Negative height
      }).toThrow('Invalid resource height: -1');
    });

    it('should throw if creating voxel resource with zero blocksPerLevel', () => {
      expect(() => {
        world.createVoxelResource('wood', 5, 0); // 0 blocks per level
      }).toThrow('blocksPerLevel must be > 0');
    });

    it('should throw if harvesting without voxel_resource component', () => {
      const entity = world.createEntity();
      const agent = world.createAgent({ position: { x: 0, y: 0 } });

      expect(() => {
        agent.harvestVoxelResource(entity);
      }).toThrow('Entity does not have voxel_resource component');
    });
  });
});
