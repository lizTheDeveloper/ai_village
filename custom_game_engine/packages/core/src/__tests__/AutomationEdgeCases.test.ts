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
import { StateMutatorSystem } from '../systems/StateMutatorSystem.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createAssemblyMachineComponent } from '../components/AssemblyMachineComponent.js';
import { createMachineConnectionComponent } from '../components/MachineConnectionComponent.js';
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
  let stateMutatorSystem: StateMutatorSystem;

  const TEST_RECIPE: Recipe = {
    id: 'test_item',
    name: 'Test Item',
    category: 'Test',
    description: 'A test item for automation edge case testing.',
    ingredients: [{ itemId: 'ingredient_a', quantity: 1 }],
    output: { itemId: 'product_b', quantity: 1 },
    craftingTime: 1.0,
    xpGain: 10,
    stationRequired: 'test_machine',
    skillRequirements: [],
    researchRequirements: [],
    requiredTools: [],
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
    stateMutatorSystem = new StateMutatorSystem();

    // Wire up StateMutatorSystem dependency
    assemblySystem.setStateMutatorSystem(stateMutatorSystem);
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
      // Network 1 - generator with connection range to reach consumer at distance 1
      const gen1 = world.createEntity() as EntityImpl;
      gen1.addComponent(createPositionComponent(0, 0));
      gen1.addComponent(createPowerProducer('electrical', 1000, 2)); // Range 2 to connect

      const con1 = world.createEntity() as EntityImpl;
      con1.addComponent(createPositionComponent(1, 0));
      const power1 = createPowerConsumer('electrical', 500);
      con1.addComponent(power1);

      // Network 2 (disconnected - 20 tiles away)
      const gen2 = world.createEntity() as EntityImpl;
      gen2.addComponent(createPositionComponent(20, 20));
      gen2.addComponent(createPowerProducer('electrical', 2000, 2)); // Range 2 to connect

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
      const belt = createBeltComponent('east', 1, 4); // Explicitly set capacity to 4
      addItemsToBelt(belt, 'iron_ore', 3);

      const canAccept = canAcceptItems(belt, 'iron_ore', 2);
      expect(canAccept).toBe(false); // Would exceed capacity (3 + 2 = 5 > 4)
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

      const assembly = createAssemblyMachineComponent('test_machine', { ingredientSlots: 1 });
      assembly.currentRecipe = 'non_existent_recipe';
      machine.addComponent(assembly);

      machine.addComponent(createMachineConnectionComponent());
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

      const assembly = createAssemblyMachineComponent('test_machine', { ingredientSlots: 1 });
      assembly.currentRecipe = 'test_item';
      machine.addComponent(assembly);

      const connection = createMachineConnectionComponent();
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
        description: 'A test recipe requiring multiple inputs.',
        ingredients: [
          { itemId: 'ingredient_a', quantity: 2 },
        ],
        output: { itemId: 'product_b', quantity: 1 },
        craftingTime: 1.0,
        xpGain: 10,
        stationRequired: 'test_machine',
        skillRequirements: [],
        researchRequirements: [],
        requiredTools: [],
      };

      recipeRegistry.registerRecipe(MULTI_RECIPE);

      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(0, 0));

      const assembly = createAssemblyMachineComponent('test_machine', { ingredientSlots: 1 });
      assembly.currentRecipe = 'multi_input';
      machine.addComponent(assembly);

      const connection = createMachineConnectionComponent();
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

      const assembly = createAssemblyMachineComponent('test_machine', { ingredientSlots: 1 });
      assembly.currentRecipe = 'test_item';
      assembly.speed = 1.0;
      machine.addComponent(assembly);

      const connection = createMachineConnectionComponent();
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
      // Need >1200 ticks for StateMutatorSystem to apply first delta
      for (let i = 0; i < 1250; i++) {
        assemblySystem.update(world, [machine], 0.05);
        // Apply deltas via StateMutatorSystem each tick
        stateMutatorSystem.update(world, [], 0.05);
        world.advanceTick();
      }

      // Get updated components
      let updatedAssembly = machine.getComponent('assembly_machine' as any);
      let updatedConnection = machine.getComponent('machine_connection' as any);

      // Should be blocked at 100%
      expect(updatedAssembly!.progress).toBeGreaterThanOrEqual(100);
      expect(updatedConnection!.inputs[0]!.items.length).toBe(2); // Not consumed

      // Clear output space on the actual component
      updatedConnection!.outputs[0]!.items = [];

      // Run one more tick
      assemblySystem.update(world, [machine], 0.05);
      stateMutatorSystem.update(world, [], 0.05);

      // Get components again
      updatedConnection = machine.getComponent('machine_connection' as any);

      // Should have consumed ingredients and reset progress
      // (Might not be exactly 0 due to continued progress)
      expect(updatedConnection!.inputs[0]!.items.length).toBeLessThan(2);
    });

    it('should handle machine with no power component', () => {
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(0, 0));

      const assembly = createAssemblyMachineComponent('test_machine', { ingredientSlots: 1 });
      assembly.currentRecipe = 'test_item';
      machine.addComponent(assembly);

      const connection = createMachineConnectionComponent();
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
        description: 'A test recipe with very long crafting time.',
        ingredients: [{ itemId: 'ingredient_a', quantity: 1 }],
        output: { itemId: 'product_b', quantity: 1 },
        craftingTime: 100.0, // 100 seconds = 2000 ticks
        xpGain: 10,
        stationRequired: 'test_machine',
        skillRequirements: [],
        researchRequirements: [],
        requiredTools: [],
      };

      recipeRegistry.registerRecipe(LONG_RECIPE);

      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(0, 0));

      const assembly = createAssemblyMachineComponent('test_machine', { ingredientSlots: 1 });
      assembly.currentRecipe = 'slow_craft';
      assembly.speed = 1.0;
      machine.addComponent(assembly);

      const connection = createMachineConnectionComponent();
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
        // Apply deltas via StateMutatorSystem each tick
        stateMutatorSystem.update(world, [], 0.05);
      }

      // Get the updated component from the entity
      const updatedAssembly = machine.getComponent('assembly_machine' as any);

      // Should have made 5% progress (5s / 100s)
      expect(updatedAssembly!.progress).toBeGreaterThan(4);
      expect(updatedAssembly!.progress).toBeLessThan(6);
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

      const assembly = createAssemblyMachineComponent('test_machine', { ingredientSlots: 1 });
      assembly.currentRecipe = 'test_item';
      assembly.speed = 1.0;
      machine.addComponent(assembly);

      const connection = createMachineConnectionComponent();
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
      // Apply deltas via StateMutatorSystem
      stateMutatorSystem.update(world, [], 0.0001);

      // Get the updated component from the entity (not the initial reference)
      const updatedAssembly = machine.getComponent('assembly_machine' as any);

      // Should still make tiny progress
      expect(updatedAssembly!.progress).toBeGreaterThan(0);
      expect(updatedAssembly!.progress).toBeLessThan(0.1);
    });

    it('should handle very large deltaTime', () => {
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(0, 0));

      const assembly = createAssemblyMachineComponent('test_machine', { ingredientSlots: 1 });
      assembly.currentRecipe = 'test_item';
      assembly.speed = 1.0;
      machine.addComponent(assembly);

      const connection = createMachineConnectionComponent();
      connection.inputs[0]!.items = [
        { instanceId: 'ing1', definitionId: 'ingredient_a', quality: 50, condition: 100 },
      ];
      machine.addComponent(connection);

      const power = createPowerConsumer('electrical', 100);
      power.isPowered = true;
      power.efficiency = 1.0;
      machine.addComponent(power);

      // Very large time step (10 seconds)
      // First call: AssemblySystem registers delta
      assemblySystem.update(world, [machine], 10.0);
      // Second call: StateMutatorSystem applies delta
      stateMutatorSystem.update(world, [], 10.0);
      // Third call: AssemblySystem checks completion and produces output
      assemblySystem.update(world, [machine], 0.05);

      // Get the updated component from the entity
      const updatedAssembly = machine.getComponent('assembly_machine' as any);
      const updatedConnection = machine.getComponent('machine_connection' as any);

      // Should complete and produce output
      expect(updatedAssembly!.progress).toBeLessThanOrEqual(100);
      expect(updatedConnection!.outputs[0]!.items.length).toBeGreaterThan(0);
    });
  });
});
