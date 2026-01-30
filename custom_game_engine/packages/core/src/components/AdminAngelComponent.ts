/**
 * AdminAngelComponent - The player's helper angel in divine chat
 *
 * This is a special angel that:
 * - Lives in the chat room (no physical body)
 * - Helps players learn the game
 * - Has memory of the player across sessions
 * - Gets turns: on player message + periodic (1/min proactive)
 * - Can use admin tools (time control, camera, panels, behaviors)
 *
 * The angel speaks casually like a gamer friend, not like an AI assistant.
 */

import type { Component } from '../ecs/Component.js';

// ============================================================================
// Memory Types
// ============================================================================

/**
 * Individual observation made by the angel - part of its consciousness stream
 */
export interface AngelObservation {
  tick: number;
  timestamp: number;

  /** Natural language observation */
  text: string;

  /** Agent this relates to (if any) */
  agentId?: string;
  agentName?: string;

  /** Type of observation for filtering/prioritization */
  type: 'action' | 'state' | 'achievement' | 'concern' | 'atmosphere' | 'relationship';

  /** How interesting/notable this is (affects retention) */
  salience: number; // 0-1
}

/**
 * Angel's current emotional state based on village conditions
 */
export type AngelMood =
  | 'content'      // Village is doing well
  | 'worried'      // Something concerning
  | 'curious'      // Something interesting happening
  | 'excited'      // Achievement or milestone
  | 'pensive'      // Reflecting on the village
  | 'protective';  // Agent in danger

/**
 * Angel's consciousness stream - what it has noticed and is thinking about
 */
export interface AngelConsciousness {
  /**
   * Rolling buffer of observations - the angel's inner monologue
   * Oldest observations drop off as new ones are added
   */
  observations: AngelObservation[];

  /**
   * Maximum observations to retain
   */
  maxObservations: number; // default 50

  /**
   * Last tick the angel "thought" about the world
   */
  lastThoughtTick: number;

  /**
   * Current emotional state based on village conditions
   */
  mood: AngelMood;

  /**
   * What the angel is currently pondering (for proactive comments)
   */
  currentWonder: string | null;

  /**
   * What triggered the current proactive turn (if any)
   * Set before LLM call, cleared after response
   */
  proactiveTrigger?: string;

  /**
   * Last mood that was reported to player (avoid duplicate mood messages)
   */
  lastMoodReported?: AngelMood;
}

/**
 * Notable memory about a specific agent
 */
export interface AgentMemory {
  tick: number;
  text: string;
  type: 'achievement' | 'struggle' | 'interaction' | 'quirk';
}

/**
 * Angel's relationship tracking for a specific agent
 */
export interface AgentFamiliarity {
  /** Agent entity ID */
  agentId: string;

  /** Cached name for quick reference */
  name: string;

  /** When the angel first noticed this agent */
  firstNoticedTick: number;

  /** How many times player has asked about this agent */
  playerInteractionCount: number;

  /** Last observed action/state */
  lastSeenDoing: string;
  lastSeenTick: number;

  /** Angel's impression of this agent (generated, evolves) */
  impression: string; // "the builder", "always hungry", "cautious"

  /** Current interest level (decays over time, spikes with events) */
  interestLevel: number; // 0-1

  /** Notable memories about this agent */
  memories: AgentMemory[];
}

/**
 * Angel's attention focus state - what it's currently watching
 */
export interface AngelAttention {
  /**
   * Currently focused agent (player said "watch X")
   * Gets more frequent sampling
   */
  focusedAgentId: string | null;
  focusedAgentName: string | null;
  focusSinceTick: number | null;

  /**
   * Recently noticed agents (for varied observations)
   */
  recentlyNoticed: string[];

  /**
   * Ticks until next ambient scan
   */
  scanCooldown: number;

  /**
   * Ticks until next focused agent update (shorter interval)
   */
  focusCooldown: number;
}

/**
 * Player knowledge accumulated over sessions
 */
export interface PlayerKnowledge {
  /** Player's preferred name (if mentioned) */
  playerName?: string;

  /** First time we met this player */
  firstMetAt: number;

