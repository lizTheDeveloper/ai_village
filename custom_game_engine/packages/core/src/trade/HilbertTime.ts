/**
 * HilbertTime - Multi-dimensional temporal coordinates for causal ordering
 *
 * Models time as a 3-dimensional structure:
 * - τ (tau): Proper time - local tick count within a universe
 * - β (beta): Branch time - save/load checkpoint lineage
 * - σ (sigma): Sync time - async message ordering sequence
 *
 * Named after Hilbert space because:
 * - Each save creates a new dimension in β-space
 * - Each fork creates parallel τ-tracks
 * - Each async sync creates new σ-orderings
 * - The result is potentially infinite-dimensional, non-Euclidean time
 *
 * This enables 5D-chess-style timeline interactions where:
 * - Events can arrive "before" their causal parents
 * - Timeline forks resolve causality violations
 * - Entities can exist in multiple timeline branches simultaneously
 */

/**
 * A coordinate in Hilbert-time space
 */
export interface HilbertTimeCoordinate {
  /**
   * τ (tau) - Proper time
   * The local tick count experienced by entities in this universe.
   * Like special relativity: each observer has their own proper time.
   */
  tau: bigint;

  /**
   * β (beta) - Branch identifier
   * Tracks which save/load lineage this coordinate belongs to.
   * Format: "root" | "root.save1" | "root.save1.fork2" | etc.
   * Each load/fork appends a new segment.
   */
  beta: string;

  /**
   * σ (sigma) - Sync sequence number
   * Monotonic counter for async message ordering.
   * Increments each time we sync with another universe.
   * Used to detect out-of-order message arrival.
   */
  sigma: number;

  /**
   * Universe ID where this coordinate was created
   */
  origin: string;

  /**
   * Causal parents - coordinates of events this depends on
   * Empty for the root coordinate.
   * Used to build causal dependency graph.
   */
  causalParents: CausalReference[];
}

/**
 * Reference to a causal parent coordinate
 * Lightweight reference that can be resolved later
 */
export interface CausalReference {
  /** Universe where parent event occurred */
  universeId: string;

  /** The parent's τ value */
  tau: bigint;

  /** The parent's β value */
  beta: string;

  /** The parent's σ value */
  sigma: number;

  /** Optional event ID for specific event reference */
  eventId?: string;
}

/**
 * Result of comparing two time coordinates
 */
export type TimeOrdering =
  | 'before'        // A definitely happened before B
  | 'after'         // A definitely happened after B
  | 'concurrent'    // A and B are causally concurrent (parallel timelines)
  | 'incomparable'; // A and B are in different β-branches, cannot compare

/**
 * Compare two time coordinates for causal ordering
 *
 * In Hilbert-time, ordering is partial:
 * - Within same universe + branch: compare τ directly
 * - Across universes: use σ (sync sequence) for ordering
 * - Across branches: generally incomparable unless one is ancestor
 *
 * @param a First coordinate
 * @param b Second coordinate
 * @returns Ordering relationship
 */
export function compareTimeCoordinates(
  a: HilbertTimeCoordinate,
  b: HilbertTimeCoordinate
): TimeOrdering {
  // Same universe, same branch - simple τ comparison
  if (a.origin === b.origin && a.beta === b.beta) {
    if (a.tau < b.tau) return 'before';
    if (a.tau > b.tau) return 'after';
    return 'concurrent'; // Same tick = concurrent
  }

  // Same branch family - check if one is ancestor of other
  if (isBranchAncestor(a.beta, b.beta)) {
    // a's branch is ancestor of b's branch
    // Compare τ at fork point
    return 'before';
  }
  if (isBranchAncestor(b.beta, a.beta)) {
    return 'after';
  }

  // Different branches that diverged - check if they share common ancestor
  const commonAncestor = findCommonBranchAncestor(a.beta, b.beta);
  if (!commonAncestor) {
    return 'incomparable'; // No common history
  }

  // Different universes or diverged branches - use sync sequence
  // σ represents the order in which events were observed
  if (a.sigma < b.sigma) return 'before';
  if (a.sigma > b.sigma) return 'after';

  // Same σ means they were synced at the same time - concurrent
  return 'concurrent';
}

/**
 * Check if branch A is an ancestor of branch B
 * Branch format: "root.save1.fork2" etc.
 */
export function isBranchAncestor(ancestor: string, descendant: string): boolean {
  if (ancestor === descendant) return false;
  return descendant.startsWith(ancestor + '.');
}

/**
 * Find the common ancestor branch of two branches
 */
export function findCommonBranchAncestor(a: string, b: string): string | null {
  const aParts = a.split('.');
  const bParts = b.split('.');

  const common: string[] = [];
  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    if (aParts[i] === bParts[i]) {
      common.push(aParts[i]!);
    } else {
      break;
    }
  }

  return common.length > 0 ? common.join('.') : null;
}

/**
 * Check if coordinate B is causally dependent on coordinate A
 * B depends on A if A is in B's causal parent chain
 */
export function isCausallyDependent(
  potential: HilbertTimeCoordinate,
  dependent: HilbertTimeCoordinate
): boolean {
  // Check direct parents
  for (const parent of dependent.causalParents) {
    if (
      parent.universeId === potential.origin &&
      parent.tau === potential.tau &&
      parent.beta === potential.beta &&
      parent.sigma === potential.sigma
    ) {
      return true;
    }
  }

  // For deeper dependency checking, would need to traverse the graph
  // This is the simple case
  return false;
}

