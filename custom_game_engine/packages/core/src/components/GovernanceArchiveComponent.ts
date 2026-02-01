/**
 * GovernanceArchiveComponent - Long-term archival storage for governance history
 *
 * Per Conservation of Game Matter: Never delete governance history.
 * Instead, archive older entries to a compact format for long-term storage.
 *
 * Design principles:
 * - Entries archived in batches (not deleted)
 * - Compressed format for older entries
 * - Searchable via summary indices
 * - Supports time-travel queries across archived data
 */

import type { Component } from '../ecs/Component.js';
import type { PoliticalTier } from '../governance/types.js';
import type {
  GovernanceActionType,
  GovernanceOutcome,
  GovernanceAuditEntry,
} from './GovernanceHistoryComponent.js';

/**
 * Summary statistics for an archived batch
 */
export interface ArchiveBatchSummary {
  /** Unique batch ID */
  batchId: string;

  /** First tick in this batch */
  startTick: number;

  /** Last tick in this batch */
  endTick: number;

  /** Number of entries in batch */
  entryCount: number;

  /** Action type breakdown */
  actionTypeCounts: Record<GovernanceActionType, number>;

  /** Tier breakdown */
  tierCounts: Record<PoliticalTier, number>;

  /** Outcome breakdown */
  outcomeCounts: Record<GovernanceOutcome, number>;

  /** Most active agents in this period */
  topAgents: Array<{ agentId: string; count: number }>;

  /** Key decisions/events in this period (high-importance entries) */
  keyEvents: string[];
}

/**
 * Archived entry in compact format
 */
export interface ArchivedGovernanceEntry {
  /** Original entry ID */
  id: string;

  /** Abbreviated action type */
  a: GovernanceActionType;

  /** Tier (first letter) */
  t: string;

  /** Tick */
  k: number;

  /** Source agent ID (if present) */
  s?: string;

  /** Outcome (first letter) */
  o: string;

  /** Description (truncated to 100 chars) */
  d: string;

  /** Important data fields only */
  x?: Record<string, unknown>;
}

/**
 * Archived batch containing compressed entries
 */
export interface ArchiveBatch {
  /** Batch metadata */
  summary: ArchiveBatchSummary;

  /** Compressed entries */
  entries: ArchivedGovernanceEntry[];

  /** Archive timestamp */
  archivedAt: number;

  /** Archive version for migration */
  version: number;
}

/**
 * GovernanceArchiveComponent - Long-term storage for governance history
 *
 * Attach to the same entity as GovernanceHistoryComponent (governance singleton)
 */
export interface GovernanceArchiveComponent extends Component {
  type: 'governance_archive';
  version: 1;

  /** Archived batches (chronological order) */
  batches: ArchiveBatch[];

  /** Total archived entry count */
  totalArchivedEntries: number;

  /** Total batches */
  totalBatches: number;

  /** First archived tick */
  firstArchivedTick: number;

  /** Last archived tick */
  lastArchivedTick: number;

  /** Configuration */
  config: {
    /** Entries per batch (default: 1000) */
    entriesPerBatch: number;

    /** Maximum batches to keep in memory (older batches serialized to persistence) */
    maxBatchesInMemory: number;

    /** Whether to include full data in archives (false = summary only) */
    includeFullData: boolean;
  };

  /** Index for fast lookups */
  index: {
    /** Batch ID by tick range */
    batchByTick: Map<number, string>; // startTick → batchId

    /** Batch IDs by action type */
    batchesByActionType: Map<GovernanceActionType, string[]>;

    /** Batch IDs by tier */
    batchesByTier: Map<PoliticalTier, string[]>;
  };
}

/**
 * Create a new GovernanceArchiveComponent
 */
export function createGovernanceArchiveComponent(
  entriesPerBatch: number = 1000,
  maxBatchesInMemory: number = 100
): GovernanceArchiveComponent {
  return {
    type: 'governance_archive',
    version: 1,
    batches: [],
    totalArchivedEntries: 0,
    totalBatches: 0,
    firstArchivedTick: 0,
    lastArchivedTick: 0,
    config: {
      entriesPerBatch,
      maxBatchesInMemory,
      includeFullData: false, // Summary mode by default
    },
    index: {
      batchByTick: new Map(),
      batchesByActionType: new Map(),
      batchesByTier: new Map(),
    },
  };
}

/**
 * Compress a full audit entry to archived format
 */
export function compressEntry(entry: GovernanceAuditEntry): ArchivedGovernanceEntry {
  const compressed: ArchivedGovernanceEntry = {
    id: entry.id,
    a: entry.actionType,
    t: entry.tier.charAt(0), // First letter of tier
    k: entry.tick,
    o: entry.outcome.charAt(0), // First letter of outcome
    d: entry.description.substring(0, 100), // Truncate to 100 chars
  };

  if (entry.sourceAgentId) {
    compressed.s = entry.sourceAgentId;
  }

  // Include only critical data fields
  if (entry.data) {
    const criticalFields = ['directiveId', 'proposalId', 'crisisId', 'lawName'];
    const importantData: Record<string, unknown> = {};

    for (const field of criticalFields) {
      if (field in entry.data) {
        importantData[field] = entry.data[field];
      }
    }

    if (Object.keys(importantData).length > 0) {
      compressed.x = importantData;
    }
  }

  return compressed;
}

/**
 * Archive a batch of entries from GovernanceHistoryComponent
 */
