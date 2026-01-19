/**
 * FarmBehaviors - Farming-related behaviors
 *
 * Includes:
 * - FarmBehavior: Base farming behavior (waits for action completion)
 * - TillBehavior: Find and till grass for planting
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 *
 * Performance: Uses ChunkSpatialQuery when available for efficient plant lookups
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { Component } from '../../ecs/Component.js';
import type { MovementComponent } from '../../components/MovementComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { ComponentType } from '../../types/ComponentType.js';

/**
 * ChunkSpatialQuery is now available via world.spatialQuery
 */

/** Search radius for tillable tiles */
const TILL_SEARCH_RADIUS = 10;

/** Maximum distance for tilling (must be adjacent) */
const MAX_TILL_DISTANCE = Math.sqrt(2);

/**
 * FarmBehavior - Base farming state
 *
 * Agent stops moving and waits for farming action to complete.
 * The actual farming actions (till, plant, water, harvest) are handled by:
 * 1. ActionQueue processes queued actions each tick
 * 2. TillActionHandler, PlantActionHandler, etc. validate and execute
 * 3. Agent remains in 'farm' behavior until action completes
 */
export class FarmBehavior extends BaseBehavior {
  readonly name = 'farm' as const;

  execute(entity: EntityImpl, _world: World): BehaviorResult | void {
    // Stop moving - agent is working on farming task
    this.stopMovement(entity);

    // The ActionQueue handles the actual farming work
    // This behavior just holds the agent in a farming state
  }
}

/**
 * TillBehavior - Find and till grass for planting
 *
 * Agents with seeds will autonomously till nearby grass to prepare farmland.
 * Finds untilled grass tiles within range and emits a 'action:till' event
 * that can be processed to submit a till action to the ActionQueue.
 */
export class TillBehavior extends BaseBehavior {
  readonly name = 'till' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);

    // Stop moving while deciding where to till
    this.stopMovement(entity);

    // Check if agent has seeds (motivation to till)
    const hasSeeds = inventory?.slots?.some((slot) =>
      slot.itemId && (slot.itemId.includes('seed') || slot.itemId === 'wheat_seed' || slot.itemId === 'carrot_seed')
    );

    if (!hasSeeds) {
      // No seeds - stay in current behavior
      return { complete: true, reason: 'No seeds to plant' };
    }

    // Find nearest untilled grass tile within range
    const nearestGrassTile = this.findNearestTillableTile(world, position);

    if (!nearestGrassTile) {
      return { complete: true, reason: 'No tillable tiles found' };
    }

    // Check if agent is adjacent to the target tile
    const dx = nearestGrassTile.x - position.x;
    const dy = nearestGrassTile.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > MAX_TILL_DISTANCE) {
      // Agent is too far - move towards tile

      const speed = 1.0;
      const velocityX = (dx / distance) * speed;
      const velocityY = (dy / distance) * speed;

      entity.updateComponent<MovementComponent>(ComponentType.Movement, (current) => ({
        ...current,
        targetX: nearestGrassTile.x,
        targetY: nearestGrassTile.y,
        velocityX,
        velocityY,
      }));

      // Stay in till behavior - will retry next tick when closer
      return;
    }

    // Agent is adjacent - emit event requesting tilling

    world.eventBus.emit({
      type: 'action:till',
      source: entity.id,
      data: {
        x: nearestGrassTile.x,
        y: nearestGrassTile.y,
        agentId: entity.id,
      },
    });

    // Switch to farm behavior to wait for action completion
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'farm',
      behaviorState: {},
      behaviorCompleted: true, // Signal completion after tilling action is queued
    }));
  }

  private findNearestTillableTile(
    world: World,
    position: PositionComponent
  ): { x: number; y: number; distance: number } | null {
    interface WorldWithTiles {
      getTileAt?: (x: number, y: number) => { terrain: string; tilled?: boolean } | undefined;
    }
    const worldWithTiles = world as unknown as WorldWithTiles;
    if (typeof worldWithTiles.getTileAt !== 'function') {
      console.warn('[TillBehavior] World does not have getTileAt - cannot find tiles to till');
      return null;
    }

    let nearestGrassTile: { x: number; y: number; distance: number } | null = null;

    for (let dx = -TILL_SEARCH_RADIUS; dx <= TILL_SEARCH_RADIUS; dx++) {
      for (let dy = -TILL_SEARCH_RADIUS; dy <= TILL_SEARCH_RADIUS; dy++) {
        const checkX = Math.floor(position.x) + dx;
        const checkY = Math.floor(position.y) + dy;

        const tile = worldWithTiles.getTileAt(checkX, checkY);
        if (!tile) continue;

        // Check if this is untilled grass
        if ((tile.terrain === 'grass' || tile.terrain === 'dirt') && !tile.tilled) {
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (!nearestGrassTile || distance < nearestGrassTile.distance) {
            nearestGrassTile = { x: checkX, y: checkY, distance };
          }
        }
      }
    }

    return nearestGrassTile;
  }
}

