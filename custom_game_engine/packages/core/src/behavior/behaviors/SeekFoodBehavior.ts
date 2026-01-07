/**
 * SeekFoodBehavior - Find and consume food to satisfy hunger
 *
 * This behavior:
 * 1. First checks if agent has food in inventory → eat it
 * 2. If no food in inventory BUT inventory is full → eat from nearby storage
 * 3. If no food in inventory → gather food from environment
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl, Entity } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import type { MovementComponent } from '../../components/MovementComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import { itemRegistry } from '../../items/index.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { eatFromStorage, eatFromPlant, type InteractionResult } from '../../services/InteractionAPI.js';
import { isEdibleSpecies } from '../../services/TargetingAPI.js';
import { HUNGER_THRESHOLD_SEEK_FOOD, HUNGER_RESTORED_DEFAULT } from '../../constants/index.js';
import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';

/** Default hunger restored if item not in registry */
const DEFAULT_HUNGER_RESTORED = HUNGER_RESTORED_DEFAULT;

/**
 * SeekFoodBehavior - Eat food from inventory or gather if none available
 */
export class SeekFoodBehavior extends BaseBehavior {
  readonly name = 'seek_food' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const agent = entity.getComponent<AgentComponent>(ComponentType.Agent);
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
    const needs = entity.getComponent<NeedsComponent>(ComponentType.Needs);

