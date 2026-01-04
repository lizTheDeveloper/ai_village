/**
 * Plot Types - Core types for the lesson-driven plot line system
 *
 * Plots are narrative arcs assigned to souls that teach wisdom across
 * multiple scales: from micro moments to multi-lifetime epics.
 */

import { ComponentType } from '../types/ComponentType.js';
import type { WisdomDomain } from '../soul/SoulIdentityComponent.js';
import type {
  EmotionalState,
  TraumaType,
  BreakdownType,
  MoodFactors,
} from '../components/MoodComponent.js';
import type { PlotStageAttractor } from '../narrative/NarrativePressureTypes.js';

// ============================================================================
// Plot Trigger Types (Phase 2: Event-Driven Assignment)
// ============================================================================

/**
 * Events that can trigger automatic plot assignment.
 *
 * When an event matching a trigger occurs, the plot is assigned to the
 * entity experiencing the event, with relevant agents bound to roles.
 */
export type PlotTrigger =
  /** Trigger when entity experiences trauma */
  | { type: 'on_trauma'; trauma_type?: TraumaType }
  /** Trigger when relationship trust changes significantly */
  | { type: 'on_relationship_change'; delta_threshold: number; with_role?: string }
  /** Trigger when emotional state is sustained for duration */
  | { type: 'on_emotional_state'; state: EmotionalState; min_duration_ticks: number }
  /** Trigger when entity enters breakdown */
  | { type: 'on_breakdown'; breakdown_type?: BreakdownType }
  /** Trigger when someone nearby dies */
  | { type: 'on_death_nearby'; min_relationship_trust?: number }
  /** Trigger when skill reaches a level */
  | { type: 'on_skill_mastery'; skill: string; min_level: number }
  /** Trigger when mood crosses a threshold */
  | { type: 'on_mood_threshold'; min?: number; max?: number }
  /** Trigger when stress crosses a threshold */
  | { type: 'on_stress_threshold'; min?: number; max?: number }
  /** Trigger when social isolation is detected */
  | { type: 'on_social_isolation'; min_ticks: number }
  /** Trigger when a new relationship is formed */
  | { type: 'on_relationship_formed'; min_initial_trust?: number };

/**
 * Binding rule for automatically binding agents to roles when triggered
 */
export interface TriggerAgentBinding {
  /** Role name to bind (e.g., 'deceased', 'betrayer') */
  role: string;
  /** Source of the agent to bind */
  source:
    | 'trigger_target'     // The other agent involved in the trigger event
    | 'highest_trust'      // Agent with highest trust relationship
    | 'lowest_trust'       // Agent with lowest trust relationship
    | 'highest_affinity'   // Agent with highest affinity
    | 'random_known';      // Random agent they know
}

/**
 * Event payload passed to trigger handlers
 */
export interface PlotTriggerEvent {
  /** Type of trigger that fired */
  trigger_type: PlotTrigger['type'];
  /** Entity that experienced the event */
  entity_id: string;
  /** Soul ID of the entity */
  soul_id: string;
  /** Current personal tick */
  personal_tick: number;
  /** Involved agent (if applicable) */
  involved_agent_id?: string;
  /** Involved agent's soul (if applicable) */
  involved_soul_id?: string;
  /** Additional event-specific data */
  data: Record<string, any>;
}

/**
 * Plot scale determines scope and duration
 */
export type PlotScale =
  | 'micro'      // Minutes to hours - 10-20 active per soul
  | 'small'      // Days to weeks - 3-5 active
  | 'medium'     // Months to years - 1-2 active
  | 'large'      // Single lifetime - 0-1
  | 'epic';      // Multi-lifetime - 0-1 (rare)

/**
 * Plot status
 */
export type PlotStatus =
  | 'active'
  | 'suspended'
  | 'completed'
  | 'failed'
  | 'abandoned';

/**
 * How plots behave on universe fork
 */
export type PlotForkBehavior =
  | 'continue'          // Plot continues from current stage
  | 'reset_stage'       // Reset to stage it was at snapshot time
  | 'reset_plot'        // Start plot over
  | 'suspend'           // Pause plot until conditions met
  | 'fork';             // Create parallel instance

/**
 * Lesson definition - what the plot teaches
 */
export interface PlotLesson {
  theme: string;
  insight: string;           // The wisdom gained
  wisdom_value: number;      // How much wisdom gained
  domain: WisdomDomain;
  repeatable: boolean;       // Can this lesson be learned multiple times?
}

/**
 * Condition for plot transitions
 *
 * Conditions are evaluated against the current game state to determine
 * if a plot transition should occur.
 */
