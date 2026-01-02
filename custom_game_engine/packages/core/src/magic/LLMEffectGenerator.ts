/**
 * LLM Effect Generator
 *
 * Allows mages to discover NEW spells and effects through experimentation.
 * Mages can combine techniques, forms, and materials to invent:
 * - New spell effects
 * - Unique enchantments
 * - Novel magical applications
 *
 * Generated spells go through divine scrutiny before being added to the registry.
 */

import type { MagicTechnique, MagicForm, MagicSourceId } from '../components/MagicComponent.js';
import type { SpellDefinition, DetectionRisk } from './SpellRegistry.js';

/**
 * LLM Provider interface for effect generation
 */
export interface EffectLLMProvider {
  generate(request: { prompt: string; temperature?: number; maxTokens?: number }): Promise<{ text: string }>;
  getModelName(): string;
  isAvailable(): Promise<boolean>;
}

/**
 * Context for magical experimentation
 */
export interface MagicExperimentContext {
  /** Mage's name */
  mageName: string;
  /** Mage's entity ID */
  mageId: string;
  /** Paradigm the mage practices */
  paradigmId: string;
  /** Paradigm name/description */
  paradigmName?: string;
  /** Techniques the mage knows */
  knownTechniques: MagicTechnique[];
  /** Forms the mage knows */
  knownForms: MagicForm[];
  /** Primary magic source */
  primarySource: MagicSourceId;
  /** Mage's proficiency levels */
  proficiency?: Record<string, number>;
  /** Materials/reagents used in experiment */
  reagents?: Array<{ itemId: string; quantity: number }>;
  /** Intent or goal of the experimentation */
  intent?: string;
  /** Existing spells known (for avoiding duplicates) */
  knownSpells?: string[];
  /** Current mana/resource levels */
  currentResources?: Record<string, number>;
}

/**
 * Result of magical experimentation
 */
export interface MagicExperimentResult {
  success: boolean;
  spell?: SpellDefinition;
  message: string;
  creativityScore: number; // 0-1 how innovative
  discoveryType: 'new_spell' | 'variation' | 'failure' | 'insight';
  insight?: string; // Even failures can yield insights
}

/**
 * LLM-generated spell structure (before validation)
 */
interface LLMGeneratedSpell {
  id: string;
  name: string;
  description: string;
  technique: MagicTechnique;
  form: MagicForm;
  school?: string;
  manaCost: number;
  castTime: number;
  range: number;
  duration?: number;
  effectType: 'damage' | 'healing' | 'buff' | 'debuff' | 'utility' | 'summon' | 'transform';
  effectStrength: number;
  tags?: string[];
  detectionRisk?: DetectionRisk;
  flavorText?: string;
}

/**
 * LLM Effect Generator
 */
class LLMEffectGeneratorImpl {
  private llmProvider: EffectLLMProvider | null = null;

  /**
   * Set the LLM provider
   */
  setProvider(provider: EffectLLMProvider): void {
    this.llmProvider = provider;
  }

  /**
   * Get the current provider
   */
  getProvider(): EffectLLMProvider | null {
    return this.llmProvider;
  }

  /**
   * Check if the generator is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.llmProvider) return false;
    return this.llmProvider.isAvailable();
  }

  /**
   * Attempt to discover a new spell through experimentation
   */
  async experimentWithMagic(context: MagicExperimentContext): Promise<MagicExperimentResult> {
    if (!this.llmProvider) {
      return {
        success: false,
        message: 'No LLM provider configured for magic experimentation',
        creativityScore: 0,
        discoveryType: 'failure',
      };
    }

    const prompt = this.buildExperimentPrompt(context);

    try {
      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.85, // Creative magic
        maxTokens: 800,
      });

      const parsed = this.parseResponse(response.text, context);
      if (!parsed) {
        // Failed experiment can still yield insight
        return {
          success: false,
          message: `${context.mageName}'s magical experiment fizzled, but yielded understanding`,
          creativityScore: 0.2,
          discoveryType: 'insight',
          insight: this.extractInsight(response.text, context),
        };
      }

      // Create the SpellDefinition
      const spell: SpellDefinition = {
        id: `discovered_${context.paradigmId}_${Date.now()}`,
        name: parsed.name,
        description: parsed.description,
        paradigmId: context.paradigmId,
        technique: parsed.technique,
        form: parsed.form,
        source: context.primarySource,
        manaCost: parsed.manaCost,
        castTime: parsed.castTime,
        range: parsed.range,
        duration: parsed.duration,
        effectId: `effect_${parsed.effectType}_${parsed.effectStrength}`,
        school: parsed.school,
        tags: parsed.tags || [],
        hotkeyable: true,
        creatorDetection: {
          detectionRisk: parsed.detectionRisk || 'low',
          powerLevel: Math.ceil(parsed.effectStrength / 10),
          leavesMagicalSignature: parsed.effectStrength > 50,
        },
      };

      const creativityScore = this.calculateCreativityScore(parsed, context);

