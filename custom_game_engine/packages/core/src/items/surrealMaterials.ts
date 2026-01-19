/**
 * Surreal Material Item Definitions
 *
 * Building materials for generative cities from GENERATIVE_CITIES_SPEC.md
 * Includes 71 unique materials with special properties, acquisition methods,
 * and magic system integration.
 *
 * This module loads material definitions from JSON and converts them to ItemDefinition objects.
 */

import { defineItem, type ItemDefinition } from './ItemDefinition.js';
import surrealMaterialsData from '../../data/surreal-materials.json' assert { type: 'json' };

/**
 * Interface for material data from JSON
 */
interface MaterialData {
  id: string;
  name: string;
  category: string;
  weight?: number;
  stackSize?: number;
  baseMaterial?: string;
  isGatherable?: boolean;
  gatherSources?: string[];
  requiredTool?: string;
  craftedFrom?: Array<{ itemId: string; amount: number }>;
  baseValue?: number;
  rarity?: string;
  traits?: {
    material?: Record<string, any>;
    edible?: Record<string, any>;
    magical?: Record<string, any>;
  };
}

/**
 * Converts JSON material data to ItemDefinition using defineItem
 */
function loadMaterialFromJSON(data: MaterialData): ItemDefinition {
  const { id, name, category, ...properties } = data;
  return defineItem(id, name, category, properties);
}

/**
 * Load all surreal materials from JSON
 */
function loadSurrealMaterials(): Record<string, ItemDefinition> {
  const materials: Record<string, ItemDefinition> = {};

  for (const materialData of surrealMaterialsData.materials as MaterialData[]) {
    const material = loadMaterialFromJSON(materialData);
    // Use the base material name as key (e.g., "FLESH_BRICK" from "material:flesh_brick")
    const key = materialData.id
      .replace('material:', '')
      .toUpperCase()
      .replace(/:/g, '_');
    materials[key] = material;
  }

  return materials;
}

// Load all materials from JSON
const SURREAL_MATERIALS = loadSurrealMaterials();

