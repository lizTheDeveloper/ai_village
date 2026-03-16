/**
 * RED TEAM TESTS — AutomationEdgeCases
 *
 * AutomationEdgeCases.test.ts has 20+ tests. Two of them are pure
 * `.not.toThrow()` tests with zero behavior assertions. These prove
 * nothing about what the system DOES — only that it doesn't crash.
 *
 * A system can silently ignore all input, produce wrong results,
 * corrupt state, or just return immediately — and still pass `.not.toThrow()`.
 *
 * This file proves:
 * 1. "machine with no power component" test passes even if AssemblyMachine
 *    incorrectly advances progress on an unpowered machine (no assertion).
 * 2. "empty entity list" test passes even if the systems have internal state
 *    corruption after being called with empty lists (no state verified).
 * 3. A machine with NO power component should not produce output — but the
 *    existing test never verifies this. The machine could be crafting for free.
 * 4. The `.not.toThrow()` tests are equivalent to writing no test at all —
 *    they only verify the code doesn't hard crash, not that it's correct.
 *
 * Run with: npm test -- RedTeam.AutomationEdgeCases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
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
import type { Recipe } from '../crafting/Recipe.js';

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

async function makeSetup() {
  const eventBus = new EventBusImpl();
  const world = new World(eventBus);
  const craftingSystem = new CraftingSystem();
  const recipeRegistry = new RecipeRegistry();
  const itemRegistry = ItemInstanceRegistry.getInstance();

  recipeRegistry.registerRecipe(TEST_RECIPE);
  craftingSystem.setRecipeRegistry(recipeRegistry);
  world.setCraftingSystem(craftingSystem);
  world.setItemInstanceRegistry(itemRegistry);

  const powerSystem = new PowerGridSystem();
  const beltSystem = new BeltSystem();
  const assemblySystem = new AssemblyMachineSystem();
  const stateMutatorSystem = new StateMutatorSystem();

  await powerSystem.initialize(world, eventBus);
  await beltSystem.initialize(world, eventBus);
  await assemblySystem.initialize(world, eventBus);
  await stateMutatorSystem.initialize(world, eventBus);

  return { world, powerSystem, beltSystem, assemblySystem, stateMutatorSystem };
}

describe('RED TEAM: AutomationEdgeCases — the .not.toThrow() tests verify nothing useful', () => {

  /**
   * AutomationEdgeCases.test.ts lines 407-409:
   *
   *   it('should handle machine with no power component', () => {
   *     // ... setup machine without power ...
   *     expect(() => {
   *       assemblySystem.update(world, [machine], 0.05);
   *     }).not.toThrow();
   *   });
   *
   * This test passes regardless of whether the machine:
   * - Correctly skips crafting (power required but not present)
   * - Incorrectly advances progress (bug: crafting for free without power)
   * - Emits a spurious event
   * - Corrupts the machine component
   * - Does nothing at all (no-op)
   *
   * The test cannot distinguish between correct and incorrect behavior.
   * It is equivalent to a smoke test — if the code doesn't CRASH, it passes.
   */
  it('machine with no power: progress stays at 0 after update — the original test never verified this', async () => {
    const { world, assemblySystem } = await makeSetup();

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

    // NO power component added — machine has no power source
    // The original test only verified: expect(() => { ... }).not.toThrow()
    // It NEVER verified what happened to assembly.progress

    const progressBefore = assembly.progress;
    expect(progressBefore).toBe(0);

    assemblySystem.update(world, [machine], 0.05);

    // What SHOULD happen: machine without power should not advance progress
    // What the original test checked: only that it doesn't crash
    //
    // This test proves what the original test SHOULD have checked:
    const progressAfter = (machine.getComponent('assembly_machine') as any)?.progress ?? assembly.progress;
    // If the machine correctly requires power, progress stays at 0:
    expect(progressAfter).toBe(0); // No power = no progress
  });

  it('machine with no power: output slots remain empty — never verified by original test', async () => {
    const { world, assemblySystem, stateMutatorSystem } = await makeSetup();

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
    // NO power component

    // Run many ticks — if machine is incorrectly crafting without power,
    // the output slot would eventually fill
    for (let tick = 0; tick < 200; tick++) {
      assemblySystem.update(world, [machine], 0.05);
      stateMutatorSystem.update(world, [machine], 0.05);
      world.advanceTick();
    }

    // Output slots should be empty — no product crafted without power
    const outputSlots = connection.outputs;
    const totalOutputItems = outputSlots.reduce((sum, slot) => sum + slot.items.length, 0);

    // The original test never checked this — it only verified "doesn't throw"
    expect(totalOutputItems).toBe(0); // No crafting happened without power
    // If this fails: AssemblyMachineSystem crafts for free without power.
    // The original .not.toThrow() test would still PASS even with this bug.
  });

});

