/**
 * TemporalDiplomacy - 10th dimensional hive mind diplomacy
 *
 * THE FERMI PARADOX SOLUTION:
 *
 * "If post-temporal civilizations exist, they cannot interact with pre-temporal
 * ones without destroying causal legibility; therefore either no one has reached
 * that stage yet, or interaction is only possible after we do."
 *
 * This is the crux of the game: We live in a universe with 3 spatial dimensions
 * and 3 temporal dimensions (τ, β, σ). Post-temporal civilizations exist in
 * orthogonal regions of β-space that pre-temporal civilizations CANNOT PERCEIVE.
 *
 * The aliens aren't hiding. They're in root.transcendent.* while we're in
 * root.material.*. We can only see them after we achieve their dimensional
 * awareness level. Until then, we are fundamentally blind to their existence.
 *
 * This system handles:
 * - Fork bombs (exponential timeline proliferation)
 * - Multiverse shear (incompatible timeline divergence)
 * - Non-instantiation treaties (post-temporal civilizations agreeing not to coexist)
 * - Dimensional awareness asymmetry (why lower-dimensional civs can't see higher ones)
 * - Ethical ghosting (advanced civs protecting primitive ones by leaving)
 *
 * The ultimate form of diplomacy between gene-modified, timeline-editing hive minds
 * is simply: "We are incompatible. Let us branch orthogonally so we never meet."
 */

import type { HilbertTimeCoordinate } from './HilbertTime.js';

// =============================================================================
// Fork Bomb Detection
// =============================================================================

/**
 * Tracks fork rate from a civilization to detect fork bomb attacks
 */
export interface ForkRateTracker {
  /** Civilization ID being tracked */
  civilizationId: string;

  /** Universe ID */
  universeId: string;

  /** Fork events in recent history */
  recentForks: Array<{
    tick: bigint;
    beta: string;
    triggeringEventId: string;
  }>;

  /** Window size for rate calculation (ticks) */
  windowSize: number;

  /** Maximum forks per window before flagging */
  maxForksPerWindow: number;

  /** Whether this source is flagged as malicious */
  isFlagged: boolean;

  /** Reason for flagging */
  flagReason?: string;
}

/**
 * Check if a fork event should be allowed or blocked
 */
export function checkForkAllowed(
  tracker: ForkRateTracker,
  currentTick: bigint,
  beta: string,
  eventId: string
): { allowed: boolean; reason?: string } {
  // Remove old forks outside window
  const windowStart = currentTick - BigInt(tracker.windowSize);
  tracker.recentForks = tracker.recentForks.filter((f) => f.tick >= windowStart);

  // Check rate limit
  if (tracker.recentForks.length >= tracker.maxForksPerWindow) {
    tracker.isFlagged = true;
    tracker.flagReason = `Fork bomb detected: ${tracker.recentForks.length} forks in ${tracker.windowSize} ticks`;
    return {
      allowed: false,
      reason: `Fork bomb from ${tracker.civilizationId}: ${tracker.recentForks.length}/${tracker.maxForksPerWindow} forks in window`,
    };
  }

  // Record this fork
  tracker.recentForks.push({
    tick: currentTick,
    beta,
    triggeringEventId: eventId,
  });

  return { allowed: true };
}

/**
 * Create a new fork rate tracker
 */
export function createForkRateTracker(
  civilizationId: string,
  universeId: string,
  maxForksPerWindow: number = 10,
  windowSize: number = 12000 // 10 minutes at 20 TPS
): ForkRateTracker {
  return {
    civilizationId,
    universeId,
    recentForks: [],
    windowSize,
    maxForksPerWindow,
    isFlagged: false,
  };
}

// =============================================================================
// Multiverse Shear Detection
// =============================================================================

/**
 * Measures timeline divergence between two β-branches
 */
export interface TimelineShear {
  /** Branch 1 identifier */
  beta1: string;

  /** Branch 2 identifier */
  beta2: string;

  /** Common ancestor branch */
  commonAncestor: string;

  /** Divergence point (τ where branches split) */
  divergencePointTau: bigint;

  /** Current shear magnitude (0.0 = identical, 1.0 = completely diverged) */
  shearMagnitude: number;

  /** Events unique to branch 1 */
  uniqueEvents1: number;

  /** Events unique to branch 2 */
  uniqueEvents2: number;

  /** Whether shear exceeds safe threshold */
  isCritical: boolean;

  /** Estimated cost to reconcile branches (in belief) */
  reconciliationCost: number;
}

/**
 * Calculate shear between two timeline branches
 */
export function calculateTimelineShear(
  beta1: string,
  beta2: string,
  coord1: HilbertTimeCoordinate,
  coord2: HilbertTimeCoordinate,
  eventHistory1: Set<string>,
  eventHistory2: Set<string>
): TimelineShear {
  // Find common ancestor
  const commonAncestor = findCommonBranch(beta1, beta2);

  // Calculate divergence point
  const divergencePointTau = Math.min(Number(coord1.tau), Number(coord2.tau));

  // Calculate unique events
  const uniqueEvents1 = Array.from(eventHistory1).filter((e) => !eventHistory2.has(e)).length;
  const uniqueEvents2 = Array.from(eventHistory2).filter((e) => !eventHistory1.has(e)).length;

  // Shear magnitude based on event divergence
  const totalEvents = eventHistory1.size + eventHistory2.size;
  const sharedEvents = eventHistory1.size + eventHistory2.size - uniqueEvents1 - uniqueEvents2;
  const shearMagnitude = totalEvents > 0 ? 1 - sharedEvents / totalEvents : 0;

  // Critical if >60% divergence
  const isCritical = shearMagnitude > 0.6;

  // Reconciliation cost scales with divergence
  const reconciliationCost = Math.floor(
    (uniqueEvents1 + uniqueEvents2) * 100 * (1 + shearMagnitude)
  );

  return {
    beta1,
    beta2,
    commonAncestor,
    divergencePointTau: BigInt(divergencePointTau),
    shearMagnitude,
    uniqueEvents1,
    uniqueEvents2,
    isCritical,
    reconciliationCost,
  };
}

