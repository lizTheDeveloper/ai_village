/**
 * Language System Tests
 *
 * Tests the ECS system for managing language learning and proficiency.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LanguageSystem, type LanguageSystemOptions } from '../LanguageSystem.js';
import { LanguageRegistry } from '../LanguageRegistry.js';
import { LanguageCommunicationService } from '../LanguageCommunicationService.js';
import {
  createLanguageKnowledgeComponent,
  startLearningLanguage,
  recordWordExposure,
  markLanguageUsed,
  type LanguageKnowledgeComponent,
} from '../LanguageKnowledgeComponent.js';
import type { LLMProvider, LLMRequest, LLMResponse, ProviderPricing } from '@ai-village/llm';
import type { TranslationResponse } from '../TranslationService.js';
import type { World, Entity } from '@ai-village/core';

/**
 * Mock LLM Provider
 */
class MockLLMProvider implements LLMProvider {
  private counter = 0;

  async generate(request: LLMRequest): Promise<LLMResponse> {
    this.counter++;
    const response: TranslationResponse = {
      word: `word${this.counter}`,
      translation: `translation-${this.counter}`,
      wordType: 'noun',
      morphemes: [{ sound: `word${this.counter}`, meaning: 'test', type: 'root' }],
      confidence: 0.9,
    };
    return {
      text: JSON.stringify(response),
      inputTokens: 100,
      outputTokens: 50,
      costUSD: 0.0001,
    };
  }

  getModelName() {
    return 'mock';
  }
  async isAvailable() {
    return true;
  }
  getPricing(): ProviderPricing {
    return {
      providerId: 'mock',
      providerName: 'Mock',
      inputCostPer1M: 0,
      outputCostPer1M: 0,
    };
  }
  getProviderId() {
    return 'mock';
  }
}

/**
 * Mock Entity
 */
class MockEntity implements Entity {
  id: string;
  private components: Map<string, any> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  getComponent<T>(type: string): T | undefined {
    return this.components.get(type);
  }

  addComponent(component: any): void {
    this.components.set(component.type, component);
  }

  removeComponent(type: string): void {
    this.components.delete(type);
  }
}

/**
 * Mock World
 */
class MockWorld implements Partial<World> {
  tick: number = 0;
  private entities: Entity[] = [];

  addEntity(entity: Entity): void {
    this.entities.push(entity);
  }

  query() {
    return {
      with: (componentType: string) => ({
        executeEntities: () => {
          return this.entities.filter((e) => e.hasComponent(componentType));
        },
      }),
    };
  }
}

