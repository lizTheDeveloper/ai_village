/**
 * CrossShipCommunicationSystem — Manages communication channels between
 * squadrons, tracking contact frequency and signal quality.
 *
 * Priority: 405 (after FleetCoherenceSystem, before DialectalDrift at 410)
 *
 * Tracks both intra-fleet and cross-fleet communication pairs.
 * Intra-fleet squadrons communicate regularly (shared command structure).
 * Cross-fleet squadrons communicate only when in the same star system.
 *
 * Exports a shared communication state map that DialectalDriftSystem reads
 * to inform its isolation and cultural contact factors.
 *
 * Events emitted:
 *   fleet:comm_established  — two squadrons begin communicating
 *   fleet:comm_lost         — two squadrons lose communication
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

// ============================================================================
// Constants
// ============================================================================

/** Ticks without contact before a channel is considered lost. */
const CHANNEL_TIMEOUT_TICKS = 2000; // 100 seconds at 20 TPS

/** Communication frequency for same-fleet squadron pairs (high — shared command). */
const SAME_FLEET_COMM_FREQUENCY = 0.8;

/** Communication frequency for cross-fleet pairs in the same system. */
const CROSS_FLEET_SAME_SYSTEM_COMM_FREQUENCY = 0.3;

// ============================================================================
// Shared State (exported for DialectalDriftSystem)
// ============================================================================

/**
 * Per-pair communication state. Keyed by canonical pair key
 * (`${idA}_${idB}` where idA < idB lexicographically).
 */
export interface CommPairState {
  /** Squadron IDs in this pair. */
  squadronIdA: string;
  squadronIdB: string;
  /** Whether the pair currently has an active communication channel. */
  inContact: boolean;
  /** Tick when last contact occurred. */
  lastContactTick: number;
  /** Communication frequency (0-1). Higher = more frequent contact. */
  commFrequency: number;
  /** Whether the pair is in the same fleet. */
  sameFleet: boolean;
}

/** Module-level shared state — DialectalDriftSystem reads this directly. */
const commStateMap = new Map<string, CommPairState>();

/** Accessor for other systems to read communication state. */
export function getCommStateMap(): ReadonlyMap<string, CommPairState> {
  return commStateMap;
}