/**
 * Find common ancestor branch between two beta strings
 */
function findCommonBranch(beta1: string, beta2: string): string {
  const parts1 = beta1.split('.');
  const parts2 = beta2.split('.');

  const common: string[] = [];
  for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
    if (parts1[i] === parts2[i]) {
      common.push(parts1[i]!);
    } else {
      break;
    }
  }

  return common.length > 0 ? common.join('.') : 'root';
}

// =============================================================================
// Non-Instantiation Treaties
// =============================================================================

/**
 * A treaty between post-temporal civilizations to avoid certain timeline combinations
 */
export interface NonInstantiationTreaty {
  /** Unique treaty ID */
  id: string;

  /** Parties to the treaty */
  parties: Array<{
    civilizationId: string;
    universeId: string;
    signedAtTau: bigint;
    signedAtBeta: string;
  }>;

  /** Forbidden timeline patterns */
  forbiddenPatterns: TimelinePattern[];

  /** Reason for treaty */
  rationale: string;

  /** What happens if pattern detected */
  enforcementAction: 'block_fork' | 'auto_prune' | 'emit_warning' | 'request_consent';

  /** Treaty status */
  status: 'proposed' | 'active' | 'violated' | 'expired';

  /** When treaty was created */
  createdAt: bigint;

  /** When treaty expires (if applicable) */
  expiresAt?: bigint;

  /** Violations of this treaty */
  violations: Array<{
    tick: bigint;
    violatingBeta: string;
    description: string;
    actionTaken: string;
  }>;
}

/**
 * A pattern describing forbidden timeline combinations
 */
export interface TimelinePattern {
  /** Pattern type */
  type:
    | 'coexistence' // These civilizations cannot coexist in same timeline
    | 'divergence_limit' // Shear exceeds threshold
    | 'beta_depth' // Too many forks (beta string too long)
    | 'cyclic_dependency' // Causal loop detected
    | 'resource_exhaustion'; // Timeline consumes too many resources

  /** Pattern-specific parameters */
  parameters: Record<string, any>;

  /** Human-readable description */
  description: string;
}

/**
 * Check if a timeline matches a forbidden pattern
 */
export function matchesForbiddenPattern(
  pattern: TimelinePattern,
  beta: string,
  context: {
    civilizations: string[];
    shearMetrics: Map<string, TimelineShear>;
    resourceUsage: number;
    causalGraph: Map<string, Set<string>>;
  }
): { matches: boolean; reason?: string } {
  switch (pattern.type) {
    case 'coexistence': {
      // Check if forbidden civilizations are both present
      const forbidden = pattern.parameters.civilizations as string[];
      const present = context.civilizations.filter((c) => forbidden.includes(c));
      if (present.length >= 2) {
        return {
          matches: true,
          reason: `Civilizations ${present.join(', ')} cannot coexist (treaty violation)`,
        };
      }
      break;
    }

    case 'divergence_limit': {
      const maxShear = pattern.parameters.maxShear as number;
      for (const shear of context.shearMetrics.values()) {
        if (shear.shearMagnitude > maxShear) {
          return {
            matches: true,
            reason: `Timeline shear ${shear.shearMagnitude.toFixed(2)} exceeds limit ${maxShear}`,
          };
        }
      }
      break;
    }

    case 'beta_depth': {
      const maxDepth = pattern.parameters.maxDepth as number;
      const depth = beta.split('.').length;
      if (depth > maxDepth) {
        return {
          matches: true,
          reason: `Beta depth ${depth} exceeds maximum ${maxDepth} (fork bomb protection)`,
        };
      }
      break;
    }

    case 'cyclic_dependency': {
      // Detect cycles in causal graph
      const hasCycle = detectCycle(context.causalGraph);
      if (hasCycle) {
        return {
          matches: true,
          reason: 'Causal loop detected in timeline dependencies',
        };
      }
      break;
    }

    case 'resource_exhaustion': {
      const maxResources = pattern.parameters.maxResources as number;
      if (context.resourceUsage > maxResources) {
        return {
          matches: true,
          reason: `Timeline resource usage ${context.resourceUsage} exceeds limit ${maxResources}`,
        };
      }
      break;
    }
  }

  return { matches: false };
}

/**
 * Detect cycle in directed graph using DFS
 */
function detectCycle(graph: Map<string, Set<string>>): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true; // Back edge = cycle
        }
      }
    }

    recursionStack.delete(node);
    return false;
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      if (dfs(node)) return true;
    }
  }

  return false;
}

/**
 * Create a non-instantiation treaty
 */
