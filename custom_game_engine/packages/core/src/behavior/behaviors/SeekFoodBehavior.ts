/**
 * SeekFoodBehavior - Find and consume food to satisfy hunger
 *
 * This behavior:
 * 1. First checks if agent has food in inventory → eat it
 * 2. If no food in inventory BUT inventory is full → eat from nearby storage
 * 3. If no food in inventory → gather food from environment
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 *
 * Performance: Uses ChunkSpatialQuery and SpatialMemory for efficient food source lookups
 */

import type { EntityImpl, Entity } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { BuildingComponent } from '../../components/BuildingComponent.js';
import type { MovementComponent } from '../../components/MovementComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { SpatialMemoryComponent } from '../../components/SpatialMemoryComponent.js';
import { getSpatialMemoriesByType } from '../../components/SpatialMemoryComponent.js';
import { itemRegistry } from '../../items/index.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { eatFromStorage, eatFromPlant, type InteractionResult } from '../../services/InteractionAPI.js';
import { isEdibleSpecies } from '../../services/TargetingAPI.js';
import { HUNGER_THRESHOLD_SEEK_FOOD, HUNGER_THRESHOLD_WELL_FED, HUNGER_RESTORED_DEFAULT } from '../../constants/index.js';
import { ComponentType, ComponentType as CT } from '../../types/ComponentType.js';
import { BuildingType } from '../../types/BuildingType.js';
import { CHUNK_SIZE } from '../../types.js';
import type { BehaviorContext, BehaviorResult as ContextBehaviorResult } from '../BehaviorContext.js';
import { isPlantComponent } from '../../components/typeGuards.js';

/**
 * ChunkSpatialQuery is now available via world.spatialQuery
 */

/** Default hunger restored if item not in registry */
const DEFAULT_HUNGER_RESTORED = HUNGER_RESTORED_DEFAULT;

/**
 * SeekFoodBehavior - Eat food from inventory or gather if none available
 */
export class SeekFoodBehavior extends BaseBehavior {
  readonly name = 'seek_food' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const agent = entity.getComponent(ComponentType.Agent);
    const inventory = entity.getComponent(ComponentType.Inventory);
    const needs = entity.getComponent(ComponentType.Needs);

    // If no inventory or needs, can't eat
    if (!inventory || !needs || !agent) {
      return { complete: true, reason: 'Missing required components' };
    }

    // Check if agent has food in inventory
    const foodSlot = this.findFoodInInventory(inventory);

    if (foodSlot) {
      // Eat food from inventory
      this.eatFood(entity, world, foodSlot.slotIndex, foodSlot.itemId, needs);

      // Check if well-fed (hysteresis: complete only when hunger reaches WELL_FED threshold)
      // This prevents ping-pong between eat→satisfied→hungry→eat cycles
      if (needs.hunger < HUNGER_THRESHOLD_WELL_FED) {
        // Not well-fed yet, continue seeking food until properly full
        return;
      } else {
        // Well-fed, behavior complete
        return { complete: true, reason: 'Well-fed (hunger satisfied)' };
      }
    }

    // No food in inventory - try eating directly from plants or storage
    // (Berries come from plants, not resource nodes, so we must try plants first)

    // First try eating from nearby plants (berry bushes, etc.)
    const plantResult = this.tryEatFromNearbyPlant(entity, world);
    if (plantResult?.success) {
      // Check if well-fed (hysteresis)
      const updatedNeeds = entity.getComponent(ComponentType.Needs);
      if (updatedNeeds && updatedNeeds.hunger >= HUNGER_THRESHOLD_WELL_FED) {
        return { complete: true, reason: 'Well-fed from plant' };
      }
      // Not well-fed yet, continue eating
      return;
    }

    // Then try eating from nearby storage
    const storageResult = this.tryEatFromNearbyStorage(entity, world);
    if (storageResult?.success) {
      // Check if well-fed (hysteresis)
      const updatedNeeds = entity.getComponent(ComponentType.Needs);
      if (updatedNeeds && updatedNeeds.hunger >= HUNGER_THRESHOLD_WELL_FED) {
        return { complete: true, reason: 'Well-fed from storage' };
      }
      // Not well-fed yet, continue eating
      return;
    }

    // No food available nearby - move toward nearest food source
    const nearestFood = this.findNearestFoodSource(entity, world);

    if (nearestFood) {
      // Move toward the food source
      this.moveToward(entity, nearestFood.position, { arrivalDistance: 2 });
      return; // Continue moving
    }

