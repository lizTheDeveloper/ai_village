/**
 * RaceTemplates - Mythological Race Definitions
 *
 * Defines known races from various mythological traditions.
 * Each race template specifies:
 * - Native realm association
 * - Lifespan type
 * - Innate traits (affect needs, skills, abilities)
 * - Hybridization compatibility
 * - Realm dependencies
 *
 * See: specs/realm-species-creation.md
 *
 * Race templates are now loaded from JSON data files to separate
 * narrative content from code structure.
 */

import type { SkillId } from '../components/SkillsComponent.js';
import type { RealmPreset } from './MythologicalRealms.js';
import raceTemplatesData from '../../data/race-templates.json';

// ============================================================================
// Racial Trait System
// ============================================================================

export type TraitCategory =
  | 'physical'    // Body modifications (wings, claws, size)
  | 'sensory'     // Enhanced senses (darkvision, tremorsense)
  | 'magical'     // Innate magic (glamour, fire immunity)
  | 'spiritual'   // Soul/divine traits (immortality, oath-binding)
  | 'social';     // Social traits (awe-inspiring, telepathy)

/**
 * A racial trait that affects gameplay.
 */
export interface RacialTrait {
  id: string;
  name: string;
  category: TraitCategory;
  description: string;

  /** Effects on agent components */
  effects?: {
    /** Multipliers for need decay rates (e.g., { hunger: 0.5 } = half hunger decay) */
    needsDecayMultiplier?: Partial<Record<string, number>>;

    /** Bonuses to skill affinities (e.g., { social: 0.3 } = +0.3 affinity) */
    skillAffinityBonus?: Partial<Record<SkillId, number>>;

    /** Abilities granted (e.g., ['flight', 'darkvision']) */
    abilitiesGranted?: string[];

    /** Vulnerabilities (e.g., ['cold_iron', 'sunlight']) */
    vulnerabilities?: string[];

    /** Movement speed multiplier (1.0 = normal) */
    movementMultiplier?: number;

    /** Lifespan multiplier (for long-lived races) */
    lifespanMultiplier?: number;
  };
}

// ============================================================================
// Race Classification
// ============================================================================

export type RaceType =
  | 'mortal'    // Normal lifespan, can die of old age
  | 'spirit'    // Spiritual beings, ageless but can be destroyed
  | 'fae'       // Faerie beings, ageless, bound by oaths
  | 'divine'    // Gods and demigods, immortal
  | 'construct' // Created beings, no natural lifespan
  | 'undead'    // Dead beings, eternal but degrading
  | 'elemental'; // Elemental beings, ageless, tied to element

export type RaceCategory =
  | 'humanoid'   // Human-like form (bipedal, two arms)
  | 'beast'      // Animal-like form (quadruped, etc.)
  | 'elemental'  // Elemental embodiment
  | 'abstract'   // Conceptual/formless
  | 'insectoid'  // Insect-like (exoskeleton, multiple limbs)
  | 'serpentine' // Snake/worm-like (no limbs)
  | 'aquatic'    // Fish/cephalopod-like
  | 'amorphous'  // Shapeless blob
  | 'crystalline' // Crystal/mineral-based life
  | 'gaseous'    // Gas cloud beings
  | 'plant'      // Plant-based life
  | 'machine';   // Artificial/construct bodies

export type LifespanType =
  | 'mortal'     // Dies of old age (use lifespanYears)
  | 'long_lived' // Extended lifespan (use lifespanYears)
  | 'ageless'    // Doesn't age, but can be killed
  | 'immortal';  // Cannot die naturally, very hard to destroy

export type AlignmentTendency = 'lawful' | 'neutral' | 'chaotic';

// ============================================================================
// Body Plan System
// ============================================================================

/**
 * Defines unique body parts beyond the standard humanoid set.
 * Races can add, remove, or modify body parts.
 */
export interface BodyPlanModification {
  /** Parts to add beyond humanoid default */
  addParts?: BodyPartDefinition[];
  /** Parts to remove from humanoid default */
  removeParts?: string[];  // Body part IDs to remove
  /** Parts to modify from humanoid default */
  modifyParts?: BodyPartModification[];
}

export interface BodyPartDefinition {
  id: string;
  name: string;
  type: BodyPartType;
  isCritical: boolean;
  isLimb: boolean;
  /** Does this part grant abilities? */
  grantsAbilities?: string[];
  /** Does this part have special functions? */
  functions?: string[];
  /** Can this part be used as a weapon? */
  naturalWeapon?: NaturalWeapon;
}

export type BodyPartType =
  | 'head'
  | 'sensory'     // Eyes, ears, antennae
  | 'limb'        // Arms, legs, tentacles
  | 'extremity'   // Hands, feet, paws
  | 'organ'       // Heart, lungs, gills
  | 'appendage'   // Tail, wings, horns
  | 'core'        // Main body/torso
  | 'protective'  // Shell, exoskeleton
  | 'other';

export interface BodyPartModification {
  partId: string;
  changes: {
    isCritical?: boolean;
    health?: number;  // Starting health multiplier
    armor?: number;   // Natural armor value
    regenerates?: boolean;
  };
}

