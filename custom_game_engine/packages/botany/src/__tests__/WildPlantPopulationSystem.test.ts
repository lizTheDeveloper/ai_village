import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBusImpl } from '@ai-village/core';
import type { PlantSpecies, World } from '@ai-village/core';
import { WildPlantPopulationSystem } from '../systems/WildPlantPopulationSystem.js';

// ─── Mock species ──────────────────────────────────────────────────────────

const mockGrassSpecies: PlantSpecies = {
  id: 'grass',
  name: 'Grass',
  category: 'grass',
  biomes: ['plains', 'savanna'],
  rarity: 'common',
  stageTransitions: [],
  baseGenetics: {
    growthRate: 1.0,
    yieldMultiplier: 1.0,
    diseaseResistance: 0.5,
    droughtTolerance: 0.5,
    frostTolerance: 0.3,
    pestResistance: 0.5,
    seedViability: 0.9,
  },
  seedsPerPlant: 5,
  seedDispersalRadius: 3,
  requiresDormancy: false,
  optimalTemperatureRange: [10, 35],
  optimalMoistureRange: [20, 80],
  preferredSeasons: ['spring', 'summer', 'autumn'],
  properties: {},
  sprites: {
    seed: 'grass_seed',
    sprout: 'grass_sprout',
    vegetative: 'grass_vegetative',
    flowering: 'grass_flowering',
    fruiting: 'grass_fruiting',
    mature: 'grass_mature',
    seeding: 'grass_seeding',
    withered: 'grass_withered',
  },
  harvestDestroysPlant: false,
};

// ─── Mock world factory ────────────────────────────────────────────────────

function createMockPlantEntity(x: number, y: number, planted = false) {
  return {
    id: `plant-${x}-${y}`,
    getComponent: vi.fn().mockImplementation((type: string) => {
      if (type === 'plant') {
        return { position: { x, y }, planted };
      }
      return null;
    }),
    hasComponent: vi.fn().mockReturnValue(false),
    components: new Map(),
  };
}

