/**
 * SoulConsolidationSystem - Extract significant events to soul's silver thread during sleep
 *
 * Runs AFTER MemoryConsolidationSystem (priority 105) during sleep.
 * Examines consolidated memories and extracts only significant events
 * for the soul's eternal record.
 *
 * Philosophy: "Don't trash up the soul with every time it was hungry or thirsty"
 * Only plot-relevant, milestone, and meaningful choice events go to silver thread.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType } from '../types/ComponentType.js';
import type { EpisodicMemoryComponent, EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import type { SilverThreadComponent, SignificantEventType } from './SilverThreadComponent.js';
import type { SoulLinkComponent } from './SoulLinkComponent.js';
import type { PlotLinesComponent, PlotLineInstance } from '../plot/PlotTypes.js';
import { cleanupConsumedHints } from '../plot/PlotTypes.js';
import { addSignificantEvent } from './SilverThreadComponent.js';
import { plotLineRegistry } from '../plot/PlotLineRegistry.js';

/**
 * System priority: 106 (after MemoryConsolidationSystem at 105)
 */
export class SoulConsolidationSystem extends BaseSystem {
  readonly id = 'soul_consolidation' as const;
  readonly priority = 106;
  readonly requiredComponents = [] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  protected onUpdate(_ctx: SystemContext): void {
    // This system only processes during sleep events, not every tick
    // It subscribes to 'sleep_start' events from SleepSystem
  }

  /**
   * Called when agent enters sleep
   */
  async onSleepStart(agent: Entity, world: World): Promise<void> {
    // Check if agent has a soul
    const soulLink = agent.getComponent(ComponentType.SoulLink) as SoulLinkComponent | undefined;
    if (!soulLink) return; // No soul = no consolidation

    // Get the soul entity
    const soul = world.getEntity(soulLink.soul_id);
    if (!soul) {
      console.warn(`[SoulConsolidation] Soul ${soulLink.soul_id} not found for agent ${agent.id}`);
      return;
    }

    const thread = soul.getComponent(ComponentType.SilverThread) as SilverThreadComponent | undefined;
    if (!thread) {
      console.warn(`[SoulConsolidation] Soul ${soul.id} missing SilverThread component`);
      return;
    }

    // Get agent's consolidated memories
    const episodicMemory = agent.getComponent(ComponentType.EpisodicMemory) as EpisodicMemoryComponent | undefined;
    if (!episodicMemory) return;

    // === Phase 5: Clean up consumed dream hints ===
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
    if (plotLines) {
      const cleanedUp = cleanupConsumedHints(plotLines, thread.head.personal_tick, 500);
      if (cleanedUp > 0) {
      }
    }

    // Extract significant events from recent memories
    const significantEvents = this.extractSignificantEvents(
      agent,
      soul,
      episodicMemory,
      world
    );

    // Write to silver thread
    for (const event of significantEvents) {
      addSignificantEvent(thread, event);
    }

    if (significantEvents.length > 0) {
    }
  }

  /**
   * Extract significant events from memories
   *
   * ONLY significant events are recorded:
   * ✅ Plot stage changes, lessons learned, meaningful choices, first-time events, major milestones
   * ❌ Hunger, thirst, routine actions, idle behaviors
   */
  private extractSignificantEvents(
    agent: Entity,
    soul: Entity,
    episodicMemory: EpisodicMemoryComponent,
    _world: World
  ): Array<{ type: SignificantEventType; details: Record<string, any> }> {
    const events: Array<{ type: SignificantEventType; details: Record<string, any> }> = [];

    // Get recent memories (last consolidation cycle)
    const recentMemories = this.getRecentMemories(episodicMemory);

    // Check for plot-relevant events
    const plotLines = soul.getComponent(ComponentType.PlotLines) as PlotLinesComponent | undefined;
    if (plotLines) {
      const plotEvents = this.extractPlotEvents(recentMemories, plotLines);
      events.push(...plotEvents);
    }

    // Check for major life milestones
    const milestoneEvents = this.extractMilestones(recentMemories, agent);
    events.push(...milestoneEvents);

    // Check for meaningful choices
    const choiceEvents = this.extractMeaningfulChoices(recentMemories);
    events.push(...choiceEvents);

    // Check for first-time significant events
    const firstTimeEvents = this.extractFirstTimeEvents(recentMemories, agent, soul);
    events.push(...firstTimeEvents);

    return events;
  }

  /**
   * Get memories from the last sleep cycle
   */
  private getRecentMemories(episodicMemory: EpisodicMemoryComponent): EpisodicMemory[] {
    // Get memories from last ~8 hours of waking time
    const cutoff = Date.now() - (8 * 60 * 60 * 1000);
    return Array.from(episodicMemory.episodicMemories).filter(m => m.timestamp > cutoff);
  }

