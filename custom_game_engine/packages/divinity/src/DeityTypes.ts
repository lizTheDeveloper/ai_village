/**
 * DeityTypes - Core deity entity types
 *
 * Deities are emergent entities that exist because mortals believe in them.
 * Their identity is defined by their believers, not pre-designed.
 */

import type { DeityBeliefState } from './BeliefTypes.js';
import type { AfterlifePolicy } from './AfterlifePolicy.js';

// ============================================================================
// Divine Domains
// ============================================================================

/** Domains a deity can be associated with */
export type DivineDomain =
  | 'harvest'      // Crops, fertility, abundance
  | 'war'          // Conflict, strength, victory
  | 'wisdom'       // Knowledge, guidance, learning
  | 'craft'        // Creation, building, artisanship
  | 'nature'       // Animals, plants, wilderness
  | 'death'        // Afterlife, endings, ancestors
  | 'love'         // Relationships, bonds, passion
  | 'chaos'        // Change, unpredictability, freedom
  | 'order'        // Law, stability, structure
  | 'fortune'      // Luck, prosperity, chance
  | 'protection'   // Safety, defense, guardianship
  | 'healing'      // Health, restoration, medicine
  | 'mystery'      // Unknown, magic, secrets
  | 'time'         // Seasons, cycles, aging
  | 'sky'          // Weather, celestial bodies
  | 'earth'        // Stone, mountains, underground
  | 'water'        // Seas, rivers, rain
  | 'fire'         // Flame, forge, destruction
  | 'storm'        // Lightning, thunder, tempests
  | 'hunt'         // Tracking, predation, survival
  | 'home'         // Hearth, family, domesticity
  | 'travel'       // Journeys, roads, exploration
  | 'trade'        // Commerce, deals, wealth
  | 'justice'      // Fairness, truth, punishment
  | 'vengeance'    // Retribution, grudges
  | 'dreams'       // Sleep, visions, prophecy
  | 'fear'         // Terror, nightmares
  | 'beauty'       // Art, aesthetics, attraction
  | 'trickery';    // Deception, cunning, mischief

// ============================================================================
// Deity Identity
// ============================================================================

/** The perceived personality of a deity (as believers see them) */
export interface PerceivedPersonality {
  /** Benevolent (-1 cruel) to (1 kind) */
  benevolence: number;

  /** Distant (-1) to Involved (1) - how much they intervene */
  interventionism: number;

  /** Patient (0) to Quick to anger (1) */
  wrathfulness: number;

  /** Clear (0) to Inscrutable (1) */
  mysteriousness: number;

  /** Demanding (0) to Giving (1) */
  generosity: number;

  /** Capricious (0) to Reliable (1) */
  consistency: number;

  /** Playful (0) to Stern (1) */
  seriousness: number;

  /** Indifferent (0) to Caring deeply (1) */
  compassion: number;
}

/** Moral alignment as perceived by believers */
export type MoralAlignment =
  | 'benevolent'    // Perceived as good
  | 'malevolent'    // Perceived as evil
  | 'neutral'       // Perceived as beyond morality
  | 'dualistic'     // Perceived as both good and evil
  | 'unknown';      // Not enough data yet

/** Physical form as described by believers */
export interface DescribedForm {
  /** Primary description */
  description: string;

  /** Typical height (relative: towering, human, small, varies) */
  height: 'towering' | 'tall' | 'human' | 'small' | 'varies';

  /** How solid they appear */
  solidity: 'ghostly' | 'translucent' | 'solid' | 'varies';

  /** Do they glow? */
  luminosity: 'none' | 'subtle' | 'bright' | 'blinding';

  /** Distinctive features believers describe */
  distinctiveFeatures: string[];

  /** Aura color if any */
  auraColor?: string;

  /** Animal associations */
  animalAspects?: string[];

  /** Plant associations */
  plantAspects?: string[];

  /** Elemental associations */
  elementalAspects?: string[];
}

/** The emergent identity of a deity */
export interface DeityIdentity {
  /** Primary name (first name given by believers) */
  primaryName: string;

