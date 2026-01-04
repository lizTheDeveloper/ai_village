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
  | { type: 'bind_relationship'; role: string; agent_id: string; initial_trust?: number; initial_affinity?: number };

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

  // Narrative pressure - what this stage wants to happen
  outcome_attractors?: string[];  // Attractor IDs to spawn

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

/**
 * PlotLines Component - stored on the soul entity
 */
export interface PlotLinesComponent {
  type: ComponentType.PlotLines;

  // Active plots
  active: PlotLineInstance[];

  // Completed plots (for reference)
  completed: CompletedPlot[];

  // Failed/abandoned plots
  abandoned: AbandonedPlot[];
}

/**
 * Create a new PlotLinesComponent
 */
export function createPlotLinesComponent(): PlotLinesComponent {
  return {
    type: ComponentType.PlotLines,
    active: [],
    completed: [],
    abandoned: [],
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