describe('LanguageSystem Tests', () => {
  let mockProvider: MockLLMProvider;
  let registry: LanguageRegistry;
  let communicationService: LanguageCommunicationService;
  let system: LanguageSystem;
  let mockWorld: MockWorld;

  beforeEach(() => {
    LanguageRegistry.resetInstance();
    mockProvider = new MockLLMProvider();
    registry = LanguageRegistry.getInstance(mockProvider);
    communicationService = new LanguageCommunicationService(mockProvider);
    system = new LanguageSystem(registry, communicationService);
    mockWorld = new MockWorld();
  });

  it('should have correct system metadata', () => {
    expect(system.id).toBe('language_system');
    expect(system.priority).toBe(850);
    expect(system.requiredComponents).toContain('language_knowledge');
    expect(system.metadata?.category).toBe('cognition');
  });

  it('should throttle updates based on updateInterval', () => {
    const entity = new MockEntity('agent1');
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);
    entity.addComponent(knowledge);
    mockWorld.addEntity(entity);

    // Track number of actual entity updates
    let updateCount = 0;
    const originalUpdate = (system as any).updateLanguageLearning.bind(system);
    (system as any).updateLanguageLearning = (...args: any[]) => {
      updateCount++;
      return originalUpdate(...args);
    };

    // First update should run
    mockWorld.tick = 0;
    system.update(mockWorld as World, [entity], 0);
    expect(updateCount).toBe(1);

    // Second update before interval should not run
    mockWorld.tick = 50;
    system.update(mockWorld as World, [entity], 0);
    expect(updateCount).toBe(1); // Still 1

    // Third update after interval should run
    mockWorld.tick = 100;
    system.update(mockWorld as World, [entity], 0);
    expect(updateCount).toBe(2);
  });

  it('should not decay native languages', () => {
    const entity = new MockEntity('agent1');
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);
    startLearningLanguage(knowledge, 'native_lang', 0);

    const nativeProf = knowledge.knownLanguages.get('native_lang')!;
    nativeProf.proficiency = 1.0;
    nativeProf.lastUsed = 0;

    entity.addComponent(knowledge);
    mockWorld.addEntity(entity);

    // Advance time far past decay threshold
    mockWorld.tick = 20000;
    system.forceUpdate(entity, mockWorld as World);

    // Native language should still be at 1.0
    expect(nativeProf.proficiency).toBe(1.0);
  });

  it('should decay unused non-native languages', () => {
    const entity = new MockEntity('agent1');
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);
    startLearningLanguage(knowledge, 'foreign_lang', 0);

    const foreignProf = knowledge.knownLanguages.get('foreign_lang')!;
    foreignProf.proficiency = 0.8;
    foreignProf.lastUsed = 0;

    entity.addComponent(knowledge);
    mockWorld.addEntity(entity);

    // Advance past decay threshold
    mockWorld.tick = 15000; // 12,000 threshold + buffer
    system.forceUpdate(entity, mockWorld as World);

    // Should have decayed
    expect(foreignProf.proficiency).toBeLessThan(0.8);
    expect(foreignProf.proficiency).toBeGreaterThan(0); // Not forgotten yet
  });

  it('should forget languages below minimum proficiency', () => {
    const entity = new MockEntity('agent1');
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);
    startLearningLanguage(knowledge, 'forgotten_lang', 0);

    const forgottenProf = knowledge.knownLanguages.get('forgotten_lang')!;
    forgottenProf.proficiency = 0.051; // Just above minimum (0.05)
    forgottenProf.lastUsed = 0;

    entity.addComponent(knowledge);
    mockWorld.addEntity(entity);

    // Advance far enough to decay below minimum
    // With decay rate of 0.999, we need multiple updates
    for (let tick = 15000; tick < 25000; tick += 100) {
      mockWorld.tick = tick;
      system.forceUpdate(entity, mockWorld as World);

      // Check if forgotten
      if (!knowledge.knownLanguages.has('forgotten_lang')) {
        break;
      }
    }

    // Language should be forgotten
    expect(knowledge.knownLanguages.has('forgotten_lang')).toBe(false);
  });

  it('should not decay recently used languages', () => {
    const entity = new MockEntity('agent1');
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);
    startLearningLanguage(knowledge, 'active_lang', 0);

    const activeProf = knowledge.knownLanguages.get('active_lang')!;
    activeProf.proficiency = 0.7;
    activeProf.lastUsed = 10000; // Recently used

    entity.addComponent(knowledge);
    mockWorld.addEntity(entity);

    // Current tick is only slightly after last use
    mockWorld.tick = 11000;
    system.forceUpdate(entity, mockWorld as World);

    // Should not have decayed (within threshold)
    expect(activeProf.proficiency).toBe(0.7);
  });

  it('should consolidate vocabulary learning into proficiency', () => {
    const entity = new MockEntity('agent1');
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);
    startLearningLanguage(knowledge, 'learning_lang', 0);

    const learningProf = knowledge.knownLanguages.get('learning_lang')!;
    learningProf.proficiency = 0.3;

    // Add high-confidence vocabulary
    recordWordExposure(knowledge, 'learning_lang', 'word1', 'context', 0);
    recordWordExposure(knowledge, 'learning_lang', 'word2', 'context', 0);
    recordWordExposure(knowledge, 'learning_lang', 'word3', 'context', 0);

    // Boost confidence artificially
    learningProf.vocabularyLearning.get('word1')!.confidence = 0.9;
    learningProf.vocabularyLearning.get('word2')!.confidence = 0.85;
    learningProf.vocabularyLearning.get('word3')!.confidence = 0.8;

    entity.addComponent(knowledge);
    mockWorld.addEntity(entity);

    mockWorld.tick = 100;
    system.forceUpdate(entity, mockWorld as World);

    // Proficiency should have increased toward mastery ratio
    expect(learningProf.proficiency).toBeGreaterThan(0.3);
  });

  it('should update words known based on vocabulary confidence', () => {
    const entity = new MockEntity('agent1');
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);
    startLearningLanguage(knowledge, 'vocab_lang', 0);

    const vocabProf = knowledge.knownLanguages.get('vocab_lang')!;

    // Add words with varying confidence
    recordWordExposure(knowledge, 'vocab_lang', 'known1', 'ctx', 0);
    recordWordExposure(knowledge, 'vocab_lang', 'known2', 'ctx', 0);
    recordWordExposure(knowledge, 'vocab_lang', 'unknown', 'ctx', 0);

    vocabProf.vocabularyLearning.get('known1')!.confidence = 0.8; // Known
    vocabProf.vocabularyLearning.get('known2')!.confidence = 0.6; // Known
    vocabProf.vocabularyLearning.get('unknown')!.confidence = 0.3; // Not known

    entity.addComponent(knowledge);
    mockWorld.addEntity(entity);

    mockWorld.tick = 100;
    system.forceUpdate(entity, mockWorld as World);

    // Should count 2 words (confidence > 0.5)
    expect(vocabProf.wordsKnown).toBe(2);
  });

  it('should update total words learned across all languages', () => {
    const entity = new MockEntity('agent1');
    // Create without native language to avoid 1000 baseline words
    const knowledge = createLanguageKnowledgeComponent([]);
    startLearningLanguage(knowledge, 'lang1', 0);
    startLearningLanguage(knowledge, 'lang2', 0);

    const lang1Prof = knowledge.knownLanguages.get('lang1')!;
    const lang2Prof = knowledge.knownLanguages.get('lang2')!;

    // Add vocabulary
    recordWordExposure(knowledge, 'lang1', 'word1', 'ctx', 0);
    recordWordExposure(knowledge, 'lang1', 'word2', 'ctx', 0);
    recordWordExposure(knowledge, 'lang2', 'word3', 'ctx', 0);

    lang1Prof.vocabularyLearning.get('word1')!.confidence = 0.8;
    lang1Prof.vocabularyLearning.get('word2')!.confidence = 0.7;
    lang2Prof.vocabularyLearning.get('word3')!.confidence = 0.9;

    entity.addComponent(knowledge);
    mockWorld.addEntity(entity);

    mockWorld.tick = 100;
    system.forceUpdate(entity, mockWorld as World);

    // Total should be 3 (2 from lang1 + 1 from lang2)
    expect(knowledge.totalWordsLearned).toBe(3);
  });

  it('should support custom decay options', () => {
    const options: LanguageSystemOptions = {
      enableDecay: true,
      decayThreshold: 1000, // 50 seconds instead of 10 minutes
      decayRate: 0.99, // 1% per tick instead of 0.1%
      minimumProficiency: 0.1, // 10% instead of 5%
    };

    const customSystem = new LanguageSystem(registry, communicationService, options);

    const entity = new MockEntity('agent1');
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);
    startLearningLanguage(knowledge, 'fast_decay', 0);

    const fastProf = knowledge.knownLanguages.get('fast_decay')!;
    fastProf.proficiency = 0.5;
    fastProf.lastUsed = 0;

    entity.addComponent(knowledge);

    mockWorld.tick = 1500; // Past custom threshold
    customSystem.forceUpdate(entity, mockWorld as World);

    // Should decay faster with custom rate
    expect(fastProf.proficiency).toBeLessThan(0.5);
  });

  it('should disable decay when option is false', () => {
    const options: LanguageSystemOptions = {
      enableDecay: false,
    };

    const noDecaySystem = new LanguageSystem(registry, communicationService, options);

    const entity = new MockEntity('agent1');
    const knowledge = createLanguageKnowledgeComponent(['native_lang']);
    startLearningLanguage(knowledge, 'no_decay', 0);

    const noDecayProf = knowledge.knownLanguages.get('no_decay')!;
    noDecayProf.proficiency = 0.7;
    noDecayProf.lastUsed = 0;

    entity.addComponent(knowledge);

    mockWorld.tick = 50000; // Way past threshold
    noDecaySystem.forceUpdate(entity, mockWorld as World);

    // Should not decay
    expect(noDecayProf.proficiency).toBe(0.7);
  });

  it('should provide system statistics', () => {
    const entity1 = new MockEntity('agent1');
    const knowledge1 = createLanguageKnowledgeComponent(['lang1']);
    startLearningLanguage(knowledge1, 'lang2', 0);
    knowledge1.knownLanguages.get('lang1')!.proficiency = 1.0;
    knowledge1.knownLanguages.get('lang2')!.proficiency = 0.6;
    entity1.addComponent(knowledge1);
    mockWorld.addEntity(entity1);

    const entity2 = new MockEntity('agent2');
    const knowledge2 = createLanguageKnowledgeComponent(['lang1']);
    knowledge2.knownLanguages.get('lang1')!.proficiency = 1.0;
    entity2.addComponent(knowledge2);
    mockWorld.addEntity(entity2);

    const stats = system.getStats(mockWorld as World);

    expect(stats.totalAgentsWithLanguages).toBe(2);
    expect(stats.totalLanguagesKnown).toBe(3); // 2 from agent1 + 1 from agent2
    expect(stats.averageLanguagesPerAgent).toBe(1.5);
    expect(stats.averageProficiency).toBeCloseTo(0.867, 2); // (1.0 + 0.6 + 1.0) / 3
  });
});
