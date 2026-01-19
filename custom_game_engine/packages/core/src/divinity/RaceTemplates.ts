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
// Race Data Loading
// ============================================================================

/**
 * Load and validate race templates from JSON
 */
function loadRaceTemplates(): RaceTemplate[] {
  const data = raceTemplatesData as { races: RaceTemplate[] };
  const templates = data.races;

  if (!templates || !Array.isArray(templates)) {
    throw new Error('[RaceTemplates] Failed to load race templates from JSON');
  }

  // Validate each template has required fields
  for (const template of templates) {
    if (!template.id || !template.name || !template.nativeRealm || !template.type) {
      const templateId = template.id || 'unknown';
      throw new Error(`[RaceTemplates] Invalid template structure: ${templateId}`);
    }
  }

  return templates;
}

/**
 * All race templates loaded from JSON
 */
export const ALL_RACE_TEMPLATES: RaceTemplate[] = loadRaceTemplates();

// ============================================================================
// Race Registry
// ============================================================================

export const RACE_REGISTRY: Record<string, RaceTemplate> = {};
for (const race of ALL_RACE_TEMPLATES) {
  RACE_REGISTRY[race.id] = race;
}

// ============================================================================
// Legacy Named Exports (for backward compatibility)
// ============================================================================

// Olympus
export const OLYMPIAN_RACE = RACE_REGISTRY['olympian']!;
export const DEMIGOD_RACE = RACE_REGISTRY['demigod']!;
export const NYMPH_RACE = RACE_REGISTRY['nymph']!;
export const SATYR_RACE = RACE_REGISTRY['satyr']!;

// Faerie
export const SIDHE_RACE = RACE_REGISTRY['sidhe']!;
export const PIXIE_RACE = RACE_REGISTRY['pixie']!;
export const REDCAP_RACE = RACE_REGISTRY['redcap']!;

// Hades
export const SHADE_RACE = RACE_REGISTRY['shade']!;
export const FURY_RACE = RACE_REGISTRY['fury']!;

// Asgard
export const AESIR_RACE = RACE_REGISTRY['aesir']!;
export const VALKYRIE_RACE = RACE_REGISTRY['valkyrie']!;
export const EINHERJAR_RACE = RACE_REGISTRY['einherjar']!;

// Heaven
export const SERAPH_RACE = RACE_REGISTRY['seraph']!;
export const ANGEL_RACE = RACE_REGISTRY['angel']!;

// Dreaming
export const ONEIROI_RACE = RACE_REGISTRY['oneiroi']!;
export const NIGHTMARE_RACE = RACE_REGISTRY['nightmare']!;

// Elemental
export const EFREET_RACE = RACE_REGISTRY['efreet']!;
export const DJINN_RACE = RACE_REGISTRY['djinn']!;

// Mortal
export const HUMAN_RACE = RACE_REGISTRY['human']!;


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