/**
 * PlantBehavior - Find tilled soil and plant seeds
 *
 * Agents with seeds will autonomously find tilled soil and plant.
 * Uses smart seed selection to prioritize food crops.
 * Requires:
 * - Seeds in inventory
 * - Nearby tilled soil with plantability > 0
 */
export class PlantBehavior extends BaseBehavior {
  readonly name = 'plant' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);

    // Stop moving while deciding where to plant
    this.stopMovement(entity);

    // Get seed inventory and choose best seed to plant
    const seedInventory = this.getSeedInventory(inventory);
    if (seedInventory.length === 0) {
      return { complete: true, reason: 'No seeds to plant' };
    }

    // Choose best seed to plant (prioritizes food crops)
    const chosenSeed = this.chooseBestSeed(seedInventory);
    if (!chosenSeed) {
      return { complete: true, reason: 'Could not choose seed' };
    }


    const seedSlot = { itemId: chosenSeed.itemId, quantity: chosenSeed.quantity };

    // Find nearest tilled tile with plantability
    const nearestTilledTile = this.findNearestPlantableTile(world, position);

    if (!nearestTilledTile) {
      // No tilled soil - switch to tilling behavior to prepare soil
      this.switchTo(entity, 'till', {});
      return { complete: true, reason: 'No plantable tiles found - switching to till' };
    }

    // Check if agent is adjacent to the target tile
    const dx = nearestTilledTile.x - position.x;
    const dy = nearestTilledTile.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const MAX_PLANT_DISTANCE = Math.sqrt(2);

    if (distance > MAX_PLANT_DISTANCE) {
      // Agent is too far - move towards tile

      const speed = 1.0;
      const velocityX = (dx / distance) * speed;
      const velocityY = (dy / distance) * speed;

      entity.updateComponent<MovementComponent>(ComponentType.Movement, (current) => ({
        ...current,
        targetX: nearestTilledTile.x,
        targetY: nearestTilledTile.y,
        velocityX,
        velocityY,
      }));

      // Stay in plant behavior - will retry next tick when closer
      return;
    }

    // Agent is adjacent - emit event requesting planting
    const speciesId = this.extractSpeciesId(seedSlot.itemId);

    world.eventBus.emit({
      type: 'action:plant',
      source: entity.id,
      data: {
        x: nearestTilledTile.x,
        y: nearestTilledTile.y,
        agentId: entity.id,
        seedType: seedSlot.itemId,
        speciesId,
      },
    });

    // Switch to farm behavior to wait for action completion
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'farm',
      behaviorState: { lastAction: 'plant' },
      behaviorCompleted: true,
    }));
  }

  private findNearestPlantableTile(
    world: World,
    position: PositionComponent
  ): { x: number; y: number; distance: number } | null {
    interface WorldWithTiles {
      getTileAt?: (x: number, y: number) => { tilled?: boolean; plantability?: number } | undefined;
    }
    const worldWithTiles = world as unknown as WorldWithTiles;
    if (typeof worldWithTiles.getTileAt !== 'function') {
      console.warn('[PlantBehavior] World does not have getTileAt - cannot find tiles to plant');
      return null;
    }

    let nearestTilledTile: { x: number; y: number; distance: number } | null = null;

    // Search in a radius around the agent
    const PLANT_SEARCH_RADIUS = 10;

    for (let dx = -PLANT_SEARCH_RADIUS; dx <= PLANT_SEARCH_RADIUS; dx++) {
      for (let dy = -PLANT_SEARCH_RADIUS; dy <= PLANT_SEARCH_RADIUS; dy++) {
        const checkX = Math.floor(position.x) + dx;
        const checkY = Math.floor(position.y) + dy;

        const tile = worldWithTiles.getTileAt(checkX, checkY);
        if (!tile) continue;

        // Check if this tile is tilled and has plantability
        if (tile.tilled && (tile.plantability ?? 0) > 0) {
          // Check no existing plant at this location
          const existingPlant = this.hasPlantAt(world, checkX, checkY);
          if (existingPlant) continue;

          const distance = Math.sqrt(dx * dx + dy * dy);

          if (!nearestTilledTile || distance < nearestTilledTile.distance) {
            nearestTilledTile = { x: checkX, y: checkY, distance };
          }
        }
      }
    }

    return nearestTilledTile;
  }

  private hasPlantAt(world: World, x: number, y: number): boolean {
    // Use ChunkSpatialQuery if available (fast, chunk-based)
    if (world.spatialQuery) {
      const plantsNearby = world.spatialQuery.getEntitiesInRadius(
        x, y, 1, // Search within 1 tile radius
        [ComponentType.Plant],
        { limit: 10 }
      );

      for (const { entity: plantEntity } of plantsNearby) {
        const plantImpl = plantEntity as EntityImpl;
        const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);
        if (plantPos && Math.floor(plantPos.x) === x && Math.floor(plantPos.y) === y) {
          return true;
        }
      }
      return false;
    }

    // Fallback: Use global query (slow, only when ChunkSpatialQuery not available)
    const plants = world.query().with(ComponentType.Plant).with(ComponentType.Position).executeEntities();
    for (const plantEntity of plants) {
      const plantImpl = plantEntity as EntityImpl;
      const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);
      if (plantPos && Math.floor(plantPos.x) === x && Math.floor(plantPos.y) === y) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all seeds in inventory with their species information
   */
  private getSeedInventory(inventory: InventoryComponent | undefined): Array<{ itemId: string; speciesId: string; quantity: number }> {
    if (!inventory?.slots) return [];

    const seeds: Array<{ itemId: string; speciesId: string; quantity: number }> = [];

    for (const slot of inventory.slots) {
      if (!slot.itemId || slot.quantity <= 0) continue;

      // Check if this is a seed item
      if (slot.itemId.startsWith('seed:') || slot.itemId.includes('_seed')) {
        const speciesId = this.extractSpeciesId(slot.itemId);
        seeds.push({
          itemId: slot.itemId,
          speciesId,
          quantity: slot.quantity,
        });
      }
    }
    return seeds;
  }

  /**
   * Choose the best seed to plant based on priorities.
   * Prioritizes: food crops > fruit plants > other > decorative
   */
  private chooseBestSeed(seedInventory: Array<{ itemId: string; speciesId: string; quantity: number }>): { itemId: string; speciesId: string; quantity: number } | null {
    if (seedInventory.length === 0) return null;

    // Priority categories (lower = higher priority)
    const FOOD_CROPS = ['wheat', 'carrot', 'potato', 'tomato', 'corn', 'pumpkin'];
    const FRUIT_PLANTS = ['apple', 'berry_bush', 'blueberry-bush', 'raspberry-bush', 'blackberry-bush'];
    const DECORATIVE = ['sunflower', 'grass', 'wildflower'];

    function getPriority(speciesId: string): number {
      if (FOOD_CROPS.includes(speciesId)) return 1;
      if (FRUIT_PLANTS.includes(speciesId)) return 2;
      if (DECORATIVE.includes(speciesId)) return 4;
      return 3; // Default for unknown crops
    }

    // Sort by priority, then by quantity (plant what we have most of)
    const sorted = [...seedInventory].sort((a, b) => {
      const priorityDiff = getPriority(a.speciesId) - getPriority(b.speciesId);
      if (priorityDiff !== 0) return priorityDiff;
      return b.quantity - a.quantity;
    });

    return sorted[0] || null;
  }

  private extractSpeciesId(itemId: string): string {
    if (itemId.startsWith('seed:')) {
      return itemId.slice(5); // Remove 'seed:' prefix
    }
    if (itemId.endsWith('_seed')) {
      return itemId.slice(0, -5); // Remove '_seed' suffix
    }
    return itemId;
  }
}

