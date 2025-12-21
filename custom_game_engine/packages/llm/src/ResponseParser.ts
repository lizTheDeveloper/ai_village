import type { AgentBehavior } from '@ai-village/core';

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
   * Parse LLM response text into a behavior.
   * Returns a fallback behavior if parsing fails.
   */
  parseBehavior(responseText: string, fallback: AgentBehavior = 'wander'): AgentBehavior {
    // Clean the response
    const cleaned = responseText.toLowerCase().trim();

    // Try to extract behavior name
    for (const behavior of Array.from(this.validBehaviors)) {
      if (cleaned.includes(behavior)) {
        return behavior as AgentBehavior;
      }
    }

    // Fallback if no valid behavior found
    console.warn(`Could not parse behavior from: "${responseText}", using fallback: ${fallback}`);
    return fallback;
  }

  /**
   * Validate a behavior string.
   */
  isValidBehavior(behavior: string): boolean {
    return this.validBehaviors.has(behavior);
  }
}
