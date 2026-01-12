/**
 * Structured actions that agents can perform.
 * Based on agent-system/spec.md REQ-AGT-003
 */

import type { Position } from '../types.js';
import type { AgentBehavior } from '../components/AgentComponent.js';
import { BuildingType } from '../types/BuildingType.js';

export type AgentAction =
  // Movement
  | { type: 'move'; target: Position }
  | { type: 'wander' }
  | { type: 'follow'; targetId: string }
  // Navigation & Exploration (Phase 4.5)
  | { type: 'navigate'; target: Position }
  | { type: 'explore_frontier' }
  | { type: 'explore_spiral' }
  | { type: 'follow_gradient'; resourceType?: string }

  // Social
  | { type: 'talk'; targetId: string; topic?: string }
  | { type: 'help'; targetId: string }

  // Resource
  | { type: 'forage'; area?: Position }
  | { type: 'pickup'; itemId: string }
  | { type: 'eat'; itemId?: string }
  | { type: 'chop'; targetId: string } // Chop tree for wood
  | { type: 'mine'; targetId: string } // Mine rock for stone
  | { type: 'gather'; resourceType?: string } // Generic gather (maps to pick)

  // Building
  | { type: 'build'; buildingType: BuildingType; position: Position }
  | { type: 'construct'; buildingId: string } // Continue construction

  // Crafting (Phase 10)
  | { type: 'craft'; recipeId: string; quantity?: number } // Craft at station

  // Trading (Phase 12)
  | { type: 'trade'; shopId: string; itemId: string; quantity: number; subtype: 'buy' | 'sell' }

  // Farming (Phase 9)
  | { type: 'till'; position: Position } // Till grass to make plantable
  | { type: 'water'; position: Position } // Water a tile
  | { type: 'fertilize'; position: Position; fertilizerType: string } // Apply fertilizer
  | { type: 'plant'; position: Position; seedType: string } // Plant a seed
  | { type: 'harvest'; position: Position } // Harvest a crop
  | { type: 'gather_seeds'; plantId: string } // Gather seeds from wild plant

  // Goal setting
  | { type: 'set_personal_goal'; goal: string } // Set short-term personal goal
  | { type: 'set_medium_term_goal'; goal: string } // Set medium-term personal goal
  | { type: 'set_group_goal'; goal: string } // Set agent's view of group goal

  // Queue management
  | { type: 'sleep_until_queue_complete' } // Pause executor until task queue is empty

  // Rest
  | { type: 'idle' }
  | { type: 'rest' };

// ============================================================================
// KEYWORD PATTERN DEFINITIONS
// ============================================================================

type ActionFactory = (cleaned: string) => AgentAction;

interface KeywordPattern {
  keywords: string[];
  /** Keywords that should NOT match (exclusions) */
  exclude?: string[];
  factory: ActionFactory;
}