/**
 * WaterBehavior - Find plants that need watering and water them
 *
 * Agents will autonomously find plants with low hydration and water them.
 */
export class WaterBehavior extends BaseBehavior {
  readonly name = 'water' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;

    // Stop moving while deciding what to water
    this.stopMovement(entity);

    // Find nearest plant that needs watering
    const nearestDryPlant = this.findNearestDryPlant(world, position);

    if (!nearestDryPlant) {
      return { complete: true, reason: 'No plants need watering' };
    }

    // Check if agent is adjacent to the plant
    const dx = nearestDryPlant.x - position.x;
    const dy = nearestDryPlant.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const MAX_WATER_DISTANCE = Math.sqrt(2);

    if (distance > MAX_WATER_DISTANCE) {
      // Agent is too far - move towards plant

      const speed = 1.0;
      const velocityX = (dx / distance) * speed;
      const velocityY = (dy / distance) * speed;

      entity.updateComponent<MovementComponent>(ComponentType.Movement, (current) => ({
        ...current,
        targetX: nearestDryPlant.x,
        targetY: nearestDryPlant.y,
        velocityX,
        velocityY,
      }));

      return;
    }

    // Agent is adjacent - water the plant

    world.eventBus.emit({
      type: 'action:water',
      source: entity.id,
      data: {
        agentId: entity.id,
        plantId: nearestDryPlant.plantId,
        position: { x: nearestDryPlant.x, y: nearestDryPlant.y },
      },
    });