  /** Total playtime in ticks */
  totalPlaytime: number;

  /** Number of sessions played */
  sessionsPlayed: number;

  /** Preferred game speed */
  preferredSpeed: 'slow' | 'normal' | 'fast' | 'unknown';

  /** Observed playstyle tags */
  playstyle: string[];

  /** Agent IDs they select often */
  favoriteAgents: string[];

  /** Topics they ask about frequently */
  frequentTopics: string[];
}

/**
 * Relationship state with the player
 */
export interface PlayerRelationship {
  /** Things that came up naturally in conversation */
  insideJokes: string[];

  /** Things the player dislikes (observed) */
  thingsTheyDislike: string[];

  /** Things the player enjoys (observed) */
  thingsTheyEnjoy: string[];

  /** How many messages exchanged total */
  messageCount: number;

  /** Rapport level 0-100 */
  rapport: number;
}

/**
 * Soft tracking of what the player has learned (not rigid gates)
 */
export interface TutorialProgress {
  hasSeenBasicControls: boolean;
  hasBuiltSomething: boolean;
  hasTamedAnimal: boolean;
  understandsNeeds: boolean;
  understandsCrafting: boolean;
  understandsTime: boolean;
  understandsAgentSelection: boolean;
  hasAskedAboutMagic: boolean;
  hasAskedAboutDivinity: boolean;
}

/**
 * Recent conversation context
 */
export interface ConversationContext {
  /** Last topic discussed */
  lastTopic: string;

  /** Current inferred mood */
  currentMood: 'curious' | 'frustrated' | 'excited' | 'confused' | 'neutral';

  /** Recent messages (last N for context window) */
  recentMessages: Array<{
    role: 'player' | 'angel';
    content: string;
    timestamp: number;
  }>;

  /** Pending things to mention (proactive observations) */
  pendingObservations: string[];

  /** Last tick the angel took a proactive turn */
  lastProactiveTick: number;

  /** Last tick the angel responded to player */
  lastResponseTick: number;

  /** Structured query result to include in prompt (cleared after use) */
  queryContext?: string;
}

/**
 * Full admin angel memory structure
 */
export interface AdminAngelMemory {
  playerKnowledge: PlayerKnowledge;
  relationship: PlayerRelationship;
  tutorialProgress: TutorialProgress;
  conversation: ConversationContext;

  /** Stream of consciousness - what the angel has noticed */
  consciousness: AngelConsciousness;

  /** Relationship with individual agents */
  agentFamiliarity: Map<string, AgentFamiliarity>;

  /** Current attention state */
  attention: AngelAttention;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Admin Angel component - attached to the angel entity
 */
export interface AdminAngelComponent extends Component {
  type: 'admin_angel';
  version: number;

  /** Angel's display name (player can rename) */
  name: string;

  /** The angel's memory of this player */
  memory: AdminAngelMemory;

  /** Whether the angel is active (can be muted) */
  active: boolean;

  /** Ticks between proactive turns (default: 1200 = 1 minute at 20 TPS) */
  proactiveInterval: number;

  /** Max messages in conversation context */
  contextWindowSize: number;

  /** LLM provider to use (null = default) */
  llmProvider: string | null;

  /** Whether currently waiting for LLM response */
  awaitingResponse: boolean;

  /** Queue of player messages awaiting response */
  pendingPlayerMessages: string[];

