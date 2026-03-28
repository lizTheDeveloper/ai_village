/**
 * GossipStore - Ship-side storage for the gossip protocol
 *
 * Maintains:
 * - Received gossip packets keyed by source ship ID
 * - A local vector clock tracking this ship's knowledge
 * - A merged star chart deduplicated by (starId, observerShipId)
 *
 * The gossip protocol lets ships exchange star chart observations
 * passively when in proximity, propagating knowledge across the fleet
 * without central coordination.
 */

import type { GossipPacket, StarChartEntry } from './GossipPacket.js';

// ============================================================================
// Serialization interface
// ============================================================================

export interface GossipStoreData {
  localShipId: string;
  vectorClock: Record<string, number>;
  starChartEntries: [string, StarChartEntry][]; // Map entries as tuples
  packets: [string, GossipPacket][];            // Map entries as tuples
}

// ============================================================================
// GossipStore
// ============================================================================

export class GossipStore {
  private readonly localShipId: string;

  /** Vector clock: tracks the highest known logical time per ship. */
  private vectorClock: Record<string, number>;

  /**
   * Merged star chart keyed by `${starId}:${observerShipId}`.
   * Only the entry with the highest visitedAt is kept per key.
   */
  private readonly starChart: Map<string, StarChartEntry>;

  /** Raw packets received, keyed by source ship ID. */
  private readonly packets: Map<string, GossipPacket>;

  // ========================================================================
  // Constructor
  // ========================================================================

  constructor(localShipId: string) {
    if (!localShipId) {
      throw new Error('[GossipStore] localShipId must be a non-empty string');
    }

    this.localShipId = localShipId;
    this.vectorClock = { [localShipId]: 0 };
    this.starChart = new Map();
    this.packets = new Map();
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Process an incoming gossip packet from another ship.
   *
   * - Merges vector clocks (takes max per ship)
   * - Deduplicates star chart entries by (starId, observerShipId),
   *   keeping the entry with the highest visitedAt
   * - Stores the raw packet
   */
  receivePacket(packet: GossipPacket): void {
    if (!packet.sourceShipId) {
      throw new Error('[GossipStore] Received packet with missing sourceShipId');
    }

    // Merge vector clocks: take max per ship
    for (const [shipId, time] of Object.entries(packet.vectorClock)) {
      const current = this.vectorClock[shipId] ?? 0;
      if (time > current) {
        this.vectorClock[shipId] = time;
      }
    }

    // Merge star chart entries
    for (const entry of packet.starChartEntries) {
      this.mergeEntry(entry);
    }

    // Store raw packet (last writer wins per source ship)
    this.packets.set(packet.sourceShipId, packet);
  }

  /**
   * Build a gossip packet from local data for sending to another ship.
   * Increments the local ship's vector clock before packaging.
   */
  createPacket(): GossipPacket {
    const current = this.vectorClock[this.localShipId] ?? 0;
    this.vectorClock[this.localShipId] = current + 1;

    return {
      sourceShipId: this.localShipId,
      vectorClock: { ...this.vectorClock },
      starChartEntries: Array.from(this.starChart.values()),
    };
  }

  /**
   * Record a star the local ship has visited or observed directly.
   */
  addLocalObservation(entry: StarChartEntry): void {
    if (!entry.starId) {
      throw new Error('[GossipStore] StarChartEntry must have a non-empty starId');
    }
    if (!entry.observerShipId) {
      throw new Error('[GossipStore] StarChartEntry must have a non-empty observerShipId');
    }

    this.mergeEntry(entry);
  }

  /** Return all known star chart entries. */
  getStarChartEntries(): StarChartEntry[] {
    return Array.from(this.starChart.values());
  }

  /**
   * Return all known observations of a specific star (may come from
   * multiple observer ships).
   */
  getEntriesForStar(starId: string): StarChartEntry[] {
    const results: StarChartEntry[] = [];
    for (const entry of this.starChart.values()) {
      if (entry.starId === starId) {
        results.push(entry);
      }
    }
    return results;
  }

  // ========================================================================
  // Serialization
  // ========================================================================

  serialize(): GossipStoreData {
    return {
      localShipId: this.localShipId,
      vectorClock: { ...this.vectorClock },
      starChartEntries: Array.from(this.starChart.entries()),
      packets: Array.from(this.packets.entries()),
    };
  }

  static deserialize(data: GossipStoreData): GossipStore {
    if (!data.localShipId) {
      throw new Error('[GossipStore] Serialized data missing localShipId');
    }
    if (!data.vectorClock || typeof data.vectorClock !== 'object') {
      throw new Error('[GossipStore] Serialized data missing or invalid vectorClock');
    }
    if (!Array.isArray(data.starChartEntries)) {
      throw new Error('[GossipStore] Serialized data missing starChartEntries array');
    }
    if (!Array.isArray(data.packets)) {
      throw new Error('[GossipStore] Serialized data missing packets array');
    }

    const store = new GossipStore(data.localShipId);
    store.vectorClock = { ...data.vectorClock };

    for (const [key, entry] of data.starChartEntries) {
      store.starChart.set(key, entry);
    }

    for (const [shipId, packet] of data.packets) {
      store.packets.set(shipId, packet);
    }

    return store;
  }

  // ========================================================================
  // Private helpers
  // ========================================================================

  /**
   * Insert or update a star chart entry.
   * Key is `${starId}:${observerShipId}`. Keeps the entry with the
   * highest visitedAt to ensure monotonic progress.
   */
  private mergeEntry(entry: StarChartEntry): void {
    const key = `${entry.starId}:${entry.observerShipId}`;
    const existing = this.starChart.get(key);

    if (!existing || entry.visitedAt > existing.visitedAt) {
      this.starChart.set(key, entry);
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let gossipStoreInstance: GossipStore | null = null;

/**
 * Return the initialized GossipStore singleton.
 * Throws if `initGossipStore` has not been called yet.
 */
export function getGossipStore(): GossipStore {
  if (!gossipStoreInstance) {
    throw new Error(
      '[GossipStore] Not initialized. Call initGossipStore(localShipId) before getGossipStore().'
    );
  }
  return gossipStoreInstance;
}

/**
 * Create and register the GossipStore singleton for this ship.
 * Must be called once during ship initialization.
 */
export function initGossipStore(localShipId: string): GossipStore {
  gossipStoreInstance = new GossipStore(localShipId);
  return gossipStoreInstance;
}
