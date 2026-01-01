import type { Component } from '../ecs/Component.js';
import type { SkillsComponent, SkillId } from './SkillsComponent.js';

export type AgentBehavior =
  | 'wander'
  | 'idle'
  | 'follow'
  | 'flee'
  | 'follow_agent'
  | 'talk'
  | 'pick'         // Unified: gather, harvest, collect, get (resources, food, seeds)
  | 'gather'       // Legacy - aliased to 'pick'
  | 'harvest'      // Legacy - aliased to 'pick'
  | 'gather_seeds' // Legacy - aliased to 'pick'
  | 'seek_food'    // Legacy - aliased to 'pick'
  | 'explore'
  | 'approach'
  | 'observe'
  | 'rest'
  | 'work'
  | 'help'
  | 'build'
  | 'plan_build'   // Strategic building - queues materials gathering then construction
  | 'craft'        // Crafting at stations
  | 'eat'
  | 'seek_sleep'
  | 'forced_sleep'
  | 'flee_danger'
  | 'seek_water'
  | 'seek_shelter'
  | 'deposit_items'
  | 'seek_warmth'
  | 'seek_cooling'
  | 'call_meeting'
  | 'attend_meeting'
  | 'till'
  | 'farm'
  | 'plant'
  | 'water'
  | 'fertilize'
  // Navigation & Exploration (Phase 4.5)
  | 'navigate'
  | 'explore_frontier'
  | 'explore_spiral'
  | 'follow_gradient'
  // Animal Husbandry
  | 'tame_animal'
  | 'house_animal'
  // Economy
  | 'trade'
  // Magic (Phase 30)
  | 'cast_spell'
  // Divine Communication (Phase 27)
  | 'pray'
  | 'meditate'
  | 'group_pray'
  // Building Maintenance (Phase 41)
  | 'repair'
  | 'upgrade'
  // Tile-Based Voxel Building (Phase 3-4)
  | 'material_transport'
  | 'tile_build'
  // Research & Discovery (Phase 13)
  | 'research'
  // Self-management
  | 'set_priorities'
  // Player Control (Phase 16)
  | 'player_controlled';

export interface SpeechHistoryEntry {
  text: string;
  tick: number;
}

/**
 * Agent Thinking Tiers - Controls LLM usage frequency and triggers
 *
 * Tier 1: FULL - Full LLM agents that think regularly
 *   - Think on idle (5s), task complete, periodic (5min)
 *   - Rich decision making, goal setting, conversations
 *   - Performance cost: HIGH
 *
 * Tier 2: REDUCED - LLM agents that think less often
 *   - Think only on task complete and periodic (30min)
 *   - Good for background characters with occasional depth
 *   - Performance cost: MEDIUM
 *
 * Tier 3: AUTONOMIC - Scripted NPCs with LLM-on-interaction
 *   - Use scripted behaviors by default (no LLM cost)
 *   - LLM activates when: player interacts, conversation starts, special events
 *   - After interaction ends, returns to scripted behavior
 *   - Performance cost: LOW (only when interacted with)
 */
export type AgentTier = 'full' | 'reduced' | 'autonomic';

/**
 * Configuration for each agent tier
 */
export const AGENT_TIER_CONFIG: Record<AgentTier, {
  /** Seconds to wait before thinking when idle (null = don't think on idle) */
  idleThinkDelaySec: number | null;
  /** Seconds between periodic LLM checks (null = don't do periodic) */
  periodicThinkSec: number | null;
  /** Whether to think immediately when a task completes */
  thinkOnTaskComplete: boolean;
  /** Whether this tier uses scripted behavior by default */
  defaultScripted: boolean;
  /** Description for UI/debugging */
  description: string;
}> = {
  full: {
    idleThinkDelaySec: 5,
    periodicThinkSec: 300, // 5 minutes
    thinkOnTaskComplete: true,
    defaultScripted: false,
    description: 'Full LLM - thinks regularly',
  },
  reduced: {
    idleThinkDelaySec: null, // Don't think just because idle
    periodicThinkSec: 1800, // 30 minutes
    thinkOnTaskComplete: true,
    defaultScripted: false,
    description: 'Reduced LLM - thinks on task complete only',
  },
  autonomic: {
    idleThinkDelaySec: null,
    periodicThinkSec: null,
    thinkOnTaskComplete: false,
    defaultScripted: true, // Uses scripted behavior by default
    description: 'Autonomic NPC - LLM only on interaction',
  },
};