    // No food sources found nearby - try spatial memory for remembered food locations
    const spatialMemory = entity.getComponent(ComponentType.SpatialMemory);
    const agentPosition = entity.getComponent(ComponentType.Position);
    if (spatialMemory && agentPosition) {
      // Try both resource_location and plant_location types (food can be either)
      const resourceMemories = getSpatialMemoriesByType(spatialMemory, 'resource_location');
      const plantMemories = getSpatialMemoriesByType(spatialMemory, 'plant_location');
      const foodMemories = [...resourceMemories, ...plantMemories];

      if (foodMemories.length > 0) {
        // Sort by distance and find closest remembered food location
        const sortedMemories = foodMemories
          .map(mem => ({
            memory: mem,
            distance: Math.sqrt(
              Math.pow(mem.x - agentPosition.x, 2) +
              Math.pow(mem.y - agentPosition.y, 2)
            )
          }))
          .sort((a, b) => a.distance - b.distance);

        const closestMemory = sortedMemories[0];
        if (closestMemory && closestMemory.distance > 5) {
          // Navigate toward remembered food location
          this.moveToward(entity, { x: closestMemory.memory.x, y: closestMemory.memory.y }, { arrivalDistance: 5 });
          return;
        }
      }
    }

    // No food found and no memories - wander to explore for food
    // Instead of switching to 'wander' behavior (which gets overridden by autonomic system),
    // wander directly as part of seeking food (exploring to find food)
    const movement = entity.getComponent(ComponentType.Movement);
    if (movement && agentPosition) {
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
   * Find the best food source using chunk-spiral search.
   * Searches current chunk first, then spirals outward to adjacent chunks.
   * This guarantees finding the closest food by chunk proximity.
   *
   * Algorithm:
   * 1. Search current chunk (ring 0)
   * 2. If no food, search 8 adjacent chunks (ring 1)
   * 3. If still no food, search next ring (ring 2)
   * 4. Continue up to MAX_CHUNK_RINGS
   *
   * Performance: O(chunks searched) instead of O(all entities in radius)
   */
  private findNearestFoodSource(
    entity: EntityImpl,
    world: World
  ): { type: 'plant' | 'storage'; entity: Entity; position: { x: number; y: number }; distance: number } | null {
    const position = entity.getComponent(ComponentType.Position);
    if (!position) return null;

    const MAX_CHUNK_RINGS = 3; // Search current + 3 rings = 7x7 chunks max

    // Get agent's current chunk coordinates
    const centerChunkX = Math.floor(position.x / CHUNK_SIZE);
    const centerChunkY = Math.floor(position.y / CHUNK_SIZE);

    // Spiral outward from current chunk
    for (let ring = 0; ring <= MAX_CHUNK_RINGS; ring++) {
      const foodInRing = this.searchChunkRing(world, position, centerChunkX, centerChunkY, ring);
      if (foodInRing) {
        return foodInRing;
      }
    }

    return null;
  }

  /**
   * Search a single ring of chunks around the center.
   * Ring 0 = just the center chunk
   * Ring 1 = 8 chunks surrounding center
   * Ring 2 = 16 chunks in the next ring
   * etc.
   */
  private searchChunkRing(
    world: World,
    agentPos: PositionComponent,
    centerChunkX: number,
    centerChunkY: number,
    ring: number
  ): { type: 'plant' | 'storage'; entity: Entity; position: { x: number; y: number }; distance: number } | null {
    let best: { type: 'plant' | 'storage'; entity: Entity; position: { x: number; y: number }; distance: number; score: number } | null = null;

    // Generate chunk coordinates for this ring
    const chunks = this.getChunksInRing(centerChunkX, centerChunkY, ring);

    for (const { chunkX, chunkY } of chunks) {
      // Get all entities in this chunk using World's chunkIndex
      const entityIds = world.getEntitiesInChunk(chunkX, chunkY);

      for (const entityId of entityIds) {
        const entityObj = world.getEntity(entityId);
        if (!entityObj) continue;

        const entityImpl = entityObj as EntityImpl;
        const entityPos = entityImpl.getComponent(ComponentType.Position);
        if (!entityPos) continue;

        // Calculate distance for scoring
        const dx = agentPos.x - entityPos.x;
        const dy = agentPos.y - entityPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if it's an edible plant with fruit
        const plantComp = entityImpl.getComponent(ComponentType.Plant);
        if (plantComp && isPlantComponent(plantComp) && isEdibleSpecies(plantComp.speciesId) && plantComp.fruitCount > 0) {
          const plant = plantComp;
          const isBerry = plant.speciesId === 'blueberry-bush' || plant.speciesId === 'raspberry-bush' || plant.speciesId === 'blackberry-bush';
          const fruitItemId = isBerry ? 'berry' : 'fruit';
          const hungerRestored = itemRegistry.getHungerRestored(fruitItemId) || DEFAULT_HUNGER_RESTORED;
          const score = distance - (hungerRestored * 2);

          if (!best || score < best.score) {
            best = { type: 'plant', entity: entityObj, position: { x: entityPos.x, y: entityPos.y }, distance, score };
          }
          continue;
        }

        // Check if it's a storage building with food
        const building = entityImpl.getComponent(ComponentType.Building);
        const inventory = entityImpl.getComponent(ComponentType.Inventory);
        if (building && inventory) {
          const isStorage = building.buildingType === BuildingType.StorageChest ||
                           building.buildingType === BuildingType.StorageBox;
          if (!isStorage) continue;

          // Find best food item in storage
          let bestFoodValue = 0;
          for (const slot of inventory.slots) {
            if (slot?.itemId && slot.quantity > 0 && itemRegistry.isEdible(slot.itemId)) {
              const hungerRestored = itemRegistry.getHungerRestored(slot.itemId) || DEFAULT_HUNGER_RESTORED;
              bestFoodValue = Math.max(bestFoodValue, hungerRestored);
            }
          }

          if (bestFoodValue > 0) {
            const score = distance - (bestFoodValue * 2);
            if (!best || score < best.score) {
              best = { type: 'storage', entity: entityObj, position: { x: entityPos.x, y: entityPos.y }, distance, score };
            }
          }
        }
      }
    }

    return best;
  }

  /**
   * Get chunk coordinates for a specific ring around center.
   * Ring 0: just center chunk
   * Ring 1: 8 surrounding chunks
   * Ring 2: 16 chunks in next ring
   * etc.
   */
  private getChunksInRing(
    centerX: number,
    centerY: number,
    ring: number
  ): Array<{ chunkX: number; chunkY: number }> {
    if (ring === 0) {
      return [{ chunkX: centerX, chunkY: centerY }];
    }

    const chunks: Array<{ chunkX: number; chunkY: number }> = [];

    // Top and bottom edges
    for (let dx = -ring; dx <= ring; dx++) {
      chunks.push({ chunkX: centerX + dx, chunkY: centerY - ring }); // Top
      chunks.push({ chunkX: centerX + dx, chunkY: centerY + ring }); // Bottom
    }

    // Left and right edges (excluding corners already added)
    for (let dy = -ring + 1; dy <= ring - 1; dy++) {
      chunks.push({ chunkX: centerX - ring, chunkY: centerY + dy }); // Left
      chunks.push({ chunkX: centerX + ring, chunkY: centerY + dy }); // Right
    }

    return chunks;
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
   *
   * Performance: Uses ChunkSpatialQuery when available
   */
  private tryEatFromNearbyStorage(entity: EntityImpl, world: World): InteractionResult | null {
    const position = entity.getComponent(ComponentType.Position);
    if (!position) return null;

    const nearbyDistance = 3; // Must be within 3 tiles of storage

    // Use ChunkSpatialQuery if available (fast, chunk-based)
    if (world.spatialQuery) {
      const buildingsInRadius = world.spatialQuery.getEntitiesInRadius(
        position.x, position.y, nearbyDistance,
        [ComponentType.Building]
      );

      for (const { entity: buildingEntity } of buildingsInRadius) {
        const buildingImpl = buildingEntity as EntityImpl;
        const buildingComp = buildingImpl.getComponent(ComponentType.Building);
        const buildingInventory = buildingImpl.getComponent(ComponentType.Inventory);

        if (!buildingComp || !buildingInventory) continue;

        // Check if it's a storage building
        const isStorage = buildingComp.buildingType === BuildingType.StorageChest ||
                         buildingComp.buildingType === BuildingType.StorageBox;
        if (!isStorage) continue;

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

    // Fallback: Use global query (slow, only when ChunkSpatialQuery not available)
    const buildingEntities = world.query()
      .with(ComponentType.Building)
      .with(ComponentType.Inventory)
      .with(ComponentType.Position)
      .executeEntities() as Entity[];

    for (const buildingEntity of buildingEntities) {
      const buildingImpl = buildingEntity as EntityImpl;
      const buildingPos = buildingImpl.getComponent(ComponentType.Position);
      const buildingComp = buildingImpl.getComponent(ComponentType.Building);
      const buildingInventory = buildingImpl.getComponent(ComponentType.Inventory);

      if (!buildingPos || !buildingComp || !buildingInventory) continue;

      // Check if it's a storage building
      const isStorage = buildingComp.buildingType === BuildingType.StorageChest ||
                       buildingComp.buildingType === BuildingType.StorageBox;
      if (!isStorage) continue;

      // Check distance (using squared distance for performance)
      const dx = position.x - buildingPos.x;
      const dy = position.y - buildingPos.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared > nearbyDistance * nearbyDistance) continue;

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
   *
   * Performance: Uses ChunkSpatialQuery when available
   */
  private tryEatFromNearbyPlant(entity: EntityImpl, world: World): InteractionResult | null {
    const position = entity.getComponent(ComponentType.Position);
    if (!position) return null;

    const nearbyDistance = 2; // Must be within 2 tiles of plant

    // Use ChunkSpatialQuery if available (fast, chunk-based)
    if (world.spatialQuery) {
      const plantsInRadius = world.spatialQuery.getEntitiesInRadius(
        position.x, position.y, nearbyDistance,
        [ComponentType.Plant]
      );

      for (const { entity: plantEntity } of plantsInRadius) {
        const plantImpl = plantEntity as EntityImpl;
        const plantComp = plantImpl.getComponent(ComponentType.Plant);

        if (!plantComp || !isPlantComponent(plantComp)) continue;

        // Check if it's an edible species with fruit
        if (!isEdibleSpecies(plantComp.speciesId)) continue;
        if (plantComp.fruitCount <= 0) continue;

        // Try to eat from this plant
        const result = eatFromPlant(entity, plantEntity, world);
        if (result.success) {
          return result;
        }
      }

      return null;
    }

    // Fallback: Use global query (slow, only when ChunkSpatialQuery not available)
    const plantEntities = world.query()
      .with(ComponentType.Plant)
      .with(ComponentType.Position)
      .executeEntities() as Entity[];

    for (const plantEntity of plantEntities) {
      const plantImpl = plantEntity as EntityImpl;
      const plantPos = plantImpl.getComponent(ComponentType.Position);
      const plantComp = plantImpl.getComponent(ComponentType.Plant);

      if (!plantPos || !plantComp || !isPlantComponent(plantComp)) continue;

      // Check if it's an edible species with fruit
      if (!isEdibleSpecies(plantComp.speciesId)) continue;
      if (plantComp.fruitCount <= 0) continue;

      // Check distance (using squared distance for performance)
      const dx = position.x - plantPos.x;
      const dy = position.y - plantPos.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared > nearbyDistance * nearbyDistance) continue;

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
 * Standalone function for use with BehaviorRegistry (legacy).
 * @deprecated Use seekFoodBehaviorWithContext for new code
 */
export function seekFoodBehavior(entity: EntityImpl, world: World): void {
  const behavior = new SeekFoodBehavior();
  behavior.execute(entity, world);
}

// ============================================================================
// Modern BehaviorContext Version
// ============================================================================

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('seek_food', seekFoodBehaviorWithContext);
 */
export function seekFoodBehaviorWithContext(ctx: BehaviorContext): ContextBehaviorResult | void {
  if (!ctx.inventory || !ctx.needs) {
    return ctx.complete('Missing required components');
  }

  // Check if agent has food in inventory
  const foodSlot = findFoodInInventory(ctx.inventory);

  if (foodSlot) {
    // Eat food from inventory
    eatFoodFromInventory(ctx, foodSlot.slotIndex, foodSlot.itemId);

    // Check if well-fed (hysteresis: complete only when hunger reaches WELL_FED threshold)
    const updatedNeeds = ctx.getComponent<NeedsComponent>(CT.Needs);
    if (updatedNeeds && updatedNeeds.hunger < HUNGER_THRESHOLD_WELL_FED) {
      // Not well-fed yet, continue seeking food until properly full
      return;
    } else {
      // Well-fed
      return ctx.complete('Well-fed (hunger satisfied)');
    }
  }

  // No food in inventory - try eating directly from plants or storage
  const plantResult = tryEatFromNearbyPlant(ctx);
  if (plantResult?.success) {
    const updatedNeeds = ctx.getComponent<NeedsComponent>(CT.Needs);
    if (updatedNeeds && updatedNeeds.hunger >= HUNGER_THRESHOLD_WELL_FED) {
      return ctx.complete('Well-fed from plant');
    }
    return;
  }

  const storageResult = tryEatFromNearbyStorage(ctx);
  if (storageResult?.success) {
    const updatedNeeds = ctx.getComponent<NeedsComponent>(CT.Needs);
    if (updatedNeeds && updatedNeeds.hunger >= HUNGER_THRESHOLD_WELL_FED) {
      return ctx.complete('Well-fed from storage');
    }
    return;
  }

  // No food available nearby - find nearest food source
  const nearestFood = findNearestFoodSourceWithContext(ctx);

  if (nearestFood) {
    ctx.moveToward(nearestFood.position, { arrivalDistance: 2 });
    return;
  }

  // No food sources found nearby - try spatial memory
  const spatialMemory = ctx.getComponent<SpatialMemoryComponent>(CT.SpatialMemory);
  if (spatialMemory) {
    const resourceMemories = getSpatialMemoriesByType(spatialMemory, 'resource_location');
    const plantMemories = getSpatialMemoriesByType(spatialMemory, 'plant_location');
    const foodMemories = [...resourceMemories, ...plantMemories];

    if (foodMemories.length > 0) {
      // Sort by distance and find closest remembered food location
      const sortedMemories = foodMemories
        .map(mem => ({
          memory: mem,
          distanceSquared: ctx.distanceSquaredTo({ x: mem.x, y: mem.y })
        }))
        .sort((a, b) => a.distanceSquared - b.distanceSquared);

      const closestMemory = sortedMemories[0];
      if (closestMemory && closestMemory.distanceSquared > 25) { // > 5 tiles
        ctx.moveToward({ x: closestMemory.memory.x, y: closestMemory.memory.y }, { arrivalDistance: 5 });
        return;
      }
    }
  }

  // No food found and no memories - wander to explore for food
  if (!ctx.movement) return;

  let wanderAngle = ctx.getState<number>('wanderAngle');
  if (wanderAngle === undefined) {
    wanderAngle = Math.random() * Math.PI * 2;
  }

  // Add small random jitter for natural exploration
  wanderAngle += (Math.random() - 0.5) * (Math.PI / 18); // ~10 degrees

  // Calculate velocity
  const speed = ctx.movement.speed;
  const velocityX = Math.cos(wanderAngle) * speed;
  const velocityY = Math.sin(wanderAngle) * speed;

  ctx.setVelocity(velocityX, velocityY);
  ctx.updateState({ wanderAngle });

  return; // Continue seeking food
}

// ============================================================================
// Helper Functions for BehaviorContext Version
// ============================================================================

function findFoodInInventory(inventory: InventoryComponent): { slotIndex: number; itemId: string; quantity: number } | null {
  for (let i = 0; i < inventory.slots.length; i++) {
    const slot = inventory.slots[i];
    if (slot && slot.itemId && slot.quantity > 0 && itemRegistry.isEdible(slot.itemId)) {
      return { slotIndex: i, itemId: slot.itemId, quantity: slot.quantity };
    }
  }
  return null;
}

function eatFoodFromInventory(ctx: BehaviorContext, slotIndex: number, foodType: string): void {
  const hungerRestored = itemRegistry.getHungerRestored(foodType) || DEFAULT_HUNGER_RESTORED;

  // Consume food from inventory
  ctx.updateComponent<InventoryComponent>(CT.Inventory, (current) => {
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

  // Restore hunger
  const needs = ctx.needs;
  if (needs) {
    const newHunger = Math.min(1.0, needs.hunger + hungerRestored);
    ctx.updateComponent<NeedsComponent>(CT.Needs, (current) => {
      const updated = current.clone();
      updated.hunger = newHunger;
      return updated;
    });
  }

  // Emit event
  ctx.emit({
    type: 'agent:ate',
    data: {
      agentId: ctx.entity.id,
      foodType,
      hungerRestored,
      amount: 1,
    },
  });
}

function tryEatFromNearbyPlant(ctx: BehaviorContext): InteractionResult | null {
  const nearbyDistance = 2;
  const plantsInRadius = ctx.getEntitiesInRadius(nearbyDistance, [CT.Plant]);

  for (const { entity: plantEntity } of plantsInRadius) {
    const plantImpl = plantEntity as EntityImpl;
    const plantComp = plantImpl.getComponent(CT.Plant);

    if (!plantComp || !isPlantComponent(plantComp)) continue;
    if (!isEdibleSpecies(plantComp.speciesId)) continue;
    if (plantComp.fruitCount <= 0) continue;

    // Try to eat from this plant
    const result = eatFromPlant(ctx.entity, plantEntity, ctx.world);
    if (result.success) {
      return result;
    }
  }

  return null;
}

function tryEatFromNearbyStorage(ctx: BehaviorContext): InteractionResult | null {
  const nearbyDistance = 3;
  const buildingsInRadius = ctx.getEntitiesInRadius(nearbyDistance, [CT.Building, CT.Inventory]);

  for (const { entity: buildingEntity } of buildingsInRadius) {
    const buildingImpl = buildingEntity as EntityImpl;
    const buildingComp = buildingImpl.getComponent<BuildingComponent>(CT.Building);
    const buildingInventory = buildingImpl.getComponent<InventoryComponent>(CT.Inventory);

    if (!buildingComp || !buildingInventory) continue;

    // Check if it's a storage building
    const isStorage = buildingComp.buildingType === BuildingType.StorageChest ||
                     buildingComp.buildingType === BuildingType.StorageBox;
    if (!isStorage) continue;

    // Check if storage has food
    const hasFood = buildingInventory.slots.some(
      slot => slot?.itemId && slot.quantity > 0 && itemRegistry.isEdible(slot.itemId)
    );

    if (!hasFood) continue;

    // Try to eat from this storage
    const result = eatFromStorage(ctx.entity, buildingEntity, ctx.world);
    if (result.success) {
      return result;
    }
  }

  return null;
}

function findNearestFoodSourceWithContext(
  ctx: BehaviorContext
): { type: 'plant' | 'storage'; position: { x: number; y: number }; distance: number } | null {
  const MAX_SEARCH_RADIUS = 100; // Search up to 100 tiles
  let best: { type: 'plant' | 'storage'; position: { x: number; y: number }; distance: number; score: number } | null = null;

  // Search for plants
  const plantsInRadius = ctx.getEntitiesInRadius(MAX_SEARCH_RADIUS, [CT.Plant]);
  for (const { entity: plantEntity, distance, position } of plantsInRadius) {
    const plantImpl = plantEntity as EntityImpl;
    const plantComp = plantImpl.getComponent(CT.Plant);

    if (!plantComp || !isPlantComponent(plantComp) || !isEdibleSpecies(plantComp.speciesId) || plantComp.fruitCount <= 0) continue;

    const isBerry = plantComp.speciesId === 'blueberry-bush' || plantComp.speciesId === 'raspberry-bush' || plantComp.speciesId === 'blackberry-bush';
    const fruitItemId = isBerry ? 'berry' : 'fruit';
    const hungerRestored = itemRegistry.getHungerRestored(fruitItemId) || DEFAULT_HUNGER_RESTORED;
    const score = distance - (hungerRestored * 2);

    if (!best || score < best.score) {
      best = { type: 'plant', position, distance, score };
    }
  }

  // Search for storage buildings
  const buildingsInRadius = ctx.getEntitiesInRadius(MAX_SEARCH_RADIUS, [CT.Building, CT.Inventory]);
  for (const { entity: buildingEntity, distance, position } of buildingsInRadius) {
    const buildingImpl = buildingEntity as EntityImpl;
    const buildingComp = buildingImpl.getComponent<BuildingComponent>(CT.Building);
    const inventory = buildingImpl.getComponent<InventoryComponent>(CT.Inventory);

    if (!buildingComp || !inventory) continue;

    const isStorage = buildingComp.buildingType === BuildingType.StorageChest ||
                     buildingComp.buildingType === BuildingType.StorageBox;
    if (!isStorage) continue;

    // Find best food item in storage
    let bestFoodValue = 0;
    for (const slot of inventory.slots) {
      if (slot?.itemId && slot.quantity > 0 && itemRegistry.isEdible(slot.itemId)) {
        const hungerRestored = itemRegistry.getHungerRestored(slot.itemId) || DEFAULT_HUNGER_RESTORED;
        bestFoodValue = Math.max(bestFoodValue, hungerRestored);
      }
    }

    if (bestFoodValue > 0) {
      const score = distance - (bestFoodValue * 2);
      if (!best || score < best.score) {
        best = { type: 'storage', position, distance, score };
      }
    }
  }

  return best;
}