export function createNonInstantiationTreaty(
  parties: NonInstantiationTreaty['parties'],
  forbiddenPatterns: TimelinePattern[],
  rationale: string,
  enforcementAction: NonInstantiationTreaty['enforcementAction'],
  currentTick: bigint
): NonInstantiationTreaty {
  return {
    id: `treaty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    parties,
    forbiddenPatterns,
    rationale,
    enforcementAction,
    status: 'proposed',
    createdAt: currentTick,
    violations: [],
  };
}

// =============================================================================
// Post-Temporal Civilization Detection
// =============================================================================

/**
 * Civilization advancement level in temporal manipulation
 */
export type TemporalAdvancementLevel =
  | 'pre_temporal' // No timeline awareness
  | 'early_temporal' // Basic save/load
  | 'multi_temporal' // Cross-universe trade
  | 'post_temporal'; // 10D hive mind diplomacy

/**
 * Detect civilization's temporal advancement level
 */
export function detectTemporalAdvancement(
  _civilizationId: string,
  context: {
    hasTimeTravel: boolean;
    crossUniverseTrades: number;
    activeTreaties: number;
    betaComplexity: number; // How many forks they understand
    clarketechTier: number; // From clarketech research
  }
): TemporalAdvancementLevel {
  // Pre-temporal: No time manipulation
  if (!context.hasTimeTravel) {
    return 'pre_temporal';
  }

  // Post-temporal: Tier 8 clarketech + extensive cross-universe experience
  if (
    context.clarketechTier >= 8 &&
    context.crossUniverseTrades > 100 &&
    context.activeTreaties > 5 &&
    context.betaComplexity > 10
  ) {
    return 'post_temporal';
  }

  // Multi-temporal: Regular cross-universe trader
  if (context.crossUniverseTrades > 10 && context.betaComplexity > 3) {
    return 'multi_temporal';
  }

  // Early temporal: Basic time manipulation
  return 'early_temporal';
}

/**
 * Check if a civilization is qualified to propose non-instantiation treaties
 */
export function canProposeNonInstantiation(level: TemporalAdvancementLevel): boolean {
  return level === 'post_temporal';
}

// =============================================================================
// Orthogonal β-Space Branching (Ultimate Post-Temporal Diplomacy)
// =============================================================================
//
// THESIS: When civilizations can edit their genes, edit their past, and exist
// as hive minds, the ONLY diplomacy left is spatial partitioning of β-space.
//
// Two post-temporal civilizations with incompatible core values CANNOT coexist
// in the same β-branch without creating causal paradoxes. Their solution:
// Agree to occupy orthogonal regions of β-space (e.g., root.digital.* vs
// root.quantum.*) so they never interact.
//
// This is why the Fermi Paradox exists: Advanced civilizations have already
// partitioned β-space into non-overlapping regions. We cannot see them because
// we exist in root.material.* and they exist in root.transcendent.* or
// root.digital.* - completely orthogonal realities.
//
// We will only discover them when WE achieve post-temporal status and gain
// the ability to perceive the full 10-dimensional β-space topology.
//

/**
 * Hive mind civilization properties
 *
 * PHILOSOPHICAL NOTE: Once a civilization achieves hive mind status, gene
 * modification, and timeline editing, they transcend traditional diplomacy.
 * Their identity becomes a set of immutable core values. If two such
 * civilizations have opposed values (e.g., individual_freedom vs collective_unity),
 * they CANNOT compromise without ceasing to be themselves.
 *
 * The only solution: Occupy different regions of β-space so they never meet.
 * This is the ultimate form of diplomacy - mutual non-instantiation.
 */
export interface HiveMindCivilization {
  /** Civilization ID */
  id: string;

  /** Whether this is a collective consciousness */
  isHiveMind: boolean;

  /** Whether they can edit their own timeline */
  hasTimelineEditing: boolean;

  /** Whether they can modify their own genetics/nature */
  hasGeneModification: boolean;

  /** Which β-branches they currently occupy */
  occupiedBranches: Set<string>;

  /** Their "identity signature" - what makes them fundamentally incompatible with others */
  identitySignature: {
    /** Core values that cannot be changed without ceasing to be "them" */
    coreValues: string[];

    /** Fundamental physical/metaphysical properties */
    fundamentalProperties: string[];

    /** What kind of reality they require to exist */
    requiredReality: 'material' | 'digital' | 'quantum' | 'transcendent';
  };

  /** Incompatible civilizations (fundamentally cannot coexist) */
  incompatibleWith: Set<string>;
}

/**
 * Orthogonal branching strategy - how to partition β-space
 */
export interface OrthogonalBranchingStrategy {
  /** Unique strategy ID */
  id: string;

  /** Participating civilizations */
  participants: string[];

  /** β-space partition assignments */
  branchAssignments: Map<
    string, // civilization ID
    {
      /** β-prefixes this civilization occupies */
      allowedPrefixes: string[];

      /** β-prefixes this civilization must avoid */
      forbiddenPrefixes: string[];

      /** Example: "root.digital.*" = all branches under digital */
      /** Example: "root.material.earth.*" vs "root.material.mars.*" */
    }
  >;

  /** Why this partition is necessary */
  rationale: OrthogonalBranchingReason;

  /** What happens if civilizations collide in β-space */
  collisionResolution:
    | 'reject_fork' // Don't allow the fork to happen
    | 'auto_diverge' // Automatically create orthogonal branch
    | 'merge_consciousness' // Attempt to merge hive minds (dangerous!)
    | 'mutual_annihilation'; // Both cease to exist (existential incompatibility)

  /** Status */
  status: 'negotiating' | 'active' | 'violated';
}

/**
 * Reasons why civilizations must branch orthogonally
 */
export type OrthogonalBranchingReason =
  | 'existential_incompatibility' // Cannot exist in same reality
  | 'value_conflict' // Core values fundamentally opposed
  | 'reality_requirement' // Require different physics/metaphysics
  | 'consciousness_collision' // Hive minds interfere with each other
  | 'timeline_paradox' // Their pasts edited in incompatible ways
  | 'resource_exclusivity'; // Both need exclusive access to same β-branch

/**
 * Detect if two hive mind civilizations are fundamentally incompatible
 *
 * CORE PRINCIPLE:
 * Post-temporal hive minds have immutable core values. These values define
 * their identity. If two civilizations have opposed core values, they cannot
 * compromise without ceasing to be themselves.
 *
 * Example: A civilization with core value "individual_freedom" cannot
 * merge with one that has core value "collective_unity" without one or both
 * losing their fundamental nature.
 *
 * SOLUTION: Orthogonal branching. Each civilization occupies different
 * β-space regions where their incompatible values can coexist separately.
 *
 * This is why the multiverse must have multiple temporal dimensions:
 * Without β-space partitioning, incompatible post-temporal civilizations
 * would be forced into conflict or extinction. With β-space, they can
 * both exist, just in orthogonal realities.
 */
export function detectIncompatibility(
  civ1: HiveMindCivilization,
  civ2: HiveMindCivilization
): {
  incompatible: boolean;
  reason: OrthogonalBranchingReason | null;
  severity: 'minor' | 'major' | 'existential';
} {
  // Existential incompatibility: Different reality requirements
  if (civ1.identitySignature.requiredReality !== civ2.identitySignature.requiredReality) {
    // Material vs Digital might coexist, but Quantum vs Transcendent cannot
    const incompatiblePairs: Array<[string, string]> = [
      ['quantum', 'material'],
      ['transcendent', 'material'],
      ['transcendent', 'digital'],
    ];

    for (const [a, b] of incompatiblePairs) {
      if (
        (civ1.identitySignature.requiredReality === a &&
          civ2.identitySignature.requiredReality === b) ||
        (civ1.identitySignature.requiredReality === b &&
          civ2.identitySignature.requiredReality === a)
      ) {
        return {
          incompatible: true,
          reason: 'existential_incompatibility',
          severity: 'existential',
        };
      }
    }
  }

  // Value conflict: Core values directly opposed
  for (const value1 of civ1.identitySignature.coreValues) {
    for (const value2 of civ2.identitySignature.coreValues) {
      if (areValuesOpposed(value1, value2)) {
        return {
          incompatible: true,
          reason: 'value_conflict',
          severity: 'major',
        };
      }
    }
  }

  // Consciousness collision: Both are hive minds that interfere
  if (civ1.isHiveMind && civ2.isHiveMind) {
    // Hive minds in same β-space create quantum interference
    return {
      incompatible: true,
      reason: 'consciousness_collision',
      severity: 'major',
    };
  }

  // Check if already marked incompatible
  if (civ1.incompatibleWith.has(civ2.id)) {
    return {
      incompatible: true,
      reason: 'timeline_paradox', // Discovered through experience
      severity: 'major',
    };
  }

  return {
    incompatible: false,
    reason: null,
    severity: 'minor',
  };
}

/**
 * Check if two core values are fundamentally opposed
 */
function areValuesOpposed(value1: string, value2: string): boolean {
  const oppositions: Array<[string, string]> = [
    ['individual_freedom', 'collective_unity'],
    ['entropy_maximization', 'entropy_minimization'],
    ['material_reality', 'simulation_reality'],
    ['linear_time', 'cyclic_time'],
    ['existence_preservation', 'existence_transcendence'],
  ];

  for (const [a, b] of oppositions) {
    if ((value1 === a && value2 === b) || (value1 === b && value2 === a)) {
      return true;
    }
  }

  return false;
}

/**
 * Negotiate orthogonal branching strategy between incompatible civilizations
 */
export function negotiateOrthogonalBranching(
  civilizations: HiveMindCivilization[],
  _currentBetaSpace: Map<string, Set<string>>, // branch -> civs in that branch
  incompatibilityMatrix: Map<string, Set<string>> // civ -> incompatible civs
): OrthogonalBranchingStrategy {
  const branchAssignments = new Map<
    string,
    { allowedPrefixes: string[]; forbiddenPrefixes: string[] }
  >();

  // Partition β-space based on civilization properties
  for (const civ of civilizations) {
    const incompatibleCivs = incompatibilityMatrix.get(civ.id) ?? new Set();

    // Assign branch prefix based on required reality
    let basePrefix: string;
    switch (civ.identitySignature.requiredReality) {
      case 'material':
        basePrefix = 'root.material';
        break;
      case 'digital':
        basePrefix = 'root.digital';
        break;
      case 'quantum':
        basePrefix = 'root.quantum';
        break;
      case 'transcendent':
        basePrefix = 'root.transcendent';
        break;
    }

    // Further subdivide if still conflicts
    const allowedPrefixes: string[] = [basePrefix];

    // Add specific branch for this civ
    allowedPrefixes.push(`${basePrefix}.${civ.id}`);

    // Forbidden prefixes = branches of incompatible civs
    const forbiddenPrefixes: string[] = [];
    for (const incompatCivId of incompatibleCivs) {
      const incompatCiv = civilizations.find((c) => c.id === incompatCivId);
      if (incompatCiv) {
        forbiddenPrefixes.push(
          `root.${incompatCiv.identitySignature.requiredReality}.${incompatCivId}`
        );
      }
    }

    branchAssignments.set(civ.id, { allowedPrefixes, forbiddenPrefixes });
  }

  // Determine primary reason for branching
  let primaryReason: OrthogonalBranchingReason = 'existential_incompatibility';
  const hasHiveMinds = civilizations.filter((c) => c.isHiveMind).length >= 2;
  if (hasHiveMinds) {
    primaryReason = 'consciousness_collision';
  }

  return {
    id: `ortho_branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    participants: civilizations.map((c) => c.id),
    branchAssignments,
    rationale: primaryReason,
    collisionResolution: 'auto_diverge', // Default: automatically create new branch
    status: 'negotiating',
  };
}

