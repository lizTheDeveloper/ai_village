import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl, type Entity } from '../../ecs/World.js';
import { HarvestActionHandler } from '../../actions/HarvestActionHandler';
import { createInventoryComponent, getItemCount, removeFromInventory, type InventoryComponent } from '../../components/InventoryComponent';
import { createSkillsComponent, recordTaskCompletion, type SkillsComponent } from '../../components/SkillsComponent';
import { PlantComponent } from '../../components/PlantComponent';
import { createPositionComponent } from '../../components/PositionComponent';
import type { Action } from '../../actions/Action.js';

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

  beforeEach(() => {
    world = new WorldImpl();
    harvestHandler = new HarvestActionHandler();

    // Create agent with farming skill
    agent = world.createEntity();
    agent.addComponent(createInventoryComponent(24));
    agent.addComponent(createPositionComponent(10, 10));

    const skills = createSkillsComponent();
    agent.addComponent(skills);

    // Create harvestable plant
    plant = world.createEntity();
    plant.addComponent(createPositionComponent(10, 10));

    const plantComponent = new PlantComponent({ speciesId: 'wheat', position: { x: 10, y: 10 } });
    plant.addComponent(plantComponent);
  });

  describe('Criterion 5: Harvest Quality Variance', () => {
    it('should produce quality 50-70 range for novice farmer with mature wheat', () => {
      // Set novice farming skill (level 1)
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 1 } };
      agent.addComponent(skills);

      // Set plant to mature
      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.growthStage = 3; // Mature
      plantComp.maturity = 1.0; // 100% mature

      const qualities: number[] = [];

      // Harvest 100 times to test distribution
      for (let i = 0; i < 100; i++) {
        harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

        let inventory = agent.getComponent('inventory') as InventoryComponent;
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

      // Check range
      const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
      const minQuality = Math.min(...qualities);
      const maxQuality = Math.max(...qualities);

      expect(avgQuality).toBeGreaterThanOrEqual(50);
      expect(avgQuality).toBeLessThanOrEqual(70);
      expect(minQuality).toBeGreaterThanOrEqual(45); // Allow some variance
      expect(maxQuality).toBeLessThanOrEqual(75);
    });

    it('should produce quality 75-95 range for expert farmer with mature wheat', () => {
      // Set expert farming skill (level 4)
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 4 } };
      agent.addComponent(skills);

      // Set plant to mature
      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.growthStage = 3;
      plantComp.maturity = 1.0;

      const qualities: number[] = [];

      for (let i = 0; i < 100; i++) {
        harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

        const inventory = agent.getComponent('inventory') as InventoryComponent;
        const slots = inventory.slots;
        const foodSlot = slots.find(s => s !== null && s.itemId === 'food');

        if (foodSlot && foodSlot.quality !== undefined) {
          qualities.push(foodSlot.quality);
        }

        const foodCount = getItemCount(inventory, 'food'); if (foodCount > 0) { const result = removeFromInventory(inventory, 'food', foodCount); agent.addComponent(result.inventory); };
      }

      const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
      const minQuality = Math.min(...qualities);
      const maxQuality = Math.max(...qualities);

      expect(avgQuality).toBeGreaterThanOrEqual(75);
      expect(avgQuality).toBeLessThanOrEqual(95);
      expect(minQuality).toBeGreaterThanOrEqual(70);
      expect(maxQuality).toBeLessThanOrEqual(100);
    });

    it('should apply quality penalty for immature crops', () => {
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 3 } };
      agent.addComponent(skills);

      // Set plant to immature
      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.growthStage = 2; // Not fully mature
      plantComp.maturity = 0.5; // 50% mature

      const qualities: number[] = [];

      for (let i = 0; i < 100; i++) {
        harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

        const inventory = agent.getComponent('inventory') as InventoryComponent;
        const slots = inventory.slots;
        const foodSlot = slots.find(s => s !== null && s.itemId === 'food');

        if (foodSlot && foodSlot.quality !== undefined) {
          qualities.push(wheatSlot.quality);
        }

        const foodCount = getItemCount(inventory, 'food'); if (foodCount > 0) { const result = removeFromInventory(inventory, 'food', foodCount); agent.addComponent(result.inventory); };
      }

      const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;

      // Immature crops should have -20 quality penalty
      // Skill level 3 would normally give ~80-90 quality, with -20 penalty = 60-70
      expect(avgQuality).toBeLessThan(70);
    });

    it('should show quality progression as farming skill increases', () => {
      let skills = agent.getComponent('skills') as SkillsComponent;
      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.growthStage = 3;
      plantComp.maturity = 1.0;

      const qualitiesBySkill: Record<number, number> = {};

      // Test each skill level
      for (let skillLevel = 1; skillLevel <= 5; skillLevel++) {
        skills = { ...skills, levels: { ...skills.levels, farming: skillLevel as any } };
        agent.addComponent(skills);

        const qualities: number[] = [];
        for (let i = 0; i < 50; i++) {
          harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

          const inventory = agent.getComponent('inventory') as InventoryComponent;
          const slots = inventory.slots;
          const foodSlot = slots.find(s => s !== null && s.itemId === 'food');

          if (foodSlot && foodSlot.quality !== undefined) {
            qualities.push(wheatSlot.quality);
          }

          const foodCount = getItemCount(inventory, 'food'); if (foodCount > 0) { const result = removeFromInventory(inventory, 'food', foodCount); agent.addComponent(result.inventory); };
        }

        const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
        qualitiesBySkill[skillLevel] = avgQuality;
      }

      // Each skill level should produce higher quality
      expect(qualitiesBySkill[2]).toBeGreaterThan(qualitiesBySkill[1]);
      expect(qualitiesBySkill[3]).toBeGreaterThan(qualitiesBySkill[2]);
      expect(qualitiesBySkill[4]).toBeGreaterThan(qualitiesBySkill[3]);
      expect(qualitiesBySkill[5]).toBeGreaterThan(qualitiesBySkill[4]);
    });

    it('should include task familiarity bonus in harvest quality', () => {
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 2 } };
      agent.addComponent(skills);

      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.growthStage = 3;
      plantComp.maturity = 1.0;

      // First harvest - no familiarity
      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const inventory = agent.getComponent('inventory') as InventoryComponent;
      const slots = inventory.slots;
      const firstSlot = slots.find(s => s !== null && s.itemId === 'food');
      const firstQuality = firstSlot?.quality ?? 0;

      const foodCount = getItemCount(inventory, 'food'); if (foodCount > 0) { const result = removeFromInventory(inventory, 'food', foodCount); agent.addComponent(result.inventory); };

      // Increase familiarity by recording 10 completions
      let updatedSkills = skills;
      for (let i = 0; i < 10; i++) {
        updatedSkills = recordTaskCompletion(updatedSkills, 'farming', 'harvest_wheat', 70, 0);
      }
      agent.addComponent(updatedSkills);

      // Second harvest - with familiarity
      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const secondSlot = slots.find(s => s !== null && s.itemId === 'food');
      const secondQuality = secondSlot?.quality ?? 0;

      // With familiarity bonus, quality should be higher
      expect(secondQuality).toBeGreaterThan(firstQuality);
    });

    it('should vary quality for different crop types', () => {
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 3 } };
      agent.addComponent(skills);

      // Test wheat
      let plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.speciesId = 'wheat';
      plantComp.growthStage = 3;
      plantComp.maturity = 1.0;

      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const inventory = agent.getComponent('inventory') as InventoryComponent;
      const foodSlot = inventory.slots.find(s => s !== null && s.itemId === 'food');
      const foodQuality = foodSlot?.quality ?? 0;

      const foodCount = getItemCount(inventory, 'food'); if (foodCount > 0) { const result = removeFromInventory(inventory, 'food', foodCount); agent.addComponent(result.inventory); };

      // Test carrot
      plantComp.speciesId = 'carrot';
      plantComp.growthStage = 3;
      plantComp.maturity = 1.0;

      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const carrotSlot = inventory.slots.find(s => s !== null && s.itemId === 'carrot');
      const carrotQuality = carrotSlot?.quality ?? 0;

      // Both should have quality values
      expect(foodQuality).toBeGreaterThan(0);
      expect(carrotQuality).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases - Harvest Quality', () => {
    it('should throw when plant is not harvestable', () => {
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 3 } };
      agent.addComponent(skills);

      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.growthStage = 0; // Seedling, not harvestable

      expect(() => {
        harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);
      }).toThrow('Plant is not ready for harvest');
    });

    it('should throw when agent has no farming skill', () => {
      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.growthStage = 3;
      plantComp.maturity = 1.0;

      // Remove skills component
      agent.removeComponent('skills');

      expect(() => {
        harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);
      }).toThrow('Agent missing required skills component');
    });

    it('should handle quality clamping to 0-100 range', () => {
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 0 } };
      agent.addComponent(skills); // Extremely low skill

      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.growthStage = 3;
      plantComp.maturity = 0.1; // Very immature

      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const inventory = agent.getComponent('inventory') as InventoryComponent;
      const foodSlot = inventory.slots.find(s => s !== null && s.itemId === 'food');

      expect(foodSlot?.quality).toBeGreaterThanOrEqual(0);
      expect(foodSlot?.quality).toBeLessThanOrEqual(100);
    });

    it('should store harvested items with quality in inventory', () => {
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 3 } };
      agent.addComponent(skills);

      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.growthStage = 3;
      plantComp.maturity = 1.0;

      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const inventory = agent.getComponent('inventory') as InventoryComponent;
      const slots = inventory.slots;
      const foodSlots = slots.filter(s => s !== null && s.itemId === 'food');

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
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 3 } };
      agent.addComponent(skills);

      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.growthStage = 3;
      plantComp.maturity = 1.0;

      const startTime = performance.now();

      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 1ms
      expect(duration).toBeLessThan(1);
    });

    it('should handle bulk harvesting efficiently', () => {
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 3 } };
      agent.addComponent(skills);

      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.growthStage = 3;
      plantComp.maturity = 1.0;

      const startTime = performance.now();

      // Harvest 100 plants
      for (let i = 0; i < 100; i++) {
        harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
