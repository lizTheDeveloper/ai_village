/**
 * SnapshotDecayPolicy - Progressive snapshot thinning over time
 *
 * When multiple snapshots exist for the same day:
 * 1. Day 0 (current day): Keep all snapshots
 * 2. Day 1 (next day): Thin to every 2nd snapshot
 * 3. Day 3: Thin to every 4th snapshot
 * 4. Day 5+: Thin to just midnight + canon events
 *
 * This creates a natural "decay" where recent history has high resolution,
 * but older history gradually reduces to key moments only.
 *
 * Example timeline for Day 1 snapshots (assuming 6 snapshots that day):
 * - Day 1 (current): Keep all 6
 * - Day 2: Keep 3 (every 2nd)
 * - Day 4: Keep 2 (every 4th)
 * - Day 6+: Keep 1 (midnight only, plus any canon events)
 */

export interface SnapshotInfo {
  key: string;
  day: number;
  tick: number;
  timestamp: number;
  isCanonical: boolean;
  isMidnight: boolean;
  universeId: string;
}

export interface DecayConfig {
  /** Days after which to thin to every 2nd snapshot */
  thinToHalfAfterDays: number;
  /** Days after which to thin to every 4th snapshot */
  thinToQuarterAfterDays: number;
  /** Days after which to keep only midnight + canon events */
  thinToMidnightAfterDays: number;
  /** Maximum snapshots to keep per day before forced thinning */
  maxSnapshotsPerDay: number;
}

const DEFAULT_CONFIG: DecayConfig = {
  thinToHalfAfterDays: 1,     // Day 1: thin to every 2nd
  thinToQuarterAfterDays: 3,  // Day 3: thin to every 4th
  thinToMidnightAfterDays: 5, // Day 5: just midnight + canon events
  maxSnapshotsPerDay: 12,
};

export class SnapshotDecayPolicy {
  private config: DecayConfig;

  constructor(config: Partial<DecayConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Given all snapshots, determine which should be kept.
   * Groups by day and applies progressive thinning based on age.
   */
  filterSnapshots(
    snapshots: SnapshotInfo[],
    currentDay: number
  ): SnapshotInfo[] {
    // Group snapshots by day
    const byDay = new Map<number, SnapshotInfo[]>();
    for (const snapshot of snapshots) {
      const daySnapshots = byDay.get(snapshot.day) || [];
      daySnapshots.push(snapshot);
      byDay.set(snapshot.day, daySnapshots);
    }

    const kept: SnapshotInfo[] = [];

    for (const [day, daySnapshots] of byDay.entries()) {
      const age = currentDay - day;

      // Sort by timestamp (oldest first) for consistent thinning
      daySnapshots.sort((a, b) => a.timestamp - b.timestamp);

      const keptFromDay = this.thinDaySnapshots(daySnapshots, age);
      kept.push(...keptFromDay);
    }

    return kept;
  }

  /**
   * Get snapshots that should be deleted.
   */
  getSnapshotsToDelete(
    snapshots: SnapshotInfo[],
    currentDay: number
  ): SnapshotInfo[] {
    const keptKeys = new Set(
      this.filterSnapshots(snapshots, currentDay).map(s => s.key)
    );
    return snapshots.filter(s => !keptKeys.has(s.key));
  }

  /**
   * Thin snapshots for a specific day based on age.
   */
  private thinDaySnapshots(
    snapshots: SnapshotInfo[],
    age: number
  ): SnapshotInfo[] {
    // Always keep canonical events and midnight checkpoints
    const mandatory = snapshots.filter(s => s.isCanonical || s.isMidnight);
    const regular = snapshots.filter(s => !s.isCanonical && !s.isMidnight);

    // Determine thinning ratio based on age
    let keepRatio: number;
    if (age >= this.config.thinToMidnightAfterDays) {
      // Only keep mandatory snapshots (midnight + canon)
      keepRatio = 0;
    } else if (age >= this.config.thinToQuarterAfterDays) {
      // Keep every 4th
      keepRatio = 0.25;
    } else if (age >= this.config.thinToHalfAfterDays) {
      // Keep every 2nd
      keepRatio = 0.5;
    } else {
      // Keep all (but respect max limit)
      keepRatio = 1;
    }

    // Apply thinning to regular snapshots
    const keptRegular = this.thinByRatio(regular, keepRatio);

    // Combine mandatory and kept regular
    return [...mandatory, ...keptRegular];
  }

  /**
   * Thin an array of snapshots to keep approximately the given ratio.
   * Uses a deterministic selection based on position.
   */
  private thinByRatio(
    snapshots: SnapshotInfo[],
    ratio: number
  ): SnapshotInfo[] {
    if (ratio === 0) return [];
    if (ratio === 1) return snapshots;

    const kept: SnapshotInfo[] = [];
    const step = Math.ceil(1 / ratio);

    for (let i = 0; i < snapshots.length; i++) {
      // Keep if index is divisible by step (first, middle, etc.)
      if (i % step === 0) {
        const snapshot = snapshots[i];
        if (snapshot) kept.push(snapshot);
      }
    }

    return kept;
  }

  /**
   * Check if a new save would exceed the max snapshots for a day.
   * If so, suggest thinning immediately.
   */
  shouldThinImmediately(
    existingSnapshots: SnapshotInfo[],
    newSnapshotDay: number
  ): boolean {
    const daySnapshots = existingSnapshots.filter(s => s.day === newSnapshotDay);
    return daySnapshots.length >= this.config.maxSnapshotsPerDay;
  }

  /**
   * Get statistics about snapshot distribution.
   */
  getStats(snapshots: SnapshotInfo[]): {
    total: number;
    byDay: Map<number, number>;
    canonical: number;
    midnight: number;
    regular: number;
  } {
    const byDay = new Map<number, number>();
    let canonical = 0;
    let midnight = 0;
    let regular = 0;

    for (const snapshot of snapshots) {
      byDay.set(snapshot.day, (byDay.get(snapshot.day) || 0) + 1);
      if (snapshot.isCanonical) canonical++;
      else if (snapshot.isMidnight) midnight++;
      else regular++;
    }

    return {
      total: snapshots.length,
      byDay,
      canonical,
      midnight,
      regular,
    };
  }
}

/**
 * Convert a save key and metadata to SnapshotInfo.
 * Helper for integrating with existing save system.
 */
export function toSnapshotInfo(
  key: string,
  metadata: {
    name?: string;
    createdAt?: number;
    day?: number;
    tick?: number;
    type?: 'auto' | 'manual' | 'canonical';
    universeId?: string;
  }
): SnapshotInfo {
  const name = metadata.name || '';

  // Detect midnight checkpoint from name pattern
  const isMidnight = name.includes('Day ') && !name.includes('Autosave');

  // Extract day from name if not provided
  let day = metadata.day;
  if (day === undefined) {
    const dayMatch = name.match(/Day (\d+)/);
    if (dayMatch && dayMatch[1]) {
      day = parseInt(dayMatch[1], 10);
    } else {
      day = 0;
    }
  }

  return {
    key,
    day,
    tick: metadata.tick || 0,
    timestamp: metadata.createdAt || Date.now(),
    isCanonical: metadata.type === 'canonical',
    isMidnight,
    universeId: metadata.universeId || 'universe:main',
  };
}

// Singleton instance with default config
export const snapshotDecayPolicy = new SnapshotDecayPolicy();