export interface QueuedBehavior {
  behavior: AgentBehavior;
  behaviorState?: Record<string, unknown>;
  priority: 'normal' | 'high' | 'critical';
  repeats?: number; // undefined = once, 0 = infinite, N = repeat N times
  currentRepeat?: number; // Track current repeat iteration
  label?: string; // Optional human-readable label for debugging
  startedAt?: number; // Tick when behavior started (for timeout detection)
}

/**
 * Strategic priorities that influence automated behavior selection.
 * Values are 0-1 weights. Higher = more likely to choose that category.
 */
export interface StrategicPriorities {
  gathering?: number;   // Wood, stone, food collection
  building?: number;    // Construction, infrastructure
  farming?: number;     // Till, plant, water, harvest
  social?: number;      // Talk, help, meetings
  exploration?: number; // Wander, explore new areas
  rest?: number;        // Idle, sleep, recovery
  magic?: number;       // Spell casting and magical activities
}

/**
 * A planned build that the agent intends to construct.
 * Triggers automatically when agent is near and has resources.
 */
export interface PlannedBuild {
  buildingType: string;           // Type of building to construct
  position: { x: number; y: number }; // Where to build
  priority: 'low' | 'normal' | 'high'; // Build priority
  createdAt: number;              // Tick when plan was created
  reason?: string;                // Why this build was planned (for debugging)
}

/** Distance within which a planned build can be executed */
export const PLANNED_BUILD_REACH = 3;

/**
 * Resource collection targets.
 * Agent will gather until these targets are met.
 * Key is resource type (wood, stone, food, seeds), value is target amount.
 */
export type ResourceTargets = Record<string, number>;

// ============================================================================
// Forward-Compatibility: Governance & Social Hierarchy
// ============================================================================

/** Noble/leadership titles an agent can hold */
export type NobleTitle =
  | 'mayor'           // Elected leader
  | 'chief'           // Tribal leader
  | 'captain'         // Military leader
  | 'sheriff'         // Law enforcement
  | 'judge'           // Justice system
  | 'priest'          // Religious leader
  | 'guildmaster'     // Craft guild leader
  | 'merchant_prince' // Trade leader
  | 'elder';          // Council member

/** Mandate types that nobles can issue */
export type MandateType =
  | 'production'      // Must produce X items
  | 'export_ban'      // Cannot sell certain items
  | 'import_required' // Must acquire certain items
  | 'construction'    // Must build something
  | 'military'        // Military orders
  | 'festival';       // Organize celebration

/**
 * An active mandate/order from a noble.
 * Future: Agents must fulfill these or face consequences.
 */
export interface ActiveMandate {
  /** Unique identifier */
  id: string;
  /** Type of mandate */
  type: MandateType;
  /** Who issued this mandate */
  issuerId: string;
  /** What the mandate requires (item ID, building type, etc.) */
  target: string;
  /** Quantity required (if applicable) */
  quantity?: number;
  /** Game tick when mandate was issued */
  issuedAt: number;
  /** Game tick when mandate expires */
  deadline: number;
  /** Whether this mandate has been fulfilled */
  fulfilled: boolean;
}

/**
 * Custom LLM configuration for per-agent LLM provider overrides.
 * If set, this agent will use these settings instead of global LLM settings.
 */
export interface CustomLLMConfig {
  /** Custom API base URL (e.g., https://api.anthropic.com/v1) */
  baseUrl?: string;
  /** Custom model name (e.g., claude-3-5-sonnet-20241022) */
  model?: string;
  /** Custom API key */
  apiKey?: string;
  /** Custom headers as key-value pairs (e.g., {"anthropic-version": "2023-06-01"}) */
  customHeaders?: Record<string, string>;
}

