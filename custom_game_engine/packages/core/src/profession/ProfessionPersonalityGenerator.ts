/**
 * ProfessionPersonalityGenerator - LLM-based personality content generation
 *
 * Generates catchphrases, show intros, and personality quirks for profession NPCs.
 *
 * Architecture:
 * - **One-time LLM cost**: Generate once when hiring, cache forever
 * - **Lazy generation**: Generate on-demand as needed
 * - **Fallback templates**: If LLM unavailable, use templates
 * - **Accumulates content**: Builds up library over time
 *
 * Example usage:
 *   const generator = new ProfessionPersonalityGenerator(llmQueue);
 *   const personality = await generator.generatePersonality(
 *     'radio_dj',
 *     { name: 'Freddy', shift: { startHour: 5, endHour: 11 } }
 *   );
 *   // personality.intros = ["DJ Freddy in the morning, welcome to Sunrise City!"]
 *   // personality.catchphrases = ["It's gonna be a beautiful day, folks!"]
 */

import type { ProfessionRole } from '../components/ProfessionComponent.js';
import type { LLMDecisionQueue } from '../types/LLMTypes.js';

/**
 * Context for personality generation.
 */
export interface PersonalityContext {
  /** Agent name */
  name: string;
  /** City name (if available) */
  cityName?: string;
  /** Work shift */
  shift?: {
    startHour: number;
    endHour: number;
  };
  /** Profession-specific context */
  [key: string]: string | number | { startHour: number; endHour: number } | undefined;
}

/**
 * Generated personality content.
 */
export interface GeneratedPersonality {
  catchphrases: string[];
  intros: string[];
  quirks: string[];
  generatedBy: 'llm' | 'template';
  generatedAt: number;
}

/**
 * ProfessionPersonalityGenerator - Generates personality content for professions.
 */
export class ProfessionPersonalityGenerator {
  private llmQueue: LLMDecisionQueue | null = null;

  /** Cache of generated personalities (optional - for reuse) */
  private personalityCache: Map<string, GeneratedPersonality> = new Map();

  constructor(llmQueue?: LLMDecisionQueue) {
    this.llmQueue = llmQueue ?? null;
  }

  /**
   * Set LLM queue (for late initialization).
   */
  setLLMQueue(llmQueue: LLMDecisionQueue): void {
    this.llmQueue = llmQueue;
  }

  /**
   * Generate personality for a profession NPC.
   *
   * @param role - Profession role
   * @param context - Context for generation (name, city, shift, etc.)
   * @param useLLM - Whether to use LLM (true) or templates (false)
   * @returns Generated personality
   */
  async generatePersonality(
    role: ProfessionRole,
    context: PersonalityContext,
    useLLM: boolean = true
  ): Promise<GeneratedPersonality> {
    // Use LLM if available and requested
    if (useLLM && this.llmQueue) {
      try {
        return await this.generateWithLLM(role, context);
      } catch (error) {
        console.error('[ProfessionPersonalityGenerator] LLM generation failed, falling back to templates:', error);
        // Fallback to templates
        return this.generateWithTemplates(role, context);
      }
    }

    // Use templates as fallback
    return this.generateWithTemplates(role, context);
  }

  /**
   * Generate personality using LLM.
   */
  private async generateWithLLM(
    role: ProfessionRole,
    context: PersonalityContext
  ): Promise<GeneratedPersonality> {
    const prompt = this.buildLLMPrompt(role, context);

    // Request LLM generation (fire-and-forget, returns Promise<void>)
    const entityId = `personality_gen_${context.name}_${Date.now()}`;
    await this.llmQueue!.requestDecision(entityId, prompt);

    // Retrieve the decision
    const response = this.llmQueue!.getDecision(entityId);
    if (!response) {
      throw new Error('No decision available from LLM queue');
    }

    // Parse LLM response (expects JSON)
    const parsed = this.parseLLMResponse(response);

    return {
      catchphrases: parsed.catchphrases || [],
      intros: parsed.intros || [],
      quirks: parsed.quirks || [],
      generatedBy: 'llm',
      generatedAt: Date.now(),
    };
  }

