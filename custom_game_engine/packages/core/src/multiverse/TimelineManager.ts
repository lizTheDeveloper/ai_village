/**
 * TimelineManager - Maintains a timeline of save states for browsing and forking
 *
 * Key features:
 * - Automatic periodic snapshots with VARIABLE INTERVALS:
 *   - Early universe (first 10 min): every 1 minute
 *   - Mid universe (10-60 min): every 5 minutes
 *   - Mature universe (60+ min): every 10 minutes
 * - Canon event triggers (deaths, births, marriages auto-save)
 * - Manual snapshot creation
 * - Browse timeline history
 * - Fork from any point in the timeline (creates new universe, original untouched)
 * - Configurable retention policy (max snapshots, max age)
 */

import type { World } from '../ecs/World.js';
import { worldSerializer } from '../persistence/WorldSerializer.js';
import type { UniverseSnapshot } from '../persistence/types.js';
import type { CanonEventType } from '../metrics/CanonEventRecorder.js';

/**
 * Variable interval thresholds (in ticks at 20 TPS)
 */
export interface IntervalThreshold {
  /** Universe age threshold (in ticks) after which this interval applies */
  afterTicks: number;
  /** Snapshot interval (in ticks) */
  interval: number;
}

export interface TimelineConfig {
  /**
   * Variable intervals based on universe age.
   * Default: 1 min for first 10 min, 5 min for 10-60 min, 10 min after 60 min
   */
  intervalThresholds: IntervalThreshold[];

  /** Maximum number of snapshots to retain. Default: 100 */
  maxSnapshots: number;

  /** Maximum age of snapshots in milliseconds. Default: 24 hours */
  maxAge: number;

  /** Whether automatic snapshots are enabled. Default: true */
  autoSnapshot: boolean;

  /** Whether canon events trigger automatic saves. Default: true */
  canonEventSaves: boolean;
}

export interface TimelineEntry {
  /** Unique ID for this entry */
  id: string;

  /** Universe ID this entry belongs to */
  universeId: string;

  /** Tick when snapshot was created */
  tick: bigint;

  /** Real-world timestamp when created */
  createdAt: number;

  /** Number of entities at this point */
  entityCount: number;

  /** Optional label (for manual saves) */
  label?: string;

  /** Whether this is an auto-save or manual save */
  isAutoSave: boolean;

  /** If triggered by a canon event, the event type */
  canonEventType?: CanonEventType;

  /** If triggered by a canon event, description of the event */
  canonEventDescription?: string;

  /** The actual snapshot data (lazy loaded) */
  snapshot?: UniverseSnapshot;
}

/**
 * Default variable interval thresholds (at 20 TPS):
 * - First 10 minutes (12000 ticks): save every 1 minute (1200 ticks)
 * - 10-60 minutes (12000-72000 ticks): save every 5 minutes (6000 ticks)
 * - After 60 minutes (72000+ ticks): save every 10 minutes (12000 ticks)
 */
const DEFAULT_INTERVAL_THRESHOLDS: IntervalThreshold[] = [
  { afterTicks: 0, interval: 1200 },       // 0-10 min: every 1 min
  { afterTicks: 12000, interval: 6000 },   // 10-60 min: every 5 min
  { afterTicks: 72000, interval: 12000 },  // 60+ min: every 10 min
];

export class TimelineManager {
  private config: TimelineConfig;
  private timelines: Map<string, TimelineEntry[]> = new Map();
  private lastSnapshotTick: Map<string, bigint> = new Map();
  private snapshotInProgress: Set<string> = new Set();

  /** Map of universe IDs to their attached worlds */
  private attachedWorlds: Map<string, World> = new Map();

  constructor(config?: Partial<TimelineConfig>) {
    this.config = {
      intervalThresholds: config?.intervalThresholds ?? DEFAULT_INTERVAL_THRESHOLDS,
      maxSnapshots: config?.maxSnapshots ?? 100,
      maxAge: config?.maxAge ?? 24 * 60 * 60 * 1000, // 24 hours
      autoSnapshot: config?.autoSnapshot ?? true,
      canonEventSaves: config?.canonEventSaves ?? true,
    };

  }