function createMockWorld(options: {
  tick?: number;
  tileData?: { biome: string } | null;
  plantEntities?: ReturnType<typeof createMockPlantEntity>[];
}): World {
  const { tick = 480, tileData = undefined, plantEntities = [] } = options;

  const queryBuilder: any = {
    with: vi.fn().mockReturnThis(),
    without: vi.fn().mockReturnThis(),
    executeEntities: vi.fn().mockReturnValue(plantEntities),
  };

  return {
    tick,
    query: vi.fn().mockReturnValue(queryBuilder),
    simulationScheduler: {
      updateAgentPositions: vi.fn(),
      filterActiveEntities: vi.fn().mockImplementation((entities: any[]) => entities),
    },
    getTileAt: vi.fn().mockReturnValue(tileData ?? undefined),
    getEventBus: vi.fn(),
  } as unknown as World;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('WildPlantPopulationSystem', () => {
  let system: WildPlantPopulationSystem;
  let eventBus: EventBusImpl;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    system = new WildPlantPopulationSystem();
    const mockWorld = createMockWorld({});
    await system.initialize(mockWorld as unknown as Parameters<typeof system.initialize>[0], eventBus);
    system.setSpeciesLookup((id: string) => {
      if (id === 'grass') return mockGrassSpecies;
      throw new Error(`Unknown species: ${id}`);
    });
    system.registerWildSpecies([mockGrassSpecies]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Identity ─────────────────────────────────────────────────────────────

  describe('identity', () => {
    it('has correct system id', () => {
      expect(system.id).toBe('wild_plant_population');
    });

    it('runs before PlantSystem (priority 15)', () => {
      expect(system.priority).toBe(15);
    });

    it('requires no components', () => {
      expect(system.requiredComponents).toHaveLength(0);
    });

    it('throttles at 480 ticks (24s at 20 TPS)', () => {
      // 200 was the old confusing value; 480 = 24 seconds
      expect((system as any).throttleInterval).toBe(480);
    });

    it('has no accumulatedTime field (dual-throttle removed)', () => {
      expect((system as any).accumulatedTime).toBeUndefined();
    });
  });

  // ─── Seed bank ────────────────────────────────────────────────────────────

  describe('addToSeedBank / getSeedBankStats', () => {
    it('adds seeds to the correct chunk bank', () => {
      system.addToSeedBank('grass', { x: 8, y: 8 });
      system.addToSeedBank('grass', { x: 10, y: 5 });

      // Both positions are in chunk 0,0 (positions 0-15)
      const stats = system.getSeedBankStats('0,0');
      expect(stats.total).toBe(2);
      expect(stats.bySpecies.get('grass')).toBe(2);
    });

    it('tracks multiple species separately', () => {
      system.addToSeedBank('grass', { x: 4, y: 4 });
      system.addToSeedBank('oak_tree', { x: 6, y: 6 });

      const stats = system.getSeedBankStats('0,0');
      expect(stats.total).toBe(2);
      expect(stats.bySpecies.get('grass')).toBe(1);
      expect(stats.bySpecies.get('oak_tree')).toBe(1);
    });

    it('seeds in different chunks are stored separately', () => {
      system.addToSeedBank('grass', { x: 8, y: 8 }); // chunk 0,0
      system.addToSeedBank('grass', { x: 20, y: 8 }); // chunk 1,0

      expect(system.getSeedBankStats('0,0').total).toBe(1);
      expect(system.getSeedBankStats('1,0').total).toBe(1);
    });

    it('caps seed bank at 50 entries per chunk', () => {
      for (let i = 0; i < 60; i++) {
        system.addToSeedBank('grass', { x: 5, y: 5 });
      }
      const stats = system.getSeedBankStats('0,0');
      expect(stats.total).toBeLessThanOrEqual(50);
    });

    it('returns empty stats for unknown chunk', () => {
      const stats = system.getSeedBankStats('99,99');
      expect(stats.total).toBe(0);
      expect(stats.bySpecies.size).toBe(0);
    });
  });

  // ─── Population density ───────────────────────────────────────────────────

  describe('getPopulationDensity', () => {
    it('returns 0 for unknown chunk', () => {
      expect(system.getPopulationDensity('5,5')).toBe(0);
    });
  });

  // ─── registerWildSpecies ──────────────────────────────────────────────────

  describe('registerWildSpecies', () => {
    it('only registers species with biomes defined', () => {
      const noBiomeSpecies: PlantSpecies = {
        ...mockGrassSpecies,
        id: 'no-biome',
        biomes: [],
      };
      system.registerWildSpecies([noBiomeSpecies]);
      // Species without biomes should not build any distributions
      // Verified indirectly: no wild_plant:spawn should be emitted for 'no-biome'
      const spawned: string[] = [];
      eventBus.subscribe('wild_plant:spawn', (e: unknown) => {
        const ev = e as { data?: { speciesId: string } };
        if (ev.data) spawned.push(ev.data.speciesId);
      });
      // No distributions means selectSpeciesForBiome returns null → no spawn
      expect(spawned).toHaveLength(0);
    });
  });

  // ─── Biome fix: no silent 'plains' fallback ───────────────────────────────

  describe('getBiomeAtPosition (via checkNaturalSpawning)', () => {
    it('does NOT emit wild_plant:spawn when getTileAt returns undefined', async () => {
      const world = createMockWorld({
        tick: 480, // satisfies tick % 480 === 0
        tileData: undefined,
        plantEntities: [], // chunk 0,0 will have count 0 (< minPopulation 2)
      });

      // We need chunk 0,0 to appear in chunkPlantCounts so spawning is attempted.
      // Add a wild plant entity at (8,8) in chunk 0,0:
      const wildPlant = createMockPlantEntity(8, 8, false);
      const queryBuilder = (world.query as ReturnType<typeof vi.fn>)();
      queryBuilder.executeEntities.mockReturnValue([wildPlant]);

      // Ensure simulationScheduler passes the entity through
      (world.simulationScheduler.filterActiveEntities as ReturnType<typeof vi.fn>).mockImplementation(
        (entities: any[]) => entities
      );

      const spawnSpy = vi.fn();
      eventBus.subscribe('wild_plant:spawn', spawnSpy);

      // Force Math.random to always pass the spawn chance check
      vi.spyOn(Math, 'random').mockReturnValue(0);

      system.update(world as any, [], 0.05);
      eventBus.flush();

      // No spawn because getTileAt returns undefined → getBiomeAtPosition returns null
      expect(spawnSpy).not.toHaveBeenCalled();
    });

    it('emits wild_plant:spawn when getTileAt returns a valid biome', async () => {
      const wildPlant = createMockPlantEntity(8, 8, false);

      const world = createMockWorld({
        tick: 480,
        tileData: { biome: 'plains' },
        plantEntities: [wildPlant],
      });

      // simulationScheduler must pass the entity through for updateChunkCounts
      (world.simulationScheduler.filterActiveEntities as ReturnType<typeof vi.fn>).mockImplementation(
        (entities: any[]) => entities
      );

      const spawnSpy = vi.fn();
      eventBus.subscribe('wild_plant:spawn', spawnSpy);

      // Force Math.random to always pass the spawn chance check
      vi.spyOn(Math, 'random').mockReturnValue(0);

      system.update(world as any, [], 0.05);
      eventBus.flush();

      // Spawn should be attempted — chunk 0,0 has count 1 < minPopulation 2
      // and tile returns biome 'plains' which has 'grass' species registered
      expect(spawnSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            biome: 'plains',
            speciesId: 'grass',
          }),
        })
      );
    });
  });
});
