import type { AgentBehavior } from '@ai-village/core';

/**
 * Structured response from LLM with thinking, speaking, and action
 */
export interface AgentResponse {
  thinking: string;      // Internal thoughts
  speaking: string;      // What the agent says out loud
  action: AgentBehavior; // The action to take
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
 */
export class ResponseParser {
  private validBehaviors: Set<string> = new Set([
    'wander',
    'idle',
    'seek_food',
    'follow_agent',
    'talk',
  ]);

  /**
   * Parse LLM response text into full agent response (thinking, speaking, action).
   * Handles both structured JSON (from function calling) and plain text.
   * Throws BehaviorParseError if parsing fails - no silent fallbacks.
   */
  parseResponse(responseText: string): AgentResponse {
    if (!responseText || !responseText.trim()) {
      throw new BehaviorParseError('(empty response)', Array.from(this.validBehaviors));
    }

    // Try parsing as JSON first (structured output from function calling)
    try {
      const parsed = JSON.parse(responseText);
      if (parsed.action && this.isValidBehavior(parsed.action)) {
        const response: AgentResponse = {
          thinking: parsed.thinking || '',
          speaking: parsed.speaking || '',
          action: parsed.action as AgentBehavior
        };

        console.log('[ResponseParser] Structured response:', {
          action: response.action,
          thinking: response.thinking.slice(0, 80) || '(no thoughts)',
          speaking: response.speaking || '(silent)',
        });

        return response;
      }
      if (parsed.action) {
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

    // Try to extract behavior name
    for (const behavior of Array.from(this.validBehaviors)) {
      if (cleaned.includes(behavior)) {
        console.log('[ResponseParser] Text-based match:', behavior);
        return {
          thinking: responseText,
          speaking: '',
          action: behavior as AgentBehavior
        };
      }
    }

    // No fallback - throw if we can't parse
    throw new BehaviorParseError(responseText, Array.from(this.validBehaviors));
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
