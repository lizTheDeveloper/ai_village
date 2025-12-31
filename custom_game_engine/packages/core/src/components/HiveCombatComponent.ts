import type { Component } from '../ecs/Component.js';
import type { EntityId } from '../types.js';

/**
 * HiveCombatComponent - Hive warfare coordination
 *
 * For hive species with queen and expendable workers
 */
export interface HiveCombatComponent extends Component {
  readonly type: 'hive_combat';
  readonly version: 1;

  /** Hive identifier */
  hiveId: string;

  /** Queen entity ID */
  queen: EntityId;

  /** Worker entity IDs */
  workers: EntityId[];

  /** Current combat objective */
  objective?: string;

  /** Whether queen is dead */
  queenDead?: boolean;

  /** Whether collapse has been triggered */
  collapseTriggered?: boolean;
}

export function createHiveCombatComponent(data: {
  hiveId: string;
  queen: EntityId;
  workers: EntityId[];
  [key: string]: any;
}): HiveCombatComponent {
  if (!data.hiveId) {
    throw new Error('Hive ID is required');
  }
  if (!data.queen) {
    throw new Error('Queen is required');
  }
  if (!data.workers) {
    throw new Error('Workers are required');
  }

  return {
    type: 'hive_combat',
    version: 1,
    hiveId: data.hiveId,
    queen: data.queen,
    workers: data.workers,
    objective: data.objective,
    queenDead: data.queenDead || false,
    collapseTriggered: data.collapseTriggered || false,
  };
}
