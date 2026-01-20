/**
 * Language Communication Tests (Phase 3)
 *
 * Tests the complete communication pipeline:
 * - LanguageComponent (language assignment)
 * - LanguageKnowledgeComponent (proficiency tracking)
 * - LanguageCommunicationService (translation & comprehension)
 * - Vocabulary learning
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageGenerator } from '../LanguageGenerator.js';
import {
  createLanguageComponent,
  addWordToLanguage,
  getWordFromLanguage,
  hasWordInLanguage,
  getVocabularySize,
  incrementSpeakerCount,
  decrementSpeakerCount,
  isLanguageActive,
} from '../LanguageComponent.js';
import {
  createLanguageKnowledgeComponent,
  getProficiency,
  knowsLanguage,
  isNativeLanguage,
  startLearningLanguage,
  recordWordExposure,
  updateProficiency,
  getProficiencyLevelName,
} from '../LanguageKnowledgeComponent.js';
import { LanguageCommunicationService } from '../LanguageCommunicationService.js';
import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from '@ai-village/llm';
import type { TranslationResponse } from '../TranslationService.js';

/**
 * Mock LLM Provider for testing
 */
class MockLLMProvider implements LLMProvider {
  private mockCounter = 0;

  async generate(request: LLMRequest): Promise<LLMResponse> {
    this.mockCounter++;

    // Extract word from prompt
    const wordMatch = request.prompt.match(/\*\*Word\*\*: "([^"]+)"/);
    const word = wordMatch?.[1] || `word${this.mockCounter}`;

    const response: TranslationResponse = {
      word,
      translation: `translation-${this.mockCounter}`,
      wordType: 'noun',
      morphemes: [
        { sound: word.slice(0, 2), meaning: `meaning-${this.mockCounter}`, type: 'root' },
      ],
      confidence: 0.85,
    };

    return {
      text: JSON.stringify(response),
      inputTokens: 100,
      outputTokens: 50,
      costUSD: 0.0001,
    };
  }

  getModelName(): string {
    return 'mock-model';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getPricing(): ProviderPricing {
    return {
      providerId: 'mock',
      providerName: 'Mock Provider',
      inputCostPer1M: 0,
      outputCostPer1M: 0,
    };
  }

  getProviderId(): string {
    return 'mock';
  }
}

describe('LanguageComponent Tests', () => {
  let languageGenerator: LanguageGenerator;

  beforeEach(() => {
    languageGenerator = new LanguageGenerator();
  });

  it('should create a language component', () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'volcanic', seed: 'test1' },
      { type: 'insectoid' },
      'lang_test_1'
    );

    const component = createLanguageComponent('lang_test_1', languageConfig);

    expect(component.type).toBe('language');
    expect(component.languageId).toBe('lang_test_1');
    expect(component.languageConfig).toBe(languageConfig);
    expect(component.speakerCount).toBe(0);
    expect(component.isCommon).toBe(false);
    expect(component.isExtinct).toBe(false);
  });

  it('should track word dictionary', () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'ocean', seed: 'test2' },
      { type: 'aquatic' },
      'lang_test_2'
    );

    const component = createLanguageComponent('lang_test_2', languageConfig);

    // Add word
    addWordToLanguage(component, 'fire', {
      word: 'xak',
      translation: 'fire',
      wordType: 'noun',
      morphemes: [{ sound: 'xak', meaning: 'fire', type: 'root' }],
      confidence: 0.9,
      timestamp: Date.now(),
    });

    expect(hasWordInLanguage(component, 'fire')).toBe(true);
    expect(getVocabularySize(component)).toBe(1);

    const word = getWordFromLanguage(component, 'fire');
    expect(word).toBeDefined();
    expect(word?.word).toBe('xak');
    expect(word?.translation).toBe('fire');
  });

  it('should track speaker count and extinction', () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'desert', seed: 'test3' },
      { type: 'reptilian' },
      'lang_test_3'
    );

    const component = createLanguageComponent('lang_test_3', languageConfig);

    expect(isLanguageActive(component)).toBe(false);

    incrementSpeakerCount(component);
    expect(component.speakerCount).toBe(1);
    expect(isLanguageActive(component)).toBe(true);

    incrementSpeakerCount(component);
    expect(component.speakerCount).toBe(2);

    decrementSpeakerCount(component);
    expect(component.speakerCount).toBe(1);
    expect(component.isExtinct).toBe(false);

    decrementSpeakerCount(component);
    expect(component.speakerCount).toBe(0);
    expect(component.isExtinct).toBe(true);
    expect(isLanguageActive(component)).toBe(false);
  });
});

