import type { Component } from '../ecs/Component.js';

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
  // Self-management
  | 'set_priorities';

export interface SpeechHistoryEntry {
  text: string;
  tick: number;
}

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

export interface AgentComponent extends Component {
  type: 'agent';
  behavior: AgentBehavior;
  behaviorState: Record<string, unknown>;
  thinkInterval: number; // How often to reconsider behavior (in ticks)
  lastThinkTick: number;
  useLLM: boolean; // Whether to use LLM for decision making
  llmCooldown: number; // Ticks remaining before next LLM call
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
};

export function createAgentComponent(
  behavior: AgentBehavior = 'wander',
  thinkInterval: number = 20, // Think once per second at 20 TPS
  useLLM: boolean = false, // Whether to use LLM for decisions
  thinkOffset: number = 0, // Initial offset to stagger agent thinking (prevents thundering herd)
  priorities?: StrategicPriorities // Optional custom priorities (uses defaults if not provided)
): AgentComponent {
  return {
    type: 'agent',
    version: 1,
    behavior,
    behaviorState: {},
    thinkInterval,
    lastThinkTick: -thinkOffset, // Negative offset means they'll think at different times
    useLLM,
    llmCooldown: 0,
    // Set priorities for scripted decision making (enables building, farming, etc.)
    priorities: priorities ?? { ...DEFAULT_PRIORITIES },
  };
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
