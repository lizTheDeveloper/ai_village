import type { Component } from '../ecs/Component.js';

/**
 * CognitionZoneComponent — Assigns a Zones of Thought cognition tier to a spatial entity.
 *
 * Attached to planet entities. The LLMScheduler reads this to route LLM requests:
 * - unthinking_depths: NN-only (no LLM)
 * - slow_zone: Browser LLM (Talker only, 1.5B model)
 * - beyond: Standard cloud LLM (default)
 * - transcend: Premium cloud LLM (faster cooldowns)
 *
 * Inspired by Vernor Vinge's "Zones of Thought" — distance from galactic core
 * determines computational capability.
 */
export type CognitionZone = 'unthinking_depths' | 'slow_zone' | 'beyond' | 'transcend';

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
 * Homeworld and earth-like = 'beyond' (standard cloud).
 * Crystal/exotic moons = 'slow_zone' (browser LLM).
 * Deep space/void = 'unthinking_depths' (NN only).
 * Core/divine/magical = 'transcend' (premium cloud).
 */
export const DEFAULT_PLANET_ZONES: Record<string, CognitionZone> = {
  'terrestrial': 'beyond',
  'desert': 'beyond',
  'ocean': 'beyond',
  'tundra': 'beyond',
  'crystal': 'slow_zone',
  'volcanic': 'slow_zone',
  'fungal': 'slow_zone',
  'void': 'unthinking_depths',
  'gas_giant': 'unthinking_depths',
  'divine': 'transcend',
  'magical': 'transcend',
};

/**
 * Get the default cognition zone for a planet type.
 * Falls back to 'beyond' (standard cloud) for unknown types.
 */
export function getDefaultZoneForPlanet(planetType: string): CognitionZone {
  return DEFAULT_PLANET_ZONES[planetType] ?? 'beyond';
}
