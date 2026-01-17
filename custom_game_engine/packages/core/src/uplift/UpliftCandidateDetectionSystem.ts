/**
 * UpliftCandidateDetectionSystem - Evaluates animals for uplift potential
 *
 * Scans animal entities and evaluates:
 * - Neural complexity (brain structure)
 * - Cognitive abilities (problem-solving, social intelligence)
 * - Population health (genetic diversity, population size)
 * - Social structure (pack, hive, solitary)
 *
 * Creates UpliftCandidateComponent for suitable animals.
 *
 * NOT YET INTEGRATED - Standalone implementation for testing
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World, Entity } from '../ecs/index.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { UpliftCandidateComponent, type CognitiveMetrics } from '../components/UpliftCandidateComponent.js';
import type { AnimalComponent } from '../components/AnimalComponent.js';
import type { SpeciesComponent } from '../components/SpeciesComponent.js';
import type { GeneticComponent } from '../components/GeneticComponent.js';
import { getAnimalSpecies } from '../data/animalSpecies.js';

/**
 * Evaluation thresholds for uplift suitability
 */
const EVALUATION_THRESHOLDS = {
  MIN_UPLIFT_POTENTIAL: 30,        // Minimum score to be considered
  PRE_SAPIENT_THRESHOLD: 60,       // High baseline intelligence
  MIN_POPULATION: 20,              // Minimum breeding population
  MAX_INBREEDING_RISK: 0.3,        // Maximum acceptable inbreeding
  MIN_NEURAL_COMPLEXITY: 0.3,      // Minimum brain complexity
};

/**
 * Base generation estimates by intelligence level
 */
const BASE_GENERATION_ESTIMATES: Record<string, number> = {
  'pre_sapient_high': 10,      // 0.7+ baseline (primates, dolphins)
  'pre_sapient_medium': 15,    // 0.6+ baseline (wolves, orcas, elephants)
  'pre_sapient_low': 25,       // 0.5+ baseline (corvids, parrots, octopuses)
  'intelligent': 60,           // 0.4+ baseline (cats, bears, raptors)
  'basic': 100,                // 0.3+ baseline (insects, simple mammals)
};

export class UpliftCandidateDetectionSystem extends BaseSystem {
  readonly id = 'UpliftCandidateDetectionSystem';
  readonly priority = 555;
  readonly requiredComponents = [] as const; // Queries all animals

  protected readonly throttleInterval = 1000; // Every 50 seconds

  // Cache for species population counts
  private speciesPopulationCache: Map<string, number> = new Map();
  private cacheExpiry = 0;
  private readonly CACHE_DURATION = 2000; // 100 seconds

  protected onUpdate(ctx: SystemContext): void {
    // Only run if consciousness studies tech is unlocked
    if (!this.isTechnologyUnlocked(ctx.world)) return;

    // Refresh population cache if expired
    if (ctx.tick > this.cacheExpiry) {
      this.refreshPopulationCache(ctx.world);
      this.cacheExpiry = ctx.tick + this.CACHE_DURATION;
    }

    // Get all animals without UpliftCandidate component
    const unevaluatedAnimals = ctx.world.query()
      .with(CT.Animal)
      .with(CT.Species)
      .without(CT.UpliftCandidate)
      .executeEntities();

    for (const animal of unevaluatedAnimals) {
      this.evaluateAnimal(ctx, animal);
    }
  }

  protected onCleanup(): void {
    this.speciesPopulationCache.clear();
  }

  /**
   * Check if required technology is unlocked
   * NOTE: Not integrated yet - always returns true for testing
   */
  private isTechnologyUnlocked(_world: World): boolean {
    // TODO: Integration point - check ClarketechSystem
    // return clarketechManager.isTechUnlocked(this.TECH_REQUIRED);
    return true; // Placeholder for standalone testing
  }

  /**
   * Refresh species population cache
   */
  private refreshPopulationCache(world: World): void {
    this.speciesPopulationCache.clear();

    const allAnimals = world.query()
      .with(CT.Animal)
      .with(CT.Species)
      .executeEntities();

    for (const animal of allAnimals) {
      const species = animal.getComponent(CT.Species) as SpeciesComponent;
      const count = this.speciesPopulationCache.get(species.speciesId) || 0;
      this.speciesPopulationCache.set(species.speciesId, count + 1);
    }
  }

