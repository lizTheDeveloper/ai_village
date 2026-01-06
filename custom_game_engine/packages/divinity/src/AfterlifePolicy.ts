/**
 * AfterlifePolicy - Defines how a deity handles souls of deceased believers
 *
 * Different deities have different policies:
 * - Judgment: Evaluate souls against criteria (deeds, devotion, law)
 * - Reincarnation: Return souls to mortal life
 * - Unconditional: All souls go to same destination
 * - Annihilation: Souls cease to exist (absorbed into deity)
 *
 * This enables moral relativism - there's no universal "good/evil",
 * only how each deity evaluates actions from their perspective.
 */

// ============================================================================
// Policy Types
// ============================================================================

/** The fundamental approach to handling deceased souls */
export type AfterlifePolicyType =
  | 'judgment'        // Evaluate soul, route to tiered destinations
  | 'reincarnation'   // Return soul to mortal life
  | 'unconditional'   // All believers go to same place
  | 'annihilation'    // Soul ceases to exist
  | 'transformation'; // Soul becomes something else (angel, demon, etc.)

/** How judgment-based policies evaluate souls */
export type JudgmentCriteria =
  | 'deed_ledger'     // Evaluate actions against deity's values
  | 'devotion'        // How faithful/devoted were they?
  | 'law_compliance'  // Did they follow deity's taboos?
  | 'final_act'       // Only death circumstances matter (died bravely, etc.)
  | 'sacrifice'       // What did they give up for the deity?
  | 'legacy'          // What did they leave behind? (children, works, etc.)
  | 'custom';         // Deity-specific evaluation

/** Judgment outcome tiers */
export type JudgmentTier =
  | 'exemplary'       // Best of the best
  | 'favorable'       // Good standing
  | 'neutral'         // Default/average
  | 'unfavorable'     // Failed expectations
  | 'condemned';      // Worst offenders

// ============================================================================
// Reincarnation Configuration
// ============================================================================

/** Where reincarnated souls can be sent */
export type ReincarnationTarget =
  | 'same_world'      // Same planet/world
  | 'same_universe'   // Same universe, any world
  | 'any_universe'    // Could go anywhere in the multiverse
  | 'specific';       // Specific world ID

/** How much the soul remembers after reincarnation */
export type MemoryRetention =
  | 'full'            // Complete memories (rare, special cases)
  | 'fragments'       // Occasional flashes, deja vu
  | 'dreams'          // Only appears in dreams
  | 'talents'         // No memories, but skills/aptitudes carry over
  | 'none';           // Complete blank slate

/** What form the reincarnated soul takes */
export type SpeciesConstraint =
  | 'same'            // Must be same species
  | 'similar'         // Same category (humanoid, beast, etc.)
  | 'any'             // Any sentient species
  | 'karmic';         // Based on deeds (good = higher, bad = lower)

/** Configuration for reincarnation policy */
export interface ReincarnationConfig {
  /** Where the soul can be reborn */
  target: ReincarnationTarget;

  /** Specific world ID if target is 'specific' */
  targetWorldId?: string;

  /** How much memory carries over */
  memoryRetention: MemoryRetention;

  /** What species they can become */
  speciesConstraint: SpeciesConstraint;

  /** Minimum ticks before rebirth (time in limbo) */
  minimumDelay: number;

  /** Maximum ticks before rebirth */
  maximumDelay: number;

  /** Whether the soul can refuse reincarnation */
  canRefuse: boolean;

  /** What happens if they refuse (realm ID or 'annihilation') */
  refusalDestination?: string;
}

// ============================================================================
// Transformation Configuration
// ============================================================================

/** What a soul can transform into */
export type TransformationType =
  | 'angel'           // Becomes servant of the deity
  | 'demon'           // Becomes adversarial entity
  | 'nature_spirit'   // Becomes kami/spirit of place
  | 'ancestor_kami'   // Becomes protective ancestor (already implemented)
  | 'elemental'       // Becomes elemental being
  | 'dream_entity'    // Becomes dream realm inhabitant
  | 'star'            // Becomes celestial body
  | 'custom';         // Deity-specific transformation

/** Configuration for transformation policy */
export interface TransformationConfig {
  /** What the soul becomes */
  transformationType: TransformationType;

  /** Criteria for transformation (who qualifies) */
  criteria: JudgmentCriteria;

  /** Minimum judgment tier required */
  minimumTier: JudgmentTier;

  /** Where the transformed entity resides */
  destinationRealm?: string;

  /** Alternative for those who don't qualify */
  alternativePolicy?: AfterlifePolicyType;
}

// ============================================================================
// Deed Weights
// ============================================================================

/** Categories of deeds that can be tracked */
export type DeedCategory =
  // Violence
  | 'killing_enemy'
  | 'killing_innocent'
  | 'killing_kin'
  | 'combat_victory'
  | 'combat_cowardice'
  // Social
  | 'oath_keeping'
  | 'oath_breaking'
  | 'hospitality_given'
  | 'hospitality_violated'
  | 'betrayal'
  | 'loyalty'
  // Religious
  | 'prayer'
  | 'sacrifice'
  | 'shrine_building'
  | 'taboo_violation'
  | 'proselytizing'
  // Creation/Destruction
  | 'creation'
  | 'destruction'
  | 'healing'
  | 'harm'
  // Legacy
  | 'children_raised'
  | 'knowledge_shared'
  | 'art_created'
  // Other
  | 'custom';

/** How a deity values different deed categories */
export interface DeedWeight {
  category: DeedCategory;
  /** Positive = deity approves, negative = deity disapproves */
  weight: number;
  /** Custom category name if category is 'custom' */
  customName?: string;
}

// ============================================================================
// Main Policy Interface
// ============================================================================

