/**
 * Agent Action Handlers for LiveEntityAPI
 *
 * Handles agent-related actions including:
 * - Set LLM config
 * - Set skill
 * - Spawn entity/agent
 * - Teleport
 * - Set need
 * - Give item
 * - Trigger behavior
 * - Set speed/pause
 * - Find agent by name
 */

import type { World, WorldMutator } from '@ai-village/core';
import { createLLMAgent, createWanderingAgent } from '@ai-village/agents';
import { spawnCity, getCityTemplates, type CitySpawnConfig } from '@ai-village/core';
import type { ActionRequest, ActionResponse, WorldWithRuntimeProps } from './types.js';
import {
  isAgentComponent,
  isSkillsComponent,
  isIdentityComponent,
  isPositionComponent,
  isNeedsComponent,
  isInventoryComponent,
} from './types.js';

/**
 * Context required for agent action handlers
 */
export interface AgentActionContext {
  world: World;
}

/**
 * Handle set-llm-config action
 */
export function handleSetLLMConfig(
  ctx: AgentActionContext,
  action: ActionRequest
): ActionResponse {
  const { agentId, config } = action.params;

  if (!agentId || typeof agentId !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid agentId parameter',
    };
  }

  const entity = ctx.world.getEntity(agentId);
  if (!entity) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity not found: ${agentId}`,
    };
  }

  const agentComp = entity.components.get('agent');
  if (!agentComp || !isAgentComponent(agentComp)) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity ${agentId} is not an agent`,
    };
  }
  const agent = agentComp;

  // Set or clear the custom LLM config
  if (config === null || config === undefined) {
    agent.customLLM = undefined;
  } else {
    agent.customLLM = config;
  }

  return {
    requestId: action.requestId,
    success: true,
    data: { agentId, config: agent.customLLM },
  };
}

/**
 * Handle set-skill action
 */
export function handleSetSkill(
  ctx: AgentActionContext,
  action: ActionRequest
): ActionResponse {
  const { agentId, skill, level } = action.params;

  if (!agentId || typeof agentId !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid agentId parameter',
    };
  }

  if (!skill || typeof skill !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid skill parameter',
    };
  }

  if (typeof level !== 'number' || level < 0 || level > 5 || !Number.isInteger(level)) {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Level must be an integer between 0 and 5',
    };
  }

  const entity = ctx.world.getEntity(agentId);
  if (!entity) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity not found: ${agentId}`,
    };
  }

  const skillsComp = entity.components.get('skills');
  if (!skillsComp || !isSkillsComponent(skillsComp)) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity ${agentId} does not have skills component`,
    };
  }
  const skills = skillsComp;

  if (!skills.levels) {
    skills.levels = {};
  }

  // Set the skill level
  skills.levels[skill] = level;

  return {
    requestId: action.requestId,
    success: true,
    data: { agentId, skill, level },
  };
}

/**
 * Spawn an entity (building, animal, etc.) at the specified location
 */
export function handleSpawnEntity(
  ctx: AgentActionContext,
  action: ActionRequest
): ActionResponse {
  const { type, x, y } = action.params;

  if (!type || typeof type !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid type parameter',
    };
  }

  if (typeof x !== 'number' || typeof y !== 'number') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid x, y parameters',
    };
  }

  // Create the entity
  const entity = ctx.world.createEntity();
  const entityId = entity.id;

  // Set position via component
  entity.addComponent({
    type: 'position',
    x,
    y,
  });

  // Add a type tag for the entity
  entity.addComponent({
    type: 'tags',
    tags: [type],
  });

  if (!entity) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Failed to spawn entity of type: ${type}`,
    };
  }

  return {
    requestId: action.requestId,
    success: true,
    data: { entityId, type, x, y },
  };
}

/**
 * Spawn an NPC city with buildings and AI-driven agents
 */
export async function handleSpawnCity(
  ctx: AgentActionContext,
  action: ActionRequest
): Promise<ActionResponse> {
  const { template, x, y, name, agentCount, useLLM } = action.params;

  if (!template || typeof template !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid template parameter',
    };
  }

  if (typeof x !== 'number' || typeof y !== 'number') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid x, y parameters',
    };
  }

  const config: CitySpawnConfig = {
    template: template as CitySpawnConfig['template'],
    x,
    y,
    name: typeof name === 'string' ? name : undefined,
    agentCount: typeof agentCount === 'number' ? agentCount : undefined,
    useLLM: typeof useLLM === 'boolean' ? useLLM : true,
  };

  try {
    const cityInfo = await spawnCity(ctx.world as any, config);

    return {
      requestId: action.requestId,
      success: true,
      data: cityInfo,
    };
  } catch (error) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Failed to spawn city: ${error}`,
    };
  }
}

