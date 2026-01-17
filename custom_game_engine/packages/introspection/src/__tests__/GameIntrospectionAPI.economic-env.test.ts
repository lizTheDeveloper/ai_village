/**
 * Tests for GameIntrospectionAPI Economic and Environmental Query Methods (Phase 6b)
 *
 * Tests economic metrics and environmental state query functionality.
 * Covers:
 * - getEconomicMetrics: Resource prices, trade volume, market participants
 * - getEnvironmentalState: Weather, time, temperature, soil, light levels
 *
 * Based on INTROSPECTION_API_DESIGN.md Phase 6b specification.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityImpl, createEntityId } from '@ai-village/core';
import { GameIntrospectionAPI } from '../api/GameIntrospectionAPI.js';
import type { ComponentRegistry } from '../registry/ComponentRegistry.js';
import type { MutationService } from '../mutation/MutationService.js';
import type { World } from '@ai-village/core';

/**
 * Test helper: Create mock entity
 */
function createMockEntity(id?: string): EntityImpl {
  const entity = new EntityImpl(id || createEntityId(), 0);
  return entity;
}

/**
 * Test helper: Create mock World instance
 */
function createMockWorld(): World {
  const entities = new Map<string, EntityImpl>();

  // Mock chunk system that matches implementation expectations
  const mockChunkSystem = {
    getTile: vi.fn((x: number, y: number) => {
      // Return mock tile with soil data (moisture/fertility as 0-100 values)
      return {
        moisture: 60,
        fertility: 70,
        temperature: 18,
      };
    }),
  };

  return {
    tick: 5000,
    timeEntity: null,
    eventBus: {
      emit: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
    query: vi.fn().mockReturnValue({
      with: vi.fn().mockReturnThis(),
      without: vi.fn().mockReturnThis(),
      executeEntities: vi.fn().mockReturnValue([]),
      execute: vi.fn().mockReturnValue([]),
    }),
    getEntity: vi.fn((id: string) => entities.get(id)),
    addEntity: vi.fn((entity: EntityImpl) => {
      entities.set(entity.id, entity);
    }),
    removeEntity: vi.fn((id: string) => {
      entities.delete(id);
    }),
    simulationScheduler: {
      filterActiveEntities: vi.fn((entities) => entities),
    },
    getSystem: vi.fn((name: string) => {
      if (name === 'chunk') return mockChunkSystem;
      return null;
    }),
  } as unknown as World;
}

/**
 * Test helper: Create mock dependencies
 */
function createMockDependencies() {
  const mockRegistry = {
    get: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
    register: vi.fn(),
    clear: vi.fn(),
  } as unknown as ComponentRegistry;

  const mockMutations = {
    mutate: vi.fn(),
    canUndo: vi.fn().mockReturnValue(false),
    canRedo: vi.fn().mockReturnValue(false),
    undo: vi.fn(),
    redo: vi.fn(),
    getInstance: vi.fn(),
  } as unknown as MutationService;

  const mockMetrics = {
    trackEvent: vi.fn(),
  };

  const mockLiveAPI = {
    getEntity: vi.fn(),
    queryEntities: vi.fn().mockReturnValue([]),
  };

  const mockCache = {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidateEntity: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      hits: 0,
      misses: 0,
      invalidations: 0,
      size: 0,
      hitRate: 0,
      avgCacheLifetime: 0,
      memoryUsage: 0,
    }),
    clear: vi.fn(),
  };

  return { mockRegistry, mockMutations, mockMetrics, mockLiveAPI, mockCache };
}

