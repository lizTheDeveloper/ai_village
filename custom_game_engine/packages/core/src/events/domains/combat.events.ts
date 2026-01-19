/**
 * Combat and conflict events.
 */
import type { EntityId } from '../../types.js';

export interface CombatEvents {
  /** An entity attacks another entity */
  'combat:attack': {
    attackerId: EntityId;
    targetId: EntityId;
    weaponId?: string;
    attackType: 'melee' | 'ranged' | 'magic';
  };

  /** Damage is dealt to an entity */
  'combat:damage': {
    entityId: EntityId;
    attackerId?: EntityId;
    bodyPart?: string;
    amount: number;
    damageType: 'slashing' | 'piercing' | 'bludgeoning' | 'fire' | 'frost' | 'lightning' | 'poison' | 'magic';
    blocked?: number;
    absorbed?: number;
  };

  /** An entity dies */
  'combat:death': {
    entityId: EntityId;
    killerId?: EntityId;
    cause: string;
    position?: { x: number; y: number; z?: number };
  };

  /** Combat begins between entities */
  'combat:started': {
    participants: EntityId[];
    initiator: EntityId;
    position: { x: number; y: number };
  };

  /** Combat ends */
  'combat:ended': {
    participants: EntityId[];
    winner?: EntityId;
    duration: number;
  };

  /** Agent autonomously initiated combat */
  'combat:initiated_by_agent': {
    attackerId: EntityId;
    defenderId: EntityId;
    cause: 'jealousy_rival' | 'jealousy_infidelity' | 'jealousy_ex' |
           'honor_duel' | 'territory_dispute' | 'revenge' | 'defense' |
           'courtship_display' | 'robbery' | 'challenge';
    lethal: boolean;
    surprise: boolean;
    autonomousDecision: boolean;
  };

  /** Combat initiated as crime of passion (jealousy-driven) */
  'combat:crime_of_passion': {
    attackerId: EntityId;
    defenderId: EntityId;
    jealousyType: string;
  };

  /** An entity dodges an attack */
  'combat:dodge': {
    entityId: EntityId;
    attackerId: EntityId;
  };

  /** An entity blocks an attack */
  'combat:block': {
    entityId: EntityId;
    attackerId: EntityId;
    damageBlocked: number;
  };

  /** An injury is inflicted */
  'combat:injury': {
    entityId: EntityId;
    bodyPart: string;
    injuryType: 'cut' | 'bruise' | 'fracture' | 'burn' | 'puncture';
    severity: 'minor' | 'moderate' | 'severe' | 'critical';
  };

  /** Destiny affected combat outcome (Phase 36: Hero Protection) */
  'combat:destiny_intervention': {
    agentId: EntityId;
    luckModifier: number;
    attackerLuck: number;
    defenderLuck: number;
    narrative: string;
    survived?: boolean;
  };

  /** Combat battle started */
  'combat:battle_started': {
    participants: string[];
    location: { x: number; y: number };
    battleType?: string;
  };

  /** Combat battle ended */
  'combat:battle_ended': {
    participants: string[];
    victors?: string[];
    casualties?: string[];
  };

  /** Conflict started */
  'conflict:started': {
    conflictId: string;
    conflictType: 'hunting' | 'predator_attack' | 'agent_combat' | 'dominance_challenge';
    initiator: string;
    target: string;
    location: { x: number; y: number; z: number };
  };

  /** Conflict resolved with outcome */
  'conflict:resolved': {
    conflictId: string;
    conflictType: string;
    outcome: string;
    participants: string[];
    narrative?: string;
  };

  /** Hunt started */
  'hunt:started': {
    hunterId: string;
    preyId: string;
    huntingSkill: number;
  };

  /** Hunt successful */
  'hunt:success': {
    hunterId: string;
    preyId: string;
    resourcesGained: string[];
  };

  /** Hunt failed */
  'hunt:failed': {
    hunterId: string;
    preyId: string;
    reason: string;
  };

  /** Agent autonomously initiated hunt */
  'hunt:initiated_by_agent': {
    hunterId: string;
    targetId: string;
    reason: 'food' | 'practice' | 'resources';
    autonomousDecision: boolean;
  };

  /** Hunter injured by dangerous prey */
  'hunt:injured': {
    hunterId: string;
    preyId: string;
    injuryType: string;
    severity: string;
  };

  /** Predator attacks agent */
  'predator:attack': {
    predatorId: string;
    targetId: string;
    predatorType: string;
  };

  /** Agent successfully defended against predator */
  'predator:repelled': {
    predatorId: string;
    defenderId: string;
  };

  /** Injury inflicted */
  'injury:inflicted': {
    entityId: string;
    injuryType: string;
    severity: 'minor' | 'major' | 'critical';
    location: string;
    cause: string;
  };

  /** Injury fully healed */
  'injury:healed': {
    entityId: string;
    injuryType: string;
  };

  /** Guard alertness low */
  'guard:alertness_low': {
    guardId: string;
    alertness: number;
  };

  /** Guard detected a threat */
  'guard:threat_detected': {
    guardId: string;
    threatId: string;
    threatLevel: number;
    distance: number;
    location: { x: number; y: number; z: number };
    threatType?: string;
  };

  /** Guard responding to threat */
  'guard:response': {
    guardId: string;
    threatId: string;
    response: 'alert_others' | 'intercept' | 'observe' | 'flee';
  };

  /** Invasion started */
  'invasion:started': {
    invaderIds: string[];
    targetLocation: { x: number; y: number };
    invaderType?: string;
  };

  /** Hive collapse triggered (queen died) */
  'hive:collapse': {
    hiveId: string;
    queenId: EntityId;
  };

  /** Hive worker died */
  'hive:worker_died': {
    hiveId: string;
    workerId: EntityId;
    remainingWorkers: number;
  };

  /** Pack dissolved (alpha died or too few members) */
  'pack:dissolved': {
    packId: string;
    reason: 'alpha_died' | 'insufficient_members';
  };
}

export type CombatEventType = keyof CombatEvents;
export type CombatEventData = CombatEvents[CombatEventType];