/**
 * List available city templates
 */
export function handleListCityTemplates(action: ActionRequest): ActionResponse {
  const templates = getCityTemplates();

  return {
    requestId: action.requestId,
    success: true,
    data: templates,
  };
}

/**
 * Spawn an agent at the specified location
 */
export function handleSpawnAgent(
  ctx: AgentActionContext,
  action: ActionRequest
): ActionResponse {
  const { name, x, y, useLLM, speed, believedDeity } = action.params;

  if (typeof x !== 'number' || typeof y !== 'number') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid x, y parameters',
    };
  }

  const agentSpeed = typeof speed === 'number' ? speed : 2.0;
  const shouldUseLLM = typeof useLLM === 'boolean' ? useLLM : false;
  const options = believedDeity && typeof believedDeity === 'string' ? { believedDeity } : undefined;

  try {
    const agentId = shouldUseLLM
      ? createLLMAgent(ctx.world as WorldMutator, x, y, agentSpeed, undefined, options)
      : createWanderingAgent(ctx.world as WorldMutator, x, y, agentSpeed, options);

    // Optionally set the agent's name if provided
    if (name && typeof name === 'string') {
      const entity = ctx.world.getEntity(agentId);
      if (entity) {
        const identityComp = entity.components.get('identity');
        const identity = identityComp && isIdentityComponent(identityComp) ? identityComp : undefined;
        if (identity) {
          identity.name = name;
        }
      }
    }

    return {
      requestId: action.requestId,
      success: true,
      data: { agentId, x, y, useLLM: shouldUseLLM },
    };
  } catch (error) {
    return {
      requestId: action.requestId,
      success: false,
      error: error instanceof Error ? error.message : 'Failed to spawn agent',
    };
  }
}

/**
 * Teleport an agent to a new location
 */
export function handleTeleport(
  ctx: AgentActionContext,
  action: ActionRequest
): ActionResponse {
  const { agentId, x, y } = action.params;

  if (!agentId || typeof agentId !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid agentId parameter',
    };
  }

  if (typeof x !== 'number' || typeof y !== 'number') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid x, y parameters',
    };
  }

  const entity = ctx.world.getEntity(agentId);
  if (!entity) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity not found: ${agentId}`,
    };
  }

  const positionComp = entity.components.get('position');
  const position = positionComp && isPositionComponent(positionComp) ? positionComp : undefined;
  if (!position) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity ${agentId} does not have a position component`,
    };
  }

  // Update position
  position.x = x;
  position.y = y;

  return {
    requestId: action.requestId,
    success: true,
    data: { agentId, x, y },
  };
}

/**
 * Set an agent's need value
 */
export function handleSetNeed(
  ctx: AgentActionContext,
  action: ActionRequest
): ActionResponse {
  const { agentId, need, value } = action.params;

  if (!agentId || typeof agentId !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid agentId parameter',
    };
  }

  if (!need || typeof need !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid need parameter',
    };
  }

  if (typeof value !== 'number') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid value parameter',
    };
  }

  const entity = ctx.world.getEntity(agentId);
  if (!entity) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity not found: ${agentId}`,
    };
  }

  const needsComp = entity.components.get('needs');
  const needs = needsComp && isNeedsComponent(needsComp) ? needsComp : undefined;
  if (!needs) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity ${agentId} does not have needs component`,
    };
  }

  // Validate need type
  const validNeeds = ['hunger', 'energy', 'health', 'thirst'];
  if (!validNeeds.includes(need)) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Invalid need type. Must be one of: ${validNeeds.join(', ')}`,
    };
  }

  // Clamp value to 0-1 range (needs are 0-1 scale)
  const clampedValue = Math.max(0, Math.min(1, value));

  // Set the need value
  needs[need] = clampedValue;

  return {
    requestId: action.requestId,
    success: true,
    data: { agentId, need, value: clampedValue },
  };
}

/**
 * Give an item to an agent's inventory
 */
export function handleGiveItem(
  ctx: AgentActionContext,
  action: ActionRequest
): ActionResponse {
  const { agentId, itemType, amount } = action.params;

  if (!agentId || typeof agentId !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid agentId parameter',
    };
  }

  if (!itemType || typeof itemType !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid itemType parameter',
    };
  }

  const itemAmount = typeof amount === 'number' ? amount : 1;

  const entity = ctx.world.getEntity(agentId);
  if (!entity) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity not found: ${agentId}`,
    };
  }

  const inventoryComp = entity.components.get('inventory');
  if (!inventoryComp || !isInventoryComponent(inventoryComp)) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity ${agentId} does not have inventory component`,
    };
  }
  const inventory = inventoryComp;

  if (!inventory.slots) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity ${agentId} inventory has no slots`,
    };
  }

  // Find existing stack or empty slot
  let slotIndex = -1;
  for (let i = 0; i < inventory.slots.length; i++) {
    const slot = inventory.slots[i];
    if (slot && slot.itemId === itemType) {
      // Found existing stack
      slotIndex = i;
      break;
    } else if (!slot && slotIndex === -1) {
      // Found empty slot
      slotIndex = i;
    }
  }

  if (slotIndex === -1) {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Inventory is full',
    };
  }

  // Add to inventory
  if (inventory.slots[slotIndex]) {
    inventory.slots[slotIndex]!.quantity += itemAmount;
  } else {
    inventory.slots[slotIndex] = { itemId: itemType, quantity: itemAmount };
  }

  return {
    requestId: action.requestId,
    success: true,
    data: { agentId, itemType, amount: itemAmount },
  };
}

