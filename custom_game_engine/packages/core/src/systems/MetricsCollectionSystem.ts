/**
 * MetricsCollectionSystem - ECS System that bridges game events to MetricsCollector
 *
 * This system subscribes to game events and routes them to the MetricsCollector
 * for tracking sociological metrics, agent behavior, resources, and performance.
 *
 * Part of Phase 22: Sociological Metrics Foundation
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { EventBus } from '../events/EventBus.js';
import { MetricsCollector } from '../metrics/MetricsCollector.js';
import { MetricsStreamClient, type MetricsStreamConfig } from '../metrics/MetricsStreamClient.js';
import type { StoredMetric } from '../metrics/MetricsStorage.js';

interface MetricsCollectionConfig {
  enabled: boolean;
  samplingRate: number; // 0-1, what % of high-frequency events to record
  snapshotInterval: number; // ticks between population snapshots
  /** Enable streaming to metrics server */
  streaming?: boolean;
  /** Streaming configuration */
  streamConfig?: MetricsStreamConfig;
}

const DEFAULT_CONFIG: MetricsCollectionConfig = {
  enabled: true,
  samplingRate: 1.0, // Record all events by default
  snapshotInterval: 100, // Snapshot every 100 ticks (~1.6 seconds at 60fps)
  streaming: false,
};

export class MetricsCollectionSystem implements System {
  public readonly id: SystemId = 'metrics_collection';
  public readonly priority: number = 999; // Run last to capture all events
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private collector: MetricsCollector;
  private config: MetricsCollectionConfig;
  private tickCount = 0;
  private lastSnapshotTick = 0;
  private streamClient: MetricsStreamClient | null = null;

  constructor(world: World, config: Partial<MetricsCollectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.collector = new MetricsCollector(world);
    this.setupEventListeners(world.eventBus);

    // Initialize streaming if enabled
    if (this.config.streaming) {
      this.streamClient = new MetricsStreamClient(this.config.streamConfig);
      this.streamClient.connect();
    }
  }

  /**
   * Get the stream client for external access (e.g., stats display)
   */
  getStreamClient(): MetricsStreamClient | null {
    return this.streamClient;
  }

