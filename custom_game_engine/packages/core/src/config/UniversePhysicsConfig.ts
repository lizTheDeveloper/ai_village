/**
 * Universe Physics Configuration
 *
 * Defines spatial dimensions, planet geometry, and visibility rules for a universe.
 * This configuration determines how space behaves in the simulation.
 */

/**
 * Physics configuration for a universe.
 * Defines spatial dimensions, planet geometry, and visibility rules.
 */
export interface UniversePhysicsConfig {
  /**
   * Number of spatial dimensions (1-6).
   *
   * - 1D: Line world
   * - 2D: Flat top-down world
   * - 3D: Standard world with x, y, z
   * - 4D+: Hyperdimensional spaces
   */
  spatialDimensions: number;

  /**
   * Planet radius in tile units (for horizon calculation).
   *
   * - Use Infinity for flat worlds (no horizon)
   * - Earth-like: ~10000
   * - Moon: ~2000
   * - Gas giant: ~500000
   *
   * Affects how far agents can see based on curvature.
   */
  planetRadius: number;

  /**
   * Whether underground isolation is enabled.
   *
   * When true, entities at z < 0 cannot see entities at z >= 0 and vice versa.
   * This creates separate "underground" and "surface" layers.
   */
  undergroundIsolation: boolean;

  /**
   * Default visibility range per dimension [x, y, z?, w?, v?, u?].
   *
   * Length must match spatialDimensions.
   * Typical values:
   * - Horizontal (x, y): 15-20 tiles
   * - Vertical (z): 10 tiles
   * - Higher dimensions: 10 tiles
   */
  defaultVisibilityRange: number[];

  /**
   * Optional circumference per dimension for closed/toroidal topologies.
   *
   * When set, distances wrap around: d = min(|a-b|, circumference - |a-b|)
   * Use Infinity for flat/open dimensions (no wraparound).
   *
   * Length must match spatialDimensions if provided.
   *
   * @example
   * // 3D world: flat x/y, closed z (vertical loop like a cylinder)
   * dimensionCircumferences: [Infinity, Infinity, 1000]
   *
   * // 4D world: all dimensions are large tori
   * dimensionCircumferences: [50000, 50000, 10000, 10000]
   */
  dimensionCircumferences?: number[];
}

/**
 * Validate universe physics configuration.
 *
 * @throws {Error} If configuration is invalid
 */
