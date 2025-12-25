import type { ActionHandler } from './ActionHandler.js';
import type { Action, ActionResult, ValidationResult } from './Action.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { PlantComponent } from '../components/PlantComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import { addToInventory, createSeedItemId } from '../components/InventoryComponent.js';
import { calculateSeedYield } from '../genetics/PlantGenetics.js';
import { FARMING_CONFIG } from '../constants/GameBalance.js';
import { EntityImpl } from '../ecs/Entity.js';

/**
 * Handler for the harvest action.
 *
 * Allows agents to harvest cultivated plants, collecting both fruit/produce
 * and seeds from mature or seeding stage plants.
 *
 * Requirements (from farming-system/spec.md lines 296-343):
 * - Plant must be at mature or seeding stage
 * - Agent must be adjacent to plant (distance <= √2)
 * - Harvests both fruit/produce AND seeds
 * - Seed yield based on plant health, stage, and agent skill
 * - Seeding stage gives 1.5x more seeds than mature stage
 * - Seeds inherit genetics from parent plant
 * - Plant is removed after successful harvest
 *
 * CLAUDE.md Compliance:
 * - No silent fallbacks - all validation errors return clear failure reasons
 * - Component validation is strict (throws if missing required components)
 * - All plant/agent validation delegated to appropriate checks
 */
export class HarvestActionHandler implements ActionHandler {
  public readonly type = 'harvest' as const;
  public readonly description = 'Harvest a cultivated plant for fruit and seeds';
  public readonly interruptible = true;

  /**
   * Calculate harvesting duration in ticks.
   *
   * Base duration: 8 seconds = 160 ticks (at 20 TPS)
   * Harvesting takes longer than gathering seeds.
   */
  getDuration(_action: Action, _world: World): number {
    return 160; // 8 seconds at 20 TPS
  }

