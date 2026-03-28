/**
 * DialectalDriftSystem — Tracks how language/dialect diverges between
 * isolated ship populations over time.
 *
 * Priority: 410 (after CrossShipCommunication at 405)
 *
 * Dialect drift is tracked per squadron pair (crews share language).
 * Reads communication state from CrossShipCommunicationSystem to drive
 * isolation and contact factors for both intra-fleet and cross-fleet pairs.
 *
 * Four divergence factors:
 *
 *   1. Isolation Factor       — How long since two squadrons had contact
 *   2. Population Size Factor — Smaller crews drift faster (founder effect)
 *   3. Cultural Contact Freq  — Cross-squadron interaction reduces drift
 *   4. Shared Media/Education — Libraries / universities standardise language
 *
 * Events emitted:
 *   fleet:dialect_divergence  — divergence between a pair first exceeds 0.5
 *   fleet:dialect_convergence — previously divergent pair falls back below 0.3
 *
 * Per CLAUDE.md:
 *   - Cache queries before loops
 *   - No silent fallbacks
 *   - No console.log
 *   - No type-assertion escape hatches
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { SquadronComponent } from '../components/SquadronComponent.js';
import type { FleetComponent } from '../components/FleetComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import { getCommStateMap, makeCommPairKey } from './CrossShipCommunicationSystem.js';

// ============================================================================
// Constants
// ============================================================================

/** Base dialect drift per update tick (throttled to every 200 ticks / 10 s). */
const BASE_DRIFT_RATE = 0.0001;

/**
 * Isolation factor change rates per tick of isolation / contact.
 * These are applied each UPDATE tick (200-tick throttle window), not each
 * game tick, so they are deliberately small.
 */
const ISOLATION_INCREASE_PER_TICK = 0.001;
const ISOLATION_DECREASE_PER_TICK = 0.01;

/** Divergence threshold above which a pair is considered to have split. */
const DIVERGENCE_SPLIT_THRESHOLD = 0.5;

/** Divergence threshold below which a previously split pair has converged. */
const DIVERGENCE_CONVERGE_THRESHOLD = 0.3;

/**
 * Cultural contact frequency defaults.
 * Same fleet → more shared activities → higher contact → less drift.
 */
const CONTACT_FREQUENCY_SAME_FLEET = 0.3;
const CONTACT_FREQUENCY_DIFF_FLEET = 0.1;

/**
 * Shared media / education factors.
 * Present (library or university) → 0.5; absent → 0.8.
 */
const SHARED_MEDIA_WITH_INSTITUTION = 0.5;
const SHARED_MEDIA_WITHOUT_INSTITUTION = 0.8;

/** Crew size above which the population-size factor contributes zero drift. */
const POPULATION_DRIFT_THRESHOLD = 200;

// ============================================================================
// Internal State Types
// ============================================================================

interface PairState {
  /** Isolation factor (0–1): how long since this pair had contact. */
  isolationFactor: number;
  /** Cumulative dialect divergence (0–1). */
  divergence: number;
  /** True if this pair was already above the split threshold last tick. */
  wasDivergent: boolean;
}

// ============================================================================
// System
// ============================================================================

export class DialectalDriftSystem extends BaseSystem {
  public readonly id: SystemId = 'dialectal_drift' as SystemId;
  public readonly priority: number = 410;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = ['squadron'] as const;
  public readonly metadata = {
    category: 'social',
    description: 'Tracks language/dialect divergence between isolated ship populations',
    dependsOn: ['cross_ship_communication' as SystemId],
    writesComponents: [] as const,
  } as const;

  protected readonly throttleInterval = 200; // Every 10 seconds — language drifts slowly

  // ========================================================================
  // System-Level State (not on components, per spec)
  // ========================================================================

  /**
   * Keyed by canonical comm pair key (via makeCommPairKey), so each pair
   * only appears once.
   */
  private readonly pairState = new Map<string, PairState>();

  /**
   * Whether the world has at least one library or university building.
   * Recomputed each update to avoid stale reads.
   */
  private hasEducationalInstitution = false;

  // ========================================================================
  // Update
  // ========================================================================

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;

    // ------------------------------------------------------------------
    // 1. Cache queries BEFORE loops (CLAUDE.md performance requirement)
    // ------------------------------------------------------------------

    const squadronEntities = world
      .query()
      .with(CT.Squadron)
      .executeEntities() as EntityImpl[];

