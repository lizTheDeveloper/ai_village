/**
 * RiddleGenerator tests - Verify LLM can generate and solve riddles
 *
 * This test suite is critical for validating the death bargain system.
 * We need to ensure:
 * 1. LLMs can generate valid riddles with answers
 * 2. LLMs can solve the riddles they (or other LLMs) generate
 * 3. The difficulty levels are appropriately calibrated
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiddleGenerator, type HeroContext, type GeneratedRiddle } from '../RiddleGenerator';
import type { LLMProvider } from '@ai-village/llm';

describe('RiddleGenerator', () => {
  let mockLLM: LLMProvider;
  let generator: RiddleGenerator;

  beforeEach(() => {
    // Mock LLM provider with canned responses
    mockLLM = {
      generate: vi.fn(),
    } as unknown as LLMProvider;

    generator = new RiddleGenerator(mockLLM);
  });

  describe('generateClassicRiddle', () => {
    it('should generate a valid riddle with all required fields', async () => {
      // Mock LLM response with valid JSON
      (mockLLM.generate as any).mockResolvedValue({
        text: `{
          "question": "I have cities but no houses, forests but no trees, water but no fish. What am I?",
          "correctAnswer": "a map",
          "acceptedAnswers": ["map", "atlas"],
          "hint": "Think of a representation, not the real thing",
          "difficulty": "medium"
        }`,
        usage: { promptTokens: 50, completionTokens: 100 },
      });

      const riddle = await generator.generateClassicRiddle('medium');

      expect(riddle).toBeDefined();
      expect(riddle.question).toContain('cities');
      expect(riddle.correctAnswer).toBe('a map');
      expect(riddle.acceptedAnswers).toContain('map');
      expect(riddle.difficulty).toBe('medium');
      expect(riddle.source).toBe('classic');
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      (mockLLM.generate as any).mockResolvedValue({
        text: '```json\n{"question": "What is always in front of you but cannot be seen?", "correctAnswer": "the future", "acceptedAnswers": ["future", "tomorrow"], "difficulty": "easy"}\n```',
        usage: { promptTokens: 50, completionTokens: 80 },
      });

      const riddle = await generator.generateClassicRiddle('easy');

      expect(riddle.question).toBe('What is always in front of you but cannot be seen?');
      expect(riddle.correctAnswer).toBe('the future');
      expect(riddle.difficulty).toBe('easy');
    });

    it('should throw on missing required fields', async () => {
      (mockLLM.generate as any).mockResolvedValue({
        text: '{"question": "What am I?"}', // Missing correctAnswer
        usage: { promptTokens: 20, completionTokens: 10 },
      });

      await expect(generator.generateClassicRiddle('medium')).rejects.toThrow('missing required field');
    });

    it('should throw on malformed JSON', async () => {
      (mockLLM.generate as any).mockResolvedValue({
        text: 'This is not JSON at all',
        usage: { promptTokens: 20, completionTokens: 10 },
      });

      await expect(generator.generateClassicRiddle('medium')).rejects.toThrow('Could not find JSON');
    });

    it('should throw on question too short', async () => {
      (mockLLM.generate as any).mockResolvedValue({
        text: '{"question": "What?", "correctAnswer": "thing", "acceptedAnswers": []}',
        usage: { promptTokens: 20, completionTokens: 15 },
      });

      await expect(generator.generateClassicRiddle('medium')).rejects.toThrow('Question too short');
    });

    it('should throw on empty correct answer', async () => {
      (mockLLM.generate as any).mockResolvedValue({
        text: '{"question": "What has no answer?", "correctAnswer": "", "acceptedAnswers": []}',
        usage: { promptTokens: 20, completionTokens: 15 },
      });

      await expect(generator.generateClassicRiddle('medium')).rejects.toThrow('Correct answer is empty');
    });
  });

  describe('generatePersonalizedRiddle', () => {
    it('should generate riddle based on hero context', async () => {
      const heroContext: HeroContext = {
        name: 'Aldric the Brave',
        destiny: 'unite the warring kingdoms',
        causeOfDeath: 'betrayed by trusted ally',
        notableDeeds: ['saved village from bandits', 'defeated dragon'],
      };

      (mockLLM.generate as any).mockResolvedValue({
        text: `{
          "question": "I was trusted, I was close, yet I struck from the shadows. What ended your mortal thread?",
          "correctAnswer": "betrayal",
          "acceptedAnswers": ["betrayal", "treachery", "a traitor"],
          "hint": "Think of who you trusted most",
          "difficulty": "medium"
        }`,
        usage: { promptTokens: 100, completionTokens: 80 },
      });

      const riddle = await generator.generatePersonalizedRiddle(heroContext);

      expect(riddle.question).toContain('trusted');
      expect(riddle.correctAnswer).toBe('betrayal');
      expect(riddle.source).toBe('personalized');

      // Verify the prompt included hero context
      const generateCall = (mockLLM.generate as any).mock.calls[0][0];
      expect(generateCall.prompt).toContain('Aldric the Brave');
      expect(generateCall.prompt).toContain('unite the warring kingdoms');
      expect(generateCall.prompt).toContain('betrayed by trusted ally');
    });
  });

  describe('testRiddle', () => {
    it('should correctly identify when LLM solves the riddle', async () => {
      const riddle: GeneratedRiddle = {
        question: 'What has keys but no locks, space but no room, you can enter but not go inside?',
        correctAnswer: 'keyboard',
        acceptedAnswers: ['a keyboard', 'computer keyboard'],
        difficulty: 'medium',
        source: 'classic',
      };

      // Mock LLM solving the riddle
      (mockLLM.generate as any).mockResolvedValue({
        text: 'keyboard',
        usage: { promptTokens: 30, completionTokens: 5 },
      });

      const result = await generator.testRiddle(riddle);

      expect(result.solved).toBe(true);
      expect(result.answer).toBe('keyboard');
    });

    it('should recognize alternative accepted answers', async () => {
      const riddle: GeneratedRiddle = {
        question: 'What walks on four legs in the morning, two legs at noon, three legs in the evening?',
        correctAnswer: 'man',
        acceptedAnswers: ['human', 'person', 'mankind'],
        difficulty: 'hard',
        source: 'mythic',
      };

      // LLM gives alternative answer
      (mockLLM.generate as any).mockResolvedValue({
        text: 'human',
        usage: { promptTokens: 40, completionTokens: 5 },
      });

      const result = await generator.testRiddle(riddle);

      expect(result.solved).toBe(true);
      expect(result.answer).toBe('human');
    });

    it('should correctly identify when LLM fails to solve', async () => {
      const riddle: GeneratedRiddle = {
        question: 'I speak without a mouth and hear without ears. What am I?',
        correctAnswer: 'an echo',
        acceptedAnswers: ['echo'],
        difficulty: 'medium',
        source: 'classic',
      };

      // LLM gives wrong answer
      (mockLLM.generate as any).mockResolvedValue({
        text: 'a telephone',
        usage: { promptTokens: 30, completionTokens: 10 },
      });

      const result = await generator.testRiddle(riddle);

      expect(result.solved).toBe(false);
      expect(result.answer).toBe('a telephone');
    });

    it('should handle case-insensitive matching', async () => {
      const riddle: GeneratedRiddle = {
        question: 'What is the capital of France?',
        correctAnswer: 'Paris',
        acceptedAnswers: ['paris'],
        difficulty: 'easy',
        source: 'classic',
      };

      // LLM gives answer in different case
      (mockLLM.generate as any).mockResolvedValue({
        text: 'PARIS',
        usage: { promptTokens: 20, completionTokens: 5 },
      });

      const result = await generator.testRiddle(riddle);

      expect(result.solved).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should default difficulty to medium if invalid', async () => {
      (mockLLM.generate as any).mockResolvedValue({
        text: '{"question": "What has no beginning and no end?", "correctAnswer": "a circle", "acceptedAnswers": ["circle", "ring"], "difficulty": "invalid"}',
        usage: { promptTokens: 30, completionTokens: 40 },
      });

      const riddle = await generator.generateClassicRiddle('medium');

      expect(riddle.difficulty).toBe('medium');
    });

    it('should trim whitespace from answers', async () => {
      (mockLLM.generate as any).mockResolvedValue({
        text: '{"question": "What am I?", "correctAnswer": "  answer  ", "acceptedAnswers": ["  alt1  ", "  alt2  "]}',
        usage: { promptTokens: 20, completionTokens: 30 },
      });

      const riddle = await generator.generateClassicRiddle('easy');

      expect(riddle.correctAnswer).toBe('answer');
      expect(riddle.acceptedAnswers[0]).toBe('alt1');
      expect(riddle.acceptedAnswers[1]).toBe('alt2');
    });
  });
});

/**
 * Integration test - Generate and solve riddles with real LLM
 *
 * This test requires a real LLM provider and should be run separately
 * from the unit tests. It's useful for calibrating riddle difficulty.
 *
 * Run with: npm test -- RiddleGenerator.integration
 */