/**
 * Create a new time coordinate as a successor to the current one
 */
export function advanceTime(
  current: HilbertTimeCoordinate,
  ticksDelta: bigint = 1n
): HilbertTimeCoordinate {
  return {
    tau: current.tau + ticksDelta,
    beta: current.beta,
    sigma: current.sigma,
    origin: current.origin,
    causalParents: [
      {
        universeId: current.origin,
        tau: current.tau,
        beta: current.beta,
        sigma: current.sigma,
      },
    ],
  };
}

/**
 * Create a new time coordinate for a sync event
 * Increments σ and adds causal dependency on the synced universe
 */
export function syncWithUniverse(
  current: HilbertTimeCoordinate,
  remoteCoordinate: HilbertTimeCoordinate
): HilbertTimeCoordinate {
  return {
    tau: current.tau,
    beta: current.beta,
    sigma: current.sigma + 1,
    origin: current.origin,
    causalParents: [
      // Depend on our previous state
      {
        universeId: current.origin,
        tau: current.tau,
        beta: current.beta,
        sigma: current.sigma,
      },
      // Depend on the remote state we synced with
      {
        universeId: remoteCoordinate.origin,
        tau: remoteCoordinate.tau,
        beta: remoteCoordinate.beta,
        sigma: remoteCoordinate.sigma,
      },
    ],
  };
}

/**
 * Create a new time coordinate for a branch/fork event
 * Creates new β segment
 */
export function forkTimeline(
  current: HilbertTimeCoordinate,
  forkName: string
): HilbertTimeCoordinate {
  return {
    tau: current.tau, // τ continues from fork point
    beta: `${current.beta}.${forkName}`,
    sigma: current.sigma,
    origin: current.origin,
    causalParents: [
      {
        universeId: current.origin,
        tau: current.tau,
        beta: current.beta,
        sigma: current.sigma,
      },
    ],
  };
}

/**
 * Detect if a received event creates a causal violation
 * A causal violation occurs when we receive an event that depends on
 * something we haven't seen yet
 */
export function detectCausalViolation(
  receivedEvent: HilbertTimeCoordinate,
  ourCurrentTime: HilbertTimeCoordinate,
  knownCoordinates: Map<string, HilbertTimeCoordinate>
): CausalViolation | null {
  for (const parent of receivedEvent.causalParents) {
    const parentKey = `${parent.universeId}:${parent.beta}:${parent.tau}:${parent.sigma}`;
    const known = knownCoordinates.get(parentKey);

    if (!known) {
      // We don't know about this parent yet
      // Check if it's from our own universe - if so, it's a violation
      if (parent.universeId === ourCurrentTime.origin) {
        // Event depends on our future! This is a causal violation
        if (parent.tau > ourCurrentTime.tau) {
          return {
            type: 'future_dependency',
            missingParent: parent,
            receivedEvent,
            description: `Event depends on τ=${parent.tau} but we're at τ=${ourCurrentTime.tau}`,
            resolution: 'fork',
            forkAtTau: parent.tau,
          };
        }
      }
      // Event from another universe depends on something we haven't synced yet
      // This is a causal delay, not a violation
      return {
        type: 'missing_sync',
        missingParent: parent,
        receivedEvent,
        description: `Missing sync with ${parent.universeId} at σ=${parent.sigma}`,
        resolution: 'queue',
      };
    }
  }

  return null;
}

/**
 * Describes a causal violation and how to resolve it
 */
export interface CausalViolation {
  type: 'future_dependency' | 'missing_sync' | 'branch_conflict';

  /** The parent we're missing */
  missingParent: CausalReference;

  /** The event that caused the violation */
  receivedEvent: HilbertTimeCoordinate;

  /** Human-readable description */
  description: string;

  /** How to resolve */
  resolution: 'fork' | 'queue' | 'reject';

  /** If forking, at what τ */
  forkAtTau?: bigint;
}

/**
 * Create the root time coordinate for a new universe
 */
export function createRootTimeCoordinate(universeId: string): HilbertTimeCoordinate {
  return {
    tau: 0n,
    beta: 'root',
    sigma: 0,
    origin: universeId,
    causalParents: [],
  };
}

/**
 * Serialize a time coordinate for network transmission / storage
 */
export function serializeTimeCoordinate(coord: HilbertTimeCoordinate): string {
  return JSON.stringify({
    tau: coord.tau.toString(),
    beta: coord.beta,
    sigma: coord.sigma,
    origin: coord.origin,
    causalParents: coord.causalParents.map((p) => ({
      universeId: p.universeId,
      tau: p.tau.toString(),
      beta: p.beta,
      sigma: p.sigma,
      eventId: p.eventId,
    })),
  });
}

/**
 * Deserialize a time coordinate
 */
export function deserializeTimeCoordinate(json: string): HilbertTimeCoordinate {
  const data = JSON.parse(json);
  return {
    tau: BigInt(data.tau),
    beta: data.beta,
    sigma: data.sigma,
    origin: data.origin,
    causalParents: data.causalParents.map((p: any) => ({
      universeId: p.universeId,
      tau: BigInt(p.tau),
      beta: p.beta,
      sigma: p.sigma,
      eventId: p.eventId,
    })),
  };
}
