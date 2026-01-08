/**
 * Shared action definitions for LLM agent behaviors.
 *
 * This is the SINGLE SOURCE OF TRUTH for valid agent actions.
 * Both ResponseParser and StructuredPromptBuilder use these definitions.
 */

import type { AgentBehavior } from '@ai-village/core';

/**
 * Skill requirement for Progressive Skill Reveal System.
 */
export interface ActionSkillRequirement {
  skill: 'building' | 'farming' | 'gathering' | 'cooking' | 'crafting' | 'social' | 'exploration' | 'combat' | 'animal_handling' | 'medicine' | 'research';
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
  category: 'movement' | 'social' | 'building' | 'farming' | 'gathering' | 'exploration' | 'survival' | 'animal' | 'priority' | 'knowledge';
  /** Skill requirement (optional - undefined means no skill required) */
  skillRequired?: ActionSkillRequirement;
}

/**
 * All valid agent actions with their descriptions.
 * ResponseParser validates against these behaviors.
 * StructuredPromptBuilder uses descriptions for prompts.
 */
export const ACTION_DEFINITIONS: ActionDefinition[] = [
  // NOTE: 'wander', 'idle', 'rest', 'seek_sleep', 'seek_warmth' are NOT included here.
  // These are autonomic/fallback behaviors, not executive decisions for the LLM to make.
  // When the agent has nothing specific to do, they default to wandering.

  // Gathering - agent decides WHAT to collect
  { behavior: 'pick', description: 'Pick up a single item nearby', alwaysAvailable: true, category: 'gathering' },
  { behavior: 'gather', description: 'Stockpile resources - gather a specified amount and store in chest', alwaysAvailable: true, category: 'gathering' },

  // Social - agent decides WHO to interact with
  { behavior: 'talk', description: 'Have a conversation', alwaysAvailable: false, category: 'social' },
  { behavior: 'follow_agent', description: 'Follow someone', alwaysAvailable: false, category: 'social' },
  { behavior: 'call_meeting', description: 'Call a meeting to discuss something', alwaysAvailable: false, category: 'social' },
  { behavior: 'attend_meeting', description: 'Attend an ongoing meeting', alwaysAvailable: false, category: 'social' },
  { behavior: 'help', description: 'Help another agent with their task', alwaysAvailable: false, category: 'social' },

  // Building - agent decides WHAT to build
  { behavior: 'build', description: 'Construct a building', alwaysAvailable: true, category: 'building', skillRequired: { skill: 'building', level: 1 } },
  // plan_build has NO skill requirement - it's the beginner-friendly way to build
  // The system handles gathering resources automatically
  { behavior: 'plan_build', description: 'Plan and queue a building project (auto-gathers resources)', alwaysAvailable: true, category: 'building' },

  // Farming - agent decides to work the land
  { behavior: 'till', description: 'Prepare soil for planting', alwaysAvailable: true, category: 'farming', skillRequired: { skill: 'farming', level: 1 } },
  { behavior: 'farm', description: 'Work on farming tasks', alwaysAvailable: true, category: 'farming', skillRequired: { skill: 'farming', level: 1 } },
  { behavior: 'plant', description: 'Plant seeds in tilled soil', alwaysAvailable: false, category: 'farming', skillRequired: { skill: 'farming', level: 1 } },

  // Exploration - systematic exploration of unknown areas
  { behavior: 'explore', description: 'Systematically explore unknown areas to find new resources', alwaysAvailable: true, category: 'exploration' },

  // Research - conduct research to unlock new technologies
  { behavior: 'research', description: 'Conduct research at a research building to unlock new technologies', alwaysAvailable: false, category: 'knowledge', skillRequired: { skill: 'research', level: 1 } },

  // Animal Husbandry - agent decides to work with animals
  { behavior: 'tame_animal', description: 'Approach and tame a wild animal', alwaysAvailable: true, category: 'animal', skillRequired: { skill: 'animal_handling', level: 2 } },
  { behavior: 'house_animal', description: 'Lead a tamed animal to its housing', alwaysAvailable: true, category: 'animal', skillRequired: { skill: 'animal_handling', level: 2 } },

  // Hunting & Butchering - agent hunts wild animals or processes tame animals
  { behavior: 'hunt', description: 'Hunt a wild animal for meat and resources', alwaysAvailable: false, category: 'animal', skillRequired: { skill: 'combat', level: 1 } },
  { behavior: 'butcher', description: 'Butcher a tame animal at butchering table (requires cooking level 1)', alwaysAvailable: false, category: 'animal', skillRequired: { skill: 'cooking', level: 1 } },

  // Combat - agent initiates combat with another agent
  { behavior: 'initiate_combat', description: 'Challenge another agent to combat (lethal or non-lethal)', alwaysAvailable: false, category: 'social', skillRequired: { skill: 'combat', level: 1 } },

  // Priority Management - agent decides what to focus on
  { behavior: 'set_priorities', description: 'Set task priorities (gathering, building, farming, social)', alwaysAvailable: true, category: 'priority' },

  // Goal Setting - Talker layer actions for setting goals
  { behavior: 'set_personal_goal', description: 'Set a new personal goal', alwaysAvailable: true, category: 'priority' },
  { behavior: 'set_medium_term_goal', description: 'Set a goal for the next few days', alwaysAvailable: true, category: 'priority' },
  { behavior: 'set_group_goal', description: 'Propose a goal for the village', alwaysAvailable: false, category: 'priority' },
];

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
 */