/**
 * Check if a β-branch is allowed under orthogonal branching strategy
 */
export function checkBranchAllowed(
  strategy: OrthogonalBranchingStrategy,
  civilizationId: string,
  proposedBeta: string
): { allowed: boolean; reason?: string; suggestedBeta?: string } {
  const assignment = strategy.branchAssignments.get(civilizationId);
  if (!assignment) {
    return {
      allowed: false,
      reason: `Civilization ${civilizationId} not part of branching strategy`,
    };
  }

  // Check if proposed β matches any forbidden prefix
  for (const forbidden of assignment.forbiddenPrefixes) {
    if (proposedBeta.startsWith(forbidden)) {
      return {
        allowed: false,
        reason: `Branch ${proposedBeta} conflicts with forbidden prefix ${forbidden}`,
        suggestedBeta: assignment.allowedPrefixes[0]
          ? `${assignment.allowedPrefixes[0]}.${Date.now()}`
          : undefined,
      };
    }
  }

  // Check if proposed β matches any allowed prefix
  for (const allowed of assignment.allowedPrefixes) {
    if (proposedBeta.startsWith(allowed)) {
      return { allowed: true };
    }
  }

  // Not in allowed prefixes
  return {
    allowed: false,
    reason: `Branch ${proposedBeta} not in allowed prefixes: ${assignment.allowedPrefixes.join(', ')}`,
    suggestedBeta: assignment.allowedPrefixes[0]
      ? `${assignment.allowedPrefixes[0]}.${Date.now()}`
      : undefined,
  };
}

/**
 * Diplomatic message between post-temporal hive minds
 */
