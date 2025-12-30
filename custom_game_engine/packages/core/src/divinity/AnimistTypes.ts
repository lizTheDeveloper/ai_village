/**
 * AnimistTypes - Shinto-style kami and animist nature spirits
 *
 * These spirits differ fundamentally from Western anthropomorphic gods:
 * - Location/object bound rather than domain-based
 * - Non-anthropomorphic (often invisible or manifest as nature)
 * - Relationship-based rather than worship-based
 * - Can be countless in number (every notable thing may have a spirit)
 * - Neither good nor evil - behavior depends on treatment
 * - Require offerings and respect rather than prayer
 * - Sensitive to pollution and improper behavior
 */

// ============================================================================
// Spirit Categories
// ============================================================================

/** The fundamental type of spirit */
export type SpiritCategory =
  | 'place_spirit'        // Bound to a location (mountain, river, forest)
  | 'object_spirit'       // Bound to a specific object (ancient tree, notable rock)
  | 'ancestor_spirit'     // Spirit of a deceased person
  | 'phenomenon_spirit'   // Spirit of natural phenomena (wind, rain, fire)
  | 'concept_spirit'      // Abstract concept (fertility, fortune, craftsmanship)
  | 'collective_spirit'   // Spirit of a group/community/place's essence
  | 'guardian_spirit'     // Protective spirit assigned to person/family/place
  | 'wild_spirit';        // Untethered, wandering spirit

/** Specific dwelling types for place spirits */
export type DwellingType =
  // Terrain features
  | 'mountain'
  | 'hill'
  | 'valley'
  | 'cave'
  | 'cliff'
  | 'boulder'
  | 'rock_formation'
  // Water features
  | 'river'
  | 'stream'
  | 'waterfall'
  | 'spring'
  | 'lake'
  | 'pond'
  | 'ocean'
  | 'well'
  // Vegetation
  | 'forest'
  | 'grove'
  | 'ancient_tree'
  | 'sacred_tree'
  | 'flowering_tree'
  | 'bamboo_grove'
  // Human structures
  | 'crossroads'
  | 'bridge'
  | 'gate'
  | 'threshold'
  | 'hearth'
  | 'boundary_marker'
  | 'shrine'
  // Agricultural
  | 'field'
  | 'paddy'
  | 'orchard'
  | 'granary'
  // Liminal spaces
  | 'forest_edge'
  | 'shoreline'
  | 'twilight_place';    // Places between day and night

/** Object types that can house spirits */
export type SpiritObjectType =
  | 'ancient_tree'        // Very old trees develop spirits
  | 'notable_rock'        // Unusually shaped or positioned rocks
  | 'old_tool'            // Well-used tools gain spirits (tsukumogami)
  | 'mirror'              // Mirrors attract and hold spirits
  | 'sword'               // Weapons with history
  | 'musical_instrument'  // Instruments played with devotion
  | 'mask'                // Ritual masks
  | 'statue'              // Carved representations
  | 'vessel'              // Containers, especially for rice/sake
  | 'rope'                // Sacred ropes (shimenawa)
  | 'paper'               // Paper offerings (shide)
  | 'natural_oddity';     // Unusual natural formations

/** Phenomenon types */
export type PhenomenonType =
  | 'wind'
  | 'rain'
  | 'thunder'
  | 'lightning'
  | 'snow'
  | 'mist'
  | 'rainbow'
  | 'earthquake'
  | 'fire'
  | 'seasonal_change'
  | 'sunrise'
  | 'sunset'
  | 'tide'
  | 'aurora';

// ============================================================================
// Spirit Power Level
// ============================================================================

/** Spirit magnitude - how significant/powerful the spirit is */
export type SpiritMagnitude =
  | 'minor'               // Small local spirit (single tree, small stream)
  | 'local'               // Known to a village (grove spirit, hill kami)
  | 'regional'            // Known across a region (river spirit, mountain kami)
  | 'great'               // Major spirit (great mountain, major river)
  | 'primal';             // Ancient, fundamental spirit (ocean, sky, earth)

/** Power thresholds for spirit magnitudes */
export const SPIRIT_MAGNITUDE_THRESHOLDS = {
  minor: 0,
  local: 50,
  regional: 200,
  great: 1000,
  primal: 5000,
} as const;

