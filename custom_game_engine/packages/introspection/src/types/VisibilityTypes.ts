/**
 * Consumer visibility flag definitions
 *
 * Controls which consumers (Player, LLM, Agent, User, Developer) can see each field.
 */

/**
 * Visibility configuration for different consumers
 *
 * Defines which parts of the system can access this field:
 * - player: In-game UI (health bars, inventory)
 * - llm: AI decision context (can be 'summarized' for brevity)
 * - agent: NPC self-awareness (what NPCs know about themselves)
 * - user: Player-facing settings/info UI
 * - dev: Developer debug/cheat tools
 */
export interface Visibility {
  /**
   * Show in player UI (in-game HUD, health bars, inventory)
   * @default false
   */
  player?: boolean;

  /**
   * Include in LLM context
   * - true: Full field value
   * - 'summarized': Use llm.summarize function
   * - false: Exclude from LLM context
   * @default false
   */
  llm?: boolean | 'summarized';

  /**
   * Include in agent self-awareness (what NPCs know about themselves)
   * @default false
   */
  agent?: boolean;

  /**
   * Show in user settings/info UI (player-facing controls)
   * @default false
   */
  user?: boolean;

  /**
   * Show in developer tools (debug panel, cheat menu)
   * @default true
   */
  dev?: boolean;
}

/**
 * Type guard to check if a visibility config shows field to LLM in any form
 */
export function isVisibleToLLM(visibility: Visibility): boolean {
  return visibility.llm === true || visibility.llm === 'summarized';
}

/**
 * Type guard to check if LLM should get summarized version
 */
export function shouldSummarizeForLLM(visibility: Visibility): boolean {
  return visibility.llm === 'summarized';
}
