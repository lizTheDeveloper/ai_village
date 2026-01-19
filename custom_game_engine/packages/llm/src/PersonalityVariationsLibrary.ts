/**
 * Personality Variations Library
 *
 * Massive collection of personality descriptions for different trait combinations.
 * Each combination gets multiple variations to ensure agents feel unique.
 *
 * Uses the four blended writer voices for maximum character depth.
 */

import type { PersonalityComponent } from '@ai-village/core';
import personalityVariationsData from '../data/personality-variations.json';

/**
 * Simple string hash function for consistent variation selection.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a unique personality variation based on all traits.
 * Returns different descriptions for the same trait combination on subsequent calls.
 * Loaded from ../data/personality-variations.json
 */
export function getPersonalityVariation(
  personality: PersonalityComponent,
  seed?: number
): { openness?: string; extraversion?: string; agreeableness?: string; workEthic?: string; leadership?: string; creativity?: string; neuroticism?: string } {
  const variations: Record<string, string[]> = {};
  const data = personalityVariationsData as any;

  // OPENNESS VARIATIONS (curious vs traditional)
  if (personality.openness > 0.85) {
    variations.openness = data.openness.very_high;
  } else if (personality.openness > 0.7) {
    variations.openness = data.openness.high;
  } else if (personality.openness < 0.3) {
    variations.openness = data.openness.low;
  }

  // EXTRAVERSION VARIATIONS (social vs introspective)
  if (personality.extraversion > 0.85) {
    variations.extraversion = data.extraversion.very_high;
  } else if (personality.extraversion > 0.7) {
    variations.extraversion = data.extraversion.high;
  } else if (personality.extraversion < 0.3) {
    variations.extraversion = data.extraversion.low;
  }

  // AGREEABLENESS VARIATIONS (cooperative vs independent)
  if (personality.agreeableness > 0.85) {
    variations.agreeableness = data.agreeableness.very_high;
  } else if (personality.agreeableness > 0.7) {
    variations.agreeableness = data.agreeableness.high;
  } else if (personality.agreeableness < 0.3) {
    variations.agreeableness = data.agreeableness.low;
  }

  // WORK ETHIC VARIATIONS (dedicated vs relaxed)
  if (personality.workEthic > 0.85) {
    variations.workEthic = data.workEthic.very_high;
  } else if (personality.workEthic > 0.7) {
    variations.workEthic = data.workEthic.high;
  } else if (personality.workEthic < 0.3) {
    variations.workEthic = data.workEthic.low;
  }

  // LEADERSHIP VARIATIONS (initiator vs follower)
  if (personality.leadership > 0.85) {
    variations.leadership = data.leadership.very_high;
  } else if (personality.leadership > 0.7) {
    variations.leadership = data.leadership.high;
  } else if (personality.leadership < 0.3) {
    variations.leadership = data.leadership.low;
  }

  // CREATIVITY VARIATIONS (innovative vs conventional)
  if (personality.creativity > 0.8) {
    variations.creativity = data.creativity.high;
  } else if (personality.creativity < 0.3) {
    variations.creativity = data.creativity.low;
  }

  // NEUROTICISM VARIATIONS (sensitive vs resilient)
  if (personality.neuroticism > 0.7) {
    variations.neuroticism = data.neuroticism.high;
  } else if (personality.neuroticism < 0.3) {
    variations.neuroticism = data.neuroticism.low;
  }

  // Select variations (with seed for consistency)
  const result: Record<string, string> = {};
  const s = seed || Date.now();

  for (const [trait, options] of Object.entries(variations)) {
    if (options.length > 0) {
      const index = s % options.length;
      const value = options[index];
      if (value !== undefined) {
        result[trait] = value;
      }
    }
  }

  return result;
}