/** Get magnitude for given respect level */
export function getMagnitudeForRespect(respect: number): SpiritMagnitude {
  if (respect >= SPIRIT_MAGNITUDE_THRESHOLDS.primal) return 'primal';
  if (respect >= SPIRIT_MAGNITUDE_THRESHOLDS.great) return 'great';
  if (respect >= SPIRIT_MAGNITUDE_THRESHOLDS.regional) return 'regional';
  if (respect >= SPIRIT_MAGNITUDE_THRESHOLDS.local) return 'local';
  return 'minor';
}

// ============================================================================
// Spirit Disposition
// ============================================================================

/** How a spirit feels toward mortals (not moral alignment) */
export type SpiritDisposition =
  | 'benign'              // Generally helpful when respected
  | 'indifferent'         // Doesn't care about mortals
  | 'territorial'         // Protective of their domain
  | 'capricious'          // Mood changes unpredictably
  | 'demanding'           // Requires frequent attention
  | 'shy'                 // Avoids contact
  | 'curious'             // Interested in mortal affairs
  | 'wrathful'            // Currently angered
  | 'playful'             // Enjoys tricks (not malicious)
  | 'solemn'              // Serious, dignified
  | 'hungry';             // Needs offerings (dangerous if neglected)

/** What can shift a spirit's disposition */
export interface DispositionFactors {
  /** Base disposition (innate nature) */
  baseDisposition: SpiritDisposition;

  /** Current disposition (can differ from base) */
  currentDisposition: SpiritDisposition;

  /** Accumulated respect from offerings (can be negative) */
  respectLevel: number;

  /** Has their dwelling been damaged? */
  dwellingDamaged: boolean;

  /** Has their area been polluted? */
  pollutionLevel: number;

  /** Have proper rituals been performed? */
  ritualDebt: number;

  /** Time since last acknowledgment */
  neglectDuration: number;

  /** Recent positive/negative interactions */
  recentInteractions: SpiritInteraction[];
}

/** An interaction between mortal and spirit */
export interface SpiritInteraction {
  type: SpiritInteractionType;
  agentId: string;
  timestamp: number;
  respectChange: number;
  details?: string;
}

export type SpiritInteractionType =
  // Positive
  | 'offering_given'      // Left an offering
  | 'ritual_performed'    // Performed proper ritual
  | 'dwelling_cleaned'    // Cleaned/maintained dwelling
  | 'boundary_respected'  // Respected sacred boundary
  | 'prayer_offered'      // Simple acknowledgment
  | 'festival_held'       // Community celebration
  | 'story_told'          // Spread knowledge of spirit
  // Negative
  | 'offering_neglected'  // Failed to give expected offering
  | 'dwelling_damaged'    // Damaged dwelling
  | 'pollution_caused'    // Polluted sacred area
  | 'disrespect_shown'    // Showed disrespect
  | 'boundary_violated'   // Crossed forbidden boundary
  | 'name_misused'        // Used name improperly
  | 'forgotten';          // Simply forgotten

// ============================================================================
// Spirit Identity
// ============================================================================

/** How spirits are named (differs from deity naming) */
export interface SpiritNaming {
  /** Descriptive name based on location/object (e.g., "Spirit of the Old Oak") */
  descriptiveName: string;

  /** Given name if one was bestowed by mortals */
  givenName?: string;

  /** Title/honorific (e.g., "-sama", "-dono", "Great") */
  honorific?: string;

  /** Alternative names */
  alternateNames: string[];

  /** Is the true name known? (Knowing it grants power) */
  trueNameKnown: boolean;
  trueName?: string;
}

/** Visual/perceptual manifestation of spirit */
export interface SpiritManifestation {
  /** How the spirit typically appears (if at all) */
  primaryForm: SpiritFormType;

  /** Can the spirit be seen by ordinary mortals? */
  visibilityLevel: 'invisible' | 'glimpsed' | 'visible' | 'obvious';

  /** Description of appearance when manifested */
  description: string;

  /** Signs of presence (rustling leaves, cold spots, etc.) */
  presenceSigns: string[];

  /** Can take animal form? */
  animalForms: string[];

  /** Sounds associated with spirit */
  soundSigns: string[];

  /** Size relative to natural dwelling */
  manifestedSize: 'tiny' | 'small' | 'natural' | 'large' | 'immense';
}

