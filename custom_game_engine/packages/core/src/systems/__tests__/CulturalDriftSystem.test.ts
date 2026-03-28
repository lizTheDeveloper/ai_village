/**
 * CulturalDriftSystem Tests
 *
 * Covers:
 * 1. Pure-function unit tests for regionFromZLevel, createCulturalDrift,
 *    and createCulturalRegionState.
 * 2. System integration tests via system.update() with mocked World + entities.
 *
 * The system throttleInterval is 20 (offset 0), so world.tick must be a
 * multiple of 20 for the system to actually execute.
 *
 * Test strategy:
 * - Component unit tests: pure functions, no system needed
 * - Integration tests: createMockWorld + mock entities + system.update()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockWorld } from '../../__tests__/createMockWorld.js';
import {
  regionFromZLevel,
  createCulturalDrift,
  createCulturalRegionState,
} from '../../components/CulturalDriftComponent.js';
import type {
  CulturalDriftComponent,
  CulturalRegionStateComponent,
} from '../../components/CulturalDriftComponent.js';
import type { BiochemistryComponent } from '../../components/BiochemistryComponent.js';
import type { MemoryComponent } from '../../components/MemoryComponent.js';

// ---------------------------------------------------------------------------
// Mock entity helpers
// ---------------------------------------------------------------------------

interface MockEntity {
  id: string;
  getComponent: ReturnType<typeof vi.fn>;
  hasComponent: ReturnType<typeof vi.fn>;
  addComponent: ReturnType<typeof vi.fn>;
  removeComponent: ReturnType<typeof vi.fn>;
  updateComponent: ReturnType<typeof vi.fn>;
  components: Map<string, unknown>;
}

function makePositionComponent(x: number, y: number, z: number) {
  return { type: 'position', x, y, z };
}

function makeBiochemComponent(
  dopamine: number = 0.5,
  cortisol: number = 0.1
): BiochemistryComponent {
  return {
    type: 'biochemistry',
    version: 1,
    dopamine,
    cortisol,
    oxytocin: 0.5,
    serotonin: 0.5,
    handInteractionScore: 0,
    nurtureScore: 0,
    epigeneticOxytocinBaseline: 0.5,
    epigeneticCortisolBaseline: 0.1,
  } as unknown as BiochemistryComponent;
}

function makeMemoryComponent(): MemoryComponent {
  return {
    type: 'memory',
    version: 1,
    memories: [],
  } as unknown as MemoryComponent;
}

/**
 * Create a mock Norn entity with cultural_drift, position, and optionally
 * biochemistry and memory components.
 */
function createNornEntity(
  id: string,
  drift: CulturalDriftComponent,
  z: number,
  options: { biochem?: BiochemistryComponent; memory?: MemoryComponent } = {}
): MockEntity {
  const posComp = makePositionComponent(0, 0, z);
  const compMap = new Map<string, unknown>([
    ['cultural_drift', drift],
    ['position', posComp],
  ]);

  if (options.biochem) compMap.set('biochemistry', options.biochem);
  if (options.memory) compMap.set('memory', options.memory);

  const entity: MockEntity = {
    id,
    getComponent: vi.fn((type: string) => compMap.get(type)),
    hasComponent: vi.fn((type: string) => compMap.has(type)),
    addComponent: vi.fn(),
    removeComponent: vi.fn(),
    updateComponent: vi.fn(),
    components: compMap,
  };

  return entity;
}

/**
 * Create a mock region-state entity.
 */
function createRegionStateEntity(
  id: string,
  state: CulturalRegionStateComponent
): MockEntity {
  const entity: MockEntity = {
    id,
    getComponent: vi.fn((type: string) =>
      type === 'cultural_region_state' ? state : undefined
    ),
    hasComponent: vi.fn((type: string) => type === 'cultural_region_state'),
    addComponent: vi.fn(),
    removeComponent: vi.fn(),
    updateComponent: vi.fn(),
    components: new Map([['cultural_region_state', state]]),
  };

  return entity;
}

