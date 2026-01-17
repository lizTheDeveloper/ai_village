import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';
import type { EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import type { EventData } from '../events/EventMap.js';
import { getEpisodicMemory, getSemanticMemory, getReflection } from '../utils/componentHelpers.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import { SemanticMemoryComponent } from '../components/SemanticMemoryComponent.js';
import { ReflectionComponent } from '../components/ReflectionComponent.js';

const ONE_DAY_MS = 86400000;

/**
 * ReflectionSystem handles agent reflections on their experiences
 */
export class ReflectionSystem implements System {
  public readonly id: SystemId = CT.Reflection;
  public readonly priority: number = 110;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private events!: SystemEventManager;
  private reflectionTriggers: Map<
    string,
    { type: 'daily' | 'deep' | 'post_event'; timestamp: number }
  > = new Map();

  constructor(eventBus: EventBus) {
    this.events = new SystemEventManager(eventBus, this.id);
    this._setupEventListeners();
  }

  private _setupEventListeners(): void {
    // Type-safe subscription with auto-cleanup tracking
    this.events.on('agent:sleep_start', (data) => {
      this.reflectionTriggers.set(data.agentId, {
        type: 'daily',
        timestamp: data.timestamp ?? Date.now(),
      });
    });

    // Deep reflection triggers
    this.events.on('time:new_week', (data) => {
      // Trigger deep reflection for all agents
      this.reflectionTriggers.set(data.agentId ?? 'broadcast', {
        type: 'deep',
        timestamp: data.timestamp ?? Date.now(),
      });
    });

    this.events.on('time:season_change', (data) => {
      // Trigger deep reflection for all agents
      this.reflectionTriggers.set(data.agentId ?? 'broadcast', {
        type: 'deep',
        timestamp: data.timestamp ?? Date.now(),
      });
    });

    // Significant event reflection (importance > 0.7)
    this.events.on('memory:formed', (data) => {
      const importance = data.importance;
      if (importance > 0.7) {
        this.reflectionTriggers.set(data.agentId, {
          type: 'post_event',
          timestamp: data.timestamp ?? Date.now(),
        });
      }
    });

    // Idle reflection (30% probability)
    this.events.on('agent:idle', (data) => {
      if (Math.random() < 0.3) {
        this.reflectionTriggers.set(data.agentId, {
          type: 'daily',
          timestamp: data.timestamp ?? Date.now(),
        });
      }
    });
  }

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {

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
  }

  private _performDailyReflection(
    entity: Entity,
    episodicMem: EpisodicMemoryComponent,
    _semanticMem: SemanticMemoryComponent,
    _reflectionComp: ReflectionComponent,
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
    (entity as EntityImpl).updateComponent(CT.Reflection, (current: ReflectionComponent) => {
      // Create fresh instance and copy state (handles deserialized components)
      const temp = Object.assign(new ReflectionComponent(), current);
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
      (entity as EntityImpl).updateComponent(CT.EpisodicMemory, (current: EpisodicMemoryComponent) => {
        const temp = Object.assign(new EpisodicMemoryComponent(), current);
        for (const memoryId of importantMemoryIds) {
          temp.updateMemory(memoryId, { markedForConsolidation: true });
        }
        return temp;
      });
    }

    // Update semantic memory from insights
    if (insights.length > 0) {
      (entity as EntityImpl).updateComponent(CT.SemanticMemory, (current: SemanticMemoryComponent) => {
        const temp = Object.assign(new SemanticMemoryComponent(), current);
        for (const insight of insights) {
          temp.formBelief({
            category: CT.Reflection,
            content: insight,
            confidence: 0.6,
            sourceMemories: todaysMemories.map((m) => m.id),
          });
        }
        return temp;
      });
    }

    // Clear reflection indicator for UI and get final count
    let finalReflectionCount = 0;
    (entity as EntityImpl).updateComponent(CT.Reflection, (current: ReflectionComponent) => {
      const temp = Object.assign(new ReflectionComponent(), current);
      temp.isReflecting = false;
      temp.reflectionType = undefined;
      finalReflectionCount = temp.reflections.length;
      return temp;
    });

    // Type-safe emission - compile error if data shape is wrong
    this.events.emit('reflection:completed', {
      agentId: entity.id,
      reflectionCount: finalReflectionCount,
      reflectionType: 'daily',
    });
  }

  private _performDeepReflection(
    entity: Entity,
    episodicMem: EpisodicMemoryComponent,
    _semanticMem: SemanticMemoryComponent,
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

    // Extract themes and patterns
    const themes = this._extractThemes(relevantMemories);
    const insights = this._generateInsights(relevantMemories);

    // Identify identity-related patterns
    const identityInsights = this._identifyIdentityPatterns(relevantMemories);

    // Generate narrative summary
    const narrative = this._generateNarrative(relevantMemories, themes);

    // Generate reflection text
    const text = this._generateReflectionText(relevantMemories, 'deep');

    // Update reflection component (defensive against deserialized components)
    (entity as EntityImpl).updateComponent(CT.Reflection, (current: ReflectionComponent) => {
      const temp = Object.assign(new ReflectionComponent(), current);
      temp.isReflecting = true;
      temp.reflectionType = 'deep';
      temp.addReflection({
        type: 'deep',
        text,
        timestamp,
        memoryIds: relevantMemories.map((m) => m.id),
        insights,
        themes: themes.length > 0 ? themes : undefined,
        narrative,
      });
      return temp;
    });

    // Update semantic memory with identity insights
    if (identityInsights.length > 0) {
      (entity as EntityImpl).updateComponent(CT.SemanticMemory, (current: SemanticMemoryComponent) => {
        const temp = Object.assign(new SemanticMemoryComponent(), current);
        for (const insight of identityInsights) {
          temp.formBelief({
            category: CT.Identity,
            content: insight,
            confidence: 0.7,
            sourceMemories: relevantMemories.map((m) => m.id),
            generalizationFrom: relevantMemories.length,
          });
        }
        return temp;
      });
    }

    // Clear reflection indicator and get final count
    let finalReflectionCount = 0;
    (entity as EntityImpl).updateComponent(CT.Reflection, (current: ReflectionComponent) => {
      const temp = Object.assign(new ReflectionComponent(), current);
      temp.isReflecting = false;
      temp.reflectionType = undefined;
      finalReflectionCount = temp.reflections.length;
      return temp;
    });

    // Type-safe emission - compile error if data shape is wrong
    this.events.emit('reflection:completed', {
      agentId: entity.id,
      reflectionCount: finalReflectionCount,
      reflectionType: 'deep',
    });
  }

  cleanup(): void {
    this.events.cleanup(); // Unsubscribes all automatically
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
