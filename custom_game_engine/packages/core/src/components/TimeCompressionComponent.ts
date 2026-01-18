/**
 * TimeCompressionComponent - Tracks time compression state for grand strategy
 *
 * Manages elastic time scaling across cosmic scales:
 * - Real-time (1x-10x): Full ECS simulation
 * - Fast-forward (100x-100000x): Statistical simulation
 * - Time jumps: Instant skip to target tick via trajectory generation
 *
 * Time scale limits vary by zoom tier (chunk to galaxy).
 * See openspec/specs/grand-strategy/03-TIME-SCALING.md for full details.
 */

import type { Tick } from '../types.js';

export interface TimeCompressionComponent {
  type: 'time_compression';
  version: number;

  /** Current time scale multiplier (1 = real-time, 10 = 10x, 100 = 100x, etc.) */
  currentTimeScale: number;

  /** Maximum allowed time scale for current zoom tier */
  maxTimeScale: number;

  /** Whether time is paused */
  isPaused: boolean;

  /** Target tick for time jump (null = no jump in progress) */
  targetTick: Tick | null;

  /** Era (century count) at simulation start */
  eraAtStart: number;

  /** Current era (century count since start) */
  currentEra: number;

  /** Current zoom tier for time scale limits */
  currentTier: 'chunk' | 'zone' | 'region' | 'planet' | 'system' | 'sector' | 'galaxy';

  /** Time jump in progress */
  jumpInProgress: boolean;

  /** Statistical simulation mode active (for tiers beyond ECS capability) */
  statisticalMode: boolean;
}

/**
 * Time scale limits by tier (from TIME-SCALING spec)
 */
export const TIME_SCALE_LIMITS: Record<string, number> = {
  chunk: 10,      // Max 10x
  zone: 10,       // Max 10x
  region: 100,    // Max 100x
  planet: 1000,   // Max 1000x
  system: 10000,  // Max 10000x
  sector: 100000, // Max 100000x
  galaxy: 100000, // Max 100000x
};

/**
 * Create a time compression component with default values
 */
export function createTimeCompressionComponent(
  initialTier: 'chunk' | 'zone' | 'region' | 'planet' | 'system' | 'sector' | 'galaxy' = 'chunk'
): TimeCompressionComponent {
  return {
    type: 'time_compression',
    version: 1,
    currentTimeScale: 1,
    maxTimeScale: TIME_SCALE_LIMITS[initialTier] || 10,
    isPaused: false,
    targetTick: null,
    eraAtStart: 0,
    currentEra: 0,
    currentTier: initialTier,
    jumpInProgress: false,
    statisticalMode: false,
  };
}
