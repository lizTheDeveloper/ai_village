/**
 * AgeTrackingSystem - Tracks entity ages and lifecycle progression
 *
 * Features:
 * - Converts birthTick to age in years/days
 * - Updates ageCategory for agents (child, teen, adult, elder)
 * - Tracks animal life stages (infant, juvenile, adult, senior)
 * - Emits lifecycle milestone events
 * - Updates generation tracking from lineage
 *
 * Priority: 180 (runs after core agent systems, before utility systems)
 * Update interval: Every 1000 ticks (~50 seconds at 20 TPS)
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { AgentComponent, AgeCategory } from '../components/AgentComponent.js';
import type { AnimalComponent, AnimalLifeStage } from '../components/AnimalComponent.js';
import { calculateAgeCategoryFromTick } from '../conversation/ConversationStyle.js';

// ============================================================================
// Time Conversion Constants
// ============================================================================

/**
 * Game time conversion constants.
 * At 20 TPS: 1 second = 20 ticks
 * Game year = 180 days (configurable for fantasy setting)
 */
export const TIME_CONSTANTS = {
  TICKS_PER_SECOND: 20,
  TICKS_PER_MINUTE: 20 * 60,
  TICKS_PER_HOUR: 20 * 60 * 60,
  TICKS_PER_DAY: 20 * 60 * 60 * 24,
  DAYS_PER_YEAR: 180,
  TICKS_PER_YEAR: 20 * 60 * 60 * 24 * 180, // 311,040,000 ticks per year
} as const;

/**
 * Animal life stage thresholds (in years).
 * These are baseline values - specific species may have different timings.
 */
const ANIMAL_LIFE_STAGE_THRESHOLDS = {
  infant: 0,    // 0-1 years
  juvenile: 1,  // 1-3 years
  adult: 3,     // 3-10 years
  senior: 10,   // 10+ years
} as const;

// ============================================================================
// AgeTrackingSystem
// ============================================================================

export class AgeTrackingSystem extends BaseSystem {
  public readonly id = 'AgeTrackingSystem';
  public readonly name = 'AgeTrackingSystem';
  public readonly priority = 180;
  public readonly requiredComponents = [];
  // Activate when entities with birthTick exist
  public readonly activationComponents = ['agent', 'animal'] as const;
  protected readonly throttleInterval = 1000; // Every 50 seconds at 20 TPS

  private agentQuery = this.query().with(CT.Agent);
  private animalQuery = this.query().with(CT.Animal);

  protected onUpdate(ctx: SystemContext): void {
    const { world, tick } = ctx;

    // Update agent ages and categories
    const agents = this.agentQuery.get(world);
    for (const entity of agents) {
      this.updateAgentAge(entity, tick);
    }

    // Update animal ages and life stages
    const animals = this.animalQuery.get(world);
    for (const entity of animals) {
      this.updateAnimalAge(entity, tick);
    }
  }

  // ==========================================================================
  // Agent Age Tracking
  // ==========================================================================

  private updateAgentAge(entity: Entity, currentTick: number): void {
    const agent = entity.components.get(CT.Agent) as AgentComponent | undefined;
    if (!agent || agent.birthTick === undefined) {
      return;
    }

    // Calculate current age category
    const newAgeCategory = calculateAgeCategoryFromTick(
      agent.birthTick,
      currentTick,
      TIME_CONSTANTS.TICKS_PER_YEAR
    );

    // Check if age category changed (milestone event)
    const oldAgeCategory = agent.ageCategory;
    if (newAgeCategory !== oldAgeCategory) {
      // Update component
      entity.updateComponent(CT.Agent, {
        ageCategory: newAgeCategory,
      });

      // Emit lifecycle milestone event
      this.emitAgeMilestone(entity, oldAgeCategory, newAgeCategory, currentTick);
    }
  }

  private emitAgeMilestone(
    entity: Entity,
    oldCategory: AgeCategory | undefined,
    newCategory: AgeCategory,
    tick: number
  ): void {
    const ageYears = this.getAgeInYears(entity, tick);

    this.emit({
      type: 'agent:age_milestone',
      entityId: entity.id,
      data: {
        agentId: entity.id,
        oldCategory,
        newCategory,
        ageYears,
        tick,
      },
    });

    // Log important transitions
    if (newCategory === 'adult') {
      console.log(
        `[AgeTracking] Agent ${entity.id} reached adulthood (${ageYears.toFixed(1)} years)`
      );
    } else if (newCategory === 'elder') {
      console.log(
        `[AgeTracking] Agent ${entity.id} became an elder (${ageYears.toFixed(1)} years)`
      );
    }
  }

