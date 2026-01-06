/**
 * Material Creation Spells - Generalized spells for creating objects, structures, and cities from surreal materials
 *
 * These spells use the "Create" technique to bring material constructs into being.
 * Cost scales with both creation complexity and material exoticism:
 *
 * Complexity Scale:
 * - Object (arrow, brick, tool): Base cost
 * - Structure (furniture, wall section): 3x base cost
 * - Building (house, tower, organ): 10x base cost
 * - District (block of buildings): 50x base cost
 * - City (entire settlement): 200x base cost
 *
 * Material Exoticism Scale (multiplier):
 * - Common (wood, stone, metal): 1x
 * - Uncommon (glass, ice, bone): 1.5x
 * - Rare (shadow, dream, fungus): 2x
 * - Very Rare (candy, flesh, clockwork): 3x
 * - Legendary (memory, sound): 5x
 *
 * The spell effect system will calculate actual costs based on the specific
 * material selected and creation requested.
 */

import type { SpellDefinition } from './SpellRegistry.js';

// ============================================================================
// MATERIAL CREATION SPELLS - Universal across paradigms
// ============================================================================

/**
 * Material creation spells that work across multiple paradigms.
 * Academic, Divine, Craft, and Belief paradigms can all access these.
 */
export const MATERIAL_CREATION_SPELLS: SpellDefinition[] = [
  // === Level 1: Create Objects ===
  {
    id: 'create_material_object',
    name: 'Conjure Material Object',
    paradigmId: 'academic',  // Also usable by: divine, craft, belief
    technique: 'create',
    form: 'earth',
    source: 'arcane',
    manaCost: 15,  // Base cost - multiplied by material rarity
    castTime: 30,
    range: 3,
    effectId: 'create_material_object_effect',
    description: 'Create a small object from a chosen material. Arrows from shadow. Bricks from candy. Tools from crystallized memory. The universe considers this mildly presumptuous but permits it. Actual mana cost depends on material rarity and object complexity. Creating a shadow arrow is cheaper than summoning a memory-crystal blade.',
    school: 'creation',
    baseMishapChance: 0.08,
    hotkeyable: true,
    icon: '🔨',
    tags: ['creation', 'material', 'object', 'utility'],
    creatorDetection: {
      detectionRisk: 'moderate',
      forbiddenCategories: ['academic_study'],
      powerLevel: 3,
      leavesMagicalSignature: true,
      detectionNotes: 'Small-scale creation magic - detectable but not immediately threatening. Creates permanent objects from nothing.',
    },
  },

  // === Level 2: Create Structures ===
  {
    id: 'create_material_structure',
    name: 'Manifest Material Structure',
    paradigmId: 'academic',
    technique: 'create',
    form: 'earth',
    source: 'arcane',
    manaCost: 45,  // ~3x object creation base cost
    castTime: 120,
    range: 5,
    effectId: 'create_material_structure_effect',
    description: 'Create furniture, wall sections, or small structures from your chosen material. A table of living fungus. A door of solidified sound. A staircase of frozen dreams. The magic insists on structural integrity—wonky geometry costs extra mana and risks interesting collapses. Flesh furniture requires occasional feeding.',
    school: 'creation',
    baseMishapChance: 0.12,
    hotkeyable: true,
    icon: '🏗️',
    tags: ['creation', 'material', 'structure', 'building'],
    prerequisites: ['create_material_object'],
    creatorDetection: {
      detectionRisk: 'high',
      forbiddenCategories: ['academic_study', 'reality_warping'],
      powerLevel: 5,
      leavesMagicalSignature: true,
      detectionNotes: 'Creating permanent structures from nothing draws attention. The Supreme Creator notices when reality gets more complicated.',
    },
  },

  // === Level 3: Create Buildings ===
  {
    id: 'create_material_building',
    name: 'Summon Material Building',
    paradigmId: 'academic',
    technique: 'create',
    form: 'earth',
    source: 'arcane',
    manaCost: 150,  // ~10x object creation base cost
    castTime: 300,
    range: 10,
    effectId: 'create_material_building_effect',
    description: 'Bring forth an entire building from your chosen material. A house of candy that attracts children and ants. A tower of shadow that exists only in darkness. A workshop of living clockwork that maintains itself. The building arrives complete with doors, windows, and interior spaces. Living materials may have opinions about inhabitants.',
    school: 'creation',
    baseMishapChance: 0.18,
    hotkeyable: false,
    icon: '🏛️',
    tags: ['creation', 'material', 'building', 'major'],
    prerequisites: ['create_material_structure'],
    minProficiency: 50,
    creatorDetection: {
      detectionRisk: 'critical',
      forbiddenCategories: ['academic_study', 'reality_warping', 'divine_mimicry'],
      powerLevel: 7,
      leavesMagicalSignature: true,
      detectionNotes: 'Creating entire buildings is god-level power. The Supreme Creator will investigate. Permanent alterations to reality are forbidden.',
    },
  },

  // === Level 4: Create Districts ===
  {
    id: 'create_material_district',
    name: 'Architect\'s Dream',
    paradigmId: 'academic',
    technique: 'create',
    form: 'earth',
    source: 'arcane',
    manaCost: 750,  // ~50x object creation base cost
    castTime: 600,
    range: 20,
    effectId: 'create_material_district_effect',
    description: 'Manifest an entire district of buildings from your chosen material. A neighborhood of flesh that pulses with collective metabolism. A marketplace of crystalline glass that sings in the wind. A residential block of frozen music that changes with the seasons. The buildings arrange themselves according to aesthetic principles the caster barely understands. Population not included.',
    school: 'creation',
    baseMishapChance: 0.25,
    hotkeyable: false,
    icon: '🌆',
    tags: ['creation', 'material', 'district', 'legendary'],
    prerequisites: ['create_material_building'],
    minProficiency: 75,
    creatorDetection: {
      detectionRisk: 'critical',
      forbiddenCategories: ['academic_study', 'reality_warping', 'divine_mimicry', 'mass_destruction'],
      powerLevel: 9,
      leavesMagicalSignature: true,
      detectionNotes: 'Creating city districts is direct competition with the Supreme Creator\'s world-building authority. Immediate divine intervention guaranteed.',
    },
  },

  // === Level 5: Create Cities ===
  {
    id: 'create_material_city',
    name: 'Genesis of the Surreal',
    paradigmId: 'academic',
    technique: 'create',
    form: 'earth',
    source: 'arcane',
    manaCost: 3000,  // ~200x object creation base cost
    castTime: 1200,
    range: 50,
    effectId: 'create_material_city_effect',
    description: 'Call forth an entire city from your chosen material. A metropolis of shadow that exists between thoughts. A candy capital with gumdrop cobblestones and licorice lampposts. A flesh city that breathes and dreams and occasionally rearranges its own streets. The city arrives complete with infrastructure, districts, and a certain emergent personality. Governance and sanitation are your problem now.',
    school: 'creation',
    baseMishapChance: 0.35,
    hotkeyable: false,
    icon: '🏙️',
    tags: ['creation', 'material', 'city', 'legendary', 'world-altering'],
    prerequisites: ['create_material_district'],
    minProficiency: 95,
    creatorDetection: {
      detectionRisk: 'critical',
      forbiddenCategories: ['academic_study', 'reality_warping', 'divine_mimicry', 'ascension'],
      powerLevel: 10,
      leavesMagicalSignature: true,
      detectionNotes: 'Creating entire cities is the ultimate act of hubris. You are playing god. The Supreme Creator will personally attend to this. Only cast if you\'re ready for divine combat or if the universe has no active creator deity.',
    },
  },
];

