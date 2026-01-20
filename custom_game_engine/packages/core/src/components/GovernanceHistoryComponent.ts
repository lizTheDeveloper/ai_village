/**
 * GovernanceHistoryComponent - Audit trail for governance actions and decisions
 *
 * Maintains a complete audit log of all governance activities including:
 * - Directive delegation (empire → nation → province → city)
 * - Proposal voting outcomes
 * - Crisis escalations
 * - Governor decisions
 * - Policy changes
 *
 * Design principles:
 * - Immutable audit log (entries never modified, only appended)
 * - Supports querying by type, tier, agent, time range
 * - Enables transparency and debugging of governance systems
 * - Bounded log size with automatic archival of old entries
 */

import type { Component } from '../ecs/Component.js';
import type { PoliticalTier } from '../governance/DecisionProtocols.js';

/**
 * Types of governance actions that can be recorded
 */
export type GovernanceActionType =
  | 'directive_issued'       // Delegation from higher to lower tier
  | 'directive_received'     // Entity received a directive
  | 'directive_acknowledged' // Entity acknowledged directive
  | 'proposal_created'       // New proposal submitted
  | 'vote_cast'             // Vote cast on proposal
  | 'vote_concluded'        // Voting concluded with outcome
  | 'crisis_detected'       // Crisis first detected
  | 'crisis_escalated'      // Crisis escalated to higher tier
  | 'crisis_resolved'       // Crisis resolved
  | 'policy_enacted'        // New policy enacted
  | 'policy_revoked'        // Policy revoked
  | 'governor_decision'     // LLM-driven governor decision
  | 'election_held'         // Election conducted
  | 'leader_appointed'      // Leader appointed (non-election)
  | 'leader_removed';       // Leader removed from position

/**
 * Outcome of a governance action
 */
export type GovernanceOutcome =
  | 'pending'      // Action initiated but not complete
  | 'approved'     // Action approved/succeeded
  | 'rejected'     // Action rejected/failed
  | 'escalated'    // Action escalated to higher authority
  | 'delegated'    // Action delegated to lower authority
  | 'implemented'  // Action successfully implemented
  | 'cancelled';   // Action cancelled before completion

/**
 * Single governance audit entry
 */
export interface GovernanceAuditEntry {
  /** Unique entry ID */
  id: string;

  /** Type of governance action */
  actionType: GovernanceActionType;

  /** Political tier where action occurred */
  tier: PoliticalTier;

  /** Tick when action occurred */
  tick: number;

  /** Agent who initiated the action (if applicable) */
  sourceAgentId?: string;

  /** Target agent(s) affected by action (if applicable) */
  targetAgentIds?: string[];

  /** Target entity affected (village, province, nation, etc.) */
  targetEntityId?: string;

  /** Outcome of the action */
  outcome: GovernanceOutcome;

  /** Human-readable description of the action */
  description: string;

  /** Structured data specific to the action type */
  data: Record<string, unknown>;

  /** Related entries (for tracking chains of actions) */
  relatedEntryIds?: string[];

  /** Tags for categorization and filtering */
  tags?: string[];
}

/**
 * Query filter for searching audit history
 */
export interface GovernanceAuditQuery {
  /** Filter by action type */
  actionTypes?: GovernanceActionType[];

  /** Filter by political tier */
  tiers?: PoliticalTier[];

  /** Filter by source agent */
  sourceAgentId?: string;

  /** Filter by target agent */
  targetAgentId?: string;

  /** Filter by target entity */
  targetEntityId?: string;

  /** Filter by outcome */
  outcomes?: GovernanceOutcome[];

  /** Filter by tick range (inclusive) */
  tickRange?: { start: number; end: number };

  /** Filter by tags */
  tags?: string[];

  /** Maximum entries to return */
  limit?: number;

  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Statistics about governance activity
 */
export interface GovernanceStatistics {
  /** Total audit entries */
  totalEntries: number;

  /** Entries by action type */
  byActionType: Map<GovernanceActionType, number>;

