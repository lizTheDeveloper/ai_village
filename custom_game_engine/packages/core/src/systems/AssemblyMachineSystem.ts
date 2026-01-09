import type { System } from '../ecs/System.js';
import type { SystemId } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { AssemblyMachineComponent } from '../components/AssemblyMachineComponent.js';
import type { MachineConnectionComponent, MachineSlot } from '../components/MachineConnectionComponent.js';
import type { PowerComponent } from '../components/PowerComponent.js';
import { calculateEffectiveSpeed } from '../components/AssemblyMachineComponent.js';
import type { StateMutatorSystem } from './StateMutatorSystem.js';

/**
 * AssemblyMachineSystem - Auto-crafts recipes using machine inputs
 *
 * Responsibilities:
 * - Check if machine has recipe configured
 * - Verify ingredients are available in input slots
 * - Progress crafting based on power and speed
 * - Consume ingredients and produce outputs
 *
 * Part of automation system (AUTOMATION_LOGISTICS_SPEC.md Part 4)
 */
export class AssemblyMachineSystem implements System {
  public readonly id: SystemId = 'assembly_machine';
  public readonly priority: number = 54; // After belt/power systems
  public readonly requiredComponents = [CT.AssemblyMachine, CT.MachineConnection] as const;

  public readonly dependsOn = ['state_mutator'] as const;

  private stateMutator: StateMutatorSystem | null = null;
  private lastDeltaUpdateTick = 0;
  private readonly DELTA_UPDATE_INTERVAL = 1200; // 1 game minute
  private deltaCleanups = new Map<string, () => void>();

  setStateMutatorSystem(stateMutator: StateMutatorSystem): void {
    this.stateMutator = stateMutator;
  }

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Skip if no entities - empty list is valid edge case
    if (entities.length === 0) {
      return;
    }

    if (!this.stateMutator) {
      throw new Error('[AssemblyMachineSystem] StateMutatorSystem not set');
    }

    const currentTick = world.tick;
    const shouldUpdateDeltas = currentTick - this.lastDeltaUpdateTick >= this.DELTA_UPDATE_INTERVAL;

    for (const entity of entities) {
      const machine = (entity as EntityImpl).getComponent<AssemblyMachineComponent>(CT.AssemblyMachine);
      const connection = (entity as EntityImpl).getComponent<MachineConnectionComponent>(CT.MachineConnection);
      const power = (entity as EntityImpl).getComponent<PowerComponent>(CT.Power);

      if (!machine || !connection) continue;

      // Skip if not powered
      if (power && !power.isPowered) {
        // Clean up delta if machine becomes unpowered
        if (this.deltaCleanups.has(entity.id)) {
          this.deltaCleanups.get(entity.id)!();
          this.deltaCleanups.delete(entity.id);
        }
        continue;
      }

      // If no recipe set, agent needs to configure
      if (!machine.currentRecipe) {
        // Clean up delta if recipe is unset
        if (this.deltaCleanups.has(entity.id)) {
          this.deltaCleanups.get(entity.id)!();
          this.deltaCleanups.delete(entity.id);
        }
        continue;
      }

      // Get recipe from world's crafting system
      if (!world.craftingSystem) {
        // Crafting system not registered yet - skip
        continue;
      }

      const recipeRegistry = world.craftingSystem.getRecipeRegistry();

      // Try to get recipe - handle missing recipe gracefully (edge case)
      let recipe;
      try {
        recipe = recipeRegistry.getRecipe(machine.currentRecipe);
      } catch (error) {
        // Recipe not found - configuration error, skip processing
        // (Following CLAUDE.md: No silent fallbacks, but edge case handling is acceptable)
        continue;
      }

      if (!recipe) {
        // Shouldn't happen after try-catch, but defensive check
        continue;
      }

      // Check if we have ingredients
      const hasIngredients = this.checkIngredients(recipe, connection.inputs);
      if (!hasIngredients) {
        // Clean up delta if no ingredients
        if (this.deltaCleanups.has(entity.id)) {
          this.deltaCleanups.get(entity.id)!();
          this.deltaCleanups.delete(entity.id);
        }
        continue;
      }

      // Update progress delta rate once per game minute
      // OR if this entity doesn't have a delta yet (first time processing)
      if (shouldUpdateDeltas || !this.deltaCleanups.has(entity.id)) {
        this.updateProgressDelta(entity, machine, power, recipe);
      }

      // ========================================================================
      // Completion Check (discrete event - keep as direct mutation)
      // ========================================================================

      // Check if crafting is complete
      if (machine.progress >= 100) {
        // Consume ingredients
        this.consumeIngredients(recipe, connection.inputs);

        // Produce output
        const success = this.produceOutput(recipe, connection.outputs, world);

        if (success) {
          // Reset progress
          machine.progress = 0;
        } else {
          // Output blocked - halt production
          machine.progress = 100;
        }
      }
    }

