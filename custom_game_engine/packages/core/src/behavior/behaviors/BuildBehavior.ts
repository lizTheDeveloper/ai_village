/**
 * BuildBehavior - Building construction behavior
 *
 * Agent attempts to build a structure at their current location.
 *
 * Two construction systems:
 * 1. Entity-based (crafting benches, utility buildings) - instant placement
 * 2. Tile-based (shelters, structures with walls/doors) - material transport + construction
 *
 * Handles:
 * - Resource validation and gathering
 * - Finding valid build spots
 * - Initiating construction
 * - Aggregating resources from storage
 *
 * Part of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { EntityImpl } from '../../ecs/Entity.js';
import type { World } from '../../ecs/World.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { PositionComponent } from '../../components/PositionComponent.js';
import type { InventoryComponent } from '../../components/InventoryComponent.js';
import type { BuildingComponent, BuildingType } from '../../components/BuildingComponent.js';
import type { ResourceCost } from '../../buildings/BuildingBlueprintRegistry.js';
import type { GameEvent } from '../../events/GameEvent.js';
import type { EventType } from '../../events/EventMap.js';
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { getPosition } from '../../utils/componentHelpers.js';
import { createPlacementScorer } from '../../services/PlacementScorer.js';
import { ComponentType } from '../../types/ComponentType.js';
import { BuildingType as BT } from '../../types/BuildingType.js';
import { getTileConstructionSystem } from '../../systems/TileConstructionSystem.js';
import { getTileBasedBlueprintRegistry, calculateDimensions } from '../../buildings/TileBasedBlueprintRegistry.js';

/**
 * ChunkSpatialQuery interface for efficient nearby entity lookups.
 * Actual implementation is from @ai-village/world package.
 */
interface ChunkSpatialQuery {
  getEntitiesInRadius(
    x: number,
    y: number,
    radius: number,
    componentTypes: string[]
  ): Array<{ entity: EntityImpl; distance: number }>;
}

// ChunkSpatialQuery is now available via world.spatialQuery

interface WorldWithBuilding extends World {
  buildingRegistry?: {
    tryGet(buildingType: BuildingType): {
      resourceCost: ResourceCost[];
      width?: number;
      height?: number;
    } | null;
  };
  getTerrainAt?(x: number, y: number): string | null;
  initiateConstruction(
    position: { x: number; y: number },
    buildingType: string,
    inventory: Record<string, number>,
    builderId?: string
  ): EntityImpl;
}

/**
 * Entity-based buildings — all building types that have blueprints in
 * BuildingBlueprintRegistry. Includes furniture, crafting stations, and
 * residential/structural buildings.
 */
const ENTITY_BASED_BUILDINGS: BuildingType[] = [
  BT.Workbench,
  BT.StorageChest,
  BT.Campfire,
  BT.Well,
  BT.StorageBox,
  BT.Bed,
  BT.Bedroll,
  BT.Barn,
  BT.Forge,
  BT.Loom,
  BT.Oven,
];

/**
 * Map of LLM-generated building names to BuildingBlueprintRegistry IDs.
 * LLMs often say "tent", "house", "shelter" — these need mapping to real IDs.
 */
const BUILDING_NAME_ALIASES: Record<string, string> = {
  'tent': 'tent',
  'lean-to': 'lean-to',
  'shelter': 'tent',
  'house': 'small_house',
  'small_house': 'small_house',
  'barn': 'barn',
  'workshop': 'workshop',
  'storage': 'storage-chest',
  'storage_shed': 'storage-chest',
  'hut': 'tent',
};

/**
 * BuildBehavior - Construct buildings
 */
export class BuildBehavior extends BaseBehavior {
  readonly name = 'build' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent(ComponentType.Position)!;
    const agent = entity.getComponent(ComponentType.Agent)!;
    const inventory = entity.getComponent(ComponentType.Inventory);

