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

// ============================================================================
// Narrative Types (Phase 1)
// ============================================================================

/**
 * Tracked behavioral pattern for narrative generation
 */
export interface BehaviorPattern {
  id: string;
  agentId: string;
  agentName: string;

  /** What pattern was detected */
  patternType:
    | 'repetition'      // Agent keeps doing same thing
    | 'change'          // Agent behavior shifted
    | 'correlation'     // Two agents always together
    | 'anomaly'         // Unusual behavior
    | 'milestone'       // Hit a threshold
    | 'relationship';   // Social pattern

  /** Pattern details */
  description: string;           // "dove has gathered wood 5 times in a row"
  firstObservedTick: number;
  lastObservedTick: number;
  occurrences: number;

  /** Narrative potential */
  mysteryLevel: number;          // 0-1, how intriguing is this?
  hasBeenMentioned: boolean;     // Did angel tell player about this?
  narrativeHook?: string;        // "wonder what they're planning?"

  /** Resolution tracking */
  resolved: boolean;
  resolution?: string;           // What happened / was discovered
}

/**
 * Active story thread being tracked
 */
export interface StoryThread {
  id: string;
  title: string;                 // "Dove's Big Project"

  /** What sparked this thread */
  triggerPattern: string;        // Pattern ID that started it

  /** Thread state */
  status: 'emerging' | 'active' | 'climax' | 'resolved';
  progressPercent: number;       // 0-100

  /** Narrative beats */
  beats: Array<{
    tick: number;
    description: string;         // What happened
    playerInvolved: boolean;     // Did player contribute?
  }>;

  /** Engagement tracking */
  playerAwareness: boolean;      // Has angel mentioned this?
  playerInterestLevel: number;   // How much has player engaged?
  lastMentionedTick: number;
  lastMentionedProgress: number; // Progress when last mentioned

  /** Potential outcomes */
  possibleOutcomes: string[];    // What could happen
  actualOutcome?: string;        // What did happen
}

/**
 * Angel's narrative tracking state
 */
export interface NarrativeState {
  /** Active patterns being tracked */
  patterns: Map<string, BehaviorPattern>;
  maxPatterns: number;           // Cap at 20

  /** Story threads */
  activeThreads: StoryThread[];
  completedThreads: StoryThread[];
  maxActiveThreads: number;      // Cap at 3

  /** Last pattern scan tick */
  lastPatternScanTick: number;
  patternScanInterval: number;   // Every 200 ticks (~10 seconds)
}

// ============================================================================
// Agency Types (Phase 2)
// ============================================================================

/**
 * Types of goals the angel can pursue
 */
export type AngelGoalType =
  | 'protect'      // Keep specific agent safe
  | 'nurture'      // Help agent grow/learn
  | 'harmony'      // Maintain village happiness
  | 'prosperity'   // Increase resources
  | 'discovery'    // Learn something new
  | 'relationship' // Deepen bond with player
  | 'challenge';   // Complete a difficult task

/**
 * A personal goal the angel is pursuing
 */
export interface AngelGoal {
  id: string;
  type: AngelGoalType;

  /** Goal description */
  title: string;               // "Keep Dove healthy today"
  description: string;         // "Make sure Dove's needs stay above 50%"

  /** Target (if applicable) */
  targetAgentId?: string;
  targetAgentName?: string;

  /** Progress tracking */
  progressPercent: number;     // 0-100
  startTick: number;
  deadline?: number;           // Optional tick deadline

  /** Status */
  status: 'active' | 'completed' | 'failed' | 'abandoned';

  /** Difficulty and reward */
  difficulty: 'easy' | 'medium' | 'hard';
  divinePowerReward: number;   // Power earned on completion

  /** Success/failure conditions (evaluated by system) */
  successCondition: string;    // Serialized condition
  failureCondition?: string;
}

/**
 * Angel's divine power and abilities
 */
export interface DivinePower {
  current: number;             // Current power (0-100)
  max: number;                 // Max power (starts at 100)
  regenRate: number;           // Power per tick (0.01 = 1 per 100 ticks)

  /** Power costs for actions */
  costs: {
    minorBlessing: number;     // 5 - small buff
    majorBlessing: number;     // 20 - significant help
    miracle: number;           // 50 - big intervention
    proactiveAction: number;   // 10 - doing something without being asked
  };

  /** Unlocked abilities */
  unlockedAbilities: string[]; // ['minor_blessing', 'weather_sense', ...]
}

/**
 * Angel achievements
 */
export interface AngelAchievement {
  id: string;
  title: string;
  description: string;
  unlockedTick: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

/**
 * Angel's agency and goals
 */
export interface AngelAgency {
  /** Personal goals */
  activeGoals: AngelGoal[];
  completedGoals: AngelGoal[];
  failedGoals: AngelGoal[];
  maxActiveGoals: number;      // 3

  /** Divine power */
  power: DivinePower;

  /** Achievements */
  achievements: AngelAchievement[];

  /** Statistics */
  stats: {
    goalsCompleted: number;
    goalsFailed: number;
    totalPowerSpent: number;
    agentsHelped: number;
    miraclesPerformed: number;
    daysWatching: number;
  };

  /** Personality modifiers based on history */
  personality: {
    protective: number;        // 0-1, how much angel prioritizes safety
    ambitious: number;         // 0-1, how hard goals angel picks
    playful: number;           // 0-1, how often angel experiments
  };
}

// ============================================================================
// Memory Structure
// ============================================================================

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

  /** Narrative tracking - patterns and story threads (Phase 1) */
  narrative: NarrativeState;

  /** Angel's agency - goals, power, achievements (Phase 2) */
  agency: AngelAgency;
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
    narrative: {
      patterns: new Map<string, BehaviorPattern>(),
      maxPatterns: 20,
      activeThreads: [],
      completedThreads: [],
      maxActiveThreads: 3,
      lastPatternScanTick: 0,
      patternScanInterval: 200, // Every 200 ticks (~10 seconds)
    },
    agency: {
      activeGoals: [],
      completedGoals: [],
      failedGoals: [],
      maxActiveGoals: 3,
      power: {
        current: 100,
        max: 100,
        regenRate: 0.01, // 1 power per 100 ticks
        costs: {
          minorBlessing: 5,
          majorBlessing: 20,
          miracle: 50,
          proactiveAction: 10,
        },
        unlockedAbilities: ['minor_blessing', 'weather_sense'],
      },
      achievements: [],
      stats: {
        goalsCompleted: 0,
        goalsFailed: 0,
        totalPowerSpent: 0,
        agentsHelped: 0,
        miraclesPerformed: 0,
        daysWatching: 0,
      },
      personality: {
        protective: 0.5,
        ambitious: 0.5,
        playful: 0.5,
      },
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
