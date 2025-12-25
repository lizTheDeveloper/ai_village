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
    'follow_agent',
    'talk',
    'pick',      // Unified action for gathering/harvesting/collecting resources
    'explore',
    'approach',
    'observe',
    'rest',
    'work',
    'help',
    'build',
    'deposit_items',
    'call_meeting',
    'attend_meeting',
    'till',
    'farm',
    'plant',
    'water',
    'fertilize',
    'navigate',
    'explore_frontier',
    'explore_spiral',
    'seek_sleep',
    'seek_warmth',
  ]);

  // Synonym mapping - lemmatize similar actions to core behaviors
  private synonyms: Record<string, AgentBehavior> = {
    // Pick = gather, harvest, collect, get, take, forage, scavenge, find
    'gather': 'pick',
    'harvest': 'pick',
    'collect': 'pick',
    'get': 'pick',
    'take': 'pick',
    'grab': 'pick',
    'gather_seeds': 'pick',
    'seek_food': 'pick',
    'forage': 'pick',
    'scavenge': 'pick',
    'find': 'pick',
    'chop': 'pick',
    'mine': 'pick',
    'cut': 'pick',
    'fetch': 'pick',
    // Rest = sleep, idle, relax, recover
    'sleep': 'rest',
    'relax': 'rest',
    'recover': 'rest',
    'nap': 'rest',
    // Talk = speak, say, chat, converse, discuss
    'speak': 'talk',
    'say': 'talk',
    'chat': 'talk',
    'converse': 'talk',
    'discuss': 'talk',
    'ask': 'talk',
    'tell': 'talk',
    // Build = construct, make, craft, create
    'construct': 'build',
    'make': 'build',
    'craft': 'build',
    'create': 'build',
    // Explore = search, scout, investigate, look
    'search': 'explore',
    'scout': 'explore',
    'investigate': 'explore',
    'look': 'explore',
    // Wander = roam, walk
    'roam': 'wander',
    'walk': 'wander',
    'stroll': 'wander',
  };

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

    // First check synonyms (check these before exact matches to catch variations)
    for (const [synonym, canonical] of Object.entries(this.synonyms)) {
      if (cleaned.includes(synonym)) {
        console.log(`[ResponseParser] Synonym match: "${synonym}" → "${canonical}"`);
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
        console.log('[ResponseParser] Text-based match:', behavior);
        return {
          thinking: responseText,
          speaking: '',
          action: behavior as AgentBehavior
        };
      }
    }

    // FALLBACK: If we truly can't parse, default to wander but LOG IT LOUDLY
    // This is a last resort to prevent agent getting stuck, not a silent fallback
    console.error('[ResponseParser] ⚠️ FAILED TO PARSE BEHAVIOR - DEFAULTING TO WANDER');
    console.error('[ResponseParser] Response text:', responseText.slice(0, 200));
    console.error('[ResponseParser] Valid behaviors:', Array.from(this.validBehaviors).join(', '));
    console.error('[ResponseParser] Consider adding synonym mapping for this phrase!');

    return {
      thinking: responseText,
      speaking: `(I'm not sure what to do, so I'll just wander)`,
      action: 'wander'
    };
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