describe('GameIntrospectionAPI - Economic & Environmental Queries (Phase 6b)', () => {
  let world: World;
  let api: GameIntrospectionAPI;
  let marketEntity: EntityImpl;
  let weatherEntity: EntityImpl;
  let timeEntity: EntityImpl;
  let tempEntity: EntityImpl;

  beforeEach(() => {
    world = createMockWorld();
    const { mockRegistry, mockMutations, mockMetrics, mockLiveAPI, mockCache } =
      createMockDependencies();

    api = new GameIntrospectionAPI(
      world,
      mockRegistry,
      mockMutations,
      mockMetrics,
      mockLiveAPI,
      mockCache
    );

    // Create market state entity
    marketEntity = createMockEntity('market-entity');
    const marketStats = new Map();
    marketStats.set('wood', {
      itemId: 'wood',
      totalSupply: 100,
      recentSales: 20,
      recentPurchases: 15,
      averagePrice: 10,
      priceHistory: [8, 9, 10, 11, 10],
      lastUpdated: 5000,
    });
    marketStats.set('stone', {
      itemId: 'stone',
      totalSupply: 50,
      recentSales: 10,
      recentPurchases: 12,
      averagePrice: 15,
      priceHistory: [14, 15, 16, 15, 15],
      lastUpdated: 5000,
    });
    (marketEntity as any).addComponent({
      type: 'market_state',
      version: 1,
      itemStats: marketStats,
      totalCurrency: 10000,
      dailyTransactionVolume: 500,
      weeklyTransactionVolume: 3000,
      inflationRate: 0.02,
      lastDayProcessed: 100,
    });
    world.addEntity?.(marketEntity);

    // Setup query mock to return entities based on component type
    const queryMock = world.query as any;
    queryMock.mockImplementation(() => {
      let componentType: string | null = null;

      const builder = {
        with: vi.fn((type: string) => {
          componentType = type;
          return builder;
        }),
        without: vi.fn().mockReturnThis(),
        executeEntities: vi.fn(() => {
          if (componentType === 'market_state') return [marketEntity];
          if (componentType === 'weather') return [weatherEntity];
          if (componentType === 'time') return [timeEntity];
          if (componentType === 'temperature') return [tempEntity];
          if (componentType === 'currency') return []; // No currency entities by default
          return [];
        }),
        execute: vi.fn().mockReturnValue([]),
      };

      return builder;
    });

    // Create weather entity
    weatherEntity = createMockEntity('weather-entity');
    (weatherEntity as any).addComponent({
      type: 'weather',
      version: 1,
      weatherType: 'rain',
      intensity: 0.6,
      duration: 100,
      tempModifier: -3,
      movementModifier: 0.8,
    });
    world.addEntity?.(weatherEntity);

    // Create time entity
    timeEntity = createMockEntity('time-entity');
    (timeEntity as any).addComponent({
      type: 'time',
      version: 1,
      timeOfDay: 14.5, // 2:30 PM
      dayLength: 48,
      speedMultiplier: 1,
      phase: 'day',
      lightLevel: 1.0,
      day: 42,
    });
    world.addEntity?.(timeEntity);

    // Create temperature entity (global)
    tempEntity = createMockEntity('temp-entity');
    (tempEntity as any).addComponent({
      type: 'temperature',
      version: 1,
      ambient: 20,
      comfortMin: 15,
      comfortMax: 25,
      toleranceMin: 5,
      toleranceMax: 35,
      state: 'comfortable',
    });
    world.addEntity?.(tempEntity);
  });

  describe('getEconomicMetrics', () => {
    describe('Resource Prices', () => {
      it('should get metrics for all resources', async () => {
        const metrics = await api.getEconomicMetrics();

        expect(metrics.prices).toBeDefined();
        expect(metrics.prices.wood).toBeDefined();
        expect(metrics.prices.stone).toBeDefined();
      });

      it('should filter by specific resources', async () => {
        const metrics = await api.getEconomicMetrics({
          resources: ['wood'],
        });

        expect(metrics.prices.wood).toBeDefined();
        expect(metrics.prices.stone).toBeUndefined();
      });

      it('should calculate current price', async () => {
        const metrics = await api.getEconomicMetrics();

        expect(metrics.prices.wood.current).toBe(10);
        expect(metrics.prices.stone.current).toBe(15);
      });

      it('should calculate average price', async () => {
        const metrics = await api.getEconomicMetrics();

        // Average includes current price + history: (10 + 8 + 9 + 10 + 11 + 10) / 6 = 9.666...
        expect(metrics.prices.wood.average).toBeCloseTo(9.67, 1);
        // Average includes current price + history: (15 + 14 + 15 + 16 + 15 + 15) / 6 = 15
        expect(metrics.prices.stone.average).toBe(15);
      });

      it('should calculate min/max prices', async () => {
        const metrics = await api.getEconomicMetrics();

        expect(metrics.prices.wood.min).toBe(8);
        expect(metrics.prices.wood.max).toBe(11);
        expect(metrics.prices.stone.min).toBe(14);
        expect(metrics.prices.stone.max).toBe(16);
      });

      it('should calculate price trend', async () => {
        const metrics = await api.getEconomicMetrics();

        // Price history: [8, 9, 10, 11, 10]
        // Trend should be positive (rising overall)
        expect(metrics.prices.wood.trend).toBeGreaterThan(0);

        // Price history: [14, 15, 16, 15, 15]
        // Trend should be positive but smaller
        expect(metrics.prices.stone.trend).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Trade Volume', () => {
      it('should calculate total quantity traded', async () => {
        const metrics = await api.getEconomicMetrics();

        // recentSales = 20, recentPurchases = 15
        expect(metrics.tradeVolume.wood.quantity).toBe(35);
        // recentSales = 10, recentPurchases = 12
        expect(metrics.tradeVolume.stone.quantity).toBe(22);
      });

      it('should count number of trades', async () => {
        const metrics = await api.getEconomicMetrics();

        // Trade count = (sales + purchases) / 10 (estimated)
        expect(metrics.tradeVolume.wood.tradeCount).toBe(3); // 35 / 10 = 3
        expect(metrics.tradeVolume.stone.tradeCount).toBe(2); // 22 / 10 = 2
      });

      it('should calculate total value traded', async () => {
        const metrics = await api.getEconomicMetrics();

        // Wood: 35 quantity * 10 avg price = 350
        expect(metrics.tradeVolume.wood.value).toBeCloseTo(350, 0);
        // Stone: 22 quantity * 15 avg price = 330
        expect(metrics.tradeVolume.stone.value).toBeCloseTo(330, 0);
      });
    });

    describe('Market Participants', () => {
      it('should count buyers and sellers', async () => {
        const metrics = await api.getEconomicMetrics();

        expect(metrics.participants.buyers).toBeGreaterThanOrEqual(0);
        expect(metrics.participants.sellers).toBeGreaterThanOrEqual(0);
        expect(metrics.participants.activeTraders).toBeGreaterThanOrEqual(0);
      });

      it('should count unique active traders', async () => {
        const metrics = await api.getEconomicMetrics();

        // Active traders should be less than or equal to buyers + sellers
        expect(metrics.participants.activeTraders).toBeLessThanOrEqual(
          metrics.participants.buyers + metrics.participants.sellers
        );
      });
    });

    describe('Edge Cases', () => {
      it('should return empty metrics when no market state', async () => {
        // Remove market entity
        world.removeEntity?.('market-entity');

        const queryMock = world.query as any;
        queryMock.mockImplementation(() => {
          const builder = {
            with: vi.fn().mockReturnThis(),
            without: vi.fn().mockReturnThis(),
            executeEntities: vi.fn().mockReturnValue([]),
            execute: vi.fn().mockReturnValue([]),
          };
          return builder;
        });

        const metrics = await api.getEconomicMetrics();

        expect(metrics.prices).toEqual({});
        expect(metrics.tradeVolume).toEqual({});
        expect(metrics.participants.buyers).toBe(0);
        expect(metrics.participants.sellers).toBe(0);
        expect(metrics.participants.activeTraders).toBe(0);
      });

      it('should handle time range filtering (if implemented)', async () => {
        const metrics = await api.getEconomicMetrics({
          timeRange: { start: 0, end: 5000 },
        });

        // Should still return data within time range
        expect(metrics.prices).toBeDefined();
      });

      it('should handle empty resource filter', async () => {
        const metrics = await api.getEconomicMetrics({
          resources: [],
        });

        // Empty filter means no resources match (empty array = filter nothing)
        expect(Object.keys(metrics.prices).length).toBe(0);
      });
    });
  });

  describe('getEnvironmentalState', () => {
    describe('Global Environmental State', () => {
      it('should get global environmental state without bounds', async () => {
        const env = await api.getEnvironmentalState();

        expect(env.weather).toBeDefined();
        expect(env.time).toBeDefined();
      });

      it('should return weather data', async () => {
        const env = await api.getEnvironmentalState();

        expect(env.weather.type).toBe('rain');
        expect(env.weather.temperature).toBe(20); // From temperature component
        expect(env.weather.cloudCover).toBeGreaterThanOrEqual(0);
        expect(env.weather.cloudCover).toBeLessThanOrEqual(1);
      });

      it('should calculate precipitation from weather intensity', async () => {
        const env = await api.getEnvironmentalState();

        // Rain with intensity 0.6
        expect(env.weather.precipitation).toBeCloseTo(0.6, 1);
      });

      it('should calculate wind speed and direction', async () => {
        const env = await api.getEnvironmentalState();

        expect(env.weather.windSpeed).toBeGreaterThanOrEqual(0);
        expect(env.weather.windDirection).toBeGreaterThanOrEqual(0);
        expect(env.weather.windDirection).toBeLessThan(360);
      });
    });

    describe('Time Information', () => {
      it('should get current tick and time of day', async () => {
        const env = await api.getEnvironmentalState();

        expect(env.time.tick).toBe(5000);
        expect(env.time.timeOfDay).toBe(14.5); // 2:30 PM
      });

      it('should get current day number', async () => {
        const env = await api.getEnvironmentalState();

        expect(env.time.day).toBe(42);
      });

      it('should calculate season from day number', async () => {
        const env = await api.getEnvironmentalState();

        // Day 42 in 365-day cycle
        // Winter: 0-90, Spring: 91-181, Summer: 182-272, Autumn: 273-364
        expect(env.time.season).toBe('winter');
      });

      it('should calculate correct season for different days', async () => {
        // Test spring (day 150: 150 % 365 = 150, < 182)
        (timeEntity as any).updateComponent('time', () => ({
          type: 'time',
          version: 1,
          day: 150,
          timeOfDay: 12,
          dayLength: 48,
          speedMultiplier: 1,
          phase: 'day',
          lightLevel: 1.0,
        }));

        let env = await api.getEnvironmentalState();
        expect(env.time.season).toBe('spring');

        // Test summer (day 250: 250 % 365 = 250, < 273)
        (timeEntity as any).updateComponent('time', () => ({
          type: 'time',
          version: 1,
          day: 250,
          timeOfDay: 12,
          dayLength: 48,
          speedMultiplier: 1,
          phase: 'day',
          lightLevel: 1.0,
        }));

        env = await api.getEnvironmentalState();
        expect(env.time.season).toBe('summer');

        // Test autumn (day 350: 350 % 365 = 350, >= 273)
        (timeEntity as any).updateComponent('time', () => ({
          type: 'time',
          version: 1,
          day: 350,
          timeOfDay: 12,
          dayLength: 48,
          speedMultiplier: 1,
          phase: 'day',
          lightLevel: 1.0,
        }));

        env = await api.getEnvironmentalState();
        expect(env.time.season).toBe('autumn');
      });

      it('should calculate moon phase', async () => {
        const env = await api.getEnvironmentalState();

        // 28-day cycle, day 42 % 28 = 14 (full moon)
        expect(env.time.moonPhase).toBeCloseTo(0.5, 1);
      });

      it('should calculate moon phase for different days', async () => {
        // Test new moon (day 28: 28 % 28 = 0)
        (timeEntity as any).updateComponent('time', () => ({
          type: 'time',
          version: 1,
          day: 28,
          timeOfDay: 12,
          dayLength: 48,
          speedMultiplier: 1,
          phase: 'day',
          lightLevel: 1.0,
        }));

        let env = await api.getEnvironmentalState();
        expect(env.time.moonPhase).toBeCloseTo(0.0, 1);

        // Test quarter moon (day 7: 7 % 28 = 7, 7/28 = 0.25)
        (timeEntity as any).updateComponent('time', () => ({
          type: 'time',
          version: 1,
          day: 7,
          timeOfDay: 12,
          dayLength: 48,
          speedMultiplier: 1,
          phase: 'day',
          lightLevel: 1.0,
        }));

        env = await api.getEnvironmentalState();
        expect(env.time.moonPhase).toBeCloseTo(0.25, 1);
      });
    });

    describe('Soil Data (with bounds)', () => {
      it('should get soil data when bounds specified', async () => {
        const env = await api.getEnvironmentalState({
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10,
        });

        expect(env.soil).toBeDefined();
      });

      it('should not include soil data without bounds', async () => {
        const env = await api.getEnvironmentalState();

        expect(env.soil).toBeUndefined();
      });

      it('should calculate average soil moisture', async () => {
        const env = await api.getEnvironmentalState({
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10,
        });

        expect(env.soil!.moisture).toBeCloseTo(0.6, 1);
      });

      it('should calculate average soil fertility', async () => {
        const env = await api.getEnvironmentalState({
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10,
        });

        expect(env.soil!.fertility).toBeCloseTo(0.7, 1);
      });

      it('should calculate average soil temperature', async () => {
        const env = await api.getEnvironmentalState({
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10,
        });

        expect(env.soil!.temperature).toBeCloseTo(20, 1);
      });
    });

    describe('Light Levels (with bounds)', () => {
      it('should calculate light levels when bounds specified', async () => {
        const env = await api.getEnvironmentalState({
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10,
        });

        expect(env.light).toBeDefined();
      });

      it('should not include light data without bounds', async () => {
        const env = await api.getEnvironmentalState();

        expect(env.light).toBeUndefined();
      });

      it('should calculate sunlight from time component', async () => {
        const env = await api.getEnvironmentalState({
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10,
        });

        // Day phase, light level 1.0
        expect(env.light!.sunlight).toBeCloseTo(1.0, 1);
      });

      it('should calculate ambient light from weather', async () => {
        const env = await api.getEnvironmentalState({
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10,
        });

        // Rain reduces ambient light
        expect(env.light!.ambient).toBeGreaterThanOrEqual(0);
        expect(env.light!.ambient).toBeLessThanOrEqual(1);
      });
    });

    describe('Edge Cases', () => {
      it('should handle missing environmental components gracefully', async () => {
        // Remove all environmental entities
        world.removeEntity?.('weather-entity');
        world.removeEntity?.('time-entity');
        world.removeEntity?.('temp-entity');

        const queryMock = world.query as any;
        queryMock.mockImplementation(() => {
          const builder = {
            with: vi.fn().mockReturnThis(),
            without: vi.fn().mockReturnThis(),
            executeEntities: vi.fn().mockReturnValue([]),
            execute: vi.fn().mockReturnValue([]),
          };
          return builder;
        });

        const env = await api.getEnvironmentalState();

        // Should return default/fallback values
        expect(env.weather).toBeDefined();
        expect(env.time).toBeDefined();
      });

      it('should handle bounds with no tiles', async () => {
        // Mock getSystem to return chunk system with getTile that returns undefined
        const mockChunkSystem = {
          getTile: vi.fn().mockReturnValue(undefined),
        };
        (world as any).getSystem = vi.fn((name: string) => {
          if (name === 'chunk') return mockChunkSystem;
          return null;
        });

        const env = await api.getEnvironmentalState({
          minX: 1000,
          minY: 1000,
          maxX: 1010,
          maxY: 1010,
        });

        // When no tiles found, soil should be undefined
        expect(env.soil).toBeUndefined();
      });

      it('should handle night time light levels', async () => {
        // Set time to night
        (timeEntity as any).updateComponent('time', () => ({
          type: 'time',
          version: 1,
          timeOfDay: 22, // 10 PM
          day: 42,
          dayLength: 48,
          speedMultiplier: 1,
          phase: 'night',
          lightLevel: 0.1,
        }));

        const env = await api.getEnvironmentalState({
          minX: 0,
          minY: 0,
          maxX: 10,
          maxY: 10,
        });

        expect(env.light!.sunlight).toBeCloseTo(0.1, 1);
      });

      it('should handle different weather types', async () => {
        // Test clear weather
        (weatherEntity as any).updateComponent('weather', () => ({
          type: 'weather',
          version: 1,
          weatherType: 'clear',
          intensity: 0.0,
          duration: 100,
          tempModifier: 0,
          movementModifier: 1.0,
        }));

        let env = await api.getEnvironmentalState();
        expect(env.weather.type).toBe('clear');
        expect(env.weather.precipitation).toBeCloseTo(0.0, 1);

        // Test snow (note: current implementation only sets precipitation for 'rain')
        (weatherEntity as any).updateComponent('weather', () => ({
          type: 'weather',
          version: 1,
          weatherType: 'snow',
          intensity: 0.8,
          duration: 100,
          tempModifier: -8,
          movementModifier: 0.7,
        }));

        env = await api.getEnvironmentalState();
        expect(env.weather.type).toBe('snow');
        // Implementation only tracks precipitation for rain, not snow
        expect(env.weather.precipitation).toBeCloseTo(0.0, 1);
      });
    });
  });
});
