import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { EpisodicMemory } from '../components/EpisodicMemoryComponent.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';

const SECONDS_PER_DAY = 86400;

/**
 * Event types that are repetitive and should be summarized during consolidation.
 * Maps event type to the category label used in summaries.
 */
const REPETITIVE_EVENT_TYPES: Record<string, string> = {
  'resource:gathered': CT.Resource,
  'agent:harvested': 'harvest',
  'action:walk': 'exploration',
  'discovery:location': 'discovery',
};

/**
 * Minimum count of similar memories before summarization kicks in.
 */
const SUMMARIZATION_THRESHOLD = 3;

interface SleepEventData {
  agentId: string;
  timestamp?: number;
}

interface ReflectionEventData {
  agentId: string;
}

interface MemoryRecalledEventData {
  agentId: string;
  memoryId: string;
}

/**
 * MemoryConsolidationSystem handles memory decay and consolidation
 */
export class MemoryConsolidationSystem implements System {
  public readonly id: SystemId = 'memory_consolidation';
  public readonly priority: number = 105;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus: EventBus | null = null;
  private consolidationTriggers: Set<string> = new Set();
  private recallEvents: Array<{ agentId: string; memoryId: string }> = [];
  /**
   * Pending game days that passed (for decay at midnight).
   * Each time:day_changed event adds 1 to this counter.
   */
  private pendingGameDays: number = 0;

  constructor(eventBus?: EventBus) {
    if (eventBus) {
      this.eventBus = eventBus;
      this._setupEventListeners();
    }
  }

  /**
   * Initialize system with eventBus
   */
  public initialize(_world: World, eventBus: EventBus): void {
    if (!this.eventBus) {
      this.eventBus = eventBus;
      this._setupEventListeners();
    }
  }

  private _setupEventListeners(): void {
    if (!this.eventBus) {
      throw new Error('EventBus not initialized in MemoryConsolidationSystem');
    }

    // Listen for consolidation triggers
    this.eventBus.subscribe('agent:sleep_start', (event) => {
      const data = event.data as SleepEventData;
      if (!data.agentId) {
        throw new Error('agent:sleep_start event missing agentId');
      }
      this.consolidationTriggers.add(data.agentId);
    });

    this.eventBus.subscribe('reflection:completed', (event) => {
      const data = event.data as ReflectionEventData;
      if (!data.agentId) {
        throw new Error('reflection:completed event missing agentId');
      }
      this.consolidationTriggers.add(data.agentId);
    });

    // Listen for memory recall events
    this.eventBus.subscribe('memory:recalled', (event) => {
      const data = event.data as MemoryRecalledEventData;
      if (!data.agentId) {
        throw new Error('memory:recalled event missing agentId');
      }
      if (!data.memoryId) {
        throw new Error('memory:recalled event missing memoryId');
      }
      this.recallEvents.push({
        agentId: data.agentId,
        memoryId: data.memoryId,
      });
    });

    // Listen for midnight (day change) - triggers daily memory cleanup
    // This is the primary mechanism for memory decay in accelerated simulations
    this.eventBus.subscribe('time:day_changed', (_event) => {
      // Each day change = 1 game day of decay
      this.pendingGameDays += 1;
    });
  }

