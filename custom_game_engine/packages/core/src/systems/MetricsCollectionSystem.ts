/**
 * MetricsCollectionSystem - ECS System that bridges game events to MetricsCollector
 *
 * This system subscribes to game events and routes them to the MetricsCollector
 * for tracking sociological metrics, agent behavior, resources, and performance.
 *
 * Part of Phase 22: Sociological Metrics Foundation
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { EventBus } from '../events/EventBus.js';
import type { World, WorldMutator } from '../ecs/World.js';
import { MetricsCollector } from '../metrics/MetricsCollector.js';
import { MetricsStreamClient, type MetricsStreamConfig } from '../metrics/MetricsStreamClient.js';
import type { StoredMetric } from '../metrics/MetricsStorage.js';
import { CanonEventRecorder, type CanonEventConfig } from '../metrics/CanonEventRecorder.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { TimeComponent } from './TimeSystem.js';
import { STAGGER } from '../ecs/SystemThrottleConfig.js';

interface MetricsCollectionConfig {
  enabled: boolean;
  samplingRate: number; // 0-1, what % of high-frequency events to record
  snapshotInterval: number; // ticks between population snapshots
  /** Enable streaming to metrics server */
  streaming?: boolean;
  /** Streaming configuration */
  streamConfig?: MetricsStreamConfig;
  /** Canon event recording configuration */
  canonEvents?: Partial<CanonEventConfig>;
}

const DEFAULT_CONFIG: MetricsCollectionConfig = {
  enabled: true,
  samplingRate: 1.0, // Record all events by default
  snapshotInterval: 100, // Snapshot every 100 ticks (~1.6 seconds at 60fps)
  streaming: false,
};

export class MetricsCollectionSystem extends BaseSystem {
  public readonly id: SystemId = 'metrics_collection';
  public readonly priority: number = 999; // Run last to capture all events
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  protected readonly throttleInterval = 100; // Every 5 seconds at 20 TPS
  protected readonly throttleOffset = STAGGER.SLOW_GROUP_B; // Stagger group B (tick 25, 125, 225...)

  private collector!: MetricsCollector;
  private config: MetricsCollectionConfig;
  private tickCount = 0;
  private lastSnapshotTick = 0;
  private streamClient: MetricsStreamClient | null = null;
  private canonRecorder: CanonEventRecorder;
  private lastMilestoneCheckTick = 0;
  private readonly MILESTONE_CHECK_INTERVAL = 20; // Only check milestones once per second

  constructor(config: Partial<MetricsCollectionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.canonRecorder = new CanonEventRecorder(this.config.canonEvents);
  }

  /**
   * Get the stream client for external access (e.g., stats display)
   */
  getStreamClient(): MetricsStreamClient | null {
    return this.streamClient;
  }

