/**
 * Spell Laboratory Microgenerator
 *
 * Create spells through magical experimentation that enter the
 * god-crafted queue and can be discovered in any universe.
 *
 * Integrates with: LLMEffectGenerator (existing LLM system)
 */

import type { LLMProvider } from '@ai-village/llm';
import type {
  DivineSignature,
  SpellContent,
  SpellData,
  MicrogeneratorValidationResult,
  MicrogeneratorInput,
} from './types.js';
import { godCraftedQueue } from './GodCraftedQueue.js';

/**
 * Input for spell creation
 */
export interface SpellLabInput {
  /** Spell name */
  name?: string;

  /** What should this spell do? */
  intent: string;

  /** Techniques to use */
  techniques: string[];

  /** Forms to use */
  forms: string[];

  /** Reagents/materials (optional) */
  reagents?: string[];

  /** Desired power level (1-10) */
  powerLevel: number;

  /** Magic paradigm (optional) */
  paradigmId?: string;
}

/**
 * Spell Laboratory Microgenerator
 *
 * Creates spells using LLM-powered magical experimentation.
 */
export class SpellLabMicrogenerator {
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  /**
   * Generate a spell
   */
  async generate(input: MicrogeneratorInput & { data: SpellLabInput }): Promise<SpellContent> {
    const { creator, tags = [], data } = input;

    // Build prompt for spell generation
    const prompt = this.buildSpellPrompt(data);

    // Generate spell using LLM
    const response = await this.llmProvider.generateText({
      prompt,
      temperature: 0.85, // Creative magic
      maxTokens: 800,
      systemPrompt: 'You are a master mage designing innovative spells. Output valid JSON only.',
    });

    // Parse LLM response
    const parsed = this.parseSpellResponse(response, data);

    // Create spell data
    const spellData: SpellData = {
      spellId: `spell:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      name: parsed.name || data.name || 'Unnamed Spell',
      description: parsed.description,
      techniques: data.techniques,
      forms: data.forms,
      reagents: data.reagents,
      manaCost: parsed.manaCost,
      powerLevel: Math.min(10, Math.max(1, data.powerLevel)),
      effects: parsed.effects,
      creativityScore: parsed.creativityScore,
    };

    // Create god-crafted content
    const content: SpellContent = {
      id: spellData.spellId,
      type: 'spell',
      creator,
      tags: [...tags, 'spell', 'magic', ...data.techniques, ...data.forms],
      lore: `A spell crafted by ${creator.name}, God of ${creator.godOf}. ${parsed.description}`,
      data: spellData,
      validated: true, // Auto-validated
      discoveries: [],
      createdAt: Date.now(),
    };

    // Submit to queue
    godCraftedQueue.submit(content);

    return content;
  }

  /**
   * Validate spell input
   */
  validate(data: SpellLabInput): MicrogeneratorValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate intent
    if (!data.intent || data.intent.trim().length === 0) {
      errors.push('Intent is required');
    }

    // Validate techniques
    if (!data.techniques || data.techniques.length === 0) {
      errors.push('At least one technique is required');
    }

    // Validate forms
    if (!data.forms || data.forms.length === 0) {
      errors.push('At least one form is required');
    }

    // Validate power level
    if (data.powerLevel < 1 || data.powerLevel > 10) {
      errors.push('Power level must be between 1 and 10');
    }

    // Warn about overpowered spells
    if (data.powerLevel > 8) {
      warnings.push('High power level spells may be rejected by divine scrutiny');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Build prompt for spell generation
   */
  private buildSpellPrompt(data: SpellLabInput): string {
    const techniques = data.techniques.join(', ');
    const forms = data.forms.join(', ');
    const reagents = data.reagents?.join(', ') || 'none';

    return `Design a magical spell with the following parameters:

Intent: ${data.intent}
Techniques: ${techniques}
Forms: ${forms}
Reagents: ${reagents}
Desired Power Level: ${data.powerLevel}/10

Create an innovative spell that combines these elements creatively.
${data.name ? `Name: ${data.name}` : 'Generate a creative name.'}

Output a JSON object with this structure:
{
  "name": "spell name",
  "description": "what the spell does",
  "manaCost": number (10-200),
  "effects": {
    "damage": number or null,
    "duration": number or null (seconds),
    "range": number or null (meters),
    "areaOfEffect": number or null (meters),
    "custom": {} optional custom effects
  },
  "creativityScore": number (0-1, how innovative),
  "flavorText": "atmospheric description"
}`;
  }

  /**
   * Parse LLM response into spell data
   */
  private parseSpellResponse(response: string, input: SpellLabInput): {
    name: string;
    description: string;
    manaCost: number;
    effects: SpellData['effects'];
    creativityScore: number;
  } {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        name: parsed.name || input.name || 'Unnamed Spell',
        description: parsed.description || parsed.flavorText || 'A mysterious spell',
        manaCost: Math.max(10, Math.min(200, parsed.manaCost || 50)),
        effects: {
          damage: parsed.effects?.damage || null,
          duration: parsed.effects?.duration || null,
          range: parsed.effects?.range || null,
          areaOfEffect: parsed.effects?.areaOfEffect || null,
          custom: parsed.effects?.custom || {},
        },
        creativityScore: Math.max(0, Math.min(1, parsed.creativityScore || 0.5)),
      };
    } catch (error) {
      console.error('[SpellLab] Failed to parse LLM response:', error);

      // Fallback: create basic spell
      return {
        name: input.name || 'Unnamed Spell',
        description: input.intent,
        manaCost: 50,
        effects: {
          damage: input.powerLevel * 10,
          duration: null,
          range: 10,
          areaOfEffect: null,
          custom: {},
        },
        creativityScore: 0.3,
      };
    }
  }

  /**
   * Get spell by ID
   */
  getSpell(spellId: string): SpellContent | null {
    const content = godCraftedQueue.getContent(spellId);
    if (content?.type === 'spell') {
      return content as SpellContent;
    }
    return null;
  }

  /**
   * Get all spells by creator
   */
  getSpellsByCreator(creatorId: string): SpellContent[] {
    return godCraftedQueue
      .getByCreator(creatorId)
      .filter((c): c is SpellContent => c.type === 'spell');
  }

  /**
   * Get all spells
   */
  getAllSpells(): SpellContent[] {
    return godCraftedQueue
      .getByType('spell')
      .filter((c): c is SpellContent => c.type === 'spell');
  }
}
