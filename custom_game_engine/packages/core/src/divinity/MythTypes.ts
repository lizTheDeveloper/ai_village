/**
 * MythTypes - Mythology and divine story types
 *
 * Agents tell stories about the divine. These stories shape deity identity,
 * spread through the population, and become canonized into holy texts.
 * Stories mutate as they're retold and can conflict or harmonize.
 */

import type { DivineDomain } from './DeityTypes.js';

// ============================================================================
// Myth Categories
// ============================================================================

/** Primary categories of divine stories */
export type MythCategory =
  // Origin stories
  | 'creation'            // How the world/deity began
  | 'emergence'           // How a deity came into being
  | 'awakening'           // A deity's first action

  // Deity nature stories
  | 'nature_tale'         // Explains deity's character
  | 'domain_origin'       // How deity gained their domain
  | 'appearance_tale'     // Describes deity's form
  | 'name_origin'         // How deity got their name

  // Miracle stories
  | 'answered_prayer'     // A prayer that was answered
  | 'healing_miracle'     // Healing by divine power
  | 'protection_miracle'  // Protection from harm
  | 'punishment_tale'     // Divine punishment
  | 'blessing_tale'       // Divine blessing
  | 'weather_miracle'     // Control of weather
  | 'fertility_miracle'   // Crops/children granted
  | 'resurrection_tale'   // Return from death

  // Moral/teaching stories
  | 'parable'             // Moral lesson story
  | 'commandment'         // Divine law given
  | 'warning_tale'        // What happens to the faithless
  | 'reward_tale'         // What happens to the faithful
  | 'virtue_tale'         // Example of good behavior
  | 'sin_tale'            // Example of transgression

  // Prophecy and vision
  | 'prophecy'            // Future prediction
  | 'vision_account'      // Description of a vision
  | 'dream_interpretation' // Meaning of a divine dream
  | 'omen_tale'           // Signs and their meanings

  // Divine interactions
  | 'theophany'           // Deity appearing to mortals
  | 'avatar_tale'         // Story of deity's physical form
  | 'angel_account'       // Encounter with divine messenger
  | 'divine_speech'       // Words spoken by deity

  // Pantheon stories
  | 'divine_conflict'     // Gods fighting
  | 'divine_alliance'     // Gods cooperating
  | 'divine_romance'      // Love between gods
  | 'divine_family'       // Divine parentage/offspring
  | 'divine_council'      // Gods meeting/deciding

  // Sacred place stories
  | 'temple_founding'     // How a temple was established
  | 'sacred_site_origin'  // Why a place is holy
  | 'pilgrimage_tale'     // Journey to sacred place

  // Heroic/saint stories
  | 'champion_tale'       // Story of divine champion
  | 'saint_life'          // Life of a holy person
  | 'martyr_tale'         // Death for faith
  | 'conversion_tale'     // Coming to faith

  // Ritual stories
  | 'ritual_origin'       // Why a ritual exists
  | 'festival_origin'     // Why a festival is celebrated
  | 'sacrifice_tale'      // Story involving sacrifice

  // Eschatological stories
  | 'end_times'           // How the world will end
  | 'afterlife_account'   // Description of afterlife
  | 'judgment_tale'       // Divine judgment of souls

  // Explanatory stories
  | 'etiology'            // Why something exists/happens
  | 'natural_explanation' // Divine cause for natural events
  | 'historical_explanation' // Divine role in past events

  // Contested stories
  | 'heresy_tale'         // Story deemed false by mainstream
  | 'schism_tale'         // Story of religious division
  | 'reformation_tale';   // Story of religious change

// ============================================================================
// Myth Status
// ============================================================================

/** Theological status of a myth */
export type MythStatus =
  | 'oral'            // Only spoken, not written
  | 'recorded'        // Written but not official
  | 'canonical'       // Widely accepted as true
  | 'disputed'        // Actively debated
  | 'apocryphal'      // Exists but not officially accepted
  | 'heretical'       // Forbidden/suppressed
  | 'forgotten';      // No longer told

