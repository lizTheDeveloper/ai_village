import { ComponentBase } from '../ecs/Component.js';

export interface EpisodicMemory {
  readonly id: string;
  readonly eventType: string;
  readonly summary: string;
  readonly timestamp: number;
  readonly participants?: string[];
  readonly location?: { x: number; y: number };
  readonly emotionalValence: number; // -1 to 1
  readonly emotionalIntensity: number; // 0 to 1
  readonly surprise: number; // 0 to 1
  readonly importance: number; // 0 to 1
  readonly novelty?: number; // 0 to 1
  readonly goalRelevance?: number; // 0 to 1
  readonly socialSignificance?: number; // 0 to 1
  readonly survivalRelevance?: number; // 0 to 1
  readonly clarity: number; // 0 to 1, degrades over time
  readonly consolidated: boolean;
  readonly markedForConsolidation: boolean;
  readonly timesRecalled: number;
  readonly dialogueText?: string; // For conversation memories
  readonly conversationId?: string;
  readonly secondhand?: boolean; // Heard from someone else
  readonly secondhandSource?: string; // Who told them
}

interface MemoryFormationInput {
  eventType: string;
  summary: string;
  timestamp: number;
  participants?: string[];
  location?: { x: number; y: number };
  emotionalValence?: number;
  emotionalIntensity?: number;
  surprise?: number;
  novelty?: number;
  goalRelevance?: number;
  socialSignificance?: number;
  survivalRelevance?: number;
  importance?: number;
  clarity?: number;
  consolidated?: boolean;
  markedForConsolidation?: boolean;
  dialogueText?: string;
  conversationId?: string;
  timesRecalled?: number;
}

interface RetrievalContext {
  participants?: string[];
  location?: { x: number; y: number };
  limit?: number;
  currentTime?: number;
}

/**
 * EpisodicMemoryComponent stores rich event memories with emotional encoding
 */
export class EpisodicMemoryComponent extends ComponentBase {
  public readonly type = 'episodic_memory';
  private _episodicMemories: EpisodicMemory[] = [];
  private readonly _maxMemories: number = 1000;

  constructor(data?: { maxMemories?: number }) {
    super();
    if (data?.maxMemories !== undefined) {
      this._maxMemories = data.maxMemories;
    }
  }

  /**
   * Get all episodic memories (readonly)
   */
  get episodicMemories(): readonly EpisodicMemory[] {
    // Return a frozen array to prevent modification
    return Object.freeze([...this._episodicMemories]);
  }

  /**
   * Form a new episodic memory automatically (no agent choice)
   */
  formMemory(input: MemoryFormationInput): EpisodicMemory {
    // Validate required fields - per CLAUDE.md, NO fallbacks for critical fields
    if (!input.eventType) {
      throw new Error('EpisodicMemory requires eventType');
    }
    if (!input.summary) {
      throw new Error('EpisodicMemory requires summary');
    }
    if (input.timestamp === undefined) {
      throw new Error('EpisodicMemory requires timestamp');
    }

    // Emotional values default to 0 (neutral/no emotion) - semantically valid per CLAUDE.md
    const emotionalValence = this._clamp(
      input.emotionalValence ?? 0,
      -1,
      1
    );

    // Emotional intensity defaults to 0 (no emotion) - semantically valid
    const emotionalIntensity = this._clamp(
      input.emotionalIntensity ?? 0,
      0,
      1
    );

    // Surprise defaults to 0 (truly optional)
    const surprise = this._clamp(input.surprise ?? 0, 0, 1);

    // Calculate importance from weighted factors
    const importance = input.importance !== undefined
      ? this._clamp(input.importance, 0, 1)
      : this._calculateImportance({
          emotionalIntensity,
          novelty: input.novelty ?? 0,
          goalRelevance: input.goalRelevance ?? 0,
          socialSignificance: input.socialSignificance ?? 0,
          survivalRelevance: input.survivalRelevance ?? 0,
        });

    const memory: EpisodicMemory = Object.freeze({
      id: this._generateId(),
      eventType: input.eventType,
      summary: input.summary,
      timestamp: input.timestamp,
      participants: input.participants ? [...input.participants] : undefined,
      location: input.location ? { ...input.location } : undefined,
      emotionalValence,
      emotionalIntensity,
      surprise,
      importance,
      novelty: input.novelty,
      goalRelevance: input.goalRelevance,
      socialSignificance: input.socialSignificance,
      survivalRelevance: input.survivalRelevance,
      clarity: input.clarity ?? 1.0,
      consolidated: input.consolidated ?? false,
      markedForConsolidation: input.markedForConsolidation ?? false,
      timesRecalled: input.timesRecalled ?? 0,
      dialogueText: input.dialogueText,
      conversationId: input.conversationId,
    });

    // Debug: Log if importance is out of range
    if (importance < 0 || importance > 1) {
      console.error(`[EpisodicMemory] BUG: Memory formed with importance=${importance.toFixed(3)} (should be [0,1])`, {
        eventType: input.eventType,
        summary: input.summary.substring(0, 60),
        input_importance: input.importance,
        calculated_importance: input.importance === undefined,
        factors: {
          emotionalIntensity,
          novelty: input.novelty ?? 0,
          goalRelevance: input.goalRelevance ?? 0,
          socialSignificance: input.socialSignificance ?? 0,
          survivalRelevance: input.survivalRelevance ?? 0,
        }
      });
    }

    this._episodicMemories.push(memory);

    // Enforce memory limit
    if (this._episodicMemories.length > this._maxMemories) {
      // Remove lowest importance, oldest memories
      this._episodicMemories.sort((a, b) => {
        const importanceDiff = a.importance - b.importance;
        if (Math.abs(importanceDiff) > 0.01) {
          return importanceDiff;
        }
        return a.timestamp - b.timestamp;
      });
      this._episodicMemories.shift();
    }

    return memory;
  }