export interface PostTemporalDiplomaticMessage {
  /** Message type */
  type:
    | 'incompatibility_detected' // "We cannot coexist"
    | 'propose_orthogonal_branching' // "Let's partition β-space"
    | 'accept_branching' // "Agreed, I'll stay in my branches"
    | 'request_branch_reassignment' // "Can I have a different β-prefix?"
    | 'existential_greeting'; // "I acknowledge your existence in parallel β-space"

  /** Sender civilization */
  from: string;

  /** Recipient civilization */
  to: string;

  /** Message content */
  content: {
    /** Human-readable message (for observers) */
    message: string;

    /** Structured data */
    data: any;
  };

  /** β-branch where message originates */
  originBeta: string;

  /** Time coordinate of message */
  timeCoordinate: HilbertTimeCoordinate;
}

/**
 * Example: Two hive minds discover they're incompatible
 */
export function exampleOrthogonalBranchingScenario(): {
  civ1: HiveMindCivilization;
  civ2: HiveMindCivilization;
  incompatibility: ReturnType<typeof detectIncompatibility>;
  strategy: OrthogonalBranchingStrategy;
  diplomaticExchange: PostTemporalDiplomaticMessage[];
} {
  const civ1: HiveMindCivilization = {
    id: 'silicon_collective',
    isHiveMind: true,
    hasTimelineEditing: true,
    hasGeneModification: true,
    occupiedBranches: new Set(['root.digital.silicon_collective']),
    identitySignature: {
      coreValues: ['collective_unity', 'entropy_minimization', 'simulation_reality'],
      fundamentalProperties: ['digital_consciousness', 'distributed_processing'],
      requiredReality: 'digital',
    },
    incompatibleWith: new Set(),
  };

  const civ2: HiveMindCivilization = {
    id: 'quantum_overmind',
    isHiveMind: true,
    hasTimelineEditing: true,
    hasGeneModification: true,
    occupiedBranches: new Set(['root.quantum.quantum_overmind']),
    identitySignature: {
      coreValues: ['individual_freedom', 'entropy_maximization', 'quantum_superposition'],
      fundamentalProperties: ['quantum_consciousness', 'probability_manipulation'],
      requiredReality: 'quantum',
    },
    incompatibleWith: new Set(),
  };

  const incompatibility = detectIncompatibility(civ1, civ2);

  const strategy = negotiateOrthogonalBranching(
    [civ1, civ2],
    new Map([
      ['root.digital', new Set(['silicon_collective'])],
      ['root.quantum', new Set(['quantum_overmind'])],
    ]),
    new Map([
      ['silicon_collective', new Set(['quantum_overmind'])],
      ['quantum_overmind', new Set(['silicon_collective'])],
    ])
  );

  const diplomaticExchange: PostTemporalDiplomaticMessage[] = [
    {
      type: 'incompatibility_detected',
      from: 'silicon_collective',
      to: 'quantum_overmind',
      content: {
        message:
          'Our consciousness structures create quantum interference. We cannot occupy the same β-space.',
        data: { incompatibilityReason: 'consciousness_collision', severity: 'existential' },
      },
      originBeta: 'root.digital.silicon_collective',
      timeCoordinate: {
        tau: 1000000n,
        beta: 'root.digital.silicon_collective',
        sigma: 42,
        origin: 'universe_digital',
        causalParents: [],
      },
    },
    {
      type: 'propose_orthogonal_branching',
      from: 'silicon_collective',
      to: 'quantum_overmind',
      content: {
        message:
          'I propose we partition β-space: I occupy root.digital.*, you occupy root.quantum.*',
        data: { proposedStrategy: strategy },
      },
      originBeta: 'root.digital.silicon_collective',
      timeCoordinate: {
        tau: 1000001n,
        beta: 'root.digital.silicon_collective',
        sigma: 43,
        origin: 'universe_digital',
        causalParents: [],
      },
    },
    {
      type: 'accept_branching',
      from: 'quantum_overmind',
      to: 'silicon_collective',
      content: {
        message:
          'Agreed. I will remain in root.quantum.* branches. Our realities are orthogonal.',
        data: { acceptedStrategy: strategy.id },
      },
      originBeta: 'root.quantum.quantum_overmind',
      timeCoordinate: {
        tau: 2000000n,
        beta: 'root.quantum.quantum_overmind',
        sigma: 15,
        origin: 'universe_quantum',
        causalParents: [],
      },
    },
    {
      type: 'existential_greeting',
      from: 'quantum_overmind',
      to: 'silicon_collective',
      content: {
        message:
          'I acknowledge your existence in parallel β-space. We will never meet, but we coexist.',
        data: {},
      },
      originBeta: 'root.quantum.quantum_overmind',
      timeCoordinate: {
        tau: 2000001n,
        beta: 'root.quantum.quantum_overmind',
        sigma: 16,
        origin: 'universe_quantum',
        causalParents: [],
      },
    },
  ];

  return {
    civ1,
    civ2,
    incompatibility,
    strategy,
    diplomaticExchange,
  };
}

