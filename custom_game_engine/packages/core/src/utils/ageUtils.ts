/**
 * Age Utilities - Centralized age and generation tracking helpers
 *
 * Provides time conversion, age calculation, and generation tracking utilities.
 * Used by AgeTrackingSystem, ReproductionSystem, and conversation/LLM systems.
 */

import type { Entity } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { AgentComponent, AgeCategory } from '../components/AgentComponent.js';
import type { AnimalComponent } from '../components/AnimalComponent.js';
import type { GeneticComponent } from '../components/GeneticComponent.js';
import { calculateAgeCategory } from '../conversation/ConversationStyle.js';

// ============================================================================
// Time Conversion Constants
// ============================================================================

/**
 * Game time conversion constants.
 * Exported for use across the codebase.
 */
export const TIME_CONSTANTS = {
  TICKS_PER_SECOND: 20,
  TICKS_PER_MINUTE: 20 * 60,
  TICKS_PER_HOUR: 20 * 60 * 60,
  TICKS_PER_DAY: 20 * 60 * 60 * 24, // 1,728,000 ticks per day
  DAYS_PER_YEAR: 180, // Fantasy calendar with 180 days per year
  TICKS_PER_YEAR: 20 * 60 * 60 * 24 * 180, // 311,040,000 ticks per year
} as const;

// ============================================================================
// Time Conversion Functions
// ============================================================================

/**
 * Convert ticks to years
 */
export function ticksToYears(ticks: number): number {
  return ticks / TIME_CONSTANTS.TICKS_PER_YEAR;
}

/**
 * Convert ticks to days
 */
export function ticksToDays(ticks: number): number {
  return Math.floor(ticks / TIME_CONSTANTS.TICKS_PER_DAY);
}

/**
 * Convert years to ticks
 */
export function yearsToTicks(years: number): number {
  return Math.floor(years * TIME_CONSTANTS.TICKS_PER_YEAR);
}

/**
 * Convert days to ticks
 */
export function daysToTicks(days: number): number {
  return Math.floor(days * TIME_CONSTANTS.TICKS_PER_DAY);
}

/**
 * Convert ticks to hours
 */
export function ticksToHours(ticks: number): number {
  return ticks / TIME_CONSTANTS.TICKS_PER_HOUR;
}

/**
 * Convert hours to ticks
 */
export function hoursToTicks(hours: number): number {
  return Math.floor(hours * TIME_CONSTANTS.TICKS_PER_HOUR);
}

// ============================================================================
// Age Calculation Functions
// ============================================================================

/**
 * Get entity's age in years from birthTick.
 * Returns 0 if birthTick is not set.
 */
export function getAgeInYears(entity: Entity, currentTick: number): number {
  const agent = entity.components.get(CT.Agent) as AgentComponent | undefined;
  if (agent?.birthTick !== undefined) {
    const ageTicks = currentTick - agent.birthTick;
    return ticksToYears(ageTicks);
  }

  const animal = entity.components.get(CT.Animal) as AnimalComponent | undefined;
  if (animal) {
    return animal.age / TIME_CONSTANTS.DAYS_PER_YEAR;
  }

  return 0;
}

/**
 * Get entity's age in days.
 * Returns 0 if birthTick/age is not set.
 */
export function getAgeInDays(entity: Entity, currentTick: number): number {
  const agent = entity.components.get(CT.Agent) as AgentComponent | undefined;
  if (agent?.birthTick !== undefined) {
    const ageTicks = currentTick - agent.birthTick;
    return ticksToDays(ageTicks);
  }

  const animal = entity.components.get(CT.Animal) as AnimalComponent | undefined;
  if (animal) {
    return animal.age;
  }

  return 0;
}

/**
 * Get entity's age in ticks since birth.
 * Returns 0 if birthTick is not set.
 */
export function getAgeInTicks(entity: Entity, currentTick: number): number {
  const agent = entity.components.get(CT.Agent) as AgentComponent | undefined;
  if (agent?.birthTick !== undefined) {
    return currentTick - agent.birthTick;
  }

  const animal = entity.components.get(CT.Animal) as AnimalComponent | undefined;
  if (animal) {
    return daysToTicks(animal.age);
  }

  return 0;
}

/**
 * Get entity's age category (child, teen, adult, elder).
 * Returns 'adult' as default for entities without birthTick.
 */
export function getAgeCategory(entity: Entity, currentTick: number): AgeCategory {
  const agent = entity.components.get(CT.Agent) as AgentComponent | undefined;

  // If ageCategory is cached, use it
  if (agent?.ageCategory) {
    return agent.ageCategory;
  }

  // Calculate from birthTick
  if (agent?.birthTick !== undefined) {
    const ageYears = getAgeInYears(entity, currentTick);
    return calculateAgeCategory(ageYears);
  }

  // Default to adult
  return 'adult';
}