/** Build a canonical pair key (alphabetically smaller ID first). Uses || separator to avoid collision with underscore-containing IDs. */
export function makeCommPairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}||${idB}` : `${idB}||${idA}`;
}

// ============================================================================
// System
// ============================================================================

export class CrossShipCommunicationSystem extends BaseSystem {
  public readonly id: SystemId = 'cross_ship_communication' as SystemId;
  public readonly priority: number = 405;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  public readonly activationComponents = ['fleet'] as const;
  public readonly metadata = {
    category: 'social' as const,
    description: 'Manages inter-squadron communication channels and contact tracking',
    dependsOn: ['fleet_coherence' as SystemId],
    writesComponents: [] as const,
  } as const;

  protected readonly throttleInterval = 200; // Every 10 seconds — matches DialectalDrift

  // ========================================================================
  // Caches
  // ========================================================================

  private squadronEntityCache: Record<string, EntityImpl | null> = Object.create(null);

  // ========================================================================
  // Update
  // ========================================================================

  protected onUpdate(ctx: SystemContext): void {
    const world = ctx.world;
    const currentTick = world.tick;

    // ------------------------------------------------------------------
    // 1. Cache queries BEFORE loops
    // ------------------------------------------------------------------

    const fleetEntities = world
      .query()
      .with(CT.Fleet)
      .executeEntities() as EntityImpl[];

    const squadronEntities = world
      .query()
      .with(CT.Squadron)
      .executeEntities() as EntityImpl[];

    // Rebuild squadron entity cache
    this.squadronEntityCache = Object.create(null);
    for (const sqEntity of squadronEntities) {
      const sq = sqEntity.getComponent<SquadronComponent>(CT.Squadron);
      if (sq) {
        this.squadronEntityCache[sq.squadronId] = sqEntity;
      }
    }

    // ------------------------------------------------------------------
    // 2. Build fleet membership and system location lookups
    // ------------------------------------------------------------------

    const fleetSystemId: Record<string, string> = Object.create(null);

    for (const fleetEntity of fleetEntities) {
      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;
      fleetSystemId[fleet.fleetId] = fleet.status.currentSystem;
    }

    // ------------------------------------------------------------------
    // 3. Track which pairs we see this tick (to detect lost channels)
    // ------------------------------------------------------------------

    const seenPairs = new Set<string>();

    // ------------------------------------------------------------------
    // 4. Process intra-fleet pairs (same fleet = always in contact)
    // ------------------------------------------------------------------

    for (const fleetEntity of fleetEntities) {
      const fleet = fleetEntity.getComponent<FleetComponent>(CT.Fleet);
      if (!fleet) continue;

      const sqIds = fleet.squadrons.squadronIds;

      for (let i = 0; i < sqIds.length - 1; i++) {
        const idA = sqIds[i];
        if (idA === undefined) continue;

        for (let j = i + 1; j < sqIds.length; j++) {
          const idB = sqIds[j];
          if (idB === undefined) continue;

          const pairKey = makeCommPairKey(idA, idB);
          seenPairs.add(pairKey);

          const existing = commStateMap.get(pairKey);
          const wasInContact = existing?.inContact ?? false;

          commStateMap.set(pairKey, {
            squadronIdA: idA < idB ? idA : idB,
            squadronIdB: idA < idB ? idB : idA,
            inContact: true,
            lastContactTick: currentTick,
            commFrequency: SAME_FLEET_COMM_FREQUENCY,
            sameFleet: true,
          });

          if (!wasInContact) {
            world.eventBus.emit({
              type: 'fleet:comm_established',
              source: fleetEntity.id,
              data: {
                squadronIdA: idA,
                squadronIdB: idB,
                sameFleet: true,
              },
            });
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // 5. Process cross-fleet pairs (different fleets, same star system)
    // ------------------------------------------------------------------

    for (let fi = 0; fi < fleetEntities.length - 1; fi++) {
      const fleetEntityA = fleetEntities[fi];
      if (!fleetEntityA) continue;
      const fleetA = fleetEntityA.getComponent<FleetComponent>(CT.Fleet);
      if (!fleetA) continue;

      for (let fj = fi + 1; fj < fleetEntities.length; fj++) {
        const fleetEntityB = fleetEntities[fj];
        if (!fleetEntityB) continue;
        const fleetB = fleetEntityB.getComponent<FleetComponent>(CT.Fleet);
        if (!fleetB) continue;

        // Cross-fleet communication requires same star system
        if (fleetA.status.currentSystem !== fleetB.status.currentSystem) continue;

        for (const sqIdA of fleetA.squadrons.squadronIds) {
          for (const sqIdB of fleetB.squadrons.squadronIds) {
            const pairKey = makeCommPairKey(sqIdA, sqIdB);
            seenPairs.add(pairKey);

            const existing = commStateMap.get(pairKey);
            const wasInContact = existing?.inContact ?? false;

            commStateMap.set(pairKey, {
              squadronIdA: sqIdA < sqIdB ? sqIdA : sqIdB,
              squadronIdB: sqIdA < sqIdB ? sqIdB : sqIdA,
              inContact: true,
              lastContactTick: currentTick,
              commFrequency: CROSS_FLEET_SAME_SYSTEM_COMM_FREQUENCY,
              sameFleet: false,
            });

            if (!wasInContact) {
              world.eventBus.emit({
                type: 'fleet:comm_established',
                source: fleetEntityA.id,
                data: {
                  squadronIdA: sqIdA,
                  squadronIdB: sqIdB,
                  sameFleet: false,
                },
              });
            }
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // 6. Expire stale channels (not seen this tick and timed out)
    // ------------------------------------------------------------------

    for (const [pairKey, state] of commStateMap) {
      if (seenPairs.has(pairKey)) continue;

      if (state.inContact && currentTick - state.lastContactTick >= CHANNEL_TIMEOUT_TICKS) {
        state.inContact = false;
        state.commFrequency = 0;

        world.eventBus.emit({
          type: 'fleet:comm_lost',
          source: 'cross_ship_communication',
          data: {
            squadronIdA: state.squadronIdA,
            squadronIdB: state.squadronIdB,
          },
        });
      }
    }
  }
}

// ============================================================================
// Singleton Factory
// ============================================================================

let systemInstance: CrossShipCommunicationSystem | null = null;

export function getCrossShipCommunicationSystem(): CrossShipCommunicationSystem {
  if (!systemInstance) {
    systemInstance = new CrossShipCommunicationSystem();
  }
  return systemInstance;
}
