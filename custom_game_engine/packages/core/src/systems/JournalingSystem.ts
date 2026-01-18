import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { EpisodicMemory, EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import type { JournalComponent } from '../components/JournalComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';

/**
 * JournalingSystem handles personality-driven journaling behavior
 */
export class JournalingSystem extends BaseSystem {
  readonly id: SystemId = 'journaling';
  readonly priority: number = 115;
  readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  // Only run when journal components exist (O(1) activation check)
  readonly activationComponents = ['journal'] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private idleAgents: Set<string> = new Set();

  protected onInitialize(_world: World): void {
    this.events.on('agent:idle', (data) => {
      if (data.agentId) {
        this.idleAgents.add(data.agentId);
      }
    });

    // 'agent:resting' event removed - not in EventMap
  }

  protected onUpdate(ctx: SystemContext): void {
    // Process idle agents
    for (const agentId of this.idleAgents) {
      const entity = ctx.world.getEntity(agentId);
      if (!entity) {
        throw new Error(`Agent ${agentId} not found (idle trigger)`);
      }

      const entityImpl = entity as EntityImpl;
      const agentComp = entityImpl.getComponent<AgentComponent>(CT.Agent);
      const personality = entityImpl.getComponent<PersonalityComponent>(CT.Personality);
      const episodicMem = entityImpl.getComponent<EpisodicMemoryComponent>(CT.EpisodicMemory);
      const journalComp = entityImpl.getComponent<JournalComponent>(CT.Journal);

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
  }

  private _shouldJournal(personality: PersonalityComponent | undefined): boolean {
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
    this.events.emit('journal:written', {
      agentId,
      entryCount: journalComp.entries.length,
      timestamp: Date.now(),
    });
  }

  private _generateJournalText(memories: EpisodicMemory[]): string {
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

  private _extractTopics(memories: EpisodicMemory[]): string[] {
    const topics = new Set<string>();

    for (const memory of memories) {
      // Extract from event type
      const eventTypeParts = memory.eventType.split(':');
      const mainTopic = eventTypeParts[0];
      if (mainTopic) {
        topics.add(mainTopic);
      }
    }

    return Array.from(topics);
  }
}
