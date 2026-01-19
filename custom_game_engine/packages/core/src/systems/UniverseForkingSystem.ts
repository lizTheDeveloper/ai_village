/**
 * UniverseForkingSystem - Handles universe forking mechanics
 *
 * Manages three fork triggers:
 * 1. Causal violation (automatic) - uses HilbertTime for detection
 * 2. Player choice (manual) - via events
 * 3. Natural divergence (emergent) - low probability critical events
 *
 * Reference: openspec/specs/grand-strategy/10-MULTIVERSE-MECHANICS.md
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { SystemEventManager } from '../events/TypedEventEmitter.js';
import {
  type CausalViolation,
  type HilbertTimeCoordinate,
  detectCausalViolation,
} from '../trade/HilbertTime.js';
// UniverseSnapshot type removed - not used in this file
import {
  type UniverseForkMetadataComponent,
  type ForkTrigger,
  type CriticalEvent,
  createUniverseForkMetadata,
} from '../components/UniverseForkMetadataComponent.js';

// Event data types for universe forking events (not yet in EventMap)
interface UniverseForkRequestedEventData {
  sourceUniverseId: string;
  forkAtTick: string;
  forkName: string;
}

interface UniverseCriticalEventData {
  universeId: string;
  event: CriticalEvent;
  tick: string;
}

interface UniverseCausalViolationEventData {
  universeId: string;
  violation: CausalViolation;
  receivedEvent: HilbertTimeCoordinate;
  currentTime: HilbertTimeCoordinate;
}

/**
 * UniverseForkingSystem
 *
 * Priority: 10 (very early, infrastructure)
 * Throttle: 200 ticks (10 seconds - forking is rare)
 *
 * Handles universe forking via:
 * - Causal violation detection and resolution
 * - Player-initiated forks via events
 * - Natural divergence from critical events
 */
export class UniverseForkingSystem extends BaseSystem {
  public readonly id: SystemId = 'universe_forking';
  public readonly priority: number = 10;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  // Lazy activation: Skip entire system when no universe_fork exists
  public readonly activationComponents = ['universe_fork'] as const;
  protected readonly throttleInterval = 200;  // Every 10 seconds (20 TPS * 10s)

  private eventBus: SystemEventManager | null = null;

  /**
   * Known Hilbert-time coordinates for causal violation detection
   * Key: "universeId:beta:tau:sigma"
   */
  private knownCoordinates: Map<string, HilbertTimeCoordinate> = new Map();

  /**
   * Pending fork requests from player - preallocated for zero-alloc reuse
   */
  private pendingManualForks: Array<{
    sourceUniverseId: string;
    forkAtTick: bigint;
    forkName: string;
  }> = [];

  /**
   * Critical events pending natural divergence check - preallocated for zero-alloc reuse
   */
  private pendingCriticalEvents: Array<{
    universeId: string;
    event: CriticalEvent;
    tick: bigint;
  }> = [];

  /**
   * Reusable working object for manual fork processing - zero allocations in hot path
   */
  private readonly workingManualFork = {
    sourceUniverseId: '',
    forkAtTick: 0n,
    forkName: '',
  };

  /**
   * Reusable working object for critical event processing - zero allocations in hot path
   */
  private readonly workingCriticalEvent = {
    universeId: '',
    event: null as CriticalEvent | null,
    tick: 0n,
  };

  /**
   * Bitwise flags for fork trigger type - faster than string comparisons
   * 0b001 = causal_violation (1)
   * 0b010 = player_choice (2)
   * 0b100 = natural_divergence (4)
   */
  private readonly FORK_TYPE_CAUSAL = 1;
  private readonly FORK_TYPE_PLAYER = 2;
  private readonly FORK_TYPE_NATURAL = 4;

