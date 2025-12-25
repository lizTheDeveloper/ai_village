import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import { JournalComponent } from '../components/JournalComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';

/**
 * JournalingSystem handles personality-driven journaling behavior
 */
export class JournalingSystem implements System {
  public readonly id: SystemId = 'journaling';
  public readonly priority: number = 115;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus: EventBus;
  private idleAgents: Set<string> = new Set();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this._setupEventListeners();
  }

  private _setupEventListeners(): void {
    this.eventBus.subscribe('agent:idle', (event) => {
      const data = event.data as any;
      if (data.agentId) {
        this.idleAgents.add(data.agentId as string);
      }
    });

    // 'agent:resting' event removed - not in EventMap
  }

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    // Flush event bus first to process any queued idle/resting events
    this.eventBus.flush();

    // Process idle agents
    for (const agentId of this.idleAgents) {
      const entity = world.getEntity(agentId);
      if (!entity) {
        throw new Error(`Agent ${agentId} not found (idle trigger)`);
      }

      const agentComp = (entity as any).getComponent?.('agent') as AgentComponent | undefined;
      const personality = (entity as any).getComponent?.('personality');
      const episodicMem = (entity as any).getComponent?.('episodic_memory') as EpisodicMemoryComponent | undefined;
      const journalComp = (entity as any).getComponent?.('journal') as JournalComponent | undefined;

      if (!agentComp) {
        throw new Error(`Agent ${agentId} missing AgentComponent`);
      }
      if (!episodicMem) {
        throw new Error(`Agent ${agentId} missing EpisodicMemoryComponent`);
      }
      if (!journalComp) {
        throw new Error(`Agent ${agentId} missing JournalComponent`);
      }

      // Check if agent should journal based on personality
      if (this._shouldJournal(personality)) {
        this._writeJournalEntry(agentId, episodicMem, journalComp);
      }
    }

    this.idleAgents.clear();
    this.eventBus.flush();
  }

  private _shouldJournal(personality: any): boolean {
    // If no personality component, use default probability
    if (!personality) return Math.random() < 0.1;

    // Calculate probability based on personality
    // More likely for: introverted, open, conscientious
    // Personality traits are 0-100, normalize to 0-1
    const extraversion = (personality.extraversion ?? 50) / 100;
    const openness = (personality.openness ?? 50) / 100;
    const conscientiousness = (personality.conscientiousness ?? 50) / 100;

    const introversion = 1 - extraversion;

    // Base probability: 10%
    // Modified by personality: up to +60% for highly introverted/open/conscientious
    const baseProbability = 0.1;
    const personalityModifier =
      introversion * 0.2 + openness * 0.2 + conscientiousness * 0.2;

    const probability = Math.min(0.8, baseProbability + personalityModifier);

    return Math.random() < probability;
  }

  private _writeJournalEntry(
    agentId: string,
    episodicMem: EpisodicMemoryComponent,
    journalComp: JournalComponent
  ): void {
    // Get recent memories to write about
    const recentMemories = episodicMem.episodicMemories
      .slice(-5)
      .filter((m) => m.importance > 0.1);

    if (recentMemories.length === 0) {
      return;
    }

    // Generate journal entry text
    const text = this._generateJournalText(recentMemories);

    // Extract topics
    const topics = this._extractTopics(recentMemories);

    // Add journal entry
    journalComp.addEntry({
      text,
      timestamp: Date.now(),
      memoryIds: recentMemories.map((m) => m.id),
      topics,
      discoverable: true,
      privacy: 'private',
    });

    // Emit event
    this.eventBus.emit({
      type: 'journal:written',
      source: this.id,
      data: {
        agentId,
        entryCount: journalComp.entries.length,
        timestamp: Date.now(),
      },
    });
  }

  private _generateJournalText(memories: any[]): string {
    const entries: string[] = [];

    for (const memory of memories) {
      // Simple journal entry format
      if (memory.emotionalValence > 0.5) {
        entries.push(`${memory.summary}. It felt good.`);
      } else if (memory.emotionalValence < -0.5) {
        entries.push(`${memory.summary}. It was difficult.`);
      } else {
        entries.push(`${memory.summary}.`);
      }
    }

    return entries.join(' ');
  }

  private _extractTopics(memories: any[]): string[] {
    const topics = new Set<string>();

    for (const memory of memories) {
      // Extract from event type
      const eventType = memory.eventType.split(':')[0];
      topics.add(eventType);

      // Extract from tags if present
      if (memory.tags) {
        for (const tag of memory.tags) {
          topics.add(tag);
        }
      }
    }

    return Array.from(topics);
  }
}
