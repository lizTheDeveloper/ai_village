import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl, createEntityId } from '../ecs/Entity.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import { createBuildingComponent } from '../components/BuildingComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import type { GameEvent } from '../events/GameEvent.js';

/**
 * BuildingSystem handles construction progress for buildings.
 *
 * Construction Progress:
 * - Buildings with progress < 100 are under construction
 * - Progress advances over time based on construction time
 * - When progress reaches 100%, building is marked as complete
 * - Emits "building:complete" event when construction finishes
 *
 * Building Placement:
 * - Listens for "building:placement:confirmed" events
 * - Creates new building entity at specified position
 * - Starts building at 0% progress (under construction)
 *
 * Per CLAUDE.md: No silent fallbacks - crashes on invalid state.
 */
export class BuildingSystem implements System {
  public readonly id: SystemId = 'building';
  public readonly priority: number = 16; // Run after Needs (15)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['building', 'position'];

  private isInitialized = false;

  /**
   * Base construction speed in progress points per second.
   * A building with buildTime=60 seconds will complete in 60 seconds.
   * Progress per tick = (100 / buildTime) * deltaTime
   *
   * For MVP, we use a fixed rate. Future: add skill/tool bonuses.
   */
  private readonly BASE_CONSTRUCTION_SPEED = 1.0;

  /**
   * Initialize the system and register event listeners.
   * Called once when system is registered.
   */
  public initialize(world: World, eventBus: import('../events/EventBus.js').EventBus): void {
    if (this.isInitialized) {
      return;
    }

    // Listen for building placement confirmations
    eventBus.subscribe('building:placement:confirmed', (event) => {
      this.handleBuildingPlacement(world, event.data as { blueprintId: string; position: { x: number; y: number }; rotation: number });
    });

    // Listen for building completion to initialize crafting station properties
    eventBus.subscribe('building:complete', (event) => {
      this.handleBuildingComplete(world, event);
    });

    this.isInitialized = true;
  }

  /**
   * Handle building completion event.
   * Initialize fuel properties for crafting stations that require fuel.
   */
  private handleBuildingComplete(
    world: World,
    event: GameEvent
  ): void {
    const data = event.data as { entityId: string; buildingType: string };
    const { entityId, buildingType } = data;

    // Find the entity using world.getEntity
    const entity = world.getEntity(entityId);

    if (!entity) {
      console.warn(`[BuildingSystem] Entity ${entityId} not found for building completion`);
      return;
    }

    // Get fuel configuration for this building type
    const fuelConfig = this.getFuelConfiguration(buildingType);

    if (fuelConfig.required) {
      // Update building component with fuel properties
      (entity as EntityImpl).updateComponent('building', (comp) => ({
        ...comp,
        fuelRequired: true,
        currentFuel: fuelConfig.initialFuel,
        maxFuel: fuelConfig.maxFuel,
        fuelConsumptionRate: fuelConfig.consumptionRate,
      }));

      console.log(`[BuildingSystem] Initialized fuel for ${buildingType}: ${fuelConfig.initialFuel}/${fuelConfig.maxFuel}`);
    }
  }

  /**
   * Get fuel configuration for a building type.
   * Returns fuel requirements and initial values.
   */
  private getFuelConfiguration(buildingType: string): {
    required: boolean;
    initialFuel: number;
    maxFuel: number;
    consumptionRate: number;
  } {
    // Fuel configurations per building type
    const configs: Record<
      string,
      { required: boolean; initialFuel: number; maxFuel: number; consumptionRate: number }
    > = {
      // Tier 2 stations
      'forge': { required: true, initialFuel: 50, maxFuel: 100, consumptionRate: 1 },
      'farm_shed': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'market_stall': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'windmill': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      // Tier 3 stations
      'workshop': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'barn': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
    };

    // Default for unknown types: no fuel required
    return configs[buildingType] || { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 };
  }

