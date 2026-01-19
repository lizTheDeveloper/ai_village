/**
 * Tracery Grammar Builder
 *
 * Builds Tracery grammars for generating alien words based on language phoneme inventory.
 * Creates word generation rules from the selected phonemes and syllable patterns.
 *
 * @see PROCEDURAL_LANGUAGE_SYSTEM.md section 3 "Tracery Grammar Integration"
 */

import type { LanguageConfig } from './types.js';
import type { TraceryGrammar } from './LanguageDescriptionGrammar.js';

/**
 * Builds Tracery grammars from language configurations
 */
export class TraceryGrammarBuilder {
  /**
   * Build Tracery grammar for word generation from language config
   *
   * @param lang - Language configuration with selected phonemes
   * @returns Tracery grammar for generating words
   *
   * @example
   * ```typescript
   * const builder = new TraceryGrammarBuilder();
   * const grammar = builder.buildGrammar(volcanoLanguage);
   * // grammar.origin: ['#syllable##syllable#', '#syllable##syllable##syllable#', ...]
   * // grammar.consonant: ['k', 'kh', 'r', 'x', 't', ...]
   * // grammar.vowel: ['a', 'i', 'e']
   * ```
   */
  buildGrammar(lang: LanguageConfig): TraceryGrammar {
    // Build syllable patterns from language configuration
    const syllableRules = lang.syllablePatterns.map(pattern => {
      return this.convertPatternToTracery(pattern);
    });

    const grammar: TraceryGrammar = {
      // Word generation: 2-4 syllables based on language config
      origin: this.buildOriginRules(lang.maxSyllablesPerWord || 3),

      // Syllable patterns
      syllable: syllableRules,

      // Phoneme choices
      consonant: lang.selectedConsonants,
      vowel: lang.selectedVowels,
    };

    // Add optional features
    if (lang.allowedClusters && lang.selectedClusters.length > 0) {
      grammar.cluster = lang.selectedClusters;
      // Add cluster-based syllable patterns
      grammar.syllable!.push('#cluster##vowel#');
      grammar.syllable!.push('#cluster##vowel##consonant#');
    }

    if (lang.allowedTones) {
      grammar.tone = ["'", "`", "^"];
      // Add tone markers to some words
      grammar.origin.push('#syllable##syllable##tone#');
      grammar.origin.push('#syllable##syllable##syllable##tone#');
    }

    return grammar;
  }

  /**
   * Generate a word using the grammar (simple template-based for now)
   *
   * Note: Real implementation will use tracery-grammar library.
   * This is a placeholder that does simple random selection.
   */
  generateWord(grammar: TraceryGrammar): string {
    // Pick random origin pattern
    const originPattern = this.pickRandom(grammar.origin);

    // Replace #syllable# with actual syllables
    let word = originPattern;
    while (word.includes('#syllable#')) {
      const syllable = this.generateSyllable(grammar);
      word = word.replace('#syllable#', syllable);
    }

    // Replace tone markers if present
    if (word.includes('#tone#') && grammar.tone) {
      const tone = this.pickRandom(grammar.tone);
      word = word.replace('#tone#', tone);
    }

    return word;
  }

  /**
   * Generate a single syllable from grammar
   */
  private generateSyllable(grammar: TraceryGrammar): string {
    const pattern = this.pickRandom(grammar.syllable!);

    let syllable = pattern;

    // Replace #consonant#
    while (syllable.includes('#consonant#')) {
      const consonant = this.pickRandom(grammar.consonant!);
      syllable = syllable.replace('#consonant#', consonant);
    }

    // Replace #vowel#
    while (syllable.includes('#vowel#')) {
      const vowel = this.pickRandom(grammar.vowel!);
      syllable = syllable.replace('#vowel#', vowel);
    }

    // Replace #cluster# if present
    if (syllable.includes('#cluster#') && grammar.cluster) {
      const cluster = this.pickRandom(grammar.cluster);
      syllable = syllable.replace('#cluster#', cluster);
    }

    return syllable;
  }

  /**
   * Convert syllable pattern to Tracery rule
   *
   * @param pattern - Syllable pattern like "CV", "CVC", "CVCC"
   * @returns Tracery rule like "#consonant##vowel#"
   */
  private convertPatternToTracery(pattern: string): string {
    return pattern
      .replace(/C/g, '#consonant#')
      .replace(/V/g, '#vowel#');
  }

  /**
   * Build origin rules for different syllable counts
   */
  private buildOriginRules(maxSyllables: number): string[] {
    const rules: string[] = [];

    for (let i = 2; i <= maxSyllables; i++) {
      const syllables = Array(i).fill('#syllable#').join('');
      rules.push(syllables);
    }

    return rules;
  }

  /**
   * Pick random element from array
   */
  private pickRandom<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]!;
  }
}
