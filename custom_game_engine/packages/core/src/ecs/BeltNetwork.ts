/**
 * BeltNetwork - Factorio-style belt optimization
 *
 * Instead of processing each belt individually every tick,
 * belts are grouped into "networks" (consecutive belts in the same direction).
 *
 * Benefits:
 * - Process entire network in one operation
 * - Skip intermediate transfer calculations
 * - Only update when items enter/exit network
 *
 * This significantly reduces per-tick processing for long belt chains.
 */

import type { EntityId } from '../types.js';
import type { World } from './World.js';
import type { BeltComponent, BeltDirection, BeltTier } from '../components/BeltComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { EntityImpl } from './Entity.js';
import { BELT_SPEEDS } from '../components/BeltComponent.js';

/**
 * A network segment represents consecutive belts in the same direction.
 * Instead of processing each belt individually, we process the entire segment.
 */
export interface BeltNetworkSegment {
  /** Unique identifier for this network segment */
  id: string;

  /** First belt where items enter this segment */
  headEntityId: EntityId;

  /** Last belt where items exit this segment */
  tailEntityId: EntityId;

  /** All belt entity IDs in this segment (ordered from head to tail) */
  beltIds: ReadonlyArray<EntityId>;

  /** Shared direction of all belts in segment */
  direction: BeltDirection;

  /** Sum of all belt capacities in segment */
  totalCapacity: number;

  /** Minimum tier of all belts (bottleneck speed) */
  tier: BeltTier;

  /** Length of segment in tiles */
  length: number;

  /** Items currently in transit through this segment */
  transitItems: TransitItem[];
}

/**
 * Item in transit through a network segment.
 * Tracks when it will reach the tail belt.
 */
export interface TransitItem {
  /** Item definition ID */
  itemId: string;

  /** Quantity of this item type */
  count: number;

  /** Tick when item entered the network head */
  enteredTick: number;

  /** Tick when item will reach the network tail */
  exitTick: number;
}

/**
 * BeltNetworkManager - Manages belt network optimization
 *
 * Scans belts and groups consecutive same-direction belts into segments.
 * Processes entire segments as units instead of individual belts.
 */
export class BeltNetworkManager {
  /** Map of belt entity ID -> network segment it belongs to */
  private beltToNetwork: Map<EntityId, BeltNetworkSegment> = new Map();

  /** All network segments */
  private segments: Map<string, BeltNetworkSegment> = new Map();

  /** Flag indicating networks need rebuilding */
  private dirty = true;

  /** Next network segment ID */
  private nextSegmentId = 0;

  /** Current world tick (for transit calculations) */
  private currentTick = 0;

  /**
   * Mark networks as needing rebuild.
   * Call this when belts are added/removed.
   */
  markDirty(): void {
    this.dirty = true;
  }

  /**
   * Build network segments from world belts.
   * Groups consecutive same-direction belts into segments.
   */
  buildNetworks(world: World): void {
    if (!this.dirty) return;

    // Clear existing networks
    this.beltToNetwork.clear();
    this.segments.clear();

    // Get all belt entities
    const beltEntities = world.query()
      .with(CT.Belt)
      .with(CT.Position)
      .executeEntities();

    // Build position lookup for fast neighbor finding
    const positionMap = this.buildPositionMap(world, beltEntities);

    // Track which belts have been assigned to a network
    const assigned = new Set<EntityId>();

    // Build segments by following chains
    for (const entity of beltEntities) {
      if (assigned.has(entity.id)) continue;

      const segment = this.buildSegmentFrom(entity, positionMap, assigned, world);
      if (segment) {
        this.segments.set(segment.id, segment);
        for (const beltId of segment.beltIds) {
          this.beltToNetwork.set(beltId, segment);
        }
      }
    }

    this.dirty = false;
  }

  /**
   * Get the network segment for a belt entity.
   */
  getNetwork(beltId: EntityId): BeltNetworkSegment | null {
    return this.beltToNetwork.get(beltId) ?? null;
  }

