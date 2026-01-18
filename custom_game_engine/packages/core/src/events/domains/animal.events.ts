/**
 * Animal-related events.
 */
import type { EntityId } from '../../types.js';

export interface AnimalEvents {
  'animal:housed': {
    animalId: EntityId;
    housingId: EntityId;
    speciesId?: string;
    buildingType?: string;
  };
  'animal:unhoused': {
    animalId: EntityId;
    housingId: EntityId;
    speciesId?: string;
    buildingType?: string;
  };
  'animal:behavior_changed': {
    animalId: EntityId;
    from: string;
    to: string;
    reason?: string;
  };
  'animal:fleeing': {
    animalId: EntityId;
    threatId: EntityId;
    distanceToThreat: number;
  };
  'animal:grazing': {
    animalId: EntityId;
    plantId: EntityId;
    speciesId: string;
  };
  'animal:resting': {
    animalId: EntityId;
    energyLevel: number;
    isSleeping: boolean;
    inHousing: boolean;
  };
}
export type AnimalEventType = keyof AnimalEvents;
export type AnimalEventData = AnimalEvents[AnimalEventType];