export interface NaturalWeapon {
  name: string;
  type: 'piercing' | 'slashing' | 'bludgeoning' | 'acid' | 'fire' | 'cold' | 'psychic';
  damage: number;  // Base damage value
  reach?: number;  // Attack range
}

/**
 * Special organs that modify gameplay.
 */
export interface SpecialOrgan {
  id: string;
  name: string;
  function: OrganFunction;
  effects?: {
    /** Provides redundancy (two hearts = harder to kill) */
    redundancy?: number;
    /** Produces substance (venom glands, silk glands) */
    produces?: string;
    /** Enables ability */
    enablesAbility?: string;
    /** Modifies need decay */
    needsModifier?: Partial<Record<string, number>>;
  };
}

export type OrganFunction =
  | 'circulation'   // Heart, multiple hearts
  | 'respiration'   // Lungs, gills, spiracles
  | 'digestion'     // Stomach, multiple stomachs
  | 'filtration'    // Kidneys, liver
  | 'reproduction'  // Various
  | 'venom'         // Venom glands
  | 'silk'          // Silk production
  | 'electricity'   // Electric organs (eels)
  | 'photosynthesis' // Plant-like energy
  | 'bioluminescence' // Light production
  | 'sonar'         // Echolocation
  | 'magic_focus';  // Magical organ

/**
 * Complete body plan for a race.
 */
export interface BodyPlan {
  /** Base body type */
  baseType: RaceCategory;

  /** Symmetry type */
  symmetry: 'bilateral' | 'radial' | 'asymmetric' | 'none';

  /** Number of limbs by type */
  limbs?: {
    arms?: number;
    legs?: number;
    wings?: number;
    tentacles?: number;
    tails?: number;
  };

  /** Modifications to standard body parts */
  modifications?: BodyPlanModification;

  /** Special organs */
  specialOrgans?: SpecialOrgan[];

  /** Natural weapons (tusks, claws, horns, etc.) */
  naturalWeapons?: NaturalWeapon[];

  /** Natural armor */
  naturalArmor?: {
    type: 'scales' | 'chitin' | 'shell' | 'hide' | 'fur' | 'feathers' | 'bark' | 'crystal' | 'none';
    value: number;  // Damage reduction
    coverage: number;  // 0-1, how much of body is covered
  };

  /** Sensory organs */
  senses?: {
    eyes?: { count: number; type: 'simple' | 'compound' | 'infrared' | 'ultraviolet' | 'telescopic' };
    ears?: { count: number; type: 'standard' | 'echolocation' | 'infrasound' };
    antennae?: number;
    whiskers?: boolean;
    heatPits?: boolean;
    electroreception?: boolean;
  };

  /** Movement types */
  movement?: {
    walk?: boolean;
    run?: boolean;
    climb?: boolean;
    swim?: boolean;
    fly?: boolean;
    burrow?: boolean;
    slither?: boolean;
    teleport?: boolean;
  };

  /** Size category */
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'colossal';

  /** Does this race have blood? What type? */
  blood?: 'red' | 'blue' | 'green' | 'ichor' | 'sap' | 'none';

  /** Skeleton type */
  skeleton?: 'internal' | 'exoskeleton' | 'hydrostatic' | 'none';
}

// ============================================================================
// Race Template
// ============================================================================

/**
 * Complete definition of a mythological race.
 */
export interface RaceTemplate {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description for lore/UI */
  description: string;

  /** Which realm preset is this race native to? */
  nativeRealm: RealmPreset | 'mortal_world';

  /** Type classification */
  type: RaceType;

  /** Form category */
  category: RaceCategory;

  /** How long they live */
  lifespan: LifespanType;

  /** Years if mortal or long_lived */
  lifespanYears?: number;

  /** Traits all members have */
  innateTraits: RacialTrait[];

  /** Physical body plan - defines anatomy, organs, natural weapons */
  bodyPlan?: BodyPlan;

  /** Can this race interbreed with others? */
  canHybridize: boolean;

  /** Which race IDs can interbreed with this race? */
  hybridCompatible: string[];

  /** Must this race stay in its native realm? */
  realmBound: boolean;

  /** Can they survive outside their realm? */
  canSurviveMortalWorld: boolean;

  /** What happens outside their realm? */
  mortalWorldWeakness?: string;

  /** Typical moral alignment */
  typicalAlignment?: AlignmentTendency;

  /** Default society structure */
  societyType?: string;
}

// ============================================================================
// Common Traits (Reusable across races)
// ============================================================================

