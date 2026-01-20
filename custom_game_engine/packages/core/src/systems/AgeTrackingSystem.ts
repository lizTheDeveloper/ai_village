/**
 * AgeTrackingSystem - Tracks entity ages and lifecycle progression
 *
 * Features:
 * - Converts birthTick to age in years/days
 * - Updates ageCategory for agents (child, teen, adult, elder)
 * - Tracks animal life stages (infant, juvenile, adult)
 * - Emits lifecycle milestone events
 *
 * Priority: 180 (runs after core agent systems, before utility systems)
 * Update interval: Every 100 ticks (~5 seconds at 20 TPS)
 *
 * Performance optimizations:
 * - Pre-computed tick thresholds (no division in hot path)
 * - Single component lookup (no has() + get() double lookup)
 * - Direct property mutation (no object spread)
 * - Inlined calculations (no function call overhead)
 * - Bitwise floor operations
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { AgentComponent, AgeCategory } from '../components/AgentComponent.js';
import type { AnimalComponent, AnimalLifeStage } from '../components/AnimalComponent.js';
import type { GeneticComponent } from '../components/GeneticComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

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
  TICKS_PER_MINUTE: 1_200,              // 20 * 60
  TICKS_PER_HOUR: 72_000,               // 20 * 60 * 60
  TICKS_PER_DAY: 1_728_000,             // 20 * 60 * 60 * 24
  DAYS_PER_YEAR: 180,
  TICKS_PER_YEAR: 311_040_000,          // 20 * 60 * 60 * 24 * 180
} as const;

// ============================================================================
// Pre-computed Constants (avoid division in hot path)
// ============================================================================

// Inverse multipliers for fast division via multiplication
const INV_TICKS_PER_YEAR = 1 / TIME_CONSTANTS.TICKS_PER_YEAR;
const INV_TICKS_PER_DAY = 1 / TIME_CONSTANTS.TICKS_PER_DAY;
const INV_DAYS_PER_YEAR = 1 / TIME_CONSTANTS.DAYS_PER_YEAR;

// Pre-computed tick thresholds for age categories (avoid division in loop)
const ELDER_TICK_THRESHOLD = 60 * TIME_CONSTANTS.TICKS_PER_YEAR;   // 60 years
const ADULT_TICK_THRESHOLD = 20 * TIME_CONSTANTS.TICKS_PER_YEAR;   // 20 years
const TEEN_TICK_THRESHOLD = 13 * TIME_CONSTANTS.TICKS_PER_YEAR;    // 13 years

// Pre-computed tick thresholds for animal life stages
const ANIMAL_ADULT_DAYS = 3 * TIME_CONSTANTS.DAYS_PER_YEAR;        // 3 years in days
const ANIMAL_JUVENILE_DAYS = 1 * TIME_CONSTANTS.DAYS_PER_YEAR;     // 1 year in days

// ============================================================================
// AgeTrackingSystem
// ============================================================================

export class AgeTrackingSystem extends BaseSystem {
  public readonly id = 'AgeTrackingSystem';
  public readonly name = 'AgeTrackingSystem';
  public readonly priority = 180;
  public readonly requiredComponents = [] as const;
  public readonly activationComponents = ['agent', 'animal'] as const;
  protected readonly throttleInterval = THROTTLE.SLOW;

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;
    const entities = ctx.activeEntities;
    const len = entities.length;

    // Hot loop - optimized for minimal overhead
    for (let i = 0; i < len; i++) {
      const entity = entities[i]!;
      const components = entity.components;

      // Single lookup for agent (not has() + get())
      const agent = components.get(CT.Agent) as AgentComponent | undefined;
      if (agent !== undefined) {
        this.updateAgentAge(entity, agent, tick);
      }

      // Single lookup for animal
      const animal = components.get(CT.Animal) as AnimalComponent | undefined;
      if (animal !== undefined) {
        this.updateAnimalAge(entity, animal, tick);
      }
    }
  }

  // ==========================================================================
  // Agent Age Tracking (Inlined for performance)
  // ==========================================================================

  private updateAgentAge(
    entity: EntityImpl,
    agent: AgentComponent,
    currentTick: number
  ): void {
    const birthTick = agent.birthTick;
    if (birthTick === undefined) return;

    // Calculate age in ticks (integer comparison, no division)
    const ageTicks = currentTick - birthTick;

    // Inlined age category calculation using tick thresholds
    let newCategory: AgeCategory;
    if (ageTicks >= ELDER_TICK_THRESHOLD) {
      newCategory = 'elder';
    } else if (ageTicks >= ADULT_TICK_THRESHOLD) {
      newCategory = 'adult';
    } else if (ageTicks >= TEEN_TICK_THRESHOLD) {
      newCategory = 'teen';
    } else {
      newCategory = 'child';
    }

    // Only update if category changed
    const oldCategory = agent.ageCategory;
    if (newCategory !== oldCategory) {
      // Direct property mutation (component is already in Map)
      (agent as { ageCategory: AgeCategory }).ageCategory = newCategory;

      // Emit milestone event (rare - only on transitions)
      this.events.emitGeneric('agent:age_milestone', {
        agentId: entity.id,
        oldCategory,
        newCategory,
        ageYears: ageTicks * INV_TICKS_PER_YEAR,
        tick: currentTick,
      });
    }
  }

  // ==========================================================================
  // Animal Age Tracking (Inlined for performance)
  // ==========================================================================

  private updateAnimalAge(
    entity: EntityImpl,
    animal: AnimalComponent,
    currentTick: number
  ): void {
    // Calculate age in days using bitwise floor
    const createdAt = entity.createdAt;
    const ageTicks = currentTick - createdAt;
    const ageDays = (ageTicks * INV_TICKS_PER_DAY) | 0; // Bitwise floor

    // Skip if age unchanged
    if (animal.age === ageDays) return;

    // Inlined life stage calculation using day thresholds
    let newStage: AnimalLifeStage;
    if (ageDays >= ANIMAL_ADULT_DAYS) {
      newStage = 'adult';
    } else if (ageDays >= ANIMAL_JUVENILE_DAYS) {
      newStage = 'juvenile';
    } else {
      newStage = 'infant';
    }

    const oldStage = animal.lifeStage;
    const stageChanged = newStage !== oldStage;

    // Direct property mutation (no object spread)
    const mutableAnimal = animal as { age: number; lifeStage: AnimalLifeStage };
    mutableAnimal.age = ageDays;
    mutableAnimal.lifeStage = newStage;

    // Emit event only if life stage changed (rare)
    if (stageChanged && oldStage !== undefined) {
      this.events.emitGeneric('animal:life_stage_change', {
        animalId: entity.id,
        oldStage,
        newStage,
        ageYears: ageDays * INV_DAYS_PER_YEAR,
      });
    }
  }

  // ==========================================================================
  // Public Helper Methods
  // ==========================================================================

  /**
   * Get entity age in years from birthTick
   */
  public getAgeInYears(entity: EntityImpl, currentTick: number): number {
    const agent = entity.components.get(CT.Agent) as AgentComponent | undefined;
    if (agent?.birthTick !== undefined) {
      return (currentTick - agent.birthTick) * INV_TICKS_PER_YEAR;
    }

    const animal = entity.components.get(CT.Animal) as AnimalComponent | undefined;
    if (animal !== undefined) {
      return animal.age * INV_DAYS_PER_YEAR;
    }

    return 0;
  }

  /**
   * Get entity age in days
   */
  public getAgeInDays(entity: EntityImpl, currentTick: number): number {
    const agent = entity.components.get(CT.Agent) as AgentComponent | undefined;
    if (agent?.birthTick !== undefined) {
      return ((currentTick - agent.birthTick) * INV_TICKS_PER_DAY) | 0;
    }

    const animal = entity.components.get(CT.Animal) as AnimalComponent | undefined;
    if (animal !== undefined) {
      return animal.age;
    }

    return 0;
  }

  /**
   * Get generation number from GeneticComponent
   */
  public getGeneration(entity: EntityImpl): number {
    const genetic = entity.components.get(CT.Genetic) as GeneticComponent | undefined;
    return genetic?.generation ?? 0;
  }

  // ==========================================================================
  // Static Conversion Utilities
  // ==========================================================================

  /** Convert ticks to years */
  public static ticksToYears(ticks: number): number {
    return ticks * INV_TICKS_PER_YEAR;
  }

  /** Convert ticks to days (integer) */
  public static ticksToDays(ticks: number): number {
    return (ticks * INV_TICKS_PER_DAY) | 0;
  }

  /** Convert years to ticks (integer) */
  public static yearsToTicks(years: number): number {
    return (years * TIME_CONSTANTS.TICKS_PER_YEAR) | 0;
  }

  /** Convert days to ticks (integer) */
  public static daysToTicks(days: number): number {
    return (days * TIME_CONSTANTS.TICKS_PER_DAY) | 0;
  }
}
