/**
 * CraftBehavior - Agent crafting at stations
 *
 * Agent navigates to a crafting station (if required) and crafts items.
 * Handles:
 * - Finding appropriate crafting station for recipe
 * - Navigating to station
 * - Queuing crafting jobs
 * - Waiting for job completion
 * - Inventory full -> switch to deposit
 *
 * Part of the crafting system implementation.
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import type { CraftingSystem } from '../../crafting/CraftingSystem.js';
import type { Recipe } from '../../crafting/Recipe.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';

/** Distance at which agent can use a crafting station */
const CRAFT_DISTANCE = 1.5;

/** Maximum distance to search for crafting stations */
const MAX_STATION_SEARCH_DISTANCE = 30;

/**
 * State stored in agent.behaviorState for crafting
 */
interface CraftBehaviorState {
  /** Recipe ID to craft */
  recipeId?: string;
  /** Quantity to craft */
  quantity?: number;
  /** Target station entity ID (if recipe requires one) */
  targetStationId?: string;
  /** Whether we've started the crafting job */
  jobQueued?: boolean;
  /** Phase: 'find_station' | 'move_to_station' | 'crafting' | 'complete' */
  phase?: 'find_station' | 'move_to_station' | 'crafting' | 'complete';
}

/**
 * CraftBehavior - Navigate to station and craft items
 */
export class CraftBehavior extends BaseBehavior {
  readonly name = 'craft' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>('position');
    const inventory = entity.getComponent<InventoryComponent>('inventory');
    const agent = entity.getComponent<AgentComponent>('agent');

    if (!position || !agent) {
      return { complete: true, reason: 'Missing required components' };
    }

    // Disable steering so behavior controls movement
    this.disableSteering(entity);

    const state = agent.behaviorState as CraftBehaviorState;

    // Get the crafting system from world
    const craftingSystem = this.getCraftingSystem(world);
    if (!craftingSystem) {
      return { complete: true, reason: 'No crafting system available' };
    }

    // Get recipe
    const recipeId = state.recipeId;
    if (!recipeId) {
      return { complete: true, reason: 'No recipe specified in behaviorState.recipeId' };
    }

    let recipe: Recipe;
    try {
      recipe = craftingSystem.getRecipeRegistry().getRecipe(recipeId);
    } catch {
      return { complete: true, reason: `Recipe not found: ${recipeId}` };
    }

    const quantity = state.quantity ?? 1;
    const phase = state.phase ?? 'find_station';

    // Execute phase
    switch (phase) {
      case 'find_station':
        return this.findStation(entity, world, recipe, state);

      case 'move_to_station':
        return this.moveToStation(entity, world, state);

      case 'crafting':
        return this.doCrafting(entity, world, craftingSystem, recipe, quantity, state, inventory);

      case 'complete':
        this.switchTo(entity, 'idle', {});
        return { complete: true, reason: 'Crafting complete' };
    }
  }

  /**
   * Find an appropriate crafting station for the recipe.
   */
  private findStation(
    entity: EntityImpl,
    world: World,
    recipe: Recipe,
    _state: CraftBehaviorState
  ): BehaviorResult | void {
    // If no station required, go straight to crafting
    if (!recipe.stationRequired) {
      this.updateState(entity, { phase: 'crafting' });
      return;
    }

    const position = entity.getComponent<PositionComponent>('position')!;

    // Find nearby crafting station of the required type
    const station = this.findNearestStation(world, position, recipe.stationRequired);

    if (!station) {
      // No station found - can't craft
      return {
        complete: true,
        reason: `No ${recipe.stationRequired} station found nearby`
      };
    }

    // Found station, move to it
    this.updateState(entity, {
      targetStationId: station.entityId,
      phase: 'move_to_station'
    });
  }

  /**
   * Move to the target crafting station.
   */
  private moveToStation(
    entity: EntityImpl,
    world: World,
    state: CraftBehaviorState
  ): BehaviorResult | void {
    const stationId = state.targetStationId;
    if (!stationId) {
      // Lost target, restart
      this.updateState(entity, { phase: 'find_station' });
      return;
    }

    const stationEntity = world.getEntity(stationId);
    if (!stationEntity) {
      // Station no longer exists
      this.updateState(entity, { phase: 'find_station', targetStationId: undefined });
      return;
    }

    const stationPos = stationEntity.components.get('position') as PositionComponent | undefined;
    if (!stationPos) {
      this.updateState(entity, { phase: 'find_station', targetStationId: undefined });
      return;
    }

    // Move toward station
    const distance = this.moveToward(entity, { x: stationPos.x, y: stationPos.y }, {
      arrivalDistance: CRAFT_DISTANCE
    });

    // Check if we've arrived
    if (distance <= CRAFT_DISTANCE) {
      this.stopAllMovement(entity);
      this.updateState(entity, { phase: 'crafting' });
    }
  }

  /**
   * Perform the crafting action.
   */
  private doCrafting(
    entity: EntityImpl,
    world: World,
    craftingSystem: CraftingSystem,
    recipe: Recipe,
    quantity: number,
    state: CraftBehaviorState,
    inventory: InventoryComponent | undefined
  ): BehaviorResult | void {
    this.stopAllMovement(entity);

    // Check if we've already queued the job
    if (!state.jobQueued) {
      // Check ingredient availability
      if (inventory) {
        const availability = craftingSystem.checkIngredientAvailability(world, entity.id, recipe);
        const allAvailable = availability.every(a => a.status === 'AVAILABLE');

        if (!allAvailable) {
          // Missing ingredients
          const missing = availability
            .filter(a => a.status !== 'AVAILABLE')
            .map(a => `${a.itemId} (need ${a.required}, have ${a.available})`)
            .join(', ');
          return {
            complete: true,
            reason: `Missing ingredients: ${missing}`
          };
        }
      }

      // Queue the crafting job
      try {
        craftingSystem.queueJob(entity.id, recipe, quantity);
        this.updateState(entity, { jobQueued: true });

        // Emit event - crafting:job_queued expects { jobId, recipeId, station? }
        world.eventBus.emit({
          type: 'crafting:job_queued',
          source: 'craft-behavior',
          data: {
            jobId: `craft_${Date.now()}`,
            recipeId: recipe.id
          }
        });
      } catch (error) {
        return {
          complete: true,
          reason: `Failed to queue job: ${(error as Error).message}`
        };
      }
    }

    // Check job status
    const currentJob = craftingSystem.getCurrentJob(entity.id);

    if (!currentJob) {
      // Job completed or queue is empty
      this.updateState(entity, { phase: 'complete' });
      return { complete: true, reason: 'Crafting complete' };
    }

    // Still crafting, wait
    // Return without complete to continue next tick
  }

  /**
   * Find the nearest crafting station of a given type.
   */
  private findNearestStation(
    world: World,
    position: PositionComponent,
    stationType: string
  ): { entityId: string; position: PositionComponent } | null {
    const buildings = world
      .query()
      .with('building')
      .with('position')
      .executeEntities();

    let nearest: { entityId: string; position: PositionComponent } | null = null;
    let nearestDistance = Infinity;

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

      if (distance > MAX_STATION_SEARCH_DISTANCE) continue;

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = { entityId: building.id, position: buildingPos };
      }
    }

    return nearest;
  }

  /**
   * Get the crafting system from the world.
   */
  private getCraftingSystem(world: World): CraftingSystem | null {
    // The crafting system should be accessible via world property
    // This is set up when the game initializes systems
    return (world as any).craftingSystem ?? null;
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function craftBehavior(entity: EntityImpl, world: World): void {
  const behavior = new CraftBehavior();
  behavior.execute(entity, world);
}