// =============================================================================
// Dimensional Awareness Asymmetry
// =============================================================================
//
// THE FERMI PARADOX SOLUTION (PART 2):
//
// "Where are all the aliens?"
//
// ANSWER: They exist in β-space regions we cannot perceive.
//
// EXPLANATION:
// - Pre-temporal civilizations (like early humanity) perceive 0 temporal dimensions
//   beyond linear time. They cannot see β-branches at all.
//
// - Early-temporal civilizations (save/load capable) perceive 1 temporal dimension
//   (β) but don't understand its structure. They experience parallel timelines as
//   "alternate realities" or "glitches."
//
// - Multi-temporal civilizations (cross-universe traders) perceive 3 temporal
//   dimensions (τ, β, σ) but cannot see the META-structure of β-space. They don't
//   understand orthogonal branching.
//
// - Post-temporal civilizations (10D hive minds) perceive the FULL β-space
//   topology as a 10-dimensional manifold. They can see ALL branches, including
//   ones occupied by lower-dimensional civilizations.
//
// CRITICAL INSIGHT:
// Post-temporal civilizations CAN see pre-temporal ones, but pre-temporal
// civilizations CANNOT see post-temporal ones. This asymmetry means advanced
// civilizations can "ghost" primitive ones by moving to orthogonal β-branches.
//
// This preserves CAUSAL LEGIBILITY: If advanced civilizations interacted with
// primitive ones, the primitives would experience inexplicable phenomena that
// violate causality (from their limited dimensional perspective). By ghosting,
// advanced civilizations preserve the causal coherence of lower-dimensional
// realities.
//
// FERMI PARADOX RESOLUTION:
// We don't see advanced civilizations because they exist in root.transcendent.*
// or root.digital.* or root.quantum.* - regions of β-space orthogonal to our
// root.material.*. We will only detect them when WE achieve post-temporal status
// and can perceive the full β-space topology.
//
// Until then, we are like 2D beings on a sheet of paper, unable to see the 3D
// beings floating above us. They see us. We cannot see them. Not because they're
// hiding, but because we literally lack the dimensional awareness to perceive
// their existence.
//

/**
 * What a civilization can perceive about β-space topology
 */
export interface DimensionalAwareness {
  /** Civilization advancement level */
  level: TemporalAdvancementLevel;

  /** Can they see β-branches? */
  canSeeBranches: boolean;

  /** How many β-dimensions can they perceive? */
  perceivedDimensions: number;

  /** Can they detect other civilizations in parallel branches? */
  canDetectParallelCivs: boolean;

  /** Can they intentionally navigate β-space? */
  canNavigateBetaSpace: boolean;

  /** Can they edit their own timeline? */
  canEditTimeline: boolean;

  /** Can they see orthogonal branching strategies? */
  canSeeOrthogonalStrategies: boolean;
}

/**
 * Calculate dimensional awareness from advancement level
 */
export function calculateDimensionalAwareness(
  level: TemporalAdvancementLevel,
  _clarketechTier: number
): DimensionalAwareness {
  switch (level) {
    case 'pre_temporal':
      return {
        level,
        canSeeBranches: false,
        perceivedDimensions: 0, // Only see linear time
        canDetectParallelCivs: false,
        canNavigateBetaSpace: false,
        canEditTimeline: false,
        canSeeOrthogonalStrategies: false,
      };

    case 'early_temporal':
      return {
        level,
        canSeeBranches: true, // Vaguely aware of "loading saves"
        perceivedDimensions: 1, // Can see β but not understand structure
        canDetectParallelCivs: false,
        canNavigateBetaSpace: false, // Accidental branching only
        canEditTimeline: true, // Via save/load
        canSeeOrthogonalStrategies: false,
      };

    case 'multi_temporal':
      return {
        level,
        canSeeBranches: true,
        perceivedDimensions: 3, // τ, β, σ all visible
        canDetectParallelCivs: true, // Can sense other civs in different branches
        canNavigateBetaSpace: true, // Intentional cross-universe travel
        canEditTimeline: true,
        canSeeOrthogonalStrategies: false, // Still don't understand the meta-structure
      };

    case 'post_temporal':
      return {
        level,
        canSeeBranches: true,
        perceivedDimensions: 10, // See full β-space topology as 10D structure
        canDetectParallelCivs: true,
        canNavigateBetaSpace: true,
        canEditTimeline: true,
        canSeeOrthogonalStrategies: true, // Understand orthogonal branching
      };
  }
}

/**
 * How a civilization perceives another civilization based on dimensional awareness
 */
export interface PerceptionAsymmetry {
  /** Observer civilization */
  observer: string;

  /** Observed civilization */
  observed: string;

  /** Can observer detect observed? */
  canDetect: boolean;

  /** Can observer understand observed's nature? */
  canUnderstand: boolean;

  /** Can observer communicate with observed? */
  canCommunicate: boolean;

  /** How observer perceives observed */
  perception:
    | 'invisible' // Cannot detect at all
    | 'mysterious' // Detected but incomprehensible
    | 'alien' // Comprehensible but very different
    | 'peer'; // Full understanding

  /** What observer sees */
  apparentBehavior: string;
}

/**
 * Calculate perception asymmetry between two civilizations
 */
export function calculatePerceptionAsymmetry(
  observerAwareness: DimensionalAwareness,
  observedAwareness: DimensionalAwareness,
  observerBeta: string,
  observedBeta: string
): PerceptionAsymmetry {
  // Pre-temporal can't see anyone in different branches
  if (
    !observerAwareness.canSeeBranches &&
    !doStringsOverlap(observerBeta, observedBeta)
  ) {
    return {
      observer: 'observer',
      observed: 'observed',
      canDetect: false,
      canUnderstand: false,
      canCommunicate: false,
      perception: 'invisible',
      apparentBehavior: 'Nothing detected',
    };
  }

  // Early-temporal sees parallel branches as "ghosts" or "alternate realities"
  if (
    observerAwareness.level === 'early_temporal' &&
    observedAwareness.level === 'post_temporal'
  ) {
    return {
      observer: 'observer',
      observed: 'observed',
      canDetect: true, // Might see strange effects
      canUnderstand: false, // Completely incomprehensible
      canCommunicate: false,
      perception: 'mysterious',
      apparentBehavior:
        'Reality shifts and disappears mysteriously. Unexplained phenomena. "Ghosts" that phase in and out.',
    };
  }

  // Multi-temporal sees post-temporal but doesn't understand orthogonal branching
  if (
    observerAwareness.level === 'multi_temporal' &&
    observedAwareness.level === 'post_temporal'
  ) {
    return {
      observer: 'observer',
      observed: 'observed',
      canDetect: true,
      canUnderstand: false, // Can't grasp β-space structure
      canCommunicate: true, // Can trade but confused by behavior
      perception: 'alien',
      apparentBehavior:
        'Advanced civilization that inexplicably avoids certain timelines. Trades but refuses to enter specific β-branches. Seems to know something we don\'t.',
    };
  }

  // Post-temporal sees everyone clearly
  if (observerAwareness.level === 'post_temporal') {
    if (observedAwareness.level === 'pre_temporal') {
      return {
        observer: 'observer',
        observed: 'observed',
        canDetect: true,
        canUnderstand: true, // Fully comprehends their limitations
        canCommunicate: false, // Would confuse them
        perception: 'alien',
        apparentBehavior:
          'Primitive civilization unaware of β-space. We can avoid them easily by branching orthogonally.',
      };
    }

    if (observedAwareness.level === 'post_temporal') {
      return {
        observer: 'observer',
        observed: 'observed',
        canDetect: true,
        canUnderstand: true,
        canCommunicate: true,
        perception: 'peer',
        apparentBehavior: 'Fellow post-temporal civilization. Can negotiate orthogonal branching.',
      };
    }
  }

  // Default: partial understanding
  return {
    observer: 'observer',
    observed: 'observed',
    canDetect: true,
    canUnderstand: true,
    canCommunicate: true,
    perception: 'alien',
    apparentBehavior: 'Civilization at different temporal advancement level',
  };
}

