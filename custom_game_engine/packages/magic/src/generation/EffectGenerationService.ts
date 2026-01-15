/**
 * EffectGenerationService - LLM-powered spell effect generation
 *
 * This service converts natural language descriptions into safe EffectExpression JSON.
 * It uses few-shot learning and security constraints to guide the LLM.
 *
 * Architecture: Phase 33 - Safe LLM Effect Generation
 * See: packages/magic/PHASE_33_ARCHITECTURE.md
 */

import type { LLMProvider, LLMRequest, LLMResponse } from '@ai-village/llm';
import type { EffectExpression } from '../EffectExpression.js';

export interface EffectGenerationRequest {
  /** Natural language description of desired effect */
  spellName: string;

  /** Detailed description of what the spell should do */
  description: string;

  /** Magic paradigm context (optional) */
  paradigm?: string;

  /** Target type hint (optional) */
  targetType?: 'self' | 'single' | 'area' | 'cone' | 'line' | 'chain';

  /** Intended power level (optional) */
  intendedPowerLevel?: 'weak' | 'moderate' | 'strong' | 'epic';

  /** Temperature for LLM generation (default: 0.7) */
  temperature?: number;

  /** Max tokens for response (default: 2000) */
  maxTokens?: number;
}

export interface EffectGenerationResult {
  /** Whether generation succeeded */
  success: boolean;

  /** Generated effect (only if success=true and parsing succeeded) */
  effect?: EffectExpression;

  /** Raw LLM response text */
  rawResponse?: string;

  /** Error message (if success=false) */
  error?: string;

  /** Parse error (if LLM returned invalid JSON) */
  parseError?: string;

  /** Token usage */
  tokensUsed?: number;

  /** Cost in USD */
  costUSD?: number;

  /** Provider used */
  provider?: string;
}

/**
 * EffectGenerationService
 *
 * Generates EffectExpression JSON from natural language using LLMs.
 *
 * Usage:
 * ```typescript
 * const service = new EffectGenerationService(llmProvider);
 * const result = await service.generate({
 *   spellName: 'Fireball',
 *   description: 'Launch a ball of fire that explodes on impact',
 *   targetType: 'area',
 *   intendedPowerLevel: 'moderate'
 * });
 *
 * if (result.success && result.effect) {
 *   // Proceed to validation
 * }
 * ```
 */
