/**
 * IntelligenceLLMAdapter
 *
 * Converts IntelligenceComponent stats to LLM configuration.
 * Bridges the three-dimensional intelligence stat (modelQuality, thinkingDepth,
 * thinkingFrequency) to the CustomLLMConfig and cooldown systems.
 *
 * See: openspec/changes/intelligence-stat-system/proposal.md
 */

import type { CustomLLMConfig } from '@ai-village/types';
import type { IntelligenceTier } from './ModelTiers.js';

/**
 * Map modelQuality (1-10) to an IntelligenceTier string.
 */
export function modelQualityToTier(modelQuality: number): IntelligenceTier {
  if (modelQuality <= 3) return 'simple';
  if (modelQuality <= 7) return 'default';
  if (modelQuality <= 9) return 'high';
  return 'agi';
}

/**
 * Map thinkingDepth (1-10) to a maxTokens budget.
 *
 * Token ranges:
 * - 1-2: 200-500  (quick reactions, minimal planning)
 * - 3-4: 500-1000 (basic reasoning)
 * - 5-6: 1000-2000 (considers multiple options)
 * - 7-8: 2000-4000 (short-term planning)
 * - 9-10: 4000-8000 (deep analysis, long-term planning)
 */
export function thinkingDepthToMaxTokens(thinkingDepth: number): number {
  if (thinkingDepth <= 2) return 350;    // midpoint 200-500
  if (thinkingDepth <= 4) return 750;    // midpoint 500-1000
  if (thinkingDepth <= 6) return 1500;   // midpoint 1000-2000
  if (thinkingDepth <= 8) return 3000;   // midpoint 2000-4000
  return 6000;                            // midpoint 4000-8000
}

/**
 * Map thinkingFrequency (1-10) to a cooldown duration in seconds.
 *
 * Interval ranges:
 * - 1-2: 60-120 seconds (very slow, background NPC)
 * - 3-4: 30-60 seconds (slow, low awareness)
 * - 5-6: 15-30 seconds (moderate, default)
 * - 7-8: 5-15 seconds (alert, responsive)
 * - 9-10: 2-5 seconds (hyper-aware)
 */
export function thinkingFrequencyToCooldownSecs(thinkingFrequency: number): number {
  if (thinkingFrequency <= 2) return 90;   // midpoint 60-120
  if (thinkingFrequency <= 4) return 45;   // midpoint 30-60
  if (thinkingFrequency <= 6) return 22;   // midpoint 15-30
  if (thinkingFrequency <= 8) return 10;   // midpoint 5-15
  return 3;                                 // midpoint 2-5
}

/**
 * Convert an IntelligenceComponent-like object to a CustomLLMConfig.
 *
 * This creates per-agent LLM configuration that overrides global settings.
 * The returned config sets:
 * - `tier`: model quality level ('simple' | 'default' | 'high' | 'agi')
 * - `maxTokens` (via metadata): token budget per decision
 *
 * Usage:
 * ```typescript
 * const intel = agent.getComponent<IntelligenceComponent>('intelligence');
 * if (intel) {
 *   agentComponent.customLLMConfig = intelligenceToLLMConfig(intel);
 * }
 * ```
 */
export function intelligenceToLLMConfig(intel: {
  modelQuality: number;
  thinkingDepth: number;
}): CustomLLMConfig {
  return {
    tier: modelQualityToTier(intel.modelQuality),
  };
}

/**
 * Summarize an intelligence profile as a human-readable string.
 * Useful for UI display and admin dashboards.
 */
export function describeIntelligence(intel: {
  modelQuality: number;
  thinkingDepth: number;
  thinkingFrequency: number;
}): string {
  const tier = modelQualityToTier(intel.modelQuality);
  const tokens = thinkingDepthToMaxTokens(intel.thinkingDepth);
  const cooldown = thinkingFrequencyToCooldownSecs(intel.thinkingFrequency);

  return `tier=${tier} tokens=${tokens} interval=${cooldown}s [mq=${intel.modelQuality} td=${intel.thinkingDepth} tf=${intel.thinkingFrequency}]`;
}
