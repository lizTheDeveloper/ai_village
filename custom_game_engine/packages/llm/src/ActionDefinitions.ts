/**
 * Shared action definitions for LLM agent behaviors.
 *
 * This is the SINGLE SOURCE OF TRUTH for valid agent actions.
 * Both ResponseParser and StructuredPromptBuilder use these definitions.
 */

import type { AgentBehavior } from '@ai-village/core';
import actionDefinitionsData from '../data/action-definitions.json';

/**
 * Skill requirement for Progressive Skill Reveal System.
 */
export interface ActionSkillRequirement {
  skill: 'building' | 'farming' | 'gathering' | 'cooking' | 'crafting' | 'social' | 'exploration' | 'combat' | 'animal_handling' | 'medicine' | 'research' | 'magic';
  level: 0 | 1 | 2 | 3 | 4 | 5;
}

/**
 * Action definition with behavior name and description for LLM prompts.
 */
export interface ActionDefinition {
  /** The canonical behavior name that maps to a behavior handler */
  behavior: AgentBehavior;
  /** Description shown in LLM prompts */
  description: string;
  /** Whether this action is always shown or contextually conditional */
  alwaysAvailable: boolean;
  /** Category for grouping */
  category: 'movement' | 'social' | 'building' | 'farming' | 'gathering' | 'exploration' | 'survival' | 'animal' | 'priority' | 'knowledge' | 'meta' | 'magic';
  /** Skill requirement (optional - undefined means no skill required) */
  skillRequired?: ActionSkillRequirement;
}

/**
 * All valid agent actions with their descriptions.
 * ResponseParser validates against these behaviors.
 * StructuredPromptBuilder uses descriptions for prompts.
 *
 * Loaded from ../data/action-definitions.json
 */
export const ACTION_DEFINITIONS: ActionDefinition[] = actionDefinitionsData.actions as ActionDefinition[];

// NOTE: 'wander', 'idle', 'rest', 'seek_sleep', 'seek_warmth' are NOT included here.
// These are autonomic/fallback behaviors, not executive decisions for the LLM to make.
// When the agent has nothing specific to do, they default to wandering.

/**
 * Set of all valid behavior names.
 * Used by ResponseParser for validation.
 */
export const VALID_BEHAVIORS: Set<string> = new Set(
  ACTION_DEFINITIONS.map(def => def.behavior)
);

/**
 * Map of behavior names to their descriptions.
 */
export const BEHAVIOR_DESCRIPTIONS: Map<string, string> = new Map(
  ACTION_DEFINITIONS.map(def => [def.behavior, def.description])
);

/**
 * Synonym mapping - maps user-friendly terms to canonical behaviors.
 * Loaded from ../data/action-definitions.json
 */
export const BEHAVIOR_SYNONYMS: Record<string, AgentBehavior> = actionDefinitionsData.synonyms as Record<string, AgentBehavior>;

