/**
 * SpeechToAlienTokens - Convert agent speech to alien text tokens with translations
 *
 * This service bridges the conversation system and the UI by converting
 * speech text into alien word tokens that can be displayed with hover tooltips.
 */

import type { World, Entity } from '@ai-village/core';
import {
  type AlienWordToken,
  type LanguageRegistry,
  type LanguageComponent,
  type LanguageKnowledgeComponent,
} from '@ai-village/language';

export class SpeechToAlienTokensService {
  private languageRegistry: LanguageRegistry | null = null;

  constructor() {
    // No-op constructor - we don't use AlienTextRenderer anymore
  }

  /**
   * Set the language registry for looking up language entities
   */
  setLanguageRegistry(registry: LanguageRegistry): void {
    this.languageRegistry = registry;
  }

  /**
   * Convert speech text to alien tokens for a specific agent
   *
   * @param speakerId - Entity ID of the speaker
   * @param text - Original speech text (may be alien or English)
   * @param world - World instance to query components
   * @returns Array of alien word tokens, or null if no language/translation available
   */
  convertSpeechToTokens(
    speakerId: string,
    text: string,
    world: World
  ): AlienWordToken[] | null {
    if (!this.languageRegistry) {
      return null; // No language system available
    }

    try {
      // Get speaker entity
      const speaker = world.getEntity(speakerId);
      if (!speaker) return null;

      // Get speaker's language knowledge
      const knowledge = speaker.getComponent('language_knowledge') as LanguageKnowledgeComponent | undefined;
      if (!knowledge || !knowledge.nativeLanguages || knowledge.nativeLanguages.length === 0) {
        return null; // Speaker has no native language
      }

      const nativeLanguageId = knowledge.nativeLanguages[0];

      // Get language component from registry
      const languageEntity = this.languageRegistry.getLanguage(nativeLanguageId);
      if (!languageEntity) {
        return null; // Language not found
      }

      // Check if text contains alien words (if so, it's already translated)
      const hasAlienWords = this.containsAlienWords(text, languageEntity);

      if (!hasAlienWords) {
        // Text is in English, no alien translation to show
        return null;
      }

      // Convert alien text to tokens with English translations
      const tokens = this.renderer.renderSentenceWithTooltips(text, languageEntity);

      return tokens.length > 0 ? tokens : null;
    } catch (error) {
      console.error('[SpeechToAlienTokens] Error converting speech:', error);
      return null;
    }
  }

  /**
   * Check if text contains alien words from the given language
   */
  private containsAlienWords(text: string, language: LanguageComponent): boolean {
    const words = text.toLowerCase().split(/\s+/);

    // Check if any word matches an alien word in the vocabulary
    for (const [concept, wordData] of language.knownWords) {
      const alienWord = wordData.word.toLowerCase();
      if (words.includes(alienWord)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Batch convert multiple speech messages to tokens
   *
   * Useful for rendering conversation histories
   */
  convertMultipleSpeech(
    speeches: Array<{ speakerId: string; text: string }>,
    world: World
  ): Map<string, AlienWordToken[] | null> {
    const results = new Map<string, AlienWordToken[] | null>();

    for (const speech of speeches) {
      const key = `${speech.speakerId}:${speech.text}`;
      const tokens = this.convertSpeechToTokens(speech.speakerId, speech.text, world);
      results.set(key, tokens);
    }

    return results;
  }
}

/**
 * Singleton instance for use across the renderer
 */
let instance: SpeechToAlienTokensService | null = null;

export function getSpeechToAlienTokensService(): SpeechToAlienTokensService {
  if (!instance) {
    instance = new SpeechToAlienTokensService();
  }
  return instance;
}
