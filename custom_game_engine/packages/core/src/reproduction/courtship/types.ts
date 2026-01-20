/**
 * Courtship System Type Definitions
 *
 * Defines types for the courtship system including paradigms, tactics,
 * and state management.
 */

import type { ComponentBase } from '../../ecs/Component';

// ============================================================================
// Courtship Types
// ============================================================================

export type CourtshipType =
  | 'none'
  | 'display'
  | 'gift_giving'
  | 'combat'
  | 'dance'
  | 'pheromone'
  | 'construction'
  | 'song'
  | 'pursuit'
  | 'gradual_proximity'
  | 'romantic'
  | 'mind_merge'
  | 'dream_meeting'
  | 'timeline_search'
  | 'resonance'
  | 'arranged'
  | 'lottery';

export type CourtshipState =
  | 'idle'
  | 'interested'
  | 'courting'
  | 'being_courted'
  | 'consenting'
  | 'mating';

export type CourtshipStyle =
  | 'bold'
  | 'subtle'
  | 'traditional'
  | 'creative'
  | 'pragmatic'
  | 'romantic';

export type TacticCategory =
  | 'conversation'
  | 'gift'
  | 'display'
  | 'proximity'
  | 'activity'
  | 'dominance'
  | 'crafting'
  | 'magic'
  | 'service'
  | 'ritual';

export type MatingBehaviorType =
  | 'private_location'
  | 'nest_location'
  | 'ritual_space'
  | 'underwater'
  | 'in_flight'
  | 'anywhere';

// ============================================================================
// Location Requirements
// ============================================================================

export interface LocationRequirement {
  type: string;
  minHeight?: number;
  visibility?: 'public' | 'private';
  requiresQuality?: 'low' | 'medium' | 'high';
  magicalIntensity?: 'low' | 'medium' | 'high';
}

// ============================================================================
// Courtship Tactic
// ============================================================================

export interface CourtshipTactic {
  id: string;
  name: string;
  category: TacticCategory;

  requirements: {
    items?: string[];
    skills?: { [skill: string]: number };
    location?: LocationRequirement;
    proximity?: number;
    energy?: number;
    time?: number;
  };

  visibleToOthers: boolean;
  description: string;
  baseAppeal: number;

  appealModifiers: {
    romanticInclination?: number;
    personality?: { [trait: string]: number };
  };
}

// ============================================================================
// Mating Behavior
// ============================================================================

export interface MatingBehavior {
  type: MatingBehaviorType;
  requiredLocation?: string;
  bothMustBePresent: boolean;
  privateSpace: boolean;
  duration: number;
  ritualComponents?: string[];
  postMatingEffects?: {
    moodBoost?: number;
    energyCost?: number;
    bondStrength?: number;
  };
}

// ============================================================================
// Courtship Paradigm
// ============================================================================

export interface CourtshipParadigm {
  type: CourtshipType;
  requiredTactics: string[];
  optionalTactics: string[];
  forbiddenTactics: string[];
  minimumTactics: number;
  typicalDuration: [number, number];
  locationRequirement: LocationRequirement | null;
  matingBehavior: MatingBehavior;
}

// ============================================================================
// Active Courtship
// ============================================================================

export interface ActiveCourtship {
  targetId: string;
  startedAt: number;
  tacticsAttempted: CourtshipTactic[];
  responses: Array<{ tactic: CourtshipTactic; reception: number }>;
  compatibilityScore: number;
  successProbability: number;
}

// ============================================================================
// Received Courtship
// ============================================================================

export interface ReceivedCourtship {
  initiatorId: string;
  startedAt: number;
  tacticsReceived: CourtshipTactic[];
  currentInterest: number;
  willingToConsent: boolean;
}

// ============================================================================
// Past Courtship
// ============================================================================

export interface PastCourtship {
  partnerId: string;
  wasInitiator: boolean;
  succeeded: boolean;
  duration: number;
  endReason: string;
}

// ============================================================================
// Courtship Component
// ============================================================================

export interface CourtshipComponent extends ComponentBase {
  type: 'courtship';

  state: CourtshipState;
  currentCourtshipTarget: string | null;
  currentCourtshipInitiator: string | null;

  paradigm: CourtshipParadigm;

  preferredTactics: string[];
  dislikedTactics: string[];

  style: CourtshipStyle;
  romanticInclination: number;

  activeCourtships: ActiveCourtship[];
  receivedCourtships: ReceivedCourtship[];
  pastCourtships: PastCourtship[];

  lastCourtshipAttempt: number;
  courtshipCooldown: number;
  rejectionCooldown: Map<string, number>;
}
