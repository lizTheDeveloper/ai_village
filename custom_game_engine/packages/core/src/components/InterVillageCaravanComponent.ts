import type { Component } from '../ecs/Component.js';

/**
 * Current status of a village-level caravan.
 */
export type CaravanStatus = 'traveling' | 'arrived' | 'lost' | 'attacked';

/**
 * A single cargo item carried by the caravan.
 */
export interface CaravanCargo {
  resourceType: string;
  amount: number;
}

/**
 * InterVillageCaravanComponent - Represents a caravan traveling between two villages.
 *
 * This is a village-scale caravan (NOT the grand-strategy TradeCaravanComponent).
 * Spawned by InterVillageCaravanSystem when a trade route's interval elapses.
 *
 * Progress is tracked as a 0-1 value. When it reaches 1, the caravan has arrived
 * and its cargo is transferred to the target village's summary resources.
 *
 * Caravans can be lost to bandit encounters based on route safety.
 */
export interface InterVillageCaravanComponent extends Component {
  readonly type: 'inter_village_caravan';
  readonly version: 1;
  caravanId: string;
  routeId: string;
  sourceVillageId: string;
  targetVillageId: string;
  cargo: CaravanCargo[];
  progress: number;         // 0-1 (0 = at source, 1 = at destination)
  status: CaravanStatus;
  departedTick: number;
  expectedArrivalTick: number;
  encounteredBandits: boolean;
}

/**
 * Create a new InterVillageCaravanComponent.
 */
export function createInterVillageCaravanComponent(
  caravanId: string,
  routeId: string,
  sourceVillageId: string,
  targetVillageId: string,
  cargo: CaravanCargo[],
  departedTick: number,
  expectedArrivalTick: number
): InterVillageCaravanComponent {
  return {
    type: 'inter_village_caravan',
    version: 1,
    caravanId,
    routeId,
    sourceVillageId,
    targetVillageId,
    cargo,
    progress: 0,
    status: 'traveling',
    departedTick,
    expectedArrivalTick,
    encounteredBandits: false,
  };
}
