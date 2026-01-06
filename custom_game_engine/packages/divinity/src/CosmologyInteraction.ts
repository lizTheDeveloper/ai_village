/**
 * CosmologyInteraction - How Divinity, Animism, and Magic Interact
 *
 * This module defines the relationships and interactions between:
 *
 * 1. DIVINITY - Gods powered by mortal belief
 *    - Emerge from collective faith
 *    - Power scales with believers
 *    - Can grant divine powers
 *
 * 2. ANIMISM - Nature spirits in places/objects
 *    - Exist independently of belief (mostly)
 *    - Tied to specific locations/objects
 *    - Power from respect, not worship
 *
 * 3. MAGIC - Learned/inherited ability to manipulate reality
 *    - Follows paradigm rules
 *    - Can be sourced from divinity OR animism OR internal
 *    - Subject to laws and costs
 *
 * Key Questions This Module Answers:
 * - Can a powerful spirit become a god?
 * - Can a god create spirits?
 * - Can divine power grant magical abilities?
 * - What's the difference between praying to a spirit vs a god?
 * - Can spirits worship gods? Can animals?
 * - How do magic paradigms interact with divine/spirit power?
 */

import type { DivineDomain, Deity } from './DeityTypes.js';
import type { Spirit, SpiritCategory } from './AnimistTypes.js';
import type { SpeciesCategory } from './AnimalBeliefTypes.js';
import type { MagicSourceType } from '@ai-village/magic';

// ============================================================================
// Entity Classification - What Kind of Being Are We Dealing With?
// ============================================================================

/** The fundamental category of a supernatural being */
export type CosmicEntityType =
  | 'deity'           // Belief-powered god
  | 'spirit'          // Location/object-bound spirit
  | 'animal_deity'    // God emerging from animal belief
  | 'ascended_spirit' // Spirit that gained enough worship to transcend
  | 'created_spirit'  // Spirit created by a deity
  | 'divine_servant'  // Angel, champion, prophet
  | 'awakened_object' // Tsukumogami - object that gained spirit
  | 'concept_entity'  // Personification of abstract concept
  | 'hybrid';         // Something that doesn't fit categories

/** Power source for a supernatural entity */
export type PowerSourceCategory =
  | 'belief'          // Human/mortal worship
  | 'respect'         // Animist offerings and attention
  | 'nature'          // Intrinsic to natural phenomena
  | 'divine_grant'    // Given by a higher power
  | 'magical'         // Generated through magic paradigm
  | 'ancestral'       // From lineage/bloodline
  | 'hybrid';         // Multiple sources

// ============================================================================
// Spirit ↔ Deity Relationships
// ============================================================================

/** A spirit's relationship to deities */
export interface SpiritDeityRelation {
  /** Spirit ID */
  spiritId: string;

  /** Deity ID */
  deityId: string;

  /** Nature of relationship */
  relationshipType: SpiritDeityRelationType;

  /** Is this relationship acknowledged by both parties? */
  mutuallyAcknowledged: boolean;

  /** Strength of connection (0-1) */
  bondStrength: number;

  /** Does spirit receive power from deity? */
  receivesPower: boolean;

  /** Does deity receive belief from spirit's worshippers? */
  channelsBelief: boolean;

  /** Established when */
  establishedAt: number;
}

export type SpiritDeityRelationType =
  | 'created_by'        // Deity created this spirit
  | 'serves'            // Spirit serves deity
  | 'aspect_of'         // Spirit is an aspect/avatar of deity
  | 'allied_with'       // Spirit and deity are allies
  | 'protected_by'      // Deity protects spirit
  | 'ascending_toward'  // Spirit is becoming this deity type
  | 'competing_with'    // Spirit and deity compete for same worshippers
  | 'independent'       // Spirit exists in deity's territory but is independent
  | 'hostile_to';       // Spirit actively opposes deity

/** How a deity can create or empower spirits */
export interface DeitySpiritCreation {
  /** Deity creating the spirit */
  deityId: string;

  /** What kind of spirit can be created */
  spiritType: SpiritCategory;

  /** Belief cost to create */
  beliefCost: number;

  /** What powers the spirit inherits */
  inheritedPowers: string[];

  /** Is the spirit independent or bound to serve? */
  independenceLevel: 'bound' | 'loyal' | 'semi_autonomous' | 'fully_autonomous';

  /** Can the spirit disobey? */
  canRebel: boolean;

  /** Maximum spirits of this type deity can maintain */
  maxActive: number;
}

// ============================================================================
// Spirit Ascension - When Spirits Become Gods
// ============================================================================

