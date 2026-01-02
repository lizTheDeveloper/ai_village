/**
 * LLM Technology Generator
 *
 * Allows agents to dynamically propose NEW research topics using LLM creativity.
 * Researchers can discover new technologies based on:
 * - Their field expertise and skills
 * - Materials they've been experimenting with
 * - Their personality and interests
 * - Existing knowledge in the world
 *
 * Generated technologies go through divine scrutiny before being added to the tech tree.
 */

import type { ResearchDefinition, ResearchField, ResearchUnlock } from './types.js';

/**
 * LLM Provider interface for technology generation
 */
export interface TechnologyLLMProvider {
  generate(request: { prompt: string; temperature?: number; maxTokens?: number }): Promise<{ text: string }>;
  getModelName(): string;
  isAvailable(): Promise<boolean>;
}

/**
 * Context for technology invention
 */
export interface TechnologyInventionContext {
  /** Researcher's name */
  researcherName: string;
  /** Researcher's entity ID */
  researcherId: string;
  /** Researcher's personality traits */
  personality?: {
    openness?: number;
    conscientiousness?: number;
    curiosity?: number;
  };
  /** Researcher's skill levels */
  skills?: Record<string, number>;
  /** Primary research field */
  field: ResearchField;
  /** Materials being experimented with */
  materials: Array<{ itemId: string; quantity: number }>;
  /** Existing research the agent has completed */
  completedResearch?: string[];
  /** Current world technologies for context */
  existingTechnologies?: string[];
  /** Any insights gained from experiments */
  insights?: string[];
}

/**
 * Result of a technology invention attempt
 */
export interface TechnologyInventionResult {
  success: boolean;
  technology?: ResearchDefinition;
  message: string;
  creativityScore: number; // 0-1 how innovative the proposal was
}

/**
 * LLM-generated technology structure (before validation)
 */
interface LLMGeneratedTechnology {
  id: string;
  name: string;
  description: string;
  field: ResearchField;
  tier: number;
  progressRequired: number;
  prerequisites: string[];
  unlocks: Array<{
    type: 'recipe' | 'building' | 'item' | 'ability' | 'knowledge';
    id: string;
    name: string;
    description: string;
  }>;
  requiredBuilding?: string;
  requiredItems?: Array<{ itemId: string; amount: number }>;
}

/**
 * LLM Technology Generator
 */
class LLMTechnologyGeneratorImpl {
  private llmProvider: TechnologyLLMProvider | null = null;

  /**
   * Set the LLM provider
   */
  setProvider(provider: TechnologyLLMProvider): void {
    this.llmProvider = provider;
  }

