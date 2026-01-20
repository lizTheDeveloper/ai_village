/**
 * Alien Text Renderer
 *
 * Service for rendering alien language text with translation tooltips.
 * Used for:
 * - Speech bubbles
 * - Poems and writing
 * - In-game books/scrolls
 * - Agent dialogue
 *
 * Provides alien words with hover-for-translation data.
 */

import type { LanguageComponent } from './LanguageComponent.js';
import { getWordFromLanguage } from './LanguageComponent.js';
import { VocabularyInitializationService } from './VocabularyInitializationService.js';
import { TraceryGrammarBuilder } from './TraceryGrammarBuilder.js';
import type { LLMProvider } from '@ai-village/llm';

/**
 * Word token with translation data
 */
export interface AlienWordToken {
  /**
   * Alien word text
   */
  alien: string;

  /**
   * English translation
   */
  english: string;

  /**
   * Word type (noun, verb, adjective, etc.)
   */
  wordType?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'particle';

  /**
   * Optional context for tooltip
   */
  context?: string;
}

/**
 * Rendered alien text with translation data
 */
export interface RenderedAlienText {
  /**
   * Full alien text (space-separated)
   */
  fullText: string;

  /**
   * Word tokens with translations
   */
  tokens: AlienWordToken[];

  /**
   * Full English translation
   */
  translation: string;

  /**
   * Language ID
   */
  languageId: string;
}

/**
 * Options for rendering alien text
 */
export interface RenderOptions {
  /**
   * Add word separators (hyphens, spaces, etc.)
   * @default true
   */
  addSeparators?: boolean;

  /**
   * Separator character
   * @default ' '
   */
  separator?: string;

  /**
   * Include context hints in tooltips
   * @default true
   */
  includeContext?: boolean;

  /**
   * Generate new words for unknown concepts
   * If false, returns '[unknown]' for missing words
   * @default false
   */
  generateUnknown?: boolean;
}

/**
 * Alien Text Renderer
 *
 * Converts English concepts to alien words with translation data.
 * Perfect for UI display with hover tooltips.
 */
export class AlienTextRenderer {
  private vocabularyService: VocabularyInitializationService;
  private grammarBuilder: TraceryGrammarBuilder;

  constructor(llmProvider: LLMProvider) {
    this.vocabularyService = new VocabularyInitializationService(llmProvider);
    this.grammarBuilder = new TraceryGrammarBuilder();
  }

  /**
   * Render a sentence with alien words
   *
   * @param concepts - Array of English concepts to translate
   * @param languageComponent - Language to use
   * @param options - Rendering options
   * @returns Rendered alien text with translation data
   *
   * @example
   * ```typescript
   * const result = await renderer.renderSentence(
   *   ['red', 'fire', 'burn'],
   *   languageComponent
   * );
   * // result.fullText: "kräd xak zür"
   * // result.tokens: [
   * //   { alien: 'kräd', english: 'red', wordType: 'adjective' },
   * //   { alien: 'xak', english: 'fire', wordType: 'noun' },
   * //   { alien: 'zür', english: 'burn', wordType: 'verb' }
   * // ]
   * ```
   */
  async renderSentence(
    concepts: string[],
    languageComponent: LanguageComponent,
    options: RenderOptions = {}
  ): Promise<RenderedAlienText> {
    const {
      addSeparators = true,
      separator = ' ',
      includeContext = true,
      generateUnknown = false,
    } = options;

    const tokens: AlienWordToken[] = [];

    for (const concept of concepts) {
      // Try to get existing word from vocabulary
      let alienWord = this.vocabularyService.getAlienWord(languageComponent, concept);

      // Get word data from language component
      const wordData = getWordFromLanguage(languageComponent, concept);

      if (!alienWord && generateUnknown) {
        // Generate new word on-the-fly
        const grammar = this.grammarBuilder.buildGrammar(languageComponent.languageConfig);
        alienWord = this.grammarBuilder.generateWord(grammar);
      }

      tokens.push({
        alien: alienWord || '[unknown]',
        english: concept,
        wordType: wordData?.wordType as 'noun' | 'verb' | 'adjective' | 'adverb' | 'particle' | undefined,
        context: includeContext ? this.getWordContext(concept) : undefined,
      });
    }

    const fullText = addSeparators
      ? tokens.map((t) => t.alien).join(separator)
      : tokens.map((t) => t.alien).join('');

    const translation = concepts.join(' ');

    return {
      fullText,
      tokens,
      translation,
      languageId: languageComponent.languageId,
    };
  }

  /**
   * Render a single word
   *
   * @param concept - English concept
   * @param languageComponent - Language to use
   * @param options - Rendering options
   * @returns Single word token
   *
   * @example
   * ```typescript
   * const word = await renderer.renderWord('fire', languageComponent);
   * // { alien: 'xak', english: 'fire', wordType: 'noun' }
   * ```
   */
  async renderWord(
    concept: string,
    languageComponent: LanguageComponent,
    options: RenderOptions = {}
  ): Promise<AlienWordToken> {
    const result = await this.renderSentence([concept], languageComponent, options);
    return result.tokens[0]!;
  }

