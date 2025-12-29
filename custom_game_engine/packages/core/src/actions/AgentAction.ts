/**
 * Structured actions that agents can perform.
 * Based on agent-system/spec.md REQ-AGT-003
 */

import type { Position } from '../types.js';
import type { AgentBehavior } from '../components/AgentComponent.js';
import type { BuildingType } from '../components/BuildingComponent.js';

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

  // Rest
  | { type: 'idle' }
  | { type: 'rest' };

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

  // Keyword-based parsing for natural language responses

  // Navigation actions (check before generic 'explore')
  if (cleaned.includes('navigate') || cleaned.includes('go to')) {
    // Try to extract coordinates from "navigate to x,y" or "go to 10,20"
    const coordMatch = cleaned.match(/(?:navigate\s+to|go\s+to)\s*(-?\d+)\s*,\s*(-?\d+)/);
    if (coordMatch && coordMatch[1] && coordMatch[2]) {
      return { type: 'navigate', target: { x: parseInt(coordMatch[1], 10), y: parseInt(coordMatch[2], 10) } };
    }
    return { type: 'navigate', target: { x: 0, y: 0 } }; // Default to origin
  }

  if (cleaned.includes('explore_frontier') || cleaned.includes('explore frontier')) {
    return { type: 'explore_frontier' };
  }

  if (cleaned.includes('explore_spiral') || cleaned.includes('explore spiral')) {
    return { type: 'explore_spiral' };
  }

  if (cleaned.includes('follow_gradient') || cleaned.includes('follow gradient')) {
    return { type: 'follow_gradient' };
  }

  // Generic explore becomes wander
  if (cleaned.includes('wander') || cleaned.includes('explore')) {
    return { type: 'wander' };
  }

  if (cleaned.includes('talk') || cleaned.includes('conversation') || cleaned.includes('speak')) {
    return { type: 'talk', targetId: 'nearest' }; // TODO: Parse specific target
  }

  if (cleaned.includes('rest') || cleaned.includes('sleep')) {
    return { type: 'rest' };
  }

  if (cleaned.includes('idle') || cleaned.includes('wait') || cleaned.includes('nothing')) {
    return { type: 'idle' };
  }

  if (cleaned.includes('eat') || cleaned.includes('food') || cleaned.includes('hungry')) {
    return { type: 'eat' };
  }

  // IMPORTANT: Check chop/mine BEFORE generic 'gather' to avoid conflicts
  // 'chop' and 'mine' are specific gather actions that should take priority
  if (cleaned.includes('chop') || cleaned.includes('chopping') || cleaned.includes('wood')) {
    return { type: 'chop', targetId: 'nearest' };
  }

  if (cleaned.includes('mine') || cleaned.includes('mining') || cleaned.includes('stone')) {
    return { type: 'mine', targetId: 'nearest' };
  }

  // Generic gather - only matches if chop/mine didn't match above
  if (cleaned.includes('gather')) {
    // If LLM says "gather" without specifying chop/mine, default to chop
    return { type: 'chop', targetId: 'nearest' };
  }

  if (cleaned.includes('forage') || cleaned.includes('search')) {
    return { type: 'forage' };
  }

  if (cleaned.includes('follow')) {
    return { type: 'follow', targetId: 'nearest' };
  }

  // Farming actions (Phase 9)
  if (
    cleaned.includes('till') ||
    cleaned.includes('tilling') ||
    cleaned.includes('plow') ||
    cleaned.includes('plowing') ||
    cleaned.includes('prepare soil') ||
    cleaned.includes('prepare ground') ||
    cleaned.includes('prepare the soil') ||
    cleaned.includes('prepare the ground') ||
    cleaned.includes('preparing')
  ) {
    return { type: 'till', position: { x: 0, y: 0 } }; // Position will be set by caller
  }

  if (cleaned.includes('water') && !cleaned.includes('gather')) {
    return { type: 'water', position: { x: 0, y: 0 } };
  }

  if (cleaned.includes('fertilize')) {
    return { type: 'fertilize', position: { x: 0, y: 0 }, fertilizerType: 'compost' };
  }

  if (
    cleaned.includes('plant') &&
    !cleaned.includes('plantable') &&
    !cleaned.includes('prepare') // Don't match "prepare soil for planting"
  ) {
    return { type: 'plant', position: { x: 0, y: 0 }, seedType: 'wheat' };
  }

  if (cleaned.includes('harvest')) {
    return { type: 'harvest', position: { x: 0, y: 0 } };
  }

  if (cleaned.includes('gather_seeds') || cleaned.includes('gather seeds')) {
    return { type: 'gather_seeds', plantId: 'nearest' };
  }

  if (cleaned.includes('build') || cleaned.includes('construct')) {
    // Try to extract building type from response
    let buildingType: BuildingType = 'lean-to'; // fallback

    // Check for specific building types (ordered by specificity)
    if (cleaned.includes('campfire') || cleaned.includes('fire')) {
      buildingType = 'campfire';
    } else if (cleaned.includes('storage') || cleaned.includes('chest')) {
      buildingType = 'storage-chest';
    } else if (cleaned.includes('bedroll') || cleaned.includes('bed') || cleaned.includes('tent')) {
      // Map bed/bedroll/tent to tent building type
      buildingType = 'tent';
    } else if (cleaned.includes('workbench') || cleaned.includes('work bench')) {
      buildingType = 'workbench';
    } else if (cleaned.includes('forge')) {
      buildingType = 'forge';
    } else if (cleaned.includes('well')) {
      buildingType = 'well';
    } else if (cleaned.includes('lean-to') || cleaned.includes('leanto') || cleaned.includes('shelter')) {
      buildingType = 'lean-to';
    }

    return { type: 'build', buildingType, position: { x: 0, y: 0 } };
  }

  // Crafting actions (Phase 10)
  if (cleaned.includes('craft') || cleaned.includes('make') || cleaned.includes('create')) {
    // Try to extract recipe from response
    let recipeId = 'wood_plank'; // fallback

    // Check for specific items (ordered by specificity)
    if (cleaned.includes('stone_axe') || cleaned.includes('stone axe')) {
      recipeId = 'stone_axe';
    } else if (cleaned.includes('iron_axe') || cleaned.includes('iron axe')) {
      recipeId = 'iron_axe';
    } else if (cleaned.includes('iron_pickaxe') || cleaned.includes('iron pickaxe') || cleaned.includes('pickaxe')) {
      recipeId = 'iron_pickaxe';
    } else if (cleaned.includes('iron_sword') || cleaned.includes('iron sword') || cleaned.includes('sword')) {
      recipeId = 'iron_sword';
    } else if (cleaned.includes('iron_ingot') || cleaned.includes('iron ingot') || cleaned.includes('smelt iron')) {
      recipeId = 'iron_ingot';
    } else if (cleaned.includes('plank') || cleaned.includes('planks') || cleaned.includes('wood plank')) {
      recipeId = 'wood_plank';
    } else if (cleaned.includes('torch')) {
      recipeId = 'torch';
    } else if (cleaned.includes('rope')) {
      recipeId = 'rope';
    }

    return { type: 'craft', recipeId };
  }

  // Trading actions (Phase 12)
  if (cleaned.includes('buy') || cleaned.includes('purchase')) {
    // Default to buying wood from nearest shop
    return {
      type: 'trade',
      shopId: 'nearest',
      itemId: 'wood',
      quantity: 1,
      subtype: 'buy',
    };
  }

  if (cleaned.includes('sell')) {
    // Default to selling wood to nearest shop
    return {
      type: 'trade',
      shopId: 'nearest',
      itemId: 'wood',
      quantity: 1,
      subtype: 'sell',
    };
  }

  // Default fallback
  return { type: 'wander' };
}

