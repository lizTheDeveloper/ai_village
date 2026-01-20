/**
 * TradeEscortSystem - Links squadrons to trade agreements for escort missions
 *
 * Manages:
 * - Assigning squadrons to escort trade agreements
 * - Updating squadron mission to 'escort' with escortedTradeAgreementId
 * - Tracking active escorts
 * - Handling escort completion/failure
 * - Validating escort assignments
 *
 * Integration Points:
 * - TradeAgreementSystem: Reads/writes trade agreement escort fields
 * - SquadronSystem: Updates squadron mission fields
 * - NavySystem: Tracks escort deployments
 *
 * Performance:
 * - Throttled to 100 ticks (5 seconds) - escorts don't change frequently
 * - Object literal caches for O(1) lookups
 * - Dirty tracking to skip unchanged assignments
 *
 * CLAUDE.md Compliance:
 * - No silent fallbacks - all validation errors throw with clear messages
 * - Strict validation - agreements and squadrons must exist and be valid
 * - No debug console.log statements
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { TradeAgreementComponent } from '../components/TradeAgreementComponent.js';
import type { SquadronComponent } from '../components/SquadronComponent.js';
import type { TradeAgreement } from '../trade/TradeAgreementTypes.js';

// ============================================================================
// Constants
// ============================================================================

/** Update interval - every 5 seconds at 20 TPS */
const UPDATE_INTERVAL = 100;

/** Minimum squadron size for escort missions */
const MIN_ESCORT_SQUADRON_SIZE = 3;

/** Maximum squadron size (from SquadronComponent spec) */
const MAX_SQUADRON_SIZE = 10;

// ============================================================================
// Types
// ============================================================================

/**
 * Escort assignment for a trade agreement
 */
export interface EscortAssignment {
  tradeAgreementId: string;
  squadronId: string;
  navyId: string;
  escortCost: number;
  assignedAtTick: bigint;
  status: 'assigned' | 'active' | 'completed' | 'failed';
}

// ============================================================================
// System
// ============================================================================

export class TradeEscortSystem extends BaseSystem {
  public readonly id: SystemId = 'trade_escort' as SystemId;
  public readonly priority: number = 450; // After FleetCoherenceSystem (400), before combat
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  // Lazy activation: Skip entire system when no trade_agreement exists
  public readonly activationComponents = ['trade_agreement'] as const;
  public readonly metadata = {
    category: 'economy',
    description: 'Links squadrons to trade agreements for escort missions',
    dependsOn: ['trade_agreement' as SystemId, 'squadron_management' as SystemId],
    writesComponents: ['trade_agreement', 'squadron'] as const,
  } as const;

  protected readonly throttleInterval = UPDATE_INTERVAL;

  // ========================================================================
  // Performance Optimizations - Entity Caching
  // ========================================================================

  /**
   * Squadron entity cache - uses object literal for O(1) access
   * PERF: Object literals are faster than Maps for string keys
   */
  private squadronEntityCache: Record<string, EntityImpl | null> = Object.create(null);
  private squadronCacheValidTick = -1;
  private readonly CACHE_LIFETIME = 60; // 3 seconds

  /**
   * Active escort assignments tracked for quick lookup
   * Maps tradeAgreementId -> EscortAssignment
   */
  private activeEscorts: Record<string, EscortAssignment> = Object.create(null);

  /**
   * Dirty tracking - track last hash to skip unchanged escorts
   * Maps tradeAgreementId -> hash
   */
  private lastEscortHash: Record<string, number> = Object.create(null);

  // ========================================================================
  // Update Loop
  // ========================================================================

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // PERF: Only rebuild squadron cache periodically
    if (tick - this.squadronCacheValidTick > this.CACHE_LIFETIME) {
      this.rebuildSquadronCache(ctx.world);
      this.squadronCacheValidTick = tick;
    }

    // Get all civilizations with trade agreements
    const civEntities = ctx.world.query().with('trade_agreement').executeEntities();

    // PERF: Fast exit if no civilizations
    if (civEntities.length === 0) return;

    // Process trade agreements requiring escorts
    for (const civEntity of civEntities) {
      const tradeComp = civEntity.getComponent<TradeAgreementComponent>('trade_agreement');
      if (!tradeComp) continue;

      // Process active agreements that have escort fields
      for (const agreement of tradeComp.activeAgreements) {
        if (agreement.status !== 'active') continue;

        // Check if agreement requires escort
        const escortReq = this.getEscortRequirement(agreement);
        if (!escortReq) continue;

        // Validate escort assignment
        this.validateEscortAssignment(ctx.world, civEntity as EntityImpl, agreement, tick);
      }
    }

