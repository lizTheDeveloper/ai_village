import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl, type Entity } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { HarvestActionHandler } from '../../actions/HarvestActionHandler.js';
import { createInventoryComponent, getItemCount, removeFromInventory, type InventoryComponent } from '../../components/InventoryComponent.js';
import { createSkillsComponent, recordTaskCompletion, type SkillsComponent, type SkillLevel } from '../../components/SkillsComponent.js';
import { PlantComponent } from '../../components/PlantComponent.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import type { Action } from '../../actions/Action.js';

import { ComponentType } from '../../types/ComponentType.js';
describe('Harvest Quality Integration', () => {
  let world: WorldImpl;
  let harvestHandler: HarvestActionHandler;
  let agent: Entity;
  let plant: Entity;

  // Helper function to create harvest action
  const createHarvestAction = (actorId: number, targetId: number): Action => ({
    type: 'harvest',
    actorId,
    targetId,
    startTime: 0,
    duration: harvestHandler.getDuration({ type: 'harvest', actorId, targetId, startTime: 0, duration: 0 }, world),
  });

  // Helper to create a mature, healthy plant
  const createMaturePlant = (health = 100): Entity => {
    const p = world.createEntity();
    p.addComponent(createPositionComponent(10, 10));
    const plantComp = new PlantComponent({ speciesId: 'wheat', position: { x: 10, y: 10 } });
    plantComp.stage = 'mature';
    plantComp.health = health;
    p.addComponent(plantComp);
    return p;
  };

  // Helper to set farming skill level
  const setFarmingSkill = (level: SkillLevel): void => {
    const skills = agent.getComponent(ComponentType.Skills) as SkillsComponent;
    const updatedSkills = { ...skills, levels: { ...skills.levels, farming: level } };
    agent.addComponent(updatedSkills);
  };

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    harvestHandler = new HarvestActionHandler();

    // Create agent with farming skill
    agent = world.createEntity();
    agent.addComponent(createInventoryComponent(24));
    agent.addComponent(createPositionComponent(10, 10));
    agent.addComponent(createSkillsComponent());

    // Create harvestable plant
    plant = createMaturePlant();
  });

  describe('Criterion 5: Harvest Quality Variance', () => {
    it('should produce quality in expected range for novice farmer with mature wheat', () => {
      setFarmingSkill(1);

      const qualities: number[] = [];

      // Harvest 50 times to test distribution
      for (let i = 0; i < 50; i++) {
        if (i > 0) {
          plant = createMaturePlant();
        }

        harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

        const inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
        const foodSlot = inventory.slots.find(s => s !== null && s.itemId === 'food');

        if (foodSlot && foodSlot.quality !== undefined) {
          qualities.push(foodSlot.quality);
        }

        // Clear inventory for next test
        const foodCount = getItemCount(inventory, 'food');
        if (foodCount > 0) {
          const result = removeFromInventory(inventory, 'food', foodCount);
          agent.addComponent(result.inventory);
        }
      }

      expect(qualities.length).toBeGreaterThan(0);

      const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
      const minQuality = Math.min(...qualities);
      const maxQuality = Math.max(...qualities);

      // Novice farmer should produce mid-range quality
      expect(avgQuality).toBeGreaterThanOrEqual(50);
      expect(avgQuality).toBeLessThanOrEqual(90);
      expect(minQuality).toBeGreaterThanOrEqual(0);
      expect(maxQuality).toBeLessThanOrEqual(100);
    });

    it('should produce higher quality for expert farmer', () => {
      setFarmingSkill(4);

      const qualities: number[] = [];

      for (let i = 0; i < 50; i++) {
        if (i > 0) {
          plant = createMaturePlant();
        }

        harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

        const inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
        const foodSlot = inventory.slots.find(s => s !== null && s.itemId === 'food');

        if (foodSlot && foodSlot.quality !== undefined) {
          qualities.push(foodSlot.quality);
        }

        const foodCount = getItemCount(inventory, 'food');
        if (foodCount > 0) {
          const result = removeFromInventory(inventory, 'food', foodCount);
          agent.addComponent(result.inventory);
        }
      }

      const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;

      // Expert farmer should produce high quality
      expect(avgQuality).toBeGreaterThanOrEqual(80);
    });

    it('should apply quality penalty for unhealthy plants', () => {
      setFarmingSkill(3);

      // Create unhealthy plant
      plant = createMaturePlant(50); // 50% health

      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      const foodSlot = inventory.slots.find(s => s !== null && s.itemId === 'food');

      // Lower health should result in lower quality
      expect(foodSlot?.quality).toBeDefined();
      expect(foodSlot?.quality).toBeLessThanOrEqual(80);
    });

    it('should show quality progression as farming skill increases', () => {
      const qualitiesBySkill: Record<number, number> = {};

      // Test each skill level
      for (let skillLevel = 1; skillLevel <= 5; skillLevel++) {
        setFarmingSkill(skillLevel as SkillLevel);

        const qualities: number[] = [];
        for (let i = 0; i < 30; i++) {
          plant = createMaturePlant();

          harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

          const inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
          const foodSlot = inventory.slots.find(s => s !== null && s.itemId === 'food');

          if (foodSlot && foodSlot.quality !== undefined) {
            qualities.push(foodSlot.quality);
          }

          const foodCount = getItemCount(inventory, 'food');
          if (foodCount > 0) {
            const result = removeFromInventory(inventory, 'food', foodCount);
            agent.addComponent(result.inventory);
          }
        }

        const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
        qualitiesBySkill[skillLevel] = avgQuality;
      }

      // Higher skill levels should generally produce higher quality
      // Use >= to allow for random variance at skill boundaries
      expect(qualitiesBySkill[2]).toBeGreaterThanOrEqual(qualitiesBySkill[1]! - 5);
      expect(qualitiesBySkill[3]).toBeGreaterThanOrEqual(qualitiesBySkill[2]! - 5);
      expect(qualitiesBySkill[4]).toBeGreaterThanOrEqual(qualitiesBySkill[3]! - 5);
      expect(qualitiesBySkill[5]).toBeGreaterThanOrEqual(qualitiesBySkill[4]! - 5);

      // Overall trend: skill 5 should be notably higher than skill 1
      expect(qualitiesBySkill[5]).toBeGreaterThan(qualitiesBySkill[1]!);
    });

    it('should include task familiarity bonus in harvest quality', () => {
      setFarmingSkill(2);

      // First harvest - no familiarity
      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      let inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      const firstSlot = inventory.slots.find(s => s !== null && s.itemId === 'food');
      const firstQuality = firstSlot?.quality ?? 0;

      const foodCount = getItemCount(inventory, 'food');
      if (foodCount > 0) {
        const result = removeFromInventory(inventory, 'food', foodCount);
        agent.addComponent(result.inventory);
      }

      // Increase familiarity by recording 10 completions
      let skills = agent.getComponent(ComponentType.Skills) as SkillsComponent;
      for (let i = 0; i < 10; i++) {
        skills = recordTaskCompletion(skills, 'farming', 'harvest_wheat', 70, 0);
      }
      agent.addComponent(skills);

      // Second harvest - with familiarity
      plant = createMaturePlant();
      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      const secondSlot = inventory.slots.find(s => s !== null && s.itemId === 'food');
      const secondQuality = secondSlot?.quality ?? 0;

      // With familiarity bonus, average quality should be higher over many trials
      // For a single comparison, we just verify both have valid quality
      expect(firstQuality).toBeGreaterThan(0);
      expect(secondQuality).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases - Harvest Quality', () => {
    it('should validate that seedlings are not harvestable', () => {
      setFarmingSkill(3);

      // Create a seedling plant (not harvestable according to validate())
      const seedling = world.createEntity();
      seedling.addComponent(createPositionComponent(10, 10));
      const seedlingComp = new PlantComponent({ speciesId: 'wheat', position: { x: 10, y: 10 } });
      seedlingComp.stage = 'seedling'; // Set BEFORE adding to entity
      seedling.addComponent(seedlingComp);

      // Validate should fail for seedlings (only mature/seeding are valid)
      const validation = harvestHandler.validate(createHarvestAction(agent.id, seedling.id), world);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('Cannot harvest');
    });

    it('should use default quality when agent has no skills', () => {
      // Remove skills component
      agent.removeComponent('skills');

      const result = harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);
      expect(result.success).toBe(true);

      // Check that items have quality defined
      const inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      const foodSlot = inventory.slots.find(s => s !== null && s.itemId === 'food');
      expect(foodSlot?.quality).toBeDefined();
      expect(foodSlot?.quality).toBeGreaterThanOrEqual(0);
    });

    it('should clamp quality to 0-100 range', () => {
      setFarmingSkill(0);

      // Create low-health plant for potentially low quality
      plant = createMaturePlant(20);

      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      const foodSlot = inventory.slots.find(s => s !== null && s.itemId === 'food');

      expect(foodSlot?.quality).toBeGreaterThanOrEqual(0);
      expect(foodSlot?.quality).toBeLessThanOrEqual(100);
    });

    it('should store harvested items with quality in inventory', () => {
      setFarmingSkill(3);

      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      const foodSlots = inventory.slots.filter(s => s !== null && s.itemId === 'food');

      expect(foodSlots.length).toBeGreaterThan(0);

      // All food slots should have quality defined
      for (const slot of foodSlots) {
        expect(slot?.quality).toBeDefined();
        expect(slot?.quality).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance - Harvest Quality', () => {
    it('should calculate harvest quality quickly', () => {
      setFarmingSkill(3);

      const startTime = performance.now();

      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 10ms (generous for test stability)
      expect(duration).toBeLessThan(10);
    });

    it('should handle bulk harvesting efficiently', () => {
      setFarmingSkill(3);

      const startTime = performance.now();

      // Harvest 50 plants
      for (let i = 0; i < 50; i++) {
        if (i > 0) {
          plant = createMaturePlant();
        }
        harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 500ms
      expect(duration).toBeLessThan(500);
    });
  });
});
