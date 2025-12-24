import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';

const SECONDS_PER_DAY = 86400;

/**
 * MemoryConsolidationSystem handles memory decay and consolidation
 */
export class MemoryConsolidationSystem implements System {
  public readonly id: SystemId = 'memory_consolidation';
  public readonly priority: number = 105;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus: EventBus;
  private consolidationTriggers: Set<string> = new Set();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this._setupEventListeners();
  }

  private _setupEventListeners(): void {
    // Listen for consolidation triggers
    this.eventBus.subscribe('agent:sleep_start', (event) => {
      const data = event.data as any;
      if (!data.agentId) {
        throw new Error('agent:sleep_start event missing agentId');
      }
      this.consolidationTriggers.add(data.agentId as string);
    });

    this.eventBus.subscribe('reflection:completed', (event) => {
      const data = event.data as any;
      if (!data.agentId) {
        throw new Error('reflection:completed event missing agentId');
      }
      this.consolidationTriggers.add(data.agentId as string);
    });

    this.eventBus.subscribe('memory:recalled', (event) => {
      const data = event.data as any;
      // Queue memory strengthening
      this._queueMemoryStrengthening(data);
    });
  }

  private recalledMemories: Array<{ agentId: string; memoryId: string }> = [];

  private _queueMemoryStrengthening(data: any): void {
    if (!data.agentId || !data.memoryId) {
      return;
    }
    this.recalledMemories.push({
      agentId: data.agentId,
      memoryId: data.memoryId,
    });
  }

  update(world: World, deltaTimeOrEntities: number | ReadonlyArray<Entity>, deltaTime?: number): void {
    // Handle both calling conventions: (world, deltaTime) and (world, entities, deltaTime)
    const actualDeltaTime = typeof deltaTimeOrEntities === 'number' ? deltaTimeOrEntities : deltaTime!;
    const daysElapsed = actualDeltaTime / SECONDS_PER_DAY;

    // Flush event bus first to process consolidation triggers and recall events
    this.eventBus.flush();

    // Get all entities with episodic memory
    const memoryEntities = world.query().executeEntities();

    // Check if any consolidation triggers are for entities without memory component
    for (const agentId of this.consolidationTriggers) {
      const entity = world.getEntity(agentId);
      if (!entity) {
        this.consolidationTriggers.clear();
        throw new Error(`Agent ${agentId} not found (consolidation trigger)`);
      }
      const memComp = entity.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
      if (!memComp) {
        this.consolidationTriggers.clear();
        throw new Error(`Agent ${agentId} missing EpisodicMemoryComponent`);
      }
    }

    for (const entity of memoryEntities) {
      const memComp = entity.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
      if (!memComp) continue;

      // Apply decay
      memComp.applyDecay(daysElapsed);

      // Remove forgotten memories and emit events
      const forgotten = memComp.removeForgotten();
      for (const memory of forgotten) {
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
    for (const { agentId, memoryId } of this.recalledMemories) {
      const entity = world.getEntity(agentId);
      if (!entity) continue;

      const memComp = entity.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
      if (!memComp) continue;

      try {
        const memory = memComp.episodicMemories.find((m: any) => m.id === memoryId);
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
        const updatedMemory = memComp.episodicMemories.find((m: any) => m.id === memoryId);
        if (updatedMemory && updatedMemory.timesRecalled > 3) {
          memComp.updateMemory(memoryId, {
            importance: Math.min(1.0, updatedMemory.importance + 0.02),
          });
        }
      } catch (e) {
        // Memory may have been forgotten
      }
    }
    this.recalledMemories = [];

    // Flush event bus
    this.eventBus.flush();
  }

  private _consolidateMemories(_agentId: string, memComp: EpisodicMemoryComponent): void {
    // Consolidate important, frequently recalled, or emotional memories
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
}