// Export individual materials for backwards compatibility
const FLESH_BRICK = SURREAL_MATERIALS.FLESH_BRICK;
const FUNGUS_MATERIAL = SURREAL_MATERIALS.GIANT_MUSHROOM;
const WOOD_MATERIAL = SURREAL_MATERIALS.LIVING_WOOD;
const CLAY_MATERIAL = SURREAL_MATERIALS.LIVING_CLAY;
const FIRE_MATERIAL = SURREAL_MATERIALS.ETERNAL_FLAME;
const CLOCKWORK_MATERIAL = SURREAL_MATERIALS.LIVING_GEARS;
const CANDY_MATERIAL = SURREAL_MATERIALS.SUGAR_BRICK;
const CHOCOLATE_BEAM = SURREAL_MATERIALS.CHOCOLATE_BEAM;
const SHADOW_ESSENCE = SURREAL_MATERIALS.SHADOW_ESSENCE;
const DREAM_CRYSTAL = SURREAL_MATERIALS.DREAM_CRYSTAL;
const SOUND_CRYSTAL = SURREAL_MATERIALS.FROZEN_MUSIC;
const MEMORY_CRYSTAL = SURREAL_MATERIALS.MEMORY_CRYSTAL;
const STONE_MATERIAL = SURREAL_MATERIALS.LIVING_STONE;
const METAL_MATERIAL = SURREAL_MATERIALS.FORGED_STEEL;
const DIAMOND_MATERIAL = SURREAL_MATERIALS.PURE_DIAMOND;
const SAND_MATERIAL = SURREAL_MATERIALS.FLOWING_SAND;
const ICE_MATERIAL = SURREAL_MATERIALS.ETERNAL_ICE;
const GLASS_MATERIAL = SURREAL_MATERIALS.LIVING_GLASS;
const PAPER_MATERIAL = SURREAL_MATERIALS.FOLDED_PARCHMENT;
const CRYSTAL_MATERIAL = SURREAL_MATERIALS.RESONANT_CRYSTAL;
const BONE_MATERIAL = SURREAL_MATERIALS.ANCIENT_BONE;
const SMOKE_MATERIAL = SURREAL_MATERIALS.SOLIDIFIED_SMOKE;
const RUST_MATERIAL = SURREAL_MATERIALS.OXIDIZED_METAL;
const SILK_MATERIAL = SURREAL_MATERIALS.WOVEN_SILK;
const AMBER_MATERIAL = SURREAL_MATERIALS.FOSSILIZED_RESIN;
const SALT_MATERIAL = SURREAL_MATERIALS.CRYSTALLINE_SALT;
const WAX_MATERIAL = SURREAL_MATERIALS.BEESWAX;
const COAL_MATERIAL = SURREAL_MATERIALS.COMPRESSED_COAL;
const POISON_MATERIAL = SURREAL_MATERIALS.CRYSTALLIZED_TOXIN;
const PORCELAIN_MATERIAL = SURREAL_MATERIALS.DELICATE_PORCELAIN;
const CORAL_MATERIAL = SURREAL_MATERIALS.LIVING_CORAL;
const WATER_MATERIAL = SURREAL_MATERIALS.FROZEN_WATER;
const MITHRIL = SURREAL_MATERIALS.MITHRIL;
const ADAMANTINE = SURREAL_MATERIALS.ADAMANTINE;
const ORICHALCUM = SURREAL_MATERIALS.ORICHALCUM;
const STARMETAL = SURREAL_MATERIALS.STARMETAL;
const STARLIGHT_ESSENCE = SURREAL_MATERIALS.STARLIGHT_ESSENCE;
const VOIDSTONE = SURREAL_MATERIALS.VOIDSTONE;
const DRAGONSCALE = SURREAL_MATERIALS.DRAGONSCALE;
const PHOENIX_ASH = SURREAL_MATERIALS.PHOENIX_ASH;
const CHITIN = SURREAL_MATERIALS.CHITIN;
const ECTOPLASM = SURREAL_MATERIALS.ECTOPLASM;
const MOONSTONE = SURREAL_MATERIALS.MOONSTONE;
const SUNSTONE = SURREAL_MATERIALS.SUNSTONE;
const BLOODSTONE = SURREAL_MATERIALS.BLOODSTONE;
const NULL_CRYSTAL = SURREAL_MATERIALS.NULL_CRYSTAL;
const QUICKSILVER = SURREAL_MATERIALS.QUICKSILVER;
const AETHERIUM = SURREAL_MATERIALS.AETHERIUM;
const GRAVITY_STONE = SURREAL_MATERIALS.GRAVITY_STONE;
const PHASE_QUARTZ = SURREAL_MATERIALS.PHASE_QUARTZ;
const BIO_LUMINESCENT_SLIME = SURREAL_MATERIALS.BIO_LUMINESCENT_SLIME;
const PHILOSOPHERS_STONE_FRAGMENT = SURREAL_MATERIALS.PHILOSOPHERS_STONE_FRAGMENT;
const MORPHIC_CLAY = SURREAL_MATERIALS.MORPHIC_CLAY;
const CHRONIUM = SURREAL_MATERIALS.CHRONIUM;
const OBSIDIAN = SURREAL_MATERIALS.OBSIDIAN;
const PETRIFIED_WOOD = SURREAL_MATERIALS.PETRIFIED_WOOD;
const LIVING_VINE_MATERIAL = SURREAL_MATERIALS.LIVING_VINE;
const RAMPANT_VINE = SURREAL_MATERIALS.RAMPANT_VINE;
const EXPLOSIVE_FUNGUS = SURREAL_MATERIALS.EXPLOSIVE_FUNGUS;
const CRYSTALLIZING_MOLD = SURREAL_MATERIALS.CRYSTALLIZING_MOLD;
const RUST_PLAGUE = SURREAL_MATERIALS.RUST_PLAGUE;
const STICKY_SLIME = SURREAL_MATERIALS.STICKY_SLIME;
const LIVING_PAINT = SURREAL_MATERIALS.LIVING_PAINT;
const WHISPERING_WALLS = SURREAL_MATERIALS.WHISPERING_WALLS;
const GRAVITY_INVERTED_STONE = SURREAL_MATERIALS.GRAVITY_INVERTED_STONE;
const PARADOX_MATERIAL = SURREAL_MATERIALS.PARADOX_MATERIAL;
const TIME_DILATED_WOOD = SURREAL_MATERIALS.TIME_DILATED_WOOD;
const SINGING_METAL = SURREAL_MATERIALS.SINGING_METAL;
const LAUGHING_GAS_CRYSTAL = SURREAL_MATERIALS.LAUGHING_GAS_CRYSTAL;
const CURSED_GOLD = SURREAL_MATERIALS.CURSED_GOLD;
const HUNGRY_STONE = SURREAL_MATERIALS.HUNGRY_STONE;
const MIMIC_MATERIAL = SURREAL_MATERIALS.MIMIC_MATERIAL;

