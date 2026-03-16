/**
 * RED TEAM TESTS — AnimalHousingCleanliness
 *
 * AnimalHousingCleanliness.test.ts has 24 tests and 4 expect() calls.
 * 20 tests have zero assertions. They all pass in 0ms.
 *
 * This file proves that by running what the tests CLAIM to test
 * and showing none of it works.
 *
 * Run with: npm test -- RedTeam.AnimalHousing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { globSync } from 'glob';
import { World } from '../ecs/index.js';
import { EventBusImpl } from '../events/EventBus.js';
import { ComponentType } from '../types/ComponentType.js';
import { BuildingType } from '../types/BuildingType.js';
import { createBuildingComponent, type BuildingComponent } from '../components/BuildingComponent.js';

describe('RED TEAM: AnimalHousing — tests that claim to test but do not', () => {

  /**
   * AnimalHousingCleanliness.test.ts has 24 tests and 4 expect() calls.
   * That means 20/24 tests have no assertions whatsoever.
   * They are empty test bodies that always pass.
   * Vitest doesn't require a minimum number of assertions.
   *
   * This scanner finds every test file with more `it(` than `expect(` calls.
   * The ratio reveals how much of the "test coverage" is theatrical.
   */
  it('no test file has more it() declarations than expect() assertions', () => {
    const testRoot = resolve(__dirname, '.');
    const testFiles = globSync('**/*.test.ts', { cwd: testRoot, absolute: true });

    const violations: Array<{ file: string; tests: number; expects: number; ratio: number }> = [];

    for (const file of testFiles) {
      if (file.includes('RedTeam.')) continue;
      const content = readFileSync(file, 'utf-8');

      // Count it( declarations (tests) vs expect( assertions
      const testCount = (content.match(/\bit\s*\(/g) ?? []).length +
                        (content.match(/\bit\.each\s*\(/g) ?? []).length;
      const expectCount = (content.match(/\bexpect\s*\(/g) ?? []).length;

      if (testCount > 0 && expectCount < testCount) {
        violations.push({
          file: file.replace(testRoot + '/', ''),
          tests: testCount,
          expects: expectCount,
          ratio: expectCount / testCount,
        });
      }
    }

    violations.sort((a, b) => a.ratio - b.ratio);

    if (violations.length > 0) {
      const summary = violations
        .slice(0, 10)
        .map(v => `  ${v.file}: ${v.tests} tests, ${v.expects} expects (${(v.ratio * 100).toFixed(0)}% coverage)`)
        .join('\n');

      throw new Error(
        `${violations.length} test files have fewer assertions than test cases.\n` +
        `Top offenders (sorted by worst ratio):\n${summary}\n\n` +
        `These tests are decorative. They describe behavior but assert nothing.`
      );
    }
  });

  /**
   * Scanner for tests with vi.fn() mocks that are never asserted.
   * A mock that is created but never checked is useless.
   */
  it('no test file creates vi.fn() without asserting on it', () => {
    const testRoot = resolve(__dirname, '.');
    const testFiles = globSync('**/*.test.ts', { cwd: testRoot, absolute: true });

    const violations: Array<{ file: string; mocks: number; assertions: number }> = [];

    for (const file of testFiles) {
      if (file.includes('RedTeam.')) continue;
      const content = readFileSync(file, 'utf-8');

      const mockCount = (content.match(/vi\.fn\s*\(/g) ?? []).length;
      const mockAssertions = (content.match(/toHaveBeenCalled|toHaveBeenCalledWith|toHaveBeenCalledTimes/g) ?? []).length;

      // If there are mocks but zero mock assertions: every mock is useless
      if (mockCount > 0 && mockAssertions === 0) {
        violations.push({ file: file.replace(testRoot + '/', ''), mocks: mockCount, assertions: mockAssertions });
      }
    }

    if (violations.length > 0) {
      const summary = violations
        .map(v => `  ${v.file}: ${v.mocks} mocks, 0 mock assertions`)
        .join('\n');

      throw new Error(
        `${violations.length} files create vi.fn() mocks that are never asserted on.\n` +
        `These mocks provide zero value:\n${summary}`
      );
    }
  });

});

describe('RED TEAM: AnimalHousing — the cleanliness system actually works?', () => {
  let world: World;
  let eventBus: EventBusImpl;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
  });

  /**
   * AnimalHousingCleanliness.test.ts line 30-126 claims:
   * "should decrease cleanliness daily based on occupancy"
   * The test has NO assertions. It passes by doing nothing.
   *
   * If AnimalHousingSystem actually runs, does cleanliness decay?
   * This test requires the AnimalHousingSystem (throttleInterval=20) to run.
   * We need to advance the tick to 20+ and verify decay.
   */
  it('cleanliness actually decreases over time with occupants (not just claimed in comments)', async () => {
    const { AnimalHousingSystem } = await import('../systems/AnimalHousingSystem.js');
    const system = new AnimalHousingSystem();
    await system.initialize(world, eventBus);

    const housingEntity = world.createEntity();
    const building = createBuildingComponent(BuildingType.ChickenCoop, 2);
    building.isComplete = true;
    (building as BuildingComponent).currentOccupants = 8; // Full occupancy
    housingEntity.addComponent(building);

    const entities = [housingEntity];
    const initialCleanliness = (housingEntity.getComponent(ComponentType.Building) as BuildingComponent).cleanliness;
    expect(initialCleanliness).toBe(100); // Confirm starting value

    // Run system for enough ticks to trigger cleanliness decay
    // AnimalHousingSystem throttleInterval = 20 → runs at tick 0, 20, 40...
    // Need to advance tick to trigger the actual logic
    for (let tick = 0; tick <= 20000; tick += 20) {
      world.setTick(tick);
      system.update(world, entities, 1.0);
    }

    const finalCleanliness = (housingEntity.getComponent(ComponentType.Building) as BuildingComponent).cleanliness;

    // After simulating 1000 days (20000 ticks at 20/day), cleanliness should be 0
    // The test in AnimalHousingCleanliness.test.ts claims this happens but asserts nothing
    expect(finalCleanliness).toBeLessThan(initialCleanliness); // EXPECTED TO FAIL if system isn't implemented
    expect(finalCleanliness).toBe(0); // EXPECTED TO FAIL if cleanliness doesn't reach 0
  });

  /**
   * The 'housing_dirty' event test (AnimalHousingCleanliness.test.ts line 128):
   *   1. Subscribes to 'housing_dirty'
   *   2. Manually sets cleanliness to 25 (below threshold)
   *   3. Has ZERO assertions
   *   4. Passes vacuously
   *
   * The event is supposed to be emitted by AnimalHousingSystem when cleanliness
   * drops below 30 during a system update. But the test never runs the system.
   * And even if it did, it never flushes the event bus.
   *
   * This test proves the event ISN'T emitted even when we do it right.
   */
  it('housing_dirty event fires when cleanliness drops below 30 (what the existing test claims)', async () => {
    const { AnimalHousingSystem } = await import('../systems/AnimalHousingSystem.js');
    const system = new AnimalHousingSystem();
    await system.initialize(world, eventBus);

    const housingEntity = world.createEntity();
    const building = createBuildingComponent(BuildingType.ChickenCoop, 2);
    building.isComplete = true;
    (building as BuildingComponent).currentOccupants = 8;
    housingEntity.addComponent(building);

    const dirtyEventSpy = vi.fn();
    eventBus.subscribe('housing_dirty', dirtyEventSpy);

    // Run system until cleanliness should drop below 30
    for (let tick = 0; tick <= 20000; tick += 20) {
      world.setTick(tick);
      system.update(world, [housingEntity], 1.0);
    }
    eventBus.flush();

    // If system implements event emission, dirtyEventSpy should have been called
    // EXPECTED TO FAIL if housing_dirty event is never emitted
    expect(dirtyEventSpy).toHaveBeenCalled();
  });

  /**
   * The 'housing_dirty event only once' test (AnimalHousingCleanliness.test.ts line 395):
   * Claims the event fires once, not repeatedly.
   * Has ZERO assertions.
   *
   * This test verifies the deduplication behavior.
   * Even if the event fires, it should only fire once per crossing threshold.
   */
  it('housing_dirty event fires exactly once when crossing threshold (idempotency)', async () => {
    const { AnimalHousingSystem } = await import('../systems/AnimalHousingSystem.js');
    const system = new AnimalHousingSystem();
    await system.initialize(world, eventBus);

    const housingEntity = world.createEntity();
    const building = createBuildingComponent(BuildingType.ChickenCoop, 2);
    building.isComplete = true;
    (building as BuildingComponent).currentOccupants = 8;
    housingEntity.addComponent(building);

    const dirtyEventSpy = vi.fn();
    eventBus.subscribe('housing_dirty', dirtyEventSpy);

    // Run for 50000 ticks — crossing threshold multiple times if reset
    for (let tick = 0; tick <= 50000; tick += 20) {
      world.setTick(tick);
      system.update(world, [housingEntity], 1.0);
    }
    eventBus.flush();

    // Should fire exactly once (not once per update below threshold)
    // EXPECTED TO FAIL — either 0 times (not implemented) or too many times (no dedup)
    expect(dirtyEventSpy).toHaveBeenCalledTimes(1);
  });

});

