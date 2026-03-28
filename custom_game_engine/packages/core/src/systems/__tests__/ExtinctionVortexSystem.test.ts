/**
 * ExtinctionVortexSystem Tests
 *
 * Tests the extinction vortex monitoring system: metrics computation (F_population,
 * D_cc), phase transitions (none→warning→grace→extinct), grace period countdown,
 * recovery paths, and event emission.
 *
 * The system throttleInterval is 200 (offset 0), so world.tick must be a
 * multiple of 200 for the system to actually execute.
 *
 * Test strategy:
 * - Pure-math unit tests for F_population and D_cc computation logic
 * - Integration tests via system.update() with mocked WorldMutator + entities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockWorld } from '../../__tests__/createMockWorld.js';
import type { ExtinctionVortexMonitorComponent, ExtinctionVortexPhase } from '../../components/ExtinctionVortexMonitorComponent.js';
import { createExtinctionVortexMonitor } from '../../components/ExtinctionVortexMonitorComponent.js';
import type { GeneticComponent, GeneticAllele } from '../../components/GeneticComponent.js';
import type { SpeciesComponent } from '../../components/SpeciesComponent.js';

// ---------------------------------------------------------------------------
// Types & mock helpers
// ---------------------------------------------------------------------------

interface MockAllele {
  traitId: string;
  expressedAllele: 'dominant' | 'recessive' | 'both';
}

interface MockEntity {
  id: string;
  getComponent: ReturnType<typeof vi.fn>;
  hasComponent: ReturnType<typeof vi.fn>;
  addComponent: ReturnType<typeof vi.fn>;
  removeComponent: ReturnType<typeof vi.fn>;
  updateComponent: ReturnType<typeof vi.fn>;
  components: Map<string, unknown>;
}

function makeMockAllele(
  traitId: string,
  expressedAllele: 'dominant' | 'recessive' | 'both'
): GeneticAllele {
  return {
    traitId,
    dominantAllele: `${traitId}_dom`,
    recessiveAllele: `${traitId}_rec`,
    expression: expressedAllele === 'both' ? 'codominant' : 'dominant',
    expressedAllele,
    category: 'behavioral',
  };
}

function createSpeciesMember(
  id: string,
  speciesId: string,
  inbreedingCoeff: number,
  alleles: MockAllele[]
): MockEntity {
  const speciesComp: Partial<SpeciesComponent> = {
    type: 'species',
    speciesId,
    speciesName: speciesId,
  } as Partial<SpeciesComponent>;

  const geneticComp: Partial<GeneticComponent> = {
    type: 'genetic',
    inbreedingCoefficient: inbreedingCoeff,
    genome: alleles.map(a => makeMockAllele(a.traitId, a.expressedAllele)),
  } as Partial<GeneticComponent>;

  const entity: MockEntity = {
    id,
    getComponent: vi.fn((type: string) => {
      if (type === 'species') return speciesComp;
      if (type === 'genetic') return geneticComp;
      return undefined;
    }),
    hasComponent: vi.fn((type: string) => type === 'species' || type === 'genetic'),
    addComponent: vi.fn(),
    removeComponent: vi.fn(),
    updateComponent: vi.fn(),
    components: new Map([['species', speciesComp], ['genetic', geneticComp]]),
  };

  return entity;
}

function createMonitorEntity(
  id: string,
  speciesId: string,
  phase: ExtinctionVortexPhase,
  overrides: Partial<ExtinctionVortexMonitorComponent> = {}
): MockEntity {
  const monitor: ExtinctionVortexMonitorComponent = {
    ...createExtinctionVortexMonitor(speciesId),
    phase,
    ...overrides,
  };

  // updateComponent mutates the monitor so assertions can read it back
  const entity: MockEntity = {
    id,
    getComponent: vi.fn((type: string) => {
      if (type === 'extinction_vortex_monitor') return monitor;
      return undefined;
    }),
    hasComponent: vi.fn((type: string) => type === 'extinction_vortex_monitor'),
    addComponent: vi.fn(),
    removeComponent: vi.fn(),
    updateComponent: vi.fn((type: string, updater: (c: ExtinctionVortexMonitorComponent) => ExtinctionVortexMonitorComponent) => {
      if (type === 'extinction_vortex_monitor') {
        const updated = updater(monitor);
        Object.assign(monitor, updated);
      }
    }),
    components: new Map([['extinction_vortex_monitor', monitor]]),
  };

  return entity;
}

// ---------------------------------------------------------------------------
// Computation helpers (mirrors expected system internals)
// These pure functions let us validate math independently of system wiring.
// ---------------------------------------------------------------------------

/** F_population = mean inbreeding coefficient; returns 0 when N < 3. */
function computeFPopulation(members: Array<{ inbreedingCoefficient: number }>): number {
  if (members.length < 3) return 0;
  const sum = members.reduce((acc, m) => acc + m.inbreedingCoefficient, 0);
  return sum / members.length;
}

