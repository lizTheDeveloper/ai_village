import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import type { EventData } from '../events/EventMap.js';
import { getEpisodicMemory, getSemanticMemory, getReflection } from '../utils/componentHelpers.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import type { SemanticMemoryComponent } from '../components/SemanticMemoryComponent.js';
import { ReflectionComponent } from '../components/ReflectionComponent.js';

const ONE_DAY_MS = 86400000;

/**
 * ReflectionSystem handles agent reflections on their experiences
 */
export class ReflectionSystem implements System {
  public readonly id: SystemId = CT.Reflection;
  public readonly priority: number = 110;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus: EventBus;
  private reflectionTriggers: Map<
    string,
    { type: 'daily' | 'deep' | 'post_event'; timestamp: number }
  > = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this._setupEventListeners();
  }

  private _setupEventListeners(): void {
    this.eventBus.subscribe('agent:sleep_start', (event) => {
      const data = event.data as EventData<'agent:sleep_start'>;
      this.reflectionTriggers.set(data.agentId, {
        type: 'daily',
        timestamp: data.timestamp ?? Date.now(),
      });
    });

    // Deep reflection triggers
    this.eventBus.subscribe('time:new_week', (event) => {
      const data = event.data as EventData<'time:new_week'>;
      // Trigger deep reflection for all agents
      this.reflectionTriggers.set(data.agentId ?? 'broadcast', {
        type: 'deep',
        timestamp: data.timestamp ?? Date.now(),
      });
    });

    this.eventBus.subscribe('time:season_change', (event) => {
      const data = event.data as EventData<'time:season_change'>;
      // Trigger deep reflection for all agents
      this.reflectionTriggers.set(data.agentId ?? 'broadcast', {
        type: 'deep',
        timestamp: data.timestamp ?? Date.now(),
      });
    });

    // Significant event reflection (importance > 0.7)
    this.eventBus.subscribe('memory:formed', (event) => {
      const data = event.data as EventData<'memory:formed'>;
      const importance = data.importance;
      if (importance > 0.7) {
        this.reflectionTriggers.set(data.agentId, {
          type: 'post_event',
          timestamp: data.timestamp ?? Date.now(),
        });
      }
    });

    // Idle reflection (30% probability)
    this.eventBus.subscribe('agent:idle', (event) => {
      const data = event.data as EventData<'agent:idle'>;
      if (Math.random() < 0.3) {
        this.reflectionTriggers.set(data.agentId, {
          type: 'daily',
          timestamp: data.timestamp ?? Date.now(),
        });
      }
    });
  }

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Flush event bus to process triggers
    this.eventBus.flush();

    // Process reflection triggers
    for (const [agentId, trigger] of this.reflectionTriggers.entries()) {
      // Handle 'broadcast' triggers - apply to all agents with reflection components
      if (agentId === 'broadcast') {
        const agents = world.query()
          .with(CT.Agent)
          .with(CT.EpisodicMemory)
          .with(CT.SemanticMemory)
          .with(CT.Reflection)
          .executeEntities();

        for (const agent of agents) {
          const episodicMem = getEpisodicMemory(agent);
          const semanticMem = getSemanticMemory(agent);
          const reflectionComp = getReflection(agent);

          if (!episodicMem || !semanticMem || !reflectionComp) continue;

          if (trigger.type === 'deep') {
            this._performDeepReflection(
              agent,
              episodicMem,
              semanticMem,
              reflectionComp,
              trigger.timestamp
            );
          }
        }
        continue;
      }

      const entity = world.getEntity(agentId);
      if (!entity) {
        // Skip if agent no longer exists (may have been removed)
        continue;
      }

      const episodicMem = getEpisodicMemory(entity);
      const semanticMem = getSemanticMemory(entity);
      const reflectionComp = getReflection(entity);

      if (!episodicMem) {
        throw new Error(`Agent ${agentId} missing EpisodicMemoryComponent`);
      }
      if (!semanticMem) {
        throw new Error(`Agent ${agentId} missing SemanticMemoryComponent`);
      }
      if (!reflectionComp) {
        throw new Error(`Agent ${agentId} missing ReflectionComponent`);
      }

      if (trigger.type === 'daily' || trigger.type === 'post_event') {
        this._performDailyReflection(
          entity,
          episodicMem,
          semanticMem,
          reflectionComp,
          trigger.timestamp
        );
      } else if (trigger.type === 'deep') {
        this._performDeepReflection(
          entity,
          episodicMem,
          semanticMem,
          reflectionComp,
          trigger.timestamp
        );
      }
    }

    this.reflectionTriggers.clear();
    this.eventBus.flush();
  }

  private _performDailyReflection(
    entity: Entity,
    episodicMem: EpisodicMemoryComponent,
    semanticMem: SemanticMemoryComponent,
    reflectionComp: ReflectionComponent,
    timestamp: number
  ): void {
    // Get today's memories
    const dayStart = timestamp - ONE_DAY_MS;
    const todaysMemories = episodicMem.episodicMemories.filter(
      (m) => m.timestamp >= dayStart
    );

    // Skip reflection if no memories (nothing to reflect on)
    if (todaysMemories.length === 0) {
      return;
    }

    // Extract themes and insights
    const themes = this._extractThemes(todaysMemories);
    const insights = this._generateInsights(todaysMemories);

    // Generate reflection text
    const text = this._generateReflectionText(todaysMemories, 'daily');

    // Update reflection component (defensive against deserialized components)
    entity.updateComponent(CT.Reflection, (current: ReflectionComponent) => {
      const temp = new ReflectionComponent(current);
      temp.isReflecting = true;
      temp.reflectionType = 'daily';
      temp.addReflection({
        type: 'daily',
        text,
        timestamp,
        memoryIds: todaysMemories.map((m) => m.id),
        insights,
        themes: themes.length > 0 ? themes : undefined,
      });
      return temp;
    });

    // Mark important memories for consolidation
    const importantMemoryIds = todaysMemories
      .filter(m => m.importance > 0.5)
      .map(m => m.id);

    if (importantMemoryIds.length > 0) {
      entity.updateComponent(CT.EpisodicMemory, (current: EpisodicMemoryComponent) => {
        const temp = new EpisodicMemoryComponent(current);
        for (const memoryId of importantMemoryIds) {
          temp.updateMemory(memoryId, { markedForConsolidation: true });
        }
        return temp;
      });
    }

    // Update semantic memory from insights
    if (insights.length > 0) {
      for (const insight of insights) {
        semanticMem.formBelief({
          category: CT.Reflection,
          content: insight,
          confidence: 0.6,
          sourceMemories: todaysMemories.map((m) => m.id),
        });
      }
    }

    // Clear reflection indicator for UI
    reflectionComp.isReflecting = false;
    reflectionComp.reflectionType = undefined;

    // Emit event
    this.eventBus.emit({
      type: 'reflection:completed',
      source: this.id,
      data: {
        agentId,
        reflectionCount: reflectionComp.reflections.length,
        reflectionType: 'daily',
      },
    });
  }

  private _performDeepReflection(
    agentId: string,
    episodicMem: EpisodicMemoryComponent,
    semanticMem: SemanticMemoryComponent,
    reflectionComp: ReflectionComponent,
    timestamp: number
  ): void {
    // Get memories since last deep reflection
    const lastDeep = reflectionComp.lastDeepReflection;
    const relevantMemories = episodicMem.episodicMemories.filter(
      (m) => m.timestamp >= lastDeep
    );

    if (relevantMemories.length === 0) {
      return;
    }

    // Set reflection indicator for UI
    reflectionComp.isReflecting = true;
    reflectionComp.reflectionType = 'deep';

    // Extract themes and patterns
    const themes = this._extractThemes(relevantMemories);
    const insights = this._generateInsights(relevantMemories);

    // Identify identity-related patterns
    const identityInsights = this._identifyIdentityPatterns(relevantMemories);

    // Generate narrative summary
    const narrative = this._generateNarrative(relevantMemories, themes);

    // Generate reflection text
    const text = this._generateReflectionText(relevantMemories, 'deep');

    // Add reflection
    reflectionComp.addReflection({
      type: 'deep',
      text,
      timestamp,
      memoryIds: relevantMemories.map((m) => m.id),
      insights,
      themes: themes.length > 0 ? themes : undefined,
      narrative,
    });

    // Update semantic memory with identity insights
    for (const insight of identityInsights) {
      semanticMem.formBelief({
        category: CT.Identity,
        content: insight,
        confidence: 0.7,
        sourceMemories: relevantMemories.map((m) => m.id),
        generalizationFrom: relevantMemories.length,
      });
    }

    // Clear reflection indicator for UI
    reflectionComp.isReflecting = false;
    reflectionComp.reflectionType = undefined;

    // Emit event
    this.eventBus.emit({
      type: 'reflection:completed',
      source: this.id,
      data: {
        agentId,
        reflectionCount: reflectionComp.reflections.length,
        reflectionType: 'deep',
      },
    });
  }

  private _extractThemes(memories: readonly EpisodicMemory[]): string[] {
    const themeCount: Map<string, number> = new Map();

    // Theme mapping - map specific events to broader themes
    const themeMapping: Record<string, string> = {
      'harvest': 'farming',
      'planting': 'farming',
      'tilling': 'farming',
      'watering': 'farming',
      'conversation': 'social',
      'conflict': 'social',
      'help': 'social',
    };

    for (const memory of memories) {
      // Extract themes from event types
      const eventType = memory.eventType.split(':')[0];
      if (!eventType) {
        continue; // Skip if eventType is empty
      }
      const theme = themeMapping[eventType] ?? eventType;
      themeCount.set(theme, (themeCount.get(theme) ?? 0) + 1);
    }

    // Return themes that appear more than once
    return Array.from(themeCount.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([theme]) => theme);
  }

  private _generateInsights(memories: readonly EpisodicMemory[]): string[] {
    const insights: string[] = [];

    // Group by emotional valence
    const positiveCount = memories.filter((m) => m.emotionalValence > 0.3).length;
    const negativeCount = memories.filter((m) => m.emotionalValence < -0.3).length;

    if (positiveCount > negativeCount * 2) {
      insights.push('Today was mostly positive');
    } else if (negativeCount > positiveCount * 2) {
      insights.push('Today was challenging');
    }

    // Check for patterns
    const themes = this._extractThemes(memories);
    if (themes.includes('farming') || themes.includes('harvest')) {
      insights.push('Farming continues to be central to my life');
    }
    if (themes.includes('social') || themes.includes(CT.Conversation)) {
      insights.push('Social connections are important');
    }

    return insights;
  }

  private _identifyIdentityPatterns(memories: readonly EpisodicMemory[]): string[] {
    const patterns: string[] = [];

    // Look for recurring behaviors
    const helpCount = memories.filter((m) => m.eventType.includes('help')).length;
    if (helpCount >= 3) {
      patterns.push('I value helping others');
    }

    const conflictCount = memories.filter((m) =>
      m.eventType.includes('conflict')
    ).length;
    if (conflictCount >= 3) {
      patterns.push('I need to work on conflict resolution');
    }

    return patterns;
  }

  private _generateNarrative(memories: readonly EpisodicMemory[], themes: string[]): string {
    let narrative = `Over this period, I experienced ${memories.length} significant events. `;

    if (themes.length > 0) {
      narrative += `The main themes were: ${themes.slice(0, 3).join(', ')}. `;
    }

    const avgValence =
      memories.reduce((sum, m) => sum + (m.emotionalValence ?? 0), 0) /
      memories.length;

    if (avgValence > 0.3) {
      narrative += 'Overall, it was a positive time.';
    } else if (avgValence < -0.3) {
      narrative += 'It was a difficult period with many challenges.';
    } else {
      narrative += 'It was a time of mixed experiences.';
    }

    return narrative;
  }

  private _generateReflectionText(
    memories: readonly EpisodicMemory[],
    type: 'daily' | 'deep'
  ): string {
    if (type === 'daily') {
      return `Reflecting on today: ${memories.length} significant moments stand out.`;
    } else {
      return `Looking back over this time: ${memories.length} memories shape my understanding.`;
    }
  }
}
