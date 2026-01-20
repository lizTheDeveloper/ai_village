/**
 * Post-Hoc Translation Tests (Phase 6)
 *
 * Tests the new post-hoc translation architecture:
 * - LLMs think in English
 * - Translation happens AFTER LLM generation
 * - Language barriers work correctly
 * - Proficiency-based message delivery
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageGenerator } from '../LanguageGenerator.js';
import {
  createLanguageComponent,
  addWordToLanguage,
} from '../LanguageComponent.js';
import {
  createLanguageKnowledgeComponent,
  getProficiency,
  setWordMeaning,
  startLearningLanguage,
  recordWordExposure,
} from '../LanguageKnowledgeComponent.js';
import { LanguageCommunicationService } from '../LanguageCommunicationService.js';
import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from '@ai-village/llm';

/**
 * Mock LLM Provider for testing
 */
class MockLLMProvider implements LLMProvider {
  async generate(request: LLMRequest): Promise<LLMResponse> {
    return {
      text: 'mock response',
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

describe('Post-Hoc Translation: translateEnglishToAlien()', () => {
  let mockProvider: MockLLMProvider;
  let communicationService: LanguageCommunicationService;
  let languageGenerator: LanguageGenerator;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    communicationService = new LanguageCommunicationService(mockProvider);
    languageGenerator = new LanguageGenerator();
  });

  it('should replace known English words with alien words', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'volcanic', seed: 'posthoc_1' },
      { type: 'insectoid' },
      'posthoc_lang_1'
    );

    const component = createLanguageComponent('posthoc_lang_1', languageConfig);

    // Add known words
    addWordToLanguage(component, 'fire', {
      word: 'xak',
      translation: 'fire',
      wordType: 'noun',
      morphemes: [{ sound: 'xak', meaning: 'fire', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    addWordToLanguage(component, 'chief', {
      word: 'kräm',
      translation: 'chief',
      wordType: 'noun',
      morphemes: [{ sound: 'kräm', meaning: 'chief', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    const english = 'Honored chief, the fire festival begins at dusk.';
    const alien = await communicationService.translateEnglishToAlien(english, component);

    expect(alien).toContain('xak'); // 'fire' replaced
    expect(alien).toContain('kräm'); // 'chief' replaced
    expect(alien).toContain('Honored'); // Unknown words stay English
    expect(alien).toContain('festival');
    expect(alien).toContain('dusk');
  });

  it('should handle whole-word matching only (not substrings)', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'ocean', seed: 'posthoc_2' },
      { type: 'aquatic' },
      'posthoc_lang_2'
    );

    const component = createLanguageComponent('posthoc_lang_2', languageConfig);

    addWordToLanguage(component, 'fire', {
      word: 'xak',
      translation: 'fire',
      wordType: 'noun',
      morphemes: [{ sound: 'xak', meaning: 'fire', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    const english = 'The firefly lit a fire.';
    const alien = await communicationService.translateEnglishToAlien(english, component);

    // 'firefly' should NOT be replaced (it's a compound word)
    expect(alien).toContain('firefly');
    // But standalone 'fire' should be replaced
    expect(alien).toContain('xak');
  });

  it('should be case-insensitive', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'forest', seed: 'posthoc_3' },
      { type: 'avian' },
      'posthoc_lang_3'
    );

    const component = createLanguageComponent('posthoc_lang_3', languageConfig);

    addWordToLanguage(component, 'fire', {
      word: 'xak',
      translation: 'fire',
      wordType: 'noun',
      morphemes: [{ sound: 'xak', meaning: 'fire', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    const english1 = 'The Fire burns.';
    const english2 = 'FIRE is hot.';

    const alien1 = await communicationService.translateEnglishToAlien(english1, component);
    const alien2 = await communicationService.translateEnglishToAlien(english2, component);

    expect(alien1).toContain('xak');
    expect(alien2).toContain('xak');
  });

  it('should return original text if no known words', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'desert', seed: 'posthoc_4' },
      { type: 'reptilian' },
      'posthoc_lang_4'
    );

    const component = createLanguageComponent('posthoc_lang_4', languageConfig);

    const english = 'This is completely in English.';
    const alien = await communicationService.translateEnglishToAlien(english, component);

    expect(alien).toBe(english);
  });

  it('should handle multiple occurrences of same word', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'arctic', seed: 'posthoc_5' },
      { type: 'humanoid' },
      'posthoc_lang_5'
    );

    const component = createLanguageComponent('posthoc_lang_5', languageConfig);

    addWordToLanguage(component, 'fire', {
      word: 'xak',
      translation: 'fire',
      wordType: 'noun',
      morphemes: [{ sound: 'xak', meaning: 'fire', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    const english = 'Fire is hot. Fire burns. The fire spreads.';
    const alien = await communicationService.translateEnglishToAlien(english, component);

    // Count occurrences
    const matches = alien.match(/xak/gi);
    expect(matches).toBeDefined();
    expect(matches!.length).toBe(3); // All three 'fire' instances replaced
  });
});

describe('Post-Hoc Translation: prepareMessageForListener()', () => {
  let mockProvider: MockLLMProvider;
  let communicationService: LanguageCommunicationService;
  let languageGenerator: LanguageGenerator;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    communicationService = new LanguageCommunicationService(mockProvider);
    languageGenerator = new LanguageGenerator();
  });

  it('should return English for fluent speakers (proficiency >= 0.9)', () => {
    const knowledge = createLanguageKnowledgeComponent(['test_lang']);

    const originalEnglish = 'The fire burns bright';
    const alienText = 'The xak burns grü';

    const message = communicationService.prepareMessageForListener(
      originalEnglish,
      alienText,
      'test_lang',
      knowledge,
      100
    );

    expect(message).toBe(originalEnglish);
    expect(getProficiency(knowledge, 'test_lang')).toBeGreaterThanOrEqual(0.9);
  });

  it('should return alien text for non-speakers (proficiency < 0.1)', () => {
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);

    const originalEnglish = 'The fire burns bright';
    const alienText = 'The xak burns grü';

    const message = communicationService.prepareMessageForListener(
      originalEnglish,
      alienText,
      'foreign_lang',
      knowledge,
      100
    );

    expect(message).toBe(alienText);
    expect(getProficiency(knowledge, 'foreign_lang')).toBeLessThan(0.1);
  });

  it('should return mixed translation for intermediate speakers', () => {
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);

    // Start learning the language
    startLearningLanguage(knowledge, 'foreign_lang', 100);

    // Record word exposure first (required before setWordMeaning)
    recordWordExposure(knowledge, 'foreign_lang', 'kräm', 'test context', 100);
    // Then set the meaning
    setWordMeaning(knowledge, 'foreign_lang', 'kräm', 'chief');

    // Set proficiency to intermediate range (AFTER recordWordExposure which calls updateProficiency)
    const prof = knowledge.knownLanguages.get('foreign_lang')!;
    prof.wordsKnown = 500; // Intermediate level
    prof.proficiency = 0.5; // Set proficiency after wordsKnown

    const originalEnglish = 'The chief greets the fire festival';
    const alienText = 'The kräm greets the xak festival';

    const message = communicationService.prepareMessageForListener(
      originalEnglish,
      alienText,
      'foreign_lang',
      knowledge,
      200
    );

    // Should contain 'chief' (known) and 'xak' (unknown)
    expect(message).toContain('chief'); // Translated back to English
    expect(message).toContain('xak'); // Stays alien (unknown)
    expect(message).not.toBe(originalEnglish); // Not full comprehension
    expect(message).not.toBe(alienText); // Not zero comprehension
  });

  it('should record word exposure for non-speakers', () => {
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);

    const originalEnglish = 'The fire burns';
    const alienText = 'The xak burns';

    communicationService.prepareMessageForListener(
      originalEnglish,
      alienText,
      'foreign_lang',
      knowledge,
      100
    );

    // Should have started tracking the language
    const prof = knowledge.knownLanguages.get('foreign_lang');
    expect(prof).toBeDefined();
  });
});

describe('Post-Hoc Translation: Partial Translation Logic', () => {
  let mockProvider: MockLLMProvider;
  let communicationService: LanguageCommunicationService;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    communicationService = new LanguageCommunicationService(mockProvider);
  });