/**
 * Spirits can accumulate enough respect/worship to transcend into godhood.
 * This is rare but possible - especially for major kami.
 */
export interface SpiritAscensionPath {
  /** Spirit ID potentially ascending */
  spiritId: string;

  /** Current ascension progress (0-1) */
  progress: number;

  /** What's driving the ascension */
  ascensionFactors: AscensionFactor[];

  /** What kind of deity would they become */
  projectedDeityDomain: DivineDomain;

  /** Has the spirit become a proper deity yet? */
  ascended: boolean;

  /** If ascended, the resulting deity ID */
  deityId?: string;
}

export type AscensionFactor =
  | 'widespread_worship'    // Worshipped across regions
  | 'myth_creation'         // Stories told about the spirit
  | 'miracle_witnessed'     // Performed clear supernatural acts
  | 'human_attribution'     // Humans attribute deity-like qualities
  | 'festival_dedicated'    // Has dedicated festivals
  | 'priests_appointed'     // Has dedicated clergy
  | 'syncretism'            // Merged with deity concepts
  | 'divine_acknowledgment' // A deity acknowledged them as peer
  | 'cosmic_event';         // Major event empowered them

/** Thresholds for spirit ascension */
export const ASCENSION_THRESHOLDS = {
  /** Minimum respect for ascension to be possible */
  minimumRespect: 5000,

  /** Number of distinct communities worshipping */
  minimumCommunities: 10,

  /** Minimum years of continuous worship */
  minimumYearsWorshipped: 50,

  /** Factors required for ascension */
  factorsRequired: 3,
} as const;

/** Check if a spirit is eligible for ascension */
export function canAscend(spirit: Spirit, path: SpiritAscensionPath): boolean {
  if (spirit.magnitude !== 'primal' && spirit.magnitude !== 'great') {
    return false;
  }

  if (spirit.totalRespect < ASCENSION_THRESHOLDS.minimumRespect) {
    return false;
  }

  if (path.ascensionFactors.length < ASCENSION_THRESHOLDS.factorsRequired) {
    return false;
  }

  return true;
}

// ============================================================================
// Magic ↔ Divinity Interactions
// ============================================================================

/** How divine power can grant magical abilities */
export interface DivineGrant {
  /** Deity granting power */
  deityId: string;

  /** Recipient entity ID */
  recipientId: string;

  /** Recipient type */
  recipientType: 'mortal' | 'spirit' | 'animal' | 'object';

  /** What magic paradigm does this grant access to? */
  grantedParadigm?: string;

  /** What specific abilities are granted? */
  grantedAbilities: DivineAbility[];

  /** Cost to maintain (belief per tick) */
  maintenanceCost: number;

  /** Can the grant be revoked? */
  revocable: boolean;

  /** Conditions for revocation */
  revocationConditions: string[];
}

export interface DivineAbility {
  name: string;
  description: string;

  /** What magic source type does this use? */
  magicSource: MagicSourceType;

  /** Power level (0-100) */
  powerLevel: number;

  /** Can this ability be used against the granting deity? */
  canBeUsedAgainstGranter: boolean;

  /** Limitations */
  limitations: string[];
}

/** How magic can interact with divine beings */
export interface MagicDivineInteraction {
  /** Magic paradigm ID */
  paradigmId: string;

  /** Deity ID affected */
  deityId: string;

  /** How does this paradigm's magic affect deities? */
  effect: MagicDeityEffect;

  /** Power modifier when targeting deity */
  powerModifier: number;

  /** Special risks when using magic on/from deities */
  risks: string[];
}

export type MagicDeityEffect =
  | 'blocked'           // Magic doesn't affect deities at all
  | 'resisted'          // Deities get massive resistance
  | 'normal'            // Works normally
  | 'amplified'         // Divine presence amplifies magic
  | 'corrupted'         // Magic is twisted by divine nature
  | 'channeled'         // Deity can channel through magical effects
  | 'absorbed';         // Deity absorbs magic as belief

// ============================================================================
// Magic ↔ Animism Interactions
// ============================================================================

/** How magic interacts with spirits */
export interface MagicSpiritInteraction {
  /** Magic paradigm ID */
  paradigmId: string;

  /** Spirit category affected */
  spiritCategory: SpiritCategory;

  /** How does this magic affect these spirits? */
  effect: MagicSpiritEffect;

  /** Can magic bind spirits? */
  bindingPossible: boolean;

  /** Can spirits grant power to this magic type? */
  spiritCanEmpower: boolean;

  /** Respect cost for spirit to empower */
  empowermentCost: number;

  /** Risks of spirit-magic interaction */
  risks: string[];
}

