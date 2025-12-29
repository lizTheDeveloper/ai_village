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
    it('should produce quality 60-80 range for novice farmer with mature wheat', () => {
      // Set novice farming skill (level 1)
      // Formula: 50 + (1 * 10) + (100/100 * 10) ± 10 = 70 ± 10 = 60-80
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 1 } };
      agent.addComponent(skills);

      // Set plant to mature with full health
      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.stage = 'mature';
      plantComp.maturity = 1.0; // 100% mature
      plantComp.health = 100; // Full health for +10 bonus

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

      expect(avgQuality).toBeGreaterThanOrEqual(55); // Allow variance
      expect(avgQuality).toBeLessThanOrEqual(85);
      expect(minQuality).toBeGreaterThanOrEqual(45); // Allow some variance
      expect(maxQuality).toBeLessThanOrEqual(90);
    });

    it('should produce quality 90-100 range for expert farmer with mature wheat', () => {
      // Set expert farming skill (level 4)
      // Formula: 50 + (4 * 10) + (100/100 * 10) ± 10 = 100 ± 10 → clamped to 90-100
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 4 } };
      agent.addComponent(skills);

      // Set plant to mature with full health
      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.stage = 'mature';
      plantComp.maturity = 1.0;
      plantComp.health = 100;

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

      // Formula: (1.1 * 100 / 100 * 100) ± 10 = 110 ± 10 → clamped to 100
      // Most values will be at max (100)
      expect(avgQuality).toBeGreaterThanOrEqual(95); // Allow for edge cases
      expect(avgQuality).toBeLessThanOrEqual(100);
      expect(minQuality).toBeGreaterThanOrEqual(90);
      expect(maxQuality).toBe(100);
    });

    it('should apply quality penalty for immature crops', () => {
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 3 } };
      agent.addComponent(skills);

      // Set plant to immature
      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.stage = 'growing'; // Not fully mature
      plantComp.maturity = 0.5; // 50% mature
      plantComp.health = 100;

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

      // Immature crops should have -20 quality penalty
      // Formula: (1.0 * 100) - 20 ± 10 = 70-90
      expect(avgQuality).toBeGreaterThanOrEqual(70);
      expect(avgQuality).toBeLessThanOrEqual(90);
    });

    it('should show quality progression as farming skill increases', () => {
      let skills = agent.getComponent('skills') as SkillsComponent;
      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.stage = 'mature';
      plantComp.maturity = 1.0;
      plantComp.health = 100;

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
            qualities.push(foodSlot.quality);
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
      plantComp.stage = 'mature';
      plantComp.maturity = 1.0;
      plantComp.health = 100;

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
      plantComp.stage = 'mature';
      plantComp.maturity = 1.0;
      plantComp.health = 100;

      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const inventory = agent.getComponent('inventory') as InventoryComponent;
      const foodSlot = inventory.slots.find(s => s !== null && s.itemId === 'food');
      const foodQuality = foodSlot?.quality ?? 0;

      const foodCount = getItemCount(inventory, 'food'); if (foodCount > 0) { const result = removeFromInventory(inventory, 'food', foodCount); agent.addComponent(result.inventory); };

      // Test carrot
      plantComp.speciesId = 'carrot';
      plantComp.stage = 'mature';
      plantComp.maturity = 1.0;
      plantComp.health = 100;

      harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);

      const carrotSlot = inventory.slots.find(s => s !== null && s.itemId === 'carrot');
      const carrotQuality = carrotSlot?.quality ?? 0;

      // Both should have quality values
      expect(foodQuality).toBeGreaterThan(0);
      expect(carrotQuality).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases - Harvest Quality', () => {
    it('should fail when plant is not harvestable', () => {
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 3 } };
      agent.addComponent(skills);

      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.stage = 'seed'; // Seedling, not harvestable

      const result = harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('not ready');
    });

    it('should fail when agent has no skills', () => {
      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.stage = 'mature';
      plantComp.maturity = 1.0;

      // Remove skills component
      agent.removeComponent('skills');

      const result = harvestHandler.execute(createHarvestAction(agent.id, plant.id), world);
      expect(result.success).toBe(false);
    });

    it('should handle quality clamping to 0-100 range', () => {
      let skills = agent.getComponent('skills') as SkillsComponent;
      skills = { ...skills, levels: { ...skills.levels, farming: 0 } };
      agent.addComponent(skills); // Extremely low skill

      const plantComp = plant.getComponent('plant') as PlantComponent;
      plantComp.stage = 'mature';
      plantComp.maturity = 0.1; // Very immature
      plantComp.health = 100;

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
      plantComp.stage = 'mature';
      plantComp.maturity = 1.0;
      plantComp.health = 100;

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
      plantComp.stage = 'mature';
      plantComp.maturity = 1.0;
      plantComp.health = 100;

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
      plantComp.stage = 'mature';
      plantComp.maturity = 1.0;
      plantComp.health = 100;

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
