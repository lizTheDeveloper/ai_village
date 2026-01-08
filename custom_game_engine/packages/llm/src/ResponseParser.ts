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
 * Goal set by Talker layer
 */
export interface AgentGoal {
  type: 'personal' | 'medium_term' | 'group';
  description: string;
}

/**
 * Structured response from LLM with thinking, speaking, action, and goal
 */
export interface AgentResponse {
  thinking: string;      // Internal thoughts
  speaking: string;      // What the agent says out loud
  action: AgentBehavior; // The normalized action type
  actionParams?: Record<string, unknown>; // Additional parameters from object-style action
  goal?: AgentGoal;      // Goal set by Talker layer (optional)
  parseQuality: 'strict' | 'fallback' | 'failed'; // How the response was parsed
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
   * Extracts thinking from <think> tags (Qwen3 format) before parsing JSON.
   * Throws BehaviorParseError if parsing fails - no silent fallbacks.
   *
   * Parse quality:
   * - 'strict': Valid JSON with all required fields
   * - 'fallback': Fuzzy text extraction (warns about malformed response)
   * - 'failed': Could not parse (throws error)
   */
  parseResponse(responseText: string): AgentResponse {
    if (!responseText || !responseText.trim()) {
      throw new BehaviorParseError('(empty response)', Array.from(this.validBehaviors));
    }

    // Extract thinking from <think> tags (Qwen3 format)
    const { thinking: extractedThinking, remaining } = this.extractThinkTags(responseText);

    // STEP 1: Try strict JSON parsing first (structured output from function calling)
    // Use remaining text (with think tags removed) for JSON parsing
    const textToParse = remaining.trim() || responseText.trim();

    try {
      const parsed = JSON.parse(textToParse);

      // Parse goal if present (Talker layer goal-setting)
      const goal = this.parseGoal(parsed.goal);

      // Combine extracted thinking (from <think> tags) with JSON thinking field
      const thinking = extractedThinking || parsed.thinking || '';

      // Handle action as object with type field: { "type": "plan_build", "building": "workbench" }
      if (parsed.action && typeof parsed.action === 'object' && parsed.action.type) {
        const actionType = parsed.action.type;
        if (this.isValidBehavior(actionType)) {
          // Extract action params (everything except 'type')
          const { type, ...actionParams } = parsed.action;
          return {
            thinking,
            speaking: parsed.speaking || '',
            action: actionType as AgentBehavior,
            actionParams: Object.keys(actionParams).length > 0 ? actionParams : undefined,
            goal,
            parseQuality: 'strict',
          };
        }
        // Check if action type is a synonym
        const canonical = this.synonyms[actionType.toLowerCase()];
        if (canonical) {
          const { type, ...actionParams } = parsed.action;
          return {
            thinking,
            speaking: parsed.speaking || '',
            action: canonical,
            actionParams: Object.keys(actionParams).length > 0 ? actionParams : undefined,
            goal,
            parseQuality: 'strict',
          };
        }
        throw new BehaviorParseError(
          `Invalid action type in structured response: ${actionType}`,
          Array.from(this.validBehaviors)
        );
      }

      // Handle action as simple string: { "action": "gather" }
      if (parsed.action && typeof parsed.action === 'string') {
        if (this.isValidBehavior(parsed.action)) {
          return {
            thinking,
            speaking: parsed.speaking || '',
            action: parsed.action as AgentBehavior,
            goal,
            parseQuality: 'strict',
          };
        }
        // Check if it's a synonym
        const canonical = this.synonyms[parsed.action.toLowerCase()];
        if (canonical) {
          return {
            thinking,
            speaking: parsed.speaking || '',
            action: canonical,
            goal,
            parseQuality: 'strict',
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
      // Continue to fallback parsing below
    }

    // STEP 2: Fallback - Fuzzy extraction from malformed text
    // Log warning so we can track how often this happens
    console.warn(
      '[ResponseParser] Falling back to fuzzy text extraction. ' +
      'LLM response was not valid JSON. This may indicate prompt issues. ' +
      `Response preview: "${responseText.slice(0, 100)}..."`
    );

    // Fallback: Clean the response and search for behavior name
    const cleaned = responseText.toLowerCase().trim();

    // First check synonyms (check these before exact matches to catch variations)
    for (const [synonym, canonical] of Object.entries(this.synonyms)) {
      if (cleaned.includes(synonym)) {
        console.warn(`[ResponseParser] Extracted action via synonym match: "${synonym}" -> "${canonical}"`);
        return {
          thinking: responseText,
          speaking: '',
          action: canonical as AgentBehavior,
          parseQuality: 'fallback',
        };
      }
    }

    // Then try to extract exact behavior name
    for (const behavior of Array.from(this.validBehaviors)) {
      if (cleaned.includes(behavior)) {
        console.warn(`[ResponseParser] Extracted action via keyword match: "${behavior}"`);
        return {
          thinking: responseText,
          speaking: '',
          action: behavior as AgentBehavior,
          parseQuality: 'fallback',
        };
      }
    }

    // STEP 3: Parse failed - no valid action found
    // NO FALLBACK - Tell the agent to rephrase using core actions
    const coreActions = ['pick', 'gather', 'build', 'talk', 'wander', 'till', 'farm', 'plant'];
    const errorMsg =
      `I couldn't understand that action. Please rephrase using one of these core actions: ${coreActions.join(', ')}. ` +
      `Examples: "pick wood", "gather 20 wood", "build tent", "talk to someone", "wander".`;

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

  /**
   * Extract thinking content from <think> tags (Qwen3 format).
   * Returns the extracted thinking and the remaining text with tags removed.
   */
  private extractThinkTags(text: string): { thinking: string; remaining: string } {
    // Match <think>...</think> tags (case-insensitive, allows whitespace)
    const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
    const matches = text.match(thinkRegex);

    if (!matches || matches.length === 0) {
      return { thinking: '', remaining: text };
    }

    // Extract all thinking content
    const thinkingParts: string[] = [];
    for (const match of matches) {
      const content = match.replace(/<\/?think>/gi, '').trim();
      if (content) {
        thinkingParts.push(content);
      }
    }

    // Remove think tags from the text
    const remaining = text.replace(thinkRegex, '').trim();

    return {
      thinking: thinkingParts.join('\n'),
      remaining,
    };
  }

  /**
   * Parse goal from LLM response.
   * Returns undefined if no valid goal is present.
   */
  private parseGoal(goalData: unknown): AgentGoal | undefined {
    if (!goalData || typeof goalData !== 'object') {
      return undefined;
    }

    const goal = goalData as Record<string, unknown>;

    // Validate goal type
    const validTypes = ['personal', 'medium_term', 'group'];
    if (!goal.type || typeof goal.type !== 'string' || !validTypes.includes(goal.type)) {
      return undefined;
    }

    // Validate description
    if (!goal.description || typeof goal.description !== 'string' || !goal.description.trim()) {
      return undefined;
    }

    return {
      type: goal.type as 'personal' | 'medium_term' | 'group',
      description: goal.description.trim(),
    };
  }
}