  /** Entries by tier */
  byTier: Map<PoliticalTier, number>;

  /** Entries by outcome */
  byOutcome: Map<GovernanceOutcome, number>;

  /** Most active agents (by entry count) */
  mostActiveAgents: Array<{ agentId: string; count: number }>;

  /** First entry tick */
  firstEntryTick: number;

  /** Last entry tick */
  lastEntryTick: number;
}

/**
 * Governance history component - maintains audit trail for governance entities
 *
 * This component should be attached to:
 * - Village entities with village_governance
 * - Province entities with province_governance
 * - Nation entities with nation_governance
 * - Empire entities with empire_governance
 * - Federation entities with federation_governance
 * - Or a dedicated governance singleton entity for global history
 */
export interface GovernanceHistoryComponent extends Component {
  type: 'governance_history';
  version: 1;

  /** Audit log entries (chronological order) */
  entries: GovernanceAuditEntry[];

  /** Maximum entries before archival (default: 10000) */
  maxEntries: number;

  /** Number of entries archived to long-term storage */
  archivedCount: number;

  /** Last tick when entries were archived */
  lastArchivalTick: number;

  /** Index by action type for fast filtering */
  actionTypeIndex: Map<GovernanceActionType, string[]>; // actionType → entry IDs

  /** Index by source agent for fast filtering */
  sourceAgentIndex: Map<string, string[]>; // agentId → entry IDs

  /** Index by target agent for fast filtering */
  targetAgentIndex: Map<string, string[]>; // agentId → entry IDs