export interface AgentComponent extends Component {
  type: 'agent';
  behavior: AgentBehavior;
  behaviorState: Record<string, unknown>;
  thinkInterval: number; // How often to reconsider behavior (in ticks)
  lastThinkTick: number;
  useLLM: boolean; // Whether to use LLM for decision making
  llmCooldown: number; // Ticks remaining before next LLM call
  customLLM?: CustomLLMConfig; // Per-agent LLM configuration override

  /**
   * Agent thinking tier - controls LLM frequency and triggers.
   * - 'full': Regular LLM thinking (idle, task complete, periodic)
   * - 'reduced': Less frequent LLM (task complete, long periodic only)
   * - 'autonomic': Scripted by default, LLM only on interaction
   * Default: 'full' for useLLM=true agents, 'autonomic' for useLLM=false
   */
  tier?: AgentTier;

  /**
   * Temporarily enable LLM for an autonomic agent (tier='autonomic').
   * Set when: player interacts, conversation starts, special events.
   * Cleared after interaction ends or after interactionLLMTimeout ticks.
   */
  interactionTriggeredLLM?: boolean;

  /**
   * Tick when interaction-triggered LLM was enabled.
   * Used to auto-disable after timeout (returns to scripted).
   */
  interactionLLMStartTick?: number;
  recentSpeech?: string; // What the agent recently said (for nearby agents to hear)
  lastThought?: string; // The agent's most recent internal thought/reasoning
  speechHistory?: SpeechHistoryEntry[]; // History of what the agent has said
  personalGoal?: string; // Short-term personal goal
  mediumTermGoal?: string; // Medium-term personal goal
  groupGoal?: string; // Agent's view of the group goal (future: shared in hive minds)

  // Idle/boredom tracking - agents start idle and wander when bored
  idleStartTick?: number; // Tick when agent became idle (undefined = not idle)

  // Strategic Priorities (LLM sets, scripted system uses)
  priorities?: StrategicPriorities; // Weights for automated behavior selection

  // Planned Builds (LLM sets, drives gathering + triggers when near + has resources)
  // Resource targets are derived from what's needed for planned builds
  plannedBuilds?: PlannedBuild[]; // Buildings agent intends to construct

  // Behavior Queue System
  behaviorQueue?: QueuedBehavior[]; // Queue of behaviors to execute sequentially
  currentQueueIndex?: number; // Index of currently executing queued behavior
  queuePaused?: boolean; // Whether queue processing is paused
  queueInterruptedBy?: AgentBehavior; // Behavior that interrupted the queue
  behaviorCompleted?: boolean; // Set by behaviors when they complete

  // ============================================================================
  // Forward-Compatibility: Governance & Social Hierarchy (optional)
  // ============================================================================

  /**
   * Noble/leadership titles this agent holds.
   * Future: Affects what mandates they can issue and social standing.
   */
  titles?: NobleTitle[];

  /**
   * Entity ID of the noble/leader this agent serves.
   * Future: Used for loyalty, mandate compliance, rebellion.
   */
  allegiance?: string;

  /**
   * Active mandates this agent must fulfill.
   * Future: Failing mandates causes stress and punishment.
   */
  activeMandates?: ActiveMandate[];

  /**
   * Guild memberships.
   * Future: Affects crafting bonuses, social groups, and obligations.
   */
  guilds?: string[];

  /**
   * Reputation with different factions (0-100).
   * Future: Affects trading, trust, and access.
   */
  reputation?: Record<string, number>;
}

/**
 * Default strategic priorities for agents.
 * Balanced distribution gives agents variety in their behaviors.
 */
export const DEFAULT_PRIORITIES: StrategicPriorities = {
  gathering: 0.25,   // Resource collection
  building: 0.20,    // Construction
  farming: 0.15,     // Agriculture
  social: 0.15,      // Talking, meetings
  exploration: 0.15, // Wandering, exploring
  rest: 0.10,        // Resting, recovery
  magic: 0.0,        // Spell casting (0 by default - only magic users set this)
};

/**
 * Mapping from skills to priority categories.
 * Skills not listed here don't directly map to a priority category.
 */
