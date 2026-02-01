/**
 * GovernanceArchivalSystem - Archives old governance history entries to long-term storage
 *
 * Per Conservation of Game Matter: Never delete governance history.
 * This system periodically moves old entries from GovernanceHistoryComponent
 * to GovernanceArchiveComponent for long-term storage.
 *
 * Integration with persistence layer:
 * - Archives are serialized as part of normal save/load
 * - Older batches can be offloaded to IndexedDB
 * - Supports time-travel queries across archived data
 *
 * Priority: 997 (utility system, runs late)
 * Throttle: 6000 ticks (5 minutes) - archival is not time-critical
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  GovernanceHistoryComponent,
  GovernanceAuditEntry,
} from '../components/GovernanceHistoryComponent.js';
import {
  extractEntriesForArchival,
  getGovernanceStatistics,
} from '../components/GovernanceHistoryComponent.js';
import type { GovernanceArchiveComponent, ArchiveBatch } from '../components/GovernanceArchiveComponent.js';
import {
  archiveEntries,
  createGovernanceArchiveComponent,
  getArchiveStatistics,
} from '../components/GovernanceArchiveComponent.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Archival configuration
 */
interface ArchivalConfig {
  /** Entries to preserve in active history (default: 5000) */
  preserveRecentEntries: number;

  /** Minimum entries before triggering archival (default: 8000) */
  archivalThreshold: number;

  /** Entries per archive batch (default: 1000) */
  entriesPerBatch: number;

  /** Maximum batches to keep in memory (default: 100) */
  maxBatchesInMemory: number;
}

/**
 * Archival event data
 */
interface ArchivalEventData {
  batchId: string;
  entriesArchived: number;
  tickRange: { start: number; end: number };
  totalArchivedEntries: number;
  tick: number;
}

// ============================================================================
// System
// ============================================================================