  update(world: World, deltaTimeOrEntities: number | ReadonlyArray<Entity>, deltaTime?: number): void {
    // Handle both calling conventions: (world, deltaTime) and (world, entities, deltaTime)
    const actualDeltaTime = typeof deltaTimeOrEntities === 'number' ? deltaTimeOrEntities : deltaTime!;

    // Flush event bus first to process consolidation triggers and recall events
    if (!this.eventBus) {
      throw new Error('EventBus not initialized in MemoryConsolidationSystem.update');
    }
    this.eventBus.flush();

    // Calculate days elapsed for decay:
    // - Primary: Use pendingGameDays from time:day_changed events (accurate for game time)
    // - Fallback: Use a small real-time delta for sub-day decay (minimal impact)
    // This ensures decay happens correctly in both accelerated simulations and real-time play
    const gameDaysElapsed = this.pendingGameDays;
    const realTimeDaysElapsed = actualDeltaTime / SECONDS_PER_DAY;

    // Use game days if available, otherwise use minimal real-time decay
    // The game day decay is the primary mechanism; real-time is just for smooth sub-day decay
    const daysElapsed = gameDaysElapsed > 0 ? gameDaysElapsed : realTimeDaysElapsed;

    // Reset the pending game days counter
    this.pendingGameDays = 0;

    // Get all entities with episodic memory
    const memoryEntities = world.query().executeEntities();

    // Check if any consolidation triggers are for entities without memory component
    for (const agentId of this.consolidationTriggers) {
      const entity = world.getEntity(agentId);
      if (!entity) {
        this.consolidationTriggers.clear();
        throw new Error(`Agent ${agentId} not found (consolidation trigger)`);
      }
      const memComp = entity.components.get(CT.EpisodicMemory) as EpisodicMemoryComponent | undefined;
      if (!memComp) {
        this.consolidationTriggers.clear();
        throw new Error(`Agent ${agentId} missing EpisodicMemoryComponent`);
      }
    }

    for (const entity of memoryEntities) {
      const memComp = entity.components.get(CT.EpisodicMemory) as EpisodicMemoryComponent | undefined;
      if (!memComp) continue;

      // Apply decay
      memComp.applyDecay(daysElapsed);

      // Remove forgotten memories and emit events
      const forgotten = memComp.removeForgotten();
      for (const memory of forgotten) {
        if (!this.eventBus) {
          throw new Error('EventBus not initialized in MemoryConsolidationSystem');
        }
        this.eventBus.emit({
          type: 'memory:forgotten',
          source: this.id,
          data: {
            agentId: entity.id,
            memoryId: memory.id,
          },
        });
      }

      // Always check for automatic consolidation of very important/recalled/emotional memories
      // This happens independently of sleep/reflection triggers
      this._consolidateMemories(entity.id, memComp);

      // Additional consolidation pass if triggered by sleep/reflection
      // (this is redundant now but keeps the trigger system for future use)
      if (this.consolidationTriggers.has(entity.id)) {
        this.consolidationTriggers.delete(entity.id);
      }
    }

    // Strengthen recalled memories
    for (const { agentId, memoryId } of this.recallEvents) {
      const entity = world.getEntity(agentId);
      if (!entity) continue;

      const memComp = entity.components.get(CT.EpisodicMemory) as EpisodicMemoryComponent | undefined;
      if (!memComp) continue;

      try {
        const memory = memComp.episodicMemories.find((m: EpisodicMemory) => m.id === memoryId);
        if (!memory) continue;

        // Increment timesRecalled
        memComp.updateMemory(memoryId, {
          timesRecalled: memory.timesRecalled + 1,
        });

        // Strengthen by increasing clarity
        memComp.updateMemory(memoryId, {
          clarity: Math.min(1.0, memory.clarity + 0.05),
        });

        // Increase importance slightly for frequently recalled (after incrementing timesRecalled)
        const updatedMemory = memComp.episodicMemories.find((m: EpisodicMemory) => m.id === memoryId);
        if (updatedMemory && updatedMemory.timesRecalled > 3) {
          memComp.updateMemory(memoryId, {
            importance: Math.min(1.0, updatedMemory.importance + 0.02),
          });
        }
      } catch (e) {
        // Memory may have been forgotten
      }
    }
    this.recallEvents = [];

    // Flush event bus
    if (!this.eventBus) {
      throw new Error('EventBus not initialized in MemoryConsolidationSystem');
    }
    this.eventBus.flush();
  }

  private _consolidateMemories(agentId: string, memComp: EpisodicMemoryComponent): void {
    // First, summarize repetitive memories (like "found wood" x 50)
    this._summarizeRepetitiveMemories(agentId, memComp);

    // Then consolidate important, frequently recalled, or emotional memories
    for (const memory of memComp.episodicMemories) {
      if (memory.consolidated) continue;

      let shouldConsolidate = false;

      // High importance
      if (memory.importance > 0.5 || memory.markedForConsolidation) {
        shouldConsolidate = true;
      }

      // Frequently recalled
      if (memory.timesRecalled > 3) {
        shouldConsolidate = true;
      }

      // Highly emotional
      if (memory.emotionalIntensity > 0.8) {
        shouldConsolidate = true;
      }

      if (shouldConsolidate) {
        memComp.updateMemory(memory.id, {
          consolidated: true,
        });
      }
    }
  }

