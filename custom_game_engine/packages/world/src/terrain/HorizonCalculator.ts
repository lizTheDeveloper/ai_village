/**
 * Horizon visibility calculator accounting for planetary curvature.
 *
 * Implements line-of-sight calculations that consider:
 * - Planetary curvature (objects beyond horizon are hidden)
 * - Elevated objects visible from greater distances
 * - Height-based "ring" system for visibility distance
 *
 * Physics: On a sphere of radius R, an observer at height h1 can see
 * to a horizon distance d = sqrt(2*R*h1). If the target is at height h2,
 * the total visible distance is sqrt(2*R*h1) + sqrt(2*R*h2).
 */

export interface PlanetParameters {
  /**
   * Planet radius in tiles.
   * With 1 tile = 1 meter scale (humans are 2 tiles tall):
   * - Earth radius: 6,371 km = 6,371,000 tiles
   * - Moon radius: 1,737 km = 1,737,000 tiles
   */
  radius: number;

  /** Planet name for debugging */
  name?: string;
}

/**
 * Pre-configured planet parameters for different world sizes.
 * All values in tiles where 1 tile = 1 meter.
 */
export const PLANET_PRESETS: Record<string, PlanetParameters> = {
  /** Earth-like planet (realistic curvature) */
  earth: {
    radius: 6_371_000, // 6,371 km radius = 6.371 million tiles
    name: 'Earth',
  },

  /** Earth's moon */
  moon: {
    radius: 1_737_000, // 1,737 km radius
    name: 'Moon',
  },

  /** Mars-like planet */
  mars: {
    radius: 3_390_000, // 3,390 km radius
    name: 'Mars',
  },

  /** Small fantasy world (more dramatic curvature, closer horizon) */
  small_world: {
    radius: 500_000, // 500 km radius - small asteroid/fantasy world
    name: 'Small World',
  },

  /** Tiny planetoid (very close horizon, can see curvature) */
  planetoid: {
    radius: 50_000, // 50 km radius - small asteroid
    name: 'Planetoid',
  },

  /** Huge super-earth (almost flat horizon) */
  super_earth: {
    radius: 12_000_000, // 12,000 km radius - double Earth
    name: 'Super Earth',
  },

  /** Gas giant moon (like Titan) */
  titan: {
    radius: 2_575_000, // 2,575 km radius
    name: 'Titan',
  },

  /** Flat world (no curvature, infinite plane) */
  flat: {
    radius: Infinity,
    name: 'Flat World',
  },
};

export class HorizonCalculator {
  private planet: PlanetParameters;

  constructor(planet?: PlanetParameters) {
    this.planet = planet || PLANET_PRESETS.earth as PlanetParameters;
  }

  /**
   * Calculate horizon distance for an observer at given height.
   *
   * Formula: d = sqrt(2 * R * h)
   * where R = planet radius, h = height above surface
   *
   * @param observerHeight Height of observer in tiles (elevation)
   * @returns Distance to horizon in tiles
   */
  getHorizonDistance(observerHeight: number): number {
    if (this.planet.radius === Infinity) {
      return Infinity; // Flat world, no horizon limit
    }

    // Add 1 to height to account for eye-level (observer not at ground)
    const effectiveHeight = Math.max(0, observerHeight + 1);

    // d = sqrt(2 * R * h)
    return Math.sqrt(2 * this.planet.radius * effectiveHeight);
  }