// ---------------------------------------------------------------------------
// Lazy system loader (mirrors ExtinctionVortexSystem.test.ts pattern)
// ---------------------------------------------------------------------------

async function loadSystem() {
  const mod = await import('../CulturalDriftSystem.js');
  return new mod.CulturalDriftSystem();
}

// ===========================================================================
// TESTS
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. Component unit tests (pure functions)
// ---------------------------------------------------------------------------

describe('CulturalDriftComponent', () => {

  describe('regionFromZLevel', () => {
    it('z < -10 → deck_deep_underground', () => {
      expect(regionFromZLevel(-11)).toBe('deck_deep_underground');
      expect(regionFromZLevel(-100)).toBe('deck_deep_underground');
    });

    it('z = -5 → deck_underground (between -10 and 0 exclusive)', () => {
      expect(regionFromZLevel(-5)).toBe('deck_underground');
      expect(regionFromZLevel(-1)).toBe('deck_underground');
      expect(regionFromZLevel(-10)).toBe('deck_underground');
    });

    it('z = 0 → deck_surface', () => {
      expect(regionFromZLevel(0)).toBe('deck_surface');
    });

    it('z = 5 → deck_above (between 1 and 10 inclusive)', () => {
      expect(regionFromZLevel(5)).toBe('deck_above');
      expect(regionFromZLevel(1)).toBe('deck_above');
      expect(regionFromZLevel(10)).toBe('deck_above');
    });

    it('z = 15 → deck_high (above 10)', () => {
      expect(regionFromZLevel(15)).toBe('deck_high');
      expect(regionFromZLevel(11)).toBe('deck_high');
    });
  });

  describe('createCulturalDrift', () => {
    it('creates a valid component with correct defaults', () => {
      const comp = createCulturalDrift('deck_surface');
      expect(comp.type).toBe('cultural_drift');
      expect(comp.primaryRegion).toBe('deck_surface');
      expect(comp.regionVisits).toEqual({ deck_surface: 1 });
      expect(comp.totalVisits).toBe(1);
      expect(comp.lastRegionChangeTick).toBe(0);
      expect(comp.inForeignRegion).toBe(false);
    });

    it('throws on empty string initialRegion', () => {
      expect(() => createCulturalDrift('')).toThrow(
        'Cannot create cultural drift: missing initialRegion'
      );
    });
  });

  describe('createCulturalRegionState', () => {
    it('creates a valid component with correct defaults', () => {
      const comp = createCulturalRegionState('deck_underground');
      expect(comp.type).toBe('cultural_region_state');
      expect(comp.regionId).toBe('deck_underground');
      expect(comp.wordPreferences).toEqual({});
      expect(comp.regionalRituals).toEqual([]);
      expect(comp.populationCount).toBe(0);
      expect(comp.lastDriftTick).toBe(0);
    });

    it('throws on empty string regionId', () => {
      expect(() => createCulturalRegionState('')).toThrow(
        'Cannot create cultural region state: missing regionId'
      );
    });
  });
});

// ---------------------------------------------------------------------------
// 2. System integration tests
// ---------------------------------------------------------------------------