/** How disputed a myth is */
export type DisputeLevel =
  | 'universally_accepted'
  | 'mostly_accepted'
  | 'debated'
  | 'controversial'
  | 'minority_view'
  | 'rejected';

// ============================================================================
// Trait Implications
// ============================================================================

/** How a myth affects deity identity */
export interface TraitImplication {
  /** Which aspect of identity */
  trait: string;

  /** Direction of implication */
  direction: 'positive' | 'negative';

  /** How strongly this story suggests the trait (0-1) */
  strength: number;

  /** Quote/evidence from the story */
  extractedFrom: string;
}

// ============================================================================
// Story Structure
// ============================================================================

/** Narrative structure of a myth */
export type NarrativeStructure =
  | 'simple'          // Single event
  | 'journey'         // Movement from A to B
  | 'conflict'        // Problem and resolution
  | 'transformation'  // Change in character/situation
  | 'revelation'      // Hidden truth revealed
  | 'cycle'           // Repeating pattern
  | 'dialogue'        // Conversation/exchange
  | 'list'            // Enumeration (commandments, etc.)
  | 'nested';         // Story within story

/** Key elements of a myth */
export interface MythElements {
  /** Central character(s) */
  protagonists: MythCharacter[];

  /** Opposing force(s) if any */
  antagonists?: MythCharacter[];

  /** Setting (location type) */
  setting: string;

  /** Time period (mythic past, recent, etc.) */
  temporalSetting: MythTime;

  /** Central conflict/question */
  centralConflict?: string;

  /** Resolution/outcome */
  resolution?: string;

  /** Moral or lesson */
  moral?: string;

  /** Recurring motifs */
  motifs: string[];

  /** Symbolic elements */
  symbols: string[];
}

/** Character in a myth */
export interface MythCharacter {
  /** Type of character */
  type: 'deity' | 'angel' | 'mortal' | 'creature' | 'abstract';

  /** Reference ID if specific entity */
  entityId?: string;

  /** Name in the story */
  name: string;

  /** Role in narrative */
  role: 'hero' | 'villain' | 'helper' | 'victim' | 'wise_figure' | 'trickster' | 'witness';
}

/** Temporal setting of myth */
export type MythTime =
  | 'primordial'      // Before time/world existed
  | 'creation_era'    // When world was new
  | 'mythic_past'     // Undefined long ago
  | 'ancestral'       // Time of ancestors
  | 'historical'      // Specific past time
  | 'recent'          // Living memory
  | 'present'         // Ongoing
  | 'future'          // Prophecy
  | 'eternal';        // Outside time

// ============================================================================
// Myth Entity
// ============================================================================

/** A complete myth/story */
export interface Myth {
  id: string;

  // ========================================
  // Content
  // ========================================

  /** Title of the myth */
  title: string;

  /** Full narrative text (LLM-generated) */
  fullText: string;

  /** Brief summary */
  summary: string;

  /** Category of myth */
  category: MythCategory;

  /** Secondary categories if applicable */
  secondaryCategories: MythCategory[];

  /** Narrative structure */
  structure: NarrativeStructure;

  /** Key story elements */
  elements: MythElements;

  // ========================================
  // Origin
  // ========================================

  /** Event that inspired this myth (if any) */
  originalEventId?: string;

  /** Event type that inspired it */
  originalEventType?: string;

  /** Agent who first told/interpreted this */
  originalNarratorId?: string;

  /** Current version number (mutations tracked) */
  currentVersion: number;

  /** When the myth first formed */
  createdAt: number;

  // ========================================
  // Deities Involved
  // ========================================

  /** Primary deity this myth is about */
  primaryDeityId: string;

  /** Other deities mentioned */
  secondaryDeityIds: string[];

  /** Which domains this myth relates to */
  relevantDomains: DivineDomain[];

  // ========================================
  // Spread & Knowledge
  // ========================================

  /** Agent IDs who know this myth */
  knownBy: string[];

  /** Number of agents who know it */
  knownByCount: number;

  /** Written in these texts */
  writtenInTextIds: string[];

