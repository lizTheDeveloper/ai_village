import type { ActionHandler } from './ActionHandler.js';
import type { Action, ActionResult, ValidationResult } from './Action.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { PlantComponent } from '../components/PlantComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import { addToInventory, addToInventoryWithQuality, createSeedItemId } from '../components/InventoryComponent.js';
import type { SkillsComponent } from '../components/SkillsComponent.js';
import { getEfficiencyBonus } from '../components/SkillsComponent.js';
import { calculateSeedYield } from '../genetics/PlantGenetics.js';
import { calculateHarvestQuality } from '../items/ItemQuality.js';
import type { GameEvent } from '../events/GameEvent.js';
import type { GameEventMap } from '../events/EventMap.js';
import { ComponentType } from '../types/ComponentType.js';
import {  HARVEST_DURATION_BASE,
  BASE_SEED_YIELD_HARVEST,
  BASE_FRUIT_YIELD,
  SKILL_LEVEL_HARVEST_THRESHOLD,
} from '../constants/index.js';

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
 *
 * Harvest behavior (controlled by plant.harvestDestroysPlant):
 * - If true (default): Plant is destroyed after harvest (carrots, wheat)
 * - If false: Plant resets to harvestResetStage and regrows (berry bushes, fruit trees)
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
   *
   * Modified by farming skill level:
   * - Level 0: 0% speed bonus
   * - Level 5: 25% speed bonus (Master farmer)
   */
  getDuration(action: Action, world: World): number {
    const baseTicks = HARVEST_DURATION_BASE; // 8 seconds at 20 TPS

    // Apply skill efficiency bonus
    const actor = world.getEntity(action.actorId);
    if (actor) {
      const skillsComp = actor.getComponent<SkillsComponent>(ComponentType.Skills);
      if (skillsComp) {
        const farmingLevel = skillsComp.levels.farming;
        const skillBonus = getEfficiencyBonus(farmingLevel); // 0-25%
        const speedMultiplier = 1 - (skillBonus / 100);
        return Math.max(1, Math.round(baseTicks * speedMultiplier));
      }
    }

    return baseTicks;
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
    const actorPos = actor.getComponent<PositionComponent>(ComponentType.Position);
    if (!actorPos) {
      return {
        valid: false,
        reason: `Actor ${action.actorId} has no position component`,
      };
    }

    // Check actor has inventory
    const inventory = actor.getComponent<InventoryComponent>(ComponentType.Inventory);
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
    const plant = plantEntity.getComponent<PlantComponent>(ComponentType.Plant);
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
    const plantPos = plantEntity.getComponent<PositionComponent>(ComponentType.Position);
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
    const plant = plantEntity.getComponent<PlantComponent>(ComponentType.Plant);
    const inventory = actor.getComponent<InventoryComponent>(ComponentType.Inventory);
    const plantPos = plantEntity.getComponent<PositionComponent>(ComponentType.Position);

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

    if (!plantPos) {
      return {
        success: false,
        reason: `Plant entity ${action.targetId} has no position component`,
        effects: [],
        events: [],
      };
    }

    // Get agent farming skill from skills component
    const skillsComp = actor.getComponent<SkillsComponent>(ComponentType.Skills);
    const farmingLevel = skillsComp?.levels.farming ?? 0;
    // Convert skill level (0-5) to skill percentage (0-100)
    const farmingSkill = (farmingLevel / SKILL_LEVEL_HARVEST_THRESHOLD) * 100;

    // Calculate fruit yield (use fruitCount if available, otherwise base on health)
    // REQUIREMENT: Must yield at least 1 whole fruit - no fractional harvests
    let fruitYield: number;
    if (plant.fruitCount > 0) {
      // Use existing fruit count (always a whole number)
      fruitYield = plant.fruitCount;
    } else {
      // Calculate based on health: 0-3 fruit, but must be at least 1 to harvest
      fruitYield = Math.floor((plant.health / 100) * BASE_FRUIT_YIELD);
    }
    // Ensure we always get at least 1 fruit from a successful harvest (if plant has any potential)
    if (fruitYield === 0 && plant.health > 0) {
      fruitYield = 1;
    }

    // Calculate seed yield based on formula from spec
    // baseYield * (health/100) * stageMod * skillMod
    // Seeding stage gives 1.5x more seeds (per spec lines 310-316)
    const seedYield = calculateSeedYield(plant, BASE_SEED_YIELD_HARVEST, farmingSkill);

    // Calculate quality for harvested crops (Phase 10)
    const plantMaturity = plant.stage === 'mature' || plant.stage === 'seeding';
    const harvestQuality = calculateHarvestQuality(farmingLevel, plant.health, plantMaturity);

    const seedItemId = createSeedItemId(plant.speciesId);
    const events: Array<Omit<GameEvent<keyof GameEventMap>, 'tick' | 'timestamp'>> = [];
    let fruitsAdded = 0;
    let seedsAdded = 0;

    try {
      // Use WorldMutator interface to update components
      const worldMutator = world as WorldMutator;

      // Add fruit to inventory WITH QUALITY (if any)
      if (fruitYield > 0) {
        const { inventory: inventoryAfterFruit, amountAdded: fruitsAddedCount } = addToInventoryWithQuality(
          inventory,
          'food', // Generic food resource
          fruitYield,
          harvestQuality
        );
        fruitsAdded = fruitsAddedCount;
        worldMutator.updateComponent<InventoryComponent>(action.actorId, ComponentType.Inventory, () => inventoryAfterFruit);

        // Add seeds to inventory (seeds don't have quality - use regular addToInventory)
        if (seedYield > 0) {
          // Update inventory reference after fruit addition
          const currentInventory = actor.getComponent<InventoryComponent>(ComponentType.Inventory);
          if (!currentInventory) {
            throw new Error(`Inventory component missing after fruit addition for actor ${action.actorId}`);
          }

          const { inventory: inventoryAfterSeeds, amountAdded: seedsAddedCount } = addToInventory(
            currentInventory,
            seedItemId,
            seedYield
          );
          seedsAdded = seedsAddedCount;
          worldMutator.updateComponent<InventoryComponent>(action.actorId, ComponentType.Inventory, () => inventoryAfterSeeds);
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
          worldMutator.updateComponent<InventoryComponent>(action.actorId, ComponentType.Inventory, () => inventoryAfterSeeds);
        }
      }

      // Emit seed:harvested event
      if (seedsAdded > 0) {
        events.push({
          type: 'seed:harvested' as const,
          source: 'harvest-action-handler',
          data: {
            agentId: action.actorId,
            plantId: action.targetId,
            speciesId: plant.speciesId,
            seedCount: seedsAdded,
            farmingSkill,
            plantHealth: plant.health,
            plantStage: plant.stage,
            generation: plant.generation,
            position: { x: plantPos.x, y: plantPos.y },
            actionId: action.id,
          },
        });
      }

      // Emit harvest:completed event
      const harvestedItems: Array<{ itemId: string; amount: number }> = [];
      if (fruitsAdded > 0) {
        harvestedItems.push({ itemId: 'food', amount: fruitsAdded });
      }
      if (seedsAdded > 0) {
        harvestedItems.push({ itemId: `seed:${plant.speciesId}`, amount: seedsAdded });
      }

      events.push({
        type: 'harvest:completed' as const,
        source: 'harvest-action-handler',
        data: {
          agentId: action.actorId,
          position: { x: plantPos.x, y: plantPos.y },
          harvested: harvestedItems,
        },
      });

      // Check if harvest destroys the plant or allows regrowth
      if (plant.harvestDestroysPlant) {
        // Destructive harvest (carrots, wheat, etc.) - remove plant from world
        worldMutator.destroyEntity(action.targetId, 'harvested');
      } else {
        // Non-destructive harvest (berry bushes, fruit trees) - reset plant to regrow
        worldMutator.updateComponent<PlantComponent>(action.targetId, ComponentType.Plant, (p) => {
          p.stage = plant.harvestResetStage;
          p.stageProgress = 0;
          p.fruitCount = 0;  // Reset fruit count, will regrow
          // Keep health, genetics, etc. - plant continues living
          return p;
        });
      }

      const destroyedText = plant.harvestDestroysPlant ? '' : ' (plant will regrow)';
      return {
        success: true,
        reason: `Harvested ${fruitsAdded} fruit and ${seedsAdded} ${plant.speciesId} seeds${destroyedText}`,
        effects: [],
        events,
      };
    } catch (error) {
      // Inventory full or other error
      const errorMessage = error instanceof Error ? error.message : 'Failed to add harvest to inventory';
      return {
        success: false,
        reason: errorMessage,
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
