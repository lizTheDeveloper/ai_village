/**
 * DirectiveAcknowledgmentComponent - Tracks acknowledgment status of governance directives
 *
 * Per DecisionProtocols.ts: When directives are issued with requiresAcknowledgment = true,
 * this component tracks which entities have acknowledged the directive and handles
 * timeouts for non-acknowledgment.
 *
 * Design principles:
 * - Immutable tracking (acknowledgments cannot be revoked)
 * - Timeout support for auto-escalation
 * - Audit trail integration with GovernanceHistoryComponent
 */

import type { Component } from '../ecs/Component.js';
import type { PoliticalTier } from '../governance/types.js';

/**
 * Status of an individual acknowledgment
 */
export type AcknowledgmentStatus =
  | 'pending'      // Directive sent, awaiting acknowledgment
  | 'acknowledged' // Entity has acknowledged receipt
  | 'accepted'     // Entity has accepted and will implement
  | 'rejected'     // Entity has rejected (with reason)
  | 'delegated'    // Entity has delegated to subordinate
  | 'timeout'      // Acknowledgment deadline passed
  | 'escalated';   // Non-acknowledgment escalated to higher tier

/**
 * Individual entity's acknowledgment record
 */
export interface AcknowledgmentRecord {
  /** Entity ID that should acknowledge */
  entityId: string;

  /** Status of acknowledgment */
  status: AcknowledgmentStatus;

  /** Tick when directive was received */
  receivedTick: number;

  /** Tick when entity acknowledged (if applicable) */
  acknowledgedTick?: number;

  /** Reasoning provided by entity (for rejection/acceptance) */
  reasoning?: string;

  /** If delegated, to which entity */
  delegatedToEntityId?: string;

  /** If escalated, to which tier */
  escalatedToTier?: PoliticalTier;
}

/**
 * Directive acknowledgment tracking entry
 */
export interface DirectiveAcknowledgmentEntry {
  /** Directive ID being tracked */
  directiveId: string;

  /** Original directive content (for reference) */
  directiveContent: string;

  /** Tier that issued the directive */
  originTier: PoliticalTier;

  /** Tier(s) receiving the directive */
  targetTier: PoliticalTier;

  /** Priority of the directive */
  priority: 'routine' | 'urgent' | 'critical';

  /** Tick when directive was issued */
  issuedTick: number;

  /** Tick when acknowledgment times out */
  timeoutTick: number;

  /** Map of entity IDs to their acknowledgment records */
  acknowledgments: Map<string, AcknowledgmentRecord>;

  /** Overall status of the directive acknowledgment */
  overallStatus: 'in_progress' | 'completed' | 'partial' | 'failed';

  /** Percentage of entities that have acknowledged */
  acknowledgmentRate: number;
}

/**
 * Acknowledgment timeout configuration
 */
export interface AcknowledgmentTimeoutConfig {
  /** Ticks before routine directives timeout (default: 600 = 30 seconds) */
  routineTimeout: number;

  /** Ticks before urgent directives timeout (default: 200 = 10 seconds) */
  urgentTimeout: number;

  /** Ticks before critical directives timeout (default: 60 = 3 seconds) */
  criticalTimeout: number;
}

/**
 * DirectiveAcknowledgmentComponent - Tracks acknowledgments for a governance entity
 *
 * Attach this component to:
 * - Entities that issue directives (empires, nations, provinces)
 * - The governance history singleton for global tracking
 */
export interface DirectiveAcknowledgmentComponent extends Component {
  type: 'directive_acknowledgment';
  version: 1;

  /** Active directive acknowledgment tracking entries */
  activeDirectives: Map<string, DirectiveAcknowledgmentEntry>;

  /** Completed directive entries (limited history) */
  completedDirectives: DirectiveAcknowledgmentEntry[];

  /** Maximum completed entries to retain (default: 1000) */
  maxCompletedEntries: number;

  /** Timeout configuration */
  timeoutConfig: AcknowledgmentTimeoutConfig;

  /** Statistics */
  stats: {
    totalDirectivesIssued: number;
    totalAcknowledgmentsReceived: number;
    totalTimeouts: number;
    totalEscalations: number;
    averageAcknowledgmentTime: number; // In ticks
  };

  /** Last processed tick */
  lastProcessedTick: number;
}

/**
 * Default timeout configuration based on directive priority
 */
export const DEFAULT_TIMEOUT_CONFIG: AcknowledgmentTimeoutConfig = {
  routineTimeout: 600,   // 30 seconds at 20 TPS
  urgentTimeout: 200,    // 10 seconds at 20 TPS
  criticalTimeout: 60,   // 3 seconds at 20 TPS
};

/**
 * Create a new DirectiveAcknowledgmentComponent
 */
export function createDirectiveAcknowledgmentComponent(
  timeoutConfig: AcknowledgmentTimeoutConfig = DEFAULT_TIMEOUT_CONFIG,
  maxCompletedEntries: number = 1000
): DirectiveAcknowledgmentComponent {
  return {
    type: 'directive_acknowledgment',
    version: 1,
    activeDirectives: new Map(),
    completedDirectives: [],
    maxCompletedEntries,
    timeoutConfig,
    stats: {
      totalDirectivesIssued: 0,
      totalAcknowledgmentsReceived: 0,
      totalTimeouts: 0,
      totalEscalations: 0,
      averageAcknowledgmentTime: 0,
    },
    lastProcessedTick: 0,
  };
}

/**
 * Get timeout ticks for a directive priority
 */
export function getTimeoutForPriority(
  priority: 'routine' | 'urgent' | 'critical',
  config: AcknowledgmentTimeoutConfig
): number {
  switch (priority) {
    case 'routine':
      return config.routineTimeout;
    case 'urgent':
      return config.urgentTimeout;
    case 'critical':
      return config.criticalTimeout;
  }
}