      return {
        success: true,
        spell,
        message: `${context.mageName} has discovered a new spell: "${parsed.name}" - ${parsed.flavorText || parsed.description}`,
        creativityScore,
        discoveryType: this.isVariation(parsed, context) ? 'variation' : 'new_spell',
      };
    } catch (error) {
      return {
        success: false,
        message: `Magical experiment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        creativityScore: 0,
        discoveryType: 'failure',
      };
    }
  }

  /**
   * Build the prompt for magical experimentation
   */
  private buildExperimentPrompt(context: MagicExperimentContext): string {
    const techniques = context.knownTechniques.join(', ');
    const forms = context.knownForms.join(', ');

    const reagentsList = context.reagents?.length
      ? context.reagents.map(r => `- ${r.quantity}x ${r.itemId}`).join('\n')
      : 'No special reagents used';

    const proficiencyList = context.proficiency
      ? Object.entries(context.proficiency)
          .filter(([_, level]) => level > 30)
          .map(([skill, level]) => `- ${skill}: ${level}%`)
          .join('\n')
      : 'Novice level';

    const knownSpellsStr = context.knownSpells?.length
      ? context.knownSpells.slice(0, 10).join(', ')
      : 'Basic spells only';

    const intentStr = context.intent || 'General magical experimentation';

    return `You are a magical discovery generator for a fantasy village simulation.

A mage named "${context.mageName}" is experimenting with magic to discover new effects.

MAGE PROFILE:
Paradigm: ${context.paradigmName || context.paradigmId}
Primary Source: ${context.primarySource}
Known Techniques: ${techniques}
Known Forms: ${forms}

PROFICIENCY:
${proficiencyList}

KNOWN SPELLS (avoid duplicates):
${knownSpellsStr}

REAGENTS USED IN EXPERIMENT:
${reagentsList}

EXPERIMENTAL INTENT:
${intentStr}

Generate a NEW spell that:
1. Uses techniques and forms the mage knows
2. Fits the ${context.paradigmId} paradigm's flavor
3. Is NOT a duplicate of known spells
4. Has balanced costs and effects
5. Has evocative, memorable naming

Respond with ONLY valid JSON:
{
  "name": "Spell Name",
  "description": "What the spell does mechanically",
  "technique": "${context.knownTechniques[0] || 'create'}",
  "form": "${context.knownForms[0] || 'fire'}",
  "school": "School category (e.g., Evocation, Restoration)",
  "manaCost": <10-100>,
  "castTime": <1-10 ticks>,
  "range": <0-20 tiles, 0=self>,
  "duration": <null for instant, or ticks>,
  "effectType": "damage|healing|buff|debuff|utility|summon|transform",
  "effectStrength": <10-100>,
  "tags": ["combat", "utility", "ritual", etc.],
  "detectionRisk": "undetectable|low|moderate|high",
  "flavorText": "Evocative description of the spell in action"
}`;
  }

  /**
   * Parse LLM response into spell structure
   */
  private parseResponse(response: string, context: MagicExperimentContext): LLMGeneratedSpell | null {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.name || !parsed.description || !parsed.effectType) {
        return null;
      }

      // Validate technique
      const validTechniques: MagicTechnique[] = [
        'create', 'destroy', 'transform', 'perceive', 'control', 'protect', 'enhance', 'summon'
      ];
      const technique = validTechniques.includes(parsed.technique)
        ? parsed.technique
        : context.knownTechniques[0] || 'create';

      // Validate form
      const validForms: MagicForm[] = [
        'fire', 'water', 'earth', 'air', 'body', 'mind', 'spirit',
        'plant', 'animal', 'image', 'void', 'time', 'space', 'metal'
      ];
      const form = validForms.includes(parsed.form)
        ? parsed.form
        : context.knownForms[0] || 'fire';

      return {
        id: `spell_${Date.now()}`,
        name: parsed.name,
        description: parsed.description,
        technique,
        form,
        school: parsed.school,
        manaCost: Math.max(10, Math.min(100, parsed.manaCost || 20)),
        castTime: Math.max(1, Math.min(10, parsed.castTime || 2)),
        range: Math.max(0, Math.min(20, parsed.range || 5)),
        duration: parsed.duration ? Math.max(1, Math.min(200, parsed.duration)) : undefined,
        effectType: parsed.effectType,
        effectStrength: Math.max(10, Math.min(100, parsed.effectStrength || 30)),
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        detectionRisk: parsed.detectionRisk || 'low',
        flavorText: parsed.flavorText,
      };
    } catch {
      return null;
    }
  }

  /**
   * Extract insight from failed experiment
   */
  private extractInsight(response: string, context: MagicExperimentContext): string {
    // Try to extract any useful text
    const lines = response.split('\n').filter(l => l.trim().length > 10);
    if (lines.length > 0) {
      return `Through experimentation with ${context.knownTechniques[0] || 'magic'} and ${context.knownForms[0] || 'arcane forces'}, ${context.mageName} gained understanding of magical limits.`;
    }
    return `${context.mageName} learned that not all magical combinations yield results.`;
  }

  /**
   * Check if spell is a variation of existing
   */
  private isVariation(spell: LLMGeneratedSpell, context: MagicExperimentContext): boolean {
    if (!context.knownSpells) return false;

    const nameLower = spell.name.toLowerCase();
    return context.knownSpells.some(known => {
      const knownLower = known.toLowerCase();
      return nameLower.includes(knownLower) || knownLower.includes(nameLower);
    });
  }

  /**
   * Calculate creativity score
   */
  private calculateCreativityScore(spell: LLMGeneratedSpell, context: MagicExperimentContext): number {
    let score = 0.5;

    // Higher effect strength = more impressive
    score += (spell.effectStrength / 100) * 0.2;

    // Longer duration spells are harder to invent
    if (spell.duration && spell.duration > 50) {
      score += 0.1;
    }

    // Uses uncommon forms
    const uncommonForms: MagicForm[] = ['void', 'time', 'space', 'spirit'];
    if (uncommonForms.includes(spell.form)) {
      score += 0.15;
    }

    // Uses reagents = more experimental
    if (context.reagents && context.reagents.length > 0) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }
}

// Singleton instance
export const llmEffectGenerator = new LLMEffectGeneratorImpl();

/**
 * Get the effect generator instance
 */
export function getEffectGenerator(): LLMEffectGeneratorImpl {
  return llmEffectGenerator;
}