const SKILL_TO_PRIORITY: Partial<Record<SkillId, keyof StrategicPriorities>> = {
  gathering: 'gathering',
  building: 'building',
  farming: 'farming',
  social: 'social',
  exploration: 'exploration',
  // Crafting contributes to building (making tools, materials)
  crafting: 'building',
  // Cooking contributes to gathering (food preparation is resource-focused)
  cooking: 'gathering',
};

/**
 * Derive strategic priorities from an agent's skill levels.
 *
 * Higher skill levels result in higher priority weights for related behaviors.
 * This ensures skilled agents naturally prefer activities they're good at.
 *
 * Formula: base_weight + (skill_level / 5) * boost_factor
 * - Untrained (0): base weight only
 * - Master (5): base weight + full boost
 *
 * @param skills - The agent's skills component
 * @param baseWeight - Minimum weight for each category (default 0.1)
 * @param boostFactor - How much skill levels boost priority (default 0.3)
 * @returns Strategic priorities weighted by skill levels
 */
export function derivePrioritiesFromSkills(
  skills: SkillsComponent,
  baseWeight: number = 0.1,
  boostFactor: number = 0.3
): StrategicPriorities {
  const priorities: StrategicPriorities = {
    gathering: baseWeight,
    building: baseWeight,
    farming: baseWeight,
    social: baseWeight,
    exploration: baseWeight,
    rest: baseWeight,
    magic: 0, // Only set if magic skills present
  };

  // Apply skill-based boosts
  for (const [skillId, priorityKey] of Object.entries(SKILL_TO_PRIORITY)) {
    const level = skills.levels[skillId as SkillId] ?? 0;
    const boost = (level / 5) * boostFactor;
    const currentValue = priorities[priorityKey as keyof StrategicPriorities] ?? 0;
    priorities[priorityKey as keyof StrategicPriorities] = currentValue + boost;
  }

  // Check for magic skills (from magicProgress)
  // Sum up all unlocked node levels across all paradigms
  if (skills.magicProgress) {
    let totalMagicLevels = 0;
    for (const progress of Object.values(skills.magicProgress)) {
      // Each paradigm has unlockedNodes: Record<nodeId, level>
      totalMagicLevels += Object.values(progress.unlockedNodes).reduce(
        (sum, nodeLevel) => sum + nodeLevel,
        0
      );
    }
    if (totalMagicLevels > 0) {
      // Cap at 5 for normalization (equivalent to master-level)
      priorities.magic = baseWeight + (Math.min(totalMagicLevels, 5) / 5) * boostFactor;
    }
  }

  // Normalize so priorities sum to 1.0
  const total = Object.values(priorities).reduce((sum, val) => sum + (val ?? 0), 0);
  if (total > 0) {
    for (const key of Object.keys(priorities) as Array<keyof StrategicPriorities>) {
      priorities[key] = (priorities[key] ?? 0) / total;
    }
  }

  return priorities;
}

/**
 * Update an agent's priorities based on their current skills.
 * Call this when skills change (level up) to keep priorities in sync.
 *
 * @param agent - The agent component to update
 * @param skills - The agent's skills component
 * @returns Updated agent component with skill-derived priorities
 */
export function syncPrioritiesWithSkills(
  agent: AgentComponent,
  skills: SkillsComponent
): AgentComponent {
  return {
    ...agent,
    priorities: derivePrioritiesFromSkills(skills),
  };
}

/**
 * Create an agent component with specified thinking tier.
 *
 * @param behavior - Initial behavior
 * @param thinkInterval - Ticks between brain system processing
 * @param useLLM - Whether to use LLM for decisions (overridden by tier for autonomic)
 * @param thinkOffset - Initial offset to stagger thinking
 * @param priorities - Strategic priorities for scripted decisions
 * @param tier - Agent thinking tier ('full' | 'reduced' | 'autonomic')
 */