export type PlotCondition =
  // ============================================================================
  // Core Conditions (Original)
  // ============================================================================
  | { type: 'has_item'; item_id: string }
  | { type: 'at_location'; location: { x: number; y: number }; radius: number }
  | { type: 'has_relationship'; agent_id: string; min_trust: number }
  | { type: 'has_skill'; skill: string; min_level: number }
  | { type: 'wisdom_threshold'; min_wisdom: number }
  | { type: 'personal_tick_elapsed'; ticks: number }
  | { type: 'universe_tick_elapsed'; ticks: number }
  | { type: 'choice_made'; choice_id: string }
  | { type: 'lesson_learned'; lesson_id: string }
  | { type: 'custom'; check: (context: PlotConditionContext) => boolean }

  // ============================================================================
  // Emotional Conditions (Phase 1)
  // ============================================================================
  /** Check if agent is in a specific emotional state */
  | { type: 'emotional_state'; state: EmotionalState; duration_ticks?: number }
  /** Check if mood is within a range (-100 to 100) */
  | { type: 'mood_threshold'; min?: number; max?: number }
  /** Check if a specific mood factor is within a range */
  | { type: 'mood_factor'; factor: keyof MoodFactors; min?: number; max?: number }
  /** Check if agent has experienced a specific trauma */
  | { type: 'has_trauma'; trauma_type: TraumaType; recency_ticks?: number }
  /** Check if stress level is within a range (0-100) */
  | { type: 'stress_threshold'; min?: number; max?: number }
  /** Check if agent is in a breakdown state */
  | { type: 'in_breakdown'; breakdown_type?: BreakdownType }
  /** Check if agent has recovered from a breakdown */
  | { type: 'breakdown_recovered'; since_ticks?: number }

  // ============================================================================
  // Relationship Conditions with Role Binding (Phase 1)
  // ============================================================================
  /** Check relationship with a dynamically bound agent role */
  | { type: 'has_relationship_with_role'; role: string; min_trust?: number; max_trust?: number; min_affinity?: number; max_affinity?: number }
  /** Check if a relationship has changed recently */
  | { type: 'relationship_changed'; role: string; trust_delta?: number; affinity_delta?: number; recency_ticks?: number }
  /** Check if agent has been socially isolated */
  | { type: 'social_isolation'; min_ticks: number }
  /** Check if any relationship meets criteria */
  | { type: 'any_relationship'; min_trust?: number; max_trust?: number; min_affinity?: number; max_affinity?: number }

  // ============================================================================
  // Structural Conditions (Phase 1)
  // ============================================================================
  /** Negate a condition */
  | { type: 'not'; condition: PlotCondition }
  /** All conditions must be true (AND) */
  | { type: 'all'; conditions: PlotCondition[] }
  /** Any condition must be true (OR) */
  | { type: 'any'; conditions: PlotCondition[] };

/**
 * Context passed to condition evaluators
 */
export interface PlotConditionContext {
  /** The entity being evaluated */
  entityId: string;
  /** Current personal tick */
  personalTick: number;
  /** Current universe tick */
  universeTick: number;
  /** Bound agents for role-based conditions */
  boundAgents: Record<string, string>;
  /** The plot instance being evaluated */
  plot: PlotLineInstance;
  /** Access to world for component queries */
  world: unknown; // Avoids circular import, cast to World in implementation
}

/**
 * Effect of plot progression
 *
 * Effects are applied when a plot transitions between stages or
 * when entering/exiting a stage.
 */
