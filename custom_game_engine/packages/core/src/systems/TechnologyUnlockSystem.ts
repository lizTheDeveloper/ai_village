/**
 * TechnologyUnlockSystem - Watches for building construction and unlocks technologies
 *
 * This system implements the "player as first mover" mechanic:
 * - When the player's city builds something new, it unlocks globally
 * - Other NPC cities can then start building it
 * - Special unlocks trigger additional mechanics (universities, internet, etc.)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
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
import type { ISystemRegistry } from '../ecs/SystemRegistry.js';

/**
 * TechnologyUnlockSystem watches for new buildings and unlocks them globally.
 */
export class TechnologyUnlockSystem extends BaseSystem {
  public readonly id: SystemId = 'technology_unlock';
  public readonly priority: number = 16; // Run after building system
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private systemRegistry: ISystemRegistry;
  private lastCheckedTick: number = 0;
  private checkedBuildings: Set<string> = new Set(); // Track which buildings we've already processed

  // Cache cities to avoid repeated queries
  private cachedCities: ReadonlyArray<Entity> = [];
  private lastCityCount: number = 0;

  constructor(eventBus: CoreEventBus, systemRegistry: ISystemRegistry) {
    super();
    this.systemRegistry = systemRegistry;
  }

  /**
   * Update - scan for newly completed buildings.
   */
  protected onUpdate(ctx: SystemContext): void {
    // Get the global technology unlock singleton
    const unlockEntities = ctx.world.query().with(CT.TechnologyUnlock).executeEntities();
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
    if (ctx.tick - this.lastCheckedTick >= 100) {
      // Every 5 seconds
      this.scanForNewBuildings(ctx.world, unlock);
      this.lastCheckedTick = ctx.tick;
    }
  }


  /**
   * Scan for newly completed buildings and unlock them if from player city.
   */
  private scanForNewBuildings(world: World, unlock: TechnologyUnlockComponent): void {
    // Get all completed buildings
    const buildings = world.query().with(CT.Building, CT.Position).executeEntities();

    // Cache cities query (only rebuild when count changes)
    const currentCityCount = world.query().with(CT.CityDirector).count();
    if (currentCityCount !== this.lastCityCount) {
      this.cachedCities = world.query().with(CT.CityDirector).executeEntities();
      this.lastCityCount = currentCityCount;
    }
    const cities = this.cachedCities;

    for (const buildingEntity of buildings) {
      const buildingImpl = buildingEntity as EntityImpl;

      // Skip if already checked (BEFORE getting components)
      if (this.checkedBuildings.has(buildingImpl.id)) {
        continue;
      }

      const building = buildingImpl.getComponent<BuildingComponent>(CT.Building);
      const pos = buildingImpl.getComponent<PositionComponent>(CT.Position);

      if (!building || !pos || !building.isComplete) {
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

      // Skip if already checked (BEFORE getting components)
      if (this.checkedBuildings.has(entityImpl.id)) {
        continue;
      }

      // Find which city this is in (would need position component)
      const pos = entityImpl.getComponent<PositionComponent>(CT.Position);
      if (!pos) {
        continue;
      }

      // Check if already unlocked
      if (isBuildingUnlocked(unlock, 'publishing_company')) {
        this.checkedBuildings.add(entityImpl.id);
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

      // Skip if already checked (BEFORE getting components)
      if (this.checkedBuildings.has(entityImpl.id)) {
        continue;
      }

      const pos = entityImpl.getComponent<PositionComponent>(CT.Position);
      if (!pos) {
        continue;
      }

      // Check if already unlocked
      if (isBuildingUnlocked(unlock, 'newspaper')) {
        this.checkedBuildings.add(entityImpl.id);
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
    this.events.emit('technology:building_unlocked', {
      buildingType,
      cityId,
      tick: world.tick,
    });

    // Enable systems that require this technology
    this.enableSystemsForTechnology(world, buildingType);
  }

  /**
   * Enable systems that are gated by specific technologies
   */
  private enableSystemsForTechnology(_world: World, buildingType: string): void {
    // Uplift systems - enabled when research_lab is built
    if (buildingType === 'research_lab') {
      console.log('[TechnologyUnlock] Enabling Uplift systems (research_lab unlocked)');
      this.systemRegistry.enable('UpliftCandidateDetectionSystem');
      this.systemRegistry.enable('ProtoSapienceObservationSystem');
      this.systemRegistry.enable('ConsciousnessEmergenceSystem');
      this.systemRegistry.enable('UpliftBreedingProgramSystem');
    }

    // VR systems - enabled when vr_center or research_lab is built
    if (buildingType === 'vr_center' || buildingType === 'research_lab') {
      console.log('[TechnologyUnlock] Enabling VR systems');
      this.systemRegistry.enable('VRSystem');
    }

    // Parasitic Reproduction - enabled when biology_lab is built
    if (buildingType === 'biology_lab' || buildingType === 'research_lab') {
      console.log('[TechnologyUnlock] Enabling Parasitic Reproduction systems');
      this.systemRegistry.enable('ParasiticReproductionSystem');
    }

    // Neural Interface systems - enabled when research_lab is built
    if (buildingType === 'research_lab' || buildingType === 'neural_lab') {
      console.log('[TechnologyUnlock] Enabling Neural Interface systems');
      this.systemRegistry.enable('NeuralInterfaceSystem');
      this.systemRegistry.enable('VRTrainingSystem');
    }

    // Television systems - enabled when television_station is built
    if (buildingType === 'television_station' || buildingType === 'broadcast_tower') {
      console.log('[TechnologyUnlock] Enabling Television systems (TV industry unlocked)');
      // TV Show Formats
      this.systemRegistry.enable('GameShowSystem');
      this.systemRegistry.enable('NewsroomSystem');
      this.systemRegistry.enable('SoapOperaSystem');
      this.systemRegistry.enable('TalkShowSystem');
      // TV Production Pipeline
      this.systemRegistry.enable('TVWritingSystem');
      this.systemRegistry.enable('TVDevelopmentSystem');
      this.systemRegistry.enable('TVProductionSystem');
      this.systemRegistry.enable('TVPostProductionSystem');
      this.systemRegistry.enable('TVBroadcastingSystem');
      this.systemRegistry.enable('TVRatingsSystem');
      this.systemRegistry.enable('TVCulturalImpactSystem');
      this.systemRegistry.enable('TVArchiveSystem');
      this.systemRegistry.enable('TVAdvertisingSystem');
    }

    // Plot & Narrative systems - enabled when library or university is built
    if (buildingType === 'library' || buildingType === 'university') {
      console.log('[TechnologyUnlock] Enabling Plot & Narrative systems (storytelling unlocked)');
      this.systemRegistry.enable('PlotAssignmentSystem');
      this.systemRegistry.enable('PlotProgressionSystem');
      this.systemRegistry.enable('NarrativePressureSystem');
    }
  }
}
