import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { BuildingType as BT } from '../types/BuildingType.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { BuildingComponent, BuildingType } from '../components/BuildingComponent.js';
import { createBuildingComponent } from '../components/BuildingComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import { createInventoryComponent } from '../components/InventoryComponent.js';
import { createShopComponent, type ShopType } from '../components/ShopComponent.js';
import type { GameEvent } from '../events/GameEvent.js';
import { createTownHallComponent } from '../components/TownHallComponent.js';
import { createCensusBureauComponent } from '../components/CensusBureauComponent.js';
import { createWarehouseComponent } from '../components/WarehouseComponent.js';
import { createWeatherStationComponent } from '../components/WeatherStationComponent.js';
import { createHealthClinicComponent } from '../components/HealthClinicComponent.js';
import { createUniversityComponent } from '../components/UniversityComponent.js';
import { BuildingBlueprintRegistry } from '../buildings/BuildingBlueprintRegistry.js';
import { getTileConstructionSystem } from './TileConstructionSystem.js';
import type { WallMaterial, DoorMaterial, WindowMaterial, RoofMaterial } from '@ai-village/world';
import type { AgentComponent } from '../components/AgentComponent.js';
import { createResourceComponent } from '../components/ResourceComponent.js';
import { createTagsComponent } from '../components/TagsComponent.js';

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
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Building, CT.Position];

  private isInitialized = false;

  /**
   * Blueprint registry for looking up building definitions with layouts.
   * Initialized lazily on first use.
   */
  private blueprintRegistry: BuildingBlueprintRegistry | null = null;

  /**
   * Base construction speed in progress points per second.
   * A building with buildTime=60 seconds will complete in 60 seconds.
   * Progress per tick = (100 / buildTime) * deltaTime
   *
   * For MVP, we use a fixed rate. Future: add skill/tool bonuses.
   */
  private readonly BASE_CONSTRUCTION_SPEED = 1.0;

  /**
   * Fuel low threshold as percentage of max fuel.
   * When fuel drops below this percentage, emit station:fuel_low event.
   */
  private readonly FUEL_LOW_THRESHOLD = 0.2; // 20% of max fuel

  /**
   * Mapping of building types to shop types.
   * When a building with a shop type completes, a ShopComponent is added.
   */
  private readonly SHOP_BUILDING_TYPES: Record<string, ShopType> = {
    'general_store': 'general',
    'blacksmith': 'blacksmith',
    'farm_supply_shop': 'farm_supply',
    'tavern': 'tavern',
    'market_stall': 'general',
  };

  /**
   * Fuel configuration constants for crafting stations.
   * Defines initial fuel, max capacity, and consumption rates.
   */
  private readonly FORGE_FUEL_CONFIG = {
    INITIAL_FUEL: 50,
    MAX_FUEL: 100,
    CONSUMPTION_RATE: 1, // fuel per second when actively crafting
  } as const;

  /**
   * Initialize the system and register event listeners.
   * Called once when system is registered.
   */
  public initialize(world: World, _eventBus: import('../events/EventBus.js').EventBus): void {
    if (this.isInitialized) {
      return;
    }

    // Subscribe to world.eventBus directly to ensure we're using the same instance
    // that will receive emitted events
    const actualEventBus = world.eventBus;

    // Listen for construction started to track builderId
    actualEventBus.subscribe('construction:started', (event) => {
      const data = event.data as { buildingId: string; builderId?: string };
      if (data.builderId) {
        // Store builderId in BuildingComponent using ownerId field
        const entity = world.getEntity(data.buildingId);
        if (entity) {
          (entity as EntityImpl).updateComponent(CT.Building, (comp) => ({
            ...comp,
            ownerId: data.builderId,
          }));
        }
      }
    });

    // Listen for building placement confirmations
    actualEventBus.subscribe('building:placement:confirmed', (event) => {
      this.handleBuildingPlacement(world, event.data as { blueprintId: string; position: { x: number; y: number }; rotation: number });
    });

    // Listen for building completion to initialize crafting station properties
    actualEventBus.subscribe('building:complete', (event) => {
      this.handleBuildingComplete(world, event);
    });

    this.isInitialized = true;

    // Initialize blueprint registry for layout lookups
    this.blueprintRegistry = new BuildingBlueprintRegistry();
    this.blueprintRegistry.registerDefaults();
  }

  /**
   * Get the blueprint registry, initializing it if needed.
   */
  private getBlueprintRegistry(): BuildingBlueprintRegistry {
    if (!this.blueprintRegistry) {
      this.blueprintRegistry = new BuildingBlueprintRegistry();
      this.blueprintRegistry.registerDefaults();
    }
    return this.blueprintRegistry;
  }

  /**
   * Stamp a building's layout onto world tiles.
   * Uses the blueprint's ASCII layout to create actual wall/door/floor tiles.
   * Buildings without layouts (small items) are skipped.
   */
  private stampBuildingLayout(
    world: World,
    blueprintId: string,
    position: { x: number; y: number },
    buildingId: string
  ): void {
    // Try to get the blueprint from the registry
    const registry = this.getBlueprintRegistry();
    const blueprint = registry.tryGet(blueprintId);

    // Skip if blueprint not found or has no layout (small items like workbenches)
    if (!blueprint || !blueprint.layout || blueprint.layout.length === 0) {
      return;
    }

    // Get materials from blueprint, with defaults
    // Derive roof from wall material: wood/thatch walls -> thatch roof, stone -> tile roof, metal -> metal roof
    const wallMaterial = (blueprint.materials?.wall || 'wood') as WallMaterial;
    const roofMaterial = this.deriveRoofMaterial(wallMaterial);
    const materials = {
      wall: wallMaterial,
      floor: blueprint.materials?.floor || 'wood',
      door: (blueprint.materials?.door || 'wood') as DoorMaterial,
      window: 'glass' as WindowMaterial,
      roof: roofMaterial,
    };

    // Get the TileConstructionSystem and stamp the layout
    const tileSystem = getTileConstructionSystem();
    const tilesPlaced = tileSystem.stampLayoutInstantly(
      world,
      blueprint.layout,
      position.x,
      position.y,
      materials,
      buildingId
    );

    if (tilesPlaced > 0) {
      console.log(`[BuildingSystem] Stamped ${tilesPlaced} tiles for ${blueprint.name} at (${position.x}, ${position.y})`);
    }
  }

  /**
   * Derive appropriate roof material from wall material.
   * Wood/thatch walls -> thatch roof, stone -> tile roof, metal -> metal roof
   */
  private deriveRoofMaterial(wallMaterial: WallMaterial): RoofMaterial {
    switch (wallMaterial) {
      case 'wood':
      case 'thatch':
        return 'thatch';
      case 'stone':
      case 'mud_brick':
        return 'tile';
      case 'metal':
        return 'metal';
      case 'ice':
        return 'wood'; // Ice buildings use wood roofs
      case 'glass':
        return 'slate'; // Glass buildings use slate roofs
      default:
        return 'thatch';
    }
  }

  /**
   * Handle building completion event.
   * Initialize fuel properties for crafting stations that require fuel.
   * Add inventory components for storage buildings.
   * Per CLAUDE.md: No silent failures - throws if entity not found.
   */
  private handleBuildingComplete(
    world: World,
    event: GameEvent
  ): void {
    const data = event.data as { entityId: string; buildingType: string; builderId?: string };
    const { entityId, buildingType } = data;

    // Find the entity using world.getEntity
    const entity = world.getEntity(entityId);

    if (!entity) {
      throw new Error(`[BuildingSystem] Entity ${entityId} not found for building completion - entity may have been deleted before completion event processed`);
    }

    // Check if this is a storage building and add inventory component
    const storageCapacity = this.getStorageCapacity(buildingType);
    if (storageCapacity !== null) {
      // Add inventory component with capacity from blueprint
      // Use capacity as slots, and capacity * 10 as weight limit
      const inventoryComp = createInventoryComponent(storageCapacity, storageCapacity * 10);
      (entity as EntityImpl).addComponent(inventoryComp);
    }

    // Check if this is a shop building and add shop component
    const shopType = this.SHOP_BUILDING_TYPES[buildingType];
    if (shopType) {
      // Get the building component to find the builder
      const buildingComp = (entity as EntityImpl).getComponent<BuildingComponent>(CT.Building);
      if (!buildingComp) {
        throw new Error(`Entity ${entityId} missing BuildingComponent when adding ShopComponent`);
      }

      // Use builderId from event data (which comes from BuildingComponent.ownerId)
      const builderId = data.builderId || buildingComp.ownerId;
      if (!builderId) {
        throw new Error(`Building ${entityId} completed without builderId - cannot create shop`);
      }
      const shopComponent = createShopComponent(shopType, builderId, data.buildingType);
      (entity as EntityImpl).addComponent(shopComponent);
    }

    // Check if this is a governance building and add governance component
    this.addGovernanceComponent(entity as EntityImpl, buildingType, world);

    // Get fuel configuration for this building type
    const fuelConfig = this.getFuelConfiguration(buildingType);

    if (fuelConfig.required) {
      // Update building component with fuel properties
      (entity as EntityImpl).updateComponent(CT.Building, (comp) => ({
        ...comp,
        fuelRequired: true,
        currentFuel: fuelConfig.initialFuel,
        maxFuel: fuelConfig.maxFuel,
        fuelConsumptionRate: fuelConfig.consumptionRate,
      }));

    }
  }

  /**
   * Get storage capacity for a building type.
   * Returns null if the building type doesn't have storage functionality.
   */
  private getStorageCapacity(buildingType: string): number | null {
    // Map of building types to storage capacity (from BuildingBlueprintRegistry)
    const storageCapacities: Record<string, number> = {
      'storage-chest': 20,
      'storage-box': 10,
      'farm-storage': 40,
      'warehouse': 200,
      'bank': 1000,
      'barn': 100,
      'granary': 1000, // Governance building for resource tracking
    };

    return storageCapacities[buildingType] ?? null;
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
      // Tier 1 buildings (no fuel required)
      'workbench': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'storage-chest': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'storage-box': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'campfire': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'tent': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'bed': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'bedroll': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'well': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'lean-to': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'garden_fence': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'library': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'auto_farm': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },

      // Tier 2 stations
      'forge': {
        required: true,
        initialFuel: this.FORGE_FUEL_CONFIG.INITIAL_FUEL,
        maxFuel: this.FORGE_FUEL_CONFIG.MAX_FUEL,
        consumptionRate: this.FORGE_FUEL_CONFIG.CONSUMPTION_RATE,
      },
      'farm_shed': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'market_stall': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'windmill': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },

      // Tier 3 stations
      'workshop': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'barn': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },

      // === Research System Buildings (Phase 13) ===
      // Tier 1
      'small_garden': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'loom': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'oven': { required: true, initialFuel: 30, maxFuel: 60, consumptionRate: 0.5 }, // Uses fuel for baking

      // Tier 2
      'irrigation_channel': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'warehouse': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'monument': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'alchemy_lab': { required: true, initialFuel: 40, maxFuel: 80, consumptionRate: 0.8 }, // Uses fuel for brewing
      'water_wheel': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 }, // Water-powered

      // Tier 3
      'greenhouse': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'grand_hall': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'conveyor_system': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },

      // Tier 4
      'trading_post': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'bank': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },

      // Tier 5
      'arcane_tower': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 }, // Magic-powered
      'inventors_hall': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },

      // === Governance Buildings (Phase 11) ===
      'town-hall': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'census-bureau': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'granary': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'weather-station': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'health-clinic': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'meeting-hall': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'watchtower': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'labor-guild': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'archive': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
      'university': { required: false, initialFuel: 0, maxFuel: 0, consumptionRate: 0 },
    };

    const config = configs[buildingType];
    if (!config) {
      throw new Error(`Unknown building type: "${buildingType}". Add fuel config to BuildingSystem.ts`);
    }
    return config;
  }

  /**
   * Add governance component to governance buildings when they complete.
   * Per governance-dashboard work order: Buildings collect governance data.
   *
   * NOTE: Governance buildings (town halls, census bureaus, etc.) are now multi-tile
   * structures using TileBasedBlueprintRegistry. This method is a no-op for single-tile
   * furniture/workstations. Governance functionality has moved to the tile-based system.
   *
   * EXCEPTION: University buildings still need UniversityComponent for backwards compatibility
   * with tests until fully migrated to tile-based system.
   */
  private addGovernanceComponent(entity: EntityImpl, buildingType: string, world: World): void {
    // Add appropriate governance component based on building type
    if (buildingType === 'university') {
      const universityComp = createUniversityComponent(
        'University',
        entity.id,
        world.tick
      );
      entity.addComponent(universityComp);
      return;
    }

    if (buildingType === 'town-hall') {
      const townHallComp = createTownHallComponent();
      entity.addComponent(townHallComp);
      return;
    }

    if (buildingType === 'census-bureau') {
      const censusBureauComp = createCensusBureauComponent();
      entity.addComponent(censusBureauComp);
      return;
    }

    if (buildingType === 'weather-station') {
      const weatherStationComp = createWeatherStationComponent();
      entity.addComponent(weatherStationComp);
      return;
    }

    if (buildingType === 'health-clinic') {
      const healthClinicComp = createHealthClinicComponent();
      entity.addComponent(healthClinicComp);
      return;
    }

    // No other governance buildings in single-tile BuildingType enum
    // Other governance buildings use BuildingBlueprintRegistry with blueprint IDs
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


    // Get the resource requirements for this building type
    const resourceCost = this.getResourceCost(blueprintId);
    if (resourceCost && Object.keys(resourceCost).length > 0) {
      // Try to deduct resources from storage first, then agents
      let success = this.deductResourcesFromStorage(world, resourceCost);

      if (success) {
      } else {
        // Fall back to agent inventory
        const nearestAgent = this.findNearestAgentWithInventory(world, position);
        if (nearestAgent) {
          success = this.deductResourcesFromAgent(nearestAgent, resourceCost);
          if (success) {
          }
        }
      }

      if (!success) {
        console.error(`[BuildingSystem] Failed to deduct resources for ${blueprintId}`);
        // Per CLAUDE.md: Don't silently continue - emit error event
        world.eventBus.emit({
          type: 'building:placement:failed',
          source: 'building-system',
          data: {
            blueprintId,
            position,
            reason: 'resource_missing',
          },
        });
        return;
      }
    } else {
    }

    // Validate blueprintId is a known building type before creating entity
    // This will throw if blueprintId is not recognized, per CLAUDE.md (no silent failures)
    this.getConstructionTime(blueprintId);
    this.getResourceCost(blueprintId);

    // Create new building entity using WorldMutator API
    // Per System.ts:12, systems should use WorldMutator for modifications
    const worldMutator = world as WorldMutator;
    const entity = worldMutator.createEntity();

    // Add components
    // Safe to cast after validation above proves blueprintId is a valid BuildingType
    (entity as EntityImpl).addComponent(createBuildingComponent(blueprintId as BuildingType, 1, 0)); // Start at 0% progress
    (entity as EntityImpl).addComponent(createPositionComponent(position.x, position.y));
    (entity as EntityImpl).addComponent(createRenderableComponent(blueprintId, 'building'));

    // CAMPFIRE CONSTRUCTION CANCELLATION: When a campfire begins construction,
    // cancel all other campfire construction/plans within 200 tiles to prevent clustering
    if (blueprintId === 'campfire') {
      const CAMPFIRE_PROXIMITY_THRESHOLD = 200;
      const entitiesToRemove: string[] = [];
      const buildingPositions: Map<string, PositionComponent> = new Map();

      // 1. Cancel in-progress campfire buildings within range
      const allBuildings = world.query().with(CT.Building).with(CT.Position).executeEntities();
      for (const building of allBuildings) {
        if (building.id === entity.id) continue; // Skip the one we just created

        const buildingImpl = building as EntityImpl;
        const bc = buildingImpl.getComponent<BuildingComponent>(CT.Building);
        const bp = buildingImpl.getComponent<PositionComponent>(CT.Position);

        if (bc?.buildingType === 'campfire' && !bc.isComplete && bp) {
          const dx = position.x - bp.x;
          const dy = position.y - bp.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= CAMPFIRE_PROXIMITY_THRESHOLD) {
            entitiesToRemove.push(building.id);
            buildingPositions.set(building.id, bp);
          }
        }
      }

      // Remove conflicting in-progress buildings and refund resources
      for (const buildingId of entitiesToRemove) {
        const buildingPos = buildingPositions.get(buildingId);
        if (buildingPos) {
          // Drop resources on the ground at the building location
          this.dropBuildingResources(world, buildingPos, 'campfire');
        }
        worldMutator.destroyEntity(buildingId, 'Cancelled: another campfire started construction within 200 tiles');
      }

      // 2. Cancel planned campfires from agents within range
      const allAgents = world.query().with(CT.Agent).with(CT.Position).executeEntities();
      for (const agent of allAgents) {
        const agentImpl = agent as EntityImpl;
        const agentComp = agentImpl.getComponent<AgentComponent>(CT.Agent);
        const agentPos = agentImpl.getComponent<PositionComponent>(CT.Position);

        if (agentComp?.plannedBuilds && agentPos) {
          const dx = position.x - agentPos.x;
          const dy = position.y - agentPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= CAMPFIRE_PROXIMITY_THRESHOLD) {
            // Remove campfire from planned builds
            const filteredBuilds = agentComp.plannedBuilds.filter(p => p.buildingType !== 'campfire');
            if (filteredBuilds.length !== agentComp.plannedBuilds.length) {
              agentImpl.updateComponent<AgentComponent>(CT.Agent, (current) => ({
                ...current,
                plannedBuilds: filteredBuilds,
              }));
            }
          }
        }
      }
    }

    // Stamp the building layout onto world tiles if the blueprint has one
    // This creates actual wall/door/floor tiles from the ASCII layout
    this.stampBuildingLayout(world, blueprintId, position, entity.id);

    // Emit construction:started event
    world.eventBus.emit({
      type: 'construction:started',
      source: entity.id,
      data: {
        buildingId: entity.id,
        blueprintId,
        entityId: entity.id,
        buildingType: blueprintId,
        position,
      },
    });

    // Emit event for other systems
    world.eventBus.emit({
      type: 'building:placement:complete',
      source: 'building-system',
      data: {
        buildingId: entity.id,
        entityId: entity.id,
        blueprintId,
        position,
        rotation: 0,
      },
    });
  }

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {

    // Process all buildings
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>(CT.Building);
      const position = impl.getComponent<PositionComponent>(CT.Position);

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
    // Use lookup table for construction time - consistent source of truth
    const constructionTimeSeconds = this.getConstructionTime(building.buildingType);

    // Calculate progress increase per tick
    // Progress is 0-100, so we add (100 / totalTime) * deltaTime
    const progressPerSecond = (100 / constructionTimeSeconds) * this.BASE_CONSTRUCTION_SPEED;
    const progressIncrease = progressPerSecond * deltaTime;

    const newProgress = Math.min(100, building.progress + progressIncrease);
    const wasUnderConstruction = building.progress < 100;
    const isNowComplete = newProgress >= 100;

    // Log progress every 5% milestone for better visibility during playtest
    const oldProgressMilestone = Math.floor(building.progress / 5);
    const newProgressMilestone = Math.floor(newProgress / 5);
    if (newProgressMilestone > oldProgressMilestone) {
    }

    // Update building component
    entity.updateComponent(CT.Building, (comp) => ({
      ...comp,
      progress: newProgress,
      isComplete: newProgress >= 100,
    }));

    // Emit completion event if just completed
    if (wasUnderConstruction && isNowComplete) {
      world.eventBus.emit({
        type: 'building:complete',
        source: entity.id,
        data: {
          buildingId: entity.id,
          entityId: entity.id,
          buildingType: building.buildingType,
          position: { x: position.x, y: position.y },
          builderId: building.ownerId, // Track which agent built this
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
    const wasLow = buildingComp.currentFuel < buildingComp.maxFuel * this.FUEL_LOW_THRESHOLD;
    const isNowLow = newFuel < buildingComp.maxFuel * this.FUEL_LOW_THRESHOLD && newFuel > 0;
    const wasEmpty = buildingComp.currentFuel === 0;
    const isNowEmpty = newFuel === 0;

    // Update building component
    entity.updateComponent(CT.Building, (comp) => {
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
          stationId: entity.id,
          buildingType: buildingComp.buildingType,
          currentFuel: newFuel,
          fuelRemaining: newFuel,
        },
      });
    }

    // Emit fuel_empty event (only once when reaching 0)
    if (!wasEmpty && isNowEmpty) {
      world.eventBus.emit({
        type: 'station:fuel_empty',
        source: entity.id,
        data: {
          stationId: entity.id,
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
    const agents = world.query().with(CT.Agent).with(CT.Inventory).with(CT.Position).executeEntities();

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
    (agent as EntityImpl).updateComponent(CT.Inventory, (comp) => ({
      ...comp,
      slots: [...inventory.slots],
    }));

    return true;
  }

  /**
   * Deduct resources from storage buildings.
   * Returns true if successful, false if insufficient resources.
   * Performance: Single query with O(1) lookups via Map
   */
  private deductResourcesFromStorage(
    world: World,
    resourceCost: Record<string, number>
  ): boolean {

    // Get all storage buildings with inventory (single query)
    const storageBuildings = world.query()
      .with(CT.Building)
      .with(CT.Inventory)
      .executeEntities();

    // Build resource availability map in single pass
    // Map: resourceType -> Array of {storage, slotIndex, quantity}
    const availability = new Map<string, Array<{ storage: Entity, slotIndex: number, quantity: number }>>();

    for (const storage of storageBuildings) {
      const building = storage.components.get('building') as { isComplete: boolean; buildingType: string } | undefined;
      const inventory = storage.components.get('inventory') as {
        slots: Array<{ itemId: string | null; quantity: number }>;
      } | undefined;

      // Only count complete storage buildings
      if (!building?.isComplete) continue;
      if (building.buildingType !== BT.StorageChest && building.buildingType !== BT.StorageBox) continue;

      if (inventory?.slots) {
        for (let slotIndex = 0; slotIndex < inventory.slots.length; slotIndex++) {
          const slot = inventory.slots[slotIndex];
          if (slot && slot.itemId && slot.quantity > 0) {
            if (!availability.has(slot.itemId)) {
              availability.set(slot.itemId, []);
            }
            availability.get(slot.itemId)!.push({ storage, slotIndex, quantity: slot.quantity });
          }
        }
      }
    }

    // Check if we have enough of each resource using pre-built map
    for (const [resourceType, amountNeeded] of Object.entries(resourceCost)) {
      const sources = availability.get(resourceType);
      if (!sources) {
        return false; // Resource type not available
      }

      const totalAvailable = sources.reduce((sum, src) => sum + src.quantity, 0);
      if (totalAvailable < amountNeeded) {
        return false; // Insufficient quantity
      }
    }

    // Now deduct resources using pre-built map - O(costs.length)
    for (const [resourceType, amountNeeded] of Object.entries(resourceCost)) {
      let remainingToRemove = amountNeeded;
      const sources = availability.get(resourceType)!; // We know it exists from check above

      for (const source of sources) {
        if (remainingToRemove <= 0) break;

        const inventory = source.storage.components.get('inventory') as {
          slots: Array<{ itemId: string | null; quantity: number }>;
        } | undefined;

        const slot = inventory?.slots?.[source.slotIndex];
        if (slot) {
          const amountFromSlot = Math.min(slot.quantity, remainingToRemove);
          slot.quantity -= amountFromSlot;
          remainingToRemove -= amountFromSlot;

          // Clear slot if empty
          if (slot.quantity === 0) {
            slot.itemId = null;
          }
        }

        // Update the storage's inventory component
        (source.storage as EntityImpl).updateComponent(CT.Inventory, (comp) => ({
          ...comp,
          slots: [...inventory!.slots],
        }));
      }
    }

    return true;
  }

  /**
   * Drop building resources on the ground at the specified position.
   * Used when cancelling construction to refund resources to the world.
   */
  private dropBuildingResources(
    world: World,
    position: PositionComponent,
    buildingType: string
  ): void {
    const resourceCost = this.getResourceCost(buildingType);
    const mutator = world as WorldMutator;

    // Drop each resource type on the ground
    for (const [resourceType, amount] of Object.entries(resourceCost)) {
      // Create item drop entity
      const itemEntity = mutator.createEntity();

      // Add position (ground level at building location)
      mutator.addComponent(itemEntity.id, createPositionComponent(position.x, position.y, 0));

      // Add resource component for pickup
      // Map resource type to valid ResourceType (wood, stone, etc)
      const validResourceType = (resourceType === 'stone' || resourceType === 'wood') ? resourceType : 'wood';
      mutator.addComponent(itemEntity.id, createResourceComponent(
        validResourceType,
        amount,
        0, // no regeneration
        0.5 // easy to pick up
      ));

      // Add tags for identification
      mutator.addComponent(itemEntity.id, createTagsComponent('item', 'dropped', 'pickup', 'refund', resourceType));

      // Emit item dropped event
      world.eventBus.emit({
        type: 'item:dropped',
        source: 'building-system',
        data: {
          entityId: itemEntity.id,
          material: resourceType,
          amount,
          position: { x: position.x, y: position.y },
        },
      });
    }
  }

  /**
   * Get resource cost for a building type.
   * Returns the required resources to construct this building.
   * Per CLAUDE.md: No silent fallbacks - throws on unknown building type.
   */
  private getResourceCost(buildingType: string): Record<string, number> {
    // NOTE: These MUST match BuildingBlueprintRegistry resource costs.
    const resourceCosts: Record<string, Record<string, number>> = {
      // Tier 1 buildings (match BuildingBlueprintRegistry)
      'workbench': { wood: 20 },
      'storage-chest': { wood: 10 },
      'campfire': { wood: 5, stone: 3 },
      'tent': { wood: 8 },
      'well': { stone: 20, wood: 10 },
      'lean-to': { wood: 12 },
      'storage-box': { wood: 8 },
      'bed': { wood: 15 },
      'bedroll': { wood: 5 },
      // Tier 2 crafting stations
      'forge': { stone: 30, wood: 15 },
      'farm_shed': { wood: 25, stone: 10 },
      'market_stall': { wood: 20 },
      'windmill': { wood: 30, stone: 15 },
      // Shop buildings (Phase 12.4)
      'general_store': { wood: 30, stone: 20 },
      'blacksmith': { wood: 25, stone: 35, iron: 15 },
      'farm_supply_shop': { wood: 35, stone: 15 },
      'tavern': { wood: 40, stone: 25 },
      // Tier 3+ crafting stations
      'workshop': { wood: 40, stone: 25 },
      'barn': { wood: 50, stone: 20 },
      // Governance buildings (per governance-dashboard work order)
      'town-hall': { wood: 50, stone: 20 },
      'census-bureau': { wood: 100, stone: 50, cloth: 20 },
      'weather-station': { wood: 60, stone: 40, metal: 10 },
      'health-clinic': { wood: 100, stone: 50, cloth: 30 },
      'meeting-hall': { wood: 120, stone: 60 },
      'watchtower': { wood: 80, stone: 60 },
      'labor-guild': { wood: 90, stone: 40 },
      'archive': { wood: 150, stone: 80, cloth: 50, ink: 20 },

      // === Research System Buildings (Phase 13) ===
      // Tier 1
      'small_garden': { wood: 10, stone: 5 },
      'loom': { wood: 30, fiber: 10 },
      'oven': { stone: 25, clay: 15 },

      // Tier 2
      'irrigation_channel': { stone: 20, clay: 10 },
      'warehouse': { wood: 80, stone: 40 },
      'monument': { stone: 60, gold: 5 },
      'alchemy_lab': { stone: 40, wood: 30, glass: 15 },
      'water_wheel': { wood: 50, iron: 20 },

      // Tier 3
      'greenhouse': { wood: 60, glass: 40, iron: 20 },
      'grand_hall': { stone: 100, wood: 80, gold: 10 },
      'conveyor_system': { iron: 40, wood: 20 },

      // Tier 4
      'trading_post': { wood: 70, stone: 50, gold: 20 },
      'bank': { stone: 80, iron: 50, gold: 30 },

      // Tier 5
      'arcane_tower': { stone: 100, mithril_ingot: 20, crystal: 30 },
      'inventors_hall': { stone: 120, wood: 80, iron: 60, gold: 40 },
    };

    const cost = resourceCosts[buildingType];
    if (cost === undefined) {
      throw new Error(`Unknown building type: "${buildingType}". Add resource cost to BuildingSystem.ts:getResourceCost()`);
    }
    return cost;
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
      'bed': 45,
      'bedroll': 20,
      // Tier 2 crafting stations
      'forge': 120,
      'farm_shed': 90,
      'market_stall': 75,
      'windmill': 100,
      // Shop buildings (Phase 12.4)
      'general_store': 150,
      'blacksmith': 180,
      'farm_supply_shop': 120,
      'tavern': 200,
      // Tier 3+ crafting stations
      'workshop': 180,
      'barn': 150,
      // Animal housing buildings (per animalHousingDefinitions.ts)
      'chicken-coop': 90,
      'kennel': 75,
      'stable': 120,
      'apiary': 60,
      'aquarium': 90,
      // Governance buildings (per governance-dashboard work order)
      'town-hall': 4 * 3600, // 4 hours
      'census-bureau': 8 * 3600, // 8 hours
      'weather-station': 5 * 3600, // 5 hours
      'health-clinic': 10 * 3600, // 10 hours
      'meeting-hall': 8 * 3600, // 8 hours
      'watchtower': 6 * 3600, // 6 hours
      'labor-guild': 7 * 3600, // 7 hours
      'archive': 12 * 3600, // 12 hours

      // === Research System Buildings (Phase 13) ===
      // Tier 1
      'small_garden': 45,
      'loom': 75,
      'oven': 60,

      // Tier 2
      'irrigation_channel': 90,
      'warehouse': 150,
      'monument': 180,
      'alchemy_lab': 120,
      'water_wheel': 120,

      // Tier 3
      'greenhouse': 180,
      'grand_hall': 300,
      'conveyor_system': 90,

      // Tier 4
      'trading_post': 200,
      'bank': 240,

      // Tier 5
      'arcane_tower': 360,
      'inventors_hall': 480,
    };

    const time = constructionTimes[buildingType];
    if (time === undefined) {
      // Per CLAUDE.md: No silent fallbacks
      throw new Error(`Unknown building type: ${buildingType}. Cannot determine construction time.`);
    }

    return time;
  }
}
