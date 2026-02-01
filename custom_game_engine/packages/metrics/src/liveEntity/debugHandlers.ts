/**
 * Debug Handlers for LiveEntityAPI
 *
 * Handles debug-related actions including:
 * - Start/stop logging
 * - List agents
 * - Get logs
 * - Analyze agent
 * - List log files
 */

import type { World } from '@ai-village/core';
import type { ActionRequest, ActionResponse, AgentDebugManagerInterface } from './types.js';
import { isIdentityComponent } from './types.js';

/**
 * Context required for debug handlers
 */
export interface DebugHandlerContext {
  world: World;
  agentDebugManager: AgentDebugManagerInterface | null;
}

/**
 * Handle debug-start-logging action
 */
export function handleDebugStartLogging(
  ctx: DebugHandlerContext,
  action: ActionRequest
): ActionResponse {
  if (!ctx.agentDebugManager) {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Agent debug manager not initialized',
    };
  }

  const { agentId } = action.params;
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
      error: `Agent ${agentId} not found`,
    };
  }

  const identityComp = entity.getComponent('identity');
  const identity = identityComp && isIdentityComponent(identityComp) ? identityComp : undefined;
  const agentName = identity?.name || 'Unknown';

  ctx.agentDebugManager.startLogging(agentId, agentName);

  return {
    requestId: action.requestId,
    success: true,
    data: {
      message: `Started deep logging for agent ${agentName} (${agentId})`,
      agentId,
      agentName,
    },
  };
}

/**
 * Handle debug-stop-logging action
 */
export function handleDebugStopLogging(
  ctx: DebugHandlerContext,
  action: ActionRequest
): ActionResponse {
  if (!ctx.agentDebugManager) {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Agent debug manager not initialized',
    };
  }

  const { agentId } = action.params;
  if (!agentId || typeof agentId !== 'string') {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing or invalid agentId parameter',
    };
  }

  ctx.agentDebugManager.stopLogging(agentId);

  return {
    requestId: action.requestId,
    success: true,
    data: {
      message: `Stopped deep logging for agent ${agentId}`,
      agentId,
    },
  };
}

/**
 * Handle debug-list-agents action
 */
export function handleDebugListAgents(
  ctx: DebugHandlerContext,
  action: ActionRequest
): ActionResponse {
  if (!ctx.agentDebugManager) {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Agent debug manager not initialized',
    };
  }

  const trackedAgents = ctx.agentDebugManager.getTrackedAgents();

  // Get agent names for each tracked ID
  const agentsWithNames = trackedAgents.map(agentId => {
    const entity = ctx.world.getEntity(agentId);
    const identityComp = entity?.getComponent('identity');
    const identity = identityComp && isIdentityComponent(identityComp) ? identityComp : undefined;
    return {
      id: agentId,
      name: identity?.name || 'Unknown',
    };
  });

  return {
    requestId: action.requestId,
    success: true,
    data: {
      count: trackedAgents.length,
      agents: agentsWithNames,
    },
  };
}

/**
 * Get log entries for an agent
 */
export function handleDebugGetLogs(
  ctx: DebugHandlerContext,
  action: ActionRequest
): ActionResponse {
  if (!ctx.agentDebugManager) {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Agent debug manager not initialized',
    };
  }

  const agentIdOrName = typeof action.params.agentIdOrName === 'string' ? action.params.agentIdOrName : undefined;
  const limit = typeof action.params.limit === 'number' ? action.params.limit : undefined;

  if (!agentIdOrName) {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing agentIdOrName parameter',
    };
  }

  const entries = ctx.agentDebugManager.getRecentEntries(agentIdOrName, limit || 100);

  return {
    requestId: action.requestId,
    success: true,
    data: {
      count: entries.length,
      entries,
    },
  };
}

/**
 * Analyze agent behavior from logs
 */
export function handleDebugAnalyze(
  ctx: DebugHandlerContext,
  action: ActionRequest
): ActionResponse {
  if (!ctx.agentDebugManager) {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Agent debug manager not initialized',
    };
  }

  const agentIdOrName = typeof action.params.agentIdOrName === 'string' ? action.params.agentIdOrName : undefined;

  if (!agentIdOrName) {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Missing agentIdOrName parameter',
    };
  }

  const analysis = ctx.agentDebugManager.analyzeAgent(agentIdOrName);

  // Convert Map to object for JSON serialization
  const behaviorsObj: Record<string, number> = {};
  for (const [behavior, count] of analysis.behaviors) {
    behaviorsObj[behavior] = count;
  }

  return {
    requestId: action.requestId,
    success: true,
    data: {
      totalEntries: analysis.totalEntries,
      maxDistanceFromHome: analysis.maxDistanceFromHome,
      avgDistanceFromHome: analysis.avgDistanceFromHome,
      behaviorChanges: analysis.behaviorChanges,
      behaviors: behaviorsObj,
      recentThoughts: analysis.recentThoughts,
      currentPosition: analysis.currentPosition,
      currentTarget: analysis.currentTarget,
    },
  };
}

/**
 * List all available log files
 */
export function handleDebugListLogFiles(
  ctx: DebugHandlerContext,
  action: ActionRequest
): ActionResponse {
  if (!ctx.agentDebugManager) {
    return {
      requestId: action.requestId,
      success: false,
      error: 'Agent debug manager not initialized',
    };
  }

  const files = ctx.agentDebugManager.listLogFiles();

  return {
    requestId: action.requestId,
    success: true,
    data: {
      count: files.length,
      files,
    },
  };
}