export const COMMON_TRAITS: Record<string, RacialTrait> = {
  // Physical
  flight: {
    id: 'flight',
    name: 'Flight',
    category: 'physical',
    description: 'Can fly through the air',
    effects: {
      abilitiesGranted: ['flight'],
      movementMultiplier: 1.5,
    },
  },

  enhanced_strength: {
    id: 'enhanced_strength',
    name: 'Enhanced Strength',
    category: 'physical',
    description: 'Supernaturally strong',
    effects: {
      skillAffinityBonus: { combat: 0.3, building: 0.2 },
    },
  },

  tiny_form: {
    id: 'tiny_form',
    name: 'Tiny Form',
    category: 'physical',
    description: 'Very small size',
    effects: {
      needsDecayMultiplier: { hunger: 0.5 },
      movementMultiplier: 0.8,
    },
  },

  // Sensory
  darkvision: {
    id: 'darkvision',
    name: 'Darkvision',
    category: 'sensory',
    description: 'Can see in complete darkness',
    effects: {
      abilitiesGranted: ['darkvision'],
    },
  },

  spirit_sight: {
    id: 'spirit_sight',
    name: 'Spirit Sight',
    category: 'sensory',
    description: 'Can perceive spirits and divine presences',
    effects: {
      abilitiesGranted: ['spirit_sight'],
    },
  },

  // Magical
  glamour: {
    id: 'glamour',
    name: 'Glamour',
    category: 'magical',
    description: 'Natural illusion magic',
    effects: {
      abilitiesGranted: ['glamour', 'illusion'],
      skillAffinityBonus: { social: 0.3 },
    },
  },

  shapeshifting: {
    id: 'shapeshifting',
    name: 'Shapeshifting',
    category: 'magical',
    description: 'Can assume other forms',
    effects: {
      abilitiesGranted: ['shapeshift'],
    },
  },

  fire_immunity: {
    id: 'fire_immunity',
    name: 'Fire Immunity',
    category: 'magical',
    description: 'Immune to fire and heat',
    effects: {
      abilitiesGranted: ['fire_immunity'],
    },
  },

  water_breathing: {
    id: 'water_breathing',
    name: 'Water Breathing',
    category: 'magical',
    description: 'Can breathe underwater',
    effects: {
      abilitiesGranted: ['water_breathing'],
    },
  },

  // Spiritual
  ageless: {
    id: 'ageless',
    name: 'Ageless',
    category: 'spiritual',
    description: 'Does not age',
    effects: {
      lifespanMultiplier: Infinity,
    },
  },

  oath_bound: {
    id: 'oath_bound',
    name: 'Oath-Bound',
    category: 'spiritual',
    description: 'Cannot break sworn oaths',
    effects: {
      abilitiesGranted: ['oath_bound'],
    },
  },

  true_name_vulnerable: {
    id: 'true_name_vulnerable',
    name: 'True Name Vulnerable',
    category: 'spiritual',
    description: 'True name grants power over them',
    effects: {
      vulnerabilities: ['true_name'],
    },
  },

  revive_daily: {
    id: 'revive_daily',
    name: 'Daily Revival',
    category: 'spiritual',
    description: 'Revives each dawn after death',
    effects: {
      abilitiesGranted: ['daily_revival'],
    },
  },

  // Social
  divine_beauty: {
    id: 'divine_beauty',
    name: 'Divine Beauty',
    category: 'social',
    description: 'Inspires awe in mortals',
    effects: {
      skillAffinityBonus: { social: 0.5 },
    },
  },

  terror_aura: {
    id: 'terror_aura',
    name: 'Terror Aura',
    category: 'social',
    description: 'Inspires fear in others',
    effects: {
      abilitiesGranted: ['terror_aura'],
    },
  },

  // Vulnerabilities as traits
  iron_weakness: {
    id: 'iron_weakness',
    name: 'Cold Iron Weakness',
    category: 'magical',
    description: 'Cold iron burns and disrupts magic',
    effects: {
      vulnerabilities: ['cold_iron'],
    },
  },

  sunlight_weakness: {
    id: 'sunlight_weakness',
    name: 'Sunlight Weakness',
    category: 'physical',
    description: 'Sunlight causes harm',
    effects: {
      vulnerabilities: ['sunlight'],
    },
  },
};

// ============================================================================
// Known Races by Realm
// ============================================================================

// ----- OLYMPUS (Greek Celestial) -----

export const OLYMPIAN_RACE: RaceTemplate = {
  id: 'olympian',
  name: 'Olympian',
  description: 'The gods of Mount Olympus, beings of immense divine power',
  nativeRealm: 'olympus',
  type: 'divine',
  category: 'humanoid',
  lifespan: 'immortal',
  innateTraits: [
    COMMON_TRAITS.shapeshifting!,
    COMMON_TRAITS.divine_beauty!,
    {
      id: 'domain_power',
      name: 'Domain Power',
      category: 'spiritual',
      description: 'Commands a fundamental aspect of reality',
      effects: { abilitiesGranted: ['domain_power'] },
    },
    {
      id: 'ichor_blood',
      name: 'Ichor Blood',
      category: 'physical',
      description: 'Divine blood, not mortal blood',
      effects: { abilitiesGranted: ['ichor_blood'] },
    },
  ],
  canHybridize: true,
  hybridCompatible: ['human', 'nymph'],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'neutral',
  societyType: 'divine_court',
};

