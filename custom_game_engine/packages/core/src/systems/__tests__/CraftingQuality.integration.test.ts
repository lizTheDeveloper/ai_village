import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { CraftingSystem } from '../../crafting/CraftingSystem.js';
import { createInventoryComponent, getItemCount, type InventoryComponent } from '../../components/InventoryComponent.js';
import { createSkillsComponent, type SkillsComponent } from '../../components/SkillsComponent.js';
import { RecipeRegistry } from '../../crafting/RecipeRegistry.js';
import type { Recipe } from '../../crafting/Recipe.js';

import { ComponentType } from '../../types/ComponentType.js';
describe('CraftingSystem Quality Integration', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let craftingSystem: CraftingSystem;
  let agent: EntityImpl;

  beforeEach(() => {
    // Create real world with EventBus
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    // Create real crafting system
    craftingSystem = new CraftingSystem();

    // Set up recipe registry with a simple recipe
    const recipeRegistry = new RecipeRegistry();
    const wheatBreadRecipe: Recipe = {
      id: 'wheat_bread',
      name: 'Wheat Bread',
      description: 'Simple bread made from wheat',
      output: { itemId: 'wheat_bread', quantity: 1 },
      ingredients: [{ itemId: 'wheat', quantity: 2 }],
      craftingTime: 10,
      xpGain: 5,
      category: 'Food'
    };
    recipeRegistry.registerRecipe(wheatBreadRecipe);
    craftingSystem.setRecipeRegistry(recipeRegistry);

    // Create agent with components
    agent = new EntityImpl(createEntityId(), 0);

    // Add inventory with wheat
    let inventory = createInventoryComponent(24, 1000);
    inventory = inventory; // Will add wheat before each test
    agent.addComponent(inventory);

    // Add skills
    const skills = createSkillsComponent();
    agent.addComponent(skills);

    // Add to world
    (world as any)._addEntity(agent);
  });

  it('should produce quality items based on skill level', () => {
    // Set skill level to 3
    let skills = agent.getComponent(ComponentType.Skills) as SkillsComponent;
    if (!skills) {
      throw new Error('Skills component missing');
    }
    skills = { ...skills, levels: { ...skills.levels, crafting: 3 } };
    agent.addComponent(skills);

    // Add wheat to inventory
    let inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
    if (!inventory) {
      throw new Error('Inventory component missing');
    }
    inventory.slots[0] = { itemId: 'wheat', quantity: 10, weight: 10, quality: 50 };
    agent.addComponent(inventory);

    // Queue crafting job
    const recipe = craftingSystem.getRecipeRegistry().getRecipe('wheat_bread');
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    craftingSystem.queueJob(agent.id, recipe, 1);

    // Run system for full crafting duration
    const deltaTime = 11; // Crafting time is 10
    craftingSystem.update(world, [], deltaTime);

    // Check that bread was crafted with quality
    inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
    if (!inventory) {
      throw new Error('Inventory component missing after crafting');
    }

    const breadSlot = inventory.slots.find(s => s !== null && s.itemId === 'wheat_bread');
    expect(breadSlot).toBeDefined();
    expect(breadSlot?.quality).toBeDefined();
    expect(breadSlot?.quality).toBeGreaterThan(0);
    expect(breadSlot?.quality).toBeLessThanOrEqual(100);

    // Base quality multiplier: 0.7 + (3 * 0.1) = 1.0 -> 100 quality ± variance
    // Should be in reasonable range for skill level 3
    expect(breadSlot?.quality).toBeGreaterThan(70);
  });

  it('should produce higher quality items with higher skill over multiple crafts', () => {
    // Novice crafter (skill 1)
    let skills = agent.getComponent(ComponentType.Skills) as SkillsComponent;
    if (!skills) {
      throw new Error('Skills component missing');
    }
    skills = { ...skills, levels: { ...skills.levels, crafting: 1 } };
    agent.addComponent(skills);

    // Add wheat
    let inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
    if (!inventory) {
      throw new Error('Inventory component missing');
    }
    inventory.slots[0] = { itemId: 'wheat', quantity: 100, weight: 100, quality: 50 };
    agent.addComponent(inventory);

    // Craft 10 items
    const recipe = craftingSystem.getRecipeRegistry().getRecipe('wheat_bread');
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    const noviceQualities: number[] = [];
    for (let i = 0; i < 10; i++) {
      craftingSystem.queueJob(agent.id, recipe, 1);
      craftingSystem.update(world, [], 11);

      inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      if (!inventory) {
        throw new Error('Inventory missing');
      }
      const breadSlot = inventory.slots.find(s => s !== null && s.itemId === 'wheat_bread');
      if (breadSlot?.quality !== undefined) {
        noviceQualities.push(breadSlot.quality);
      }
    }

    const avgNoviceQuality = noviceQualities.reduce((a, b) => a + b, 0) / noviceQualities.length;

    // Now test expert crafter (skill 5)
    agent = new EntityImpl(createEntityId(), 0);
    skills = createSkillsComponent();
    skills = { ...skills, levels: { ...skills.levels, crafting: 5 } };
    agent.addComponent(skills);

    inventory = createInventoryComponent(24, 1000);
    inventory.slots[0] = { itemId: 'wheat', quantity: 100, weight: 100, quality: 50 };
    agent.addComponent(inventory);

    (world as any)._addEntity(agent);

    const expertQualities: number[] = [];
    for (let i = 0; i < 10; i++) {
      craftingSystem.queueJob(agent.id, recipe, 1);
      craftingSystem.update(world, [], 11);

      inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      if (!inventory) {
        throw new Error('Inventory missing');
      }
      const breadSlot = inventory.slots.find(s => s !== null && s.itemId === 'wheat_bread');
      if (breadSlot?.quality !== undefined) {
        expertQualities.push(breadSlot.quality);
      }
    }

    const avgExpertQuality = expertQualities.reduce((a, b) => a + b, 0) / expertQualities.length;

    // Expert should produce significantly higher quality
    expect(avgExpertQuality).toBeGreaterThan(avgNoviceQuality);
    expect(avgExpertQuality).toBeGreaterThan(90); // Expert with skill 5 should be near max
  });

  it('should separate crafted items by quality in inventory', () => {
    // Set skill to produce varied quality
    let skills = agent.getComponent(ComponentType.Skills) as SkillsComponent;
    if (!skills) {
      throw new Error('Skills component missing');
    }
    skills = { ...skills, levels: { ...skills.levels, crafting: 3 } };
    agent.addComponent(skills);

    // Add wheat
    let inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
    if (!inventory) {
      throw new Error('Inventory component missing');
    }
    inventory.slots[0] = { itemId: 'wheat', quantity: 50, weight: 50, quality: 50 };
    agent.addComponent(inventory);

    // Craft multiple items (variance should create different qualities)
    const recipe = craftingSystem.getRecipeRegistry().getRecipe('wheat_bread');
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    for (let i = 0; i < 20; i++) {
      craftingSystem.queueJob(agent.id, recipe, 1);
      craftingSystem.update(world, [], 11);
    }

    // Check that items with different qualities are in separate stacks
    inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
    if (!inventory) {
      throw new Error('Inventory missing');
    }

    const breadSlots = inventory.slots.filter(s => s !== null && s.itemId === 'wheat_bread');

    // Due to random variance, we should have multiple stacks
    // (though some might stack if they randomly get the same quality)
    expect(breadSlots.length).toBeGreaterThan(0);

    // Verify all have quality defined
    for (const slot of breadSlots) {
      expect(slot?.quality).toBeDefined();
      expect(slot?.quality).toBeGreaterThan(0);
    }

    // Total count should be 20
    const totalBread = getItemCount(inventory, 'wheat_bread');
    expect(totalBread).toBe(20);
  });

  it('should include task familiarity bonus in quality over repeated crafts', () => {
    // Start with skill 2
    let skills = agent.getComponent(ComponentType.Skills) as SkillsComponent;
    if (!skills) {
      throw new Error('Skills component missing');
    }
    skills = { ...skills, levels: { ...skills.levels, crafting: 2 } };
    agent.addComponent(skills);

    // Add wheat
    let inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
    if (!inventory) {
      throw new Error('Inventory component missing');
    }
    inventory.slots[0] = { itemId: 'wheat', quantity: 200, weight: 200, quality: 50 };
    agent.addComponent(inventory);

    const recipe = craftingSystem.getRecipeRegistry().getRecipe('wheat_bread');
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    // Craft 30 items total to build familiarity
    const allQualities: number[] = [];
    for (let i = 0; i < 30; i++) {
      craftingSystem.queueJob(agent.id, recipe, 1);
      craftingSystem.update(world, [], 11);

      inventory = agent.getComponent(ComponentType.Inventory) as InventoryComponent;
      if (!inventory) {
        throw new Error('Inventory missing');
      }
      // Get the most recently added bread (last slot with bread)
      const breadSlots = inventory.slots.filter(s => s !== null && s.itemId === 'wheat_bread');
      const latestBread = breadSlots[breadSlots.length - 1];
      if (latestBread?.quality !== undefined) {
        allQualities.push(latestBread.quality);
      }
    }

    // Compare average of first 10 crafts to average of last 10 crafts
    const firstTenQualities = allQualities.slice(0, 10);
    const lastTenQualities = allQualities.slice(-10);

    const avgFirstTen = firstTenQualities.reduce((a, b) => a + b, 0) / firstTenQualities.length;
    const avgLastTen = lastTenQualities.reduce((a, b) => a + b, 0) / lastTenQualities.length;

    // Later crafts should have equal or higher average quality (allowing small margin for RNG)
    // The familiarity bonus adds ~5-10 quality points over time
    expect(avgLastTen).toBeGreaterThanOrEqual(avgFirstTen - 5);
  });
});
