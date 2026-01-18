/**
 * Plant, seed, and soil events.
 * Covers plant lifecycle, farming, and agriculture.
 */
import type { EntityId } from '../../types.js';

export interface PlantEvents {
  // === Soil Events ===
  'soil:tilled': {
    x: number;
    y: number;
    agentId?: EntityId;
  };
  'soil:watered': {
    x: number;
    y: number;
    amount: number;
  };
  'soil:fertilized': {
    x: number;
    y: number;
    fertilizerType: string;
    nutrientBoost: number;
  };
  'soil:depleted': {
    x: number;
    y: number;
    nutrientLevel: number;
  };
  'soil:moistureChanged': {
    x: number;
    y: number;
    oldMoisture: number;
    newMoisture: number;
  };

  // === Plant Lifecycle Events ===
  'plant:stageChanged': {
    plantId: EntityId;
    speciesId: string;
    from: string;
    to: string;
    entityId?: EntityId;
  };
  'plant:healthChanged': {
    plantId: EntityId;
    oldHealth: number;
    newHealth: number;
    reason?: string;
    entityId?: EntityId;
  };
  'plant:mature': {
    plantId: EntityId;
    speciesId: string;
    position?: { x: number; y: number };
  };
  'plant:died': {
    plantId: EntityId;
    speciesId: string;
    cause: string;
    entityId?: EntityId;
  };
  'plant:dead': {
    entityId: EntityId;
    position?: { x: number; y: number };
  };
  'plant:nutrientConsumption': {
    x: number;
    y: number;
    consumed: number;
    position?: { x: number; y: number };
  };
  'plant:nutrientReturn': {
    x: number;
    y: number;
    returned: number;
    position?: { x: number; y: number };
  };
  'plant:fruitRegenerated': {
    plantId: EntityId;
    speciesId: string;
    fruitAdded: number;
    totalFruit: number;
    position?: { x: number; y: number };
  };
  'plant:companionEffect': {
    plantId: EntityId;
    speciesId: string;
    position: { x: number; y: number };
    benefitCount: number;
    harmCount: number;
    modifier: number;
  };

  // === Plant Disease Events ===
  'plant:diseaseContracted': {
    entityId: string;
    diseaseId: string;
    diseaseName: string;
    incubationDays: number;
  };
  'plant:diseaseSymptoms': {
    entityId: string;
    diseaseId: string;
    diseaseName: string;
    severity: string;
  };
  'plant:diseaseSpread': {
    fromEntityId: string;
    toEntityId: string;
    diseaseId: string;
    diseaseName: string;
  };
  'plant:diseaseRecovered': {
    entityId: string;
    diseaseId: string;
    diseaseName: string;
  };
  'plant:diseaseTreated': {
    entityId: string;
    diseaseId: string;
    diseaseName: string;
    treatmentId: string;
  };
  'plant:diedFromDisease': {
    entityId: string;
    diseaseId: string;
    diseaseName: string;
  };

  // === Plant Pest Events ===
  'plant:pestInfestation': {
    entityId: string;
    pestId: string;
    pestName: string;
    population: number;
  };
  'plant:pestMigrated': {
    fromEntityId: string;
    toEntityId: string;
    pestId: string;
    pestName: string;
    population: number;
  };
  'plant:pestsGone': {
    entityId: string;
    pestId: string;
    pestName: string;
  };
  'plant:pestsEliminated': {
    entityId: string;
    pestId: string;
    pestName: string;
    treatmentId: string;
  };
  'plant:treated': {
    entityId: string;
    treatmentId: string;
    treatmentType: string;
  };

  // === Seed Events ===
  'seed:gathered': {
    agentId: EntityId;
    actorId?: EntityId;
    plantId: EntityId;
    speciesId: string;
    seedCount: number;
    sourceType?: 'wild' | 'cultivated';
    position?: { x: number; y: number };
    actionId?: string;
  };
  'seed:harvested': {
    agentId: EntityId;
    actorId?: EntityId;
    plantId: EntityId;
    speciesId: string;
    seedCount: number;
    seedsHarvested?: number;
    farmingSkill?: number;
    plantHealth?: number;
    plantStage?: string;
    generation?: number;
    position?: { x: number; y: number };
    actionId?: string;
  };
  'seed:dispersed': {
    plantId: EntityId;
    speciesId: string;
    seedCount: number;
    positions: Array<{ x: number; y: number }>;
    position?: { x: number; y: number };
    seed?: any; // SeedComponent - optional to avoid circular dependency
  };
  'seed:germinated': {
    seedId: EntityId;
    speciesId: string;
    position: { x: number; y: number };
    generation?: number;
  };
  'seed:planted': {
    actionId?: string;
    actorId: EntityId;
    speciesId: string;
    position: { x: number; y: number };
    seedItemId?: string;
  };

  // === Wild Plant Population Events ===
  'wild_plant:spawn': {
    speciesId: string;
    position: { x: number; y: number };
    biome: string;
  };

  // === Harvest Events ===
  'harvest:completed': {
    agentId: EntityId;
    position: { x: number; y: number };
    harvested: Array<{ itemId: string; amount: number }>;
  };
}

export type PlantEventType = keyof PlantEvents;
export type PlantEventData = PlantEvents[PlantEventType];
