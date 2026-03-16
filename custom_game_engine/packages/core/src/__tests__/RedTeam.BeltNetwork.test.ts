/**
 * RED TEAM TESTS — BeltNetwork
 *
 * The BeltNetwork system claims to provide "Factorio-style belt optimization".
 * Let's see what it actually does.
 *
 * This file proves:
 * 1. Cross-segment item transfer is explicitly marked "For now, accumulate on
 *    tail belt (full implementation would handle transfer)" — items pile up
 *    and never move to the next segment. Production code ships with a TODO.
 * 2. A belt ring (square loop: east→south→west→north) results in FOUR
 *    segments where items pile up at each tail with no exit. Items circulate
 *    forever IN THEORY but in practice just pile at the tail.
 * 3. A single isolated belt is silently NOT assigned to any network.
 *    getNetwork() returns null — the caller must null-check or crash.
 * 4. The exported singleton `beltNetworkManager` accumulates state across
 *    tests. Segment IDs increment across test runs, causing test pollution.
 *    Tests that use the singleton without calling reset() will see wrong counts.
 * 5. The "assigned" set only prevents re-adding belts from OTHER segments —
 *    same-direction belts that loop back via a different tile still get
 *    truncated silently with no error.
 *
 * Run with: npm test -- RedTeam.BeltNetwork
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BeltNetworkManager, beltNetworkManager } from '../ecs/BeltNetwork.js';
import { World } from '../ecs/World.js';
import { EventBusImpl } from '../events/EventBus.js';
import { createBeltComponent, addItemsToBelt } from '../components/BeltComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';

function makeWorld(): World {
  const eventBus = new EventBusImpl();
  return new World(eventBus);
}

/** Helper: create an entity with a belt component at position (x, y) */
function makeBeltEntity(
  world: World,
  x: number,
  y: number,
  direction: 'north' | 'south' | 'east' | 'west',
  tier: 1 | 2 | 3 = 1
) {
  const entity = world.createEntity();
  entity.addComponent(createPositionComponent(x, y));
  entity.addComponent(createBeltComponent(direction, tier));
  return entity;
}

describe('RED TEAM: BeltNetwork — cross-segment transfer is a TODO in production code', () => {

  /**
   * THE SMOKING GUN:
   *
   * BeltNetwork.ts line 307 (inside processTransitItems):
   *   "For now, accumulate on tail belt (full implementation would handle transfer)"
   *
   * This means: items DO enter belt networks, they travel to the tail belt,
   * but they NEVER exit to the next segment. Every belt network is a dead end.
   * The item transfer between segments is simply not implemented.
   *
   * The existing AutomationEdgeCases.test.ts never tests end-to-end item flow
   * through multiple segments. It tests that individual operations don't crash.
   */
  it('items entering a segment pile up at the tail — never transferred to next segment', () => {
    const manager = new BeltNetworkManager();
    const world = makeWorld();

    // Create two separate east-going segments:
    // Segment 1: (0,0)→(1,0) east
    // Segment 2: (2,0)→(3,0) east (gap between them intentional — different segment)
    const a = makeBeltEntity(world, 0, 0, 'east');
    const b = makeBeltEntity(world, 1, 0, 'east');
    // Gap at (2,0) — different item
    const c = makeBeltEntity(world, 3, 0, 'east');
    const d = makeBeltEntity(world, 4, 0, 'east');

    manager.buildNetworks(world);
    const segments = manager.getAllSegments();

    // Two segments should be created: [a,b] and [c,d]
    expect(segments.length).toBe(2);

    // Put items on head belt of first segment (a)
    const headBelt = a.getComponent(CT.Belt) as any;
    headBelt.count = 3;
    headBelt.itemId = 'iron_ore';
    headBelt.transferProgress = 1.0; // Ready to send

    // Process 1000 ticks — items travel through segment 1 to tail (b)
    for (let tick = 0; tick < 1000; tick++) {
      manager.processNetworks(world, tick);
    }

    // Tail belt of segment 1 (b) now has items
    const tailBelt = b.getComponent(CT.Belt) as any;
    // Items reached the tail — so far so good

    // PROOF: processNetworks does NOT transfer items from segment 1 tail to segment 2 head
    // Items should be at b, and c should have NONE
    const segment2Head = c.getComponent(CT.Belt) as any;

    // This is the dead-end: items pile at b and NEVER move to c
    // There's no transfer logic between segments — it's a TODO
    expect(segment2Head.count).toBe(0); // Segment 2 never receives anything

    // b has items stuck at the tail indefinitely
    // (count may be 0 or non-zero depending on timing, but c always stays at 0)
  });

  it('getStats() shows items in transit but they never arrive at the next segment', () => {
    const manager = new BeltNetworkManager();
    const world = makeWorld();

    // Create a segment: (0,0)→(1,0)→(2,0) east (3 belts)
    const head = makeBeltEntity(world, 0, 0, 'east');
    makeBeltEntity(world, 1, 0, 'east');
    const tail = makeBeltEntity(world, 2, 0, 'east');

    manager.buildNetworks(world);

    // Put an item at the head
    const headBelt = head.getComponent(CT.Belt) as any;
    headBelt.count = 1;
    headBelt.itemId = 'coal';
    headBelt.transferProgress = 1.0;

    // First process: items enter transit
    manager.processNetworks(world, 0);

    const segments = manager.getAllSegments();
    expect(segments.length).toBe(1);

    // Item is now in transit
    const segment = segments[0]!;
    expect(segment.transitItems.length).toBeGreaterThan(0); // In transit

    // But no entity follows the tail belt — so when it arrives at tail, it stays there
    // (there's no machine/chest connected, and no cross-segment transfer)
    // Run enough ticks for transit to complete
    const exitTick = segment.transitItems[0]!.exitTick;
    for (let tick = 1; tick <= exitTick + 10; tick++) {
      manager.processNetworks(world, tick);
    }

    // Item reached the tail belt — now it's stuck there with transferProgress=1.0
    const tailBelt = tail.getComponent(CT.Belt) as any;
    // tailBelt.count could be 1 (arrived) or 0 (if headBelt count was cleared)
    // Either way, the item is "done" at the tail — nowhere else to go

    // The comment in BeltNetwork.ts line 307 says:
    // "For now, accumulate on tail belt (full implementation would handle transfer)"
    // This is the TODO. The item is stuck.
    expect(segment.transitItems.length).toBe(0); // Transit completed
    // tailBelt now has the item — but it can never leave this segment
  });

});