  /** Session start tick */
  sessionStartTick: number;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a fresh admin angel memory
 */
export function createAdminAngelMemory(): AdminAngelMemory {
  return {
    playerKnowledge: {
      firstMetAt: Date.now(),
      totalPlaytime: 0,
      sessionsPlayed: 1,
      preferredSpeed: 'unknown',
      playstyle: [],
      favoriteAgents: [],
      frequentTopics: [],
    },
    relationship: {
      insideJokes: [],
      thingsTheyDislike: [],
      thingsTheyEnjoy: [],
      messageCount: 0,
      rapport: 50, // Start neutral
    },
    tutorialProgress: {
      hasSeenBasicControls: false,
      hasBuiltSomething: false,
      hasTamedAnimal: false,
      understandsNeeds: false,
      understandsCrafting: false,
      understandsTime: false,
      understandsAgentSelection: false,
      hasAskedAboutMagic: false,
      hasAskedAboutDivinity: false,
    },
    conversation: {
      lastTopic: '',
      currentMood: 'neutral',
      recentMessages: [],
      pendingObservations: [],
      lastProactiveTick: 0,
      lastResponseTick: 0,
    },
    consciousness: {
      observations: [],
      maxObservations: 50,
      lastThoughtTick: 0,
      mood: 'content',
      currentWonder: null,
    },
    agentFamiliarity: new Map<string, AgentFamiliarity>(),
    attention: {
      focusedAgentId: null,
      focusedAgentName: null,
      focusSinceTick: null,
      recentlyNoticed: [],
      scanCooldown: 0,
      focusCooldown: 0,
    },
  };
}

/**
 * Create an admin angel component with default or existing memory
 */
export function createAdminAngelComponent(
  name: string = 'nex',
  existingMemory?: AdminAngelMemory
): AdminAngelComponent {
  return {
    type: 'admin_angel',
    version: 1,
    name,
    memory: existingMemory ?? createAdminAngelMemory(),
    active: true,
    proactiveInterval: 1200, // 1 minute at 20 TPS
    contextWindowSize: 20,
    llmProvider: null,
    awaitingResponse: false,
    pendingPlayerMessages: [],
    sessionStartTick: 0,
  };
}

// ============================================================================
// Memory Helpers
// ============================================================================

/**
 * Add a message to conversation context (maintains window size)
 */
export function addMessageToContext(
  memory: AdminAngelMemory,
  role: 'player' | 'angel',
  content: string,
  maxSize: number = 20
): void {
  memory.conversation.recentMessages.push({
    role,
    content,
    timestamp: Date.now(),
  });

  // Trim to max size
  if (memory.conversation.recentMessages.length > maxSize) {
    memory.conversation.recentMessages = memory.conversation.recentMessages.slice(-maxSize);
  }

  // Update message count
  if (role === 'player') {
    memory.relationship.messageCount++;
  }
}

/**
 * Record an observation for later mention
 */
export function addPendingObservation(memory: AdminAngelMemory, observation: string): void {
  // Don't duplicate
  if (!memory.conversation.pendingObservations.includes(observation)) {
    memory.conversation.pendingObservations.push(observation);
  }

  // Cap at 5 pending
  if (memory.conversation.pendingObservations.length > 5) {
    memory.conversation.pendingObservations.shift();
  }
}

/**
 * Pop an observation (for proactive turns)
 */
export function popPendingObservation(memory: AdminAngelMemory): string | undefined {
  return memory.conversation.pendingObservations.shift();
}

/**
 * Update playstyle based on observed behavior
 */
export function inferPlaystyle(memory: AdminAngelMemory, action: string): void {
  const styleMap: Record<string, string> = {
    build: 'builder',
    craft: 'builder',
    gather: 'gatherer',
    explore: 'explorer',
    talk: 'social',
    fight: 'combat',
    hunt: 'hunter',
    farm: 'farmer',
    research: 'researcher',
    magic: 'mage',
  };

  const style = styleMap[action];
  if (style && !memory.playerKnowledge.playstyle.includes(style)) {
    memory.playerKnowledge.playstyle.push(style);
    // Cap at 5 styles
    if (memory.playerKnowledge.playstyle.length > 5) {
      memory.playerKnowledge.playstyle.shift();
    }
  }
}

/**
 * Record a favorite agent
 */
export function recordFavoriteAgent(memory: AdminAngelMemory, agentId: string): void {
  // Move to front if already exists, otherwise add
  const existing = memory.playerKnowledge.favoriteAgents.indexOf(agentId);
  if (existing > -1) {
    memory.playerKnowledge.favoriteAgents.splice(existing, 1);
  }
  memory.playerKnowledge.favoriteAgents.unshift(agentId);

  // Cap at 5
  if (memory.playerKnowledge.favoriteAgents.length > 5) {
    memory.playerKnowledge.favoriteAgents.pop();
  }
}
