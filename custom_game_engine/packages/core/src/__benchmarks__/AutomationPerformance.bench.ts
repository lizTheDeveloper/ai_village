/**
 * Performance benchmarks for automation systems.
 * Tests scalability with large factory setups.
 */

import { describe, bench } from 'vitest';
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

const IRON_GEAR_RECIPE: Recipe = {
  id: 'iron_gear',
  name: 'Iron Gear',
  category: 'Crafting',
  ingredients: [{ itemId: 'iron_plate', quantity: 2 }],
  output: { itemId: 'iron_gear', quantity: 1 },
  craftingTime: 0.5,
  requiredSkills: {},
  requiredTools: [],
  stationRequired: 'assembly_machine',
};

function setupWorld() {
  const eventBus = new EventBusImpl();
  const world = new WorldImpl(eventBus);
  const craftingSystem = new CraftingSystem();
  const recipeRegistry = new RecipeRegistry();
  const itemRegistry = ItemInstanceRegistry.getInstance();

  recipeRegistry.registerRecipe(IRON_GEAR_RECIPE);
  craftingSystem.setRecipeRegistry(recipeRegistry);
  world.setCraftingSystem(craftingSystem);
  world.setItemInstanceRegistry(itemRegistry);

  return { world, craftingSystem };
}

describe('Automation Performance Benchmarks', () => {
  describe('Power Grid System', () => {
    bench('10 machines in single network', () => {
      const { world } = setupWorld();
      const powerSystem = new PowerGridSystem();

      // Create power network with 10 machines
      const generator = world.createEntity() as EntityImpl;
      generator.addComponent(createPositionComponent(0, 0));
      generator.addComponent(createPowerProducer('electrical', 10000));

      const machines: EntityImpl[] = [generator];
      for (let i = 0; i < 10; i++) {
        const machine = world.createEntity() as EntityImpl;
        machine.addComponent(createPositionComponent(i + 1, 0));
        machine.addComponent(createPowerConsumer('electrical', 500));
        machines.push(machine);
      }

      powerSystem.update(world, machines, 0.05);
    });

    bench('50 machines in single network', () => {
      const { world } = setupWorld();
      const powerSystem = new PowerGridSystem();

      const generator = world.createEntity() as EntityImpl;
      generator.addComponent(createPositionComponent(0, 0));
      generator.addComponent(createPowerProducer('electrical', 50000));

      const machines: EntityImpl[] = [generator];
      for (let i = 0; i < 50; i++) {
        const machine = world.createEntity() as EntityImpl;
        machine.addComponent(createPositionComponent((i % 10) + 1, Math.floor(i / 10)));
        machine.addComponent(createPowerConsumer('electrical', 500));
        machines.push(machine);
      }

      powerSystem.update(world, machines, 0.05);
    });

    bench('100 machines in multiple networks', () => {
      const { world } = setupWorld();
      const powerSystem = new PowerGridSystem();

      const entities: EntityImpl[] = [];

      // Create 10 separate networks with 10 machines each
      for (let network = 0; network < 10; network++) {
        const offsetY = network * 5;

        const generator = world.createEntity() as EntityImpl;
        generator.addComponent(createPositionComponent(0, offsetY));
        generator.addComponent(createPowerProducer('electrical', 10000));
        entities.push(generator);

        for (let i = 0; i < 10; i++) {
          const machine = world.createEntity() as EntityImpl;
          machine.addComponent(createPositionComponent(i + 1, offsetY));
          machine.addComponent(createPowerConsumer('electrical', 500));
          entities.push(machine);
        }
      }

      powerSystem.update(world, entities, 0.05);
    });
  });

  describe('Belt System', () => {
    bench('10 belts in chain', () => {
      const { world } = setupWorld();
      const beltSystem = new BeltSystem();

      const belts: EntityImpl[] = [];
      for (let i = 0; i < 10; i++) {
        const belt = world.createEntity() as EntityImpl;
        belt.addComponent(createPositionComponent(i, 0));
        const beltComp = createBeltComponent('east', 1);
        if (i === 0) {
          addItemsToBelt(beltComp, 'iron_plate', 4);
        }
        belt.addComponent(beltComp);
        belts.push(belt);
      }

      beltSystem.update(world, belts, 0.05);
    });

    bench('50 belts in chain', () => {
      const { world } = setupWorld();
      const beltSystem = new BeltSystem();

      const belts: EntityImpl[] = [];
      for (let i = 0; i < 50; i++) {
        const belt = world.createEntity() as EntityImpl;
        belt.addComponent(createPositionComponent(i, 0));
        const beltComp = createBeltComponent('east', 2);
        if (i === 0) {
          addItemsToBelt(beltComp, 'iron_plate', 8);
        }
        belt.addComponent(beltComp);
        belts.push(belt);
      }

      beltSystem.update(world, belts, 0.05);
    });

    bench('100 belts with items', () => {
      const { world } = setupWorld();
      const beltSystem = new BeltSystem();

      const belts: EntityImpl[] = [];
      for (let i = 0; i < 100; i++) {
        const belt = world.createEntity() as EntityImpl;
        belt.addComponent(createPositionComponent(i % 10, Math.floor(i / 10)));
        const beltComp = createBeltComponent('east', 2);
        addItemsToBelt(beltComp, 'iron_plate', 4);
        belt.addComponent(beltComp);
        belts.push(belt);
      }

      beltSystem.update(world, belts, 0.05);
    });
  });

  describe('Assembly Machine System', () => {
    bench('10 assembly machines crafting', () => {
      const { world } = setupWorld();
      const assemblySystem = new AssemblyMachineSystem();

      const machines: EntityImpl[] = [];
      for (let i = 0; i < 10; i++) {
        const machine = world.createEntity() as EntityImpl;
        machine.addComponent(createPositionComponent(i, 0));

        const assembly = createAssemblyMachine('assembly_machine_i', 1);
        assembly.currentRecipe = 'iron_gear';
        assembly.speed = 1.0;
        assembly.progress = 50; // Mid-craft
        machine.addComponent(assembly);

        const connection = createMachineConnection();
        connection.inputs[0]!.items = [
          { instanceId: `p1_${i}`, definitionId: 'iron_plate', quality: 50, condition: 100 },
          { instanceId: `p2_${i}`, definitionId: 'iron_plate', quality: 50, condition: 100 },
        ];
        machine.addComponent(connection);

        const power = createPowerConsumer('electrical', 500);
        power.isPowered = true;
        power.efficiency = 1.0;
        machine.addComponent(power);

        machines.push(machine);
      }

      assemblySystem.update(world, machines, 0.05);
    });

    bench('50 assembly machines crafting', () => {
      const { world } = setupWorld();
      const assemblySystem = new AssemblyMachineSystem();

      const machines: EntityImpl[] = [];
      for (let i = 0; i < 50; i++) {
        const machine = world.createEntity() as EntityImpl;
        machine.addComponent(createPositionComponent(i % 10, Math.floor(i / 10)));

        const assembly = createAssemblyMachine('assembly_machine_i', 1);
        assembly.currentRecipe = 'iron_gear';
        assembly.speed = 1.0;
        assembly.progress = 50;
        machine.addComponent(assembly);

        const connection = createMachineConnection();
        connection.inputs[0]!.items = [
          { instanceId: `p1_${i}`, definitionId: 'iron_plate', quality: 50, condition: 100 },
          { instanceId: `p2_${i}`, definitionId: 'iron_plate', quality: 50, condition: 100 },
        ];
        machine.addComponent(connection);

        const power = createPowerConsumer('electrical', 500);
        power.isPowered = true;
        power.efficiency = 1.0;
        machine.addComponent(power);

        machines.push(machine);
      }

      assemblySystem.update(world, machines, 0.05);
    });
  });

  describe('Complete Factory Simulation', () => {
    bench('Small factory: 10 machines + 20 belts + power', () => {
      const { world } = setupWorld();
      const powerSystem = new PowerGridSystem();
      const beltSystem = new BeltSystem();
      const directConnection = new DirectConnectionSystem();
      const assemblySystem = new AssemblyMachineSystem();

      const entities: EntityImpl[] = [];

      // Power generator
      const generator = world.createEntity() as EntityImpl;
      generator.addComponent(createPositionComponent(0, 0));
      generator.addComponent(createPowerProducer('electrical', 10000));
      entities.push(generator);

      // 10 assembly machines
      for (let i = 0; i < 10; i++) {
        const machine = world.createEntity() as EntityImpl;
        machine.addComponent(createPositionComponent(5, i * 2));

        const assembly = createAssemblyMachine('assembly_machine_i', 1);
        assembly.currentRecipe = 'iron_gear';
        assembly.speed = 1.0;
        machine.addComponent(assembly);

        const connection = createMachineConnection();
        connection.inputs[0]!.items = [
          { instanceId: `p1_${i}`, definitionId: 'iron_plate', quality: 50, condition: 100 },
          { instanceId: `p2_${i}`, definitionId: 'iron_plate', quality: 50, condition: 100 },
        ];
        machine.addComponent(connection);

        machine.addComponent(createPowerConsumer('electrical', 500));
        entities.push(machine);
      }

      // 20 belts
      for (let i = 0; i < 20; i++) {
        const belt = world.createEntity() as EntityImpl;
        belt.addComponent(createPositionComponent(i % 10, 20 + Math.floor(i / 10)));
        const beltComp = createBeltComponent('east', 2);
        addItemsToBelt(beltComp, 'iron_plate', 4);
        belt.addComponent(beltComp);
        entities.push(belt);
      }

      // Run all systems
      powerSystem.update(world, entities, 0.05);
      directConnection.update(world, entities, 0.05);
      beltSystem.update(world, entities, 0.05);
      assemblySystem.update(world, entities, 0.05);
    });

    bench('Medium factory: 50 machines + 100 belts + power', () => {
      const { world } = setupWorld();
      const powerSystem = new PowerGridSystem();
      const beltSystem = new BeltSystem();
      const directConnection = new DirectConnectionSystem();
      const assemblySystem = new AssemblyMachineSystem();

      const entities: EntityImpl[] = [];

      // Power generators
      for (let g = 0; g < 5; g++) {
        const generator = world.createEntity() as EntityImpl;
        generator.addComponent(createPositionComponent(g * 10, 0));
        generator.addComponent(createPowerProducer('electrical', 10000));
        entities.push(generator);
      }

      // 50 assembly machines
      for (let i = 0; i < 50; i++) {
        const machine = world.createEntity() as EntityImpl;
        machine.addComponent(createPositionComponent(5 + (i % 10) * 2, 5 + Math.floor(i / 10) * 2));

        const assembly = createAssemblyMachine('assembly_machine_i', 1);
        assembly.currentRecipe = 'iron_gear';
        assembly.speed = 1.0;
        assembly.progress = Math.random() * 100;
        machine.addComponent(assembly);

        const connection = createMachineConnection();
        connection.inputs[0]!.items = [
          { instanceId: `p1_${i}`, definitionId: 'iron_plate', quality: 50, condition: 100 },
          { instanceId: `p2_${i}`, definitionId: 'iron_plate', quality: 50, condition: 100 },
        ];
        machine.addComponent(connection);

        machine.addComponent(createPowerConsumer('electrical', 500));
        entities.push(machine);
      }

      // 100 belts
      for (let i = 0; i < 100; i++) {
        const belt = world.createEntity() as EntityImpl;
        belt.addComponent(createPositionComponent(i % 20, 30 + Math.floor(i / 20)));
        const beltComp = createBeltComponent('east', 2);
        if (i % 3 === 0) {
          addItemsToBelt(beltComp, 'iron_plate', 4);
        }
        belt.addComponent(beltComp);
        entities.push(belt);
      }

      // Run all systems
      powerSystem.update(world, entities, 0.05);
      directConnection.update(world, entities, 0.05);
      beltSystem.update(world, entities, 0.05);
      assemblySystem.update(world, entities, 0.05);
    });
  });

  describe('Count-based vs Position-based Belts Comparison', () => {
    bench('Count-based: 100 belts (current implementation)', () => {
      const { world } = setupWorld();
      const beltSystem = new BeltSystem();

      const belts: EntityImpl[] = [];
      for (let i = 0; i < 100; i++) {
        const belt = world.createEntity() as EntityImpl;
        belt.addComponent(createPositionComponent(i % 10, Math.floor(i / 10)));
        const beltComp = createBeltComponent('east', 2);
        addItemsToBelt(beltComp, 'iron_plate', 4);
        belt.addComponent(beltComp);
        belts.push(belt);
      }

      beltSystem.update(world, belts, 0.05);
    });

    bench('Position-based (simulated): 100 belts with 4 items each', () => {
      // This simulates the OLD position-based approach
      // where each item had a progress value that needed updating

      const belts: any[] = [];
      for (let i = 0; i < 100; i++) {
        const items = [];
        for (let j = 0; j < 4; j++) {
          items.push({
            itemId: 'iron_plate',
            progress: Math.random(), // 0.0 to 1.0
          });
        }
        belts.push({ items });
      }

      // Simulate updating progress for each item
      const speed = 1.0;
      const deltaTime = 0.05;
      for (const belt of belts) {
        for (const item of belt.items) {
          item.progress += speed * deltaTime;
          if (item.progress >= 1.0) {
            item.progress = 0.0;
            // Transfer logic here
          }
        }
      }
    });
  });
});
