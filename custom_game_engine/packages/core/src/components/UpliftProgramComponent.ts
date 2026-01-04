/**
 * UpliftProgramComponent - Tracks a multi-generational genetic uplift program
 *
 * Represents the breeding facility and ongoing uplift process.
 * One component per active uplift program.
 */

import { ComponentBase } from '../ecs/Component.js';

export type UpliftStage =
  | 'population_establishment'  // Gathering breeding population
  | 'genetic_baseline'          // Initial genome sequencing
  | 'selective_breeding'        // Breeding smartest each generation
  | 'gene_editing'              // CRISPR modifications active
  | 'neural_enhancement'        // Brain structure modifications
  | 'pre_sapience'              // Near-sapient behaviors emerging
  | 'emergence_threshold'       // Final generation before awakening
  | 'awakening'                 // Sapience emerging
  | 'stabilization'             // Ensuring trait breeds true
  | 'completed';

export interface GenerationResult {
  generation: number;
  birthCount: number;
  survivalRate: number;
  averageIntelligence: number;     // 0-1, increases each generation
  neuralComplexity: number;        // 0-1, brain development
  mutations: string[];             // Notable mutations
  breakthroughs: string[];         // Unexpected improvements
  setbacks: string[];              // Genetic defects, problems
  notableIndividuals: string[];    // Entity IDs of exceptional specimens
}

export interface TechnologyModifier {
  techId: string;
  name: string;
  generationReduction: number;     // Percentage reduction
  appliedAt: number;               // Generation when tech was applied
}

export class UpliftProgramComponent extends ComponentBase {
  public readonly type = 'uplift_program';

  // Identification
  public programId: string;
  public programName: string;
  public sourceSpeciesId: string;
  public targetSpeciesId: string;        // Will be 'uplifted_X'

  // Facility
  public facilityId: string;             // Building running the program
  public leadScientistId: string;
  public geneticistIds: string[];

  // Breeding Population
  public breedingPopulation: string[];   // Current generation entity IDs
  public populationSize: number;
  public minimumPopulation: number;      // Below this = critical
  public geneticDiversity: number;       // 0-1, track inbreeding

  // Generational Progress
  public currentGeneration: number;
  public targetGeneration: number;       // When sapience expected
  public baseGenerations: number;        // Original estimate
  public acceleratedGenerations: number; // After tech modifiers

  // Stage Tracking
  public stage: UpliftStage;
  public progressToNextGeneration: number; // 0-100, breeding/maturation
  public progressToSapience: number;     // 0-100, overall progress

  // Intelligence Tracking
  public baselineIntelligence: number;   // Generation 0 average
  public currentIntelligence: number;    // Current generation average
  public targetIntelligence: number;     // Sapience threshold (usually 0.7)

  // Technology & Research
  public technologies: TechnologyModifier[];
  public researchPapers: string[];       // Paper IDs contributing bonuses
  public paperBonus: number;             // Bonus from publications

  // Resources
  public energyPerGeneration: number;
  public materialsPerGeneration: Record<string, number>;
  public totalEnergyConsumed: number;
  public totalMaterialsConsumed: Record<string, number>;

  // History
  public generationResults: GenerationResult[];
  public startedAt: number;              // Tick
  public lastGenerationAt: number;       // Tick of last breeding cycle
  public estimatedCompletionAt: number;  // Tick estimate

  // Events
  public notableEvents: string[];        // Major milestones

  constructor(options: Partial<UpliftProgramComponent> = {}) {
    super();

    this.programId = options.programId ?? `uplift_${Date.now()}`;
    this.programName = options.programName ?? 'Unnamed Program';
    this.sourceSpeciesId = options.sourceSpeciesId ?? '';
    this.targetSpeciesId = options.targetSpeciesId ?? '';

    this.facilityId = options.facilityId ?? '';
    this.leadScientistId = options.leadScientistId ?? '';
    this.geneticistIds = options.geneticistIds ?? [];

    this.breedingPopulation = options.breedingPopulation ?? [];
    this.populationSize = options.populationSize ?? 0;
    this.minimumPopulation = options.minimumPopulation ?? 20;
    this.geneticDiversity = options.geneticDiversity ?? 1.0;

    this.currentGeneration = options.currentGeneration ?? 0;
    this.targetGeneration = options.targetGeneration ?? 10;
    this.baseGenerations = options.baseGenerations ?? 10;
    this.acceleratedGenerations = options.acceleratedGenerations ?? 10;

    this.stage = options.stage ?? 'population_establishment';
    this.progressToNextGeneration = options.progressToNextGeneration ?? 0;
    this.progressToSapience = options.progressToSapience ?? 0;

    this.baselineIntelligence = options.baselineIntelligence ?? 0.3;
    this.currentIntelligence = options.currentIntelligence ?? 0.3;
    this.targetIntelligence = options.targetIntelligence ?? 0.7;

    this.technologies = options.technologies ?? [];
    this.researchPapers = options.researchPapers ?? [];
    this.paperBonus = options.paperBonus ?? 0;

    this.energyPerGeneration = options.energyPerGeneration ?? 1000;
    this.materialsPerGeneration = options.materialsPerGeneration ?? {};
    this.totalEnergyConsumed = options.totalEnergyConsumed ?? 0;
    this.totalMaterialsConsumed = options.totalMaterialsConsumed ?? {};

    this.generationResults = options.generationResults ?? [];
    this.startedAt = options.startedAt ?? 0;
    this.lastGenerationAt = options.lastGenerationAt ?? 0;
    this.estimatedCompletionAt = options.estimatedCompletionAt ?? 0;

    this.notableEvents = options.notableEvents ?? [];
  }

  /**
   * Get current generation result
   */
  getCurrentGenerationResult(): GenerationResult | undefined {
    return this.generationResults[this.currentGeneration];
  }

  /**
   * Add technology modifier
   */
  addTechnology(techId: string, name: string, reduction: number, currentGen: number): void {
    this.technologies.push({
      techId,
      name,
      generationReduction: reduction,
      appliedAt: currentGen,
    });

    this.recalculateAcceleratedGenerations();
  }

  /**
   * Recalculate accelerated generations based on tech
   */
  private recalculateAcceleratedGenerations(): void {
    let totalReduction = 0;

    for (const tech of this.technologies) {
      totalReduction += tech.generationReduction;
    }

    // Add paper bonus
    totalReduction += this.paperBonus;

    // Cap at 85% reduction
    totalReduction = Math.min(0.85, totalReduction);

    this.acceleratedGenerations = Math.ceil(
      this.baseGenerations * (1 - totalReduction)
    );
  }

  /**
   * Add research paper bonus
   */
  addResearchPaper(paperId: string, bonus: number): void {
    if (!this.researchPapers.includes(paperId)) {
      this.researchPapers.push(paperId);
      this.paperBonus = Math.min(0.2, this.paperBonus + bonus); // Cap at 20%
      this.recalculateAcceleratedGenerations();
    }
  }

  /**
   * Check if at critical stage (emergence threshold)
   */
  isAtEmergenceThreshold(): boolean {
    return this.currentGeneration >= this.acceleratedGenerations - 1 &&
           this.currentIntelligence >= this.targetIntelligence * 0.95;
  }

  /**
   * Check if sapience achieved
   */
  hasSapienceEmergence(): boolean {
    return this.currentIntelligence >= this.targetIntelligence &&
           this.currentGeneration >= this.acceleratedGenerations;
  }
}
