import type { Component } from '../ecs/Component.js';

/**
 * Market statistics for a single item
 */
export interface ItemMarketStats {
  itemId: string;
  totalSupply: number;
  recentSales: number;      // Last 7 days
  recentPurchases: number;  // Last 7 days
  averagePrice: number;
  priceHistory: number[];   // Last 30 data points
  lastUpdated: number;
}

/**
 * Global market state component - singleton on the world
 */
export interface MarketStateComponent extends Component {
  type: 'market_state';
  itemStats: Map<string, ItemMarketStats>;
  totalCurrency: number;
  dailyTransactionVolume: number;
  weeklyTransactionVolume: number;
  inflationRate: number;
  lastDayProcessed: number;
}

/**
 * Create a new MarketStateComponent
 */
export function createMarketStateComponent(): MarketStateComponent {
  return {
    type: 'market_state',
    version: 1,
    itemStats: new Map(),
    totalCurrency: 0,
    dailyTransactionVolume: 0,
    weeklyTransactionVolume: 0,
    inflationRate: 0,
    lastDayProcessed: 0,
  };
}

/**
 * Calculate demand multiplier based on sales vs purchases ratio
 * High demand (more sales than purchases) increases prices
 * Low demand (more purchases than sales) decreases prices
 */
export function getDemandMultiplier(stats: ItemMarketStats): number {
  const salesRatio = stats.recentSales / Math.max(stats.recentPurchases, 1);
  if (salesRatio > 2) return 1.5;
  if (salesRatio > 1.2) return 1.2;
  if (salesRatio > 0.8) return 1.0;
  if (salesRatio > 0.5) return 0.85;
  return 0.7;
}

/**
 * Calculate supply penalty based on supply vs sales ratio
 * High supply relative to sales decreases prices
 * Low supply relative to sales maintains prices
 */
export function getSupplyPenalty(stats: ItemMarketStats): number {
  const supplyRatio = stats.totalSupply / Math.max(stats.recentSales, 1);
  if (supplyRatio > 10) return 0.5;
  if (supplyRatio > 5) return 0.7;
  if (supplyRatio > 2) return 0.85;
  return 1.0;
}

/**
 * Update market stats for a specific item
 */
export function updateItemStats(
  component: MarketStateComponent,
  itemId: string,
  updates: Partial<Omit<ItemMarketStats, 'itemId'>>
): MarketStateComponent {
  const stats = component.itemStats.get(itemId) || {
    itemId,
    totalSupply: 0,
    recentSales: 0,
    recentPurchases: 0,
    averagePrice: 0,
    priceHistory: [],
    lastUpdated: 0,
  };

  const updatedStats: ItemMarketStats = {
    ...stats,
    ...updates,
  };

  const newItemStats = new Map(component.itemStats);
  newItemStats.set(itemId, updatedStats);

  return {
    ...component,
    itemStats: newItemStats,
  };
}