/**
 * Validate that an object is a valid AgentAction.
 */
export function isValidAction(action: unknown): boolean {
  if (!action || typeof action !== 'object') return false;

  const a = action as Record<string, unknown>;

  if (typeof a.type !== 'string') return false;

  const validTypes = [
    'move', 'wander', 'follow', 'talk', 'help',
    'forage', 'pickup', 'eat', 'chop', 'mine', 'gather',
    'build', 'construct', 'craft', 'trade', 'idle', 'rest',
    'till', 'water', 'fertilize', 'plant', 'harvest', 'gather_seeds',
    'navigate', 'explore_frontier', 'explore_spiral', 'follow_gradient'
  ];

  return validTypes.includes(a.type);
}

/**
 * Convert action to behavior string (temporary bridge to old system).
 */
export function actionToBehavior(action: AgentAction): AgentBehavior {
  switch (action.type) {
    case 'wander':
      return 'wander';
    case 'talk':
      return 'talk';
    case 'follow':
      return 'follow_agent';
    case 'eat':
      return 'eat'; // Eat from inventory or storage
    case 'forage':
    case 'pickup':
      return 'seek_food'; // Forage from environment
    case 'chop':
    case 'mine':
    case 'gather':
      return 'pick'; // 'gather' is a synonym for 'pick' - the actual valid behavior
    case 'build':
    case 'construct':
      return 'build';
    case 'craft':
      return 'craft';
    case 'trade':
      return 'idle'; // Trade is instant, use idle behavior
    case 'till':
      return 'till'; // Tilling behavior - finds grass and queues till actions
    case 'water':
    case 'fertilize':
    case 'plant':
      return 'farm'; // Farming behavior
    case 'harvest':
      return 'harvest'; // Harvest behavior
    case 'gather_seeds':
      return 'gather_seeds'; // Gather seeds behavior
    case 'idle':
      return 'idle';
    // NOTE: 'rest' removed - sleep is autonomic (triggered by AutonomicSystem)
    case 'move':
      return 'wander'; // TODO: Implement proper pathfinding
    // Navigation & Exploration (Phase 4.5)
    case 'navigate':
      return 'navigate';
    case 'explore_frontier':
      return 'explore_frontier';
    case 'explore_spiral':
      return 'explore_spiral';
    case 'follow_gradient':
      return 'follow_gradient';
    default:
      return 'wander';
  }
}
