/**
 * UpliftBreedingProgramSystem - Manages multi-generational genetic uplift programs
 *
 * Handles:
 * - Breeding population management
 * - Generational progression
 * - Intelligence tracking across generations
 * - Technology and research bonuses
 * - Stage transitions
 */

import { System, World, Entity } from '../ecs/index.js';
import { EventBus } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { UpliftProgramComponent, GenerationResult } from '../components/UpliftProgramComponent.js';
import type { ProtoSapienceComponent } from '../components/ProtoSapienceComponent.js';
import type { GeneticComponent } from '../components/GeneticComponent.js';
import type { AnimalComponent } from '../components/AnimalComponent.js';
import type { SpeciesComponent } from '../components/SpeciesComponent.js';

export class UpliftBreedingProgramSystem implements System {
  readonly id = 'UpliftBreedingProgramSystem';
  readonly priority = 560;
  readonly requiredComponents = [CT.UpliftProgram] as const;

  private eventBus: EventBus | null = null;
  private tickCounter = 0;
  private readonly UPDATE_INTERVAL = 20; // Every second

  initialize(_world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  update(world: World, entities: Entity[], _deltaTime: number): void {
    this.tickCounter++;
    if (this.tickCounter % this.UPDATE_INTERVAL !== 0) return;

    for (const programEntity of entities) {
      const program = programEntity.getComponent(CT.UpliftProgram) as UpliftProgramComponent;

      // Update generation progress
      this.updateGenerationProgress(world, program);

      // Check for generation completion
      if (program.progressToNextGeneration >= 100) {
        this.advanceGeneration(world, program);
      }

      // Update overall progress
      this.updateOverallProgress(program);

      // Check for stage transitions
      this.checkStageTransitions(world, program);
    }
  }

  cleanup(): void {
    this.eventBus = null;
  }

  /**
   * Update progress toward next generation
   */
  private updateGenerationProgress(world: World, program: UpliftProgramComponent): void {
    // Get breeding population
    const population = this.getBreedingPopulation(world, program);

    if (population.length === 0) {
      // Population died out - critical failure
      this.handlePopulationExtinction(world, program);
      return;
    }

    // Calculate maturation rate based on species
    const sourceSpecies = world.query()
      .with(CT.Species)
      .executeEntities()
      .find(e => {
        const species = e.getComponent(CT.Species) as SpeciesComponent;
        return species.speciesId === program.sourceSpeciesId;
      });

    if (!sourceSpecies) return;

    const species = sourceSpecies.getComponent(CT.Species) as SpeciesComponent;
    const maturityAge = species.maturityAge || 2; // Default 2 years
    const ticksPerYear = 20 * 60 * 24 * 365; // 20 TPS * seconds * minutes * hours * days
    const ticksToMaturity = maturityAge * ticksPerYear;

    // Progress per tick = 100 / ticks to maturity
    const progressPerTick = 100 / ticksToMaturity;
    program.progressToNextGeneration += progressPerTick * this.UPDATE_INTERVAL;

    // Cap at 100
    program.progressToNextGeneration = Math.min(100, program.progressToNextGeneration);
  }

  /**
   * Advance to next generation
   */
  private advanceGeneration(world: World, program: UpliftProgramComponent): void {
    program.currentGeneration++;
    program.progressToNextGeneration = 0;
    program.lastGenerationAt = world.tick;

    // Select breeding population for next generation
    const newBreedingPop = this.selectBreedingPopulation(world, program);

    // Calculate intelligence increase
    const intelligenceGain = this.calculateIntelligenceGain(program);
    program.currentIntelligence = Math.min(
      1.0,
      program.currentIntelligence + intelligenceGain
    );

    // Record generation result
    const result: GenerationResult = {
      generation: program.currentGeneration,
      birthCount: newBreedingPop.length,
      survivalRate: newBreedingPop.length / program.populationSize,
      averageIntelligence: program.currentIntelligence,
      neuralComplexityGain: intelligenceGain,
      mutations: [],
      breakthroughs: [],
      setbacks: [],
      notableIndividuals: this.findNotableIndividuals(world, newBreedingPop),
    };

    // Check for breakthroughs (5% chance per generation)
    if (Math.random() < 0.05) {
      const breakthrough = this.generateBreakthrough(program);
      result.breakthroughs.push(breakthrough);
      program.currentIntelligence += 0.05; // Bonus intelligence
    }

    program.generationResults.push(result);

    // Update breeding population
    program.breedingPopulation = newBreedingPop.map(e => e.id);
    program.populationSize = newBreedingPop.length;

    // Emit event
    this.eventBus?.emit({
      type: 'uplift_generation_advanced' as any,
      source: this.id,
      data: {
        programId: program.programId,
        generation: program.currentGeneration,
        intelligence: program.currentIntelligence,
        result,
      },
    });

    // Add notable event
    program.notableEvents.push(
      `Generation ${program.currentGeneration}: Intelligence ${(program.currentIntelligence * 100).toFixed(1)}%`
    );
  }

  /**
   * Select smartest individuals for next generation
   */
  private selectBreedingPopulation(world: World, program: UpliftProgramComponent): Entity[] {
    const currentPop = this.getBreedingPopulation(world, program);

    // Sort by intelligence (if they have ProtoSapience component)
    const sorted = currentPop.sort((a, b) => {
      const aProto = a.hasComponent(CT.ProtoSapience) ?
        (a.getComponent(CT.ProtoSapience) as ProtoSapienceComponent).intelligence : 0;
      const bProto = b.hasComponent(CT.ProtoSapience) ?
        (b.getComponent(CT.ProtoSapience) as ProtoSapienceComponent).intelligence : 0;
      return bProto - aProto;
    });

    // Select top 50% for breeding
    const breedingCount = Math.max(program.minimumPopulation, Math.floor(sorted.length * 0.5));
    return sorted.slice(0, breedingCount);
  }

  /**
   * Calculate intelligence gain per generation
   */
  private calculateIntelligenceGain(program: UpliftProgramComponent): number {
    // Base gain depends on how far from target
    const remaining = program.targetIntelligence - program.currentIntelligence;
    let baseGain = remaining / (program.acceleratedGenerations - program.currentGeneration + 1);

    // Technology modifiers increase gain rate
    const techMultiplier = 1 + (program.technologies.length * 0.1);
    baseGain *= techMultiplier;

    // Research papers provide bonus
    baseGain *= (1 + program.paperBonus);

    // Random variation (+/- 20%)
    const variation = 0.8 + Math.random() * 0.4;
    baseGain *= variation;

    return Math.max(0, baseGain);
  }

  /**
   * Find exceptional individuals in generation
   */
  private findNotableIndividuals(world: World, population: Entity[]): string[] {
    const notable: string[] = [];

    for (const entity of population) {
      if (!entity.hasComponent(CT.ProtoSapience)) continue;

      const proto = entity.getComponent(CT.ProtoSapience) as ProtoSapienceComponent;

      // Notable if:
      // - Intelligence is significantly above average
      // - Passed mirror test
      // - Created tools
      // - Has proto-language

      if (proto.intelligence > 0.6 || proto.passedMirrorTest || proto.createsTools) {
        const animal = entity.getComponent(CT.Animal) as AnimalComponent;
        notable.push(entity.id);

        // Give them a temporary name for tracking
        if (!animal.name) {
          animal.name = this.generateNotableName(proto);
        }
      }
    }

    return notable;
  }

  /**
   * Generate name for notable individual
   */
  private generateNotableName(proto: ProtoSapienceComponent): string {
    const prefixes = ['First', 'Alpha', 'Nova', 'Prime', 'Apex'];
    const suffixes = ['Mind', 'Thinker', 'Seeker', 'Clever', 'Bright'];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    return `${prefix}-${suffix}`;
  }

  /**
   * Generate breakthrough event
   */
  private generateBreakthrough(program: UpliftProgramComponent): string {
    const breakthroughs = [
      'Unexpected brain structure mutation increases neural density',
      'Novel synaptic pattern emerges, accelerating learning',
      'Vocal apparatus develops ahead of schedule',
      'Abstract problem-solving observed in juveniles',
      'Tool-making behavior spreads rapidly through population',
      'Social learning dramatically increases knowledge transmission',
    ];

    return breakthroughs[Math.floor(Math.random() * breakthroughs.length)];
  }

  /**
   * Update overall progress to sapience
   */
  private updateOverallProgress(program: UpliftProgramComponent): void {
    const generationProgress = program.currentGeneration / program.acceleratedGenerations;
    const intelligenceProgress = program.currentIntelligence / program.targetIntelligence;

    // Overall progress is average of generation and intelligence progress
    program.progressToSapience = (generationProgress + intelligenceProgress) / 2 * 100;
  }

  /**
   * Check for stage transitions
   */
  private checkStageTransitions(world: World, program: UpliftProgramComponent): void {
    const prevStage = program.stage;

    // Stage transitions based on generation and intelligence
    if (program.currentGeneration === 0) {
      program.stage = 'population_establishment';
    } else if (program.currentGeneration === 1) {
      program.stage = 'genetic_baseline';
    } else if (program.currentGeneration >= 2 && program.currentIntelligence < 0.5) {
      program.stage = 'selective_breeding';
    } else if (program.currentIntelligence >= 0.5 && program.currentIntelligence < 0.6) {
      program.stage = 'gene_editing';
    } else if (program.currentIntelligence >= 0.6 && program.currentIntelligence < 0.65) {
      program.stage = 'neural_enhancement';
    } else if (program.currentIntelligence >= 0.65 && program.currentIntelligence < 0.7) {
      program.stage = 'pre_sapience';
    } else if (program.isAtEmergenceThreshold()) {
      program.stage = 'emergence_threshold';
    } else if (program.hasSapienceEmergence()) {
      program.stage = 'awakening';
    }

    // Emit event if stage changed
    if (prevStage !== program.stage) {
      this.eventBus?.emit({
        type: 'uplift_stage_changed' as any,
        source: this.id,
        data: {
          programId: program.programId,
          previousStage: prevStage,
          newStage: program.stage,
          generation: program.currentGeneration,
          intelligence: program.currentIntelligence,
        },
      });

      program.notableEvents.push(
        `Entered stage: ${program.stage} (Gen ${program.currentGeneration})`
      );
    }
  }

  /**
   * Get breeding population entities
   */
  private getBreedingPopulation(world: World, program: UpliftProgramComponent): Entity[] {
    const entities: Entity[] = [];

    for (const entityId of program.breedingPopulation) {
      const entity = world.getEntityById(entityId);
      if (entity && entity.hasComponent(CT.Animal)) {
        entities.push(entity);
      }
    }

    return entities;
  }

  /**
   * Handle population extinction
   */
  private handlePopulationExtinction(world: World, program: UpliftProgramComponent): void {
    this.eventBus?.emit({
      type: 'uplift_population_extinct' as any,
      source: this.id,
      data: {
        programId: program.programId,
        generation: program.currentGeneration,
        reason: 'breeding_population_died',
      },
    });

    program.stage = 'completed';
    program.notableEvents.push(
      `CRITICAL FAILURE: Breeding population extinct at generation ${program.currentGeneration}`
    );
  }
}
