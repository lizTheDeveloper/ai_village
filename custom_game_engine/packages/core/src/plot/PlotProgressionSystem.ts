/**
 * PlotProgressionSystem - Advances plot stages based on transition conditions
 *
 * Runs each tick to check active plots and progress them through stages.
 * Handles:
 * - Transition condition checking
 * - Stage advancement
 * - Effect application
 * - Completion/failure detection
 * - Plot completion triggers
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SoulIdentityComponent } from '../soul/SoulIdentityComponent.js';
import type { SilverThreadComponent } from '../soul/SilverThreadComponent.js';
import type { SoulLinkComponent } from '../soul/SoulLinkComponent.js';
import type {
  PlotLinesComponent,
  PlotLineInstance,
  PlotTransition,
  PlotStage,
} from './PlotTypes.js';
import { completePlot, abandonPlot } from './PlotTypes.js';
import { plotLineRegistry } from './PlotLineRegistry.js';
import { addSignificantEvent } from '../soul/SilverThreadComponent.js';
import { addLessonToSoul } from '../soul/SoulIdentityComponent.js';
import {
  evaluatePlotTransitionConditions,
  createPlotConditionContext,
} from './PlotConditionEvaluator.js';
import {
  executeEffects,
  createEffectContext,
} from './PlotEffectExecutor.js';
import { getNarrativePressureSystem } from '../narrative/NarrativePressureSystem.js';

/**
 * System priority: 86 (runs after assignment at 85, after NarrativePressure at 80)
 */
export class PlotProgressionSystem implements System {
  readonly id = 'plot_progression' as const;
  readonly priority = 86;
  readonly requiredComponents = [] as const;

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Find all souls with active plots
    const souls = world.query()
      .with(ComponentType.SoulIdentity)
      .with(ComponentType.SilverThread)
      .with(ComponentType.PlotLines)
      .executeEntities();

