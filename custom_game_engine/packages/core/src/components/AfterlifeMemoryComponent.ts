/**
 * AfterlifeMemoryComponent - Tracks memories from the afterlife that fade over time
 *
 * When agents reincarnate with memory retention, some memories are from their
 * time in the Underworld. These memories are extremely rare and fade during childhood.
 *
 * - Most agents (99%) lose all afterlife memories by adulthood
 * - Rare agents (1%) retain tiny fragments into adulthood
 * - Memories fade faster in early childhood, slower as they age
 */

import type { Component } from '../ecs/Component.js';

export interface AfterlifeMemoryComponent extends Component {
  type: 'afterlife_memory';

  /**
   * Memory IDs from previous life's afterlife experience
   * These are conversation exchanges with psychopomp, judgment details, etc.
   */
  afterlifeMemoryIds: Set<string>;

  /**
   * Whether this agent is one of the rare 1% who retain fragments into adulthood
   * Determined at reincarnation based on random chance
   */
  retainsIntoAdulthood: boolean;

  /**
   * Clarity multiplier for afterlife memories (0-1)
   * Decreases over time as memories fade
   * - 1.0 = crystal clear (newborn)
   * - 0.5 = hazy
   * - 0.1 = barely there
   * - 0.0 = completely faded
   */
  clarityMultiplier: number;

  /**
   * Age when memory fading started (typically 0 for newborns)
   */
  fadingStartAge: number;

  /**
   * Age threshold where complete fading occurs
   * - Standard agents: ~10 years (childhood)
   * - Rare agents: Never completely fades, but gets very weak (~0.05 clarity)
   */
  completeFadingAge: number;

  /**
   * Whether fading is complete (all afterlife memories erased)
   */
  fadingComplete: boolean;
}

/**
 * Create an AfterlifeMemoryComponent for a reincarnated agent
 *
 * @param afterlifeMemoryIds - Memory IDs from the afterlife to track
 * @param retentionChance - Probability of retaining into adulthood (default 0.01 = 1%)
 */
export function createAfterlifeMemoryComponent(
  afterlifeMemoryIds: Set<string>,
  retentionChance: number = 0.01
): AfterlifeMemoryComponent {
  // 1% chance to be a rare individual who retains fragments
  const retainsIntoAdulthood = Math.random() < retentionChance;

  return {
    type: 'afterlife_memory',
    version: 1,
    afterlifeMemoryIds,
    retainsIntoAdulthood,
    clarityMultiplier: 1.0, // Start crystal clear
    fadingStartAge: 0,
    completeFadingAge: retainsIntoAdulthood ? Infinity : 10, // 10 years for normal, never for rare
    fadingComplete: false,
  };
}

/**
 * Calculate clarity reduction based on age and retention type
 *
 * Fading curve:
 * - Ages 0-3: Rapid fading (loses 50% clarity)
 * - Ages 3-7: Moderate fading (loses 30% clarity)
 * - Ages 7-10: Slow fading (loses remaining clarity for normal agents)
 * - Ages 10+: Only rare agents have any memories left (~5% clarity)
 */
export function calculateMemoryClarity(
  currentAge: number,
  retainsIntoAdulthood: boolean,
  fadingStartAge: number
): number {
  const ageElapsed = currentAge - fadingStartAge;

  if (ageElapsed <= 0) return 1.0;

  if (retainsIntoAdulthood) {
    // Rare agents: fade to minimum 5% but never disappear completely
    // Asymptotic decay: approaches 0.05 but never reaches it
    const minClarity = 0.05;
    const decayRate = 0.15; // Slower decay for rare individuals
    return minClarity + (1.0 - minClarity) * Math.exp(-decayRate * ageElapsed);
  } else {
    // Normal agents: complete fading by age 10
    if (ageElapsed >= 10) return 0.0;

    // Exponential decay curve
    // Age 3: ~50% clarity
    // Age 7: ~10% clarity
    // Age 10: 0% clarity
    const decayRate = 0.3;
    return Math.max(0, Math.exp(-decayRate * ageElapsed));
  }
}

/**
 * Check if an agent should still have afterlife memories
 */
export function hasAfterlifeMemories(component: AfterlifeMemoryComponent): boolean {
  return !component.fadingComplete && component.clarityMultiplier > 0.01;
}

/**
 * Get a description of memory state for debugging/narrative
 */
export function getMemoryStateDescription(component: AfterlifeMemoryComponent): string {
  if (component.fadingComplete) {
    return 'No afterlife memories remain';
  }

  const clarity = component.clarityMultiplier;

  if (clarity > 0.8) {
    return 'Crystal clear afterlife memories (newborn)';
  } else if (clarity > 0.5) {
    return 'Hazy memories of the afterlife';
  } else if (clarity > 0.2) {
    return 'Faint echoes of another life';
  } else if (clarity > 0.05) {
    return 'Barely perceptible fragments';
  } else if (component.retainsIntoAdulthood) {
    return 'Tiny persistent afterlife fragments (rare)';
  } else {
    return 'Fading rapidly';
  }
}