// ============================================================================
// Generation Tracking Functions
// ============================================================================

/**
 * Get entity's generation number (how many generations from original ancestor).
 * Returns 0 for entities without GeneticComponent.
 */
export function getGeneration(entity: Entity): number {
  const genetic = entity.components.get(CT.Genetic) as GeneticComponent | undefined;
  return genetic?.generation ?? 0;
}

/**
 * Get entity's parent IDs from GeneticComponent.
 * Returns undefined if no parents recorded.
 */
export function getParentIds(entity: Entity): [string, string] | undefined {
  const genetic = entity.components.get(CT.Genetic) as GeneticComponent | undefined;
  return genetic?.parentIds;
}

/**
 * Check if entity has recorded parents (not first generation).
 */
export function hasParents(entity: Entity): boolean {
  const genetic = entity.components.get(CT.Genetic) as GeneticComponent | undefined;
  return genetic?.parentIds !== undefined;
}

/**
 * Calculate lineage depth (total ancestors).
 * This is 2^generation - 1 (all ancestors across all generations).
 * Generation 0: 0 ancestors
 * Generation 1: 1 ancestor pair (2 total)
 * Generation 2: 1 + 2 = 3 ancestor pairs (6 total)
 * Generation 3: 1 + 2 + 4 = 7 ancestor pairs (14 total)
 */
export function getLineageDepth(generation: number): number {
  if (generation === 0) return 0;
  return Math.pow(2, generation + 1) - 2; // Total ancestors
}

/**
 * Get human-readable lineage description.
 * Examples:
 * - Generation 0: "Original"
 * - Generation 1: "1st generation (2 ancestors)"
 * - Generation 2: "2nd generation (6 ancestors)"
 */
export function getLineageDescription(generation: number): string {
  if (generation === 0) return 'Original';

  const ordinal = getOrdinal(generation);
  const ancestors = getLineageDepth(generation);

  return `${ordinal} generation (${ancestors} ancestors)`;
}

/**
 * Get ordinal suffix for numbers (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th');
}

// ============================================================================
// Lifecycle Checking Functions
// ============================================================================

/**
 * Check if entity is a child (< 13 years old).
 */
export function isChild(entity: Entity, currentTick: number): boolean {
  return getAgeCategory(entity, currentTick) === 'child';
}

/**
 * Check if entity is a teen (13-19 years old).
 */
export function isTeen(entity: Entity, currentTick: number): boolean {
  return getAgeCategory(entity, currentTick) === 'teen';
}

/**
 * Check if entity is an adult (20-59 years old).
 */
export function isAdult(entity: Entity, currentTick: number): boolean {
  return getAgeCategory(entity, currentTick) === 'adult';
}

/**
 * Check if entity is an elder (60+ years old).
 */
export function isElder(entity: Entity, currentTick: number): boolean {
  return getAgeCategory(entity, currentTick) === 'elder';
}

/**
 * Check if entity is of reproductive age (adult or elder, not child/teen).
 */
export function isReproductiveAge(entity: Entity, currentTick: number): boolean {
  const category = getAgeCategory(entity, currentTick);
  return category === 'adult' || category === 'elder';
}

/**
 * Check if entity is mature (adult or elder).
 * Alias for isReproductiveAge for clarity in different contexts.
 */
export function isMature(entity: Entity, currentTick: number): boolean {
  return isReproductiveAge(entity, currentTick);
}

// ============================================================================
// Formatted Display Functions
// ============================================================================

/**
 * Format age as human-readable string.
 * Examples:
 * - "5 years old"
 * - "42 days old"
 * - "2.3 years old"
 */
export function formatAge(entity: Entity, currentTick: number): string {
  const ageYears = getAgeInYears(entity, currentTick);

  if (ageYears < 1) {
    const ageDays = getAgeInDays(entity, currentTick);
    return `${ageDays} day${ageDays !== 1 ? 's' : ''} old`;
  }

  if (ageYears < 2) {
    return `${ageYears.toFixed(1)} years old`;
  }

  return `${Math.floor(ageYears)} years old`;
}

/**
 * Format generation as human-readable string.
 * Examples:
 * - "Original generation"
 * - "1st generation"
 * - "5th generation"
 */
export function formatGeneration(entity: Entity): string {
  const generation = getGeneration(entity);

  if (generation === 0) {
    return 'Original generation';
  }

  return `${getOrdinal(generation)} generation`;
}
