/**
 * Visibility Utilities
 *
 * Provides N-dimensional distance calculations, horizon visibility for spherical worlds,
 * and underground/surface isolation mechanics.
 *
 * Key features:
 * - N-dimensional Euclidean distance (squared to avoid sqrt)
 * - Real horizon distance: d = sqrt(2*R*h + h^2) where R=planet radius, h=observer height
 * - Underground isolation: z<0 cannot see z>=0 (hard boundary at z=0)
 * - Combined visibility checks with physics config
 */

import type { UniversePhysicsConfig } from '../config/UniversePhysicsConfig.js';

/**
 * Calculate squared Euclidean distance in N dimensions.
 * Uses squared distance to avoid sqrt in hot path (comparison only).
 *
 * @param a - First coordinate vector
 * @param b - Second coordinate vector
 * @returns Squared distance between points
 * @throws Error if coordinate arrays have different lengths
 *
 * @example
 * const distSq = distanceSquaredND([0, 0, 0], [3, 4, 0]); // 25 (5^2)
 * if (distSq < range * range) { // in range }
 */
export function distanceSquaredND(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Coordinate dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let sumSquares = 0;
  for (let i = 0; i < a.length; i++) {
    const delta = a[i]! - b[i]!;
    sumSquares += delta * delta;
  }
  return sumSquares;
}

/**
 * Calculate squared distance with wraparound for closed/toroidal dimensions.
 *
 * For each dimension, if a circumference is provided (not Infinity),
 * the distance wraps: d = min(|a-b|, circumference - |a-b|)
 *
 * @param a - First coordinate vector
 * @param b - Second coordinate vector
 * @param circumferences - Circumference per dimension (Infinity = flat/no wrap)
 * @returns Squared distance with wraparound
 * @throws Error if array lengths don't match
 *
 * @example
 * // In a dimension with circumference 100:
 * // Points at 5 and 95 are only 10 apart (not 90)
 * distanceSquaredWraparound([5], [95], [100]); // 100 (10^2)
 */
export function distanceSquaredWraparound(
  a: number[],
  b: number[],
  circumferences: number[]
): number {
  if (a.length !== b.length) {
    throw new Error(`Coordinate dimension mismatch: ${a.length} vs ${b.length}`);
  }
  if (a.length !== circumferences.length) {
    throw new Error(`Circumferences length mismatch: ${a.length} vs ${circumferences.length}`);
  }

  let sumSquares = 0;
  for (let i = 0; i < a.length; i++) {
    let delta = Math.abs(a[i]! - b[i]!);
    const circ = circumferences[i]!;

    // Wraparound for closed dimensions
    if (isFinite(circ) && delta > circ / 2) {
      delta = circ - delta;
    }

    sumSquares += delta * delta;
  }
  return sumSquares;
}

/**
 * Calculate distance to horizon from given height on a sphere.
 *
 * Formula: d = sqrt(2*R*h + h^2)
 * - For small h relative to R: d ≈ sqrt(2*R*h)
 * - For flat world (R = Infinity): returns 0 (horizon bonus disabled)
 * - For underground (h <= 0): returns 0 (no horizon bonus)
 *
 * @param observerHeight - Height above surface (z coordinate)
 * @param planetRadius - Planet radius in same units as height
 * @returns Distance to horizon (0 if underground or flat world)
 *
 * @example
 * // Flying entity at height 100 on planet radius 10000
 * const horizonDist = calculateHorizonDistance(100, 10000); // ~1414 units
 *
 * // Underground entity
 * const underground = calculateHorizonDistance(-10, 10000); // 0
 *
 * // Flat world (infinite radius)
 * const flat = calculateHorizonDistance(100, Infinity); // 0
 */
export function calculateHorizonDistance(
  observerHeight: number,
  planetRadius: number
): number {
  // Underground or flat world: no horizon bonus
  if (observerHeight <= 0 || !isFinite(planetRadius)) {
    return 0;
  }

  // d = sqrt(2*R*h + h^2)
  const term = 2 * planetRadius * observerHeight + observerHeight * observerHeight;
  return Math.sqrt(term);
}

/**
 * Get effective visibility range including horizon bonus for flying entities.
 *
 * Combines base perception range with horizon distance from height.
 * Underground entities get no horizon bonus.
 *
 * @param baseRange - Base perception range (e.g., from AgentComponent)
 * @param observerZ - Observer's z coordinate (height)
 * @param planetRadius - Planet radius from UniversePhysicsConfig
 * @returns Effective visibility range (base + horizon bonus)
 *
 * @example
 * // Ground-level entity (z=0)
 * const groundRange = getEffectiveRange(50, 0, 10000); // 50
 *
 * // Flying entity at height 100
 * const flyingRange = getEffectiveRange(50, 100, 10000); // ~1464 (50 + 1414)
 *
 * // Underground entity
 * const underRange = getEffectiveRange(50, -20, 10000); // 50
 */
export function getEffectiveRange(
  baseRange: number,
  observerZ: number,
  planetRadius: number
): number {
  const horizonBonus = calculateHorizonDistance(observerZ, planetRadius);
  return baseRange + horizonBonus;
}