  /**
   * Check if target is visible from observer position considering curvature.
   *
   * Returns visibility info including:
   * - whether target is visible
   * - effective visibility distance (accounting for heights)
   * - how many "rings" the height advantage provides
   *
   * @param observerHeight Observer elevation in tiles
   * @param targetHeight Target elevation in tiles
   * @param distance 2D horizontal distance between observer and target
   */
  isVisible(
    observerHeight: number,
    targetHeight: number,
    distance: number
  ): {
    visible: boolean;
    maxVisibleDistance: number;
    heightAdvantageRings: number;
    fadeFactor: number; // 0.0 = at horizon/invisible, 1.0 = clearly visible
  } {
    // Calculate horizon distances for both observer and target
    const observerHorizon = this.getHorizonDistance(observerHeight);
    const targetHorizon = this.getHorizonDistance(targetHeight);

    // Maximum visible distance is sum of both horizon distances
    // (observer can see to their horizon, target rises above their horizon)
    const maxVisibleDistance = observerHorizon + targetHorizon;

    // Calculate height advantage "rings"
    // Each tile of height above observer's horizon counts as one "ring closer"
    const heightDifference = targetHeight - observerHeight;
    const heightAdvantageRings = Math.max(0, heightDifference);

    // Effective distance accounting for height advantage
    // For each ring of height, reduce effective distance by ring size
    const ringSize = Math.min(50, this.planet.radius / 100); // ~50 tiles per ring, scaled to planet
    const effectiveDistance = distance - (heightAdvantageRings * ringSize);

    // Visible if effective distance is within max visible distance
    const visible = effectiveDistance <= maxVisibleDistance;

    // Calculate fade factor (1.0 = close, 0.0 = at horizon)
    // Objects fade as they approach the horizon
    let fadeFactor = 1.0;
    if (visible && maxVisibleDistance > 0) {
      // Linear fade from full visibility to 0 at horizon
      fadeFactor = Math.max(0, 1 - (effectiveDistance / maxVisibleDistance));

      // Sharpen the fade curve - objects stay clear longer, then fade quickly
      fadeFactor = Math.pow(fadeFactor, 0.5); // Square root for gentler fade
    } else {
      fadeFactor = 0;
    }

    return {
      visible,
      maxVisibleDistance,
      heightAdvantageRings,
      fadeFactor,
    };
  }

  /**
   * Get the visual fade/fog amount for rendering.
   * Combines distance fog with horizon curvature.
   *
   * @param observerHeight Observer's elevation
   * @param targetHeight Target's elevation
   * @param distance Horizontal distance to target
   * @param maxRenderDistance Maximum render distance before full fog (e.g., 100 tiles)
   * @returns Fade factor from 0.0 (invisible/full fog) to 1.0 (fully visible/no fog)
   */
  getFogFade(
    observerHeight: number,
    targetHeight: number,
    distance: number,
    maxRenderDistance: number = 100
  ): number {
    const visibility = this.isVisible(observerHeight, targetHeight, distance);

    if (!visibility.visible) {
      return 0; // Beyond horizon, fully fogged
    }

    // Combine horizon fade with distance fog
    const distanceFade = Math.max(0, 1 - (distance / maxRenderDistance));

    // Use the minimum of both fades (most restrictive)
    return Math.min(visibility.fadeFactor, distanceFade);
  }

  /**
   * Calculate how much taller a target needs to be to be visible at given distance.
   * Useful for determining minimum mountain/tower height to be seen from far away.
   *
   * @param observerHeight Observer's elevation
   * @param distance Distance to target
   * @returns Minimum target height to be visible, or Infinity if impossible
   */
  getMinimumVisibleHeight(observerHeight: number, distance: number): number {
    if (this.planet.radius === Infinity) {
      return 0; // Flat world, everything visible
    }

    const observerHorizon = this.getHorizonDistance(observerHeight);

    if (distance <= observerHorizon) {
      return 0; // Within observer's horizon, ground level visible
    }

    // Need target to rise above its own horizon to be seen
    // d_target = sqrt(2 * R * h_target)
    // Solve for h_target: h_target = (d_target^2) / (2 * R)
    const requiredTargetHorizon = distance - observerHorizon;
    const requiredHeight = (requiredTargetHorizon * requiredTargetHorizon) / (2 * this.planet.radius);

    return Math.ceil(requiredHeight);
  }

  /**
   * Change the active planet parameters.
   */
  setPlanet(planet: PlanetParameters): void {
    this.planet = planet;
  }

  /**
   * Get current planet parameters.
   */
  getPlanet(): PlanetParameters {
    return this.planet;
  }
}

/**
 * Global horizon calculator instance.
 * Default to Earth-like planet, can be changed with setPlanet().
 */
export const globalHorizonCalculator = new HorizonCalculator(PLANET_PRESETS.earth!);
