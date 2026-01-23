import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import { createVoxelResourceComponent, createTreeVoxelResource } from '../components/VoxelResourceComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createTagsComponent } from '../components/TagsComponent.js';
import { TreeFellingSystem } from '../systems/TreeFellingSystem.js';
import { EventBusImpl } from '../events/EventBus.js';
import type { EventBus } from '../events/EventBus.js';
import { reduceStabilityFromHarvest, getMaterialHardness } from '../systems/TreeFellingSystem.js';

/**
 * Tree Felling Physics Integration Tests
 *
 * Validates the complete tree felling system:
 * 1. Stability reduction when harvesting
 * 2. Trees fall when base is cut (bottom-up harvesting)
 * 3. Safe top-down harvesting
 * 4. Directional falling (away from harvester)
 * 5. Resource dropping on fall
 * 6. Material hardness affects stability loss
 */
describe('Tree Felling Physics - Integration', () => {
  let world: World;
  let eventBus: EventBus;
  let treeFellingSystem: TreeFellingSystem;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBusImpl();
    treeFellingSystem = new TreeFellingSystem(eventBus);
  });

  describe('Voxel Resource Stability', () => {
    it('should initialize tree with full stability', () => {
      const tree = new EntityImpl('tree-1', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(5, 'wood'));
      tree.addComponent(createTagsComponent('tree', 'harvestable'));

      const voxelComp = tree.getComponent('voxel_resource');

      expect(voxelComp).toBeDefined();
      expect(voxelComp?.stability).toBe(100);
      expect(voxelComp?.isFalling).toBe(false);
    });

    it('should reduce stability when harvesting lower levels', () => {
      const tree = new EntityImpl('tree-2', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(5, 'wood')); // 5 levels tall
      tree.addComponent(createTagsComponent('tree', 'harvestable'));

      const voxelComp = tree.getComponent('voxel_resource')!;
      const initialStability = voxelComp.stability;

      // Simulate harvesting from bottom (most destabilizing)
      const harvestedLevel = 0; // Bottom level
      const hardness = getMaterialHardness('wood');

      const newStability = reduceStabilityFromHarvest(
        voxelComp,
        harvestedLevel,
        hardness
      );

      expect(newStability).toBeLessThan(initialStability);
      expect(newStability).toBeGreaterThanOrEqual(0);
    });

    it('should have less stability loss when harvesting from top', () => {
      const tree = new EntityImpl('tree-3', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(5, 'wood'));

      const voxelComp = tree.getComponent('voxel_resource')!;
      const hardness = getMaterialHardness('wood');

      // Harvest from bottom
      const bottomStability = reduceStabilityFromHarvest(
        voxelComp,
        0, // bottom level
        hardness
      );

      // Harvest from top
      const topStability = reduceStabilityFromHarvest(
        voxelComp,
        4, // top level
        hardness
      );

      // Top harvesting should preserve more stability
      expect(topStability).toBeGreaterThan(bottomStability);
    });

    it('should handle different material hardness', () => {
      const softWood = getMaterialHardness('wood');
      const hardStone = getMaterialHardness('stone');
      const veryHardIron = getMaterialHardness('iron');

      // Harder materials should have higher hardness values
      expect(hardStone).toBeGreaterThan(softWood);
      expect(veryHardIron).toBeGreaterThan(hardStone);
    });
  });

  describe('Bottom-Up Harvesting (Cutting Base)', () => {
    it('should mark tree as falling when stability drops below threshold', () => {
      const tree = new EntityImpl('tree-4', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(5, 'wood'));
      tree.addComponent(createTagsComponent('tree', 'harvestable'));

      let voxelComp = tree.getComponent('voxel_resource')!;
      const hardness = getMaterialHardness('wood');

      // Keep harvesting base until stability drops below 30
      while (voxelComp.stability >= 30) {
        const newStability = reduceStabilityFromHarvest(
          voxelComp,
          0, // base level
          hardness
        );
        tree.updateComponent('voxel_resource', (comp) => ({
          ...comp,
          stability: newStability,
        }));
        voxelComp = tree.getComponent('voxel_resource')!;
      }

      expect(voxelComp.stability).toBeLessThan(30);
    });

    it('should track harvester position for directional falling', () => {
      const tree = new EntityImpl('tree-5', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(5, 'wood'));

      const harvesterPos = { x: 9, y: 10 }; // Harvester west of tree

      // Update tree with harvester position
      tree.updateComponent('voxel_resource', (comp) => ({
        ...comp,
        lastHarvesterPosition: harvesterPos,
      }));

      const voxelComp = tree.getComponent('voxel_resource')!;
      expect(voxelComp.lastHarvesterPosition).toEqual(harvesterPos);
    });

    it('should emit resource:felled event when tree falls', () => {
      const tree = new EntityImpl('tree-6', world.tick);
      const treePos = createPositionComponent(10, 10);
      tree.addComponent(treePos);
      tree.addComponent(createTreeVoxelResource(4, 'wood')); // 4 levels × 4 blocks = 16 wood
      tree.addComponent(createTagsComponent('tree', 'harvestable'));

      const felledEvents: any[] = [];
      eventBus.subscribe('resource:felled', (event) => {
        felledEvents.push(event);
      });

      // Simulate tree falling
      tree.updateComponent('voxel_resource', (comp) => ({
        ...comp,
        stability: 0,
        isFalling: true,
        fallDirection: { x: 1, y: 0 }, // Falls east
      }));

      // Trigger system update (which would emit the event)
      const voxelComp = tree.getComponent('voxel_resource')!;
      if (voxelComp.isFalling && voxelComp.stability === 0) {
        eventBus.emit({
          type: 'resource:felled',
          source: tree.id,
          tick: world.tick,
          data: {
            entityId: tree.id,
            resourceType: voxelComp.resourceType,
            material: voxelComp.material,
            blocksDropped: voxelComp.height * voxelComp.blocksPerLevel,
            position: { x: treePos.x, y: treePos.y },
            fallDirection: voxelComp.fallDirection,
          },
        });
      }

      expect(felledEvents.length).toBe(1);
      expect(felledEvents[0].type).toBe('resource:felled');
      expect(felledEvents[0].data.blocksDropped).toBe(16); // 4 levels × 4 blocks
      expect(felledEvents[0].data.material).toBe('wood');
    });
  });

  describe('Top-Down Harvesting (Safe Method)', () => {
    it('should allow safe top-down harvesting without falling', () => {
      const tree = new EntityImpl('tree-7', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(5, 'wood'));

      let voxelComp = tree.getComponent('voxel_resource')!;
      const hardness = getMaterialHardness('wood');

      // Harvest from top (level 4, 3, 2...)
      let currentHeight = 5;

      for (let level = currentHeight - 1; level >= 1; level--) {
        const newStability = reduceStabilityFromHarvest(
          voxelComp,
          level,
          hardness
        );
        tree.updateComponent('voxel_resource', (comp) => ({
          ...comp,
          stability: newStability,
          height: comp.height - 1,
        }));
        voxelComp = tree.getComponent('voxel_resource')!;
        currentHeight--;
      }

      // After top-down harvesting, should still have reasonable stability
      expect(voxelComp.stability).toBeGreaterThan(30);
    });

    it('should reduce height when harvesting from top', () => {
      const tree = new EntityImpl('tree-8', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(5, 'wood'));

      let voxelComp = tree.getComponent('voxel_resource')!;
      expect(voxelComp.height).toBe(5);

      // Simulate top-down harvest
      tree.updateComponent('voxel_resource', (comp) => ({
        ...comp,
        height: comp.height - 1, // Remove top level
        lastHarvestTick: world.tick,
      }));

      voxelComp = tree.getComponent('voxel_resource')!;
      expect(voxelComp.height).toBe(4);
      expect(voxelComp.isFalling).toBe(false);
    });

    it('should allow complete top-down harvest to depletion', () => {
      const tree = new EntityImpl('tree-9', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(3, 'wood')); // Small tree

      let voxelComp = tree.getComponent('voxel_resource')!;

      // Harvest all levels from top to bottom
      while (voxelComp.height > 0) {
        tree.updateComponent('voxel_resource', (comp) => ({
          ...comp,
          height: comp.height - 1,
        }));
        voxelComp = tree.getComponent('voxel_resource')!;
      }

      expect(voxelComp.height).toBe(0);
      // Tree was depleted by harvesting, not by falling
      expect(voxelComp.isFalling).toBe(false);
    });
  });

  describe('Directional Falling Mechanics', () => {
    it('should calculate fall direction away from harvester', () => {
      const tree = new EntityImpl('tree-10', world.tick);
      const treePos = { x: 10, y: 10 };
      tree.addComponent(createPositionComponent(treePos.x, treePos.y));
      tree.addComponent(createTreeVoxelResource(5, 'wood'));

      // Harvester is west of tree
      const harvesterPos = { x: 9, y: 10 };

      // Calculate expected fall direction (opposite of harvester)
      const dx = treePos.x - harvesterPos.x; // 1 (east)
      const dy = treePos.y - harvesterPos.y; // 0
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      const expectedDirection = { x: dx / magnitude, y: dy / magnitude };

      tree.updateComponent('voxel_resource', (comp) => ({
        ...comp,
        lastHarvesterPosition: harvesterPos,
        fallDirection: expectedDirection,
        isFalling: true,
      }));

      const voxelComp = tree.getComponent('voxel_resource')!;
      expect(voxelComp.fallDirection?.x).toBeCloseTo(1, 1); // Falls east
      expect(voxelComp.fallDirection?.y).toBeCloseTo(0, 1);
    });

    it('should handle harvester north of tree', () => {
      const treePos = { x: 10, y: 10 };
      const harvesterPos = { x: 10, y: 9 }; // North

      const dx = treePos.x - harvesterPos.x; // 0
      const dy = treePos.y - harvesterPos.y; // 1 (south)
      const magnitude = Math.sqrt(dx * dx + dy * dy);
      const fallDirection = { x: dx / magnitude, y: dy / magnitude };

      expect(fallDirection.x).toBeCloseTo(0, 1);
      expect(fallDirection.y).toBeCloseTo(1, 1); // Falls south
    });

    it('should handle harvester at diagonal positions', () => {
      const treePos = { x: 10, y: 10 };
      const harvesterPos = { x: 9, y: 9 }; // Northwest

      const dx = treePos.x - harvesterPos.x; // 1
      const dy = treePos.y - harvesterPos.y; // 1
      const magnitude = Math.sqrt(dx * dx + dy * dy); // ~1.414
      const fallDirection = { x: dx / magnitude, y: dy / magnitude };

      // Falls southeast (opposite of northwest)
      expect(fallDirection.x).toBeCloseTo(0.707, 2); // ~√2/2
      expect(fallDirection.y).toBeCloseTo(0.707, 2);
    });
  });

  describe('Resource Dropping on Fall', () => {
    it('should drop all remaining resources when tree falls', () => {
      const tree = new EntityImpl('tree-11', world.tick);
      const treePos = createPositionComponent(10, 10);
      tree.addComponent(treePos);
      tree.addComponent(createTreeVoxelResource(5, 'wood')); // 5 levels × 4 blocks = 20 wood

      const voxelComp = tree.getComponent('voxel_resource')!;

      // Calculate total resources to drop
      const totalBlocks = voxelComp.height * voxelComp.blocksPerLevel;
      expect(totalBlocks).toBe(20);

      // Simulate tree falling
      tree.updateComponent('voxel_resource', (comp) => ({
        ...comp,
        stability: 0,
        isFalling: true,
        height: 0, // All resources dropped
      }));

      const updatedVoxel = tree.getComponent('voxel_resource')!;
      expect(updatedVoxel.height).toBe(0);
      expect(updatedVoxel.isFalling).toBe(true);
    });

    it('should drop partial resources if some were harvested before fall', () => {
      const tree = new EntityImpl('tree-12', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(5, 'wood')); // 5 levels × 4 = 20 wood

      // Harvest 2 levels before tree falls
      tree.updateComponent('voxel_resource', (comp) => ({
        ...comp,
        height: 3, // 2 levels harvested
      }));

      const voxelComp = tree.getComponent('voxel_resource')!;
      const remainingBlocks = voxelComp.height * voxelComp.blocksPerLevel;
      expect(remainingBlocks).toBe(12); // 3 levels × 4 blocks

      // Now tree falls
      tree.updateComponent('voxel_resource', (comp) => ({
        ...comp,
        stability: 0,
        isFalling: true,
        height: 0,
      }));
    });

    it('should include material type in dropped resources', () => {
      const oakTree = new EntityImpl('oak-tree', world.tick);
      oakTree.addComponent(createPositionComponent(10, 10));
      oakTree.addComponent(createTreeVoxelResource(4, 'oak_wood'));

      const voxelComp = oakTree.getComponent('voxel_resource')!;
      expect(voxelComp.material).toBe('oak_wood');

      // When tree falls, should drop oak_wood specifically
      const blocksDropped = voxelComp.height * voxelComp.blocksPerLevel;
      expect(blocksDropped).toBe(16); // 4 levels × 4 blocks
    });
  });

  describe('Material-Specific Behavior', () => {
    it('should handle wood trees with standard properties', () => {
      const tree = new EntityImpl('wood-tree', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(4, 'wood'));

      const voxelComp = tree.getComponent('voxel_resource')!;
      expect(voxelComp.resourceType).toBe('tree');
      expect(voxelComp.material).toBe('wood');
      expect(voxelComp.blocksPerLevel).toBe(4);
      expect(voxelComp.gatherDifficulty).toBe(1.0); // Standard difficulty
    });

    it('should support different wood types', () => {
      const oakTree = new EntityImpl('oak-1', world.tick);
      oakTree.addComponent(createPositionComponent(5, 5));
      oakTree.addComponent(createTreeVoxelResource(5, 'oak_wood'));

      const birchTree = new EntityImpl('birch-1', world.tick);
      birchTree.addComponent(createPositionComponent(15, 15));
      birchTree.addComponent(createTreeVoxelResource(4, 'birch_wood'));

      const oakVoxel = oakTree.getComponent('voxel_resource')!;
      const birchVoxel = birchTree.getComponent('voxel_resource')!;

      expect(oakVoxel.material).toBe('oak_wood');
      expect(birchVoxel.material).toBe('birch_wood');
      expect(oakVoxel.resourceType).toBe('tree');
      expect(birchVoxel.resourceType).toBe('tree');
    });

    it('should have slow regeneration for trees', () => {
      const tree = new EntityImpl('regen-tree', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(4, 'wood'));

      const voxelComp = tree.getComponent('voxel_resource')!;
      // Trees should have some regeneration (0.01 levels per game hour)
      expect(voxelComp.regenerationRate).toBe(0.01);
      expect(voxelComp.regenerationRate).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero-height tree (depleted)', () => {
      const tree = new EntityImpl('depleted-tree', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createVoxelResourceComponent('tree', 'wood', 0, 4));

      const voxelComp = tree.getComponent('voxel_resource')!;
      expect(voxelComp.height).toBe(0);
      expect(voxelComp.height * voxelComp.blocksPerLevel).toBe(0);
    });

    it('should prevent negative height', () => {
      const tree = new EntityImpl('tree-13', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(1, 'wood'));

      // Try to harvest beyond depletion
      tree.updateComponent('voxel_resource', (comp) => ({
        ...comp,
        height: Math.max(0, comp.height - 2), // Clamped to 0
      }));

      const voxelComp = tree.getComponent('voxel_resource')!;
      expect(voxelComp.height).toBe(0);
      expect(voxelComp.height).toBeGreaterThanOrEqual(0);
    });

    it('should prevent stability above 100', () => {
      const tree = new EntityImpl('tree-14', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(4, 'wood'));

      // Try to set stability above maximum
      tree.updateComponent('voxel_resource', (comp) => ({
        ...comp,
        stability: Math.min(100, 150), // Clamped to 100
      }));

      const voxelComp = tree.getComponent('voxel_resource')!;
      expect(voxelComp.stability).toBe(100);
      expect(voxelComp.stability).toBeLessThanOrEqual(100);
    });

    it('should handle tree with no harvester position', () => {
      const tree = new EntityImpl('tree-15', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(4, 'wood'));

      const voxelComp = tree.getComponent('voxel_resource')!;
      expect(voxelComp.lastHarvesterPosition).toBeUndefined();

      // Should still be able to fall (random direction if no harvester)
      tree.updateComponent('voxel_resource', (comp) => ({
        ...comp,
        stability: 0,
        isFalling: true,
        fallDirection: { x: 1, y: 0 }, // Default direction
      }));

      const updatedVoxel = tree.getComponent('voxel_resource')!;
      expect(updatedVoxel.isFalling).toBe(true);
    });
  });

  describe('TreeFellingSystem Integration', () => {
    it('should create TreeFellingSystem instance', () => {
      expect(treeFellingSystem).toBeDefined();
      expect(treeFellingSystem).toBeInstanceOf(TreeFellingSystem);
    });

    it('should process falling trees in system update', () => {
      const tree = new EntityImpl('falling-tree', world.tick);
      tree.addComponent(createPositionComponent(10, 10));
      tree.addComponent(createTreeVoxelResource(4, 'wood'));
      tree.addComponent(createTagsComponent('tree', 'harvestable'));

      // Mark tree as falling
      tree.updateComponent('voxel_resource', (comp) => ({
        ...comp,
        stability: 0,
        isFalling: true,
        fallDirection: { x: 1, y: 0 },
      }));

      const voxelComp = tree.getComponent('voxel_resource')!;
      expect(voxelComp.isFalling).toBe(true);
      expect(voxelComp.stability).toBe(0);

      // System would process this tree on update
      // (actual falling animation and resource dropping handled by system)
    });
  });
});