export type PlotEffect =
  // ============================================================================
  // Core Effects (Original)
  // ============================================================================
  | { type: 'grant_item'; item_id: string; quantity: number }
  | { type: 'grant_skill_xp'; skill: string; xp: number }
  | { type: 'modify_relationship'; agent_id: string; trust_delta: number }
  | { type: 'learn_lesson'; lesson_id: string }
  | { type: 'spawn_attractor'; attractor_id: string; details: Record<string, any> }
  | { type: 'queue_event'; event_type: string; details: Record<string, any> }
  | { type: 'custom'; apply: (context: PlotEffectContext) => void }

  // ============================================================================
  // Emotional Effects (Phase 1)
  // ============================================================================
  /** Modify overall mood by delta (-100 to 100) */
  | { type: 'modify_mood'; delta: number }
  /** Modify a specific mood factor */
  | { type: 'modify_mood_factor'; factor: keyof MoodFactors; delta: number }
  /** Add a trauma to the agent */
  | { type: 'add_trauma'; trauma_type: TraumaType; severity?: number; description?: string }
  /** Modify stress level */
  | { type: 'modify_stress'; delta: number }
  /** Trigger a mental breakdown */
  | { type: 'trigger_breakdown'; breakdown_type: BreakdownType }
  /** Set emotional state for a duration */
  | { type: 'set_emotional_state'; state: EmotionalState; duration_ticks: number }

  // ============================================================================
  // Relationship Effects with Role Binding (Phase 1)
  // ============================================================================
  /** Modify relationship with a bound agent role */
  | { type: 'modify_relationship_by_role'; role: string; trust_delta?: number; affinity_delta?: number }
  /** Create a new relationship with a role binding */
  | { type: 'bind_relationship'; role: string; agent_id: string; initial_trust?: number; initial_affinity?: number }

  // ============================================================================
  // Dream Effects (Phase 5)
  // ============================================================================
  /** Queue a dream hint for the next sleep cycle */
  | {
      type: 'queue_dream_hint';
      dream_type: 'prophetic_vision' | 'warning' | 'memory_echo' | 'symbolic';
      content_hint: string;
      intensity?: number;
      imagery?: string[];
      emotional_tone?: 'hopeful' | 'ominous' | 'melancholic' | 'triumphant' | 'mysterious';
    }
  /** Trigger an immediate prophetic dream (if sleeping) or queue high-priority hint */
  | {
      type: 'prophetic_dream';
      vision_content: string;
      urgency: 'low' | 'medium' | 'high' | 'critical';
      imagery?: string[];
    };

/**
 * Context passed to effect executors
 */
export interface PlotEffectContext {
  /** The entity receiving the effect */
  entityId: string;
  /** Current personal tick */
  personalTick: number;
  /** Current universe ID */
  universeId: string;
  /** Bound agents for role-based effects */
  boundAgents: Record<string, string>;
  /** The plot instance */
  plot: PlotLineInstance;
  /** Access to world for component updates */
  world: unknown; // Avoids circular import, cast to World in implementation
}

/**
 * Transition between plot stages
 */
export interface PlotTransition {
  from_stage: string;
  to_stage: string;
  conditions: PlotCondition[];
  effects?: PlotEffect[];
  probability?: number;        // Optional random chance (0-1)
}

/**
 * Stage in a plot line
 */
export interface PlotStage {
  stage_id: string;
  name: string;
  description: string;

  // Narrative pressure - what this stage wants to happen (Phase 3)
  // Attractors are spawned when entering stage and removed when exiting
  stage_attractors?: PlotStageAttractor[];

  // Auto-complete after time
  auto_complete_after?: number;   // Personal ticks

  // Effects on entering this stage
  on_enter_effects?: PlotEffect[];

  // Effects on leaving this stage
  on_exit_effects?: PlotEffect[];
}

/**
 * Plot Line Template - defines the structure of a plot
 *
 * This is the reusable definition that gets instantiated for individual souls.
 */
export interface PlotLineTemplate {
  id: string;
  name: string;
  description: string;

  // Scale and scope
  scale: PlotScale;
  fork_behavior: PlotForkBehavior;

  // What this plot teaches
  lesson: PlotLesson;

  // State machine
  entry_stage: string;       // Where plot starts
  stages: PlotStage[];
  transitions: PlotTransition[];
  completion_stages: string[];  // Stages that complete the plot
  failure_stages?: string[];    // Stages that fail the plot

  // Assignment rules
  assignment_rules?: {
    min_wisdom?: number;
    required_archetype?: string[];
    required_interests?: string[];
    forbidden_if_learned?: string[];  // Lesson IDs that block this plot

    // ============================================================================
    // Event-Driven Triggers (Phase 2)
    // ============================================================================
    /**
     * Triggers that automatically assign this plot when events occur.
     * If multiple triggers are defined, ANY matching trigger assigns the plot.
     */
    triggers?: PlotTrigger[];

    /**
     * How to bind agents to roles when the plot is triggered.
     * Example: When 'on_death_nearby' triggers, bind the deceased to role 'deceased'
     */
    trigger_bindings?: TriggerAgentBinding[];

    /**
     * Maximum active instances of this plot per soul.
     * Default is 1 (only one instance can be active at a time).
     */
    max_concurrent?: number;

    /**
     * Cooldown in personal ticks before this plot can trigger again.
     * Prevents the same plot from triggering repeatedly.
     */
    cooldown_ticks?: number;
  };

  // Parameters for instantiation
  parameters?: Record<string, any>;
}

/**
 * Active plot instance on a soul
 */