  /**
   * Set up listeners for all relevant game events
   */
  private setupEventListeners(eventBus: EventBus): void {
    // === Agent Lifecycle ===
    eventBus.subscribe('agent:birth', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'agent:birth',
        timestamp: Date.now(),
        agentId: data.agentId,
        name: data.name,
        useLLM: data.useLLM,
        generation: data.generation,
        parents: data.parents,
        initialStats: data.initialStats,
      });
    });

    eventBus.subscribe('agent:ate', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'resource:consumed',
        timestamp: Date.now(),
        agentId: data.agentId,
        resourceType: data.foodType,
        amount: data.amount ?? 1,
        purpose: 'food',
      });
    });

    // NOTE: agent:collapsed is NOT a death - it's when an agent falls asleep from exhaustion
    // They will wake up and recover. Only agent:starved and agent:died are actual deaths.
    eventBus.subscribe('agent:collapsed', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'agent:collapsed',
        timestamp: Date.now(),
        agentId: data.agentId,
        reason: data.reason,
      });
    });

    // === Sleep Events ===
    eventBus.subscribe('agent:sleep_start', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'agent:sleep_start',
        timestamp: Date.now(),
        agentId: data.agentId,
      });
    });

    eventBus.subscribe('agent:sleeping', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'agent:sleeping',
        timestamp: Date.now(),
        agentId: data.agentId,
      });
    });

    eventBus.subscribe('agent:woke', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'agent:woke',
        timestamp: Date.now(),
        agentId: data.agentId,
      });
    });

    eventBus.subscribe('agent:starved', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'agent:death',
        timestamp: Date.now(),
        agentId: data.agentId,
        causeOfDeath: 'starvation',
        ageAtDeath: 0,
      });
    });

    // === Resource Events ===
    eventBus.subscribe('resource:gathered', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'resource:gathered',
        timestamp: Date.now(),
        agentId: data.agentId,
        resourceType: data.resourceType,
        amount: data.amount,
        gatherTime: 1000, // Placeholder - would need actual timing
      });
    });

    eventBus.subscribe('harvest:completed', (event) => {
      const data = event.data;
      const harvested = data.harvested;
      for (const item of harvested) {
        this.recordEvent({
          type: 'resource:gathered',
          timestamp: Date.now(),
          agentId: data.agentId,
          resourceType: item.itemId,
          amount: item.amount,
          gatherTime: 1000,
        });
      }
    });

    // === Conversation & Social Events ===
    eventBus.subscribe('conversation:started', (event) => {
      const data = event.data;
      const participants = data.participants;
      this.recordEvent({
        type: 'conversation:started',
        timestamp: Date.now(),
        participants: participants,
        initiator: data.initiator,
      });

      // Also record as relationship formation if it's a new pairing
      if (participants.length >= 2) {
        this.recordEvent({
          type: 'relationship:formed',
          timestamp: Date.now(),
          agent1: participants[0],
          agent2: participants[1],
        });
      }
    });

    // Track conversation messages for chat feed
    eventBus.subscribe('conversation:utterance', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'conversation:utterance',
        timestamp: Date.now(),
        agentId: data.speaker || data.speakerId,
        data: {
          conversationId: data.conversationId,
          listenerId: data.listenerId,
          message: data.message,
        },
      });
    });

    // === Spatial Events ===
    eventBus.subscribe('exploration:milestone', (event) => {
      const data = event.data;
      const location = data.location;
      this.recordEvent({
        type: 'tile:visited',
        timestamp: Date.now(),
        agentId: data.agentId,
        x: location.x,
        y: location.y,
      });
    });

    eventBus.subscribe('navigation:arrived', (event) => {
      const data = event.data;
      const destination = data.destination;
      this.recordEvent({
        type: 'tile:visited',
        timestamp: Date.now(),
        agentId: data.agentId,
        x: destination.x,
        y: destination.y,
      });
    });

    // === Behavior Events ===
    eventBus.subscribe('behavior:change', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'activity:started',
        timestamp: Date.now(),
        agentId: data.agentId,
        activity: data.to,
        reason: data.reason,
      });

      if (data.from) {
        this.recordEvent({
          type: 'activity:ended',
          timestamp: Date.now(),
          agentId: data.agentId,
          activity: data.from,
        });

        // Track wander sessions as exploration activity
        if (data.from === 'wander') {
          this.recordEvent({
            type: 'exploration:wander_session',
            timestamp: Date.now(),
            agentId: data.agentId,
            endedWith: data.to,
          });
        }
      }
    });

    // === LLM Decision Events ===
    eventBus.subscribe('llm:request', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'llm:request',
        timestamp: Date.now(),
        agentId: data.agentId,
        data: {
          promptLength: data.promptLength,
          reason: data.reason,
        },
      });
    });

    eventBus.subscribe('llm:decision', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'llm:decision',
        timestamp: Date.now(),
        agentId: data.agentId,
        data: {
          decision: data.decision,
          behavior: data.behavior,
          reasoning: data.reasoning,
          source: data.source,
        },
      });
    });

    eventBus.subscribe('llm:error', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'llm:error',
        timestamp: Date.now(),
        agentId: data.agentId,
        data: {
          error: data.error,
          errorType: data.errorType,
        },
      });
    });

    eventBus.subscribe('agent:llm_context', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'agent:llm_context',
        timestamp: Date.now(),
        agentId: data.agentId,
        data: {
          context: data.context,
          tick: data.tick,
          agentName: data.agentName,
          behavior: data.behavior,
          position: data.position,
          needs: data.needs,
          inventory: data.inventory,
          skills: data.skills,  // Include skills in recorded data
          priorities: data.priorities,
          personalGoal: data.personalGoal,
          mediumTermGoal: data.mediumTermGoal,
          lastThought: data.lastThought,
        },
      });
    });

    // === Building Events ===
    eventBus.subscribe('building:complete', (event) => {
      const data = event.data;
      // Track as both an event and a milestone
      this.recordEvent({
        type: 'building:complete',
        timestamp: Date.now(),
        buildingId: data.buildingId || data.entityId,
        buildingType: data.buildingType,
      });
      this.collector.recordMilestone({
        timestamp: Date.now(),
        name: `Building completed: ${data.buildingType}`,
        significance: 5,
      });
    });

    eventBus.subscribe('construction:started', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'task:started',
        timestamp: Date.now(),
        agentId: 'system', // Construction can be system-initiated
        taskType: 'construction',
        buildingType: data.buildingType || data.blueprintId,
        buildingId: data.buildingId || data.entityId,
      });
    });

    // === Crafting Events ===
    eventBus.subscribe('crafting:completed', (event) => {
      const data = event.data;
      const produced = data.produced;

      // Record the crafting completion event with full details
      this.recordEvent({
        type: 'crafting:completed',
        timestamp: Date.now(),
        data: {
          jobId: data.jobId,
          recipeId: data.recipeId,
          agentId: data.agentId,
          produced: produced,
          quality: (data as any).quality,  // Include quality if available
          station: (data as any).station,  // Include station if available
        },
      });

      // Also record as resource:produced for aggregate tracking
      for (const item of produced) {
        this.recordEvent({
          type: 'resource:produced',
          timestamp: Date.now(),
          agentId: data.agentId,
          resourceType: item.itemId,
          amount: item.amount,
          data: {
            source: 'crafting',
            recipeId: data.recipeId,
            quality: (data as any).quality,
          },
        });
      }
    });

    // Track crafting job starts for timeline
    eventBus.subscribe('crafting:job_started', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'crafting:job_started',
        timestamp: Date.now(),
        agentId: data.agentId,
        data: {
          jobId: data.jobId,
          recipeId: data.recipeId,
        },
      });
    });

    // Track crafting job queued
    eventBus.subscribe('crafting:job_queued', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'crafting:job_queued',
        timestamp: Date.now(),
        data: {
          jobId: data.jobId,
          recipeId: data.recipeId,
          station: data.station,
        },
      });
    });

    // === Animal Events ===
    eventBus.subscribe('animal_spawned', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'agent:birth',
        timestamp: Date.now(),
        agentId: data.animalId,
        generation: 0,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 },
      });
    });

    eventBus.subscribe('animal_died', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'agent:death',
        timestamp: Date.now(),
        agentId: data.animalId,
        causeOfDeath: data.cause,
        ageAtDeath: 0,
      });
    });

    eventBus.subscribe('animal_tamed', (event) => {
      const data = event.data;
      // Record as relationship formation between agent and animal
      this.recordEvent({
        type: 'relationship:formed',
        timestamp: Date.now(),
        agent1: data.tamerId,
        agent2: data.animalId,
      });
    });

    eventBus.subscribe('product_ready', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'resource:produced',
        timestamp: Date.now(),
        agentId: data.animalId,
        resourceType: data.productType,
        amount: data.amount,
      });
    });

    // === Weather Events ===
    eventBus.subscribe('weather:changed', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'weather:changed',
        timestamp: Date.now(),
        weatherType: data.weatherType,
        oldWeather: data.oldWeather,
        intensity: data.intensity,
      });
      this.collector.recordMilestone({
        timestamp: Date.now(),
        name: `Weather changed to ${data.weatherType}`,
        significance: 2,
      });
    });

    // === Time Events ===
    eventBus.subscribe('time:day_changed', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'time:day_changed',
        timestamp: Date.now(),
        day: data.day,
      });
      this.collector.recordMilestone({
        timestamp: Date.now(),
        name: `Day ${data.day} began`,
        significance: 3,
      });
    });

    eventBus.subscribe('time:phase_changed', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'time:phase_changed',
        timestamp: Date.now(),
        phase: data.phase || data.newPhase,
        oldPhase: data.oldPhase,
      });
    });

    eventBus.subscribe('time:season_change', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'time:season_change',
        timestamp: Date.now(),
        season: data.newSeason,
        oldSeason: data.oldSeason,
      });
      this.collector.recordMilestone({
        timestamp: Date.now(),
        name: `Season changed to ${data.newSeason}`,
        significance: 7,
      });
    });

    // === Plant Events ===
    eventBus.subscribe('plant:mature', (event) => {
      const data = event.data;
      this.collector.recordMilestone({
        timestamp: Date.now(),
        name: `${data.speciesId} plant matured`,
        significance: 1,
      });
    });

    eventBus.subscribe('seed:gathered', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'resource:gathered',
        timestamp: Date.now(),
        agentId: data.agentId,
        resourceType: `${data.speciesId}_seed`,
        amount: data.seedCount,
        gatherTime: 500,
      });
    });

    // === Memory & Cognition Events ===
    eventBus.subscribe('memory:formed', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'memory:formed',
        timestamp: Date.now(),
        agentId: data.agentId,
        memoryType: data.memoryType,
        content: data.content,
        importance: data.importance,
      });
    });

    eventBus.subscribe('belief:formed', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'belief:formed',
        timestamp: Date.now(),
        agentId: data.agentId,
        beliefType: data.beliefType,
        content: data.content,
        confidence: data.confidence,
      });
    });

    eventBus.subscribe('behavior:goal_achieved', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'goal:achieved',
        timestamp: Date.now(),
        agentId: data.agentId,
        behavior: data.behavior,
        goalType: data.goalType,
        summary: data.summary,
        resourcesGathered: data.resourcesGathered,
        itemsCrafted: data.itemsCrafted,
      });
    });

    eventBus.subscribe('reflection:completed', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'reflection:completed',
        timestamp: Date.now(),
        agentId: data.agentId,
        reflectionCount: data.reflectionCount,
        reflectionType: data.reflectionType,
      });
    });

    eventBus.subscribe('journal:written', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'journal:written',
        timestamp: Date.now(),
        agentId: data.agentId,
        entryCount: data.entryCount,
      });
    });

    // === Research Events ===
    eventBus.subscribe('research:completed', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'research:completed',
        timestamp: Date.now(),
        agentId: data.researchers?.[0],
        researchId: data.researchId,
        unlocks: data.unlocks,
      });
    });

    // === Storage Events ===
    eventBus.subscribe('items:deposited', (event) => {
      const data = event.data;
      this.recordEvent({
        type: 'items:deposited',
        timestamp: Date.now(),
        agentId: data.agentId,
        storageId: data.storageId,
        items: data.items,
      });
    });
  }

  /**
   * Record an event with sampling
   */
  private recordEvent(event: Record<string, unknown>): void {
    if (!this.config.enabled) return;

    // Apply sampling for high-frequency events
    if (this.config.samplingRate < 1.0) {
      if (Math.random() > this.config.samplingRate) {
        return;
      }
    }

    // Ensure event has required type field
    if (!event.type || typeof event.type !== 'string') {
      throw new Error('Event missing required type field');
    }

    try {
      this.collector.recordEvent(event as { type: string; [key: string]: unknown });
    } catch {
      // Log but don't crash on unknown event types
      // This allows the game to emit new events without breaking metrics
      console.debug(`MetricsCollection: Unhandled event type ${event.type}`);
    }

    // Stream to server if enabled
    if (this.streamClient) {
      const storedMetric: StoredMetric = {
        type: event.type as string,
        timestamp: (event.timestamp as number) || Date.now(),
        agentId: event.agentId as string | undefined,
        data: event,
      };
      this.streamClient.send(storedMetric);
    }
  }

  /**
   * Update method called each tick
   */
  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    if (!this.config.enabled) return;

    this.tickCount++;

    // Take periodic snapshots
    if (this.tickCount - this.lastSnapshotTick >= this.config.snapshotInterval) {
      this.takeSnapshot(world);
      this.lastSnapshotTick = this.tickCount;
    }
  }

  /**
   * Take a snapshot of current population state
   */
  private takeSnapshot(world: World): void {
    // Get all agents
    const agents = world.query().with('agent').with('needs').executeEntities();

    for (const agent of agents) {
      const needs = agent.components.get('needs') as any;
      if (needs) {
        try {
          this.collector.sampleMetrics(
            agent.id,
            {
              hunger: needs.hunger ?? 50,
              thirst: needs.thirst ?? 50,
              energy: needs.energy ?? 50,
              temperature: 20, // Would need temperature component
              health: needs.health ?? 100,
            },
            Date.now()
          );
        } catch {
          // Agent might not be in lifecycle yet
        }
      }
    }

    // Sample performance
    this.collector.samplePerformance(
      {
        fps: 60, // Would need actual FPS tracking
        tickDuration: 16,
        memoryUsage: 0, // Would need actual memory tracking
        entityCount: world.entities.size,
      },
      Date.now()
    );
  }

  /**
   * Get the metrics collector for external queries
   */
  getCollector(): MetricsCollector {
    return this.collector;
  }

  /**
   * Get all collected metrics
   */
  getAllMetrics(): Record<string, any> {
    return this.collector.getAllMetrics();
  }

  /**
   * Export metrics in the specified format
   */
  exportMetrics(format: 'json' | 'csv'): Buffer {
    return this.collector.exportMetrics(format);
  }

  /**
   * Enable or disable metrics collection
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if metrics collection is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}
