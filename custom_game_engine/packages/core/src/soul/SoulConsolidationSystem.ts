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

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType } from '../types/ComponentType.js';
import type { EpisodicMemoryComponent, EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import type { SilverThreadComponent, SignificantEventType } from './SilverThreadComponent.js';
import type { SoulLinkComponent } from './SoulLinkComponent.js';
import type { PlotLinesComponent } from '../plot/PlotTypes.js';
import { addSignificantEvent } from './SilverThreadComponent.js';

/**
 * System priority: 106 (after MemoryConsolidationSystem at 105)
 */
export class SoulConsolidationSystem implements System {
  readonly id = 'soul_consolidation' as const;
  readonly priority = 106;
  readonly requiredComponents = [] as const;

  update(_world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
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
      console.log(`[SoulConsolidation] Wrote ${significantEvents.length} significant events to soul ${soul.id}`);
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
    world: World
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
   */
  private extractPlotEvents(
    memories: Memory[],
    plotLines: PlotLinesComponent
  ): Array<{ type: SignificantEventType; details: Record<string, any> }> {
    const events: Array<{ type: SignificantEventType; details: Record<string, any> }> = [];

    // Look for memories about plot progression
    for (const memory of memories) {
      // Check if memory is tagged as plot-relevant
      if (memory.content.includes('plot') || memory.content.includes('quest') || memory.content.includes('goal')) {
        // This is a simple heuristic - in practice, plot events should be explicitly tagged
        events.push({
          type: 'plot_stage_change',
          details: {
            memory_id: memory.id,
            description: memory.content,
            importance: memory.importance,
          },
        });
      }
    }

    return events;
  }

  /**
   * Extract major life milestones (marriage, parenthood, leadership)
   */
  private extractMilestones(
    memories: Memory[],
    agent: Entity
  ): Array<{ type: SignificantEventType; details: Record<string, any> }> {
    const events: Array<{ type: SignificantEventType; details: Record<string, any> }> = [];

    for (const memory of memories) {
      const content = memory.content.toLowerCase();

      // Marriage
      if (content.includes('married') || content.includes('wedding')) {
        events.push({
          type: 'major_milestone',
          details: {
            milestone_type: 'marriage',
            description: memory.content,
          },
        });
      }

      // Parenthood
      if (content.includes('child') || content.includes('parent') || content.includes('birth')) {
        events.push({
          type: 'major_milestone',
          details: {
            milestone_type: 'parenthood',
            description: memory.content,
          },
        });
      }

      // Leadership
      if (content.includes('leader') || content.includes('elected') || content.includes('appointed')) {
        events.push({
          type: 'major_milestone',
          details: {
            milestone_type: 'leadership',
            description: memory.content,
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
    memories: Memory[]
  ): Array<{ type: SignificantEventType; details: Record<string, any> }> {
    const events: Array<{ type: SignificantEventType; details: Record<string, any> }> = [];

    for (const memory of memories) {
      const content = memory.content.toLowerCase();

      // High-importance memories with choice keywords
      if (memory.importance > 0.7) {
        if (content.includes('chose') || content.includes('decided') || content.includes('choice')) {
          events.push({
            type: 'meaningful_choice',
            details: {
              description: memory.content,
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
    memories: Memory[],
    agent: Entity,
    soul: Entity
  ): Array<{ type: SignificantEventType; details: Record<string, any> }> {
    const events: Array<{ type: SignificantEventType; details: Record<string, any> }> = [];

    for (const memory of memories) {
      const content = memory.content.toLowerCase();

      // First-time significant events
      if (content.includes('first') && memory.importance > 0.6) {
        events.push({
          type: 'first_time_event',
          details: {
            description: memory.content,
            importance: memory.importance,
          },
        });
      }
    }

    return events;
  }
}
