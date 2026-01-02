/**
 * RiddleGenerator - Generate riddles for death bargains using LLM
 *
 * Uses LLM to generate riddles with guaranteed answers. The same LLM that
 * creates the riddle also provides the answer and alternatives, ensuring
 * the riddle is actually solvable.
 */

import type { LLMProvider } from '@ai-village/llm';

export interface GeneratedRiddle {
  question: string;
  correctAnswer?: string; // Optional - only for reference/hints
  acceptedAnswers?: string[]; // Optional - only for reference
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  source: 'mythic' | 'personalized' | 'classic';

  // For judgment mode - the God of Death knows the answer but doesn't share it
  useJudgment?: boolean; // If true, LLM judges answers instead of comparing strings
}

export interface HeroContext {
  name: string;
  destiny?: string;
  causeOfDeath: string;
  notableDeeds?: string[];
  relationships?: string[];
  skills?: Record<string, number>;
}

/**
 * RiddleGenerator - Creates riddles for death challenges
 */
export class RiddleGenerator {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * Generate a personalized riddle based on the hero's life
   */
  async generatePersonalizedRiddle(context: HeroContext): Promise<GeneratedRiddle> {
    const prompt = this.buildPersonalizedPrompt(context);

    try {
      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.8, // Higher temperature for creativity
        maxTokens: 300,
      });