export const DEMIGOD_RACE: RaceTemplate = {
  id: 'demigod',
  name: 'Demigod',
  description: 'Children of gods and mortals, blessed with divine power',
  nativeRealm: 'olympus',
  type: 'spirit',
  category: 'humanoid',
  lifespan: 'long_lived',
  lifespanYears: 500,
  innateTraits: [
    COMMON_TRAITS.enhanced_strength!,
    {
      id: 'heroic_destiny',
      name: 'Heroic Destiny',
      category: 'spiritual',
      description: 'Fated for great deeds',
      effects: {
        skillAffinityBonus: { combat: 0.2, exploration: 0.2 },
        abilitiesGranted: ['heroic_destiny'],
      },
    },
    {
      id: 'divine_parentage',
      name: 'Divine Parentage',
      category: 'spiritual',
      description: 'One parent is a god, granting partial divine favor',
      effects: { abilitiesGranted: ['divine_favor'] },
    },
  ],
  canHybridize: true,
  hybridCompatible: ['human', 'nymph'],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'neutral',
  societyType: 'heroic_band',
};

export const NYMPH_RACE: RaceTemplate = {
  id: 'nymph',
  name: 'Nymph',
  description: 'Nature spirits tied to specific locations',
  nativeRealm: 'olympus',
  type: 'spirit',
  category: 'humanoid',
  lifespan: 'ageless',
  innateTraits: [
    {
      id: 'location_bound',
      name: 'Location-Bound',
      category: 'spiritual',
      description: 'Tied to a specific natural feature',
      effects: { abilitiesGranted: ['location_bound'] },
    },
    {
      id: 'nature_magic',
      name: 'Nature Magic',
      category: 'magical',
      description: 'Innate connection to nature',
      effects: {
        skillAffinityBonus: { farming: 0.3, gathering: 0.3 },
        abilitiesGranted: ['nature_magic'],
      },
    },
    COMMON_TRAITS.divine_beauty!,
  ],
  canHybridize: true,
  hybridCompatible: ['human', 'olympian', 'satyr'],
  realmBound: false,
  canSurviveMortalWorld: true,
  mortalWorldWeakness: 'Weakens if separated from bound location',
  typicalAlignment: 'neutral',
  societyType: 'loose_gathering',
};

export const SATYR_RACE: RaceTemplate = {
  id: 'satyr',
  name: 'Satyr',
  description: 'Wild nature spirits of revelry and music',
  nativeRealm: 'olympus',
  type: 'fae',
  category: 'humanoid',
  lifespan: 'long_lived',
  lifespanYears: 300,
  innateTraits: [
    {
      id: 'wild_nature',
      name: 'Wild Nature',
      category: 'spiritual',
      description: 'Attuned to wilderness and primal joy',
      effects: {
        skillAffinityBonus: { exploration: 0.3 },
        needsDecayMultiplier: { stimulation: 2.0 }, // Needs more stimulation
      },
    },
    {
      id: 'musical_magic',
      name: 'Musical Magic',
      category: 'magical',
      description: 'Music carries magical influence',
      effects: {
        skillAffinityBonus: { social: 0.3 },
        abilitiesGranted: ['musical_magic'],
      },
    },
  ],
  canHybridize: true,
  hybridCompatible: ['human', 'nymph'],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'chaotic',
  societyType: 'revelry_band',
};

// ----- FAERIE (Wild Realm) -----

export const SIDHE_RACE: RaceTemplate = {
  id: 'sidhe',
  name: 'Sidhe',
  description: 'The noble fae, ageless beings of glamour bound by oaths',
  nativeRealm: 'faerie',
  type: 'fae',
  category: 'humanoid',
  lifespan: 'ageless',
  innateTraits: [
    COMMON_TRAITS.glamour!,
    COMMON_TRAITS.oath_bound!,
    COMMON_TRAITS.iron_weakness!,
    COMMON_TRAITS.true_name_vulnerable!,
    {
      id: 'time_unaware',
      name: 'Time Unaware',
      category: 'spiritual',
      description: 'Poor sense of mortal time passing',
      effects: { abilitiesGranted: ['time_unaware'] },
    },
  ],
  canHybridize: true,
  hybridCompatible: ['human', 'elf'],
  realmBound: false,
  canSurviveMortalWorld: true,
  mortalWorldWeakness: 'Powers diminished, iron more common',
  typicalAlignment: 'chaotic',
  societyType: 'feudal_courts',
};

export const PIXIE_RACE: RaceTemplate = {
  id: 'pixie',
  name: 'Pixie',
  description: 'Tiny winged fae of mischief and wonder',
  nativeRealm: 'faerie',
  type: 'fae',
  category: 'humanoid',
  lifespan: 'long_lived',
  lifespanYears: 500,
  innateTraits: [
    COMMON_TRAITS.tiny_form!,
    COMMON_TRAITS.flight!,
    COMMON_TRAITS.glamour!,
    COMMON_TRAITS.iron_weakness!,
    {
      id: 'mischief_magic',
      name: 'Mischief Magic',
      category: 'magical',
      description: 'Natural talent for harmless pranks',
      effects: { abilitiesGranted: ['mischief_magic'] },
    },
  ],
  canHybridize: false,
  hybridCompatible: [],
  realmBound: false,
  canSurviveMortalWorld: true,
  mortalWorldWeakness: 'More vulnerable to iron',
  typicalAlignment: 'chaotic',
  societyType: 'swarm',
};