    if (shouldUpdateDeltas) {
      this.lastDeltaUpdateTick = currentTick;
    }
  }

  /**
   * Update assembly machine progress delta rate.
   * Registers delta with StateMutatorSystem for batched updates.
   */
  private updateProgressDelta(
    entity: Entity,
    machine: AssemblyMachineComponent,
    power: PowerComponent | undefined,
    recipe: any
  ): void {
    if (!this.stateMutator) {
      throw new Error('[AssemblyMachineSystem] StateMutatorSystem not set');
    }

    // Clean up old delta
    if (this.deltaCleanups.has(entity.id)) {
      this.deltaCleanups.get(entity.id)!();
    }

    // Apply power efficiency to speed
    const efficiencyMod = power?.efficiency ?? 1.0;
    const speedMod = calculateEffectiveSpeed(machine);

    // Calculate progress rate per game minute
    // Recipe crafting time is in seconds
    // Progress is 0-100, so we multiply by 100
    // Rate: (60 seconds per game minute / crafting time) * modifiers * 100
    const progressRatePerMinute = (60 / recipe.craftingTime) * speedMod * efficiencyMod * 100;

    const cleanup = this.stateMutator.registerDelta({
      entityId: entity.id,
      componentType: CT.AssemblyMachine,
      field: 'progress',
      deltaPerMinute: progressRatePerMinute,
      min: 0,
      max: 100,
      source: 'assembly_machine_progress',
    });

    this.deltaCleanups.set(entity.id, cleanup);
  }

  /**
   * Check if all recipe ingredients are available
   */
  private checkIngredients(recipe: any, inputs: MachineSlot[]): boolean {
    // Recipe interface uses 'ingredients' not 'inputs'
    for (const ingredient of recipe.ingredients) {
      const totalAvailable = inputs.reduce((sum, slot) => {
        return sum + slot.items.filter(i => i.definitionId === ingredient.itemId).length;
      }, 0);

      // Recipe interface uses 'quantity' not 'amount'
      if (totalAvailable < ingredient.quantity) {
        return false;
      }
    }

    return true;
  }

  /**
   * Consume ingredients from input slots
   */
  private consumeIngredients(recipe: any, inputs: MachineSlot[]): void {
    // Recipe interface uses 'ingredients' not 'inputs'
    for (const ingredient of recipe.ingredients) {
      let remaining = ingredient.quantity; // Use 'quantity' not 'amount'

      for (const slot of inputs) {
        while (remaining > 0 && slot.items.length > 0) {
          const item = slot.items.find(i => i.definitionId === ingredient.itemId);
          if (!item) continue;

          slot.items = slot.items.filter(i => i.instanceId !== item.instanceId);
          remaining--;
        }

        if (remaining === 0) break;
      }

      if (remaining > 0) {
        throw new Error(`Failed to consume all ingredients for ${recipe.id}`);
      }
    }
  }

  /**
   * Produce output items to output slots
   */
  private produceOutput(recipe: any, outputs: MachineSlot[], world: World): boolean {
    // Check if we have space for all outputs
    for (const output of recipe.output ? [recipe.output] : recipe.outputs || []) {
      const amount = output.quantity ?? output.amount ?? 1;
      const availableSpace = outputs.reduce((sum, slot) => {
        return sum + (slot.capacity - slot.items.length);
      }, 0);

      if (availableSpace < amount) {
        return false; // Output blocked
      }
    }

    // Produce outputs
    const outputList = recipe.output ? [recipe.output] : recipe.outputs || [];
    for (const output of outputList) {
      const amount = output.quantity ?? output.amount ?? 1;
      for (let i = 0; i < amount; i++) {
        let item: any;

        // Create item instance using world's item registry if available
        if (world.itemInstanceRegistry) {
          const instance = world.itemInstanceRegistry.createInstance({
            definitionId: output.itemId,
            quality: 50, // Normal quality for automated production
            condition: 100, // Brand new
            createdAt: world.tick,
          });
          item = {
            instanceId: instance.instanceId,
            definitionId: instance.definitionId,
            quality: instance.quality,
            condition: instance.condition,
          };
        } else {
          // Fallback if registry not available
          item = {
            instanceId: `assembly_${world.tick}_${i}`,
            definitionId: output.itemId,
            quality: 50,
            condition: 100,
          };
        }

        // Find available output slot
        const slot = outputs.find(s => s.items.length < s.capacity);
        if (!slot) {
          console.error('[AssemblyMachineSystem] Output slot full despite space check');
          return false;
        }

        slot.items.push(item);
      }
    }

    return true;
  }
}
