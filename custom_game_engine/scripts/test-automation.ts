/**
 * Test script to verify automation systems produce correct output.
 * Spawns factories and verifies they craft items as expected.
 */

import { World, EventBusImpl } from '../packages/core/dist/index.js';
import type { EntityImpl } from '../packages/core/dist/index.js';
import { CraftingSystem } from '../packages/core/dist/crafting/CraftingSystem.js';
import { RecipeRegistry } from '../packages/core/dist/crafting/RecipeRegistry.js';
import { ItemInstanceRegistry } from '../packages/core/dist/items/ItemInstanceRegistry.js';
import { AssemblyMachineSystem } from '../packages/core/dist/systems/AssemblyMachineSystem.js';
import { createPositionComponent } from '../packages/core/dist/components/PositionComponent.js';
import { createAssemblyMachine } from '../packages/core/dist/components/AssemblyMachineComponent.js';
import { createMachineConnection } from '../packages/core/dist/components/MachineConnectionComponent.js';
import { createPowerConsumer } from '../packages/core/dist/components/PowerComponent.js';
import type { Recipe } from '../packages/core/dist/crafting/Recipe.js';

const itemInstanceRegistry = ItemInstanceRegistry.getInstance();

// Test recipes
const IRON_PLATE_RECIPE: Recipe = {
  id: 'iron_plate',
  name: 'Iron Plate',
  category: 'Crafting',
  ingredients: [
    { itemId: 'iron_ingot', quantity: 1 },
  ],
  output: {
    itemId: 'iron_plate',
    quantity: 1,
  },
  craftingTime: 1.0, // 1 second at 20 TPS = 20 ticks
  requiredSkills: {},
  requiredTools: [],
  stationRequired: 'assembly_machine',
};

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
  craftingTime: 0.5, // 0.5 seconds = 10 ticks
  requiredSkills: {},
  requiredTools: [],
  stationRequired: 'assembly_machine',
};

console.log('=== Automation System Test ===\n');

// 1. Create world and systems
console.log('1. Creating world and systems...');
const eventBus = new EventBusImpl();
const world = new World(eventBus);
const craftingSystem = new CraftingSystem();
const assemblySystem = new AssemblyMachineSystem();

// 2. Set up recipe registry
console.log('2. Setting up recipe registry...');
const recipeRegistry = new RecipeRegistry();
recipeRegistry.registerRecipe(IRON_PLATE_RECIPE);
recipeRegistry.registerRecipe(IRON_GEAR_RECIPE);
craftingSystem.setRecipeRegistry(recipeRegistry);

// 3. Set up world references
console.log('3. Connecting world to systems...');
(world as any).setCraftingSystem(craftingSystem);
(world as any).setItemInstanceRegistry(itemInstanceRegistry);

console.log(`   - Crafting system registered: ${!!world.craftingSystem}`);
console.log(`   - Item registry registered: ${!!world.itemInstanceRegistry}`);

// 4. Create assembly machine entity
console.log('\n4. Creating assembly machine entity...');
const machine = world.createEntity() as EntityImpl;

// Add position
machine.addComponent(createPositionComponent(10, 10));

// Add assembly machine component with recipe configured
const assemblyComp = createAssemblyMachine('assembly_machine_i', 1);
assemblyComp.currentRecipe = 'iron_plate';
assemblyComp.speed = 1.0;
machine.addComponent(assemblyComp);

// Add machine connection with input/output slots
const connection = createMachineConnection();
// Input slot (north) - pre-populated with iron ingots
connection.inputs[0]!.items = [
  { instanceId: 'ing1', definitionId: 'iron_ingot', quality: 50, condition: 100 },
  { instanceId: 'ing2', definitionId: 'iron_ingot', quality: 50, condition: 100 },
  { instanceId: 'ing3', definitionId: 'iron_ingot', quality: 50, condition: 100 },
  { instanceId: 'ing4', definitionId: 'iron_ingot', quality: 50, condition: 100 },
  { instanceId: 'ing5', definitionId: 'iron_ingot', quality: 50, condition: 100 },
];
machine.addComponent(connection);

// Add power component (always powered for this test)
const power = createPowerConsumer('electrical', 100);
power.isPowered = true;
power.efficiency = 1.0;
machine.addComponent(power);

console.log(`   - Machine ID: ${machine.id}`);
console.log(`   - Recipe: ${assemblyComp.currentRecipe}`);
console.log(`   - Input items: ${connection.inputs[0]!.items.length} iron ingots`);
console.log(`   - Output items: ${connection.outputs[0]!.items.length}`);

// 5. Run simulation
console.log('\n5. Running simulation...');
const TICKS_PER_SECOND = 20;
const SIMULATION_SECONDS = 3;
const TOTAL_TICKS = TICKS_PER_SECOND * SIMULATION_SECONDS;

for (let tick = 0; tick < TOTAL_TICKS; tick++) {
  // Run assembly machine system
  assemblySystem.update(world, [machine], 1.0 / TICKS_PER_SECOND);

  // Advance world tick
  (world as any).advanceTick();

  // Log progress every second
  if ((tick + 1) % TICKS_PER_SECOND === 0) {
    const machineComp = machine.getComponent<typeof assemblyComp>('assembly_machine')!;
    const connectionComp = machine.getComponent<typeof connection>('machine_connection')!;
    const second = (tick + 1) / TICKS_PER_SECOND;
    console.log(`   Tick ${tick + 1} (${second}s): Progress ${machineComp.progress.toFixed(1)}%, Outputs: ${connectionComp.outputs[0]!.items.length}, Inputs: ${connectionComp.inputs[0]!.items.length}`);
  }
}

// 6. Verify results
console.log('\n6. Verification:');
const finalMachine = machine.getComponent<typeof assemblyComp>('assembly_machine')!;
const finalConnection = machine.getComponent<typeof connection>('machine_connection')!;

console.log(`   - Final progress: ${finalMachine.progress.toFixed(1)}%`);
console.log(`   - Input items remaining: ${finalConnection.inputs[0]!.items.length}`);
console.log(`   - Output items produced: ${finalConnection.outputs[0]!.items.length}`);

// Check output items
const outputItems = finalConnection.outputs[0]!.items;
console.log('\n7. Output item details:');
for (let i = 0; i < outputItems.length; i++) {
  const item = outputItems[i]!;
  console.log(`   Item ${i + 1}: ${item.definitionId} (quality: ${item.quality}, condition: ${item.condition}, instanceId: ${item.instanceId})`);
}

// Verify expectations
const EXPECTED_CRAFTS = Math.floor(SIMULATION_SECONDS / IRON_PLATE_RECIPE.craftingTime);
const SUCCESS = outputItems.length === EXPECTED_CRAFTS &&
                outputItems.every(item => item.definitionId === 'iron_plate');

console.log('\n=== Test Results ===');
console.log(`Expected crafts: ${EXPECTED_CRAFTS} iron plates`);
console.log(`Actual output: ${outputItems.length} items`);
console.log(`All items correct type: ${outputItems.every(item => item.definitionId === 'iron_plate')}`);
console.log(`\nTest ${SUCCESS ? '✓ PASSED' : '✗ FAILED'}`);

if (!SUCCESS) {
  process.exit(1);
}
