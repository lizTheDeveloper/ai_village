/**
 * Material Effects System
 *
 * Every material in the game has inherent magical and practical effects.
 * Buildings, items, and other constructs derive their properties from
 * the materials they're made of.
 *
 * This system provides:
 * - Unified material definitions (standard + exotic)
 * - Magical/effect properties for each material
 * - Calculation functions for buildings and items
 * - Paradigm affinities based on material nature
 */

import { MagicParadigm, FengShuiElement, MagicalEffect, Material } from './types';

// Re-export Material from types.ts for convenience
export type { Material } from './types';

// =============================================================================
// MATERIAL EFFECT PROPERTIES
// =============================================================================

/**
 * Complete effect properties for a material.
 * Every material has these - even mundane ones have subtle effects.
 */
export interface MaterialEffectProperties {
  // === Physical Properties ===
  /** Heat retention (0-100) */
  insulation: number;
  /** Resistance to damage (0-100) */
  durability: number;
  /** How reality-bending the material is (0-100) */
  weirdness: number;
  /** Upkeep difficulty (0-100) */
  maintenance: number;
  /** Weight per unit volume (0-100, 50 = normal) */
  density: number;

  // === Basic Flags ===
  edible: boolean;
  alive: boolean;
  glows: boolean;
  intangible: boolean;
  flammable: boolean;
  conducts_magic: boolean;
  conducts_electricity: boolean;

  // === Magical Properties ===
  /** Mana regeneration modifier (1.0 = normal, 2.0 = double) */
  manaRegen: number;
  /** Spell power modifier (percentage bonus, 0 = none) */
  spellPower: number;
  /** Casting cost modifier (negative = cheaper) */
  costModifier: number;
  /** Spell range modifier (percentage bonus) */
  rangeModifier: number;
  /** Spell duration modifier (percentage bonus) */
  durationModifier: number;
  /** Protection/resistance bonus */
  protection: number;

  // === Paradigm Affinities ===
  /** Which magic paradigms this material enhances */
  paradigmAffinities: Partial<Record<MagicParadigm, number>>;

  // === Elemental Properties ===
  /** Feng shui element this material resonates with */
  element: FengShuiElement | null;
  /** Strength of elemental resonance (0-100) */
  elementalStrength: number;

  // === Special Effects ===
  /** Unique effects this material provides */
  specialEffects: MaterialSpecialEffect[];

  // === Mood/Psychological ===
  /** Mood modifier for occupants */
  moodModifier: number;
  /** Psychological effects (comfort, unease, etc.) */
  atmosphere: 'comforting' | 'neutral' | 'unsettling' | 'terrifying' | 'euphoric' | 'dreamy' | 'energizing' | 'calming';

  // === Description ===
  description: string;
  lore?: string;
}

/**
 * Special effects that materials can provide.
 */
export interface MaterialSpecialEffect {
  /** Effect type - extensible to support any material-specific effects */
  type: string;
  magnitude: number;  // Strength of effect
  radius?: number;    // Area of effect (if applicable)
  description: string;
}

// =============================================================================
// MATERIAL EFFECT DEFINITIONS
// =============================================================================

/**
 * Default properties (for materials not explicitly defined)
 */
const DEFAULT_PROPERTIES: MaterialEffectProperties = {
  insulation: 50,
  durability: 50,
  weirdness: 0,
  maintenance: 20,
  density: 50,
  edible: false,
  alive: false,
  glows: false,
  intangible: false,
  flammable: false,
  conducts_magic: false,
  conducts_electricity: false,
  manaRegen: 1.0,
  spellPower: 0,
  costModifier: 0,
  rangeModifier: 0,
  durationModifier: 0,
  protection: 0,
  paradigmAffinities: {},
  element: null,
  elementalStrength: 0,
  specialEffects: [],
  moodModifier: 0,
  atmosphere: 'neutral',
  description: 'A common material',
};

/**
 * Complete material effect definitions.
 */
