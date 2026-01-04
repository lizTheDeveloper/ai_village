/**
 * PlotAssignmentSystem - Assigns plot lines to souls based on eligibility
 *
 * Runs periodically to evaluate soul eligibility and instantiate appropriate plots.
 * Assignment triggers:
 * - On soul creation (first plot based on archetype)
 * - On plot completion (follow-up plots in same arc)
 * - Periodic checks (every N ticks)
 * - Event-driven (specific events trigger assignment)
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SoulIdentityComponent } from '../soul/SoulIdentityComponent.js';
import type { SilverThreadComponent } from '../soul/SilverThreadComponent.js';
import type { PlotLinesComponent, PlotLineInstance } from './PlotTypes.js';
import { addActivePlot } from './PlotTypes.js';
import { plotLineRegistry, instantiatePlot } from './PlotLineRegistry.js';

/**
 * System priority: 85 (runs before progression at 86)
 */
export class PlotAssignmentSystem implements System {
  readonly id = 'plot_assignment' as const;
  readonly priority = 85;
  readonly requiredComponents = [] as const;

  private tickCounter = 0;
  private readonly assignmentInterval = 100; // Check every 100 ticks
  private readonly maxPlotsPerSoul = 3; // Max concurrent plots

  update(_world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    this.tickCounter++;

    // Only run periodic checks every N ticks
    if (this.tickCounter % this.assignmentInterval !== 0) {
      return;
    }

    // Assignment logic runs via events or explicit calls
    // This stub ensures system is registered and can be triggered
  }

  /**
   * Assign initial plot to newly created soul
   */
  assignInitialPlot(soul: Entity, _world: World): PlotLineInstance | null {
    const identity = soul.getComponent(ComponentType.SoulIdentity) as SoulIdentityComponent | undefined;
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
    const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;

    if (!identity || !plotLines || !thread) {
      console.warn(`[PlotAssignment] Soul ${soul.id} missing required components`);
      return null;
    }

    // Get eligible templates based on archetype and starting wisdom
    const eligibleTemplates = plotLineRegistry.getEligibleTemplates({
      wisdom: identity.wisdom_level,
      archetype: identity.archetype,
      interests: identity.core_interests,
      learned_lessons: identity.lessons_learned.map((l) => l.lesson_id),
    });

    if (eligibleTemplates.length === 0) {
      console.log(`[PlotAssignment] No eligible plots for new soul ${soul.id} (archetype: ${identity.archetype})`);
      return null;
    }

    // Pick first micro-scale plot for new souls
    const microPlots = eligibleTemplates.filter((t) => t.scale === 'micro');
    const template = microPlots.length > 0
      ? microPlots[0]
      : eligibleTemplates[0];

    if (!template) {
      return null;
    }

    // Instantiate plot
    const plot = instantiatePlot(template.id, soul.id, thread.head.personal_tick, {});

    if (!plot) {
      return null;
    }

    // Add to soul's active plots
    addActivePlot(plotLines, plot);

    console.log(`[PlotAssignment] Assigned initial plot "${template.name}" to soul ${soul.id}`);

    return plot;
  }

  /**
   * Assign follow-up plot after completion
   */
  assignFollowUpPlot(soul: Entity, completedPlotId: string, _world: World): PlotLineInstance | null {
    const identity = soul.getComponent(ComponentType.SoulIdentity) as SoulIdentityComponent | undefined;
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
    const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;

    if (!identity || !plotLines || !thread) {
      return null;
    }

    // Check if soul has room for more plots
    if (plotLines.active.length >= this.maxPlotsPerSoul) {
      console.log(`[PlotAssignment] Soul ${soul.id} at max concurrent plots (${this.maxPlotsPerSoul})`);
      return null;
    }

    // Find completed plot
    const completedPlot = plotLines.completed.find((p) => p.instance_id === completedPlotId);
    if (!completedPlot) {
      return null;
    }

    // Get the template of the completed plot to access its scale
    const completedTemplate = plotLineRegistry.getTemplate(completedPlot.template_id);

    // Get eligible templates (higher scale now possible)
    const eligibleTemplates = plotLineRegistry.getEligibleTemplates({
      wisdom: identity.wisdom_level,
      archetype: identity.archetype,
      interests: identity.core_interests,
      learned_lessons: identity.lessons_learned.map((l) => l.lesson_id),
    });

    if (eligibleTemplates.length === 0) {
      return null;
    }

    // Prefer plots of same or higher scale than completed plot
    const scaleOrder: Array<'micro' | 'small' | 'medium' | 'large' | 'epic'> = ['micro', 'small', 'medium', 'large', 'epic'];

    let higherScalePlots = eligibleTemplates;
    if (completedTemplate) {
      const completedScaleIndex = scaleOrder.indexOf(completedTemplate.scale);
      higherScalePlots = eligibleTemplates.filter((t) => {
        const tIndex = scaleOrder.indexOf(t.scale);
        return tIndex >= completedScaleIndex;
      });
    }

    const template = higherScalePlots.length > 0
      ? higherScalePlots[Math.floor(Math.random() * higherScalePlots.length)]
      : eligibleTemplates[Math.floor(Math.random() * eligibleTemplates.length)];

    if (!template) {
      return null;
    }

    // Instantiate and add
    const plot = instantiatePlot(template.id, soul.id, thread.head.personal_tick, {});

    if (!plot) {
      return null;
    }

    addActivePlot(plotLines, plot);

    console.log(`[PlotAssignment] Assigned follow-up plot "${template.name}" (${template.scale}) to soul ${soul.id}`);

    return plot;
  }