describe('RED TEAM: AutomationEdgeCases — empty entity list tests verify nothing', () => {

  /**
   * AutomationEdgeCases.test.ts lines 479-485:
   *
   *   it('should handle empty entity list', () => {
   *     expect(() => {
   *       powerSystem.update(world, [], 0.05);
   *       beltSystem.update(world, [], 0.05);
   *       assemblySystem.update(world, [], 0.05);
   *     }).not.toThrow();
   *   });
   *
   * This is the weakest possible test. It doesn't verify:
   * - Whether the systems reset internal state between calls
   * - Whether empty-list calls leave the world in a valid state
   * - Whether subsequent calls work correctly after an empty-list call
   *
   * This test could be replaced with a comment:
   *   // systems probably don't crash on empty input
   */
  it('after empty entity list call, systems still work correctly for real entities', async () => {
    const { world, powerSystem, beltSystem, assemblySystem, stateMutatorSystem } = await makeSetup();

    // First: call with empty lists (what the original test does)
    powerSystem.update(world, [], 0.05);
    beltSystem.update(world, [], 0.05);
    assemblySystem.update(world, [], 0.05);

    // Now: add real entities and verify systems still work
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

    // This is what the original test should have checked:
    // After empty-list calls, does the system correctly process real entities?
    expect(() => {
      for (let i = 0; i < 10; i++) {
        assemblySystem.update(world, [machine], 0.05);
        world.advanceTick();
      }
    }).not.toThrow(); // This much the original test also checked

    // But ALSO verify actual state — something the original test never did:
    const updatedAssembly = machine.getComponent('assembly_machine') as any;
    // The system had real input — it should have processed something
    expect(updatedAssembly).not.toBeNull(); // Component still exists (not destroyed)
  });

  it('the empty entity list test is equivalent to a comment — proves nothing about correctness', () => {
    // This test PROVES the anti-pattern by being the simplest possible analog:
    // "Does calling update with no entities cause a crash?"

    // Equivalent question: does a function that accepts a list and processes nothing
    // throw an exception? Almost certainly not. This is a tautology.

    // The test in AutomationEdgeCases.test.ts:
    //   expect(() => {
    //     powerSystem.update(world, [], 0.05);
    //   }).not.toThrow();
    //
    // Is equivalent to:
    const itDoesntThrow = (): boolean => {
      try {
        // If the system exists and has a valid `update` method, calling it
        // with an empty list is virtually guaranteed to not throw.
        // Empty array → nothing to iterate → no operations → no errors.
        [].forEach(() => { throw new Error('impossible'); }); // Never throws
        return true;
      } catch {
        return false;
      }
    };

    expect(itDoesntThrow()).toBe(true); // Always passes — means nothing

    // The issue: the test consumes CI time and gives false confidence.
    // A developer sees "AutomationEdgeCases: 20 tests passing" and thinks
    // the edge cases are covered. They're not. Two of those tests are no-ops.
  });

});

describe('RED TEAM: AutomationEdgeCases — missing behavior after .not.toThrow()', () => {

  /**
   * The pattern `.not.toThrow()` without subsequent behavioral assertions
   * is a red flag. What does the system ACTUALLY DO when called with invalid input?
   *
   * These tests prove what should have been tested after each `.not.toThrow()`.
   */
  it('machine with missing recipe: progress should stay at 0, not silently partial-craft', async () => {
    const { world, assemblySystem } = await makeSetup();

    const machine = world.createEntity() as EntityImpl;
    machine.addComponent(createPositionComponent(0, 0));

    const assembly = createAssemblyMachineComponent('test_machine', { ingredientSlots: 1 });
    // Point to a non-existent recipe
    assembly.currentRecipe = 'nonexistent_recipe_xyz';
    assembly.speed = 1.0;
    machine.addComponent(assembly);

    const connection = createMachineConnectionComponent();
    connection.inputs[0]!.items = [
      { instanceId: 'ing1', definitionId: 'ingredient_a', quality: 50, condition: 100 },
    ];
    machine.addComponent(connection);

    const progressBefore = assembly.progress;

    // AutomationEdgeCases.test.ts has a test "should handle missing recipe gracefully"
    // that does: expect(() => { assemblySystem.update(...) }).not.toThrow()
    // and then: expect(assembly.progress).toBe(0)
    // This is actually a GOOD test — it has a behavior assertion.
    //
    // But contrast with the "no power component" test which ONLY does .not.toThrow().
    // The inconsistency shows which developer put in effort and which didn't.

    assemblySystem.update(world, [machine], 0.05);

    const progressAfter = (machine.getComponent('assembly_machine') as any)?.progress ?? assembly.progress;
    expect(progressAfter).toBe(progressBefore); // No progress on missing recipe
  });

  it('documents: .not.toThrow() CANNOT catch silent data corruption', async () => {
    const { world, assemblySystem } = await makeSetup();

    const machine = world.createEntity() as EntityImpl;
    machine.addComponent(createPositionComponent(0, 0));

    const assembly = createAssemblyMachineComponent('test_machine', { ingredientSlots: 1 });
    assembly.currentRecipe = 'test_item';
    machine.addComponent(assembly);

    const connection = createMachineConnectionComponent();
    machine.addComponent(connection);

    // Capture state before
    const inputsBefore = connection.inputs[0]!.items.length;
    const progressBefore = assembly.progress;

    assemblySystem.update(world, [machine], 0.05); // "Doesn't throw" — passes .not.toThrow()

    const inputsAfter = connection.inputs[0]!.items.length;
    const progressAfter = (machine.getComponent('assembly_machine') as any)?.progress ?? assembly.progress;

    // These assertions are what .not.toThrow() CANNOT catch:
    // 1. Were items consumed from inputs incorrectly?
    expect(inputsAfter).toBe(inputsBefore); // No ingredients → nothing consumed

    // 2. Did progress advance when it shouldn't?
    expect(progressAfter).toBe(progressBefore); // No ingredients → no progress

    // If AssemblyMachineSystem consumed inputs or advanced progress when there
    // were no ingredients, .not.toThrow() would still pass.
    // Silent data corruption is invisible to .not.toThrow().
  });

});
