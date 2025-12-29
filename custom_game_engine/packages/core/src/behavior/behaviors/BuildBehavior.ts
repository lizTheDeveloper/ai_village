/**
 * BuildBehavior - Building construction behavior
 *
 * Agent attempts to build a structure at their current location.
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
import { BaseBehavior, type BehaviorResult } from './BaseBehavior.js';
import { getPosition } from '../../utils/componentHelpers.js';
import { createPlacementScorer } from '../../services/PlacementScorer.js';

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

/** Valid building types that can be constructed */
const VALID_BUILDING_TYPES: BuildingType[] = [
  'workbench',
  'storage-chest',
  'campfire',
  'tent',
  'well',
  'lean-to',
  'storage-box',
  'bed',
  'bedroll',
];

/**
 * BuildBehavior - Construct buildings
 */
export class BuildBehavior extends BaseBehavior {
  readonly name = 'build' as const;

  execute(entity: EntityImpl, world: World): BehaviorResult | void {
    const position = entity.getComponent<PositionComponent>('position')!;
    const agent = entity.getComponent<AgentComponent>('agent')!;
    const inventory = entity.getComponent<InventoryComponent>('inventory');

    // Stop moving while building
    this.stopMovement(entity);

    // Check if we're waiting for an existing building to complete
    const waitingForBuildingId = agent.behaviorState?.waitingForBuildingId as string | undefined;
    if (waitingForBuildingId) {
      return this.checkBuildingCompletion(entity, world, waitingForBuildingId);
    }

    // Get and validate building type
    let buildingType = agent.behaviorState?.buildingType as BuildingType || 'lean-to';


    if (!VALID_BUILDING_TYPES.includes(buildingType)) {
      buildingType = 'lean-to'; // Default to lean-to for shelter
    }

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

      this.switchTo(entity, 'wander', {});
      return { complete: true, reason: 'No inventory component' };
    }

    // Get blueprint to check resource requirements
    // Note: buildingRegistry not in World interface but exists at runtime
    const worldWithBuilding = world as WorldWithBuilding;
    const blueprint = worldWithBuilding.buildingRegistry?.tryGet(buildingType);
    if (!blueprint) {
      console.error(`[BuildBehavior] Unknown building type: ${buildingType}`);
      this.switchTo(entity, 'wander', {});
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

      entity.updateComponent<AgentComponent>('agent', (current) => ({
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

      this.switchTo(entity, 'wander', {});
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


      // Store the building ID and wait for construction to complete
      entity.updateComponent<AgentComponent>('agent', (current) => ({
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

      this.switchTo(entity, 'wander', {});
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
    const buildings = world.query().with('building').with('position').executeEntities();

    for (const building of buildings) {
      if (building.id === buildingId) {
        const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>('building');

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

          this.switchTo(entity, 'wander', {});
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
    this.switchTo(entity, 'wander', {});
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
            const buildings = world.query().with('building').with('position').executeEntities();
            let blocked = false;

            for (const building of buildings) {
              const bPos = getPosition(building);
              if (bPos && Math.abs(bPos.x - testX) < 2 && Math.abs(bPos.y - testY) < 2) {
                blocked = true;
                break;
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

  private aggregateAvailableResources(
    world: World,
    agentInventory: Record<string, number>
  ): Record<string, number> {
    // Start with agent's inventory
    const totalResources = { ...agentInventory };

    // Find all storage buildings with inventory
    const storageBuildings = world.query().with('building').with('inventory').executeEntities();

    for (const storage of storageBuildings) {
      const storageImpl = storage as EntityImpl;
      const building = storageImpl.getComponent<BuildingComponent>('building');
      const storageInv = storageImpl.getComponent<InventoryComponent>('inventory');

      if (!building || !storageInv || !building.isComplete) continue;

      // Only count storage buildings (not agents or other entities)
      if (building.buildingType !== 'storage-chest' && building.buildingType !== 'storage-box') {
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
 * Standalone function for use with BehaviorRegistry.
 */
export function buildBehavior(entity: EntityImpl, world: World): void {
  const behavior = new BuildBehavior();
  behavior.execute(entity, world);
}
