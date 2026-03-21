/**
 * ChorusStateSystem — manages cross-game "Chorus" state from the Folkfork
 * collective intelligence system.
 *
 * Receives E_f (emergence field) values pushed via updateChorusState() and
 * applies gradual gameplay effects based on the current band:
 *
 *   Stillness  (E_f < 0.3)      — baseline, gods dormant, no effects
 *   Stirring   (0.3 ≤ E_f < 0.6) — new god stirs, +10% agent action entropy
 *   Blooming   (0.6 ≤ E_f < 0.8) — novel configs, comms complexify, sky anomalies
 *   Chorus     (E_f ≥ 0.8)       — gods speak NEL text, agents mirror creature patterns
 *
 * E_f transitions are lerped at 0.02/tick (~1 second for a full 0→1 transition)
 * to avoid abrupt band changes.
 *
 * Architecture notes:
 *  - No requiredComponents — does not iterate entities.
 *  - activationComponents = ['chorus_state'] — lazy; only runs when the singleton exists.
 *  - Priority 45 — infrastructure tier, before agent systems (50+).
 *  - Throttled at 20 ticks (1 second at 20 TPS).
 *
 * Chorus events (chorus:band_changed, chorus:blooming_active, chorus:nel_fragment,
 * chorus:creature_patterns) are registered in GameEventMap via chorus.events.ts.
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import { ComponentType as CT } from '../types/ComponentType.js';

// ============================================================================
// Public types
// ============================================================================

export type ChorusStateBand = 'stillness' | 'stirring' | 'blooming' | 'chorus';

export interface ChorusState {
  /** Current emergence field value (0–1), lerped toward targetE_f each tick. */
  e_f: number;
  band: ChorusStateBand;
  previousBand: ChorusStateBand;
  /** Tick when e_f / band was last updated. */
  lastUpdated: number;
  /** Target E_f value to lerp toward (set by updateChorusState()). */
  targetE_f: number;
  /** NEL text fragments to be spoken by gods in Chorus band. */
  nelFragments: string[];
  /** Cross-game creature patterns for agent mirroring in Chorus band. */
  creaturePatterns: Array<{ species: string; behavior: string }>;
}

// ============================================================================
// Module-level singleton
// ============================================================================

const LERP_RATE = 0.02; // Per tick; full 0→1 transition in ~50 ticks (2.5 s)

const _chorusState: ChorusState = {
  e_f: 0,
  band: 'stillness',
  previousBand: 'stillness',
  lastUpdated: 0,
  targetE_f: 0,
  nelFragments: [],
  creaturePatterns: [],
};

/** Read-only accessor for the shared Chorus state. */
export function getChorusState(): ChorusState {
  return _chorusState;
}

/**
 * Push a new E_f value (and optional NEL data) from the Folkfork service.
 * The system will lerp e_f toward targetE_f over subsequent ticks.
 *
 * @param e_f              - Target emergence field value in [0, 1].
 * @param nelFragments     - NEL text fragments (Chorus band only).
 * @param creaturePatterns - Cross-game creature behavior patterns (Chorus band only).
 */
