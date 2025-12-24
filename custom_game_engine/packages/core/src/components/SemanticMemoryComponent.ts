import { ComponentBase } from '../ecs/Component.js';

export interface SemanticBelief {
  readonly id: string;
  readonly category: string;
  readonly content: string;
  readonly confidence: number; // 0 to 1
  readonly sourceMemories: readonly string[]; // Episodic memory IDs
  readonly sharedBy?: readonly string[]; // Agent IDs who share this belief
  readonly contestedBy?: readonly string[]; // Agent IDs who contest this
  readonly validationAttempts: number;
  readonly isOpinion?: boolean;
  readonly generalizationFrom?: number; // Number of experiences
  readonly timestamp: number;
}

export interface Knowledge {
  readonly id: string;
  readonly type: 'procedural' | 'factual';
  readonly content: string;
  readonly confidence: number;
  readonly sourceMemories: readonly string[];
  readonly timestamp: number;
}

interface BeliefFormationInput {
  category: string;
  content: string;
  confidence: number;
  sourceMemories: string[];
  sharedBy?: string[];
  contestedBy?: string[];
  validationAttempts?: number;
  isOpinion?: boolean;
  generalizationFrom?: number;
}

interface KnowledgeFormationInput {
  type: 'procedural' | 'factual';
  content: string;
  confidence: number;
  sourceMemories: string[];
}

interface BeliefUpdateInput {
  confidence?: number;
  newSourceMemories?: string[];
  addSharedBy?: string[];
  addContestedBy?: string[];
}

/**
 * SemanticMemoryComponent stores knowledge, beliefs, facts, and opinions
 */
export class SemanticMemoryComponent extends ComponentBase {
  public readonly type = 'semantic_memory';
  private _beliefs: SemanticBelief[] = [];
  private _knowledge: Knowledge[] = [];

  /**
   * Get all beliefs (readonly)
   */
  get beliefs(): readonly SemanticBelief[] {
    return Object.freeze([...this._beliefs]);
  }

  /**
   * Get all knowledge (readonly)
   */
  get knowledge(): readonly Knowledge[] {
    return Object.freeze([...this._knowledge]);
  }

  /**
   * Form a new belief
   */
  formBelief(input: BeliefFormationInput): SemanticBelief {
    // Validate required fields - per CLAUDE.md, NO fallbacks
    if (!input.category) {
      throw new Error('SemanticBelief requires category');
    }
    if (!input.content) {
      throw new Error('SemanticBelief requires content');
    }
    if (input.confidence === undefined) {
      throw new Error('SemanticBelief requires confidence');
    }
    if (!input.sourceMemories) {
      throw new Error('SemanticBelief requires sourceMemories');
    }

    // Validate confidence range
    if (input.confidence < 0 || input.confidence > 1) {
      throw new Error('Confidence must be between 0 and 1');
    }

    const belief: SemanticBelief = Object.freeze({
      id: this._generateId(),
      category: input.category,
      content: input.content,
      confidence: input.confidence,
      sourceMemories: Object.freeze([...input.sourceMemories]),
      sharedBy: input.sharedBy
        ? Object.freeze([...input.sharedBy])
        : undefined,
      contestedBy: input.contestedBy
        ? Object.freeze([...input.contestedBy])
        : undefined,
      validationAttempts: input.validationAttempts ?? 0,
      isOpinion: input.isOpinion,
      generalizationFrom: input.generalizationFrom,
      timestamp: Date.now(),
    });

    this._beliefs.push(belief);
    return belief;
  }

  /**
   * Form procedural or factual knowledge
   */
  formKnowledge(input: KnowledgeFormationInput): Knowledge {
    if (!input.type) {
      throw new Error('Knowledge requires type');
    }
    if (!input.content) {
      throw new Error('Knowledge requires content');
    }
    if (input.confidence === undefined) {
      throw new Error('Knowledge requires confidence');
    }
    if (!input.sourceMemories) {
      throw new Error('Knowledge requires sourceMemories');
    }

    const knowledge: Knowledge = Object.freeze({
      id: this._generateId(),
      type: input.type,
      content: input.content,
      confidence: input.confidence,
      sourceMemories: Object.freeze([...input.sourceMemories]),
      timestamp: Date.now(),
    });

    this._knowledge.push(knowledge);
    return knowledge;
  }

  /**
   * Update an existing belief with new evidence
   */
  updateBelief(content: string, updates: BeliefUpdateInput): void {
    const index = this._beliefs.findIndex((b) => b.content === content);
    if (index < 0) {
      throw new Error(`Belief not found: ${content}`);
    }

    const belief = this._beliefs[index];
    if (!belief) {
      throw new Error(`Belief not found at index: ${index}`);
    }

    // Ensure belief has required id field per CLAUDE.md
    if (!belief.id) {
      throw new Error(`Belief at index ${index} missing required id field`);
    }

    // Merge source memories
    const sourceMemories = updates.newSourceMemories
      ? [
          ...belief.sourceMemories,
          ...updates.newSourceMemories,
        ]
      : belief.sourceMemories;

    // Merge sharedBy
    const sharedBy = updates.addSharedBy
      ? [
          ...(belief.sharedBy ?? []),
          ...updates.addSharedBy,
        ]
      : belief.sharedBy;

    // Merge contestedBy
    const contestedBy = updates.addContestedBy
      ? [
          ...(belief.contestedBy ?? []),
          ...updates.addContestedBy,
        ]
      : belief.contestedBy;

    // Ensure id is preserved when updating
    this._beliefs[index] = Object.freeze({
      ...belief,
      id: belief.id, // Always preserve the original id (guaranteed by check above)
      confidence: updates.confidence ?? belief.confidence,
      sourceMemories: Object.freeze(sourceMemories),
      sharedBy: sharedBy ? Object.freeze(sharedBy) : undefined,
      contestedBy: contestedBy ? Object.freeze(contestedBy) : undefined,
    });
  }

  /**
   * Validate a belief (increase or decrease confidence)
   */
  validateBelief(content: string, validated: boolean): void {
    const index = this._beliefs.findIndex((b) => b.content === content);
    if (index < 0) {
      throw new Error(`Belief not found: ${content}`);
    }

    const belief = this._beliefs[index];
    if (!belief) {
      throw new Error(`Belief not found at index: ${index}`);
    }

    // Ensure belief has required id field per CLAUDE.md
    if (!belief.id) {
      throw new Error(`Belief at index ${index} missing required id field`);
    }

    const delta = validated ? 0.1 : -0.15; // Negative evidence stronger
    const newConfidence = Math.max(0, Math.min(1, belief.confidence + delta));

    // Ensure id is preserved when updating
    this._beliefs[index] = Object.freeze({
      ...belief,
      id: belief.id, // Always preserve the original id (guaranteed by check above)
      confidence: newConfidence,
      validationAttempts: belief.validationAttempts + 1,
    });
  }

  /**
   * Get beliefs by category
   */
  getBeliefsbyCategory(category: string): readonly SemanticBelief[] {
    return this._beliefs.filter((b) => b.category === category);
  }

  /**
   * Get all categories
   */
  getCategories(): readonly string[] {
    const categories = new Set(this._beliefs.map((b) => b.category));
    return Array.from(categories);
  }

  private _generateId(): string {
    return `sem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