  /**
   * Get all network segments.
   */
  getAllSegments(): ReadonlyArray<BeltNetworkSegment> {
    return Array.from(this.segments.values());
  }

  /**
   * Process all network segments.
   * Updates transit items and handles item entry/exit.
   */
  processNetworks(world: World, tick: number): void {
    this.currentTick = tick;

    // Rebuild if dirty
    this.buildNetworks(world);

    // Process each segment
    for (const segment of this.segments.values()) {
      this.processSegment(segment, world);
    }
  }

  /**
   * Build position lookup map for fast neighbor finding.
   */
  private buildPositionMap(
    world: World,
    entities: ReadonlyArray<any>
  ): Map<string, EntityId> {
    const map = new Map<string, EntityId>();

    for (const entity of entities) {
      const pos = (entity as EntityImpl).getComponent<PositionComponent>(CT.Position);
      if (!pos) continue;

      const key = this.positionKey(Math.floor(pos.x), Math.floor(pos.y));
      map.set(key, entity.id);
    }

    return map;
  }

  /**
   * Build a network segment starting from a belt entity.
   */
  private buildSegmentFrom(
    startEntity: any,
    positionMap: Map<string, EntityId>,
    assigned: Set<EntityId>,
    world: World
  ): BeltNetworkSegment | null {
    const startBelt = (startEntity as EntityImpl).getComponent<BeltComponent>(CT.Belt);
    const startPos = (startEntity as EntityImpl).getComponent<PositionComponent>(CT.Position);

    if (!startBelt || !startPos) return null;

    // Build chain by following direction
    const chain: Array<{ id: EntityId; belt: BeltComponent; pos: PositionComponent }> = [];
    let currentId = startEntity.id;
    let currentPos = startPos;
    let currentBelt = startBelt;

    const direction = startBelt.direction;
    let minTier = startBelt.tier;
    let totalCapacity = 0;

    // Follow chain forward
    while (currentBelt && currentBelt.direction === direction) {
      // Add to chain
      chain.push({ id: currentId, belt: currentBelt, pos: currentPos });
      assigned.add(currentId);

      // Update aggregate stats
      minTier = Math.min(minTier, currentBelt.tier) as BeltTier;
      totalCapacity += currentBelt.capacity;

      // Find next belt in direction
      const nextPos = this.getNextPosition(currentPos, direction);
      const nextId = positionMap.get(this.positionKey(nextPos.x, nextPos.y));

      if (!nextId || assigned.has(nextId)) break;

      const nextEntity = world.getEntity(nextId);
      if (!nextEntity) break;

      const nextBelt = (nextEntity as EntityImpl).getComponent<BeltComponent>(CT.Belt);
      const nextPosComp = (nextEntity as EntityImpl).getComponent<PositionComponent>(CT.Position);

      if (!nextBelt || !nextPosComp) break;

      // Check if next belt continues in same direction
      if (nextBelt.direction !== direction) break;

      // Continue chain
      currentId = nextId;
      currentBelt = nextBelt;
      currentPos = nextPosComp;
    }

    // Don't create single-belt networks (no optimization benefit)
    if (chain.length < 2) {
      // Still mark as assigned to prevent reprocessing
      return null;
    }

    // Create segment
    const segmentId = `segment_${this.nextSegmentId++}`;
    const segment: BeltNetworkSegment = {
      id: segmentId,
      headEntityId: chain[0]!.id,
      tailEntityId: chain[chain.length - 1]!.id,
      beltIds: chain.map(c => c.id),
      direction,
      totalCapacity,
      tier: minTier,
      length: chain.length,
      transitItems: [],
    };

    return segment;
  }

  /**
   * Process a single network segment.
   * Handles item transit through the network.
   */
  private processSegment(segment: BeltNetworkSegment, world: World): void {
    // Process items in transit - check if any reach the tail
    this.processTransitItems(segment, world);

    // Check head belt for new items entering the network
    this.processHeadBelt(segment, world);
  }