  /**
   * Build LLM prompt for personality generation.
   */
  private buildLLMPrompt(role: ProfessionRole, context: PersonalityContext): string {
    const shiftDesc = context.shift
      ? `${context.shift.startHour}:00 to ${context.shift.endHour}:00`
      : 'various hours';

    const roleDesc = this.getRoleDescription(role);
    const cityContext = context.cityName ? ` in ${context.cityName}` : '';

    return `Generate personality content for a ${roleDesc} named ${context.name}${cityContext}.

Work Schedule: ${shiftDesc}

Generate 3-5 catchphrases, 2-3 show/segment intros, and 2-3 personality quirks.

${this.getRoleSpecificGuidance(role, context)}

Return ONLY valid JSON in this exact format:
{
  "catchphrases": ["catchphrase 1", "catchphrase 2", ...],
  "intros": ["intro 1", "intro 2", ...],
  "quirks": ["quirk 1", "quirk 2", ...]
}

Make it memorable, authentic, and fitting for the role!`;
  }

  /**
   * Get role-specific guidance for LLM prompt.
   */
  private getRoleSpecificGuidance(role: ProfessionRole, context: PersonalityContext): string {
    switch (role) {
      case 'radio_dj':
        const timeOfDay = context.shift && context.shift.startHour < 12
          ? 'morning'
          : context.shift && context.shift.startHour < 17
            ? 'afternoon'
            : 'evening';

        return `Examples for radio DJ:
- Intros: "DJ ${context.name} in the ${timeOfDay}, welcome to [show name]!"
- Catchphrases: "It's gonna be a beautiful day!", "You're listening to the best hits!"
- Quirks: "Always mentions the weather", "Loves puns about songs"`;

      case 'tv_actor':
        return `Examples for TV actor:
- Catchphrases: "That's what I'm talking about!", "You've got to be kidding me!"
- Quirks: "Always adjusts their collar", "Dramatic pauses"`;

      case 'newspaper_reporter':
        return `Examples for reporter:
- Catchphrases: "The people deserve to know!", "This just in..."
- Intros: "${context.name} reporting from downtown"
- Quirks: "Always carries a notepad", "Asks tough questions"`;

      case 'tv_director':
        return `Examples for TV director:
- Catchphrases: "Take it from the top!", "That's a wrap!"
- Quirks: "Perfectionist about lighting", "Passionate about storytelling"`;

      case 'shopkeeper':
        return `Examples for shopkeeper:
- Catchphrases: "What can I get for you today?", "Fresh stock just came in!"
- Quirks: "Remembers every customer's name", "Always cheerful"`;

      case 'doctor':
        return `Examples for doctor:
- Catchphrases: "How are we feeling today?", "Let's take a look at that"
- Quirks: "Very thorough", "Calming bedside manner"`;

      default:
        return `Generate authentic catchphrases and quirks for this ${role}.`;
    }
  }

  /**
   * Get human-readable role description.
   */
  private getRoleDescription(role: ProfessionRole): string {
    return role.replace(/_/g, ' ');
  }