export type SpiritFormType =
  | 'invisible'           // Never manifests visibly
  | 'natural_phenomenon'  // Appears as wind, light, etc.
  | 'animal'              // Takes animal form
  | 'humanoid'            // Human-like appearance
  | 'hybrid'              // Mix of human and animal/nature
  | 'abstract'            // Geometric, light patterns
  | 'dwelling_animated'   // The dwelling itself moves/speaks
  | 'orb'                 // Ball of light (hitodama)
  | 'shadow'              // Dark presence
  | 'reflection';         // Appears in reflective surfaces

// ============================================================================
// Spirit Influence
// ============================================================================

/** What a spirit can affect */
export interface SpiritInfluence {
  /** Primary sphere of influence */
  primaryInfluence: InfluenceSphere;

  /** Secondary influences */
  secondaryInfluences: InfluenceSphere[];

  /** Geographic range of influence */
  range: SpiritRange;

  /** Specific effects the spirit can cause */
  effects: SpiritEffect[];
}

export type InfluenceSphere =
  // Nature
  | 'weather_local'       // Weather in immediate area
  | 'plant_growth'        // Vegetation health
  | 'animal_behavior'     // Local animals
  | 'water_flow'          // Water movement/purity
  | 'soil_fertility'      // Agricultural yield
  | 'fish_abundance'      // Fishing success
  // Human affairs
  | 'traveler_safety'     // Safe passage
  | 'household_fortune'   // Family luck
  | 'craft_success'       // Artisan work
  | 'health'              // Personal wellness
  | 'childbirth'          // Fertility and birth
  | 'dreams'              // Sleep and visions
  // Abstract
  | 'luck'                // General fortune
  | 'protection'          // Warding off harm
  | 'boundary'            // Maintaining boundaries
  | 'transition'          // Life changes
  | 'memory'              // Remembrance of the dead
  | 'secrets';            // Hidden knowledge

export type SpiritRange =
  | 'immediate'           // Only affects direct dwelling
  | 'local'               // Small area around dwelling
  | 'extended'            // Village-scale
  | 'regional'            // Multiple settlements
  | 'vast';               // Entire region

/** Specific effects a spirit can cause */
export interface SpiritEffect {
  /** Effect type */
  type: SpiritEffectType;

  /** Is this a blessing or curse? */
  valence: 'blessing' | 'curse' | 'neutral';

  /** Strength of effect */
  potency: 'subtle' | 'noticeable' | 'significant' | 'dramatic';

  /** How long effect lasts */
  duration: 'momentary' | 'brief' | 'lasting' | 'permanent';

  /** What triggers this effect */
  trigger: EffectTrigger;
}

export type SpiritEffectType =
  // Blessings
  | 'bountiful_harvest'
  | 'safe_journey'
  | 'good_health'
  | 'skill_enhancement'
  | 'protection_ward'
  | 'fortune_favor'
  | 'clear_weather'
  | 'abundant_catch'
  | 'peaceful_sleep'
  | 'inspiration'
  // Curses
  | 'crop_blight'
  | 'path_confusion'
  | 'illness'
  | 'misfortune'
  | 'bad_weather'
  | 'barren_waters'
  | 'nightmares'
  | 'accident_prone'
  // Neutral
  | 'vision_granted'
  | 'presence_revealed'
  | 'boundary_marked'
  | 'warning_given';

export type EffectTrigger =
  | 'offering_given'      // When properly honored
  | 'disrespect_shown'    // When offended
  | 'boundary_crossed'    // When territory violated
  | 'name_invoked'        // When called upon
  | 'festival_time'       // During seasonal celebration
  | 'need_sensed'         // Spirit perceives mortal need
  | 'random';             // Capricious action

// ============================================================================
// Spirit Relationship System
// ============================================================================

/** Relationship between a community/person and a spirit */
export interface SpiritRelationship {
  /** Spirit entity ID */
  spiritId: string;

  /** Entity type having relationship (agent, settlement, family) */
  relatedEntityType: 'agent' | 'settlement' | 'family' | 'guild';
  relatedEntityId: string;

  /** Nature of the relationship */
  relationshipType: SpiritRelationshipType;

  /** Accumulated respect (can be negative) */
  respect: number;

  /** Relationship standing */
  standing: RelationshipStanding;

  /** Required offerings */
  offeringSchedule: OfferingSchedule;

  /** Last offering made */
  lastOfferingTime: number;

  /** Is this relationship formalized? */
  formalized: boolean;

  /** Relationship history */
  history: RelationshipEvent[];
}