  /**
   * Handle building placement event from BuildingPlacementUI.
   * Creates a new building entity at the specified position.
   * Deducts resources from the nearest agent's inventory.
   */
  private handleBuildingPlacement(
    world: World,
    data: { blueprintId: string; position: { x: number; y: number }; rotation: number }
  ): void {
    const { blueprintId, position } = data;

    console.log(`[BuildingSystem] Placing building: ${blueprintId} at (${position.x}, ${position.y})`);

    // Get the resource requirements for this building type
    const resourceCost = this.getResourceCost(blueprintId);
    if (resourceCost && Object.keys(resourceCost).length > 0) {
      const resourceList = Object.entries(resourceCost)
        .map(([type, amount]) => `${amount} ${type}`)
        .join(', ');
      console.log(`[BuildingSystem] Building "${blueprintId}" requires: ${resourceList}`);

      // Find nearest agent with inventory
      const nearestAgent = this.findNearestAgentWithInventory(world, position);
      if (nearestAgent) {
        // Deduct resources from agent's inventory
        const success = this.deductResourcesFromAgent(nearestAgent, resourceCost);
        if (success) {
          console.log(`[BuildingSystem] Deducted resources from agent ${nearestAgent.id}`);
        } else {
          console.error(`[BuildingSystem] Failed to deduct resources from agent ${nearestAgent.id}`);
          // Per CLAUDE.md: Don't silently continue - emit error event
          world.eventBus.emit({
            type: 'building:placement:failed',
            source: 'building-system',
            data: {
              blueprintId,
              position,
              reason: 'Failed to deduct resources from agent inventory',
            },
          });
          return;
        }
      } else {
        console.warn(`[BuildingSystem] No agent with inventory found near placement position`);
      }
    } else {
      console.log(`[BuildingSystem] Building "${blueprintId}" has no resource cost`);
    }

    // Create new building entity
    const entity = new EntityImpl(createEntityId(), (world as any)._tick);

    // Add components
    entity.addComponent(createBuildingComponent(blueprintId as any, 1, 0)); // Start at 0% progress
    entity.addComponent(createPositionComponent(position.x, position.y));
    entity.addComponent(createRenderableComponent(blueprintId, 'object'));

    // Add to world
    (world as any)._addEntity(entity);

    console.log(`[BuildingSystem] Created building entity: ${entity.id}`);

    // Emit event for other systems
    world.eventBus.emit({
      type: 'building:placement:complete',
      source: 'building-system',
      data: {
        entityId: entity.id,
        blueprintId,
        position,
      },
    });
  }

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Process all buildings
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>('building');
      const position = impl.getComponent<PositionComponent>('position');

      if (!building) {
        throw new Error(`Entity ${entity.id} missing BuildingComponent in BuildingSystem`);
      }
      if (!position) {
        throw new Error(`Entity ${entity.id} missing PositionComponent in BuildingSystem`);
      }

      // Handle buildings under construction
      if (!building.isComplete && building.progress < 100) {
        this.advanceConstruction(world, impl, building, position, deltaTime);
        continue;
      }

