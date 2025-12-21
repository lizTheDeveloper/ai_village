/**
 * Structured actions that agents can perform.
 * Based on agent-system/spec.md REQ-AGT-003
 */

import type { Position } from '../types.js';

export type AgentAction =
  // Movement
  | { type: 'move'; target: Position }
  | { type: 'wander' }
  | { type: 'follow'; targetId: string }

  // Social
  | { type: 'talk'; targetId: string; topic?: string }
  | { type: 'help'; targetId: string }

  // Resource
  | { type: 'forage'; area?: Position }
  | { type: 'pickup'; itemId: string }
  | { type: 'eat'; itemId?: string }

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

  if (cleaned.includes('forage') || cleaned.includes('gather') || cleaned.includes('search')) {
    return { type: 'forage' };
  }

  if (cleaned.includes('follow')) {
    return { type: 'follow', targetId: 'nearest' };
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

  const validTypes = ['move', 'wander', 'follow', 'talk', 'help', 'forage', 'pickup', 'eat', 'idle', 'rest'];

  return validTypes.includes(a.type);
}

/**
 * Convert action to behavior string (temporary bridge to old system).
 */
export function actionToBehavior(action: AgentAction): string {
  switch (action.type) {
    case 'wander':
      return 'wander';
    case 'talk':
      return 'talk';
    case 'follow':
      return 'follow_agent';
    case 'eat':
    case 'forage':
    case 'pickup':
      return 'seek_food';
    case 'idle':
    case 'rest':
      return 'idle';
    case 'move':
      return 'wander'; // TODO: Implement proper pathfinding
    default:
      return 'wander';
  }
}