// ============================================================================
// EXPORT - Materials can now be exported when validators are ready
// ============================================================================

/**
 * Export all surreal material items as an array
 * Includes all 71 materials from the JSON data file
 */
export const SURREAL_MATERIAL_ITEMS: ItemDefinition[] = Object.values(SURREAL_MATERIALS);

/**
 * Export the materials lookup object for direct access by key
 */
export { SURREAL_MATERIALS };

/**
 * Export specific materials for backwards compatibility
 * These are kept for any code that may directly reference them
 */
export {
  FLESH_BRICK,
  FUNGUS_MATERIAL,
  WOOD_MATERIAL,
  CLAY_MATERIAL,
  FIRE_MATERIAL,
  CLOCKWORK_MATERIAL,
  CANDY_MATERIAL,
  CHOCOLATE_BEAM,
  SHADOW_ESSENCE,
  DREAM_CRYSTAL,
  SOUND_CRYSTAL,
  MEMORY_CRYSTAL,
  STONE_MATERIAL,
  METAL_MATERIAL,
  DIAMOND_MATERIAL,
  SAND_MATERIAL,
  ICE_MATERIAL,
  GLASS_MATERIAL,
  PAPER_MATERIAL,
  CRYSTAL_MATERIAL,
  BONE_MATERIAL,
  SMOKE_MATERIAL,
  RUST_MATERIAL,
  SILK_MATERIAL,
  AMBER_MATERIAL,
  SALT_MATERIAL,
  WAX_MATERIAL,
  COAL_MATERIAL,
  POISON_MATERIAL,
  PORCELAIN_MATERIAL,
  CORAL_MATERIAL,
  WATER_MATERIAL,
  MITHRIL,
  ADAMANTINE,
  ORICHALCUM,
  STARMETAL,
  STARLIGHT_ESSENCE,
  VOIDSTONE,
  DRAGONSCALE,
  PHOENIX_ASH,
  CHITIN,
  ECTOPLASM,
  MOONSTONE,
  SUNSTONE,
  BLOODSTONE,
  NULL_CRYSTAL,
  QUICKSILVER,
  AETHERIUM,
  GRAVITY_STONE,
  PHASE_QUARTZ,
  BIO_LUMINESCENT_SLIME,
  PHILOSOPHERS_STONE_FRAGMENT,
  MORPHIC_CLAY,
  CHRONIUM,
  OBSIDIAN,
  PETRIFIED_WOOD,
  LIVING_VINE_MATERIAL,
  RAMPANT_VINE,
  EXPLOSIVE_FUNGUS,
  CRYSTALLIZING_MOLD,
  RUST_PLAGUE,
  STICKY_SLIME,
  LIVING_PAINT,
  WHISPERING_WALLS,
  GRAVITY_INVERTED_STONE,
  PARADOX_MATERIAL,
  TIME_DILATED_WOOD,
  SINGING_METAL,
  LAUGHING_GAS_CRYSTAL,
  CURSED_GOLD,
  HUNGRY_STONE,
  MIMIC_MATERIAL,
};

// ============================================================================
// LEGACY CODE - All hardcoded data moved to surreal-materials.json
// ============================================================================

/*
 * All material definitions have been moved to:
 * custom_game_engine/packages/core/data/surreal-materials.json
 *
 * This allows for easier editing and management of material data without
 * needing to modify TypeScript code. The data is loaded at module initialization
 * and converted to ItemDefinition objects using the defineItem function.
 *
 * Original hardcoded definitions removed to reduce file size from 2600+ lines
 * to ~200 lines. See git history for the original hardcoded version.
 */
