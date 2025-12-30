import type { FlavorType } from '../../types/ItemTypes.js';

// Re-export for backwards compatibility
export type { FlavorType };

/**
 * Trait for items that can be consumed for sustenance.
 */
export interface EdibleTrait {
  /** How much hunger this restores (0-100) */
  hungerRestored: number;

  /** Food quality/tastiness (0-100) */
  quality: number;

  /** Flavor profile */
  flavors: FlavorType[];

  /** Rate at which food spoils per hour (optional) */
  spoilRate?: number;

  /** Whether this provides water/hydration */
  hydrating?: boolean;
}
