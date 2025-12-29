import type { Component } from '../ecs/Component.js';

/**
 * Tracks gathering statistics for an agent - what they've collected today and overall.
 */
export interface GatheringStatsComponent extends Component {
  type: 'gathering_stats';
  /** Day number when today's stats were last reset */
  lastResetDay: number;
  /** Items gathered today (resets daily) - itemId -> count */
  today: Record<string, number>;
  /** Items gathered all-time - itemId -> count */
  allTime: Record<string, number>;
  /** Items deposited today - itemId -> count */
  depositedToday: Record<string, number>;
  /** Items deposited all-time - itemId -> count */
  depositedAllTime: Record<string, number>;
}

/**
 * Create a new gathering stats component.
 */
export function createGatheringStatsComponent(): GatheringStatsComponent {
  return {
    type: 'gathering_stats',
    version: 1,
    lastResetDay: 0,
    today: {},
    allTime: {},
    depositedToday: {},
    depositedAllTime: {},
  };
}

/**
 * Record that an item was gathered.
 */
export function recordGathered(
  stats: GatheringStatsComponent,
  itemId: string,
  amount: number,
  currentDay: number
): void {
  // Reset today's stats if it's a new day
  if (currentDay > stats.lastResetDay) {
    stats.today = {};
    stats.depositedToday = {};
    stats.lastResetDay = currentDay;
  }

  // Update counts
  stats.today[itemId] = (stats.today[itemId] || 0) + amount;
  stats.allTime[itemId] = (stats.allTime[itemId] || 0) + amount;
}

/**
 * Record that items were deposited to storage.
 */
export function recordDeposited(
  stats: GatheringStatsComponent,
  itemId: string,
  amount: number,
  currentDay: number
): void {
  // Reset today's stats if it's a new day
  if (currentDay > stats.lastResetDay) {
    stats.today = {};
    stats.depositedToday = {};
    stats.lastResetDay = currentDay;
  }

  // Update counts
  stats.depositedToday[itemId] = (stats.depositedToday[itemId] || 0) + amount;
  stats.depositedAllTime[itemId] = (stats.depositedAllTime[itemId] || 0) + amount;
}

/**
 * Get total items gathered today.
 */
export function getTotalGatheredToday(stats: GatheringStatsComponent): number {
  return Object.values(stats.today).reduce((sum, count) => sum + count, 0);
}

/**
 * Get total items gathered all-time.
 */
export function getTotalGatheredAllTime(stats: GatheringStatsComponent): number {
  return Object.values(stats.allTime).reduce((sum, count) => sum + count, 0);
}
