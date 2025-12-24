/**
 * Animal Housing Actions
 * Helper functions for assigning animals to housing and managing housing
 */

import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { AnimalComponent } from '../components/AnimalComponent.js';
import { isAnimalHousing, canHouseSpecies } from '../data/animalHousingDefinitions.js';

export interface AssignAnimalResult {
  success: boolean;
  reason?: string;
}

/**
 * Assign an animal to a housing building.
 * Per CLAUDE.md: NO SILENT FALLBACKS - validate all requirements and throw on error
 */
export function assignAnimalToHousing(
  world: World,
  animalEntityId: string,
  housingEntityId: string
): AssignAnimalResult {
  // Get animal entity
  const animalEntity = world.entities.get(animalEntityId);
  if (!animalEntity) {
    throw new Error(`Animal entity not found: ${animalEntityId}`);
  }

  const animalImpl = animalEntity as EntityImpl;
  const animal = animalImpl.getComponent<AnimalComponent>('animal');

  if (!animal) {
    throw new Error(`Entity ${animalEntityId} does not have AnimalComponent`);
  }

  // Get housing entity
  const housingEntity = world.entities.get(housingEntityId);
  if (!housingEntity) {
    throw new Error(`Housing entity not found: ${housingEntityId}`);
  }

  const housingImpl = housingEntity as EntityImpl;
  const building = housingImpl.getComponent<BuildingComponent>('building');

  if (!building) {
    throw new Error(`Entity ${housingEntityId} does not have BuildingComponent`);
  }

  // Validate building is animal housing
  if (!isAnimalHousing(building.buildingType)) {
    return {
      success: false,
      reason: `Building type ${building.buildingType} is not animal housing`,
    };
  }

  // Validate building is complete
  if (!building.isComplete) {
    return {
      success: false,
      reason: `Building is not complete (progress: ${building.progress}%)`,
    };
  }

  // Validate species compatibility
  if (!canHouseSpecies(building.buildingType, animal.speciesId)) {
    return {
      success: false,
      reason: `Cannot house ${animal.speciesId} in ${building.buildingType}. Allowed species: ${building.allowedSpecies.join(', ')}`,
    };
  }

  // Validate capacity
  if (building.currentOccupants.length >= building.animalCapacity) {
    return {
      success: false,
      reason: `Housing is full (${building.currentOccupants.length}/${building.animalCapacity})`,
    };
  }

  // Assign animal to housing
  animalImpl.updateComponent<AnimalComponent>('animal', (current) => ({
    ...current,
    housingBuildingId: housingEntityId,
  }));

  // Add to occupants list
  housingImpl.updateComponent<BuildingComponent>('building', (current) => ({
    ...current,
    currentOccupants: [...current.currentOccupants, animalEntityId],
  }));

  // Emit event
  world.eventBus.emit({
    type: 'animal:housed',
    source: animalEntityId,
    data: {
      animalId: animalEntityId,
      speciesId: animal.speciesId,
      housingId: housingEntityId,
      buildingType: building.buildingType,
    },
  });

  console.log(
    `[AnimalHousingActions] Assigned ${animal.speciesId} (${animalEntityId}) to ${building.buildingType} (${housingEntityId})`
  );

  return { success: true };
}

/**
 * Remove an animal from housing
 */
export function removeAnimalFromHousing(
  world: World,
  animalEntityId: string
): AssignAnimalResult {
  // Get animal entity
  const animalEntity = world.entities.get(animalEntityId);
  if (!animalEntity) {
    throw new Error(`Animal entity not found: ${animalEntityId}`);
  }

  const animalImpl = animalEntity as EntityImpl;
  const animal = animalImpl.getComponent<AnimalComponent>('animal');

  if (!animal) {
    throw new Error(`Entity ${animalEntityId} does not have AnimalComponent`);
  }

  if (!animal.housingBuildingId) {
    return {
      success: false,
      reason: 'Animal is not housed',
    };
  }

  const housingEntityId = animal.housingBuildingId;

  // Get housing entity
  const housingEntity = world.entities.get(housingEntityId);
  if (housingEntity) {
    const housingImpl = housingEntity as EntityImpl;
    const building = housingImpl.getComponent<BuildingComponent>('building');

    if (building) {
      // Remove from occupants list
      housingImpl.updateComponent<BuildingComponent>('building', (current) => ({
        ...current,
        currentOccupants: current.currentOccupants.filter((id) => id !== animalEntityId),
      }));
    }
  }

  // Remove housing assignment from animal
  animalImpl.updateComponent<AnimalComponent>('animal', (current) => ({
    ...current,
    housingBuildingId: undefined,
  }));

  // Emit event
  world.eventBus.emit({
    type: 'animal:unhoused',
    source: animalEntityId,
    data: {
      animalId: animalEntityId,
      speciesId: animal.speciesId,
      housingId: housingEntityId,
    },
  });

  console.log(`[AnimalHousingActions] Removed ${animal.speciesId} (${animalEntityId}) from housing`);

  return { success: true };
}

/**
 * Clean a housing building, restoring cleanliness to 100%
 */
export function cleanHousing(world: World, housingEntityId: string): AssignAnimalResult {
  // Get housing entity
  const housingEntity = world.entities.get(housingEntityId);
  if (!housingEntity) {
    throw new Error(`Housing entity not found: ${housingEntityId}`);
  }

  const housingImpl = housingEntity as EntityImpl;
  const building = housingImpl.getComponent<BuildingComponent>('building');

  if (!building) {
    throw new Error(`Entity ${housingEntityId} does not have BuildingComponent`);
  }

  // Validate building is animal housing
  if (!isAnimalHousing(building.buildingType)) {
    return {
      success: false,
      reason: `Building type ${building.buildingType} is not animal housing`,
    };
  }

  // Validate building is complete
  if (!building.isComplete) {
    return {
      success: false,
      reason: `Building is not complete (progress: ${building.progress}%)`,
    };
  }

  const previousCleanliness = building.cleanliness;

  // Restore cleanliness to 100%
  housingImpl.updateComponent<BuildingComponent>('building', (current) => ({
    ...current,
    cleanliness: 100,
  }));

  // Emit event
  world.eventBus.emit({
    type: 'housing:cleaned',
    source: housingEntityId,
    data: {
      buildingId: housingEntityId,
      buildingType: building.buildingType,
      previousCleanliness,
      newCleanliness: 100,
    },
  });

  console.log(
    `[AnimalHousingActions] Cleaned ${building.buildingType} (${housingEntityId}). Cleanliness: ${previousCleanliness.toFixed(0)}% → 100%`
  );

  return { success: true };
}

/**
 * Get housing capacity information
 */
export function getHousingInfo(world: World, housingEntityId: string) {
  const housingEntity = world.entities.get(housingEntityId);
  if (!housingEntity) {
    throw new Error(`Housing entity not found: ${housingEntityId}`);
  }

  const housingImpl = housingEntity as EntityImpl;
  const building = housingImpl.getComponent<BuildingComponent>('building');

  if (!building) {
    throw new Error(`Entity ${housingEntityId} does not have BuildingComponent`);
  }

  if (!isAnimalHousing(building.buildingType)) {
    throw new Error(`Building type ${building.buildingType} is not animal housing`);
  }

  return {
    buildingType: building.buildingType,
    capacity: building.animalCapacity,
    occupantCount: building.currentOccupants.length,
    occupants: building.currentOccupants,
    allowedSpecies: building.allowedSpecies,
    cleanliness: building.cleanliness,
    isComplete: building.isComplete,
    isFull: building.currentOccupants.length >= building.animalCapacity,
  };
}