export interface PlotLineInstance {
  instance_id: string;
  template_id: string;

  // Binding
  soul_id: string;
  assigned_at_personal_tick: number;

  // Current state
  status: PlotStatus;
  current_stage: string;
  stage_entered_at: number;      // Personal tick

  // History
  stages_visited: Array<{
    stage_id: string;
    entered_at: number;
    exited_at?: number;
    universe_id: string;
  }>;

  // Parameters (bound from template)
  parameters: Record<string, any>;

  // ============================================================================
  // Bound Agents (Phase 1)
  // ============================================================================
  /**
   * Dynamically bound agents for role-based conditions and effects.
   *
   * Example: { 'betrayer': 'agent-123', 'victim': 'agent-456' }
   *
   * Roles are defined in the plot template and bound when the plot is assigned,
   * either by event triggers or explicit assignment.
   */
  bound_agents: Record<string, string>;

  /**
   * Relationship snapshot at binding time.
   * Used to detect relationship changes (e.g., trust dropped by 30).
   */
  relationship_snapshots?: Record<string, {
    trust: number;
    affinity: number;
    captured_at_tick: number;
  }>;

  // Suspended state
  suspended_reason?: string;
  suspended_at?: number;

  // ============================================================================
  // Event-Driven Assignment Tracking (Phase 2)
  // ============================================================================
  /**
   * What triggered this plot to be assigned.
   * Undefined for manually assigned plots.
   */
  triggered_by?: {
    trigger_type: PlotTrigger['type'];
    event_tick: number;
    involved_agent_id?: string;
    involved_soul_id?: string;
  };
}

/**
 * Completed plot record
 */
export interface CompletedPlot {
  instance_id: string;
  template_id: string;
  completed_at_personal_tick: number;
  universe_id: string;
  lesson_learned: boolean;
  final_stage: string;
}

/**
 * Abandoned plot record
 */
export interface AbandonedPlot {
  instance_id: string;
  template_id: string;
  abandoned_at_personal_tick: number;
  abandoned_reason: 'failed' | 'cancelled' | 'superseded' | 'timeout';
  final_stage: string;
}

// ============================================================================
// Dream Integration Types (Phase 5)
// ============================================================================

/**
 * Dream hint queued by a plot for the dream system
 *
 * Plot stages can queue hints that get consumed during sleep consolidation
 * to generate plot-aware prophetic dreams.
 */
export interface PlotDreamHint {
  /** The plot instance that queued this hint */
  plot_instance_id: string;
  /** The stage that created this hint */
  from_stage_id: string;
  /** Type of dream this should generate */
  dream_type: 'prophetic_vision' | 'warning' | 'memory_echo' | 'symbolic';
  /** Content hint for dream generation */
  content_hint: string;
  /** Intensity of the dream (0-1) */
  intensity: number;
  /** When this hint was queued (personal tick) */
  queued_at: number;
  /** Optional: specific imagery to include */
  imagery?: string[];
  /** Optional: emotional tone of the dream */
  emotional_tone?: 'hopeful' | 'ominous' | 'melancholic' | 'triumphant' | 'mysterious';
  /** Whether this hint has been consumed by the dream system */
  consumed: boolean;
}

/**
 * PlotLines Component - stored on the soul entity
 */
export interface PlotLinesComponent {
  type: ComponentType.PlotLines;

  /** Schema version for migrations */
  readonly version: 2;

  // Active plots
  active: PlotLineInstance[];

  // Completed plots (for reference)
  completed: CompletedPlot[];

  // Failed/abandoned plots
  abandoned: AbandonedPlot[];

  // ============================================================================
  // Dream Integration (Phase 5)
  // ============================================================================
  /**
   * Queue of dream hints from active plots.
   * Consumed by SoulConsolidationSystem during sleep to generate prophetic dreams.
   */
  dream_hints: PlotDreamHint[];
}

/**
 * Create a new PlotLinesComponent
 */
export function createPlotLinesComponent(): PlotLinesComponent {
  return {
    type: ComponentType.PlotLines,
    version: 2,
    active: [],
    completed: [],
    abandoned: [],
    dream_hints: [],
  };
}

/**
 * Add an active plot to the soul
 */
export function addActivePlot(
  plotLines: PlotLinesComponent,
  instance: PlotLineInstance
): void {
  // Check if already active
  const existing = plotLines.active.find(p => p.instance_id === instance.instance_id);
  if (existing) {
    console.warn(`[PlotLines] Plot ${instance.instance_id} already active`);
    return;
  }

  plotLines.active.push(instance);
}

