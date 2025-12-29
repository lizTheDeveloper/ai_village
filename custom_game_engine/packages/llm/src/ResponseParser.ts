import type { AgentBehavior } from '@ai-village/core';
import { VALID_BEHAVIORS, BEHAVIOR_SYNONYMS } from './ActionDefinitions.js';

/**
 * Action can be a simple string behavior OR an object with type and parameters
 * for multi-turn tool use patterns.
 */
export type AgentAction = AgentBehavior | {
  type: AgentBehavior;
  building?: string;      // For plan_build
  target?: string;        // For talk, follow_agent
  priorities?: Record<string, number>;  // For set_priorities
  [key: string]: unknown; // Allow additional parameters
};

/**
 * Structured response from LLM with thinking, speaking, and action
 */
export interface AgentResponse {
  thinking: string;      // Internal thoughts
  speaking: string;      // What the agent says out loud
  action: AgentBehavior; // The normalized action type
  actionParams?: Record<string, unknown>; // Additional parameters from object-style action
}

/**
 * Error thrown when behavior parsing fails.
 */
export class BehaviorParseError extends Error {
  constructor(responseText: string, validBehaviors: string[]) {
    super(
      `Could not parse valid behavior from LLM response: "${responseText.slice(0, 200)}". ` +
      `Valid behaviors are: ${validBehaviors.join(', ')}`
    );
    this.name = 'BehaviorParseError';
  }
}

/**
 * Parses LLM responses into valid agent behaviors.
 * Uses shared VALID_BEHAVIORS and BEHAVIOR_SYNONYMS from ActionDefinitions.
 */
export class ResponseParser {
  // Use shared valid behaviors from ActionDefinitions (single source of truth)
  private validBehaviors: Set<string> = VALID_BEHAVIORS;

  // Use shared synonyms from ActionDefinitions (single source of truth)
  private synonyms: Record<string, AgentBehavior> = BEHAVIOR_SYNONYMS;

  /**
   * Parse LLM response text into full agent response (thinking, speaking, action).
   * Handles both structured JSON (from function calling) and plain text.
   * Supports action as string OR object with type field (for multi-turn tool use).
   * Throws BehaviorParseError if parsing fails - no silent fallbacks.
   */
  parseResponse(responseText: string): AgentResponse {
    if (!responseText || !responseText.trim()) {
      throw new BehaviorParseError('(empty response)', Array.from(this.validBehaviors));
    }

    // Try parsing as JSON first (structured output from function calling)
    try {
      const parsed = JSON.parse(responseText);

      // Handle action as object with type field: { "type": "plan_build", "building": "workbench" }
      if (parsed.action && typeof parsed.action === 'object' && parsed.action.type) {
        const actionType = parsed.action.type;
        if (this.isValidBehavior(actionType)) {
          // Extract action params (everything except 'type')
          const { type, ...actionParams } = parsed.action;
          return {
            thinking: parsed.thinking || '',
            speaking: parsed.speaking || '',
            action: actionType as AgentBehavior,
            actionParams: Object.keys(actionParams).length > 0 ? actionParams : undefined,
          };
        }
        // Check if action type is a synonym
        const canonical = this.synonyms[actionType.toLowerCase()];
        if (canonical) {
          const { type, ...actionParams } = parsed.action;
          return {
            thinking: parsed.thinking || '',
            speaking: parsed.speaking || '',
            action: canonical,
            actionParams: Object.keys(actionParams).length > 0 ? actionParams : undefined,
          };
        }
        throw new BehaviorParseError(
          `Invalid action type in structured response: ${actionType}`,
          Array.from(this.validBehaviors)
        );
      }

      // Handle action as simple string: { "action": "wander" }
      if (parsed.action && typeof parsed.action === 'string') {
        if (this.isValidBehavior(parsed.action)) {
          return {
            thinking: parsed.thinking || '',
            speaking: parsed.speaking || '',
            action: parsed.action as AgentBehavior,
          };
        }
        // Check if it's a synonym
        const canonical = this.synonyms[parsed.action.toLowerCase()];
        if (canonical) {
          return {
            thinking: parsed.thinking || '',
            speaking: parsed.speaking || '',
            action: canonical,
          };
        }
        throw new BehaviorParseError(
          `Invalid action in structured response: ${parsed.action}`,
          Array.from(this.validBehaviors)
        );
      }
    } catch (e) {
      // Not JSON, fall through to text parsing
      if (!(e instanceof SyntaxError)) {
        // Re-throw if it's not a JSON parse error
        throw e;
      }
    }

    // Fallback: Clean the response and search for behavior name
    const cleaned = responseText.toLowerCase().trim();

    // First check synonyms (check these before exact matches to catch variations)
    for (const [synonym, canonical] of Object.entries(this.synonyms)) {
      if (cleaned.includes(synonym)) {
        return {
          thinking: responseText,
          speaking: '',
          action: canonical as AgentBehavior
        };
      }
    }

    // Then try to extract exact behavior name
    for (const behavior of Array.from(this.validBehaviors)) {
      if (cleaned.includes(behavior)) {
        return {
          thinking: responseText,
          speaking: '',
          action: behavior as AgentBehavior
        };
      }
    }

    // NO FALLBACK - Tell the agent to rephrase using core actions
    const coreActions = ['pick', 'gather', 'build', 'talk', 'explore', 'till', 'farm', 'plant'];
    const errorMsg =
      `I couldn't understand that action. Please rephrase using one of these core actions: ${coreActions.join(', ')}. ` +
      `Examples: "pick wood", "gather 20 wood", "build tent", "talk to someone", "explore".`;

    throw new BehaviorParseError(errorMsg, coreActions);
  }

  /**
   * Legacy method - parse behavior only (deprecated, use parseResponse instead)
   */
  parseBehavior(responseText: string): AgentBehavior {
    return this.parseResponse(responseText).action;
  }

  /**
   * Validate a behavior string.
   */
  isValidBehavior(behavior: string): boolean {
    return this.validBehaviors.has(behavior);
  }
}