export const MATERIAL_EFFECTS: Record<Material, MaterialEffectProperties> = {
  // ===========================================================================
  // STANDARD CONSTRUCTION MATERIALS
  // ===========================================================================

  wood: {
    ...DEFAULT_PROPERTIES,
    insulation: 50,
    durability: 40,
    flammable: true,
    element: 'wood',
    elementalStrength: 80,
    paradigmAffinities: { shinto: 10, breath: 5 },
    moodModifier: 5,
    atmosphere: 'comforting',
    description: 'Natural timber, warm and familiar',
    lore: 'Wood remembers the forest. Buildings of wood feel alive.',
  },

  stone: {
    ...DEFAULT_PROPERTIES,
    insulation: 80,
    durability: 90,
    density: 80,
    element: 'earth',
    elementalStrength: 70,
    paradigmAffinities: { rune: 15, name: 5 },
    protection: 5,
    specialEffects: [
      { type: 'dimensional_stability', magnitude: 10, description: 'Stone grounds reality' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Solid stone blocks',
    lore: 'Stone endures. Runes carved in stone last longest.',
  },

  mud_brick: {
    ...DEFAULT_PROPERTIES,
    insulation: 60,
    durability: 30,
    element: 'earth',
    elementalStrength: 40,
    moodModifier: -5,
    atmosphere: 'neutral',
    description: 'Sun-dried mud bricks',
  },

  ice: {
    ...DEFAULT_PROPERTIES,
    insulation: 30,
    durability: 20,
    maintenance: 80,
    element: 'water',
    elementalStrength: 60,
    paradigmAffinities: { dream: 10 },
    specialEffects: [
      { type: 'temperature_regulation', magnitude: -30, description: 'Perpetually cold' },
    ],
    moodModifier: -10,
    atmosphere: 'calming',
    description: 'Frozen water, magically preserved',
    lore: 'Ice preserves and slows. Time moves differently in frozen halls.',
  },

  metal: {
    ...DEFAULT_PROPERTIES,
    insulation: 20,
    durability: 100,
    density: 90,
    conducts_electricity: true,
    conducts_magic: true,
    element: 'metal',
    elementalStrength: 90,
    paradigmAffinities: { allomancy: 20, rune: 10 },
    protection: 10,
    moodModifier: -5,
    atmosphere: 'neutral',
    description: 'Worked metal, cold and strong',
    lore: 'Metal channels power. Allomancers feel its pull.',
  },

  glass: {
    ...DEFAULT_PROPERTIES,
    insulation: 10,
    durability: 10,
    conducts_magic: true,
    element: 'fire',
    elementalStrength: 20,
    paradigmAffinities: { academic: 5 },
    specialEffects: [
      { type: 'light_emission', magnitude: 0, description: 'Allows light through' },
    ],
    moodModifier: 5,
    atmosphere: 'neutral',
    description: 'Transparent glass panes',
  },

  thatch: {
    ...DEFAULT_PROPERTIES,
    insulation: 40,
    durability: 15,
    flammable: true,
    element: 'wood',
    elementalStrength: 30,
    moodModifier: 0,
    atmosphere: 'comforting',
    description: 'Woven dried grass',
  },

  dirt: {
    ...DEFAULT_PROPERTIES,
    insulation: 40,
    durability: 20,
    element: 'earth',
    elementalStrength: 50,
    moodModifier: -10,
    atmosphere: 'neutral',
    description: 'Packed earth floor',
  },

  tile: {
    ...DEFAULT_PROPERTIES,
    insulation: 30,
    durability: 60,
    element: 'earth',
    elementalStrength: 30,
    moodModifier: 5,
    atmosphere: 'neutral',
    description: 'Ceramic floor tiles',
  },

  carpet: {
    ...DEFAULT_PROPERTIES,
    insulation: 60,
    durability: 30,
    flammable: true,
    specialEffects: [
      { type: 'sound_dampening', magnitude: 30, description: 'Muffles footsteps' },
    ],
    moodModifier: 10,
    atmosphere: 'comforting',
    description: 'Woven fabric floor covering',
  },

  cloth: {
    ...DEFAULT_PROPERTIES,
    insulation: 40,
    durability: 20,
    flammable: true,
    moodModifier: 5,
    atmosphere: 'comforting',
    description: 'Woven fabric',
  },

  brick: {
    ...DEFAULT_PROPERTIES,
    insulation: 70,
    durability: 75,
    element: 'earth',
    elementalStrength: 50,
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Fired clay bricks',
  },

  marble: {
    ...DEFAULT_PROPERTIES,
    insulation: 60,
    durability: 80,
    density: 75,
    element: 'earth',
    elementalStrength: 40,
    paradigmAffinities: { divine: 10, belief: 5 },
    moodModifier: 15,
    atmosphere: 'calming',
    description: 'Polished marble stone',
    lore: 'Marble speaks of grandeur. Gods favor temples of white stone.',
  },

  granite: {
    ...DEFAULT_PROPERTIES,
    insulation: 75,
    durability: 95,
    density: 85,
    element: 'earth',
    elementalStrength: 60,
    paradigmAffinities: { rune: 20 },
    protection: 10,
    specialEffects: [
      { type: 'dimensional_stability', magnitude: 20, description: 'Anchors reality firmly' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Hard granite blocks',
    lore: 'Granite resists all change. Runes carved here are nearly eternal.',
  },

  sandstone: {
    ...DEFAULT_PROPERTIES,
    insulation: 65,
    durability: 50,
    element: 'earth',
    elementalStrength: 45,
    moodModifier: 5,
    atmosphere: 'calming',
    description: 'Warm-colored sandstone',
  },

  clay: {
    ...DEFAULT_PROPERTIES,
    insulation: 55,
    durability: 35,
    element: 'earth',
    elementalStrength: 55,
    paradigmAffinities: { breath: 10 },
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Moldable clay',
    lore: 'Clay holds the potential for life. Breath mages value it.',
  },

  reed: {
    ...DEFAULT_PROPERTIES,
    insulation: 35,
    durability: 20,
    flammable: true,
    element: 'wood',
    elementalStrength: 25,
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Dried reed stalks',
  },

  bamboo: {
    ...DEFAULT_PROPERTIES,
    insulation: 45,
    durability: 55,
    flammable: true,
    element: 'wood',
    elementalStrength: 60,
    paradigmAffinities: { shinto: 15 },
    specialEffects: [
      { type: 'spirit_attraction', magnitude: 5, description: 'Kami favor bamboo groves' },
    ],
    moodModifier: 10,
    atmosphere: 'calming',
    description: 'Strong hollow bamboo',
    lore: 'Bamboo bends but does not break. Spirits rest in bamboo forests.',
  },

  leather: {
    ...DEFAULT_PROPERTIES,
    insulation: 55,
    durability: 45,
    flammable: true,
    paradigmAffinities: { blood: 5 },
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Tanned animal hide',
  },

  hide: {
    ...DEFAULT_PROPERTIES,
    insulation: 60,
    durability: 40,
    flammable: true,
    paradigmAffinities: { blood: 10, shinto: 5 },
    moodModifier: -5,
    atmosphere: 'neutral',
    description: 'Untanned animal skin',
  },

  // ===========================================================================
  // PRECIOUS METALS
  // ===========================================================================

  gold: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    density: 95,
    conducts_electricity: true,
    conducts_magic: true,
    element: 'metal',
    elementalStrength: 70,
    paradigmAffinities: { divine: 20, commerce: 30, luck: 10 },
    manaRegen: 1.2,
    spellPower: 10,
    specialEffects: [
      { type: 'spirit_attraction', magnitude: 15, description: 'Spirits are drawn to gold' },
    ],
    moodModifier: 20,
    atmosphere: 'euphoric',
    description: 'Gleaming golden metal',
    lore: 'Gold never tarnishes. Divine beings favor its incorruptible nature.',
  },

  silver: {
    ...DEFAULT_PROPERTIES,
    durability: 35,
    density: 75,
    conducts_electricity: true,
    conducts_magic: true,
    element: 'metal',
    elementalStrength: 65,
    paradigmAffinities: { divine: 15, dream: 15, shinto: 10 },
    manaRegen: 1.3,
    protection: 15,
    specialEffects: [
      { type: 'spirit_repulsion', magnitude: 20, description: 'Repels malevolent spirits' },
      { type: 'corruption_resistance', magnitude: 25, description: 'Silver purifies' },
    ],
    moodModifier: 10,
    atmosphere: 'calming',
    description: 'Lustrous silver metal',
    lore: 'Silver is the moon\'s metal. It wards against darkness and corruption.',
  },

  copper: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    density: 70,
    conducts_electricity: true,
    conducts_magic: true,
    element: 'metal',
    elementalStrength: 50,
    paradigmAffinities: { allomancy: 30 },
    specialEffects: [
      { type: 'metal_burning_boost', magnitude: 20, description: 'Enhances Allomantic copper (Smoker)' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Reddish copper metal',
    lore: 'Copper clouds Allomantic pulses. Smokers prize pure copper.',
  },

  bronze: {
    ...DEFAULT_PROPERTIES,
    durability: 60,
    density: 72,
    conducts_electricity: true,
    conducts_magic: true,
    element: 'metal',
    elementalStrength: 55,
    paradigmAffinities: { allomancy: 25, rune: 10 },
    specialEffects: [
      { type: 'metal_burning_boost', magnitude: 15, description: 'Enhances Allomantic bronze (Seeker)' },
    ],
    moodModifier: 5,
    atmosphere: 'neutral',
    description: 'Bronze alloy',
    lore: 'Bronze detects Allomantic pulses. Seekers can sense magic through bronze.',
  },

  iron: {
    ...DEFAULT_PROPERTIES,
    durability: 75,
    density: 78,
    conducts_electricity: true,
    element: 'metal',
    elementalStrength: 75,
    paradigmAffinities: { allomancy: 35, rune: 15 },
    protection: 10,
    specialEffects: [
      { type: 'spirit_repulsion', magnitude: 30, description: 'Cold iron repels fae and spirits' },
      { type: 'metal_burning_boost', magnitude: 25, description: 'Enhances Allomantic iron (Lurcher)' },
    ],
    moodModifier: -5,
    atmosphere: 'neutral',
    description: 'Cold iron',
    lore: 'Iron is anathema to the fae. It grounds magic and repels spirits.',
  },

  steel: {
    ...DEFAULT_PROPERTIES,
    durability: 90,
    density: 80,
    conducts_electricity: true,
    element: 'metal',
    elementalStrength: 80,
    paradigmAffinities: { allomancy: 35 },
    protection: 15,
    specialEffects: [
      { type: 'metal_burning_boost', magnitude: 25, description: 'Enhances Allomantic steel (Coinshot)' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Refined steel',
    lore: 'Steel pushes. Coinshots hurl steel through the air.',
  },

  mithril: {
    ...DEFAULT_PROPERTIES,
    durability: 95,
    density: 30,
    conducts_magic: true,
    weirdness: 40,
    element: 'metal',
    elementalStrength: 85,
    paradigmAffinities: { academic: 25, divine: 15, rune: 25 },
    manaRegen: 1.5,
    spellPower: 20,
    protection: 25,
    costModifier: -10,
    moodModifier: 15,
    atmosphere: 'calming',
    description: 'Silvery elven metal, light as air',
    lore: 'Mithril is stronger than steel yet light as silk. Magic flows through it like water.',
  },

  adamantine: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    density: 100,
    conducts_magic: true,
    weirdness: 50,
    element: 'metal',
    elementalStrength: 95,
    paradigmAffinities: { rune: 30, dimensional: 20 },
    protection: 40,
    specialEffects: [
      { type: 'dimensional_stability', magnitude: 50, description: 'Adamantine anchors reality absolutely' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Indestructible dark metal',
    lore: 'Adamantine cannot be broken. Reality itself yields before it does.',
  },

  orichalcum: {
    ...DEFAULT_PROPERTIES,
    durability: 85,
    density: 75,
    conducts_magic: true,
    glows: true,
    weirdness: 60,
    element: 'fire',
    elementalStrength: 70,
    paradigmAffinities: { academic: 30, divine: 25, belief: 20 },
    manaRegen: 2.0,
    spellPower: 30,
    moodModifier: 20,
    atmosphere: 'energizing',
    description: 'Legendary golden-red metal that glows faintly',
    lore: 'The metal of Atlantis. Orichalcum amplifies all magic tenfold.',
  },

  // ===========================================================================
  // GEMS AND CRYSTALS
  // ===========================================================================

  diamond: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    density: 60,
    conducts_magic: true,
    glows: false,
    weirdness: 30,
    paradigmAffinities: { academic: 20, name: 15 },
    manaRegen: 1.8,
    spellPower: 25,
    protection: 20,
    specialEffects: [
      { type: 'light_emission', magnitude: 20, description: 'Refracts and amplifies light' },
    ],
    moodModifier: 15,
    atmosphere: 'calming',
    description: 'Perfect crystalline carbon',
    lore: 'Diamonds focus magic to a razor point. Precision spells benefit most.',
  },

  ruby: {
    ...DEFAULT_PROPERTIES,
    durability: 85,
    conducts_magic: true,
    glows: true,
    weirdness: 25,
    element: 'fire',
    elementalStrength: 80,
    paradigmAffinities: { academic: 15, blood: 20, emotional: 15 },
    spellPower: 20,
    specialEffects: [
      { type: 'emotion_amplification', magnitude: 25, description: 'Intensifies passion and anger' },
    ],
    moodModifier: 10,
    atmosphere: 'energizing',
    description: 'Deep red gemstone',
    lore: 'Rubies burn with inner fire. They amplify emotions and blood magic.',
  },

  sapphire: {
    ...DEFAULT_PROPERTIES,
    durability: 85,
    conducts_magic: true,
    glows: true,
    weirdness: 25,
    element: 'water',
    elementalStrength: 80,
    paradigmAffinities: { academic: 20, divine: 15, dream: 15 },
    manaRegen: 1.5,
    costModifier: -15,
    specialEffects: [
      { type: 'emotion_dampening', magnitude: 20, description: 'Promotes calm and clarity' },
    ],
    moodModifier: 10,
    atmosphere: 'calming',
    description: 'Deep blue gemstone',
    lore: 'Sapphires bring clarity and wisdom. Scholars prize them for focused study.',
  },

  emerald: {
    ...DEFAULT_PROPERTIES,
    durability: 75,
    conducts_magic: true,
    glows: true,
    weirdness: 30,
    element: 'wood',
    elementalStrength: 85,
    paradigmAffinities: { shinto: 25, breath: 20, sympathy: 15 },
    manaRegen: 1.4,
    specialEffects: [
      { type: 'healing_aura', magnitude: 15, radius: 5, description: 'Promotes natural healing' },
      { type: 'spirit_attraction', magnitude: 20, description: 'Nature spirits are drawn to emeralds' },
    ],
    moodModifier: 15,
    atmosphere: 'calming',
    description: 'Vibrant green gemstone',
    lore: 'Emeralds hold the essence of life. Healers and nature mages treasure them.',
  },

  amethyst: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    conducts_magic: true,
    glows: true,
    weirdness: 35,
    paradigmAffinities: { dream: 30, divine: 15, emotional: 20 },
    specialEffects: [
      { type: 'dream_induction', magnitude: 30, description: 'Enhances dreams and visions' },
      { type: 'corruption_resistance', magnitude: 20, description: 'Wards against mental corruption' },
    ],
    moodModifier: 10,
    atmosphere: 'dreamy',
    description: 'Purple crystalline quartz',
    lore: 'Amethyst opens the dreaming eye. Prophets sleep upon amethyst pillows.',
  },

  topaz: {
    ...DEFAULT_PROPERTIES,
    durability: 80,
    conducts_magic: true,
    glows: true,
    element: 'fire',
    elementalStrength: 60,
    paradigmAffinities: { academic: 15, luck: 20 },
    spellPower: 15,
    specialEffects: [
      { type: 'luck_modifier', magnitude: 10, description: 'Brings minor good fortune' },
    ],
    moodModifier: 10,
    atmosphere: 'energizing',
    description: 'Golden-orange gemstone',
    lore: 'Topaz attracts fortune and success. Merchants keep topaz in their coffers.',
  },

  opal: {
    ...DEFAULT_PROPERTIES,
    durability: 55,
    conducts_magic: true,
    glows: true,
    weirdness: 50,
    paradigmAffinities: { wild: 30, dream: 20, luck: -15 },
    manaRegen: 1.6,
    spellPower: 25,
    specialEffects: [
      { type: 'dimensional_flux', magnitude: 20, description: 'Reality shimmers around opal' },
    ],
    moodModifier: 0,
    atmosphere: 'dreamy',
    description: 'Iridescent shifting gemstone',
    lore: 'Opal is chaos crystallized. Its magic is powerful but unpredictable.',
  },

  pearl: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    element: 'water',
    elementalStrength: 70,
    paradigmAffinities: { shinto: 20, dream: 15, emotional: 20 },
    manaRegen: 1.3,
    specialEffects: [
      { type: 'emotion_dampening', magnitude: 15, description: 'Soothes strong emotions' },
    ],
    moodModifier: 10,
    atmosphere: 'calming',
    description: 'Lustrous ocean gem',
    lore: 'Pearls form from irritation transformed to beauty. They teach patience.',
  },

  jade: {
    ...DEFAULT_PROPERTIES,
    durability: 65,
    element: 'wood',
    elementalStrength: 75,
    paradigmAffinities: { shinto: 30, breath: 15 },
    protection: 15,
    specialEffects: [
      { type: 'spirit_attraction', magnitude: 25, description: 'Ancestral spirits favor jade' },
      { type: 'corruption_resistance', magnitude: 15, description: 'Jade purifies' },
    ],
    moodModifier: 15,
    atmosphere: 'calming',
    description: 'Smooth green stone',
    lore: 'Jade bridges the living and the dead. Ancestors speak through jade carvings.',
  },

  obsidian: {
    ...DEFAULT_PROPERTIES,
    durability: 95,
    conducts_magic: true,
    weirdness: 30,
    paradigmAffinities: { blood: 25, name: 20, pact: 15 },
    spellPower: 25,
    costModifier: -5,
    specialEffects: [
      { type: 'truth_compulsion', magnitude: 20, description: 'Lies are difficult near obsidian' },
    ],
    moodModifier: -10,
    atmosphere: 'unsettling',
    description: 'Volcanic glass, razor-sharp',
    lore: 'Obsidian reflects truth. Blood mages carve their blades from it.',
  },

  crystal: {
    ...DEFAULT_PROPERTIES,
    durability: 60,
    conducts_magic: true,
    glows: true,
    weirdness: 50,
    paradigmAffinities: { academic: 25, breath: 15 },
    manaRegen: 2.0,
    spellPower: 15,
    rangeModifier: 20,
    specialEffects: [
      { type: 'light_emission', magnitude: 30, description: 'Glows with inner light' },
    ],
    moodModifier: 10,
    atmosphere: 'calming',
    description: 'Prismatic natural crystal',
    lore: 'Crystal focuses and amplifies magic. Mana pools around crystal formations.',
  },

  quartz: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    conducts_magic: true,
    paradigmAffinities: { academic: 15, sympathy: 20 },
    manaRegen: 1.4,
    specialEffects: [
      { type: 'memory_enhancement', magnitude: 15, description: 'Aids recollection' },
    ],
    moodModifier: 5,
    atmosphere: 'neutral',
    description: 'Common crystalline mineral',
    lore: 'Quartz remembers. Sympathy mages use quartz to store connections.',
  },

  // ===========================================================================
  // ORGANIC MATERIALS
  // ===========================================================================

  flesh: {
    ...DEFAULT_PROPERTIES,
    insulation: 70,
    durability: 30,
    weirdness: 80,
    maintenance: 90,
    alive: true,
    edible: true,
    paradigmAffinities: { blood: 40, emotional: 20 },
    specialEffects: [
      { type: 'healing_aura', magnitude: 20, radius: 3, description: 'Living tissue regenerates' },
      { type: 'blood_potency', magnitude: 30, description: 'Blood magic is amplified' },
    ],
    moodModifier: -30,
    atmosphere: 'terrifying',
    description: 'Pulsing living tissue',
    lore: 'Buildings of flesh are abominations—or miracles, depending on perspective.',
  },

  bone: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    weirdness: 60,
    paradigmAffinities: { blood: 20, name: 25, echo: 20 },
    protection: 10,
    specialEffects: [
      { type: 'memory_enhancement', magnitude: 25, description: 'Bones remember their owners' },
      { type: 'spirit_attraction', magnitude: 15, description: 'Spirits of the dead linger' },
    ],
    moodModifier: -20,
    atmosphere: 'unsettling',
    description: 'Bleached skeletal remains',
    lore: 'Bone holds echoes of life. Necromancers build temples of bone.',
  },

  chitin: {
    ...DEFAULT_PROPERTIES,
    durability: 80,
    weirdness: 40,
    paradigmAffinities: { shinto: 10 },
    protection: 15,
    moodModifier: -10,
    atmosphere: 'unsettling',
    description: 'Hard insect exoskeleton',
    lore: 'Chitin is the armor of the hive. Insectoid minds feel at home.',
  },

  coral: {
    ...DEFAULT_PROPERTIES,
    durability: 60,
    alive: true,
    element: 'water',
    elementalStrength: 60,
    paradigmAffinities: { shinto: 15, sympathy: 10 },
    specialEffects: [
      { type: 'spirit_attraction', magnitude: 10, description: 'Ocean spirits favor coral' },
    ],
    moodModifier: 5,
    atmosphere: 'calming',
    description: 'Living coral formations',
  },

  web: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    weirdness: 30,
    paradigmAffinities: { pact: 15, threshold: 20 },
    specialEffects: [
      { type: 'pact_binding', magnitude: 15, description: 'Webs hold promises' },
    ],
    moodModifier: -15,
    atmosphere: 'unsettling',
    description: 'Strong spider silk',
    lore: 'Webs catch more than flies. Promises made in web-draped halls bind tighter.',
  },

  wax: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    flammable: true,
    weirdness: 20,
    element: 'fire',
    elementalStrength: 30,
    paradigmAffinities: { breath: 15 },
    specialEffects: [
      { type: 'memory_enhancement', magnitude: 10, description: 'Wax seals hold memories' },
    ],
    moodModifier: 5,
    atmosphere: 'comforting',
    description: 'Honeycomb wax',
    lore: 'Bees build in wax. Their collective consciousness leaves traces.',
  },

  fungus: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    alive: true,
    glows: true,
    weirdness: 40,
    maintenance: 60,
    element: 'wood',
    elementalStrength: 40,
    paradigmAffinities: { dream: 20, sympathy: 25 },
    specialEffects: [
      { type: 'dream_induction', magnitude: 20, description: 'Spores induce visions' },
      { type: 'light_emission', magnitude: 20, description: 'Bioluminescent glow' },
    ],
    moodModifier: 0,
    atmosphere: 'dreamy',
    description: 'Bioluminescent mushroom material',
    lore: 'Fungi connect everything underground. The mycelium network carries whispers.',
  },

  living_wood: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    alive: true,
    maintenance: 40,
    element: 'wood',
    elementalStrength: 100,
    paradigmAffinities: { shinto: 35, breath: 25 },
    manaRegen: 1.3,
    specialEffects: [
      { type: 'healing_aura', magnitude: 10, radius: 10, description: 'Life energy flows through' },
      { type: 'spirit_attraction', magnitude: 30, description: 'Nature spirits dwell within' },
    ],
    moodModifier: 20,
    atmosphere: 'comforting',
    description: 'Trees shaped while growing',
    lore: 'Living wood breathes. Elven buildings of living wood are one with the forest.',
  },

  vines: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    alive: true,
    element: 'wood',
    elementalStrength: 70,
    paradigmAffinities: { shinto: 20, threshold: 15 },
    moodModifier: 5,
    atmosphere: 'calming',
    description: 'Woven plant matter',
  },

  amber: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    conducts_magic: true,
    glows: true,
    weirdness: 35,
    paradigmAffinities: { echo: 30, dimensional: 20, breath: 15 },
    specialEffects: [
      { type: 'time_dilation', magnitude: 10, description: 'Time moves slightly slower' },
      { type: 'memory_enhancement', magnitude: 30, description: 'Amber preserves moments' },
    ],
    moodModifier: 10,
    atmosphere: 'calming',
    description: 'Fossilized tree resin',
    lore: 'Amber traps moments in time. Memories stored in amber never fade.',
  },

  ivory: {
    ...DEFAULT_PROPERTIES,
    durability: 65,
    paradigmAffinities: { name: 20, echo: 15, shinto: 10 },
    protection: 10,
    specialEffects: [
      { type: 'memory_enhancement', magnitude: 20, description: 'Ivory holds ancestral memory' },
    ],
    moodModifier: 5,
    atmosphere: 'neutral',
    description: 'Polished tusk material',
    lore: 'Ivory carries the wisdom of great beasts. Their spirits may linger.',
  },

  shell: {
    ...DEFAULT_PROPERTIES,
    durability: 55,
    element: 'water',
    elementalStrength: 50,
    paradigmAffinities: { shinto: 15 },
    protection: 10,
    moodModifier: 5,
    atmosphere: 'calming',
    description: 'Spiral seashells',
  },

  feather: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    density: 5,
    flammable: true,
    element: null, // No feng shui equivalent for air
    elementalStrength: 70,
    paradigmAffinities: { breath: 20, dream: 15 },
    specialEffects: [
      { type: 'gravity_modifier', magnitude: -20, description: 'Lightens the space' },
    ],
    moodModifier: 10,
    atmosphere: 'calming',
    description: 'Woven feathers',
    lore: 'Feathers remember flight. Buildings of feather feel light as dreams.',
  },

  scale: {
    ...DEFAULT_PROPERTIES,
    durability: 80,
    paradigmAffinities: { blood: 15, name: 10 },
    protection: 20,
    moodModifier: -5,
    atmosphere: 'neutral',
    description: 'Overlapping reptilian scales',
    lore: 'Dragon scales are nearly indestructible and hold traces of draconic power.',
  },

  // ===========================================================================
  // FOOD MATERIALS (Whimsical)
  // ===========================================================================

  candy: {
    ...DEFAULT_PROPERTIES,
    durability: 20,
    weirdness: 50,
    maintenance: 80,
    edible: true,
    glows: true,
    paradigmAffinities: { wild: 15, belief: 20, emotional: 15 },
    specialEffects: [
      { type: 'hunger_suppression', magnitude: 20, description: 'The sweet smell satisfies' },
      { type: 'emotion_amplification', magnitude: 15, description: 'Joy is amplified' },
    ],
    moodModifier: 25,
    atmosphere: 'euphoric',
    description: 'Hard crystallized sugar',
    lore: 'Candy buildings exist where belief is strong. Children\'s dreams make them real.',
  },

  chocolate: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    maintenance: 90,
    weirdness: 50,
    edible: true,
    paradigmAffinities: { emotional: 25, belief: 15 },
    specialEffects: [
      { type: 'emotion_amplification', magnitude: 20, description: 'Intensifies positive emotions' },
      { type: 'hunger_suppression', magnitude: 15, description: 'Rich and satisfying' },
    ],
    moodModifier: 30,
    atmosphere: 'euphoric',
    description: 'Solid dark chocolate',
    lore: 'Chocolate is love made solid. Buildings of chocolate radiate warmth.',
  },

  gingerbread: {
    ...DEFAULT_PROPERTIES,
    durability: 25,
    flammable: true,
    maintenance: 70,
    weirdness: 40,
    edible: true,
    paradigmAffinities: { belief: 25, wild: 10 },
    specialEffects: [
      { type: 'hunger_suppression', magnitude: 25, description: 'Spiced aroma satisfies' },
    ],
    moodModifier: 20,
    atmosphere: 'comforting',
    description: 'Spiced cookie material',
    lore: 'Gingerbread houses are built by witches—or grandmothers. Sometimes both.',
  },

  cake: {
    ...DEFAULT_PROPERTIES,
    durability: 10,
    maintenance: 95,
    weirdness: 60,
    edible: true,
    paradigmAffinities: { belief: 20, emotional: 20, wild: 15 },
    specialEffects: [
      { type: 'hunger_suppression', magnitude: 30, description: 'Impossibly filling' },
    ],
    moodModifier: 25,
    atmosphere: 'euphoric',
    description: 'Soft sponge cake',
    lore: 'Cake buildings collapse unless maintained by constant belief—or magic.',
  },

  ice_cream: {
    ...DEFAULT_PROPERTIES,
    insulation: 90,
    durability: 5,
    maintenance: 100,
    weirdness: 70,
    edible: true,
    element: 'water',
    elementalStrength: 40,
    paradigmAffinities: { dream: 20, belief: 25, wild: 20 },
    specialEffects: [
      { type: 'temperature_regulation', magnitude: -40, description: 'Freezing cold' },
      { type: 'dream_induction', magnitude: 15, description: 'Sweet dreams' },
    ],
    moodModifier: 25,
    atmosphere: 'dreamy',
    description: 'Magically frozen dessert',
    lore: 'Ice cream buildings exist in the dreams of summer. They melt in harsh reality.',
  },

  cheese: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    maintenance: 60,
    weirdness: 30,
    edible: true,
    element: 'earth',
    elementalStrength: 20,
    paradigmAffinities: { belief: 10 },
    specialEffects: [
      { type: 'hunger_suppression', magnitude: 20, description: 'Savory and filling' },
    ],
    moodModifier: 10,
    atmosphere: 'comforting',
    description: 'Aged cheese blocks',
    lore: 'Mouse dreamers build castles of cheese. Some are quite elaborate.',
  },

  bread: {
    ...DEFAULT_PROPERTIES,
    durability: 20,
    flammable: true,
    maintenance: 70,
    edible: true,
    paradigmAffinities: { belief: 15, divine: 10 },
    specialEffects: [
      { type: 'hunger_suppression', magnitude: 25, description: 'Staff of life' },
    ],
    moodModifier: 15,
    atmosphere: 'comforting',
    description: 'Baked bread walls',
    lore: 'Bread is sacred in many faiths. Bread buildings are blessed spaces.',
  },

  sugar: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    maintenance: 85,
    weirdness: 45,
    edible: true,
    glows: true,
    paradigmAffinities: { emotional: 20, belief: 15, wild: 10 },
    specialEffects: [
      { type: 'emotion_amplification', magnitude: 25, description: 'Sugar rush of joy' },
    ],
    moodModifier: 20,
    atmosphere: 'euphoric',
    description: 'Crystallized sugar',
    lore: 'Sugar crystals refract light into rainbows. Pure sweetness made solid.',
  },

  honey: {
    ...DEFAULT_PROPERTIES,
    durability: 25,
    maintenance: 60,
    weirdness: 35,
    edible: true,
    glows: true,
    alive: false,
    element: 'wood',
    elementalStrength: 30,
    paradigmAffinities: { shinto: 20, breath: 15, belief: 10 },
    specialEffects: [
      { type: 'healing_aura', magnitude: 10, radius: 5, description: 'Honey heals wounds' },
      { type: 'corruption_resistance', magnitude: 15, description: 'Honey never spoils' },
    ],
    moodModifier: 15,
    atmosphere: 'comforting',
    description: 'Solid crystallized honey',
    lore: 'Honey is the labor of thousands. It holds community and preservation.',
  },

  salt: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    maintenance: 50,
    weirdness: 20,
    edible: true,
    element: 'earth',
    elementalStrength: 35,
    paradigmAffinities: { pact: 20, divine: 15 },
    protection: 15,
    specialEffects: [
      { type: 'spirit_repulsion', magnitude: 25, description: 'Salt wards spirits' },
      { type: 'corruption_resistance', magnitude: 20, description: 'Salt purifies' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Solid salt blocks',
    lore: 'Salt is the universal ward. No evil spirit willingly crosses a salt line.',
  },

  // ===========================================================================
  // ABSTRACT/MAGICAL MATERIALS
  // ===========================================================================

  void: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    weirdness: 100,
    intangible: true,
    paradigmAffinities: { dimensional: 50, wild: 30 },
    protection: 30,
    specialEffects: [
      { type: 'dimensional_flux', magnitude: 50, description: 'Reality doesn\'t apply' },
      { type: 'light_absorption', magnitude: 100, description: 'Absorbs all light' },
      { type: 'sound_dampening', magnitude: 100, description: 'Perfect silence' },
    ],
    moodModifier: -40,
    atmosphere: 'terrifying',
    description: 'Absence of reality',
    lore: 'Void is not emptiness—it is the absence of existence itself.',
  },

  light: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    weirdness: 90,
    intangible: true,
    glows: true,
    conducts_magic: true,
    element: 'fire',
    elementalStrength: 60,
    paradigmAffinities: { divine: 30, academic: 20, belief: 25 },
    manaRegen: 2.0,
    spellPower: 20,
    specialEffects: [
      { type: 'light_emission', magnitude: 100, description: 'Blindingly bright' },
      { type: 'corruption_resistance', magnitude: 40, description: 'Light banishes darkness' },
    ],
    moodModifier: 20,
    atmosphere: 'energizing',
    description: 'Solidified photons',
    lore: 'Light made solid is a miracle. Only the most devoted can shape it.',
  },

  darkness: {
    ...DEFAULT_PROPERTIES,
    durability: 60,
    weirdness: 85,
    intangible: true,
    paradigmAffinities: { dream: 25, pact: 25, threshold: 20 },
    specialEffects: [
      { type: 'light_absorption', magnitude: 80, description: 'Drinks light' },
      { type: 'illusion_enhancement', magnitude: 30, description: 'Shadows deceive' },
    ],
    moodModifier: -25,
    atmosphere: 'unsettling',
    description: 'Solid darkness',
    lore: 'Darkness given form hides all within. What lurks inside is unknown.',
  },

  dreams: {
    ...DEFAULT_PROPERTIES,
    durability: 20,
    weirdness: 100,
    maintenance: 80,
    intangible: true,
    glows: true,
    alive: true,
    paradigmAffinities: { dream: 50, emotional: 25, belief: 20 },
    manaRegen: 1.8,
    specialEffects: [
      { type: 'dream_induction', magnitude: 50, description: 'Blurs waking and sleeping' },
      { type: 'illusion_enhancement', magnitude: 40, description: 'Reality is malleable' },
      { type: 'memory_enhancement', magnitude: 20, description: 'Dreams remember' },
    ],
    moodModifier: 10,
    atmosphere: 'dreamy',
    description: 'Crystallized thoughts',
    lore: 'Dream-stuff is the raw material of imagination. It can become anything.',
  },

  nightmares: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    weirdness: 100,
    maintenance: 70,
    intangible: true,
    glows: true,
    alive: true,
    paradigmAffinities: { dream: 40, emotional: 30, blood: 15 },
    spellPower: 25,
    specialEffects: [
      { type: 'dream_induction', magnitude: 40, description: 'Induces dark visions' },
      { type: 'emotion_amplification', magnitude: 40, description: 'Fear is magnified' },
    ],
    moodModifier: -40,
    atmosphere: 'terrifying',
    description: 'Crystallized fears',
    lore: 'Nightmare buildings exist at the edge of madness. Fear made architecture.',
  },

  time: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    weirdness: 100,
    maintenance: 100,
    glows: true,
    paradigmAffinities: { dimensional: 40, echo: 35 },
    specialEffects: [
      { type: 'time_dilation', magnitude: 50, description: 'Time flows differently' },
      { type: 'aging_slowdown', magnitude: 50, description: 'Years become moments' },
      { type: 'memory_enhancement', magnitude: 40, description: 'All moments are preserved' },
    ],
    moodModifier: 0,
    atmosphere: 'dreamy',
    description: 'Frozen moments',
    lore: 'Time itself, crystallized. Within, past and future blur together.',
  },

  memory: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    weirdness: 90,
    intangible: true,
    glows: true,
    paradigmAffinities: { echo: 50, name: 25, dream: 20 },
    specialEffects: [
      { type: 'memory_enhancement', magnitude: 60, description: 'Nothing is forgotten here' },
      { type: 'illusion_enhancement', magnitude: 25, description: 'Memories replay visually' },
    ],
    moodModifier: 5,
    atmosphere: 'dreamy',
    description: 'Solidified recollections',
    lore: 'Memory made solid. Walk through and experience the past.',
  },

  emotion: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    weirdness: 85,
    alive: true,
    glows: true,
    paradigmAffinities: { emotional: 60, dream: 20, belief: 15 },
    manaRegen: 1.5,
    specialEffects: [
      { type: 'emotion_amplification', magnitude: 50, description: 'Feelings are overwhelming' },
    ],
    moodModifier: 0, // Depends on which emotion
    atmosphere: 'euphoric', // Or terrifying, depends on emotion
    description: 'Crystallized feelings',
    lore: 'Raw emotion given form. The building itself feels.',
  },

  thought: {
    ...DEFAULT_PROPERTIES,
    durability: 25,
    weirdness: 80,
    intangible: true,
    paradigmAffinities: { academic: 30, name: 30, echo: 20 },
    manaRegen: 2.0,
    costModifier: -20,
    specialEffects: [
      { type: 'memory_enhancement', magnitude: 30, description: 'Thinking is clearer' },
    ],
    moodModifier: 5,
    atmosphere: 'calming',
    description: 'Solidified cognition',
    lore: 'Pure thought made real. Within, the mind races with clarity.',
  },

  music: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    weirdness: 80,
    intangible: true,
    glows: true,
    paradigmAffinities: { song: 60, emotional: 25, belief: 15 },
    manaRegen: 1.6,
    rangeModifier: 40,
    durationModifier: 30,
    specialEffects: [
      { type: 'sound_amplification', magnitude: 50, description: 'Music resonates perfectly' },
      { type: 'emotion_amplification', magnitude: 20, description: 'Emotional response heightened' },
    ],
    moodModifier: 20,
    atmosphere: 'euphoric',
    description: 'Visible sound waves',
    lore: 'Music frozen in the moment of perfection. The building hums eternally.',
  },

  silence: {
    ...DEFAULT_PROPERTIES,
    durability: 60,
    weirdness: 70,
    intangible: true,
    paradigmAffinities: { name: 30, threshold: 25, dream: 15 },
    protection: 20,
    specialEffects: [
      { type: 'sound_dampening', magnitude: 100, description: 'Perfect silence' },
      { type: 'emotion_dampening', magnitude: 30, description: 'Peace enforced' },
    ],
    moodModifier: 5,
    atmosphere: 'calming',
    description: 'Absence of sound made solid',
    lore: 'Silence is the canvas on which name magic is painted.',
  },

  pages: {
    ...DEFAULT_PROPERTIES,
    durability: 20,
    flammable: true,
    weirdness: 40,
    paradigmAffinities: { literary: 40, name: 20, echo: 20 },
    manaRegen: 1.4,
    specialEffects: [
      { type: 'memory_enhancement', magnitude: 25, description: 'Words are remembered' },
    ],
    moodModifier: 10,
    atmosphere: 'calming',
    description: 'Layered book pages',
    lore: 'Buildings of pages contain all the knowledge written on them.',
  },

  ink: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    weirdness: 50,
    paradigmAffinities: { literary: 35, name: 30, pact: 20 },
    specialEffects: [
      { type: 'pact_binding', magnitude: 25, description: 'Contracts written in ink bind' },
      { type: 'truth_compulsion', magnitude: 15, description: 'Lies show as smudges' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Solid black ink',
    lore: 'Ink carries intention. Words written in ink have power.',
  },

  starlight: {
    ...DEFAULT_PROPERTIES,
    durability: 60,
    weirdness: 80,
    glows: true,
    conducts_magic: true,
    paradigmAffinities: { divine: 25, dream: 20, dimensional: 15 },
    manaRegen: 1.8,
    spellPower: 20,
    specialEffects: [
      { type: 'light_emission', magnitude: 60, description: 'Soft stellar glow' },
      { type: 'corruption_resistance', magnitude: 25, description: 'Stars are pure' },
    ],
    moodModifier: 15,
    atmosphere: 'calming',
    description: 'Celestial radiance',
    lore: 'Starlight falls from infinity. It carries the weight of distances.',
  },

  moonlight: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    weirdness: 75,
    glows: true,
    paradigmAffinities: { dream: 30, shinto: 20, wild: 15 },
    manaRegen: 1.6,
    specialEffects: [
      { type: 'light_emission', magnitude: 40, description: 'Silver lunar glow' },
      { type: 'dream_induction', magnitude: 25, description: 'Lunar dreams' },
      { type: 'spirit_attraction', magnitude: 20, description: 'Spirits walk in moonlight' },
    ],
    moodModifier: 10,
    atmosphere: 'dreamy',
    description: 'Captured lunar radiance',
    lore: 'Moonlight is the sun\'s reflection. It sees what daylight cannot.',
  },

  sunlight: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    weirdness: 70,
    glows: true,
    element: 'fire',
    elementalStrength: 80,
    paradigmAffinities: { divine: 30, belief: 20 },
    manaRegen: 2.0,
    spellPower: 15,
    specialEffects: [
      { type: 'light_emission', magnitude: 80, description: 'Brilliant daylight' },
      { type: 'healing_aura', magnitude: 15, radius: 10, description: 'Life-giving warmth' },
      { type: 'spirit_repulsion', magnitude: 30, description: 'Darkness flees' },
    ],
    moodModifier: 20,
    atmosphere: 'energizing',
    description: 'Captured solar radiance',
    lore: 'Sunlight is truth. Nothing hides in buildings of solid sun.',
  },

  shadow: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    weirdness: 90,
    intangible: true,
    paradigmAffinities: { threshold: 30, dream: 20, pact: 20 },
    specialEffects: [
      { type: 'light_absorption', magnitude: 60, description: 'Dims all light' },
      { type: 'illusion_enhancement', magnitude: 35, description: 'Shapes shift in shadow' },
    ],
    moodModifier: -15,
    atmosphere: 'unsettling',
    description: 'Darkness given form',
    lore: 'Shadows are the absence of light—yet here they have substance.',
  },

  mist: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    intangible: true,
    weirdness: 50,
    element: 'water',
    elementalStrength: 40,
    paradigmAffinities: { threshold: 25, dream: 20 },
    specialEffects: [
      { type: 'illusion_enhancement', magnitude: 25, description: 'Hard to see clearly' },
    ],
    moodModifier: 0,
    atmosphere: 'dreamy',
    description: 'Solid fog',
    lore: 'Mist blurs boundaries. In mist buildings, inside and outside merge.',
  },

  smoke: {
    ...DEFAULT_PROPERTIES,
    durability: 10,
    intangible: true,
    weirdness: 45,
    element: 'fire',
    elementalStrength: 30,
    paradigmAffinities: { divine: 15, shinto: 15 },
    specialEffects: [
      { type: 'spirit_attraction', magnitude: 15, description: 'Smoke carries prayers' },
    ],
    moodModifier: -5,
    atmosphere: 'dreamy',
    description: 'Solid smoke',
    lore: 'Smoke rises to the heavens. It is the vehicle of offerings.',
  },

  ash: {
    ...DEFAULT_PROPERTIES,
    durability: 25,
    weirdness: 40,
    paradigmAffinities: { echo: 25, blood: 15 },
    specialEffects: [
      { type: 'memory_enhancement', magnitude: 20, description: 'Ash remembers what burned' },
    ],
    moodModifier: -20,
    atmosphere: 'unsettling',
    description: 'Compacted ash',
    lore: 'Ash is the ghost of fire. It holds memories of destruction.',
  },

  dust: {
    ...DEFAULT_PROPERTIES,
    durability: 20,
    weirdness: 35,
    paradigmAffinities: { echo: 30, daemon: 20 },
    specialEffects: [
      { type: 'memory_enhancement', magnitude: 15, description: 'Dust of ages' },
    ],
    moodModifier: -10,
    atmosphere: 'neutral',
    description: 'Compacted dust',
    lore: 'Dust is time made visible. Ancient places are thick with it.',
  },

  // ===========================================================================
  // ELEMENTAL MATERIALS
  // ===========================================================================

  fire: {
    ...DEFAULT_PROPERTIES,
    insulation: -50,
    durability: 30,
    weirdness: 70,
    maintenance: 80,
    glows: true,
    alive: true,
    element: 'fire',
    elementalStrength: 100,
    paradigmAffinities: { academic: 15, emotional: 20 },
    spellPower: 20,
    specialEffects: [
      { type: 'light_emission', magnitude: 80, description: 'Burning bright' },
      { type: 'temperature_regulation', magnitude: 50, description: 'Extreme heat' },
    ],
    moodModifier: 0,
    atmosphere: 'energizing',
    description: 'Eternal flames',
    lore: 'Fire that burns without fuel. It is will made manifest.',
  },

  water: {
    ...DEFAULT_PROPERTIES,
    durability: 20,
    weirdness: 60,
    maintenance: 70,
    element: 'water',
    elementalStrength: 100,
    paradigmAffinities: { dream: 20, emotional: 15, shinto: 15 },
    manaRegen: 1.5,
    specialEffects: [
      { type: 'emotion_dampening', magnitude: 20, description: 'Water soothes' },
    ],
    moodModifier: 10,
    atmosphere: 'calming',
    description: 'Solid water (not ice)',
    lore: 'Water that holds form. It flows in slow motion, never freezing.',
  },

  air: {
    ...DEFAULT_PROPERTIES,
    durability: 10,
    intangible: true,
    weirdness: 50,
    element: null, // No feng shui equivalent for air - use breath paradigm instead
    elementalStrength: 100,
    paradigmAffinities: { breath: 30, song: 20 },
    specialEffects: [
      { type: 'gravity_modifier', magnitude: -30, description: 'Lighter than air' },
      { type: 'sound_amplification', magnitude: 20, description: 'Sound carries perfectly' },
    ],
    moodModifier: 5,
    atmosphere: 'calming',
    description: 'Compressed air',
    lore: 'Air given boundaries. Within, breathing comes easier.',
  },

  earth: {
    ...DEFAULT_PROPERTIES,
    durability: 85,
    density: 90,
    element: 'earth',
    elementalStrength: 100,
    paradigmAffinities: { rune: 25, shinto: 15 },
    protection: 20,
    specialEffects: [
      { type: 'dimensional_stability', magnitude: 40, description: 'Absolutely grounded' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Pure elemental earth',
    lore: 'Earth in its platonic form. Unshakeable foundation.',
  },

  lightning: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    weirdness: 80,
    conducts_electricity: true,
    conducts_magic: true,
    glows: true,
    element: 'fire',
    elementalStrength: 70,
    paradigmAffinities: { academic: 20, wild: 25 },
    spellPower: 30,
    specialEffects: [
      { type: 'light_emission', magnitude: 90, description: 'Crackling brilliance' },
    ],
    moodModifier: 0,
    atmosphere: 'energizing',
    description: 'Captured lightning',
    lore: 'Lightning frozen in the moment of strike. Raw power contained.',
  },

  magma: {
    ...DEFAULT_PROPERTIES,
    insulation: -80,
    durability: 40,
    weirdness: 65,
    maintenance: 90,
    glows: true,
    alive: true,
    element: 'fire',
    elementalStrength: 90,
    paradigmAffinities: { blood: 15, emotional: 15 },
    spellPower: 20,
    specialEffects: [
      { type: 'light_emission', magnitude: 70, description: 'Molten glow' },
      { type: 'temperature_regulation', magnitude: 80, description: 'Extreme heat' },
    ],
    moodModifier: -10,
    atmosphere: 'unsettling',
    description: 'Slow-flowing molten rock',
    lore: 'The blood of the earth itself. Dwarf forges are built over magma.',
  },

  steam: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    intangible: true,
    weirdness: 40,
    element: 'water',
    elementalStrength: 50,
    paradigmAffinities: { breath: 15, threshold: 15 },
    specialEffects: [
      { type: 'temperature_regulation', magnitude: 30, description: 'Humid warmth' },
    ],
    moodModifier: 5,
    atmosphere: 'calming',
    description: 'Solid steam',
    lore: 'Steam is transformation. Water becoming air.',
  },

  frost: {
    ...DEFAULT_PROPERTIES,
    insulation: 40,
    durability: 35,
    weirdness: 45,
    element: 'water',
    elementalStrength: 70,
    paradigmAffinities: { dream: 15 },
    specialEffects: [
      { type: 'temperature_regulation', magnitude: -50, description: 'Bitter cold' },
      { type: 'time_dilation', magnitude: 10, description: 'Time slows in cold' },
    ],
    moodModifier: -5,
    atmosphere: 'calming',
    description: 'Permanent frost crystals',
    lore: 'Frost that never melts. It preserves all within.',
  },

  // ===========================================================================
  // TECHNOLOGICAL MATERIALS
  // ===========================================================================

  circuitry: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    weirdness: 40,
    conducts_electricity: true,
    conducts_magic: true,
    glows: true,
    paradigmAffinities: { bureaucratic: 20 },
    specialEffects: [
      { type: 'light_emission', magnitude: 20, description: 'Status lights blink' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Living circuits',
    lore: 'Technology sufficiently advanced is indistinguishable from magic.',
  },

  data: {
    ...DEFAULT_PROPERTIES,
    durability: 80,
    weirdness: 80,
    intangible: true,
    glows: true,
    paradigmAffinities: { name: 30, echo: 25, bureaucratic: 25 },
    manaRegen: 1.3,
    specialEffects: [
      { type: 'memory_enhancement', magnitude: 40, description: 'Perfect recall' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Digital constructs',
    lore: 'Information given form. The building knows everything within it.',
  },

  plasma: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    weirdness: 70,
    maintenance: 90,
    glows: true,
    conducts_electricity: true,
    paradigmAffinities: { wild: 20 },
    spellPower: 25,
    specialEffects: [
      { type: 'light_emission', magnitude: 80, description: 'Brilliant plasma glow' },
    ],
    moodModifier: 0,
    atmosphere: 'energizing',
    description: 'Contained energy',
    lore: 'The fourth state of matter, tamed and shaped.',
  },

  force_field: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    weirdness: 60,
    maintenance: 80,
    intangible: true,
    glows: true,
    paradigmAffinities: { dimensional: 20 },
    protection: 50,
    specialEffects: [
      { type: 'dimensional_stability', magnitude: 30, description: 'Holds space rigid' },
    ],
    moodModifier: 5,
    atmosphere: 'neutral',
    description: 'Energy barrier',
    lore: 'Pure force, shaped by will or technology into walls.',
  },

  nanomaterial: {
    ...DEFAULT_PROPERTIES,
    durability: 90,
    weirdness: 55,
    maintenance: 60,
    alive: true,
    paradigmAffinities: { breath: 20 },
    specialEffects: [
      { type: 'healing_aura', magnitude: 15, radius: 5, description: 'Self-repairs and heals' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Self-assembling nanobots',
    lore: 'Tiny machines that rebuild and adapt. The building heals itself.',
  },

  // ===========================================================================
  // ALLOMANTIC METALS
  // ===========================================================================

  pewter: {
    ...DEFAULT_PROPERTIES,
    durability: 55,
    density: 72,
    conducts_magic: true,
    element: 'metal',
    elementalStrength: 55,
    paradigmAffinities: { allomancy: 40, blood: 10 },
    protection: 15,
    specialEffects: [
      { type: 'metal_burning_boost', magnitude: 30, description: 'Pewter enhances physical strength' },
      { type: 'healing_aura', magnitude: 10, radius: 5, description: 'Enhanced vitality' },
    ],
    moodModifier: 5,
    atmosphere: 'energizing',
    description: 'Allomantic pewter',
    lore: 'Pewter grants physical might. Thugs feel stronger near pure pewter.',
  },

  tin: {
    ...DEFAULT_PROPERTIES,
    durability: 25,
    density: 60,
    conducts_magic: true,
    element: 'metal',
    elementalStrength: 50,
    paradigmAffinities: { allomancy: 35, sympathy: 15 },
    specialEffects: [
      { type: 'metal_burning_boost', magnitude: 25, description: 'Tin enhances senses' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Allomantic tin',
    lore: 'Tin sharpens the senses. Tineyes see in darkest night.',
  },

  zinc: {
    ...DEFAULT_PROPERTIES,
    durability: 35,
    density: 58,
    conducts_magic: true,
    element: 'metal',
    elementalStrength: 45,
    paradigmAffinities: { allomancy: 35, emotional: 25 },
    specialEffects: [
      { type: 'metal_burning_boost', magnitude: 25, description: 'Zinc riots emotions' },
      { type: 'emotion_amplification', magnitude: 15, description: 'Emotions run hot' },
    ],
    moodModifier: 5,
    atmosphere: 'energizing',
    description: 'Allomantic zinc',
    lore: 'Zinc inflames emotions. Rioters use it to enrage or terrify.',
  },

  brass: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    density: 65,
    conducts_magic: true,
    element: 'metal',
    elementalStrength: 50,
    paradigmAffinities: { allomancy: 35, emotional: 25 },
    specialEffects: [
      { type: 'metal_burning_boost', magnitude: 25, description: 'Brass soothes emotions' },
      { type: 'emotion_dampening', magnitude: 15, description: 'Calm pervades' },
    ],
    moodModifier: 10,
    atmosphere: 'calming',
    description: 'Allomantic brass',
    lore: 'Brass calms emotions. Soothers bring peace—or apathy.',
  },

  chromium: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    density: 72,
    conducts_magic: true,
    element: 'metal',
    elementalStrength: 60,
    paradigmAffinities: { allomancy: 45 },
    specialEffects: [
      { type: 'metal_burning_boost', magnitude: 35, description: 'Chromium wipes Allomantic reserves' },
      { type: 'corruption_resistance', magnitude: 20, description: 'Purges foreign magic' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Allomantic chromium',
    lore: 'Chromium drains Allomantic reserves. Leechers are feared.',
  },

  nickel: {
    ...DEFAULT_PROPERTIES,
    durability: 65,
    density: 70,
    conducts_magic: true,
    element: 'metal',
    elementalStrength: 55,
    paradigmAffinities: { allomancy: 40 },
    protection: 10,
    specialEffects: [
      { type: 'metal_burning_boost', magnitude: 30, description: 'Nickel reveals Allomantic abilities' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Allomantic nicrosil',
    lore: 'Nicrosil enhances another\'s Allomantic burn.',
  },

  aluminum: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    density: 28,
    conducts_magic: false, // Blocks magic
    element: 'metal',
    elementalStrength: 30,
    paradigmAffinities: { allomancy: -50 }, // Negative - blocks Allomancy
    specialEffects: [
      { type: 'corruption_resistance', magnitude: 100, description: 'Blocks all Allomancy' },
    ],
    moodModifier: 0,
    atmosphere: 'neutral',
    description: 'Allomancy-blocking aluminum',
    lore: 'Aluminum is immune to Allomancy. It blocks pushes and pulls.',
  },

  duralumin: {
    ...DEFAULT_PROPERTIES,
    durability: 65,
    density: 45,
    conducts_magic: true,
    element: 'metal',
    elementalStrength: 65,
    paradigmAffinities: { allomancy: 50 },
    spellPower: 40,
    specialEffects: [
      { type: 'metal_burning_boost', magnitude: 50, description: 'Duralumin explosively boosts burns' },
    ],
    moodModifier: 5,
    atmosphere: 'energizing',
    description: 'Allomantic duralumin',
    lore: 'Duralumin burns all your metals in one explosive moment.',
  },

  atium: {
    ...DEFAULT_PROPERTIES,
    durability: 80,
    weirdness: 90,
    conducts_magic: true,
    glows: true,
    paradigmAffinities: { allomancy: 100, dimensional: 30 },
    spellPower: 50,
    specialEffects: [
      { type: 'metal_burning_boost', magnitude: 100, description: 'Atium reveals the future' },
      { type: 'time_dilation', magnitude: 30, description: 'Time seems to slow' },
    ],
    moodModifier: 10,
    atmosphere: 'dreamy',
    description: 'The body of a god',
    lore: 'Atium is Ruin\'s body. Burning it grants precognition.',
  },

  lerasium: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    weirdness: 100,
    conducts_magic: true,
    glows: true,
    paradigmAffinities: { allomancy: 100, divine: 50 },
    manaRegen: 3.0,
    spellPower: 100,
    specialEffects: [
      { type: 'metal_burning_boost', magnitude: 100, description: 'Lerasium grants Allomancy' },
    ],
    moodModifier: 30,
    atmosphere: 'euphoric',
    description: 'The body of a god',
    lore: 'Lerasium is Preservation\'s body. Consuming it makes one Mistborn.',
  },

  // ===========================================================================
  // UNIQUE/LEGENDARY MATERIALS
  // ===========================================================================

  philosophers_stone: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    weirdness: 100,
    glows: true,
    conducts_magic: true,
    paradigmAffinities: { academic: 100, blood: 50, commerce: 50 },
    manaRegen: 5.0,
    spellPower: 100,
    costModifier: -50,
    specialEffects: [
      { type: 'healing_aura', magnitude: 50, radius: 20, description: 'Universal panacea' },
      { type: 'aging_slowdown', magnitude: 100, description: 'Immortality within' },
    ],
    moodModifier: 50,
    atmosphere: 'euphoric',
    description: 'The ultimate alchemical achievement',
    lore: 'The Stone transmutes lead to gold and grants eternal life. Few have made it.',
  },

  primordial_chaos: {
    ...DEFAULT_PROPERTIES,
    durability: 1,
    weirdness: 100,
    intangible: true,
    alive: true,
    paradigmAffinities: { wild: 100, dimensional: 50 },
    spellPower: 200, // Incredibly powerful but unstable
    specialEffects: [
      { type: 'dimensional_flux', magnitude: 100, description: 'Reality breaks down' },
    ],
    moodModifier: -50,
    atmosphere: 'terrifying',
    description: 'Unformed potential',
    lore: 'Before creation, there was Chaos. It still lurks at reality\'s edges.',
  },

  divine_essence: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    weirdness: 100,
    glows: true,
    intangible: true,
    alive: true,
    paradigmAffinities: { divine: 100, belief: 75 },
    manaRegen: 10.0,
    spellPower: 150,
    protection: 100,
    specialEffects: [
      { type: 'corruption_resistance', magnitude: 100, description: 'Divine purity' },
      { type: 'healing_aura', magnitude: 100, radius: 50, description: 'Miraculous healing' },
    ],
    moodModifier: 50,
    atmosphere: 'euphoric',
    description: 'Fragment of divinity',
    lore: 'The stuff of gods. To touch it is to touch the infinite.',
  },

  soul_stuff: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    weirdness: 95,
    intangible: true,
    alive: true,
    glows: true,
    paradigmAffinities: { breath: 50, emotional: 40, name: 30 },
    manaRegen: 2.5,
    specialEffects: [
      { type: 'spirit_attraction', magnitude: 50, description: 'Souls gather' },
      { type: 'memory_enhancement', magnitude: 50, description: 'Souls remember' },
    ],
    moodModifier: 0,
    atmosphere: 'dreamy',
    description: 'Essence of consciousness',
    lore: 'The raw material of souls. Breath mages can shape it into life.',
  },

  ectoplasm: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    weirdness: 80,
    intangible: true,
    alive: true,
    glows: true,
    paradigmAffinities: { dream: 35, shinto: 30, threshold: 25 },
    specialEffects: [
      { type: 'spirit_attraction', magnitude: 40, description: 'Ghosts materialize' },
      { type: 'dimensional_flux', magnitude: 20, description: 'Between worlds' },
    ],
    moodModifier: -20,
    atmosphere: 'unsettling',
    description: 'Spirit residue',
    lore: 'Ectoplasm is the physical manifestation of ghostly presence.',
  },

  blood: {
    ...DEFAULT_PROPERTIES,
    durability: 20,
    weirdness: 70,
    maintenance: 100,
    alive: true,
    edible: false, // Technically could be, but no
    paradigmAffinities: { blood: 100, pact: 30, emotional: 25 },
    spellPower: 40,
    specialEffects: [
      { type: 'blood_potency', magnitude: 100, description: 'Blood magic maximized' },
      { type: 'pact_binding', magnitude: 30, description: 'Blood oaths bind' },
    ],
    moodModifier: -30,
    atmosphere: 'terrifying',
    description: 'Ever-flowing blood',
    lore: 'Blood is life. Buildings of blood are alive in the darkest way.',
  },

  tears: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    weirdness: 75,
    element: 'water',
    elementalStrength: 60,
    paradigmAffinities: { emotional: 60, sympathy: 30, dream: 20 },
    specialEffects: [
      { type: 'emotion_amplification', magnitude: 40, description: 'Sorrow magnified' },
      { type: 'corruption_resistance', magnitude: 20, description: 'Tears purify' },
    ],
    moodModifier: -15,
    atmosphere: 'calming',
    description: 'Crystallized weeping',
    lore: 'Tears of joy and sorrow, frozen in time. They hold emotional truth.',
  },

  breath: {
    ...DEFAULT_PROPERTIES,
    durability: 10,
    weirdness: 85,
    intangible: true,
    alive: true,
    paradigmAffinities: { breath: 100, name: 30, song: 25 },
    manaRegen: 2.0,
    durationModifier: 50,
    specialEffects: [
      { type: 'breath_holding', magnitude: 50, description: 'BioChroma amplified' },
    ],
    moodModifier: 10,
    atmosphere: 'calming',
    description: 'Captured breath/BioChroma',
    lore: 'Breath is life force given form. Awakeners can invest it into objects.',
  },

  // ==========================================================================
  // WRITTEN/KNOWLEDGE MATERIALS
  // ==========================================================================

  books: {
    ...DEFAULT_PROPERTIES,
    durability: 25,
    flammable: true,
    weirdness: 30,
    paradigmAffinities: { literary: 100, academic: 60, echo: 40 },
    manaRegen: 1.3,
    spellPower: 15,
    element: 'wood',
    moodModifier: 20,
    atmosphere: 'comforting',
    specialEffects: [
      { type: 'knowledge_absorption', magnitude: 40, description: 'Learn while nearby' },
    ],
    description: 'Walls of bound knowledge',
    lore: 'Every book is a door to another mind. A library is a palace of doors.',
  },

  scrolls: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    flammable: true,
    weirdness: 35,
    paradigmAffinities: { academic: 80, rune: 50, literary: 40 },
    manaRegen: 1.2,
    spellPower: 20,
    element: 'wood',
    moodModifier: 10,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'spell_scroll_bonus', magnitude: 30, description: 'Scroll magic enhanced' },
    ],
    description: 'Rolled parchment construction',
    lore: 'Ancient wisdom preserved in coiled form.',
  },

  parchment: {
    ...DEFAULT_PROPERTIES,
    durability: 20,
    flammable: true,
    weirdness: 20,
    paradigmAffinities: { academic: 50, rune: 40 },
    manaRegen: 1.1,
    element: 'wood',
    moodModifier: 5,
    atmosphere: 'neutral',
    description: 'Treated animal skin writing surface',
    lore: 'The medium upon which contracts are bound.',
  },

  vellum: {
    ...DEFAULT_PROPERTIES,
    durability: 25,
    flammable: true,
    weirdness: 25,
    paradigmAffinities: { academic: 55, name: 30, pact: 25 },
    manaRegen: 1.15,
    element: 'wood',
    moodModifier: 8,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'contract_binding', magnitude: 20, description: 'Agreements hold stronger' },
    ],
    description: 'Fine calfskin parchment',
    lore: 'The finest writing surface, fit for royal decrees and binding contracts.',
  },

  papyrus: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    flammable: true,
    weirdness: 30,
    paradigmAffinities: { academic: 40, echo: 50, divine: 20 },
    manaRegen: 1.1,
    element: 'wood',
    moodModifier: 10,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'ancient_knowledge', magnitude: 25, description: 'Connect to old wisdom' },
    ],
    description: 'Reed paper from ancient traditions',
    lore: 'The medium of pharaohs and priests.',
  },

  runes: {
    ...DEFAULT_PROPERTIES,
    durability: 80,
    weirdness: 60,
    glows: true,
    paradigmAffinities: { rune: 100, name: 40, academic: 30 },
    manaRegen: 1.5,
    spellPower: 30,
    element: 'earth',
    moodModifier: 5,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'runic_resonance', magnitude: 50, description: 'Rune magic amplified' },
    ],
    description: 'Carved magical inscriptions',
    lore: 'Each rune is a word of power, carved into reality itself.',
  },

  glyphs: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    weirdness: 65,
    glows: true,
    paradigmAffinities: { rune: 80, academic: 50, divine: 30 },
    manaRegen: 1.4,
    spellPower: 25,
    element: 'fire',
    moodModifier: 0,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'ward_power', magnitude: 40, description: 'Protective wards stronger' },
    ],
    description: 'Sacred protective symbols',
    lore: 'Glyphs guard and ward, speaking to those who know their tongue.',
  },

  sigils: {
    ...DEFAULT_PROPERTIES,
    durability: 60,
    weirdness: 70,
    glows: true,
    paradigmAffinities: { pact: 80, daemon: 60, name: 40 },
    manaRegen: 1.3,
    spellPower: 35,
    element: 'fire',
    moodModifier: -5,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'summoning_focus', magnitude: 45, description: 'Entity summoning enhanced' },
    ],
    description: 'Magical seals and bindings',
    lore: 'A sigil is a cage for names and a key for doors.',
  },

  grimoires: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    weirdness: 80,
    glows: true,
    flammable: false,
    paradigmAffinities: { academic: 100, literary: 70, daemon: 40 },
    manaRegen: 2.0,
    spellPower: 50,
    element: 'fire',
    moodModifier: -10,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'spell_learning', magnitude: 60, description: 'Accelerated spell mastery' },
      { type: 'forbidden_knowledge', magnitude: 30, description: 'Access dark arts' },
    ],
    description: 'Bound magical tomes of power',
    lore: 'Grimoires contain not just spells, but imprisoned knowledge that whispers.',
  },

  // ==========================================================================
  // CONDENSED CONCEPTS
  // ==========================================================================

  echoes: {
    ...DEFAULT_PROPERTIES,
    durability: 20,
    weirdness: 75,
    intangible: true,
    paradigmAffinities: { echo: 100, song: 50, literary: 40 },
    manaRegen: 1.4,
    element: null,
    moodModifier: -5,
    atmosphere: 'dreamy',
    specialEffects: [
      { type: 'memory_resonance', magnitude: 50, description: 'Past events replay' },
    ],
    description: 'Solidified reverberations',
    lore: 'Echoes remember what was said, and whisper it back eternally.',
  },

  whispers: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    weirdness: 80,
    intangible: true,
    paradigmAffinities: { silence: 60, name: 50, dream: 40 },
    manaRegen: 1.3,
    element: null,
    moodModifier: -10,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'secret_hearing', magnitude: 40, description: 'Hear hidden things' },
    ],
    description: 'Captured secrets given form',
    lore: 'Whispers are secrets that refuse to die.',
  },

  solidified_mana: {
    ...DEFAULT_PROPERTIES,
    durability: 60,
    weirdness: 70,
    glows: true,
    conducts_magic: true,
    paradigmAffinities: { academic: 100, dimensional: 30 },
    manaRegen: 3.0,
    spellPower: 40,
    element: null,
    moodModifier: 15,
    atmosphere: 'energizing',
    specialEffects: [
      { type: 'mana_battery', magnitude: 80, description: 'Store vast mana reserves' },
    ],
    description: 'Pure magic given physical form',
    lore: 'Mana crystallized by will alone. Priceless to any mage.',
  },

  frozen_time: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    weirdness: 95,
    glows: true,
    paradigmAffinities: { dimensional: 80, echo: 40 },
    manaRegen: 2.0,
    durationModifier: 100,
    element: null,
    moodModifier: 0,
    atmosphere: 'dreamy',
    specialEffects: [
      { type: 'temporal_anchor', magnitude: 70, description: 'Time effects stabilized' },
      { type: 'age_resistance', magnitude: 50, description: 'Slow aging within' },
    ],
    description: 'Moments captured in stasis',
    lore: 'Time that stopped and forgot to start again.',
  },

  crystallized_thought: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    weirdness: 85,
    glows: true,
    paradigmAffinities: { academic: 70, echo: 60, literary: 40 },
    manaRegen: 1.6,
    spellPower: 30,
    element: null,
    moodModifier: 10,
    atmosphere: 'calming',
    specialEffects: [
      { type: 'thought_clarity', magnitude: 50, description: 'Enhanced thinking' },
    ],
    description: 'Ideas given solid form',
    lore: 'What is thought but energy? This is thought made matter.',
  },

  bottled_lightning: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    weirdness: 60,
    glows: true,
    conducts_electricity: true,
    paradigmAffinities: { academic: 50, wild: 40 },
    manaRegen: 1.5,
    spellPower: 25,
    element: 'fire',
    moodModifier: 5,
    atmosphere: 'energizing',
    specialEffects: [
      { type: 'lightning_affinity', magnitude: 60, description: 'Electric magic boosted' },
    ],
    description: 'Storm fury contained',
    lore: 'The rage of storms, captured and waiting.',
  },

  woven_moonbeams: {
    ...DEFAULT_PROPERTIES,
    durability: 25,
    weirdness: 75,
    glows: true,
    intangible: true,
    paradigmAffinities: { dream: 60, divine: 30, shinto: 25 },
    manaRegen: 1.8,
    element: 'water',
    moodModifier: 20,
    atmosphere: 'dreamy',
    specialEffects: [
      { type: 'lunar_blessing', magnitude: 45, description: 'Moon magic enhanced' },
    ],
    description: 'Moonlight made tangible',
    lore: 'Moonbeams woven by patient hands under a full moon.',
  },

  manifested_fear: {
    ...DEFAULT_PROPERTIES,
    durability: 45,
    weirdness: 90,
    paradigmAffinities: { emotional: 80, dream: 50, daemon: 30 },
    manaRegen: 1.4,
    protection: 30,
    element: null,
    moodModifier: -40,
    atmosphere: 'terrifying',
    specialEffects: [
      { type: 'fear_aura', magnitude: 60, description: 'Enemies flee in terror' },
    ],
    description: 'Terror made solid',
    lore: 'Fear given form. It remembers every nightmare that made it.',
  },

  concentrated_joy: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    weirdness: 70,
    glows: true,
    paradigmAffinities: { emotional: 80, song: 40, belief: 30 },
    manaRegen: 1.6,
    element: 'fire',
    moodModifier: 50,
    atmosphere: 'euphoric',
    specialEffects: [
      { type: 'joy_aura', magnitude: 60, description: 'Overwhelming happiness' },
    ],
    description: 'Pure happiness crystallized',
    lore: 'Joy so pure it refused to fade, solidifying into permanent bliss.',
  },

  distilled_sorrow: {
    ...DEFAULT_PROPERTIES,
    durability: 35,
    weirdness: 75,
    paradigmAffinities: { emotional: 80, dream: 40, sympathy: 30 },
    manaRegen: 1.5,
    element: 'water',
    moodModifier: -35,
    atmosphere: 'calming',
    specialEffects: [
      { type: 'empathy_link', magnitude: 50, description: 'Deep emotional connection' },
    ],
    description: 'Grief given form',
    lore: 'Sorrow distilled to its essence. Strangely beautiful.',
  },

  pure_chaos: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    weirdness: 100,
    paradigmAffinities: { wild: 100, dimensional: 50, paradox: 40 },
    manaRegen: 2.5,
    spellPower: 60,
    element: null,
    moodModifier: -20,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'reality_fluctuation', magnitude: 80, description: 'Random magical effects' },
    ],
    description: 'Unformed potential',
    lore: 'The stuff before creation, still writhing with possibility.',
  },

  ordered_law: {
    ...DEFAULT_PROPERTIES,
    durability: 90,
    weirdness: 80,
    paradigmAffinities: { bureaucratic: 100, pact: 50, name: 40 },
    manaRegen: 1.3,
    protection: 40,
    element: null,
    moodModifier: 5,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'contract_enforcement', magnitude: 70, description: 'Agreements unbreakable' },
    ],
    description: 'Pure structure and rule',
    lore: 'The principle of order itself, made manifest.',
  },

  // ==========================================================================
  // FANTASY METALS (Various Universes)
  // ==========================================================================

  valyrian_steel: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    weirdness: 60,
    paradigmAffinities: { blood: 50, rune: 40, breath: 30 },
    spellPower: 30,
    protection: 50,
    element: 'fire',
    moodModifier: 0,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'dragonfire_forged', magnitude: 50, description: 'Cuts through magic' },
      { type: 'undead_bane', magnitude: 80, description: 'Destroys undead' },
    ],
    description: 'Dragonfire-forged steel',
    lore: 'Forged in dragonfire with blood magic, its secrets lost to doom.',
  },

  dragonglass: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    weirdness: 50,
    paradigmAffinities: { blood: 30, divine: 20 },
    spellPower: 20,
    protection: 20,
    element: 'fire',
    moodModifier: -5,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'undead_bane', magnitude: 100, description: 'Destroys Others/undead' },
    ],
    description: 'Volcanic glass with magical properties',
    lore: 'Frozen fire from the dawn of days.',
  },

  starmetal: {
    ...DEFAULT_PROPERTIES,
    durability: 85,
    weirdness: 70,
    glows: true,
    paradigmAffinities: { dimensional: 60, divine: 40, academic: 30 },
    manaRegen: 1.6,
    spellPower: 35,
    element: 'fire',
    moodModifier: 10,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'cosmic_attunement', magnitude: 50, description: 'Star magic enhanced' },
    ],
    description: 'Metal fallen from the stars',
    lore: 'Forged in stellar cores and delivered by comets.',
  },

  moonsilver: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    weirdness: 65,
    glows: true,
    paradigmAffinities: { shinto: 60, dream: 50, emotional: 30 },
    manaRegen: 1.5,
    spellPower: 25,
    element: 'water',
    moodModifier: 15,
    atmosphere: 'dreamy',
    specialEffects: [
      { type: 'lunar_attunement', magnitude: 60, description: 'Moon phase bonuses' },
      { type: 'shapechanger_bane', magnitude: 50, description: 'Harms werebeasts' },
    ],
    description: 'Silver touched by moonlight',
    lore: 'Quicksilver blessed under a hundred full moons.',
  },

  soulsteel: {
    ...DEFAULT_PROPERTIES,
    durability: 80,
    weirdness: 90,
    paradigmAffinities: { daemon: 80, blood: 50, pact: 40 },
    manaRegen: 1.8,
    spellPower: 40,
    protection: 30,
    element: null,
    moodModifier: -30,
    atmosphere: 'terrifying',
    specialEffects: [
      { type: 'soul_trap', magnitude: 60, description: 'Captures dying souls' },
      { type: 'ghost_touch', magnitude: 70, description: 'Affects incorporeal' },
    ],
    description: 'Steel forged with imprisoned souls',
    lore: 'Each blade whispers with the screams of those within.',
  },

  oathgold: {
    ...DEFAULT_PROPERTIES,
    durability: 75,
    weirdness: 55,
    glows: true,
    paradigmAffinities: { pact: 100, divine: 50, name: 40 },
    manaRegen: 1.4,
    element: 'earth',
    moodModifier: 10,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'oath_binding', magnitude: 80, description: 'Promises unbreakable' },
    ],
    description: 'Gold that seals oaths',
    lore: 'Oaths sworn on oathgold cannot be broken without consequence.',
  },

  cold_iron: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    weirdness: 40,
    paradigmAffinities: { threshold: 30 },
    protection: 35,
    element: 'earth',
    moodModifier: -5,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'fey_bane', magnitude: 100, description: 'Devastating to fey' },
      { type: 'magic_resistance', magnitude: 30, description: 'Resists enchantment' },
    ],
    description: 'Iron never touched by fire',
    lore: 'Cold-forged iron, anathema to the fair folk.',
  },

  meteoric_iron: {
    ...DEFAULT_PROPERTIES,
    durability: 80,
    weirdness: 50,
    paradigmAffinities: { dimensional: 40, divine: 30 },
    spellPower: 20,
    protection: 30,
    element: 'fire',
    moodModifier: 5,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'sky_blessing', magnitude: 40, description: 'Favored by sky gods' },
    ],
    description: 'Iron from fallen stars',
    lore: 'Thunderbolt iron, a gift from the heavens.',
  },

  darksteel: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    weirdness: 70,
    paradigmAffinities: { pact: 50, dimensional: 40 },
    protection: 50,
    element: null,
    moodModifier: -10,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'indestructible', magnitude: 100, description: 'Cannot be destroyed' },
    ],
    description: 'Utterly indestructible black metal',
    lore: 'Darksteel endures. It has no choice.',
  },

  etherium: {
    ...DEFAULT_PROPERTIES,
    durability: 65,
    weirdness: 80,
    glows: true,
    conducts_magic: true,
    paradigmAffinities: { academic: 80, craft: 50, dimensional: 30 },
    manaRegen: 2.0,
    spellPower: 45,
    element: null,
    moodModifier: 5,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'artifact_creation', magnitude: 60, description: 'Enhanced crafting' },
    ],
    description: 'Blue metal infused with aether',
    lore: 'Etherium flows with the essence of pure magic.',
  },

  wraithbone: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    weirdness: 85,
    alive: true,
    glows: true,
    paradigmAffinities: { daemon: 60, craft: 50, echo: 40 },
    manaRegen: 1.7,
    spellPower: 35,
    element: null,
    moodModifier: -15,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'psychic_resonance', magnitude: 55, description: 'Mental magic enhanced' },
      { type: 'spirit_housing', magnitude: 70, description: 'Contains ancestor spirits' },
    ],
    description: 'Psychically-shaped wraithbone',
    lore: 'Grown from the psychic emanations of ancient spirits.',
  },

  blackite: {
    ...DEFAULT_PROPERTIES,
    durability: 90,
    weirdness: 75,
    paradigmAffinities: { dimensional: 70, silence: 40 },
    protection: 45,
    element: null,
    moodModifier: -20,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'void_touch', magnitude: 50, description: 'Nullifies magic' },
    ],
    description: 'Stone of the void between stars',
    lore: 'Blackstone remembers the silence before creation.',
  },

  gromril: {
    ...DEFAULT_PROPERTIES,
    durability: 95,
    weirdness: 30,
    paradigmAffinities: { craft: 80, rune: 50 },
    protection: 55,
    element: 'earth',
    moodModifier: 10,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'dwarven_craft', magnitude: 50, description: 'Dwarven runes stronger' },
    ],
    description: 'Dwarven master-metal',
    lore: 'The finest metal in dwarven holds, hoarded jealously.',
  },

  ithilmar: {
    ...DEFAULT_PROPERTIES,
    durability: 60,
    weirdness: 45,
    glows: true,
    paradigmAffinities: { song: 60, dream: 40, shinto: 30 },
    manaRegen: 1.4,
    element: 'water',
    moodModifier: 15,
    atmosphere: 'calming',
    specialEffects: [
      { type: 'elven_grace', magnitude: 50, description: 'Elven magic enhanced' },
    ],
    description: 'Elven sea-silver',
    lore: 'Light as silk, strong as steel, blessed by the sea.',
  },

  hihi_irokane: {
    ...DEFAULT_PROPERTIES,
    durability: 90,
    weirdness: 65,
    glows: true,
    paradigmAffinities: { shinto: 100, divine: 40, craft: 30 },
    manaRegen: 1.6,
    spellPower: 30,
    element: 'fire',
    moodModifier: 20,
    atmosphere: 'energizing',
    specialEffects: [
      { type: 'divine_favor', magnitude: 60, description: 'Kami blessings enhanced' },
    ],
    description: 'Sacred metal of the sun',
    lore: 'Metal of the gods, said to be fragments of the sun.',
  },

  celestial_bronze: {
    ...DEFAULT_PROPERTIES,
    durability: 75,
    weirdness: 55,
    glows: true,
    paradigmAffinities: { divine: 80, daemon: 40 },
    spellPower: 25,
    protection: 30,
    element: 'fire',
    moodModifier: 10,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'monster_bane', magnitude: 70, description: 'Harms divine monsters' },
    ],
    description: 'Bronze blessed by the gods',
    lore: 'Forged by divine smiths for heroes to wield.',
  },

  stygian_iron: {
    ...DEFAULT_PROPERTIES,
    durability: 80,
    weirdness: 70,
    paradigmAffinities: { daemon: 80, blood: 40, pact: 30 },
    protection: 35,
    element: null,
    moodModifier: -25,
    atmosphere: 'terrifying',
    specialEffects: [
      { type: 'soul_touch', magnitude: 60, description: 'Damages souls directly' },
    ],
    description: 'Iron from the underworld',
    lore: 'Cooled in the River Styx, it touches more than flesh.',
  },

  imperial_gold: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    weirdness: 50,
    glows: true,
    paradigmAffinities: { divine: 70, pact: 40, name: 30 },
    spellPower: 25,
    element: 'fire',
    moodModifier: 15,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'roman_blessing', magnitude: 50, description: 'Jupiter\'s favor' },
    ],
    description: 'Gold consecrated to the gods',
    lore: 'Sacred to Roman gods, deadly to their enemies.',
  },

  enchanted_wood: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    flammable: false,
    weirdness: 45,
    alive: true,
    paradigmAffinities: { shinto: 60, dream: 40, breath: 30 },
    manaRegen: 1.4,
    element: 'wood',
    moodModifier: 20,
    atmosphere: 'comforting',
    specialEffects: [
      { type: 'nature_blessing', magnitude: 40, description: 'Plants thrive nearby' },
    ],
    description: 'Magically-treated living wood',
    lore: 'Wood that remembers being a tree, and dreams of forest.',
  },

  // ==========================================================================
  // WARHAMMER/40K MATERIALS
  // ==========================================================================

  warpstone: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    weirdness: 100,
    glows: true,
    paradigmAffinities: { wild: 100, dimensional: 70, daemon: 50 },
    manaRegen: 3.0,
    spellPower: 70,
    element: null,
    moodModifier: -40,
    atmosphere: 'terrifying',
    specialEffects: [
      { type: 'mutation_risk', magnitude: 80, description: 'Causes mutations' },
      { type: 'chaos_affinity', magnitude: 100, description: 'Chaos magic vastly enhanced' },
    ],
    description: 'Solidified chaos energy',
    lore: 'Pure crystallized chaos. Incredibly powerful, utterly dangerous.',
  },

  wyrdstone: {
    ...DEFAULT_PROPERTIES,
    durability: 45,
    weirdness: 95,
    glows: true,
    paradigmAffinities: { wild: 90, dimensional: 60, luck: 40 },
    manaRegen: 2.5,
    spellPower: 55,
    element: null,
    moodModifier: -30,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'fate_warping', magnitude: 60, description: 'Probability shifts' },
    ],
    description: 'Meteoric chaos-touched stone',
    lore: 'Wyrdstone fell with the comet, and nothing was the same.',
  },

  promethium: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    weirdness: 20,
    flammable: true,
    paradigmAffinities: { craft: 40 },
    element: 'fire',
    moodModifier: -10,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'eternal_flame', magnitude: 50, description: 'Burns indefinitely' },
    ],
    description: 'Refined fuel of war',
    lore: 'The lifeblood of the Imperium\'s war machine.',
  },

  ceramite: {
    ...DEFAULT_PROPERTIES,
    durability: 95,
    weirdness: 15,
    paradigmAffinities: { craft: 50 },
    protection: 60,
    element: 'earth',
    moodModifier: 0,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'heat_resistance', magnitude: 80, description: 'Immune to heat' },
    ],
    description: 'Heat-resistant armor plating',
    lore: 'The ceramite of power armor, proof against plasma.',
  },

  plasteel: {
    ...DEFAULT_PROPERTIES,
    durability: 85,
    weirdness: 10,
    paradigmAffinities: { craft: 40 },
    protection: 45,
    element: 'metal',
    moodModifier: 0,
    atmosphere: 'neutral',
    specialEffects: [],
    description: 'Composite metal-plastic alloy',
    lore: 'Standard construction material of the far future.',
  },

  // ==========================================================================
  // CREATURE MATERIALS
  // ==========================================================================

  dragon_scale: {
    ...DEFAULT_PROPERTIES,
    durability: 90,
    weirdness: 50,
    paradigmAffinities: { blood: 40, breath: 30 },
    protection: 60,
    element: 'fire',
    moodModifier: 5,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'fire_immunity', magnitude: 80, description: 'Resists dragonfire' },
      { type: 'draconic_presence', magnitude: 40, description: 'Commands respect' },
    ],
    description: 'Scales from a true dragon',
    lore: 'Each scale is a shield that once protected a god of fire.',
  },

  dragon_bone: {
    ...DEFAULT_PROPERTIES,
    durability: 85,
    weirdness: 55,
    paradigmAffinities: { blood: 50, echo: 40, breath: 30 },
    manaRegen: 1.5,
    spellPower: 30,
    element: 'fire',
    moodModifier: 0,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'draconic_memory', magnitude: 50, description: 'Ancient knowledge' },
    ],
    description: 'Bones of an ancient dragon',
    lore: 'Dragon bones remember millennia of hoarded wisdom.',
  },

  phoenix_feather: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    weirdness: 70,
    glows: true,
    flammable: false,
    paradigmAffinities: { divine: 60, blood: 40, breath: 30 },
    manaRegen: 1.8,
    element: 'fire',
    moodModifier: 25,
    atmosphere: 'energizing',
    specialEffects: [
      { type: 'resurrection_touch', magnitude: 40, description: 'Healing enhanced' },
      { type: 'rebirth_aura', magnitude: 60, description: 'Death resisted' },
    ],
    description: 'Feathers of the immortal bird',
    lore: 'A phoenix feather has died and been reborn a thousand times.',
  },

  unicorn_hair: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    weirdness: 60,
    glows: true,
    paradigmAffinities: { divine: 70, sympathy: 50 },
    manaRegen: 1.6,
    element: 'water',
    moodModifier: 30,
    atmosphere: 'calming',
    specialEffects: [
      { type: 'purity_ward', magnitude: 70, description: 'Evil repelled' },
      { type: 'healing_boost', magnitude: 50, description: 'Healing magic enhanced' },
    ],
    description: 'Hair from a unicorn\'s mane',
    lore: 'Freely given unicorn hair holds the purest magic.',
  },

  basilisk_hide: {
    ...DEFAULT_PROPERTIES,
    durability: 75,
    weirdness: 55,
    paradigmAffinities: { blood: 50 },
    protection: 40,
    element: 'earth',
    moodModifier: -15,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'petrification_resist', magnitude: 90, description: 'Immune to stone' },
      { type: 'venomous_aura', magnitude: 30, description: 'Poisons enhanced' },
    ],
    description: 'Hide of the king of serpents',
    lore: 'Even in death, the basilisk\'s hide remembers its deadly gaze.',
  },

  troll_hide: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    weirdness: 40,
    alive: true,
    paradigmAffinities: { blood: 40, consumption: 30 },
    protection: 35,
    element: 'earth',
    moodModifier: -10,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'regeneration', magnitude: 50, description: 'Slowly self-repairs' },
    ],
    description: 'Self-healing troll leather',
    lore: 'Troll hide keeps regenerating. Best not to think about it.',
  },

  giants_bone: {
    ...DEFAULT_PROPERTIES,
    durability: 85,
    weirdness: 35,
    paradigmAffinities: { blood: 30, craft: 25 },
    protection: 40,
    element: 'earth',
    moodModifier: 0,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'structural_strength', magnitude: 60, description: 'Supports great weight' },
    ],
    description: 'Bones of ancient giants',
    lore: 'Pillars of bone that once held up titans.',
  },

  demon_bone: {
    ...DEFAULT_PROPERTIES,
    durability: 75,
    weirdness: 80,
    glows: true,
    paradigmAffinities: { daemon: 100, blood: 50, pact: 40 },
    manaRegen: 1.7,
    spellPower: 40,
    element: 'fire',
    moodModifier: -35,
    atmosphere: 'terrifying',
    specialEffects: [
      { type: 'demonic_presence', magnitude: 60, description: 'Demons drawn here' },
      { type: 'infernal_power', magnitude: 50, description: 'Dark magic enhanced' },
    ],
    description: 'Bones of a fallen demon',
    lore: 'Demon bone whispers temptations to all who touch it.',
  },

  angel_feather: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    weirdness: 75,
    glows: true,
    paradigmAffinities: { divine: 100, song: 40, belief: 30 },
    manaRegen: 2.0,
    protection: 30,
    element: 'fire',
    moodModifier: 40,
    atmosphere: 'euphoric',
    specialEffects: [
      { type: 'divine_protection', magnitude: 70, description: 'Evil warded' },
      { type: 'truth_aura', magnitude: 50, description: 'Lies impossible' },
    ],
    description: 'Feathers from celestial wings',
    lore: 'An angel\'s feather carries the weight of heaven.',
  },

  lich_dust: {
    ...DEFAULT_PROPERTIES,
    durability: 20,
    weirdness: 85,
    paradigmAffinities: { echo: 80, academic: 60, blood: 40 },
    manaRegen: 2.0,
    spellPower: 50,
    element: null,
    moodModifier: -30,
    atmosphere: 'terrifying',
    specialEffects: [
      { type: 'undeath_affinity', magnitude: 80, description: 'Necromancy enhanced' },
      { type: 'phylactery_link', magnitude: 40, description: 'Soul magic boosted' },
    ],
    description: 'Remains of an undead sorcerer',
    lore: 'Even destroyed, a lich\'s power lingers in its dust.',
  },

  vampire_ash: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    weirdness: 70,
    paradigmAffinities: { blood: 100, consumption: 50, echo: 30 },
    manaRegen: 1.6,
    element: null,
    moodModifier: -25,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'blood_magic', magnitude: 70, description: 'Blood spells enhanced' },
      { type: 'night_affinity', magnitude: 50, description: 'Darkness magic boosted' },
    ],
    description: 'Ashes of a destroyed vampire',
    lore: 'Vampire ash hungers still, even in death.',
  },

  werewolf_pelt: {
    ...DEFAULT_PROPERTIES,
    durability: 55,
    weirdness: 50,
    paradigmAffinities: { blood: 60, sympathy: 40, wild: 30 },
    protection: 30,
    element: 'earth',
    moodModifier: -10,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'beast_form', magnitude: 40, description: 'Shapeshifting aided' },
      { type: 'lunar_sensitivity', magnitude: 60, description: 'Moon affects power' },
    ],
    description: 'Hide of a lycanthrope',
    lore: 'The beast within never truly dies.',
  },

  kraken_ink: {
    ...DEFAULT_PROPERTIES,
    durability: 10,
    weirdness: 65,
    paradigmAffinities: { literary: 70, dream: 50, daemon: 30 },
    manaRegen: 1.4,
    spellPower: 25,
    element: 'water',
    moodModifier: -15,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'mind_clouding', magnitude: 50, description: 'Confusion effects enhanced' },
      { type: 'depth_calling', magnitude: 40, description: 'Sea magic boosted' },
    ],
    description: 'Ink from the deep terror',
    lore: 'Kraken ink holds memories of the abyss.',
  },

  leviathan_bone: {
    ...DEFAULT_PROPERTIES,
    durability: 90,
    weirdness: 60,
    paradigmAffinities: { dimensional: 50, blood: 40 },
    protection: 50,
    element: 'water',
    moodModifier: -5,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'oceanic_might', magnitude: 60, description: 'Water magic enhanced' },
      { type: 'primordial_strength', magnitude: 50, description: 'Ancient power' },
    ],
    description: 'Bones of the world-serpent',
    lore: 'These bones held up seas.',
  },

  behemoth_hide: {
    ...DEFAULT_PROPERTIES,
    durability: 95,
    weirdness: 45,
    paradigmAffinities: { blood: 40, craft: 30 },
    protection: 65,
    element: 'earth',
    moodModifier: 0,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'unstoppable_force', magnitude: 60, description: 'Physical power boosted' },
    ],
    description: 'Hide of the earth-shaker',
    lore: 'Nothing stops a behemoth. Its hide remembers.',
  },

  sphinx_riddle: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    weirdness: 90,
    intangible: true,
    paradigmAffinities: { literary: 90, echo: 60, game: 50 },
    manaRegen: 1.8,
    spellPower: 45,
    element: null,
    moodModifier: 5,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'riddle_binding', magnitude: 70, description: 'Must solve to pass' },
      { type: 'wisdom_grant', magnitude: 50, description: 'Answers reveal truth' },
    ],
    description: 'A riddle given physical form',
    lore: 'The sphinx\'s riddle persists beyond its asker.',
  },

  phoenix_ash: {
    ...DEFAULT_PROPERTIES,
    durability: 20,
    weirdness: 75,
    glows: true,
    paradigmAffinities: { divine: 70, blood: 40, breath: 30 },
    manaRegen: 1.8,
    element: 'fire',
    moodModifier: 15,
    atmosphere: 'energizing',
    specialEffects: [
      { type: 'rebirth_potential', magnitude: 80, description: 'New beginnings' },
    ],
    description: 'Ashes of rebirth',
    lore: 'From these ashes, anything might rise.',
  },

  hydra_blood: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    weirdness: 60,
    paradigmAffinities: { blood: 80, consumption: 50 },
    manaRegen: 1.3,
    element: 'water',
    moodModifier: -20,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'regeneration', magnitude: 70, description: 'Wounds close rapidly' },
      { type: 'multiplication', magnitude: 40, description: 'Two for one' },
    ],
    description: 'Ever-renewing blood',
    lore: 'Cut off one head, two grow back. So too with its blood.',
  },

  manticore_spine: {
    ...DEFAULT_PROPERTIES,
    durability: 65,
    weirdness: 50,
    paradigmAffinities: { blood: 50, craft: 30 },
    protection: 25,
    element: 'fire',
    moodModifier: -15,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'poison_craft', magnitude: 60, description: 'Venoms enhanced' },
    ],
    description: 'Venomous tail spines',
    lore: 'A manticore\'s spine delivers agony with every touch.',
  },

  griffon_feather: {
    ...DEFAULT_PROPERTIES,
    durability: 45,
    weirdness: 40,
    paradigmAffinities: { divine: 40, wild: 30 },
    element: null, // Air-related, doesn't map to five elements
    moodModifier: 15,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'flight_affinity', magnitude: 50, description: 'Air magic boosted' },
      { type: 'noble_bearing', magnitude: 30, description: 'Commands respect' },
    ],
    description: 'Feathers of the king of beasts',
    lore: 'Griffons are royalty among creatures.',
  },

  // ==========================================================================
  // FEY MATERIALS
  // ==========================================================================

  fey_silver: {
    ...DEFAULT_PROPERTIES,
    durability: 55,
    weirdness: 70,
    glows: true,
    paradigmAffinities: { dream: 80, threshold: 50, emotional: 40 },
    manaRegen: 1.6,
    spellPower: 30,
    element: 'water',
    moodModifier: 20,
    atmosphere: 'dreamy',
    specialEffects: [
      { type: 'faerie_attunement', magnitude: 70, description: 'Fey magic enhanced' },
      { type: 'glamour_power', magnitude: 50, description: 'Illusions strengthened' },
    ],
    description: 'Silver from the feywild',
    lore: 'Fey silver shimmers with dreams and lies.',
  },

  goblin_gold: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    weirdness: 65,
    glows: true,
    paradigmAffinities: { debt: 80, commerce: 60, luck: 40 },
    manaRegen: 1.3,
    element: 'earth',
    moodModifier: -10,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'cursed_wealth', magnitude: 60, description: 'Attracts greed' },
      { type: 'contract_binding', magnitude: 50, description: 'Deals enforced' },
    ],
    description: 'Gold that comes with strings',
    lore: 'Goblin gold always returns to its makers, taking something with it.',
  },

  pixie_dust: {
    ...DEFAULT_PROPERTIES,
    durability: 10,
    weirdness: 75,
    glows: true,
    paradigmAffinities: { dream: 70, luck: 50, wild: 40 },
    manaRegen: 1.7,
    element: null, // Air-related, doesn't map to five elements
    moodModifier: 30,
    atmosphere: 'euphoric',
    specialEffects: [
      { type: 'flight_blessing', magnitude: 60, description: 'Enables flight' },
      { type: 'joy_inducement', magnitude: 50, description: 'Happiness spreads' },
    ],
    description: 'Glittering fey dust',
    lore: 'Think happy thoughts, and pixie dust does the rest.',
  },

  fairy_wings: {
    ...DEFAULT_PROPERTIES,
    durability: 15,
    weirdness: 70,
    glows: true,
    paradigmAffinities: { dream: 80, threshold: 40, emotional: 30 },
    manaRegen: 1.5,
    element: null, // Air-related, doesn't map to five elements
    moodModifier: 25,
    atmosphere: 'dreamy',
    specialEffects: [
      { type: 'veil_piercing', magnitude: 50, description: 'See through glamour' },
    ],
    description: 'Delicate fey wings',
    lore: 'Fairy wings catch light that hasn\'t been born yet.',
  },

  changeling_skin: {
    ...DEFAULT_PROPERTIES,
    durability: 35,
    weirdness: 80,
    paradigmAffinities: { sympathy: 80, dream: 50, emotional: 40 },
    manaRegen: 1.4,
    element: null,
    moodModifier: -5,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'identity_flux', magnitude: 70, description: 'Shapeshifting aided' },
      { type: 'emotional_mimicry', magnitude: 50, description: 'Copy feelings' },
    ],
    description: 'Skin of the shapechanger',
    lore: 'Changeling skin remembers every form it wore.',
  },

  dryad_bark: {
    ...DEFAULT_PROPERTIES,
    durability: 60,
    weirdness: 50,
    alive: true,
    paradigmAffinities: { shinto: 90, dream: 40, sympathy: 30 },
    manaRegen: 1.5,
    element: 'wood',
    moodModifier: 20,
    atmosphere: 'calming',
    specialEffects: [
      { type: 'plant_communion', magnitude: 70, description: 'Speak with plants' },
      { type: 'nature_ward', magnitude: 40, description: 'Protected by forest' },
    ],
    description: 'Bark gifted by tree spirits',
    lore: 'Dryad bark still dreams of deep roots and high branches.',
  },

  nymph_tears: {
    ...DEFAULT_PROPERTIES,
    durability: 10,
    weirdness: 65,
    glows: true,
    paradigmAffinities: { emotional: 80, sympathy: 60, dream: 40 },
    manaRegen: 1.6,
    element: 'water',
    moodModifier: 0,
    atmosphere: 'calming',
    specialEffects: [
      { type: 'charm_enhancement', magnitude: 60, description: 'Enchantments stronger' },
      { type: 'emotional_insight', magnitude: 50, description: 'Feel others\' hearts' },
    ],
    description: 'Crystallized nymph tears',
    lore: 'Nymph tears hold the full depth of fey emotion.',
  },

  satyr_horn: {
    ...DEFAULT_PROPERTIES,
    durability: 55,
    weirdness: 45,
    paradigmAffinities: { song: 80, emotional: 50, wild: 40 },
    manaRegen: 1.3,
    element: 'earth',
    moodModifier: 15,
    atmosphere: 'energizing',
    specialEffects: [
      { type: 'revelry_aura', magnitude: 60, description: 'Party never stops' },
      { type: 'music_enhancement', magnitude: 50, description: 'Music magic boosted' },
    ],
    description: 'Horns of the wild reveler',
    lore: 'Satyr horn still echoes with wild pipes.',
  },

  // ==========================================================================
  // COSMIC/OUTER MATERIALS
  // ==========================================================================

  dark_matter: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    weirdness: 95,
    intangible: true,
    paradigmAffinities: { dimensional: 100, silence: 50 },
    manaRegen: 2.0,
    spellPower: 50,
    element: null,
    moodModifier: -20,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'gravity_manipulation', magnitude: 70, description: 'Gravity bends' },
      { type: 'invisibility', magnitude: 60, description: 'Cannot be seen' },
    ],
    description: 'Matter that doesn\'t interact with light',
    lore: 'Most of the universe is dark matter. It does not notice us.',
  },

  neutronium: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    weirdness: 90,
    density: 100,
    paradigmAffinities: { dimensional: 80 },
    protection: 80,
    element: null,
    moodModifier: -10,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'immovable', magnitude: 100, description: 'Cannot be moved' },
      { type: 'gravity_well', magnitude: 50, description: 'Everything drawn toward it' },
    ],
    description: 'Degenerate star matter',
    lore: 'A teaspoon weighs as much as a mountain.',
  },

  strange_matter: {
    ...DEFAULT_PROPERTIES,
    durability: 80,
    weirdness: 100,
    paradigmAffinities: { dimensional: 90, consumption: 70 },
    manaRegen: 2.5,
    element: null,
    moodModifier: -30,
    atmosphere: 'terrifying',
    specialEffects: [
      { type: 'conversion', magnitude: 80, description: 'Converts other matter' },
    ],
    description: 'Matter that shouldn\'t exist',
    lore: 'Strange matter converts everything it touches. Handle with care.',
  },

  quantum_foam: {
    ...DEFAULT_PROPERTIES,
    durability: 30,
    weirdness: 100,
    intangible: true,
    paradigmAffinities: { dimensional: 100, paradox: 80, luck: 60 },
    manaRegen: 3.0,
    spellPower: 70,
    element: null,
    moodModifier: -15,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'probability_flux', magnitude: 90, description: 'Reality uncertain' },
      { type: 'teleportation', magnitude: 60, description: 'Space shortcuts' },
    ],
    description: 'The fabric of spacetime itself',
    lore: 'At the smallest scales, reality is foam.',
  },

  probability_matter: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    weirdness: 95,
    paradigmAffinities: { luck: 100, game: 70, paradox: 50 },
    manaRegen: 2.0,
    spellPower: 40,
    element: null,
    moodModifier: 0,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'luck_manipulation', magnitude: 80, description: 'Probability bends' },
      { type: 'outcome_selection', magnitude: 60, description: 'Choose results' },
    ],
    description: 'Matter made of possibility',
    lore: 'It is whatever you need it to be, until you look.',
  },

  possibility_crystal: {
    ...DEFAULT_PROPERTIES,
    durability: 60,
    weirdness: 90,
    glows: true,
    paradigmAffinities: { luck: 80, dimensional: 60, paradox: 50 },
    manaRegen: 2.2,
    spellPower: 50,
    element: null,
    moodModifier: 10,
    atmosphere: 'energizing',
    specialEffects: [
      { type: 'future_sight', magnitude: 60, description: 'See what might be' },
      { type: 'choice_multiplication', magnitude: 50, description: 'More options appear' },
    ],
    description: 'Crystallized potential',
    lore: 'Every facet shows a different future.',
  },

  paradox_glass: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    weirdness: 100,
    glows: true,
    paradigmAffinities: { paradox: 100, dimensional: 60, literary: 40 },
    manaRegen: 2.5,
    spellPower: 60,
    element: null,
    moodModifier: -25,
    atmosphere: 'unsettling',
    specialEffects: [
      { type: 'logic_break', magnitude: 80, description: 'Contradictions become true' },
      { type: 'impossible_geometry', magnitude: 70, description: 'Space folds wrong' },
    ],
    description: 'Glass that reflects what isn\'t',
    lore: 'Looking through paradox glass, you see yourself not looking.',
  },

  entropy: {
    ...DEFAULT_PROPERTIES,
    durability: 20,
    weirdness: 85,
    intangible: true,
    paradigmAffinities: { consumption: 100, dimensional: 40 },
    element: null,
    moodModifier: -30,
    atmosphere: 'terrifying',
    specialEffects: [
      { type: 'decay_aura', magnitude: 70, description: 'Everything decays faster' },
      { type: 'energy_drain', magnitude: 60, description: 'Saps vitality' },
    ],
    description: 'Solidified disorder',
    lore: 'Entropy always wins. This is entropy given form.',
  },

  negentropy: {
    ...DEFAULT_PROPERTIES,
    durability: 80,
    weirdness: 85,
    glows: true,
    paradigmAffinities: { divine: 60, craft: 50, belief: 40 },
    manaRegen: 2.0,
    element: null,
    moodModifier: 25,
    atmosphere: 'energizing',
    specialEffects: [
      { type: 'preservation', magnitude: 80, description: 'Things never decay' },
      { type: 'order_creation', magnitude: 60, description: 'Complexity emerges' },
    ],
    description: 'Anti-entropy given form',
    lore: 'The opposite of decay. Life fighting back against the void.',
  },

  raw_potential: {
    ...DEFAULT_PROPERTIES,
    durability: 50,
    weirdness: 90,
    glows: true,
    paradigmAffinities: { breath: 80, craft: 60, wild: 50 },
    manaRegen: 2.5,
    spellPower: 50,
    element: null,
    moodModifier: 15,
    atmosphere: 'energizing',
    specialEffects: [
      { type: 'becoming', magnitude: 70, description: 'Can become anything' },
      { type: 'growth_acceleration', magnitude: 50, description: 'Things develop faster' },
    ],
    description: 'Unrealized possibility',
    lore: 'Before anything is something, it is raw potential.',
  },

  crystallized_fate: {
    ...DEFAULT_PROPERTIES,
    durability: 70,
    weirdness: 85,
    glows: true,
    paradigmAffinities: { luck: 80, narrative: 60, divine: 40 },
    manaRegen: 1.8,
    spellPower: 40,
    element: null,
    moodModifier: 0,
    atmosphere: 'neutral',
    specialEffects: [
      { type: 'destiny_reading', magnitude: 70, description: 'See what must be' },
      { type: 'fate_binding', magnitude: 50, description: 'Lock outcomes' },
    ],
    description: 'Solidified destiny',
    lore: 'Some things are fated. This is what fate looks like.',
  },

  // ==========================================================================
  // ADDITIONAL LEGENDARY MATERIALS
  // ==========================================================================

  world_tree_wood: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    weirdness: 80,
    alive: true,
    glows: true,
    paradigmAffinities: { shinto: 100, dimensional: 60, divine: 50 },
    manaRegen: 2.5,
    spellPower: 50,
    element: 'wood',
    moodModifier: 30,
    atmosphere: 'comforting',
    specialEffects: [
      { type: 'realm_connection', magnitude: 80, description: 'Links all worlds' },
      { type: 'cosmic_stability', magnitude: 70, description: 'Reality anchored' },
    ],
    description: 'Wood from Yggdrasil or equivalent',
    lore: 'The world tree holds all realms in its branches.',
  },

  genesis_clay: {
    ...DEFAULT_PROPERTIES,
    durability: 60,
    weirdness: 90,
    alive: true,
    paradigmAffinities: { breath: 100, divine: 70, craft: 50 },
    manaRegen: 2.0,
    element: 'earth',
    moodModifier: 20,
    atmosphere: 'calming',
    specialEffects: [
      { type: 'life_creation', magnitude: 90, description: 'Can create life' },
      { type: 'shaping_response', magnitude: 70, description: 'Molds to will' },
    ],
    description: 'The clay from which life was made',
    lore: 'The first clay, still warm from creation.',
  },

  apocalypse_ash: {
    ...DEFAULT_PROPERTIES,
    durability: 40,
    weirdness: 95,
    paradigmAffinities: { consumption: 80, dimensional: 60, divine: 40 },
    manaRegen: 1.8,
    spellPower: 55,
    element: 'fire',
    moodModifier: -40,
    atmosphere: 'terrifying',
    specialEffects: [
      { type: 'ending_touch', magnitude: 80, description: 'Accelerates endings' },
      { type: 'rebirth_seed', magnitude: 40, description: 'From endings, beginnings' },
    ],
    description: 'Ash from the end of a world',
    lore: 'This ash remembers the death of a universe.',
  },

  creation_stone: {
    ...DEFAULT_PROPERTIES,
    durability: 100,
    weirdness: 95,
    glows: true,
    paradigmAffinities: { divine: 100, craft: 70, breath: 60 },
    manaRegen: 3.0,
    spellPower: 70,
    element: null,
    moodModifier: 30,
    atmosphere: 'euphoric',
    specialEffects: [
      { type: 'reality_shaping', magnitude: 90, description: 'Create from nothing' },
      { type: 'divine_conduit', magnitude: 80, description: 'Channel godly power' },
    ],
    description: 'Stone from the moment of creation',
    lore: 'When the universe began, there was this stone.',
  },
};