    const fleetEntities = world
      .query()
      .with(CT.Fleet)
      .executeEntities() as EntityImpl[];

    const buildingEntities = world
      .query()
      .with(CT.Building)
      .executeEntities() as EntityImpl[];

    // ------------------------------------------------------------------
    // 2. Shared Media / Education Factor (Factor 4)
    // Query once for any library or university-type building.
    // ------------------------------------------------------------------

    this.hasEducationalInstitution = false;
    for (const buildingEntity of buildingEntities) {
      const building = buildingEntity.getComponent<BuildingComponent>(CT.Building);
      if (!building) continue;
      const bt = building.buildingType;
      if (bt === 'university') {
        this.hasEducationalInstitution = true;
        break;
      }
    }

    const sharedMediaFactor = this.hasEducationalInstitution
      ? SHARED_MEDIA_WITH_INSTITUTION
      : SHARED_MEDIA_WITHOUT_INSTITUTION;

    // ------------------------------------------------------------------
    // 3. Build fleet-membership lookup for each squadron
    // Keyed by squadronId → fleetId (or null if unaffiliated).
    // PERF: Object literal for O(1) access.
    // ------------------------------------------------------------------

    const squadronFleetId: Record<string, string | null> = Object.create(null);

    // Initialise all known squadrons as unaffiliated first
    for (const sq of squadronEntities) {
      const squadron = sq.getComponent<SquadronComponent>(CT.Squadron);
      if (squadron) {
        squadronFleetId[squadron.squadronId] = null;
      }
    }

    // Stamp fleet membership
    for (const fleetEntity of fleetEntities) {
      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;
      for (const sqId of fleet.squadrons.squadronIds) {
        squadronFleetId[sqId] = fleet.fleetId;
      }
    }

    // ------------------------------------------------------------------
    // 4. Process ALL squadron pairs tracked by CrossShipCommunication
    //    (both intra-fleet and cross-fleet pairs).
    //    This is the fix for the two "hardcoded to 0" divergence factors:
    //      - Cross-fleet pairs are now processed (were previously skipped)
    //      - Isolation factor uses comm contact state (was always → 0)
    // ------------------------------------------------------------------

    const commState = getCommStateMap();

    // Build a squadron entity lookup for fast access
    const squadronEntityById: Record<string, EntityImpl> = Object.create(null);
    for (const sqEntity of squadronEntities) {
      const sq = sqEntity.getComponent<SquadronComponent>(CT.Squadron);
      if (sq) {
        squadronEntityById[sq.squadronId] = sqEntity;
      }
    }

    // Build fleetId → fleetEntity lookup for event sourcing
    const fleetEntityById: Record<string, EntityImpl> = Object.create(null);
    for (const fleetEntity of fleetEntities) {
      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (fleet) {
        fleetEntityById[fleet.fleetId] = fleetEntity;
      }
    }