  /** Carved/inscribed at these buildings */
  carvedAtBuildingIds: string[];

  /** Last time it was told */
  lastToldAt: number;

  /** Times it has been retold */
  tellingCount: number;

  // ========================================
  // Impact
  // ========================================

  /** Trait implications for deity identity */
  traitImplications: TraitImplication[];

  /** Domain relevance scores */
  domainRelevance: Map<DivineDomain, number>;

  /** Influence score (how impactful is this myth) */
  influence: number;

  // ========================================
  // Status
  // ========================================

  /** Current theological status */
  status: MythStatus;

  /** How disputed is it */
  disputeLevel: DisputeLevel;

  /** Agent IDs who dispute this */
  contestedBy: string[];

  /** Alternative versions that exist */
  alternativeVersionIds: string[];
}

// ============================================================================
// Myth Mutation
// ============================================================================

/** Types of changes that happen when stories are retold */
export type MutationType =
  | 'dramatization'       // Events become more dramatic
  | 'simplification'      // Details lost
  | 'moralization'        // Moral lesson added/emphasized
  | 'personalization'     // Narrator inserts local details
  | 'merger'              // Combined with other story
  | 'inversion'           // Good becomes bad or vice versa
  | 'attribution_shift'   // Credit moved to different deity
  | 'localization'        // Settings changed to local places
  | 'amplification'       // Effects made larger
  | 'rationalization'     // Supernatural elements explained
  | 'embellishment'       // New details added
  | 'abbreviation'        // Story shortened
  | 'correction'          // "Errors" fixed by reteller
  | 'reinterpretation';   // Same events, different meaning

/** Record of a myth mutation */
export interface MythMutation {
  /** Original version before mutation */
  fromVersion: number;

  /** New version after mutation */
  toVersion: number;

  /** Type of mutation */
  mutationType: MutationType;

  /** What specifically changed */
  description: string;

  /** Who caused the mutation */
  mutatorAgentId: string;

  /** When it happened */
  timestamp: number;

  /** Did this create a branch (alternative version)? */
  createdBranch: boolean;
}

// ============================================================================
// Story Telling
// ============================================================================

/** A specific instance of telling a myth */
export interface StoryTelling {
  /** Which myth */
  mythId: string;

  /** Who told it */
  narratorId: string;

  /** Who heard it */
  audienceIds: string[];

  /** Where it was told */
  locationId: string;

  /** When */
  timestamp: number;

  /** Context (ritual, casual, teaching, etc.) */
  context: TellingContext;

  /** Did mutation occur? */
  mutationOccurred: boolean;

  /** If so, what kind */
  mutationType?: MutationType;

  /** Audience reaction */
  audienceReaction: AudienceReaction;
}

/** Context in which a story is told */
export type TellingContext =
  | 'casual'          // Informal conversation
  | 'teaching'        // Education context
  | 'ritual'          // Part of ceremony
  | 'sermon'          // Religious instruction
  | 'entertainment'   // For enjoyment
  | 'warning'         // To caution someone
  | 'comfort'         // To console someone
  | 'argument'        // To make a point
  | 'preservation';   // Recording for posterity

/** How audience responded to story */
export type AudienceReaction =
  | 'moved'           // Emotionally affected
  | 'inspired'        // Faith strengthened
  | 'skeptical'       // Doubted the story
  | 'indifferent'     // No strong reaction
  | 'entertained'     // Enjoyed it
  | 'confused'        // Didn't understand
  | 'angered'         // Offended by story
  | 'converted';      // Changed beliefs because of it

// ============================================================================
// Myth Conflicts
// ============================================================================

/** When two myths contradict each other */
export interface MythConflict {
  /** First myth */
  mythA_Id: string;

  /** Second myth */
  mythB_Id: string;

  /** Nature of the conflict */
  conflictType: MythConflictType;

  /** Specific point of contradiction */
  contradiction: string;

  /** Which is currently winning */
  dominantMyth?: string;

  /** Believers backing each side */
  supportersA: string[];
  supportersB: string[];

