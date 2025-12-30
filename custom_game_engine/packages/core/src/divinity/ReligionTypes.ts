/**
 * ReligionTypes - Religious institutions, temples, priests, and holy texts
 *
 * Religion is the organized expression of divine belief. Temples generate belief,
 * priests perform rituals, and holy texts canonize myths. Religious institutions
 * can split (schism) or merge (syncretism).
 */

// Note: DivineDomain imported but reserved for future use in temple domain alignment
// Note: MythCategory/MythStatus imported but reserved for holy text myth references

// ============================================================================
// Temple Types
// ============================================================================

/** A temple - sacred building dedicated to a deity */
export interface Temple {
  id: string;

  /** Building entity ID */
  buildingId: string;

  /** Primary deity worshipped */
  primaryDeityId: string;

  /** Secondary deities (if syncretic) */
  secondaryDeityIds: string[];

  /** Temple name */
  name: string;

  /** Temple type */
  type: TempleType;

  /** Size/grandeur */
  size: TempleSize;

  /** How sacred is this site? */
  sanctity: number;

  /** Belief generation bonus */
  beliefBonus: number;

  /** Current head priest */
  headPriestId?: string;

  /** All priests assigned */
  priestIds: string[];

  /** Regular worshippers */
  regularWorshipperIds: string[];

  /** Holy texts stored here */
  holyTextIds: string[];

  /** Relics stored here */
  relicIds: string[];

  /** Is there an angel guarding? */
  guardingAngelId?: string;

  /** Decorations and sacred objects */
  sacredObjects: SacredObject[];

  /** When established */
  establishedAt: number;

  /** Has been desecrated? */
  desecrated: boolean;

  /** Desecration details */
  desecrationEvent?: {
    by: string;
    at: number;
    description: string;
  };

  /** Scheduled rituals */
  scheduledRituals: ScheduledRitual[];

  /** Building features */
  features: TempleFeature[];
}

/** Types of temples */
export type TempleType =
  | 'shrine'        // Small, personal
  | 'chapel'        // Small community
  | 'temple'        // Standard temple
  | 'cathedral'     // Grand temple
  | 'monastery'     // Residential temple
  | 'oracle'        // Prophecy-focused
  | 'cemetery'      // Death deity temple
  | 'sacred_grove'  // Nature temple
  | 'ziggurat'      // Stepped temple
  | 'pyramid';      // Monumental

/** Size of temple */
export type TempleSize =
  | 'tiny'          // Personal shrine
  | 'small'         // Neighborhood
  | 'medium'        // Town
  | 'large'         // City
  | 'grand'         // Regional
  | 'monumental';   // Wonder of the world

/** Features a temple can have */
export type TempleFeature =
  | 'altar'
  | 'sacred_pool'
  | 'oracle_chamber'
  | 'crypt'
  | 'library'
  | 'dormitory'
  | 'bell_tower'
  | 'meditation_garden'
  | 'sacrificial_pit'
  | 'holy_flame'
  | 'sacred_well'
  | 'relic_vault'
  | 'healing_springs'
  | 'confession_booth'
  | 'choir_loft'
  | 'astronomical_observatory';

/** A sacred object in a temple */
export interface SacredObject {
  id: string;
  name: string;
  type: 'statue' | 'altar' | 'relic' | 'inscription' | 'painting' | 'artifact' | 'symbol';
  description: string;
  sanctity: number;
  mythAssociation?: string;
}

/** A scheduled ritual */
export interface ScheduledRitual {
  ritualId: string;
  nextOccurrence: number;
  frequency: RitualFrequency;
  requiredParticipants: number;
}

// ============================================================================
// Priest Types
// ============================================================================

/** A priest - religious leader and ritual performer */
export interface Priest {
  /** Agent ID of the priest */
  agentId: string;

  /** Deity they serve */
  deityId: string;

  /** Temple they're assigned to (if any) */
  templeId?: string;

  /** Priestly rank */
  rank: PriestRank;

  /** Priestly role */
  role: PriestRole;

  /** Ordination date */
  ordainedAt: number;

  /** Total service time (hours) */
  serviceTime: number;

  /** Rituals they can perform */
  knownRituals: string[];

  /** Visions received */
  visionsReceived: number;

  /** Prayers answered through them */
  prayersChanneled: number;

  /** Converts made */
  convertsMade: number;

  /** Holy texts written */
  textsWritten: string[];

  /** Theological positions */
  theologicalPositions: TheologicalPosition[];

  /** Is this a prophet? */
  isProphet: boolean;

