/**
 * CityBuildingGenerationSystem - Spawns buildings in NPC cities based on technology unlocks
 *
 * This system implements the "player as first mover" mechanic:
 * - When player city builds something new, it unlocks globally
 * - This system then spawns those buildings in NPC cities
 * - NPC cities develop organically based on their needs and unlocked tech
 *
 * Building generation logic:
 * - Periodic checks (every ~30 seconds of game time)
 * - Each city has a "building queue" managed by CityDirector
 * - Buildings spawn based on: population, resource needs, available space
 * - Buildings respect era progression (no TV stations before forges)
 *
 * Integration with existing systems:
 * - Uses TechnologyUnlockComponent to check what's available
 * - Creates buildings directly (bypasses UI placement system)
 * - Works alongside CityDirectorSystem for city management
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World, WorldMutator } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus as CoreEventBus } from '../events/EventBus.js';
import type { TechnologyUnlockComponent } from '../components/TechnologyUnlockComponent.js';
import { getAvailableBuildings } from '../components/TechnologyUnlockComponent.js';
import type { CityDirectorComponent } from '../components/CityDirectorComponent.js';
import { isAgentInCity } from '../components/CityDirectorComponent.js';
import type { BuildingType, BuildingComponent } from '../components/BuildingComponent.js';
import { createBuildingComponent } from '../components/BuildingComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { BuildingBlueprintRegistry } from '../buildings/BuildingBlueprintRegistry.js';
import { getTileConstructionSystem } from './TileConstructionSystem.js';
import type { WallMaterial, DoorMaterial, WindowMaterial, RoofMaterial } from '@ai-village/world';

/**
 * Building priorities for NPC city development.
 * Higher priority = built sooner when resources allow.
 */
const BUILDING_PRIORITIES: Record<string, number> = {
  // Primitive (priority 100+)
  'tent': 110,
  'campfire': 105,
  'storage-chest': 103,
  'workbench': 102,
  'bed': 101,

  // Agricultural (priority 80-90)
  'farm_shed': 90,
  'granary': 88,
  'well': 85,
  'barn': 83,
  'mill': 80,

  // Industrial (priority 60-75)
  'forge': 75,
  'workshop': 72,
  'warehouse': 70,
  'factory': 65,
  'power_plant': 60,

  // Modern (priority 40-55)
  'library': 55,
  'university': 53,  // High priority - unlocks research
  'school': 52,
  'hospital': 50,
  'bookstore': 48,
  'publishing_company': 45,
  'newspaper': 43,

  // Information age (priority 20-35)
  'radio_station': 35,
  'tv_station': 33,
  'telecommunication_tower': 30,
  'internet_hub': 28,  // Important - unlocks internet boost
  'data_center': 25,
};

/**
 * Get priority for a building type.
 */
function getBuildingPriority(buildingType: string): number {
  return BUILDING_PRIORITIES[buildingType] ?? 50; // Default medium priority
}

/**
 * CityBuildingGenerationSystem spawns buildings in NPC cities.
 */
export class CityBuildingGenerationSystem implements System {
  public readonly id: SystemId = 'city_building_generation';
  public readonly priority: number = 17; // Run after TechnologyUnlockSystem (16)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus: CoreEventBus;
  private lastCheckTick: number = 0;
  private readonly CHECK_INTERVAL = 600; // Every 30 seconds at 20 TPS
  private blueprintRegistry: BuildingBlueprintRegistry | null = null;

  constructor(eventBus: CoreEventBus) {
    this.eventBus = eventBus;
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
   * Update - periodically spawn buildings in NPC cities.
   */
  public update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Periodic check
    if (world.tick - this.lastCheckTick < this.CHECK_INTERVAL) {
      return;
    }
    this.lastCheckTick = world.tick;

    // Get the global technology unlock singleton
    const unlockEntities = world.query().with(CT.TechnologyUnlock).executeEntities();
    if (unlockEntities.length === 0) {
      return; // No unlock tracker yet
    }

    const unlockEntity = unlockEntities[0] as EntityImpl;
    const unlock = unlockEntity.getComponent<TechnologyUnlockComponent>(CT.TechnologyUnlock);
    if (!unlock) {
      return;
    }

    // Get all cities
    const cities = world.query().with(CT.CityDirector).executeEntities();

    for (const cityEntity of cities) {
      const cityImpl = cityEntity as EntityImpl;
      const cityDirector = cityImpl.getComponent<CityDirectorComponent>(CT.CityDirector);

      if (!cityDirector) {
        continue;
      }

      // Skip player city - player builds their own stuff
      if (unlock.playerCityId && unlock.playerCityId === cityDirector.cityId) {
        continue;
      }

      // Try to spawn a building in this NPC city
      this.considerBuildingForCity(world, cityDirector, unlock);
    }
  }