    // Stop moving while building
    this.stopMovement(entity);

    // Check if we're waiting for an existing building to complete
    const behaviorState = agent.behaviorState;
    if (behaviorState && 'waitingForBuildingId' in behaviorState && typeof behaviorState.waitingForBuildingId === 'string') {
      return this.checkBuildingCompletion(entity, world, behaviorState.waitingForBuildingId);
    }

    // Get and validate building type
    let buildingType: BuildingType = BT.Campfire;
    if (behaviorState && 'buildingType' in behaviorState && typeof behaviorState.buildingType === 'string') {
      buildingType = behaviorState.buildingType as BuildingType;
    }

    // STORAGE BUILDING LIMIT CHECK: Prevent over-building storage structures
    // Dynamic limit: 1 storage per 2 agents, max 10
    if (buildingType === BT.StorageChest || buildingType === 'storage-box') {
      const agents = world.query().with(ComponentType.Agent).executeEntities();
      const agentCount = Math.max(1, agents.length);
      const maxStorage = Math.min(Math.ceil(agentCount / 2), 10);

      const storageBuildings = world.query().with(ComponentType.Building).executeEntities();
      let storageCount = 0;
      for (const b of storageBuildings) {
        const bc = (b as EntityImpl).getComponent(ComponentType.Building);
        if (bc?.buildingType === BT.StorageChest || bc?.buildingType === 'storage-box') {
          storageCount++;
        }
      }

      if (storageCount >= maxStorage) {
        world.eventBus.emit({
          type: 'construction:failed',
          source: entity.id,
          data: {
            buildingId: `${buildingType}_${Date.now()}`,
            reason: `Storage limit reached (${storageCount}/${maxStorage}) - use existing storage instead`,
            builderId: entity.id,
            agentId: entity.id,
          },
        });

        return { complete: true, reason: `Storage limit reached (${storageCount}/${maxStorage})` };
      }
    }

    // CAMPFIRE DUPLICATE PREVENTION: Before building a campfire, check if one exists nearby
    // This prevents the over-building issue where agents create 85+ campfires
    if (buildingType === BT.Campfire) {
      const CAMPFIRE_CHECK_RADIUS = 200; // Match BuildingSystem's cancellation radius

      // Fast path: Use chunk queries to find nearby buildings
      if (world.spatialQuery) {
        const nearbyBuildings = world.spatialQuery.getEntitiesInRadius(
          position.x,
          position.y,
          CAMPFIRE_CHECK_RADIUS,
          [ComponentType.Building]
        );

        for (const { entity: building, distance } of nearbyBuildings) {
          // Cast required: ChunkSpatialQuery returns Entity, but we need EntityImpl for component access
          const buildingImpl = building as EntityImpl;
          const buildingComp = buildingImpl.getComponent(ComponentType.Building);

          if (buildingComp?.buildingType === BT.Campfire) {
            // Campfire already exists nearby - use that instead of building a new one
            world.eventBus.emit({
              type: 'construction:failed',
              source: entity.id,
              data: {
                buildingId: `campfire_${Date.now()}`,
                reason: `Campfire already exists within ${CAMPFIRE_CHECK_RADIUS} tiles - use seek_warmth instead`,
                builderId: entity.id,
                agentId: entity.id,
              },
            });

            return { complete: true, reason: 'Campfire already exists nearby - use seek_warmth behavior instead' };
          }
        }
      } else {
        // Fallback: Global query with distance filtering
        const nearbyBuildings = world.query().with(ComponentType.Building).with(ComponentType.Position).executeEntities();

        for (const building of nearbyBuildings) {
          // Cast required: World.query returns Entity, but we need EntityImpl for component access
          const buildingImpl = building as EntityImpl;
          const buildingComp = buildingImpl.getComponent(ComponentType.Building);
          const buildingPos = buildingImpl.getComponent(ComponentType.Position);

          if (buildingComp?.buildingType === BT.Campfire && buildingPos) {
            const dx = position.x - buildingPos.x;
            const dy = position.y - buildingPos.y;
            const distanceSquared = dx * dx + dy * dy;

            if (distanceSquared <= CAMPFIRE_CHECK_RADIUS * CAMPFIRE_CHECK_RADIUS) {
              // Campfire already exists nearby - use that instead of building a new one
              world.eventBus.emit({
                type: 'construction:failed',
                source: entity.id,
                data: {
                  buildingId: `campfire_${Date.now()}`,
                  reason: `Campfire already exists within ${CAMPFIRE_CHECK_RADIUS} tiles - use seek_warmth instead`,
                  builderId: entity.id,
                  agentId: entity.id,
                },
              });

              return { complete: true, reason: 'Campfire already exists nearby - use seek_warmth behavior instead' };
            }
          }
        }
      }
    }