export type SpiritRelationshipType =
  | 'patron'              // Spirit protects/favors this entity
  | 'local'               // Entity lives in spirit's domain
  | 'ancestral'           // Spirit is ancestor of entity
  | 'occupational'        // Spirit associated with entity's trade
  | 'chosen'              // Spirit specifically chose this entity
  | 'indebted'            // Entity owes spirit a debt
  | 'offended'            // Entity has offended spirit
  | 'unknown';            // Entity doesn't know spirit exists

export type RelationshipStanding =
  | 'blessed'             // Spirit actively favors entity
  | 'harmonious'          // Good relationship
  | 'neutral'             // Neither positive nor negative
  | 'neglected'           // Entity has been neglecting duties
  | 'strained'            // Relationship is troubled
  | 'hostile'             // Spirit is actively displeased
  | 'severed';            // Relationship broken

export interface RelationshipEvent {
  type: 'offering' | 'offense' | 'blessing' | 'curse' | 'ritual' | 'encounter';
  timestamp: number;
  details: string;
  respectChange: number;
}

// ============================================================================
// Offering System
// ============================================================================

/** What spirits want as offerings */
export interface OfferingPreferences {
  /** Preferred offering types */
  preferred: OfferingType[];

  /** Acceptable offerings */
  acceptable: OfferingType[];

  /** Offensive offerings (never give these) */
  forbidden: OfferingType[];

  /** Special offerings that greatly please spirit */
  special: OfferingType[];

  /** Value multiplier for different offering categories */
  valueMultipliers: Record<OfferingCategory, number>;
}

export type OfferingCategory =
  | 'food'
  | 'drink'
  | 'material'
  | 'craft'
  | 'service'
  | 'performance'
  | 'living';

export type OfferingType =
  // Food
  | 'rice'
  | 'grain'
  | 'fruit'
  | 'vegetables'
  | 'fish'
  | 'meat'
  | 'prepared_food'
  | 'sweets'
  // Drink
  | 'sake'
  | 'water'
  | 'tea'
  | 'milk'
  // Materials
  | 'flowers'
  | 'incense'
  | 'salt'
  | 'cloth'
  | 'coins'
  | 'paper'
  // Crafted
  | 'crafted_item'
  | 'written_prayer'
  | 'art'
  // Service
  | 'cleaning'
  | 'maintenance'
  | 'silence'
  | 'story'
  // Performance
  | 'music'
  | 'dance'
  | 'song'
  // Living (rare, significant)
  | 'planted_tree'
  | 'released_animal';

/** Offering schedule requirements */
export interface OfferingSchedule {
  /** Minimum frequency */
  frequency: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'annual' | 'as_needed';

  /** Special occasions requiring offerings */
  specialOccasions: string[];

  /** Minimum offering value expected */
  minimumValue: number;

  /** Consequences of missing offerings */
  neglectSeverity: 'mild' | 'moderate' | 'severe';
}

// ============================================================================
// Pollution and Purification
// ============================================================================

/** Pollution that offends spirits */
export interface PollutionState {
  /** Current pollution level (0-1) */
  level: number;

  /** Sources of pollution */
  sources: PollutionSource[];

  /** How quickly pollution naturally dissipates */
  naturalDecayRate: number;

  /** Is area currently polluted enough to offend? */
  spiritOffended: boolean;

  /** Purification actions taken */
  purificationHistory: PurificationAction[];
}

export type PollutionSource =
  | 'death'               // Death occurred nearby
  | 'blood'               // Blood spilled
  | 'decay'               // Rotting matter
  | 'waste'               // Human/animal waste
  | 'violence'            // Fighting occurred
  | 'oath_breaking'       // Broken promise
  | 'disrespect'          // Disrespectful behavior
  | 'neglect'             // Abandoned sacred duty
  | 'foreign_intrusion';  // Outsiders in sacred space

export interface PurificationAction {
  type: PurificationType;
  performedBy: string;
  timestamp: number;
  effectiveness: number;
}

export type PurificationType =
  | 'water_cleansing'     // Ritual washing
  | 'salt_purification'   // Salt scattered
  | 'fire_purification'   // Smoke/fire cleansing
  | 'prayer_purification' // Prayers spoken
  | 'offering_atonement'  // Offerings to appease
  | 'time_passage'        // Simply waiting
  | 'priest_ritual';      // Formal purification ceremony

// ============================================================================
// Spirit Entity
// ============================================================================

/** The core spirit entity */
export interface Spirit {
  /** Unique identifier */
  id: string;

