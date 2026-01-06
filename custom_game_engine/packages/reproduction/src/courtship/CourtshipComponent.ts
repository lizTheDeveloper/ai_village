/**
 * Courtship Component
 *
 * Tracks an agent's courtship state, preferences, and active courtship attempts.
 */

import { ComponentBase } from '@ai-village/core';
import type {
  CourtshipParadigm,
  CourtshipState,
  CourtshipStyle,
  ActiveCourtship,
  ReceivedCourtship,
  PastCourtship,
} from './types';

export class CourtshipComponent extends ComponentBase {
  public readonly type = 'courtship' as const;

  public state: CourtshipState;
  public currentCourtshipTarget: string | null;
  public currentCourtshipInitiator: string | null;

  public paradigm: CourtshipParadigm;

  public preferredTactics: string[];
  public dislikedTactics: string[];

  public style: CourtshipStyle;
  public romanticInclination: number;

  public activeCourtships: ActiveCourtship[];
  public receivedCourtships: ReceivedCourtship[];
  public pastCourtships: PastCourtship[];

  public lastCourtshipAttempt: number;
  public courtshipCooldown: number;
  public rejectionCooldown: Map<string, number>;

  constructor(data: {
    state?: CourtshipState;
    currentCourtshipTarget?: string | null;
    currentCourtshipInitiator?: string | null;
    paradigm: CourtshipParadigm;
    preferredTactics?: string[];
    dislikedTactics?: string[];
    style?: CourtshipStyle;
    romanticInclination?: number;
    activeCourtships?: ActiveCourtship[];
    receivedCourtships?: ReceivedCourtship[];
    pastCourtships?: PastCourtship[];
    lastCourtshipAttempt?: number;
    courtshipCooldown?: number;
    rejectionCooldown?: Map<string, number>;
  }) {
    super();

    // Validate required field
    if (!data.paradigm) {
      throw new Error('CourtshipComponent requires paradigm');
    }

    // Validate state
    const validStates: CourtshipState[] = [
      'idle',
      'interested',
      'courting',
      'being_courted',
      'consenting',
      'mating',
    ];
    if (data.state && !validStates.includes(data.state)) {
      throw new Error(`Invalid courtship state: ${data.state}`);
    }

    // Validate romantic inclination
    const inclination = data.romanticInclination ?? 0.6;
    if (inclination < 0 || inclination > 1) {
      throw new Error(`romanticInclination must be 0-1, got ${inclination}`);
    }

    // Validate style
    const validStyles: CourtshipStyle[] = [
      'bold',
      'subtle',
      'traditional',
      'creative',
      'pragmatic',
      'romantic',
    ];
    const style = data.style ?? 'subtle';
    if (!validStyles.includes(style)) {
      throw new Error(`Invalid courtship style: ${style}`);
    }

    this.state = data.state ?? 'idle';
    this.currentCourtshipTarget = data.currentCourtshipTarget ?? null;
    this.currentCourtshipInitiator = data.currentCourtshipInitiator ?? null;

    this.paradigm = data.paradigm;

    this.preferredTactics = data.preferredTactics ?? [];
    this.dislikedTactics = data.dislikedTactics ?? [];

    this.style = style;
    this.romanticInclination = inclination;

    this.activeCourtships = data.activeCourtships ?? [];
    this.receivedCourtships = data.receivedCourtships ?? [];
    this.pastCourtships = data.pastCourtships ?? [];

    this.lastCourtshipAttempt = data.lastCourtshipAttempt ?? 0;
    this.courtshipCooldown = data.courtshipCooldown ?? 5000;
    this.rejectionCooldown = data.rejectionCooldown ?? new Map();

    // Validate active courtships
    for (const courtship of this.activeCourtships) {
      if (courtship.compatibilityScore < 0 || courtship.compatibilityScore > 1) {
        throw new Error(
          `compatibilityScore must be 0-1, got ${courtship.compatibilityScore}`
        );
      }
    }

    // Validate received courtships
    for (const courtship of this.receivedCourtships) {
      if (courtship.currentInterest < 0 || courtship.currentInterest > 1) {
        throw new Error(`currentInterest must be 0-1, got ${courtship.currentInterest}`);
      }
    }
  }

  /**
   * Check if agent is on cooldown from courting
   */
  public isOnCooldown(currentTick: number): boolean {
    return currentTick - this.lastCourtshipAttempt < this.courtshipCooldown;
  }

  /**
   * Check if agent is on cooldown from specific target
   */
  public isOnRejectionCooldown(targetId: string, currentTick: number): boolean {
    const cooldownUntil = this.rejectionCooldown.get(targetId);
    if (!cooldownUntil) return false;
    return currentTick < cooldownUntil;
  }

  /**
   * Record a rejection from a target
   */
  public recordRejection(targetId: string, currentTick: number, cooldownDuration: number): void {
    this.rejectionCooldown.set(targetId, currentTick + cooldownDuration);
  }

  /**
   * Get active courtship with specific target
   */
  public getActiveCourtship(targetId: string): ActiveCourtship | undefined {
    return this.activeCourtships.find((c) => c.targetId === targetId);
  }

  /**
   * Get received courtship from specific initiator
   */
  public getReceivedCourtship(initiatorId: string): ReceivedCourtship | undefined {
    return this.receivedCourtships.find((c) => c.initiatorId === initiatorId);
  }

  /**
   * End active courtship and record in history
   */
  public endCourtship(
    targetId: string,
    succeeded: boolean,
    endReason: string,
    currentTick: number
  ): void {
    const courtship = this.getActiveCourtship(targetId);
    if (!courtship) return;

    const duration = currentTick - courtship.startedAt;

    this.pastCourtships.push({
      partnerId: targetId,
      wasInitiator: true,
      succeeded,
      duration,
      endReason,
    });

    this.activeCourtships = this.activeCourtships.filter((c) => c.targetId !== targetId);

    if (!succeeded) {
      this.recordRejection(targetId, currentTick, 10000);
    }
  }

  /**
   * End received courtship and record in history
   */
  public endReceivedCourtship(
    initiatorId: string,
    succeeded: boolean,
    endReason: string,
    currentTick: number
  ): void {
    const courtship = this.getReceivedCourtship(initiatorId);
    if (!courtship) return;

    const duration = currentTick - courtship.startedAt;

    this.pastCourtships.push({
      partnerId: initiatorId,
      wasInitiator: false,
      succeeded,
      duration,
      endReason,
    });

    this.receivedCourtships = this.receivedCourtships.filter(
      (c) => c.initiatorId !== initiatorId
    );
  }
}