  /**
   * Evaluate an animal for uplift potential
   */
  private evaluateAnimal(ctx: SystemContext, animal: Entity): void {
    const animalComp = animal.getComponent(CT.Animal) as AnimalComponent;
    const species = animal.getComponent(CT.Species) as SpeciesComponent;

    // Skip if already sapient
    if (species.sapient) return;

    // Evaluate cognitive metrics
    const cognitiveMetrics = this.evaluateCognitiveMetrics(animal, animalComp, species);

    // Evaluate genetic health
    const geneticHealth = this.evaluateGeneticHealth(animal);

    // Get population size
    const populationSize = this.speciesPopulationCache.get(species.speciesId) || 0;

    // Calculate overall uplift potential
    const upliftPotential = this.calculateUpliftPotential(
      cognitiveMetrics,
      geneticHealth,
      populationSize,
      species
    );

    // Only create candidate if meets minimum threshold
    if (upliftPotential < EVALUATION_THRESHOLDS.MIN_UPLIFT_POTENTIAL) return;

    // Determine if pre-sapient
    const preSapient = cognitiveMetrics.neuralComplexity >= 0.6;

    // Estimate generations needed
    const estimatedGenerations = this.estimateGenerations(cognitiveMetrics.neuralComplexity);
    const estimatedYears = this.estimateYears(estimatedGenerations, species);

    // Determine social structure
    const socialStructure = this.determineSocialStructure(animalComp, species);

    // Calculate inbreeding risk
    const inbreedingRisk = this.calculateInbreedingRisk(animal, populationSize);

    // Create candidate component
    const candidate = new UpliftCandidateComponent({
      upliftPotential,
      preSapient,
      cognitiveMetrics,
      socialStructure,
      groupSize: this.estimateGroupSize(animalComp, socialStructure),
      geneticHealth,
      populationSize,
      inbreedingRisk,
      estimatedGenerations,
      estimatedYears,
      evaluated: true,
      evaluatedAt: ctx.tick,
      recommended: upliftPotential >= 50 && populationSize >= EVALUATION_THRESHOLDS.MIN_POPULATION,
    });

    (animal as any).addComponent(candidate);

    // Emit event
    this.events.emit('uplift_candidate_detected' as any, {
      entityId: animal.id,
      speciesId: species.speciesId,
      upliftPotential,
      preSapient,
      estimatedGenerations,
    });
  }

  /**
   * Evaluate cognitive metrics
   */
  private evaluateCognitiveMetrics(
    _animal: Entity,
    animalComp: AnimalComponent,
    species: SpeciesComponent
  ): CognitiveMetrics {
    // Neural complexity based on species
    const neuralComplexity = this.estimateNeuralComplexity(species);

    // Problem-solving ability (based on observed behaviors)
    const problemSolving = this.estimateProblemSolving(animalComp);

    // Social intelligence
    const socialIntelligence = this.estimateSocialIntelligence(species, animalComp);

    // Tool use (placeholder - would track observations)
    const toolUse = false; // TODO: Track actual tool use observations

    // Communication level
    const communication = this.estimateCommunication(species);

    // Self-awareness (placeholder - mirror test)
    const selfAwareness = neuralComplexity >= 0.6 ? 0.3 : 0.0;

    return {
      neuralComplexity,
      problemSolving,
      socialIntelligence,
      toolUse,
      communication,
      selfAwareness,
    };
  }

  /**
   * Estimate neural complexity from species
   * Uses intelligence field from AnimalSpecies data
   */
  private estimateNeuralComplexity(species: SpeciesComponent): number {
    // Get species data and use intelligence field
    const speciesData = getAnimalSpecies(species.speciesId);
    return speciesData.intelligence;
  }

  /**
   * Estimate problem-solving ability
   */
  private estimateProblemSolving(_animalComp: AnimalComponent): number {
    // Placeholder - would track actual observations
    // For now, random variation around 0.5
    return 0.4 + Math.random() * 0.2;
  }

  /**
   * Estimate social intelligence
   */
  private estimateSocialIntelligence(species: SpeciesComponent, _animalComp: AnimalComponent): number {
    let intelligence = 0.3;

    // Social structure indicates social intelligence
    if (species.socialStructure?.includes('pack') ||
        species.socialStructure?.includes('hive') ||
        species.socialStructure?.includes('flock')) {
      intelligence = 0.7;
    } else if (species.socialStructure?.includes('family') ||
               species.socialStructure?.includes('group')) {
      intelligence = 0.5;
    }

    // Add small random variation
    intelligence += (Math.random() - 0.5) * 0.1;

    return Math.max(0, Math.min(1, intelligence));
  }

  /**
   * Estimate communication level
   */
  private estimateCommunication(species: SpeciesComponent): number {
    let communication = 0.3;

    // Social species communicate more
    if (species.socialStructure?.includes('pack')) {
      communication = 0.6;
    } else if (species.socialStructure?.includes('hive')) {
      communication = 0.7; // Chemical/pheromone communication
    } else if (species.socialStructure?.includes('flock')) {
      communication = 0.5;
    }

    return communication;
  }

