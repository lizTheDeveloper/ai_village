/**
 * Multiverse, universe, and reality events.
 */
import type { EntityId } from '../../types.js';
import type {
  InvasionTriggeredEvent,
  BackgroundUniverseDiscoveredEvent,
} from '../../multiverse/BackgroundUniverseTypes.js';

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

  /** Universe fork requested (UI or system initiated) */
  'universe:fork_requested': {
    sourceCheckpoint?: {
      key: string;
      name: string;
      day?: number;
      tick?: number;
    };
    forkAtTick?: number;
    reason?: string;
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

  // ========================================================================
  // Timeline Merger Ship Events (Phase 4 Multiverse)
  // ========================================================================

  /** Timeline merger operation initiated by ship */
  'multiverse:merger_initiated': {
    sourceUniverse: string;
    targetUniverse: string;
    mergerShipId: string;
    tick: number;
  };

  /** Merger compatibility calculation completed */
  'multiverse:merger_compatibility_calculated': {
    sourceUniverse: string;
    targetUniverse: string;
    mergerShipId: string;
    compatibilityScore: number;
    compatible: boolean;
    tick: number;
  };

  /** Timelines successfully merged */
  'multiverse:timelines_merged': {
    sourceUniverse: string;
    targetUniverse: string;
    mergerShipId: string;
    conflictsResolved: number;
    entitiesPreserved: number;
    entitiesMerged: number;
    entitiesDiscarded: number;
    tick: number;
  };

  /** Timeline merger operation failed */
  'multiverse:merger_failed': {
    sourceUniverse: string;
    targetUniverse: string;
    mergerShipId: string;
    reason: string;
    tick: number;
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

  /** New universe discovered (from background simulation) */
  'multiverse:universe_discovered': BackgroundUniverseDiscoveredEvent;

  /** Invasion triggered by background universe (faction AI decision) */
  'multiverse:invasion_triggered': InvasionTriggeredEvent;

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

  // ========================================================================
  // Realm Events
  // ========================================================================

  /** Realm collapsed due to lack of maintenance or other reasons */
  'realm:collapsed': {
    realmId: string;
    realmName: string;
    reason: 'maintenance_depleted' | 'ruler_banished' | 'catastrophic_failure' | 'divine_intervention';
    rulerId?: string;
    rulerName?: string;
    subRealmIds: string[];
    inhabitantCount: number;
    timeSinceCreation: number;
  };

  /** Sub-realm orphaned due to parent realm collapse */
  'realm:orphaned': {
    realmId: string;
    realmName: string;
    parentRealmId: string;
    parentRealmName: string;
    newStatus: 'independent' | 'unstable' | 'cascading_collapse';
  };

  // ========================================================================
  // Paradox Detection Events (Phase 4 Multiverse)
  // ========================================================================

  /** Temporal paradox detected in timeline */
  'multiverse:paradox_detected': {
    entityId: string;
    paradoxType: 'grandfather' | 'bootstrap' | 'predestination' | 'ontological';
    severity: 'minor' | 'moderate' | 'severe' | 'catastrophic';
    description: string;
    causalChain: string[]; // Entity IDs involved in paradox
    tick: number;
  };

  /** Universe forked to resolve paradox */
  'multiverse:paradox_forked': {
    paradoxType: 'grandfather' | 'bootstrap' | 'predestination' | 'ontological';
    severity: 'minor' | 'moderate' | 'severe' | 'catastrophic';
    entityId: string;
    description: string;
    tick: number;
  };

  /** Timeline collapsed due to paradox */
  'multiverse:timeline_collapsed': {
    paradoxType: 'grandfather' | 'bootstrap' | 'predestination' | 'ontological';
    severity: 'minor' | 'moderate' | 'severe' | 'catastrophic';
    entityId: string;
    description: string;
    affectedUniverses: string[];
    tick: number;
  };

  /** Minor paradox auto-corrected via quantum effects */
  'multiverse:retrocausal_adjustment': {
    paradoxType: 'grandfather' | 'bootstrap' | 'predestination' | 'ontological';
    severity: 'minor' | 'moderate' | 'severe' | 'catastrophic';
    entityId: string;
    description: string;
    adjustmentType: 'quantum_decoherence' | 'timeline_nudge' | 'probability_collapse';
    tick: number;
  };

  // ========================================================================
  // Probability Scout Events (Phase 6 Exotic Ships)
  // ========================================================================

  /** Scout ship completed scanning phase */
  'multiverse:scout_scanning_complete': {
    shipId: string;
    tick: number;
  };

  /** Scout ship observed a probability branch */
  'multiverse:branch_observed': {
    shipId: string;
    branchId: string;
    precision: number;
    tick: number;
  };

  /** Scout ship accidentally triggered timeline collapse */
  'multiverse:scout_triggered_collapse': {
    shipId: string;
    branchId: string;
    tick: number;
  };

  /** Scout mission completed */
  'multiverse:scout_mission_complete': {
    shipId: string;
    branchesMapped: number;
    contaminationLevel: number;
    collapseEvents: number;
    tick: number;
  };

  // ========================================================================
  // Svetz Retrieval Events (Phase 6 Exotic Ships)
  // ========================================================================

  /** Svetz ship arrived at target timeline */
  'multiverse:svetz_arrived': {
    shipId: string;
    targetBranchId: string;
    tick: number;
  };

  /** Svetz ship found target in timeline */
  'multiverse:svetz_target_found': {
    shipId: string;
    targetSpec: {
      type: 'item' | 'entity' | 'technology';
      criteria: string;
      description: string;
    };
    tick: number;
  };

  /** Svetz ship search failed */
  'multiverse:svetz_search_failed': {
    shipId: string;
    reason: string;
    tick: number;
  };

  /** Svetz ship retrieved an item */
  'multiverse:svetz_item_retrieved': {
    shipId: string;
    itemId: string;
    itemName: string;
    contamination: number;
    tick: number;
  };

  /** Svetz ship retrieval failed */
  'multiverse:svetz_retrieval_failed': {
    shipId: string;
    reason: string;
    tick: number;
  };

  /** Svetz ship completed anchoring */
  'multiverse:svetz_anchoring_complete': {
    shipId: string;
    itemsAnchored: number;
    totalContamination: number;
    tick: number;
  };

  /** Svetz mission completed */
  'multiverse:svetz_mission_complete': {
    shipId: string;
    success: boolean;
    itemsRetrieved: number;
    itemsAnchored: number;
    totalContamination: number;
    failedAttempts: number;
    tick: number;
  };
}

export type MultiverseEventType = keyof MultiverseEvents;
export type MultiverseEventData = MultiverseEvents[MultiverseEventType];
