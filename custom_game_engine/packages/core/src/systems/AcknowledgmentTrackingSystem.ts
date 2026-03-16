/**
 * AcknowledgmentTrackingSystem - Monitors directive acknowledgments and handles timeouts
 *
 * This system:
 * 1. Processes acknowledgment timeouts for all tracked directives
 * 2. Escalates non-acknowledged directives to higher tiers
 * 3. Records acknowledgment events to governance history
 * 4. Emits events for acknowledgment status changes
 *
 * Priority: 206 (after FederationGovernanceSystem at 205)
 * Throttle: 100 ticks (5 seconds) - check for timeouts periodically
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type {
  DirectiveAcknowledgmentComponent,
  DirectiveAcknowledgmentEntry,
  AcknowledgmentRecord,
} from '../components/DirectiveAcknowledgmentComponent.js';
import {
  processAcknowledgmentTimeouts,
  recordAcknowledgment,
  startDirectiveAcknowledgmentTracking,
  createDirectiveAcknowledgmentComponent,
} from '../components/DirectiveAcknowledgmentComponent.js';
import {
  addGovernanceAuditEntry,
  type GovernanceHistoryComponent,
  type GovernanceAuditEntry,
} from '../components/GovernanceHistoryComponent.js';
import { v4 as uuidv4 } from 'uuid';
import { getNextHigherTier, type PoliticalTier } from '../governance/types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Event data for directive acknowledged event
 */
interface DirectiveAcknowledgedEventData {
  directiveId: string;
  entityId: string;
  status: string;
  reasoning?: string;
  tick: number;
}

/**
 * Event data for directive timeout event
 */
interface DirectiveTimeoutEventData {
  directiveId: string;
  directiveContent: string;
  originTier: PoliticalTier;
  targetTier: PoliticalTier;
  timedOutEntities: string[];
  acknowledgedEntities: string[];
  tick: number;
}

// ============================================================================
// System
// ============================================================================