export class EffectGenerationService {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * Generate an EffectExpression from natural language.
   *
   * Returns a result object with success flag. Check result.success before
   * using result.effect. Even successful generations may produce invalid
   * effects - validation happens in the next pipeline stage.
   */
  async generate(request: EffectGenerationRequest): Promise<EffectGenerationResult> {
    try {
      // Build LLM prompt
      const prompt = this.buildPrompt(request);

      // Call LLM
      const llmRequest: LLMRequest = {
        prompt,
        temperature: request.temperature ?? 0.7,
        maxTokens: request.maxTokens ?? 2000,
        stopSequences: ['\n\n---', '\n\nEXAMPLE:', '\n\nCONSTRAINTS:'],
      };

      const response: LLMResponse = await this.llmProvider.generate(llmRequest);

      // Parse response
      const effect = this.parseResponse(response.text);

      if (!effect) {
        return {
          success: false,
          rawResponse: response.text,
          parseError: 'Failed to parse JSON from LLM response',
          tokensUsed: response.inputTokens + response.outputTokens,
          costUSD: response.costUSD,
          provider: this.llmProvider.getProviderId(),
        };
      }

      return {
        success: true,
        effect,
        rawResponse: response.text,
        tokensUsed: response.inputTokens + response.outputTokens,
        costUSD: response.costUSD,
        provider: this.llmProvider.getProviderId(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build the LLM prompt for effect generation.
   *
   * Includes:
   * - System instructions
   * - EffectExpression schema overview
   * - Few-shot examples
   * - Security constraints
   * - User request
   */
  private buildPrompt(request: EffectGenerationRequest): string {
    const powerLevelHint = this.getPowerLevelHint(request.intendedPowerLevel);
    const targetHint = this.getTargetHint(request.targetType);
    const paradigmHint = this.getParadigmHint(request.paradigm);

    return `You are a spell effect designer. Generate an EffectExpression in JSON format for a magic spell.

EffectExpression is a safe, declarative format for spell effects. It uses:
- Targeting: self, single, area, cone, line
- Operations: modify_stat, deal_damage, heal, apply_status, spawn_entity, etc.
- Expressions: Math operations, variable references (e.g., "caster.intelligence")
- Timing: immediate, delayed, periodic

SCHEMA:
\`\`\`typescript
interface EffectExpression {
  name: string;
  description: string;
  target: {
    type: 'self' | 'single' | 'area' | 'cone' | 'line' | 'all';
    radius?: number;
    angle?: number;
    length?: number;
    maxTargets?: number;
    filter?: {
      entityTypes?: string[];
      factions?: string[];
    };
  };
  operations: Array<
    | { op: 'deal_damage'; damageType: DamageType; amount: Expression }
    | { op: 'heal'; amount: Expression }
    | { op: 'modify_stat'; stat: string; amount: Expression; duration?: number }
    | { op: 'apply_status'; status: string; duration: number; stacks?: number }
    | { op: 'spawn_entity'; entityType: string; count: Expression; at?: LocationExpression }
    | { op: 'push'; direction: DirectionExpression; distance: Expression }
    | { op: 'teleport'; destination: LocationExpression }
    // ... more operations
  >;
  timing: {
    type: 'immediate' | 'delayed' | 'periodic';
    delay?: number;
    interval?: number;
    duration?: number;
  };
}

type Expression = number | string | BinaryExpression | FunctionExpression;
type DamageType = 'physical' | 'fire' | 'ice' | 'lightning' | 'poison' | 'holy' | 'unholy';
\`\`\`

EXAMPLES:

Example 1: Simple damage spell
\`\`\`json
{
  "name": "Magic Missile",
  "description": "Fires a magical projectile that never misses",
  "target": {
    "type": "single"
  },
  "operations": [
    {
      "op": "deal_damage",
      "damageType": "force",
      "amount": {
        "op": "+",
        "left": 10,
        "right": { "fn": "get_stat", "args": ["caster.intelligence"] }
      }
    }
  ],
  "timing": {
    "type": "immediate"
  }
}
\`\`\`

Example 2: Area effect with status
\`\`\`json
{
  "name": "Frost Nova",
  "description": "Freezes all enemies in a large radius",
  "target": {
    "type": "area",
    "radius": 15,
    "filter": {
      "factions": ["hostile"]
    }
  },
  "operations": [
    {
      "op": "deal_damage",
      "damageType": "ice",
      "amount": 30
    },
    {
      "op": "apply_status",
      "status": "frozen",
      "duration": 3,
      "stacks": 1
    }
  ],
  "timing": {
    "type": "immediate"
  }
}
\`\`\`

Example 3: Buff spell with duration
\`\`\`json
{
  "name": "Stone Skin",
  "description": "Hardens the caster's skin, reducing incoming damage",
  "target": {
    "type": "self"
  },
  "operations": [
    {
      "op": "modify_stat",
      "stat": "defense",
      "amount": 20,
      "duration": 10
    },
    {
      "op": "apply_status",
      "status": "stone_skin",
      "duration": 10
    }
  ],
  "timing": {
    "type": "immediate"
  }
}
\`\`\`

CONSTRAINTS:
- Maximum 10 operations per effect
- Damage cap: 10000 (typical spells: 10-500)
- Spawn cap: 50 entities
- No recursive effects
- Use valid stat names: health, mana, stamina, strength, intelligence, defense, speed
- Use valid status names: burning, frozen, poisoned, stunned, blessed, cursed, invisible
- Use valid entity types: fire_elemental, ice_shard, magic_shield, healing_orb
- Duration/delay in ticks (1 tick = 50ms)
- Area radius: 1-50 units (typical: 5-20)

${paradigmHint}
${targetHint}
${powerLevelHint}

USER REQUEST:
Spell Name: "${request.spellName}"
Description: "${request.description}"

RESPOND WITH ONLY THE JSON OBJECT (no markdown, no explanation):`;
  }

  /**
   * Parse the LLM response into an EffectExpression.
   *
   * Handles various response formats:
   * - Plain JSON
   * - JSON in markdown code block
   * - JSON with extra whitespace/text
   */
  private parseResponse(response: string): EffectExpression | null {
    try {
      // Try parsing as-is
      return JSON.parse(response) as EffectExpression;
    } catch {
      // Try extracting from markdown code block
      const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          return JSON.parse(codeBlockMatch[1]) as EffectExpression;
        } catch {
          // Failed to parse code block
        }
      }

      // Try finding first { ... } object
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as EffectExpression;
        } catch {
          // Failed to parse extracted object
        }
      }

      return null;
    }
  }

  /**
   * Get power level hint for the prompt
   */
  private getPowerLevelHint(powerLevel?: string): string {
    if (!powerLevel) return '';

    const hints = {
      weak: 'POWER LEVEL: Weak (damage ~10-30, small radius ~3-8)',
      moderate: 'POWER LEVEL: Moderate (damage ~30-100, medium radius ~8-15)',
      strong: 'POWER LEVEL: Strong (damage ~100-300, large radius ~15-25)',
      epic: 'POWER LEVEL: Epic (damage ~300-500, huge radius ~25-40)',
    };

    return hints[powerLevel as keyof typeof hints] || '';
  }

  /**
   * Get target type hint for the prompt
   */
  private getTargetHint(targetType?: string): string {
    if (!targetType) return '';

    const hints = {
      self: 'TARGET: Self (affects only the caster)',
      single: 'TARGET: Single (affects one target)',
      area: 'TARGET: Area (affects all entities in a radius)',
      cone: 'TARGET: Cone (affects entities in a cone shape)',
      line: 'TARGET: Line (affects entities in a line)',
      chain: 'TARGET: Chain (bounces between multiple targets)',
    };

    return hints[targetType as keyof typeof hints] || '';
  }

  /**
   * Get paradigm hint for the prompt
   */
  private getParadigmHint(paradigm?: string): string {
    if (!paradigm) return '';

    const hints: Record<string, string> = {
      academic: 'PARADIGM: Academic (precise, mathematical, scholarly)',
      divine: 'PARADIGM: Divine (holy/unholy, righteous, prayers)',
      elemental: 'PARADIGM: Elemental (fire, water, earth, air)',
      shamanic: 'PARADIGM: Shamanic (nature spirits, totems, rituals)',
      necromancy: 'PARADIGM: Necromancy (death, undead, life force)',
      illusion: 'PARADIGM: Illusion (deception, invisibility, mental)',
      transmutation: 'PARADIGM: Transmutation (transformation, alchemy)',
    };

    return hints[paradigm] || `PARADIGM: ${paradigm}`;
  }
}
