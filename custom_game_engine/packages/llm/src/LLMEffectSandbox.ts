/**
 * LLMEffectSandbox — Phase 6 of Universe Forking (Phase 32)
 *
 * Tests LLM-generated EffectExpressions in an isolated forked universe
 * before they are applied to the main world. Forks the current universe,
 * applies the effect, runs N ticks, validates invariants, and returns
 * a safety verdict.
 *
 * Results are hash-cached so identical effects skip re-testing.
 *
 * Usage:
 * ```typescript
 * const sandbox = new LLMEffectSandbox(multiverseCoordinator);
 * const verdict = await sandbox.testEffect(effect, {
 *   sourceUniverseId: 'player_universe',
 *   casterEntityId: 'caster-123',
 *   targetEntityId: 'target-456',
 * });
 * if (verdict.safe) applyToMainWorld(effect);
 * ```
 */

import type { WorldMutator, Entity, World, UniverseInstance } from '@ai-village/core';
import { validateWorldState, InvariantViolationError, multiverseCoordinator } from '@ai-village/core';
import type { EffectExpression } from '@ai-village/magic';
import {
  EffectInterpreter,
  type EffectContext,
  type EffectResult,
  type InterpreterOptions,
} from '@ai-village/magic';
import {
  EffectValidationPipeline,
  type ValidationResult,
} from '@ai-village/magic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Purpose tag for sandbox forks — auto-discard after testing. */
const SANDBOX_PURPOSE = 'llm_sandbox' as const;

/** Default number of ticks to simulate after applying the effect. */
const DEFAULT_TICK_COUNT = 100;

/** Default timeout for the entire sandbox test (ms). */
const DEFAULT_TIMEOUT_MS = 5_000;

/** Maximum number of cached verdicts before LRU eviction. */
const MAX_CACHE_SIZE = 512;

export interface SandboxTestOptions {
  /** Universe to fork for testing. */
  sourceUniverseId: string;

  /** Entity that "casts" the effect. Must exist in source universe. */
  casterEntityId: string;

  /** Entity that is the target of the effect. Must exist in source universe. */
  targetEntityId: string;

  /** Number of ticks to run after applying the effect (default: 100). */
  tickCount?: number;

  /** Abort if test exceeds this many ms (default: 5 000). */
  timeoutMs?: number;

  /** Override EffectInterpreter safety limits. */
  interpreterOptions?: InterpreterOptions;
}

export type SafetyVerdict = 'safe' | 'unsafe_invariant' | 'unsafe_runtime' | 'unsafe_validation' | 'timeout';

export interface SandboxTestResult {
  /** Overall safety determination. */
  safe: boolean;

  /** Specific verdict category. */
  verdict: SafetyVerdict;

  /** The effect result from the interpreter (null if validation failed before execution). */
  effectResult: EffectResult | null;

  /** Validation pipeline result (null if skipped). */
  validationResult: ValidationResult | null;

  /** Invariant violations encountered (empty if none). */
  invariantErrors: string[];

  /** Number of ticks actually simulated. */
  ticksRun: number;

  /** Wall-clock time for the test (ms). */
  executionTimeMs: number;

  /** Whether this result was served from cache. */
  cached: boolean;
}

// ---------------------------------------------------------------------------
// Hash utility
// ---------------------------------------------------------------------------

/**
 * Deterministic hash of an EffectExpression for cache keying.
 * Uses JSON.stringify with sorted keys for stability.
 */
function hashEffect(effect: EffectExpression): string {
  const json = JSON.stringify(effect, Object.keys(effect).sort());
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) - hash + json.charCodeAt(i)) | 0;
  }
  return `fx_${(hash >>> 0).toString(36)}`;
}

// ---------------------------------------------------------------------------
// LLMEffectSandbox
// ---------------------------------------------------------------------------

/** Type of the multiverseCoordinator singleton. */
type CoordinatorType = typeof multiverseCoordinator;

export class LLMEffectSandbox {
  /** LRU cache: effect hash → verdict */
  private readonly cache = new Map<string, SandboxTestResult>();

  /** Counter for unique fork IDs. */
  private forkCounter = 0;

  /**
   * @param coordinator - The MultiverseCoordinator instance to use for forking.
   *   Defaults to the global singleton from @ai-village/core.
   */
  constructor(private readonly coordinator: CoordinatorType = multiverseCoordinator) {}