  /**
   * Evaluate genetic health
   */
  private evaluateGeneticHealth(animal: Entity): number {
    if (!animal.hasComponent(CT.Genetic)) return 0.7; // Default moderate health

    const genetic = animal.getComponent(CT.Genetic) as GeneticComponent;
    return genetic.geneticHealth;
  }

  /**
   * Calculate inbreeding risk
   */
  private calculateInbreedingRisk(animal: Entity, populationSize: number): number {
    if (!animal.hasComponent(CT.Genetic)) {
      // Estimate based on population size
      if (populationSize < 20) return 0.8;
      if (populationSize < 50) return 0.5;
      if (populationSize < 100) return 0.3;
      return 0.1;
    }

    const genetic = animal.getComponent(CT.Genetic) as GeneticComponent;
    return genetic.inbreedingCoefficient;
  }

  /**
   * Calculate overall uplift potential (0-100)
   */
  private calculateUpliftPotential(
    cognitive: CognitiveMetrics,
    geneticHealth: number,
    populationSize: number,
    _species: SpeciesComponent
  ): number {
    // Weight factors
    const weights = {
      neuralComplexity: 40,
      problemSolving: 20,
      socialIntelligence: 15,
      communication: 10,
      geneticHealth: 10,
      populationSize: 5,
    };

    // Calculate weighted score
    let score = 0;

    score += cognitive.neuralComplexity * weights.neuralComplexity;
    score += cognitive.problemSolving * weights.problemSolving;
    score += cognitive.socialIntelligence * weights.socialIntelligence;
    score += cognitive.communication * weights.communication;
    score += geneticHealth * weights.geneticHealth;

    // Population size bonus
    const popScore = Math.min(1, populationSize / 100);
    score += popScore * weights.populationSize;

    // Tool use bonus
    if (cognitive.toolUse) {
      score += 10;
    }

    // Self-awareness bonus
    score += cognitive.selfAwareness * 10;

    return Math.round(score);
  }

  /**
   * Estimate generations needed
   */
  private estimateGenerations(neuralComplexity: number): number {
    if (neuralComplexity >= 0.7) {
      return BASE_GENERATION_ESTIMATES.pre_sapient_high!;
    } else if (neuralComplexity >= 0.6) {
      return BASE_GENERATION_ESTIMATES.pre_sapient_medium!;
    } else if (neuralComplexity >= 0.5) {
      return BASE_GENERATION_ESTIMATES.pre_sapient_low!;
    } else if (neuralComplexity >= 0.4) {
      return BASE_GENERATION_ESTIMATES.intelligent!;
    } else {
      return BASE_GENERATION_ESTIMATES.basic!;
    }
  }

  /**
   * Estimate years needed
   */
  private estimateYears(generations: number, species: SpeciesComponent): number {
    const maturityAge = species.maturityAge || 2;
    return generations * maturityAge;
  }

  /**
   * Determine social structure
   */
  private determineSocialStructure(
    _animalComp: AnimalComponent,
    species: SpeciesComponent
  ): 'solitary' | 'pair' | 'family' | 'pack' | 'hive' | 'flock' {
    // Use species social structure if available
    if (species.socialStructure) {
      if (species.socialStructure.includes('pack')) return 'pack';
      if (species.socialStructure.includes('hive')) return 'hive';
      if (species.socialStructure.includes('flock')) return 'flock';
      if (species.socialStructure.includes('family')) return 'family';
      if (species.socialStructure.includes('pair')) return 'pair';
    }

    // Default to solitary
    return 'solitary';
  }

  /**
   * Estimate group size
   */
  private estimateGroupSize(
    _animalComp: AnimalComponent,
    socialStructure: string
  ): number {
    switch (socialStructure) {
      case 'hive': return 100 + Math.floor(Math.random() * 900); // 100-1000
      case 'flock': return 20 + Math.floor(Math.random() * 80); // 20-100
      case 'pack': return 5 + Math.floor(Math.random() * 15); // 5-20
      case 'family': return 3 + Math.floor(Math.random() * 7); // 3-10
      case 'pair': return 2;
      case 'solitary': return 1;
      default: return 1;
    }
  }

  /**
   * Get all evaluated candidates
   */
  getCandidates(world: World): readonly Entity[] {
    return world.query()
      .with(CT.UpliftCandidate)
      .executeEntities();
  }

  /**
   * Get recommended candidates
   */
  getRecommendedCandidates(world: World): Entity[] {
    return this.getCandidates(world).filter(entity => {
      const candidate = entity.getComponent(CT.UpliftCandidate) as UpliftCandidateComponent;
      return candidate.recommended;
    });
  }

  /**
   * Get pre-sapient candidates
   */
  getPreSapientCandidates(world: World): Entity[] {
    return this.getCandidates(world).filter(entity => {
      const candidate = entity.getComponent(CT.UpliftCandidate) as UpliftCandidateComponent;
      return candidate.preSapient;
    });
  }
}