  /**
   * Extract plot-relevant events (stage changes, plot completion)
   *
   * Phase 5 Enhancement: More explicit plot awareness
   */
  private extractPlotEvents(
    memories: EpisodicMemory[],
    plotLines: PlotLinesComponent
  ): Array<{ type: SignificantEventType; details: Record<string, any> }> {
    const events: Array<{ type: SignificantEventType; details: Record<string, any> }> = [];

    // === Phase 5: Check for memories related to active plots ===
    for (const plot of plotLines.active) {
      const template = plotLineRegistry.getTemplate(plot.template_id);
      if (!template) continue;

      const currentStage = template.stages.find(s => s.stage_id === plot.current_stage);
      if (!currentStage) continue;

      // Look for memories that might be related to the current plot stage
      for (const memory of memories) {
        if (this.isMemoryPlotRelevant(memory, plot, template.name, currentStage.name)) {
          events.push({
            type: 'plot_stage_change',
            details: {
              memory_id: memory.id,
              plot_id: plot.instance_id,
              plot_name: template.name,
              stage_name: currentStage.name,
              description: memory.summary,
              importance: memory.importance,
            },
          });
        }
      }
    }

    // Also check completed plots since last sleep (for lesson-learned events)
    for (const completed of plotLines.completed) {
      const template = plotLineRegistry.getTemplate(completed.template_id);
      if (!template) continue;

      // If completion was recent (rough check via final_stage lookup)
      for (const memory of memories) {
        if (memory.summary.toLowerCase().includes(template.name.toLowerCase()) ||
            memory.summary.toLowerCase().includes(template.lesson.insight.toLowerCase().substring(0, 20))) {
          events.push({
            type: 'lesson_learned',
            details: {
              memory_id: memory.id,
              plot_id: completed.instance_id,
              plot_name: template.name,
              lesson: template.lesson.insight,
              wisdom_domain: template.lesson.domain,
            },
          });
        }
      }
    }

    return events;
  }

  /**
   * Check if a memory is relevant to a specific plot
   */
  private isMemoryPlotRelevant(
    memory: EpisodicMemory,
    plot: PlotLineInstance,
    plotName: string,
    stageName: string
  ): boolean {
    const content = memory.summary.toLowerCase();

    // Check for explicit plot/quest/goal keywords (existing heuristic)
    if (content.includes('plot') || content.includes('quest') || content.includes('goal')) {
      return true;
    }

    // Check if memory mentions the plot or stage name
    if (content.includes(plotName.toLowerCase()) ||
        content.includes(stageName.toLowerCase())) {
      return true;
    }

    // Check for high importance memories that involve bound agents
    if (memory.importance > 0.7) {
      for (const agentId of Object.values(plot.bound_agents)) {
        if (content.includes(agentId.toLowerCase().substring(0, 8))) {
          return true;
        }
      }
    }

    // Check for keywords related to plot themes (betrayal, love, conflict, discovery, etc.)
    const plotKeywords = ['betrayal', 'betrayed', 'love', 'conflict', 'discovery',
                          'revelation', 'secret', 'trust', 'broken', 'forgive',
                          'sacrifice', 'promise', 'vow', 'sworn', 'mentor'];
    for (const keyword of plotKeywords) {
      if (content.includes(keyword) && memory.importance > 0.5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract major life milestones (marriage, parenthood, leadership)
   */
  private extractMilestones(
    memories: EpisodicMemory[],
    _agent: Entity
  ): Array<{ type: SignificantEventType; details: Record<string, any> }> {
    const events: Array<{ type: SignificantEventType; details: Record<string, any> }> = [];

    for (const memory of memories) {
      const content = memory.summary.toLowerCase();

      // Marriage
      if (content.includes('married') || content.includes('wedding')) {
        events.push({
          type: 'major_milestone',
          details: {
            milestone_type: 'marriage',
            description: memory.summary,
          },
        });
      }

      // Parenthood
      if (content.includes('child') || content.includes('parent') || content.includes('birth')) {
        events.push({
          type: 'major_milestone',
          details: {
            milestone_type: 'parenthood',
            description: memory.summary,
          },
        });
      }

      // Leadership
      if (content.includes('leader') || content.includes('elected') || content.includes('appointed')) {
        events.push({
          type: 'major_milestone',
          details: {
            milestone_type: 'leadership',
            description: memory.summary,
          },
        });
      }
    }

    return events;
  }

  /**
   * Extract meaningful choices (betrayal, sacrifice, forgiveness)
   */
  private extractMeaningfulChoices(
    memories: EpisodicMemory[]
  ): Array<{ type: SignificantEventType; details: Record<string, any> }> {
    const events: Array<{ type: SignificantEventType; details: Record<string, any> }> = [];

    for (const memory of memories) {
      const content = memory.summary.toLowerCase();

      // High-importance memories with choice keywords
      if (memory.importance > 0.7) {
        if (content.includes('chose') || content.includes('decided') || content.includes('choice')) {
          events.push({
            type: 'meaningful_choice',
            details: {
              description: memory.summary,
              importance: memory.importance,
            },
          });
        }
      }
    }

    return events;
  }

  /**
   * Extract first-time significant events (first love, first kill, first loss)
   */
  private extractFirstTimeEvents(
    memories: EpisodicMemory[],
    _agent: Entity,
    _soul: Entity
  ): Array<{ type: SignificantEventType; details: Record<string, any> }> {
    const events: Array<{ type: SignificantEventType; details: Record<string, any> }> = [];

    for (const memory of memories) {
      const content = memory.summary.toLowerCase();

      // First-time significant events
      if (content.includes('first') && memory.importance > 0.6) {
        events.push({
          type: 'first_time_event',
          details: {
            description: memory.summary,
            importance: memory.importance,
          },
        });
      }
    }

    return events;
  }
}
