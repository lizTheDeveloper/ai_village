import { describe, it, expect, beforeEach } from 'vitest';
import { GossipStore } from '../ship/GossipStore.js';
import type { GossipPacket, StarChartEntry } from '../ship/GossipPacket.js';
import { hashSpeciesId, revealSpeciesSightings } from '../ship/GossipPacket.js';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<StarChartEntry> = {}): StarChartEntry {
  return {
    starId: 'star-001',
    visitedAt: 100,
    observerShipId: 'ship-A',
    ...overrides,
  };
}

function makePacket(overrides: Partial<GossipPacket> = {}): GossipPacket {
  return {
    sourceShipId: 'ship-B',
    vectorClock: { 'ship-B': 1 },
    starChartEntries: [makeEntry({ observerShipId: 'ship-B' })],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Suite 1: Basic operations
// ---------------------------------------------------------------------------

describe('GossipStore - basic operations', () => {
  let store: GossipStore;

  beforeEach(() => {
    store = new GossipStore('ship-A');
  });

  it('stores an observation and it appears in getStarChartEntries', () => {
    const entry = makeEntry();
    store.addLocalObservation(entry);

    const entries = store.getStarChartEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject(entry);
  });

  it('getEntriesForStar returns only entries matching the starId', () => {
    // Two entries for star-001 from different observers → 2 entries after dedup
    store.addLocalObservation(makeEntry({ starId: 'star-001', observerShipId: 'ship-A' }));
    store.addLocalObservation(makeEntry({ starId: 'star-002', observerShipId: 'ship-A' }));
    store.addLocalObservation(makeEntry({ starId: 'star-001', observerShipId: 'ship-B', visitedAt: 200 }));

    const results = store.getEntriesForStar('star-001');
    expect(results).toHaveLength(2);
    for (const entry of results) {
      expect(entry.starId).toBe('star-001');
    }
  });

  it('getEntriesForStar returns empty array for unknown starId', () => {
    store.addLocalObservation(makeEntry({ starId: 'star-001' }));
    expect(store.getEntriesForStar('star-999')).toEqual([]);
  });

  it('empty store returns empty arrays', () => {
    expect(store.getStarChartEntries()).toEqual([]);
    expect(store.getEntriesForStar('star-001')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: receivePacket merge logic
// ---------------------------------------------------------------------------

describe('GossipStore - receivePacket merge logic', () => {
  let store: GossipStore;

  beforeEach(() => {
    store = new GossipStore('ship-A');
  });

  it('receiving a packet stores its star chart entries', () => {
    const packet = makePacket();
    store.receivePacket(packet);

    const entries = store.getStarChartEntries();
    expect(entries.length).toBeGreaterThan(0);
    const entry = entries.find(e => e.observerShipId === 'ship-B');
    expect(entry).toBeDefined();
  });

  it('vector clock merge takes max per ship', () => {
    // Bump local clock to ship-A:3 via createPacket calls
    store.createPacket(); // ship-A: 1
    store.createPacket(); // ship-A: 2
    store.createPacket(); // ship-A: 3

    // Receive packet with ship-A:1, ship-B:5, ship-C:2
    const packet = makePacket({
      sourceShipId: 'ship-B',
      vectorClock: { 'ship-A': 1, 'ship-B': 5, 'ship-C': 2 },
      starChartEntries: [],
    });
    store.receivePacket(packet);

    const outbound = store.createPacket();
    // ship-A should keep its own higher value (was 3, now 4 after createPacket)
    expect(outbound.vectorClock['ship-A']).toBe(4);
    // ship-B should take packet's higher value (5)
    expect(outbound.vectorClock['ship-B']).toBe(5);
    // ship-C only existed in packet (2)
    expect(outbound.vectorClock['ship-C']).toBe(2);
  });

  it('deduplication: same (starId, observerShipId) keeps entry with highest visitedAt', () => {
    // Add a local entry first
    store.addLocalObservation(makeEntry({ starId: 'star-001', observerShipId: 'ship-B', visitedAt: 50 }));

    // Receive a packet with a newer observation for the same (starId, observerShipId)
    const packet = makePacket({
      starChartEntries: [makeEntry({ starId: 'star-001', observerShipId: 'ship-B', visitedAt: 200 })],
    });
    store.receivePacket(packet);

    const entries = store.getEntriesForStar('star-001').filter(e => e.observerShipId === 'ship-B');
    expect(entries).toHaveLength(1);
    expect(entries[0].visitedAt).toBe(200);
  });

  it('deduplication: older incoming entry does not displace newer local entry', () => {
    store.addLocalObservation(makeEntry({ starId: 'star-001', observerShipId: 'ship-B', visitedAt: 300 }));

    const packet = makePacket({
      starChartEntries: [makeEntry({ starId: 'star-001', observerShipId: 'ship-B', visitedAt: 100 })],
    });
    store.receivePacket(packet);

    const entries = store.getEntriesForStar('star-001').filter(e => e.observerShipId === 'ship-B');
    expect(entries).toHaveLength(1);
    expect(entries[0].visitedAt).toBe(300);
  });

  it('multiple packets from different ships all get merged correctly', () => {
    const packetB = makePacket({
      sourceShipId: 'ship-B',
      vectorClock: { 'ship-B': 1 },
      starChartEntries: [makeEntry({ starId: 'star-010', observerShipId: 'ship-B' })],
    });
    const packetC = makePacket({
      sourceShipId: 'ship-C',
      vectorClock: { 'ship-C': 2 },
      starChartEntries: [makeEntry({ starId: 'star-020', observerShipId: 'ship-C' })],
    });

    store.receivePacket(packetB);
    store.receivePacket(packetC);

    const all = store.getStarChartEntries();
    const shipIds = all.map(e => e.observerShipId);
    expect(shipIds).toContain('ship-B');
    expect(shipIds).toContain('ship-C');
  });
});

// ---------------------------------------------------------------------------
// Suite 3: createPacket
// ---------------------------------------------------------------------------

describe('GossipStore - createPacket', () => {
  let store: GossipStore;

  beforeEach(() => {
    store = new GossipStore('ship-A');
  });

  it('creates a packet with the local ship ID as sourceShipId', () => {
    const packet = store.createPacket();
    expect(packet.sourceShipId).toBe('ship-A');
  });

  it('increments local vector clock entry on each call', () => {
    const first = store.createPacket();
    const firstClock = first.vectorClock['ship-A'] ?? 0;

    const second = store.createPacket();
    const secondClock = second.vectorClock['ship-A'] ?? 0;

    expect(secondClock).toBeGreaterThan(firstClock);
  });

  it('successive calls increment the vector clock each time', () => {
    const clocks: number[] = [];
    for (let i = 0; i < 3; i++) {
      const packet = store.createPacket();
      clocks.push(packet.vectorClock['ship-A'] ?? 0);
    }
    expect(clocks[1]).toBeGreaterThan(clocks[0]);
    expect(clocks[2]).toBeGreaterThan(clocks[1]);
  });

  it('includes all merged star chart entries', () => {
    store.addLocalObservation(makeEntry({ starId: 'star-001' }));
    store.receivePacket(
      makePacket({
        starChartEntries: [makeEntry({ starId: 'star-002', observerShipId: 'ship-B' })],
      }),
    );

    const packet = store.createPacket();
    const starIds = packet.starChartEntries.map(e => e.starId);
    expect(starIds).toContain('star-001');
    expect(starIds).toContain('star-002');
  });
});

// ---------------------------------------------------------------------------
// Suite 4: serialize / deserialize
// ---------------------------------------------------------------------------

describe('GossipStore - serialize/deserialize', () => {
  let store: GossipStore;

  beforeEach(() => {
    store = new GossipStore('ship-A');
  });

  it('round-trip: store with data → serialize → deserialize → same entries', () => {
    store.addLocalObservation(makeEntry({ starId: 'star-001', visitedAt: 42 }));
    store.receivePacket(
      makePacket({
        starChartEntries: [makeEntry({ starId: 'star-002', observerShipId: 'ship-B', visitedAt: 99 })],
      }),
    );

    const serialized = store.serialize();
    const restored = GossipStore.deserialize(serialized);

    const originalEntries = store.getStarChartEntries();
    const restoredEntries = restored.getStarChartEntries();

    expect(restoredEntries).toHaveLength(originalEntries.length);
    for (const orig of originalEntries) {
      const match = restoredEntries.find(
        e => e.starId === orig.starId && e.observerShipId === orig.observerShipId,
      );
      expect(match).toBeDefined();
      expect(match!.visitedAt).toBe(orig.visitedAt);
    }
  });

  it('deserialized store maintains the vector clock', () => {
    store.receivePacket(
      makePacket({
        vectorClock: { 'ship-B': 7 },
        starChartEntries: [],
      }),
    );

    const serialized = store.serialize();
    const restored = GossipStore.deserialize(serialized);

    const packet = restored.createPacket();
    expect(packet.vectorClock['ship-B']).toBe(7);
  });

  it('deserialized store can still receive new packets', () => {
    store.addLocalObservation(makeEntry({ starId: 'star-001' }));

    const serialized = store.serialize();
    const restored = GossipStore.deserialize(serialized);

    const newPacket = makePacket({
      sourceShipId: 'ship-C',
      vectorClock: { 'ship-C': 1 },
      starChartEntries: [makeEntry({ starId: 'star-003', observerShipId: 'ship-C' })],
    });
    restored.receivePacket(newPacket);

    const starIds = restored.getStarChartEntries().map(e => e.starId);
    expect(starIds).toContain('star-001');
    expect(starIds).toContain('star-003');
  });
});

// ---------------------------------------------------------------------------
// Suite 5: Species sighting gating (hashSpeciesId / revealSpeciesSightings)
// ---------------------------------------------------------------------------

describe('Species sighting gating - hashSpeciesId', () => {
  it('is deterministic: same input produces same output', () => {
    expect(hashSpeciesId('zorgon')).toBe(hashSpeciesId('zorgon'));
    expect(hashSpeciesId('crab-nebula-sentinel')).toBe(hashSpeciesId('crab-nebula-sentinel'));
  });

  it('produces different outputs for different inputs', () => {
    expect(hashSpeciesId('species-alpha')).not.toBe(hashSpeciesId('species-beta'));
    expect(hashSpeciesId('a')).not.toBe(hashSpeciesId('b'));
  });
});

describe('Species sighting gating - revealSpeciesSightings', () => {
  it('returns empty array when player knows no species', () => {
    const entry = makeEntry({
      speciesSightings: [hashSpeciesId('zorgon'), hashSpeciesId('vex')],
    });
    expect(revealSpeciesSightings(entry, new Set())).toEqual([]);
  });

  it('reveals species the player has encountered', () => {
    const entry = makeEntry({
      speciesSightings: [hashSpeciesId('zorgon'), hashSpeciesId('vex')],
    });
    const known = new Set(['zorgon', 'vex']);
    const revealed = revealSpeciesSightings(entry, known);
    expect(revealed).toContain('zorgon');
    expect(revealed).toContain('vex');
    expect(revealed).toHaveLength(2);
  });

  it('does NOT reveal species the player has not encountered', () => {
    const entry = makeEntry({
      speciesSightings: [hashSpeciesId('zorgon'), hashSpeciesId('vex')],
    });
    const known = new Set(['zorgon']); // only knows zorgon
    const revealed = revealSpeciesSightings(entry, known);
    expect(revealed).toContain('zorgon');
    expect(revealed).not.toContain('vex');
    expect(revealed).toHaveLength(1);
  });

  it('returns empty array for an entry with no speciesSightings field', () => {
    const entry = makeEntry(); // no speciesSightings
    expect(revealSpeciesSightings(entry, new Set(['zorgon']))).toEqual([]);
  });

  it('returns empty array for an entry with empty speciesSightings array', () => {
    const entry = makeEntry({ speciesSightings: [] });
    expect(revealSpeciesSightings(entry, new Set(['zorgon']))).toEqual([]);
  });
});
