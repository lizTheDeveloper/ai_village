import type { SystemId } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { GameEvent } from '../events/GameEvent.js';
import type { Myth, TraitImplication, MythologyComponent } from '../components/MythComponent.js';
import { createMythologyComponent, addMyth, tellMyth } from '../components/MythComponent.js';
import type { SpiritualComponent, Prayer } from '../components/SpiritualComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import type { LLMDecisionQueue } from '../decision/LLMDecisionProcessor.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { THROTTLE } from '../ecs/SystemThrottleConfig.js';

/**
 * Pending myth to be created (before LLM request)
 */
interface PendingMyth {
  deityId: string;
  agentId: string;
  prayerId: string;
  eventType: 'prayer_answered';
  timestamp: number;
}

/**
 * Pending LLM myth generation request (after LLM request sent)
 */
interface PendingLLMMyth {
  deityId: string;
  agentId: string;
  prayer: Prayer;
  personality: PersonalityComponent | undefined;
  timestamp: number;
  llmRequestId: string; // Entity ID used for LLM request tracking
}

/**
 * MythGenerationSystem - Creates stories from divine events
 *
 * Phase 3: Myth Generation
 * - Listens for divine events (answered prayers, miracles, etc.)
 * - Uses LLM to generate unique, contextual narrative myths
 * - Spreads myths to nearby agents
 * - Tracks myth status (oral, recorded, canonical)
 */
export class MythGenerationSystem extends BaseSystem {
  public readonly id: SystemId = 'myth_generation';
  public readonly priority: number = 118; // After prayer answering
  public readonly requiredComponents = [];
  // Only run when deity components exist (O(1) activation check)
  public readonly activationComponents = ['deity'] as const;
  protected readonly throttleInterval = THROTTLE.SLOW; // SLOW - 5 seconds (check for LLM responses)

  private mythIdCounter: number = 0;
  private pendingMyths: PendingMyth[] = [];
  private pendingLLMMyths = new Map<string, PendingLLMMyth>();
  private llmQueue: LLMDecisionQueue;

  constructor(llmQueue: LLMDecisionQueue) {
    super();
    this.llmQueue = llmQueue;
  }

  protected onInitialize(_world: World, _eventBus: EventBus): void {
    // Listen for divine events that create myths
    this.events.on('prayer:answered', (data) => {
      this._onPrayerAnswered(data);
    });

    // Future: Listen for more event types
    // this.events.on('miracle:performed', ...)
    // this.events.on('vision:sent', ...)
  }

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const entities = ctx.activeEntities;
    const currentTick = ctx.tick;
    // Ensure all deities have mythology components
    const deities = entities.filter(e => e.components.has(CT.Deity));

    for (const deity of deities) {
      if (!deity.components.has(CT.Mythology)) {
        (deity as EntityImpl).addComponent(createMythologyComponent());
      }
    }

    // Process pending myths (queue LLM requests)
    for (const pending of this.pendingMyths) {
      this._processPendingMyth(pending, entities, currentTick);
    }

    // Clear processed myths
    this.pendingMyths = [];

