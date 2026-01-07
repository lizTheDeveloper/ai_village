/**
 * Death's Riddle Book Microgenerator
 *
 * Create personalized riddles for hero death bargains that enter the
 * god-crafted queue and can be discovered in any universe.
 *
 * Integrates with: RiddleGenerator.ts (existing LLM system)
 */

import type { LLMProvider } from '../types/LLMTypes.js';
import { RiddleGenerator } from '../divinity/RiddleGenerator.js';
import type {
  DivineSignature,
  RiddleContent,
  RiddleData,
  MicrogeneratorValidationResult,
  MicrogeneratorInput,
} from './types.js';
import { godCraftedQueue } from './GodCraftedQueue.js';

/**
 * Input for riddle creation
 */
export interface RiddleBookInput {
  /** Who is this riddle for? */
  targetName?: string;

  /** What theme/topic? */
  theme?: string;

  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';

  /** Should LLM judge creative answers? */
  allowLLMJudgment: boolean;

  /** Additional context */
  context?: {
    causeOfDeath?: string;
    notableDeeds?: string[];
    relationships?: string[];
  };
}

/**
 * Death's Riddle Book Microgenerator
 *
 * Creates riddles using the existing RiddleGenerator system.
 */
export class RiddleBookMicrogenerator {
  private riddleGenerator: RiddleGenerator;

  constructor(llmProvider: LLMProvider) {
    this.riddleGenerator = new RiddleGenerator(llmProvider);
  }

  /**
   * Generate a riddle
   */
  async generate(input: MicrogeneratorInput & { data: RiddleBookInput }): Promise<RiddleContent> {
    const { creator, tags = [], data } = input;

    // Use existing RiddleGenerator
    const generatedRiddle = await this.riddleGenerator.generatePersonalizedRiddle({
      name: data.targetName ?? 'Unknown Hero',
      destiny: data.theme ?? 'The Seeker',
      causeOfDeath: data.context?.causeOfDeath ?? 'unknown',
      notableDeeds: data.context?.notableDeeds ?? [],
      relationships: data.context?.relationships ?? [],
    });

    if (!generatedRiddle) {
      throw new Error('Failed to generate riddle');
    }

    // Create riddle data
    const riddleData: RiddleData = {
      question: generatedRiddle.question,
      correctAnswer: generatedRiddle.correctAnswer ?? '',
      alternativeAnswers: generatedRiddle.acceptedAnswers ?? [],
      difficulty: data.difficulty,
      context: {
        targetName: data.targetName,
        theme: data.theme,
        purpose: 'Death bargain challenge for hero resurrection',
      },
      allowLLMJudgment: data.allowLLMJudgment,
    };

    // Create god-crafted content
    const content: RiddleContent = {
      id: `riddle:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      type: 'riddle',
      creator,
      tags: [...tags, 'riddle', 'death_bargain', data.difficulty],
      lore: `A riddle crafted by ${creator.name}, God of ${creator.godOf}, to test the wisdom of ${data.targetName ?? 'heroes'}. ${data.theme ? `Theme: ${data.theme}.` : ''}`,
      data: riddleData,
      validated: true, // Auto-validated since we use existing generator
      discoveries: [],
      createdAt: Date.now(),
    };

    // Submit to queue
    godCraftedQueue.submit(content);

    return content;
  }

  /**
   * Validate riddle input
   */
  validate(data: RiddleBookInput): MicrogeneratorValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate difficulty
    if (!['easy', 'medium', 'hard'].includes(data.difficulty)) {
      errors.push('Difficulty must be easy, medium, or hard');
    }

    // Warn if no context provided
    if (!data.targetName && !data.theme) {
      warnings.push('No target name or theme provided. Riddle will be generic.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get riddle by ID
   */
  getRiddle(riddleId: string): RiddleContent | null {
    const content = godCraftedQueue.getContent(riddleId);
    if (content?.type === 'riddle') {
      return content as RiddleContent;
    }
    return null;
  }

  /**
   * Get all riddles by creator
   */
  getRiddlesByCreator(creatorId: string): RiddleContent[] {
    return godCraftedQueue
      .getByCreator(creatorId)
      .filter((c): c is RiddleContent => c.type === 'riddle');
  }

  /**
   * Get all riddles
   */
  getAllRiddles(): RiddleContent[] {
    return godCraftedQueue
      .getByType('riddle')
      .filter((c): c is RiddleContent => c.type === 'riddle');
  }
}