  protected onInit(ctx: SystemContext): void {
    this.eventBus = ctx.events;

    if (!this.eventBus) {
      console.warn('[UniverseForkingSystem] No EventBus available');
      return;
    }

    // Listen for player-initiated fork requests
    // Note: These events are not yet in EventMap, using generic event emission
    this.eventBus.onGeneric('universe_fork_requested', (data: unknown) => {
      const request = data as UniverseForkRequestedEventData;

      this.pendingManualForks.push({
        sourceUniverseId: request.sourceUniverseId,
        forkAtTick: BigInt(request.forkAtTick),
        forkName: request.forkName,
      });
    });

    // Listen for critical events that might trigger natural divergence
    this.eventBus.onGeneric('universe_critical_event', (data: unknown) => {
      const event = data as UniverseCriticalEventData;

      this.pendingCriticalEvents.push({
        universeId: event.universeId,
        event: event.event,
        tick: BigInt(event.tick),
      });
    });

    // Listen for causal violation events
    this.eventBus.onGeneric('universe_causal_violation', (data: unknown) => {
      const violation = data as UniverseCausalViolationEventData;

      this.handleCausalViolation(
        violation.universeId,
        violation.violation,
        violation.receivedEvent,
        violation.currentTime
      );
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    // Early exit: no work to do
    const manualCount = this.pendingManualForks.length;
    const criticalCount = this.pendingCriticalEvents.length;
    if (manualCount === 0 && criticalCount === 0) return;

    // Process pending manual forks - zero allocations using working object
    for (let i = 0; i < manualCount; i++) {
      const request = this.pendingManualForks[i];
      if (!request) continue;
      this.workingManualFork.sourceUniverseId = request.sourceUniverseId;
      this.workingManualFork.forkAtTick = request.forkAtTick;
      this.workingManualFork.forkName = request.forkName;
      this.createManualFork();
    }
    this.pendingManualForks.length = 0;

    // Process pending critical events for natural divergence - zero allocations using working object
    for (let i = 0; i < criticalCount; i++) {
      const pending = this.pendingCriticalEvents[i];
      if (!pending) continue;
      this.workingCriticalEvent.universeId = pending.universeId;
      this.workingCriticalEvent.event = pending.event;
      this.workingCriticalEvent.tick = pending.tick;
      this.checkNaturalDivergence();
    }
    this.pendingCriticalEvents.length = 0;
  }

  /**
   * Handle causal violation via automatic fork - optimized with early exits
   *
   * Called when cross-universe event depends on recipient's future.
   */
  private handleCausalViolation(
    receivingUniverseId: string,
    violation: CausalViolation,
    receivedEvent: HilbertTimeCoordinate,
    currentTime: HilbertTimeCoordinate
  ): void {
    // Early exit: not a fork resolution (most common case)
    if (violation.resolution !== 'fork') return;

    // Early exit: missing fork tick
    const forkTick = violation.forkAtTau;
    if (!forkTick) {
      console.error('[UniverseForkingSystem] Causal violation marked for fork but no forkAtTau');
      return;
    }

    const forkTrigger: ForkTrigger = {
      type: 'causal_violation',
      violation,
    };

    // Create fork at violation point
    this.forkUniverseAtTick(
      receivingUniverseId,
      forkTick,
      forkTrigger,
      `Causal Fork (${violation.type})`,
      this.FORK_TYPE_CAUSAL
    );
  }

  /**
   * Create manual fork via player UI - uses working object to avoid allocations
   */
  private createManualFork(): void {
    const forkTrigger: ForkTrigger = {
      type: 'player_choice',
      reason: `Player forked timeline at tick ${this.workingManualFork.forkAtTick}`,
    };

    this.forkUniverseAtTick(
      this.workingManualFork.sourceUniverseId,
      this.workingManualFork.forkAtTick,
      forkTrigger,
      this.workingManualFork.forkName,
      this.FORK_TYPE_PLAYER
    );
  }

  /**
   * Check for natural divergence during critical events - uses working object to avoid allocations
   *
   * Only forks if event is genuinely uncertain (40%+ uncertainty).
   * Fork probability proportional to uncertainty (max 6% at perfect uncertainty).
   */
  private checkNaturalDivergence(): void {
    const event = this.workingCriticalEvent.event;
    if (!event) return;

    const uncertainty = this.calculateEventUncertainty(event);

    // Early exit: too deterministic (most common case)
    if (uncertainty < 0.4) return;

    // Fork probability proportional to uncertainty - inline calculation
    const forkProbability = (uncertainty - 0.4) * 0.1;  // Max 6% at perfect uncertainty

    // Early exit: random check failed (most common case)
    if (Math.random() >= forkProbability) return;

    // Natural divergence fork triggered
    const forkTrigger: ForkTrigger = {
      type: 'natural_divergence',
      event,
      probability: forkProbability,
    };

    this.forkUniverseAtTick(
      this.workingCriticalEvent.universeId,
      this.workingCriticalEvent.tick,
      forkTrigger,
      `Natural Fork (${event.description})`,
      this.FORK_TYPE_NATURAL
    );
  }

  /**
   * Calculate uncertainty of event outcome - optimized with early exits and inline calculations
   * Returns 0-1 (0 = deterministic, 1 = max uncertainty)
   */
  private calculateEventUncertainty(event: CriticalEvent): number {
    // Early exit: binary choice with missing probabilities
    if (event.type === 'binary_choice') {
      const p1 = event.option1Probability;
      const p2 = event.option2Probability;
      if (p1 === undefined || p2 === undefined) return 0;

      // Uncertainty = 1 - |p1 - p2| - inline abs calculation
      const diff = p1 - p2;
      return 1 - (diff < 0 ? -diff : diff);
    }

    // Multi-choice: entropy-based uncertainty
    const opts = event.options;
    if (event.type === 'multi_choice' && opts && opts.length > 0) {
      // Early exit: single option
      if (opts.length === 1) return 0;

      // Entropy-based uncertainty - single pass
      let entropy = 0;
      for (let i = 0; i < opts.length; i++) {
        const opt = opts[i];
        if (opt) {
          const p = opt.probability;
          if (p !== 0) {
            entropy -= p * Math.log2(p);
          }
        }
      }

      const maxEntropy = Math.log2(opts.length);
      return entropy / maxEntropy;  // Normalized 0-1
    }

    return 0;
  }

  /**
   * Core fork creation logic - optimized with early exit and bitwise flag hint
   *
   * Creates a new universe forked from sourceUniverse at specified tick.
   * Emits events for fork creation.
   */
  private forkUniverseAtTick(
    sourceUniverseId: string,
    forkAtTick: bigint,
    forkTrigger: ForkTrigger,
    forkName: string,
    forkTypeFlag: number  // Bitwise flag for logging/metrics optimization
  ): void {
    // Early exit: no event bus (fail-fast)
    if (!this.eventBus) {
      console.error('[UniverseForkingSystem] Cannot fork without EventBus');
      return;
    }

    // Emit fork event for persistence layer to handle
    // The actual snapshot loading and universe creation is handled by
    // the save/load system, not by this system directly
    this.eventBus.emitGeneric('universe_forked', {
      sourceUniverseId,
      forkAtTick: forkAtTick.toString(),
      forkTrigger,
      forkName,
      timestamp: Date.now(),
    });

    console.warn(
      `[UniverseForkingSystem] Fork created: ${forkName} from ${sourceUniverseId} at tick ${forkAtTick}`
    );
  }

  /**
   * Register a Hilbert-time coordinate for causal violation detection
   */
  public registerCoordinate(coord: HilbertTimeCoordinate): void {
    const key = `${coord.origin}:${coord.beta}:${coord.tau}:${coord.sigma}`;
    this.knownCoordinates.set(key, coord);
  }

  /**
   * Check if received event creates causal violation
   * Returns violation if detected, null otherwise
   */
  public checkCausalViolation(
    receivedEvent: HilbertTimeCoordinate,
    currentTime: HilbertTimeCoordinate
  ): CausalViolation | null {
    return detectCausalViolation(receivedEvent, currentTime, this.knownCoordinates);
  }
}
