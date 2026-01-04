/**
 * UpliftHelpers Test Suite
 *
 * Unit tests for all utility functions in UpliftHelpers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
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
} from '../UpliftHelpers.js';
import { ProtoSapienceComponent } from '../../components/ProtoSapienceComponent.js';
import { UpliftProgramComponent } from '../../components/UpliftProgramComponent.js';
import { UpliftCandidateComponent } from '../../components/UpliftCandidateComponent.js';

describe('UpliftHelpers - Intelligence Calculations', () => {
  it('should calculate intelligence gain correctly', () => {
    const gain = calculateIntelligenceGain(0.5, 0.7, 10, 1.0, 0);
    expect(gain).toBeGreaterThan(0);
    expect(gain).toBeLessThanOrEqual(0.02 * 1.4); // Max with 20% variation
  });

  it('should apply technology multiplier', () => {
    const baseGain = calculateIntelligenceGain(0.5, 0.7, 10, 1.0, 0);
    const techGain = calculateIntelligenceGain(0.5, 0.7, 10, 1.5, 0);
    // Tech gain should be roughly 1.5x base (with random variation)
    expect(techGain).toBeGreaterThan(baseGain * 0.8);
  });

  it('should apply paper bonus', () => {
    // Run multiple times to account for random variation
    const baseGains: number[] = [];
    const paperGains: number[] = [];
    for (let i = 0; i < 100; i++) {
      baseGains.push(calculateIntelligenceGain(0.5, 0.7, 10, 1.0, 0));
      paperGains.push(calculateIntelligenceGain(0.5, 0.7, 10, 1.0, 0.2));
    }
    const avgBase = baseGains.reduce((a, b) => a + b) / baseGains.length;
    const avgPaper = paperGains.reduce((a, b) => a + b) / paperGains.length;
    expect(avgPaper).toBeGreaterThan(avgBase);
  });

  it('should estimate generations for different intelligence levels', () => {
    expect(estimateGenerationsNeeded(0.7)).toBe(10);  // Near-sapient
    expect(estimateGenerationsNeeded(0.6)).toBe(15);  // High pre-sapient
    expect(estimateGenerationsNeeded(0.5)).toBe(25);  // Pre-sapient
    expect(estimateGenerationsNeeded(0.4)).toBe(60);  // Smart animal
    expect(estimateGenerationsNeeded(0.3)).toBe(100); // Basic animal
  });

  it('should calculate accelerated generations with tech', () => {
    const base = 100;
    const accelerated = calculateAcceleratedGenerations(base, 0.7, 0);
    // Should be ~30, allow ±1 for Math.ceil rounding
    expect(accelerated).toBeGreaterThanOrEqual(29);
    expect(accelerated).toBeLessThanOrEqual(31);
  });

  it('should cap acceleration at 85%', () => {
    const base = 100;
    const accelerated = calculateAcceleratedGenerations(base, 0.9, 0.1);
    // Should be ~15, allow ±1 for Math.ceil rounding
    expect(accelerated).toBeGreaterThanOrEqual(14);
    expect(accelerated).toBeLessThanOrEqual(16);
  });
});

describe('UpliftHelpers - Readiness Checks', () => {
  let proto: ProtoSapienceComponent;

  beforeEach(() => {
    proto = new ProtoSapienceComponent({
      intelligence: 0.7,
      usesTools: true,
      createsTools: true,
      hasProtocolanguage: true,
      passedMirrorTest: true,
      showsAbstractThinking: true,
    });
  });

  it('should detect readiness for sapience', () => {
    expect(isReadyForSapience(proto)).toBe(true);
  });

  it('should reject if intelligence too low', () => {
    proto.intelligence = 0.65;
    expect(isReadyForSapience(proto)).toBe(false);
  });

  it('should reject if mirror test not passed', () => {
    proto.passedMirrorTest = false;
    expect(isReadyForSapience(proto)).toBe(false);
  });

  it('should reject if no proto-language', () => {
    proto.hasProtocolanguage = false;
    expect(isReadyForSapience(proto)).toBe(false);
  });

  it('should reject if does not create tools', () => {
    proto.createsTools = false;
    expect(isReadyForSapience(proto)).toBe(false);
  });

  it('should determine behavior emergence thresholds', () => {
    const behaviors45 = shouldEmergeBehaviors(0.45);
    expect(behaviors45.toolUse).toBe(true);
    expect(behaviors45.toolCreation).toBe(false);
    expect(behaviors45.protoLanguage).toBe(false);

    const behaviors60 = shouldEmergeBehaviors(0.60);
    expect(behaviors60.toolUse).toBe(true);
    expect(behaviors60.toolCreation).toBe(true);
    expect(behaviors60.protoLanguage).toBe(true);
    expect(behaviors60.mirrorTest).toBe(false);

    const behaviors68 = shouldEmergeBehaviors(0.68);
    expect(behaviors68.mirrorTest).toBe(true);
    expect(behaviors68.abstractThinking).toBe(true);
  });
});

describe('UpliftHelpers - Uplift Potential', () => {
  it('should calculate uplift potential from metrics', () => {
    const potential = calculateUpliftPotential(
      0.7,  // neuralComplexity
      0.6,  // problemSolving
      0.5,  // socialIntelligence
      0.4,  // communication
      0.8,  // geneticHealth
      50    // populationSize
    );

    expect(potential).toBeGreaterThan(0);
    expect(potential).toBeLessThanOrEqual(100);
  });

  it('should weight neural complexity highest', () => {
    const highNeural = calculateUpliftPotential(1.0, 0.5, 0.5, 0.5, 0.5, 50);
    const lowNeural = calculateUpliftPotential(0.3, 0.5, 0.5, 0.5, 0.5, 50);
    expect(highNeural).toBeGreaterThan(lowNeural);
  });

  it('should account for population size', () => {
    const largePop = calculateUpliftPotential(0.7, 0.6, 0.5, 0.4, 0.8, 100);
    const smallPop = calculateUpliftPotential(0.7, 0.6, 0.5, 0.4, 0.8, 10);
    expect(largePop).toBeGreaterThan(smallPop);
  });
});

describe('UpliftHelpers - Name Generation', () => {
  it('should generate uplifted species name', () => {
    const name = generateUpliftedName('Wolf');
    expect(name).toMatch(/^(Neo|Uplift|Sapient|Evolved|Enhanced)-Wolf$/);
  });

  it('should generate first awakened name', () => {
    const name = generateIndividualName('wolf', 0, true);
    expect(['Eve', 'Adam', 'Prima', 'Genesis', 'Dawn', 'Nova']).toContain(name);
  });

  it('should generate generation 0 name', () => {
    const name = generateIndividualName('wolf', 0, false);
    expect(name).toMatch(/^(First|Alpha|Prime|Elder)-(Mind|Thinker|Seeker|Wise|Bright)$/);
  });

  it('should generate natural-born sapient name', () => {
    const name = generateIndividualName('wolf', 5, false);
    expect(name).toMatch(/^[A-Z][a-z]{5}$/); // 3 syllables, 6 chars
  });
});

describe('UpliftHelpers - Time Calculations', () => {
  it('should calculate ticks per generation from maturity age', () => {
    const wolfsPerGeneration = calculateTicksPerGeneration(2); // 2 years
    const TPS = 20;
    const SECONDS_PER_YEAR = 60 * 60 * 24 * 365;
    expect(wolfsPerGeneration).toBe(2 * SECONDS_PER_YEAR * TPS);
  });

  it('should calculate expected completion tick', () => {
    const completion = calculateExpectedCompletion(10, 1000, 50000);
    expect(completion).toBe(50000 + (10 * 1000));
  });
});

describe('UpliftHelpers - Intelligence Categories', () => {
  it('should categorize intelligence levels', () => {
    expect(getIntelligenceCategory(0.75)).toBe('Sapient');
    expect(getIntelligenceCategory(0.68)).toBe('Proto-Sapient');
    expect(getIntelligenceCategory(0.62)).toBe('Near-Sapient');
    expect(getIntelligenceCategory(0.52)).toBe('Pre-Sapient');
    expect(getIntelligenceCategory(0.42)).toBe('Smart Animal');
    expect(getIntelligenceCategory(0.32)).toBe('Animal');
  });
});

describe('UpliftHelpers - Stage & Milestone Descriptions', () => {
  it('should provide stage descriptions', () => {
    expect(getStageDescription('selective_breeding')).toBe('Breeding smartest individuals each generation');
    expect(getStageDescription('awakening')).toBe('Sapience emerging!');
    expect(getStageDescription('completed')).toBe('Uplift complete');
  });

  it('should provide milestone descriptions', () => {
    expect(getMilestoneDescription('first_tool_use')).toBe('First observed using tools!');
    expect(getMilestoneDescription('mirror_test_passed')).toBe('Passed mirror self-recognition test!');
  });
});

describe('UpliftHelpers - Progress Tracking', () => {
  it('should calculate progress percentage', () => {
    const progress = calculateProgressPercentage(5, 10, 0.5, 0.7);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThanOrEqual(100);
  });

  it('should reach 100% when complete', () => {
    const progress = calculateProgressPercentage(10, 10, 0.7, 0.7);
    expect(progress).toBe(100);
  });
});

describe('UpliftHelpers - Validation', () => {
  let program: UpliftProgramComponent;

  beforeEach(() => {
    program = new UpliftProgramComponent({
      programId: 'test',
      sourceSpeciesId: 'wolf',
      populationSize: 50,
      minimumPopulation: 20,
      geneticDiversity: 0.7,
      currentIntelligence: 0.5,
      targetIntelligence: 0.7,
      acceleratedGenerations: 10,
      currentGeneration: 0,
      targetGeneration: 10,
    });
  });

  it('should validate valid program', () => {
    const result = validateUpliftProgram(program);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject low population', () => {
    program.populationSize = 10;
    const result = validateUpliftProgram(program);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Population too small: 10 < 20');
  });

  it('should reject low genetic diversity', () => {
    program.geneticDiversity = 0.2;
    const result = validateUpliftProgram(program);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Genetic diversity too low'))).toBe(true);
  });

  it('should reject intelligence exceeds target', () => {
    program.currentIntelligence = 0.8;
    const result = validateUpliftProgram(program);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Current intelligence exceeds target');
  });
});

describe('UpliftHelpers - Candidate Suitability', () => {
  let candidate: UpliftCandidateComponent;

  beforeEach(() => {
    candidate = new UpliftCandidateComponent({
      upliftPotential: 50,
      populationSize: 30,
      inbreedingRisk: 0.3,
      geneticHealth: 0.7,
      preSapient: false,
      estimatedGenerations: 50,
      sourceSpeciesId: 'wolf',
      cognitiveMetrics: {
        neuralComplexity: 0.6,
        problemSolving: 0.5,
        socialIntelligence: 0.5,
        communication: 0.4,
      },
    });
  });

  it('should accept suitable candidate', () => {
    expect(isSuitableForUplift(candidate)).toBe(true);
  });

  it('should reject low potential', () => {
    candidate.upliftPotential = 20;
    expect(isSuitableForUplift(candidate)).toBe(false);
  });

  it('should reject small population', () => {
    candidate.populationSize = 10;
    expect(isSuitableForUplift(candidate)).toBe(false);
  });

  it('should reject high inbreeding risk', () => {
    candidate.inbreedingRisk = 0.6;
    expect(isSuitableForUplift(candidate)).toBe(false);
  });

  it('should reject poor genetic health', () => {
    candidate.geneticHealth = 0.4;
    expect(isSuitableForUplift(candidate)).toBe(false);
  });
});

describe('UpliftHelpers - Difficulty Assessment', () => {
  let candidate: UpliftCandidateComponent;

  beforeEach(() => {
    candidate = new UpliftCandidateComponent({
      upliftPotential: 50,
      populationSize: 30,
      inbreedingRisk: 0.3,
      geneticHealth: 0.7,
      preSapient: false,
      estimatedGenerations: 50,
      sourceSpeciesId: 'wolf',
      cognitiveMetrics: {
        neuralComplexity: 0.6,
        problemSolving: 0.5,
        socialIntelligence: 0.5,
        communication: 0.4,
      },
    });
  });

  it('should rate pre-sapient with large population as easy', () => {
    candidate.preSapient = true;
    candidate.populationSize = 50;
    expect(getUpliftDifficulty(candidate)).toBe('easy');
  });

  it('should rate high potential as moderate', () => {
    candidate.upliftPotential = 65;
    expect(getUpliftDifficulty(candidate)).toBe('moderate');
  });

  it('should rate medium potential as hard', () => {
    candidate.upliftPotential = 45;
    expect(getUpliftDifficulty(candidate)).toBe('hard');
  });

  it('should rate low potential as very hard', () => {
    candidate.upliftPotential = 35;
    expect(getUpliftDifficulty(candidate)).toBe('very_hard');
  });
});