  /** Entity type marker */
  entityType: 'spirit';

  // ========================================
  // Classification
  // ========================================
  category: SpiritCategory;
  magnitude: SpiritMagnitude;

  // ========================================
  // Identity
  // ========================================
  naming: SpiritNaming;
  manifestation: SpiritManifestation;

  // ========================================
  // Dwelling
  // ========================================
  /** Type of dwelling (if place/object spirit) */
  dwellingType?: DwellingType;
  objectType?: SpiritObjectType;
  phenomenonType?: PhenomenonType;

  /** Location ID where spirit dwells */
  dwellingLocationId?: string;

  /** Entity ID of object housing spirit */
  dwellingObjectId?: string;

  /** Can spirit move from dwelling? */
  mobile: boolean;

  /** Range spirit can travel from dwelling */
  travelRange: SpiritRange;

  // ========================================
  // Disposition
  // ========================================
  disposition: DispositionFactors;

  // ========================================
  // Influence
  // ========================================
  influence: SpiritInfluence;

  // ========================================
  // Offerings
  // ========================================
  offeringPreferences: OfferingPreferences;

  // ========================================
  // Relationships
  // ========================================
  relationshipIds: string[];         // SpiritRelationship IDs

  // ========================================
  // State
  // ========================================
  /** Accumulated respect (main "power" currency) */
  totalRespect: number;

  /** Is spirit currently active/awake? */
  isActive: boolean;

  /** Is spirit dormant? (long neglected) */
  isDormant: boolean;

  /** Is spirit angry? */
  isAngered: boolean;

  /** Is spirit fading from memory? */
  isFading: boolean;

  /** When spirit came into being */
  emergedAt: number;

  /** How spirit came to exist */
  origin: SpiritOrigin;
}

export type SpiritOrigin =
  | 'primordial'          // Always existed
  | 'natural_formation'   // Emerged from nature over time
  | 'mortal_death'        // Deceased mortal became spirit
  | 'object_aging'        // Old object gained spirit (tsukumogami)
  | 'collective_belief'   // Community belief manifested spirit
  | 'divine_creation'     // Created by a deity
  | 'spirit_offspring'    // Born from other spirits
  | 'event_echo';         // Significant event left spiritual imprint

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a default spirit naming */
export function createSpiritNaming(descriptiveName: string): SpiritNaming {
  return {
    descriptiveName,
    alternateNames: [],
    trueNameKnown: false,
  };
}

/** Create default disposition factors */
export function createDefaultDisposition(
  baseDisposition: SpiritDisposition = 'indifferent'
): DispositionFactors {
  return {
    baseDisposition,
    currentDisposition: baseDisposition,
    respectLevel: 0,
    dwellingDamaged: false,
    pollutionLevel: 0,
    ritualDebt: 0,
    neglectDuration: 0,
    recentInteractions: [],
  };
}

/** Create default spirit manifestation */
export function createDefaultManifestation(): SpiritManifestation {
  return {
    primaryForm: 'invisible',
    visibilityLevel: 'invisible',
    description: 'An unseen presence',
    presenceSigns: [],
    animalForms: [],
    soundSigns: [],
    manifestedSize: 'natural',
  };
}

/** Create default spirit influence */
export function createDefaultInfluence(
  primaryInfluence: InfluenceSphere = 'protection'
): SpiritInfluence {
  return {
    primaryInfluence,
    secondaryInfluences: [],
    range: 'immediate',
    effects: [],
  };
}

/** Create default offering preferences */
export function createDefaultOfferingPreferences(): OfferingPreferences {
  return {
    preferred: ['rice', 'sake', 'flowers'],
    acceptable: ['water', 'incense', 'fruit'],
    forbidden: [],
    special: [],
    valueMultipliers: {
      food: 1.0,
      drink: 1.0,
      material: 0.8,
      craft: 1.2,
      service: 1.5,
      performance: 1.3,
      living: 2.0,
    },
  };
}