    // Apply watering directly to plant (20 hydration boost)
    const plantEntity = world.getEntity(nearestDryPlant.plantId);
    if (plantEntity) {
      const plantImpl = plantEntity as EntityImpl;
      plantImpl.updateComponent<any>(ComponentType.Plant, (plant) => ({
        ...plant,
        _hydration: Math.min(100, (plant._hydration ?? plant.hydration ?? 50) + 20),
      }));
    }

    // Switch to farm behavior briefly, then continue
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'farm',
      behaviorState: { lastAction: 'water' },
      behaviorCompleted: true,
    }));
  }

  private findNearestDryPlant(
    world: World,
    position: PositionComponent
  ): { plantId: string; x: number; y: number; hydration: number; distance: number } | null {
    const WATER_SEARCH_RADIUS = 15;
    const HYDRATION_THRESHOLD = 50; // Plants below this need watering
    let nearestDryPlant: { plantId: string; x: number; y: number; hydration: number; distance: number } | null = null;

    // Use ChunkSpatialQuery if available (fast, chunk-based)
    if (world.spatialQuery) {
      const plantsInRadius = world.spatialQuery.getEntitiesInRadius(
        position.x, position.y, WATER_SEARCH_RADIUS,
        [ComponentType.Plant]
      );

      for (const { entity: plantEntity, distance } of plantsInRadius) {
        const plantImpl = plantEntity as EntityImpl;
        const plant = plantImpl.getComponent<any>(ComponentType.Plant);
        const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);

        if (!plant || !plantPos) continue;

        // Skip dead plants
        if (plant.stage === 'dead' || plant.stage === 'decay') continue;

        // Check if plant needs water
        const hydration = plant._hydration ?? plant.hydration ?? 50;
        if (hydration >= HYDRATION_THRESHOLD) continue;

        // Prefer driest plants that are closest
        const priority = distance + (hydration / 10); // Lower is better
        const currentPriority = nearestDryPlant
          ? nearestDryPlant.distance + (nearestDryPlant.hydration / 10)
          : Infinity;

        if (priority < currentPriority) {
          nearestDryPlant = {
            plantId: plantEntity.id,
            x: plantPos.x,
            y: plantPos.y,
            hydration,
            distance,
          };
        }
      }

      return nearestDryPlant;
    }

    // Fallback: Use global query (slow, only when ChunkSpatialQuery not available)
    const plants = world.query().with(ComponentType.Plant).with(ComponentType.Position).executeEntities();

    for (const plantEntity of plants) {
      const plantImpl = plantEntity as EntityImpl;
      const plant = plantImpl.getComponent<any>(ComponentType.Plant);
      const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);

      if (!plant || !plantPos) continue;

      // Skip dead plants
      if (plant.stage === 'dead' || plant.stage === 'decay') continue;

      // Check if plant needs water
      const hydration = plant._hydration ?? plant.hydration ?? 50;
      if (hydration >= HYDRATION_THRESHOLD) continue;

      const dx = plantPos.x - position.x;
      const dy = plantPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > WATER_SEARCH_RADIUS) continue;

      // Prefer driest plants that are closest
      const priority = distance + (hydration / 10); // Lower is better
      const currentPriority = nearestDryPlant
        ? nearestDryPlant.distance + (nearestDryPlant.hydration / 10)
        : Infinity;

      if (priority < currentPriority) {
        nearestDryPlant = {
          plantId: plantEntity.id,
          x: plantPos.x,
          y: plantPos.y,
          hydration,
          distance,
        };
      }
    }

    return nearestDryPlant;
  }
}

