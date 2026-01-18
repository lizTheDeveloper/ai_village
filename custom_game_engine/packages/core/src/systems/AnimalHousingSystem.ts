import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { AnimalComponent } from '../components/AnimalComponent.js';
import { isAnimalHousing, getAnimalHousingDefinition } from '../data/animalHousingDefinitions.js';
import {
  CLEANLINESS_UPDATE_INTERVAL,
  CLEANLINESS_WARNING,
  CLEANLINESS_PENALTY,
  STRESS_PENALTY_MULTIPLIER,
} from '../constants/index.js';

/**
 * AnimalHousingSystem manages animal housing buildings:
 * - Tracks occupancy
 * - Manages cleanliness decay
 * - Applies housing effects to animals
 * - Validates housing assignments
 *
 * Dependencies:
 * - BuildingSystem (priority 50): Must run after building data is available
 *   - Uses Building components to track housing structures
 *   - Validates building completion state
 *
 * Note: TemperatureSystem (priority 20) applies temperature effects on animals
 * inside buildings. This system focuses on cleanliness and occupancy management.
 */
export class AnimalHousingSystem extends BaseSystem {
  public readonly id: SystemId = 'animal-housing';
  public readonly priority: number = 51; // Run after BuildingSystem (50)
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Building, CT.Position];
  protected readonly throttleInterval = 20; // NORMAL - 1 second

  private lastCleanlinessUpdate = 0;
  private readonly CLEANLINESS_UPDATE_INTERVAL = CLEANLINESS_UPDATE_INTERVAL; // Daily in seconds

  protected onUpdate(ctx: SystemContext): void {
    const currentTime = Date.now() / 1000;

    // Update cleanliness daily
    if (currentTime - this.lastCleanlinessUpdate >= this.CLEANLINESS_UPDATE_INTERVAL) {
      this.updateCleanliness(ctx);
      this.lastCleanlinessUpdate = currentTime;
    }

    // Apply housing effects to animals
    this.applyHousingEffects(ctx);

    // Validate housing assignments
    this.validateHousingAssignments(ctx);
  }

  /**
   * Update cleanliness for all animal housing buildings (daily)
   */
  private updateCleanliness(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>(CT.Building);

      if (!building || !isAnimalHousing(building.buildingType)) {
        continue;
      }

      // Skip if not complete
      if (!building.isComplete) {
        continue;
      }

      const occupantCount = building.currentOccupants.length;
      if (occupantCount === 0) {
        // No animals, no decay
        continue;
      }

      // Get housing definition for decay rate
      const definition = getAnimalHousingDefinition(building.buildingType);
      const dailyDecay = occupantCount * definition.cleanlinessDecayRate;

      const newCleanliness = Math.max(0, building.cleanliness - dailyDecay);

      impl.updateComponent<BuildingComponent>(CT.Building, (current) => ({
        ...current,
        cleanlinessLevel: newCleanliness,
      }));

      // Emit events based on cleanliness thresholds
      if (newCleanliness < CLEANLINESS_WARNING && building.cleanliness >= CLEANLINESS_WARNING) {
        ctx.world.eventBus.emit({
          type: 'housing:dirty',
          source: entity.id,
          data: {
            housingId: entity.id,
            buildingId: entity.id,
            buildingType: building.buildingType,
            cleanlinessLevel: newCleanliness,
          },
        });
      }
    }
  }

  /**
   * Apply housing effects to animals (comfort, stress reduction, etc.)
   */
  private applyHousingEffects(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const impl = entity as EntityImpl;
      const animal = impl.getComponent<AnimalComponent>(CT.Animal);

      if (!animal || !animal.housingBuildingId) {
        continue;
      }

      // Get housing building
      const housingEntity = ctx.world.entities.get(animal.housingBuildingId);
      if (!housingEntity) {
        // Housing no longer exists - unhouse animal
        impl.updateComponent<AnimalComponent>(CT.Animal, (current) => ({
          ...current,
          housingBuildingId: undefined,
        }));
        continue;
      }

      const housingImpl = housingEntity as EntityImpl;
      const building = housingImpl.getComponent<BuildingComponent>(CT.Building);

      if (!building || !isAnimalHousing(building.buildingType)) {
        // Not a valid housing building
        impl.updateComponent<AnimalComponent>(CT.Animal, (current) => ({
          ...current,
          housingBuildingId: undefined,
        }));
        continue;
      }

      // Apply cleanliness effects
      if (building.cleanliness < CLEANLINESS_PENALTY) {
        // Dirty housing causes stress
        const comfortPenalty = (CLEANLINESS_PENALTY - building.cleanliness) / CLEANLINESS_PENALTY; // 0-1 scale
        const stressPenalty = comfortPenalty * 10; // Up to 10 stress

        impl.updateComponent<AnimalComponent>(CT.Animal, (current) => ({
          ...current,
          stress: Math.min(100, current.stress + stressPenalty * STRESS_PENALTY_MULTIPLIER), // Small increase per tick
        }));
      }

      // Note: Temperature effects are handled by TemperatureSystem
      // which processes animals inside buildings
    }
  }

  /**
   * Validate housing assignments and update occupancy lists
   */
  private validateHousingAssignments(ctx: SystemContext): void {
    // Build map of housing -> animals
    const housingOccupancy = new Map<string, string[]>();

    // Scan all animals for housing assignments
    for (const entity of ctx.activeEntities) {
      const impl = entity as EntityImpl;
      const animal = impl.getComponent<AnimalComponent>(CT.Animal);

      if (!animal || !animal.housingBuildingId) {
        continue;
      }

      const occupants = housingOccupancy.get(animal.housingBuildingId) || [];
      occupants.push(entity.id);
      housingOccupancy.set(animal.housingBuildingId, occupants);
    }

    // Update building occupancy lists
    for (const entity of ctx.activeEntities) {
      const impl = entity as EntityImpl;
      const building = impl.getComponent<BuildingComponent>(CT.Building);

      if (!building || !isAnimalHousing(building.buildingType)) {
        continue;
      }

      const actualOccupants = housingOccupancy.get(entity.id) || [];

      // Update if changed
      if (
        building.currentOccupants.length !== actualOccupants.length ||
        !building.currentOccupants.every((id) => actualOccupants.includes(id))
      ) {
        impl.updateComponent<BuildingComponent>(CT.Building, (current) => ({
          ...current,
          currentOccupants: actualOccupants,
        }));

        // Emit capacity event if full
        if (actualOccupants.length >= building.animalCapacity) {
          ctx.world.eventBus.emit({
            type: 'housing:full',
            source: entity.id,
            data: {
            housingId: entity.id,
            buildingId: entity.id,
            buildingType: building.buildingType,
            capacity: building.animalCapacity,
            occupied: actualOccupants.length,
            },
          });
        }
      }
    }
  }

}
