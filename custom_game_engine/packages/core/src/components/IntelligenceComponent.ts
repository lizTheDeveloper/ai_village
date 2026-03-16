/**
 * IntelligenceComponent - Three-dimensional intelligence stat for AI agents
 *
 * Controls LLM model quality, thinking depth (token budget), and decision frequency.
 * Immutable after creation. Set during agent spawn; can be overridden by game events.
 *
 * See: openspec/changes/intelligence-stat-system/proposal.md
 */

import { ComponentBase } from '../ecs/Component.js';

/**
 * Three-dimensional intelligence stat.
 * All values are on a 1-10 scale.
 */
export interface Intelligence {
  /**
   * 1-10: Controls which LLM model tier is used for this agent.
   * - 1-3: simple tier (fast, low capability)
   * - 4-7: default tier (balanced)
   * - 8-9: high tier (deep reasoning)
   * - 10: agi tier (frontier models, expensive)
   */
  modelQuality: number;

  /**
   * 1-10: Controls max token budget per LLM decision.
   * - 1-2: 200-500 tokens (quick reactions)
   * - 3-4: 500-1000 tokens (basic reasoning)
   * - 5-6: 1000-2000 tokens (multiple options)
   * - 7-8: 2000-4000 tokens (short-term planning)
   * - 9-10: 4000-8000 tokens (deep analysis)
   */
  thinkingDepth: number;

  /**
   * 1-10: Controls decision frequency (how often the agent thinks).
   * - 1-2: 60-120 seconds between decisions
   * - 3-4: 30-60 seconds
   * - 5-6: 15-30 seconds
   * - 7-8: 5-15 seconds
   * - 9-10: 2-5 seconds (hyper-aware)
   */
  thinkingFrequency: number;
}

/**
 * IntelligenceComponent - attached to agents that use LLM decision making.
 * Stored as an immutable stat; use createIntelligenceComponent to create.
 */
export class IntelligenceComponent extends ComponentBase {
  public readonly type = 'intelligence';

  public readonly modelQuality: number;
  public readonly thinkingDepth: number;
  public readonly thinkingFrequency: number;

  constructor(intel: Intelligence) {
    super();
    if (intel.modelQuality < 1 || intel.modelQuality > 10) {
      throw new Error(`IntelligenceComponent: modelQuality must be 1-10, got ${intel.modelQuality}`);
    }
    if (intel.thinkingDepth < 1 || intel.thinkingDepth > 10) {
      throw new Error(`IntelligenceComponent: thinkingDepth must be 1-10, got ${intel.thinkingDepth}`);
    }
    if (intel.thinkingFrequency < 1 || intel.thinkingFrequency > 10) {
      throw new Error(`IntelligenceComponent: thinkingFrequency must be 1-10, got ${intel.thinkingFrequency}`);
    }
    this.modelQuality = intel.modelQuality;
    this.thinkingDepth = intel.thinkingDepth;
    this.thinkingFrequency = intel.thinkingFrequency;
  }

  /**
   * Derived overall intelligence score (simple average, 1-10).
   */
  get overallScore(): number {
    return Math.round((this.modelQuality + this.thinkingDepth + this.thinkingFrequency) / 3);
  }
}

/**
 * Create an IntelligenceComponent with validated values.
 */
export function createIntelligenceComponent(intel: Intelligence): IntelligenceComponent {
  return new IntelligenceComponent(intel);
}

/**
 * Generate a random intelligence stat for first-generation agents.
 * Uses a slightly bell-curved distribution (average agents most common).
 */
export function generateBaseIntelligence(): Intelligence {
  return {
    modelQuality: randomIntelligenceStat(),
    thinkingDepth: randomIntelligenceStat(),
    thinkingFrequency: randomIntelligenceStat(),
  };
}

/**
 * Generate a bell-curved intelligence value (1-10).
 * Average (4-6) is most common; extremes are rare.
 */
function randomIntelligenceStat(): number {
  // Sum two uniform [1,5] samples → center around 5-6, range 2-10
  const a = Math.floor(Math.random() * 5) + 1;
  const b = Math.floor(Math.random() * 5) + 1;
  return Math.min(10, Math.max(1, a + b - 1));
}

/**
 * Inherit an intelligence stat from two parents with epigenetic influence.
 * Averages parent stats, applies life-quality bias, and adds mutation variance.
 */
export function inheritIntelligenceStat(
  parent1Stat: number,
  parent2Stat: number,
  lifeQualityBias: number = 0,  // -2 to +2 based on parents' life conditions
  mutationVariance: number = 1  // 0 to 4 based on stress/hardship
): number {
  const average = (parent1Stat + parent2Stat) / 2;
  const mutation = gaussianRandom(lifeQualityBias, mutationVariance);
  return Math.min(10, Math.max(1, Math.round(average + mutation)));
}

/**
 * Box-Muller transform for normally-distributed random numbers.
 */
function gaussianRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z;
}
