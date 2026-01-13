import type { Component } from '../ecs/Component.js';

/**
 * BurningComponent - Represents an entity that is currently on fire
 *
 * Fire causes damage over time and can spread to nearby flammable entities.
 * Integrates with StateMutatorSystem for gradual health loss.
 */
export interface BurningComponent extends Component {
  readonly type: 'burning';
  readonly version: 1;

  /** Burn intensity (0-100, affects damage rate and spread chance) */
  intensity: number;

  /** Ticks remaining until fire burns out naturally */
  durationRemaining: number;

  /** Game tick when entity was ignited */
  ignitedAt: number;

  /** Source of the fire */
  source: 'spell' | 'spread' | 'breath' | 'other';

  /** Whether entity is actively trying to extinguish (e.g., rolling, water) */
  extinguishing: boolean;

  /** Damage dealt per game minute (registered with StateMutatorSystem) */
  damagePerMinute: number;
}

const VALID_SOURCES = ['spell', 'spread', 'breath', 'other'];

export function createBurningComponent(data: {
  intensity: number;
  durationRemaining: number;
  ignitedAt: number;
  source: BurningComponent['source'];
  extinguishing?: boolean;
  damagePerMinute?: number;
}): BurningComponent {
  if (typeof data.intensity !== 'number' || data.intensity < 0 || data.intensity > 100) {
    throw new Error(`Burning intensity must be 0-100, got: ${data.intensity}`);
  }
  if (typeof data.durationRemaining !== 'number' || data.durationRemaining < 0) {
    throw new Error(`Burning duration must be >= 0, got: ${data.durationRemaining}`);
  }
  if (typeof data.ignitedAt !== 'number' || data.ignitedAt < 0) {
    throw new Error(`Ignited tick must be >= 0, got: ${data.ignitedAt}`);
  }
  if (!data.source) {
    throw new Error('Burning source is required');
  }
  if (!VALID_SOURCES.includes(data.source)) {
    throw new Error(`Invalid burning source: ${data.source}`);
  }

  // Calculate default damage based on intensity (higher intensity = more damage)
  const defaultDamage = (data.intensity / 100) * 20; // Max 20% health loss per minute at 100 intensity

  return {
    type: 'burning',
    version: 1,
    intensity: data.intensity,
    durationRemaining: data.durationRemaining,
    ignitedAt: data.ignitedAt,
    source: data.source,
    extinguishing: data.extinguishing || false,
    damagePerMinute: data.damagePerMinute !== undefined ? data.damagePerMinute : defaultDamage,
  };
}