  /** Has this caused a schism? */
  causedSchism: boolean;
}

/** Types of myth conflicts */
export type MythConflictType =
  | 'factual'         // Contradictory facts
  | 'interpretive'    // Same facts, different meaning
  | 'attribution'     // Different deity credited
  | 'moral'           // Different moral conclusions
  | 'chronological'   // Timeline conflicts
  | 'character'       // Different portrayal of figures
  | 'outcome';        // Different endings

// ============================================================================
// Myth Generation Request
// ============================================================================

/** Request for LLM to generate a new myth */
export interface MythGenerationRequest {
  /** What triggered this myth */
  trigger: MythTrigger;

  /** Category to generate */
  category: MythCategory;

  /** Primary deity involved */
  primaryDeityId: string;

  /** Deity's current identity (for consistency) */
  deityIdentity: {
    name: string;
    domain: DivineDomain;
    personality: Record<string, number>;
    existingEpithets: string[];
  };

  /** Event that inspired this (if any) */
  inspiringEvent?: {
    type: string;
    description: string;
    participants: string[];
    outcome: string;
  };

  /** Narrator's personality (affects interpretation) */
  narratorPersonality?: {
    optimism: number;
    religiosity: number;
    creativity: number;
  };

  /** Existing myths to maintain consistency with */
  existingMyths: string[];

  /** Constraints on the generation */
  constraints: {
    maxLength: number;
    style: 'oral' | 'formal' | 'poetic' | 'simple';
    mustIncludeTraits?: string[];
    mustAvoidTraits?: string[];
  };
}

/** What triggered myth generation */
export type MythTrigger =
  | 'divine_action'       // Deity did something
  | 'answered_prayer'     // Prayer was answered
  | 'witness_miracle'     // Someone saw a miracle
  | 'dream_vision'        // Agent had a vision
  | 'natural_event'       // Natural phenomenon interpreted
  | 'social_need'         // Story needed to explain something
  | 'retelling_mutation'  // Story changed in retelling
  | 'theological_debate'  // Argument spawned new story
  | 'artistic_creation';  // Someone deliberately composed

// ============================================================================
// Factory Functions
// ============================================================================

/** Create empty myth structure */
export function createMythTemplate(
  title: string,
  category: MythCategory,
  primaryDeityId: string
): Partial<Myth> {
  return {
    title,
    category,
    primaryDeityId,
    secondaryCategories: [],
    structure: 'simple',
    elements: {
      protagonists: [],
      setting: '',
      temporalSetting: 'recent',
      motifs: [],
      symbols: [],
    },
    currentVersion: 1,
    createdAt: Date.now(),
    secondaryDeityIds: [],
    relevantDomains: [],
    knownBy: [],
    knownByCount: 0,
    writtenInTextIds: [],
    carvedAtBuildingIds: [],
    tellingCount: 0,
    traitImplications: [],
    domainRelevance: new Map(),
    influence: 0,
    status: 'oral',
    disputeLevel: 'universally_accepted',
    contestedBy: [],
    alternativeVersionIds: [],
  };
}

/** Calculate myth influence based on spread and status */
export function calculateMythInfluence(myth: Partial<Myth>): number {
  let influence = 0;

  // Base on how many know it
  influence += (myth.knownByCount ?? 0) * 0.1;

  // Written myths are more influential
  influence += (myth.writtenInTextIds?.length ?? 0) * 5;

  // Carved myths even more so
  influence += (myth.carvedAtBuildingIds?.length ?? 0) * 10;

  // Status affects influence
  const statusMultiplier: Record<MythStatus, number> = {
    oral: 0.5,
    recorded: 0.8,
    canonical: 1.5,
    disputed: 0.7,
    apocryphal: 0.3,
    heretical: 0.1,
    forgotten: 0,
  };
  influence *= statusMultiplier[myth.status ?? 'oral'];

  // Contested myths lose some influence
  if ((myth.contestedBy?.length ?? 0) > 0) {
    influence *= 0.8;
  }

  return Math.max(0, influence);
}