/**
 * Convert an allele list to a binary trait vector:
 * dominant → 1, recessive → 0, both → 0.5
 */
function alleleVector(alleles: GeneticAllele[]): number[] {
  return alleles.map(a => {
    if (a.expressedAllele === 'dominant') return 1;
    if (a.expressedAllele === 'recessive') return 0;
    return 0.5; // both / codominant
  });
}

/** Cosine distance between two equal-length vectors: 1 − cosine_similarity */
function cosineDistance(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 && normB === 0) return 0;
  if (normA === 0 || normB === 0) return 1;
  return 1 - dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * D_cc_population = mean pairwise cosine distance; returns 1.0 when N < 3
 * (safe / diverse value so low N doesn't trigger warning).
 */
function computeDccPopulation(members: Array<{ genome: GeneticAllele[] }>): number {
  if (members.length < 3) return 1.0;

  const vectors = members.map(m => alleleVector(m.genome));
  let totalDistance = 0;
  let pairCount = 0;

  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      totalDistance += cosineDistance(vectors[i], vectors[j]);
      pairCount++;
    }
  }

  return pairCount === 0 ? 1.0 : totalDistance / pairCount;
}

// ---------------------------------------------------------------------------
// Phase transition logic (mirrors expected system internals)
// ---------------------------------------------------------------------------

const WARN_DCC_THRESHOLD = 0.01;
const WARN_F_THRESHOLD = 0.20;
const GRACE_DCC_THRESHOLD = 0.005;
const GRACE_F_THRESHOLD = 0.25;
// Mirrors ExtinctionVortexSystem.GRACE_GENERATIONS — the trinity pattern
const GRACE_GENERATIONS = 3;

function computeNextPhase(
  current: ExtinctionVortexPhase,
  fPop: number,
  dcc: number,
  graceTicksRemaining: number
): { phase: ExtinctionVortexPhase; graceTicksRemaining: number } {
  const inWarningZone = dcc < WARN_DCC_THRESHOLD || fPop > WARN_F_THRESHOLD;
  const inGraceZone = dcc < GRACE_DCC_THRESHOLD && fPop > GRACE_F_THRESHOLD;

  if (current === 'extinct') {
    return { phase: 'extinct', graceTicksRemaining: 0 };
  }

  if (current === 'grace') {
    if (!inWarningZone) {
      // Recovered fully
      return { phase: 'none', graceTicksRemaining: 0 };
    }
    if (!inGraceZone) {
      // Improved enough to step back to warning
      return { phase: 'warning', graceTicksRemaining: 0 };
    }
    // Still in grace zone
    const newTicks = graceTicksRemaining - 1;
    if (newTicks <= 0) {
      return { phase: 'extinct', graceTicksRemaining: 0 };
    }
    return { phase: 'grace', graceTicksRemaining: newTicks };
  }

  // current is 'none' or 'warning'
  if (inGraceZone) {
    const isNew = current !== 'grace';
    return {
      phase: 'grace',
      graceTicksRemaining: isNew ? GRACE_GENERATIONS : graceTicksRemaining,
    };
  }

  if (inWarningZone) {
    return { phase: 'warning', graceTicksRemaining: 0 };
  }

  return { phase: 'none', graceTicksRemaining: 0 };
}