  /** Reputation among believers */
  reputation: number;

  /** Faith level */
  personalFaith: number;
}

/** Ranks of priests */
export type PriestRank =
  | 'acolyte'       // Trainee
  | 'priest'        // Basic priest
  | 'senior_priest' // Experienced
  | 'high_priest'   // Temple leader
  | 'archbishop'    // Regional leader
  | 'pontiff';      // Supreme religious leader

/** Roles a priest can have */
export type PriestRole =
  | 'ritualist'     // Performs ceremonies
  | 'healer'        // Focuses on healing
  | 'teacher'       // Religious education
  | 'missionary'    // Converts non-believers
  | 'oracle'        // Interprets prophecy
  | 'inquisitor'    // Fights heresy
  | 'chronicler'    // Records myths/history
  | 'confessor'     // Hears confessions
  | 'exorcist'      // Removes curses/spirits
  | 'judge'         // Religious law
  | 'alms_giver';   // Charity

/** A theological position held by a priest */
export interface TheologicalPosition {
  topic: string;
  stance: string;
  strength: number; // How strongly held
}

// ============================================================================
// Ritual Types
// ============================================================================

/** A religious ritual */
export interface Ritual {
  id: string;

  /** Ritual name */
  name: string;

  /** Which deity it honors */
  deityId: string;

  /** Type of ritual */
  type: RitualType;

  /** How often performed */
  frequency: RitualFrequency;

  /** Duration (game hours) */
  duration: number;

  /** Minimum participants */
  minParticipants: number;

  /** Maximum participants */
  maxParticipants: number;

  /** Requires priest? */
  requiresPriest: boolean;

  /** Required priest rank */
  requiredPriestRank?: PriestRank;

  /** Location requirements */
  locationRequirement: RitualLocation;

  /** Items required */
  requiredItems: RitualItem[];

  /** Belief generated per participant */
  beliefPerParticipant: number;

  /** Bonus effects */
  effects: RitualEffect[];

  /** Mythological significance */
  mythAssociation?: string;

  /** Steps of the ritual */
  steps: RitualStep[];
}

/** Types of rituals */
export type RitualType =
  | 'prayer_service'    // Regular worship
  | 'sacrifice'         // Offering to deity
  | 'festival'          // Celebration
  | 'funeral'           // Death rites
  | 'wedding'           // Marriage
  | 'birth_blessing'    // New child
  | 'coming_of_age'     // Adulthood ritual
  | 'ordination'        // Making a priest
  | 'consecration'      // Making something sacred
  | 'exorcism'          // Removing evil
  | 'divination'        // Seeking prophecy
  | 'pilgrimage'        // Sacred journey
  | 'fast'              // Abstaining ritual
  | 'feast'             // Sacred meal
  | 'procession'        // Sacred march
  | 'mystery_rite'      // Secret ritual
  | 'penance'           // Atonement
  | 'coronation'        // Royal blessing
  | 'harvest_thanks'    // Seasonal gratitude
  | 'solstice'          // Celestial event
  | 'invocation';       // Calling the deity

/** Frequency of rituals */
export type RitualFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'seasonal'
  | 'annual'
  | 'once_per_generation'
  | 'on_demand'
  | 'crisis_only';

/** Where ritual can be performed */
export type RitualLocation =
  | 'anywhere'
  | 'temple'
  | 'sacred_site'
  | 'outdoors'
  | 'water'
  | 'mountaintop'
  | 'cemetery'
  | 'home';

/** Item needed for ritual */
export interface RitualItem {
  itemType: string;
  quantity: number;
  consumed: boolean;
  description: string;
}

/** Effect of completing a ritual */
export interface RitualEffect {
  type: 'blessing' | 'prophecy' | 'healing' | 'sanctification' | 'community_bond' | 'belief_surge';
  magnitude: number;
  duration: number;
  description: string;
}

/** A step in a ritual */
export interface RitualStep {
  order: number;
  action: string;
  duration: number;
  performer: 'priest' | 'all' | 'specific';
  spoken?: string;
}

// ============================================================================
// Holy Text Types
// ============================================================================

/** A holy text - written religious document */
export interface HolyText {
  id: string;

  /** Title */
  title: string;

  /** Which deity it concerns */
  deityId: string;

  /** Type of text */
  type: HolyTextType;

  /** Who wrote it */
  authorAgentId?: string;

  /** Text content (summary, not full text) */
  contentSummary: string;

  /** Myths contained */
  containedMythIds: string[];

  /** Theological positions declared */
  theologicalPositions: TheologicalPosition[];