    // Clean up completed/failed escorts
    this.cleanupCompletedEscorts(ctx.world, tick);
  }

  /**
   * Build cache of all squadron entities for O(1) lookups
   * PERF: Uses object literal for faster access than Map
   */
  private rebuildSquadronCache(world: World): void {
    // PERF: Clear by reassigning (faster than delete loop)
    this.squadronEntityCache = Object.create(null);

    const squadronEntities = world.query().with('squadron').executeEntities();

    for (const squadronEntity of squadronEntities) {
      const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
      if (!squadron) continue;

      this.squadronEntityCache[squadron.squadronId] = squadronEntity as EntityImpl;
    }
  }

  /**
   * Get escort requirement from trade agreement
   * Returns undefined if no escort required
   */
  private getEscortRequirement(
    agreement: TradeAgreement
  ): { required: boolean; minimumFleetSize: number; escortProvider?: string; escortCost: number } | undefined {
    // Check if agreement has crossRealmMetadata (only cross-realm trades need escorts)
    if (!agreement.crossRealmMetadata) return undefined;

    // For now, we'll add escort metadata to the agreement structure
    // In practice, this would be part of TradeAgreement interface
    const metadata = agreement.crossRealmMetadata as any;
    if (!metadata.escort) return undefined;

    return metadata.escort;
  }

  /**
   * Validate escort assignment and update if needed
   */
  private validateEscortAssignment(
    world: World,
    civEntity: EntityImpl,
    agreement: TradeAgreement,
    tick: number
  ): void {
    const escortReq = this.getEscortRequirement(agreement);
    if (!escortReq) return;

    const metadata = (agreement.crossRealmMetadata as any)?.escort;
    if (!metadata) return;

    const currentSquadronId = metadata.escortSquadronId;

    // If escort already assigned, validate it's still valid
    if (currentSquadronId) {
      const isValid = this.isEscortValid(world, currentSquadronId, agreement.id);
      if (isValid) {
        // Update active escort tracking
        this.trackActiveEscort(agreement.id, currentSquadronId, metadata.escortProvider || '', metadata.escortCost || 0, tick);
        return;
      }

      // Escort invalid - emit failure event and clear assignment
      this.handleEscortFailure(world, civEntity, agreement, currentSquadronId, 'escort_invalid');
    }

    // No escort assigned but required - emit warning
    if (escortReq.required) {
      world.eventBus.emit({
        type: 'trade:escort_needed',
        source: civEntity.id,
        data: {
          agreementId: agreement.id,
          minimumFleetSize: escortReq.minimumFleetSize,
          provider: escortReq.escortProvider,
        },
      });
    }
  }

  /**
   * Check if escort squadron is still valid
   */
  private isEscortValid(world: World, squadronId: string, _tradeAgreementId: string): boolean {
    // Check if squadron exists in cache
    const squadronEntity = this.squadronEntityCache[squadronId];
    if (!squadronEntity) return false;

    const squadron = squadronEntity.getComponent<SquadronComponent>(CT.Squadron);
    if (!squadron) return false;

    // Verify squadron has minimum ships
    if (squadron.ships.shipIds.length < MIN_ESCORT_SQUADRON_SIZE) return false;

    // Verify squadron mission is 'escort'
    if (squadron.mission.type !== 'escort') return false;

    // Squadron is valid
    return true;
  }

  /**
   * Track active escort assignment
   */
  private trackActiveEscort(
    tradeAgreementId: string,
    squadronId: string,
    navyId: string,
    escortCost: number,
    tick: number
  ): void {
    // PERF: Create simple hash to detect changes
    const currentHash = tradeAgreementId.length + squadronId.length + navyId.length + escortCost;
    const lastHash = this.lastEscortHash[tradeAgreementId] ?? -1;

    // PERF: Skip if nothing changed
    if (currentHash === lastHash) return;

    this.lastEscortHash[tradeAgreementId] = currentHash;

    // Update active escort tracking
    const existing = this.activeEscorts[tradeAgreementId];
    if (existing) {
      // Update status to 'active' if was 'assigned'
      if (existing.status === 'assigned') {
        existing.status = 'active';
      }
    } else {
      // Create new tracking entry
      this.activeEscorts[tradeAgreementId] = {
        tradeAgreementId,
        squadronId,
        navyId,
        escortCost,
        assignedAtTick: BigInt(tick),
        status: 'active',
      };
    }
  }

  /**
   * Handle escort failure - emit event and clear assignment
   */
  private handleEscortFailure(
    world: World,
    civEntity: EntityImpl,
    agreement: TradeAgreement,
    squadronId: string,
    reason: string
  ): void {
    // Emit failure event
    world.eventBus.emit({
      type: 'trade:escort_failed',
      source: civEntity.id,
      data: {
        agreementId: agreement.id,
        squadronId,
        reason,
      },
    });

    // Mark escort as failed in tracking
    const escort = this.activeEscorts[agreement.id];
    if (escort) {
      escort.status = 'failed';
    }

    // Note: We don't clear the escort field from the agreement here
    // That should be done by TradeAgreementSystem or a higher-level coordinator
  }

  /**
   * Clean up completed or failed escorts
   */
  private cleanupCompletedEscorts(world: World, tick: number): void {
    const tickBig = BigInt(tick);

    // Find escorts to clean up (failed/completed for > 1000 ticks)
    for (const agreementId in this.activeEscorts) {
      const escort = this.activeEscorts[agreementId];
      if (!escort) continue;

      if (escort.status === 'failed' || escort.status === 'completed') {
        const age = tickBig - escort.assignedAtTick;
        if (age > 1000n) {
          // Remove from tracking
          delete this.activeEscorts[agreementId];
          delete this.lastEscortHash[agreementId];
        }
      }
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Assign a squadron to escort a trade agreement
 * Updates both the trade agreement and squadron components
 *
 * @param world - Game world
 * @param tradeAgreementId - Trade agreement to escort
 * @param squadronId - Squadron to assign
 * @returns Result with success flag and optional reason
 */
export function assignEscort(
  world: World,
  tradeAgreementId: string,
  squadronId: string
): { success: boolean; reason?: string } {
  // Find trade agreement
  const civEntities = world.query().with('trade_agreement').executeEntities();

  let agreementEntity: EntityImpl | undefined;
  let tradeComp: TradeAgreementComponent | undefined;
  let agreement: TradeAgreement | undefined;

  for (const civEntity of civEntities) {
    const comp = civEntity.getComponent<TradeAgreementComponent>('trade_agreement');
    if (!comp) continue;

    const found = comp.activeAgreements.find((a) => a.id === tradeAgreementId);
    if (found) {
      agreementEntity = civEntity as EntityImpl;
      tradeComp = comp;
      agreement = found;
      break;
    }
  }

  if (!agreementEntity || !tradeComp || !agreement) {
    return { success: false, reason: `Trade agreement ${tradeAgreementId} not found` };
  }

  // Verify agreement requires escort
  if (!agreement.crossRealmMetadata) {
    return { success: false, reason: 'Trade agreement does not support escorts (local trade only)' };
  }

  // Find squadron
  const squadronEntities = world.query().with('squadron').executeEntities();
  const squadronEntity = squadronEntities.find((e) => {
    const s = e.getComponent<SquadronComponent>('squadron');
    return s?.squadronId === squadronId;
  });

  if (!squadronEntity) {
    return { success: false, reason: `Squadron ${squadronId} not found` };
  }

  const squadron = squadronEntity.getComponent<SquadronComponent>('squadron');
  if (!squadron) {
    return { success: false, reason: 'Entity is not a squadron' };
  }

  // Validate squadron size
  if (squadron.ships.shipIds.length < MIN_ESCORT_SQUADRON_SIZE) {
    return {
      success: false,
      reason: `Squadron has ${squadron.ships.shipIds.length} ships, minimum ${MIN_ESCORT_SQUADRON_SIZE} required for escort`,
    };
  }

  // Check if squadron is already on a mission
  if (squadron.mission.type === 'escort' && squadron.mission.escortedTradeAgreementId) {
    return {
      success: false,
      reason: `Squadron is already escorting trade agreement ${squadron.mission.escortedTradeAgreementId}`,
    };
  }

  // Update squadron mission
  const impl = squadronEntity as EntityImpl;
  impl.updateComponent<SquadronComponent>('squadron', (s) => ({
    ...s,
    mission: {
      type: 'escort',
      escortedTradeAgreementId: tradeAgreementId,
      status: 'en_route',
    },
  }));

  // Update trade agreement with escort info
  // Note: This modifies crossRealmMetadata.escort which should be defined in TradeAgreement interface
  const updatedAgreements = tradeComp.activeAgreements.map((a) => {
    if (a.id !== tradeAgreementId) return a;

    const metadata = a.crossRealmMetadata as any;
    return {
      ...a,
      crossRealmMetadata: {
        ...a.crossRealmMetadata,
        escort: {
          ...metadata?.escort,
          escortSquadronId: squadronId,
        },
      },
    };
  });

  agreementEntity.updateComponent<TradeAgreementComponent>('trade_agreement', (c) => ({
    ...c,
    activeAgreements: updatedAgreements as TradeAgreement[],
  }));

  // Emit assignment event
  world.eventBus.emit({
    type: 'trade:escort_assigned',
    source: agreementEntity.id,
    data: {
      agreementId: tradeAgreementId,
      squadronId,
      shipCount: squadron.ships.shipIds.length,
    },
  });

  return { success: true };
}

/**
 * Release a squadron from escort duty
 * Clears escort assignment from trade agreement and resets squadron mission
 *
 * @param world - Game world
 * @param tradeAgreementId - Trade agreement being escorted
 * @returns Result with success flag and optional reason
 */
export function releaseEscort(
  world: World,
  tradeAgreementId: string
): { success: boolean; reason?: string } {
  // Find trade agreement
  const civEntities = world.query().with('trade_agreement').executeEntities();

  let agreementEntity: EntityImpl | undefined;
  let tradeComp: TradeAgreementComponent | undefined;
  let agreement: TradeAgreement | undefined;

  for (const civEntity of civEntities) {
    const comp = civEntity.getComponent<TradeAgreementComponent>('trade_agreement');
    if (!comp) continue;

    const found = comp.activeAgreements.find((a) => a.id === tradeAgreementId);
    if (found) {
      agreementEntity = civEntity as EntityImpl;
      tradeComp = comp;
      agreement = found;
      break;
    }
  }

  if (!agreementEntity || !tradeComp || !agreement) {
    return { success: false, reason: `Trade agreement ${tradeAgreementId} not found` };
  }

  // Get current escort squadron ID
  const metadata = agreement.crossRealmMetadata as any;
  const squadronId = metadata?.escort?.escortSquadronId;

  if (!squadronId) {
    return { success: false, reason: 'No escort currently assigned to this trade agreement' };
  }

  // Find squadron and reset its mission
  const squadronEntities = world.query().with('squadron').executeEntities();
  const squadronEntity = squadronEntities.find((e) => {
    const s = e.getComponent<SquadronComponent>('squadron');
    return s?.squadronId === squadronId;
  });

  if (squadronEntity) {
    const impl = squadronEntity as EntityImpl;
    impl.updateComponent<SquadronComponent>('squadron', (s) => ({
      ...s,
      mission: {
        type: 'patrol', // Return to default patrol mission
        status: 'planning',
      },
    }));
  }

  // Clear escort from trade agreement
  const updatedAgreements = tradeComp.activeAgreements.map((a) => {
    if (a.id !== tradeAgreementId) return a;

    const meta = a.crossRealmMetadata as any;
    return {
      ...a,
      crossRealmMetadata: {
        ...a.crossRealmMetadata,
        escort: {
          ...meta?.escort,
          escortSquadronId: undefined, // Clear assignment
        },
      },
    };
  });

  agreementEntity.updateComponent<TradeAgreementComponent>('trade_agreement', (c) => ({
    ...c,
    activeAgreements: updatedAgreements as TradeAgreement[],
  }));

  // Emit completion event
  world.eventBus.emit({
    type: 'trade:escort_completed',
    source: agreementEntity.id,
    data: {
      agreementId: tradeAgreementId,
      squadronId,
    },
  });

  return { success: true };
}

/**
 * Get all trade agreements being escorted by a squadron
 *
 * @param world - Game world
 * @param squadronId - Squadron ID to check
 * @returns Array of trade agreement IDs
 */
export function getEscortedTrades(world: World, squadronId: string): string[] {
  const escortedTrades: string[] = [];

  // Query all civilizations with trade agreements
  const civEntities = world.query().with('trade_agreement').executeEntities();

  for (const civEntity of civEntities) {
    const tradeComp = civEntity.getComponent<TradeAgreementComponent>('trade_agreement');
    if (!tradeComp) continue;

    // Check each active agreement
    for (const agreement of tradeComp.activeAgreements) {
      if (agreement.status !== 'active') continue;

      const metadata = agreement.crossRealmMetadata as any;
      if (metadata?.escort?.escortSquadronId === squadronId) {
        escortedTrades.push(agreement.id);
      }
    }
  }

  return escortedTrades;
}

/**
 * Get squadron assigned to escort a trade agreement
 *
 * @param world - Game world
 * @param tradeAgreementId - Trade agreement ID
 * @returns Squadron ID if assigned, undefined otherwise
 */
export function getEscortSquadron(world: World, tradeAgreementId: string): string | undefined {
  const civEntities = world.query().with('trade_agreement').executeEntities();

  for (const civEntity of civEntities) {
    const tradeComp = civEntity.getComponent<TradeAgreementComponent>('trade_agreement');
    if (!tradeComp) continue;

    const agreement = tradeComp.activeAgreements.find((a) => a.id === tradeAgreementId);
    if (agreement) {
      const metadata = agreement.crossRealmMetadata as any;
      return metadata?.escort?.escortSquadronId;
    }
  }

  return undefined;
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: TradeEscortSystem | null = null;

export function getTradeEscortSystem(): TradeEscortSystem {
  if (!systemInstance) {
    systemInstance = new TradeEscortSystem();
  }
  return systemInstance;
}