export function createAgentComponent(
  behavior: AgentBehavior = 'wander',
  thinkInterval: number = 20, // Think once per second at 20 TPS
  useLLM: boolean = false, // Whether to use LLM for decisions
  thinkOffset: number = 0, // Initial offset to stagger agent thinking (prevents thundering herd)
  priorities?: StrategicPriorities, // Optional custom priorities (uses defaults if not provided)
  tier?: AgentTier // Agent thinking tier
): AgentComponent {
  // Determine effective tier: if not specified, infer from useLLM flag
  const effectiveTier = tier ?? (useLLM ? 'full' : 'autonomic');

  return {
    type: 'agent',
    version: 1,
    behavior,
    behaviorState: {},
    thinkInterval,
    lastThinkTick: -thinkOffset, // Negative offset means they'll think at different times
    useLLM,
    llmCooldown: 0,
    tier: effectiveTier,
    // Set priorities for scripted decision making (enables building, farming, etc.)
    priorities: priorities ?? { ...DEFAULT_PRIORITIES },
  };
}

/**
 * Convenience function to create a full LLM agent (Tier 1).
 * These agents think regularly and have rich decision making.
 */
export function createFullLLMAgent(
  behavior: AgentBehavior = 'wander',
  thinkOffset: number = 0,
  priorities?: StrategicPriorities
): AgentComponent {
  return createAgentComponent(behavior, 20, true, thinkOffset, priorities, 'full');
}

/**
 * Convenience function to create a reduced LLM agent (Tier 2).
 * These agents think less often - good for background characters.
 */
export function createReducedLLMAgent(
  behavior: AgentBehavior = 'wander',
  thinkOffset: number = 0,
  priorities?: StrategicPriorities
): AgentComponent {
  return createAgentComponent(behavior, 20, true, thinkOffset, priorities, 'reduced');
}

/**
 * Convenience function to create an autonomic NPC (Tier 3).
 * Uses scripted behavior by default, LLM only activates on interaction.
 */
export function createAutonomicNPC(
  behavior: AgentBehavior = 'wander',
  thinkOffset: number = 0,
  priorities?: StrategicPriorities
): AgentComponent {
  return createAgentComponent(behavior, 20, false, thinkOffset, priorities, 'autonomic');
}

/**
 * Enable LLM temporarily for an autonomic agent (e.g., when player interacts).
 * The agent will use LLM for decisions until the interaction ends.
 */
export function enableInteractionLLM(agent: AgentComponent, currentTick: number): AgentComponent {
  return {
    ...agent,
    interactionTriggeredLLM: true,
    interactionLLMStartTick: currentTick,
  };
}

/**
 * Disable interaction-triggered LLM, returning agent to scripted behavior.
 */
export function disableInteractionLLM(agent: AgentComponent): AgentComponent {
  return {
    ...agent,
    interactionTriggeredLLM: false,
    interactionLLMStartTick: undefined,
  };
}

/**
 * Check if an agent should currently use LLM based on tier and interaction state.
 */
export function shouldUseLLM(agent: AgentComponent): boolean {
  const tier = agent.tier ?? (agent.useLLM ? 'full' : 'autonomic');

  // Autonomic agents only use LLM when interaction-triggered
  if (tier === 'autonomic') {
    return agent.interactionTriggeredLLM === true;
  }

  // Full and reduced tiers use LLM based on useLLM flag
  return agent.useLLM;
}

/**
 * Behavior Queue Helper Functions
 */

const MAX_QUEUE_SIZE = 20;
const BEHAVIOR_TIMEOUT_TICKS = 6000; // 5 minutes at 20 TPS

/**
 * Queue a behavior for sequential execution
 * @throws Error if queue is full or behavior is invalid
 */
export function queueBehavior(
  agent: AgentComponent,
  behavior: AgentBehavior,
  options: {
    behaviorState?: Record<string, unknown>;
    priority?: 'normal' | 'high' | 'critical';
    repeats?: number;
    label?: string;
  } = {}
): AgentComponent {
  if (!behavior) {
    throw new Error('[BehaviorQueue] Cannot queue behavior: behavior is required');
  }

  // Initialize queue if it doesn't exist
  const queue = agent.behaviorQueue || [];

  // Enforce queue size limit
  if (queue.length >= MAX_QUEUE_SIZE) {
    throw new Error(`[BehaviorQueue] Cannot queue behavior: queue is full (max ${MAX_QUEUE_SIZE} behaviors)`);
  }

  const queuedBehavior: QueuedBehavior = {
    behavior,
    behaviorState: options.behaviorState || {},
    priority: options.priority || 'normal',
    repeats: options.repeats,
    currentRepeat: 0,
    label: options.label,
  };

  return {
    ...agent,
    behaviorQueue: [...queue, queuedBehavior],
    currentQueueIndex: agent.currentQueueIndex ?? 0,
  };
}