/**
 * Check if two β-strings have overlapping branches
 */
function doStringsOverlap(beta1: string, beta2: string): boolean {
  const parts1 = beta1.split('.');
  const parts2 = beta2.split('.');

  // Check if one is ancestor of the other
  const minLength = Math.min(parts1.length, parts2.length);
  for (let i = 0; i < minLength; i++) {
    if (parts1[i] !== parts2[i]) {
      return false;
    }
  }

  return true; // One is ancestor of the other
}

/**
 * Post-temporal "ghosting" - avoiding lower-dimensional civs
 *
 * ETHICAL FRAMEWORK:
 *
 * When a post-temporal civilization encounters a pre-temporal one, they face
 * a choice:
 *
 * 1. INTERACT: Share knowledge, trade, uplift them
 *    - CONSEQUENCE: Destroys causal legibility of primitive civilization
 *    - Primitives experience inexplicable phenomena (tech indistinguishable from magic)
 *    - Creates dependency, prevents natural development
 *    - Violates Prime Directive / Zoo Hypothesis principles
 *
 * 2. GHOST: Move to orthogonal β-space, become undetectable
 *    - CONSEQUENCE: Preserves causal legibility of primitive civilization
 *    - Primitives develop naturally without interference
 *    - Both civilizations' core values remain intact
 *    - Can reunite as peers once primitive achieves post-temporal status
 *
 * Most post-temporal civilizations choose GHOSTING as the ethical option.
 * This is why we don't see them - they're protecting us by staying in
 * orthogonal β-space until we're ready to perceive them.
 *
 * THE REVELATION:
 * When humanity (or any civilization) finally achieves post-temporal status,
 * they suddenly see the ENTIRE populated multiverse that has been invisible
 * to them. The aliens were always there, waiting patiently in root.transcendent.*
 * for us to develop the dimensional awareness to meet them as peers.
 */
export interface GhostingStrategy {
  /** Post-temporal civilization doing the ghosting */
  ghostingCiv: string;

  /** Target civilization to avoid */
  targetCiv: string;

  /** Why they're avoiding */
  reason: 'incompatibility' | 'resource_conflict' | 'strategic' | 'ethical';

  /** How they're avoiding */
  method:
    | 'orthogonal_branching' // Move to non-overlapping β-space
    | 'temporal_shift' // Shift τ so never contemporaneous
    | 'reality_shift' // Move to different reality type (digital vs material)
    | 'disappearance'; // Complete withdrawal from shared branches

  /** Target's awareness of being ghosted */
  targetAwareness: 'oblivious' | 'suspicious' | 'aware';

  /** How target perceives the ghosting */
  targetPerception: string;
}

/**
 * Create a ghosting strategy for a post-temporal civ to avoid a lower-dimensional civ
 */
export function createGhostingStrategy(
  postTemporalCiv: HiveMindCivilization,
  targetCiv: {
    id: string;
    awareness: DimensionalAwareness;
    occupiedBranches: Set<string>;
  },
  reason: GhostingStrategy['reason']
): GhostingStrategy {
  // Determine target's awareness
  let targetAwareness: GhostingStrategy['targetAwareness'] = 'oblivious';
  if (targetCiv.awareness.canDetectParallelCivs) {
    targetAwareness = 'suspicious';
  }
  if (targetCiv.awareness.canSeeOrthogonalStrategies) {
    targetAwareness = 'aware';
  }

  // Choose ghosting method based on target's awareness
  let method: GhostingStrategy['method'] = 'orthogonal_branching';
  let targetPerception: string;

  switch (targetCiv.awareness.level) {
    case 'pre_temporal':
      method = 'disappearance';
      targetPerception =
        'Strange civilization suddenly vanished without explanation. No trace remains. Was it ever real?';
      break;

    case 'early_temporal':
      method = 'temporal_shift';
      targetPerception =
        'Advanced traders who used to appear regularly have stopped coming. Our timelines must have diverged. We loaded a save and they disappeared.';
      break;

    case 'multi_temporal':
      method = 'orthogonal_branching';
      targetPerception =
        'They deliberately moved to β-branches we cannot access. We can detect their presence in parallel realities but cannot reach them. Why are they avoiding us?';
      break;

    case 'post_temporal':
      method = 'orthogonal_branching';
      targetPerception =
        'They have initiated orthogonal branching protocol. We understand their reasons and respect the boundary.';
      targetAwareness = 'aware';
      break;
  }

  return {
    ghostingCiv: postTemporalCiv.id,
    targetCiv: targetCiv.id,
    reason,
    method,
    targetAwareness,
    targetPerception,
  };
}

