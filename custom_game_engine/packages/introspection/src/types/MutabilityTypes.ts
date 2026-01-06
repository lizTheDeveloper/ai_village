/**
 * Mutation permission flag definitions
 *
 * Controls which consumers can edit field values and how.
 */

/**
 * Mutation permissions for a field
 */
export interface Mutability {
  /**
   * Whether this field can be mutated at all
   * @default false
   */
  mutable?: boolean;

  /**
   * If specified, mutations must use this mutator function instead of direct assignment
   * References a key in the schema's `mutators` record
   */
  mutateVia?: string;

  /**
   * Consumer-specific edit permissions
   */
  permissions?: {
    /**
     * Player can edit (via in-game UI)
     * @default false
     */
    player?: boolean;

    /**
     * User can edit (via settings UI)
     * @default false
     */
    user?: boolean;

    /**
     * Developer can edit (via debug tools)
     * @default true if mutable is true
     */
    dev?: boolean;
  };
}

/**
 * Type guard to check if a field is mutable by any consumer
 */
export function isMutable(mutability: Mutability | undefined): boolean {
  return mutability?.mutable === true;
}

/**
 * Type guard to check if a field requires a mutator function
 */
export function requiresMutator(mutability: Mutability | undefined): boolean {
  return mutability?.mutateVia !== undefined;
}

/**
 * Check if a specific consumer can mutate this field
 */
export function canMutate(
  mutability: Mutability | undefined,
  consumer: 'player' | 'user' | 'dev'
): boolean {
  if (!isMutable(mutability)) return false;
  if (!mutability!.permissions) return consumer === 'dev';
  return mutability!.permissions[consumer] === true;
}