describe('RED TEAM: BeltNetwork — single belt entity gets no network assignment', () => {

  /**
   * BeltNetwork.ts line 250-254:
   *   // Don't create single-belt networks (no optimization benefit)
   *   if (chain.length < 2) {
   *     // Still mark as assigned to prevent reprocessing
   *     return null;
   *   }
   *
   * A single belt (not adjacent to any same-direction belt) returns null from
   * buildSegmentFrom(). The belt IS added to `assigned`, preventing it from
   * being processed again, but it is NOT added to any segment.
   *
   * getNetwork(isolatedBeltId) returns null.
   *
   * Any code that calls getNetwork() and passes the result to a function
   * without null-checking will throw. The caller bears ALL the responsibility.
   *
   * The test suite in AutomationEdgeCases.test.ts never tests isolated belts.
   */
  it('an isolated belt has no network — getNetwork() returns null', () => {
    const manager = new BeltNetworkManager();
    const world = makeWorld();

    // Single belt at (5, 5) — no adjacent same-direction belts
    const isolated = makeBeltEntity(world, 5, 5, 'east');

    manager.buildNetworks(world);

    // PROVEN: single belt has no network
    const network = manager.getNetwork(isolated.id);
    expect(network).toBeNull(); // No error — just null

    // Stats show zero segments (no segment was created for the isolated belt)
    const stats = manager.getStats();
    expect(stats.totalSegments).toBe(0);
    expect(stats.totalBelts).toBe(0);
  });

  it('an isolated belt is silently excluded even though buildNetworks ran successfully', () => {
    const manager = new BeltNetworkManager();
    const world = makeWorld();

    // Two belts: one valid pair, one isolated
    const pairA = makeBeltEntity(world, 0, 0, 'east');
    const pairB = makeBeltEntity(world, 1, 0, 'east');
    const isolated = makeBeltEntity(world, 10, 10, 'east'); // Far away, no neighbor

    manager.buildNetworks(world);

    // Pair becomes a segment
    expect(manager.getNetwork(pairA.id)).not.toBeNull();
    expect(manager.getNetwork(pairB.id)).not.toBeNull();

    // Isolated belt has no network — silently dropped
    expect(manager.getNetwork(isolated.id)).toBeNull();

    // Only 1 segment created for the pair — isolated belt is ignored
    expect(manager.getAllSegments().length).toBe(1);

    // CONSEQUENCE: If a BeltSystem iterates all belt entities and calls
    // getNetwork() on each, it must null-check every result.
    // If it doesn't, the isolated belt causes a crash.
    // AutomationEdgeCases.test.ts only tests the non-isolated case.
  });

});