    // If no inventory or needs, can't eat - just wander
    if (!inventory || !needs || !agent) {
      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'Missing required components' };
    }

    // Check if agent has food in inventory
    const foodSlot = this.findFoodInInventory(inventory);

    if (foodSlot) {
      // Eat food from inventory
      this.eatFood(entity, world, foodSlot.slotIndex, foodSlot.itemId, needs);

      // Check if still hungry
      if (needs.hunger < HUNGER_THRESHOLD_SEEK_FOOD) {
        // Still hungry, continue seeking food
        return;
      } else {
        // Hunger satisfied, behavior complete
        this.switchTo(entity, 'wander', {});
        return { complete: true, reason: 'Hunger satisfied' };
      }
    }

    // No food in inventory - try eating directly from plants or storage
    // (Berries come from plants, not resource nodes, so we must try plants first)

    // First try eating from nearby plants (berry bushes, etc.)
    const plantResult = this.tryEatFromNearbyPlant(entity, world);
    if (plantResult?.success) {
      // Check if still hungry
      const updatedNeeds = entity.getComponent<NeedsComponent>(ComponentType.Needs);
      if (updatedNeeds && updatedNeeds.hunger >= HUNGER_THRESHOLD_SEEK_FOOD) {
        this.switchTo(entity, 'wander', {});
        return { complete: true, reason: 'Hunger satisfied from plant' };
      }
      // Still hungry, continue (will try again next tick)
      return;
    }

    // Then try eating from nearby storage
    const storageResult = this.tryEatFromNearbyStorage(entity, world);
    if (storageResult?.success) {
      // Check if still hungry
      const updatedNeeds = entity.getComponent<NeedsComponent>(ComponentType.Needs);
      if (updatedNeeds && updatedNeeds.hunger >= HUNGER_THRESHOLD_SEEK_FOOD) {
        this.switchTo(entity, 'wander', {});
        return { complete: true, reason: 'Hunger satisfied from storage' };
      }
      // Still hungry, continue (will try again next tick)
      return;
    }

    // No food available nearby - move toward nearest food source
    const nearestFood = this.findNearestFoodSource(entity, world);
    if (nearestFood) {
      // Move toward the food source
      this.moveToward(entity, nearestFood.position, { arrivalDistance: 2 });
      return; // Continue moving
    }

    // No food sources found at all - wander to explore for food

    // Instead of switching to 'wander' behavior (which gets overridden by autonomic system),
    // wander directly as part of seeking food (exploring to find food)
    const movement = entity.getComponent<MovementComponent>(ComponentType.Movement);
    if (movement) {
      // Get or initialize wander angle
      let wanderAngle = agent.behaviorState?.wanderAngle as number | undefined;
      if (wanderAngle === undefined) {
        wanderAngle = Math.random() * Math.PI * 2;
      }

      // Add small random jitter for natural exploration
      wanderAngle += (Math.random() - 0.5) * (Math.PI / 18); // ~10 degrees

      // Calculate velocity
      const speed = movement.speed;
      const velocityX = Math.cos(wanderAngle) * speed;
      const velocityY = Math.sin(wanderAngle) * speed;

      // Set velocity
      this.setVelocity(entity, velocityX, velocityY);

      // Save wander angle for next tick
      this.updateState(entity, { wanderAngle });
    }

    return; // Continue seeking food (stay in seek_food behavior)
  }

  /**
   * Find the best food source considering both distance and food quality.
   * Score = distance - (hungerRestored * 2)
   * Lower score = better (close AND nutritious)
   */
  private findNearestFoodSource(
    entity: EntityImpl,
    world: World
  ): { type: 'plant' | 'storage'; entity: Entity; position: { x: number; y: number }; distance: number } | null {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) return null;

    let best: { type: 'plant' | 'storage'; entity: Entity; position: { x: number; y: number }; distance: number; score: number } | null = null;

    // Check edible plants with fruit
    const plantEntities = world.query()
      .with(ComponentType.Plant)
      .with(ComponentType.Position)
      .executeEntities() as Entity[];

    for (const plantEntity of plantEntities) {
      const plantImpl = plantEntity as EntityImpl;
      const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);
      const plant = plantImpl.getComponent(ComponentType.Plant) as { speciesId: string; fruitCount: number } | undefined;

      if (!plantPos || !plant) continue;
      if (!isEdibleSpecies(plant.speciesId)) continue;
      if (plant.fruitCount <= 0) continue; // Only plants with fruit

      const dx = position.x - plantPos.x;
      const dy = position.y - plantPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Get nutritional value of fruit from this plant type
      const fruitItemId = plant.speciesId === 'berry-bush' ? 'berry' : 'fruit';
      const hungerRestored = itemRegistry.getHungerRestored(fruitItemId) || DEFAULT_HUNGER_RESTORED;

      // Score: prefer closer AND more nutritious (lower score = better)
      const score = distance - (hungerRestored * 2);

      if (!best || score < best.score) {
        best = { type: 'plant', entity: plantEntity, position: { x: plantPos.x, y: plantPos.y }, distance, score };
      }
    }

    // Check storage buildings with food
    const buildingEntities = world.query()
      .with(ComponentType.Building)
      .with(ComponentType.Inventory)
      .with(ComponentType.Position)
      .executeEntities() as Entity[];

    for (const buildingEntity of buildingEntities) {
      const buildingImpl = buildingEntity as EntityImpl;
      const buildingPos = buildingImpl.getComponent<PositionComponent>(ComponentType.Position);
      const buildingComp = buildingImpl.getComponent<BuildingComponent>(ComponentType.Building);
      const buildingInventory = buildingImpl.getComponent<InventoryComponent>(ComponentType.Inventory);

      if (!buildingPos || !buildingComp || !buildingInventory) continue;

      // Check if it's a storage building
      const isStorage = buildingComp.buildingType === BuildingType.StorageChest ||
                       buildingComp.buildingType === BuildingType.StorageBox;
      if (!isStorage) continue;

      // Find best food item in storage
      let bestFoodValue = 0;
      for (const slot of buildingInventory.slots) {
        if (slot?.itemId && slot.quantity > 0 && itemRegistry.isEdible(slot.itemId)) {
          const hungerRestored = itemRegistry.getHungerRestored(slot.itemId) || DEFAULT_HUNGER_RESTORED;
          bestFoodValue = Math.max(bestFoodValue, hungerRestored);
        }
      }

      if (bestFoodValue === 0) continue;

      const dx = position.x - buildingPos.x;
      const dy = position.y - buildingPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Score: prefer closer AND more nutritious
      const score = distance - (bestFoodValue * 2);

      if (!best || score < best.score) {
        best = { type: 'storage', entity: buildingEntity, position: { x: buildingPos.x, y: buildingPos.y }, distance, score };
      }
    }

    return best;
  }

  private findFoodInInventory(inventory: InventoryComponent): { slotIndex: number; itemId: string; quantity: number } | null {
    for (let i = 0; i < inventory.slots.length; i++) {
      const slot = inventory.slots[i];
      if (slot && slot.itemId && slot.quantity > 0 && itemRegistry.isEdible(slot.itemId)) {
        return { slotIndex: i, itemId: slot.itemId, quantity: slot.quantity };
      }
    }
    return null;
  }

  private eatFood(
    entity: EntityImpl,
    world: World,
    slotIndex: number,
    foodType: string,
    needs: NeedsComponent
  ): void {
    // Get hunger restored from item registry, fallback to default
    const hungerRestored = itemRegistry.getHungerRestored(foodType) || DEFAULT_HUNGER_RESTORED;

    // Consume food from inventory
    entity.updateComponent<InventoryComponent>(ComponentType.Inventory, (current) => {
      const newSlots = [...current.slots];
      const slot = newSlots[slotIndex]!;

      newSlots[slotIndex] = {
        ...slot,
        quantity: slot.quantity - 1,
      };

      // Clear slot if empty
      if (newSlots[slotIndex]!.quantity <= 0) {
        newSlots[slotIndex] = { itemId: null, quantity: 0 };
      }

      return {
        ...current,
        slots: newSlots,
        currentWeight: Math.max(0, current.currentWeight - 1),
      };
    });

    // Restore hunger (0-1 scale)
    const newHunger = Math.min(1.0, needs.hunger + hungerRestored);
    entity.updateComponent<NeedsComponent>(ComponentType.Needs, (current) => {
      const updated = current.clone();
      updated.hunger = newHunger;
      return updated;
    });

    // Emit event
    world.eventBus.emit({
      type: 'agent:ate',
      source: entity.id,
      data: {
        agentId: entity.id,
        foodType,
        hungerRestored,
        amount: 1,
      },
    });

  }

  /**
   * Try to eat food directly from a nearby storage building.
   * Returns the result of the interaction, or null if no storage found.
   */
  private tryEatFromNearbyStorage(entity: EntityImpl, world: World): InteractionResult | null {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) return null;

    // Find nearby storage buildings with food
    const nearbyDistance = 3; // Must be within 3 tiles of storage

    // Query for buildings with inventory
    const buildingEntities = world.query()
      .with(ComponentType.Building)
      .with(ComponentType.Inventory)
      .with(ComponentType.Position)
      .executeEntities() as Entity[];

    for (const buildingEntity of buildingEntities) {
      const buildingImpl = buildingEntity as EntityImpl;
      const buildingPos = buildingImpl.getComponent<PositionComponent>(ComponentType.Position);
      const buildingComp = buildingImpl.getComponent<BuildingComponent>(ComponentType.Building);
      const buildingInventory = buildingImpl.getComponent<InventoryComponent>(ComponentType.Inventory);

      if (!buildingPos || !buildingComp || !buildingInventory) continue;

      // Check if it's a storage building
      const isStorage = buildingComp.buildingType === BuildingType.StorageChest ||
                       buildingComp.buildingType === BuildingType.StorageBox;
      if (!isStorage) continue;

      // Check distance
      const dx = position.x - buildingPos.x;
      const dy = position.y - buildingPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > nearbyDistance) continue;

      // Check if storage has food
      const hasFood = buildingInventory.slots.some(
        slot => slot?.itemId && slot.quantity > 0 && itemRegistry.isEdible(slot.itemId)
      );

      if (!hasFood) continue;

      // Try to eat from this storage
      const result = eatFromStorage(entity, buildingEntity, world);
      if (result.success) {
        return result;
      }
    }

    return null;
  }

  /**
   * Try to eat fruit directly from a nearby plant (berry bush, etc.).
   * Returns the result of the interaction, or null if no suitable plant found.
   */
  private tryEatFromNearbyPlant(entity: EntityImpl, world: World): InteractionResult | null {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position);
    if (!position) return null;

    // Find nearby edible plants with fruit
    const nearbyDistance = 2; // Must be within 2 tiles of plant

    // Query for plants with position
    const plantEntities = world.query()
      .with(ComponentType.Plant)
      .with(ComponentType.Position)
      .executeEntities() as Entity[];

    for (const plantEntity of plantEntities) {
      const plantImpl = plantEntity as EntityImpl;
      const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);
      const plant = plantImpl.getComponent(ComponentType.Plant) as {
        speciesId: string;
        fruitCount: number;
      } | undefined;

      if (!plantPos || !plant) continue;

      // Check if it's an edible species with fruit
      if (!isEdibleSpecies(plant.speciesId)) continue;
      if (plant.fruitCount <= 0) continue;

      // Check distance
      const dx = position.x - plantPos.x;
      const dy = position.y - plantPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > nearbyDistance) continue;

      // Try to eat from this plant
      const result = eatFromPlant(entity, plantEntity, world);
      if (result.success) {
        return result;
      }
    }

    return null;
  }
}

/**
 * Standalone function for use with BehaviorRegistry.
 */
export function seekFoodBehavior(entity: EntityImpl, world: World): void {
  const behavior = new SeekFoodBehavior();
  behavior.execute(entity, world);
}
