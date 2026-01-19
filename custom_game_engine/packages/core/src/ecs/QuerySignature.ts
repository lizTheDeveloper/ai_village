import type { ComponentType } from '../types.js';

/**
 * Generate a unique signature for a query based on component filters.
 *
 * The signature is a deterministic string that uniquely identifies a query.
 * Used as the cache key for QueryCache.
 *
 * Format:
 * - With components: comma-separated, sorted alphabetically
 * - Without components: prefixed with "!", sorted alphabetically
 * - Combined: with components + without components
 *
 * Examples:
 * - with(Position, Agent) → "agent,position"
 * - with(Position).without(Dead) → "position!dead"
 * - with(Brain, Memory, Position) → "brain,memory,position"
 * - with(Building).without(UnderConstruction, Abandoned) → "building!abandoned,under_construction"
 *
 * @param withComponents - Required components
 * @param withoutComponents - Excluded components
 * @returns Unique query signature string
 */
export function generateQuerySignature(
  withComponents: ComponentType[],
  withoutComponents: ComponentType[] = []
): string {
  // Sort for consistent signatures regardless of order
  const withSorted = [...withComponents].sort();
  const withoutSorted = [...withoutComponents].sort();

  const withPart = withSorted.join(',');
  const withoutPart =
    withoutSorted.length > 0 ? `!${withoutSorted.join(',')}` : '';

  return `${withPart}${withoutPart}`;
}