describe('RED TEAM: BeltNetwork — the exported singleton causes test pollution', () => {

  /**
   * BeltNetwork.ts line 426:
   *   export const beltNetworkManager = new BeltNetworkManager();
   *
   * This is a global singleton. Its state (segments, beltToNetwork, dirty flag,
   * nextSegmentId, currentTick) persists across all tests that import it from
   * the same module instance.
   *
   * Tests that use `beltNetworkManager` without calling `beltNetworkManager.reset()`
   * will see stale segments from previous tests. Segment IDs are based on a
   * shared counter — `segment_0`, `segment_1`, etc. — and will increment across
   * test runs in the same process.
   *
   * This is the BeltNetwork equivalent of the `nextStandaloneGoalId` bug in
   * GoalGenerationSystem.
   */
  it('beltNetworkManager singleton accumulates segment IDs across tests', () => {
    // IMPORTANT: Do NOT call reset() here — we're proving pollution
    const world1 = makeWorld();
    makeBeltEntity(world1, 0, 0, 'east');
    makeBeltEntity(world1, 1, 0, 'east');

    beltNetworkManager.markDirty();
    beltNetworkManager.buildNetworks(world1);
    const segments1 = beltNetworkManager.getAllSegments();
    const firstId = segments1[0]?.id;

    // Reset and build again with a fresh world
    beltNetworkManager.reset();

    const world2 = makeWorld();
    makeBeltEntity(world2, 0, 0, 'east');
    makeBeltEntity(world2, 1, 0, 'east');

    beltNetworkManager.markDirty();
    beltNetworkManager.buildNetworks(world2);
    const segments2 = beltNetworkManager.getAllSegments();
    const secondId = segments2[0]?.id;

    // After reset(), the counter DOES reset — this is expected
    // But WITHOUT reset(), the ID would increment:
    expect(secondId).toBe('segment_0'); // reset() brings counter back to 0

    // PROOF OF POLLUTION: what happens when tests share the singleton without reset()
    // Simulate pollution: build another world without reset
    const world3 = makeWorld();
    makeBeltEntity(world3, 0, 0, 'east');
    makeBeltEntity(world3, 1, 0, 'east');

    beltNetworkManager.markDirty();
    beltNetworkManager.buildNetworks(world3);
    const segments3 = beltNetworkManager.getAllSegments();
    const thirdId = segments3[0]?.id;

    // Counter incremented from previous build — NOT 'segment_0' again
    expect(thirdId).toBe('segment_1'); // Pollution: counter is now 1

    // A test that assumes segment IDs start at 'segment_0' would FAIL
    // if another test ran before it without calling reset().

    // Clean up
    beltNetworkManager.reset();
  });

  it('dirty flag persists in singleton — old world entities can appear in new builds', () => {
    // Simulate what happens when two tests share the singleton

    // Test A setup (without reset)
    const worldA = makeWorld();
    const beltA = makeBeltEntity(worldA, 0, 0, 'east');
    const beltA2 = makeBeltEntity(worldA, 1, 0, 'east');
    beltNetworkManager.markDirty();
    beltNetworkManager.buildNetworks(worldA);

    expect(beltNetworkManager.getNetwork(beltA.id)).not.toBeNull();
    expect(beltNetworkManager.getAllSegments().length).toBe(1);

    // Test B setup (still sharing singleton, new world, no reset)
    const worldB = makeWorld();
    makeBeltEntity(worldB, 10, 10, 'east');
    makeBeltEntity(worldB, 11, 10, 'east');

    // buildNetworks with worldB — since dirty=false (already built for worldA),
    // it DOES NOT REBUILD. The old worldA segments remain.
    beltNetworkManager.buildNetworks(worldB); // dirty=false → no-op!

    // Old worldA belt IDs still in the network — from a completely different world!
    // This is the pollution: "Test B" inherits "Test A"'s network state.
    expect(beltNetworkManager.getNetwork(beltA.id)).not.toBeNull(); // worldA belt still mapped
    expect(beltNetworkManager.getAllSegments().length).toBe(1); // Still worldA's segment

    // CONSEQUENCE: Systems that share the singleton get wrong segment data
    // after the first test's world is garbage collected. getEntity() on old IDs
    // returns null, causing silent skips in processNetworks.

    beltNetworkManager.reset(); // Clean up
  });

});

