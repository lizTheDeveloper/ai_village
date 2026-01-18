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
}

export type MultiverseEventType = keyof MultiverseEvents;
export type MultiverseEventData = MultiverseEvents[MultiverseEventType];
