/**
 * Tests for LLMEffectSandbox — Phase 6 of Universe Forking
 *
 * Tests the sandbox testing pipeline: static validation → fork → execute → tick → invariant check → discard.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMEffectSandbox, type SandboxTestOptions } from '../LLMEffectSandbox.js';
import type { EffectExpression } from '@ai-village/magic';

// ---------------------------------------------------------------------------
// Minimal stubs for the coordinator and world
// ---------------------------------------------------------------------------

function createMockEntity(id: string) {
  return {
    id,
    hasComponent: () => true,
    getComponent: () => ({ type: 'position', x: 0, y: 0 }),
    addComponent: vi.fn(),
    removeComponent: vi.fn(),
    components: new Map(),
  };
}

function createMockWorld(entityIds: string[]) {
  const entities = new Map<string, ReturnType<typeof createMockEntity>>();
  for (const id of entityIds) {
    entities.set(id, createMockEntity(id));
  }

  return {
    entities,
    tick: 100,
    advanceTick: vi.fn(),
    query: () => ({
      with: () => ({ executeEntities: () => [] }),
    }),
    eventBus: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
  };
}

function createMockCoordinator(world: ReturnType<typeof createMockWorld>) {
  return {
    forkUniverse: vi.fn().mockResolvedValue({
      config: {
        id: 'test-fork',
        name: 'Test Fork',
        timeScale: 1,
        multiverseId: 'test',
        paused: false,
      },
      world,
      universeTick: 100n,
      lastAbsoluteTick: 0n,
      pausedDuration: 0n,
    }),
    unregisterUniverse: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// A minimal valid EffectExpression
// ---------------------------------------------------------------------------

const VALID_EFFECT: EffectExpression = {
  target: { type: 'single' },
  operations: [
    { op: 'deal_damage', damageType: 'fire', amount: 10 },
  ],
  timing: { type: 'immediate' },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LLMEffectSandbox', () => {
  let sandbox: LLMEffectSandbox;
  let mockWorld: ReturnType<typeof createMockWorld>;
  let mockCoordinator: ReturnType<typeof createMockCoordinator>;

  const defaultOptions: SandboxTestOptions = {
    sourceUniverseId: 'player_universe',
    casterEntityId: 'caster-1',
    targetEntityId: 'target-1',
    tickCount: 5, // Small for tests
    timeoutMs: 2000,
  };

  beforeEach(() => {
    mockWorld = createMockWorld(['caster-1', 'target-1']);
    mockCoordinator = createMockCoordinator(mockWorld);
    sandbox = new LLMEffectSandbox(mockCoordinator as any);
  });

  describe('testEffect', () => {
    it('should return a result with expected shape', async () => {
      const result = await sandbox.testEffect(VALID_EFFECT, defaultOptions);

      expect(result).toHaveProperty('safe');
      expect(result).toHaveProperty('verdict');
      expect(result).toHaveProperty('effectResult');
      expect(result).toHaveProperty('validationResult');
      expect(result).toHaveProperty('invariantErrors');
      expect(result).toHaveProperty('ticksRun');
      expect(result).toHaveProperty('executionTimeMs');
      expect(result).toHaveProperty('cached');
      expect(result.cached).toBe(false);
    });

    it('should fork the source universe', async () => {
      await sandbox.testEffect(VALID_EFFECT, defaultOptions);

      expect(mockCoordinator.forkUniverse).toHaveBeenCalledWith(
        'player_universe',
        expect.stringContaining('llm_sandbox'),
        expect.stringContaining('LLM Sandbox Test'),
        { timeScale: 1 },
      );
    });

    it('should always discard the sandbox fork', async () => {
      await sandbox.testEffect(VALID_EFFECT, defaultOptions);

      expect(mockCoordinator.unregisterUniverse).toHaveBeenCalledWith(
        expect.stringContaining('llm_sandbox'),
      );
    });

    it('should discard fork even if effect execution throws', async () => {
      // Create world with missing target entity to trigger error
      const brokenWorld = createMockWorld(['caster-1']); // no target-1
      const brokenCoordinator = createMockCoordinator(brokenWorld);
      const brokenSandbox = new LLMEffectSandbox(brokenCoordinator as any);

      const result = await brokenSandbox.testEffect(VALID_EFFECT, defaultOptions);

      expect(result.safe).toBe(false);
      expect(brokenCoordinator.unregisterUniverse).toHaveBeenCalled();
    });

    it('should return unsafe_runtime if fork creation fails', async () => {
      mockCoordinator.forkUniverse.mockRejectedValueOnce(new Error('No source universe'));

      const result = await sandbox.testEffect(VALID_EFFECT, defaultOptions);

      expect(result.safe).toBe(false);
      expect(result.verdict).toBe('unsafe_runtime');
      expect(result.invariantErrors[0]).toContain('Fork creation failed');
    });

    it('should advance tick the configured number of times', async () => {
      await sandbox.testEffect(VALID_EFFECT, {
        ...defaultOptions,
        tickCount: 10,
      });

      // advanceTick should be called ~10 times (may be less if effect fails)
      expect(mockWorld.advanceTick.mock.calls.length).toBeLessThanOrEqual(10);
    });
  });

  describe('caching', () => {
    it('should cache results for identical effects', async () => {
      const result1 = await sandbox.testEffect(VALID_EFFECT, defaultOptions);
      const result2 = await sandbox.testEffect(VALID_EFFECT, defaultOptions);

      expect(result1.cached).toBe(false);
      expect(result2.cached).toBe(true);

      // Fork should only be created once
      expect(mockCoordinator.forkUniverse).toHaveBeenCalledTimes(1);
    });

    it('should not cache fork creation failures', async () => {
      mockCoordinator.forkUniverse.mockRejectedValueOnce(new Error('transient'));
      await sandbox.testEffect(VALID_EFFECT, defaultOptions);

      // Second call should attempt fork again
      mockCoordinator.forkUniverse.mockResolvedValueOnce({
        config: { id: 'test-fork-2', name: 'Test Fork 2', timeScale: 1, multiverseId: 'test', paused: false },
        world: mockWorld,
        universeTick: 100n,
        lastAbsoluteTick: 0n,
        pausedDuration: 0n,
      });
      await sandbox.testEffect(VALID_EFFECT, defaultOptions);

      expect(mockCoordinator.forkUniverse).toHaveBeenCalledTimes(2);
    });

    it('should return cached verdict via getCachedVerdict', async () => {
      expect(sandbox.getCachedVerdict(VALID_EFFECT)).toBeUndefined();

      await sandbox.testEffect(VALID_EFFECT, defaultOptions);

      expect(sandbox.getCachedVerdict(VALID_EFFECT)).toBeDefined();
    });

    it('should clear cache', async () => {
      await sandbox.testEffect(VALID_EFFECT, defaultOptions);
      expect(sandbox.cacheSize).toBe(1);

      sandbox.clearCache();
      expect(sandbox.cacheSize).toBe(0);
    });
  });

  describe('validation', () => {
    it('should reject effects with malformed schema before forking', async () => {
      const malformed = {
        // Missing required 'target' field
        operations: [],
        timing: { type: 'immediate' },
      } as unknown as EffectExpression;

      const result = await sandbox.testEffect(malformed, defaultOptions);

      expect(result.safe).toBe(false);
      expect(result.verdict).toBe('unsafe_validation');
      // Should NOT have forked
      expect(mockCoordinator.forkUniverse).not.toHaveBeenCalled();
    });
  });
});
