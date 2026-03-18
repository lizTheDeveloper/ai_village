import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../../__tests__/utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { createTimeComponent } from '../TimeSystem.js';
import { BiomeSeasonSystem } from '../BiomeSeasonSystem.js';
import { ComponentType } from '../../types/ComponentType.js';
import type { TimeComponent } from '../TimeSystem.js';

/**
 * Unit tests for BiomeSeasonSystem
 *
 * Tests:
 * - Emits 'biome:season_conditions_changed' when season is set
 * - Forest winter conditions have foodMultiplier < 0.5
 * - Desert summer has high temperatureOffset (> 8)
 * - Does not re-emit if season hasn't changed (lastSeason deduplication)
 */

describe('BiomeSeasonSystem', () => {
  let harness: IntegrationTestHarness;
  let system: BiomeSeasonSystem;

  beforeEach(async () => {
    harness = new IntegrationTestHarness();
    // Do NOT include the default time entity - we'll create our own
    harness.setupTestWorld({ includeTime: false });

    system = new BiomeSeasonSystem();
    await system.initialize(harness.world, harness.eventBus);
  });

  /**
   * Helper to create a time entity with a specific season.
   * Season is driven by the `day` field in TimeComponent:
   * spring=days 1-90, summer=91-180, fall=181-270, winter=271-360
   */
  function createTimeEntityWithSeason(season: 'spring' | 'summer' | 'fall' | 'winter'): EntityImpl {
    const seasonDayMap: Record<string, number> = {
      spring: 1,
      summer: 91,
      fall: 181,
      winter: 271,
    };
    const timeEntity = new EntityImpl(createEntityId(), 0);
    const timeComp = createTimeComponent(6, 48, 1);
    // Directly set the season field for test control
    const patchedTimeComp: TimeComponent = {
      ...timeComp,
      day: seasonDayMap[season]!,
      season,
    };
    timeEntity.addComponent(patchedTimeComp);
    harness.world.addEntity(timeEntity);
    return timeEntity;
  }

  it('emits biome:season_conditions_changed when season is set', async () => {
    createTimeEntityWithSeason('spring');

    // BiomeSeasonSystem throttleOffset = VERY_SLOW_GROUP_B = 50
    // throttleInterval = 200, so it runs when tick % 200 === 50
    harness.advanceTicks(50);

    const entities = Array.from(harness.world.entities.values());
    system.update(harness.world, entities, 1.0);

    const events = harness.getEmittedEvents('biome:season_conditions_changed');
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]!.data.season).toBe('spring');
  });

  it('emits forest winter conditions with foodMultiplier < 0.5', async () => {
    createTimeEntityWithSeason('winter');
    harness.advanceTicks(50);

    const entities = Array.from(harness.world.entities.values());

    // Patch world.getTileAt to return a forest biome
    (harness.world as any).getTileAt = (_x: number, _y: number) => ({ biome: 'forest' });

    system.update(harness.world, entities, 1.0);

    const events = harness.getEmittedEvents('biome:season_conditions_changed');
    expect(events.length).toBeGreaterThanOrEqual(1);

    const data = events[0]!.data;
    expect(data.biome).toBe('forest');
    expect(data.season).toBe('winter');
    // Forest winter: foodMultiplier = 0.3 (< 0.5)
    expect(data.foodMultiplier).toBeLessThan(0.5);
  });

  it('emits desert summer with temperatureOffset > 8', async () => {
    createTimeEntityWithSeason('summer');
    harness.advanceTicks(50);

    const entities = Array.from(harness.world.entities.values());

    // Patch world.getTileAt to return a desert biome
    (harness.world as any).getTileAt = (_x: number, _y: number) => ({ biome: 'desert' });

    system.update(harness.world, entities, 1.0);

    const events = harness.getEmittedEvents('biome:season_conditions_changed');
    expect(events.length).toBeGreaterThanOrEqual(1);

    const data = events[0]!.data;
    expect(data.biome).toBe('desert');
    expect(data.season).toBe('summer');
    // Desert summer: temperatureOffset = 12 (> 8)
    expect(data.temperatureOffset).toBeGreaterThan(8);
  });

  it('does not re-emit if season has not changed between calls', async () => {
    createTimeEntityWithSeason('spring');
    harness.advanceTicks(50);

    const entities = Array.from(harness.world.entities.values());

    // First call - should emit
    system.update(harness.world, entities, 1.0);

    const eventsAfterFirst = harness.getEmittedEvents('biome:season_conditions_changed');
    expect(eventsAfterFirst.length).toBe(1);

    // Advance ticks to next valid throttle window (200 more ticks)
    harness.advanceTicks(200);

    // Second call with same season - should NOT re-emit
    system.update(harness.world, entities, 1.0);

    const eventsAfterSecond = harness.getEmittedEvents('biome:season_conditions_changed');
    expect(eventsAfterSecond.length).toBe(1); // Still only 1
  });
});
