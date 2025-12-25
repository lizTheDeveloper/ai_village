import { IntegrationTestHarness, TestConfig } from '../utils/IntegrationTestHarness.js';

/**
 * Pre-configured test world scenarios
 */

/**
 * Create a basic world with time system at dawn
 */
export function createDawnWorld(): IntegrationTestHarness {
  const harness = new IntegrationTestHarness();
  harness.setupTestWorld({
    startHour: 6,
    secondsPerDay: 48,
    timeSpeed: 1,
    includeTime: true,
  });
  return harness;
}

/**
 * Create a world at noon (midday)
 */
export function createMiddayWorld(): IntegrationTestHarness {
  const harness = new IntegrationTestHarness();
  harness.setupTestWorld({
    startHour: 12,
    secondsPerDay: 48,
    timeSpeed: 1,
    includeTime: true,
  });
  return harness;
}

/**
 * Create a world at night (10 PM)
 */
export function createNightWorld(): IntegrationTestHarness {
  const harness = new IntegrationTestHarness();
  harness.setupTestWorld({
    startHour: 22,
    secondsPerDay: 48,
    timeSpeed: 1,
    includeTime: true,
  });
  return harness;
}

/**
 * Create a world with fast time progression (for testing time-based events)
 */
export function createFastTimeWorld(): IntegrationTestHarness {
  const harness = new IntegrationTestHarness();
  harness.setupTestWorld({
    startHour: 6,
    secondsPerDay: 12, // 4x faster than normal
    timeSpeed: 1,
    includeTime: true,
  });
  return harness;
}

/**
 * Create a minimal world without time system
 */
export function createMinimalWorld(): IntegrationTestHarness {
  const harness = new IntegrationTestHarness();
  harness.setupTestWorld({
    includeTime: false,
  });
  return harness;
}

/**
 * Create a world with custom configuration
 */
export function createCustomWorld(config: TestConfig): IntegrationTestHarness {
  const harness = new IntegrationTestHarness();
  harness.setupTestWorld(config);
  return harness;
}