// ---------------------------------------------------------------------------
// System-level test setup
// ---------------------------------------------------------------------------

/**
 * Build a minimal test harness that exercises ExtinctionVortexSystem through
 * its public interface: initialize() then update().
 *
 * Because the system does not yet exist we import it lazily so that compilation
 * of the test file does not fail until the system is created.  The dynamic
 * import is wrapped in a helper so individual tests can opt in.
 */
async function loadSystem() {
  // Dynamic import so tests compile even before the system file exists.
  const mod = await import('../ExtinctionVortexSystem.js');
  return new mod.ExtinctionVortexSystem();
}

// ---------------------------------------------------------------------------
// ============================================================================
// TESTS
// ============================================================================
// ---------------------------------------------------------------------------

describe('ExtinctionVortexSystem', () => {

  // ==========================================================================
  // F_population computation
  // ==========================================================================
  describe('F_population computation', () => {
    it('computes F_population as mean of inbreeding coefficients', () => {
      const members = [
        { inbreedingCoefficient: 0.1 },
        { inbreedingCoefficient: 0.2 },
        { inbreedingCoefficient: 0.3 },
      ];
      const result = computeFPopulation(members);
      expect(result).toBeCloseTo(0.2, 10);
    });

    it('returns 0 for fewer than 3 members', () => {
      const members = [
        { inbreedingCoefficient: 0.5 },
        { inbreedingCoefficient: 0.8 },
      ];
      expect(computeFPopulation(members)).toBe(0);
    });

    it('handles population of exactly 3', () => {
      const members = [
        { inbreedingCoefficient: 0.0 },
        { inbreedingCoefficient: 0.0 },
        { inbreedingCoefficient: 0.3 },
      ];
      const result = computeFPopulation(members);
      expect(result).toBeCloseTo(0.1, 10);
    });
  });

  // ==========================================================================
  // D_cc_population computation
  // ==========================================================================
  describe('D_cc_population computation', () => {
    it('computes D_cc as mean pairwise cosine distance for distinct profiles', () => {
      // Three members with clearly different allele profiles
      const members = [
        { genome: [makeMockAllele('trait_a', 'dominant'), makeMockAllele('trait_b', 'recessive')] },
        { genome: [makeMockAllele('trait_a', 'recessive'), makeMockAllele('trait_b', 'dominant')] },
        { genome: [makeMockAllele('trait_a', 'both'),    makeMockAllele('trait_b', 'both')] },
      ];
      const result = computeDccPopulation(members);
      expect(result).toBeGreaterThan(0);
    });

    it('returns 1.0 for fewer than 3 members', () => {
      const members = [
        { genome: [makeMockAllele('trait_a', 'dominant')] },
        { genome: [makeMockAllele('trait_a', 'recessive')] },
      ];
      expect(computeDccPopulation(members)).toBe(1.0);
    });

    it('returns 0 for identical allele profiles', () => {
      const sameGenome = () => [
        makeMockAllele('trait_a', 'dominant'),
        makeMockAllele('trait_b', 'recessive'),
      ];
      const members = [
        { genome: sameGenome() },
        { genome: sameGenome() },
        { genome: sameGenome() },
      ];
      const result = computeDccPopulation(members);
      expect(result).toBeCloseTo(0, 10);
    });
  });

  // ==========================================================================
  // Phase transition logic
  // ==========================================================================
  describe('phase transitions', () => {
    it('transitions from none to warning when D_cc < 0.01', () => {
      const result = computeNextPhase('none', 0.05 /* F normal */, 0.005 /* D_cc low */, 0);
      expect(result.phase).toBe('warning');
    });

    it('transitions from none to warning when F > 0.20', () => {
      const result = computeNextPhase('none', 0.25 /* F high */, 0.5 /* D_cc normal */, 0);
      // F=0.25 > WARN_F_THRESHOLD but NOT > GRACE_F_THRESHOLD (0.25 is exactly at boundary)
      // Use F=0.22 to stay strictly in warning zone only
      const result2 = computeNextPhase('none', 0.22, 0.5, 0);
      expect(result2.phase).toBe('warning');
    });

    it('stays in none when metrics are healthy', () => {
      const result = computeNextPhase('none', 0.1, 0.5, 0);
      expect(result.phase).toBe('none');
    });

    it('transitions from warning to grace when both thresholds met', () => {
      // D_cc < 0.005 AND F > 0.25
      const result = computeNextPhase('warning', 0.30, 0.001, 0);
      expect(result.phase).toBe('grace');
      expect(result.graceTicksRemaining).toBe(GRACE_GENERATIONS);
    });

    it('transitions from none directly to grace when both thresholds met', () => {
      // Skip warning entirely when both critical thresholds exceeded simultaneously
      const result = computeNextPhase('none', 0.30, 0.001, 0);
      expect(result.phase).toBe('grace');
      expect(result.graceTicksRemaining).toBe(GRACE_GENERATIONS);
    });

    it('recovers from warning to none when metrics improve above both thresholds', () => {
      const result = computeNextPhase('warning', 0.05, 0.5, 0);
      expect(result.phase).toBe('none');
    });

    it('recovers from grace to warning when one metric improves but other still bad', () => {
      // D_cc recovers above grace threshold (>=0.005) but F still above warning threshold
      const result = computeNextPhase('grace', 0.28, 0.008, 2);
      // D_cc=0.008 >= GRACE_DCC_THRESHOLD so not in grace zone, but F > WARN_F_THRESHOLD
      expect(result.phase).toBe('warning');
    });

    it('transitions from grace to extinct after grace ticks count down to 0', () => {
      // graceTicksRemaining=1, this evaluation will decrement to 0 → extinct
      const result = computeNextPhase('grace', 0.30, 0.001, 1);
      expect(result.phase).toBe('extinct');
    });

    it('extinct phase is terminal — no transitions out', () => {
      const result1 = computeNextPhase('extinct', 0.05, 0.5, 0);  // healthy metrics
      expect(result1.phase).toBe('extinct');

      const result2 = computeNextPhase('extinct', 0.30, 0.001, 0);  // critical metrics
      expect(result2.phase).toBe('extinct');
    });
  });

  // ==========================================================================
  // Grace period countdown
  // ==========================================================================
  describe('grace period', () => {
    it('starts grace with 3 ticks remaining when entering from none or warning', () => {
      const result = computeNextPhase('none', 0.30, 0.001, 0);
      expect(result.phase).toBe('grace');
      expect(result.graceTicksRemaining).toBe(3);
    });

    it('decrements grace ticks each evaluation while conditions persist', () => {
      let state = computeNextPhase('none', 0.30, 0.001, 0);
      expect(state.graceTicksRemaining).toBe(3);

      state = computeNextPhase('grace', 0.30, 0.001, state.graceTicksRemaining);
      expect(state.graceTicksRemaining).toBe(2);

      state = computeNextPhase('grace', 0.30, 0.001, state.graceTicksRemaining);
      expect(state.graceTicksRemaining).toBe(1);

      state = computeNextPhase('grace', 0.30, 0.001, state.graceTicksRemaining);
      expect(state.phase).toBe('extinct');
    });

    it('resets grace ticks when metrics recover out of grace zone', () => {
      // In grace, then D_cc recovers above critical threshold → back to warning, ticks reset
      const recovered = computeNextPhase('grace', 0.28, 0.008, 2);
      expect(recovered.phase).toBe('warning');
      expect(recovered.graceTicksRemaining).toBe(0);
    });
  });

  // ==========================================================================
  // System integration via update() — requires ExtinctionVortexSystem to exist
  // ==========================================================================
  describe('system integration', () => {
    it('emits species:extinction_warning on warning entry', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 200 });
      await system.initialize(world, world.getEventBus());

      const speciesId = 'test_species';

      // 3 members: all inbreeding=0.22 (F > 0.20), diverse alleles (D_cc > 0.01)
      const members = [
        createSpeciesMember('m1', speciesId, 0.22, [
          { traitId: 'trait_a', expressedAllele: 'dominant' },
          { traitId: 'trait_b', expressedAllele: 'dominant' },
        ]),
        createSpeciesMember('m2', speciesId, 0.22, [
          { traitId: 'trait_a', expressedAllele: 'recessive' },
          { traitId: 'trait_b', expressedAllele: 'dominant' },
        ]),
        createSpeciesMember('m3', speciesId, 0.22, [
          { traitId: 'trait_a', expressedAllele: 'both' },
          { traitId: 'trait_b', expressedAllele: 'recessive' },
        ]),
      ];

      const monitorEntity = createMonitorEntity('monitor1', speciesId, 'none');
      const monitor = monitorEntity.getComponent('extinction_vortex_monitor') as ExtinctionVortexMonitorComponent;

      // Wire up world.query() to return members when asked for species members
      // and monitorEntity when asked for monitor entities
      const queryBuilder = world.query() as any;
      queryBuilder.executeEntities
        .mockReturnValueOnce([monitorEntity])   // first call: monitor entities
        .mockReturnValue(members);               // subsequent calls: species members

      system.update(world, [], 1);

      const eventBus = world.getEventBus();
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'species:extinction_warning',
          data: expect.objectContaining({ speciesId }),
        })
      );
      expect(monitor.phase).toBe('warning');
    });

    it('emits species:extinct on extinction', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 200 });
      await system.initialize(world, world.getEventBus());

      const speciesId = 'doomed_species';

      // 3 members with identical alleles (D_cc=0) and very high inbreeding (F=0.30)
      // → meets both grace thresholds; grace started with 1 tick remaining → goes extinct
      const sameAlleles: MockAllele[] = [
        { traitId: 'trait_a', expressedAllele: 'dominant' },
        { traitId: 'trait_b', expressedAllele: 'dominant' },
      ];
      const members = [
        createSpeciesMember('m1', speciesId, 0.30, sameAlleles),
        createSpeciesMember('m2', speciesId, 0.30, sameAlleles),
        createSpeciesMember('m3', speciesId, 0.30, sameAlleles),
      ];

      // Monitor already in grace with 1 tick left
      const monitorEntity = createMonitorEntity('monitor1', speciesId, 'grace', {
        graceTicksRemaining: 1,
        metrics: { fPopulation: 0.30, dccPopulation: 0, populationSize: 3 },
      });
      const monitor = monitorEntity.getComponent('extinction_vortex_monitor') as ExtinctionVortexMonitorComponent;

      const queryBuilder = world.query() as any;
      queryBuilder.executeEntities
        .mockReturnValueOnce([monitorEntity])
        .mockReturnValue(members);

      system.update(world, [], 1);

      const eventBus = world.getEventBus();
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'species:extinct',
          data: expect.objectContaining({ speciesId }),
        })
      );
      expect(monitor.phase).toBe('extinct');
    });

    it('emits species:extinction_recovered on recovery from warning', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 200 });
      await system.initialize(world, world.getEventBus());

      const speciesId = 'recovering_species';

      // Healthy members: low inbreeding, diverse alleles
      const members = [
        createSpeciesMember('m1', speciesId, 0.05, [
          { traitId: 'trait_a', expressedAllele: 'dominant' },
          { traitId: 'trait_b', expressedAllele: 'recessive' },
        ]),
        createSpeciesMember('m2', speciesId, 0.05, [
          { traitId: 'trait_a', expressedAllele: 'recessive' },
          { traitId: 'trait_b', expressedAllele: 'dominant' },
        ]),
        createSpeciesMember('m3', speciesId, 0.05, [
          { traitId: 'trait_a', expressedAllele: 'both' },
          { traitId: 'trait_b', expressedAllele: 'both' },
        ]),
      ];

      // Monitor was in warning, now recovers
      const monitorEntity = createMonitorEntity('monitor1', speciesId, 'warning', {
        metrics: { fPopulation: 0.22, dccPopulation: 0.008, populationSize: 3 },
      });
      const monitor = monitorEntity.getComponent('extinction_vortex_monitor') as ExtinctionVortexMonitorComponent;

      const queryBuilder = world.query() as any;
      queryBuilder.executeEntities
        .mockReturnValueOnce([monitorEntity])
        .mockReturnValue(members);

      system.update(world, [], 1);

      const eventBus = world.getEventBus();
      expect(eventBus.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'species:extinction_recovered',
          data: expect.objectContaining({
            speciesId,
            fromPhase: 'warning',
          }),
        })
      );
      expect(monitor.phase).toBe('none');
    });

    it('does not execute when tick is not a multiple of throttleInterval (200)', async () => {
      const system = await loadSystem();
      // tick=100 → 100 % 200 = 100 ≠ 0, should not run
      const world = createMockWorld({ tick: 100 });
      await system.initialize(world, world.getEventBus());

      const monitorEntity = createMonitorEntity('monitor1', 'some_species', 'none');
      const queryBuilder = world.query() as any;
      queryBuilder.executeEntities.mockReturnValue([monitorEntity]);

      // Clear any calls that may have occurred during initialize()
      vi.mocked(world.query).mockClear();

      system.update(world, [], 1);

      // query() should not have been invoked during the throttled-out update
      expect(world.query).not.toHaveBeenCalled();
    });

    it('executes when tick is a multiple of 200', async () => {
      const system = await loadSystem();
      const world = createMockWorld({ tick: 400 });
      await system.initialize(world, world.getEventBus());

      const speciesId = 'healthy_species';
      const sameAlleles: MockAllele[] = [
        { traitId: 'trait_a', expressedAllele: 'dominant' },
      ];
      const members = [
        createSpeciesMember('m1', speciesId, 0.02, sameAlleles),
        createSpeciesMember('m2', speciesId, 0.02, sameAlleles),
        createSpeciesMember('m3', speciesId, 0.02, sameAlleles),
      ];

      const monitorEntity = createMonitorEntity('monitor1', speciesId, 'none');
      const queryBuilder = world.query() as any;
      queryBuilder.executeEntities
        .mockReturnValueOnce([monitorEntity])
        .mockReturnValue(members);

      system.update(world, [], 1);

      expect(world.query).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Additional edge-case phase transition tests (pure-logic)
  // ==========================================================================
  describe('phase transition edge cases', () => {
    it('D_cc=0.01 is exactly at warning boundary — does not trigger warning', () => {
      // Boundary: D_cc < 0.01 triggers warning; D_cc === 0.01 does not
      const result = computeNextPhase('none', 0.10, 0.01, 0);
      expect(result.phase).toBe('none');
    });

    it('F=0.20 is exactly at warning boundary — does not trigger warning', () => {
      // Boundary: F > 0.20 triggers warning; F === 0.20 does not
      const result = computeNextPhase('none', 0.20, 0.5, 0);
      expect(result.phase).toBe('none');
    });

    it('grace with 2 ticks remaining decrements to 1, does not go extinct', () => {
      const result = computeNextPhase('grace', 0.30, 0.001, 2);
      expect(result.phase).toBe('grace');
      expect(result.graceTicksRemaining).toBe(1);
    });

    it('grace with 3 ticks remaining decrements to 2', () => {
      const result = computeNextPhase('grace', 0.30, 0.001, 3);
      expect(result.phase).toBe('grace');
      expect(result.graceTicksRemaining).toBe(2);
    });

    it('full grace countdown: 3→2→1→extinct', () => {
      let state = { phase: 'none' as ExtinctionVortexPhase, graceTicksRemaining: 0 };

      // Enter grace
      state = computeNextPhase(state.phase, 0.30, 0.001, state.graceTicksRemaining);
      expect(state.phase).toBe('grace');
      expect(state.graceTicksRemaining).toBe(3);

      state = computeNextPhase(state.phase, 0.30, 0.001, state.graceTicksRemaining);
      expect(state.phase).toBe('grace');
      expect(state.graceTicksRemaining).toBe(2);

      state = computeNextPhase(state.phase, 0.30, 0.001, state.graceTicksRemaining);
      expect(state.phase).toBe('grace');
      expect(state.graceTicksRemaining).toBe(1);

      state = computeNextPhase(state.phase, 0.30, 0.001, state.graceTicksRemaining);
      expect(state.phase).toBe('extinct');
    });
  });
});
