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

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SoulIdentityComponent } from '../soul/SoulIdentityComponent.js';
import type { SilverThreadComponent } from '../soul/SilverThreadComponent.js';
import type { PlotLinesComponent, PlotLineInstance, PlotScale } from './PlotTypes.js';
import { addActivePlot } from './PlotTypes.js';
import { plotLineRegistry, instantiatePlot } from './PlotLineRegistry.js';

/**
 * Scale-based plot limits per soul
 * Based on spec: micro 10-20, small 3-5, medium 1-2, large 0-1, epic 0-1
 */
interface ScaleLimits {
  micro: { min: number; max: number };
  small: { min: number; max: number };
  medium: { min: number; max: number };
  large: { min: number; max: number };
  epic: { min: number; max: number };
}

const DEFAULT_SCALE_LIMITS: ScaleLimits = {
  micro: { min: 5, max: 20 },   // Cycling constantly
  small: { min: 1, max: 5 },    // Active regularly
  medium: { min: 0, max: 2 },   // Long-term arcs
  large: { min: 0, max: 1 },    // Single lifetime
  epic: { min: 0, max: 1 },     // Multi-lifetime (rare)
};

/**
 * System priority: 85 (runs before progression at 86)
 */
export class PlotAssignmentSystem extends BaseSystem {
  readonly id = 'plot_assignment' as const;
  readonly priority = 85;
  readonly requiredComponents = [] as const;

  private tickCounter = 0;
  private readonly assignmentInterval = 100; // Check every 100 ticks
  private readonly scaleLimits: ScaleLimits = DEFAULT_SCALE_LIMITS;

  protected onUpdate(_ctx: SystemContext): void {
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


    return plot;
  }

  /**
   * Assign follow-up plot after completion (Phase 4: scale-aware)
   */
  assignFollowUpPlot(soul: Entity, completedPlotId: string, _world: World): PlotLineInstance | null {
    const identity = soul.getComponent(ComponentType.SoulIdentity) as SoulIdentityComponent | undefined;
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
    const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;

    if (!identity || !plotLines || !thread) {
      return null;
    }

    // Find completed plot
    const completedPlot = plotLines.completed.find((p) => p.instance_id === completedPlotId);
    if (!completedPlot) {
      return null;
    }

    // Get the template of the completed plot to access its scale
    const completedTemplate = plotLineRegistry.getTemplate(completedPlot.template_id);
    const completedScale = completedTemplate?.scale ?? 'micro';

    // Phase 4: Check scale limits for the completed scale
    if (!this.canAcceptPlotOfScale(plotLines, completedScale)) {
      return null;
    }

    // Get eligible templates
    let eligibleTemplates = plotLineRegistry.getEligibleTemplates({
      wisdom: identity.wisdom_level,
      archetype: identity.archetype,
      interests: identity.core_interests,
      learned_lessons: identity.lessons_learned.map((l) => l.lesson_id),
    });

    if (eligibleTemplates.length === 0) {
      return null;
    }

    // Phase 4: Match against spinner seeds
    eligibleTemplates = this.getSpinnerSeedMatchedTemplates(
      identity.core_interests,
      eligibleTemplates
    );

    // Prefer plots of same or higher scale than completed plot (respecting limits)
    const scaleOrder: PlotScale[] = ['micro', 'small', 'medium', 'large', 'epic'];
    const completedScaleIndex = scaleOrder.indexOf(completedScale);

    // Filter to higher-scale plots that we can accept
    const higherScalePlots = eligibleTemplates.filter((t) => {
      const tIndex = scaleOrder.indexOf(t.scale);
      return tIndex >= completedScaleIndex && this.canAcceptPlotOfScale(plotLines, t.scale);
    });

    // Fall back to any acceptable scale if no higher-scale options
    const acceptablePlots = higherScalePlots.length > 0
      ? higherScalePlots
      : eligibleTemplates.filter(t => this.canAcceptPlotOfScale(plotLines, t.scale));

    if (acceptablePlots.length === 0) {
      return null;
    }

    const template = acceptablePlots[Math.floor(Math.random() * acceptablePlots.length)];
    if (!template) {
      return null;
    }

    // Instantiate and add
    const plot = instantiatePlot(template.id, soul.id, thread.head.personal_tick, {});

    if (!plot) {
      return null;
    }

    addActivePlot(plotLines, plot);


    return plot;
  }