/**
 * HarvestBehavior - Find mature plants and harvest them
 *
 * Agents will autonomously find plants ready for harvest.
 */
export class HarvestBehavior extends BaseBehavior {
  readonly name = 'harvest' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>(ComponentType.Position)!;
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);

    // Stop moving while deciding what to harvest
    this.stopMovement(entity);

    // Check if inventory is full
    if (inventory) {
      const usedSlots = inventory.slots.filter(s => s.itemId && s.quantity > 0).length;
      if (usedSlots >= inventory.slots.length) {
        this.switchTo(entity, 'deposit_items', {});
        return { complete: true, reason: 'Inventory full' };
      }
    }

    // Find nearest harvestable plant
    const nearestHarvestable = this.findNearestHarvestablePlant(world, position);

    if (!nearestHarvestable) {
      return { complete: true, reason: 'No harvestable plants' };
    }

    // Check if agent is adjacent to the plant
    const dx = nearestHarvestable.x - position.x;
    const dy = nearestHarvestable.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const MAX_HARVEST_DISTANCE = Math.sqrt(2);

    if (distance > MAX_HARVEST_DISTANCE) {
      // Agent is too far - move towards plant

      const speed = 1.0;
      const velocityX = (dx / distance) * speed;
      const velocityY = (dy / distance) * speed;

      entity.updateComponent<MovementComponent>(ComponentType.Movement, (current) => ({
        ...current,
        targetX: nearestHarvestable.x,
        targetY: nearestHarvestable.y,
        velocityX,
        velocityY,
      }));

      return;
    }

    // Agent is adjacent - harvest the plant

    world.eventBus.emit({
      type: 'action:harvest',
      source: entity.id,
      data: {
        agentId: entity.id,
        plantId: nearestHarvestable.plantId,
        speciesId: nearestHarvestable.speciesId,
        position: { x: nearestHarvestable.x, y: nearestHarvestable.y },
      },
    });

    // Switch to farm behavior to wait for action completion
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'farm',
      behaviorState: { lastAction: 'harvest' },
      behaviorCompleted: true,
    }));
  }

  private findNearestHarvestablePlant(
    world: World,
    position: PositionComponent
  ): { plantId: string; x: number; y: number; speciesId: string; distance: number } | null {
    const HARVEST_SEARCH_RADIUS = 15;
    const HARVESTABLE_STAGES = ['mature', 'seeding', 'fruiting'];
    let nearestHarvestable: { plantId: string; x: number; y: number; speciesId: string; distance: number } | null = null;

    // Use ChunkSpatialQuery if available (fast, chunk-based)
    if (world.spatialQuery) {
      const plantsInRadius = world.spatialQuery.getEntitiesInRadius(
        position.x, position.y, HARVEST_SEARCH_RADIUS,
        [ComponentType.Plant]
      );

      for (const { entity: plantEntity, distance } of plantsInRadius) {
        const plantImpl = plantEntity as EntityImpl;
        const plant = plantImpl.getComponent<any>(ComponentType.Plant);
        const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);

        if (!plant || !plantPos) continue;

        // Check if plant is harvestable
        if (!HARVESTABLE_STAGES.includes(plant.stage)) continue;
        if (plant.fruitCount <= 0 && plant.seedsProduced <= 0) continue;

        if (!nearestHarvestable || distance < nearestHarvestable.distance) {
          nearestHarvestable = {
            plantId: plantEntity.id,
            x: plantPos.x,
            y: plantPos.y,
            speciesId: plant.speciesId,
            distance,
          };
        }
      }

      return nearestHarvestable;
    }

    // Fallback: Use global query (slow, only when ChunkSpatialQuery not available)
    const plants = world.query().with(ComponentType.Plant).with(ComponentType.Position).executeEntities();

    for (const plantEntity of plants) {
      const plantImpl = plantEntity as EntityImpl;
      const plant = plantImpl.getComponent<any>(ComponentType.Plant);
      const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);

      if (!plant || !plantPos) continue;

      // Check if plant is harvestable
      if (!HARVESTABLE_STAGES.includes(plant.stage)) continue;
      if (plant.fruitCount <= 0 && plant.seedsProduced <= 0) continue;

      const dx = plantPos.x - position.x;
      const dy = plantPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > HARVEST_SEARCH_RADIUS) continue;

      if (!nearestHarvestable || distance < nearestHarvestable.distance) {
        nearestHarvestable = {
          plantId: plantEntity.id,
          x: plantPos.x,
          y: plantPos.y,
          speciesId: plant.speciesId,
          distance,
        };
      }
    }

    return nearestHarvestable;
  }
}