export const REDCAP_RACE: RaceTemplate = {
  id: 'redcap',
  name: 'Redcap',
  description: 'Murderous fae that must soak their caps in blood',
  nativeRealm: 'faerie',
  type: 'fae',
  category: 'humanoid',
  lifespan: 'ageless',
  innateTraits: [
    COMMON_TRAITS.enhanced_strength!,
    COMMON_TRAITS.iron_weakness!,
    {
      id: 'blood_requirement',
      name: 'Blood Requirement',
      category: 'spiritual',
      description: 'Must regularly soak cap in fresh blood or weaken',
      effects: {
        abilitiesGranted: ['blood_requirement'],
        // Special need that must be satisfied
      },
    },
    {
      id: 'iron_boots',
      name: 'Iron Boots',
      category: 'physical',
      description: 'Wears iron boots despite fae nature',
      effects: { movementMultiplier: 0.8 },
    },
  ],
  canHybridize: false,
  hybridCompatible: [],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'chaotic',
  societyType: 'solitary',
};

// ----- HADES (Greek Underworld) -----

export const SHADE_RACE: RaceTemplate = {
  id: 'shade',
  name: 'Shade',
  description: 'Souls of the dead, faded memories of the living',
  nativeRealm: 'hades',
  type: 'undead',
  category: 'humanoid',
  lifespan: 'ageless',
  innateTraits: [
    {
      id: 'insubstantial',
      name: 'Insubstantial',
      category: 'physical',
      description: 'Partially incorporeal, can pass through matter',
      effects: {
        abilitiesGranted: ['incorporeal'],
        needsDecayMultiplier: { hunger: 0, thirst: 0 }, // No physical needs
      },
    },
    {
      id: 'memory_faded',
      name: 'Memory-Faded',
      category: 'spiritual',
      description: 'Memories of life slowly fade',
      effects: { abilitiesGranted: ['memory_faded'] },
    },
    {
      id: 'underworld_bound',
      name: 'Underworld-Bound',
      category: 'spiritual',
      description: 'Cannot leave the underworld without permission',
      effects: { abilitiesGranted: ['realm_bound'] },
    },
  ],
  canHybridize: false,
  hybridCompatible: [],
  realmBound: true,
  canSurviveMortalWorld: false,
  mortalWorldWeakness: 'Fades into nothing without underworld energy',
  typicalAlignment: 'neutral',
  societyType: 'wandering_masses',
};

export const FURY_RACE: RaceTemplate = {
  id: 'fury',
  name: 'Fury',
  description: 'Spirits of vengeance, relentless pursuers of the guilty',
  nativeRealm: 'hades',
  type: 'divine',
  category: 'humanoid',
  lifespan: 'immortal',
  innateTraits: [
    COMMON_TRAITS.flight!,
    COMMON_TRAITS.terror_aura!,
    {
      id: 'vengeance_incarnate',
      name: 'Vengeance Incarnate',
      category: 'spiritual',
      description: 'Can sense guilt and track wrongdoers',
      effects: {
        abilitiesGranted: ['sense_guilt', 'relentless_pursuit'],
      },
    },
    {
      id: 'divine_mandate',
      name: 'Divine Mandate',
      category: 'spiritual',
      description: 'Empowered by the gods to punish the guilty',
      effects: { abilitiesGranted: ['divine_mandate'] },
    },
  ],
  canHybridize: false,
  hybridCompatible: [],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'lawful',
  societyType: 'trio',
};

// ----- ASGARD (Norse Celestial) -----

export const AESIR_RACE: RaceTemplate = {
  id: 'aesir',
  name: 'Aesir',
  description: 'Warrior gods of Asgard, bound by fate to die at Ragnarok',
  nativeRealm: 'asgard',
  type: 'divine',
  category: 'humanoid',
  lifespan: 'ageless', // Ageless but not truly immortal (Ragnarok)
  innateTraits: [
    COMMON_TRAITS.enhanced_strength!,
    {
      id: 'fate_bound',
      name: 'Fate-Bound',
      category: 'spiritual',
      description: 'Destiny is fixed, cannot avoid prophesied doom',
      effects: { abilitiesGranted: ['fate_bound'] },
    },
    {
      id: 'ragnarok_doomed',
      name: 'Ragnarok-Doomed',
      category: 'spiritual',
      description: 'Will die at the end of all things',
      effects: { abilitiesGranted: ['ragnarok_doomed'] },
    },
    {
      id: 'golden_apple_dependent',
      name: 'Golden Apple Dependent',
      category: 'physical',
      description: 'Requires Idunn\'s apples to maintain youth',
      effects: { abilitiesGranted: ['apple_dependent'] },
    },
  ],
  canHybridize: true,
  hybridCompatible: ['human', 'jotun'],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'lawful',
  societyType: 'divine_court',
};