  /**
   * Periodic assignment check for all souls in world (Phase 4: scale-aware)
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

      // Get scales that need more plots (below minimum)
      const scalesNeeding = this.getScalesNeedingPlots(plotLines);
      if (scalesNeeding.length === 0) continue;

      // Get silver thread for personal tick
      const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;
      if (!thread) continue;

      // Get eligible templates
      let eligibleTemplates = plotLineRegistry.getEligibleTemplates({
        wisdom: identity.wisdom_level,
        archetype: identity.archetype,
        interests: identity.core_interests,
        learned_lessons: identity.lessons_learned.map((l) => l.lesson_id),
      });

      if (eligibleTemplates.length === 0) continue;

      // Phase 4: Match against spinner seeds (core_interests)
      eligibleTemplates = this.getSpinnerSeedMatchedTemplates(
        identity.core_interests,
        eligibleTemplates
      );

      // Filter to scales that need plots
      const scaledTemplates = eligibleTemplates.filter(t =>
        scalesNeeding.includes(t.scale) && this.canAcceptPlotOfScale(plotLines, t.scale)
      );

      if (scaledTemplates.length === 0) continue;

      // Prioritize smaller scales first (micro plots cycle constantly)
      const scaleOrder: PlotScale[] = ['micro', 'small', 'medium', 'large', 'epic'];
      scaledTemplates.sort((a, b) => scaleOrder.indexOf(a.scale) - scaleOrder.indexOf(b.scale));

      const template = scaledTemplates[0];
      if (!template) continue;

      const plot = instantiatePlot(template.id, soul.id, thread.head.personal_tick, {});
      if (!plot) continue;

      addActivePlot(plotLines, plot);

      assignedCount++;

    }

    if (assignedCount > 0) {
    }

    return assignedCount;
  }

  /**
   * Assign plot triggered by specific event (Phase 4: scale-aware)
   */
  assignEventTriggeredPlot(
    soul: Entity,
    _eventType: string,
    _world: World,
    preferredScale?: PlotScale
  ): PlotLineInstance | null {
    const identity = soul.getComponent(ComponentType.SoulIdentity) as SoulIdentityComponent | undefined;
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
    const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;

    if (!identity || !plotLines || !thread) return null;

    // Phase 4: Use scale for capacity check
    const targetScale = preferredScale ?? 'micro';
    if (!this.canAcceptPlotOfScale(plotLines, targetScale)) return null;

    // Get eligible templates
    let eligibleTemplates = plotLineRegistry.getEligibleTemplates({
      wisdom: identity.wisdom_level,
      archetype: identity.archetype,
      interests: identity.core_interests,
      learned_lessons: identity.lessons_learned.map((l) => l.lesson_id),
    });

    if (eligibleTemplates.length === 0) return null;

    // Phase 4: Match against spinner seeds
    eligibleTemplates = this.getSpinnerSeedMatchedTemplates(
      identity.core_interests,
      eligibleTemplates
    );

    // Filter to preferred scale if specified, respecting limits
    const scaledTemplates = eligibleTemplates.filter(t =>
      t.scale === targetScale && this.canAcceptPlotOfScale(plotLines, t.scale)
    );

    const template = scaledTemplates.length > 0
      ? scaledTemplates[Math.floor(Math.random() * scaledTemplates.length)]
      : eligibleTemplates.filter(t => this.canAcceptPlotOfScale(plotLines, t.scale))[0];

    if (!template) return null;

    const plot = instantiatePlot(template.id, soul.id, thread.head.personal_tick, {});
    if (!plot) return null;

    addActivePlot(plotLines, plot);


    return plot;
  }

  // ============================================================================
  // Phase 4: Micro Plot Opportunity Detection
  // ============================================================================

  /**
   * Detect micro plot opportunities based on current agent circumstances
   *
   * Called frequently (every few ticks) to check for fleeting moments
   * that could spawn micro plots (moments of courage, kindness, etc.)
   */
  detectMicroOpportunities(
    soul: Entity,
    _world: World
  ): Array<{ templateId: string; reason: string }> {
    const opportunities: Array<{ templateId: string; reason: string }> = [];

    const identity = soul.getComponent(ComponentType.SoulIdentity) as SoulIdentityComponent | undefined;
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;

    if (!identity || !plotLines) return opportunities;

    // Check if we can accept more micro plots
    if (!this.canAcceptPlotOfScale(plotLines, 'micro')) return opportunities;

    // Get micro-scale templates
    const microTemplates = plotLineRegistry.getEligibleTemplates({
      wisdom: identity.wisdom_level,
      archetype: identity.archetype,
      interests: identity.core_interests,
      learned_lessons: identity.lessons_learned.map((l) => l.lesson_id),
    }).filter(t => t.scale === 'micro');

    if (microTemplates.length === 0) return opportunities;

    // Match against spinner seeds for relevance
    const matched = this.getSpinnerSeedMatchedTemplates(
      identity.core_interests,
      microTemplates
    );

    // Return top 3 opportunities (caller decides which to activate)
    for (const template of matched.slice(0, 3)) {
      opportunities.push({
        templateId: template.id,
        reason: `Matches interests: ${identity.core_interests.slice(0, 2).join(', ')}`,
      });
    }

    return opportunities;
  }