/**
 * Standalone functions for use with BehaviorRegistry.
 * @deprecated Use *WithContext versions for better performance
 */
export function farmBehavior(entity: EntityImpl, world: World): void {
  const behavior = new FarmBehavior();
  behavior.execute(entity, world);
}

export function tillBehavior(entity: EntityImpl, world: World): void {
  const behavior = new TillBehavior();
  behavior.execute(entity, world);
}

export function plantBehavior(entity: EntityImpl, world: World): void {
  const behavior = new PlantBehavior();
  behavior.execute(entity, world);
}

export function waterBehavior(entity: EntityImpl, world: World): void {
  const behavior = new WaterBehavior();
  behavior.execute(entity, world);
}

export function harvestBehavior(entity: EntityImpl, world: World): void {
  const behavior = new HarvestBehavior();
  behavior.execute(entity, world);
}

/**
 * Modern versions using BehaviorContext
 * @example registerBehaviorWithContext('till', tillBehaviorWithContext);
 */

export function tillBehaviorWithContext(ctx: import('../BehaviorContext.js').BehaviorContext): import('../BehaviorContext.js').BehaviorResult | void {
  const { inventory } = ctx;

  ctx.stopMovement();

  const hasSeeds = inventory?.slots?.some((slot) =>
    slot.itemId && (slot.itemId.includes('seed') || slot.itemId === 'wheat_seed' || slot.itemId === 'carrot_seed')
  );

  if (!hasSeeds) {
    return ctx.complete('No seeds to plant');
  }

  // Delegate to class for tile finding logic
  const behavior = new TillBehavior();
  interface WorldWithTiles {
    tick: number;
    getTileAt?: (x: number, y: number) => { terrain: string; tilled?: boolean } | undefined;
    eventBus: {
      emit: (event: unknown) => void;
    };
  }
  const world: WorldWithTiles = {
    tick: ctx.tick,
    getTileAt: (ctx as unknown as { world?: WorldWithTiles }).world?.getTileAt,
    eventBus: { emit: (e: any) => ctx.emit(e) }
  };
  return behavior.execute(ctx.entity, world as unknown as World);
}

