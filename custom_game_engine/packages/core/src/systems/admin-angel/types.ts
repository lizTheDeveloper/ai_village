/**
 * Admin Angel - Shared Types
 *
 * Common types, interfaces, and configuration for the admin angel system.
 */

import type { LLMDecisionQueue } from '../../types/LLMTypes.js';
import { generateRandomName } from '../../utils/nameGenerator.js';

// ============================================================================
// Angel Name Persistence
// ============================================================================

const ANGEL_NAME_KEY = 'multiverse_angel_name';
const DIVINE_CHAT_STORAGE_KEY = 'multiverse_divine_chat_messages';

/**
 * Get or create a stable angel name using localStorage
 */
export function getStableAngelName(): string {
  // Check if we're in a browser environment
  if (typeof localStorage !== 'undefined') {
    const savedName = localStorage.getItem(ANGEL_NAME_KEY);
    if (savedName) {
      return savedName;
    }
    // Generate new name and save it
    const newName = generateRandomName(2);
    localStorage.setItem(ANGEL_NAME_KEY, newName);
    return newName;
  }
  // Node.js environment - generate fresh each time (headless mode)
  return generateRandomName(2);
}

/**
 * Check if the player has been greeted before (chat history exists)
 */
export function hasPlayerBeenGreeted(): boolean {
  if (typeof localStorage === 'undefined') return false;

  // Check if there are saved chat messages (indicates returning player)
  const savedMessages = localStorage.getItem(DIVINE_CHAT_STORAGE_KEY);
  if (savedMessages) {
    try {
      const messages = JSON.parse(savedMessages);
      if (Array.isArray(messages) && messages.length > 0) {
        return true;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return false;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for AdminAngelSystem
 */
export interface AdminAngelSystemConfig {
  /** Optional LLM queue for using the shared LLM infrastructure */
  llmQueue?: LLMDecisionQueue;
}

// LLM Configuration - Uses environment variables or defaults (fallback when no queue provided)
// Angels use 'high' tier (120B model) for better intelligence
export const LLM_CONFIG = {
  model: typeof process !== 'undefined' ? (process.env?.LLM_MODEL || 'openai/gpt-oss-120b') : 'openai/gpt-oss-120b',
  baseUrl: typeof process !== 'undefined' ? (process.env?.LLM_BASE_URL || 'https://api.groq.com/openai/v1') : 'https://api.groq.com/openai/v1',
  apiKey: typeof process !== 'undefined' ? (process.env?.GROQ_API_KEY || process.env?.LLM_API_KEY || '') : '',
};

// ============================================================================
// Internal Types
// ============================================================================

export interface ChatMessage {
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}

export interface GameStateSummary {
  tick: number;
  day: number;
  timeOfDay: string;
  agentCount: number;
  selectedAgentName?: string;
  selectedAgentNeeds?: string;
  recentEvents: string[];
  gameSpeed: number;
  isPaused: boolean;
}

// ============================================================================
// Query Intent Detection Types
// ============================================================================

/**
 * Types of queries the angel can detect and answer with structured data
 */
export interface QueryIntent {
  type: 'agent_needs' | 'resource_check' | 'activity_summary' | 'agent_detail' | 'concerns' | 'narrative_summary';
  need?: string;        // For agent_needs: 'hunger', 'energy', 'overall'
  sort?: 'asc' | 'desc';
  resource?: string;    // For resource_check
  agentName?: string;   // For agent_detail
}

// ============================================================================
// Command Types
// ============================================================================

export interface ParsedCommand {
  type: string;
  args: string[];
}

export interface DetectedCommand {
  type: string;
  target?: string;
}
