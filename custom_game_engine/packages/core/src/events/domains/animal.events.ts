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
  'animal:migration_started': {
    animalId: EntityId;
    speciesId: string;
    fromBiome: string;
    toBiome: string;
    season: string;
  };
  'animal:migration_completed': {
    animalId: EntityId;
    speciesId: string;
    biome: string;
  };
  'creature:imported': {
    entityId: EntityId;
    sourceGame: string;
    migrationType: string;
    speciesId: string;
    intelligenceExpression?: number;
    cognitiveCeiling?: number;
  };
  'species:unique_behavior_registered': {
    entityId: EntityId;
    speciesId: string;
    behaviorId: string;
    triggerHint: string;
    description: string;
  };
  'species:interspecies_relation_registered': {
    entityId: EntityId;
    sourceSpeciesId: string;
    targetSpeciesId: string;
    disposition: string;
    description?: string;
  };
  'species:unique_behavior_triggered': {
    entityId: EntityId;
    speciesId: string;
    behaviorId: string;
    triggerHint: string;
    behaviorState: string;
    reason: string;
  };
  'creature:quarantine_phase_changed': {
    entityId: EntityId;
    oldPhase: string;
    newPhase: string;
  };
  'creature:quarantine_complete': {
    entityId: EntityId;
    adaptationScore: number;
    totalTicks: number;
  };
  // Extinction vortex events
  'species:extinction_warning': {
    speciesId: string;
    phase: 'warning';
    metrics: { fPopulation: number; dccPopulation: number; populationSize: number };
  };
  'species:extinction_grace_started': {
    speciesId: string;
    graceTicksRemaining: number;
    metrics: { fPopulation: number; dccPopulation: number; populationSize: number };
  };
  'species:extinction_grace_tick': {
    speciesId: string;
    graceTicksRemaining: number;
  };
  'species:extinct': {
    speciesId: string;
    finalMetrics: { fPopulation: number; dccPopulation: number; populationSize: number };
    survivorCount: number;
  };
  'species:extinction_recovered': {
    speciesId: string;
    fromPhase: 'warning' | 'grace';
    metrics: { fPopulation: number; dccPopulation: number; populationSize: number };
  };
  'species:survivors_flagged': {
    speciesId: string;
    survivorCount: number;
    lastSurvivorGeneration: number;
  };
}
export type AnimalEventType = keyof AnimalEvents;
export type AnimalEventData = AnimalEvents[AnimalEventType];