  // ==========================================================================
  // Animal Age Tracking
  // ==========================================================================

  private updateAnimalAge(entity: Entity, currentTick: number): void {
    const animal = entity.components.get(CT.Animal) as AnimalComponent | undefined;
    if (!animal) {
      return;
    }

    // Animal age is stored in days (see AnimalComponent definition)
    // Convert current tick to days and update
    const ageTicks = currentTick - (entity.createdAt ?? 0);
    const ageDays = Math.floor(ageTicks / TIME_CONSTANTS.TICKS_PER_DAY);

    if (animal.age !== ageDays) {
      // Determine life stage from age in years
      const ageYears = ageDays / TIME_CONSTANTS.DAYS_PER_YEAR;
      const newLifeStage = this.calculateAnimalLifeStage(ageYears);

      // Check for life stage transition
      const oldLifeStage = animal.lifeStage;
      const stageChanged = newLifeStage !== oldLifeStage;

      // Update component
      entity.updateComponent(CT.Animal, {
        age: ageDays,
        lifeStage: newLifeStage,
      });

      // Emit event if life stage changed
      if (stageChanged) {
        this.emitAnimalLifeStageChange(entity, oldLifeStage, newLifeStage, ageYears);
      }
    }
  }

  private calculateAnimalLifeStage(ageYears: number): AnimalLifeStage {
    if (ageYears >= ANIMAL_LIFE_STAGE_THRESHOLDS.senior) return 'senior';
    if (ageYears >= ANIMAL_LIFE_STAGE_THRESHOLDS.adult) return 'adult';
    if (ageYears >= ANIMAL_LIFE_STAGE_THRESHOLDS.juvenile) return 'juvenile';
    return 'infant';
  }

  private emitAnimalLifeStageChange(
    entity: Entity,
    oldStage: AnimalLifeStage,
    newStage: AnimalLifeStage,
    ageYears: number
  ): void {
    this.emit({
      type: 'animal:life_stage_change',
      entityId: entity.id,
      data: {
        animalId: entity.id,
        oldStage,
        newStage,
        ageYears,
      },
    });

    // Log significant transitions
    if (newStage === 'adult') {
      console.log(
        `[AgeTracking] Animal ${entity.id} reached maturity (${ageYears.toFixed(1)} years)`
      );
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get entity age in years from birthTick
   */
  public getAgeInYears(entity: Entity, currentTick: number): number {
    const agent = entity.components.get(CT.Agent) as AgentComponent | undefined;
    if (agent?.birthTick !== undefined) {
      const ageTicks = currentTick - agent.birthTick;
      return ageTicks / TIME_CONSTANTS.TICKS_PER_YEAR;
    }

    const animal = entity.components.get(CT.Animal) as AnimalComponent | undefined;
    if (animal) {
      return animal.age / TIME_CONSTANTS.DAYS_PER_YEAR;
    }

    return 0;
  }

  /**
   * Get entity age in days
   */
  public getAgeInDays(entity: Entity, currentTick: number): number {
    const agent = entity.components.get(CT.Agent) as AgentComponent | undefined;
    if (agent?.birthTick !== undefined) {
      const ageTicks = currentTick - agent.birthTick;
      return Math.floor(ageTicks / TIME_CONSTANTS.TICKS_PER_DAY);
    }

    const animal = entity.components.get(CT.Animal) as AnimalComponent | undefined;
    if (animal) {
      return animal.age;
    }

    return 0;
  }

  /**
   * Get generation number from GeneticComponent
   */
  public getGeneration(entity: Entity): number {
    const genetic = entity.components.get(CT.Genetic);
    return genetic?.generation ?? 0;
  }

  /**
   * Convert ticks to years
   */
  public static ticksToYears(ticks: number): number {
    return ticks / TIME_CONSTANTS.TICKS_PER_YEAR;
  }

  /**
   * Convert ticks to days
   */
  public static ticksToDays(ticks: number): number {
    return Math.floor(ticks / TIME_CONSTANTS.TICKS_PER_DAY);
  }

  /**
   * Convert years to ticks
   */
  public static yearsToTicks(years: number): number {
    return Math.floor(years * TIME_CONSTANTS.TICKS_PER_YEAR);
  }

  /**
   * Convert days to ticks
   */
  public static daysToTicks(days: number): number {
    return Math.floor(days * TIME_CONSTANTS.TICKS_PER_DAY);
  }
}
