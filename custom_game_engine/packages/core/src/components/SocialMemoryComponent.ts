import { ComponentBase } from '../ecs/Component.js';

export interface Impression {
  readonly text: string;
  readonly timestamp: number;
}

export interface KnownFact {
  readonly fact: string;
  readonly confidence: number;
  readonly source: string;
}

export interface SocialMemory {
  readonly agentId: string;
  readonly overallSentiment: number; // -1 to 1
  readonly trust: number; // 0 to 1
  readonly impressions: readonly Impression[];
  readonly significantMemories: readonly string[]; // Episodic memory IDs
  readonly relationshipType: string; // friend, rival, stranger, etc
  readonly interactionCount: number;
  readonly lastInteraction: number;
  readonly firstMeeting: number;
  readonly lastEmotionalValence: number; // -1 to 1
  readonly knownFacts: readonly KnownFact[];
}

interface InteractionInput {
  agentId: string;
  interactionType: string;
  sentiment: number; // -1 to 1
  timestamp: number;
  trustDelta?: number;
  impression?: string;
  significantMemories?: string[];
  emotionalValence?: number;
}

interface LearnFactInput {
  agentId: string;
  fact: string;
  confidence: number;
  source: string;
}

/**
 * SocialMemoryComponent tracks relationships and social knowledge
 */
export class SocialMemoryComponent extends ComponentBase {
  public readonly type = 'social_memory';
  private _socialMemories: Map<string, SocialMemory> = new Map();

  /**
   * Get all social memories (readonly)
   * Initializes the map if it's undefined (can happen after deserialization)
   */
  get socialMemories(): ReadonlyMap<string, SocialMemory> {
    // Defensive: ensure map exists (handles deserialization edge cases)
    if (!this._socialMemories) {
      this._socialMemories = new Map();
    }
    return this._socialMemories;
  }

  /**
   * Record an interaction with another agent
   */
  recordInteraction(input: InteractionInput): void {
    // Validate required fields - per CLAUDE.md, NO fallbacks
    if (!input.agentId) {
      throw new Error('Interaction requires agentId');
    }
    if (!input.interactionType) {
      throw new Error('Interaction requires interactionType');
    }
    if (input.sentiment === undefined) {
      throw new Error('Interaction requires sentiment');
    }
    if (input.timestamp === undefined) {
      throw new Error('Interaction requires timestamp');
    }

    // Validate sentiment range
    if (input.sentiment < -1 || input.sentiment > 1) {
      throw new Error('Sentiment must be between -1 and 1');
    }

    const existing = this._socialMemories.get(input.agentId);

    if (!existing) {
      // First meeting
      const newMemory: SocialMemory = Object.freeze({
        agentId: input.agentId,
        overallSentiment: input.sentiment,
        trust: Math.max(0, Math.min(1, 0.5 + (input.trustDelta ?? 0))),
        impressions: input.impression
          ? Object.freeze([
              Object.freeze({ text: input.impression, timestamp: input.timestamp }),
            ])
          : Object.freeze([]),
        significantMemories: input.significantMemories
          ? Object.freeze([...input.significantMemories])
          : Object.freeze([]),
        relationshipType: 'stranger',
        interactionCount: 1,
        lastInteraction: input.timestamp,
        firstMeeting: input.timestamp,
        lastEmotionalValence: input.emotionalValence ?? input.sentiment,
        knownFacts: Object.freeze([]),
      });

      this._socialMemories.set(input.agentId, newMemory);
    } else {
      // Update existing memory
      const newSentiment =
        existing.overallSentiment * 0.8 + input.sentiment * 0.2;
      const newTrust = Math.max(
        0,
        Math.min(1, existing.trust + (input.trustDelta ?? 0))
      );

      const newImpressions = input.impression
        ? [
            ...existing.impressions,
            Object.freeze({ text: input.impression, timestamp: input.timestamp }),
          ]
        : existing.impressions;

      const newSignificantMemories = input.significantMemories
        ? [
            ...existing.significantMemories,
            ...input.significantMemories,
          ]
        : existing.significantMemories;

      const updated: SocialMemory = Object.freeze({
        ...existing,
        overallSentiment: newSentiment,
        trust: newTrust,
        impressions: Object.freeze(newImpressions),
        significantMemories: Object.freeze(newSignificantMemories),
        interactionCount: existing.interactionCount + 1,
        lastInteraction: input.timestamp,
        lastEmotionalValence: input.emotionalValence ?? input.sentiment,
      });

      this._socialMemories.set(input.agentId, updated);
    }
  }

  /**
   * Update relationship type based on interactions
   */
  updateRelationshipType(agentId: string, type: string): void {
    const existing = this._socialMemories.get(agentId);
    if (!existing) {
      throw new Error(`No social memory for agent: ${agentId}`);
    }

    const updated: SocialMemory = Object.freeze({
      ...existing,
      relationshipType: type,
    });

    this._socialMemories.set(agentId, updated);
  }

  /**
   * Learn a fact about another agent
   */
  learnAboutAgent(input: LearnFactInput): void {
    if (!input.agentId) {
      throw new Error('LearnAboutAgent requires agentId');
    }
    if (!input.fact) {
      throw new Error('LearnAboutAgent requires fact');
    }
    if (input.confidence === undefined) {
      throw new Error('LearnAboutAgent requires confidence');
    }
    if (!input.source) {
      throw new Error('LearnAboutAgent requires source');
    }

    const existing = this._socialMemories.get(input.agentId);

    const newFact: KnownFact = Object.freeze({
      fact: input.fact,
      confidence: input.confidence,
      source: input.source,
    });

    if (!existing) {
      // Create new social memory with just this fact
      const newMemory: SocialMemory = Object.freeze({
        agentId: input.agentId,
        overallSentiment: 0,
        trust: 0.5,
        impressions: Object.freeze([]),
        significantMemories: Object.freeze([]),
        relationshipType: 'stranger',
        interactionCount: 0,
        lastInteraction: Date.now(),
        firstMeeting: Date.now(),
        lastEmotionalValence: 0,
        knownFacts: Object.freeze([newFact]),
      });

      this._socialMemories.set(input.agentId, newMemory);
    } else {
      const updated: SocialMemory = Object.freeze({
        ...existing,
        knownFacts: Object.freeze([
          ...existing.knownFacts,
          newFact,
        ]),
      });

      this._socialMemories.set(input.agentId, updated);
    }
  }

  /**
   * Get social memory for a specific agent
   */
  getSocialMemory(agentId: string): SocialMemory | undefined {
    return this._socialMemories.get(agentId);
  }

  /**
   * Update a social memory entry directly (for debugging/admin tools)
   * @param agentId Target agent ID
   * @param updates Partial updates to apply to the social memory
   */
  updateSocialMemory(agentId: string, updates: Partial<SocialMemory>): void {
    const existing = this._socialMemories.get(agentId);
    if (!existing) {
      throw new Error(`No social memory found for agent: ${agentId}`);
    }

    const updated: SocialMemory = Object.freeze({
      ...existing,
      ...updates,
    });

    this._socialMemories.set(agentId, updated);
  }
}

/**
 * Lazy initialization helper: Get or create SocialMemoryComponent on an entity.
 * Creates the component on first social interaction if it doesn't exist.
 *
 * @param entity The entity to check/update
 * @returns The existing or newly created SocialMemoryComponent
 */
export function ensureSocialMemoryComponent(entity: any): SocialMemoryComponent {
  let comp = entity.getComponent<SocialMemoryComponent>('social_memory');
  if (!comp) {
    comp = new SocialMemoryComponent();
    entity.addComponent(comp);
  }
  return comp;
}