/**
 * Start tracking acknowledgments for a directive
 */
export function startDirectiveAcknowledgmentTracking(
  component: DirectiveAcknowledgmentComponent,
  directiveId: string,
  directiveContent: string,
  originTier: PoliticalTier,
  targetTier: PoliticalTier,
  targetEntityIds: string[],
  priority: 'routine' | 'urgent' | 'critical',
  issuedTick: number
): void {
  const timeoutTicks = getTimeoutForPriority(priority, component.timeoutConfig);

  const acknowledgments = new Map<string, AcknowledgmentRecord>();
  for (const entityId of targetEntityIds) {
    acknowledgments.set(entityId, {
      entityId,
      status: 'pending',
      receivedTick: issuedTick,
    });
  }

  const entry: DirectiveAcknowledgmentEntry = {
    directiveId,
    directiveContent,
    originTier,
    targetTier,
    priority,
    issuedTick,
    timeoutTick: issuedTick + timeoutTicks,
    acknowledgments,
    overallStatus: 'in_progress',
    acknowledgmentRate: 0,
  };

  component.activeDirectives.set(directiveId, entry);
  component.stats.totalDirectivesIssued++;
}

/**
 * Record an acknowledgment from an entity
 */
export function recordAcknowledgment(
  component: DirectiveAcknowledgmentComponent,
  directiveId: string,
  entityId: string,
  status: AcknowledgmentStatus,
  tick: number,
  reasoning?: string,
  delegatedToEntityId?: string,
  escalatedToTier?: PoliticalTier
): boolean {
  const entry = component.activeDirectives.get(directiveId);
  if (!entry) {
    return false; // Directive not found or already completed
  }

  const record = entry.acknowledgments.get(entityId);
  if (!record) {
    return false; // Entity not in target list
  }

  // Update record
  record.status = status;
  record.acknowledgedTick = tick;
  record.reasoning = reasoning;
  record.delegatedToEntityId = delegatedToEntityId;
  record.escalatedToTier = escalatedToTier;

  // Update stats
  if (status === 'acknowledged' || status === 'accepted') {
    component.stats.totalAcknowledgmentsReceived++;

    // Update average acknowledgment time
    const ackTime = tick - record.receivedTick;
    const totalAcks = component.stats.totalAcknowledgmentsReceived;
    component.stats.averageAcknowledgmentTime =
      ((component.stats.averageAcknowledgmentTime * (totalAcks - 1)) + ackTime) / totalAcks;
  }

  // Recalculate acknowledgment rate
  const totalEntities = entry.acknowledgments.size;
  let acknowledgedCount = 0;
  for (const [, rec] of entry.acknowledgments) {
    if (rec.status !== 'pending') {
      acknowledgedCount++;
    }
  }
  entry.acknowledgmentRate = acknowledgedCount / totalEntities;

  // Check if all entities have responded
  if (acknowledgedCount === totalEntities) {
    entry.overallStatus = 'completed';
    moveToCompleted(component, directiveId);
  }

  return true;
}

/**
 * Process timeouts for pending acknowledgments
 */
export function processAcknowledgmentTimeouts(
  component: DirectiveAcknowledgmentComponent,
  currentTick: number
): DirectiveAcknowledgmentEntry[] {
  const timedOut: DirectiveAcknowledgmentEntry[] = [];

  for (const [directiveId, entry] of component.activeDirectives) {
    if (currentTick >= entry.timeoutTick) {
      // Mark pending acknowledgments as timed out
      let hasTimedOut = false;
      for (const [, record] of entry.acknowledgments) {
        if (record.status === 'pending') {
          record.status = 'timeout';
          hasTimedOut = true;
          component.stats.totalTimeouts++;
        }
      }

      if (hasTimedOut) {
        // Determine overall status
        const acknowledgedCount = Array.from(entry.acknowledgments.values())
          .filter(r => r.status === 'acknowledged' || r.status === 'accepted').length;

        if (acknowledgedCount === 0) {
          entry.overallStatus = 'failed';
        } else if (acknowledgedCount < entry.acknowledgments.size) {
          entry.overallStatus = 'partial';
        }

        timedOut.push(entry);
        moveToCompleted(component, directiveId);
      }
    }
  }

  component.lastProcessedTick = currentTick;
  return timedOut;
}

/**
 * Move a directive from active to completed
 */
function moveToCompleted(
  component: DirectiveAcknowledgmentComponent,
  directiveId: string
): void {
  const entry = component.activeDirectives.get(directiveId);
  if (!entry) return;

  component.activeDirectives.delete(directiveId);
  component.completedDirectives.push(entry);

  // Trim completed entries if over limit
  while (component.completedDirectives.length > component.maxCompletedEntries) {
    component.completedDirectives.shift();
  }
}

/**
 * Query acknowledgment status for a directive
 */
export function queryDirectiveAcknowledgmentStatus(
  component: DirectiveAcknowledgmentComponent,
  directiveId: string
): DirectiveAcknowledgmentEntry | undefined {
  return component.activeDirectives.get(directiveId) ||
    component.completedDirectives.find(e => e.directiveId === directiveId);
}

/**
 * Get all pending directives for a specific entity
 */
export function getPendingDirectivesForEntity(
  component: DirectiveAcknowledgmentComponent,
  entityId: string
): DirectiveAcknowledgmentEntry[] {
  const pending: DirectiveAcknowledgmentEntry[] = [];

  for (const [, entry] of component.activeDirectives) {
    const record = entry.acknowledgments.get(entityId);
    if (record && record.status === 'pending') {
      pending.push(entry);
    }
  }

  return pending;
}