  /**
   * Summarize repetitive memories like "Gathered wood" x 50 into
   * a single summary like "Gathered lots of wood from the forest area".
   */
  private _summarizeRepetitiveMemories(_agentId: string, memComp: EpisodicMemoryComponent): void {
    // Group memories by event type for repetitive event types
    const groups = new Map<string, EpisodicMemory[]>();

    for (const memory of memComp.episodicMemories) {
      // Skip already consolidated memories and high-importance memories
      if (memory.consolidated) continue;
      if (memory.importance > 0.6) continue;
      if (memory.emotionalIntensity > 0.5) continue;

      // Only group repetitive event types
      const category = REPETITIVE_EVENT_TYPES[memory.eventType];
      if (!category) continue;

      // Group by event type + extracted resource/item type
      const resourceType = this._extractResourceType(memory.summary);
      const groupKey = `${memory.eventType}:${resourceType}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(memory);
    }

    // Process each group
    for (const [groupKey, memories] of groups) {
      if (memories.length < SUMMARIZATION_THRESHOLD) continue;

      // Extract info for summary
      const parts = groupKey.split(':');
      const eventType = parts[0] || 'unknown';
      const resourceType = parts[1] || CT.Resource;
      const count = memories.length;

      // Calculate aggregate values
      const totalQuantity = this._sumQuantities(memories);
      const avgImportance = memories.reduce((sum, m) => sum + m.importance, 0) / count;
      const maxEmotionalIntensity = Math.max(...memories.map(m => m.emotionalIntensity));

      // Generate summary text
      const summaryText = this._generateGroupSummary(eventType, resourceType, count, totalQuantity);

      // Find earliest and latest timestamps
      const timestamps = memories.map(m => m.timestamp);
      const latest = Math.max(...timestamps);

      // Create a single consolidated memory
      memComp.formMemory({
        eventType: 'memory:summarized',
        summary: summaryText,
        timestamp: latest,
        emotionalIntensity: maxEmotionalIntensity,
        emotionalValence: 0,
        surprise: 0,
        novelty: 0.1, // Low novelty since it's routine
      });

      // Mark the new memory as consolidated with boosted importance
      const newMemory = memComp.episodicMemories[memComp.episodicMemories.length - 1];
      if (newMemory) {
        memComp.updateMemory(newMemory.id, {
          consolidated: true,
          importance: Math.min(0.6, avgImportance + 0.1),
        });
      }

      // Mark individual memories for removal by setting clarity to 0
      // (they'll be cleaned up by removeForgotten on next cycle)
      for (const memory of memories) {
        memComp.updateMemory(memory.id, { clarity: 0 });
      }

      // Emit consolidation event
      if (this.eventBus) {
        this.eventBus.emit({
          type: 'memory:consolidated',
          source: this.id,
          data: {
            agentId: _agentId,
            summary: summaryText,
            originalCount: count,
          },
        });
      }
    }
  }

  /**
   * Extract the resource type from a memory summary.
   * E.g., "Gathered 5 wood" -> "wood"
   */
  private _extractResourceType(summary: string): string {
    // Common patterns: "Gathered X wood", "Harvested X berry", "Found X stone"
    const patterns = [
      /(?:gathered|harvested|found|collected)\s+\d*\s*(\w+)/i,
      /(\w+)\s+(?:gathered|harvested|found|collected)/i,
    ];

    for (const pattern of patterns) {
      const match = summary.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }

    return CT.Resource;
  }

  /**
   * Sum quantities from memory summaries.
   */
  private _sumQuantities(memories: EpisodicMemory[]): number {
    let total = 0;
    for (const memory of memories) {
      const match = memory.summary.match(/(\d+)/);
      if (match && match[1]) {
        total += parseInt(match[1], 10);
      } else {
        total += 1; // Assume 1 if no number specified
      }
    }
    return total;
  }

  /**
   * Generate a human-readable summary for a group of memories.
   */
  private _generateGroupSummary(
    eventType: string,
    resourceType: string,
    count: number,
    totalQuantity: number
  ): string {
    const resourceLabel = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);

    if (eventType === 'resource:gathered' || eventType === 'agent:harvested') {
      if (totalQuantity > 20) {
        return `Gathered a large amount of ${resourceType} (${totalQuantity} total from ${count} trips)`;
      } else if (totalQuantity > 10) {
        return `Gathered quite a bit of ${resourceType} (${totalQuantity} total)`;
      } else {
        return `Gathered some ${resourceType} (${totalQuantity} total)`;
      }
    }

    if (eventType === 'discovery:location') {
      return `Explored and discovered ${count} new locations`;
    }

    if (eventType === 'action:walk') {
      return `Spent time traveling around the area`;
    }

    return `${resourceLabel} activity (${count} times)`;
  }
}
