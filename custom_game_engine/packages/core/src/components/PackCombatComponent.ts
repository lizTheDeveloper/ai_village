import type { Component } from '../ecs/Component.js';
import type { EntityId } from '../types.js';

/**
 * PackCombatComponent - Pack mind combat coordination
 *
 * For species that fight as a single mind across multiple bodies
 */
export interface PackCombatComponent extends Component {
  readonly type: 'pack_combat';
  readonly version: 1;

  /** Pack identifier */
  packId: string;

  /** Bodies in the pack */
  bodiesInPack: EntityId[];

  /** Coherence level (0-1, drops as bodies are lost) */
  coherence: number;

  /** Coordination bonus for combat */
  coordinationBonus?: number;

  /** Whether pack has dissolved */
  dissolved?: boolean;
}

export function createPackCombatComponent(data: {
  packId: string;
  bodiesInPack: EntityId[];
  coherence: number;
  [key: string]: any;
}): PackCombatComponent {
  if (!data.packId) {
    throw new Error('Pack ID is required');
  }
  if (!data.bodiesInPack || data.bodiesInPack.length === 0) {
    throw new Error('Pack must have at least one body');
  }
  if (data.coherence === undefined) {
    throw new Error('Coherence is required');
  }

  return {
    type: 'pack_combat',
    version: 1,
    packId: data.packId,
    bodiesInPack: data.bodiesInPack,
    coherence: data.coherence,
    coordinationBonus: data.coordinationBonus || 0,
    dissolved: data.dissolved || false,
  };
}