  /** Alternative names and epithets */
  epithets: string[];

  /** Primary domain */
  domain: DivineDomain;

  /** Secondary domains (accumulated through stories) */
  secondaryDomains: DivineDomain[];

  /** Personality as perceived by believers */
  perceivedPersonality: PerceivedPersonality;

  /** Moral alignment as perceived */
  perceivedAlignment: MoralAlignment;

  /** Physical form as described */
  describedForm: DescribedForm;

  /** Sacred symbols associated with deity */
  symbols: string[];

  /** Sacred colors */
  colors: string[];

  /** Sacred animals */
  sacredAnimals: string[];

  /** Sacred plants */
  sacredPlants: string[];

  /** Sacred locations (place types, not specific sites) */
  sacredPlaceTypes: string[];

  /** How established is each identity aspect? (trait -> confidence 0-1) */
  traitConfidence: Map<string, number>;

  /** Was this identity initially blank? (player god) */
  initiallyBlank: boolean;
}

// ============================================================================
// Deity Controller
// ============================================================================

/** Who controls this deity's actions */
export type DeityController =
  | 'player'        // Controlled by the player
  | 'ai'            // Controlled by LLM
  | 'dormant';      // Too weak to act, no controller

// ============================================================================
// Deity Origin
// ============================================================================

/** How a deity came into existence */
export type DeityOrigin =
  | 'player'                // The player god (unique)
  | 'shared_trauma'         // Emerged from collective hardship
  | 'shared_prosperity'     // Emerged from collective success
  | 'natural_phenomenon'    // Emerged from recurring natural events
  | 'cultural_divergence'   // Split from existing religion
  | 'prophet_vision'        // Charismatic agent claimed revelation
  | 'ancestor_elevation'    // Deceased hero elevated to divinity
  | 'fear_manifestation'    // Emerged from collective fear
  | 'artistic_creation'     // Artist created compelling deity in fiction
  | 'schism'                // Split from another deity's faith
  | 'syncretism';           // Merged from multiple deities

/** Emergence state for proto-deities */
export type EmergencePhase =
  | 'proto_belief'          // Scattered superstitions, no coherent entity
  | 'coalescence'           // Beliefs starting to unite around concept
  | 'crystallization'       // Entity forming, getting name
  | 'establishment';        // Full deity, accumulating power

// ============================================================================
// Deity Entity
// ============================================================================

/** The core deity entity */
export interface Deity {
  /** Unique identifier */
  id: string;

  /** Entity type marker */
  entityType: 'deity';

  // ========================================
  // Identity (emergent, not designed)
  // ========================================
  identity: DeityIdentity;

  // ========================================
  // Origin
  // ========================================
  origin: DeityOrigin;
  originDetails?: string;
  crystallizedAt: number;           // Game tick when fully formed
  emergedFrom?: string[];           // Agent IDs of first believers

  // ========================================
  // Belief & Power
  // ========================================
  belief: DeityBeliefState;

  // ========================================
  // Believers
  // ========================================
  believerIds: string[];            // Agent IDs of current believers
  believerCount: number;
  priestIds: string[];              // Agent IDs with priest role
  prophetIds: string[];             // Agent IDs who receive visions

  // ========================================
  // Divine Agents
  // ========================================
  angelIds: string[];               // Entity IDs of angels

  // ========================================
  // Sacred Sites
  // ========================================
  templeIds: string[];              // Building IDs of temples
  sacredSiteIds: string[];          // Location IDs of sacred sites

  // ========================================
  // Ruled Realms
  // ========================================
  ruledRealmIds: string[];          // Realm IDs this deity controls (e.g., their afterlife)

  // ========================================
  // Afterlife Policy
  // ========================================
  afterlifePolicy?: AfterlifePolicy;  // How this deity handles deceased believers

  // ========================================
  // Mythology
  // ========================================
  mythIds: string[];                // IDs of myths about this deity
  canonicalTextIds: string[];       // IDs of holy texts