export const VALKYRIE_RACE: RaceTemplate = {
  id: 'valkyrie',
  name: 'Valkyrie',
  description: 'Choosers of the slain, servants of Odin',
  nativeRealm: 'asgard',
  type: 'spirit',
  category: 'humanoid',
  lifespan: 'ageless',
  innateTraits: [
    COMMON_TRAITS.flight!,
    COMMON_TRAITS.enhanced_strength!,
    {
      id: 'soul_collector',
      name: 'Soul Collector',
      category: 'spiritual',
      description: 'Can perceive and gather the souls of the worthy dead',
      effects: {
        abilitiesGranted: ['soul_sight', 'soul_collection'],
      },
    },
    {
      id: 'battle_chooser',
      name: 'Battle Chooser',
      category: 'spiritual',
      description: 'Can influence the outcome of battles',
      effects: {
        skillAffinityBonus: { combat: 0.5 },
        abilitiesGranted: ['battle_influence'],
      },
    },
  ],
  canHybridize: false,
  hybridCompatible: [],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'lawful',
  societyType: 'sisterhood',
};

export const EINHERJAR_RACE: RaceTemplate = {
  id: 'einherjar',
  name: 'Einherjar',
  description: 'Glorious warriors who died in battle, training for Ragnarok',
  nativeRealm: 'valhalla',
  type: 'undead',
  category: 'humanoid',
  lifespan: 'ageless', // Until Ragnarok
  innateTraits: [
    COMMON_TRAITS.enhanced_strength!,
    COMMON_TRAITS.revive_daily!,
    {
      id: 'eternal_warrior',
      name: 'Eternal Warrior',
      category: 'spiritual',
      description: 'Fights eternally, improving every day',
      effects: {
        skillAffinityBonus: { combat: 0.5 },
        abilitiesGranted: ['eternal_training'],
      },
    },
    {
      id: 'ragnarok_bound',
      name: 'Ragnarok-Bound',
      category: 'spiritual',
      description: 'Will fight in the final battle',
      effects: { abilitiesGranted: ['ragnarok_bound'] },
    },
  ],
  canHybridize: false,
  hybridCompatible: [],
  realmBound: true,
  canSurviveMortalWorld: false,
  mortalWorldWeakness: 'Cannot revive outside Valhalla',
  typicalAlignment: 'lawful',
  societyType: 'warrior_band',
};

// ----- HEAVEN (Monotheistic Paradise) -----

export const SERAPH_RACE: RaceTemplate = {
  id: 'seraph',
  name: 'Seraph',
  description: 'Six-winged angels of pure worship, burning with divine fire',
  nativeRealm: 'heaven',
  type: 'divine',
  category: 'abstract',
  lifespan: 'immortal',
  innateTraits: [
    COMMON_TRAITS.flight!,
    COMMON_TRAITS.fire_immunity!,
    {
      id: 'six_wings',
      name: 'Six Wings',
      category: 'physical',
      description: 'Three pairs of wings for flying, covering, and worship',
      effects: {
        movementMultiplier: 2.0,
        abilitiesGranted: ['six_wings'],
      },
    },
    {
      id: 'burning_presence',
      name: 'Burning Presence',
      category: 'magical',
      description: 'Body burns with holy fire',
      effects: {
        abilitiesGranted: ['burning_aura', 'purification'],
      },
    },
    {
      id: 'pure_worship',
      name: 'Pure Worship',
      category: 'spiritual',
      description: 'Exists solely to worship the divine',
      effects: { abilitiesGranted: ['eternal_worship'] },
    },
  ],
  canHybridize: false,
  hybridCompatible: [],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'lawful',
  societyType: 'celestial_choir',
};

export const ANGEL_RACE: RaceTemplate = {
  id: 'angel',
  name: 'Angel',
  description: 'Divine messengers and servants',
  nativeRealm: 'heaven',
  type: 'spirit',
  category: 'humanoid',
  lifespan: 'immortal',
  innateTraits: [
    COMMON_TRAITS.flight!,
    COMMON_TRAITS.divine_beauty!,
    COMMON_TRAITS.spirit_sight!,
    {
      id: 'holy_light',
      name: 'Holy Light',
      category: 'magical',
      description: 'Can manifest divine light',
      effects: { abilitiesGranted: ['holy_light', 'smite'] },
    },
    {
      id: 'divine_messenger',
      name: 'Divine Messenger',
      category: 'spiritual',
      description: 'Can deliver messages across realms',
      effects: { abilitiesGranted: ['realm_messenger'] },
    },
  ],
  canHybridize: false,
  hybridCompatible: [],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'lawful',
  societyType: 'celestial_hierarchy',
};

// ----- THE DREAMING (Dream Realm) -----