  /**
   * Attach to a world's event bus to listen for canon events.
   * This enables automatic snapshots on births, deaths, marriages, etc.
   */
  attachToWorld(universeId: string, world: World): void {
    if (this.attachedWorlds.has(universeId)) {
      return;
    }

    this.attachedWorlds.set(universeId, world);

    // Subscribe to canon events
    const eventBus = world.eventBus;

    // Death events
    eventBus.subscribe('agent:died', (event) => {
      const data = event.data as { entityId: string; name: string; causeOfDeath: string };
      this.onCanonEvent(
        universeId,
        world,
        BigInt(world.tick),
        'agent:died',
        `${data.name} died: ${data.causeOfDeath}`
      ).catch(err => console.error('[TimelineManager] Failed to save on death:', err));
    });

    // Birth events
    eventBus.subscribe('agent:birth', (event) => {
      const data = event.data as { agentId: string; name: string; generation: number };
      this.onCanonEvent(
        universeId,
        world,
        BigInt(world.tick),
        'agent:born',
        `${data.name} was born (generation ${data.generation})`
      ).catch(err => console.error('[TimelineManager] Failed to save on birth:', err));
    });

    // Soul creation events
    eventBus.subscribe('soul:ceremony_complete', (event) => {
      const data = event.data as { soulId: string; purpose: string };
      this.onCanonEvent(
        universeId,
        world,
        BigInt(world.tick),
        'soul:created',
        `Soul created: ${data.purpose}`
      ).catch(err => console.error('[TimelineManager] Failed to save on soul creation:', err));
    });

    // Time milestone events
    eventBus.subscribe('time:day_changed', (event) => {
      const data = event.data as { day: number };
      // Check for significant milestones (30, 90, 180, 365 days)
      const milestones = [30, 90, 180, 365, 730, 1095];
      if (milestones.includes(data.day)) {
        this.onCanonEvent(
          universeId,
          world,
          BigInt(world.tick),
          'time:milestone',
          `Day ${data.day} milestone reached`
        ).catch(err => console.error('[TimelineManager] Failed to save on milestone:', err));
      }
    });

  }

  /**
   * Detach from a world's event bus.
   */
  detachFromWorld(universeId: string): void {
    this.attachedWorlds.delete(universeId);
  }

  /**
   * Get the current snapshot interval based on universe age.
   * Intervals increase as the universe matures.
   */
  private getCurrentInterval(currentTick: bigint): number {
    const tickNum = Number(currentTick);
    let interval = this.config.intervalThresholds[0]?.interval ?? 6000;

    // Find the appropriate interval for the current tick
    for (const threshold of this.config.intervalThresholds) {
      if (tickNum >= threshold.afterTicks) {
        interval = threshold.interval;
      } else {
        break;
      }
    }

    return interval;
  }

  /**
   * Update the timeline for a universe (called each tick).
   * Creates automatic snapshots based on variable intervals that increase over time.
   */
  async tick(universeId: string, world: World, currentTick: bigint): Promise<void> {
    if (!this.config.autoSnapshot) {
      return;
    }

    // Don't create overlapping snapshots
    if (this.snapshotInProgress.has(universeId)) {
      return;
    }

    const lastTick = this.lastSnapshotTick.get(universeId) ?? 0n;
    const ticksSinceLastSnapshot = currentTick - lastTick;

    // Get the current interval based on universe age
    const currentInterval = this.getCurrentInterval(currentTick);

    if (ticksSinceLastSnapshot >= BigInt(currentInterval)) {
      await this.createSnapshot(universeId, world, currentTick, true);
    }
  }

  /**
   * Trigger a snapshot due to a canon event (death, birth, marriage, etc.).
   * Canon events always create a snapshot regardless of the auto-save interval.
   */
  async onCanonEvent(
    universeId: string,
    world: World,
    currentTick: bigint,
    eventType: CanonEventType,
    eventDescription: string
  ): Promise<TimelineEntry | null> {
    if (!this.config.canonEventSaves) {
      return null;
    }

    // Don't create overlapping snapshots
    if (this.snapshotInProgress.has(universeId)) {
      return null;
    }


    return this.createSnapshot(
      universeId,
      world,
      currentTick,
      true, // is auto-save
      eventDescription, // label
      eventType,
      eventDescription
    );
  }

  /**
   * Create a snapshot of the current world state.
   *
   * @param universeId - The universe to snapshot
   * @param world - The world to serialize
   * @param tick - Current tick
   * @param isAutoSave - Whether this is an auto-save or manual save
   * @param label - Optional label for the snapshot
   * @param canonEventType - If triggered by a canon event, the event type
   * @param canonEventDescription - If triggered by a canon event, description
   */
  async createSnapshot(
    universeId: string,
    world: World,
    tick: bigint,
    isAutoSave: boolean = false,
    label?: string,
    canonEventType?: CanonEventType,
    canonEventDescription?: string
  ): Promise<TimelineEntry> {
    this.snapshotInProgress.add(universeId);

    try {
      // Create the snapshot
      const timelineSnapshot = await worldSerializer.createTimelineSnapshot(
        world,
        universeId,
        tick
      );

      const entry: TimelineEntry = {
        id: `${universeId}_${tick}_${Date.now()}`,
        universeId,
        tick,
        createdAt: Date.now(),
        entityCount: timelineSnapshot.entityCount,
        label,
        isAutoSave,
        canonEventType,
        canonEventDescription,
        snapshot: timelineSnapshot.snapshot,
      };

      // Add to timeline
      let timeline = this.timelines.get(universeId);
      if (!timeline) {
        timeline = [];
        this.timelines.set(universeId, timeline);
      }
      timeline.push(entry);

      // Update last snapshot tick
      this.lastSnapshotTick.set(universeId, tick);

      // Prune old snapshots
      this.pruneTimeline(universeId);

      return entry;
    } finally {
      this.snapshotInProgress.delete(universeId);
    }
  }

