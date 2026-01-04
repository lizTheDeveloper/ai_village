/**
 * UpliftHelpers - Utility functions for genetic uplift system
 *
 * Helper functions for:
 * - Intelligence calculations
 * - Generation estimates
 * - Technology bonuses
 * - Readiness checks
 * - Name generation
 *
 * NOT YET INTEGRATED - Standalone utilities for testing
 */

import type { UpliftProgramComponent } from '../components/UpliftProgramComponent.js';
import type { ProtoSapienceComponent } from '../components/ProtoSapienceComponent.js';
import type { UpliftCandidateComponent } from '../components/UpliftCandidateComponent.js';

/**
 * Intelligence thresholds
 */
export const INTELLIGENCE_THRESHOLDS = {
  ANIMAL: 0.3,           // Base animal intelligence
  SMART_ANIMAL: 0.4,     // Intelligent animals (cats, dogs)
  PRE_SAPIENT: 0.5,      // Pre-sapient (corvids, octopuses)
  NEAR_SAPIENT: 0.6,     // High pre-sapient (primates, dolphins)
  PROTO_SAPIENT: 0.65,   // Proto-sapience markers emerge
  EMERGENCE: 0.68,       // Emergence threshold approached
  SAPIENCE: 0.70,        // Full sapience achieved
};

/**
 * Calculate intelligence gain per generation
 */
export function calculateIntelligenceGain(
  currentIntelligence: number,
  targetIntelligence: number,
  generationsRemaining: number,
  techMultiplier: number = 1.0,
  paperBonus: number = 0
): number {
  // Base gain
  const remaining = targetIntelligence - currentIntelligence;
  let baseGain = remaining / generationsRemaining;

  // Apply technology multiplier
  baseGain *= techMultiplier;

  // Apply paper bonus
  baseGain *= (1 + paperBonus);

  // Random variation (+/- 20%)
  const variation = 0.8 + Math.random() * 0.4;
  baseGain *= variation;

  return Math.max(0, baseGain);
}

/**
 * Estimate generations needed based on baseline intelligence
 */
export function estimateGenerationsNeeded(baselineIntelligence: number): number {
  if (baselineIntelligence >= 0.7) return 10;
  if (baselineIntelligence >= 0.6) return 15;
  if (baselineIntelligence >= 0.5) return 25;
  if (baselineIntelligence >= 0.4) return 60;
  return 100;
}

/**
 * Calculate accelerated generations with tech
 */
export function calculateAcceleratedGenerations(
  baseGenerations: number,
  techReduction: number,
  paperBonus: number = 0
): number {
  const totalReduction = Math.min(0.85, techReduction + paperBonus);
  return Math.ceil(baseGenerations * (1 - totalReduction));
}

/**
 * Check if proto-sapient entity is ready for sapience
 */
export function isReadyForSapience(proto: ProtoSapienceComponent): boolean {
  return proto.intelligence >= INTELLIGENCE_THRESHOLDS.SAPIENCE &&
         proto.passedMirrorTest &&
         proto.hasProtocolanguage &&
         proto.createsTools;
}

/**
 * Check if proto-sapient behaviors should emerge
 */
export function shouldEmergeBehaviors(intelligence: number): {
  toolUse: boolean;
  toolCreation: boolean;
  protoLanguage: boolean;
  mirrorTest: boolean;
  abstractThinking: boolean;
} {
  return {
    toolUse: intelligence >= 0.45,
    toolCreation: intelligence >= 0.55,
    protoLanguage: intelligence >= 0.60,
    mirrorTest: intelligence >= 0.65,
    abstractThinking: intelligence >= 0.68,
  };
}

/**
 * Calculate uplift potential score
 */
export function calculateUpliftPotential(
  neuralComplexity: number,
  problemSolving: number,
  socialIntelligence: number,
  communication: number,
  geneticHealth: number,
  populationSize: number
): number {
  const weights = {
    neuralComplexity: 40,
    problemSolving: 20,
    socialIntelligence: 15,
    communication: 10,
    geneticHealth: 10,
    populationSize: 5,
  };

  let score = 0;
  score += neuralComplexity * weights.neuralComplexity;
  score += problemSolving * weights.problemSolving;
  score += socialIntelligence * weights.socialIntelligence;
  score += communication * weights.communication;
  score += geneticHealth * weights.geneticHealth;

  const popScore = Math.min(1, populationSize / 100);
  score += popScore * weights.populationSize;

  return Math.round(score);
}

/**
 * Generate uplifted name
 */