// =============================================================================
// EFFECT CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate the total magical effects for a building based on its materials.
 */
export function calculateBuildingEffects(
  materials: { wall: Material; floor: Material; door: Material },
  size: { width: number; height: number; floors?: number },
): MagicalEffect[] {
  const effects: MagicalEffect[] = [];
  const floors = size.floors ?? 1;
  const area = size.width * size.height * floors;

  // Get material properties
  const wallProps = MATERIAL_EFFECTS[materials.wall];
  const floorProps = MATERIAL_EFFECTS[materials.floor];
  const doorProps = MATERIAL_EFFECTS[materials.door];

  // Walls contribute most (60%), floor (30%), door (10%)
  const wallWeight = 0.6;
  const floorWeight = 0.3;
  const doorWeight = 0.1;

  // Calculate weighted averages
  const avgManaRegen = (
    wallProps.manaRegen * wallWeight +
    floorProps.manaRegen * floorWeight +
    doorProps.manaRegen * doorWeight
  );

  const avgSpellPower = (
    wallProps.spellPower * wallWeight +
    floorProps.spellPower * floorWeight +
    doorProps.spellPower * doorWeight
  );

  const avgProtection = (
    wallProps.protection * wallWeight +
    floorProps.protection * floorWeight +
    doorProps.protection * doorWeight
  );

  const avgMood = (
    wallProps.moodModifier * wallWeight +
    floorProps.moodModifier * floorWeight +
    doorProps.moodModifier * doorWeight
  );

  // Scale by building size (larger = more effect, but diminishing returns)
  const sizeMultiplier = Math.log10(area + 10) / 2;
  const radius = Math.floor(Math.sqrt(area) * 0.5);

  // Add mana regeneration if significant
  if (avgManaRegen > 1.1) {
    effects.push({
      type: 'mana_regen',
      magnitude: (avgManaRegen - 1.0) * 2 * sizeMultiplier,
      radius: radius,
    });
  }

  // Add spell power if significant
  if (avgSpellPower > 5) {
    effects.push({
      type: 'spell_power',
      magnitude: avgSpellPower * sizeMultiplier,
      radius: radius,
    });
  }

  // Add protection if significant
  if (avgProtection > 5) {
    effects.push({
      type: 'protection',
      magnitude: avgProtection * sizeMultiplier,
      radius: Math.floor(radius * 0.7),
    });
  }

  // Add mood aura if significant (positive or negative)
  if (Math.abs(avgMood) > 5) {
    effects.push({
      type: 'mood_aura',
      magnitude: avgMood * sizeMultiplier,
      radius: radius,
    });
  }

  // Combine elemental effects
  const elements: FengShuiElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  for (const element of elements) {
    const strength = [wallProps, floorProps, doorProps]
      .filter(p => p.element === element)
      .reduce((sum, p) => sum + p.elementalStrength, 0) / 3;

    if (strength > 20) {
      effects.push({
        type: 'elemental_attune',
        magnitude: strength * sizeMultiplier * 0.5,
        radius: radius,
        element: element,
      });
    }
  }

  // Add paradigm bonuses
  const paradigmTotals: Partial<Record<MagicParadigm, number>> = {};
  for (const props of [wallProps, floorProps, doorProps]) {
    for (const [paradigm, bonus] of Object.entries(props.paradigmAffinities)) {
      paradigmTotals[paradigm as MagicParadigm] =
        (paradigmTotals[paradigm as MagicParadigm] ?? 0) + (bonus ?? 0);
    }
  }

  for (const [paradigm, total] of Object.entries(paradigmTotals)) {
    if (total && total > 10) {
      effects.push({
        type: 'paradigm_bonus',
        magnitude: total * sizeMultiplier * 0.3,
        radius: radius,
        paradigm: paradigm as MagicParadigm,
      });
    }
  }

  // Add special effects from materials
  for (const props of [wallProps, floorProps, doorProps]) {
    for (const special of props.specialEffects) {
      // Convert material special effects to building magical effects
      const effectType = mapSpecialToMagicalEffect(special.type);
      if (effectType) {
        effects.push({
          type: effectType,
          magnitude: special.magnitude * sizeMultiplier,
          radius: special.radius ?? radius,
        });
      }
    }
  }

  return effects;
}