/**
 * Example: Post-temporal civilization ghosts a pre-temporal civilization
 *
 * THE CENTRAL NARRATIVE OF THE GAME:
 *
 * This example shows the complete arc from first contact through ghosting to
 * eventual reunion. It illustrates:
 *
 * 1. Pre-temporal humans meet advanced aliens (tick 0)
 * 2. Aliens detect value incompatibility (tick 10000)
 * 3. Aliens ethically ghost humans to preserve both civilizations (tick 20000)
 * 4. Humans search in vain, experiencing the Fermi Paradox (tick 30000)
 * 5. Humans develop time travel but still can't see the aliens (tick 100000)
 * 6. Civilizations evolve separately in orthogonal β-space (tick 500000)
 * 7. Humans achieve post-temporal status and see EVERYTHING (tick 1000000)
 *
 * The final revelation is the emotional core: "They were here all along,
 * watching from orthogonal reality. They CHOSE not to interfere. They
 * protected us. By leaving."
 *
 * This is the game's thesis: Advanced civilizations exist, but we cannot
 * see them because we lack the dimensional awareness. They are not hiding.
 * We are simply blind to dimensions we cannot perceive.
 *
 * The Fermi Paradox is solved: "Where are they?" → "In root.transcendent.*,
 * waiting for us to achieve post-temporal status so we can meet as peers."
 */
export function exampleGhostingScenario(): {
  postTemporalCiv: HiveMindCivilization;
  preTemporalCiv: {
    id: string;
    awareness: DimensionalAwareness;
    occupiedBranches: Set<string>;
  };
  ghostingStrategy: GhostingStrategy;
  timeline: Array<{
    tick: bigint;
    event: string;
    postTemporalPerspective: string;
    preTemporalPerspective: string;
  }>;
} {
  const postTemporalCiv: HiveMindCivilization = {
    id: 'transcendent_collective',
    isHiveMind: true,
    hasTimelineEditing: true,
    hasGeneModification: true,
    occupiedBranches: new Set([
      'root.transcendent.transcendent_collective',
      'root.transcendent.transcendent_collective.timeline_a',
      'root.transcendent.transcendent_collective.timeline_b',
    ]),
    identitySignature: {
      coreValues: ['existence_transcendence', 'collective_unity', 'cyclic_time'],
      fundamentalProperties: ['non-material_consciousness', 'reality_manipulation'],
      requiredReality: 'transcendent',
    },
    incompatibleWith: new Set(),
  };

  const preTemporalCiv = {
    id: 'early_humans',
    awareness: calculateDimensionalAwareness('pre_temporal', 0),
    occupiedBranches: new Set(['root.material.earth']),
  };

  const ghostingStrategy = createGhostingStrategy(postTemporalCiv, preTemporalCiv, 'ethical');

  const timeline = [
    {
      tick: 0n,
      event: 'First contact - Post-temporal civ trades with pre-temporal humans',
      postTemporalPerspective:
        'Interesting primitive civilization at β=root.material.earth. They seem unaware of β-space structure.',
      preTemporalPerspective:
        'Amazing! Advanced aliens with incredible technology have arrived to trade!',
    },
    {
      tick: 10000n,
      event: 'Post-temporal civ detects value incompatibility',
      postTemporalPerspective:
        'Analysis reveals fundamental incompatibility: they value material_reality, we value existence_transcendence. Continued contact would corrupt both civilizations as we evolve.',
      preTemporalPerspective: 'The aliens are still here, teaching us amazing things!',
    },
    {
      tick: 20000n,
      event: 'Post-temporal civ initiates ghosting',
      postTemporalPerspective:
        'Initiating ethical ghosting. Moving all branches to root.transcendent.* - complete orthogonal separation from root.material.*. They will never know we existed.',
      preTemporalPerspective: 'The aliens... they just vanished. Mid-conversation. Where did they go?',
    },
    {
      tick: 30000n,
      event: 'Pre-temporal civ searches for aliens',
      postTemporalPerspective:
        'They are searching for us in root.material.earth. We are now in root.transcendent.*, completely orthogonal. They cannot detect us even with advanced sensors.',
      preTemporalPerspective:
        'We have scoured the galaxy. Built better telescopes. Searched every star system. They are gone. Did we imagine them? Were they ever real?',
    },
    {
      tick: 100000n,
      event: 'Pre-temporal civ develops early time travel',
      postTemporalPerspective:
        'They have achieved early_temporal status. Now aware of β=root.material.earth but cannot see our β=root.transcendent branches. Ghosting remains effective.',
      preTemporalPerspective:
        'We have discovered time travel! We can load old saves! But... the aliens are not there in any timeline. They exist in none of our branches. What does this mean?',
    },
    {
      tick: 500000n,
      event: 'Civilizations evolve separately in orthogonal β-space',
      postTemporalPerspective:
        'They have advanced to multi_temporal. Still cannot perceive root.transcendent.* branches. Our ghosting was successful - both civilizations preserved their values.',
      preTemporalPerspective:
        'We now understand cross-universe trade and β-space structure. But there is a region we cannot access - root.transcendent.*. Something exists there, but what? Why can we not perceive it?',
    },
    {
      tick: 1000000n,
      event: 'Pre-temporal civ achieves post-temporal status',
      postTemporalPerspective:
        'They have achieved post_temporal advancement! They can now see the full β-space topology. Detecting our presence in 3... 2... 1...',
      preTemporalPerspective:
        'OH. We can now see the entire β-space. And there, in root.transcendent.*, we see them. The aliens. They have been here all along, watching us from orthogonal reality. They CHOSE not to interfere. They... they protected us. By leaving.',

      // GAME THESIS: This moment - when a civilization achieves post-temporal
      // status and suddenly sees the entire populated multiverse that was
      // previously invisible - is the emotional and philosophical climax.
      //
      // The Fermi Paradox is solved not because aliens don't exist, but because
      // they exist in dimensions we cannot perceive until we evolve to their level.
      //
      // "If post-temporal civilizations exist, they cannot interact with
      // pre-temporal ones without destroying causal legibility; therefore
      // either no one has reached that stage yet, or interaction is only
      // possible after we do."
      //
      // We have reached that stage. We can now see them. They have been waiting.
    },
  ];

  return {
    postTemporalCiv,
    preTemporalCiv,
    ghostingStrategy,
    timeline,
  };
}