export const BEHAVIOR_SYNONYMS: Record<string, AgentBehavior> = {
  // Pick = single item pickup
  'get': 'pick',
  'take': 'pick',
  'grab': 'pick',

  // Gather = stockpile with amount, auto-deposits to storage
  'stockpile': 'gather',
  'collect': 'gather',
  'harvest': 'gather',
  'forage': 'gather',
  'scavenge': 'gather',
  'hoard': 'gather',
  'seek_food': 'gather',
  'gather_seeds': 'gather',

  // NOTE: 'sleep', 'nap', 'rest' are NOT valid LLM actions - sleep is autonomic

  // Talk synonyms
  'speak': 'talk',
  'chat': 'talk',
  'converse': 'talk',
  'greet': 'talk',
  'say': 'talk',

  // Exploration synonyms - use dedicated explore behavior
  'search': 'explore',
  'scout': 'explore',
  'investigate': 'explore',
  'look_around': 'explore',

  // Build synonyms
  'construct': 'build',
  'make': 'build',
  'create': 'build',

  // Follow synonyms
  'follow': 'follow_agent',

  // NOTE: 'wander', 'idle' are NOT valid LLM actions - they are fallback behaviors.
  // Navigation/wait synonyms removed since agents shouldn't explicitly choose to wander/idle.

  // Farming synonyms
  'water': 'farm',
  'fertilize': 'farm',
  'tend': 'farm',
  'cultivate': 'farm',
  'sow': 'plant',
  'seed': 'plant',
  'plow': 'till',
  'prepare_soil': 'till',

  // NOTE: Survival synonyms (seek_warmth, seek_sleep) removed - these are autonomic behaviors

  // Animal synonyms
  'tame': 'tame_animal',
  'befriend': 'tame_animal',
  'house': 'house_animal',
  'shelter_animal': 'house_animal',

  // Hunting & Butchering synonyms
  'track': 'hunt',
  'stalk': 'hunt',
  'kill': 'hunt',
  'slaughter': 'butcher',
  'process_animal': 'butcher',

  // Combat synonyms
  'fight': 'initiate_combat',
  'attack': 'initiate_combat',
  'challenge': 'initiate_combat',
  'confront': 'initiate_combat',
  'duel': 'initiate_combat',
  'combat': 'initiate_combat',

  // Priority synonyms
  'prioritize': 'set_priorities',
  'focus': 'set_priorities',

  // Research synonyms
  'study': 'research',
  'experiment': 'research',
  'analyze': 'research',
};