  /**
   * Test an LLM-generated effect expression in a sandboxed fork.
   *
   * 1. Static validation (schema + security) via EffectValidationPipeline
   * 2. Fork the source universe
   * 3. Apply the effect to the forked world
   * 4. Run N ticks
   * 5. Validate invariants
   * 6. Discard sandbox fork
   * 7. Return verdict
   *
   * Results are cached by effect hash — identical effects return instantly.
   */
  async testEffect(
    effect: EffectExpression,
    options: SandboxTestOptions,
  ): Promise<SandboxTestResult> {
    const cacheKey = hashEffect(effect);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const startTime = performance.now();
    const tickCount = options.tickCount ?? DEFAULT_TICK_COUNT;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    // -----------------------------------------------------------------------
    // Stage 1: Static validation (cheap, no fork needed)
    // -----------------------------------------------------------------------
    const interpreter = new EffectInterpreter(options.interpreterOptions ?? {
      maxOperations: 500,
      maxDepth: 5,
      maxEntitiesAffected: 50,
      maxDamagePerEffect: 5000,
      maxSpawnsPerEffect: 10,
      maxChainDepth: 3,
      timeout: timeoutMs,
    });

    const pipeline = new EffectValidationPipeline(interpreter);
    const validationResult = pipeline.validate(effect);

    if (!validationResult.valid) {
      const result: SandboxTestResult = {
        safe: false,
        verdict: 'unsafe_validation',
        effectResult: null,
        validationResult,
        invariantErrors: [],
        ticksRun: 0,
        executionTimeMs: performance.now() - startTime,
        cached: false,
      };
      this.setCached(cacheKey, result);
      return result;
    }

    // -----------------------------------------------------------------------
    // Stage 2: Fork universe for sandbox testing
    // -----------------------------------------------------------------------
    const forkId = `${SANDBOX_PURPOSE}_${++this.forkCounter}_${Date.now()}`;
    let fork: UniverseInstance;
    try {
      fork = await this.coordinator.forkUniverse(
        options.sourceUniverseId,
        forkId,
        `LLM Sandbox Test #${this.forkCounter}`,
        { timeScale: 1 },
      );
    } catch (err) {
      const result: SandboxTestResult = {
        safe: false,
        verdict: 'unsafe_runtime',
        effectResult: null,
        validationResult,
        invariantErrors: [`Fork creation failed: ${err instanceof Error ? err.message : String(err)}`],
        ticksRun: 0,
        executionTimeMs: performance.now() - startTime,
        cached: false,
      };
      // Don't cache fork failures — they're transient
      return result;
    }

    // -----------------------------------------------------------------------
    // Stage 3: Execute effect in forked world
    // -----------------------------------------------------------------------
    let effectResult: EffectResult | null = null;
    let ticksRun = 0;
    const invariantErrors: string[] = [];

    try {
      const world = fork.world;

      // Resolve caster and target entities in the forked world
      const caster = world.entities.get(options.casterEntityId);
      const target = world.entities.get(options.targetEntityId);

      if (!caster) {
        invariantErrors.push(`Caster entity ${options.casterEntityId} not found in forked universe`);
      }
      if (!target) {
        invariantErrors.push(`Target entity ${options.targetEntityId} not found in forked universe`);
      }

      if (caster && target) {
        const context: EffectContext = {
          caster,
          target,
          world: world as World,
          tick: Number(fork.universeTick),
        };

        // Apply the effect
        effectResult = interpreter.execute(effect, context);

        if (!effectResult.success) {
          invariantErrors.push(effectResult.error ?? 'Effect execution failed');
        } else {
          // -----------------------------------------------------------------
          // Stage 4: Run simulation ticks with timeout
          // -----------------------------------------------------------------
          const deadline = startTime + timeoutMs;

          for (let i = 0; i < tickCount; i++) {
            if (performance.now() > deadline) {
              invariantErrors.push(`Timed out after ${i} ticks (limit: ${timeoutMs}ms)`);
              break;
            }

            try {
              (world as WorldMutator).advanceTick();
              ticksRun++;
            } catch (tickErr) {
              invariantErrors.push(
                `Tick ${i} crashed: ${tickErr instanceof Error ? tickErr.message : String(tickErr)}`
              );
              break;
            }
          }

          // -----------------------------------------------------------------
          // Stage 5: Validate world invariants after simulation
          // -----------------------------------------------------------------
          try {
            validateWorldState(world as World);
          } catch (err) {
            if (err instanceof InvariantViolationError) {
              invariantErrors.push(err.message);
            } else {
              invariantErrors.push(`Invariant check error: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }
      }
    } catch (err) {
      // Catch-all for unexpected errors during sandbox execution
      invariantErrors.push(
        `Sandbox error: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      // -------------------------------------------------------------------
      // Stage 6: Always discard the sandbox fork
      // -------------------------------------------------------------------
      try {
        this.coordinator.unregisterUniverse(forkId);
      } catch {
        // Fork cleanup failure is non-fatal
      }
    }

    // -----------------------------------------------------------------------
    // Stage 7: Build verdict
    // -----------------------------------------------------------------------
    const safe = invariantErrors.length === 0 && (effectResult?.success ?? false);
    const verdict: SafetyVerdict = invariantErrors.length > 0
      ? 'unsafe_invariant'
      : safe
        ? 'safe'
        : 'unsafe_runtime';

    const result: SandboxTestResult = {
      safe,
      verdict,
      effectResult,
      validationResult,
      invariantErrors,
      ticksRun,
      executionTimeMs: performance.now() - startTime,
      cached: false,
    };

    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * Check if an effect has been previously tested without re-running the sandbox.
   */
  getCachedVerdict(effect: EffectExpression): SandboxTestResult | undefined {
    return this.cache.get(hashEffect(effect));
  }

  /**
   * Clear the verdict cache. Useful when the world state has changed
   * significantly and previous verdicts may no longer be valid.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /** Number of cached verdicts. */
  get cacheSize(): number {
    return this.cache.size;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** LRU-style cache set with eviction. */
  private setCached(key: string, result: SandboxTestResult): void {
    // Evict oldest entries if over capacity
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, result);
  }
}
