/**
 * SoulWisdomComponent - Tracks soul wisdom accumulated across reincarnations
 *
 * Multiple reincarnations lead to accumulated wisdom through suppressed memories.
 * This wisdom provides:
 * - Better decision-making (unconscious pattern recognition)
 * - Faster learning (the soul has learned before)
 * - Enhanced intuition (accessing suppressed knowledge)
 * - Path to ascension (angel → god)
 *
 * Progression:
 * 1. Mortal lives and dies repeatedly
 * 2. Each life adds suppressed memories to the soul
 * 3. Accumulated wisdom grants unconscious bonuses
 * 4. God of Death can see all suppressed memories when judging
 * 5. Worthy souls (high wisdom, many lives) can be elevated to angelhood
 * 6. Angels can eventually ascend to godhood
 */

import type { Component } from '../ecs/Component.js';

export interface SoulWisdomComponent extends Component {
  type: 'soul_wisdom';

  /**
   * Number of times this soul has reincarnated
   * Each death/rebirth cycle increments this
   */
  reincarnationCount: number;

  /**
   * Total wisdom accumulated across all lives (0-1)
   * Calculated from: reincarnation count + suppressed memory count
   * - 0.0: New soul, no wisdom
   * - 0.3: Young soul, some experience
   * - 0.6: Mature soul, significant wisdom
   * - 0.9+: Ancient soul, ready for ascension
   */
  wisdomLevel: number;

  /**
   * Wisdom modifier applied to learning and decision-making (0-1)
   * - Learning speed multiplier: 1 + wisdomModifier
   * - Decision quality bonus: wisdomModifier * 0.3
   * - Intuition bonus: wisdomModifier * 0.5
   */
  wisdomModifier: number;

  /**
   * Whether this soul is eligible for ascension to angelhood
   * Determined by: wisdomLevel >= 0.85 && reincarnationCount >= 10
   */
  ascensionEligible: boolean;

  /**
   * First incarnation tick (soul's "birth")
   * Used to calculate soul age
   */
  firstIncarnationTick: number;

  /**
   * Most recent death tick
   * Used to track time between lives
   */
  lastDeathTick?: number;

  /**
   * Track lives lived (includes current life)
   * reincarnationCount = livesLived - 1
   */
  livesLived: number;

  /**
   * Highest skill levels ever achieved across all lives
   * Provides very faint "talent" memory even if skills were lost
   */
  peakSkills?: Record<string, number>;

  /**
   * Total emotional experiences across all lives
   * High emotion = more wisdom gained from that life
   */
  totalEmotionalIntensity: number;
}

/**
 * Create a new SoulWisdomComponent for a first-time mortal
 */
export function createSoulWisdomComponent(currentTick: number): SoulWisdomComponent {
  return {
    type: 'soul_wisdom',
    version: 1,
    reincarnationCount: 0,
    wisdomLevel: 0.0,
    wisdomModifier: 0.0,
    ascensionEligible: false,
    firstIncarnationTick: currentTick,
    livesLived: 1,
    totalEmotionalIntensity: 0,
  };
}

/**
 * Create SoulWisdomComponent for a reincarnated soul
 */
export function createReincarnatedSoulWisdomComponent(
  previous: SoulWisdomComponent,
  suppressedMemoryCount: number,
  currentTick: number
): SoulWisdomComponent {
  const newReincarnationCount = previous.reincarnationCount + 1;
  const newLivesLived = previous.livesLived + 1;

  // Calculate wisdom level based on experiences
  const wisdomLevel = calculateWisdomLevel(newReincarnationCount, suppressedMemoryCount);

  // Wisdom modifier grows with level (square root for diminishing returns)
  const wisdomModifier = Math.sqrt(wisdomLevel) * 0.5; // Max 0.5 at wisdomLevel=1.0

  // Ascension requires both high wisdom and many lives
  const ascensionEligible = wisdomLevel >= 0.85 && newReincarnationCount >= 10;

  return {
    type: 'soul_wisdom',
    version: 1,
    reincarnationCount: newReincarnationCount,
    wisdomLevel,
    wisdomModifier,
    ascensionEligible,
    firstIncarnationTick: previous.firstIncarnationTick,
    lastDeathTick: currentTick,
    livesLived: newLivesLived,
    peakSkills: previous.peakSkills,
    totalEmotionalIntensity: previous.totalEmotionalIntensity,
  };
}

/**
 * Calculate wisdom level from reincarnations and accumulated suppressed memories
 *
 * Formula:
 * - Base from reincarnations: min(0.5, reincarnationCount * 0.05)
 * - Bonus from memories: min(0.5, suppressedMemoryCount * 0.002)
 * - Total: base + bonus, clamped to [0, 1]
 *
 * Examples:
 * - 0 reincarnations, 0 memories: 0.0 wisdom
 * - 5 reincarnations, 100 memories: 0.25 + 0.2 = 0.45 wisdom
 * - 10 reincarnations, 250 memories: 0.5 + 0.5 = 1.0 wisdom (max)
 * - 20 reincarnations, 500 memories: 0.5 + 0.5 = 1.0 wisdom (capped)
 */
export function calculateWisdomLevel(
  reincarnationCount: number,
  suppressedMemoryCount: number
): number {
  // Reincarnations contribute up to 0.5 wisdom (each life adds 5%)
  const baseWisdom = Math.min(0.5, reincarnationCount * 0.05);

  // Suppressed memories contribute up to 0.5 wisdom (each memory adds 0.2%)
  const memoryWisdom = Math.min(0.5, suppressedMemoryCount * 0.002);

  // Total wisdom (capped at 1.0)
  return Math.min(1.0, baseWisdom + memoryWisdom);
}

/**
 * Get a human-readable description of soul wisdom level
 */
export function getWisdomDescription(component: SoulWisdomComponent): string {
  const { wisdomLevel, reincarnationCount, livesLived } = component;

  if (reincarnationCount === 0) {
    return 'New soul, first incarnation';
  }

  if (wisdomLevel < 0.2) {
    return `Young soul (${livesLived} lives)`;
  } else if (wisdomLevel < 0.4) {
    return `Developing soul (${livesLived} lives)`;
  } else if (wisdomLevel < 0.6) {
    return `Mature soul (${livesLived} lives)`;
  } else if (wisdomLevel < 0.85) {
    return `Wise soul (${livesLived} lives)`;
  } else {
    return `Ancient soul (${livesLived} lives) - Ready for ascension`;
  }
}

/**
 * Get wisdom modifier for a specific context
 */
export function getWisdomModifier(
  component: SoulWisdomComponent,
  context: 'learning' | 'decision' | 'intuition'
): number {
  const base = component.wisdomModifier;

  switch (context) {
    case 'learning':
      // Learning speed: 1.0 + up to 0.5 bonus = 1.5x max
      return base;

    case 'decision':
      // Decision quality: up to +0.15 bonus
      return base * 0.3;

    case 'intuition':
      // Intuition/gut feelings: up to +0.25 bonus
      return base * 0.5;

    default:
      return base;
  }
}

/**
 * Update peak skills if current skills are higher
 */
export function updatePeakSkills(
  component: SoulWisdomComponent,
  currentSkills: Record<string, number>
): Record<string, number> {
  const peakSkills = component.peakSkills ?? {};

  for (const [skillId, level] of Object.entries(currentSkills)) {
    if (!peakSkills[skillId] || level > peakSkills[skillId]) {
      peakSkills[skillId] = level;
    }
  }

  return peakSkills;
}