  it('should create mixed translation with known and unknown words', () => {
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);

    // Start learning
    startLearningLanguage(knowledge, 'foreign_lang', 100);

    // Record word exposure first, then set meaning
    recordWordExposure(knowledge, 'foreign_lang', 'xak', 'test context', 100);
    setWordMeaning(knowledge, 'foreign_lang', 'xak', 'fire');

    // Set proficiency AFTER recordWordExposure
    const prof = knowledge.knownLanguages.get('foreign_lang')!;
    prof.wordsKnown = 500; // Intermediate level
    prof.proficiency = 0.5; // Intermediate

    const originalEnglish = 'The fire burns bright';
    const alienText = 'The xak burns grü';

    const message = communicationService.prepareMessageForListener(
      originalEnglish,
      alienText,
      'foreign_lang',
      knowledge,
      200
    );

    // Should translate 'xak' → 'fire' (known)
    expect(message).toContain('fire');
    // Should keep 'grü' (unknown)
    expect(message).toContain('grü');
  });

  it('should handle word count mismatch gracefully', () => {
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);

    startLearningLanguage(knowledge, 'foreign_lang', 100);
    const prof = knowledge.knownLanguages.get('foreign_lang')!;
    prof.proficiency = 0.5;

    // Different word counts
    const originalEnglish = 'Fire burns';
    const alienText = 'Xak zür grü'; // More words in alien

    const message = communicationService.prepareMessageForListener(
      originalEnglish,
      alienText,
      'foreign_lang',
      knowledge,
      200
    );

    // Should not crash
    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
  });
});

