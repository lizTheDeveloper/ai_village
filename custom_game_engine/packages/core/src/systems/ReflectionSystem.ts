import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import { SemanticMemoryComponent } from '../components/SemanticMemoryComponent.js';
import { ReflectionComponent } from '../components/ReflectionComponent.js';

const ONE_DAY_MS = 86400000;

/**
 * ReflectionSystem handles agent reflections on their experiences
 */
export class ReflectionSystem implements System {
  public readonly id: SystemId = 'reflection';
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
      const data = event.data as any;
      this.reflectionTriggers.set(data.agentId as string, {
        type: 'daily',
        timestamp: data.timestamp as number,
      });
    });

    this.eventBus.subscribe('time:new_week', (event) => {
      const data = event.data as any;
      this.reflectionTriggers.set(data.agentId as string, {
        type: 'deep',
        timestamp: data.timestamp as number,
      });
    });

    this.eventBus.subscribe('time:season_change', (event) => {
      const data = event.data as any;
      this.reflectionTriggers.set(data.agentId as string, {
        type: 'deep',
        timestamp: data.timestamp as number,
      });
    });

    // Significant event reflection (importance > 0.7)
    this.eventBus.subscribe('memory:formed', (event) => {
      const data = event.data as any;
      const importance = data.importance as number;
      if (importance > 0.7) {
        this.reflectionTriggers.set(data.agentId as string, {
          type: 'post_event',
          timestamp: (data.timestamp as number) ?? Date.now(),
        });
      }
    });

    // Idle reflection (30% probability)
    this.eventBus.subscribe('agent:idle', (event) => {
      const data = event.data as any;
      if (Math.random() < 0.3) {
        this.reflectionTriggers.set(data.agentId as string, {
          type: 'daily',
          timestamp: (data.timestamp as number) ?? Date.now(),
        });
      }
    });
  }

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Flush event bus to process triggers
    this.eventBus.flush();

    // Process reflection triggers
    for (const [agentId, trigger] of this.reflectionTriggers.entries()) {
      const entity = world.getEntity(agentId);
      if (!entity) {
        throw new Error(`Agent ${agentId} not found (reflection trigger)`);
      }

      const episodicMem = entity.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
      const semanticMem = entity.components.get('semantic_memory') as SemanticMemoryComponent | undefined;
      const reflectionComp = entity.components.get('reflection') as ReflectionComponent | undefined;

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
          agentId,
          episodicMem,
          semanticMem,
          reflectionComp,
          trigger.timestamp
        );
      } else if (trigger.type === 'deep') {
        this._performDeepReflection(
          agentId,
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
    agentId: string,
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
      console.log(`[Reflection] 💭 Agent ${agentId.slice(0,8)} has no memories to reflect on today`);
      return;
    }

    // Set reflection indicator for UI
    reflectionComp.isReflecting = true;
    reflectionComp.reflectionType = 'daily';

    console.log(`[Reflection] 💭 Agent ${agentId.slice(0,8)} is reflecting on ${todaysMemories.length} memories from today...`);

    // Extract themes and insights
    const themes = this._extractThemes(todaysMemories);
    const insights = this._generateInsights(todaysMemories);

    // Generate reflection text
    const text = this._generateReflectionText(todaysMemories, 'daily');
    console.log(`[Reflection] 💭 Reflection: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
    console.log(`[Reflection] 💭 Insights: ${insights.join(', ')}`);

    // Add reflection
    reflectionComp.addReflection({
      type: 'daily',
      text,
      timestamp,
      memoryIds: todaysMemories.map((m) => m.id),
      insights,
      themes: themes.length > 0 ? themes : undefined,
    });

    // Mark important memories for consolidation
    for (const memory of todaysMemories) {
      if (memory.importance > 0.5) {
        episodicMem.updateMemory(memory.id, {
          markedForConsolidation: true,
        });
      }
    }

    // Update semantic memory from insights
    if (insights.length > 0) {
      for (const insight of insights) {
        semanticMem.formBelief({
          category: 'reflection',
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
        reflectionType: 'daily',
        timestamp,
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
        category: 'identity',
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
        reflectionType: 'deep',
        timestamp,
      },
    });
  }

  private _extractThemes(memories: any[]): string[] {
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
      const theme = themeMapping[eventType] ?? eventType;
      themeCount.set(theme, (themeCount.get(theme) ?? 0) + 1);

      // Extract from tags if present
      if (memory.tags) {
        for (const tag of memory.tags) {
          const tagTheme = themeMapping[tag] ?? tag;
          themeCount.set(tagTheme, (themeCount.get(tagTheme) ?? 0) + 1);
        }
      }
    }

    // Return themes that appear more than once
    return Array.from(themeCount.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([theme]) => theme);
  }

  private _generateInsights(memories: any[]): string[] {
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
    if (themes.includes('social') || themes.includes('conversation')) {
      insights.push('Social connections are important');
    }

    return insights;
  }

  private _identifyIdentityPatterns(memories: any[]): string[] {
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

  private _generateNarrative(memories: any[], themes: string[]): string {
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
    memories: any[],
    type: 'daily' | 'deep'
  ): string {
    if (type === 'daily') {
      return `Reflecting on today: ${memories.length} significant moments stand out.`;
    } else {
      return `Looking back over this time: ${memories.length} memories shape my understanding.`;
    }
  }
}