describe.skip('RiddleGenerator Integration (requires real LLM)', () => {
  // This would need a real LLM provider configured
  // Keep it as a template for manual testing

  it('should generate and solve classic riddles', async () => {
    // const realLLM = new OllamaProvider({ model: 'qwen3:1.7b' });
    // const generator = new RiddleGenerator(realLLM);
    //
    // const riddle = await generator.generateClassicRiddle('medium');
    // console.log('Generated riddle:', riddle);
    //
    // const result = await generator.testRiddle(riddle);
    // console.log('Solve result:', result);
    //
    // expect(result.solved).toBe(true);
  });

  it('should measure success rate across difficulty levels', async () => {
    // const realLLM = new OllamaProvider({ model: 'qwen3:1.7b' });
    // const generator = new RiddleGenerator(realLLM);
    //
    // const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
    // const results = { easy: 0, medium: 0, hard: 0 };
    // const trials = 5;
    //
    // for (const difficulty of difficulties) {
    //   for (let i = 0; i < trials; i++) {
    //     const riddle = await generator.generateClassicRiddle(difficulty);
    //     const result = await generator.testRiddle(riddle);
    //     if (result.solved) {
    //       results[difficulty]++;
    //     }
    //   }
    // }
    //
    // console.log('Success rates:', {
    //   easy: `${results.easy}/${trials}`,
    //   medium: `${results.medium}/${trials}`,
    //   hard: `${results.hard}/${trials}`,
    // });
  });
});
