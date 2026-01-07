import { ComponentBase } from '../ecs/Component.js';

/**
 * LLMHistoryComponent - Stores last LLM interaction for debugging/UI
 *
 * Tracks the most recent LLM prompt and response for each layer (Talker/Executor).
 * Used by:
 * - Agent Info Panel "Last Response" tab (formatted display)
 * - AgentDebugLogger (raw JSON logging for benchmarking)
 *
 * Note: In-memory only, not persisted in saves.
 * IMPORTANT: This component is NOT serialized - it's excluded from save files.
 */

export type LLMLayer = 'talker' | 'executor';

export interface LLMInteraction {
  timestamp: number;
  layer: LLMLayer;
  prompt: string;
  response: {
    thinking?: string;
    action?: any;
    speaking?: string;
    rawResponse: any;
  };
  success: boolean;
  error?: string;
}

export class LLMHistoryComponent extends ComponentBase {
  public readonly type = 'llm_history';

  // Store last interaction per layer
  public lastTalkerInteraction: LLMInteraction | null = null;
  public lastExecutorInteraction: LLMInteraction | null = null;

  constructor(public entityId: string) {
    super();
  }

  /**
   * Record a new LLM interaction
   */
  recordInteraction(interaction: LLMInteraction): void {
    if (interaction.layer === 'talker') {
      this.lastTalkerInteraction = interaction;
    } else {
      this.lastExecutorInteraction = interaction;
    }
  }

  /**
   * Get last interaction for a specific layer
   */
  getLastInteraction(layer: LLMLayer): LLMInteraction | null {
    return layer === 'talker' ? this.lastTalkerInteraction : this.lastExecutorInteraction;
  }

  /**
   * Get the most recent interaction (regardless of layer)
   */
  getLastAnyInteraction(): LLMInteraction | null {
    if (!this.lastTalkerInteraction && !this.lastExecutorInteraction) {
      return null;
    }
    if (!this.lastTalkerInteraction) {
      return this.lastExecutorInteraction;
    }
    if (!this.lastExecutorInteraction) {
      return this.lastTalkerInteraction;
    }
    // Both exist, return most recent
    return this.lastTalkerInteraction.timestamp > this.lastExecutorInteraction.timestamp
      ? this.lastTalkerInteraction
      : this.lastExecutorInteraction;
  }

  /**
   * Clear history
   */
  clear(): void {
    this.lastTalkerInteraction = null;
    this.lastExecutorInteraction = null;
  }
}

/**
 * Factory function for creating LLMHistoryComponent
 */
export function createLLMHistoryComponent(entityId: string): LLMHistoryComponent {
  return new LLMHistoryComponent(entityId);
}
