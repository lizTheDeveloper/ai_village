/**
 * Tests for ChunkCache simulation mode query
 */

import { describe, it, expect } from 'vitest';
import {
  createChunkCache,
  addToChunkCache,
  recalculateChunkStats,
} from '../ChunkCache.js';
import type { ComponentType } from '@ai-village/core';

describe('ChunkCache - Simulation Mode Query', () => {
  it('should query simulation modes from SimulationScheduler when available', () => {
    const cache = createChunkCache(0, 0);

    // Add entities to cache
    addToChunkCache(cache, 'agent1', 'agent' as ComponentType);
    addToChunkCache(cache, 'agent2', 'agent' as ComponentType);
    addToChunkCache(cache, 'plant1', 'plant' as ComponentType);
    addToChunkCache(cache, 'plant2', 'plant' as ComponentType);
    addToChunkCache(cache, 'building1', 'building' as ComponentType);

    // Mock world with SimulationScheduler
    const mockWorld = {
      getEntity: (id: string) => {
        const entities: Record<string, { id: string; components: Map<string, unknown> }> = {
          agent1: { id: 'agent1', components: new Map([['agent', {}]]) },
          agent2: { id: 'agent2', components: new Map([['agent', {}]]) },
          plant1: { id: 'plant1', components: new Map([['plant', {}]]) },
          plant2: { id: 'plant2', components: new Map([['plant', {}]]) },
          building1: { id: 'building1', components: new Map([['building', {}]]) },
        };
        return entities[id];
      },
      simulationScheduler: {
        isAlwaysActive: (entity: { id: string; components: Map<string, unknown> }) => {
          // Agents and buildings are ALWAYS, plants are PROXIMITY
          return entity.components.has('agent') || entity.components.has('building');
        },
      },
    };

    // Recalculate stats with SimulationScheduler
    recalculateChunkStats(cache, mockWorld);

    // Verify simulation mode counts
    expect(cache.stats.simulationModes.always).toBe(3); // 2 agents + 1 building
    expect(cache.stats.simulationModes.proximity).toBe(2); // 2 plants
    expect(cache.stats.simulationModes.passive).toBe(0); // No passive entities in cache
  });

  it('should use fallback heuristics when SimulationScheduler not available', () => {
    const cache = createChunkCache(0, 0);

    // Add entities to cache
    addToChunkCache(cache, 'agent1', 'agent' as ComponentType);
    addToChunkCache(cache, 'agent2', 'agent' as ComponentType);
    addToChunkCache(cache, 'plant1', 'plant' as ComponentType);
    addToChunkCache(cache, 'animal1', 'animal' as ComponentType);
    addToChunkCache(cache, 'building1', 'building' as ComponentType);

    // Mock world without SimulationScheduler
    const mockWorld = {
      getEntity: (id: string) => {
        const entities: Record<string, { id: string; components: Map<string, unknown> }> = {
          agent1: { id: 'agent1', components: new Map([['agent', {}]]) },
          agent2: { id: 'agent2', components: new Map([['agent', {}]]) },
          plant1: { id: 'plant1', components: new Map([['plant', {}]]) },
          animal1: { id: 'animal1', components: new Map([['animal', {}]]) },
          building1: { id: 'building1', components: new Map([['building', {}]]) },
        };
        return entities[id];
      },
      // No simulationScheduler
    };

    // Recalculate stats without SimulationScheduler
    recalculateChunkStats(cache, mockWorld);

    // Verify fallback heuristics
    expect(cache.stats.simulationModes.always).toBe(3); // 2 agents + 1 building (heuristic)
    expect(cache.stats.simulationModes.proximity).toBe(2); // 1 plant + 1 animal (heuristic)
    expect(cache.stats.simulationModes.passive).toBe(0);
  });

  it('should work without world parameter (backward compatibility)', () => {
    const cache = createChunkCache(0, 0);

    // Add entities to cache
    addToChunkCache(cache, 'agent1', 'agent' as ComponentType);
    addToChunkCache(cache, 'plant1', 'plant' as ComponentType);

    // Recalculate stats without world parameter
    recalculateChunkStats(cache);

    // Should use component-based heuristics
    expect(cache.stats.simulationModes.always).toBe(1); // 1 agent (heuristic)
    expect(cache.stats.simulationModes.proximity).toBe(1); // 1 plant (heuristic)
    expect(cache.stats.simulationModes.passive).toBe(0);
  });

  it('should handle essential entities correctly', () => {
    const cache = createChunkCache(0, 0);

    // Add tamed animal (should be ALWAYS mode even though component is animal)
    addToChunkCache(cache, 'tamed_animal', 'animal' as ComponentType);
    addToChunkCache(cache, 'wild_animal', 'animal' as ComponentType);

    const mockWorld = {
      getEntity: (id: string) => {
        const entities: Record<string, { id: string; components: Map<string, unknown> }> = {
          tamed_animal: { id: 'tamed_animal', components: new Map([['animal', { wild: false }]]) },
          wild_animal: { id: 'wild_animal', components: new Map([['animal', { wild: true }]]) },
        };
        return entities[id];
      },
      simulationScheduler: {
        isAlwaysActive: (entity: { id: string; components: Map<string, unknown> }) => {
          // Tamed animals are ALWAYS mode
          const animalComp = entity.components.get('animal') as { wild?: boolean } | undefined;
          return animalComp?.wild === false;
        },
      },
    };

    recalculateChunkStats(cache, mockWorld);

    // Tamed animal should be ALWAYS, wild should be PROXIMITY
    expect(cache.stats.simulationModes.always).toBe(1); // 1 tamed animal
    expect(cache.stats.simulationModes.proximity).toBe(1); // 1 wild animal
  });
});