  /**
   * Validate that the harvest action can be performed.
   *
   * Checks:
   * 1. Action has targetId (plant entity)
   * 2. Actor entity exists
   * 3. Actor has position and inventory components
   * 4. Target plant entity exists
   * 5. Plant has PlantComponent
   * 6. Plant is at valid stage (mature/seeding)
   * 7. Actor is adjacent to plant (distance <= √2)
   */
  validate(action: Action, world: World): ValidationResult {
    // Check target plant ID exists
    if (!action.targetId) {
      return {
        valid: false,
        reason: 'harvest action requires targetId (plant entity)',
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

    // Check target plant exists
    const plantEntity = world.getEntity(action.targetId);
    if (!plantEntity) {
      return {
        valid: false,
        reason: `Plant entity ${action.targetId} does not exist`,
      };
    }

    // Check plant has PlantComponent
    const plant = plantEntity.components.get('plant') as PlantComponent | undefined;
    if (!plant) {
      return {
        valid: false,
        reason: `Entity ${action.targetId} has no plant component`,
      };
    }

    // Check plant stage is valid for harvesting
    const validStages = ['mature', 'seeding'];
    if (!validStages.includes(plant.stage)) {
      return {
        valid: false,
        reason: `Cannot harvest plant at stage "${plant.stage}". Valid stages: ${validStages.join(', ')}`,
      };
    }

    // Check plant has position
    const plantPos = plantEntity.components.get('position') as PositionComponent | undefined;
    if (!plantPos) {
      return {
        valid: false,
        reason: `Plant entity ${action.targetId} has no position component`,
      };
    }

    // Check actor is adjacent to plant (distance <= √2)
    const dx = plantPos.x - actorPos.x;
    const dy = plantPos.y - actorPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const MAX_HARVEST_DISTANCE = Math.sqrt(2); // Allow diagonal harvesting

    if (distance > MAX_HARVEST_DISTANCE) {
      return {
        valid: false,
        reason: `Plant at (${plantPos.x},${plantPos.y}) is too far from actor at (${actorPos.x},${actorPos.y}). Distance: ${distance.toFixed(2)}, max: ${MAX_HARVEST_DISTANCE.toFixed(2)}`,
      };
    }

    // All checks passed
    return {
      valid: true,
    };
  }

  /**
   * Execute the harvest action.
   *
   * Process:
   * 1. Get plant and agent components
   * 2. Calculate fruit/produce yield
   * 3. Calculate seed yield based on plant health, stage, and agent skill
   * 4. Add fruit to agent inventory
   * 5. Add seeds to agent inventory
   * 6. Remove plant entity from world
   * 7. Emit seed:harvested and harvest:completed events
   */
  execute(action: Action, world: World): ActionResult {
    if (!action.targetId) {
      return {
        success: false,
        reason: 'harvest action requires targetId',
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

    // Get plant entity
    const plantEntity = world.getEntity(action.targetId);
    if (!plantEntity) {
      return {
        success: false,
        reason: `Plant entity ${action.targetId} does not exist`,
        effects: [],
        events: [],
      };
    }

    // Get components
    const plant = plantEntity.components.get('plant') as PlantComponent;
    const inventory = actor.components.get('inventory') as InventoryComponent;

    if (!plant) {
      return {
        success: false,
        reason: `Entity ${action.targetId} has no plant component`,
        effects: [],
        events: [],
      };
    }

    if (!inventory) {
      return {
        success: false,
        reason: `Actor ${action.actorId} has no inventory component`,
        effects: [],
        events: [],
      };
    }

    // Get agent farming skill (use default since skill system not yet implemented)
    const farmingSkill = FARMING_CONFIG.DEFAULT_FARMING_SKILL;

    // Calculate fruit yield (use fruitCount if available, otherwise base on health)
    const fruitYield = plant.fruitCount > 0
      ? plant.fruitCount
      : Math.floor((plant.health / 100) * 3); // 0-3 fruit based on health

    // Calculate seed yield based on formula from spec
    // baseYield * (health/100) * stageMod * skillMod
    // Seeding stage gives 1.5x more seeds (per spec lines 310-316)
    const baseSeedsPerPlant = 20; // Base yield for harvesting (more than gathering)
    const seedYield = calculateSeedYield(plant, baseSeedsPerPlant, farmingSkill);

    const seedItemId = createSeedItemId(plant.speciesId);
    const events = [];
    let fruitsAdded = 0;
    let seedsAdded = 0;

    try {
      // Add fruit to inventory (if any)
      if (fruitYield > 0) {
        const { inventory: inventoryAfterFruit, amountAdded: fruitsAddedCount } = addToInventory(
          inventory,
          'food', // Generic food resource
          fruitYield
        );
        fruitsAdded = fruitsAddedCount;
        (actor as EntityImpl).updateComponent<InventoryComponent>('inventory', () => inventoryAfterFruit);

        // Update inventory reference for seed addition
        const currentInventory = actor.components.get('inventory') as InventoryComponent;

        // Add seeds to inventory
        if (seedYield > 0) {
          const { inventory: inventoryAfterSeeds, amountAdded: seedsAddedCount } = addToInventory(
            currentInventory,
            seedItemId,
            seedYield
          );
          seedsAdded = seedsAddedCount;
          (actor as EntityImpl).updateComponent<InventoryComponent>('inventory', () => inventoryAfterSeeds);
        }
      } else {
        // No fruit, just add seeds
        if (seedYield > 0) {
          const { inventory: inventoryAfterSeeds, amountAdded: seedsAddedCount } = addToInventory(
            inventory,
            seedItemId,
            seedYield
          );
          seedsAdded = seedsAddedCount;
          (actor as EntityImpl).updateComponent<InventoryComponent>('inventory', () => inventoryAfterSeeds);
        }
      }

      // Emit seed:harvested event
      if (seedsAdded > 0) {
        events.push({
          type: 'seed:harvested',
          source: 'harvest-action-handler',
          data: {
            actionId: action.id,
            actorId: action.actorId,
            plantId: action.targetId,
            speciesId: plant.speciesId,
            seedsHarvested: seedsAdded,
            farmingSkill,
            plantHealth: plant.health,
            plantStage: plant.stage,
            generation: plant.generation,
          },
        });
      }

      // Emit harvest:completed event
      events.push({
        type: 'harvest:completed',
        source: 'harvest-action-handler',
        data: {
          actionId: action.id,
          actorId: action.actorId,
          plantId: action.targetId,
          speciesId: plant.speciesId,
          fruitsHarvested: fruitsAdded,
          seedsHarvested: seedsAdded,
        },
      });

      // Remove plant entity from world (harvest complete)
      (world as WorldMutator).destroyEntity(action.targetId, 'harvested');

      return {
        success: true,
        reason: `Harvested ${fruitsAdded} fruit and ${seedsAdded} ${plant.speciesId} seeds`,
        effects: [],
        events,
      };
    } catch (error: any) {
      // Inventory full or other error
      return {
        success: false,
        reason: error.message || 'Failed to add harvest to inventory',
        effects: [],
        events: [],
      };
    }
  }

  /**
   * Called if the harvest action is interrupted.
   *
   * For harvesting, interruption doesn't require cleanup.
   * Inventory and plant are only modified in execute(), so interrupting
   * before completion leaves everything unchanged.
   */
  onInterrupt?(_action: Action, _world: World, _reason: string): [] {
    // No cleanup needed - inventory and world only modified on successful completion
    return [];
  }
}