/**
 * Map material special effects to MagicalEffect types
 */
function mapSpecialToMagicalEffect(
  specialType: MaterialSpecialEffect['type']
): MagicalEffect['type'] | null {
  const mapping: Partial<Record<MaterialSpecialEffect['type'], MagicalEffect['type']>> = {
    'healing_aura': 'mana_regen', // Approximate
    'dream_induction': 'dream_stability',
    'nightmare_ward': 'dream_stability',
    'spirit_attraction': 'spirit_attraction',
    'spirit_repulsion': 'protection',
    'dimensional_stability': 'corruption_resist',
    'dimensional_flux': 'paradigm_bonus',
    'corruption_resistance': 'corruption_resist',
    'metal_burning_boost': 'paradigm_bonus',
    'name_protection': 'name_protection',
    'pact_binding': 'pact_leverage',
    'blood_potency': 'blood_efficiency',
    'luck_modifier': 'luck_modifier',
  };

  return mapping[specialType] ?? null;
}

/**
 * Get the dominant paradigm affinity for a material combination
 */
export function getDominantParadigm(
  materials: { wall: Material; floor: Material; door: Material }
): MagicParadigm | null {
  const totals: Partial<Record<MagicParadigm, number>> = {};

  for (const mat of [materials.wall, materials.floor, materials.door]) {
    const props = MATERIAL_EFFECTS[mat];
    for (const [paradigm, bonus] of Object.entries(props.paradigmAffinities)) {
      if (bonus && bonus > 0) {
        totals[paradigm as MagicParadigm] =
          (totals[paradigm as MagicParadigm] ?? 0) + bonus;
      }
    }
  }

  let maxParadigm: MagicParadigm | null = null;
  let maxValue = 0;

  for (const [paradigm, total] of Object.entries(totals)) {
    if (total && total > maxValue) {
      maxValue = total;
      maxParadigm = paradigm as MagicParadigm;
    }
  }

  return maxParadigm;
}