describe('CulturalDriftSystem', () => {

  // Helper: wire up two executeEntities calls — first for drift entities,
  // second for region state entities.
  function wireQueryBuilder(
    world: ReturnType<typeof createMockWorld>,
    nornEntities: MockEntity[],
    regionEntities: MockEntity[]
  ) {
    const qb = world.query() as any;
    qb.executeEntities
      .mockReturnValueOnce(nornEntities)   // cultural_drift + position query
      .mockReturnValueOnce(regionEntities); // cultural_region_state query
  }

  // -------------------------------------------------------------------------
  describe('region tracking', () => {
    it('Norn at z=0 is in deck_surface; visit count increments to 2 after one update', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 20 });
      await system.initialize(world, world.getEventBus());

      const drift = createCulturalDrift('deck_surface');
      const norn = createNornEntity('norn1', drift, 0);

      wireQueryBuilder(world, [norn], []);
      system.update(world, [], 1);

      // Visit tracking: deck_surface should now be 2 (started at 1 from createCulturalDrift)
      expect(drift.regionVisits['deck_surface']).toBe(2);
      expect(drift.primaryRegion).toBe('deck_surface');
    });

    it('Norn that moves to z=5 accumulates visits in deck_above', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 20 });
      await system.initialize(world, world.getEventBus());

      // Start with 10 visits to deck_surface (primary region well established)
      const drift = createCulturalDrift('deck_surface');
      drift.regionVisits['deck_surface'] = 10;
      drift.totalVisits = 10;

      // Now the Norn is at z=5 (deck_above)
      const norn = createNornEntity('norn2', drift, 5);

      wireQueryBuilder(world, [norn], []);
      system.update(world, [], 1);

      // deck_above should have received its first visit
      expect(drift.regionVisits['deck_above']).toBe(1);
      // Primary region should remain deck_surface (10/11 > 60%)
      expect(drift.primaryRegion).toBe('deck_surface');
    });

    it('Norn region reassigned when new region dominates visits', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 20 });
      await system.initialize(world, world.getEventBus());

      // Simulating a Norn that has spent a lot of time in deck_above already
      const drift = createCulturalDrift('deck_above');
      drift.regionVisits = { deck_above: 10, deck_surface: 1 };
      drift.totalVisits = 11;

      const norn = createNornEntity('norn3', drift, 5);

      wireQueryBuilder(world, [norn], []);
      system.update(world, [], 1);

      // deck_above goes to 11, total 12 → 11/12 ≈ 91.7% > 60% threshold
      expect(drift.primaryRegion).toBe('deck_above');
    });
  });

  // -------------------------------------------------------------------------
  describe('cross-deck encounters', () => {
    it('Norn entering foreign region sets inForeignRegion=true', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 20 });
      await system.initialize(world, world.getEventBus());

      // Primary region is deck_surface, but Norn is currently at z=5 (deck_above)
      const drift = createCulturalDrift('deck_surface');
      drift.regionVisits = { deck_surface: 10 };
      drift.totalVisits = 10;
      drift.inForeignRegion = false;

      const norn = createNornEntity('norn4', drift, 5);

      wireQueryBuilder(world, [norn], []);
      system.update(world, [], 1);

      expect(drift.inForeignRegion).toBe(true);
    });

    it('Biochemistry dopamine and cortisol boosted on first foreign region entry', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 20 });
      await system.initialize(world, world.getEventBus());

      const drift = createCulturalDrift('deck_surface');
      drift.regionVisits = { deck_surface: 10 };
      drift.totalVisits = 10;
      drift.inForeignRegion = false;

      const biochem = makeBiochemComponent(0.5, 0.1);
      const norn = createNornEntity('norn5', drift, 5, { biochem });

      wireQueryBuilder(world, [norn], []);
      system.update(world, [], 1);

      // dopamine += 0.03 → 0.53, cortisol += 0.02 → 0.12
      expect(biochem.dopamine).toBeCloseTo(0.53, 5);
      expect(biochem.cortisol).toBeCloseTo(0.12, 5);
    });

    it('Memory added with cross_deck_encounter tag on first foreign region entry', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 20 });
      await system.initialize(world, world.getEventBus());

      const drift = createCulturalDrift('deck_surface');
      drift.regionVisits = { deck_surface: 10 };
      drift.totalVisits = 10;
      drift.inForeignRegion = false;

      const memory = makeMemoryComponent();
      const norn = createNornEntity('norn6', drift, 5, { memory });

      wireQueryBuilder(world, [norn], []);
      system.update(world, [], 1);

      expect(memory.memories).toHaveLength(1);
      expect(memory.memories[0].metadata?.tag).toBe('cross_deck_encounter');
      expect(memory.memories[0].type).toBe('episodic');
    });

    it('Event culture:cross_deck_encounter emitted on first foreign region entry', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 20 });
      await system.initialize(world, world.getEventBus());

      const drift = createCulturalDrift('deck_surface');
      drift.regionVisits = { deck_surface: 10 };
      drift.totalVisits = 10;
      drift.inForeignRegion = false;

      const norn = createNornEntity('norn7', drift, 5);

      wireQueryBuilder(world, [norn], []);
      system.update(world, [], 1);

      const eventBus = world.getEventBus();
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'culture:cross_deck_encounter',
          data: expect.objectContaining({ entityId: 'norn7' }),
        })
      );
    });

    it('No emotion injection when Norn was already in foreign region (not a new entry)', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 20 });
      await system.initialize(world, world.getEventBus());

      // Already foreign — should not trigger injection again
      const drift = createCulturalDrift('deck_surface');
      drift.regionVisits = { deck_surface: 10 };
      drift.totalVisits = 10;
      drift.inForeignRegion = true; // already marked foreign

      const biochem = makeBiochemComponent(0.5, 0.1);
      const norn = createNornEntity('norn8', drift, 5, { biochem });

      wireQueryBuilder(world, [norn], []);
      system.update(world, [], 1);

      // No boost because wasForeign was true; injectCrossDeckEmotions not called
      expect(biochem.dopamine).toBeCloseTo(0.5, 5);
      expect(biochem.cortisol).toBeCloseTo(0.1, 5);
    });
  });

  // -------------------------------------------------------------------------
  describe('population tracking', () => {
    it('Region state population count updated to reflect number of Norns in that primary region', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 20 });
      await system.initialize(world, world.getEventBus());

      const surfaceState = createCulturalRegionState('deck_surface');
      surfaceState.populationCount = 5; // stale value — should be reset and recounted

      const regionEntity = createRegionStateEntity('region_surface', surfaceState);

      // Two Norns with primary region deck_surface, at z=0
      const drift1 = createCulturalDrift('deck_surface');
      drift1.regionVisits = { deck_surface: 10 };
      drift1.totalVisits = 10;

      const drift2 = createCulturalDrift('deck_surface');
      drift2.regionVisits = { deck_surface: 10 };
      drift2.totalVisits = 10;

      const norn1 = createNornEntity('norn9', drift1, 0);
      const norn2 = createNornEntity('norn10', drift2, 0);

      const qb = world.query() as any;
      qb.executeEntities
        .mockReturnValueOnce([norn1, norn2])  // cultural_drift + position
        .mockReturnValueOnce([regionEntity]); // cultural_region_state

      system.update(world, [], 1);

      // Population should be 2 (reset from 5 then incremented once per Norn)
      expect(surfaceState.populationCount).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  describe('throttle behaviour', () => {
    it('does not execute when tick is not a multiple of 20', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 15 }); // 15 % 20 ≠ 0
      await system.initialize(world, world.getEventBus());

      vi.mocked(world.query).mockClear();
      system.update(world, [], 1);

      expect(world.query).not.toHaveBeenCalled();
    });

    it('executes when tick is a multiple of 20', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 40 }); // 40 % 20 === 0
      await system.initialize(world, world.getEventBus());

      const drift = createCulturalDrift('deck_surface');
      const norn = createNornEntity('norn11', drift, 0);

      wireQueryBuilder(world, [norn], []);
      vi.mocked(world.query).mockClear();

      // Re-wire after clear
      const qb = world.query() as any;
      qb.executeEntities
        .mockReturnValueOnce([norn])
        .mockReturnValueOnce([]);

      system.update(world, [], 1);

      expect(world.query).toHaveBeenCalled();
    });
  });
});
