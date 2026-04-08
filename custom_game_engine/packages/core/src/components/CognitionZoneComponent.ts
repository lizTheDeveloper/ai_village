import type { Component } from '../ecs/Component.js';

/**
 * CognitionZoneComponent — Assigns a cognition strata tier to a spatial entity.
 *
 * Attached to planet entities. The LLMScheduler reads this to route LLM requests:
 * - unthinking_depths: NN-only (no LLM)
 * - dampened_zone: Browser LLM (Talker only, 1.5B model)
 * - open_field: Standard cloud LLM (default)
 * - harmonic_peak: Premium cloud LLM (faster cooldowns)
 *
 * Cognition Strata — ambient Chorus signal density determines computational
 * capability based on distance from galactic core.
 */
export type CognitionZone = 'unthinking_depths' | 'dampened_zone' | 'open_field' | 'harmonic_peak';

export interface CognitionZoneComponent extends Component {
  type: 'cognition_zone';
  zone: CognitionZone;
}

/**
 * Create a cognition zone component for a planet entity.
 */
export function createCognitionZoneComponent(zone: CognitionZone): CognitionZoneComponent {
  return {
    type: 'cognition_zone',
    version: 1,
    zone,
  };
}

/**
 * Map planet types to default cognition zones.
 * Homeworld and earth-like = 'open_field' (standard cloud).
 * Crystal/exotic moons = 'dampened_zone' (browser LLM).
 * Deep space/void = 'unthinking_depths' (NN only).
 * Core/divine/magical = 'harmonic_peak' (premium cloud).
 */
export const DEFAULT_PLANET_ZONES: Record<string, CognitionZone> = {
  'terrestrial': 'open_field',
  'desert': 'open_field',
  'ocean': 'open_field',
  'tundra': 'open_field',
  'crystal': 'dampened_zone',
  'volcanic': 'dampened_zone',
  'fungal': 'dampened_zone',
  'void': 'unthinking_depths',
  'gas_giant': 'unthinking_depths',
  'divine': 'harmonic_peak',
  'magical': 'harmonic_peak',
};

/**
 * Get the default cognition zone for a planet type.
 * Falls back to 'open_field' (standard cloud) for unknown types.
 */
export function getDefaultZoneForPlanet(planetType: string): CognitionZone {
  return DEFAULT_PLANET_ZONES[planetType] ?? 'open_field';
}