/**
 * Trigger a specific behavior on an agent
 */
export function handleTriggerBehavior(
  ctx: AgentActionContext,
  action: ActionRequest
): ActionResponse {
  const { agentId, behavior } = action.params;

  if (!agentId || typeof agentId !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid agentId parameter',
    };
  }

  if (!behavior || typeof behavior !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid behavior parameter',
    };
  }

  const entity = ctx.world.getEntity(agentId);
  if (!entity) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity not found: ${agentId}`,
    };
  }

  const agentComp = entity.components.get('agent');
  const agent = agentComp && isAgentComponent(agentComp) ? agentComp : undefined;
  if (!agent) {
    return {
      requestId: action.requestId,
      success: false,
      error: `Entity ${agentId} is not an agent`,
    };
  }

  // Set the behavior
  agent.currentBehavior = behavior;

  return {
    requestId: action.requestId,
    success: true,
    data: { agentId, behavior },
  };
}

/**
 * Set game speed multiplier
 */
export function handleSetSpeed(
  ctx: AgentActionContext,
  action: ActionRequest
): ActionResponse {
  const { speed } = action.params;

  if (typeof speed !== 'number') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid speed parameter',
    };
  }

  if (speed < 0.1 || speed > 10) {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Speed must be between 0.1 and 10.0',
    };
  }

  // Access speed multiplier on world (if exists)
  const worldWithRuntime = ctx.world as WorldWithRuntimeProps;
  if (worldWithRuntime.speedMultiplier !== undefined) {
    worldWithRuntime.speedMultiplier = speed;
  }

  return {
    requestId: action.requestId,
    success: true,
    data: { speed },
  };
}

/**
 * Pause or resume the game
 */
export function handlePause(
  ctx: AgentActionContext,
  action: ActionRequest
): ActionResponse {
  const { paused } = action.params;

  if (typeof paused !== 'boolean') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid paused parameter (must be boolean)',
    };
  }

  // Access paused state on world (if exists)
  const worldWithRuntime = ctx.world as WorldWithRuntimeProps;
  if (worldWithRuntime.paused !== undefined) {
    worldWithRuntime.paused = paused;
  }

  return {
    requestId: action.requestId,
    success: true,
    data: { paused },
  };
}

/**
 * Find agent by name and return ID
 */
export function handleFindAgentByName(
  ctx: AgentActionContext,
  action: ActionRequest
): ActionResponse {
  const name = typeof action.params.name === 'string' ? action.params.name : undefined;

  if (!name) {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing name parameter',
    };
  }

  const agents = ctx.world
    .query()
    .with('agent')
    .with('identity')
    .executeEntities();

  const normalizedSearch = name.toLowerCase();
  const matches = agents.filter((entity) => {
    const identityComp = entity.getComponent('identity');
    const identity = identityComp && isIdentityComponent(identityComp) ? identityComp : undefined;
    return identity?.name?.toLowerCase().includes(normalizedSearch);
  });

  const results = matches.map((entity) => {
    const identityComp = entity.getComponent('identity');
    const identity = identityComp && isIdentityComponent(identityComp) ? identityComp : undefined;
    const positionComp = entity.getComponent('position');
    const position = positionComp && isPositionComponent(positionComp) ? positionComp : undefined;
    const agentComp = entity.getComponent('agent');
    const agent = agentComp && isAgentComponent(agentComp) ? agentComp : undefined;

    return {
      id: entity.id,
      name: identity?.name || 'Unknown',
      position: position ? { x: position.x, y: position.y } : null,
      behavior: agent?.behavior || 'unknown',
    };
  });

  return {
    requestId: action.requestId,
    success: true,
    data: {
      count: results.length,
      agents: results,
    },
  };
}