  /**
   * Apply decay to all memories
   */
  applyDecay(daysElapsed: number): void {
    const newMemories: EpisodicMemory[] = [];

    for (const memory of this._episodicMemories) {
      if (memory.clarity === undefined) {
        throw new Error('Memory missing required clarity field');
      }

      // Calculate decay rate
      let decayRate: number;
      if (memory.consolidated) {
        decayRate = 0.995; // Slow decay for consolidated
      } else {
        decayRate = 0.95; // Fast decay for unconsolidated
      }

      // High emotion memories decay slower
      if (memory.emotionalIntensity > 0.6) {
        decayRate = Math.min(1.0, decayRate + 0.002);
      }

      const newClarity = Math.max(0, memory.clarity * Math.pow(decayRate, daysElapsed));

      // Let clarity decay naturally to 0
      // Memories with clarity < 0.1 will be forgotten (removed from active memory)

      // Create updated memory (immutable update)
      const updated = Object.freeze({
        ...memory,
        clarity: newClarity,
      });
      newMemories.push(updated);
    }

    this._episodicMemories = newMemories;
  }

  /**
   * Retrieve relevant memories based on context
   */
  retrieveRelevant(context: RetrievalContext): EpisodicMemory[] {
    const currentTime = context.currentTime ?? Date.now();
    const limit = context.limit ?? 10;

    // Score each memory for relevance
    const scored = this._episodicMemories.map((memory) => {
      let score = 0;

      // Recency (20% weight)
      const ageMs = currentTime - memory.timestamp;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyScore = Math.exp(-ageDays / 30); // Exponential decay
      score += recencyScore * 0.2;

      // Importance (25% weight)
      score += memory.importance * 0.25;

      // Emotional intensity (15% weight)
      score += memory.emotionalIntensity * 0.15;

      // Contextual similarity (30% weight)
      let contextScore = 0;

      // Participant overlap (20% of context weight = 6% total)
      if (context.participants && memory.participants) {
        const overlap = context.participants.filter((p) =>
          memory.participants!.includes(p)
        ).length;
        const maxOverlap = Math.max(
          context.participants.length,
          memory.participants.length
        );
        if (maxOverlap > 0) {
          contextScore += (overlap / maxOverlap) * 0.67; // 20% of 30%
        }
      }

      // Location proximity (10% of context weight = 3% total)
      if (context.location && memory.location) {
        const dx = context.location.x - memory.location.x;
        const dy = context.location.y - memory.location.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const proximityScore = Math.exp(-distance / 10);
        contextScore += proximityScore * 0.33; // 10% of 30%
      }

      score += contextScore * 0.3;

      return { memory, score };
    });

    // Sort by score and take top N
    scored.sort((a, b) => b.score - a.score);
    const relevant = scored.slice(0, limit).map((s) => s.memory);

    // Increment timesRecalled for retrieved memories
    for (const memory of relevant) {
      const index = this._episodicMemories.findIndex((m) => m.id === memory.id);
      if (index >= 0) {
        this._episodicMemories[index] = Object.freeze({
          ...memory,
          timesRecalled: memory.timesRecalled + 1,
        });
      }
    }

    return relevant;
  }