  /** Index by tick for temporal queries */
  tickIndex: Map<number, string[]>; // tick → entry IDs
}

/**
 * Create a new governance history component
 */
export function createGovernanceHistoryComponent(
  maxEntries: number = 10000
): GovernanceHistoryComponent {
  return {
    type: 'governance_history',
    version: 1,
    entries: [],
    maxEntries,
    archivedCount: 0,
    lastArchivalTick: 0,
    actionTypeIndex: new Map(),
    sourceAgentIndex: new Map(),
    targetAgentIndex: new Map(),
    tickIndex: new Map(),
  };
}

/**
 * Add an audit entry to governance history
 *
 * Automatically maintains indexes for fast querying
 */
export function addGovernanceAuditEntry(
  component: GovernanceHistoryComponent,
  entry: GovernanceAuditEntry
): void {
  // Add to main log
  component.entries.push(entry);

  // Update indexes
  // Action type index
  if (!component.actionTypeIndex.has(entry.actionType)) {
    component.actionTypeIndex.set(entry.actionType, []);
  }
  component.actionTypeIndex.get(entry.actionType)!.push(entry.id);

  // Source agent index
  if (entry.sourceAgentId) {
    if (!component.sourceAgentIndex.has(entry.sourceAgentId)) {
      component.sourceAgentIndex.set(entry.sourceAgentId, []);
    }
    component.sourceAgentIndex.get(entry.sourceAgentId)!.push(entry.id);
  }

  // Target agent index
  if (entry.targetAgentIds) {
    for (const targetId of entry.targetAgentIds) {
      if (!component.targetAgentIndex.has(targetId)) {
        component.targetAgentIndex.set(targetId, []);
      }
      component.targetAgentIndex.get(targetId)!.push(entry.id);
    }
  }

  // Tick index
  if (!component.tickIndex.has(entry.tick)) {
    component.tickIndex.set(entry.tick, []);
  }
  component.tickIndex.get(entry.tick)!.push(entry.id);

  // Check if archival needed (TODO: implement archival to persistence layer)
  if (component.entries.length > component.maxEntries) {
    console.warn(
      `[GovernanceHistory] Entry count (${component.entries.length}) exceeds max (${component.maxEntries}). ` +
      `Archival not yet implemented - consider increasing maxEntries.`
    );
  }
}

/**
 * Query governance audit history
 *
 * Uses indexes for efficient filtering when possible
 */
export function queryGovernanceHistory(
  component: GovernanceHistoryComponent,
  query: GovernanceAuditQuery
): GovernanceAuditEntry[] {
  let candidateIds: Set<string> | null = null;

  // Start with most selective filter using indexes
  if (query.sourceAgentId && component.sourceAgentIndex.has(query.sourceAgentId)) {
    candidateIds = new Set(component.sourceAgentIndex.get(query.sourceAgentId)!);
  } else if (query.targetAgentId && component.targetAgentIndex.has(query.targetAgentId)) {
    candidateIds = new Set(component.targetAgentIndex.get(query.targetAgentId)!);
  } else if (query.actionTypes && query.actionTypes.length > 0) {
    candidateIds = new Set<string>();
    for (const actionType of query.actionTypes) {
      const ids = component.actionTypeIndex.get(actionType) || [];
      for (const id of ids) {
        candidateIds.add(id);
      }
    }
  }

  // Filter entries
  let results = candidateIds
    ? component.entries.filter(entry => candidateIds!.has(entry.id))
    : [...component.entries];

  // Apply additional filters
  if (query.actionTypes && query.actionTypes.length > 0) {
    results = results.filter(entry => query.actionTypes!.includes(entry.actionType));
  }

  if (query.tiers && query.tiers.length > 0) {
    results = results.filter(entry => query.tiers!.includes(entry.tier));
  }

  if (query.outcomes && query.outcomes.length > 0) {
    results = results.filter(entry => query.outcomes!.includes(entry.outcome));
  }

  if (query.targetEntityId) {
    results = results.filter(entry => entry.targetEntityId === query.targetEntityId);
  }

  if (query.tickRange) {
    results = results.filter(
      entry => entry.tick >= query.tickRange!.start && entry.tick <= query.tickRange!.end
    );
  }

  if (query.tags && query.tags.length > 0) {
    results = results.filter(entry =>
      entry.tags && query.tags!.some(tag => entry.tags!.includes(tag))
    );
  }

  // Sort
  const sortOrder = query.sortOrder || 'desc';
  results.sort((a, b) => {
    return sortOrder === 'asc' ? a.tick - b.tick : b.tick - a.tick;
  });

  // Limit
  if (query.limit && query.limit > 0) {
    results = results.slice(0, query.limit);
  }

  return results;
}

/**
 * Generate statistics about governance activity
 */
export function getGovernanceStatistics(
  component: GovernanceHistoryComponent
): GovernanceStatistics {
  const byActionType = new Map<GovernanceActionType, number>();
  const byTier = new Map<PoliticalTier, number>();
  const byOutcome = new Map<GovernanceOutcome, number>();
  const agentCounts = new Map<string, number>();

  let firstTick = Infinity;
  let lastTick = -Infinity;

  for (const entry of component.entries) {
    // Count by action type
    byActionType.set(entry.actionType, (byActionType.get(entry.actionType) || 0) + 1);

    // Count by tier
    byTier.set(entry.tier, (byTier.get(entry.tier) || 0) + 1);

    // Count by outcome
    byOutcome.set(entry.outcome, (byOutcome.get(entry.outcome) || 0) + 1);

    // Track agent activity
    if (entry.sourceAgentId) {
      agentCounts.set(entry.sourceAgentId, (agentCounts.get(entry.sourceAgentId) || 0) + 1);
    }

    // Track time range
    if (entry.tick < firstTick) firstTick = entry.tick;
    if (entry.tick > lastTick) lastTick = entry.tick;
  }

  // Sort agents by activity
  const mostActiveAgents = Array.from(agentCounts.entries())
    .map(([agentId, count]) => ({ agentId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10

  return {
    totalEntries: component.entries.length,
    byActionType,
    byTier,
    byOutcome,
    mostActiveAgents,
    firstEntryTick: firstTick === Infinity ? 0 : firstTick,
    lastEntryTick: lastTick === -Infinity ? 0 : lastTick,
  };
}
