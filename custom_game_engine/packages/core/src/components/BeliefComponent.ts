import { ComponentBase } from '../ecs/Component.js';

export type BeliefType = 'character' | 'world' | 'social';
export type EvidenceType = 'accurate_claim' | 'false_claim' | 'observation' | 'experience';

export interface Belief {
  readonly type: BeliefType;
  readonly subject: string; // Agent ID, pattern name, etc.
  readonly description: string;
  readonly confidence: number; // 0-1
  readonly evidenceCount: number;
  readonly formedAt: number; // Tick when belief formed
  readonly lastUpdated: number; // Tick of last evidence
}

interface EvidenceRecord {
  readonly type: BeliefType;
  readonly subject: string;
  readonly evidenceType: EvidenceType;
  readonly tick: number;
  readonly positive: boolean; // Supporting or contradicting
}

/**
 * BeliefComponent stores and manages agent beliefs formed from patterns
 * Beliefs form after 3+ observations and can be updated or abandoned
 */
export class BeliefComponent extends ComponentBase {
  public readonly type = 'belief';
  private _beliefs: Map<string, Belief> = new Map();
  private _evidenceRecords: Map<string, EvidenceRecord[]> = new Map();
  private readonly _formationThreshold: number = 3; // Require 3 observations
  private readonly _abandonmentThreshold: number = 0.2; // Remove below this confidence

  constructor() {
    super();
  }

  /**
   * Record evidence that may form or update a belief
   * @throws Error for invalid inputs
   */
  recordEvidence(
    type: BeliefType,
    subject: string,
    evidenceType: EvidenceType,
    tick: number
  ): void {
    // Validate inputs - NO FALLBACKS per CLAUDE.md
    const validBeliefTypes: BeliefType[] = ['character', 'world', 'social'];
    if (!validBeliefTypes.includes(type)) {
      throw new Error(`Invalid belief type: ${type}. Must be one of: ${validBeliefTypes.join(', ')}`);
    }

    if (!subject || subject === '') {
      throw new Error('recordEvidence requires non-empty subject');
    }

    const validEvidenceTypes: EvidenceType[] = ['accurate_claim', 'false_claim', 'observation', 'experience'];
    if (!evidenceType || !validEvidenceTypes.includes(evidenceType)) {
      throw new Error(`Invalid evidence type: ${evidenceType}. Must be one of: ${validEvidenceTypes.join(', ')}`);
    }

    if (tick < 0) {
      throw new Error('recordEvidence requires non-negative tick value');
    }

    // Determine if evidence is positive or negative
    const positive = evidenceType !== 'false_claim';

    // Record evidence
    const key = this._getBeliefKey(type, subject);
    const records = this._evidenceRecords.get(key) ?? [];
    records.push({ type, subject, evidenceType, tick, positive });
    this._evidenceRecords.set(key, records);

    // Check if belief should be formed or updated
    const existingBelief = this._beliefs.get(key);

    if (existingBelief) {
      // Update existing belief
      this._updateBelief(key, evidenceType, tick);
    } else {
      // Check if enough evidence to form new belief
      if (records.length >= this._formationThreshold) {
        this._formBelief(type, subject, records, tick);
      }
    }

    // Remove beliefs with low confidence
    this._pruneWeakBeliefs();
  }

  /**
   * Form a new belief based on accumulated evidence
   */
  private _formBelief(
    type: BeliefType,
    subject: string,
    records: EvidenceRecord[],
    tick: number
  ): void {
    const key = this._getBeliefKey(type, subject);

    // Calculate initial confidence
    const confidence = this._calculateConfidence(records);

    // Generate description based on type and evidence
    const description = this._generateDescription(type, subject, records);

    const belief: Belief = {
      type,
      subject,
      description,
      confidence,
      evidenceCount: records.length,
      formedAt: tick,
      lastUpdated: tick,
    };

    this._beliefs.set(key, belief);
  }

  /**
   * Update an existing belief with new evidence
   */
  private _updateBelief(key: string, _evidenceType: EvidenceType, tick: number): void {
    const belief = this._beliefs.get(key);
    if (!belief) return;

    const records = this._evidenceRecords.get(key) ?? [];
    const newConfidence = this._calculateConfidence(records);

    // Update belief
    this._beliefs.set(key, {
      ...belief,
      confidence: newConfidence,
      evidenceCount: records.length,
      lastUpdated: tick,
    });
  }

  /**
   * Calculate confidence from evidence records
   * Confidence increases with:
   * 1. Consistency of evidence (all positive or all negative)
   * 2. Amount of supporting evidence (more consistent evidence = higher confidence)
   *
   * Counter-evidence reduces confidence
   */
  private _calculateConfidence(records: EvidenceRecord[]): number {
    const positiveCount = records.filter(r => r.positive).length;
    const negativeCount = records.length - positiveCount;
    const majorityCount = Math.max(positiveCount, negativeCount);
    const minorityCount = Math.min(positiveCount, negativeCount);

    // Base confidence from majority evidence (how much consistent evidence we have)
    // 3 same = 0.75, 4 same = 0.80, 5 same = 0.85, etc.
    const baseConfidence = Math.min(1.0, 0.6 + majorityCount * 0.05);

    // Penalty for contradicting evidence
    // Each counter-example reduces confidence significantly
    // 1 counter = -0.27, 2 = -0.54, 3 = -0.81, etc.
    const penalty = minorityCount * 0.27;

    const finalConfidence = Math.max(0, baseConfidence - penalty);

    return finalConfidence;
  }

  /**
   * Generate human-readable description for belief
   */
  private _generateDescription(type: BeliefType, subject: string, records: EvidenceRecord[]): string {
    const positiveCount = records.filter(r => r.positive).length;
    const totalCount = records.length;
    const ratio = positiveCount / totalCount;

    switch (type) {
      case 'character':
        if (ratio > 0.7) {
          return `${subject} is trustworthy and reliable`;
        } else if (ratio < 0.3) {
          return `${subject} is unreliable and makes false claims`;
        } else {
          return `${subject} is sometimes accurate but inconsistent`;
        }

      case 'world':
        return `Pattern observed: ${subject}`;

      case 'social':
        return `Social pattern: ${subject}`;

      default:
        return `Belief about ${subject}`;
    }
  }

  /**
   * Remove beliefs with confidence below threshold
   */
  private _pruneWeakBeliefs(): void {
    for (const [key, belief] of this._beliefs.entries()) {
      if (belief.confidence < this._abandonmentThreshold) {
        this._beliefs.delete(key);
      }
    }
  }

  /**
   * Get all beliefs of a specific type
   */
  getBeliefs(type: BeliefType): Belief[] {
    const beliefs: Belief[] = [];
    for (const belief of this._beliefs.values()) {
      if (belief.type === type) {
        beliefs.push(belief);
      }
    }
    return beliefs;
  }

  /**
   * Get belief about specific subject
   */
  getBeliefAbout(type: BeliefType, subject: string): Belief | undefined {
    const key = this._getBeliefKey(type, subject);
    return this._beliefs.get(key);
  }

  /**
   * Get all beliefs (readonly)
   */
  get allBeliefs(): readonly Belief[] {
    return Object.freeze([...this._beliefs.values()]);
  }

  /**
   * Generate unique key for belief
   */
  private _getBeliefKey(type: BeliefType, subject: string): string {
    return `${type}:${subject}`;
  }

  /**
   * Clear all beliefs (for testing)
   */
  clearBeliefs(): void {
    this._beliefs.clear();
    this._evidenceRecords.clear();
  }
}
