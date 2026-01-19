/**
 * Multiverse, universe, and reality events.
 */
import type { EntityId } from '../../types.js';

export interface MultiverseEvents {
  /** Reality anchor charging interrupted */
  'reality_anchor:charging_interrupted': {
    message: string;
    powerLevel: number;
  };

  /** Reality anchor ready to activate */
  'reality_anchor:ready': Record<string, never>;

  /** Reality anchor activated */
  'reality_anchor:activated': {
    message: string;
  };

  /** Reality anchor receiving partial power */
  'reality_anchor:power_insufficient': {
    message: string;
    efficiency: number;
  };

  /** Reality anchor critical power loss */
  'reality_anchor:power_loss': {
    message: string;
    efficiency: number;
  };

  /** God entered reality anchor field and became mortal */
  'reality_anchor:god_mortalized': {
    godId: string;
    message: string;
  };

  /** Supreme Creator entered reality anchor field */
  'reality_anchor:creator_mortalized': {
    godId: string;
    message: string;
  };

  /** God left reality anchor field and powers restored */
  'reality_anchor:god_restored': {
    godId: string;
    message: string;
  };

  /** Reality anchor overloading */
  'reality_anchor:overloading': {
    message: string;
    countdown: number;
  };

  /** Reality anchor field collapsed */
  'reality_anchor:field_collapse': {
    message: string;
    reason: string;
  };

  /** Timeline fork required due to causal paradox */
  'multiverse:timeline_fork_required': {
    reason: string;
    forkAtTick: bigint;
    causalEvent: unknown;
  };

  /** Universe successfully forked from snapshot */
  'universe:forked': {
    sourceCheckpoint: {
      key: string;
      name: string;
      day: number;
      tick: number;
    };
    newUniverseId: string;
    forkPoint: number;
  };

  /** Lore fragment spawned in world */
  'lore:spawned': {
    fragmentId: string;
    title: string;
    category: string;
    importance: string;
    position: { x: number; y: number };
    entityId?: string;
  };

  /** Timeline merge requested (UI or other system) */
  'timeline:merge_requested': {
    branch1Id: string;
    branch2Id: string;
    mergerShipId: string;
  };

  /** Timeline merge started by timeline_merger ship */
  'timeline:merge_started': {
    branch1Id: string;
    branch2Id: string;
    mergerShipId: string;
  };

  /** Timeline merge completed successfully */
  'timeline:merge_completed': {
    branch1Id: string;
    branch2Id: string;
    mergedUniverseId: string;
    mergerShipId: string;
    conflictsResolved?: number;
  };

  /** Timeline merge failed due to incompatibility or insufficient coherence */
  'timeline:merge_failed': {
    branch1Id: string;
    branch2Id: string;
    mergerShipId: string;
    reason: string;
    conflicts?: Array<{
      conflictType: string;
      entityId: string;
      resolvable: boolean;
    }>;
  };

  /** Passage experiencing high traffic congestion */
  'passage:congested': {
    passageId: string;
    congestionLevel: number;
    estimatedDelay: number;
  };

  /** Passage stability changed (extended from base passage events) */
  'passage:stability_changed': {
    passageId: string;
    stability: number;
    decayRate: number;
  };

  // ========================================================================
  // Invasion Events (Multiverse warfare - different from local combat)
  // ========================================================================

  /** Cross-universe invasion started */
  'multiverse:invasion_started': {
    invasionId: string;
    type: 'military' | 'cultural' | 'economic';
    attackerUniverse: string;
    targetUniverse: string;
  };

  /** Cross-universe military invasion successful */
  'multiverse:invasion_victory': {
    invasionId: string;
    attackerUniverse: string;
    targetUniverse: string;
    result: {
      success: boolean;
      outcome?: string;
      occupiedSystems?: string[];
      casualties?: {
        attackerLosses: number;
        defenderLosses: number;
      };
    };
  };

  /** Military invasion repelled */
  'multiverse:invasion_repelled': {
    invasionId: string;
    attackerUniverse: string;
    targetUniverse: string;
    result: {
      success: boolean;
      outcome?: string;
      casualties?: {
        attackerLosses: number;
        defenderLosses: number;
      };
    };
  };

  /** Cultural conquest (tech uplift) */
  'multiverse:invasion_cultural_conquest': {
    invasionId: string;
    attackerUniverse: string;
    targetUniverse: string;
    result: {
      success: boolean;
      dependencyLevel?: number;
      culturalDominance?: number;
    };
  };

  /** Economic conquest (trade dominance) */
  'multiverse:invasion_economic_conquest': {
    invasionId: string;
    attackerUniverse: string;
    targetUniverse: string;
    result: {
      success: boolean;
      industrialCollapse?: number;
      economicDependency?: number;
    };
  };

  /** Invasion failed */
  'multiverse:invasion_failed': {
    invasionId: string;
    reason: string;
  };

  /** Defense strategy activated */
  'multiverse:invasion_defense_activated': {
    strategy: string;
    passageId?: string;
    invasionId?: string;
    success?: boolean;
  };

  // ========================================================================
  // Canon Event System
  // ========================================================================

  /** Canon event occurred as expected (narrative anchor fulfilled) */
  'multiverse:canon_event_occurred': {
    canonEventId: string;
    eventType: string;
    description: string;
    probability: number;
    tick: string;
  };

  /** Canon event was altered (timeline diverged from expected path) */
  'multiverse:canon_event_altered': {
    canonEventId: string;
    eventType: string;
    originalOutcome: string;
    actualOutcome: string;
    divergenceImpact: number;
  };

  /** Timeline converging back to canon (nudging toward expected outcome) */
  'multiverse:timeline_converging': {
    canonEventId: string;
    eventType: string;
    convergenceStrength: number;
    targetEntities: string[];
    modifications: string[];
  };
}

export type MultiverseEventType = keyof MultiverseEvents;
export type MultiverseEventData = MultiverseEvents[MultiverseEventType];