/** Complete afterlife policy for a deity */
export interface AfterlifePolicy {
  /** The fundamental approach */
  type: AfterlifePolicyType;

  /** Human-readable description of this policy */
  description?: string;

  // =========================================================================
  // Judgment Configuration (for type: 'judgment')
  // =========================================================================

  /** How souls are evaluated */
  judgmentCriteria?: JudgmentCriteria;

  /** How the deity weights different deeds */
  deedWeights?: DeedWeight[];

  /** Realm destinations for each judgment tier */
  destinations?: Partial<Record<JudgmentTier, string>>;

  /** Thresholds for judgment tiers (deed score ranges) */
  tierThresholds?: {
    exemplary: number;    // Score >= this = exemplary
    favorable: number;    // Score >= this = favorable
    unfavorable: number;  // Score <= this = unfavorable
    condemned: number;    // Score <= this = condemned
    // Between unfavorable and favorable = neutral
  };

  // =========================================================================
  // Reincarnation Configuration (for type: 'reincarnation')
  // =========================================================================

  reincarnation?: ReincarnationConfig;

  // =========================================================================
  // Transformation Configuration (for type: 'transformation')
  // =========================================================================

  transformation?: TransformationConfig;

  // =========================================================================
  // Unconditional Configuration (for type: 'unconditional')
  // =========================================================================

  /** Single destination for all souls (for type: 'unconditional') */
  unconditionalDestination?: string;

  // =========================================================================
  // Fallback
  // =========================================================================

  /** What happens to non-believers who die (usually default underworld) */
  nonBelieverPolicy?: 'default_underworld' | 'same_as_believers' | 'annihilation';
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a judgment-based afterlife policy
 */
export function createJudgmentPolicy(
  criteria: JudgmentCriteria,
  deedWeights: DeedWeight[],
  destinations: Partial<Record<JudgmentTier, string>>,
  options?: {
    tierThresholds?: AfterlifePolicy['tierThresholds'];
    description?: string;
  }
): AfterlifePolicy {
  return {
    type: 'judgment',
    judgmentCriteria: criteria,
    deedWeights,
    destinations,
    tierThresholds: options?.tierThresholds ?? {
      exemplary: 100,
      favorable: 25,
      unfavorable: -25,
      condemned: -100,
    },
    description: options?.description,
    nonBelieverPolicy: 'default_underworld',
  };
}

/**
 * Create a reincarnation-based afterlife policy
 */
export function createReincarnationPolicy(
  config: ReincarnationConfig,
  options?: {
    description?: string;
  }
): AfterlifePolicy {
  return {
    type: 'reincarnation',
    reincarnation: config,
    description: options?.description,
    nonBelieverPolicy: 'default_underworld',
  };
}

/**
 * Create an unconditional afterlife policy (all go to same place)
 */
export function createUnconditionalPolicy(
  destinationRealm: string,
  options?: {
    description?: string;
    nonBelieverPolicy?: AfterlifePolicy['nonBelieverPolicy'];
  }
): AfterlifePolicy {
  return {
    type: 'unconditional',
    unconditionalDestination: destinationRealm,
    description: options?.description,
    nonBelieverPolicy: options?.nonBelieverPolicy ?? 'default_underworld',
  };
}

/**
 * Create an annihilation policy (souls cease to exist)
 */
export function createAnnihilationPolicy(
  options?: {
    description?: string;
  }
): AfterlifePolicy {
  return {
    type: 'annihilation',
    description: options?.description ?? 'Souls are absorbed into the deity and cease to exist as individuals',
    nonBelieverPolicy: 'default_underworld',
  };
}

/**
 * Create a transformation-based afterlife policy
 */
export function createTransformationPolicy(
  config: TransformationConfig,
  options?: {
    description?: string;
  }
): AfterlifePolicy {
  return {
    type: 'transformation',
    transformation: config,
    description: options?.description,
    nonBelieverPolicy: 'default_underworld',
  };
}

// ============================================================================
// Example Policies
// ============================================================================

/** War god policy - judges by bravery and combat */
export const WAR_GOD_POLICY: AfterlifePolicy = createJudgmentPolicy(
  'deed_ledger',
  [
    { category: 'combat_victory', weight: 10 },
    { category: 'killing_enemy', weight: 5 },
    { category: 'combat_cowardice', weight: -50 },
    { category: 'loyalty', weight: 20 },
    { category: 'betrayal', weight: -30 },
  ],
  {
    exemplary: 'valhalla',      // Great warriors feast eternally
    favorable: 'warriors_rest', // Honored dead
    neutral: 'gray_fields',     // Unremarkable afterlife
    unfavorable: 'shame_pits',  // Cowards
    condemned: 'forgotten',     // Traitors erased from memory
  },
  { description: 'Warriors are judged by their courage and loyalty in battle' }
);

/** Nature deity policy - reincarnation cycle */
export const NATURE_DEITY_POLICY: AfterlifePolicy = createReincarnationPolicy(
  {
    target: 'same_world',
    memoryRetention: 'talents',
    speciesConstraint: 'karmic',  // Good stewards reborn higher
    minimumDelay: 1000,
    maximumDelay: 10000,
    canRefuse: false,
  },
  { description: 'All souls return to the cycle of life' }
);

/** Mystery god policy - all believers go to same enigmatic realm */
export const MYSTERY_GOD_POLICY: AfterlifePolicy = createUnconditionalPolicy(
  'the_unknown',
  { description: 'What happens after death is unknowable, even to the faithful' }
);

/** Cosmic horror policy - absorption */
export const COSMIC_HORROR_POLICY: AfterlifePolicy = createAnnihilationPolicy({
  description: 'Souls dissolve into the infinite consciousness of the Outer God',
});