  /**
   * Periodic assignment check for all souls in world
   */
  checkAllSoulsForAssignment(world: World): number {
    let assignedCount = 0;

    // Find all soul entities
    const souls = world.query()
      .with(ComponentType.SoulIdentity)
      .with(ComponentType.PlotLines)
      .executeEntities();

    for (const soul of souls) {
      const identity = soul.getComponent(ComponentType.SoulIdentity) as SoulIdentityComponent | undefined;
      const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;

      if (!identity || !plotLines) continue;

      // Skip if soul has max plots
      if (plotLines.active.length >= this.maxPlotsPerSoul) continue;

      // Skip if soul has any active plots (conservative - avoid overwhelming)
      if (plotLines.active.length > 0) continue;

      // Get silver thread for personal tick
      const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;
      if (!thread) continue;

      // Get eligible templates
      const eligibleTemplates = plotLineRegistry.getEligibleTemplates({
        wisdom: identity.wisdom_level,
        archetype: identity.archetype,
        interests: identity.core_interests,
        learned_lessons: identity.lessons_learned.map((l) => l.lesson_id),
      });

      if (eligibleTemplates.length === 0) continue;

      // Assign random eligible plot
      const template = eligibleTemplates[Math.floor(Math.random() * eligibleTemplates.length)];
      if (!template) continue;

      const plot = instantiatePlot(template.id, soul.id, thread.head.personal_tick, {});
      if (!plot) continue;

      addActivePlot(plotLines, plot);

      assignedCount++;

      console.log(`[PlotAssignment] Periodic assignment: "${template.name}" to soul ${soul.id}`);
    }

    if (assignedCount > 0) {
      console.log(`[PlotAssignment] Assigned ${assignedCount} plots during periodic check`);
    }

    return assignedCount;
  }

  /**
   * Assign plot triggered by specific event
   */
  assignEventTriggeredPlot(
    soul: Entity,
    eventType: string,
    _world: World
  ): PlotLineInstance | null {
    const identity = soul.getComponent(ComponentType.SoulIdentity) as SoulIdentityComponent | undefined;
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
    const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;

    if (!identity || !plotLines || !thread) return null;

    // Check plot capacity
    if (plotLines.active.length >= this.maxPlotsPerSoul) return null;

    // Get eligible templates
    const eligibleTemplates = plotLineRegistry.getEligibleTemplates({
      wisdom: identity.wisdom_level,
      archetype: identity.archetype,
      interests: identity.core_interests,
      learned_lessons: identity.lessons_learned.map((l) => l.lesson_id),
    });

    // Filter by event trigger (if template has trigger metadata)
    // For now, just assign any eligible plot
    // TODO: Add event trigger filtering when templates have that metadata

    if (eligibleTemplates.length === 0) return null;

    const template = eligibleTemplates[Math.floor(Math.random() * eligibleTemplates.length)];
    if (!template) return null;

    const plot = instantiatePlot(template.id, soul.id, thread.head.personal_tick, {});
    if (!plot) return null;

    addActivePlot(plotLines, plot);

    console.log(`[PlotAssignment] Event-triggered plot "${template.name}" for soul ${soul.id} (event: ${eventType})`);

    return plot;
  }

  /**
   * Get current assignment stats for debugging
   */
  getAssignmentStats(world: World): {
    total_souls: number;
    souls_with_plots: number;
    total_active_plots: number;
    souls_at_max: number;
  } {
    const souls = world.query()
      .with(ComponentType.SoulIdentity)
      .with(ComponentType.PlotLines)
      .executeEntities();

    let soulsWithPlots = 0;
    let totalActivePlots = 0;
    let soulsAtMax = 0;

    for (const soul of souls) {
      const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
      if (!plotLines) continue;

      if (plotLines.active.length > 0) {
        soulsWithPlots++;
      }

      totalActivePlots += plotLines.active.length;

      if (plotLines.active.length >= this.maxPlotsPerSoul) {
        soulsAtMax++;
      }
    }

    return {
      total_souls: souls.length,
      souls_with_plots: soulsWithPlots,
      total_active_plots: totalActivePlots,
      souls_at_max: soulsAtMax,
    };
  }
}