export function plantBehaviorWithContext(ctx: import('../BehaviorContext.js').BehaviorContext): import('../BehaviorContext.js').BehaviorResult | void {
  const { inventory } = ctx;

  ctx.stopMovement();

  // Delegate to class implementation which uses spatial queries
  const behavior = new PlantBehavior();
  interface WorldWithTiles {
    tick: number;
    getTileAt?: (x: number, y: number) => { tilled?: boolean; plantability?: number } | undefined;
    getEntity: (id: string) => import('../../ecs/Entity.js').Entity | undefined;
    eventBus: {
      emit: (event: unknown) => void;
    };
  }
  const world: WorldWithTiles = {
    tick: ctx.tick,
    getTileAt: (ctx as unknown as { world?: WorldWithTiles }).world?.getTileAt,
    getEntity: (id: string) => ctx.getEntity(id),
    eventBus: { emit: (e: any) => ctx.emit(e) },
  };

  return behavior.execute(ctx.entity, world as unknown as World);
}

export function waterBehaviorWithContext(ctx: import('../BehaviorContext.js').BehaviorContext): import('../BehaviorContext.js').BehaviorResult | void {
  ctx.stopMovement();

  // Find nearest dry plant using context
  const WATER_SEARCH_RADIUS = 15;
  const HYDRATION_THRESHOLD = 50;
  const nearbyPlants = ctx.getEntitiesInRadius(WATER_SEARCH_RADIUS, [ComponentType.Plant]);

  let nearestDryPlant: { plantId: string; x: number; y: number; hydration: number; distance: number } | null = null;

  for (const { entity: plantEntity, distance } of nearbyPlants) {
    const plantImpl = plantEntity as EntityImpl;
    interface PlantWithHydration extends Component {
      stage?: string;
      _hydration?: number;
      hydration?: number;
    }
    const plant = plantImpl.getComponent(ComponentType.Plant) as PlantWithHydration | undefined;
    const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);

    if (!plant || !plantPos) continue;
    if (plant.stage === 'dead' || plant.stage === 'decay') continue;

    const hydration = plant._hydration ?? plant.hydration ?? 50;
    if (hydration >= HYDRATION_THRESHOLD) continue;

    const priority = distance + (hydration / 10);
    const currentPriority = nearestDryPlant
      ? nearestDryPlant.distance + (nearestDryPlant.hydration / 10)
      : Infinity;

    if (priority < currentPriority) {
      nearestDryPlant = {
        plantId: plantEntity.id,
        x: plantPos.x,
        y: plantPos.y,
        hydration,
        distance,
      };
    }
  }

  if (!nearestDryPlant) {
    return ctx.complete('No plants need watering');
  }

  const dx = nearestDryPlant.x - ctx.position.x;
  const dy = nearestDryPlant.y - ctx.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const MAX_WATER_DISTANCE = Math.sqrt(2);

  if (distance > MAX_WATER_DISTANCE) {
    ctx.setVelocity((dx / distance) * 1.0, (dy / distance) * 1.0);
    return;
  }

  ctx.emit({
    type: 'action:water',
    data: {
      agentId: ctx.entity.id,
      plantId: nearestDryPlant.plantId,
      position: { x: nearestDryPlant.x, y: nearestDryPlant.y },
    },
  });

  const plantEntity = ctx.getEntity(nearestDryPlant.plantId);
  if (plantEntity) {
    const plantImpl = plantEntity as EntityImpl;
    plantImpl.updateComponent(ComponentType.Plant, (plant) => {
      const plantWithHydration = plant as unknown as { _hydration?: number; hydration?: number };
      return {
        ...plant,
        _hydration: Math.min(100, (plantWithHydration._hydration ?? plantWithHydration.hydration ?? 50) + 20),
      };
    });
  }

  return ctx.switchTo('farm', { lastAction: 'water' });
}

