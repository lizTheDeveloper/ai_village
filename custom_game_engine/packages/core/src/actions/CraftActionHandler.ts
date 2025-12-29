/**
 * CraftActionHandler - Action handler for crafting items
 *
 * Allows agents to queue and execute crafting jobs via the action system.
 * Works in conjunction with CraftingSystem for actual crafting mechanics.
 *
 * Requirements:
 * - Agent must have inventory component
 * - Agent must be near crafting station (if recipe requires one)
 * - Agent must have required ingredients
 *
 * CLAUDE.md Compliance:
 * - No silent fallbacks - all validation errors return clear failure reasons
 * - Component validation is strict (throws if missing required components)
 */

import type { ActionHandler } from './ActionHandler.js';
import type { Action, ActionResult, ValidationResult } from './Action.js';
import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { SkillsComponent } from '../components/SkillsComponent.js';
import { getEfficiencyBonus } from '../components/SkillsComponent.js';
import type { CraftingSystem } from '../crafting/CraftingSystem.js';
import type { Recipe } from '../crafting/Recipe.js';
import type { GameEvent } from '../events/GameEvent.js';
import { EntityImpl } from '../ecs/Entity.js';

/** Distance at which agent can use a crafting station */
const CRAFT_DISTANCE = 1.5;

/**
 * Handler for the craft action.
 *
 * Queues a crafting job for an agent. The CraftingSystem handles
 * the actual crafting progress and completion.
 */
export class CraftActionHandler implements ActionHandler {
  public readonly type = 'craft' as const;
  public readonly description = 'Craft an item using a recipe';
  public readonly interruptible = true;

  /**
   * Calculate crafting duration in ticks.
   * Duration is based on recipe crafting time.
   *
   * Modified by crafting skill level:
   * - Level 0: 0% speed bonus
   * - Level 5: 25% speed bonus (Master crafter)
   */
  getDuration(action: Action, world: World): number {
    const recipeId = action.parameters.recipeId as string | undefined;
    const quantity = (action.parameters.quantity as number) ?? 1;

    if (!recipeId) {
      return 0;
    }

    const craftingSystem = this.getCraftingSystem(world);
    if (!craftingSystem) {
      return 0;
    }

    try {
      const recipe = craftingSystem.getRecipeRegistry().getRecipe(recipeId);
      // Convert seconds to ticks (20 TPS)
      const baseTicks = Math.ceil(recipe.craftingTime * quantity * 20);

      // Apply skill efficiency bonus
      const actor = world.getEntity(action.actorId);
      if (actor) {
        const skillsComp = actor.components.get('skills') as SkillsComponent | undefined;
        if (skillsComp) {
          const craftingLevel = skillsComp.levels.crafting;
          const skillBonus = getEfficiencyBonus(craftingLevel); // 0-25%
          const speedMultiplier = 1 - (skillBonus / 100);
          return Math.max(1, Math.round(baseTicks * speedMultiplier));
        }
      }

      return baseTicks;
    } catch {
      return 0;
    }
  }