// Ordered by priority - more specific patterns first
const KEYWORD_PATTERNS: KeywordPattern[] = [
  // Navigation - check before generic 'explore'
  {
    keywords: ['navigate', 'go to'],
    factory: (cleaned) => {
      const coordMatch = cleaned.match(/(?:navigate\s+to|go\s+to)\s*(-?\d+)\s*,\s*(-?\d+)/);
      if (coordMatch?.[1] && coordMatch[2]) {
        return { type: 'navigate', target: { x: parseInt(coordMatch[1], 10), y: parseInt(coordMatch[2], 10) } };
      }
      return { type: 'navigate', target: { x: 0, y: 0 } };
    },
  },
  {
    keywords: ['explore_frontier', 'explore frontier'],
    factory: () => ({ type: 'explore_frontier' }),
  },
  {
    keywords: ['explore_spiral', 'explore spiral'],
    factory: () => ({ type: 'explore_spiral' }),
  },
  {
    keywords: ['follow_gradient', 'follow gradient'],
    factory: () => ({ type: 'follow_gradient' }),
  },
  {
    keywords: ['wander', 'explore'],
    factory: () => ({ type: 'wander' }),
  },

  // Social
  {
    keywords: ['talk', 'conversation', 'speak'],
    factory: () => ({ type: 'talk', targetId: 'nearest' }),
  },

  // Rest/Idle
  {
    keywords: ['rest', 'sleep'],
    factory: () => ({ type: 'rest' }),
  },
  {
    keywords: ['idle', 'wait', 'nothing'],
    factory: () => ({ type: 'idle' }),
  },

  // Food
  {
    keywords: ['eat', 'food', 'hungry'],
    factory: () => ({ type: 'eat' }),
  },

  // Resource gathering - specific types BEFORE generic 'gather'
  {
    keywords: ['chop', 'chopping', 'wood'],
    factory: () => ({ type: 'chop', targetId: 'nearest' }),
  },
  {
    keywords: ['mine', 'mining', 'stone'],
    factory: () => ({ type: 'mine', targetId: 'nearest' }),
  },
  {
    keywords: ['gather'],
    factory: () => ({ type: 'chop', targetId: 'nearest' }), // Default to chop
  },
  {
    keywords: ['forage', 'search'],
    factory: () => ({ type: 'forage' }),
  },
  {
    keywords: ['follow'],
    factory: () => ({ type: 'follow', targetId: 'nearest' }),
  },

  // Farming - specific actions
  {
    keywords: ['till', 'tilling', 'plow', 'plowing', 'prepare soil', 'prepare ground', 'prepare the soil', 'prepare the ground', 'preparing'],
    factory: () => ({ type: 'till', position: { x: 0, y: 0 } }),
  },
  {
    keywords: ['water'],
    exclude: ['gather'],
    factory: () => ({ type: 'water', position: { x: 0, y: 0 } }),
  },
  {
    keywords: ['fertilize'],
    factory: () => ({ type: 'fertilize', position: { x: 0, y: 0 }, fertilizerType: 'compost' }),
  },
  {
    keywords: ['plant'],
    exclude: ['plantable', 'prepare'],
    factory: () => ({ type: 'plant', position: { x: 0, y: 0 }, seedType: 'wheat' }),
  },
  {
    keywords: ['harvest'],
    factory: () => ({ type: 'harvest', position: { x: 0, y: 0 } }),
  },
  {
    keywords: ['gather_seeds', 'gather seeds'],
    factory: () => ({ type: 'gather_seeds', plantId: 'nearest' }),
  },

  // Building
  {
    keywords: ['build', 'construct'],
    factory: (cleaned) => ({
      type: 'build',
      buildingType: parseBuildingType(cleaned),
      position: { x: 0, y: 0 },
    }),
  },

  // Crafting
  {
    keywords: ['craft', 'make', 'create'],
    factory: (cleaned) => ({
      type: 'craft',
      recipeId: parseRecipeId(cleaned),
    }),
  },

  // Trading
  {
    keywords: ['buy', 'purchase'],
    factory: () => ({
      type: 'trade',
      shopId: 'nearest',
      itemId: 'wood',
      quantity: 1,
      subtype: 'buy',
    }),
  },
  {
    keywords: ['sell'],
    factory: () => ({
      type: 'trade',
      shopId: 'nearest',
      itemId: 'wood',
      quantity: 1,
      subtype: 'sell',
    }),
  },
];

// ============================================================================
// BUILDING TYPE PARSING
// ============================================================================

interface BuildingKeyword {
  keywords: string[];
  type: BuildingType;
}

const BUILDING_KEYWORDS: BuildingKeyword[] = [
  { keywords: ['campfire', 'fire'], type: BuildingType.Campfire },
  { keywords: ['storage', 'chest', 'box'], type: BuildingType.StorageChest },
  { keywords: ['bedroll'], type: BuildingType.Bedroll },
  { keywords: ['bed'], type: BuildingType.Bed },
  { keywords: ['workbench', 'work bench'], type: BuildingType.Workbench },
  { keywords: ['forge'], type: BuildingType.Forge },
  { keywords: ['well'], type: BuildingType.Well },
];

function parseBuildingType(cleaned: string): BuildingType {
  for (const { keywords, type } of BUILDING_KEYWORDS) {
    if (keywords.some((kw) => cleaned.includes(kw))) {
      return type;
    }
  }
  return BuildingType.Campfire; // fallback - most basic utility
}

// ============================================================================
// RECIPE ID PARSING
// ============================================================================

interface RecipeKeyword {
  keywords: string[];
  recipeId: string;
}

const RECIPE_KEYWORDS: RecipeKeyword[] = [
  { keywords: ['stone_axe', 'stone axe'], recipeId: 'stone_axe' },
  { keywords: ['iron_axe', 'iron axe'], recipeId: 'iron_axe' },
  { keywords: ['iron_pickaxe', 'iron pickaxe', 'pickaxe'], recipeId: 'iron_pickaxe' },
  { keywords: ['iron_sword', 'iron sword', 'sword'], recipeId: 'iron_sword' },
  { keywords: ['iron_ingot', 'iron ingot', 'smelt iron'], recipeId: 'iron_ingot' },
  { keywords: ['plank', 'planks', 'wood plank'], recipeId: 'wood_plank' },
  { keywords: ['torch'], recipeId: 'torch' },
  { keywords: ['rope'], recipeId: 'rope' },
];

function parseRecipeId(cleaned: string): string {
  for (const { keywords, recipeId } of RECIPE_KEYWORDS) {
    if (keywords.some((kw) => cleaned.includes(kw))) {
      return recipeId;
    }
  }
  return 'wood_plank'; // fallback
}

// ============================================================================
// ACTION PARSING
// ============================================================================

/**
 * Parse LLM response into structured action.
 * Handles both JSON and natural language responses.
 */