export function generateUpliftedName(sourceSpeciesName: string): string {
  const prefixes = ['Neo', 'Uplift', 'Sapient', 'Evolved', 'Enhanced'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix}-${sourceSpeciesName}`;
}

/**
 * Generate individual uplifted entity name
 */
export function generateIndividualName(
  sourceSpecies: string,
  generation: number,
  isFirstAwakened: boolean = false
): string {
  if (isFirstAwakened) {
    // Special names for first awakened
    const firstNames = ['Eve', 'Adam', 'Prima', 'Genesis', 'Dawn', 'Nova'];
    return firstNames[Math.floor(Math.random() * firstNames.length)]!;
  }

  // Generation-based naming
  if (generation === 0) {
    // First generation (awakened from animal state)
    const prefixes = ['First', 'Alpha', 'Prime', 'Elder'];
    const suffixes = ['Mind', 'Thinker', 'Seeker', 'Wise', 'Bright'];
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${
      suffixes[Math.floor(Math.random() * suffixes.length)]
    }`;
  } else {
    // Natural-born sapient
    const syllables1 = ['Ka', 'La', 'Ma', 'Na', 'Ra', 'Sa', 'Ta'];
    const syllables2 = ['li', 'mi', 'ni', 'ri', 'si', 'ti', 'vi'];
    const syllables3 = ['an', 'en', 'on', 'ar', 'er', 'or'];

    return `${syllables1[Math.floor(Math.random() * syllables1.length)]}${
      syllables2[Math.floor(Math.random() * syllables2.length)]}${
      syllables3[Math.floor(Math.random() * syllables3.length)]}`;
  }
}

/**
 * Calculate expected time to completion (in ticks)
 */
export function calculateExpectedCompletion(
  generationsRemaining: number,
  ticksPerGeneration: number,
  currentTick: number
): number {
  return currentTick + (generationsRemaining * ticksPerGeneration);
}

/**
 * Calculate ticks per generation from maturity age
 */
export function calculateTicksPerGeneration(maturityAgeYears: number): number {
  const TPS = 20;
  const SECONDS_PER_YEAR = 60 * 60 * 24 * 365;
  return maturityAgeYears * SECONDS_PER_YEAR * TPS;
}

/**
 * Get intelligence category name
 */
export function getIntelligenceCategory(intelligence: number): string {
  if (intelligence >= INTELLIGENCE_THRESHOLDS.SAPIENCE) return 'Sapient';
  if (intelligence >= INTELLIGENCE_THRESHOLDS.PROTO_SAPIENT) return 'Proto-Sapient';
  if (intelligence >= INTELLIGENCE_THRESHOLDS.NEAR_SAPIENT) return 'Near-Sapient';
  if (intelligence >= INTELLIGENCE_THRESHOLDS.PRE_SAPIENT) return 'Pre-Sapient';
  if (intelligence >= INTELLIGENCE_THRESHOLDS.SMART_ANIMAL) return 'Smart Animal';
  return 'Animal';
}

/**
 * Get stage description
 */
export function getStageDescription(stage: string): string {
  const descriptions: Record<string, string> = {
    'population_establishment': 'Gathering breeding population',
    'genetic_baseline': 'Sequencing source genome',
    'selective_breeding': 'Breeding smartest individuals each generation',
    'gene_editing': 'CRISPR modifications active',
    'neural_enhancement': 'Brain structure modifications in progress',
    'pre_sapience': 'Proto-sapient behaviors emerging',
    'emergence_threshold': 'Final generation before awakening',
    'awakening': 'Sapience emerging!',
    'stabilization': 'Ensuring trait breeds true',
    'completed': 'Uplift complete',
  };

  return descriptions[stage] || 'Unknown stage';
}

/**
 * Get milestone description
 */
export function getMilestoneDescription(milestone: string): string {
  const descriptions: Record<string, string> = {
    'first_tool_use': 'First observed using tools!',
    'first_tool_creation': 'First created a tool (not just used)!',
    'proto_language_emergence': 'Proto-language detected!',
    'mirror_test_passed': 'Passed mirror self-recognition test!',
    'abstract_thinking': 'Abstract problem-solving observed!',
    'cultural_tradition_emerged': 'First cultural tradition formed!',
  };

  return descriptions[milestone] || milestone;
}

/**
 * Calculate progress percentage
 */
export function calculateProgressPercentage(
  currentGeneration: number,
  targetGeneration: number,
  currentIntelligence: number,
  targetIntelligence: number
): number {
  const generationProgress = currentGeneration / targetGeneration;
  const intelligenceProgress = currentIntelligence / targetIntelligence;

  return Math.round((generationProgress + intelligenceProgress) / 2 * 100);
}

/**
 * Validate uplift program configuration
 */
export function validateUpliftProgram(program: UpliftProgramComponent): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (program.populationSize < program.minimumPopulation) {
    errors.push(`Population too small: ${program.populationSize} < ${program.minimumPopulation}`);
  }

  if (program.geneticDiversity < 0.3) {
    errors.push(`Genetic diversity too low: ${program.geneticDiversity}`);
  }

  if (program.currentIntelligence > program.targetIntelligence) {
    errors.push('Current intelligence exceeds target');
  }

  if (program.acceleratedGenerations < 1) {
    errors.push('Invalid accelerated generations count');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if candidate is suitable for uplift
 */
export function isSuitableForUplift(candidate: UpliftCandidateComponent): boolean {
  return candidate.upliftPotential >= 30 &&
         candidate.populationSize >= 20 &&
         candidate.inbreedingRisk < 0.5 &&
         candidate.geneticHealth > 0.5;
}

/**
 * Get recommended uplift difficulty
 */
export function getUpliftDifficulty(candidate: UpliftCandidateComponent): 'easy' | 'moderate' | 'hard' | 'very_hard' {
  if (candidate.preSapient && candidate.populationSize >= 40) {
    return 'easy';
  } else if (candidate.upliftPotential >= 60) {
    return 'moderate';
  } else if (candidate.upliftPotential >= 40) {
    return 'hard';
  } else {
    return 'very_hard';
  }
}