  /** Status of the text */
  status: HolyTextStatus;

  /** When written */
  writtenAt: number;

  /** Number of copies in existence */
  copyCount: number;

  /** Where copies are located (temple IDs) */
  locationIds: string[];

  /** Has been declared canon? */
  isCanon: boolean;

  /** If canon, when declared */
  canonizedAt?: number;

  /** Agents who have read it */
  readByAgentIds: string[];

  /** Influence on theology */
  influence: number;

  /** Competing texts (different interpretations) */
  competingTextIds: string[];
}

/** Types of holy texts */
export type HolyTextType =
  | 'creation_myth'     // Origin story
  | 'gospel'            // Life of deity
  | 'prophecy'          // Predictions
  | 'commandments'      // Laws
  | 'prayer_book'       // Collection of prayers
  | 'ritual_manual'     // How to perform rituals
  | 'hagiography'       // Saint's life
  | 'apocalypse'        // End times
  | 'wisdom_literature' // Sayings and advice
  | 'hymnal'            // Sacred songs
  | 'chronicle'         // Religious history
  | 'commentary'        // Interpretation
  | 'heretical_text';   // Forbidden text

/** Status of a holy text */
export type HolyTextStatus =
  | 'draft'         // Being written
  | 'circulating'   // Shared informally
  | 'reviewed'      // Under theological review
  | 'approved'      // Accepted
  | 'canonical'     // Official scripture
  | 'disputed'      // Debated
  | 'apocryphal'    // Not official but tolerated
  | 'forbidden'     // Banned
  | 'lost';         // No copies exist

// ============================================================================
// Religious Movement Types
// ============================================================================

/** A religious movement or denomination */
export interface ReligiousMovement {
  id: string;

  /** Movement name */
  name: string;

  /** Primary deity (may be same as parent religion) */
  deityId: string;

  /** Type of movement */
  type: ReligiousMovementType;

  /** Parent religion (if schism/reform) */
  parentMovementId?: string;

  /** Founding figure */
  founderAgentId?: string;

  /** Core beliefs that distinguish this movement */
  distinctiveBeliefs: TheologicalPosition[];

  /** Temples affiliated */
  templeIds: string[];

  /** Members */
  memberAgentIds: string[];

  /** Leader(s) */
  leaderAgentIds: string[];

  /** When founded */
  foundedAt: number;

  /** Relationship with parent */
  parentRelationship?: 'reformed' | 'schismatic' | 'heretical' | 'orthodox';

  /** Is this the dominant movement? */
  isDominant: boolean;

  /** Rivalry with other movements */
  rivalMovementIds: string[];
}

/** Types of religious movements */
export type ReligiousMovementType =
  | 'orthodox'      // Traditional mainstream
  | 'reform'        // Moderate change
  | 'revival'       // Return to roots
  | 'mystical'      // Emphasizes direct experience
  | 'ascetic'       // Emphasizes denial
  | 'militant'      // Aggressive
  | 'syncretic'     // Combines traditions
  | 'heretical'     // Condemned by mainstream
  | 'cult'          // Small, intense group
  | 'monastic';     // Withdrawn community

// ============================================================================
// Schism and Syncretism
// ============================================================================

/** A religious schism - split in a faith */
export interface Schism {
  id: string;

  /** Original religion/movement */
  originalMovementId: string;

  /** New movement created */
  newMovementId: string;

  /** What caused the schism */
  cause: SchismCause;

  /** Specific disagreement */
  theologicalDispute: string;

  /** Key figure who led the split */
  schismaticLeaderId: string;

  /** When it occurred */
  occurredAt: number;

  /** Resulting relationship */
  relationship: 'hostile' | 'cold' | 'competitive' | 'peaceful';

  /** Myths about the schism */
  mythIds: string[];
}

/** Causes of schisms */
export type SchismCause =
  | 'theological_dispute'   // Doctrinal disagreement
  | 'leadership_conflict'   // Power struggle
  | 'cultural_divergence'   // Regional differences
  | 'reform_rejection'      // Change refused
  | 'corruption_scandal'    // Moral failings exposed
  | 'prophetic_claim'       // New prophet
  | 'foreign_influence'     // Outside pressure
  | 'miracle_interpretation'; // Disagreement on divine event

/** A syncretism - merging of faiths */
export interface Syncretism {
  id: string;

  /** Religions being merged */
  sourceMovementIds: string[];

  /** Resulting religion */
  resultMovementId: string;

  /** Deities being merged */
  mergedDeityIds: string[];

  /** Resulting deity (if deities merged) */
  resultDeityId?: string;