export function parseAction(response: string): AgentAction | null {
  const cleaned = response.trim().toLowerCase();

  // Try to parse as JSON first
  if (cleaned.startsWith('{')) {
    try {
      const parsed = JSON.parse(response);
      if (isValidAction(parsed)) {
        return parsed as AgentAction;
      }
    } catch {
      // Fall through to keyword parsing
    }
  }

  // Keyword-based parsing using pattern matching
  for (const pattern of KEYWORD_PATTERNS) {
    const hasKeyword = pattern.keywords.some((kw) => cleaned.includes(kw));
    const hasExclusion = pattern.exclude?.some((ex) => cleaned.includes(ex)) ?? false;

    if (hasKeyword && !hasExclusion) {
      return pattern.factory(cleaned);
    }
  }

  // Default fallback
  return { type: 'idle' };
}

// ============================================================================
// ACTION VALIDATION
// ============================================================================

const VALID_ACTION_TYPES = new Set([
  // Movement
  'move', 'wander', 'idle', 'rest',
  'navigate', 'explore_frontier', 'explore_spiral', 'follow_gradient',
  // Gathering
  'pick', 'gather', 'forage', 'pickup', 'eat', 'chop', 'mine',
  // Social
  'follow', 'follow_agent', 'talk', 'help',
  'call_meeting', 'attend_meeting', 'initiate_combat',
  // Building
  'build', 'construct', 'plan_build',
  // Farming
  'till', 'water', 'fertilize', 'plant', 'harvest', 'gather_seeds', 'farm',
  // Exploration
  'explore',
  // Research
  'research',
  // Animal handling
  'tame_animal', 'house_animal', 'hunt', 'butcher',
  // Priority/Goal management
  'set_priorities', 'set_personal_goal', 'set_medium_term_goal', 'set_group_goal',
  // Queue management
  'sleep_until_queue_complete',
  // Other
  'craft', 'trade',
]);

/**
 * Validate that an object is a valid AgentAction.
 */
export function isValidAction(action: unknown): boolean {
  if (!action || typeof action !== 'object') return false;

  const a = action as Record<string, unknown>;

  if (typeof a.type !== 'string') return false;

  return VALID_ACTION_TYPES.has(a.type);
}

// ============================================================================
// ACTION TO BEHAVIOR MAPPING
// ============================================================================

const ACTION_TO_BEHAVIOR: Record<string, AgentBehavior> = {
  // Movement
  wander: 'wander',
  idle: 'idle',
  move: 'wander', // TODO: Implement proper pathfinding
  navigate: 'navigate',
  explore_frontier: 'explore_frontier',
  explore_spiral: 'explore_spiral',
  follow_gradient: 'follow_gradient',

  // Gathering - pick is single item, gather is stockpile
  pick: 'pick',
  gather: 'gather', // Fixed: was incorrectly mapping to 'pick'
  chop: 'pick',
  mine: 'pick',
  forage: 'seek_food',
  pickup: 'seek_food',
  eat: 'seek_food', // No 'eat' behavior - use seek_food which finds and eats

  // Social
  talk: 'talk',
  follow: 'follow_agent',
  follow_agent: 'follow_agent',
  call_meeting: 'call_meeting',
  attend_meeting: 'attend_meeting',
  help: 'follow_agent', // No 'help' behavior - follow and assist
  initiate_combat: 'initiate_combat',

  // Building
  build: 'build',
  construct: 'build',
  plan_build: 'build', // Maps to 'build' - BuildBehavior handles auto-resource-gathering

  // Farming
  till: 'till',
  farm: 'farm',
  water: 'water', // Water behavior is registered
  fertilize: 'farm', // No fertilize behavior - use farm
  plant: 'plant',
  harvest: 'harvest', // Alias for gather
  gather_seeds: 'gather_seeds', // Alias for gather

  // Exploration
  explore: 'explore', // Added: was missing, causing fallback to idle

  // Research
  research: 'research',

  // Animal handling
  tame_animal: 'tame_animal', // Registered in AgentBrainSystem
  house_animal: 'house_animal', // Registered in AgentBrainSystem
  hunt: 'hunt',
  butcher: 'butcher',

  // Priority/Goal management - instant actions, don't change behavior
  set_priorities: 'idle',
  set_personal_goal: 'idle',
  set_medium_term_goal: 'idle',
  set_group_goal: 'idle',

  // Queue management - pause executor until queue completes
  sleep_until_queue_complete: 'idle', // Executor pauses, queue continues

  // Other
  craft: 'craft',
  trade: 'idle', // Trade is instant
};

/**
 * Convert action to behavior string (temporary bridge to old system).
 *
 * NOTE: Returns undefined for 'idle' and 'wander' to prevent the LLM from
 * explicitly setting these fallback behaviors. Agent should stay in their
 * current productive behavior until given a specific task.
 */
export function actionToBehavior(action: AgentAction): AgentBehavior | undefined {
  const behavior = ACTION_TO_BEHAVIOR[action.type];

  // Prevent LLM from explicitly setting idle/wander - these are fallback behaviors
  // Agent should stay in current behavior if LLM doesn't specify a productive task
  if (behavior === 'idle' || behavior === 'wander') {
    return undefined;
  }

  // Don't default to 'idle' for unmapped actions - return undefined instead
  // This prevents silent fallback to idle when LLM returns an unmapped action type
  return behavior;
}