  // ========================================
  // Avatar
  // ========================================
  avatarActive: boolean;
  avatarEntityId?: string;          // Entity ID of manifested avatar

  // ========================================
  // Relationships
  // ========================================
  pantheonId?: string;              // Which pantheon they belong to
  relationshipIds: string[];        // IDs of divine relationships

  // ========================================
  // Control
  // ========================================
  controller: DeityController;

  // ========================================
  // State
  // ========================================
  isActive: boolean;                // Can take actions
  isFading: boolean;                // Losing power, may disappear
  isDormant: boolean;               // Exists but can't act
}

// ============================================================================
// Player God Extension
// ============================================================================

/** Additional state for the player-controlled god */
export interface PlayerGodState {
  /** Reference to deity */
  deityId: string;

  /** Player input state */
  pendingPrayers: string[];         // Prayer IDs waiting for response
  recentVisions: string[];          // Recent visions sent
  recentMiracles: string[];         // Recent miracles performed

  /** Bio screen state */
  viewedIdentityAt?: number;
  identityChangesUnviewed: number;

  /** Tutorial/progression */
  hasSeenFirstPrayer: boolean;
  hasPerformedFirstMiracle: boolean;
  hasSentFirstVision: boolean;
  hasMetAnotherGod: boolean;
}

// ============================================================================
// Believer Relation
// ============================================================================

/** A deity's relationship with a specific believer */
export interface BelieverRelation {
  /** Agent ID */
  agentId: string;

  /** How much faith they have */
  faith: number;

  /** How long they've been a believer */
  faithSince: number;

  /** Their role in the faith */
  role: 'believer' | 'devout' | 'priest' | 'prophet' | 'champion' | 'saint';

  /** Prayers sent */
  prayerCount: number;

  /** Prayers answered */
  answeredPrayerCount: number;

  /** Have they witnessed a miracle? */
  miracleWitness: boolean;

  /** Have they received a vision? */
  visionRecipient: boolean;

  /** Their importance to the faith */
  significance: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

/** Create default perceived personality */
export function createDefaultPersonality(): PerceivedPersonality {
  return {
    benevolence: 0,
    interventionism: 0,
    wrathfulness: 0,
    mysteriousness: 0.5,
    generosity: 0,
    consistency: 0,
    seriousness: 0.5,
    compassion: 0,
  };
}

/** Create empty deity identity (for player god starting as blank slate) */
export function createBlankIdentity(name: string = 'The Unknown'): DeityIdentity {
  return {
    primaryName: name,
    epithets: [],
    domain: 'mystery',
    secondaryDomains: [],
    perceivedPersonality: createDefaultPersonality(),
    perceivedAlignment: 'unknown',
    describedForm: {
      description: 'A presence yet undefined',
      height: 'varies',
      solidity: 'varies',
      luminosity: 'subtle',
      distinctiveFeatures: [],
    },
    symbols: [],
    colors: [],
    sacredAnimals: [],
    sacredPlants: [],
    sacredPlaceTypes: [],
    traitConfidence: new Map(),
    initiallyBlank: true,
  };
}

/** Create deity identity from emergence data */
export function createEmergentIdentity(
  name: string,
  _origin: DeityOrigin,
  primaryDomain: DivineDomain,
  personality: Partial<PerceivedPersonality> = {}
): DeityIdentity {
  return {
    primaryName: name,
    epithets: [],
    domain: primaryDomain,
    secondaryDomains: [],
    perceivedPersonality: {
      ...createDefaultPersonality(),
      ...personality,
    },
    perceivedAlignment: 'unknown',
    describedForm: {
      description: '',
      height: 'varies',
      solidity: 'varies',
      luminosity: 'subtle',
      distinctiveFeatures: [],
    },
    symbols: [],
    colors: [],
    sacredAnimals: [],
    sacredPlants: [],
    sacredPlaceTypes: [],
    traitConfidence: new Map([['domain', 0.3]]),
    initiallyBlank: false,
  };
}