export type MagicSpiritEffect =
  | 'ignored'           // Spirits unaffected by this magic
  | 'offended'          // Magic use offends spirits
  | 'perceived'         // Spirits can perceive magic use
  | 'attracted'         // Magic attracts spirit attention
  | 'repelled'          // Magic drives spirits away
  | 'bound'             // Magic can bind/compel spirits
  | 'empowered'         // Spirits can boost this magic
  | 'harmonized';       // Magic and spirit power work together

/** Spirit-sourced magic capabilities */
export interface SpiritMagicGrant {
  /** Spirit granting power */
  spiritId: string;

  /** Mortal receiving power */
  recipientId: string;

  /** What abilities are granted */
  grantedAbilities: string[];

  /** Respect required to maintain */
  respectRequired: number;

  /** Offerings required */
  offeringsRequired: string[];

  /** Taboos that must be observed */
  taboos: string[];

  /** What happens if taboos are broken */
  tabooViolationConsequence: string;
}

// ============================================================================
// Cross-Species Divine Perception
// ============================================================================

/** How different species perceive different entity types */
export interface CrossSpeciesPerception {
  /** Perceiving species */
  perceiverSpecies: SpeciesCategory | 'human';

  /** Entity being perceived */
  perceivedEntityType: CosmicEntityType;

  /** How clearly can they perceive it? */
  clarity: 'none' | 'vague' | 'distorted' | 'partial' | 'clear';

  /** How do they interpret what they perceive? */
  interpretation: string;

  /** Can they interact with it? */
  canInteract: boolean;

  /** Can their belief affect it? */
  beliefTransfers: boolean;
}

/** Cross-species divine perception matrix */
export const CROSS_SPECIES_PERCEPTION: CrossSpeciesPerception[] = [
  // Humans perceiving
  {
    perceiverSpecies: 'human',
    perceivedEntityType: 'spirit',
    clarity: 'partial',
    interpretation: 'Sense presence, may misinterpret as ghost or deity',
    canInteract: true,
    beliefTransfers: true,
  },
  {
    perceiverSpecies: 'human',
    perceivedEntityType: 'animal_deity',
    clarity: 'distorted',
    interpretation: 'May perceive as strange animal spirit or nature god',
    canInteract: false,
    beliefTransfers: false,
  },

  // Whales perceiving
  {
    perceiverSpecies: 'cetacean',
    perceivedEntityType: 'deity',
    clarity: 'vague',
    interpretation: 'Perceive as strange presence in the water above',
    canInteract: false,
    beliefTransfers: false,
  },
  {
    perceiverSpecies: 'cetacean',
    perceivedEntityType: 'spirit',
    clarity: 'partial',
    interpretation: 'Perceive ocean spirits clearly, land spirits not at all',
    canInteract: true,
    beliefTransfers: true,
  },

  // Corvids perceiving
  {
    perceiverSpecies: 'corvid',
    perceivedEntityType: 'deity',
    clarity: 'distorted',
    interpretation: 'Perceive as powerful presence, may try to steal shiny offerings',
    canInteract: true,
    beliefTransfers: false,
  },
  {
    perceiverSpecies: 'corvid',
    perceivedEntityType: 'spirit',
    clarity: 'clear',
    interpretation: 'Can see spirits clearly, often play tricks on minor ones',
    canInteract: true,
    beliefTransfers: true,
  },
];

// ============================================================================
// Cosmological Hierarchy
// ============================================================================

/** Where different entity types sit in the cosmic hierarchy */
export interface HierarchyPosition {
  entityType: CosmicEntityType;
  baseRank: number;  // 1-10

  /** What determines position within this tier */
  rankFactors: RankFactor[];

  /** Who/what can this entity command? */
  canCommand: CosmicEntityType[];

  /** Who/what must this entity obey? */
  mustObey: CosmicEntityType[];

  /** Who/what is this entity peer to? */
  peersWith: CosmicEntityType[];
}

export type RankFactor =
  | 'belief_amount'
  | 'respect_level'
  | 'age'
  | 'territory_size'
  | 'worshipper_count'
  | 'divine_grant'
  | 'magical_power'
  | 'mythological_importance';

