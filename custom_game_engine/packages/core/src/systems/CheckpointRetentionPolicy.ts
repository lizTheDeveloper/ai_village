/**
 * CheckpointRetentionPolicy - Smart checkpoint pruning for long-running games
 *
 * Retention strategy:
 * - **Last 10 days**: Always keep (rolling window for recent time travel)
 * - **Monthly summarization**: At day 30, 60, 90, etc., prune that month to canon events only
 * - **First 10 days**: Always keep (tutorial/early game reference)
 * - **Canon events**: Always keep (deaths, births, marriages, first achievements)
 * - **Monthly milestones**: Keep day 30, 60, 90, etc.
 *
 * Example: On day 95, you have:
 * - Days 1-10 (first 10)
 * - Days 30, 60, 90 (monthly milestones)
 * - Day 42 (first harvest - canon event)
 * - Day 57 (Alice died - canon event)
 * - Days 86-95 (last 10 days)
 */

import type { Checkpoint } from './AutoSaveSystem.js';
import type { CanonEvent } from './CanonEventDetector.js';

export interface RetentionRule {
  name: string;
  shouldKeep: (checkpoint: Checkpoint, currentDay: number, canonEvents: CanonEvent[]) => boolean;
  priority: number; // Higher priority rules checked first
}

export class CheckpointRetentionPolicy {
  private rules: RetentionRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Determine which checkpoints should be kept based on current day and canon events.
   */
  filterCheckpoints(
    checkpoints: Checkpoint[],
    currentDay: number,
    canonEvents: CanonEvent[]
  ): Checkpoint[] {
    return checkpoints.filter(checkpoint => {
      // Check each rule in priority order
      for (const rule of this.rules) {
        if (rule.shouldKeep(checkpoint, currentDay, canonEvents)) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Get checkpoints that should be deleted.
   */
  getCheckpointsToDelete(
    checkpoints: Checkpoint[],
    currentDay: number,
    canonEvents: CanonEvent[]
  ): Checkpoint[] {
    const kept = new Set(
      this.filterCheckpoints(checkpoints, currentDay, canonEvents).map(c => c.key)
    );
    return checkpoints.filter(c => !kept.has(c.key));
  }

  /**
   * Add a custom retention rule.
   */
  addRule(rule: RetentionRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Initialize default retention rules.
   */
  private initializeDefaultRules(): void {
    // Priority 100: Always keep canon events (deaths, births, marriages, first achievements)
    this.addRule({
      name: 'canon_events',
      priority: 100,
      shouldKeep: (checkpoint, _currentDay, canonEvents) => {
        return canonEvents.some(event => event.day === checkpoint.day);
      },
    });

    // Priority 90: Keep most recent 10 days (rolling window for time travel)
    this.addRule({
      name: 'recent_10_days',
      priority: 90,
      shouldKeep: (checkpoint, currentDay) => {
        return checkpoint.day > currentDay - 10;
      },
    });

    // Priority 80: Keep first 10 days forever (early game/tutorial reference)
    this.addRule({
      name: 'first_10_days',
      priority: 80,
      shouldKeep: (checkpoint) => {
        return checkpoint.day >= 1 && checkpoint.day <= 10;
      },
    });

    // Priority 70: Keep monthly milestones (30, 60, 90, etc.)
    this.addRule({
      name: 'monthly_milestones',
      priority: 70,
      shouldKeep: (checkpoint) => {
        return checkpoint.day % 30 === 0 && checkpoint.day > 0;
      },
    });

    // Priority 60: Keep yearly milestones (365, 730, etc.)
    this.addRule({
      name: 'yearly_milestones',
      priority: 60,
      shouldKeep: (checkpoint) => {
        return checkpoint.day % 365 === 0 && checkpoint.day > 0;
      },
    });
  }
}

/**
 * Analyze checkpoint retention and provide statistics.
 */
export function analyzeRetention(
  checkpoints: Checkpoint[],
  currentDay: number,
  canonEvents: CanonEvent[]
): {
  total: number;
  kept: number;
  deleted: number;
  keptByRule: Map<string, number>;
  estimatedSavings: string;
} {
  const policy = new CheckpointRetentionPolicy();
  const kept = policy.filterCheckpoints(checkpoints, currentDay, canonEvents);
  const deleted = policy.getCheckpointsToDelete(checkpoints, currentDay, canonEvents);

  // Count which rules are keeping checkpoints
  const keptByRule = new Map<string, number>();

  for (const checkpoint of kept) {
    // Find which rule kept this checkpoint (highest priority)
    for (const rule of (policy as any).rules) {
      if (rule.shouldKeep(checkpoint, currentDay, canonEvents)) {
        keptByRule.set(rule.name, (keptByRule.get(rule.name) || 0) + 1);
        break;
      }
    }
  }

  // Estimate storage savings (rough: ~1MB per checkpoint)
  const estimatedSavings = `${(deleted.length * 1).toFixed(1)} MB`;

  return {
    total: checkpoints.length,
    kept: kept.length,
    deleted: deleted.length,
    keptByRule,
    estimatedSavings,
  };
}

// Singleton instance
export const checkpointRetentionPolicy = new CheckpointRetentionPolicy();