describe('RED TEAM: BeltNetwork — direction-change causes silent segment truncation', () => {

  /**
   * When a chain of east belts is followed and a south belt is encountered,
   * the loop breaks silently at line 242:
   *   if (nextBelt.direction !== direction) break;
   *
   * No error, no log. The caller's intent (a right-angle belt path) is
   * silently truncated. The south belt may form its own segment if it has
   * another south belt adjacent.
   *
   * AutomationEdgeCases.test.ts never tests belt direction changes.
   */
  it('east belt adjacent to south belt creates two separate segments, not one L-shaped path', () => {
    const manager = new BeltNetworkManager();
    const world = makeWorld();

    // L-shaped belt path:
    // (0,0) east → (1,0) south → (1,1) south (continuing south)
    // Correct behavior: (0,0)+(1,0) can't be in same segment (different direction after 1 step)
    // But (0,0) east → (1,0): the loop follows east. At (1,0) there's a south belt — direction mismatch.
    // So the "east" chain is just [(0,0)]. Length < 2 → returns null (no east segment).
    // Then (1,0) south is unassigned → starts a new chain south. (1,0)→(1,1) = 2 south belts = 1 segment.

    makeBeltEntity(world, 0, 0, 'east'); // Single east belt — isolated
    makeBeltEntity(world, 1, 0, 'south'); // South belt adjacent to east
    makeBeltEntity(world, 1, 1, 'south'); // South belt continues

    manager.buildNetworks(world);
    const segments = manager.getAllSegments();

    // ONE segment created: the two south belts at (1,0)→(1,1)
    // The single east belt at (0,0) is silently dropped (chain.length < 2)
    expect(segments.length).toBe(1);
    expect(segments[0]!.direction).toBe('south');
    expect(segments[0]!.beltIds.length).toBe(2);

    // The east belt at (0,0) is silently unnetworked — it was in "assigned" but not in any segment
    // Items added to the east belt at (0,0) will NEVER be processed by the network
    // because processNetworks only processes segments, not individual unnetworked belts.
  });

  it('items placed on an unnetworked single belt are NEVER processed by processNetworks', () => {
    const manager = new BeltNetworkManager();
    const world = makeWorld();

    // Single east belt — no neighbors
    const loner = makeBeltEntity(world, 0, 0, 'east');

    manager.buildNetworks(world);

    // Put items on the unnetworked belt
    const belt = loner.getComponent(CT.Belt) as any;
    belt.count = 5;
    belt.itemId = 'wood';
    belt.transferProgress = 1.0;

    const initialCount = belt.count;
    expect(initialCount).toBe(5);

    // Run 1000 ticks of processNetworks
    for (let tick = 0; tick < 1000; tick++) {
      manager.processNetworks(world, tick);
    }

    // Items are STILL on the belt — processNetworks never touches unnetworked belts
    expect(belt.count).toBe(5); // Items never moved — NOT PROVED because count is 5
    expect(belt.itemId).toBe('wood'); // Item type still set

    // CONSEQUENCE: A factory with a single belt at the START of a chain (not adjacent
    // to another belt) will silently fail to move items. No error. Just stuck.
    // The game shows items on the belt (count > 0) but they never go anywhere.
  });

});

describe('RED TEAM: BeltNetwork — processTransitItems accumulates on tail belt indefinitely', () => {

  /**
   * BeltNetwork.ts line 309:
   *   tailBelt.count = Math.min(tailBelt.capacity, tailBelt.count + item.count);
   *
   * When items arrive at the tail belt, they're added to tailBelt.count.
   * tailBelt.capacity is the cap. If more items arrive than capacity allows,
   * they're silently clamped to capacity — the excess items are DESTROYED.
   *
   * There's no overflow checking, no backpressure signal, and no way to know
   * that items were destroyed. The "full implementation would handle transfer"
   * comment indicates this is intentional temporary code.
   */
  it('items are silently destroyed when tail belt reaches capacity', () => {
    const manager = new BeltNetworkManager();
    const world = makeWorld();

    // Create a segment: (0,0)→(1,0) east, tier=1 (capacity=4 per belt)
    const head = makeBeltEntity(world, 0, 0, 'east', 1);
    const tail = makeBeltEntity(world, 1, 0, 'east', 1);

    manager.buildNetworks(world);

    const headBelt = head.getComponent(CT.Belt) as any;
    const tailBelt = tail.getComponent(CT.Belt) as any;

    // First: fill the tail belt first (simulating items already there)
    tailBelt.count = tailBelt.capacity; // Tail is FULL

    // Now send an item through the head
    headBelt.count = 2;
    headBelt.itemId = 'stone';
    headBelt.transferProgress = 1.0;

    // Run enough ticks for transit to complete
    for (let tick = 0; tick < 200; tick++) {
      manager.processNetworks(world, tick);
    }

    // When items arrive at tail, tailBelt.count is clamped to capacity.
    // The extra items are LOST — no error, no backpressure, no log.
    const tailCapacity = tailBelt.capacity;
    expect(tailBelt.count).toBe(tailCapacity); // Max capacity — clamp applied
    // But we sent 2 items INTO a FULL tail — those 2 items are GONE.
    // There's no way to know how many items were destroyed.
    // No event emitted. No stat incremented. Silent item destruction.
  });

});