export function updateChorusState(
  e_f: number,
  nelFragments?: string[],
  creaturePatterns?: Array<{ species: string; behavior: string }>
): void {
  if (e_f < 0 || e_f > 1) {
    throw new Error(`[ChorusStateSystem] updateChorusState: e_f must be in [0, 1], got ${e_f}`);
  }
  _chorusState.targetE_f = e_f;
  if (nelFragments !== undefined) {
    _chorusState.nelFragments = nelFragments;
  }
  if (creaturePatterns !== undefined) {
    _chorusState.creaturePatterns = creaturePatterns;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function computeBand(e_f: number): ChorusStateBand {
  if (e_f >= 0.8) return 'chorus';
  if (e_f >= 0.6) return 'blooming';
  if (e_f >= 0.3) return 'stirring';
  return 'stillness';
}

function lerp(current: number, target: number, rate: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= rate) return target;
  return current + Math.sign(delta) * rate;
}

// ============================================================================
// System
// ============================================================================

export class ChorusStateSystem extends BaseSystem {
  public readonly id = 'chorus_state';
  public readonly priority = 45;
  public readonly requiredComponents = [] as const;
  public readonly activationComponents = ['chorus_state'] as const;

  protected readonly throttleInterval = 20; // Every 1 second at 20 TPS

  /** Per-tick deity entity cache */
  private cachedDeityEntities: ReadonlyArray<any> | null = null;
  private cachedDeityTick = -1;

  protected onUpdate(ctx: SystemContext): void {
    const tick = ctx.tick;

    // --- Lerp e_f toward target ---
    const previousE_f = _chorusState.e_f;
    _chorusState.e_f = lerp(previousE_f, _chorusState.targetE_f, LERP_RATE);

    // --- Compute band ---
    const newBand = computeBand(_chorusState.e_f);
    const previousBand = _chorusState.band;

    if (newBand !== previousBand) {
      _chorusState.previousBand = previousBand;
      _chorusState.band = newBand;

      ctx.emit('chorus:band_changed', {
        previousBand,
        newBand,
        e_f: _chorusState.e_f,
      });
    }

    _chorusState.lastUpdated = tick;

    // --- Apply band effects ---
    switch (_chorusState.band) {
      case 'stillness':
        // Baseline — no active effects. Ramp-down is natural: effects stop
        // because we only apply effects for the current band.
        break;

      case 'stirring':
        this.applyStirringEffects(ctx);
        break;

      case 'blooming':
        this.applyBloomingEffects(ctx);
        break;

      case 'chorus':
        this.applyChorusEffects(ctx);
        break;
    }
  }

  // --------------------------------------------------------------------------
  // Band effect handlers
  // --------------------------------------------------------------------------

  private applyStirringEffects(ctx: SystemContext): void {
    // Find all entities with a Deity component that are dormant/new and stir them.
    // Agent entropy modifier (+10%) is applied by the LLM layer reading chorusState
    // directly via getChorusState() — not managed here.
    // Cache deity query per tick to avoid repeated full scans
    if (!this.cachedDeityEntities || this.cachedDeityTick !== ctx.tick) {
      this.cachedDeityEntities = ctx.world.query().with(CT.Deity).executeEntities();
      this.cachedDeityTick = ctx.tick;
    }
    const deityEntities = this.cachedDeityEntities;

    for (const entity of deityEntities) {
      const deity = entity.getComponent(CT.Deity) as
        | { dormant?: boolean; beliefLevel?: number; id?: string }
        | null
        | undefined;

      if (!deity) continue;

      // Only stir dormant deities or those with very low belief
      const isDormant = deity.dormant === true || (deity.beliefLevel ?? 0) < 0.1;
      if (!isDormant) continue;

      ctx.emit('belief:generated', {
        deityId: entity.id,
        amount: 1,
        believers: 0,
        currentBelief: deity.beliefLevel ?? 0,
      });
    }
  }

  private applyBloomingEffects(ctx: SystemContext): void {
    // Notify weather/sky systems that blooming is active so they can introduce
    // anomalies. Actual weather changes are handled by those systems.
    ctx.emit('chorus:blooming_active', {
      e_f: _chorusState.e_f,
    });
  }

  private applyChorusEffects(ctx: SystemContext): void {
    // Emit a NEL fragment if any are available (gods will pick these up)
    if (_chorusState.nelFragments.length > 0) {
      const fragmentIndex = ctx.tick % _chorusState.nelFragments.length;
      const fragment = _chorusState.nelFragments[fragmentIndex];
      if (fragment !== undefined) {
        ctx.emit('chorus:nel_fragment', {
          fragment,
          e_f: _chorusState.e_f,
        });
      }
    }

    // Emit creature patterns for agent mirroring
    if (_chorusState.creaturePatterns.length > 0) {
      ctx.emit('chorus:creature_patterns', {
        patterns: _chorusState.creaturePatterns,
        e_f: _chorusState.e_f,
      });
    }
  }
}