  /**
   * Update a memory (for consolidation, strengthening, etc.)
   */
  updateMemory(
    memoryId: string,
    updates: Partial<
      Pick<
        EpisodicMemory,
        | 'consolidated'
        | 'markedForConsolidation'
        | 'clarity'
        | 'importance'
        | 'timesRecalled'
      >
    >
  ): void {
    const index = this._episodicMemories.findIndex((m) => m.id === memoryId);
    if (index < 0) {
      throw new Error(`Memory not found: ${memoryId}`);
    }

    const memory = this._episodicMemories[index];
    if (!memory) {
      throw new Error(`Memory not found at index: ${index}`);
    }

    // Ensure memory has required id field per CLAUDE.md
    if (!memory.id) {
      throw new Error(`Memory at index ${index} missing required id field`);
    }

    // Ensure id is preserved when updating
    this._episodicMemories[index] = Object.freeze({
      ...memory,
      ...updates,
      id: memory.id, // Always preserve the original id (guaranteed by check above)
    });
  }

  /**
   * Remove forgotten memories (called by consolidation system)
   */
  removeForgotten(): EpisodicMemory[] {
    const forgotten = this._episodicMemories.filter((m) => m.clarity < 0.1);
    this._episodicMemories = this._episodicMemories.filter(
      (m) => m.clarity >= 0.1
    );
    return forgotten;
  }

  /**
   * Calculate importance from weighted factors with boosts
   * Weights normalized to sum to 100%:
   * - Emotional intensity: 30%
   * - Novelty: 30%
   * - Goal relevance: 20%
   * - Social significance: 15%
   * - Survival relevance: 25%
   * TOTAL BASE: 120% (intentionally > 100% before normalization)
   *
   * Normalized to 100%:
   * - Emotional intensity: 30/120 = 25%
   * - Novelty: 30/120 = 25%
   * - Goal relevance: 20/120 = 16.7%
   * - Social significance: 15/120 = 12.5%
   * - Survival relevance: 25/120 = 20.8%
   *
   * Boosts for exceptional events:
   * - First-time events (novelty >=0.9): +0.1
   * - Goal-critical events (goalRelevance >= 0.9): +0.1
   * - Survival-critical events (survivalRelevance >= 0.9): +0.1
   *
   * Maximum possible: 1.0 (base) + 0.3 (boosts) = 1.3 → clamped to 1.0
   * Final value ALWAYS clamped to [0, 1]
   */
  private _calculateImportance(factors: {
    emotionalIntensity: number;
    novelty: number;
    goalRelevance: number;
    socialSignificance: number;
    survivalRelevance: number;
  }): number {
    // Validate inputs are in expected range
    const validated = {
      emotionalIntensity: this._clamp(factors.emotionalIntensity, 0, 1),
      novelty: this._clamp(factors.novelty, 0, 1),
      goalRelevance: this._clamp(factors.goalRelevance, 0, 1),
      socialSignificance: this._clamp(factors.socialSignificance, 0, 1),
      survivalRelevance: this._clamp(factors.survivalRelevance, 0, 1),
    };

    // Normalized weights that sum to 1.0
    let importance =
      validated.emotionalIntensity * 0.25 +
      validated.novelty * 0.25 +
      validated.goalRelevance * 0.167 +
      validated.socialSignificance * 0.125 +
      validated.survivalRelevance * 0.208;

    // Apply SMALL boosts for very significant events (>= 0.9)
    // Boosts reduced to 0.1 each (max +0.3 total) to ensure final value stays reasonable
    if (validated.novelty >= 0.9) {
      importance += 0.1; // First-time event boost
    }
    if (validated.goalRelevance >= 0.9) {
      importance += 0.1; // Goal achievement boost
    }
    if (validated.survivalRelevance >= 0.9) {
      importance += 0.1; // Survival event boost
    }

    // ALWAYS clamp to [0, 1] - this is the final safety net
    return this._clamp(importance, 0, 1);
  }

  private _clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private _generateId(): string {
    return `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