    // Resolve LLM-generated building names to actual blueprint IDs
    const aliasedType = BUILDING_NAME_ALIASES[buildingType];
    if (aliasedType) {
      buildingType = aliasedType as BuildingType;
    }

    // All building types route through entity-based construction
    // (tile-based construction system has unregistered blueprint IDs)

    if (!inventory) {
      // No inventory - cannot build
      world.eventBus.emit({
        type: 'construction:failed',
        source: entity.id,
        data: {
          buildingId: `${buildingType}_${Date.now()}`,
          reason: 'Agent missing InventoryComponent',
          builderId: entity.id,
          agentId: entity.id,
        },
      });

      return { complete: true, reason: 'No inventory component' };
    }

    // Get blueprint to check resource requirements
    // Note: buildingRegistry not in World interface but exists at runtime
    const worldWithBuilding = world as WorldWithBuilding;
    const blueprint = worldWithBuilding.buildingRegistry?.tryGet(buildingType);
    if (!blueprint) {
      console.error(`[BuildBehavior] Unknown building type: ${buildingType}`);
      return { complete: true, reason: 'Unknown building type' };
    }

    // Convert agent inventory to resource record format (needed for both checks)
    const agentInventoryRecord: Record<string, number> = {};
    for (const slot of inventory.slots) {
      if (slot.itemId) {
        agentInventoryRecord[slot.itemId] = (agentInventoryRecord[slot.itemId] || 0) + slot.quantity;
      }
    }

    // Aggregate resources from agent + all storage buildings BEFORE checking missing
    const totalResources = this.aggregateAvailableResources(world, agentInventoryRecord);

    // Check what resources we're missing (against aggregated total, not just inventory)
    const missing = this.getMissingResourcesFromTotal(totalResources, blueprint.resourceCost);

