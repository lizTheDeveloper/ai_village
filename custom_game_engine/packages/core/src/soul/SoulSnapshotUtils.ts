/**
 * Soul Snapshot Utilities - Track soul positions in timeline snapshots
 *
 * Integrates with TimelineManager to record soul thread positions at snapshot time.
 * Enables proper fork mechanics where souls continue their personal timeline across universes.
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SilverThreadComponent } from './SilverThreadComponent.js';
import type { SoulIdentityComponent } from './SoulIdentityComponent.js';
import { recordSnapshotWaypoint } from './SilverThreadComponent.js';

/**
 * Soul position at snapshot time
 */
export interface SoulSnapshotPosition {
  soul_id: string;
  personal_tick: number;
  segment_index: number;

  // Current state
  current_incarnation?: string;  // Agent ID if incarnated
  active_plots: string[];        // Plot instance IDs
  wisdom_level: number;

  // For validation
  checksum: string;
}

/**
 * Extended timeline entry with soul positions
 */
export interface SoulAwareTimelineEntry {
  // Soul positions at snapshot time
  soul_positions: Map<string, SoulSnapshotPosition>;
}

/**
 * Record soul positions for all souls in the world
 */
export function recordSoulPositions(world: World, snapshot_id: string): Map<string, SoulSnapshotPosition> {
  const positions = new Map<string, SoulSnapshotPosition>();

  // Find all soul entities
  const soulEntities = world.query()
    .with(ComponentType.SoulIdentity)
    .with(ComponentType.SilverThread)
    .executeEntities();

  for (const soulEntity of soulEntities) {
    const identity = soulEntity.getComponent(ComponentType.SoulIdentity);
    const thread = soulEntity.getComponent(ComponentType.SilverThread);
    const plotLines = soulEntity.getComponent(ComponentType.PlotLines);

    if (!identity || !thread) continue;

    // Find current incarnation (agent with soul link to this soul)
    let currentIncarnation: string | undefined;
    const agents = world.query()
      .with(ComponentType.SoulLink)
      .executeEntities();

    for (const agent of agents) {
      const link = agent.getComponent(ComponentType.SoulLink);
      if (link?.soul_id === soulEntity.id && link.is_primary_incarnation) {
        currentIncarnation = agent.id;
        break;
      }
    }

    // Record position
    const position: SoulSnapshotPosition = {
      soul_id: soulEntity.id,
      personal_tick: thread.head.personal_tick,
      segment_index: thread.head.segment_index,
      current_incarnation: currentIncarnation,
      active_plots: plotLines?.active.map(p => p.instance_id) || [],
      wisdom_level: identity.wisdom_level,
      checksum: computeSoulChecksum(identity, thread),
    };

    positions.set(soulEntity.id, position);

    // Record snapshot waypoint on soul's thread
    recordSnapshotWaypoint(thread, snapshot_id);
  }

  return positions;
}

/**
 * Compute a checksum for soul validation
 */
function computeSoulChecksum(identity: SoulIdentityComponent, thread: SilverThreadComponent): string {
  // Simple checksum: hash of key soul properties
  const data = `${identity.true_name}:${identity.created_at}:${thread.totals.personal_ticks}:${identity.wisdom_level}`;

  // Simple hash function (good enough for validation)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return hash.toString(36);
}

/**
 * Validate a soul against its snapshot position
 */
export function validateSoulPosition(
  soul: Entity,
  position: SoulSnapshotPosition
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const identity = soul.getComponent(ComponentType.SoulIdentity);
  const thread = soul.getComponent(ComponentType.SilverThread);

  if (!identity) {
    errors.push('Missing SoulIdentity component');
    return { valid: false, errors };
  }

  if (!thread) {
    errors.push('Missing SilverThread component');
    return { valid: false, errors };
  }

  // Validate checksum
  const currentChecksum = computeSoulChecksum(identity, thread);
  if (currentChecksum !== position.checksum) {
    errors.push(`Checksum mismatch: expected ${position.checksum}, got ${currentChecksum}`);
  }

  // Validate personal tick progression (should be >= snapshot tick)
  if (thread.head.personal_tick < position.personal_tick) {
    errors.push(`Personal tick regressed: was ${position.personal_tick}, now ${thread.head.personal_tick}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Find all souls in a snapshot
 */
export function getSoulsInSnapshot(snapshot: { soul_positions?: Map<string, SoulSnapshotPosition> }): string[] {
  if (!snapshot.soul_positions) return [];
  return Array.from(snapshot.soul_positions.keys());
}

/**
 * Get soul position from snapshot
 */
export function getSoulPosition(
  snapshot: { soul_positions?: Map<string, SoulSnapshotPosition> },
  soul_id: string
): SoulSnapshotPosition | undefined {
  return snapshot.soul_positions?.get(soul_id);
}