export function validateUniversePhysicsConfig(config: UniversePhysicsConfig): void {
  if (config.spatialDimensions < 1 || config.spatialDimensions > 6) {
    throw new Error(`spatialDimensions must be 1-6, got ${config.spatialDimensions}`);
  }

  if (!Number.isFinite(config.planetRadius) && config.planetRadius !== Infinity) {
    throw new Error(`planetRadius must be a finite number or Infinity`);
  }

  if (Number.isFinite(config.planetRadius) && config.planetRadius <= 0) {
    throw new Error(`planetRadius must be positive or Infinity, got ${config.planetRadius}`);
  }

  if (config.defaultVisibilityRange.length !== config.spatialDimensions) {
    throw new Error(
      `defaultVisibilityRange length (${config.defaultVisibilityRange.length}) must match spatialDimensions (${config.spatialDimensions})`
    );
  }

  for (let i = 0; i < config.defaultVisibilityRange.length; i++) {
    const range = config.defaultVisibilityRange[i]!;
    if (range <= 0) {
      throw new Error(`defaultVisibilityRange[${i}] must be positive, got ${range}`);
    }
  }

  // Validate optional circumferences
  if (config.dimensionCircumferences !== undefined) {
    if (config.dimensionCircumferences.length !== config.spatialDimensions) {
      throw new Error(
        `dimensionCircumferences length (${config.dimensionCircumferences.length}) must match spatialDimensions (${config.spatialDimensions})`
      );
    }

    for (let i = 0; i < config.dimensionCircumferences.length; i++) {
      const circ = config.dimensionCircumferences[i]!;
      if (circ <= 0 && circ !== Infinity) {
        throw new Error(`dimensionCircumferences[${i}] must be positive or Infinity, got ${circ}`);
      }
    }
  }
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Standard 3D world with Earth-like planet.
 *
 * - Spherical planet with realistic horizons
 * - Underground isolation (caves separate from surface)
 * - Standard visibility ranges
 */
export const STANDARD_3D_CONFIG: UniversePhysicsConfig = {
  spatialDimensions: 3,
  planetRadius: 10000,
  undergroundIsolation: true,
  defaultVisibilityRange: [15, 15, 10],
};

/**
 * Flat 2D world (classic top-down).
 *
 * - No vertical dimension
 * - Infinite flat plane (no horizon)
 * - No underground isolation
 */
export const FLAT_2D_CONFIG: UniversePhysicsConfig = {
  spatialDimensions: 2,
  planetRadius: Infinity,
  undergroundIsolation: false,
  defaultVisibilityRange: [15, 15],
};

/**
 * Small moon-sized world.
 *
 * - Tight horizons (can see curvature)
 * - Underground isolation
 * - Standard visibility ranges
 */
export const SMALL_MOON_CONFIG: UniversePhysicsConfig = {
  spatialDimensions: 3,
  planetRadius: 2000,
  undergroundIsolation: true,
  defaultVisibilityRange: [15, 15, 10],
};

/**
 * Gas giant (huge horizons, no underground).
 *
 * - Extremely distant horizons
 * - No underground isolation (floating cities?)
 * - Extended visibility ranges
 */
export const GAS_GIANT_CONFIG: UniversePhysicsConfig = {
  spatialDimensions: 3,
  planetRadius: 500000,
  undergroundIsolation: false,
  defaultVisibilityRange: [20, 20, 50],
};

/**
 * 4D hyperdimensional space.
 *
 * - 4 spatial dimensions (x, y, z, w)
 * - Earth-like planet radius in 3D projection
 * - Underground isolation
 * - Equal visibility in all dimensions
 */
export const HYPERDIMENSIONAL_4D_CONFIG: UniversePhysicsConfig = {
  spatialDimensions: 4,
  planetRadius: 10000,
  undergroundIsolation: true,
  defaultVisibilityRange: [15, 15, 10, 10],
};

/**
 * 6D maximum dimensional space.
 *
 * - 6 spatial dimensions (x, y, z, w, v, u)
 * - Large planet radius for stability
 * - Underground isolation
 * - Equal visibility in all dimensions
 */
export const HYPERDIMENSIONAL_6D_CONFIG: UniversePhysicsConfig = {
  spatialDimensions: 6,
  planetRadius: 50000,
  undergroundIsolation: true,
  defaultVisibilityRange: [15, 15, 10, 10, 10, 10],
};

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a custom universe physics configuration with validation.
 *
 * Applies sensible defaults and validates the result.
 *
 * @param options - Partial configuration (spatialDimensions required)
 * @returns Validated physics configuration
 * @throws {Error} If configuration is invalid
 *
 * @example
 * ```typescript
 * // Create 5D world
 * const config = createUniversePhysicsConfig({
 *   spatialDimensions: 5,
 *   planetRadius: 20000,
 * });
 *
 * // Create flat 3D world (no horizon)
 * const flatConfig = createUniversePhysicsConfig({
 *   spatialDimensions: 3,
 *   planetRadius: Infinity,
 * });
 * ```
 */
export function createUniversePhysicsConfig(
  options: Partial<UniversePhysicsConfig> & { spatialDimensions: number }
): UniversePhysicsConfig {
  const config: UniversePhysicsConfig = {
    spatialDimensions: options.spatialDimensions,
    planetRadius: options.planetRadius ?? 10000,
    undergroundIsolation: options.undergroundIsolation ?? (options.spatialDimensions >= 3),
    defaultVisibilityRange: options.defaultVisibilityRange ??
      Array(options.spatialDimensions).fill(15).map((v, i) => i >= 2 ? 10 : v),
  };

  validateUniversePhysicsConfig(config);
  return config;
}