export const COSMIC_HIERARCHY: HierarchyPosition[] = [
  {
    entityType: 'deity',
    baseRank: 8,
    rankFactors: ['belief_amount', 'worshipper_count', 'mythological_importance'],
    canCommand: ['created_spirit', 'divine_servant'],
    mustObey: [],
    peersWith: ['deity', 'ascended_spirit'],
  },
  {
    entityType: 'ascended_spirit',
    baseRank: 7,
    rankFactors: ['belief_amount', 'age', 'territory_size'],
    canCommand: ['spirit', 'created_spirit'],
    mustObey: [],
    peersWith: ['deity', 'ascended_spirit'],
  },
  {
    entityType: 'animal_deity',
    baseRank: 6,
    rankFactors: ['belief_amount', 'territory_size'],
    canCommand: [],
    mustObey: [],
    peersWith: ['animal_deity', 'spirit'],
  },
  {
    entityType: 'spirit',
    baseRank: 4,
    rankFactors: ['respect_level', 'age', 'territory_size'],
    canCommand: ['awakened_object'],
    mustObey: ['deity', 'ascended_spirit'],
    peersWith: ['spirit', 'animal_deity'],
  },
  {
    entityType: 'divine_servant',
    baseRank: 5,
    rankFactors: ['divine_grant', 'magical_power'],
    canCommand: [],
    mustObey: ['deity'],
    peersWith: ['divine_servant', 'spirit'],
  },
  {
    entityType: 'created_spirit',
    baseRank: 3,
    rankFactors: ['divine_grant', 'age'],
    canCommand: [],
    mustObey: ['deity', 'ascended_spirit'],
    peersWith: ['created_spirit', 'awakened_object'],
  },
  {
    entityType: 'awakened_object',
    baseRank: 2,
    rankFactors: ['age', 'magical_power'],
    canCommand: [],
    mustObey: ['spirit'],
    peersWith: ['awakened_object', 'created_spirit'],
  },
  {
    entityType: 'concept_entity',
    baseRank: 5,
    rankFactors: ['belief_amount', 'mythological_importance'],
    canCommand: [],
    mustObey: [],
    peersWith: ['concept_entity', 'spirit'],
  },
];

// ============================================================================
// Belief/Respect Conversion
// ============================================================================

/** How belief and respect currencies convert */
export interface PowerConversion {
  /** Source power type */
  from: 'belief' | 'respect' | 'magical_power';

  /** Target power type */
  to: 'belief' | 'respect' | 'magical_power';

  /** Conversion rate */
  rate: number;

  /** Is this conversion lossy? */
  lossy: boolean;

  /** Conditions for conversion */
  conditions: string[];
}

export const POWER_CONVERSIONS: PowerConversion[] = [
  {
    from: 'belief',
    to: 'respect',
    rate: 0.5,  // Deity can grant respect to spirits at 50% efficiency
    lossy: true,
    conditions: ['Deity must have spirit in their domain'],
  },
  {
    from: 'respect',
    to: 'belief',
    rate: 0.1,  // Spirit worship converting to deity belief is inefficient
    lossy: true,
    conditions: ['Spirit must be associated with deity', 'Worshippers must acknowledge deity'],
  },
  {
    from: 'magical_power',
    to: 'belief',
    rate: 0.2,  // Miracles generate belief
    lossy: true,
    conditions: ['Must be witnessed', 'Must be attributed to deity'],
  },
  {
    from: 'belief',
    to: 'magical_power',
    rate: 1.0,  // Divine power IS magical power
    lossy: false,
    conditions: ['Must have magic paradigm with divine source'],
  },
];

// ============================================================================
// Factory Functions
// ============================================================================

/** Create a deity-spirit relationship */
export function createSpiritDeityRelation(
  spiritId: string,
  deityId: string,
  type: SpiritDeityRelationType
): SpiritDeityRelation {
  const receivesPower = ['created_by', 'serves', 'aspect_of', 'protected_by'].includes(type);
  const channelsBelief = ['aspect_of', 'serves', 'ascending_toward'].includes(type);

  return {
    spiritId,
    deityId,
    relationshipType: type,
    mutuallyAcknowledged: type !== 'independent' && type !== 'hostile_to',
    bondStrength: type === 'aspect_of' ? 1.0 : type === 'created_by' ? 0.8 : 0.5,
    receivesPower,
    channelsBelief,
    establishedAt: Date.now(),
  };
}

/** Create an ascension path for a spirit */
export function createAscensionPath(
  spiritId: string,
  projectedDomain: DivineDomain
): SpiritAscensionPath {
  return {
    spiritId,
    progress: 0,
    ascensionFactors: [],
    projectedDeityDomain: projectedDomain,
    ascended: false,
  };
}

/** Create a divine grant of magical abilities */
export function createDivineGrant(
  deityId: string,
  recipientId: string,
  recipientType: 'mortal' | 'spirit' | 'animal' | 'object',
  abilities: DivineAbility[]
): DivineGrant {
  return {
    deityId,
    recipientId,
    recipientType,
    grantedAbilities: abilities,
    maintenanceCost: abilities.reduce((sum, a) => sum + a.powerLevel * 0.1, 0),
    revocable: true,
    revocationConditions: ['Disobedience', 'Disrespect', 'Serving another deity'],
  };
}