describe('LanguageKnowledgeComponent Tests', () => {
  it('should create knowledge component with native language', () => {
    const component = createLanguageKnowledgeComponent(['lang_native_1']);

    expect(component.type).toBe('language_knowledge');
    expect(component.nativeLanguages).toEqual(['lang_native_1']);
    expect(isNativeLanguage(component, 'lang_native_1')).toBe(true);
    expect(getProficiency(component, 'lang_native_1')).toBe(1.0);
  });

  it('should track proficiency levels', () => {
    const component = createLanguageKnowledgeComponent(['lang_native']);

    // Unknown language
    expect(getProficiency(component, 'lang_foreign')).toBe(0);
    expect(knowsLanguage(component, 'lang_foreign')).toBe(false);

    // Start learning
    startLearningLanguage(component, 'lang_foreign', 0);
    expect(knowsLanguage(component, 'lang_foreign')).toBe(true);
    expect(getProficiency(component, 'lang_foreign')).toBe(0);

    // Simulate learning 300 words
    const prof = component.knownLanguages.get('lang_foreign')!;
    prof.wordsKnown = 300;
    updateProficiency(component, 'lang_foreign');

    expect(getProficiency(component, 'lang_foreign')).toBe(0.3);
    expect(getProficiencyLevelName(0.3)).toBe('Intermediate');
  });

  it('should track vocabulary learning from exposure', () => {
    const component = createLanguageKnowledgeComponent(['lang_native']);

    // First exposure
    recordWordExposure(component, 'lang_foreign', 'xak', 'context1', 100);

    const prof = component.knownLanguages.get('lang_foreign')!;
    const wordData = prof.vocabularyLearning.get('xak')!;

    expect(wordData.exposureCount).toBe(1);
    expect(wordData.confidence).toBeGreaterThan(0);
    expect(wordData.confidence).toBeLessThan(0.35); // Low-ish confidence at first exposure

    // More exposures
    recordWordExposure(component, 'lang_foreign', 'xak', 'context2', 200);
    recordWordExposure(component, 'lang_foreign', 'xak', 'context3', 300);
    recordWordExposure(component, 'lang_foreign', 'xak', 'context4', 400);
    recordWordExposure(component, 'lang_foreign', 'xak', 'context5', 500);

    expect(wordData.exposureCount).toBe(5);
    expect(wordData.confidence).toBeGreaterThan(0.6); // Higher confidence
    expect(prof.wordsKnown).toBe(1); // Counted as learned
  });

  it('should calculate correct proficiency levels', () => {
    expect(getProficiencyLevelName(0.0)).toBe('None');
    expect(getProficiencyLevelName(0.05)).toBe('None');
    expect(getProficiencyLevelName(0.15)).toBe('Beginner');
    expect(getProficiencyLevelName(0.4)).toBe('Intermediate');
    expect(getProficiencyLevelName(0.7)).toBe('Advanced');
    expect(getProficiencyLevelName(0.95)).toBe('Native');
  });
});

