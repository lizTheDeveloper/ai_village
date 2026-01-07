/**
 * @ai-village/botany - Plant systems for AI Village
 *
 * This package provides plant-related systems for:
 * - Plant lifecycle management (growth, health, harvest)
 * - Plant discovery and knowledge acquisition
 * - Disease and pest management
 * - Wild plant population ecology
 *
 * These systems work together to create a rich botanical simulation.
 */

// Systems
export { PlantSystem } from './systems/PlantSystem.js';
export { PlantDiscoverySystem, type PlantUseResult, type PlantEffect } from './systems/PlantDiscoverySystem.js';
export { PlantDiseaseSystem, type PlantDiseaseSystemConfig } from './systems/PlantDiseaseSystem.js';
export {
  WildPlantPopulationSystem,
  type PopulationConfig,
  type SeedBankEntry,
  type BiomeDistribution,
} from './systems/WildPlantPopulationSystem.js';

// Re-export core types for convenience
export type {
  System,
  SystemId,
  ComponentType,
  World,
  Entity,
  PlantComponent,
  SeedComponent,
  PlantSpecies,
  PlantKnowledgeComponent,
} from '@ai-village/core';
