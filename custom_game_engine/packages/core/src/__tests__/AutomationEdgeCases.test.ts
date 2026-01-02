/**
 * Edge case and error condition tests for automation systems.
 * Tests failure modes, boundary conditions, and recovery scenarios.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../ecs/World.js';
import { EventBusImpl } from '../events/EventBus.js';
import { EntityImpl } from '../ecs/Entity.js';
import { CraftingSystem } from '../crafting/CraftingSystem.js';
import { RecipeRegistry } from '../crafting/RecipeRegistry.js';
import { ItemInstanceRegistry } from '../items/ItemInstanceRegistry.js';
import { PowerGridSystem } from '../systems/PowerGridSystem.js';
import { BeltSystem } from '../systems/BeltSystem.js';
import { AssemblyMachineSystem } from '../systems/AssemblyMachineSystem.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createAssemblyMachine } from '../components/AssemblyMachineComponent.js';
import { createMachineConnection } from '../components/MachineConnectionComponent.js';
import { createPowerProducer, createPowerConsumer } from '../components/PowerComponent.js';
import { createBeltComponent, addItemsToBelt, removeItemsFromBelt, canAcceptItems } from '../components/BeltComponent.js';
import type { Recipe } from '../crafting/Recipe.js';

describe('Automation Edge Cases', () => {
  let world: WorldImpl;
  let craftingSystem: CraftingSystem;
  let recipeRegistry: RecipeRegistry;
  let powerSystem: PowerGridSystem;
  let beltSystem: BeltSystem;
  let assemblySystem: AssemblyMachineSystem;

  const TEST_RECIPE: Recipe = {
    id: 'test_item',
    name: 'Test Item',
    category: 'Test',
    ingredients: [{ itemId: 'ingredient_a', quantity: 1 }],
    output: { itemId: 'product_b', quantity: 1 },
    craftingTime: 1.0,
    requiredSkills: {},
    requiredTools: [],
    stationRequired: 'test_machine',
  };

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    craftingSystem = new CraftingSystem();
    recipeRegistry = new RecipeRegistry();
    const itemRegistry = ItemInstanceRegistry.getInstance();

    recipeRegistry.registerRecipe(TEST_RECIPE);
    craftingSystem.setRecipeRegistry(recipeRegistry);
    world.setCraftingSystem(craftingSystem);
    world.setItemInstanceRegistry(itemRegistry);

    powerSystem = new PowerGridSystem();
    beltSystem = new BeltSystem();
    assemblySystem = new AssemblyMachineSystem();
  });

  describe('Power Grid Edge Cases', () => {
    it('should handle zero power generation', () => {
      const generator = world.createEntity() as EntityImpl;
      generator.addComponent(createPositionComponent(0, 0));
      generator.addComponent(createPowerProducer('electrical', 0)); // Zero output

      const consumer = world.createEntity() as EntityImpl;
      consumer.addComponent(createPositionComponent(1, 0));
      const consumerPower = createPowerConsumer('electrical', 100);
      consumer.addComponent(consumerPower);

      powerSystem.update(world, [generator, consumer], 0.05);

      expect(consumerPower.isPowered).toBe(false);
      expect(consumerPower.efficiency).toBe(0);
    });

    it('should handle zero power consumption', () => {
      const generator = world.createEntity() as EntityImpl;
      generator.addComponent(createPositionComponent(0, 0));
      const genPower = createPowerProducer('electrical', 1000);
      generator.addComponent(genPower);

      const consumer = world.createEntity() as EntityImpl;
      consumer.addComponent(createPositionComponent(1, 0));
      const consumerPower = createPowerConsumer('electrical', 0); // Zero consumption
      consumer.addComponent(consumerPower);

      powerSystem.update(world, [generator, consumer], 0.05);

      // Should not crash with division by zero
      expect(consumerPower.isPowered).toBe(true);
    });

    it('should handle disconnected power networks', () => {
      // Network 1
      const gen1 = world.createEntity() as EntityImpl;
      gen1.addComponent(createPositionComponent(0, 0));
      gen1.addComponent(createPowerProducer('electrical', 1000));

      const con1 = world.createEntity() as EntityImpl;
      con1.addComponent(createPositionComponent(1, 0));
      const power1 = createPowerConsumer('electrical', 500);
      con1.addComponent(power1);

      // Network 2 (disconnected - 10 tiles away)
      const gen2 = world.createEntity() as EntityImpl;
      gen2.addComponent(createPositionComponent(20, 20));
      gen2.addComponent(createPowerProducer('electrical', 2000));

      const con2 = world.createEntity() as EntityImpl;
      con2.addComponent(createPositionComponent(21, 20));
      const power2 = createPowerConsumer('electrical', 500);
      con2.addComponent(power2);

      powerSystem.update(world, [gen1, con1, gen2, con2], 0.05);

      // Both consumers should be powered by their own networks
      expect(power1.isPowered).toBe(true);
      expect(power2.isPowered).toBe(true);
    });

    it('should handle power network with no generators', () => {
      const consumer1 = world.createEntity() as EntityImpl;
      consumer1.addComponent(createPositionComponent(0, 0));
      const power1 = createPowerConsumer('electrical', 100);
      consumer1.addComponent(power1);

      const consumer2 = world.createEntity() as EntityImpl;
      consumer2.addComponent(createPositionComponent(1, 0));
      const power2 = createPowerConsumer('electrical', 100);
      consumer2.addComponent(power2);

      powerSystem.update(world, [consumer1, consumer2], 0.05);

      // No power available
      expect(power1.isPowered).toBe(false);
      expect(power2.isPowered).toBe(false);
    });
  });

  describe('Belt Edge Cases', () => {
    it('should handle removing more items than available', () => {
      const belt = createBeltComponent('east', 1);
      addItemsToBelt(belt, 'iron_ore', 2);
      expect(belt.count).toBe(2);

      const removed = removeItemsFromBelt(belt, 5);
      expect(removed).toBe(2); // Only 2 available
      expect(belt.count).toBe(0);
      expect(belt.itemId).toBe(null); // Cleared
    });

    it('should handle adding zero items', () => {
      const belt = createBeltComponent('east', 1);
      const added = addItemsToBelt(belt, 'iron_ore', 0);
      expect(added).toBe(0);
      expect(belt.count).toBe(0);
    });

    it('should handle removing zero items', () => {
      const belt = createBeltComponent('east', 1);
      addItemsToBelt(belt, 'iron_ore', 2);

      const removed = removeItemsFromBelt(belt, 0);
      expect(removed).toBe(0);
      expect(belt.count).toBe(2); // Unchanged
    });

    it('should not accept items when belt type differs', () => {
      const belt = createBeltComponent('east', 1);
      addItemsToBelt(belt, 'iron_ore', 2);

      const canAccept = canAcceptItems(belt, 'copper_ore', 1);
      expect(canAccept).toBe(false);
    });

    it('should accept same item type when space available', () => {
      const belt = createBeltComponent('east', 1); // Capacity 4
      addItemsToBelt(belt, 'iron_ore', 2);

      const canAccept = canAcceptItems(belt, 'iron_ore', 2);
      expect(canAccept).toBe(true);
    });

    it('should reject items exceeding capacity', () => {
      const belt = createBeltComponent('east', 1); // Capacity 4
      addItemsToBelt(belt, 'iron_ore', 3);

      const canAccept = canAcceptItems(belt, 'iron_ore', 2);
      expect(canAccept).toBe(false); // Would exceed capacity
    });

    it('should handle belt transfer to non-existent target', () => {
      const belt = world.createEntity() as EntityImpl;
      belt.addComponent(createPositionComponent(0, 0));
      const beltComp = createBeltComponent('east', 1);
      addItemsToBelt(beltComp, 'iron_ore', 2);
      beltComp.transferProgress = 1.0; // Ready to transfer
      belt.addComponent(beltComp);

      // No entity at (1, 0) to receive items
      beltSystem.update(world, [belt], 0.05);

      // Items should remain on belt
      expect(beltComp.count).toBe(2);
    });
  });

  describe('Assembly Machine Edge Cases', () => {
    it('should handle missing recipe gracefully', () => {
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(0, 0));

      const assembly = createAssemblyMachine('test_machine', 1);
      assembly.currentRecipe = 'non_existent_recipe';
      machine.addComponent(assembly);

      machine.addComponent(createMachineConnection());
      const power = createPowerConsumer('electrical', 100);
      power.isPowered = true;
      machine.addComponent(power);

      // Should not crash, just skip processing
      expect(() => {
        assemblySystem.update(world, [machine], 0.05);
      }).not.toThrow();

      expect(assembly.progress).toBe(0);
    });

    it('should handle incomplete ingredients', () => {
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(0, 0));

      const assembly = createAssemblyMachine('test_machine', 1);
      assembly.currentRecipe = 'test_item';
      machine.addComponent(assembly);

      const connection = createMachineConnection();
      // No ingredients provided
      connection.inputs[0]!.items = [];
      machine.addComponent(connection);

      const power = createPowerConsumer('electrical', 100);
      power.isPowered = true;
      machine.addComponent(power);

      // Run for multiple ticks
      for (let i = 0; i < 10; i++) {
        assemblySystem.update(world, [machine], 0.05);
      }

      // Should make no progress without ingredients
      expect(assembly.progress).toBe(0);
      expect(connection.outputs[0]!.items.length).toBe(0);
    });

    it('should handle partial ingredients', () => {
      // Recipe needs 2 items, but only 1 available
      const MULTI_RECIPE: Recipe = {
        id: 'multi_input',
        name: 'Multi Input',
        category: 'Test',
        ingredients: [
          { itemId: 'ingredient_a', quantity: 2 },
        ],
        output: { itemId: 'product_b', quantity: 1 },
        craftingTime: 1.0,
        requiredSkills: {},
        requiredTools: [],
        stationRequired: 'test_machine',
      };

      recipeRegistry.registerRecipe(MULTI_RECIPE);

      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(0, 0));

      const assembly = createAssemblyMachine('test_machine', 1);
      assembly.currentRecipe = 'multi_input';
      machine.addComponent(assembly);

      const connection = createMachineConnection();
      // Only 1 ingredient, need 2
      connection.inputs[0]!.items = [
        { instanceId: 'ing1', definitionId: 'ingredient_a', quality: 50, condition: 100 },
      ];
      machine.addComponent(connection);

      const power = createPowerConsumer('electrical', 100);
      power.isPowered = true;
      power.efficiency = 1.0;
      machine.addComponent(power);

      // Run simulation
      for (let i = 0; i < 30; i++) {
        assemblySystem.update(world, [machine], 0.05);
      }

      // Should not craft with insufficient ingredients
      expect(assembly.progress).toBe(0);
      expect(connection.inputs[0]!.items.length).toBe(1); // Not consumed
    });

    it('should resume production when output space becomes available', () => {
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(0, 0));

      const assembly = createAssemblyMachine('test_machine', 1);
      assembly.currentRecipe = 'test_item';
      assembly.speed = 1.0;
      machine.addComponent(assembly);

      const connection = createMachineConnection();
      // Fill output to capacity initially
      const capacity = connection.outputs[0]!.capacity;
      connection.outputs[0]!.items = new Array(capacity).fill({
        instanceId: 'dummy',
        definitionId: 'product_b',
        quality: 50,
        condition: 100,
      });
      connection.inputs[0]!.items = [
        { instanceId: 'ing1', definitionId: 'ingredient_a', quality: 50, condition: 100 },
        { instanceId: 'ing2', definitionId: 'ingredient_a', quality: 50, condition: 100 },
      ];
      machine.addComponent(connection);

      const power = createPowerConsumer('electrical', 100);
      power.isPowered = true;
      power.efficiency = 1.0;
      machine.addComponent(power);

      // Run for enough time to complete one craft
      for (let i = 0; i < 25; i++) {
        assemblySystem.update(world, [machine], 0.05);
      }

      // Should be blocked at 100%
      expect(assembly.progress).toBeGreaterThanOrEqual(100);
      expect(connection.inputs[0]!.items.length).toBe(2); // Not consumed

      // Clear output space
      connection.outputs[0]!.items = [];

      // Run one more tick
      assemblySystem.update(world, [machine], 0.05);

      // Should have consumed ingredients and reset progress
      // (Might not be exactly 0 due to continued progress)
      expect(connection.inputs[0]!.items.length).toBeLessThan(2);
    });

    it('should handle machine with no power component', () => {
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(0, 0));

      const assembly = createAssemblyMachine('test_machine', 1);
      assembly.currentRecipe = 'test_item';
      machine.addComponent(assembly);

      const connection = createMachineConnection();
      connection.inputs[0]!.items = [
        { instanceId: 'ing1', definitionId: 'ingredient_a', quality: 50, condition: 100 },
      ];
      machine.addComponent(connection);

      // No power component at all

      // Should not crash
      expect(() => {
        assemblySystem.update(world, [machine], 0.05);
      }).not.toThrow();
    });

    it('should handle very long crafting times', () => {
      const LONG_RECIPE: Recipe = {
        id: 'slow_craft',
        name: 'Slow Craft',
        category: 'Test',
        ingredients: [{ itemId: 'ingredient_a', quantity: 1 }],
        output: { itemId: 'product_b', quantity: 1 },
        craftingTime: 100.0, // 100 seconds = 2000 ticks
        requiredSkills: {},
        requiredTools: [],
        stationRequired: 'test_machine',
      };

      recipeRegistry.registerRecipe(LONG_RECIPE);

      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(0, 0));

      const assembly = createAssemblyMachine('test_machine', 1);
      assembly.currentRecipe = 'slow_craft';
      assembly.speed = 1.0;
      machine.addComponent(assembly);

      const connection = createMachineConnection();
      connection.inputs[0]!.items = [
        { instanceId: 'ing1', definitionId: 'ingredient_a', quality: 50, condition: 100 },
      ];
      machine.addComponent(connection);

      const power = createPowerConsumer('electrical', 100);
      power.isPowered = true;
      power.efficiency = 1.0;
      machine.addComponent(power);

      // Run for 100 ticks (5 seconds)
      for (let i = 0; i < 100; i++) {
        assemblySystem.update(world, [machine], 0.05);
      }

      // Should have made 5% progress (5s / 100s)
      expect(assembly.progress).toBeGreaterThan(4);
      expect(assembly.progress).toBeLessThan(6);
    });
  });

  describe('System Integration Edge Cases', () => {
    it('should handle empty entity list', () => {
      expect(() => {
        powerSystem.update(world, [], 0.05);
        beltSystem.update(world, [], 0.05);
        assemblySystem.update(world, [], 0.05);
      }).not.toThrow();
    });

    it('should handle very small deltaTime', () => {
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(0, 0));

      const assembly = createAssemblyMachine('test_machine', 1);
      assembly.currentRecipe = 'test_item';
      assembly.speed = 1.0;
      machine.addComponent(assembly);

      const connection = createMachineConnection();
      connection.inputs[0]!.items = [
        { instanceId: 'ing1', definitionId: 'ingredient_a', quality: 50, condition: 100 },
      ];
      machine.addComponent(connection);

      const power = createPowerConsumer('electrical', 100);
      power.isPowered = true;
      power.efficiency = 1.0;
      machine.addComponent(power);

      // Very small time step
      assemblySystem.update(world, [machine], 0.0001);

      // Should still make tiny progress
      expect(assembly.progress).toBeGreaterThan(0);
      expect(assembly.progress).toBeLessThan(0.1);
    });

    it('should handle very large deltaTime', () => {
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(0, 0));

      const assembly = createAssemblyMachine('test_machine', 1);
      assembly.currentRecipe = 'test_item';
      assembly.speed = 1.0;
      machine.addComponent(assembly);

      const connection = createMachineConnection();
      connection.inputs[0]!.items = [
        { instanceId: 'ing1', definitionId: 'ingredient_a', quality: 50, condition: 100 },
      ];
      machine.addComponent(connection);

      const power = createPowerConsumer('electrical', 100);
      power.isPowered = true;
      power.efficiency = 1.0;
      machine.addComponent(power);

      // Very large time step (10 seconds)
      assemblySystem.update(world, [machine], 10.0);

      // Should complete and produce output
      expect(assembly.progress).toBeLessThanOrEqual(100);
      expect(connection.outputs[0]!.items.length).toBeGreaterThan(0);
    });
  });
});