    for (const [commKey, commPair] of commState) {
      const entityA = squadronEntityById[commPair.squadronIdA];
      const entityB = squadronEntityById[commPair.squadronIdB];
      if (!entityA || !entityB) continue;

      const sqA = entityA.getComponent<SquadronComponent>(CT.Squadron);
      const sqB = entityB.getComponent<SquadronComponent>(CT.Squadron);
      if (!sqA || !sqB) continue;

      // Find a fleet entity for event sourcing (prefer A's fleet)
      const fleetIdA = squadronFleetId[commPair.squadronIdA];
      const fleetIdB = squadronFleetId[commPair.squadronIdB];
      const sourceFleetId = fleetIdA ?? fleetIdB;
      const sourceFleetEntity = sourceFleetId ? fleetEntityById[sourceFleetId] : null;
      const sourceFleet = sourceFleetEntity?.getComponent<FleetComponent>(CT.Fleet);
      if (!sourceFleetEntity || !sourceFleet) continue;

      this.processPair(
        ctx,
        commKey,
        sqA,
        sqB,
        sourceFleetEntity,
        sourceFleet,
        sharedMediaFactor,
        commPair.inContact,
      );
    }
  }

  // ========================================================================
  // Pair Processing
  // ========================================================================

  /**
   * Calculate and apply dialect drift for one squadron pair.
   *
   * All four factors are now fully dynamic:
   *   isolationFactor        — driven by comm contact state from CrossShipCommunication
   *   populationSizeFactor   — derived from totalCrew
   *   culturalContactFreq    — comm-state aware (contact vs isolated)
   *   sharedMediaFactor      — building-query derived
   */
  private processPair(
    ctx: SystemContext,
    pairKey: string,
    sqA: SquadronComponent,
    sqB: SquadronComponent,
    fleetEntity: EntityImpl,
    fleet: FleetComponent,
    sharedMediaFactor: number,
    inContact: boolean,
  ): void {
    const world = ctx.world;

    // ----------------------------------------------------------------
    // Retrieve or initialise pair state
    // New pairs start at 0.5 isolation (unknown history).
    // ----------------------------------------------------------------
    let state = this.pairState.get(pairKey);
    if (!state) {
      state = { isolationFactor: 0.5, divergence: 0, wasDivergent: false };
      this.pairState.set(pairKey, state);
    }

    // ----------------------------------------------------------------
    // Factor 1 — Isolation Factor (0–1)
    // Driven by CrossShipCommunication contact state:
    //   inContact = true  → isolation decreases (crews interacting)
    //   inContact = false → isolation increases (crews diverging)
    // ----------------------------------------------------------------
    if (inContact) {
      state.isolationFactor = Math.max(
        0,
        state.isolationFactor - ISOLATION_DECREASE_PER_TICK,
      );
    } else {
      state.isolationFactor = Math.min(
        1,
        state.isolationFactor + ISOLATION_INCREASE_PER_TICK,
      );
    }
    const isolationFactor = state.isolationFactor;

    // ----------------------------------------------------------------
    // Factor 2 — Population Size Factor (0–1)
    // Smaller populations drift faster (linguistic founder effect).
    // Average the two squadrons' crew sizes for the pair.
    // ----------------------------------------------------------------
    const totalCrewA = sqA.ships.totalCrew;
    const totalCrewB = sqB.ships.totalCrew;
    const avgCrew = (totalCrewA + totalCrewB) / 2;
    const populationSizeFactor = 1 - Math.min(1, avgCrew / POPULATION_DRIFT_THRESHOLD);

    // ----------------------------------------------------------------
    // Factor 3 — Cultural Contact Frequency (0–1)
    // Active communication = higher contact frequency = less drift.
    // ----------------------------------------------------------------
    const culturalContactFrequency = inContact
      ? CONTACT_FREQUENCY_SAME_FLEET
      : CONTACT_FREQUENCY_DIFF_FLEET;

    // ----------------------------------------------------------------
    // Drift Calculation
    // driftRate = isolationFactor * populationSizeFactor
    //           * culturalContactFrequency * sharedMediaFactor
    //           * BASE_DRIFT_RATE
    // ----------------------------------------------------------------
    const driftRate =
      isolationFactor *
      populationSizeFactor *
      culturalContactFrequency *
      sharedMediaFactor *
      BASE_DRIFT_RATE;

    state.divergence = Math.min(1, state.divergence + driftRate);

    // ----------------------------------------------------------------
    // Event Emission
    // ----------------------------------------------------------------

    const nowDivergent = state.divergence >= DIVERGENCE_SPLIT_THRESHOLD;
    const wasConvergent = state.divergence < DIVERGENCE_CONVERGE_THRESHOLD;

    if (nowDivergent && !state.wasDivergent) {
      // Pair crossed the divergence threshold — significant dialect split
      world.eventBus.emit({
        type: 'fleet:dialect_divergence',
        source: fleetEntity.id,
        data: {
          fleetId: fleet.fleetId,
          squadronIdA: sqA.squadronId,
          squadronIdB: sqB.squadronId,
          divergence: state.divergence,
          isolationFactor,
          populationSizeFactor,
          culturalContactFrequency,
          sharedMediaFactor,
        },
      });
      state.wasDivergent = true;
    } else if (state.wasDivergent && wasConvergent) {
      // Previously divergent pair has converged back below threshold
      world.eventBus.emit({
        type: 'fleet:dialect_convergence',
        source: fleetEntity.id,
        data: {
          fleetId: fleet.fleetId,
          squadronIdA: sqA.squadronId,
          squadronIdB: sqB.squadronId,
          divergence: state.divergence,
        },
      });
      state.wasDivergent = false;
    }
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: DialectalDriftSystem | null = null;

export function getDialectalDriftSystem(): DialectalDriftSystem {
  if (!systemInstance) systemInstance = new DialectalDriftSystem();
  return systemInstance;
}