/**
 * Clear all queued behaviors
 */
export function clearBehaviorQueue(agent: AgentComponent): AgentComponent {
  return {
    ...agent,
    behaviorQueue: undefined,
    currentQueueIndex: undefined,
    queuePaused: undefined,
    queueInterruptedBy: undefined,
    behaviorCompleted: undefined,
  };
}

/**
 * Pause queue processing
 */
export function pauseBehaviorQueue(agent: AgentComponent, interruptedBy?: AgentBehavior): AgentComponent {
  return {
    ...agent,
    queuePaused: true,
    queueInterruptedBy: interruptedBy,
  };
}

/**
 * Resume queue processing
 */
export function resumeBehaviorQueue(agent: AgentComponent): AgentComponent {
  return {
    ...agent,
    queuePaused: false,
    queueInterruptedBy: undefined,
  };
}

/**
 * Check if agent has an active behavior queue
 */
export function hasBehaviorQueue(agent: AgentComponent): boolean {
  return Boolean(agent.behaviorQueue && agent.behaviorQueue.length > 0);
}

/**
 * Get the currently executing queued behavior
 * @returns Current queued behavior or undefined if no queue or queue is empty
 */
export function getCurrentQueuedBehavior(agent: AgentComponent): QueuedBehavior | undefined {
  if (!agent.behaviorQueue || agent.behaviorQueue.length === 0) {
    return undefined;
  }

  const index = agent.currentQueueIndex ?? 0;
  if (index < 0 || index >= agent.behaviorQueue.length) {
    return undefined;
  }

  return agent.behaviorQueue[index];
}

/**
 * Advance to the next behavior in the queue
 * Handles repeats and queue completion
 * @param currentTick - Current game tick for timeout tracking
 * @returns Updated agent component
 */
export function advanceBehaviorQueue(agent: AgentComponent, currentTick: number): AgentComponent {
  if (!agent.behaviorQueue || agent.behaviorQueue.length === 0) {
    return agent;
  }

  const currentIndex = agent.currentQueueIndex ?? 0;
  const currentBehavior = agent.behaviorQueue[currentIndex];

  if (!currentBehavior) {
    // Queue is empty or invalid, clear it
    return clearBehaviorQueue(agent);
  }

  // Handle repeats
  const currentRepeat = currentBehavior.currentRepeat ?? 0;
  const repeats = currentBehavior.repeats;

  // Check if we need to repeat this behavior
  if (repeats !== undefined && repeats > 0 && currentRepeat < repeats - 1) {
    // Increment repeat counter
    const updatedQueue = [...agent.behaviorQueue];
    updatedQueue[currentIndex] = {
      ...currentBehavior,
      currentRepeat: currentRepeat + 1,
      startedAt: currentTick, // Reset timeout
    };

    return {
      ...agent,
      behaviorQueue: updatedQueue,
      behaviorCompleted: false,
    };
  }

  // Move to next behavior
  const nextIndex = currentIndex + 1;

  if (nextIndex >= agent.behaviorQueue.length) {
    // Queue complete!
    return {
      ...agent,
      behaviorQueue: undefined,
      currentQueueIndex: undefined,
      queuePaused: undefined,
      behaviorCompleted: false,
    };
  }

  // Advance to next behavior
  return {
    ...agent,
    currentQueueIndex: nextIndex,
    behaviorCompleted: false,
  };
}

/**
 * Check if current queued behavior has timed out
 * @param agent - Agent component
 * @param currentTick - Current game tick
 * @returns True if behavior has exceeded timeout
 */
export function hasQueuedBehaviorTimedOut(agent: AgentComponent, currentTick: number): boolean {
  const currentBehavior = getCurrentQueuedBehavior(agent);
  if (!currentBehavior || !currentBehavior.startedAt) {
    return false;
  }

  const ticksElapsed = currentTick - currentBehavior.startedAt;
  return ticksElapsed > BEHAVIOR_TIMEOUT_TICKS;
}