/** Create a place spirit */
export function createPlaceSpirit(
  id: string,
  name: string,
  dwellingType: DwellingType,
  locationId: string,
  disposition: SpiritDisposition = 'territorial'
): Spirit {
  const influence = inferInfluenceFromDwelling(dwellingType);

  return {
    id,
    entityType: 'spirit',
    category: 'place_spirit',
    magnitude: 'minor',
    naming: createSpiritNaming(name),
    manifestation: createDefaultManifestation(),
    dwellingType,
    dwellingLocationId: locationId,
    mobile: false,
    travelRange: 'local',
    disposition: createDefaultDisposition(disposition),
    influence: createDefaultInfluence(influence),
    offeringPreferences: createDefaultOfferingPreferences(),
    relationshipIds: [],
    totalRespect: 0,
    isActive: true,
    isDormant: false,
    isAngered: false,
    isFading: false,
    emergedAt: Date.now(),
    origin: 'natural_formation',
  };
}

/** Create an ancestor spirit */
export function createAncestorSpirit(
  id: string,
  deceasedName: string,
  _familyId: string
): Spirit {
  return {
    id,
    entityType: 'spirit',
    category: 'ancestor_spirit',
    magnitude: 'minor',
    naming: {
      descriptiveName: `Spirit of ${deceasedName}`,
      givenName: deceasedName,
      alternateNames: [],
      trueNameKnown: true,
      trueName: deceasedName,
    },
    manifestation: {
      primaryForm: 'invisible',
      visibilityLevel: 'glimpsed',
      description: 'A familiar presence',
      presenceSigns: ['feeling of being watched', 'familiar scent'],
      animalForms: [],
      soundSigns: ['whispered voice'],
      manifestedSize: 'natural',
    },
    mobile: true,
    travelRange: 'local',
    disposition: createDefaultDisposition('benign'),
    influence: createDefaultInfluence('household_fortune'),
    offeringPreferences: {
      preferred: ['prepared_food', 'sake', 'incense'],
      acceptable: ['rice', 'flowers', 'water'],
      forbidden: [],
      special: ['story'],
      valueMultipliers: {
        food: 1.5,
        drink: 1.2,
        material: 0.8,
        craft: 1.0,
        service: 1.0,
        performance: 1.5,
        living: 1.0,
      },
    },
    relationshipIds: [],
    totalRespect: 0,
    isActive: true,
    isDormant: false,
    isAngered: false,
    isFading: false,
    emergedAt: Date.now(),
    origin: 'mortal_death',
  };
}