describe('Post-Hoc Translation: Language Barrier Scenarios', () => {
  let mockProvider: MockLLMProvider;
  let communicationService: LanguageCommunicationService;
  let languageGenerator: LanguageGenerator;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    communicationService = new LanguageCommunicationService(mockProvider);
    languageGenerator = new LanguageGenerator();
  });

  it('should simulate Agent A (speaker) → Agent B (non-speaker) conversation', async () => {
    // Agent A's language
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'volcanic', seed: 'barrier_1' },
      { type: 'insectoid' },
      'volcanic_lang'
    );
    const speakerLanguage = createLanguageComponent('volcanic_lang', languageConfig);

    addWordToLanguage(speakerLanguage, 'fire', {
      word: 'xak',
      translation: 'fire',
      wordType: 'noun',
      morphemes: [{ sound: 'xak', meaning: 'fire', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    addWordToLanguage(speakerLanguage, 'chief', {
      word: 'kräm',
      translation: 'chief',
      wordType: 'noun',
      morphemes: [{ sound: 'kräm', meaning: 'chief', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    // Agent A's LLM outputs English
    const llmOutput = 'Greetings, honored chief! The fire spreads toward the village!';

    // System translates to alien
    const alienText = await communicationService.translateEnglishToAlien(llmOutput, speakerLanguage);

    expect(alienText).toContain('xak');
    expect(alienText).toContain('kräm');

    // Agent B doesn't speak the language
    const listenerKnowledge = createLanguageKnowledgeComponent(['ocean_lang']);

    // Agent B's LLM sees alien gibberish
    const messageForB = communicationService.prepareMessageForListener(
      llmOutput,
      alienText,
      'volcanic_lang',
      listenerKnowledge,
      100
    );

    expect(messageForB).toBe(alienText); // Full alien text
    expect(messageForB).toContain('xak');
    expect(messageForB).toContain('kräm');
  });

  it('should simulate Agent A → Agent C (learning) conversation', async () => {
    // Agent A's language
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'volcanic', seed: 'barrier_2' },
      { type: 'insectoid' },
      'volcanic_lang_2'
    );
    const speakerLanguage = createLanguageComponent('volcanic_lang_2', languageConfig);

    addWordToLanguage(speakerLanguage, 'fire', {
      word: 'xak',
      translation: 'fire',
      wordType: 'noun',
      morphemes: [{ sound: 'xak', meaning: 'fire', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    addWordToLanguage(speakerLanguage, 'bright', {
      word: 'grü',
      translation: 'bright',
      wordType: 'adjective',
      morphemes: [{ sound: 'grü', meaning: 'bright', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    const llmOutput = 'The fire burns bright';
    const alienText = await communicationService.translateEnglishToAlien(llmOutput, speakerLanguage);

    // Agent C is learning the language
    const learnerKnowledge = createLanguageKnowledgeComponent(['native_lang']);
    startLearningLanguage(learnerKnowledge, 'volcanic_lang_2', 100);

    // Agent C knows 'xak' = 'fire' (record exposure first, then set meaning)
    recordWordExposure(learnerKnowledge, 'volcanic_lang_2', 'xak', 'test context', 150);
    setWordMeaning(learnerKnowledge, 'volcanic_lang_2', 'xak', 'fire');

    // Set proficiency AFTER recordWordExposure
    const prof = learnerKnowledge.knownLanguages.get('volcanic_lang_2')!;
    prof.wordsKnown = 400; // Intermediate level
    prof.proficiency = 0.4; // Intermediate

    const messageForC = communicationService.prepareMessageForListener(
      llmOutput,
      alienText,
      'volcanic_lang_2',
      learnerKnowledge,
      200
    );

    // Should see mixed: 'fire' (understood) + alien words (not understood)
    expect(messageForC).toContain('fire'); // Translated
    expect(messageForC).not.toBe(llmOutput); // Not full English
    expect(messageForC).not.toBe(alienText); // Not full alien
  });

  it('should simulate Agent A → Agent D (fluent) conversation', async () => {
    // Agent A's language
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'volcanic', seed: 'barrier_3' },
      { type: 'insectoid' },
      'volcanic_lang_3'
    );
    const speakerLanguage = createLanguageComponent('volcanic_lang_3', languageConfig);

    addWordToLanguage(speakerLanguage, 'fire', {
      word: 'xak',
      translation: 'fire',
      wordType: 'noun',
      morphemes: [{ sound: 'xak', meaning: 'fire', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    const llmOutput = 'The fire burns bright';
    const alienText = await communicationService.translateEnglishToAlien(llmOutput, speakerLanguage);

    // Agent D is fluent (native speaker)
    const fluentKnowledge = createLanguageKnowledgeComponent(['volcanic_lang_3']);

    const messageForD = communicationService.prepareMessageForListener(
      llmOutput,
      alienText,
      'volcanic_lang_3',
      fluentKnowledge,
      200
    );

    // Should see full English (understands everything)
    expect(messageForD).toBe(llmOutput);
    expect(messageForD).not.toContain('xak');
  });
});

describe('Post-Hoc Translation: Edge Cases', () => {
  let mockProvider: MockLLMProvider;
  let communicationService: LanguageCommunicationService;
  let languageGenerator: LanguageGenerator;

  beforeEach(() => {
    mockProvider = new MockLLMProvider();
    communicationService = new LanguageCommunicationService(mockProvider);
    languageGenerator = new LanguageGenerator();
  });

  it('should handle empty text', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'volcanic', seed: 'edge_1' },
      { type: 'insectoid' },
      'edge_lang_1'
    );
    const component = createLanguageComponent('edge_lang_1', languageConfig);

    const alien = await communicationService.translateEnglishToAlien('', component);
    expect(alien).toBe('');
  });

  it('should handle text with no spaces', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'ocean', seed: 'edge_2' },
      { type: 'aquatic' },
      'edge_lang_2'
    );
    const component = createLanguageComponent('edge_lang_2', languageConfig);

    addWordToLanguage(component, 'fire', {
      word: 'xak',
      translation: 'fire',
      wordType: 'noun',
      morphemes: [{ sound: 'xak', meaning: 'fire', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    const alien = await communicationService.translateEnglishToAlien('NoSpacesHere', component);
    expect(alien).toBe('NoSpacesHere'); // Should not crash
  });

  it('should handle special characters', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'forest', seed: 'edge_3' },
      { type: 'avian' },
      'edge_lang_3'
    );
    const component = createLanguageComponent('edge_lang_3', languageConfig);

    addWordToLanguage(component, 'fire', {
      word: 'xak',
      translation: 'fire',
      wordType: 'noun',
      morphemes: [{ sound: 'xak', meaning: 'fire', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    const english = 'The fire! It burns... (very hot).';
    const alien = await communicationService.translateEnglishToAlien(english, component);

    expect(alien).toContain('xak');
    expect(alien).toContain('!');
    expect(alien).toContain('...');
    expect(alien).toContain('(');
  });

  it('should handle regex special characters in word replacement', async () => {
    const languageConfig = languageGenerator.generateLanguage(
      { type: 'desert', seed: 'edge_4' },
      { type: 'reptilian' },
      'edge_lang_4'
    );
    const component = createLanguageComponent('edge_lang_4', languageConfig);

    // Add word with regex special chars (unlikely but should not crash)
    addWordToLanguage(component, 'fire.', {
      word: 'xak',
      translation: 'fire.',
      wordType: 'noun',
      morphemes: [{ sound: 'xak', meaning: 'fire', type: 'root' }],
      confidence: 1.0,
      timestamp: 0,
    });

    const english = 'The fire. burns';
    const alien = await communicationService.translateEnglishToAlien(english, component);

    // Should not crash
    expect(alien).toBeDefined();
  });
});