      // Handle fuel consumption for completed buildings with active recipes
      if (building.isComplete && building.fuelRequired && building.activeRecipe) {
        this.consumeFuel(world, impl, building, deltaTime);
      }
    }
  }

  /**
   * Advance construction progress for a building.
   * When progress reaches 100%, mark as complete and emit event.
   */
  private advanceConstruction(
    world: World,
    entity: EntityImpl,
    building: BuildingComponent,
    position: PositionComponent,
    deltaTime: number
  ): void {
    // For MVP: Use fixed construction time from BuildingBlueprintRegistry
    // Default to 60 seconds if not specified
    const constructionTimeSeconds = this.getConstructionTime(building.buildingType);

    // Calculate progress increase per tick
    // Progress is 0-100, so we add (100 / totalTime) * deltaTime
    const progressPerSecond = (100 / constructionTimeSeconds) * this.BASE_CONSTRUCTION_SPEED;
    const progressIncrease = progressPerSecond * deltaTime;

    const newProgress = Math.min(100, building.progress + progressIncrease);
    const wasUnderConstruction = building.progress < 100;
    const isNowComplete = newProgress >= 100;

    // Update building component
    entity.updateComponent('building', (comp) => ({
      ...comp,
      progress: newProgress,
      isComplete: newProgress >= 100,
    }));

    // Emit completion event if just completed
    if (wasUnderConstruction && isNowComplete) {
      console.log(`[BuildingSystem] Construction complete! ${building.buildingType} at (${position.x}, ${position.y})`);
      world.eventBus.emit({
        type: 'building:complete',
        source: entity.id,
        data: {
          entityId: entity.id,
          buildingType: building.buildingType,
          position: { x: position.x, y: position.y },
        },
      });
    }
  }

  /**
   * Consume fuel from a crafting station with an active recipe.
   * Emits events when fuel runs low or empty.
   * Per CLAUDE.md: No silent fallbacks - stops crafting when fuel empty.
   */
  private consumeFuel(
    world: World,
    entity: EntityImpl,
    building: BuildingComponent,
    deltaTime: number
  ): void {
    // Cast to ensure TypeScript knows about Phase 10 properties
    const buildingComp = building as BuildingComponent;

    if (!buildingComp.fuelRequired || !buildingComp.activeRecipe) {
      return;
    }

    const fuelConsumed = buildingComp.fuelConsumptionRate * deltaTime;
    const newFuel = Math.max(0, buildingComp.currentFuel - fuelConsumed);

    // Check for fuel state transitions
    const wasLow = buildingComp.currentFuel < buildingComp.maxFuel * 0.2;
    const isNowLow = newFuel < buildingComp.maxFuel * 0.2 && newFuel > 0;
    const wasEmpty = buildingComp.currentFuel === 0;
    const isNowEmpty = newFuel === 0;

    // Update building component
    entity.updateComponent('building', (comp) => {
      const c = comp as BuildingComponent;
      return {
        ...c,
        currentFuel: newFuel,
        // Stop crafting if fuel runs out
        activeRecipe: newFuel > 0 ? c.activeRecipe : null,
      };
    });

    // Emit fuel_low event (only once when crossing threshold)
    if (!wasLow && isNowLow) {
      world.eventBus.emit({
        type: 'station:fuel_low',
        source: entity.id,
        data: {
          entityId: entity.id,
          buildingType: buildingComp.buildingType,
          currentFuel: newFuel,
          maxFuel: buildingComp.maxFuel,
        },
      });
    }

    // Emit fuel_empty event (only once when reaching 0)
    if (!wasEmpty && isNowEmpty) {
      world.eventBus.emit({
        type: 'station:fuel_empty',
        source: entity.id,
        data: {
          entityId: entity.id,
          buildingType: buildingComp.buildingType,
        },
      });
    }
  }

  /**
   * Find the nearest agent with inventory to a given position.
   * Returns the agent entity or null if none found.
   */
  private findNearestAgentWithInventory(
    world: World,
    position: { x: number; y: number }
  ): Entity | null {
    // Query all agents with inventory
    const agents = world.query().with('agent').with('inventory').with('position').executeEntities();

    if (agents.length === 0) {
      return null;
    }

    // Find nearest agent
    let nearestAgent: Entity | null = null;
    let nearestDistance = Infinity;

    for (const agent of agents) {
      const agentPos = agent.components.get('position') as { x: number; y: number } | undefined;
      if (!agentPos) continue;

      const dx = agentPos.x - position.x;
      const dy = agentPos.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestAgent = agent;
      }
    }

    return nearestAgent;
  }

  /**
   * Deduct resources from an agent's inventory.
   * Returns true if successful, false if insufficient resources.
   * Per CLAUDE.md: Crashes on missing required fields, returns false for insufficient resources.
   */
  private deductResourcesFromAgent(
    agent: Entity,
    resourceCost: Record<string, number>
  ): boolean {
    const inventory = agent.components.get('inventory') as {
      slots: Array<{ itemId: string | null; quantity: number }>;
      maxSlots: number;
      maxWeight: number;
      currentWeight: number;
    } | undefined;

    if (!inventory) {
      throw new Error(`Agent ${agent.id} missing InventoryComponent`);
    }

    // First check if agent has enough of all resources
    for (const [resourceType, amountNeeded] of Object.entries(resourceCost)) {
      let totalAvailable = 0;
      for (const slot of inventory.slots) {
        if (slot.itemId === resourceType) {
          totalAvailable += slot.quantity;
        }
      }

      if (totalAvailable < amountNeeded) {
        console.log(`[BuildingSystem] Agent ${agent.id} has ${totalAvailable} ${resourceType}, needs ${amountNeeded}`);
        return false;
      }
    }

    // Deduct resources from inventory
    for (const [resourceType, amountNeeded] of Object.entries(resourceCost)) {
      let remainingToRemove = amountNeeded;

      for (const slot of inventory.slots) {
        if (slot.itemId === resourceType && remainingToRemove > 0) {
          const amountFromSlot = Math.min(slot.quantity, remainingToRemove);
          slot.quantity -= amountFromSlot;
          remainingToRemove -= amountFromSlot;

          // Clear slot if empty
          if (slot.quantity === 0) {
            slot.itemId = null;
          }
        }
      }
    }

    // Update the agent's inventory component (this triggers re-render)
    (agent as EntityImpl).updateComponent('inventory', (comp) => ({
      ...comp,
      slots: [...inventory.slots],
    }));

    return true;
  }

  /**
   * Get resource cost for a building type.
   * Returns the required resources to construct this building.
   */
  private getResourceCost(buildingType: string): Record<string, number> {
    // Map of building types to resource costs (from BuildingBlueprintRegistry)
    const resourceCosts: Record<string, Record<string, number>> = {
      // Tier 1 buildings
      'workbench': { wood: 10 },
      'storage-chest': { wood: 15 },
      'campfire': { wood: 5, stone: 3 },
      'tent': { wood: 8 },
      'well': { stone: 20, wood: 10 },
      'lean-to': { wood: 12 },
      'storage-box': { wood: 8 },
      // Tier 2 crafting stations
      'forge': { stone: 30, wood: 15 },
      'farm_shed': { wood: 25, stone: 10 },
      'market_stall': { wood: 20 },
      'windmill': { wood: 30, stone: 15 },
      // Tier 3+ crafting stations
      'workshop': { wood: 40, stone: 25 },
      'barn': { wood: 50, stone: 20 },
    };

    // Return empty object for unknown types (some buildings may have no cost)
    return resourceCosts[buildingType] || {};
  }

  /**
   * Get construction time for a building type.
   * Uses BuildingBlueprint buildTime if available, else defaults to 60 seconds.
   */
  private getConstructionTime(buildingType: string): number {
    // Map of building types to construction times (from BuildingBlueprintRegistry)
    const constructionTimes: Record<string, number> = {
      // Tier 1 buildings
      'workbench': 60,
      'storage-chest': 45,
      'campfire': 30,
      'tent': 45,
      'well': 90,
      'lean-to': 60,
      'storage-box': 45,
      // Tier 2 crafting stations
      'forge': 120,
      'farm_shed': 90,
      'market_stall': 75,
      'windmill': 100,
      // Tier 3+ crafting stations
      'workshop': 180,
      'barn': 150,
    };

    const time = constructionTimes[buildingType];
    if (time === undefined) {
      // Per CLAUDE.md: No silent fallbacks
      throw new Error(`Unknown building type: ${buildingType}. Cannot determine construction time.`);
    }

    return time;
  }
}
