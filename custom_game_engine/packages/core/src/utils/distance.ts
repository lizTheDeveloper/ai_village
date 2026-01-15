/**
 * Distance Utilities for Chunk-Based Spatial Queries
 *
 * Three-tier distance calculation system:
 * 1. Chunk-level: Chebyshev distance (broad phase filtering)
 * 2. Tile-level: Squared Euclidean distance (narrow phase comparisons)
 * 3. Exact: Euclidean distance with sqrt (only when needed)
 *
 * Performance guidelines:
 * - Use chunkDistance for chunk filtering (fastest)
 * - Use distanceSquared for proximity checks (no sqrt)
 * - Use distance only when you need the actual value
 */

/**
 * Position interface for distance calculations
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Chebyshev distance (max of absolute differences)
 * Used for chunk-level filtering (broad phase)
 *
 * @example
 * chunkDistance(0, 0, 2, 1) // Returns 2 (max of |2-0|, |1-0|)
 *
 * @param x1 - First X coordinate (chunk or tile)
 * @param y1 - First Y coordinate (chunk or tile)
 * @param x2 - Second X coordinate (chunk or tile)
 * @param y2 - Second Y coordinate (chunk or tile)
 * @returns Chebyshev distance (integer)
 */
export function chunkDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
}

/**
 * Squared Euclidean distance (dx² + dy²)
 * Used for distance comparisons without sqrt (narrow phase)
 *
 * CRITICAL: Always use this for distance comparisons!
 *
 * @example
 * // ❌ BAD: Uses expensive sqrt
 * if (distance(a, b) < radius) { ... }
 *
 * // ✅ GOOD: Uses squared comparison (no sqrt)
 * if (distanceSquared(a, b) < radius * radius) { ... }
 *
 * @param a - First position
 * @param b - Second position
 * @returns Squared distance (dx² + dy²)
 */
export function distanceSquared(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return dx * dx + dy * dy;
}

/**
 * Euclidean distance with sqrt
 * Only use when you need the actual distance value!
 *
 * WARNING: Math.sqrt is expensive (~10x slower than multiplication)
 * Use distanceSquared for comparisons instead.
 *
 * Use cases:
 * - Display distance to user
 * - Pathfinding cost calculation
 * - Vector normalization
 *
 * @param a - First position
 * @param b - Second position
 * @returns Actual distance
 */
export function distance(a: Position, b: Position): number {
  return Math.sqrt(distanceSquared(a, b));
}

/**
 * Check if position is within radius (no sqrt)
 * Preferred over: distance(a, b) < radius
 *
 * @example
 * // ✅ GOOD: No sqrt
 * if (isWithinRadius(agent, target, 50)) { ... }
 *
 * // ❌ BAD: Uses sqrt
 * if (distance(agent, target) < 50) { ... }
 *
 * @param a - First position
 * @param b - Second position
 * @param radius - Maximum distance
 * @returns True if within radius
 */
export function isWithinRadius(a: Position, b: Position, radius: number): boolean {
  return distanceSquared(a, b) <= radius * radius;
}

/**
 * Manhattan distance (|dx| + |dy|)
 * Useful for grid-based movement cost
 *
 * @param a - First position
 * @param b - Second position
 * @returns Manhattan distance
 */
export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
}

/**
 * Get direction vector from a to b (normalized)
 * Uses sqrt for normalization (required)
 *
 * @param a - Start position
 * @param b - End position
 * @returns Normalized direction vector {x, y} or {x: 0, y: 0} if positions are equal
 */
export function getDirection(a: Position, b: Position): Position {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: dx / len,
    y: dy / len,
  };
}

/**
 * Find nearest position from a list
 * Uses squared distance for comparison (efficient)
 *
 * @param from - Reference position
 * @param positions - Array of positions to check
 * @returns Nearest position and its squared distance, or null if array is empty
 */
export function findNearest(
  from: Position,
  positions: Position[]
): { position: Position; distanceSquared: number; distance: number } | null {
  if (positions.length === 0) return null;

  let nearest: Position = positions[0]!;
  let nearestDistSq = distanceSquared(from, nearest);

  for (let i = 1; i < positions.length; i++) {
    const pos = positions[i]!;
    const distSq = distanceSquared(from, pos);
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearest = pos;
    }
  }

  return {
    position: nearest,
    distanceSquared: nearestDistSq,
    distance: Math.sqrt(nearestDistSq), // Only sqrt once at the end
  };
}

/**
 * Sort positions by distance from a reference point
 * Uses squared distance for comparison (efficient)
 *
 * @param from - Reference position
 * @param positions - Array of positions to sort (modified in-place)
 * @returns Sorted array (same reference as input)
 */
export function sortByDistance<T extends Position>(from: Position, positions: T[]): T[] {
  return positions.sort((a, b) => {
    const distA = distanceSquared(from, a);
    const distB = distanceSquared(from, b);
    return distA - distB;
  });
}

/**
 * Filter positions within radius
 * Uses squared distance (no sqrt)
 *
 * @param from - Reference position
 * @param positions - Array of positions to filter
 * @param radius - Maximum distance
 * @returns Filtered array of positions within radius
 */
export function filterWithinRadius<T extends Position>(
  from: Position,
  positions: T[],
  radius: number
): T[] {
  const radiusSq = radius * radius;
  return positions.filter(pos => distanceSquared(from, pos) <= radiusSq);
}