  /**
   * Consider spawning a building in an NPC city.
   */
  private considerBuildingForCity(
    world: World,
    cityDirector: CityDirectorComponent,
    unlock: TechnologyUnlockComponent
  ): void {
    // Get available building types for this city
    const availableBuildings = getAvailableBuildings(unlock, cityDirector.cityId);

    if (availableBuildings.length === 0) {
      return; // No buildings unlocked yet
    }

    // Get existing buildings in this city
    const existingBuildings = this.getExistingBuildingsInCity(world, cityDirector);

    // Filter out buildings the city already has
    // (Allow multiples of some types: tents, storage, etc.)
    const candidateBuildings = availableBuildings.filter(buildingType => {
      // Always allow more housing
      if (['tent', 'bed', 'bedroll'].includes(buildingType)) {
        return true;
      }

      // Always allow more storage
      if (['storage-chest', 'storage-box', 'warehouse'].includes(buildingType)) {
        return true;
      }

      // Only one of each other building type
      return !existingBuildings.has(buildingType);
    });

    if (candidateBuildings.length === 0) {
      return; // Nothing new to build
    }

    // Sort by priority (highest first)
    candidateBuildings.sort((a, b) => {
      const priorityA = getBuildingPriority(a);
      const priorityB = getBuildingPriority(b);
      return priorityB - priorityA; // Descending
    });

    // Pick the highest priority building
    const buildingType = candidateBuildings[0];

    if (!buildingType) {
      return; // No building to spawn
    }

    // Find a suitable location in the city
    const position = this.findBuildingLocation(world, cityDirector, buildingType);

    if (!position) {
      console.warn(`[CityBuildingGeneration] No suitable location found for ${buildingType} in city ${cityDirector.cityId}`);
      return;
    }

    // Spawn the building
    this.spawnBuilding(world, buildingType, position, cityDirector.cityId);
  }

  /**
   * Get set of building types already in a city.
   */
  private getExistingBuildingsInCity(
    world: World,
    cityDirector: CityDirectorComponent
  ): Set<string> {
    const buildingTypes = new Set<string>();

    const buildings = world.query().with(CT.Building, CT.Position).executeEntities();

    for (const buildingEntity of buildings) {
      const buildingImpl = buildingEntity as EntityImpl;
      const building = buildingImpl.getComponent<BuildingComponent>(CT.Building);
      const pos = buildingImpl.getComponent<PositionComponent>(CT.Position);

      if (!building || !pos) {
        continue;
      }

      // Check if building is in this city
      if (isAgentInCity(pos.x, pos.y, cityDirector.bounds)) {
        buildingTypes.add(building.buildingType);
      }
    }

    return buildingTypes;
  }

  /**
   * Find a suitable location for a building in a city.
   * Returns null if no location found.
   */
  private findBuildingLocation(
    world: World,
    cityDirector: CityDirectorComponent,
    _buildingType: string
  ): { x: number; y: number } | null {
    const bounds = cityDirector.bounds;

    // Get all occupied positions in the city
    const occupiedPositions = new Set<string>();
    const entities = world.query().with(CT.Position).executeEntities();

    for (const entity of entities) {
      const pos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);
      if (pos && isAgentInCity(pos.x, pos.y, bounds)) {
        occupiedPositions.add(`${Math.floor(pos.x)},${Math.floor(pos.y)}`);
      }
    }

    // Try to find an unoccupied position in the city
    // Use a grid-based search starting from city center
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Search in a spiral pattern from center
    for (let radius = 1; radius < 20; radius++) {
      for (let angle = 0; angle < 360; angle += 30) {
        const rad = (angle * Math.PI) / 180;
        const x = Math.floor(centerX + radius * Math.cos(rad));
        const y = Math.floor(centerY + radius * Math.sin(rad));

        // Check if in bounds
        if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) {
          continue;
        }

        // Check if occupied
        const key = `${x},${y}`;
        if (!occupiedPositions.has(key)) {
          return { x, y };
        }
      }
    }

    return null; // No location found
  }

  /**
   * Spawn a building in a city.
   */
  private spawnBuilding(
    world: World,
    buildingType: string,
    position: { x: number; y: number },
    cityId: string
  ): void {
    // Create new building entity
    const worldMutator = world as WorldMutator;
    const entity = worldMutator.createEntity();

    // Add components
    // Buildings start already complete in NPC cities (instant construction)
    (entity as EntityImpl).addComponent(
      createBuildingComponent(buildingType as BuildingType, 1, 100)
    );
    (entity as EntityImpl).addComponent(createPositionComponent(position.x, position.y));
    (entity as EntityImpl).addComponent(createRenderableComponent(buildingType, 'building'));

    // Stamp the building layout onto world tiles if the blueprint has one
    this.stampBuildingLayout(world, buildingType, position, entity.id);

    // Emit events
    this.eventBus.emit({
      type: 'building:spawned',
      source: this.id,
      data: {
        buildingId: entity.id,
        buildingType,
        cityId,
        position,
        isComplete: true,
      },
    });

    // Also emit building:complete event so other systems can react
    this.eventBus.emit({
      type: 'building:complete',
      source: this.id,
      data: {
        buildingId: entity.id,
        entityId: entity.id,
        buildingType,
        position,
      },
    });

  }

  /**
   * Stamp a building's layout onto world tiles.
   * Uses the blueprint's ASCII layout to create actual wall/door/floor tiles.
   * Buildings without layouts (small items) are skipped.
   */
  private stampBuildingLayout(
    world: World,
    buildingType: string,
    position: { x: number; y: number },
    buildingId: string
  ): void {
    // Try to get the blueprint from the registry
    const registry = this.getBlueprintRegistry();
    const blueprint = registry.tryGet(buildingType);

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
      console.log(`[CityBuildingGen] Stamped ${tilesPlaced} tiles for ${blueprint.name} at (${position.x}, ${position.y})`);
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
}