describe('LanguageCommunicationService Tests', () => {
  let mockProvider: MockLLMProvider;
  let communicationService: LanguageCommunicationService;
  let languageGenerator: LanguageGenerator;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    communicationService = new LanguageCommunicationService(mockProvider);
    languageGenerator = new LanguageGenerator();
  });

  it('should generate alien phrase for a concept', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'volcanic', seed: 'comm_test_1' },
      { type: 'insectoid' },
      'comm_lang_1'
    );

    const component = createLanguageComponent('comm_lang_1', languageConfig);

    const phrase = await communicationService.generateAlienPhrase('fire', component, 0);

    expect(phrase.concept).toBe('fire');
    expect(phrase.alienWords.length).toBeGreaterThan(0);
    expect(phrase.fullPhrase).toBeDefined();
    expect(phrase.wordBreakdown.length).toBeGreaterThan(0);

    // Should be cached in language component
    expect(hasWordInLanguage(component, 'fire')).toBe(true);
  });

  it('should reuse cached translations', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'ocean', seed: 'comm_test_2' },
      { type: 'aquatic' },
      'comm_lang_2'
    );

    const component = createLanguageComponent('comm_lang_2', languageConfig);

    // First call - generates new
    const phrase1 = await communicationService.generateAlienPhrase('water', component, 0);

    // Second call - should reuse
    const phrase2 = await communicationService.generateAlienPhrase('water', component, 100);

    expect(phrase1.fullPhrase).toBe(phrase2.fullPhrase);
    expect(phrase1.alienWords).toEqual(phrase2.alienWords);
  });

  it('should handle native speaker comprehension', () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'forest', seed: 'comm_test_3' },
      { type: 'avian' },
      'comm_lang_3'
    );

    const languageComponent = createLanguageComponent('comm_lang_3', languageConfig);
    const knowledge = createLanguageKnowledgeComponent(['comm_lang_3']);

    // Add word to dictionary
    addWordToLanguage(languageComponent, 'tree', {
      word: 'trel',
      translation: 'tree',
      wordType: 'noun',
      morphemes: [{ sound: 'trel', meaning: 'tree', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    const translated = communicationService.translateMessage(
      'trel',
      languageComponent,
      knowledge,
      100
    );

    expect(translated.comprehension).toBe(1.0);
    expect(translated.translated).toBe('tree');
    expect(translated.unknownWords.length).toBe(0);
  });

  it('should handle zero comprehension for unknown language', () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'arctic', seed: 'comm_test_4' },
      { type: 'humanoid' },
      'comm_lang_4'
    );

    const languageComponent = createLanguageComponent('comm_lang_4', languageConfig);
    const knowledge = createLanguageKnowledgeComponent(['different_lang']);

    const translated = communicationService.translateMessage(
      'unknown alien text',
      languageComponent,
      knowledge,
      100
    );

    expect(translated.comprehension).toBe(0);
    expect(translated.translated).toBe('[incomprehensible alien sounds]');
  });

  it('should format messages based on comprehension', () => {
    const fullComprehension = {
      original: 'xak',
      translated: 'fire',
      comprehension: 1.0,
      unknownWords: [],
    };

    const partialComprehension = {
      original: 'xak zuri',
      translated: 'fire need',
      comprehension: 0.5,
      unknownWords: ['zuri'],
      partialTranslation: 'fire ???',
    };

    const noComprehension = {
      original: 'khazi-do',
      translated: '[incomprehensible alien sounds]',
      comprehension: 0.0,
      unknownWords: ['khazi-do'],
    };

    expect(communicationService.formatMessageForDisplay(fullComprehension)).toBe('fire');
    expect(communicationService.formatMessageForDisplay(partialComprehension)).toContain('50%');
    expect(communicationService.formatMessageForDisplay(noComprehension)).toContain('incomprehensible');
  });

  it('should calculate comprehension percentage', () => {
    expect(communicationService.getComprehensionPercentage(1.0)).toBe(100);
    expect(communicationService.getComprehensionPercentage(0.75)).toBe(75);
    expect(communicationService.getComprehensionPercentage(0.5)).toBe(50);
    expect(communicationService.getComprehensionPercentage(0.0)).toBe(0);
  });
});

describe('End-to-End Communication Tests', () => {
  let mockProvider: MockLLMProvider;
  let communicationService: LanguageCommunicationService;
  let languageGenerator: LanguageGenerator;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    communicationService = new LanguageCommunicationService(mockProvider);
    languageGenerator = new LanguageGenerator();
  });

  it('should handle full conversation with language barrier', async () => {
    // Agent A speaks volcanic insectoid language
    const languageA = languageGenerator.generateLanguage(
      { type: 'volcanic', seed: 'e2e_1' },
      { type: 'insectoid' },
      'e2e_lang_a'
    );

    const componentA = createLanguageComponent('e2e_lang_a', languageA);
    const knowledgeA = createLanguageKnowledgeComponent(['e2e_lang_a']);

    // Agent B speaks ocean aquatic language (doesn't know A's language)
    const languageB = languageGenerator.generateLanguage(
      { type: 'ocean', seed: 'e2e_2' },
      { type: 'aquatic' },
      'e2e_lang_b'
    );

    const knowledgeB = createLanguageKnowledgeComponent(['e2e_lang_b']);

    // Agent A says "fire" in their language
    const phrase = await communicationService.generateAlienPhrase('fire', componentA, 0);

    // Agent B tries to understand
    const translated = communicationService.translateMessage(
      phrase.fullPhrase,
      componentA,
      knowledgeB,
      100
    );

    // Should have zero comprehension
    expect(translated.comprehension).toBe(0);
    expect(translated.unknownWords.length).toBeGreaterThan(0);

    // Agent B starts learning (language is now being tracked, but proficiency still 0)
    expect(knowsLanguage(knowledgeB, 'e2e_lang_a')).toBe(true);
    expect(getProficiency(knowledgeB, 'e2e_lang_a')).toBe(0); // No proficiency yet, needs more exposure
  });

  it('should track learning progression over multiple exposures', () => {
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);

    // Expose agent to same word multiple times
    for (let i = 0; i < 10; i++) {
      recordWordExposure(knowledge, 'foreign_lang', 'xak', `context_${i}`, i);
    }

    const prof = knowledge.knownLanguages.get('foreign_lang')!;
    const wordData = prof.vocabularyLearning.get('xak')!;

    expect(wordData.exposureCount).toBe(10);
    expect(wordData.confidence).toBeGreaterThan(0.9); // High confidence after 10 exposures
    expect(prof.wordsKnown).toBeGreaterThan(0);
  });
});
