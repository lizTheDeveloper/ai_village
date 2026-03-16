import type { Component } from '../ecs/Component.js';

/**
 * A good that is exchanged along a trade route.
 */
export interface TradeGood {
  resourceType: string;
  amountPerTrip: number;
}

/**
 * The trade agreement governing the exchange of goods.
 */
export interface TradeAgreement {
  exports: TradeGood[]; // Goods the source village sends
  imports: TradeGood[]; // Goods the source village receives
}

/**
 * TradeRouteComponent - Links two villages for periodic caravan-based trade.
 *
 * This is a village-scale trade route (NOT the grand-strategy TradeCaravanComponent).
 * Entities with this component represent established trade connections between
 * two villages, which InterVillageCaravanSystem uses to spawn caravans.
 *
 * Safety degrades over time if bandits are active and can be improved by
 * assigning guards or clearing nearby threats.
 */
export interface TradeRouteComponent extends Component {
  readonly type: 'trade_route';
  readonly version: 1;
  routeId: string;
  sourceVillageId: string;
  targetVillageId: string;
  distance: number;           // In tiles
  safety: number;             // 0-1 (1 = fully safe, 0 = extremely dangerous)
  travelTimeSeconds: number;  // At base caravan speed
  agreement: TradeAgreement;
  active: boolean;
  lastCaravanTick: number;
  caravanIntervalTicks: number; // How often caravans depart
}

/**
 * Create a new TradeRouteComponent.
 */
export function createTradeRouteComponent(
  routeId: string,
  sourceVillageId: string,
  targetVillageId: string,
  distance: number,
  caravanIntervalTicks: number = 12000
): TradeRouteComponent {
  // Estimate travel time: 1 tile/second base speed
  const travelTimeSeconds = distance;

  return {
    type: 'trade_route',
    version: 1,
    routeId,
    sourceVillageId,
    targetVillageId,
    distance,
    safety: 1.0,
    travelTimeSeconds,
    agreement: {
      exports: [],
      imports: [],
    },
    active: true,
    lastCaravanTick: 0,
    caravanIntervalTicks,
  };
}