    for (const soul of souls) {
      this.progressSoulPlots(soul, world);
    }
  }

  /**
   * Progress all active plots for a soul
   */
  private progressSoulPlots(soul: Entity, world: World): void {
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
    if (!plotLines) return;

    const identity = soul.getComponent(ComponentType.SoulIdentity) as SoulIdentityComponent | undefined;
    const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;

    if (!identity || !thread) return;

    // Get agent entity (if incarnated)
    const agent = this.getAgentForSoul(soul.id, world);

    // Check each active plot
    for (const plot of plotLines.active) {
      this.checkPlotProgression(plot, soul, agent, world);
    }
  }

  /**
   * Check if plot can progress to next stage
   */
  private checkPlotProgression(
    plot: PlotLineInstance,
    soul: Entity,
    agent: Entity | null,
    world: World
  ): void {
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
    if (!plotLines) return;

    // Get the template to access completion/failure stages and transitions
    const template = plotLineRegistry.getTemplate(plot.template_id);
    if (!template) return;

    // Check for completion
    if (template.completion_stages.includes(plot.current_stage)) {
      this.handlePlotCompletion(plot, soul, world);
      return;
    }

    // Check for failure
    if (template.failure_stages && template.failure_stages.includes(plot.current_stage)) {
      this.handlePlotFailure(plot, soul, world);
      return;
    }

    // Find available transitions from current stage
    const availableTransitions = template.transitions.filter((t) => t.from_stage === plot.current_stage);

    // Check each transition for condition satisfaction
    for (const transition of availableTransitions) {
      if (this.evaluateTransitionConditions(transition, plot, soul, agent, world)) {
        this.advanceStage(plot, template, transition, soul, agent, world);
        return; // Only advance one stage per tick
      }
    }
  }

  /**
   * Evaluate if transition conditions are met using PlotConditionEvaluator
   */
  private evaluateTransitionConditions(
    transition: PlotTransition,
    plot: PlotLineInstance,
    soul: Entity,
    _agent: Entity | null,
    world: World
  ): boolean {
    const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;
    if (!thread) return false;

    // If no conditions, auto-transition (narrative beats)
    if (!transition.conditions || transition.conditions.length === 0) {
      return true;
    }

    // Create context for condition evaluation
    const context = createPlotConditionContext(
      soul.id,
      plot,
      thread.head.personal_tick,
      thread.head.universe_tick ?? 0,
      world
    );

    // Evaluate all conditions using the central evaluator
    return evaluatePlotTransitionConditions(transition.conditions, context);
  }

  /**
   * Advance plot to next stage using PlotEffectExecutor for effects
   */
  private advanceStage(
    plot: PlotLineInstance,
    template: import('./PlotTypes.js').PlotLineTemplate,
    transition: PlotTransition,
    soul: Entity,
    _agent: Entity | null,
    world: World
  ): void {
    const toStage = template.stages.find((s: PlotStage) => s.stage_id === transition.to_stage);
    if (!toStage) {
      console.warn(`[PlotProgression] Stage ${transition.to_stage} not found in plot ${plot.instance_id}`);
      return;
    }

    const fromStage = template.stages.find((s: PlotStage) => s.stage_id === plot.current_stage);
    const fromStageName = fromStage?.name || plot.current_stage;
    const toStageName = toStage.name;

    console.log(`[PlotProgression] Soul ${soul.id}: "${plot.template_id}" advancing from "${fromStageName}" → "${toStageName}"`);

    const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;
    if (!thread) return;

    const narrativePressure = getNarrativePressureSystem();

    // Create effect context
    const effectContext = createEffectContext(
      soul.id,
      plot,
      thread.head.personal_tick,
      thread.head.universe_id,
      world
    );

    // === Phase 3: Remove attractors from exiting stage ===
    if (fromStage) {
      narrativePressure.removePlotStageAttractors(plot.instance_id, fromStage.stage_id);
    }

    // Apply exit effects from current stage
    if (fromStage?.on_exit_effects) {
      executeEffects(fromStage.on_exit_effects, effectContext);
    }

    // Apply transition effects
    if (transition.effects) {
      executeEffects(transition.effects, effectContext);
    }

    // Apply stage entry effects
    if (toStage.on_enter_effects) {
      executeEffects(toStage.on_enter_effects, effectContext);
    }

    // === Phase 3: Add attractors for entering stage ===
    if (toStage.stage_attractors && toStage.stage_attractors.length > 0) {
      narrativePressure.addPlotStageAttractors(
        plot.instance_id,
        toStage.stage_id,
        soul.id,
        toStage.stage_attractors,
        thread.head.personal_tick
      );
    }

    // Update plot state
    plot.current_stage = transition.to_stage;
    plot.stage_entered_at = thread.head.personal_tick;

    // Record stage change to silver thread
    addSignificantEvent(thread, {
      type: 'plot_stage_change',
      details: {
        plot_id: plot.instance_id,
        plot_name: plot.template_id,
        from_stage: fromStageName,
        to_stage: toStageName,
      },
    });
  }

  /**
   * Handle plot completion
   */
  private handlePlotCompletion(plot: PlotLineInstance, soul: Entity, _world: World): void {
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
    const identity = soul.getComponent(ComponentType.SoulIdentity) as SoulIdentityComponent | undefined;
    const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;

    if (!plotLines || !identity || !thread) return;

    // Get template to access lesson
    const template = plotLineRegistry.getTemplate(plot.template_id);
    if (!template) return;

    console.log(`[PlotProgression] Soul ${soul.id} completed plot "${plot.template_id}"`);

    // === Phase 3: Clean up any remaining stage attractors ===
    const narrativePressure = getNarrativePressureSystem();
    narrativePressure.removePlotStageAttractors(plot.instance_id, plot.current_stage);

    // Get soul link for incarnation number
    const soulLink = soul.getComponent(ComponentType.SoulLink) as SoulLinkComponent | undefined;

    // Add lesson from plot
    addLessonToSoul(identity, {
      lesson_id: `${plot.template_id}_${plot.instance_id}`,
      personal_tick: thread.head.personal_tick,
      universe_id: thread.head.universe_id,
      incarnation: soulLink?.incarnation_number ?? 0,
      wisdom_gained: template.lesson.wisdom_value,
      domain: template.lesson.domain,
      insight: template.lesson.insight,
      plot_source: plot.template_id,
    });

    // Record completion to silver thread
    addSignificantEvent(thread, {
      type: 'plot_stage_change', // Using existing type
      details: {
        plot_id: plot.instance_id,
        plot_name: plot.template_id,
        status: 'completed',
        lesson_learned: template.lesson.insight,
      },
    });

    // Move plot to completed
    completePlot(plotLines, plot.instance_id, {
      completed_at: thread.head.personal_tick,
      universe_id: thread.head.universe_id,
      lesson_learned: true,
    });

    // TODO: Trigger follow-up plot assignment
  }

  /**
   * Handle plot failure
   */
  private handlePlotFailure(plot: PlotLineInstance, soul: Entity, _world: World): void {
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
    const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;

    if (!plotLines || !thread) return;

    console.log(`[PlotProgression] Soul ${soul.id} failed plot "${plot.template_id}"`);

    // === Phase 3: Clean up any remaining stage attractors ===
    const narrativePressure = getNarrativePressureSystem();
    narrativePressure.removePlotStageAttractors(plot.instance_id, plot.current_stage);

    // Record failure to silver thread
    addSignificantEvent(thread, {
      type: 'plot_stage_change',
      details: {
        plot_id: plot.instance_id,
        plot_name: plot.template_id,
        status: 'failed',
      },
    });

    // Move plot to abandoned
    abandonPlot(plotLines, plot.instance_id, {
      abandoned_at: thread.head.personal_tick,
      reason: 'failed',
    });
  }

  /**
   * Get agent entity for a soul (if incarnated)
   */
  private getAgentForSoul(soulId: string, world: World): Entity | null {
    const agents = world.query()
      .with(ComponentType.SoulLink)
      .executeEntities();

    for (const agent of agents) {
      const link = agent.getComponent(ComponentType.SoulLink) as SoulLinkComponent | undefined;
      if (link?.soul_id === soulId && link.is_primary_incarnation) {
        return agent;
      }
    }

    return null;
  }

}
