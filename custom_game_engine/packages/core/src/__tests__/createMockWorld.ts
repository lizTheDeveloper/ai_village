/**
 * Shared mock World factory for tests.
 *
 * Provides a complete-enough mock that satisfies the World interface
 * without requiring a full WorldImpl instantiation.
 *
 * Usage:
 *   import { createMockWorld } from './createMockWorld.js';
 *   const world = createMockWorld();
 *   // Override specific properties:
 *   const world = createMockWorld({ tick: 500 });
 */

import { vi } from 'vitest';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';

export interface MockWorldOptions {
  tick?: number;
  entities?: Map<string, any>;
  /** Extra properties merged onto the mock */
  overrides?: Record<string, any>;
}

function createMockEventBus(): EventBus {
  return {
    subscribe: vi.fn().mockReturnValue(vi.fn()),
    emit: vi.fn(),
    emitImmediate: vi.fn(),
    flush: vi.fn(),
    getHistory: vi.fn().mockReturnValue([]),
  } as unknown as EventBus;
}

function createMockQueryBuilder() {
  const qb: any = {
    with: vi.fn().mockReturnThis(),
    without: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeEntities: vi.fn().mockReturnValue([]),
    executeComponents: vi.fn().mockReturnValue([]),
    execute: vi.fn().mockReturnValue([]),
    first: vi.fn().mockReturnValue(undefined),
    count: vi.fn().mockReturnValue(0),
  };
  return qb;
}

export function createMockWorld(options: MockWorldOptions = {}): World {
  const { tick = 100, entities = new Map(), overrides = {} } = options;

  const eventBus = createMockEventBus();
  const queryBuilder = createMockQueryBuilder();

  const world: any = {
    // Core properties
    tick,
    archetypeVersion: 0,
    gameTime: {
      totalTicks: tick,
      ticksPerHour: 1200,
      hour: 6,
      day: 1,
      season: 'spring',
      year: 1,
    },
    entities,

    // Event bus
    eventBus,
    getEventBus: vi.fn().mockReturnValue(eventBus),

    // Entity access
    getEntity: vi.fn().mockImplementation((id: string) => entities.get(id)),
    getComponent: vi.fn().mockReturnValue(undefined),
    hasComponent: vi.fn().mockReturnValue(false),
    hasComponentType: vi.fn().mockReturnValue(false),
    createEntity: vi.fn().mockImplementation(() => {
      const id = `mock-entity-${Math.random().toString(36).slice(2, 8)}`;
      const entity: any = {
        id,
        hasComponent: vi.fn().mockReturnValue(false),
        getComponent: vi.fn().mockReturnValue(undefined),
        addComponent: vi.fn(),
        removeComponent: vi.fn(),
        components: new Map(),
      };
      entities.set(id, entity);
      return entity;
    }),
    addEntity: vi.fn(),

    // Queries
    query: vi.fn().mockReturnValue(queryBuilder),

    // Spatial
    getEntitiesInChunk: vi.fn().mockReturnValue([]),
    getEntitiesInRect: vi.fn().mockReturnValue([]),
    queryEntitiesNear: vi.fn().mockReturnValue([]),
    spatialGrid: {
      query: vi.fn().mockReturnValue([]),
      update: vi.fn(),
      remove: vi.fn(),
      add: vi.fn(),
    },
    spatialQuery: null,

    // Features
    features: {},
    isFeatureEnabled: vi.fn().mockReturnValue(false),

    // Simulation scheduler
    simulationScheduler: {
      filterActiveEntities: vi.fn().mockImplementation(
        (entities: any[]) => entities
      ),
      setMode: vi.fn(),
      getMode: vi.fn().mockReturnValue('ALWAYS'),
    },

    // Performance stats
    performanceStats: {
      tps: 20,
      avgTickTimeMs: 50,
      maxTickTimeMs: 100,
      tickCount: tick,
    },

    // Query cache
    queryCache: {
      get: vi.fn().mockReturnValue(undefined),
      set: vi.fn(),
      clear: vi.fn(),
      invalidate: vi.fn(),
      stats: { hits: 0, misses: 0, size: 0, evictions: 0 },
    },

    // Dirty tracker
    dirtyTracker: {
      markDirty: vi.fn(),
      isDirty: vi.fn().mockReturnValue(false),
      getDirtyByComponent: vi.fn().mockReturnValue(new Set()),
      clear: vi.fn(),
    },

    // SoA accessors
    getPositionSoA: vi.fn().mockReturnValue({
      x: new Float64Array(0),
      y: new Float64Array(0),
      entityIds: [],
      length: 0,
    }),
    getVelocitySoA: vi.fn().mockReturnValue({
      vx: new Float64Array(0),
      vy: new Float64Array(0),
      entityIds: [],
      length: 0,
    }),

    // Chunk/terrain
    getChunkManager: vi.fn().mockReturnValue(undefined),
    getBackgroundChunkGenerator: vi.fn().mockReturnValue(undefined),
    getChunkNameRegistry: vi.fn().mockReturnValue({
      getOrCreate: vi.fn().mockReturnValue('unnamed-chunk'),
    }),
    getTileAt: vi.fn().mockReturnValue(undefined),
    getTerrainAt: vi.fn().mockReturnValue(null),
    getTileData: vi.fn().mockReturnValue(null),

    // Systems
    getSystem: vi.fn().mockReturnValue(undefined),

    // Buildings/Items
    craftingSystem: undefined,
    itemInstanceRegistry: undefined,
    initiateConstruction: vi.fn(),

    // Planets
    getPlanets: vi.fn().mockReturnValue(new Map()),
    getPlanet: vi.fn().mockReturnValue(undefined),
    getActivePlanet: vi.fn().mockReturnValue(undefined),
    activePlanetId: undefined,
    hasPlanet: vi.fn().mockReturnValue(false),

    // Divine config
    divineConfig: undefined,

    // Cleanup
    clear: vi.fn(),

    // Apply overrides last
    ...overrides,
  };

  return world as World;
}