  /**
   * Get the current provider
   */
  getProvider(): TechnologyLLMProvider | null {
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
   * Generate a new technology based on context
   */
  async inventTechnology(context: TechnologyInventionContext): Promise<TechnologyInventionResult> {
    if (!this.llmProvider) {
      return {
        success: false,
        message: 'No LLM provider configured for technology generation',
        creativityScore: 0,
      };
    }

    const prompt = this.buildInventionPrompt(context);

    try {
      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.8, // Creative but coherent
        maxTokens: 800,
      });

      const parsed = this.parseResponse(response.text, context);
      if (!parsed) {
        return {
          success: false,
          message: 'Failed to parse LLM response into valid technology',
          creativityScore: 0,
        };
      }

      // Create the ResearchDefinition
      const technology: ResearchDefinition = {
        id: `generated_${context.field}_${Date.now()}`,
        name: parsed.name,
        description: parsed.description,
        field: parsed.field,
        tier: parsed.tier,
        progressRequired: parsed.progressRequired,
        prerequisites: parsed.prerequisites,
        unlocks: parsed.unlocks.map(u => ({
          type: u.type as ResearchUnlock['type'],
          [`${u.type}Id`]: u.id,
        } as ResearchUnlock)),
        requiredBuilding: parsed.requiredBuilding,
        requiredItems: parsed.requiredItems,
        type: 'generated',
        generationContext: {
          generatedBy: context.researcherId,
          generatedAt: Date.now(),
          inputMaterials: context.materials.map(m => ({ itemId: m.itemId, amount: m.quantity })),
          researcherPersonality: context.personality ? JSON.stringify(context.personality) : undefined,
          researcherSkills: context.skills,
          fieldFocus: context.field,
        },
      };

      // Calculate creativity score based on novelty
      const creativityScore = this.calculateCreativityScore(parsed, context);

      return {
        success: true,
        technology,
        message: `${context.researcherName} has proposed a new ${context.field} technology: "${parsed.name}"`,
        creativityScore,
      };
    } catch (error) {
      return {
        success: false,
        message: `Technology generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        creativityScore: 0,
      };
    }
  }

  /**
   * Build the prompt for technology invention
   */
  private buildInventionPrompt(context: TechnologyInventionContext): string {
    const materialsList = context.materials
      .map(m => `- ${m.quantity}x ${m.itemId}`)
      .join('\n');

    const skillsList = context.skills
      ? Object.entries(context.skills)
          .filter(([_, level]) => level > 0.5)
          .map(([skill, level]) => `- ${skill}: ${Math.round(level * 100)}%`)
          .join('\n')
      : 'No notable skills';

    const existingTech = context.existingTechnologies?.length
      ? context.existingTechnologies.slice(0, 10).join(', ')
      : 'Basic knowledge only';

    const completedResearch = context.completedResearch?.length
      ? context.completedResearch.slice(0, 5).join(', ')
      : 'None yet';

    const insights = context.insights?.length
      ? context.insights.map(i => `- ${i}`).join('\n')
      : 'No experimental insights yet';

    const personalityDesc = context.personality
      ? `Openness: ${Math.round((context.personality.openness || 0.5) * 100)}%, ` +
        `Curiosity: ${Math.round((context.personality.curiosity || 0.5) * 100)}%`
      : 'Average researcher';

    return `You are a research proposal generator for a village simulation game.

A researcher named "${context.researcherName}" is proposing a new technology in the field of ${context.field}.

RESEARCHER PROFILE:
Personality: ${personalityDesc}
Skills:
${skillsList}
Completed Research: ${completedResearch}

MATERIALS BEING EXPERIMENTED WITH:
${materialsList}

EXPERIMENTAL INSIGHTS:
${insights}

EXISTING TECHNOLOGIES IN WORLD:
${existingTech}

Generate a NEW technology proposal that:
1. Builds on the researcher's expertise and materials
2. Fits the ${context.field} research field
3. Is NOT a duplicate of existing technologies
4. Has clear, useful unlocks (recipes, buildings, abilities, or knowledge)
5. Makes logical sense given the inputs

Respond with ONLY valid JSON in this format:
{
  "name": "Technology Name",
  "description": "What this technology represents and enables",
  "field": "${context.field}",
  "tier": <1-5, based on complexity>,
  "progressRequired": <100-500, papers needed * 100>,
  "prerequisites": ["existing_tech_id"],
  "unlocks": [
    {
      "type": "recipe|building|item|ability|knowledge",
      "id": "unlock_id",
      "name": "What Gets Unlocked",
      "description": "What it does"
    }
  ],
  "requiredBuilding": "library|laboratory|workshop|null",
  "requiredItems": [{"itemId": "item", "amount": 1}]
}`;
  }

  /**
   * Parse LLM response into technology structure
   */
  private parseResponse(response: string, context: TechnologyInventionContext): LLMGeneratedTechnology | null {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.name || !parsed.description || !parsed.unlocks) {
        return null;
      }

      // Normalize field
      const validFields: ResearchField[] = [
        'agriculture', 'construction', 'crafting', 'metallurgy', 'alchemy',
        'textiles', 'cuisine', 'machinery', 'nature', 'society', 'arcane',
        'experimental', 'genetics'
      ];
      const field = validFields.includes(parsed.field) ? parsed.field : context.field;

      return {
        id: `gen_${field}_${Date.now()}`,
        name: parsed.name,
        description: parsed.description,
        field,
        tier: Math.max(1, Math.min(5, parsed.tier || 1)),
        progressRequired: Math.max(100, Math.min(500, parsed.progressRequired || 200)),
        prerequisites: Array.isArray(parsed.prerequisites) ? parsed.prerequisites : [],
        unlocks: Array.isArray(parsed.unlocks) ? parsed.unlocks : [],
        requiredBuilding: parsed.requiredBuilding || undefined,
        requiredItems: Array.isArray(parsed.requiredItems) ? parsed.requiredItems : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Calculate creativity score based on novelty and coherence
   */
  private calculateCreativityScore(tech: LLMGeneratedTechnology, context: TechnologyInventionContext): number {
    let score = 0.5; // Base score

    // Higher tier = more creative
    score += tech.tier * 0.05;

    // More unlocks = more impactful
    score += Math.min(0.2, tech.unlocks.length * 0.05);

    // Uses more materials = more experimental
    score += Math.min(0.1, context.materials.length * 0.02);

    // Researcher has high openness = more creative proposals
    if (context.personality?.openness && context.personality.openness > 0.7) {
      score += 0.1;
    }

    // Clamp to 0-1
    return Math.max(0, Math.min(1, score));
  }
}

// Singleton instance
export const llmTechnologyGenerator = new LLMTechnologyGeneratorImpl();

/**
 * Get the technology generator instance
 */
export function getTechnologyGenerator(): LLMTechnologyGeneratorImpl {
  return llmTechnologyGenerator;
}
