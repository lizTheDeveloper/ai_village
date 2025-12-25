import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';

interface MemoryTriggerEvent {
  agentId: string;
  emotionalIntensity?: number;
  novelty?: number;
  socialSignificance?: number;
  survivalRelevance?: number;
  goalRelevance?: number;
  [key: string]: any;
}

/**
 * MemoryFormationSystem automatically forms episodic memories based on events
 */
export class MemoryFormationSystem implements System {
  public readonly id: SystemId = 'memory_formation';
  public readonly priority: number = 100;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus: EventBus;
  private pendingMemories: Map<string, any[]> = new Map();
  private requiredAgents: Set<string> = new Set(); // Agents that MUST exist (not from conversation)

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this._setupEventListeners();
  }

  private _setupEventListeners(): void {
    // Listen for memory-triggering events
    const eventTypes = [
      // Harvesting and resource gathering
      'harvest:first',
      'agent:harvested',
      'resource:gathered',
      'resource:depleted',

      // Construction and building
      'construction:failed',
      'construction:gathering_resources',
      // Note: building:complete removed - it's a system event without agentId
      // Buildings complete passively over time, not due to specific agent actions

      // Inventory and storage
      'items:deposited',
      'inventory:full',
      'storage:full',
      'storage:not_found',

      // Social interactions
      'social:conflict',
      'social:interaction',
      'conversation:utterance',
      'conversation:started',
      'information:shared',

      // Needs and survival
      'need:critical',
      'agent:starved',
      'agent:collapsed',
      'survival:close_call',

      // Sleep and rest
      'agent:sleeping',
      'agent:sleep_start',
      'agent:sleep_end',
      'agent:dreamed',

      // Exploration and discovery
      'discovery:location',
      'event:novel',

      // Goals and actions
      'goal:progress',
      'action:walk',
      'agent:emotion_peak',

      // Testing
      'test:event',
    ];

    for (const eventType of eventTypes) {
      this.eventBus.subscribe(eventType, (event) => {
        this._handleMemoryTrigger(eventType, event.data as MemoryTriggerEvent);
      });
    }
  }

  private _handleMemoryTrigger(eventType: string, data: MemoryTriggerEvent): void {
    try {
      // Handle conversation events specially - create memories for both participants
      if (eventType === 'conversation:utterance') {
        const convData = data as any;
        if (!convData.speakerId || !convData.listenerId) {
          console.error(`[MemoryFormation] Invalid conversation:utterance event - missing speakerId or listenerId:`, data);
          return; // Skip invalid event, don't crash
        }

        // Queue for both participants
        // Note: Validation of entity existence happens later in update()
        const participants = [convData.speakerId, convData.listenerId];
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

      // Standard events require agentId
      if (!data.agentId) {
        console.error(`[MemoryFormation] Event ${eventType} missing required agentId. Event data:`, data);
        console.error(`[MemoryFormation] This is a programming error - the system emitting '${eventType}' events must include agentId in the event data.`);
        return; // Skip invalid event, don't crash
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
      // Log unexpected errors but don't crash the game
      console.error(`[MemoryFormation] Unexpected error in event handler for ${eventType}:`, error);
      console.error(`[MemoryFormation] Event data:`, data);
    }
  }

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Flush event bus first to process any queued events (which may add to pendingMemories)
    this.eventBus.flush();

    // Process pending memories
    const agentIds = Array.from(this.pendingMemories.keys());
    for (const agentId of agentIds) {
      const entity = world.getEntity(agentId);
      const isRequired = this.requiredAgents.has(agentId);

      if (!entity) {
        if (isRequired) {
          // Direct event for nonexistent agent - programming error
          this.pendingMemories.clear();
          this.requiredAgents.clear();
          throw new Error(`Agent not found: ${agentId}`);
        }
        // Conversation participant doesn't exist - skip gracefully
        continue;
      }

      const memComp = entity.components.get('episodic_memory') as EpisodicMemoryComponent | undefined;
      if (!memComp) {
        // Entity exists but doesn't track memories - log components and throw error
        const componentTypes = Array.from(entity.components.keys());
        console.error(`[MemoryFormation] Agent ${agentId} missing EpisodicMemoryComponent`);
        console.error(`[MemoryFormation] Agent has components:`, componentTypes);
        console.error(`[MemoryFormation] Event that triggered memory formation:`, this.pendingMemories.get(agentId));
        this.pendingMemories.clear();
        this.requiredAgents.clear();
        throw new Error(`Agent ${agentId} missing EpisodicMemoryComponent. Has: ${componentTypes.join(', ')}`);
      }

      const memories = this.pendingMemories.get(agentId)!;
      for (const { eventType, data } of memories) {
        // Determine if event is significant enough to form memory
        if (this._shouldFormMemory(eventType, data)) {
          this._formMemory(memComp, eventType, data);
        }
      }
    }

    // Clear pending memories and required agents
    this.pendingMemories.clear();
    this.requiredAgents.clear();

    // Flush events emitted during memory formation (memory:formed events)
    this.eventBus.flush();
  }

  private _shouldFormMemory(eventType: string, data: MemoryTriggerEvent): boolean {
    // Conversation memories are ALWAYS formed (per spec)
    if (eventType === 'conversation:utterance') {
      return true;
    }

    // Dreams: remember if they contained significant memories OR randomly for trivial dreams
    if (eventType === 'agent:dreamed') {
      const dreamData = data as any;
      const dream = dreamData.dream;

      if (dream && dream.memoryElements && dream.memoryElements.length > 0) {
        // Check if dream contained significant events (mentioned in memory summaries)
        const significantKeywords = [
          'conflict', 'starv', 'collapsed', 'critical', 'died', 'danger',
          'love', 'hate', 'joy', 'fear', 'anger', 'discovered', 'built',
          'failed', 'succeed'
        ];

        const hasSignificantMemory = dream.memoryElements.some((element: string) =>
          significantKeywords.some(keyword =>
            element.toLowerCase().includes(keyword)
          )
        );

        if (hasSignificantMemory) {
          return true; // Always remember intense dreams
        }
      }

      // 0.1% chance to remember trivial dreams (roughly 1 in 1000, based on real memory rates)
      return Math.random() < 0.001;
    }

    // Always form memories for significant game events
    const alwaysRememberEvents = [
      'need:critical',
      'agent:starved',
      'agent:collapsed',
      'agent:harvested',
      'resource:gathered',
      'building:complete',
      'construction:failed',
      'items:deposited',
      'inventory:full',
      'storage:full',
      'conversation:started',
      'information:shared',
      'agent:sleep_start',
      'test:event',
    ];

    if (alwaysRememberEvents.includes(eventType)) {
      return true;
    }

    // Check if event meets threshold for memory formation
    // For agent:emotion_peak, map 'intensity' to 'emotionalIntensity'
    const emotionalIntensity = data.emotionalIntensity ?? (data as any).intensity ?? 0;
    const novelty = data.novelty ?? 0;
    const socialSignificance = data.socialSignificance ?? 0;
    const survivalRelevance = data.survivalRelevance ?? 0;
    const goalRelevance = data.goalRelevance ?? 0;

    // Trivial events don't form memories
    if (eventType === 'action:walk' && emotionalIntensity < 0.1) {
      return false;
    }

    // Check thresholds
    if (emotionalIntensity > 0.6) return true;
    if (novelty > 0.7) return true;
    if (socialSignificance > 0.5) return true;
    if (survivalRelevance > 0.5) return true;
    if (goalRelevance > 0.7) return true;

    // High importance events
    if ((data as any).importance > 0.5) return true;

    return false;
  }

  private _formMemory(
    memComp: EpisodicMemoryComponent,
    eventType: string,
    data: MemoryTriggerEvent
  ): void {
    // Generate summary from event data
    const summary = this._generateSummary(eventType, data);

    // Log memory formation for debugging
    console.log(`[MemoryFormation] 🧠 Forming memory for agent ${data.agentId}:`, {
      eventType,
      summary: summary.substring(0, 60) + (summary.length > 60 ? '...' : ''),
      emotionalIntensity: data.emotionalIntensity ?? 0,
      novelty: data.novelty ?? 0,
    });

    // Handle conversation memories
    if (eventType === 'conversation:utterance') {
      const convData = data as any;
      memComp.formMemory({
        eventType,
        summary: convData.speakerId === data.agentId
          ? `I said: ${convData.text}`
          : `${convData.speakerId} said: ${convData.text}`,
        timestamp: convData.timestamp ?? Date.now(),
        emotionalIntensity: data.emotionalIntensity ?? 0.3,
        emotionalValence: data.emotionalValence ?? 0,
        surprise: data.surprise ?? 0,
        dialogueText: convData.text,
        conversationId: convData.conversationId,
        participants: [convData.speakerId, convData.listenerId].filter(
          (id) => id !== data.agentId
        ),
      });
    } else {
      // Standard memory
      // For agent:emotion_peak, map 'intensity' to 'emotionalIntensity'
      const emotionalIntensity = data.emotionalIntensity ?? (data as any).intensity ?? 0;
      memComp.formMemory({
        eventType,
        summary,
        timestamp: (data as any).timestamp ?? Date.now(),
        emotionalIntensity,
        emotionalValence: data.emotionalValence ?? 0,
        surprise: data.surprise ?? 0,
        novelty: data.novelty,
        goalRelevance: data.goalRelevance,
        socialSignificance: data.socialSignificance,
        survivalRelevance: data.survivalRelevance,
        participants: (data as any).participants,
        location: (data as any).location,
      });
    }

    // Emit memory:formed event
    this.eventBus.emit({
      type: 'memory:formed',
      source: 'memory_formation',
      data: {
        agentId: data.agentId,
        eventType,
      },
    });
  }

  private _generateSummary(eventType: string, data: MemoryTriggerEvent): string {
    // Generate human-readable summary based on event type
    switch (eventType) {
      // Harvesting
      case 'harvest:first':
        return `Harvested first ${(data as any).cropType || 'crop'}`;
      case 'agent:harvested':
        return `Harvested ${(data as any).quantity || ''} ${(data as any).resourceType || 'resource'}`;
      case 'resource:gathered':
        return `Gathered ${(data as any).amount || ''} ${(data as any).resourceType || 'resource'}`;
      case 'resource:depleted':
        return `Resource depleted: ${(data as any).resourceType || 'resource'}`;

      // Construction
      case 'construction:failed':
        return `Failed to build ${(data as any).buildingType || 'building'}: ${(data as any).reason || 'unknown reason'}`;
      case 'construction:gathering_resources':
        return `Gathering resources to build ${(data as any).buildingType || 'building'}`;
      case 'building:complete':
        return `Completed building ${(data as any).buildingType || 'building'}`;

      // Inventory
      case 'items:deposited':
        return `Deposited items into storage`;
      case 'inventory:full':
        return `My inventory is full`;
      case 'storage:full':
        return `Storage is full, couldn't deposit items`;
      case 'storage:not_found':
        return `Couldn't find any storage`;

      // Social
      case 'social:conflict':
        return `Had a conflict with ${(data as any).otherId || 'someone'}`;
      case 'social:interaction':
        return `Interacted with ${(data as any).otherId || 'someone'}`;
      case 'conversation:started':
        return `Started conversation with ${(data as any).participants?.join(', ') || 'someone'}`;
      case 'information:shared':
        return `Shared information about ${(data as any).topic || 'something'}`;

      // Needs
      case 'need:critical':
        return `My ${(data as any).needType || 'need'} became critically low`;
      case 'agent:starved':
        return `I'm starving and exhausted`;
      case 'agent:collapsed':
        return `I collapsed from exhaustion`;

      // Sleep
      case 'agent:sleeping':
        return `Went to sleep to rest`;
      case 'agent:sleep_start':
        return `Started sleeping`;
      case 'agent:sleep_end':
        return `Woke up from sleep`;
      case 'agent:dreamed': {
        const dreamData = data as any;
        const dream = dreamData.dream;
        if (dream && dream.dreamNarrative) {
          return dream.dreamNarrative;
        }
        return `Had a strange dream`;
      }

      // Discovery
      case 'discovery:location':
        return `Discovered a new location`;
      case 'event:novel':
        return `Experienced something completely new`;

      // Goals
      case 'goal:progress':
        return `Made progress on ${(data as any).goalId || 'goal'}`;
      case 'agent:emotion_peak':
        return `Felt strong ${(data as any).emotion || 'emotion'}`;

      // Survival
      case 'survival:close_call':
        return `Close call with ${(data as any).threat || 'danger'}`;

      // Testing
      case 'test:event':
        return (data as any).summary || 'Test event';

      default:
        return (data as any).summary || `Experienced ${eventType}`;
    }
  }
}