    // Process LLM responses (create myths from completed LLM requests)
    this._processLLMResponses(world, entities, currentTick);
  }

  /**
   * Handle prayer:answered event - queue myth creation
   */
  private _onPrayerAnswered(data: { deityId: string; agentId: string; prayerId: string; responseType: string }): void {
    const { deityId, agentId, prayerId } = data;

    // Queue for processing in update()
    this.pendingMyths.push({
      deityId,
      agentId,
      prayerId,
      eventType: 'prayer_answered',
      timestamp: 0, // Will be updated with current tick
    });
  }

  /**
   * Process a pending myth - queue LLM request for myth generation
   */
  private _processPendingMyth(
    pending: PendingMyth,
    entities: ReadonlyArray<Entity>,
    currentTick: number
  ): void {
    // Find the deity
    const deity = entities.find(e => e.id === pending.deityId);
    if (!deity) return;

    // Find the agent who prayed
    const agent = entities.find(e => e.id === pending.agentId);
    if (!agent) return;

    // Get components
    const spiritual = agent.components.get(CT.Spiritual) as SpiritualComponent | undefined;
    const personality = agent.components.get(CT.Personality) as PersonalityComponent | undefined;
    const deityComp = deity.components.get(CT.Deity) as DeityComponent | undefined;

    if (!spiritual || !deityComp) return;

    // Find the prayer in the agent's history
    const prayer = spiritual.prayers.find(p => p.id === pending.prayerId);
    if (!prayer) return;

    // Build LLM prompt for myth generation
    const prompt = this._buildMythGenerationPrompt(deityComp, agent, prayer, personality);

    // Use a unique ID for this LLM request
    const llmRequestId = `myth_${pending.deityId}_${pending.prayerId}`;

    // Queue LLM request
    this.llmQueue.requestDecision(llmRequestId, prompt).catch(err => {
      console.error(`[MythGenerationSystem] Failed to request myth generation:`, err);
    });

    // Track pending LLM request
    this.pendingLLMMyths.set(llmRequestId, {
      deityId: pending.deityId,
      agentId: pending.agentId,
      prayer,
      personality,
      timestamp: currentTick,
      llmRequestId,
    });
  }

  /**
   * Process LLM responses and create myths from completed requests
   */
  private _processLLMResponses(_world: World, entities: ReadonlyArray<Entity>, currentTick: number): void {
    const completedRequests: string[] = [];

    for (const [llmRequestId, pending] of this.pendingLLMMyths.entries()) {
      // Check if LLM response is ready
      const response = this.llmQueue.getDecision(llmRequestId);
      if (!response) continue; // Still waiting

      // Find entities
      const deity = entities.find(e => e.id === pending.deityId);
      const agent = entities.find(e => e.id === pending.agentId);

      if (!deity || !agent) {
        completedRequests.push(llmRequestId);
        continue;
      }

      // Parse the LLM-generated myth story
      const mythStory = this._parseMythStory(response);
      if (!mythStory) {
        console.error('[MythGenerationSystem] Failed to parse myth from LLM response');
        completedRequests.push(llmRequestId);
        continue;
      }

      // Create the myth with LLM-generated content
      const myth = this._createMythFromLLM(
        pending.deityId,
        agent,
        pending.prayer,
        mythStory,
        currentTick
      );

      // Add to deity's mythology component
      const mythology = deity.getComponent<MythologyComponent>(CT.Mythology);
      if (mythology) {
        const updatedMythology = addMyth(mythology, myth);

        // Spread to agent (witness) and nearby agents
        const nearbyAgents = this._findNearbyAgents(agent, entities);
        for (const nearby of nearbyAgents.slice(0, 3)) {
          tellMyth(updatedMythology, myth.id, nearby.id, currentTick);
        }

        // Update the deity's mythology
        (deity as EntityImpl).addComponent(updatedMythology);
      }

      // Also add to deity's myths array (for dashboard view)
      const deityComp = deity.components.get(CT.Deity) as DeityComponent;
      if (deityComp) {
        const simplifiedMyth = {
          id: myth.id,
          title: mythStory.title,
          category: this._categorizeMythContent(mythStory.story),
          content: mythStory.story,
          believerCount: 1, // Start with just the witness
          variants: 1,
          createdAt: myth.creationTime,
        };

        deityComp.myths.push(simplifiedMyth);

        // Keep only last 20 myths
        if (deityComp.myths.length > 20) {
          deityComp.myths.shift();
        }
      }

      completedRequests.push(llmRequestId);
    }

    // Clean up completed requests
    for (const id of completedRequests) {
      this.pendingLLMMyths.delete(id);
    }
  }

  /**
   * Build LLM prompt for myth generation
   */
  private _buildMythGenerationPrompt(
    deityComp: DeityComponent,
    agent: Entity,
    prayer: Prayer,
    personality: PersonalityComponent | undefined
  ): string {
    const deityName = deityComp.identity.primaryName;
    const domain = deityComp.identity.domain || 'the unknown';
    const benevolence = deityComp.identity.perceivedPersonality.benevolence;
    const interventionism = deityComp.identity.perceivedPersonality.interventionism;

    // Get agent identity if available
    const identity = agent.getComponent<IdentityComponent>(CT.Identity);
    const agentName = identity?.name || `Agent ${agent.id.slice(0, 8)}`;

    let prompt = `You are a storyteller in an ancient village, telling a tale about ${deityName}, a deity of ${domain}.\n\n`;

    // Describe the deity's nature
    if (benevolence > 0.6) {
      prompt += `${deityName} is known to be benevolent and caring toward mortals.\n`;
    } else if (benevolence < 0.4) {
      prompt += `${deityName} is stern and demanding, but just.\n`;
    }

    if (interventionism > 0.6) {
      prompt += `${deityName} often intervenes in mortal affairs.\n`;
    } else if (interventionism < 0.4) {
      prompt += `${deityName} is distant and rarely shows direct signs.\n`;
    }

    // Add existing myths for context (if any)
    if (deityComp.myths.length > 0) {
      prompt += `\nOther stories told about ${deityName}:\n`;
      for (const existingMyth of deityComp.myths.slice(-3)) { // Last 3 myths
        prompt += `- "${existingMyth.title}": ${existingMyth.content.slice(0, 100)}...\n`;
      }
    }

    // Describe the prayer event
    prompt += `\nToday's story:\n`;
    prompt += `${agentName} prayed to ${deityName}, saying: "${prayer.content}"\n`;
    prompt += `Their prayer was urgent and heartfelt (urgency: ${prayer.urgency}).\n`;
    prompt += `And ${deityName} answered their prayer.\n\n`;

    // Add personality context for storytelling style
    if (personality) {
      if (personality.openness > 0.7) {
        prompt += `${agentName} tends to be imaginative and sees wonder in everything.\n`;
      }
      if (personality.spirituality && personality.spirituality > 0.7) {
        prompt += `${agentName} is deeply spiritual and sees divine meaning in small signs.\n`;
      }
    }

    prompt += `\nWrite a short myth (2-4 paragraphs) about this prayer being answered.\n`;
    prompt += `The story should:\n`;
    prompt += `- Be told from the perspective of a believer sharing this tale\n`;
    prompt += `- Include some poetic or memorable imagery\n`;
    prompt += `- Reflect the deity's nature and domains\n`;
    prompt += `- Be inspiring and memorable to other believers\n`;
    prompt += `- End with a lesson or takeaway about faith\n\n`;

    prompt += `Format your response as:\n`;
    prompt += `TITLE: [A short, memorable title for this myth]\n`;
    prompt += `STORY:\n[The myth story text]\n`;

    return prompt;
  }

  /**
   * Parse LLM response into myth components
   */
  private _parseMythStory(response: string): { title: string; story: string } | null {
    // Try to parse structured format
    const titleMatch = response.match(/TITLE:\s*(.+?)$/m);
    const storyMatch = response.match(/STORY:\s*\n([\s\S]+)/);

    if (titleMatch?.[1] && storyMatch?.[1]) {
      return {
        title: titleMatch[1].trim(),
        story: storyMatch[1].trim(),
      };
    }

    // Fallback: try to extract title from first line and use rest as story
    const lines = response.trim().split('\n');
    if (lines.length >= 2 && lines[0]) {
      return {
        title: lines[0].replace(/^(Title:|TITLE:)\s*/i, '').trim(),
        story: lines.slice(1).join('\n').trim(),
      };
    }

    // Last resort: use first sentence as title, rest as story
    const sentences = response.split(/[.!?]\s+/);
    if (sentences.length >= 2 && sentences[0]) {
      return {
        title: sentences[0].trim(),
        story: sentences.slice(1).join('. ').trim(),
      };
    }

    return null;
  }

  /**
   * Create a Myth object from LLM-generated content
   */
  private _createMythFromLLM(
    deityId: string,
    agent: Entity,
    prayer: Prayer,
    mythStory: { title: string; story: string },
    currentTick: number
  ): Myth {
    // Use LLM-generated content
    const title = mythStory.title;
    const fullText = mythStory.story;

    // Generate summary from first sentence or first 100 chars
    const firstSentence = fullText.split(/[.!?]\s+/)[0] || fullText;
    const summary = firstSentence.length > 100
      ? firstSentence.slice(0, 97) + '...'
      : firstSentence;

    // Extract trait implications from the story
    const traitImplications: TraitImplication[] = [
      {
        trait: 'benevolence',
        direction: 'positive',
        strength: 0.15,
        extractedFrom: 'The deity answered the prayer.',
      },
      {
        trait: 'interventionism',
        direction: 'positive',
        strength: 0.2,
        extractedFrom: 'The deity took action to help.',
      },
    ];

    // Adjust based on prayer urgency
    if (prayer.urgency === 'desperate') {
      traitImplications.push({
        trait: 'compassion',
        direction: 'positive',
        strength: 0.25,
        extractedFrom: 'The deity answered in their time of desperation.',
      });
    }

    return {
      id: `myth_${this.mythIdCounter++}`,
      title,
      fullText,
      summary,
      originalEvent: `prayer:${prayer.id}`,
      originalWitness: agent.id,
      currentVersion: 1,
      knownBy: [],
      writtenIn: [],
      carvedAt: [],
      traitImplications,
      domainRelevance: new Map(),
      creationTime: currentTick,
      lastToldTime: currentTick,
      tellingCount: 1,
      status: 'oral',
      contestedBy: [],
      deityId,
    };
  }

  /**
   * Categorize myth based on content
   */
  private _categorizeMythContent(content: string): 'origin' | 'miracle' | 'moral' | 'prophecy' | 'parable' {
    // Simple heuristic categorization based on content
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('prayed') && lowerContent.includes('answered')) {
      return 'miracle';
    }
    if (lowerContent.includes('lesson') || lowerContent.includes('taught')) {
      return 'moral';
    }
    if (lowerContent.includes('will come') || lowerContent.includes('prophecy')) {
      return 'prophecy';
    }
    if (lowerContent.includes('once there was') || lowerContent.includes('story of')) {
      return 'parable';
    }

    // Default to miracle for answered prayers
    return 'miracle';
  }

  /**
   * Find agents near the given agent
   */
  private _findNearbyAgents(agent: Entity, entities: ReadonlyArray<Entity>): Entity[] {
    const position = agent.getComponent<PositionComponent>(CT.Position);
    if (!position) return [];

    const nearby: Entity[] = [];
    const SPREAD_RADIUS = 50; // Grid units

    for (const other of entities) {
      if (other.id === agent.id) continue;
      if (!other.components.has(CT.Agent)) continue;

      const otherPos = other.getComponent<PositionComponent>(CT.Position);
      if (!otherPos) continue;

      const dx = otherPos.x - position.x;
      const dy = otherPos.y - position.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= SPREAD_RADIUS * SPREAD_RADIUS) {
        nearby.push(other);
      }
    }

    return nearby;
  }
}
