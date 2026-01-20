/**
 * PhonemeAnalyzer.ts
 *
 * Analyzes selected phonemes to determine language character by identifying
 * dominant qualities (texture, hardness, manner, position) across the phoneme set.
 *
 * This analysis is used to:
 * - Generate Tracery descriptions of the language ("harsh guttural sounds")
 * - Provide cultural context to agents ("You speak the Fire Tongue")
 * - Create consistent alien language aesthetics
 *
 * Based on PROCEDURAL_LANGUAGE_SYSTEM.md section "Language Character Analysis".
 */

import type { PhonemeMetadata } from './types.js';

/**
 * Language character derived from phoneme analysis
 *
 * Contains the dominant qualities that define how a language sounds,
 * extracted by counting quality occurrences across all selected phonemes.
 */
export interface LanguageCharacter {
  /** Primary texture quality (e.g., 'guttural', 'liquid', 'percussive') */
  primaryTexture: string;

  /** Secondary texture quality for variety (optional) */
  secondaryTexture?: string;

  /** Primary hardness quality (e.g., 'harsh', 'soft', 'crisp') */
  primaryHardness: string;

  /** Primary manner quality (e.g., 'flowing', 'clipped', 'sharp') */
  primaryManner: string;

  /** Dominant position qualities (e.g., ['back', 'low'] for deep sounds) */
  positions: string[];

  /** Body-plan-specific qualities (NEW: from BodyPlanPhonology) */
  bodyPlanQualities?: string[];
}

/**
 * Phoneme analyzer
 *
 * Analyzes a set of selected phonemes to determine the overall character
 * of the language by finding dominant qualities across all categories.
 */
export class PhonemeAnalyzer {
  /**
   * Analyze selected phonemes to determine language character
   *
   * Counts quality occurrences across all phonemes and identifies the most
   * common values in each category (texture, hardness, manner, position).
   *
   * @param selectedPhonemes - Array of phoneme metadata to analyze
   * @returns Language character with dominant qualities
   *
   * @example
   * ```typescript
   * // Volcanic language with kh, x, r, k, a, i
   * const analyzer = new PhonemeAnalyzer();
   * const character = analyzer.analyzeLanguageCharacter(volcanicPhonemes);
   * // Result: {
   * //   primaryTexture: 'guttural',
   * //   secondaryTexture: 'percussive',
   * //   primaryHardness: 'harsh',
   * //   primaryManner: 'sharp',
   * //   positions: ['back', 'low']
   * // }
   * ```
   */
  analyzeLanguageCharacter(selectedPhonemes: PhonemeMetadata[]): LanguageCharacter {
    const qualityCounts: Record<string, number> = {};

    // Count all quality occurrences across all phonemes
    for (const phoneme of selectedPhonemes) {
      // Iterate through each quality type (texture, hardness, position, manner)
      const qualityValues = Object.values(phoneme.qualities) as string[][];
      for (const qualityType of qualityValues) {
        // Count each individual quality
        for (const quality of qualityType as string[]) {
          qualityCounts[quality] = (qualityCounts[quality] || 0) + 1;
        }
      }
    }

    // Filter quality counts by category to find dominant values
    const textures = this.filterByCategory(qualityCounts, [
      'guttural', 'liquid', 'percussive', 'sibilant', 'nasal', 'breathy',
      'clicking', 'buzzing', 'harmonic', 'echoic', 'rumbling', 'chiming', 'tonal'
    ]);

    const hardnesses = this.filterByCategory(qualityCounts, [
      'harsh', 'soft', 'crisp', 'smooth', 'rough', 'deep', 'resonant'
    ]);

    const manners = this.filterByCategory(qualityCounts, [
      'flowing', 'clipped', 'sharp', 'resonant', 'rounded', 'rapid', 'layered',
      'sustained', 'pulsing', 'rising', 'falling', 'stacked'
    ]);

    const positions = this.filterByCategory(qualityCounts, [
      'front', 'back', 'central', 'high', 'low', 'full'
    ]);

    return {
      primaryTexture: this.getTopQuality(textures),
      secondaryTexture: this.getSecondQuality(textures),
      primaryHardness: this.getTopQuality(hardnesses),
      primaryManner: this.getTopQuality(manners),
      positions: this.getTopQualities(positions, 2),
    };
  }

  /**
   * Filter quality counts to only include specified categories
   *
   * @param counts - All quality counts
   * @param categories - Valid quality names for this category
   * @returns Filtered counts containing only specified categories
   *
   * @private
   */
  private filterByCategory(
    counts: Record<string, number>,
    categories: string[]
  ): Record<string, number> {
    return Object.fromEntries(
      Object.entries(counts).filter(([key]) => categories.includes(key))
    );
  }

  /**
   * Get the most common quality from a set of counts
   *
   * @param counts - Quality counts for a specific category
   * @returns The quality with the highest count, or 'neutral' if none found
   *
   * @private
   */
  private getTopQuality(counts: Record<string, number>): string {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'neutral';
  }

  /**
   * Get the second most common quality from a set of counts
   *
   * Returns undefined if there's no second quality or if the second quality
   * has very low count (less than 2 occurrences).
   *
   * @param counts - Quality counts for a specific category
   * @returns The quality with the second highest count, or undefined
   *
   * @private
   */
  private getSecondQuality(counts: Record<string, number>): string | undefined {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const secondEntry = sorted[1];

    // Only return secondary quality if it appears at least twice
    // This prevents noise from single-occurrence qualities
    if (secondEntry && secondEntry[1] >= 2) {
      return secondEntry[0];
    }

    return undefined;
  }

  /**
   * Get the top N qualities from a set of counts
   *
   * @param counts - Quality counts for a specific category
   * @param n - Number of top qualities to return
   * @returns Array of the N most common qualities (may be shorter if fewer exist)
   *
   * @private
   */
  private getTopQualities(counts: Record<string, number>, n: number): string[] {
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key]) => key);
  }
}