export const ONEIROI_RACE: RaceTemplate = {
  id: 'oneiroi',
  name: 'Oneiroi',
  description: 'Personifications of dreams, children of Nyx',
  nativeRealm: 'dreaming',
  type: 'spirit',
  category: 'abstract',
  lifespan: 'ageless',
  innateTraits: [
    COMMON_TRAITS.shapeshifting!,
    {
      id: 'dream_shaping',
      name: 'Dream-Shaping',
      category: 'magical',
      description: 'Can shape and control dreams',
      effects: { abilitiesGranted: ['dream_shaping', 'dream_walking'] },
    },
    {
      id: 'mind_walking',
      name: 'Mind-Walking',
      category: 'magical',
      description: 'Can enter sleeping minds',
      effects: { abilitiesGranted: ['mind_walking'] },
    },
    {
      id: 'dream_dependent',
      name: 'Dream-Dependent',
      category: 'spiritual',
      description: 'Power waxes and wanes with dreaming mortals',
      effects: { abilitiesGranted: ['dream_dependent'] },
    },
  ],
  canHybridize: false,
  hybridCompatible: [],
  realmBound: false,
  canSurviveMortalWorld: true,
  mortalWorldWeakness: 'Weakened when no one is dreaming',
  typicalAlignment: 'neutral',
  societyType: 'loose_family',
};

export const NIGHTMARE_RACE: RaceTemplate = {
  id: 'nightmare',
  name: 'Nightmare',
  description: 'Spirits of terror that feed on fear',
  nativeRealm: 'dreaming',
  type: 'spirit',
  category: 'abstract',
  lifespan: 'ageless',
  innateTraits: [
    COMMON_TRAITS.terror_aura!,
    COMMON_TRAITS.shapeshifting!,
    {
      id: 'fear_feeding',
      name: 'Fear-Feeding',
      category: 'spiritual',
      description: 'Feeds on terror to sustain itself',
      effects: { abilitiesGranted: ['fear_feeding'] },
    },
    {
      id: 'terror_form',
      name: 'Terror Form',
      category: 'magical',
      description: 'Appears as the viewer\'s worst fear',
      effects: { abilitiesGranted: ['terror_form'] },
    },
  ],
  canHybridize: false,
  hybridCompatible: [],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'chaotic',
  societyType: 'solitary',
};

// ----- ELEMENTAL PLANES -----

export const EFREET_RACE: RaceTemplate = {
  id: 'efreet',
  name: 'Efreet',
  description: 'Powerful fire spirits of pride and passion',
  nativeRealm: 'elemental_fire',
  type: 'elemental',
  category: 'humanoid',
  lifespan: 'ageless',
  innateTraits: [
    COMMON_TRAITS.fire_immunity!,
    COMMON_TRAITS.enhanced_strength!,
    {
      id: 'fire_generation',
      name: 'Fire Generation',
      category: 'magical',
      description: 'Body generates intense heat',
      effects: { abilitiesGranted: ['fire_generation', 'fire_control'] },
    },
    {
      id: 'wish_granting',
      name: 'Wish-Granting',
      category: 'magical',
      description: 'Can grant wishes (with twists)',
      effects: { abilitiesGranted: ['wish_granting'] },
    },
    {
      id: 'prideful_nature',
      name: 'Prideful Nature',
      category: 'social',
      description: 'Easily offended, slow to forgive',
      effects: { skillAffinityBonus: { social: -0.2 } },
    },
  ],
  canHybridize: true,
  hybridCompatible: ['djinn', 'human'],
  realmBound: false,
  canSurviveMortalWorld: true,
  mortalWorldWeakness: 'Water causes pain',
  typicalAlignment: 'lawful',
  societyType: 'sultanate',
};

export const DJINN_RACE: RaceTemplate = {
  id: 'djinn',
  name: 'Djinn',
  description: 'Air spirits of freedom and trickery',
  nativeRealm: 'elemental_fire', // Using elemental_fire as placeholder for air
  type: 'elemental',
  category: 'humanoid',
  lifespan: 'ageless',
  innateTraits: [
    COMMON_TRAITS.flight!,
    COMMON_TRAITS.shapeshifting!,
    {
      id: 'wind_control',
      name: 'Wind Control',
      category: 'magical',
      description: 'Commands winds and air',
      effects: {
        movementMultiplier: 2.0,
        abilitiesGranted: ['wind_control'],
      },
    },
    {
      id: 'wish_granting',
      name: 'Wish-Granting',
      category: 'magical',
      description: 'Can grant wishes (often literally)',
      effects: { abilitiesGranted: ['wish_granting'] },
    },
    {
      id: 'trickster_nature',
      name: 'Trickster Nature',
      category: 'social',
      description: 'Loves to play tricks and games',
      effects: { skillAffinityBonus: { social: 0.2 } },
    },
  ],
  canHybridize: true,
  hybridCompatible: ['efreet', 'human'],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'chaotic',
  societyType: 'loose_tribes',
};

// ----- MORTAL WORLD -----