export function archiveEntries(
  archive: GovernanceArchiveComponent,
  entries: GovernanceAuditEntry[],
  currentTick: number
): ArchiveBatch {
  if (entries.length === 0) {
    throw new Error('Cannot archive empty entry list');
  }

  // Calculate summary statistics
  const actionTypeCounts: Record<string, number> = {};
  const tierCounts: Record<string, number> = {};
  const outcomeCounts: Record<string, number> = {};
  const agentCounts = new Map<string, number>();
  const keyEvents: string[] = [];

  let startTick = Infinity;
  let endTick = -Infinity;

  for (const entry of entries) {
    // Action type counts
    actionTypeCounts[entry.actionType] = (actionTypeCounts[entry.actionType] || 0) + 1;

    // Tier counts
    tierCounts[entry.tier] = (tierCounts[entry.tier] || 0) + 1;

    // Outcome counts
    outcomeCounts[entry.outcome] = (outcomeCounts[entry.outcome] || 0) + 1;

    // Agent activity
    if (entry.sourceAgentId) {
      agentCounts.set(entry.sourceAgentId, (agentCounts.get(entry.sourceAgentId) || 0) + 1);
    }

    // Tick range
    if (entry.tick < startTick) startTick = entry.tick;
    if (entry.tick > endTick) endTick = entry.tick;

    // Identify key events (crisis, policy enacted, leader changes)
    const keyActionTypes: GovernanceActionType[] = [
      'crisis_escalated', 'crisis_resolved', 'policy_enacted',
      'leader_appointed', 'leader_removed', 'election_held'
    ];
    if (keyActionTypes.includes(entry.actionType)) {
      keyEvents.push(entry.description);
    }
  }

  // Get top agents
  const topAgents = Array.from(agentCounts.entries())
    .map(([agentId, count]) => ({ agentId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Generate batch ID
  const batchId = `batch-${startTick}-${endTick}`;

  // Create summary
  const summary: ArchiveBatchSummary = {
    batchId,
    startTick,
    endTick,
    entryCount: entries.length,
    actionTypeCounts: actionTypeCounts as Record<GovernanceActionType, number>,
    tierCounts: tierCounts as Record<PoliticalTier, number>,
    outcomeCounts: outcomeCounts as Record<GovernanceOutcome, number>,
    topAgents,
    keyEvents: keyEvents.slice(0, 10), // Keep top 10 key events
  };

  // Compress entries
  const compressedEntries = entries.map(compressEntry);

  // Create batch
  const batch: ArchiveBatch = {
    summary,
    entries: compressedEntries,
    archivedAt: currentTick,
    version: 1,
  };

  // Add to archive
  archive.batches.push(batch);
  archive.totalArchivedEntries += entries.length;
  archive.totalBatches++;

  // Update tick range
  if (archive.firstArchivedTick === 0 || startTick < archive.firstArchivedTick) {
    archive.firstArchivedTick = startTick;
  }
  if (endTick > archive.lastArchivedTick) {
    archive.lastArchivedTick = endTick;
  }

  // Update indices
  archive.index.batchByTick.set(startTick, batchId);

  for (const actionType of Object.keys(actionTypeCounts) as GovernanceActionType[]) {
    if (!archive.index.batchesByActionType.has(actionType)) {
      archive.index.batchesByActionType.set(actionType, []);
    }
    archive.index.batchesByActionType.get(actionType)!.push(batchId);
  }

  for (const tier of Object.keys(tierCounts) as PoliticalTier[]) {
    if (!archive.index.batchesByTier.has(tier)) {
      archive.index.batchesByTier.set(tier, []);
    }
    archive.index.batchesByTier.get(tier)!.push(batchId);
  }

  // Trim batches if over memory limit
  while (archive.batches.length > archive.config.maxBatchesInMemory) {
    // Remove oldest batch (it should be persisted to storage separately)
    archive.batches.shift();
  }

  return batch;
}

/**
 * Query archived batches by tick range
 */
export function queryArchiveBatches(
  archive: GovernanceArchiveComponent,
  options: {
    startTick?: number;
    endTick?: number;
    actionTypes?: GovernanceActionType[];
    tiers?: PoliticalTier[];
  }
): ArchiveBatch[] {
  let candidates = archive.batches;

  // Filter by tick range
  if (options.startTick !== undefined || options.endTick !== undefined) {
    const start = options.startTick ?? -Infinity;
    const end = options.endTick ?? Infinity;

    candidates = candidates.filter(
      batch => batch.summary.endTick >= start && batch.summary.startTick <= end
    );
  }

  // Filter by action types
  if (options.actionTypes && options.actionTypes.length > 0) {
    candidates = candidates.filter(batch =>
      options.actionTypes!.some(type => batch.summary.actionTypeCounts[type] > 0)
    );
  }

  // Filter by tiers
  if (options.tiers && options.tiers.length > 0) {
    candidates = candidates.filter(batch =>
      options.tiers!.some(tier => batch.summary.tierCounts[tier] > 0)
    );
  }

  return candidates;
}

/**
 * Get archive statistics
 */
export function getArchiveStatistics(archive: GovernanceArchiveComponent): {
  totalEntries: number;
  totalBatches: number;
  tickRange: { start: number; end: number };
  compressionRatio: number;
  memoryBatches: number;
} {
  return {
    totalEntries: archive.totalArchivedEntries,
    totalBatches: archive.totalBatches,
    tickRange: {
      start: archive.firstArchivedTick,
      end: archive.lastArchivedTick,
    },
    // Estimate compression ratio (full entry ~500 bytes, compressed ~100 bytes)
    compressionRatio: 0.2,
    memoryBatches: archive.batches.length,
  };
}