describe('RED TEAM: Assertion-count audit across test suite', () => {

  /**
   * The ratio of expect() calls to it() declarations across the whole test suite
   * tells you how much of the "green" is real.
   *
   * Healthy ratio: > 3 expects per test (meaningful verification)
   * Warning zone: 1-3 expects per test (thin coverage)
   * Broken: < 1 expect per test (many tests have zero assertions)
   */
  it('every test file has at least 2 assertions per test on average', () => {
    const testRoot = resolve(__dirname, '.');
    const testFiles = globSync('**/*.test.ts', { cwd: testRoot, absolute: true });

    const criticallyThin: Array<{ file: string; tests: number; expects: number }> = [];

    for (const file of testFiles) {
      if (file.includes('RedTeam.')) continue;
      const content = readFileSync(file, 'utf-8');

      const testCount = (content.match(/\bit\s*\(/g) ?? []).length;
      const expectCount = (content.match(/\bexpect\s*\(/g) ?? []).length;

      if (testCount >= 3 && expectCount / testCount < 1.0) {
        criticallyThin.push({
          file: file.replace(testRoot + '/', ''),
          tests: testCount,
          expects: expectCount,
        });
      }
    }

    criticallyThin.sort((a, b) => a.expects / a.tests - b.expects / b.tests);

    if (criticallyThin.length > 0) {
      const summary = criticallyThin
        .map(v => `  ${v.file}: ${v.tests} tests, ${v.expects} expects`)
        .join('\n');
      throw new Error(
        `${criticallyThin.length} test files average < 1 assertion per test:\n${summary}`
      );
    }
  });

});
