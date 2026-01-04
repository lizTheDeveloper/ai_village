/**
 * Plot Types - Core types for the lesson-driven plot line system
 *
 * Plots are narrative arcs assigned to souls that teach wisdom across
 * multiple scales: from micro moments to multi-lifetime epics.
 */

import { ComponentType } from '../types/ComponentType.js';
import type { WisdomDomain } from '../soul/SoulIdentityComponent.js';

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
 */
export type PlotCondition =
  | { type: 'has_item'; item_id: string }
  | { type: 'at_location'; location: { x: number; y: number }; radius: number }
  | { type: 'has_relationship'; agent_id: string; min_trust: number }
  | { type: 'has_skill'; skill: string; min_level: number }
  | { type: 'wisdom_threshold'; min_wisdom: number }
  | { type: 'personal_tick_elapsed'; ticks: number }
  | { type: 'universe_tick_elapsed'; ticks: number }
  | { type: 'choice_made'; choice_id: string }
  | { type: 'lesson_learned'; lesson_id: string }
  | { type: 'custom'; check: (context: any) => boolean };

/**
 * Effect of plot progression
 */
export type PlotEffect =
  | { type: 'grant_item'; item_id: string; quantity: number }
  | { type: 'grant_skill_xp'; skill: string; xp: number }
  | { type: 'modify_relationship'; agent_id: string; trust_delta: number }
  | { type: 'learn_lesson'; lesson_id: string }
  | { type: 'spawn_attractor'; attractor_id: string; details: Record<string, any> }
  | { type: 'queue_event'; event_type: string; details: Record<string, any> }
  | { type: 'custom'; apply: (context: any) => void };

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