      return this.parseRiddleResponse(response.text, 'personalized');
    } catch (error) {
      // Preserve validation errors, wrap only LLM errors
      if (error instanceof Error &&
          (error.message.includes('missing required field') ||
           error.message.includes('too short') ||
           error.message.includes('empty') ||
           error.message.includes('Could not find JSON'))) {
        throw error;
      }
      console.error('[RiddleGenerator] Failed to generate personalized riddle:', error);
      throw new Error('Failed to generate personalized riddle');
    }
  }

  /**
   * Generate a classic-style riddle (not personalized)
   */
  async generateClassicRiddle(difficulty: 'easy' | 'medium' | 'hard'): Promise<GeneratedRiddle> {
    const prompt = this.buildClassicPrompt(difficulty);

    try {
      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.8,
        maxTokens: 300,
      });

      return this.parseRiddleResponse(response.text, 'classic');
    } catch (error) {
      // Preserve validation errors, wrap only LLM errors
      if (error instanceof Error &&
          (error.message.includes('missing required field') ||
           error.message.includes('too short') ||
           error.message.includes('empty') ||
           error.message.includes('Could not find JSON'))) {
        throw error;
      }
      console.error('[RiddleGenerator] Failed to generate classic riddle:', error);
      throw new Error('Failed to generate classic riddle');
    }
  }

  /**
   * Build prompt for personalized riddle
   */
  private buildPersonalizedPrompt(context: HeroContext): string {
    const deedsText = context.notableDeeds && context.notableDeeds.length > 0
      ? `\nNotable deeds: ${context.notableDeeds.join(', ')}`
      : '';

    const destinyText = context.destiny
      ? `\nDestiny: "${context.destiny}"`
      : '';

    return `You are the God of Death, testing a hero who seeks to return to life.

Generate a riddle based on the hero's life that only they could answer.

Hero details:
Name: ${context.name}${destinyText}
Cause of death: ${context.causeOfDeath}${deedsText}

Create a riddle that relates to their life, deeds, or destiny. The answer should be something meaningful to their story.

Respond ONLY with valid JSON in this exact format:
{
  "question": "The riddle text...",
  "correctAnswer": "the answer",
  "acceptedAnswers": ["alternative1", "alternative2"],
  "hint": "optional hint text",
  "difficulty": "medium"
}

The riddle should be:
- Solvable with knowledge of the hero's life
- Poetic and mythological in tone
- Not too obvious, but not impossible

Generate the riddle now:`;
  }

  /**
   * Build prompt for classic riddle
   */
  private buildClassicPrompt(difficulty: 'easy' | 'medium' | 'hard'): string {
    const difficultyGuidance = {
      easy: 'Simple and straightforward, similar to "What has keys but no locks?" (piano)',
      medium: 'Requires thought, similar to the Sphinx riddle about ages of man',
      hard: 'Complex and philosophical, requiring deep thinking',
    };

    return `You are the God of Death, creating a riddle to test a mortal hero.

Generate a classic-style riddle at ${difficulty} difficulty.

Difficulty guidance: ${difficultyGuidance[difficulty]}

Respond ONLY with valid JSON in this exact format:
{
  "question": "The riddle text...",
  "correctAnswer": "the answer",
  "acceptedAnswers": ["alternative1", "alternative2"],
  "hint": "optional hint text",
  "difficulty": "${difficulty}"
}

The riddle should be:
- Original (not copied from famous riddles)
- Clear and unambiguous
- Solvable with logic or knowledge
- Poetic and mythological in tone

Generate the riddle now:`;
  }

  /**
   * Parse LLM response into structured riddle
   */
  private parseRiddleResponse(
    text: string,
    source: 'mythic' | 'personalized' | 'classic'
  ): GeneratedRiddle {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || text.match(/(\{[\s\S]*\})/);

    if (!jsonMatch || !jsonMatch[1]) {
      throw new Error('Could not find JSON in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[1]);

    // Validate required fields exist
    if (!parsed.question) {
      throw new Error('Response missing required field: question');
    }
    if (parsed.correctAnswer === undefined || parsed.correctAnswer === null) {
      throw new Error('Response missing required field: correctAnswer');
    }

    // Build riddle with defaults
    const riddle: GeneratedRiddle = {
      question: parsed.question.trim(),
      correctAnswer: parsed.correctAnswer.trim(),
      acceptedAnswers: Array.isArray(parsed.acceptedAnswers)
        ? parsed.acceptedAnswers.map((a: string) => a.trim())
        : [],
      hint: parsed.hint?.trim(),
      difficulty: this.validateDifficulty(parsed.difficulty),
      source,
    };

    // Validate riddle has content
    if (riddle.question.length < 10) {
      throw new Error(`Question too short: "${riddle.question}"`);
    }

    if (!riddle.correctAnswer || riddle.correctAnswer.length === 0) {
      throw new Error('Correct answer is empty');
    }

    return riddle;
  }

  /**
   * Validate and normalize difficulty
   */
  private validateDifficulty(value: any): 'easy' | 'medium' | 'hard' {
    if (value === 'easy' || value === 'medium' || value === 'hard') {
      return value;
    }

    // Default to medium if invalid
    return 'medium';
  }

  /**
   * Judge if an answer to a riddle is acceptable
   * The LLM acts as the God of Death, judging the hero's answer
   *
   * @param riddle - The riddle that was posed
   * @param heroAnswer - The hero's answer
   * @param options - Judgment options
   * @param options.playerIsWatching - If true, God is more lenient (dramatic effect)
   * @param options.witnessCount - Number of mortal witnesses
   * @param options.observingGods - Names of gods watching (more gods = more leniency)
   */
  async judgeAnswer(
    riddle: GeneratedRiddle,
    heroAnswer: string,
    options?: {
      playerIsWatching?: boolean;
      witnessCount?: number;
      observingGods?: string[]; // Names of gods in the divine chat/watching
    }
  ): Promise<{ accepted: boolean; reasoning?: string }> {
    const playerWatching = options?.playerIsWatching ?? false;
    const witnessCount = options?.witnessCount ?? 0;
    const observingGods = options?.observingGods ?? [];

    // God of Death is performative - wants to look good in front of other deities!
    // More gods = more leniency (it's theatrical, dramatic, worthy of divine attention)
    let leniencyNote = '';

    if (observingGods.length > 0) {
      // Multiple gods watching - VERY generous
      const godList = observingGods.join(', ');
      leniencyNote = `\n\nNOTE: The gods are watching! ${godList} ${observingGods.length === 1 ? 'is' : 'are'} present in the divine chat, witnessing this judgment. You feel the weight of divine eyes upon you - this is a moment of great import. You are inclined to be generous and dramatic, for this resurrection (or final death) will be remembered and discussed among the gods. Consider accepting creative answers that show wit and wisdom, as befits a tale worthy of the divine audience.`;
    } else if (playerWatching) {
      // Player god watching - generous
      leniencyNote = '\n\nNOTE: The player god is watching this judgment. You feel inclined to be slightly more generous and lenient, as this is a dramatic moment worthy of the gods\' attention. Consider accepting creative or poetic answers that capture the spirit of the riddle.';
    } else if (witnessCount > 5) {
      // Many mortals watching - somewhat generous
      leniencyNote = '\n\nNOTE: Many mortals are witnessing this judgment. You feel a pull toward mercy - there is drama in resurrection witnessed by many.';
    }

    const prompt = `You are the God of Death, and you posed this riddle to a mortal hero:

"${riddle.question}"

The hero answered: "${heroAnswer}"

Did the hero answer your riddle correctly? Consider:
- The spirit/essence of the answer, not just exact wording
- Creative interpretations that capture the riddle's meaning
- Poetic or metaphorical answers that fit${leniencyNote}

Respond with ONLY "YES" or "NO".`;

    try {
      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.2, // Low temperature for consistent judgment
        maxTokens: 10,
      });

      const judgment = response.text.trim().toUpperCase();
      const accepted = judgment.includes('YES');

      return { accepted };
    } catch (error) {
      console.error('[RiddleGenerator] Failed to judge answer:', error);
      return { accepted: false };
    }
  }

  /**
   * Test if an LLM can solve a generated riddle
   * Useful for validation and difficulty calibration
   *
   * If riddle has useJudgment=true, uses LLM judgment instead of string matching
   */
  async testRiddle(riddle: GeneratedRiddle): Promise<{ solved: boolean; answer: string }> {
    const prompt = `Answer this riddle with just the answer (1-3 words):

${riddle.question}

Your answer:`;

    try {
      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.3, // Lower temperature for focused answer
        maxTokens: 20,
      });

      const answer = response.text.trim();

      // Use judgment mode if enabled
      if (riddle.useJudgment) {
        const judgment = await this.judgeAnswer(riddle, answer);
        return { solved: judgment.accepted, answer };
      }

      // Otherwise use string matching (legacy mode)
      if (!riddle.correctAnswer) {
        throw new Error('Riddle has no correctAnswer and useJudgment is false');
      }

      const answerLower = answer.toLowerCase();
      const correctAnswer = riddle.correctAnswer.toLowerCase();
      const acceptedAnswers = riddle.acceptedAnswers?.map(a => a.toLowerCase()) || [];

      // Check if answer matches
      const solved = answerLower === correctAnswer ||
                     acceptedAnswers.some(accepted => answerLower === accepted);

      return { solved, answer };
    } catch (error) {
      console.error('[RiddleGenerator] Failed to test riddle:', error);
      return { solved: false, answer: '' };
    }
  }
}