export class GovernanceArchivalSystem extends BaseSystem {
  public readonly id: SystemId = 'governance_archival' as SystemId;
  public readonly priority: number = 997;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.GovernanceHistory];
  public readonly activationComponents = ['governance_history'] as const;
  public readonly metadata = {
    category: 'utility' as const,
    description: 'Archives old governance history entries to long-term storage',
    dependsOn: [],
    writesComponents: [CT.GovernanceHistory, CT.GovernanceArchive] as const,
  } as const;

  // Update interval: 6000 ticks = 5 minutes
  protected readonly throttleInterval = 6000;

  // Configuration
  private config: ArchivalConfig = {
    preserveRecentEntries: 5000,
    archivalThreshold: 8000,
    entriesPerBatch: 1000,
    maxBatchesInMemory: 100,
  };

  // Track last archival tick
  private lastArchivalTick: number = 0;

  // ========================================================================
  // Main Update Loop
  // ========================================================================

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Skip if not time for archival check
    if (tick - this.lastArchivalTick < this.throttleInterval) {
      return;
    }
    this.lastArchivalTick = tick;

    // Process each governance history entity
    for (const entity of ctx.activeEntities) {
      const history = entity.getComponent<GovernanceHistoryComponent>(CT.GovernanceHistory);
      if (!history) continue;

      // Check if archival is needed
      if (history.entries.length >= this.config.archivalThreshold) {
        this.performArchival(ctx.world, entity as EntityImpl, history, tick);
      }
    }
  }

  // ========================================================================
  // Archival Process
  // ========================================================================

  /**
   * Perform archival of old governance history entries
   */
  private performArchival(
    world: World,
    entity: EntityImpl,
    history: GovernanceHistoryComponent,
    tick: number
  ): void {
    // Get or create archive component
    let archive = entity.getComponent<GovernanceArchiveComponent>(CT.GovernanceArchive);
    if (!archive) {
      archive = createGovernanceArchiveComponent(
        this.config.entriesPerBatch,
        this.config.maxBatchesInMemory
      );
      entity.addComponent(archive);
      // Re-fetch after adding
      archive = entity.getComponent<GovernanceArchiveComponent>(CT.GovernanceArchive);
      if (!archive) {
        console.error('[GovernanceArchival] Failed to create archive component');
        return;
      }
    }

    // Extract entries for archival
    const toArchive = extractEntriesForArchival(history, this.config.preserveRecentEntries);

    if (toArchive.length === 0) {
      return; // Nothing to archive
    }

    // Archive in batches
    let archivedCount = 0;
    for (let i = 0; i < toArchive.length; i += this.config.entriesPerBatch) {
      const batch = toArchive.slice(i, i + this.config.entriesPerBatch);
      const archiveBatch = archiveEntries(archive, batch, tick);

      archivedCount += batch.length;

      // Emit archival event for each batch
      world.eventBus.emit({
        type: 'governance:history_archived',
        source: entity.id,
        data: {
          batchId: archiveBatch.summary.batchId,
          entriesArchived: batch.length,
          tickRange: {
            start: archiveBatch.summary.startTick,
            end: archiveBatch.summary.endTick,
          },
          totalArchivedEntries: archive.totalArchivedEntries,
          tick,
        } as ArchivalEventData,
      });
    }

    // Update last archival tick in history
    history.lastArchivalTick = tick;

    // Log archival summary
    console.log(
      `[GovernanceArchival] Archived ${archivedCount} entries from entity ${entity.id}. ` +
      `Total archived: ${archive.totalArchivedEntries}, Remaining in memory: ${history.entries.length}`
    );
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Configure archival settings
   */
  public configure(config: Partial<ArchivalConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Force immediate archival (bypasses throttle)
   */
  public forceArchival(world: World): number {
    let totalArchived = 0;

    const historyEntities = world.query().with(CT.GovernanceHistory).executeEntities();

    for (const entity of historyEntities) {
      const history = entity.getComponent<GovernanceHistoryComponent>(CT.GovernanceHistory);
      if (!history) continue;

      if (history.entries.length >= this.config.preserveRecentEntries) {
        const beforeCount = history.entries.length;
        this.performArchival(world, entity as EntityImpl, history, world.tick);
        totalArchived += beforeCount - history.entries.length;
      }
    }

    return totalArchived;
  }

  /**
   * Get archival statistics for all governance entities
   */
  public getArchivalStats(world: World): {
    entityId: string;
    historyStats: ReturnType<typeof getGovernanceStatistics>;
    archiveStats: ReturnType<typeof getArchiveStatistics> | null;
  }[] {
    const stats: {
      entityId: string;
      historyStats: ReturnType<typeof getGovernanceStatistics>;
      archiveStats: ReturnType<typeof getArchiveStatistics> | null;
    }[] = [];

    const historyEntities = world.query().with(CT.GovernanceHistory).executeEntities();

    for (const entity of historyEntities) {
      const history = entity.getComponent<GovernanceHistoryComponent>(CT.GovernanceHistory);
      if (!history) continue;

      const archive = entity.getComponent<GovernanceArchiveComponent>(CT.GovernanceArchive);

      stats.push({
        entityId: entity.id,
        historyStats: getGovernanceStatistics(history),
        archiveStats: archive ? getArchiveStatistics(archive) : null,
      });
    }

    return stats;
  }

  /**
   * Query archived history for time-travel support
   */
  public queryArchivedHistory(
    world: World,
    options: {
      startTick?: number;
      endTick?: number;
      entityId?: string;
    }
  ): ArchiveBatch[] {
    const results: ArchiveBatch[] = [];

    let entities = world.query().with(CT.GovernanceArchive).executeEntities();

    if (options.entityId) {
      entities = entities.filter(e => e.id === options.entityId);
    }

    for (const entity of entities) {
      const archive = entity.getComponent<GovernanceArchiveComponent>(CT.GovernanceArchive);
      if (!archive) continue;

      // Filter batches by tick range
      for (const batch of archive.batches) {
        const matchesStart = options.startTick === undefined ||
          batch.summary.endTick >= options.startTick;
        const matchesEnd = options.endTick === undefined ||
          batch.summary.startTick <= options.endTick;

        if (matchesStart && matchesEnd) {
          results.push(batch);
        }
      }
    }

    return results;
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: GovernanceArchivalSystem | null = null;

export function getGovernanceArchivalSystem(): GovernanceArchivalSystem {
  if (!systemInstance) {
    systemInstance = new GovernanceArchivalSystem();
  }
  return systemInstance;
}