/**
 * Complete a plot
 */
export function completePlot(
  plotLines: PlotLinesComponent,
  instance_id: string,
  params: {
    completed_at: number;
    universe_id: string;
    lesson_learned: boolean;
  }
): void {
  const index = plotLines.active.findIndex(p => p.instance_id === instance_id);
  if (index === -1) {
    console.warn(`[PlotLines] Cannot complete - plot ${instance_id} not active`);
    return;
  }

  const plot = plotLines.active[index];
  if (!plot) {
    console.warn(`[PlotLines] Cannot complete - plot ${instance_id} not found`);
    return;
  }

  plot.status = 'completed';

  // Move to completed
  plotLines.completed.push({
    instance_id: plot.instance_id,
    template_id: plot.template_id,
    completed_at_personal_tick: params.completed_at,
    universe_id: params.universe_id,
    lesson_learned: params.lesson_learned,
    final_stage: plot.current_stage,
  });

  // Remove from active
  plotLines.active.splice(index, 1);
}

/**
 * Abandon a plot
 */
export function abandonPlot(
  plotLines: PlotLinesComponent,
  instance_id: string,
  params: {
    abandoned_at: number;
    reason: 'failed' | 'cancelled' | 'superseded' | 'timeout';
  }
): void {
  const index = plotLines.active.findIndex(p => p.instance_id === instance_id);
  if (index === -1) {
    console.warn(`[PlotLines] Cannot abandon - plot ${instance_id} not active`);
    return;
  }

  const plot = plotLines.active[index];
  if (!plot) {
    console.warn(`[PlotLines] Cannot abandon - plot ${instance_id} not found`);
    return;
  }

  plot.status = 'abandoned';

  // Move to abandoned
  plotLines.abandoned.push({
    instance_id: plot.instance_id,
    template_id: plot.template_id,
    abandoned_at_personal_tick: params.abandoned_at,
    abandoned_reason: params.reason,
    final_stage: plot.current_stage,
  });

  // Remove from active
  plotLines.active.splice(index, 1);
}

/**
 * Get active plots by scale
 */
export function getActivePlotsByScale(
  plotLines: PlotLinesComponent,
  _scale: PlotScale
): PlotLineInstance[] {
  // Note: requires access to template registry to check scale
  // This is a placeholder - full implementation needs template lookup
  return plotLines.active;
}

/**
 * Check if lesson has been learned from any completed plot
 */
export function hasLearnedPlotLesson(
  plotLines: PlotLinesComponent,
  _lesson_id: string
): boolean {
  // Note: requires access to template registry to check lesson IDs
  // This is a placeholder - full implementation needs template lookup
  return plotLines.completed.some(p => p.lesson_learned);
}

// ============================================================================
// Dream Hint Helpers (Phase 5)
// ============================================================================

/**
 * Queue a dream hint from a plot stage
 */
export function queueDreamHint(
  plotLines: PlotLinesComponent,
  hint: Omit<PlotDreamHint, 'consumed'>
): void {
  plotLines.dream_hints.push({
    ...hint,
    consumed: false,
  });
  console.log(`[PlotLines] Queued dream hint from plot ${hint.plot_instance_id}: ${hint.dream_type}`);
}

/**
 * Consume unconsumed dream hints
 * Returns the hints and marks them as consumed
 */
export function consumeDreamHints(
  plotLines: PlotLinesComponent,
  maxHints: number = 3
): PlotDreamHint[] {
  const unconsumed = plotLines.dream_hints.filter(h => !h.consumed);

  // Sort by intensity (highest first) and take up to maxHints
  const toConsume = unconsumed
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, maxHints);

  // Mark as consumed
  for (const hint of toConsume) {
    hint.consumed = true;
  }

  return toConsume;
}

/**
 * Clean up old consumed hints (call periodically)
 */
export function cleanupConsumedHints(
  plotLines: PlotLinesComponent,
  currentTick: number,
  maxAge: number = 1000
): number {
  const before = plotLines.dream_hints.length;
  plotLines.dream_hints = plotLines.dream_hints.filter(
    h => !h.consumed || (currentTick - h.queued_at) < maxAge
  );
  return before - plotLines.dream_hints.length;
}

/**
 * Get pending (unconsumed) dream hints for a specific plot
 */
export function getPendingHintsForPlot(
  plotLines: PlotLinesComponent,
  plotInstanceId: string
): PlotDreamHint[] {
  return plotLines.dream_hints.filter(
    h => h.plot_instance_id === plotInstanceId && !h.consumed
  );
}