/**
 * Get the overall mood modifier for a material combination
 */
export function getMoodModifier(
  materials: { wall: Material; floor: Material; door: Material }
): number {
  const wallProps = MATERIAL_EFFECTS[materials.wall];
  const floorProps = MATERIAL_EFFECTS[materials.floor];
  const doorProps = MATERIAL_EFFECTS[materials.door];

  return (
    wallProps.moodModifier * 0.6 +
    floorProps.moodModifier * 0.3 +
    doorProps.moodModifier * 0.1
  );
}

/**
 * Get the dominant atmosphere for a material combination
 */
export function getAtmosphere(
  materials: { wall: Material; floor: Material; door: Material }
): MaterialEffectProperties['atmosphere'] {
  // Wall material dominates atmosphere
  return MATERIAL_EFFECTS[materials.wall].atmosphere;
}

/**
 * Check if a material combination is stable
 */
export function isStableCombination(
  materials: { wall: Material; floor: Material; door: Material }
): { stable: boolean; issues: string[] } {
  const issues: string[] = [];

  const wallProps = MATERIAL_EFFECTS[materials.wall];
  const floorProps = MATERIAL_EFFECTS[materials.floor];
  const doorProps = MATERIAL_EFFECTS[materials.door];

  // Check for conflicting elements
  const elements = [wallProps.element, floorProps.element, doorProps.element].filter(Boolean);
  if (elements.includes('fire') && elements.includes('water')) {
    issues.push('Fire and water elements conflict, reducing stability');
  }
  if (elements.includes('wood') && elements.includes('metal')) {
    issues.push('Wood and metal elements conflict (metal cuts wood)');
  }

  // Check for high maintenance combinations
  const avgMaintenance = (wallProps.maintenance + floorProps.maintenance + doorProps.maintenance) / 3;
  if (avgMaintenance > 70) {
    issues.push('High maintenance materials require constant upkeep');
  }

  // Check for intangible walls with tangible doors
  if (wallProps.intangible && !doorProps.intangible) {
    issues.push('Intangible walls with solid doors creates paradox');
  }

  // Check weirdness levels
  const avgWeirdness = (wallProps.weirdness + floorProps.weirdness + doorProps.weirdness) / 3;
  if (avgWeirdness > 80) {
    issues.push('Extreme weirdness may cause reality instability');
  }

  return {
    stable: issues.length === 0,
    issues,
  };
}