    if (missing.length > 0) {
      // Switch to gathering the first missing resource
      const firstMissing = missing[0]!;

      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behavior: 'gather',
        behaviorState: {
          resourceType: firstMissing.resourceId,
          targetAmount: firstMissing.amountRequired,
          returnToBuild: buildingType, // Remember what we're gathering for
        },
      }));

      world.eventBus.emit({
        type: 'construction:gathering_resources',
        source: entity.id,
        data: {
          buildingId: `${buildingType}_${Date.now()}`,
          builderId: entity.id,
          agentId: entity.id,
        },
      });

      return;
    }

    // Find optimal build spot using intelligent placement scoring
    const scorer = createPlacementScorer(world);
    const bestPlacement = scorer.findBestPlacement(entity, buildingType, 10);

    // Use scored placement or fall back to simple method
    let buildSpot: { x: number; y: number } | null = null;

    if (bestPlacement) {
      buildSpot = { x: bestPlacement.x, y: bestPlacement.y };
    } else {
      // Fall back to simple placement if scorer finds nothing
      buildSpot = this.findValidBuildSpot(
        world,
        position,
        blueprint.width || 1,
        blueprint.height || 1
      );
    }

    if (!buildSpot) {
      world.eventBus.emit({
        type: 'construction:failed',
        source: entity.id,
        data: {
          buildingId: `${buildingType}_${Date.now()}`,
          reason: 'No valid placement location found',
          builderId: entity.id,
          agentId: entity.id,
        },
      });

      return { complete: true, reason: 'No valid build spot' };
    }

    // totalResources was already calculated above (includes inventory + storage)
    // Try to initiate construction
    // Note: initiateConstruction not in World interface but exists at runtime
    try {
      const buildingEntity = worldWithBuilding.initiateConstruction(
        { x: buildSpot.x, y: buildSpot.y },
        buildingType,
        totalResources,
        entity.id // Pass builder ID for memory tracking
      );

      // Deduct consumed resources from actual inventories (agent + storage buildings)
      this.deductResources(entity, world, blueprint.resourceCost);

      // Store the building ID and wait for construction to complete
      entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
        ...current,
        behaviorState: {
          ...current.behaviorState,
          waitingForBuildingId: buildingEntity.id,
          buildingType,
        },
      }));

      // Return incomplete - we'll check for completion on next tick
      return { complete: false, reason: 'Waiting for construction to complete' };
    } catch (error) {
      // Construction failed

      world.eventBus.emit({
        type: 'construction:failed',
        source: entity.id,
        data: {
          buildingId: `${buildingType}_${Date.now()}`,
          reason: (error as Error).message,
          builderId: entity.id,
          agentId: entity.id,
        },
      });

      return { complete: true, reason: 'Construction failed' };
    }
  }

  /**
   * Check if a building we started has completed construction
   */
  private checkBuildingCompletion(
    entity: EntityImpl,
    world: World,
    buildingId: string
  ): BehaviorResult | void {
    // Find the building entity
    const buildings = world.query().with(ComponentType.Building).with(ComponentType.Position).executeEntities();

    for (const building of buildings) {
      if (building.id === buildingId) {
        // Cast required: World.query returns Entity, but we need EntityImpl for component access
        const buildingComp = (building as EntityImpl).getComponent(ComponentType.Building);

        if (buildingComp?.isComplete) {
          // Construction complete!

          world.eventBus.emit({
            type: 'building:complete',
            source: entity.id,
            data: {
              buildingId,
              buildingType: buildingComp.buildingType,
              entityId: buildingId,
            },
          });

          return { complete: true, reason: 'Construction complete' };
        } else {
          // Still under construction - log progress periodically
          const progress = buildingComp?.progress ?? 0;
          if (progress % 25 === 0 || progress > 90) {
          }
          // Stay in build behavior, waiting for completion
          return { complete: false, reason: `Construction in progress (${Math.round(progress)}%)` };
        }
      }
    }

    // Building not found - it may have been destroyed or there was an error
    return { complete: true, reason: 'Building not found' };
  }

  /**
   * Check what resources are missing given a total resource map (inventory + storage).
   * This is used to check if we have enough resources across ALL available sources.
   */
  private getMissingResourcesFromTotal(
    totalResources: Record<string, number>,
    costs: ResourceCost[]
  ): ResourceCost[] {
    const missing: ResourceCost[] = [];

    for (const cost of costs) {
      const available = totalResources[cost.resourceId] || 0;

      if (available < cost.amountRequired) {
        missing.push({
          resourceId: cost.resourceId,
          amountRequired: cost.amountRequired - available,
        });
      }
    }

    return missing;
  }

  private findValidBuildSpot(
    world: World,
    agentPos: PositionComponent,
    _width: number,
    _height: number
  ): { x: number; y: number } | null {
    const BUILD_SPOT_CHECK_RADIUS = 5; // Small radius for build spot validation

    // Try positions in expanding radius around agent
    for (let radius = 0; radius <= 2; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const testX = Math.floor(agentPos.x) + dx;
          const testY = Math.floor(agentPos.y) + dy;

          // Check if this spot is valid (not in water, no buildings, etc.)
          // Note: world.getTerrainAt is not typed in World interface but exists at runtime
          const worldWithBuilding = world as WorldWithBuilding;
          const terrain = worldWithBuilding.getTerrainAt?.(testX, testY);
          if (terrain && (terrain === 'grass' || terrain === 'dirt' || terrain === 'sand')) {
            // Check no existing buildings
            let blocked = false;

            // Fast path: Use chunk queries to find nearby buildings
            if (world.spatialQuery) {
              const nearbyBuildings = world.spatialQuery.getEntitiesInRadius(
                testX,
                testY,
                BUILD_SPOT_CHECK_RADIUS,
                [ComponentType.Building]
              );

              for (const { entity: building } of nearbyBuildings) {
                const bPos = getPosition(building);
                if (bPos && Math.abs(bPos.x - testX) < 2 && Math.abs(bPos.y - testY) < 2) {
                  blocked = true;
                  break;
                }
              }
            } else {
              // Fallback: Global query with distance filtering
              const buildings = world.query().with(ComponentType.Building).with(ComponentType.Position).executeEntities();

              for (const building of buildings) {
                const bPos = getPosition(building);
                if (bPos && Math.abs(bPos.x - testX) < 2 && Math.abs(bPos.y - testY) < 2) {
                  blocked = true;
                  break;
                }
              }
            }

            if (!blocked) {
              return { x: testX, y: testY };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Execute tile-based construction (voxel building system)
   * Routes agent to material_transport behavior to gather materials for construction
   */
  private executeTileBasedConstruction(
    entity: EntityImpl,
    world: World,
    blueprintId: string
  ): BehaviorResult | void {
    const position = entity.getComponent(ComponentType.Position)!;

    // Get blueprint from tile-based registry
    const blueprintRegistry = getTileBasedBlueprintRegistry();
    const blueprint = blueprintRegistry.get(blueprintId);

    if (!blueprint) {
      console.error(`[BuildBehavior] Unknown tile-based blueprint: ${blueprintId}`);
      return { complete: true, reason: 'Unknown blueprint' };
    }

    // Get dimensions from layout
    const { width, height } = calculateDimensions(blueprint.layoutString);

    // Find valid build spot
    const buildSpot = this.findValidBuildSpot(world, position, width, height);

    if (!buildSpot) {
      world.eventBus.emit({
        type: 'construction:failed',
        source: entity.id,
        data: {
          buildingId: `${blueprintId}_${Date.now()}`,
          reason: 'No valid placement location found',
          builderId: entity.id,
          agentId: entity.id,
        },
      });

      return { complete: true, reason: 'No valid build spot' };
    }

    // Create construction task via TileConstructionSystem
    const constructionSystem = getTileConstructionSystem();
    const task = constructionSystem.createTask(
      world,
      blueprint,
      buildSpot.x,
      buildSpot.y,
      0, // rotation
      entity.id // createdBy
    );

    // Start the task to transition from 'planned' to 'in_progress'
    constructionSystem.startTask(world, task.id);

    // Emit event
    world.eventBus.emit({
      type: 'construction:task_created',
      source: entity.id,
      data: {
        taskId: task.id,
        blueprintId,
        position: { x: buildSpot.x, y: buildSpot.y },
        builderId: entity.id,
      },
    });

    // Get the first tile needing materials
    const firstTile = constructionSystem.getNextTileNeedingMaterials(task.id);
    if (!firstTile) {
      throw new Error(`[BuildBehavior] No tiles need materials after startTask for ${task.id}`);
    }

    // Switch agent to material_transport behavior to gather materials
    entity.updateComponent<AgentComponent>(ComponentType.Agent, (current) => ({
      ...current,
      behavior: 'material_transport',
      behaviorState: {
        taskId: task.id,
        tileIndex: firstTile.index,
        materialId: firstTile.tile.materialId,
        transportState: 'finding_storage',
      },
    }));

    return { complete: true, reason: 'Switched to material_transport' };
  }

  /**
   * Deduct consumed resources from agent inventory and storage buildings.
   * Pulls from agent inventory first, then storage buildings for any remainder.
   */
  private deductResources(
    entity: EntityImpl,
    world: World,
    costs: ResourceCost[]
  ): void {
    const inventory = entity.getComponent<InventoryComponent>(ComponentType.Inventory);
    if (!inventory) return;

    // Track how much of each resource still needs deducting after agent inventory
    const remaining: Record<string, number> = {};
    for (const cost of costs) {
      remaining[cost.resourceId] = cost.amountRequired;
    }

    // Deduct from agent inventory first
    const updatedSlots = inventory.slots.map(slot => {
      if (!slot.itemId || !remaining[slot.itemId] || remaining[slot.itemId]! <= 0) return slot;
      const deduct = Math.min(slot.quantity, remaining[slot.itemId]!);
      remaining[slot.itemId]! -= deduct;
      return { ...slot, quantity: slot.quantity - deduct };
    });

    entity.updateComponent<InventoryComponent>(ComponentType.Inventory, (current) => ({
      ...current,
      slots: updatedSlots,
    }));

    // Check if anything still needs deducting from storage
    const needsMore = Object.entries(remaining).some(([, amt]) => amt > 0);
    if (!needsMore) return;

    // Deduct remainder from storage buildings
    const storageBuildings = world.query().with(ComponentType.Building).with(ComponentType.Inventory).executeEntities();
    for (const storage of storageBuildings) {
      const storageImpl = storage as EntityImpl;
      const building = storageImpl.getComponent<BuildingComponent>(ComponentType.Building);
      const storageInv = storageImpl.getComponent<InventoryComponent>(ComponentType.Inventory);
      if (!building || !storageInv || !building.isComplete) continue;
      if (building.buildingType !== BT.StorageChest && building.buildingType !== BT.StorageBox) continue;

      let modified = false;
      const newSlots = storageInv.slots.map(slot => {
        if (!slot.itemId || !remaining[slot.itemId] || remaining[slot.itemId]! <= 0) return slot;
        const deduct = Math.min(slot.quantity, remaining[slot.itemId]!);
        remaining[slot.itemId]! -= deduct;
        modified = true;
        return { ...slot, quantity: slot.quantity - deduct };
      });

      if (modified) {
        storageImpl.updateComponent<InventoryComponent>(ComponentType.Inventory, (current) => ({
          ...current,
          slots: newSlots,
        }));
      }

      if (Object.entries(remaining).every(([, amt]) => amt <= 0)) break;
    }
  }

  private aggregateAvailableResources(
    world: World,
    agentInventory: Record<string, number>
  ): Record<string, number> {
    // Start with agent's inventory
    const totalResources = { ...agentInventory };

    // Find all storage buildings with inventory
    const storageBuildings = world.query().with(ComponentType.Building).with(ComponentType.Inventory).executeEntities();

    for (const storage of storageBuildings) {
      // Cast required: World.query returns Entity, but we need EntityImpl for component access
      const storageImpl = storage as EntityImpl;
      const building = storageImpl.getComponent(ComponentType.Building);
      const storageInv = storageImpl.getComponent(ComponentType.Inventory);

      if (!building || !storageInv || !building.isComplete) continue;

      // Only count storage buildings (not agents or other entities)
      if (building.buildingType !== BT.StorageChest && building.buildingType !== BT.StorageBox) {
        continue;
      }

      // Add storage inventory to total
      for (const slot of storageInv.slots) {
        if (slot.itemId && slot.quantity > 0) {
          totalResources[slot.itemId] = (totalResources[slot.itemId] || 0) + slot.quantity;
        }
      }
    }

    return totalResources;
  }
}

/**
 * Modern version using BehaviorContext.
 * @example registerBehaviorWithContext('build', buildBehaviorWithContext);
 */
export function buildBehaviorWithContext(ctx: import('../BehaviorContext.js').BehaviorContext): import('../BehaviorContext.js').BehaviorResult | void {
  const { inventory } = ctx;

  ctx.stopMovement();

  // Check if waiting for building completion
  const waitingForBuildingId = ctx.getState<string>('waitingForBuildingId');
  if (waitingForBuildingId) {
    const buildingEntity = ctx.getEntity(waitingForBuildingId);
    if (!buildingEntity) {
      return ctx.complete('Building not found');
    }

    // Cast required: Entity interface doesn't expose component access methods
    const buildingImpl = buildingEntity as EntityImpl;
    const buildingComp = buildingImpl.getComponent(ComponentType.Building);

    if (buildingComp?.isComplete) {
      ctx.emit({
        type: 'building:complete',
        data: {
          buildingId: waitingForBuildingId,
          buildingType: buildingComp.buildingType,
          entityId: waitingForBuildingId,
        },
      });
      return ctx.complete('Construction complete');
    }

    const progress = buildingComp?.progress ?? 0;
    return { complete: false, reason: `Construction in progress (${Math.round(progress)}%)` };
  }

  let buildingType = ctx.getState<BuildingType>('buildingType') || BT.Campfire;

  // STORAGE BUILDING LIMIT CHECK: Prevent over-building storage structures
  if (buildingType === BT.StorageChest || buildingType === 'storage-box') {
    // Get all buildings to count storage
    const allBuildings = ctx.getEntitiesInRadius(1000, [ComponentType.Building]);
    let storageCount = 0;
    for (const { entity: building } of allBuildings) {
      const buildingImpl = building as EntityImpl;
      const bc = buildingImpl.getComponent(ComponentType.Building);
      if (bc?.buildingType === BT.StorageChest || bc?.buildingType === 'storage-box') {
        storageCount++;
      }
    }

    // Count agents for dynamic limit
    const allAgents = ctx.getEntitiesInRadius(1000, [ComponentType.Agent]);
    const agentCount = Math.max(1, allAgents.length);
    const maxStorage = Math.min(Math.ceil(agentCount / 2), 10);

    if (storageCount >= maxStorage) {
      ctx.emit({
        type: 'construction:failed',
        data: {
          buildingId: `${buildingType}_${Date.now()}`,
          reason: `Storage limit reached (${storageCount}/${maxStorage})`,
          builderId: ctx.entity.id,
          agentId: ctx.entity.id,
        },
      });

      return ctx.complete(`Storage limit reached (${storageCount}/${maxStorage})`);
    }
  }

  // CAMPFIRE DUPLICATE PREVENTION
  if (buildingType === BT.Campfire) {
    const CAMPFIRE_CHECK_RADIUS = 200;
    const nearbyBuildings = ctx.getEntitiesInRadius(CAMPFIRE_CHECK_RADIUS, [ComponentType.Building]);

    for (const { entity: building } of nearbyBuildings) {
      // Cast required: Entity interface doesn't expose component access methods
      const buildingImpl = building as EntityImpl;
      const buildingComp = buildingImpl.getComponent(ComponentType.Building);

      if (buildingComp?.buildingType === BT.Campfire) {
        ctx.emit({
          type: 'construction:failed',
          data: {
            buildingId: `campfire_${Date.now()}`,
            reason: `Campfire already exists within ${CAMPFIRE_CHECK_RADIUS} tiles`,
            builderId: ctx.entity.id,
            agentId: ctx.entity.id,
          },
        });

        return ctx.complete('Campfire already exists nearby - use seek_warmth behavior instead');
      }
    }
  }

  // Delegate to class for complex building logic
  const behavior = new BuildBehavior();
  return behavior.execute(ctx.entity, ctx.world);
}