  /**
   * Attempt to assign a micro plot based on detected opportunity
   */
  assignMicroOpportunity(
    soul: Entity,
    templateId: string,
    _world: World
  ): PlotLineInstance | null {
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
    const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;

    if (!plotLines || !thread) return null;

    // Double-check we can accept micro plots
    if (!this.canAcceptPlotOfScale(plotLines, 'micro')) return null;

    // Verify template exists and is micro scale
    const template = plotLineRegistry.getTemplate(templateId);
    if (!template || template.scale !== 'micro') return null;

    const plot = instantiatePlot(templateId, soul.id, thread.head.personal_tick, {});
    if (!plot) return null;

    addActivePlot(plotLines, plot);


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

      const scaleCounts = this.countPlotsByScale(plotLines);
      const isAtMax = Object.entries(scaleCounts).every(([scale, count]) => {
        return count >= this.scaleLimits[scale as PlotScale].max;
      });
      if (isAtMax) {
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

  // ============================================================================
  // Phase 4: Scale-Based Assignment Helpers
  // ============================================================================

  /**
   * Count active plots by scale
   */
  private countPlotsByScale(plotLines: PlotLinesComponent): Record<PlotScale, number> {
    const counts: Record<PlotScale, number> = {
      micro: 0,
      small: 0,
      medium: 0,
      large: 0,
      epic: 0,
    };

    for (const plot of plotLines.active) {
      const template = plotLineRegistry.getTemplate(plot.template_id);
      if (template) {
        counts[template.scale]++;
      }
    }

    return counts;
  }

  /**
   * Check if soul can accept a plot of the given scale
   */
  canAcceptPlotOfScale(plotLines: PlotLinesComponent, scale: PlotScale): boolean {
    const counts = this.countPlotsByScale(plotLines);
    return counts[scale] < this.scaleLimits[scale].max;
  }

  /**
   * Check if soul needs more plots of a given scale (below minimum)
   */
  needsMorePlotsOfScale(plotLines: PlotLinesComponent, scale: PlotScale): boolean {
    const counts = this.countPlotsByScale(plotLines);
    return counts[scale] < this.scaleLimits[scale].min;
  }

  /**
   * Get scales that need more plots (below minimum)
   */
  getScalesNeedingPlots(plotLines: PlotLinesComponent): PlotScale[] {
    const counts = this.countPlotsByScale(plotLines);
    const needing: PlotScale[] = [];

    for (const scale of ['micro', 'small', 'medium', 'large', 'epic'] as PlotScale[]) {
      if (counts[scale] < this.scaleLimits[scale].min) {
        needing.push(scale);
      }
    }

    return needing;
  }

  /**
   * Match spinner seeds (core_interests) to plot templates
   */
  getSpinnerSeedMatchedTemplates(
    spinnerSeeds: string[],
    eligibleTemplates: ReturnType<typeof plotLineRegistry.getEligibleTemplates>
  ): typeof eligibleTemplates {
    if (spinnerSeeds.length === 0) return eligibleTemplates;

    // Score templates by how well they match spinner seeds
    const scored = eligibleTemplates.map(template => {
      let score = 0;

      // Check template tags/keywords against spinner seeds
      const templateKeywords = [
        template.name.toLowerCase(),
        template.description.toLowerCase(),
        template.lesson.domain.toLowerCase(),
      ].join(' ');

      for (const seed of spinnerSeeds) {
        if (templateKeywords.includes(seed.toLowerCase())) {
          score++;
        }
      }

      return { template, score };
    });

    // Sort by score (highest first), then filter to only scored ones
    const matched = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(s => s.template);

    // Return matched if any, otherwise fall back to all eligible
    return matched.length > 0 ? matched : eligibleTemplates;
  }
}