  protected onInitialize(world: World, eventBus: EventBus): void {
    this.collector = new MetricsCollector(world);

    // Inject metrics collector into canon recorder for historical data access
    this.canonRecorder.setMetricsCollector(this.collector);

    // Initialize streaming if enabled
    if (this.config.streaming) {
      this.streamClient = new MetricsStreamClient(this.config.streamConfig);
      this.streamClient.connect();
    }

    this.setupEventListeners(eventBus);
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

      // Access optional properties using type guard
      const eventData = data as Record<string, unknown>;
      const quality = ('quality' in eventData && typeof eventData.quality === 'number')
        ? eventData.quality
        : undefined;
      const station = ('station' in eventData && typeof eventData.station === 'string')
        ? eventData.station
        : undefined;

      // Record the crafting completion event with full details
      this.recordEvent({
        type: 'crafting:completed',
        timestamp: Date.now(),
        data: {
          jobId: data.jobId,
          recipeId: data.recipeId,
          agentId: data.agentId,
          produced: produced,
          quality,
          station,
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
            quality,
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

    // ============================================================================
    // CANON EVENTS - Full universe snapshots for multiverse reconstruction
    // ============================================================================

    // Soul creation ceremony (ensoulment)
    eventBus.subscribe('soul:ceremony_complete', (event) => {
      const data = event.data;
      this.canonRecorder.recordEvent('soul:created', this.world, {
        description: `Soul created: ${data.purpose}`,
        agentIds: [data.soulId],
        eventData: {
          soulId: data.soulId,
          purpose: data.purpose,
          interests: data.interests,
          archetype: data.archetype,
          destiny: data.destiny,
          transcript: data.transcript,
        },
      }).then((canonEvent) => {
        this.streamClient?.sendMessage({ type: 'canon_event', event: canonEvent });
      }).catch((error) => {
        console.error('[MetricsCollection] Failed to record soul creation canon event:', error);
      });
    });

    // Birth of ensouled being
    eventBus.subscribe('agent:birth', (event) => {
      const data = event.data;
      // Only record if ensouled
      const entity = this.world.getEntity(data.agentId);
      if (entity?.hasComponent(CT.SoulIdentity)) {
        this.canonRecorder.recordEvent('agent:born', this.world, {
          description: `${data.name} was born`,
          agentIds: [data.agentId],
          eventData: {
            name: data.name,
            generation: data.generation,
            parents: data.parents,
            useLLM: data.useLLM,
          },
        }).then((canonEvent) => {
          // Send canon event to metrics server
          if (this.streamClient) {
            this.streamClient.send({
              type: 'canon_event' as const,
              timestamp: canonEvent.timestamp,
              agentId: canonEvent.agentIds[0],
              data: canonEvent as unknown as Record<string, unknown>,
              category: 'canon',
            });
          }
        }).catch((error) => {
          console.error('[MetricsCollection] Failed to record birth canon event:', error);
        });
      }
    });

    // Death of ensouled being
    eventBus.subscribe('death:occurred', (event) => {
      const data = event.data;
      const entity = this.world.getEntity(data.entityId);
      if (entity?.hasComponent(CT.SoulIdentity)) {
        // Get name from identity component (not agent component)
        const identityComp = entity.getComponent(CT.Identity);
        const agentName = identityComp?.name ?? 'Unknown';

        this.canonRecorder.recordEvent('agent:died', this.world, {
          description: `${agentName} died from ${data.cause}`,
          agentIds: [data.entityId],
          eventData: {
            cause: data.cause,
            location: data.location,
          },
        }).then((canonEvent) => {
          if (this.streamClient) {
            this.streamClient.send({
              type: 'canon_event',
              timestamp: canonEvent.timestamp,
              agentId: canonEvent.agentIds[0],
              data: canonEvent as unknown as Record<string, unknown>,
              category: 'canon',
            });
          }
        }).catch((error) => {
          console.error('[MetricsCollection] Failed to record death canon event:', error);
        });
      }
    });

    // Union/Marriage
    eventBus.subscribe('courtship:consent', (event) => {
      const data = event.data;
      // Check if both are ensouled
      const agent1 = this.world.getEntity(data.agent1);
      const agent2 = this.world.getEntity(data.agent2);
      if (agent1?.hasComponent(CT.SoulIdentity) && agent2?.hasComponent(CT.SoulIdentity)) {
        // Get names from identity components
        const agent1Identity = agent1.getComponent(CT.Identity);
        const agent2Identity = agent2.getComponent(CT.Identity);
        const agent1Name = agent1Identity?.name ?? 'Unknown';
        const agent2Name = agent2Identity?.name ?? 'Unknown';

        this.canonRecorder.recordEvent('union:formed', this.world, {
          description: `${agent1Name} and ${agent2Name} formed a union`,
          agentIds: [data.agent1, data.agent2],
          eventData: {
            agent1: data.agent1,
            agent2: data.agent2,
          },
        }).then((canonEvent) => {
          if (this.streamClient) {
            this.streamClient.send({
              type: 'canon_event',
              timestamp: canonEvent.timestamp,
              agentId: canonEvent.agentIds[0],
              data: canonEvent as unknown as Record<string, unknown>,
              category: 'canon',
            });
          }
        }).catch((error) => {
          console.error('[MetricsCollection] Failed to record union canon event:', error);
        });
      }
    });

    // Reincarnation
    eventBus.subscribe('soul:reincarnated', (event) => {
      const data = event.data;
      const entity = this.world.getEntity(data.newEntityId);
      // Get name from identity component (agents may have been renamed)
      const identityComp = entity?.getComponent<IdentityComponent>(CT.Identity);
      const agentName = identityComp?.name ?? 'Unknown';
      this.canonRecorder.recordEvent('soul:reincarnated', this.world, {
        description: `Soul reincarnated as ${agentName}`,
        agentIds: [data.newEntityId],
        eventData: {
          originalEntityId: data.originalEntityId,
          newEntityId: data.newEntityId,
          memoryRetention: data.memoryRetention,
          deityId: data.deityId,
        },
      }).then((canonEvent) => {
        this.streamClient?.sendMessage({ type: 'canon_event', event: canonEvent });
      }).catch((error) => {
        console.error('[MetricsCollection] Failed to record reincarnation canon event:', error);
      });
    });

    // Sacred site creation (cultural emergence)
    eventBus.subscribe('sacred_site:created', (event) => {
      const data = event.data;
      this.canonRecorder.recordEvent('culture:emerged', this.world, {
        description: `Sacred site created at (${data.position.x}, ${data.position.y})`,
        agentIds: [],
        eventData: {
          siteId: data.siteId,
          type: data.type,
          position: data.position,
        },
      }).then((canonEvent) => {
        this.streamClient?.sendMessage({ type: 'canon_event', event: canonEvent });
      }).catch((error) => {
        console.error('[MetricsCollection] Failed to record sacred site canon event:', error);
      });
    });

    // Rebellion (major crisis)
    eventBus.subscribe('rebellion:triggered', (event) => {
      const data = event.data;
      this.canonRecorder.recordEvent('crisis:occurred', this.world, {
        description: data.message || 'Rebellion triggered against the Creator',
        agentIds: [],
        eventData: {
          type: 'rebellion',
          message: data.message,
          path: data.path,
        },
      }).then((canonEvent) => {
        this.streamClient?.sendMessage({ type: 'canon_event', event: canonEvent });
      }).catch((error) => {
        console.error('[MetricsCollection] Failed to record rebellion canon event:', error);
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

  protected onUpdate(ctx: SystemContext): void {
    if (!this.config.enabled) return;

    // Skip if not initialized (collector not set up yet)
    if (!this.collector) {
      return;
    }

    this.tickCount++;

    // Take periodic snapshots
    if (this.tickCount - this.lastSnapshotTick >= this.config.snapshotInterval) {
      this.takeSnapshot(ctx.world);
      this.lastSnapshotTick = this.tickCount;
    }

    // Check for time milestones (canon events) - throttled to avoid per-tick queries
    if (this.tickCount - this.lastMilestoneCheckTick >= this.MILESTONE_CHECK_INTERVAL) {
      this.checkTimeMilestones(ctx.world);
      this.lastMilestoneCheckTick = this.tickCount;
    }
  }

  /**
   * Check if current day is a time milestone and record canon event
   */
  private checkTimeMilestones(world: WorldMutator): void {
    const timeEntities = world.query().with(CT.Time).execute();
    if (timeEntities.length === 0) return;

    const timeComp = world.getComponent<TimeComponent>(timeEntities[0]!, CT.Time);
    if (!timeComp) return;

    const currentDay = timeComp.day;

    if (this.canonRecorder.shouldRecordTimeMilestone(currentDay)) {
      this.canonRecorder.recordEvent('time:milestone', world, {
        description: `Day ${currentDay} reached`,
        agentIds: [],
        eventData: {
          day: currentDay,
          tick: world.tick,
          phase: timeComp.phase,
          season: ('season' in timeComp) ? (timeComp as unknown as Record<string, unknown>).season : undefined,
        },
      }).catch((error) => {
        console.error('[MetricsCollection] Failed to record time milestone canon event:', error);
      });
    }
  }

  /**
   * Take a snapshot of current population state
   */
  private takeSnapshot(world: WorldMutator): void {
    // Get all agents
    const agents = world.query().with(CT.Agent).with(CT.Needs).executeEntities();

    for (const agent of agents) {
      const needsComponent = agent.getComponent(CT.Needs);

      if (!needsComponent) {
        continue; // Skip if no needs component
      }

      // Validate structure - cast to unknown first to avoid index signature error
      const needs = needsComponent as unknown as Record<string, unknown>;

      if (typeof needs.hunger !== 'number' ||
          typeof needs.thirst !== 'number' ||
          typeof needs.energy !== 'number' ||
          typeof needs.health !== 'number') {
        throw new Error(
          `Invalid needs component for agent ${agent.id}: ` +
          `Expected numbers for hunger/thirst/energy/health, got ` +
          `${JSON.stringify({
            hunger: typeof needs.hunger,
            thirst: typeof needs.thirst,
            energy: typeof needs.energy,
            health: typeof needs.health
          })}`
        );
      }

      try {
        this.collector.sampleMetrics(
          agent.id,
          {
            hunger: needs.hunger,
            thirst: needs.thirst,
            energy: needs.energy,
            temperature: 20, // TODO: Add temperature component
            health: needs.health,
          },
          Date.now()
        );
      } catch (error) {
        // Agent not in lifecycle yet - this is expected for newly spawned agents
        if (error instanceof Error && !error.message.includes('non-existent agent')) {
          throw error; // Re-throw unexpected errors
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
   * Get the canon event recorder for external access
   */
  getCanonRecorder(): CanonEventRecorder {
    return this.canonRecorder;
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