// ============================================================================
// PARADIGM-SPECIFIC MATERIAL CREATION VARIATIONS
// ============================================================================

/**
 * Divine paradigm versions - powered by deity favor instead of mana
 */
export const DIVINE_MATERIAL_CREATION_SPELLS: SpellDefinition[] = MATERIAL_CREATION_SPELLS.map(spell => ({
  ...spell,
  id: spell.id.replace('academic', 'divine'),
  paradigmId: 'divine',
  source: 'divine' as const,
  description: spell.description + ' The deity finds this request either charming or blasphemous, depending on their domain. Creation gods approve. Destruction gods are puzzled.',
  creatorDetection: {
    ...spell.creatorDetection!,
    detectionRisk: 'low' as const,  // Divine magic is god-approved
    detectionNotes: 'God-granted creation power. If YOUR god lets you do it, the Supreme Creator has less standing to object. Still risky at city-scale.',
  },
}));

/**
 * Craft paradigm versions - requires material components and longer casting
 */
export const CRAFT_MATERIAL_CREATION_SPELLS: SpellDefinition[] = MATERIAL_CREATION_SPELLS.map(spell => ({
  ...spell,
  id: spell.id.replace('academic', 'craft'),
  paradigmId: 'craft',
  source: 'nature' as const,
  manaCost: Math.floor(spell.manaCost * 0.7),  // 30% cheaper with components
  castTime: spell.castTime * 2,  // But takes twice as long
  description: spell.description + ' Crafting requires seed materials—a fragment of the target material amplified through skill and magic. More honest than conjuring from nothing. The universe respects the craft.',
  baseMishapChance: spell.baseMishapChance! * 0.5,  // Much safer with components
  creatorDetection: {
    ...spell.creatorDetection!,
    detectionRisk: (spell.creatorDetection!.powerLevel ?? 0) > 7 ? 'high' as const : 'moderate' as const,
    detectionNotes: 'Craft-based creation uses existing materials as templates. Less reality-warping than pure conjuration. Still suspicious at large scales.',
  },
}));