  /** What elements are combined */
  combinedElements: SyncreticElement[];

  /** When it occurred */
  occurredAt: number;

  /** Is it stable? */
  stable: boolean;

  /** Resistance from purists */
  resistanceLevel: number;
}

/** Elements combined in syncretism */
export interface SyncreticElement {
  type: 'myth' | 'ritual' | 'symbol' | 'deity_trait' | 'sacred_site' | 'holy_text';
  fromSource: string;
  description: string;
}

// ============================================================================
// Conversion
// ============================================================================

/** Record of a religious conversion */
export interface Conversion {
  id: string;

  /** Who converted */
  convertAgentId: string;

  /** From what (can be 'none') */
  fromDeityId?: string;

  /** To what */
  toDeityId: string;

  /** What triggered conversion */
  trigger: ConversionTrigger;

  /** Who facilitated (priest, etc.) */
  facilitatorAgentId?: string;

  /** When it happened */
  timestamp: number;

  /** Sincerity (0-1) */
  sincerity: number;

  /** Will it last? */
  stability: number;

  /** Did it involve a ritual? */
  ritualPerformed: boolean;
}

/** What triggers conversion */
export type ConversionTrigger =
  | 'miracle_witness'       // Saw divine action
  | 'vision'                // Received vision
  | 'preaching'             // Convinced by missionary
  | 'social_pressure'       // Community expects it
  | 'marriage'              // Spouse's religion
  | 'crisis'                // Desperate need
  | 'gratitude'             // Prayer answered
  | 'fear'                  // Afraid of deity
  | 'intellectual'          // Convinced by arguments
  | 'political'             // Practical benefit
  | 'healing'               // Healed by faith
  | 'disillusion'           // Lost faith in previous
  | 'birth';                // Born into faith

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a basic shrine */
export function createShrine(
  deityId: string,
  buildingId: string,
  name: string
): Temple {
  return {
    id: `temple_${Date.now()}`,
    buildingId,
    primaryDeityId: deityId,
    secondaryDeityIds: [],
    name,
    type: 'shrine',
    size: 'tiny',
    sanctity: 0.3,
    beliefBonus: 1.1,
    priestIds: [],
    regularWorshipperIds: [],
    holyTextIds: [],
    relicIds: [],
    sacredObjects: [],
    establishedAt: Date.now(),
    desecrated: false,
    scheduledRituals: [],
    features: ['altar'],
  };
}

/** Create a basic ritual */
export function createRitual(
  name: string,
  deityId: string,
  type: RitualType,
  frequency: RitualFrequency
): Ritual {
  return {
    id: `ritual_${Date.now()}`,
    name,
    deityId,
    type,
    frequency,
    duration: 1,
    minParticipants: 1,
    maxParticipants: 100,
    requiresPriest: type !== 'prayer_service',
    locationRequirement: 'temple',
    requiredItems: [],
    beliefPerParticipant: 0.1,
    effects: [],
    steps: [],
  };
}

/** Calculate temple belief bonus */
export function calculateTempleBeliefBonus(temple: Temple): number {
  let bonus = 1.0;

  // Size bonus
  const sizeBonus: Record<TempleSize, number> = {
    tiny: 1.1,
    small: 1.2,
    medium: 1.4,
    large: 1.7,
    grand: 2.0,
    monumental: 2.5,
  };
  bonus *= sizeBonus[temple.size];

  // Sanctity bonus
  bonus *= 1 + temple.sanctity * 0.5;

  // Feature bonuses
  bonus += temple.features.length * 0.05;

  // Sacred objects
  bonus += temple.sacredObjects.reduce((sum, obj) => sum + obj.sanctity * 0.1, 0);

  // Desecration penalty
  if (temple.desecrated) {
    bonus *= 0.5;
  }

  return bonus;
}

/** Calculate priest effectiveness */
export function calculatePriestEffectiveness(priest: Priest): number {
  let effectiveness = 1.0;

  // Rank bonus
  const rankBonus: Record<PriestRank, number> = {
    acolyte: 0.5,
    priest: 1.0,
    senior_priest: 1.3,
    high_priest: 1.6,
    archbishop: 2.0,
    pontiff: 2.5,
  };
  effectiveness *= rankBonus[priest.rank];

  // Faith bonus
  effectiveness *= priest.personalFaith;

  // Experience (service time)
  effectiveness *= 1 + Math.log10(priest.serviceTime + 1) * 0.1;

  // Prophet bonus
  if (priest.isProphet) {
    effectiveness *= 1.5;
  }

  return effectiveness;
}
