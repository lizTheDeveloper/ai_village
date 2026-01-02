/**
 * Integration tests for automation systems.
 * Tests the complete automation workflow from power → belts → assembly.
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
import { DirectConnectionSystem } from '../systems/DirectConnectionSystem.js';
import { AssemblyMachineSystem } from '../systems/AssemblyMachineSystem.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createAssemblyMachine } from '../components/AssemblyMachineComponent.js';
import { createMachineConnection } from '../components/MachineConnectionComponent.js';
import { createPowerProducer, createPowerConsumer } from '../components/PowerComponent.js';
import { createBeltComponent, addItemsToBelt } from '../components/BeltComponent.js';
import type { Recipe } from '../crafting/Recipe.js';

describe('Automation Integration Tests', () => {
  let world: WorldImpl;
  let craftingSystem: CraftingSystem;
  let recipeRegistry: RecipeRegistry;
  let itemRegistry: ItemInstanceRegistry;
  let powerSystem: PowerGridSystem;
  let beltSystem: BeltSystem;
  let directConnectionSystem: DirectConnectionSystem;
  let assemblySystem: AssemblyMachineSystem;

  // Test recipe: 2 iron plates → 1 iron gear
  const IRON_GEAR_RECIPE: Recipe = {
    id: 'iron_gear',
    name: 'Iron Gear',
    category: 'Crafting',
    ingredients: [
      { itemId: 'iron_plate', quantity: 2 },
    ],
    output: {
      itemId: 'iron_gear',
      quantity: 1,
    },
    craftingTime: 0.5, // 10 ticks at 20 TPS
    requiredSkills: {},
    requiredTools: [],
    stationRequired: 'assembly_machine',
  };

  beforeEach(() => {
    // Create world and systems
    const eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    craftingSystem = new CraftingSystem();
    recipeRegistry = new RecipeRegistry();
    itemRegistry = ItemInstanceRegistry.getInstance();

    powerSystem = new PowerGridSystem();
    beltSystem = new BeltSystem();
    directConnectionSystem = new DirectConnectionSystem();
    assemblySystem = new AssemblyMachineSystem();

    // Register recipe
    recipeRegistry.registerRecipe(IRON_GEAR_RECIPE);
    craftingSystem.setRecipeRegistry(recipeRegistry);

    // Connect to world
    world.setCraftingSystem(craftingSystem);
    world.setItemInstanceRegistry(itemRegistry);
  });

  describe('Power Grid System', () => {
    it('should distribute power from generator to consumer', () => {
      // Create power generator
      const generator = world.createEntity() as EntityImpl;
      generator.addComponent(createPositionComponent(0, 0));
      const generatorPower = createPowerProducer('electrical', 1000);
      generator.addComponent(generatorPower);

      // Create power consumer (assembly machine)
      const consumer = world.createEntity() as EntityImpl;
      consumer.addComponent(createPositionComponent(1, 0)); // Adjacent
      const consumerPower = createPowerConsumer('electrical', 500);
      consumer.addComponent(consumerPower);

      // Initially not powered
      expect(consumerPower.isPowered).toBe(false);

      // Run power system
      powerSystem.update(world, [generator, consumer], 0.05);

      // Should be powered now
      expect(consumerPower.isPowered).toBe(true);
      expect(consumerPower.efficiency).toBe(1.0); // 1000W / 500W = 2x available
    });

    it('should handle insufficient power', () => {
      // Generator: 300W
      const generator = world.createEntity() as EntityImpl;
      generator.addComponent(createPositionComponent(0, 0));
      generator.addComponent(createPowerProducer('electrical', 300));

      // Consumer: 500W
      const consumer = world.createEntity() as EntityImpl;
      consumer.addComponent(createPositionComponent(1, 0));
      const consumerPower = createPowerConsumer('electrical', 500);
      consumer.addComponent(consumerPower);

      powerSystem.update(world, [generator, consumer], 0.05);

      // Should be powered but at reduced efficiency
      expect(consumerPower.isPowered).toBe(false); // 300/500 = 0.6 < 1.0
      expect(consumerPower.efficiency).toBeCloseTo(0.6, 1);
    });

    it('should not connect different power types', () => {
      // Mechanical generator
      const mechGenerator = world.createEntity() as EntityImpl;
      mechGenerator.addComponent(createPositionComponent(0, 0));
      mechGenerator.addComponent(createPowerProducer('mechanical', 1000));

      // Electrical consumer
      const elecConsumer = world.createEntity() as EntityImpl;
      elecConsumer.addComponent(createPositionComponent(1, 0));
      const consumerPower = createPowerConsumer('electrical', 500);
      elecConsumer.addComponent(consumerPower);

      powerSystem.update(world, [mechGenerator, elecConsumer], 0.05);

      // Should NOT be powered (different power types)
      expect(consumerPower.isPowered).toBe(false);
    });
  });

  describe('Belt System', () => {
    it('should transfer items along belt chain', () => {
      // Create belt chain: belt1 → belt2 → belt3
      const belt1 = world.createEntity() as EntityImpl;
      belt1.addComponent(createPositionComponent(0, 0));
      const belt1Comp = createBeltComponent('east', 1);
      addItemsToBelt(belt1Comp, 'iron_plate', 2);
      belt1.addComponent(belt1Comp);

      const belt2 = world.createEntity() as EntityImpl;
      belt2.addComponent(createPositionComponent(1, 0));
      const belt2Comp = createBeltComponent('east', 1);
      belt2.addComponent(belt2Comp);

      const belt3 = world.createEntity() as EntityImpl;
      belt3.addComponent(createPositionComponent(2, 0));
      const belt3Comp = createBeltComponent('east', 1);
      belt3.addComponent(belt3Comp);

      // Run belt system for enough ticks to transfer
      const TICKS_PER_SECOND = 20;
      const BELT_SPEED = 1.0; // 1 item/second for tier 1

      for (let i = 0; i < TICKS_PER_SECOND * 3; i++) {
        beltSystem.update(world, [belt1, belt2, belt3], 1.0 / TICKS_PER_SECOND);
        world.advanceTick();
      }

      // Items should have moved from belt1 → belt2 → belt3
      expect(belt1Comp.count).toBeLessThan(2); // Some items transferred out
      expect(belt2Comp.count).toBeGreaterThan(0); // Some items received
    });

    it('should enforce single resource type per belt', () => {
      const belt = world.createEntity() as EntityImpl;
      belt.addComponent(createPositionComponent(0, 0));
      const beltComp = createBeltComponent('east', 1);

      // Add iron plates
      addItemsToBelt(beltComp, 'iron_plate', 2);
      expect(beltComp.count).toBe(2);
      expect(beltComp.itemId).toBe('iron_plate');

      // Try to add copper plates (should fail - different item)
      const added = addItemsToBelt(beltComp, 'copper_plate', 1);
      expect(added).toBe(0); // Cannot mix resource types
      expect(beltComp.count).toBe(2); // Count unchanged
    });

    it('should respect capacity limits', () => {
      const belt = world.createEntity() as EntityImpl;
      belt.addComponent(createPositionComponent(0, 0));
      const beltComp = createBeltComponent('east', 1); // Tier 1 = capacity 4

      // Fill to capacity
      const added = addItemsToBelt(beltComp, 'iron_plate', 10);
      expect(added).toBe(4); // Only 4 fit
      expect(beltComp.count).toBe(4);
    });
  });

  describe('Direct Connection System', () => {
    it('should transfer items directly between adjacent machines', () => {
      // Create source machine with output
      const source = world.createEntity() as EntityImpl;
      source.addComponent(createPositionComponent(0, 0));
      const sourceConnection = createMachineConnection();
      // Output slot pointing east (+1, 0)
      sourceConnection.outputs[0]!.offset = { x: 1, y: 0 };
      sourceConnection.outputs[0]!.items = [
        { instanceId: 'item1', definitionId: 'iron_plate', quality: 50, condition: 100 },
        { instanceId: 'item2', definitionId: 'iron_plate', quality: 50, condition: 100 },
      ];
      source.addComponent(sourceConnection);

      // Create target machine with input
      const target = world.createEntity() as EntityImpl;
      target.addComponent(createPositionComponent(1, 0)); // East of source
      const targetConnection = createMachineConnection();
      // Input slot pointing west (-1, 0)
      targetConnection.inputs[0]!.offset = { x: -1, y: 0 };
      targetConnection.inputs[0]!.items = [];
      target.addComponent(targetConnection);

      // Run direct connection system
      directConnectionSystem.update(world, [source, target], 0.05);

      // Items should transfer from source output to target input
      expect(sourceConnection.outputs[0]!.items.length).toBeLessThan(2);
      expect(targetConnection.inputs[0]!.items.length).toBeGreaterThan(0);
    });
  });

  describe('Assembly Machine System', () => {
    it('should craft items when powered and ingredients available', () => {
      // Create powered assembly machine
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(10, 10));

      // Configure for iron gear recipe
      const assemblyComp = createAssemblyMachine('assembly_machine_i', 1);
      assemblyComp.currentRecipe = 'iron_gear';
      assemblyComp.speed = 1.0;
      machine.addComponent(assemblyComp);

      // Add machine connection with ingredients
      const connection = createMachineConnection();
      connection.inputs[0]!.items = [
        { instanceId: 'plate1', definitionId: 'iron_plate', quality: 50, condition: 100 },
        { instanceId: 'plate2', definitionId: 'iron_plate', quality: 50, condition: 100 },
        { instanceId: 'plate3', definitionId: 'iron_plate', quality: 50, condition: 100 },
        { instanceId: 'plate4', definitionId: 'iron_plate', quality: 50, condition: 100 },
      ];
      machine.addComponent(connection);

      // Add power (always powered)
      const power = createPowerConsumer('electrical', 100);
      power.isPowered = true;
      power.efficiency = 1.0;
      machine.addComponent(power);

      // Run assembly system for crafting time (0.5s = 10 ticks)
      const TICKS_PER_SECOND = 20;
      const CRAFT_TIME = 10;

      for (let i = 0; i < CRAFT_TIME + 1; i++) {
        assemblySystem.update(world, [machine], 1.0 / TICKS_PER_SECOND);
        world.advanceTick();
      }

      // Should have consumed 2 iron plates and produced 1 iron gear
      expect(connection.inputs[0]!.items.length).toBe(2); // 4 - 2 = 2
      expect(connection.outputs[0]!.items.length).toBe(1);
      expect(connection.outputs[0]!.items[0]!.definitionId).toBe('iron_gear');
    });

    it('should halt when output is full', () => {
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(10, 10));

      const assemblyComp = createAssemblyMachine('assembly_machine_i', 1);
      assemblyComp.currentRecipe = 'iron_gear';
      assemblyComp.speed = 1.0;
      machine.addComponent(assemblyComp);

      const connection = createMachineConnection();
      // Fill output to capacity
      connection.outputs[0]!.items = new Array(connection.outputs[0]!.capacity).fill({
        instanceId: 'dummy',
        definitionId: 'iron_gear',
        quality: 50,
        condition: 100,
      });
      // Add ingredients
      connection.inputs[0]!.items = [
        { instanceId: 'plate1', definitionId: 'iron_plate', quality: 50, condition: 100 },
        { instanceId: 'plate2', definitionId: 'iron_plate', quality: 50, condition: 100 },
      ];
      machine.addComponent(connection);

      const power = createPowerConsumer('electrical', 100);
      power.isPowered = true;
      power.efficiency = 1.0;
      machine.addComponent(power);

      // Run for enough time to complete crafting
      for (let i = 0; i < 15; i++) {
        assemblySystem.update(world, [machine], 1.0 / 20);
        world.advanceTick();
      }

      // Should have progress but no production (output full)
      expect(assemblyComp.progress).toBeGreaterThan(0);
      expect(connection.inputs[0]!.items.length).toBe(2); // No ingredients consumed
    });

    it('should respect power efficiency', () => {
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(10, 10));

      const assemblyComp = createAssemblyMachine('assembly_machine_i', 1);
      assemblyComp.currentRecipe = 'iron_gear';
      assemblyComp.speed = 1.0;
      machine.addComponent(assemblyComp);

      const connection = createMachineConnection();
      connection.inputs[0]!.items = [
        { instanceId: 'plate1', definitionId: 'iron_plate', quality: 50, condition: 100 },
        { instanceId: 'plate2', definitionId: 'iron_plate', quality: 50, condition: 100 },
      ];
      machine.addComponent(connection);

      // 50% power efficiency
      const power = createPowerConsumer('electrical', 100);
      power.isPowered = true;
      power.efficiency = 0.5;
      machine.addComponent(power);

      // Run for 10 ticks
      for (let i = 0; i < 10; i++) {
        assemblySystem.update(world, [machine], 1.0 / 20);
        world.advanceTick();
      }

      // Progress should be about 50% (due to 50% efficiency)
      expect(assemblyComp.progress).toBeGreaterThan(40);
      expect(assemblyComp.progress).toBeLessThan(60);
    });

    it('should not craft without power', () => {
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(10, 10));

      const assemblyComp = createAssemblyMachine('assembly_machine_i', 1);
      assemblyComp.currentRecipe = 'iron_gear';
      machine.addComponent(assemblyComp);

      const connection = createMachineConnection();
      connection.inputs[0]!.items = [
        { instanceId: 'plate1', definitionId: 'iron_plate', quality: 50, condition: 100 },
        { instanceId: 'plate2', definitionId: 'iron_plate', quality: 50, condition: 100 },
      ];
      machine.addComponent(connection);

      // Not powered
      const power = createPowerConsumer('electrical', 100);
      power.isPowered = false;
      machine.addComponent(power);

      // Run system
      for (let i = 0; i < 20; i++) {
        assemblySystem.update(world, [machine], 1.0 / 20);
      }

      // Should make no progress
      expect(assemblyComp.progress).toBe(0);
    });
  });

  describe('Full Factory Integration', () => {
    it('should run a complete powered belt → assembly workflow', () => {
      // 1. Create power generator
      const generator = world.createEntity() as EntityImpl;
      generator.addComponent(createPositionComponent(0, 0));
      generator.addComponent(createPowerProducer('electrical', 10000));

      // 2. Create input belt with items
      const inputBelt = world.createEntity() as EntityImpl;
      inputBelt.addComponent(createPositionComponent(5, 10));
      const inputBeltComp = createBeltComponent('south', 2); // Points to machine
      addItemsToBelt(inputBeltComp, 'iron_plate', 4);
      inputBelt.addComponent(inputBeltComp);

      // 3. Create assembly machine
      const machine = world.createEntity() as EntityImpl;
      machine.addComponent(createPositionComponent(5, 11)); // South of input belt

      const assemblyComp = createAssemblyMachine('assembly_machine_i', 1);
      assemblyComp.currentRecipe = 'iron_gear';
      assemblyComp.speed = 1.0;
      machine.addComponent(assemblyComp);

      const connection = createMachineConnection();
      connection.inputs[0]!.offset = { x: 0, y: -1 }; // North (from input belt)
      connection.outputs[0]!.offset = { x: 0, y: 1 }; // South (to output belt)
      machine.addComponent(connection);

      const machinePower = createPowerConsumer('electrical', 500);
      machine.addComponent(machinePower);

      // 4. Create output belt
      const outputBelt = world.createEntity() as EntityImpl;
      outputBelt.addComponent(createPositionComponent(5, 12)); // South of machine
      const outputBeltComp = createBeltComponent('south', 2);
      outputBelt.addComponent(outputBeltComp);

      // 5. Run full simulation
      const entities = [generator, inputBelt, machine, outputBelt];
      const SIMULATION_SECONDS = 2;
      const TICKS = 20 * SIMULATION_SECONDS;

      for (let tick = 0; tick < TICKS; tick++) {
        // Systems run in priority order
        powerSystem.update(world, entities, 0.05);
        directConnectionSystem.update(world, entities, 0.05);
        beltSystem.update(world, entities, 0.05);
        assemblySystem.update(world, entities, 0.05);
        world.advanceTick();
      }

      // Verify:
      // - Machine should be powered
      expect(machinePower.isPowered).toBe(true);

      // - Input items should have transferred from belt to machine
      expect(inputBeltComp.count).toBeLessThan(4);

      // - Machine should have produced iron gears
      expect(connection.outputs[0]!.items.length).toBeGreaterThan(0);

      // - Output items should be iron gears
      const outputItems = connection.outputs[0]!.items;
      expect(outputItems.every(item => item.definitionId === 'iron_gear')).toBe(true);
    });
  });
});
