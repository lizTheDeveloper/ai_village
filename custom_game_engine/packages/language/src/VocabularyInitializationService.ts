/**
 * Vocabulary Initialization Service
 *
 * Pre-generates core vocabulary for a language during creation.
 * Enables procedural naming and cultural consistency.
 */

import type { LLMProvider } from '@ai-village/llm';
import { TranslationService } from './TranslationService.js';
import { TraceryGrammarBuilder } from './TraceryGrammarBuilder.js';
import type { LanguageComponent } from './LanguageComponent.js';
import { addWordToLanguage } from './LanguageComponent.js';
import { getEssentialVocabulary, getAllCoreConcepts } from './CoreVocabulary.js';

/**
 * Vocabulary initialization options
 */
export interface VocabularyInitOptions {
  /**
   * Use essential vocabulary (planet + body plan specific)
   * If false, uses full core vocabulary (~200 words)
   */
  essentialOnly?: boolean;

  /**
   * Batch size for LLM translation requests
   * Larger batches = faster but more memory
   */
  batchSize?: number;

  /**
   * Progress callback for tracking generation
   */
  onProgress?: (current: number, total: number, word: string) => void;
}

/**
 * Vocabulary initialization service
 */
export class VocabularyInitializationService {
  private translationService: TranslationService;
  private grammarBuilder: TraceryGrammarBuilder;

  constructor(llmProvider: LLMProvider) {
    this.translationService = new TranslationService(llmProvider);
    this.grammarBuilder = new TraceryGrammarBuilder();
  }

  /**
   * Initialize core vocabulary for a language
   *
   * Pre-generates translations for essential concepts, enabling:
   * - Procedural naming (agents, places, items)
   * - Cultural consistency
   * - Instant word lookup (no LLM call needed)
   *
   * @param languageComponent - Language to initialize
   * @param planetType - Planet type for context
   * @param bodyPlanType - Body plan type for context
   * @param options - Initialization options
   * @returns Number of words generated
   */
  async initializeVocabulary(
    languageComponent: LanguageComponent,
    planetType: string,
    bodyPlanType: string,
    options: VocabularyInitOptions = {}
  ): Promise<number> {
    const {
      essentialOnly = true,
      batchSize = 10,
      onProgress,
    } = options;

    // Get concepts to translate
    const concepts = essentialOnly
      ? getEssentialVocabulary(planetType, bodyPlanType)
      : getAllCoreConcepts();

    // Remove duplicates
    const uniqueConcepts = [...new Set(concepts)];

    // Generate grammar for word creation
    const grammar = this.grammarBuilder.buildGrammar(languageComponent.languageConfig);

    // Process in batches to avoid overwhelming LLM
    let generatedCount = 0;

    for (let i = 0; i < uniqueConcepts.length; i += batchSize) {
      const batch = uniqueConcepts.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (concept) => {
          // Generate alien word for this concept
          const alienWord = this.grammarBuilder.generateWord(grammar);

          // Translate via LLM
          const translation = await this.translationService.translate({
            word: alienWord,
            languageConfig: languageComponent.languageConfig,
          });

          // Store in language dictionary
          addWordToLanguage(languageComponent, concept, {
            word: translation.word,
            translation: concept, // Store concept as translation
            wordType: this.inferWordType(concept),
            morphemes: translation.morphemes,
            confidence: translation.confidence,
            timestamp: Date.now(),
          });

          generatedCount++;

          // Progress callback
          if (onProgress) {
            onProgress(generatedCount, uniqueConcepts.length, concept);
          }
        })
      );
    }

    return generatedCount;
  }

  /**
   * Infer word type from concept
   *
   * Simple heuristic for categorizing concepts.
   *
   * @param concept - English concept
   * @returns Probable word type
   */
  private inferWordType(concept: string): 'noun' | 'verb' | 'adjective' | 'adverb' | 'particle' {
    // Verbs: actions
    const verbs = ['walk', 'run', 'fly', 'swim', 'climb', 'dig', 'hunt', 'gather',
                   'build', 'craft', 'fight', 'heal', 'speak', 'listen', 'see',
                   'hear', 'smell', 'taste', 'soar', 'bask', 'shed'];
    if (verbs.includes(concept)) return 'verb';

    // Adjectives: qualities, colors, sizes
    const adjectives = ['strong', 'weak', 'fast', 'slow', 'sharp', 'dull', 'hot',
                       'cold', 'bright', 'dark', 'hard', 'soft', 'big', 'small',
                       'heavy', 'light', 'long', 'short', 'red', 'blue', 'green',
                       'yellow', 'black', 'white', 'old', 'new'];
    if (adjectives.includes(concept)) return 'adjective';

    // Default to noun
    return 'noun';
  }

  /**
   * Get alien word for a concept
   *
   * Quick lookup from pre-generated vocabulary.
   *
   * @param languageComponent - Language component
   * @param concept - English concept
   * @returns Alien word if exists, undefined otherwise
   */
  getAlienWord(
    languageComponent: LanguageComponent,
    concept: string
  ): string | undefined {
    return languageComponent.knownWords.get(concept)?.word;
  }

  /**
   * Generate name using pattern and vocabulary
   *
   * @param languageComponent - Language with vocabulary
   * @param patternParts - Name pattern parts (e.g., ['quality', 'nature'])
   * @param rng - Random number generator
   * @returns Generated alien name
   */
  generateNameFromVocabulary(
    languageComponent: LanguageComponent,
    patternParts: string[],
    rng: () => number = Math.random
  ): string {
    const words: string[] = [];

    for (const part of patternParts) {
      // Get random concept from this category
      const concepts = this.getConceptsInCategory(part);
      if (concepts.length === 0) continue;

      const concept = concepts[Math.floor(rng() * concepts.length)]!;
      const alienWord = this.getAlienWord(languageComponent, concept);

      if (alienWord) {
        words.push(alienWord);
      }
    }

    return words.join('-'); // Or use language-specific separator
  }

  /**
   * Get concepts in a category (for name generation)
   *
   * @param category - Category name
   * @returns Array of concepts
   */
  private getConceptsInCategory(category: string): string[] {
    // Simplified - in real implementation, would import from CoreVocabulary
    const categories: Record<string, string[]> = {
      nature: ['fire', 'water', 'stone', 'mountain', 'river'],
      quality: ['strong', 'fast', 'bright', 'dark', 'sharp'],
      action: ['walk', 'run', 'fly', 'swim', 'hunt'],
      color: ['red', 'blue', 'green', 'black', 'white'],
    };

    return categories[category] || [];
  }
}