/**
 * Belief paradigm versions - cost scales with how many people believe in the material
 */
export const BELIEF_MATERIAL_CREATION_SPELLS: SpellDefinition[] = MATERIAL_CREATION_SPELLS.map(spell => ({
  ...spell,
  id: spell.id.replace('academic', 'belief'),
  paradigmId: 'belief',
  source: 'arcane' as const,
  description: spell.description + ' If enough people believe in candy castles or shadow towers, belief makes them easier to manifest. Unpopular materials cost more. Meme magic works both ways.',
  creatorDetection: {
    ...spell.creatorDetection!,
    detectionRisk: (spell.creatorDetection!.powerLevel ?? 0) > 5 ? 'high' as const : 'low' as const,
    detectionNotes: 'Belief-powered creation is technically just manifesting consensus reality. Philosophically grey area for divine law. Gets suspicious when beliefs get weird.',
  },
}));

// ============================================================================
// EXPORT ALL SPELLS
// ============================================================================

export const ALL_MATERIAL_CREATION_SPELLS: SpellDefinition[] = [
  ...MATERIAL_CREATION_SPELLS,
  ...DIVINE_MATERIAL_CREATION_SPELLS,
  ...CRAFT_MATERIAL_CREATION_SPELLS,
  ...BELIEF_MATERIAL_CREATION_SPELLS,
];

/**
 * Helper function to calculate actual mana cost based on material and creation type
 * (This will be used by the effect system)
 */
export function calculateMaterialCreationCost(
  baseCost: number,
  materialRarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary',
  creationType: 'object' | 'structure' | 'building' | 'district' | 'city'
): number {
  // Material rarity multipliers
  const rarityMultipliers = {
    common: 1.0,      // wood, stone, metal, sand, water
    uncommon: 1.5,    // glass, ice, bone, coral, crystal
    rare: 2.0,        // shadow, dream, fungus, fire, smoke
    very_rare: 3.0,   // candy, flesh, clockwork, poison, memory
    legendary: 5.0,   // sound, pure void, time crystal
  };

  // Creation complexity multipliers
  const complexityMultipliers = {
    object: 1,
    structure: 3,
    building: 10,
    district: 50,
    city: 200,
  };

  return Math.floor(
    baseCost * rarityMultipliers[materialRarity] * complexityMultipliers[creationType]
  );
}

/**
 * Material rarity lookup table for the 31 surreal materials
 */
export const MATERIAL_RARITY_TABLE: Record<string, 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary'> = {
  // Common materials
  'living_wood': 'common',
  'living_stone': 'common',
  'forged_steel': 'common',
  'flowing_sand': 'common',
  'frozen_water': 'common',

  // Uncommon materials
  'living_glass': 'uncommon',
  'eternal_ice': 'uncommon',
  'ancient_bone': 'uncommon',
  'living_coral': 'uncommon',
  'resonant_crystal': 'uncommon',
  'pure_diamond': 'uncommon',

  // Rare materials
  'shadow_essence': 'rare',
  'dream_crystal': 'rare',
  'giant_mushroom': 'rare',
  'eternal_flame': 'rare',
  'solidified_smoke': 'rare',
  'folded_parchment': 'rare',
  'living_clay': 'rare',

  // Very Rare materials
  'sugar_brick': 'very_rare',
  'chocolate_beam': 'very_rare',
  'flesh_brick': 'very_rare',
  'living_gears': 'very_rare',
  'crystallized_toxin': 'very_rare',
  'memory_crystal': 'very_rare',
  'woven_silk': 'very_rare',
  'delicate_porcelain': 'very_rare',

  // Legendary materials
  'frozen_music': 'legendary',
  'oxidized_metal': 'legendary',  // Rust that ages backwards
  'fossilized_resin': 'legendary',  // Amber containing memories
  'crystalline_salt': 'legendary',  // Preserves anything
  'beeswax': 'legendary',  // Records all secrets
  'compressed_coal': 'legendary',  // Potential energy incarnate
};
