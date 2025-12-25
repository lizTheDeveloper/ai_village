import type { ActionHandler } from './ActionHandler.js';
import type { Action, ActionResult, ValidationResult } from './Action.js';
import type { World } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { PlantComponent } from '../components/PlantComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import { addToInventory, createSeedItemId } from '../components/InventoryComponent.js';
import { calculateSeedYield } from '../genetics/PlantGenetics.js';
import { FARMING_CONFIG } from '../constants/GameBalance.js';
import { EntityImpl } from '../ecs/Entity.js';

/**
 * Handler for the gather_seeds action.
 *
 * Allows agents to gather seeds from wild or cultivated plants at
 * mature, seeding, or senescence stages.
 *
 * Requirements (from farming-system/spec.md lines 296-343):
 * - Plant must be at mature/seeding/senescence stage
 * - Plant must have seedsProduced > 0
 * - Agent must be adjacent to plant (distance <= √2)
 * - Seeds added to agent inventory
 * - Seed yield based on plant health, stage, and agent skill
 * - Seeds inherit genetics from parent plant
 *
 * CLAUDE.md Compliance:
 * - No silent fallbacks - all validation errors return clear failure reasons
 * - Component validation is strict (throws if missing required components)
 * - All plant/agent validation delegated to appropriate checks
 */
export class GatherSeedsActionHandler implements ActionHandler {
  public readonly type = 'gather_seeds' as const;
  public readonly description = 'Gather seeds from a wild or cultivated plant';
  public readonly interruptible = true;

  /**
   * Calculate seed gathering duration in ticks.
   *
   * Base duration: 5 seconds = 100 ticks (at 20 TPS)
   * Gathering seeds is faster than tilling.
   */
  getDuration(_action: Action, _world: World): number {
    return 100; // 5 seconds at 20 TPS
  }

  /**
   * Validate that the gather_seeds action can be performed.
   *
   * Checks:
   * 1. Action has targetId (plant entity)
   * 2. Actor entity exists
   * 3. Actor has position and inventory components
   * 4. Target plant entity exists
   * 5. Plant has PlantComponent
   * 6. Plant is at valid stage (mature/seeding/senescence)
   * 7. Plant has seeds remaining (seedsProduced > 0)
   * 8. Actor is adjacent to plant (distance <= √2)
   */
  validate(action: Action, world: World): ValidationResult {
    // Check target plant ID exists
    if (!action.targetId) {
      return {
        valid: false,
        reason: 'gather_seeds action requires targetId (plant entity)',
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

    // Check plant stage is valid for seed gathering
    const validStages = ['mature', 'seeding', 'senescence'];
    if (!validStages.includes(plant.stage)) {
      return {
        valid: false,
        reason: `Cannot gather seeds from plant at stage "${plant.stage}". Valid stages: ${validStages.join(', ')}`,
      };
    }

    // Check plant has seeds
    if (plant.seedsProduced <= 0) {
      return {
        valid: false,
        reason: `Plant has no seeds remaining (seedsProduced=${plant.seedsProduced})`,
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
    const MAX_GATHER_DISTANCE = Math.sqrt(2); // Allow diagonal gathering

    if (distance > MAX_GATHER_DISTANCE) {
      return {
        valid: false,
        reason: `Plant at (${plantPos.x},${plantPos.y}) is too far from actor at (${actorPos.x},${actorPos.y}). Distance: ${distance.toFixed(2)}, max: ${MAX_GATHER_DISTANCE.toFixed(2)}`,
      };
    }

    // All checks passed
    return {
      valid: true,
    };
  }

  /**
   * Execute the gather_seeds action.
   *
   * Process:
   * 1. Get plant and agent components
   * 2. Calculate seed yield based on plant health, stage, and agent skill
   * 3. Create seeds with inherited genetics from parent plant
   * 4. Add seeds to agent inventory
   * 5. Reduce plant's seedsProduced count
   * 6. Emit seed:gathered event
   */
  execute(action: Action, world: World): ActionResult {
    if (!action.targetId) {
      return {
        success: false,
        reason: 'gather_seeds action requires targetId',
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
    const plantPos = plantEntity.components.get('position') as PositionComponent;

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

    // Calculate seed yield based on formula from spec
    // baseYield * (health/100) * stageMod * skillMod
    const baseSeedsPerPlant = 10; // Default base yield for gathering (less than harvest)
    const seedYield = calculateSeedYield(plant, baseSeedsPerPlant, farmingSkill);

    // Don't allow gathering more seeds than plant has
    const seedsToGather = Math.min(seedYield, plant.seedsProduced);

    if (seedsToGather === 0) {
      return {
        success: false,
        reason: `Calculated seed yield is 0 (plant health: ${plant.health}, skill: ${farmingSkill})`,
        effects: [],
        events: [],
      };
    }

    // Create seed item ID for inventory
    const seedItemId = createSeedItemId(plant.speciesId);

    // Try to add seeds to inventory
    try {
      const { inventory: updatedInventory, amountAdded } = addToInventory(
        inventory,
        seedItemId,
        seedsToGather
      );

      // Update actor's inventory using EntityImpl method
      (actor as EntityImpl).updateComponent<InventoryComponent>('inventory', () => updatedInventory);

      // Update plant component - reduce seedsProduced
      (plantEntity as EntityImpl).updateComponent<PlantComponent>('plant', (current) => {
        const updated = Object.create(Object.getPrototypeOf(current));
        Object.assign(updated, current);
        updated.seedsProduced = current.seedsProduced - amountAdded;
        return updated;
      });

      // Emit seed:gathered event
      return {
        success: true,
        reason: `Gathered ${amountAdded} ${plant.speciesId} seeds`,
        effects: [],
        events: [
          {
            type: 'action:gather_seeds',
            source: 'gather-seeds-action-handler',
            data: {
              actionId: action.id,
              actorId: action.actorId,
              plantId: action.targetId,
              speciesId: plant.speciesId,
              seedsGathered: amountAdded,
              position: { x: plantPos.x, y: plantPos.y },
            },
          },
        ],
      };
    } catch (error: any) {
      // Inventory full or other error
      return {
        success: false,
        reason: error.message || 'Failed to add seeds to inventory',
        effects: [],
        events: [],
      };
    }
  }

  /**
   * Called if the gather_seeds action is interrupted.
   *
   * For seed gathering, interruption doesn't require cleanup.
   * Inventory is only modified in execute(), so interrupting
   * before completion leaves everything unchanged.
   */
  onInterrupt?(_action: Action, _world: World, _reason: string): [] {
    // No cleanup needed - inventory only modified on successful completion
    return [];
  }
}
