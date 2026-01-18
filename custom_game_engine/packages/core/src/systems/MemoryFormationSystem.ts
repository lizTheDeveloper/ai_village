import type { SystemId, ComponentType, EntityId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { GameEventMap, EventType } from '../events/EventMap.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

/**
 * Base interface for memory trigger events - fields common to all events.
 * These are metadata fields that can be attached to any event for memory formation.
 */
interface MemoryTriggerEventBase {
  agentId: string;
  emotionalIntensity?: number;
  emotionalValence?: number;
  surprise?: number;
  novelty?: number;
  socialSignificance?: number;
  survivalRelevance?: number;
  goalRelevance?: number;
  timestamp?: number;
}

/**
 * Union type of all memory-triggering event data types.
 * Uses actual types from GameEventMap where available.
 */
type MemoryTriggerEvent =
  | (GameEventMap['agent:idle'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['agent:ate'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['conversation:started'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['conversation:ended'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['conversation:utterance'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['agent:harvested'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['resource:gathered'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['resource:depleted'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['construction:failed'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['construction:gathering_resources'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['agent:starved'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['agent:collapsed'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['agent:sleeping'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['agent:sleep_start'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['agent:woke'] & Partial<MemoryTriggerEventBase>)
  | (GameEventMap['agent:dreamed'] & Partial<MemoryTriggerEventBase> & { dream?: { dreamNarrative?: string; memoryElements?: string[] } })
  | (GameEventMap['information:shared'] & Partial<MemoryTriggerEventBase>)
  // Custom events not yet in GameEventMap
  | (MemoryTriggerEventBase & { eventType?: 'harvest:first'; cropType?: string })
  | (MemoryTriggerEventBase & { eventType?: 'need:critical'; needType?: string })
  | (MemoryTriggerEventBase & { eventType?: 'social:conflict'; otherId?: string })
  | (MemoryTriggerEventBase & { eventType?: 'social:interaction'; otherId?: string })
  | (MemoryTriggerEventBase & { eventType?: 'discovery:location' })
  | (MemoryTriggerEventBase & { eventType?: 'event:novel' })
  | (MemoryTriggerEventBase & { eventType?: 'goal:progress'; goalId?: string })
  | (MemoryTriggerEventBase & { eventType?: 'action:walk' })
  | (MemoryTriggerEventBase & { eventType?: 'agent:emotion_peak'; emotion?: string; intensity?: number })
  | (MemoryTriggerEventBase & { eventType?: 'survival:close_call'; threat?: string })
  | (MemoryTriggerEventBase & { eventType?: 'items:deposited' })
  | (MemoryTriggerEventBase & { eventType?: 'inventory:full' })
  | (MemoryTriggerEventBase & { eventType?: 'storage:full' })
  | (MemoryTriggerEventBase & { eventType?: 'storage:not_found' })
  | (MemoryTriggerEventBase & { eventType?: 'agent:sleep_end' })
  | (MemoryTriggerEventBase & { eventType?: 'test:event'; summary?: string; importance?: number; timestamp?: number; participants?: EntityId[]; location?: { x: number; y: number } });

interface PendingMemory {
  eventType: string;
  data: MemoryTriggerEvent;
}

interface PendingBroadcast {
  eventType: string;
  data: GameEventMap['construction:started'];
}

/**
 * MemoryFormationSystem automatically forms episodic memories based on events
 */
export class MemoryFormationSystem extends BaseSystem {
  public readonly id: SystemId = 'memory_formation';
  public readonly priority: number = 100;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  protected readonly throttleInterval = 20; // NORMAL - 1 second

  // Performance optimization: rate limit memory formation
  private static readonly MAX_MEMORIES_PER_AGENT_PER_GAME_HOUR = 20;
  private static readonly TICKS_PER_GAME_HOUR = 600; // 10 ticks/min * 60 min

  private eventBus!: EventBus;
  private pendingMemories: Map<string, PendingMemory[]> = new Map();
  private requiredAgents: Set<string> = new Set(); // Agents that MUST exist (not from conversation)
  private pendingBroadcasts: PendingBroadcast[] = [];
  private pendingError: Error | null = null; // Store errors from event handlers to re-throw in update()

  // Track memory formation rate per agent
  private memoryFormationTimes: Map<string, number[]> = new Map();

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
    this._setupEventListeners();
  }

  private _setupEventListeners(): void {
    // Subscribe to all events that can trigger memory formation
    // Events from GameEventMap
    const gameEventTypes = [
      'agent:idle',
      'agent:ate',
      'conversation:started',
      'conversation:ended',
      'conversation:utterance',
      'agent:harvested',
      'resource:depleted',
      'resource:gathered',
      'information:shared',
      'agent:starved',
      'agent:collapsed',
      'agent:sleeping',
      'agent:sleep_start',
      'agent:woke',
      'agent:dreamed',
    ] as const;

    for (const eventType of gameEventTypes) {
      this.eventBus.subscribe(eventType, (event) => {
        this._handleMemoryTrigger(eventType, event.data as MemoryTriggerEvent);
      });
    }

    // Custom events not yet in GameEventMap
    // Using type assertion because these are runtime event types not in the compile-time GameEventMap
    const customEventTypes = [
      'harvest:first',
      'items:deposited',
      'storage:full',
      'storage:not_found',
      'social:conflict',
      'social:interaction',
      'need:critical',
      'need:starvation_day',
      'survival:close_call',
      'agent:sleep_end',
      'discovery:location',
      'event:novel',
      'goal:progress',
      'action:walk',
      'agent:emotion_peak',
      'test:event',
      // Divine power events
      'divine_power:whisper',
      'divine_power:subtle_sign',
      'divine_power:dream_hint',
      'divine_power:clear_vision',
    ];

    for (const eventType of customEventTypes) {
      this.eventBus.subscribe(eventType as EventType, (event) => {
        this._handleMemoryTrigger(eventType, event.data as MemoryTriggerEvent);
      });
    }

    // Subscribe to broadcast events
    this.eventBus.subscribe('construction:started', (event) => {
      this.pendingBroadcasts.push({
        eventType: 'construction:started',
        data: event.data,
      });
    });
  }

  private _handleMemoryTrigger(eventType: string, data: MemoryTriggerEvent): void {
    try {
      // Handle conversation:utterance - create memories for both participants
      if (eventType === 'conversation:utterance' && 'speaker' in data) {
        const speakerId = data.speakerId ?? data.speaker;
        const listenerId = data.listenerId;

        if (!speakerId || !listenerId) {
          throw new Error(
            `Invalid conversation:utterance event - missing ${!speakerId ? 'speakerId' : 'listenerId'}. ` +
            `Event: conversationId=${'conversationId' in data ? data.conversationId : 'unknown'}, ` +
            `data=${JSON.stringify(data)}`
          );
        }

        const participants = [speakerId, listenerId];
        for (const agentId of participants) {
          if (!this.pendingMemories.has(agentId)) {
            this.pendingMemories.set(agentId, []);
          }
          this.pendingMemories.get(agentId)!.push({
            eventType,
            data: { ...data, agentId },
          });
        }
        return;
      }

      // Handle conversation:started - requires participants array
      if (eventType === 'conversation:started') {
        if (!('participants' in data)) {
          throw new Error(
            `Invalid conversation:started event - missing participants array. ` +
            `data=${JSON.stringify(data)}`
          );
        }
        const participants = data.participants;
        if (!Array.isArray(participants) || participants.length < 2) {
          throw new Error(
            `Invalid conversation:started event - ${!Array.isArray(participants) ? 'participants is not an array' : `only ${participants.length} participant(s), need at least 2`}. ` +
            `data=${JSON.stringify(data)}`
          );
        }

        for (const agentId of participants) {
          if (!this.pendingMemories.has(agentId)) {
            this.pendingMemories.set(agentId, []);
          }
          this.pendingMemories.get(agentId)!.push({
            eventType,
            data: { ...data, agentId },
          });
        }
        return;
      }

      // Handle conversation:ended - requires participants array
      if (eventType === 'conversation:ended') {
        if (!('participants' in data)) {
          throw new Error(
            `Invalid conversation:ended event - missing participants array. ` +
            `data=${JSON.stringify(data)}`
          );
        }
        const participants = data.participants;
        if (!Array.isArray(participants) || participants.length < 2) {
          throw new Error(
            `Invalid conversation:ended event - ${!Array.isArray(participants) ? 'participants is not an array' : `only ${participants.length} participant(s), need at least 2`}. ` +
            `data=${JSON.stringify(data)}`
          );
        }

        for (const agentId of participants) {
          if (!this.pendingMemories.has(agentId)) {
            this.pendingMemories.set(agentId, []);
          }
          this.pendingMemories.get(agentId)!.push({
            eventType,
            data: { ...data, agentId },
          });
        }
        return;
      }

      // Handle conversation:utterance - requires both speakerId and listenerId
      if (eventType === 'conversation:utterance') {
        // Per CLAUDE.md: validate both are present, throw if not
        if (!('speakerId' in data) || !data.speakerId) {
          throw new Error(
            `conversation:utterance event missing required speakerId. ` +
            `Event data: ${JSON.stringify(data)}`
          );
        }
        if (!('listenerId' in data) || !data.listenerId) {
          throw new Error(
            `conversation:utterance event missing required listenerId. ` +
            `Event data: ${JSON.stringify(data)}`
          );
        }

        const speakerId = data.speakerId;
        const listenerId = data.listenerId;

        // Create memory for speaker
        if (!this.pendingMemories.has(speakerId)) {
          this.pendingMemories.set(speakerId, []);
        }
        this.pendingMemories.get(speakerId)!.push({
          eventType,
          data: { ...data, agentId: speakerId },
        });

        // Create memory for listener
        if (!this.pendingMemories.has(listenerId)) {
          this.pendingMemories.set(listenerId, []);
        }
        this.pendingMemories.get(listenerId)!.push({
          eventType,
          data: { ...data, agentId: listenerId },
        });
        return;
      }

      // Handle information:shared - has 'from' and 'to' instead of agentId
      if (eventType === 'information:shared') {
        if (!('from' in data) || !data.from) {
          throw new Error(
            `Invalid information:shared event - missing 'from' field. ` +
            `Event data: ${JSON.stringify(data)}`
          );
        }
        if (!('to' in data) || !data.to) {
          throw new Error(
            `Invalid information:shared event - missing 'to' field. ` +
            `Event data: ${JSON.stringify(data)}`
          );
        }

        const fromId = data.from;
        const toId = data.to;

        // Create memory for the receiver (the one who learned new information)
        if (!this.pendingMemories.has(toId)) {
          this.pendingMemories.set(toId, []);
        }
        this.pendingMemories.get(toId)!.push({
          eventType,
          data: { ...data, agentId: toId },
        });
        return;
      }

      // Handle divine power events - has 'targetId' instead of agentId
      if (eventType.startsWith('divine_power:')) {
        if (!('targetId' in data) || !data.targetId || typeof data.targetId !== 'string') {
          throw new Error(
            `Invalid ${eventType} event - missing or invalid targetId field. ` +
            `Event data: ${JSON.stringify(data)}`
          );
        }

        const targetId: string = data.targetId;

        // Create memory for the target (the one who received the divine power)
        if (!this.pendingMemories.has(targetId)) {
          this.pendingMemories.set(targetId, []);
        }
        this.pendingMemories.get(targetId)!.push({
          eventType,
          data: { ...data, agentId: targetId },
        });
        return;
      }

      // Standard events require agentId
      if (!('agentId' in data) || !data.agentId) {
        throw new Error(
          `Event ${eventType} missing required agentId. ` +
          `This is a programming error - the system emitting '${eventType}' events must include agentId in the event data. ` +
          `Event data: ${JSON.stringify(data)}`
        );
      }

      // Queue memory for formation during update
      if (!this.pendingMemories.has(data.agentId)) {
        this.pendingMemories.set(data.agentId, []);
      }

      this.pendingMemories.get(data.agentId)!.push({
        eventType,
        data,
      });

      // Mark this agent as required (direct event, not from conversation)
      this.requiredAgents.add(data.agentId);
    } catch (error) {
      // Store error to re-throw in update() (EventBus catches errors in handlers)
      this.pendingError = error as Error;
    }
  }

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;

    // Flush event bus first to process any queued events
    this.eventBus.flush();

    // Re-throw any errors that occurred in event handlers
    if (this.pendingError) {
      const error = this.pendingError;
      this.pendingError = null;
      throw error;
    }

    // Process pending memories
    const agentIds = Array.from(this.pendingMemories.keys());
    for (const agentId of agentIds) {
      const entity = world.getEntity(agentId);
      const isRequired = this.requiredAgents.has(agentId);

      if (!entity) {
        if (isRequired) {
          this.pendingMemories.clear();
          this.requiredAgents.clear();
          throw new Error(`Agent not found: ${agentId}`);
        }
        continue;
      }

      const memComp = entity.components.get(CT.EpisodicMemory) as EpisodicMemoryComponent | undefined;
      if (!memComp) {
        const componentTypes = Array.from(entity.components.keys());
        this.pendingMemories.clear();
        this.requiredAgents.clear();
        throw new Error(`Agent ${agentId} missing EpisodicMemoryComponent. Has: ${componentTypes.join(', ')}`);
      }

      const memories = this.pendingMemories.get(agentId)!;
      const currentTick = world.tick;

      for (const { eventType, data } of memories) {
        // PERFORMANCE FIX: Check rate limiting before forming memory
        if (this._isMemoryRateLimited(agentId, currentTick)) {
          // Skip this memory due to rate limiting
          continue;
        }

        if (this._shouldFormMemory(eventType, data)) {
          this._formMemory(memComp, eventType, data, world);
          // Record memory formation for rate limiting
          this._recordMemoryFormation(agentId, currentTick);
        }
      }
    }

    this.pendingMemories.clear();
    this.requiredAgents.clear();

    this._processBroadcasts(world);
    this.eventBus.flush();
  }

  private _processBroadcasts(world: World): void {
    if (this.pendingBroadcasts.length === 0) {
      return;
    }

    const agents = world.query().with(CT.Agent).with(CT.EpisodicMemory).executeEntities();

    for (const broadcast of this.pendingBroadcasts) {
      const { eventType, data } = broadcast;
      const summary = this._generateBroadcastSummary(eventType, data, world);

      for (const agent of agents) {
        const memComp = agent.components.get(CT.EpisodicMemory) as EpisodicMemoryComponent | undefined;
        if (!memComp) continue;

        memComp.formMemory({
          eventType,
          summary,
          timestamp: Date.now(),
          location: data.position,
          emotionalIntensity: 0.3,
          emotionalValence: 0.2,
          surprise: 0.4,
          novelty: 0.5,
          socialSignificance: 0.6,
          participants: data.builderId ? [data.builderId] : undefined,
        });
      }
    }

    this.pendingBroadcasts = [];
  }

  private _generateBroadcastSummary(eventType: string, data: GameEventMap['construction:started'], world?: World): string {
    if (eventType === 'construction:started') {
      const buildingType = data.buildingType || CT.Building;
      const builderId = data.builderId;

      if (builderId && world) {
        const builderEntity = world.getEntity(builderId);
        if (builderEntity) {
          const identity = builderEntity.getComponent<IdentityComponent>(CT.Identity);
          const builderName = identity?.name || builderId;
          return `${builderName} started building a ${buildingType}`;
        }
      }

      if (builderId) {
        return `${builderId} started building a ${buildingType}`;
      }
      return `Construction started on a ${buildingType}`;
    }

    return `World event: ${eventType}`;
  }

  /**
   * Check if memory formation should be throttled for this agent
   * Performance optimization: prevents memory bloat from excessive event formation
   */
  private _isMemoryRateLimited(agentId: string, currentTick: number): boolean {
    if (!this.memoryFormationTimes.has(agentId)) {
      this.memoryFormationTimes.set(agentId, []);
    }

    const times = this.memoryFormationTimes.get(agentId)!;

    // Remove entries older than 1 game hour
    const cutoffTick = currentTick - MemoryFormationSystem.TICKS_PER_GAME_HOUR;
    const recentTimes = times.filter(t => t > cutoffTick);
    this.memoryFormationTimes.set(agentId, recentTimes);

    // Check if rate limit exceeded
    return recentTimes.length >= MemoryFormationSystem.MAX_MEMORIES_PER_AGENT_PER_GAME_HOUR;
  }

  /**
   * Record that a memory was formed for rate limiting
   */
  private _recordMemoryFormation(agentId: string, currentTick: number): void {
    if (!this.memoryFormationTimes.has(agentId)) {
      this.memoryFormationTimes.set(agentId, []);
    }
    this.memoryFormationTimes.get(agentId)!.push(currentTick);
  }

  private _shouldFormMemory(eventType: string, data: MemoryTriggerEvent): boolean {
    // Conversations always remembered (social interactions are important)
    if (eventType === 'conversation:utterance') {
      return true;
    }

    // Dreams: remember if significant or with small random chance
    if (eventType === 'agent:dreamed' && 'dream' in data && data.dream) {
      const dream = data.dream;

      if (dream.memoryElements && dream.memoryElements.length > 0) {
        const significantKeywords = [
          'conflict', 'starv', 'collapsed', 'critical', 'died', 'danger',
          'love', 'hate', 'joy', 'fear', 'anger', 'discovered', 'built',
          'failed', 'succeed'
        ];

        const hasSignificantMemory = dream.memoryElements.some((element) =>
          significantKeywords.some((keyword) =>
            element.toLowerCase().includes(keyword)
          )
        );

        if (hasSignificantMemory) {
          return true;
        }
      }

      return Math.random() < 0.001;
    }

    // PERFORMANCE FIX: Reduced "alwaysRememberEvents" to only truly critical events
    // NOTE: need:critical removed - caused spam of identical "hunger low" entries
    // Starvation day events go through importance filtering to avoid spam
    const alwaysRememberEvents = [
      'agent:starved',
      'agent:collapsed',
      'storage:full',
      'conversation:started',
      'information:shared',
      'agent:sleep_start',
      'agent:ate',  // Basic survival action - memorable
      'test:event',
      // Divine power events - always memorable
      'divine_power:whisper',
      'divine_power:subtle_sign',
      'divine_power:dream_hint',
      'divine_power:clear_vision',
    ];

    // Give gathering/harvesting events a 10% chance to be remembered (prevents total memory blackout)
    const sometimesRememberEvents = ['resource:gathered', 'agent:harvested', 'items:deposited'];
    if (sometimesRememberEvents.includes(eventType) && Math.random() < 0.1) {
      return true;
    }

    if (alwaysRememberEvents.includes(eventType)) {
      return true;
    }

    // Check significance thresholds
    const emotionalIntensity =
      data.emotionalIntensity ??
      ('intensity' in data ? data.intensity : 0) ?? 0;
    const novelty = data.novelty ?? 0;
    const socialSignificance = data.socialSignificance ?? 0;
    const survivalRelevance = data.survivalRelevance ?? 0;
    const goalRelevance = data.goalRelevance ?? 0;

    // Skip trivial walk events
    if (eventType === 'action:walk' && emotionalIntensity < 0.1) {
      return false;
    }

    if (emotionalIntensity > 0.6) return true;
    if (novelty > 0.7) return true;
    if (socialSignificance > 0.5) return true;
    if (survivalRelevance > 0.5) return true;
    if (goalRelevance > 0.7) return true;

    // Check importance field (test events)
    if ('importance' in data && data.importance && data.importance > 0.5) {
      return true;
    }

    return false;
  }

  private _formMemory(
    memComp: EpisodicMemoryComponent,
    eventType: string,
    data: MemoryTriggerEvent,
    world: World
  ): void {
    const summary = this._generateSummary(eventType, data);

    // Handle conversation memories
    if (eventType === 'conversation:utterance' && 'message' in data && 'agentId' in data) {
      const speakerId = 'speakerId' in data ? data.speakerId : ('speaker' in data ? data.speaker : undefined);
      const listenerId = 'listenerId' in data ? data.listenerId : undefined;

      // Resolve speaker name
      let speakerName = speakerId || 'unknown';
      if (speakerId && speakerId !== data.agentId) {
        const speakerEntity = world.getEntity(speakerId);
        if (speakerEntity) {
          const identity = speakerEntity.getComponent<IdentityComponent>(CT.Identity);
          speakerName = identity?.name || speakerId;
        }
      }

      const conversationId = 'conversationId' in data ? data.conversationId : undefined;

      memComp.formMemory({
        eventType,
        summary: speakerId === data.agentId
          ? `I said: ${data.message}`
          : `${speakerName} said: ${data.message}`,
        timestamp: Date.now(),
        emotionalIntensity: data.emotionalIntensity ?? 0.5,
        emotionalValence: data.emotionalValence ?? 0.1,
        surprise: data.surprise ?? 0,
        socialSignificance: data.socialSignificance ?? 0.6,
        dialogueText: data.message,
        conversationId,
        participants: [speakerId, listenerId].filter((id): id is string =>
          id !== undefined && id !== data.agentId
        ),
      });
    } else {
      // Standard memory
      const emotionalIntensity =
        data.emotionalIntensity ??
        ('intensity' in data ? data.intensity : undefined) ?? 0;

      const timestamp = 'timestamp' in data && data.timestamp ? data.timestamp : Date.now();
      const participants = 'participants' in data ? data.participants : undefined;
      const location = 'location' in data ? data.location : undefined;

      memComp.formMemory({
        eventType,
        summary,
        timestamp,
        emotionalIntensity,
        emotionalValence: data.emotionalValence ?? 0,
        surprise: data.surprise ?? 0,
        novelty: data.novelty,
        goalRelevance: data.goalRelevance,
        socialSignificance: data.socialSignificance,
        survivalRelevance: data.survivalRelevance,
        participants,
        location,
      });
    }

    // Calculate and emit memory:formed event
    const importance = Math.max(
      data.emotionalIntensity ?? 0,
      data.novelty ?? 0,
      data.socialSignificance ?? 0,
      data.survivalRelevance ?? 0,
      data.goalRelevance ?? 0,
      ('importance' in data && data.importance) ? data.importance : 0
    );

    const agentId = 'agentId' in data && typeof data.agentId === 'string' ? data.agentId : '';

    this.eventBus.emit({
      type: 'memory:formed',
      source: 'memory_formation',
      data: {
        agentId,
        memoryType: 'episodic',
        content: summary,
        importance,
        eventType,
      },
    });
  }

  private _generateSummary(eventType: string, data: MemoryTriggerEvent): string {
    switch (eventType) {
      case 'harvest:first':
        return `Harvested first ${'cropType' in data && data.cropType ? data.cropType : 'crop'}`;

      case 'agent:harvested':
        if ('harvested' in data && data.harvested) {
          const items = data.harvested.map(h => `${h.amount} ${h.itemId}`).join(', ');
          return `Harvested ${items}`;
        }
        if ('resourceType' in data && 'amount' in data) {
          return `Harvested ${data.amount} ${data.resourceType}`;
        }
        if ('resourceType' in data) {
          return `Harvested ${data.resourceType}`;
        }
        return 'Harvested crops';

      case 'resource:gathered':
        if ('resourceType' in data && 'amount' in data) {
          return `Gathered ${data.amount} ${data.resourceType}`;
        }
        if ('resourceType' in data) {
          return `Gathered ${data.resourceType}`;
        }
        return 'Gathered resources';

      case 'resource:depleted':
        return `Resource depleted: ${'resourceType' in data && data.resourceType ? data.resourceType : CT.Resource}`;

      case 'construction:failed':
        if ('buildingId' in data) {
          const reason = 'reason' in data ? data.reason : 'unknown reason';
          return `Failed to build: ${reason}`;
        }
        return 'Construction failed';

      case 'construction:gathering_resources':
        return 'Gathering resources for construction';

      case 'items:deposited':
        return 'Deposited items into storage';
      case 'inventory:full':
        return 'My inventory is full';
      case 'storage:full':
        return 'Storage is full, couldn\'t deposit items';
      case 'storage:not_found':
        return 'Couldn\'t find any storage';

      case 'social:conflict':
        return `Had a conflict with ${'otherId' in data && data.otherId ? data.otherId : 'someone'}`;
      case 'social:interaction':
        return `Interacted with ${'otherId' in data && data.otherId ? data.otherId : 'someone'}`;

      case 'conversation:started':
        if ('participants' in data && data.participants) {
          return `Started conversation with ${data.participants.join(', ')}`;
        }
        return 'Started a conversation';

      case 'information:shared':
        return `Shared information about ${'informationType' in data ? data.informationType : 'something'}`;

      case 'need:critical':
        return `My ${'needType' in data && data.needType ? data.needType : 'need'} became critically low`;
      case 'need:starvation_day': {
        const dayNumber = 'dayNumber' in data ? data.dayNumber : 1;
        switch (dayNumber) {
          case 1:
            return 'I haven\'t eaten in a day';
          case 2:
            return 'I haven\'t eaten in two days';
          case 3:
            return 'I haven\'t eaten in three days';
          case 4:
            return 'It\'s been four days since I\'ve eaten. I can\'t take another day of this';
          default:
            return `I haven't eaten in ${dayNumber} days`;
        }
      }
      case 'agent:starved':
        return 'I\'m starving and exhausted';
      case 'agent:collapsed':
        return 'I collapsed from exhaustion';

      case 'agent:sleeping':
        return 'Went to sleep to rest';
      case 'agent:sleep_start':
        return 'Started sleeping';
      case 'agent:sleep_end':
        return 'Woke up from sleep';

      case 'agent:dreamed':
        if ('dream' in data && data.dream?.dreamNarrative) {
          return data.dream.dreamNarrative;
        }
        return 'Had a strange dream';

      case 'discovery:location':
        return 'Discovered a new location';
      case 'event:novel':
        return 'Experienced something completely new';

      case 'goal:progress':
        return `Made progress on ${'goalId' in data && data.goalId ? data.goalId : 'goal'}`;
      case 'agent:emotion_peak':
        return `Felt strong ${'emotion' in data && data.emotion ? data.emotion : 'emotion'}`;

      case 'survival:close_call':
        return `Close call with ${'threat' in data && data.threat ? data.threat : 'danger'}`;

      case 'test:event':
        return ('summary' in data && data.summary) ? data.summary : 'Test event';

      // Divine power events
      case 'divine_power:whisper':
        return `I felt a divine whisper: "${'message' in data && data.message ? data.message : 'You feel a presence watching over you.'}"`;

      case 'divine_power:subtle_sign':
        if ('signName' in data && 'signDescription' in data) {
          return `I witnessed a divine sign: ${data.signName} - ${data.signDescription}`;
        }
        return 'I witnessed a subtle divine sign';

      case 'divine_power:dream_hint':
        return `I dreamed of divine imagery: "${'content' in data && data.content ? data.content : 'strange symbols and vague shapes'}"`;

      case 'divine_power:clear_vision':
        return `I received a clear vision from the divine: "${'visionContent' in data && data.visionContent ? data.visionContent : 'a vivid vision'}"`;

      default:
        return ('summary' in data && data.summary) ? data.summary : `Experienced ${eventType}`;
    }
  }
}
