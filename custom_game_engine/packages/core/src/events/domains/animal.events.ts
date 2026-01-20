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
  animal_spawned: {
    animalId: EntityId;
    speciesId: string;
    position: { x: number; y: number };
    chunkX: number;
    chunkY: number;
    biome: string;
  };
  animal_died: {
    animalId: EntityId;
    speciesId: string;
    cause: string;
  };
  animal_tamed: {
    animalId: EntityId;
    tamerId: EntityId;
    agentId: EntityId;
    method: string;
  };
  'animal:life_stage_change': {
    animalId: EntityId;
    oldStage: 'infant' | 'juvenile' | 'adult' | 'elder';
    newStage: 'infant' | 'juvenile' | 'adult' | 'elder';
    ageDays: number;
  };
  animal_state_changed: {
    animalId: EntityId;
    from: string;
    to: string;
  };
  product_ready: {
    animalId: EntityId;
    productType: string;
    productId: string;
    itemId: string;
    amount: number;
  };
}
export type AnimalEventType = keyof AnimalEvents;
export type AnimalEventData = AnimalEvents[AnimalEventType];
