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
      if (!nativeLanguageId) {
        return null; // No native language
      }

      // Get language component from registry
      const languageEntity = this.languageRegistry.getLanguage(nativeLanguageId);
      if (!languageEntity) {
        return null; // Language not found
      }

      // Parse text to find alien words and create tokens
      const tokens = this.parseAlienText(text, languageEntity.component);

      return tokens.length > 0 ? tokens : null;
    } catch (error) {
      console.error('[SpeechToAlienTokens] Error converting speech:', error);
      return null;
    }
  }

  /**
   * Parse alien text to create tokens with English translations
   *
   * This method tokenizes the text and looks up each word in the language vocabulary.
   * Words found in the vocabulary become alien tokens with translations.
   * Punctuation and unknown words are preserved as plain text.
   */
  private parseAlienText(text: string, language: LanguageComponent): AlienWordToken[] {
    const tokens: AlienWordToken[] = [];

    // Build a reverse lookup map: alien word -> (english concept, wordData)
    const alienToEnglishMap = new Map<string, { concept: string; wordType?: string }>();
    for (const [concept, wordData] of language.knownWords) {
      const alienWord = wordData.word.toLowerCase();
      alienToEnglishMap.set(alienWord, {
        concept,
        wordType: wordData.wordType,
      });
    }

    // Split text into words and punctuation
    const parts = text.split(/(\s+|[.,!?;:])/);

    for (const part of parts) {
      if (!part) continue;

      // Check if it's whitespace or punctuation
      if (/^\s+$/.test(part) || /^[.,!?;:]$/.test(part)) {
        // Skip whitespace (we'll add it implicitly)
        // Punctuation is also skipped for simplicity
        continue;
      }

      // Look up the word in the alien vocabulary
      const lowerPart = part.toLowerCase();
      const translation = alienToEnglishMap.get(lowerPart);

      if (translation) {
        // Found alien word - create token with translation
        tokens.push({
          alien: part,
          english: translation.concept,
          wordType: translation.wordType as any,
        });
      }
      // If no translation found, we skip it (it's likely English text)
      // The UI will only show alien words with tooltips
    }

    return tokens;
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