  /**
   * Render a poem with line-by-line translations
   *
   * @param lines - Array of concept arrays (one per line)
   * @param languageComponent - Language to use
   * @param options - Rendering options
   * @returns Array of rendered lines
   *
   * @example
   * ```typescript
   * const poem = await renderer.renderPoem(
   *   [
   *     ['red', 'fire', 'burn'],
   *     ['blue', 'water', 'flow'],
   *     ['strong', 'mountain', 'stand']
   *   ],
   *   languageComponent
   * );
   * // [
   * //   { fullText: 'kräd xak zür', translation: 'red fire burn', ... },
   * //   { fullText: 'blü wät flö', translation: 'blue water flow', ... },
   * //   { fullText: 'strä mäg städ', translation: 'strong mountain stand', ... }
   * // ]
   * ```
   */
  async renderPoem(
    lines: string[][],
    languageComponent: LanguageComponent,
    options: RenderOptions = {}
  ): Promise<RenderedAlienText[]> {
    const rendered: RenderedAlienText[] = [];

    for (const line of lines) {
      const renderedLine = await this.renderSentence(line, languageComponent, options);
      rendered.push(renderedLine);
    }

    return rendered;
  }

  /**
   * Get context hint for a concept (used in tooltips)
   *
   * @param concept - English concept
   * @returns Context description
   */
  private getWordContext(concept: string): string {
    // Simple heuristic for common words
    const contexts: Record<string, string> = {
      fire: 'natural element',
      water: 'natural element',
      earth: 'natural element',
      air: 'natural element',
      strong: 'quality',
      weak: 'quality',
      red: 'color',
      blue: 'color',
      walk: 'action',
      run: 'action',
      fly: 'action',
      clan: 'social group',
      warrior: 'role',
      chief: 'role',
    };

    return contexts[concept] || '';
  }

  /**
   * Render rich text with inline translations
   *
   * Useful for mixing alien words into English sentences.
   *
   * @param template - Template string with {concept} placeholders
   * @param languageComponent - Language to use
   * @param options - Rendering options
   * @returns Rendered text with token mapping
   *
   * @example
   * ```typescript
   * const result = await renderer.renderRichText(
   *   'The {warrior} stood by the {fire}.',
   *   languageComponent
   * );
   * // {
   * //   fullText: 'The kräd stood by the xak.',
   * //   tokens: Map { 'warrior' => {...}, 'fire' => {...} }
   * // }
   * ```
   */
  async renderRichText(
    template: string,
    languageComponent: LanguageComponent,
    options: RenderOptions = {}
  ): Promise<{
    fullText: string;
    tokens: Map<string, AlienWordToken>;
  }> {
    const conceptPattern = /\{([^}]+)\}/g;
    const concepts: string[] = [];
    let match: RegExpExecArray | null;

    // Extract all concepts from template
    while ((match = conceptPattern.exec(template)) !== null) {
      concepts.push(match[1]!);
    }

    // Render each concept
    const tokens = new Map<string, AlienWordToken>();
    for (const concept of concepts) {
      const token = await this.renderWord(concept, languageComponent, options);
      tokens.set(concept, token);
    }

    // Replace placeholders with alien words
    const fullText = template.replace(conceptPattern, (match, concept) => {
      return tokens.get(concept)?.alien || match;
    });

    return { fullText, tokens };
  }

  /**
   * Get rendering data for existing alien text
   *
   * Useful when you have pre-generated alien text and need to add tooltips.
   *
   * @param alienText - Alien text string
   * @param languageComponent - Language component
   * @returns Rendering data with best-guess translations
   */
  getRenderingData(
    alienText: string,
    languageComponent: LanguageComponent
  ): RenderedAlienText {
    // Split into words
    const alienWords = alienText.split(/[\s-]+/);

    // Try to find translations (reverse lookup)
    const tokens: AlienWordToken[] = alienWords.map((alienWord) => {
      // Look for matching word in vocabulary
      for (const [concept, wordData] of languageComponent.knownWords) {
        if (wordData.word === alienWord) {
          return {
            alien: alienWord,
            english: concept,
            wordType: wordData.wordType as 'noun' | 'verb' | 'adjective' | 'adverb' | 'particle' | undefined,
          };
        }
      }

      // No translation found
      return {
        alien: alienWord,
        english: '[unknown]',
      };
    });

    return {
      fullText: alienText,
      tokens,
      translation: tokens
        .map((t) => t.english)
        .filter((e) => e !== '[unknown]')
        .join(' '),
      languageId: languageComponent.languageId,
    };
  }
}
