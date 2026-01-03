/**
 * TechnologyUnlockSystem - Watches for building construction and unlocks technologies
 *
 * This system implements the "player as first mover" mechanic:
 * - When the player's city builds something new, it unlocks globally
 * - Other NPC cities can then start building it
 * - Special unlocks trigger additional mechanics (universities, internet, etc.)
 */

import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus as CoreEventBus } from '../events/EventBus.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { TechnologyUnlockComponent } from '../components/TechnologyUnlockComponent.js';
import {
  unlockBuilding,
  isBuildingUnlocked,
  isPlayerCity,
} from '../components/TechnologyUnlockComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { CityDirectorComponent } from '../components/CityDirectorComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { isAgentInCity } from '../components/CityDirectorComponent.js';

/**
 * TechnologyUnlockSystem watches for new buildings and unlocks them globally.
 */
export class TechnologyUnlockSystem implements System {
  public readonly id: SystemId = 'technology_unlock';
  public readonly priority: number = 16; // Run after building system
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus: CoreEventBus;
  private lastCheckedTick: number = 0;
  private checkedBuildings: Set<string> = new Set(); // Track which buildings we've already processed

  constructor(eventBus: CoreEventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Update - scan for newly completed buildings.
   */
  public update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Get the global technology unlock singleton
    const unlockEntities = world.query().with(CT.TechnologyUnlock).executeEntities();
    if (unlockEntities.length === 0) {
      // No unlock tracker yet - nothing to do
      return;
    }

    const unlockEntity = unlockEntities[0] as EntityImpl;
    const unlock = unlockEntity.getComponent<TechnologyUnlockComponent>(CT.TechnologyUnlock);
    if (!unlock) {
      return;
    }

    // Periodically scan for completed buildings (in case event was missed)
    if (world.tick - this.lastCheckedTick >= 100) {
      // Every 5 seconds
      this.scanForNewBuildings(world, unlock);
      this.lastCheckedTick = world.tick;
    }
  }


  /**
   * Scan for newly completed buildings and unlock them if from player city.
   */
  private scanForNewBuildings(world: World, unlock: TechnologyUnlockComponent): void {
    // Get all completed buildings
    const buildings = world.query().with(CT.Building, CT.Position).executeEntities();

    // Get all cities
    const cities = world.query().with(CT.CityDirector).executeEntities();

    for (const buildingEntity of buildings) {
      const buildingImpl = buildingEntity as EntityImpl;
      const building = buildingImpl.getComponent<BuildingComponent>(CT.Building);
      const pos = buildingImpl.getComponent<PositionComponent>(CT.Position);

      if (!building || !pos || !building.isComplete) {
        continue;
      }

      // Skip if already checked
      if (this.checkedBuildings.has(buildingImpl.id)) {
        continue;
      }

      // Mark as checked
      this.checkedBuildings.add(buildingImpl.id);

      const buildingType = building.buildingType;

      // Check if already unlocked
      if (isBuildingUnlocked(unlock, buildingType)) {
        continue;
      }

      // Find which city this building is in
      let buildingCityId: string | null = null;
      for (const cityEntity of cities) {
        const cityImpl = cityEntity as EntityImpl;
        const cityDirector = cityImpl.getComponent<CityDirectorComponent>(CT.CityDirector);
        if (cityDirector && isAgentInCity(pos.x, pos.y, cityDirector.bounds)) {
          buildingCityId = cityDirector.cityId;
          break;
        }
      }

      // Only unlock if built in player's city
      if (buildingCityId && isPlayerCity(unlock, buildingCityId)) {
        this.unlockBuildingGlobally(world, unlock, buildingType, buildingCityId);
      }
    }

    // Also check for PublishingCompany and Newspaper components (not buildingType)
    this.checkForOrganizationBuildings(world, unlock, cities);
  }

  /**
   * Check for organization buildings (PublishingCompany, Newspaper, etc.)
   */
  private checkForOrganizationBuildings(
    world: World,
    unlock: TechnologyUnlockComponent,
    cities: ReadonlyArray<Entity>
  ): void {
    // Check for publishing companies
    const publishingCompanies = world.query().with(CT.PublishingCompany).executeEntities();
    for (const entity of publishingCompanies) {
      const entityImpl = entity as EntityImpl;

      // Skip if already checked
      if (this.checkedBuildings.has(entityImpl.id)) {
        continue;
      }

      // Check if already unlocked
      if (isBuildingUnlocked(unlock, 'publishing_company')) {
        this.checkedBuildings.add(entityImpl.id);
        continue;
      }

      // Find which city this is in (would need position component)
      const pos = entityImpl.getComponent<PositionComponent>(CT.Position);
      if (!pos) {
        continue;
      }

      let cityId: string | null = null;
      for (const cityEntity of cities) {
        const cityImpl = cityEntity as EntityImpl;
        const cityDirector = cityImpl.getComponent<CityDirectorComponent>(CT.CityDirector);
        if (cityDirector && isAgentInCity(pos.x, pos.y, cityDirector.bounds)) {
          cityId = cityDirector.cityId;
          break;
        }
      }

      if (cityId && isPlayerCity(unlock, cityId)) {
        this.checkedBuildings.add(entityImpl.id);
        this.unlockBuildingGlobally(world, unlock, 'publishing_company', cityId);
      }
    }

    // Check for newspapers
    const newspapers = world.query().with(CT.Newspaper).executeEntities();
    for (const entity of newspapers) {
      const entityImpl = entity as EntityImpl;

      // Skip if already checked
      if (this.checkedBuildings.has(entityImpl.id)) {
        continue;
      }

      // Check if already unlocked
      if (isBuildingUnlocked(unlock, 'newspaper')) {
        this.checkedBuildings.add(entityImpl.id);
        continue;
      }

      const pos = entityImpl.getComponent<PositionComponent>(CT.Position);
      if (!pos) {
        continue;
      }

      let cityId: string | null = null;
      for (const cityEntity of cities) {
        const cityImpl = cityEntity as EntityImpl;
        const cityDirector = cityImpl.getComponent<CityDirectorComponent>(CT.CityDirector);
        if (cityDirector && isAgentInCity(pos.x, pos.y, cityDirector.bounds)) {
          cityId = cityDirector.cityId;
          break;
        }
      }

      if (cityId && isPlayerCity(unlock, cityId)) {
        this.checkedBuildings.add(entityImpl.id);
        this.unlockBuildingGlobally(world, unlock, 'newspaper', cityId);
      }
    }
  }

  /**
   * Unlock a building type globally.
   */
  private unlockBuildingGlobally(
    world: World,
    unlock: TechnologyUnlockComponent,
    buildingType: string,
    cityId: string
  ): void {
    unlockBuilding(unlock, buildingType, world.tick, cityId);

    // Emit unlock event
    this.eventBus.emit({
      type: 'technology:building_unlocked',
      source: this.id,
      data: {
        buildingType,
        cityId,
        tick: world.tick,
      },
    });

    // Log for visibility
    console.log(
      `[TechnologyUnlock] ${buildingType} unlocked globally by city ${cityId} at tick ${world.tick}`
    );
  }
}
