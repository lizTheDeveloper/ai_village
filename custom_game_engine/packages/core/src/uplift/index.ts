/**
 * Genetic Uplift System - Entry Point
 *
 * Multi-generational breeding programs to uplift non-sapient animals to sapience.
 *
 * Components:
 * - UpliftCandidateComponent - Marks animals suitable for uplift
 * - UpliftProgramComponent - Tracks breeding program progress
 * - ProtoSapienceComponent - Tracks proto-sapient behaviors
 * - UpliftedTraitComponent - Marks sapient uplifted beings
 *
 * Systems:
 * - UpliftCandidateDetectionSystem - Evaluates animals
 * - UpliftBreedingProgramSystem - Manages generations
 * - ProtoSapienceObservationSystem - Tracks behavior emergence
 * - ConsciousnessEmergenceSystem - Handles awakening
 * - UpliftedSpeciesRegistrationSystem - Creates new species
 *
 * Technologies:
 * - Consciousness Studies (Tier 1)
 * - Genetic Engineering (Tier 2)
 * - Neural Augmentation (Tier 2)
 * - Nano Gene Editing (Tier 3)
 * - Consciousness Transfer (Tier 3)
 * - Mass Uplift Protocol (Tier 3)
 *
 * NOT YET INTEGRATED - All systems are standalone for testing
 */

// Systems
export { UpliftCandidateDetectionSystem } from './UpliftCandidateDetectionSystem.js';
export { UpliftBreedingProgramSystem } from './UpliftBreedingProgramSystem.js';
export { ProtoSapienceObservationSystem } from './ProtoSapienceObservationSystem.js';
export { ConsciousnessEmergenceSystem } from './ConsciousnessEmergenceSystem.js';
export { UpliftedSpeciesRegistrationSystem, UpliftedSpeciesRegistry } from './UpliftedSpeciesRegistrationSystem.js';

// Technology Definitions
export {
  UPLIFT_TECHNOLOGIES,
  CONSCIOUSNESS_STUDIES_TECH,
  GENETIC_ENGINEERING_TECH,
  NEURAL_AUGMENTATION_TECH,
  SELECTIVE_BREEDING_PROTOCOLS_TECH,
  NANO_GENE_EDITING_TECH,
  UPLIFT_CONSCIOUSNESS_TRANSFER_TECH,
  MASS_UPLIFT_PROTOCOL_TECH,
  calculateTechGenerationReduction,
  getUpliftTechTree,
} from './UpliftTechnologyDefinitions.js';

// Helper Utilities
export {
  INTELLIGENCE_THRESHOLDS,
  calculateIntelligenceGain,
  estimateGenerationsNeeded,
  calculateAcceleratedGenerations,
  isReadyForSapience,
  shouldEmergeBehaviors,
  calculateUpliftPotential,
  generateUpliftedName,
  generateIndividualName,
  calculateExpectedCompletion,
  calculateTicksPerGeneration,
  getIntelligenceCategory,
  getStageDescription,
  getMilestoneDescription,
  calculateProgressPercentage,
  validateUpliftProgram,
  isSuitableForUplift,
  getUpliftDifficulty,
} from './UpliftHelpers.js';