export function harvestBehaviorWithContext(ctx: import('../BehaviorContext.js').BehaviorContext): import('../BehaviorContext.js').BehaviorResult | void {
  const { inventory } = ctx;

  ctx.stopMovement();

  if (inventory) {
    const usedSlots = inventory.slots.filter(s => s.itemId && s.quantity > 0).length;
    if (usedSlots >= inventory.slots.length) {
      return ctx.switchTo('deposit_items', {});
    }
  }

  // Find nearest harvestable plant using context
  const HARVEST_SEARCH_RADIUS = 15;
  const HARVESTABLE_STAGES = ['mature', 'seeding', 'fruiting'];
  const nearbyPlants = ctx.getEntitiesInRadius(HARVEST_SEARCH_RADIUS, [ComponentType.Plant]);

  let nearestHarvestable: { plantId: string; x: number; y: number; speciesId: string; distance: number } | null = null;

  for (const { entity: plantEntity, distance } of nearbyPlants) {
    const plantImpl = plantEntity as EntityImpl;
    interface PlantWithHarvest extends Component {
      stage?: string;
      fruitCount?: number;
      seedsProduced?: number;
      speciesId: string;
    }
    const plant = plantImpl.getComponent(ComponentType.Plant) as PlantWithHarvest | undefined;
    const plantPos = plantImpl.getComponent<PositionComponent>(ComponentType.Position);

    if (!plant || !plantPos) continue;
    if (!HARVESTABLE_STAGES.includes(plant.stage || '')) continue;
    if ((plant.fruitCount ?? 0) <= 0 && (plant.seedsProduced ?? 0) <= 0) continue;

    if (!nearestHarvestable || distance < nearestHarvestable.distance) {
      nearestHarvestable = {
        plantId: plantEntity.id,
        x: plantPos.x,
        y: plantPos.y,
        speciesId: plant.speciesId,
        distance,
      };
    }
  }

  if (!nearestHarvestable) {
    return ctx.complete('No harvestable plants');
  }

  const dx = nearestHarvestable.x - ctx.position.x;
  const dy = nearestHarvestable.y - ctx.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const MAX_HARVEST_DISTANCE = Math.sqrt(2);

  if (distance > MAX_HARVEST_DISTANCE) {
    ctx.setVelocity((dx / distance) * 1.0, (dy / distance) * 1.0);
    return;
  }

  ctx.emit({
    type: 'action:harvest',
    data: {
      agentId: ctx.entity.id,
      plantId: nearestHarvestable.plantId,
      speciesId: nearestHarvestable.speciesId,
      position: { x: nearestHarvestable.x, y: nearestHarvestable.y },
    },
  });

  return ctx.switchTo('farm', { lastAction: 'harvest' });
}