  /**
   * Parse LLM response (expects JSON).
   */
  private parseLLMResponse(response: string): {
    catchphrases?: string[];
    intros?: string[];
    quirks?: string[];
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } catch (error) {
      console.error('[ProfessionPersonalityGenerator] Failed to parse LLM response:', error);
      // Return empty arrays
      return { catchphrases: [], intros: [], quirks: [] };
    }
  }

  /**
   * Generate personality using templates (fallback).
   */
  private generateWithTemplates(
    role: ProfessionRole,
    context: PersonalityContext
  ): GeneratedPersonality {
    const templates = this.getTemplatesForRole(role, context);

    return {
      catchphrases: templates.catchphrases,
      intros: templates.intros,
      quirks: templates.quirks,
      generatedBy: 'template',
      generatedAt: Date.now(),
    };
  }

  /**
   * Get template-based personality for a role.
   */
  private getTemplatesForRole(
    role: ProfessionRole,
    context: PersonalityContext
  ): { catchphrases: string[]; intros: string[]; quirks: string[] } {
    const name = context.name;
    const timeOfDay =
      context.shift && context.shift.startHour < 12
        ? 'morning'
        : context.shift && context.shift.startHour < 17
          ? 'afternoon'
          : 'evening';

    switch (role) {
      case 'radio_dj':
        return {
          catchphrases: [
            "It's gonna be a beautiful day, folks!",
            "You're tuned in to the best station in town!",
            "Let's make some noise!",
            "Keep those requests coming!",
          ],
          intros: [
            `DJ ${name} in the ${timeOfDay}!`,
            `Good ${timeOfDay}, you're listening to ${name}!`,
            `This is ${name}, bringing you the hits!`,
          ],
          quirks: [
            'Always mentions the weather',
            'Loves sharing fun facts',
            'Energetic and upbeat',
          ],
        };

      case 'tv_actor':
        return {
          catchphrases: [
            "That's what I'm talking about!",
            "You've got to be kidding me!",
            "This is unbelievable!",
            "Let me tell you something...",
          ],
          intros: [],
          quirks: [
            'Dramatic pauses',
            'Expressive hand gestures',
            'Method actor',
          ],
        };

      case 'newspaper_reporter':
        return {
          catchphrases: [
            'The people deserve to know!',
            'This just in...',
            'Breaking news!',
            "I'll get to the bottom of this!",
          ],
          intros: [
            `${name} reporting`,
            `This is ${name} with the latest`,
          ],
          quirks: [
            'Always carries a notepad',
            'Asks tough questions',
            'Investigative by nature',
          ],
        };

      case 'tv_director':
        return {
          catchphrases: [
            'Take it from the top!',
            "That's a wrap!",
            'Places everyone!',
            'Let me see more energy!',
          ],
          intros: [],
          quirks: [
            'Perfectionist',
            'Passionate about storytelling',
            'Demanding but fair',
          ],
        };

      case 'shopkeeper':
        return {
          catchphrases: [
            'What can I get for you today?',
            'Fresh stock just came in!',
            'Best prices in town!',
            'Come back soon!',
          ],
          intros: [
            `Welcome to ${name}'s shop!`,
          ],
          quirks: [
            'Remembers every customer',
            'Always cheerful',
            'Knows the inventory by heart',
          ],
        };

      case 'doctor':
        return {
          catchphrases: [
            'How are we feeling today?',
            "Let's take a look at that",
            "You're in good hands",
            'Take care of yourself',
          ],
          intros: [
            `Dr. ${name} here`,
          ],
          quirks: [
            'Very thorough',
            'Calming bedside manner',
            'Always washing hands',
          ],
        };

      case 'teacher':
        return {
          catchphrases: [
            'Pay attention class!',
            'Any questions?',
            "Let's review what we learned",
            'Knowledge is power!',
          ],
          intros: [
            `Good morning, I'm ${name}`,
          ],
          quirks: [
            'Patient and encouraging',
            'Loves seeing students succeed',
            'Always prepared',
          ],
        };

      default:
        return {
          catchphrases: [
            'Have a great day!',
            'Happy to help!',
            'See you around!',
          ],
          intros: [`Hi, I'm ${name}`],
          quirks: ['Professional', 'Friendly'],
        };
    }
  }

  /**
   * Cache personality for later reuse (optional).
   */
  cachePersonality(key: string, personality: GeneratedPersonality): void {
    this.personalityCache.set(key, personality);
  }

  /**
   * Get cached personality (optional).
   */
  getCachedPersonality(key: string): GeneratedPersonality | undefined {
    return this.personalityCache.get(key);
  }

  /**
   * Clear personality cache.
   */
  clearCache(): void {
    this.personalityCache.clear();
  }
}