/** Create an object spirit (tsukumogami) */
export function createObjectSpirit(
  id: string,
  objectType: SpiritObjectType,
  objectId: string,
  objectAge: number
): Spirit {
  // Older objects have more personality
  const disposition: SpiritDisposition =
    objectAge >= 100 ? 'playful' : objectAge >= 50 ? 'curious' : 'shy';

  return {
    id,
    entityType: 'spirit',
    category: 'object_spirit',
    magnitude: 'minor',
    naming: createSpiritNaming(`Spirit of the ${objectType.replace('_', ' ')}`),
    manifestation: {
      primaryForm: 'dwelling_animated',
      visibilityLevel: 'glimpsed',
      description: 'The object seems to move on its own',
      presenceSigns: ['object shifts position', 'object makes sounds'],
      animalForms: [],
      soundSigns: ['creaking', 'tapping'],
      manifestedSize: 'natural',
    },
    objectType,
    dwellingObjectId: objectId,
    mobile: false,
    travelRange: 'immediate',
    disposition: createDefaultDisposition(disposition),
    influence: createDefaultInfluence(inferInfluenceFromObject(objectType)),
    offeringPreferences: inferOfferingsFromObject(objectType),
    relationshipIds: [],
    totalRespect: Math.floor(objectAge / 10), // Age grants starting respect
    isActive: true,
    isDormant: false,
    isAngered: false,
    isFading: false,
    emergedAt: Date.now(),
    origin: 'object_aging',
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Infer influence sphere from dwelling type */
export function inferInfluenceFromDwelling(dwelling: DwellingType): InfluenceSphere {
  const dwellingInfluence: Partial<Record<DwellingType, InfluenceSphere>> = {
    mountain: 'weather_local',
    river: 'water_flow',
    stream: 'water_flow',
    waterfall: 'water_flow',
    spring: 'health',
    lake: 'fish_abundance',
    pond: 'fish_abundance',
    ocean: 'fish_abundance',
    forest: 'plant_growth',
    grove: 'plant_growth',
    ancient_tree: 'protection',
    sacred_tree: 'luck',
    field: 'soil_fertility',
    paddy: 'soil_fertility',
    orchard: 'plant_growth',
    granary: 'household_fortune',
    crossroads: 'traveler_safety',
    bridge: 'traveler_safety',
    gate: 'boundary',
    threshold: 'boundary',
    hearth: 'household_fortune',
    well: 'health',
    forest_edge: 'transition',
    shoreline: 'transition',
  };

  return dwellingInfluence[dwelling] ?? 'protection';
}

/** Infer influence sphere from object type */
export function inferInfluenceFromObject(objectType: SpiritObjectType): InfluenceSphere {
  const objectInfluence: Partial<Record<SpiritObjectType, InfluenceSphere>> = {
    ancient_tree: 'protection',
    notable_rock: 'luck',
    old_tool: 'craft_success',
    mirror: 'dreams',
    sword: 'protection',
    musical_instrument: 'luck',
    mask: 'transition',
    vessel: 'household_fortune',
  };

  return objectInfluence[objectType] ?? 'luck';
}

/** Infer offering preferences from object type */
export function inferOfferingsFromObject(objectType: SpiritObjectType): OfferingPreferences {
  const base = createDefaultOfferingPreferences();

  // Tools prefer maintenance/use
  if (objectType === 'old_tool') {
    base.preferred = ['cleaning', 'maintenance'];
    base.special = ['crafted_item'];
  }
  // Musical instruments prefer performance
  else if (objectType === 'musical_instrument') {
    base.preferred = ['music', 'song'];
    base.special = ['dance'];
  }
  // Mirrors prefer beauty offerings
  else if (objectType === 'mirror') {
    base.preferred = ['flowers', 'art'];
    base.special = ['cleaning'];
  }
  // Weapons prefer respect
  else if (objectType === 'sword') {
    base.preferred = ['cleaning', 'maintenance', 'silence'];
    base.forbidden = []; // Blood is not an offering type
  }

  return base;
}

/** Calculate respect change from an offering */
export function calculateOfferingRespect(
  offeringType: OfferingType,
  preferences: OfferingPreferences,
  baseValue: number = 1
): number {
  // Forbidden offerings cause negative respect
  if (preferences.forbidden.includes(offeringType)) {
    return -baseValue * 2;
  }

  // Special offerings give bonus
  if (preferences.special.includes(offeringType)) {
    return baseValue * 3;
  }

  // Preferred offerings
  if (preferences.preferred.includes(offeringType)) {
    return baseValue * 1.5;
  }

  // Acceptable offerings
  if (preferences.acceptable.includes(offeringType)) {
    return baseValue;
  }

  // Unknown offerings - spirits may be curious or indifferent
  return baseValue * 0.5;
}

/** Calculate disposition change from respect */
export function updateDispositionFromRespect(
  disposition: DispositionFactors
): SpiritDisposition {
  const { baseDisposition, respectLevel, pollutionLevel, neglectDuration } = disposition;

  // Severe pollution always angers
  if (pollutionLevel > 0.7) {
    return 'wrathful';
  }

  // Long neglect makes spirits hostile or dormant
  if (neglectDuration > 1000) {
    return baseDisposition === 'demanding' ? 'wrathful' : 'indifferent';
  }

  // Very high respect improves disposition
  if (respectLevel > 100) {
    if (baseDisposition === 'territorial') return 'benign';
    if (baseDisposition === 'indifferent') return 'curious';
    if (baseDisposition === 'demanding') return 'benign';
  }

  // Very negative respect worsens disposition
  if (respectLevel < -50) {
    return 'wrathful';
  }

  // Moderate neglect
  if (neglectDuration > 100) {
    if (baseDisposition === 'demanding') return 'wrathful';
    return 'indifferent';
  }

  return baseDisposition;
}

/** Check if a spirit is likely to grant a blessing */
export function canGrantBlessing(spirit: Spirit): boolean {
  const { currentDisposition } = spirit.disposition;
  const favorableDispositions: SpiritDisposition[] = [
    'benign',
    'curious',
    'playful',
    'solemn',
  ];

  return (
    favorableDispositions.includes(currentDisposition) &&
    !spirit.isDormant &&
    !spirit.isAngered &&
    spirit.disposition.respectLevel >= 0
  );
}

/** Check if a spirit is likely to cause trouble */
export function willCauseTrouble(spirit: Spirit): boolean {
  const { currentDisposition, respectLevel, pollutionLevel } = spirit.disposition;

  return (
    currentDisposition === 'wrathful' ||
    currentDisposition === 'hungry' ||
    (currentDisposition === 'demanding' && respectLevel < -10) ||
    pollutionLevel > 0.5
  );
}
