/**
 * UpliftCandidateComponent - Marks an animal as suitable for genetic uplift
 *
 * Tracks evaluation metrics for uplift potential.
 * Created by UpliftCandidateDetectionSystem when evaluating animals.
 */

import { ComponentBase } from '../ecs/Component.js';

export interface CognitiveMetrics {
  neuralComplexity: number;        // 0-1, brain structure complexity
  problemSolving: number;          // 0-1, observed problem-solving ability
  socialIntelligence: number;      // 0-1, social coordination
  toolUse: boolean;                // Has used tools
  communication: number;           // 0-1, communication sophistication
  selfAwareness: number;           // 0-1, mirror test, self-recognition
}

export class UpliftCandidateComponent extends ComponentBase {
  public readonly type = 'uplift_candidate';

  // Overall Potential
  public upliftPotential: number;     // 0-100, overall score
  public preSapient: boolean;         // High baseline intelligence

  // Cognitive Evaluation
  public cognitiveMetrics: CognitiveMetrics;

  // Social Structure
  public socialStructure: 'solitary' | 'pair' | 'family' | 'pack' | 'hive' | 'flock';
  public groupSize: number;           // Current group/pack size

  // Genetic Suitability
  public geneticHealth: number;       // 0-1, from GeneticComponent
  public populationSize: number;      // Estimated species population nearby
  public inbreedingRisk: number;      // 0-1, genetic diversity risk

  // Generation Estimate
  public estimatedGenerations: number; // Base generations needed
  public estimatedYears: number;      // Real-time years (with current tech)

  // Evaluation Status
  public evaluated: boolean;
  public evaluatedAt: number;         // Tick
  public evaluatedBy?: string;        // Scientist entity ID

  // Recommendation
  public recommended: boolean;        // Meets minimum criteria
  public recommendedTemplateId?: string;

  constructor(options: Partial<UpliftCandidateComponent> = {}) {
    super();

    this.upliftPotential = options.upliftPotential ?? 0;
    this.preSapient = options.preSapient ?? false;

    this.cognitiveMetrics = options.cognitiveMetrics ?? {
      neuralComplexity: 0,
      problemSolving: 0,
      socialIntelligence: 0,
      toolUse: false,
      communication: 0,
      selfAwareness: 0,
    };

    this.socialStructure = options.socialStructure ?? 'solitary';
    this.groupSize = options.groupSize ?? 1;

    this.geneticHealth = options.geneticHealth ?? 1.0;
    this.populationSize = options.populationSize ?? 0;
    this.inbreedingRisk = options.inbreedingRisk ?? 0;

    this.estimatedGenerations = options.estimatedGenerations ?? 100;
    this.estimatedYears = options.estimatedYears ?? 100;

    this.evaluated = options.evaluated ?? false;
    this.evaluatedAt = options.evaluatedAt ?? 0;
    this.evaluatedBy = options.evaluatedBy;

    this.recommended = options.recommended ?? false;
    this.recommendedTemplateId = options.recommendedTemplateId;
  }
}