  /**
   * Get the timeline for a universe.
   */
  getTimeline(universeId: string): readonly TimelineEntry[] {
    return this.timelines.get(universeId) ?? [];
  }

  /**
   * Get all timelines.
   */
  getAllTimelines(): ReadonlyMap<string, readonly TimelineEntry[]> {
    return this.timelines as ReadonlyMap<string, readonly TimelineEntry[]>;
  }

  /**
   * Get a specific snapshot by entry ID.
   */
  getSnapshot(entryId: string): TimelineEntry | undefined {
    for (const timeline of this.timelines.values()) {
      const entry = timeline.find(e => e.id === entryId);
      if (entry) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Get the most recent snapshot for a universe.
   */
  getLatestSnapshot(universeId: string): TimelineEntry | undefined {
    const timeline = this.timelines.get(universeId);
    if (!timeline || timeline.length === 0) {
      return undefined;
    }
    return timeline[timeline.length - 1];
  }

  /**
   * Find the closest snapshot to a given tick.
   */
  findSnapshotAtTick(universeId: string, targetTick: bigint): TimelineEntry | undefined {
    const timeline = this.timelines.get(universeId);
    if (!timeline || timeline.length === 0) {
      return undefined;
    }

    // Find the closest snapshot at or before the target tick
    let closest: TimelineEntry | undefined;
    for (const entry of timeline) {
      if (entry.tick <= targetTick) {
        closest = entry;
      } else {
        break;
      }
    }

    return closest;
  }

  /**
   * Delete a specific snapshot.
   */
  deleteSnapshot(entryId: string): boolean {
    for (const [_universeId, timeline] of this.timelines.entries()) {
      const index = timeline.findIndex(e => e.id === entryId);
      if (index !== -1) {
        timeline.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Clear all snapshots for a universe.
   */
  clearTimeline(universeId: string): void {
    this.timelines.delete(universeId);
    this.lastSnapshotTick.delete(universeId);
  }

  /**
   * Get timeline statistics.
   */
  getStats(universeId: string): {
    snapshotCount: number;
    oldestTick: bigint | null;
    newestTick: bigint | null;
    totalSize: number;
  } {
    const timeline = this.timelines.get(universeId);
    if (!timeline || timeline.length === 0) {
      return {
        snapshotCount: 0,
        oldestTick: null,
        newestTick: null,
        totalSize: 0,
      };
    }

    return {
      snapshotCount: timeline.length,
      oldestTick: timeline[0]!.tick,
      newestTick: timeline[timeline.length - 1]!.tick,
      totalSize: timeline.reduce((sum, e) => sum + (e.entityCount * 500), 0), // Rough estimate
    };
  }

  /**
   * Check if a snapshot should be preserved (never pruned).
   * Manual saves and canon event saves are always preserved.
   */
  private shouldPreserve(entry: TimelineEntry): boolean {
    // Keep manual saves
    if (!entry.isAutoSave) {
      return true;
    }
    // Keep canon event saves
    if (entry.canonEventType) {
      return true;
    }
    return false;
  }

  /**
   * Prune old snapshots based on retention policy.
   * Canon event snapshots and manual saves are never pruned.
   */
  private pruneTimeline(universeId: string): void {
    const timeline = this.timelines.get(universeId);
    if (!timeline) {
      return;
    }

    const now = Date.now();
    let pruned = 0;

    // Remove snapshots older than maxAge (keep manual saves and canon events)
    const filtered = timeline.filter(entry => {
      if (this.shouldPreserve(entry)) {
        return true;
      }
      const age = now - entry.createdAt;
      if (age > this.config.maxAge) {
        pruned++;
        return false;
      }
      return true;
    });

    // If still over maxSnapshots, remove oldest non-preserved auto-saves
    while (filtered.length > this.config.maxSnapshots) {
      const prunableIndex = filtered.findIndex(e => !this.shouldPreserve(e));
      if (prunableIndex !== -1) {
        filtered.splice(prunableIndex, 1);
        pruned++;
      } else {
        break; // Only preserved saves left
      }
    }

    if (pruned > 0) {
      this.timelines.set(universeId, filtered);
    }
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<TimelineConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<TimelineConfig> {
    return { ...this.config };
  }
}

// Global singleton
export const timelineManager = new TimelineManager();