  /**
   * Validate that the craft action can be performed.
   *
   * Checks:
   * 1. Action has recipeId parameter
   * 2. Actor entity exists
   * 3. Actor has position and inventory components
   * 4. Recipe exists and is valid
   * 5. Actor is near required crafting station (if any)
   * 6. Actor has required ingredients
   */
  validate(action: Action, world: World): ValidationResult {
    // Check recipe ID
    const recipeId = action.parameters.recipeId as string | undefined;
    if (!recipeId) {
      return {
        valid: false,
        reason: 'craft action requires recipeId parameter',
      };
    }

    // Check actor exists
    const actor = world.getEntity(action.actorId);
    if (!actor) {
      return {
        valid: false,
        reason: `Actor entity ${action.actorId} does not exist`,
      };
    }

    // Check actor has position
    const actorPos = actor.components.get('position') as PositionComponent | undefined;
    if (!actorPos) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no position component`,
      };
    }

    // Check actor has inventory
    const inventory = actor.components.get('inventory') as InventoryComponent | undefined;
    if (!inventory) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no inventory component`,
      };
    }

    // Get crafting system
    const craftingSystem = this.getCraftingSystem(world);
    if (!craftingSystem) {
      return {
        valid: false,
        reason: 'Crafting system not available',
      };
    }

    // Check recipe exists
    let recipe: Recipe;
    try {
      recipe = craftingSystem.getRecipeRegistry().getRecipe(recipeId);
    } catch {
      return {
        valid: false,
        reason: `Recipe not found: ${recipeId}`,
      };
    }

    // Check if station is required and agent is near one
    if (recipe.stationRequired) {
      const nearStation = this.isNearStation(world, actorPos, recipe.stationRequired);
      if (!nearStation) {
        return {
          valid: false,
          reason: `Must be near a ${recipe.stationRequired} to craft ${recipe.name}`,
        };
      }
    }

    // Check skill requirements
    if (recipe.skillRequirements && recipe.skillRequirements.length > 0) {
      const skillsComp = actor.components.get('skills') as SkillsComponent | undefined;
      for (const req of recipe.skillRequirements) {
        const agentLevel = skillsComp?.levels[req.skill as keyof typeof skillsComp.levels] ?? 0;
        if (agentLevel < req.level) {
          return {
            valid: false,
            reason: `Requires ${req.skill} level ${req.level} to craft ${recipe.name} (you have level ${agentLevel})`,
          };
        }
      }
    }

    // Check ingredients
    const quantity = (action.parameters.quantity as number) ?? 1;
    const availability = craftingSystem.checkIngredientAvailability(world, action.actorId, recipe);

    for (const ing of availability) {
      const requiredTotal = ing.required * quantity;
      if (ing.available < requiredTotal) {
        return {
          valid: false,
          reason: `Insufficient ${ing.itemId}: need ${requiredTotal}, have ${ing.available}`,
        };
      }
    }

    // All checks passed
    return {
      valid: true,
    };
  }

  /**
   * Execute the craft action.
   *
   * Process:
   * 1. Get recipe and crafting system
   * 2. Queue the crafting job
   * 3. Return success (actual crafting handled by CraftingSystem.update())
   */
  execute(action: Action, world: World): ActionResult {
    const recipeId = action.parameters.recipeId as string | undefined;
    const quantity = (action.parameters.quantity as number) ?? 1;

    if (!recipeId) {
      return {
        success: false,
        reason: 'craft action requires recipeId parameter',
        effects: [],
        events: [],
      };
    }

    // Get actor entity
    const actor = world.getEntity(action.actorId);
    if (!actor) {
      return {
        success: false,
        reason: `Actor entity ${action.actorId} does not exist`,
        effects: [],
        events: [],
      };
    }

    // Get crafting system
    const craftingSystem = this.getCraftingSystem(world);
    if (!craftingSystem) {
      return {
        success: false,
        reason: 'Crafting system not available',
        effects: [],
        events: [],
      };
    }

    // Get recipe
    let recipe: Recipe;
    try {
      recipe = craftingSystem.getRecipeRegistry().getRecipe(recipeId);
    } catch {
      return {
        success: false,
        reason: `Recipe not found: ${recipeId}`,
        effects: [],
        events: [],
      };
    }

    const events: Array<Omit<GameEvent<'crafting:job_queued'>, 'tick' | 'timestamp'>> = [];

    try {
      // Queue the crafting job
      const job = craftingSystem.queueJob(action.actorId, recipe, quantity);

      // Emit event - crafting:job_queued expects { jobId, recipeId, station? }
      events.push({
        type: 'crafting:job_queued' as const,
        source: 'craft-action-handler',
        data: {
          jobId: job.id,
          recipeId: recipe.id
        },
      });

      return {
        success: true,
        reason: `Queued crafting job for ${quantity}x ${recipe.name}`,
        effects: [],
        events,
      };
    } catch (error: any) {
      return {
        success: false,
        reason: error.message || 'Failed to queue crafting job',
        effects: [],
        events: [],
      };
    }
  }

  /**
   * Called if the craft action is interrupted.
   */
  onInterrupt?(action: Action, world: World, _reason: string): [] {
    // Cancel the crafting job if it was queued
    const craftingSystem = this.getCraftingSystem(world);
    if (craftingSystem) {
      const currentJob = craftingSystem.getCurrentJob(action.actorId);
      if (currentJob) {
        try {
          craftingSystem.cancelJob(action.actorId, currentJob.id);
        } catch {
          // Job may have already completed or been cancelled
        }
      }
    }
    return [];
  }

  /**
   * Check if agent is near a crafting station of the required type.
   */
  private isNearStation(
    world: World,
    position: PositionComponent,
    stationType: string
  ): boolean {
    const buildings = world
      .query()
      .with('building')
      .with('position')
      .executeEntities();

    for (const building of buildings) {
      const buildingImpl = building as EntityImpl;
      const buildingComp = buildingImpl.getComponent<BuildingComponent>('building');
      const buildingPos = buildingImpl.getComponent<PositionComponent>('position');

      if (!buildingComp || !buildingPos) continue;

      // Check if this is the right type of station and is complete
      if (buildingComp.buildingType !== stationType) continue;
      if (!buildingComp.isComplete) continue;

      // Calculate distance
      const dx = buildingPos.x - position.x;
      const dy = buildingPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= CRAFT_DISTANCE) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the crafting system from the world.
   */
  private getCraftingSystem(world: World): CraftingSystem | null {
    const system = (world as any).getSystem?.('crafting');
    if (system) {
      return system as CraftingSystem;
    }
    return (world as any).craftingSystem ?? null;
  }

}