export const HUMAN_RACE: RaceTemplate = {
  id: 'human',
  name: 'Human',
  description: 'Mortal beings of adaptability and ambition',
  nativeRealm: 'mortal_world',
  type: 'mortal',
  category: 'humanoid',
  lifespan: 'mortal',
  lifespanYears: 80,
  innateTraits: [
    {
      id: 'adaptability',
      name: 'Adaptability',
      category: 'spiritual',
      description: 'Can thrive in any environment and learn any skill',
      effects: {
        skillAffinityBonus: {
          building: 0.1,
          farming: 0.1,
          gathering: 0.1,
          cooking: 0.1,
          crafting: 0.1,
          social: 0.1,
          exploration: 0.1,
          combat: 0.1,
          animal_handling: 0.1,
          medicine: 0.1,
        },
      },
    },
    {
      id: 'mortal_ambition',
      name: 'Mortal Ambition',
      category: 'spiritual',
      description: 'Limited lifespan drives achievement',
      effects: { abilitiesGranted: ['ambition'] },
    },
  ],
  canHybridize: true,
  hybridCompatible: ['olympian', 'demigod', 'nymph', 'satyr', 'sidhe', 'efreet', 'djinn'],
  realmBound: false,
  canSurviveMortalWorld: true,
  typicalAlignment: 'neutral',
  societyType: 'various',
};

// ============================================================================
// Race Registry
// ============================================================================

export const ALL_RACE_TEMPLATES: RaceTemplate[] = [
  // Olympus
  OLYMPIAN_RACE,
  DEMIGOD_RACE,
  NYMPH_RACE,
  SATYR_RACE,
  // Faerie
  SIDHE_RACE,
  PIXIE_RACE,
  REDCAP_RACE,
  // Hades
  SHADE_RACE,
  FURY_RACE,
  // Asgard
  AESIR_RACE,
  VALKYRIE_RACE,
  EINHERJAR_RACE,
  // Heaven
  SERAPH_RACE,
  ANGEL_RACE,
  // Dreaming
  ONEIROI_RACE,
  NIGHTMARE_RACE,
  // Elemental
  EFREET_RACE,
  DJINN_RACE,
  // Mortal
  HUMAN_RACE,
];

export const RACE_REGISTRY: Record<string, RaceTemplate> = {};
for (const race of ALL_RACE_TEMPLATES) {
  RACE_REGISTRY[race.id] = race;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a race template by ID.
 */
export function getRaceTemplate(raceId: string): RaceTemplate | undefined {
  return RACE_REGISTRY[raceId];
}

/**
 * Get all races native to a realm.
 */
export function getRacesByRealm(realmPreset: RealmPreset | 'mortal_world'): RaceTemplate[] {
  return ALL_RACE_TEMPLATES.filter(race => race.nativeRealm === realmPreset);
}

/**
 * Get all races of a specific type.
 */
export function getRacesByType(type: RaceType): RaceTemplate[] {
  return ALL_RACE_TEMPLATES.filter(race => race.type === type);
}

/**
 * Check if two races can produce hybrids.
 */
export function canHybridize(race1Id: string, race2Id: string): boolean {
  const race1 = RACE_REGISTRY[race1Id];
  const race2 = RACE_REGISTRY[race2Id];

  if (!race1 || !race2) return false;
  if (!race1.canHybridize || !race2.canHybridize) return false;

  return (
    race1.hybridCompatible.includes(race2Id) ||
    race2.hybridCompatible.includes(race1Id)
  );
}

/**
 * Get all traits for a race (flattened).
 */
export function getRaceTraits(raceId: string): RacialTrait[] {
  const race = RACE_REGISTRY[raceId];
  return race ? race.innateTraits : [];
}

/**
 * Calculate combined skill affinity bonuses from race traits.
 */
export function getRaceSkillBonuses(raceId: string): Partial<Record<SkillId, number>> {
  const traits = getRaceTraits(raceId);
  const bonuses: Partial<Record<SkillId, number>> = {};

  for (const trait of traits) {
    if (trait.effects?.skillAffinityBonus) {
      for (const [skill, bonus] of Object.entries(trait.effects.skillAffinityBonus)) {
        const skillId = skill as SkillId;
        bonuses[skillId] = (bonuses[skillId] ?? 0) + (bonus ?? 0);
      }
    }
  }

  return bonuses;
}

/**
 * Calculate combined need decay multipliers from race traits.
 */
export function getRaceNeedsMultipliers(raceId: string): Record<string, number> {
  const traits = getRaceTraits(raceId);
  const multipliers: Record<string, number> = {};

  for (const trait of traits) {
    if (trait.effects?.needsDecayMultiplier) {
      for (const [need, mult] of Object.entries(trait.effects.needsDecayMultiplier)) {
        // Combine multiplicatively
        multipliers[need] = (multipliers[need] ?? 1) * (mult ?? 1);
      }
    }
  }

  return multipliers;
}

/**
 * Get all abilities granted by a race.
 */
export function getRaceAbilities(raceId: string): string[] {
  const traits = getRaceTraits(raceId);
  const abilities: string[] = [];

  for (const trait of traits) {
    if (trait.effects?.abilitiesGranted) {
      abilities.push(...trait.effects.abilitiesGranted);
    }
  }

  return [...new Set(abilities)]; // Deduplicate
}

/**
 * Get all vulnerabilities for a race.
 */
export function getRaceVulnerabilities(raceId: string): string[] {
  const traits = getRaceTraits(raceId);
  const vulnerabilities: string[] = [];

  for (const trait of traits) {
    if (trait.effects?.vulnerabilities) {
      vulnerabilities.push(...trait.effects.vulnerabilities);
    }
  }

  return [...new Set(vulnerabilities)];
}