/**
 * Check underground/surface isolation (hard boundary at z=0).
 *
 * Underground entities (z < 0) cannot see surface entities (z >= 0) and vice versa.
 * This is a hard boundary representing cave systems, dungeon levels, etc.
 *
 * @param observerZ - Observer's z coordinate
 * @param targetZ - Target's z coordinate
 * @returns True if both on same side of z=0 (can potentially see each other)
 *
 * @example
 * canPotentiallySee(5, 10);   // true (both surface)
 * canPotentiallySee(-5, -10); // true (both underground)
 * canPotentiallySee(5, -10);  // false (different layers)
 * canPotentiallySee(-5, 10);  // false (different layers)
 * canPotentiallySee(0, 5);    // true (z=0 is surface)
 */
export function canPotentiallySee(
  observerZ: number,
  targetZ: number
): boolean {
  // Both underground or both surface (z >= 0 is surface)
  return (observerZ < 0) === (targetZ < 0);
}

/**
 * Extract N-dimensional coordinates from position component.
 *
 * Dimensions are extracted in order: x, y, z, w, v, u
 * Missing dimensions default to 0.
 *
 * @param pos - Position component with x, y, and optional higher dimensions
 * @param dimensions - Number of dimensions to extract (1-6)
 * @returns Coordinate array of specified length
 * @throws Error if dimensions is out of range
 *
 * @example
 * const pos = { x: 10, y: 20, z: 5 };
 * getCoordinates(pos, 2); // [10, 20]
 * getCoordinates(pos, 3); // [10, 20, 5]
 * getCoordinates(pos, 4); // [10, 20, 5, 0]
 */
export function getCoordinates(
  pos: {
    x: number;
    y: number;
    z?: number;
    w?: number;
    v?: number;
    u?: number
  },
  dimensions: number
): number[] {
  if (dimensions < 1 || dimensions > 6) {
    throw new Error(`Invalid dimensions: ${dimensions} (must be 1-6)`);
  }

  const coords: number[] = [];

  // Always have x, y
  coords.push(pos.x);
  if (dimensions >= 2) coords.push(pos.y);

  // Optional dimensions default to 0
  if (dimensions >= 3) coords.push(pos.z ?? 0);
  if (dimensions >= 4) coords.push(pos.w ?? 0);
  if (dimensions >= 5) coords.push(pos.v ?? 0);
  if (dimensions >= 6) coords.push(pos.u ?? 0);

  return coords;
}

/**
 * Filter entities by underground/surface layer (fast pre-filter).
 *
 * Returns only entities on the same side of z=0 as the observer.
 * This is a fast pre-filter before expensive distance calculations.
 *
 * @param entities - Array of entities to filter
 * @param observerZ - Observer's z coordinate
 * @param getZ - Function to extract z coordinate from entity
 * @returns Filtered array of entities on same isolation layer
 *
 * @example
 * const visible = filterByIsolationLayer(
 *   allEntities,
 *   agent.z,
 *   (e) => e.getComponent('position')?.z
 * );
 * // Then do distance checks on much smaller set
 */
export function filterByIsolationLayer<T>(
  entities: T[],
  observerZ: number,
  getZ: (entity: T) => number | undefined
): T[] {
  const observerUnderground = observerZ < 0;

  return entities.filter((entity) => {
    const targetZ = getZ(entity);
    if (targetZ === undefined) return true; // No z coord = assume visible

    const targetUnderground = targetZ < 0;
    return observerUnderground === targetUnderground;
  });
}

/**
 * Combined visibility check using universe physics config.
 *
 * Checks:
 * 1. Underground/surface isolation (hard boundary)
 * 2. N-dimensional distance with horizon-adjusted range
 *
 * @param observerPos - Observer's position component
 * @param targetPos - Target's position component
 * @param baseRange - Base perception range
 * @param config - Universe physics configuration
 * @returns True if target is visible to observer
 *
 * @example
 * const visible = isVisible(
 *   agentPos,
 *   targetPos,
 *   agentComponent.perceptionRange,
 *   world.universeConfig.physics
 * );
 */
export function isVisible(
  observerPos: {
    x: number;
    y: number;
    z?: number;
    w?: number;
    v?: number;
    u?: number
  },
  targetPos: {
    x: number;
    y: number;
    z?: number;
    w?: number;
    v?: number;
    u?: number
  },
  baseRange: number,
  config: UniversePhysicsConfig
): boolean {
  const observerZ = observerPos.z ?? 0;
  const targetZ = targetPos.z ?? 0;

  // Check underground/surface isolation first (cheap)
  if (!canPotentiallySee(observerZ, targetZ)) {
    return false;
  }

  // Calculate effective range with horizon bonus
  const effectiveRange = getEffectiveRange(
    baseRange,
    observerZ,
    config.planetRadius
  );

  // N-dimensional distance check (with optional wraparound)
  const observerCoords = getCoordinates(observerPos, config.spatialDimensions);
  const targetCoords = getCoordinates(targetPos, config.spatialDimensions);

  const distSq = config.dimensionCircumferences
    ? distanceSquaredWraparound(observerCoords, targetCoords, config.dimensionCircumferences)
    : distanceSquaredND(observerCoords, targetCoords);

  return distSq <= effectiveRange * effectiveRange;
}