/** Create a spirit magic grant */
export function createSpiritMagicGrant(
  spiritId: string,
  recipientId: string,
  abilities: string[],
  taboos: string[]
): SpiritMagicGrant {
  return {
    spiritId,
    recipientId,
    grantedAbilities: abilities,
    respectRequired: abilities.length * 10,
    offeringsRequired: ['rice', 'sake', 'flowers'],
    taboos,
    tabooViolationConsequence: 'Powers revoked, curse inflicted',
  };
}

// ============================================================================
// Query Functions
// ============================================================================

/** Get the hierarchy position for an entity type */
export function getHierarchyPosition(entityType: CosmicEntityType): HierarchyPosition | undefined {
  return COSMIC_HIERARCHY.find(h => h.entityType === entityType);
}

/** Check if entity A can command entity B */
export function canCommand(commanderType: CosmicEntityType, targetType: CosmicEntityType): boolean {
  const commander = getHierarchyPosition(commanderType);
  if (!commander) return false;
  return commander.canCommand.includes(targetType);
}

/** Get power conversion rate */
export function getConversionRate(
  from: 'belief' | 'respect' | 'magical_power',
  to: 'belief' | 'respect' | 'magical_power'
): number {
  if (from === to) return 1.0;
  const conversion = POWER_CONVERSIONS.find(c => c.from === from && c.to === to);
  return conversion?.rate ?? 0;
}

/** Check how a species perceives an entity type */
export function getPerception(
  species: SpeciesCategory | 'human',
  entityType: CosmicEntityType
): CrossSpeciesPerception | undefined {
  return CROSS_SPECIES_PERCEPTION.find(
    p => p.perceiverSpecies === species && p.perceivedEntityType === entityType
  );
}

// ============================================================================
// Interaction Scenarios
// ============================================================================

/**
 * What happens when a mortal prays?
 * This determines where the prayer energy goes.
 */
export function resolvePrayer(
  _mortalId: string,
  targetDescription: string,
  nearbySpirits: Spirit[],
  nearbyDeities: Deity[]
): PrayerResolution {
  // Prayer targeting is based on mortal's understanding
  // If they pray to "the spirit of the river" it goes to spirit
  // If they pray to "the River God" it goes to deity (or creates one)

  const targetIsSpirit = targetDescription.toLowerCase().includes('spirit');
  const targetIsGod = targetDescription.toLowerCase().includes('god') ||
                      targetDescription.toLowerCase().includes('lord') ||
                      targetDescription.toLowerCase().includes('divine');

  if (targetIsSpirit && nearbySpirits.length > 0) {
    return {
      type: 'spirit',
      targetId: nearbySpirits[0]!.id,
      beliefGenerated: 0.1,
      respectGenerated: 0.2,
      couldCreateDeity: false,
    };
  }

  if (targetIsGod && nearbyDeities.length > 0) {
    return {
      type: 'deity',
      targetId: nearbyDeities[0]!.id,
      beliefGenerated: 0.2,
      respectGenerated: 0,
      couldCreateDeity: false,
    };
  }

  // No matching entity - prayer could crystallize into new deity
  return {
    type: 'unresolved',
    targetId: undefined,
    beliefGenerated: 0.05,  // Small amount goes to proto-deity pool
    respectGenerated: 0,
    couldCreateDeity: true,
  };
}

export interface PrayerResolution {
  type: 'spirit' | 'deity' | 'unresolved';
  targetId?: string;
  beliefGenerated: number;
  respectGenerated: number;
  couldCreateDeity: boolean;
}

/**
 * What happens when a spirit performs an action that could be seen as divine?
 */
export function resolveSpiritMiracle(
  _spirit: Spirit,
  actionType: 'blessing' | 'curse' | 'manifestation',
  witnessCount: number
): SpiritMiracleResult {
  const ascensionBoost = witnessCount * 0.01;
  const beliefGenerated = actionType === 'manifestation' ? witnessCount * 0.5 : witnessCount * 0.2;
  const mythPotential = witnessCount >= 10;

  return {
    respectGained: witnessCount * 0.3,
    beliefGained: beliefGenerated,
    ascensionProgress: ascensionBoost,
    mythCreated: mythPotential,
    humansMisinterpretedAsGod: witnessCount > 20 && actionType === 'manifestation',
  };
}

export interface SpiritMiracleResult {
  respectGained: number;
  beliefGained: number;
  ascensionProgress: number;
  mythCreated: boolean;
  humansMisinterpretedAsGod: boolean;
}