/**
 * Suggest complementary materials for a given primary material
 */
export function suggestComplementaryMaterials(primary: Material): {
  wall: Material[];
  floor: Material[];
  door: Material[];
} {
  const props = MATERIAL_EFFECTS[primary];

  // Find materials with compatible elements
  const compatibleElements: FengShuiElement[] = [];
  if (props.element) {
    // Feng shui productive cycle
    const productiveCycle: Record<FengShuiElement, FengShuiElement> = {
      wood: 'fire',
      fire: 'earth',
      earth: 'metal',
      metal: 'water',
      water: 'wood',
    };
    compatibleElements.push(props.element, productiveCycle[props.element]);
  }

  const suggestions = {
    wall: [] as Material[],
    floor: [] as Material[],
    door: [] as Material[],
  };

  for (const [mat, matProps] of Object.entries(MATERIAL_EFFECTS)) {
    const material = mat as Material;
    if (material === primary) continue;

    // Check compatibility
    const isCompatible =
      (!props.element || !matProps.element || compatibleElements.includes(matProps.element)) &&
      Math.abs(props.weirdness - matProps.weirdness) < 40;

    if (isCompatible) {
      if (matProps.durability > 40) suggestions.wall.push(material);
      if (!matProps.intangible) suggestions.floor.push(material);
      suggestions.door.push(material);
    }
  }

  // Limit suggestions
  return {
    wall: suggestions.wall.slice(0, 5),
    floor: suggestions.floor.slice(0, 5),
    door: suggestions.door.slice(0, 5),
  };
}
