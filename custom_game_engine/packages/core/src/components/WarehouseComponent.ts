import type { Component } from '../ecs/Component.js';

/**
 * WarehouseComponent tracks resource stockpiles, production/consumption rates.
 * Per work order: Capacity 1000 units, tracks specific resource type,
 * calculates days until depletion, monitors distribution fairness.
 *
 * Resources not in warehouse are NOT tracked in metrics.
 */

export type ResourceStatus = 'surplus' | 'adequate' | 'low' | 'critical';
export type DistributionFairness = 'equal' | 'unequal' | 'very_unequal';

export interface DistributionMetrics {
  resource: string;
  giniCoefficient: number; // 0-1 inequality measure
  fairness: DistributionFairness;
}

export interface WarehouseComponent extends Component {
  type: 'warehouse';
  resourceType: string; // 'food', 'wood', 'stone', etc.
  capacity: number; // Maximum storage (1000)
  stockpiles: Record<string, number>; // { berries: 50, meat: 30 }
  inventory: Record<string, number>; // Alias for stockpiles (for compatibility)
  productionRates: Record<string, number>; // units per hour
  consumptionRates: Record<string, number>; // units per hour
  daysRemaining: Record<string, number>; // days until depletion
  status: Record<string, ResourceStatus>;
  distribution: DistributionMetrics[];
  lastDepositTime: Record<string, number>; // timestamp of last deposit
  lastWithdrawTime: Record<string, number>; // timestamp of last withdrawal
}

export function createWarehouseComponent(resourceType: string): WarehouseComponent {
  if (!resourceType) {
    throw new Error('Warehouse requires resourceType');
  }

  return {
    type: 'warehouse',
    version: 1,
    resourceType,
    capacity: 1000,
    stockpiles: {},
    inventory: {}, // Alias for stockpiles
    productionRates: {},
    consumptionRates: {},
    daysRemaining: {},
    status: {},
    distribution: [],
    lastDepositTime: {},
    lastWithdrawTime: {},
  };
}