  /**
   * Process items in transit through the segment.
   * Move items that reach the tail belt to the next destination.
   */
  private processTransitItems(segment: BeltNetworkSegment, world: World): void {
    const tailEntity = world.getEntity(segment.tailEntityId);
    if (!tailEntity) return;

    const tailBelt = (tailEntity as EntityImpl).getComponent<BeltComponent>(CT.Belt);
    if (!tailBelt) return;

    // Check for items that have reached the tail
    const remaining: TransitItem[] = [];

    for (const item of segment.transitItems) {
      if (this.currentTick >= item.exitTick) {
        // Item reached tail - try to transfer to next belt/machine
        // For now, accumulate on tail belt (full implementation would handle transfer)
        tailBelt.itemId = item.itemId;
        tailBelt.count = Math.min(tailBelt.capacity, tailBelt.count + item.count);
        tailBelt.transferProgress = 1.0; // Ready to transfer out
      } else {
        // Still in transit
        remaining.push(item);
      }
    }

    segment.transitItems = remaining;
  }

  /**
   * Process the head belt of a segment.
   * When items are added to the head, calculate transit time to tail.
   */
  private processHeadBelt(segment: BeltNetworkSegment, world: World): void {
    const headEntity = world.getEntity(segment.headEntityId);
    if (!headEntity) return;

    const headBelt = (headEntity as EntityImpl).getComponent<BeltComponent>(CT.Belt);
    if (!headBelt) return;

    // If head has items and sufficient transfer progress, move to transit
    if (headBelt.count > 0 && headBelt.transferProgress >= 1.0 && headBelt.itemId) {
      // Calculate ticks to traverse the network
      const speed = BELT_SPEEDS[segment.tier];
      const ticksToTraverse = Math.ceil(segment.length / speed);

      // Move items from head to transit
      const itemsToTransfer = 1; // Transfer 1 item at a time (like original system)
      const actualTransfer = Math.min(itemsToTransfer, headBelt.count);

      if (actualTransfer > 0) {
        // Add to transit
        segment.transitItems.push({
          itemId: headBelt.itemId,
          count: actualTransfer,
          enteredTick: this.currentTick,
          exitTick: this.currentTick + ticksToTraverse,
        });

        // Remove from head
        headBelt.count -= actualTransfer;
        if (headBelt.count === 0) {
          headBelt.itemId = null;
        }
        headBelt.transferProgress = 0.0;
      }
    }
  }

  /**
   * Get next position in direction.
   */
  private getNextPosition(pos: PositionComponent, dir: BeltDirection): { x: number; y: number } {
    switch (dir) {
      case 'north': return { x: Math.floor(pos.x), y: Math.floor(pos.y) - 1 };
      case 'south': return { x: Math.floor(pos.x), y: Math.floor(pos.y) + 1 };
      case 'east':  return { x: Math.floor(pos.x) + 1, y: Math.floor(pos.y) };
      case 'west':  return { x: Math.floor(pos.x) - 1, y: Math.floor(pos.y) };
    }
  }

  /**
   * Create position key for lookup.
   */
  private positionKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Get statistics about the network.
   */
  getStats(): {
    totalSegments: number;
    totalBelts: number;
    averageSegmentLength: number;
    longestSegment: number;
  } {
    const segments = Array.from(this.segments.values());

    if (segments.length === 0) {
      return {
        totalSegments: 0,
        totalBelts: 0,
        averageSegmentLength: 0,
        longestSegment: 0,
      };
    }

    const totalBelts = segments.reduce((sum, s) => sum + s.length, 0);
    const longestSegment = Math.max(...segments.map(s => s.length));

    return {
      totalSegments: segments.length,
      totalBelts,
      averageSegmentLength: totalBelts / segments.length,
      longestSegment,
    };
  }

  /**
   * Reset all state (for testing or game restart).
   */
  reset(): void {
    this.beltToNetwork.clear();
    this.segments.clear();
    this.dirty = true;
    this.nextSegmentId = 0;
    this.currentTick = 0;
  }
}

/**
 * Singleton instance for global access.
 * Systems can use this to optimize belt processing.
 */
export const beltNetworkManager = new BeltNetworkManager();
