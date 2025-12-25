import { ComponentBase } from '../ecs/Component.js';

export type VerificationResult = 'correct' | 'stale' | 'misidentified' | 'false_report' | 'unreliable';

export interface VerificationRecord {
  readonly result: VerificationResult;
  readonly tick: number;
  readonly details?: string;
}

/**
 * TrustNetworkComponent tracks trust scores and verification history for agents
 */
export class TrustNetworkComponent extends ComponentBase {
  public readonly type = 'trust_network';
  private _trustScores: Map<string, number> = new Map();
  private _verificationHistory: Map<string, VerificationRecord[]> = new Map();
  private readonly _decayRate: number = 0.0001; // Decay toward 0.5 neutral (slower)

  constructor(data?: { scores?: Map<string, number>; verificationHistory?: Map<string, VerificationRecord[]> }) {
    super();
    if (data?.scores) {
      this._trustScores = new Map(data.scores);
    }
    if (data?.verificationHistory) {
      // Deep copy the verification history to avoid mutating shared arrays
      this._verificationHistory = new Map();
      for (const [key, value] of data.verificationHistory.entries()) {
        this._verificationHistory.set(key, [...value]); // Copy the array
      }
    }
  }

  /**
   * Get trust score for an agent (default 0.5 neutral)
   * @throws Error if agentId is empty
   */
  getTrustScore(agentId: string): number {
    if (!agentId || agentId === '') {
      throw new Error('getTrustScore requires non-empty agent ID');
    }
    return this._trustScores.get(agentId) ?? 0.5; // Neutral starting trust
  }

  /**
   * Set trust score for an agent
   * @throws Error if trust score out of bounds [0, 1]
   */
  setTrustScore(agentId: string, score: number): void {
    if (!agentId || agentId === '') {
      throw new Error('setTrustScore requires non-empty agent ID');
    }
    if (score < 0 || score > 1) {
      throw new Error(`TrustNetwork: trust score must be between 0 and 1, got ${score}`);
    }
    this._trustScores.set(agentId, score);
  }

  /**
   * Record a verification event and update trust score
   * @throws Error for invalid verification result type
   */
  recordVerification(agentId: string, result: VerificationResult, tick: number, details?: string): void {
    if (!agentId || agentId === '') {
      throw new Error('recordVerification requires non-empty agent ID');
    }

    const validResults: VerificationResult[] = ['correct', 'stale', 'misidentified', 'false_report', 'unreliable'];
    if (!validResults.includes(result)) {
      throw new Error(`Invalid verification result type: ${result}. Must be one of: ${validResults.join(', ')}`);
    }

    // Record in history
    const history = this._verificationHistory.get(agentId) ?? [];
    history.push({ result, tick, details });
    this._verificationHistory.set(agentId, history);

    // Update trust score
    const currentTrust = this.getTrustScore(agentId);
    const trustChange = this._calculateTrustChange(result);
    const newTrust = this._clamp(currentTrust + trustChange, 0, 1);
    this.setTrustScore(agentId, newTrust);
  }

  /**
   * Calculate trust change based on verification result
   */
  private _calculateTrustChange(result: VerificationResult): number {
    switch (result) {
      case 'correct':
        return 0.1; // Positive reinforcement
      case 'stale':
        return -0.1; // Minor penalty for outdated info
      case 'false_report':
        return -0.2; // Moderate penalty for false claim
      case 'misidentified':
        return -0.4; // Larger penalty for wrong resource type
      case 'unreliable':
        return -0.8; // Severe penalty for pattern of bad info
      default:
        throw new Error(`Unknown verification result: ${result}`);
    }
  }

  /**
   * Check if agent is low-trust (< 0.3)
   */
  isLowTrust(agentId: string): boolean {
    return this.getTrustScore(agentId) < 0.3;
  }

  /**
   * Get verification history for an agent
   */
  getVerificationHistory(agentId: string): readonly VerificationRecord[] {
    return Object.freeze(this._verificationHistory.get(agentId) ?? []);
  }

  /**
   * Apply trust decay toward neutral (0.5) over time
   * Implements forgiveness mechanic
   */
  applyTrustDecay(agentId: string, ticksPassed: number): void {
    if (!agentId || agentId === '') {
      throw new Error('applyTrustDecay requires non-empty agent ID');
    }
    if (ticksPassed < 0) {
      throw new Error('ticksPassed must be non-negative');
    }

    const currentTrust = this.getTrustScore(agentId);
    const neutral = 0.5;
    const decayAmount = this._decayRate * ticksPassed;

    // Decay toward neutral
    let newTrust: number;
    if (currentTrust > neutral) {
      newTrust = Math.max(neutral, currentTrust - decayAmount);
    } else {
      newTrust = Math.min(neutral, currentTrust + decayAmount);
    }

    this.setTrustScore(agentId, newTrust);
  }

  /**
   * Calculate average trust score across all known agents
   */
  getAverageTrustScore(): number {
    if (this._trustScores.size === 0) {
      return 0.5; // Neutral when no scores exist
    }

    let sum = 0;
    for (const score of this._trustScores.values()) {
      sum += score;
    }
    return sum / this._trustScores.size;
  }

  /**
   * Get all trust scores (readonly)
   */
  get scores(): ReadonlyMap<string, number> {
    return new Map(this._trustScores);
  }

  /**
   * Get all verification history (readonly)
   */
  get verificationHistory(): ReadonlyMap<string, readonly VerificationRecord[]> {
    return new Map(this._verificationHistory);
  }

  /**
   * Clamp value to range [min, max]
   */
  private _clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