export class AcknowledgmentTrackingSystem extends BaseSystem {
  public readonly id: SystemId = 'acknowledgment_tracking' as SystemId;
  public readonly priority: number = 206;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.DirectiveAcknowledgment];
  public readonly activationComponents = ['directive_acknowledgment'] as const;
  public readonly metadata = {
    category: 'economy' as const,
    description: 'Monitors directive acknowledgments and handles timeouts',
    dependsOn: ['federation_governance' as SystemId],
    writesComponents: [CT.DirectiveAcknowledgment, CT.GovernanceHistory] as const,
  } as const;

  // Update interval: 100 ticks = 5 seconds
  protected readonly throttleInterval = 100;

  // Track last update tick to avoid duplicate processing
  private lastUpdateTick: number = 0;

  // Cache governance history entity ID (singleton pattern - avoid repeated queries)
  private cachedHistoryEntityId: string | null = null;

  // ========================================================================
  // Main Update Loop
  // ========================================================================

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // Skip if already processed this tick range
    if (tick - this.lastUpdateTick < this.throttleInterval) {
      return;
    }
    this.lastUpdateTick = tick;

    // Process each entity with acknowledgment tracking
    for (const entity of ctx.activeEntities) {
      const ackComponent = entity.getComponent<DirectiveAcknowledgmentComponent>(CT.DirectiveAcknowledgment);
      if (!ackComponent) continue;

      // Process timeouts
      const timedOutDirectives = processAcknowledgmentTimeouts(ackComponent, tick);

      // Handle timed out directives
      for (const directive of timedOutDirectives) {
        this.handleDirectiveTimeout(ctx.world, directive, tick);
      }
    }
  }

  // ========================================================================
  // Timeout Handling
  // ========================================================================

  /**
   * Handle a directive that has timed out
   */
  private handleDirectiveTimeout(
    world: World,
    directive: DirectiveAcknowledgmentEntry,
    tick: number
  ): void {
    // Collect timed out and acknowledged entities using pre-allocated arrays
    const timedOutEntities: string[] = [];
    const acknowledgedEntities: string[] = [];

    // Use iterator directly instead of converting to array
    for (const [entityId, record] of directive.acknowledgments) {
      if (record.status === 'timeout') {
        timedOutEntities.push(entityId);
      } else if (record.status === 'acknowledged' || record.status === 'accepted') {
        acknowledgedEntities.push(entityId);
      }
    }

    // Early exit if nothing timed out
    if (timedOutEntities.length === 0) {
      return;
    }

    // Record in governance history
    this.recordTimeoutToHistory(world, directive, timedOutEntities, tick);

    // Emit timeout event
    world.eventBus.emit({
      type: 'governance:directive_timeout',
      source: 'acknowledgment_tracking_system',
      data: {
        directiveId: directive.directiveId,
        directiveContent: directive.directiveContent,
        originTier: directive.originTier,
        targetTier: directive.targetTier,
        timedOutEntities,
        acknowledgedEntities,
        tick,
      } as DirectiveTimeoutEventData,
    });

    // Escalate if critical and not acknowledged
    if (directive.priority === 'critical' && directive.overallStatus === 'failed') {
      this.escalateDirective(world, directive, timedOutEntities, tick);
    }
  }

  /**
   * Escalate a directive to higher tier due to non-acknowledgment
   */
  private escalateDirective(
    world: World,
    directive: DirectiveAcknowledgmentEntry,
    timedOutEntities: string[],
    tick: number
  ): void {
    const nextTier = getNextHigherTier(directive.targetTier);
    if (!nextTier) {
      // Already at highest tier, cannot escalate
      console.warn(
        `[AcknowledgmentTracking] Cannot escalate directive ${directive.directiveId} - already at highest tier`
      );
      return;
    }

    // Record escalation in history
    const historyEntity = this.getOrCreateHistoryEntity(world);
    if (historyEntity) {
      const history = historyEntity.getComponent<GovernanceHistoryComponent>(CT.GovernanceHistory);
      if (history) {
        const entry: GovernanceAuditEntry = {
          id: `audit-${uuidv4()}`,
          actionType: 'crisis_escalated',
          tier: directive.originTier,
          tick,
          targetAgentIds: timedOutEntities,
          outcome: 'escalated',
          description: `Directive "${directive.directiveContent}" escalated from ${directive.targetTier} to ${nextTier} due to non-acknowledgment`,
          data: {
            directiveId: directive.directiveId,
            originalTier: directive.targetTier,
            escalatedTier: nextTier,
            timedOutEntities,
            reason: 'non_acknowledgment',
          },
          tags: ['escalation', 'timeout', directive.priority],
        };

        addGovernanceAuditEntry(history, entry);
      }
    }

    // Emit escalation event
    world.eventBus.emit({
      type: 'governance:directive_escalated',
      source: 'acknowledgment_tracking_system',
      data: {
        directiveId: directive.directiveId,
        fromTier: directive.targetTier,
        toTier: nextTier,
        reason: 'non_acknowledgment',
        timedOutEntities,
        tick,
      },
    });
  }

  // ========================================================================
  // History Recording
  // ========================================================================

  /**
   * Record timeout event to governance history
   */
  private recordTimeoutToHistory(
    world: World,
    directive: DirectiveAcknowledgmentEntry,
    timedOutEntities: string[],
    tick: number
  ): void {
    const historyEntity = this.getOrCreateHistoryEntity(world);
    if (!historyEntity) return;

    const history = historyEntity.getComponent<GovernanceHistoryComponent>(CT.GovernanceHistory);
    if (!history) return;

    const entry: GovernanceAuditEntry = {
      id: `audit-${uuidv4()}`,
      actionType: 'directive_acknowledged',
      tier: directive.targetTier,
      tick,
      targetAgentIds: timedOutEntities,
      outcome: directive.overallStatus === 'failed' ? 'rejected' : 'pending',
      description: `Directive "${directive.directiveContent}" timed out - ${timedOutEntities.length} entities did not acknowledge`,
      data: {
        directiveId: directive.directiveId,
        directiveContent: directive.directiveContent,
        timedOutEntities,
        acknowledgmentRate: directive.acknowledgmentRate,
        overallStatus: directive.overallStatus,
      },
      tags: ['acknowledgment', 'timeout', directive.priority],
    };

    addGovernanceAuditEntry(history, entry);
  }

  /**
   * Get the governance history singleton entity (cached lookup)
   */
  private getOrCreateHistoryEntity(world: World): EntityImpl | null {
    // Fast path: use cached ID
    if (this.cachedHistoryEntityId) {
      const cached = world.getEntity(this.cachedHistoryEntityId);
      if (cached) {
        return cached as EntityImpl;
      }
      // Cache invalidated, clear it
      this.cachedHistoryEntityId = null;
    }

    // Slow path: query for history entity
    const historyEntities = world
      .query()
      .with(CT.GovernanceHistory)
      .executeEntities();

    if (historyEntities.length > 0) {
      // Cache the ID for future lookups
      this.cachedHistoryEntityId = historyEntities[0]!.id;
      return historyEntities[0]! as EntityImpl;
    }

    // History entity should exist, log warning if not
    console.warn('[AcknowledgmentTracking] Governance history entity not found');
    return null;
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Get or create acknowledgment tracking component on an entity
   */
  public getOrCreateAcknowledgmentTracking(
    world: World,
    entityId: string
  ): DirectiveAcknowledgmentComponent | null {
    const entity = world.getEntity(entityId);
    if (!entity) return null;

    let component = entity.getComponent<DirectiveAcknowledgmentComponent>(CT.DirectiveAcknowledgment);
    if (!component) {
      component = createDirectiveAcknowledgmentComponent();
      (entity as EntityImpl).addComponent(component);
    }

    return component;
  }

  /**
   * Start tracking acknowledgments for a new directive
   */
  public trackDirective(
    world: World,
    issuingEntityId: string,
    directiveId: string,
    directiveContent: string,
    originTier: PoliticalTier,
    targetTier: PoliticalTier,
    targetEntityIds: string[],
    priority: 'routine' | 'urgent' | 'critical'
  ): boolean {
    const component = this.getOrCreateAcknowledgmentTracking(world, issuingEntityId);
    if (!component) return false;

    startDirectiveAcknowledgmentTracking(
      component,
      directiveId,
      directiveContent,
      originTier,
      targetTier,
      targetEntityIds,
      priority,
      world.tick
    );

    // Emit tracking started event
    world.eventBus.emit({
      type: 'governance:acknowledgment_tracking_started',
      source: issuingEntityId,
      data: {
        directiveId,
        targetEntityIds,
        priority,
        tick: world.tick,
      },
    });

    return true;
  }

  /**
   * Record an acknowledgment from an entity
   */
  public acknowledgeDirective(
    world: World,
    issuingEntityId: string,
    directiveId: string,
    acknowledgingEntityId: string,
    accepted: boolean,
    reasoning?: string
  ): boolean {
    const entity = world.getEntity(issuingEntityId);
    if (!entity) return false;

    const component = entity.getComponent<DirectiveAcknowledgmentComponent>(CT.DirectiveAcknowledgment);
    if (!component) return false;

    const success = recordAcknowledgment(
      component,
      directiveId,
      acknowledgingEntityId,
      accepted ? 'accepted' : 'rejected',
      world.tick,
      reasoning
    );

    if (success) {
      // Record to governance history
      this.recordAcknowledgmentToHistory(
        world,
        directiveId,
        acknowledgingEntityId,
        accepted,
        reasoning
      );

      // Emit acknowledgment event
      world.eventBus.emit({
        type: 'governance:directive_acknowledged',
        source: acknowledgingEntityId,
        data: {
          directiveId,
          entityId: acknowledgingEntityId,
          status: accepted ? 'accepted' : 'rejected',
          reasoning,
          tick: world.tick,
        } as DirectiveAcknowledgedEventData,
      });
    }

    return success;
  }

  /**
   * Record acknowledgment to governance history
   */
  private recordAcknowledgmentToHistory(
    world: World,
    directiveId: string,
    entityId: string,
    accepted: boolean,
    reasoning?: string
  ): void {
    const historyEntity = this.getOrCreateHistoryEntity(world);
    if (!historyEntity) return;

    const history = historyEntity.getComponent<GovernanceHistoryComponent>(CT.GovernanceHistory);
    if (!history) return;

    const entry: GovernanceAuditEntry = {
      id: `audit-${uuidv4()}`,
      actionType: 'directive_acknowledged',
      tier: 'village', // Will be updated based on entity tier
      tick: world.tick,
      sourceAgentId: entityId,
      outcome: accepted ? 'approved' : 'rejected',
      description: `Entity ${entityId} ${accepted ? 'accepted' : 'rejected'} directive ${directiveId}`,
      data: {
        directiveId,
        entityId,
        accepted,
        reasoning,
      },
      tags: ['acknowledgment', accepted ? 'accepted' : 'rejected'],
    };

    addGovernanceAuditEntry(history, entry);
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: AcknowledgmentTrackingSystem | null = null;

export function getAcknowledgmentTrackingSystem(): AcknowledgmentTrackingSystem {
  if (!systemInstance) {
    systemInstance = new AcknowledgmentTrackingSystem();
  }
  return systemInstance;
}
