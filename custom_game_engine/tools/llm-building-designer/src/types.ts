/**
 * LLM Building Designer - Type Definitions
 *
 * This module defines the schema that LLMs use to generate voxel-based
 * building designs. Keep separate from main game engine until validated.
 */

// =============================================================================
// TILE SYMBOLS
// =============================================================================

/**
 * Standard tile symbols for ASCII layouts.
 * LLMs should use these when generating buildings.
 */
export const TILE_SYMBOLS = {
  // Structural elements (define rooms)
  WALL: '#',           // Solid wall - blocks movement, defines room boundaries
  FLOOR: '.',          // Walkable floor - interior space
  DOOR: 'D',           // Door - can be opened/closed, connects rooms
  WINDOW: 'W',         // Window - in walls, blocks movement, allows light
  EMPTY: ' ',          // Empty/outside space (exterior)
  ENTRANCE: 'E',       // Main entrance (special door to exterior)

  // Interior furniture (doesn't define rooms, just blocks movement)
  COUNTER: 'C',        // Counter/bar - blocks movement, not a wall
  TABLE: 'T',          // Table - blocks movement
  BED: 'B',            // Bed - blocks movement
  STORAGE: 'S',        // Storage chest/crate - blocks movement
  WORKSTATION: 'K',    // Workstation/anvil/forge - blocks movement

  // Vertical connections
  STAIRS_UP: '^',      // Stairs going up to next floor
  STAIRS_DOWN: 'v',    // Stairs going down to previous floor
  STAIRS_BOTH: 'X',    // Stairwell (connects both up and down)
  LADDER_UP: 'L',      // Ladder up (1-tile vertical access)
  PILLAR: 'P',         // Structural pillar - blocks movement
  VOID: 'O',           // Open to floor below (atrium, balcony)
} as const;

export type TileSymbol = typeof TILE_SYMBOLS[keyof typeof TILE_SYMBOLS];

// =============================================================================
// MATERIALS
// =============================================================================

/**
 * Available building materials.
 * Each has different properties (insulation, durability, cost).
 */
/**
 * All materials available in the game.
 * This is the single source of truth - all material type aliases reference this.
 * Standard materials are common, exotic are rare/magical.
 */
export type Material =
  // Standard construction materials
  | 'wood' | 'stone' | 'mud_brick' | 'ice' | 'metal' | 'glass' | 'thatch'
  | 'dirt' | 'tile' | 'carpet' | 'cloth' | 'brick' | 'marble' | 'granite'
  | 'sandstone' | 'clay' | 'reed' | 'bamboo' | 'leather' | 'hide'
  // Precious metals
  | 'gold' | 'silver' | 'copper' | 'bronze' | 'iron' | 'steel'
  | 'mithril' | 'adamantine' | 'orichalcum'
  // Gems and crystals
  | 'diamond' | 'ruby' | 'sapphire' | 'emerald' | 'amethyst' | 'topaz'
  | 'opal' | 'pearl' | 'jade' | 'obsidian' | 'crystal' | 'quartz'
  // Organic materials
  | 'flesh' | 'bone' | 'chitin' | 'coral' | 'web' | 'wax' | 'fungus'
  | 'living_wood' | 'vines' | 'amber' | 'ivory' | 'shell' | 'feather' | 'scale'
  // Food materials (for whimsical buildings)
  | 'candy' | 'chocolate' | 'gingerbread' | 'cake' | 'ice_cream'
  | 'cheese' | 'bread' | 'sugar' | 'honey' | 'salt'
  // Written/Knowledge materials
  | 'pages' | 'ink' | 'books' | 'scrolls' | 'parchment' | 'vellum'
  | 'papyrus' | 'runes' | 'glyphs' | 'sigils' | 'grimoires'
  // Abstract/Magical materials
  | 'void' | 'light' | 'darkness' | 'dreams' | 'nightmares' | 'time'
  | 'memory' | 'emotion' | 'thought' | 'music' | 'silence'
  | 'starlight' | 'moonlight' | 'sunlight' | 'shadow' | 'mist'
  | 'smoke' | 'ash' | 'dust' | 'echoes' | 'whispers'
  // Condensed concepts
  | 'solidified_mana' | 'frozen_time' | 'crystallized_thought'
  | 'bottled_lightning' | 'woven_moonbeams' | 'manifested_fear'
  | 'concentrated_joy' | 'distilled_sorrow' | 'pure_chaos' | 'ordered_law'
  // Elemental materials
  | 'fire' | 'water' | 'air' | 'earth' | 'lightning' | 'magma' | 'steam' | 'frost'
  // Technological materials
  | 'circuitry' | 'data' | 'plasma' | 'force_field' | 'nanomaterial'
  // Allomantic metals (Mistborn)
  | 'pewter' | 'tin' | 'zinc' | 'brass' | 'chromium' | 'nickel'
  | 'aluminum' | 'duralumin' | 'atium' | 'lerasium'
  // Fantasy metals (various universes)
  | 'valyrian_steel' | 'dragonglass' | 'starmetal' | 'moonsilver'
  | 'soulsteel' | 'oathgold' | 'cold_iron' | 'meteoric_iron'
  | 'darksteel' | 'etherium' | 'wraithbone' | 'blackite'
  | 'gromril' | 'ithilmar' | 'hihi_irokane' | 'celestial_bronze'
  | 'stygian_iron' | 'imperial_gold' | 'enchanted_wood'
  // Warhammer/40k materials
  | 'warpstone' | 'wyrdstone' | 'promethium' | 'ceramite' | 'plasteel'
  // Creature materials
  | 'dragon_scale' | 'dragon_bone' | 'phoenix_feather' | 'unicorn_hair'
  | 'basilisk_hide' | 'troll_hide' | 'giants_bone' | 'demon_bone'
  | 'angel_feather' | 'lich_dust' | 'vampire_ash' | 'werewolf_pelt'
  | 'kraken_ink' | 'leviathan_bone' | 'behemoth_hide' | 'sphinx_riddle'
  | 'phoenix_ash' | 'hydra_blood' | 'manticore_spine' | 'griffon_feather'
  // Fey materials
  | 'fey_silver' | 'goblin_gold' | 'pixie_dust' | 'fairy_wings'
  | 'changeling_skin' | 'dryad_bark' | 'nymph_tears' | 'satyr_horn'
  // Cosmic/Outer materials
  | 'dark_matter' | 'neutronium' | 'strange_matter' | 'quantum_foam'
  | 'probability_matter' | 'possibility_crystal' | 'paradox_glass'
  | 'entropy' | 'negentropy' | 'raw_potential' | 'crystallized_fate'
  // Unique/Legendary materials
  | 'philosophers_stone' | 'primordial_chaos' | 'divine_essence'
  | 'soul_stuff' | 'ectoplasm' | 'blood' | 'tears' | 'breath'
  | 'world_tree_wood' | 'genesis_clay' | 'apocalypse_ash' | 'creation_stone';

/**
 * Wall materials - all materials can be used for walls.
 * Alias for Material for semantic clarity.
 */
export type WallMaterial = Material;

/**
 * Floor materials - all materials can be used for floors.
 * Alias for Material for semantic clarity.
 */
export type FloorMaterial = Material;

/**
 * Door materials - all materials can be used for doors.
 * Alias for Material for semantic clarity.
 */
export type DoorMaterial = Material;

/**
 * Material properties for balance calculations.
 * Basic construction properties for common materials.
 * For magical/exotic material properties, see MATERIAL_EFFECTS in material-effects.ts
 */
export interface MaterialProperties {
  insulation: number;          // 0-100: heat retention
  durability: number;          // 0-100: damage resistance
  constructionDifficulty: number; // 0-100: time/skill to build
  resourceCost: number;        // Units of material per tile
}

/**
 * Construction properties for common materials.
 * Exotic materials use MATERIAL_EFFECTS for their full property set.
 */
export const MATERIAL_PROPERTIES: Partial<Record<WallMaterial, MaterialProperties>> = {
  // Standard construction
  wood: { insulation: 50, durability: 40, constructionDifficulty: 20, resourceCost: 2 },
  stone: { insulation: 80, durability: 90, constructionDifficulty: 50, resourceCost: 3 },
  mud_brick: { insulation: 60, durability: 30, constructionDifficulty: 30, resourceCost: 2 },
  ice: { insulation: 30, durability: 20, constructionDifficulty: 40, resourceCost: 4 },
  metal: { insulation: 20, durability: 100, constructionDifficulty: 70, resourceCost: 5 },
  glass: { insulation: 10, durability: 10, constructionDifficulty: 60, resourceCost: 4 },
  thatch: { insulation: 40, durability: 15, constructionDifficulty: 10, resourceCost: 1 },
  brick: { insulation: 70, durability: 75, constructionDifficulty: 45, resourceCost: 3 },
  bamboo: { insulation: 45, durability: 55, constructionDifficulty: 25, resourceCost: 2 },
  marble: { insulation: 60, durability: 80, constructionDifficulty: 65, resourceCost: 6 },
  granite: { insulation: 75, durability: 95, constructionDifficulty: 70, resourceCost: 5 },
  // Precious metals (high cost, exotic)
  gold: { insulation: 30, durability: 30, constructionDifficulty: 80, resourceCost: 100 },
  silver: { insulation: 35, durability: 35, constructionDifficulty: 75, resourceCost: 50 },
  crystal: { insulation: 20, durability: 25, constructionDifficulty: 90, resourceCost: 30 },
  // Magical materials (difficulty reflects exotic nature)
  dreams: { insulation: 50, durability: 20, constructionDifficulty: 100, resourceCost: 200 },
  moonlight: { insulation: 40, durability: 50, constructionDifficulty: 95, resourceCost: 150 },
  music: { insulation: 30, durability: 30, constructionDifficulty: 95, resourceCost: 150 },
};

// =============================================================================
// BUILDING DEFINITION
// =============================================================================

/**
 * Building category for classification.
 */
export type BuildingCategory =
  | 'residential'    // Homes, dormitories
  | 'production'     // Workshops, forges
  | 'storage'        // Warehouses, barns
  | 'commercial'     // Shops, markets
  | 'community'      // Town hall, temple
  | 'farming'        // Greenhouse, barn
  | 'research'       // Library, lab
  | 'military'       // Barracks, watchtower
  | 'decoration';    // Gardens, statues

/**
 * Magic paradigms that buildings can interact with.
 * Aligned with packages/core/src/magic/ paradigm definitions.
 */
export type MagicParadigm =
  // Core paradigms
  | 'academic'      // Mana-based spellcasting
  | 'divine'        // Deity favor and miracles
  | 'blood'         // Hemomancy, life force
  | 'breath'        // Awakening, object animation
  | 'pact'          // Contracts with entities
  | 'name'          // True name magic
  | 'emotional'     // Feelings-based casting
  // Animist paradigms
  | 'shinto'        // Kami relationships
  | 'sympathy'      // Like affects like
  | 'allomancy'     // Metal-burning powers
  | 'dream'         // Oneiromancy
  | 'song'          // Bardic magic
  | 'rune'          // Inscription magic
  | 'daemon'        // Soul-bonded spirits
  // Creative paradigms
  | 'debt'          // Fae favor economy
  | 'bureaucratic'  // Stamps and forms
  | 'luck'          // Probability manipulation
  | 'threshold'     // Liminal space magic
  | 'belief'        // Faith makes real
  | 'echo'          // Memory magic
  | 'game'          // Wager-based magic
  | 'commerce'      // Trade magic
  // Dimensional
  | 'dimensional'   // Higher dimensions
  | 'literary'      // Word/narrative magic
  // Whimsical
  | 'talent'        // Unique personal magic
  | 'narrative'     // Story logic
  | 'wild'          // Chaotic magic
  // Additional paradigms
  | 'silence'       // Sound-negation magic
  | 'paradox'       // Contradiction-based magic
  | 'craft'         // Making/creation magic
  | 'lunar'         // Moon-phase magic
  | 'seasonal'      // Season-cycle magic
  | 'consumption';  // Absorption/hunger magic

/**
 * Feng Shui elements for building harmony.
 */
export type FengShuiElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

/**
 * Chi flow states in a building.
 */
export type ChiState = 'stagnant' | 'weak' | 'balanced' | 'strong' | 'rushing' | 'sha_qi';

/**
 * Building functionality that this building provides.
 */
export interface BuildingFunction {
  type:
    // Basic functions
    | 'sleeping'
    | 'crafting'
    | 'storage'
    | 'research'
    | 'gathering_boost'
    | 'mood_aura'
    | 'healing'             // Restores health
    | 'shop'                // Enables trading/commerce
    | 'training'            // Skill improvement
    // Magical functions
    | 'mana_well'           // Regenerates mana in radius
    | 'paradigm_amplifier'  // Boosts specific paradigm power
    | 'spell_focus'         // Reduces casting costs / increases range
    | 'enchanting'          // Allows item enchantment
    | 'summoning_circle'    // Summon entities
    | 'ward'                // Protective barrier
    | 'leyline_tap'         // Draws power from leylines
    | 'spirit_anchor'       // Attracts/houses spirits (kami, daemons)
    | 'dream_anchor'        // Stabilizes dream realm access
    | 'pact_altar'          // Facilitates entity contracts
    | 'true_name_vault'     // Stores and protects true names
    | 'blood_font'          // Blood magic focus (with ethical constraints)
    | 'harmony_resonator'   // Feng shui chi optimization
    | 'temporal_anchor'     // Time magic stabilization
    | 'dimensional_fold'    // Space manipulation
    | 'belief_focus'        // Concentrates collective belief
    | 'song_amplifier'      // Bardic magic enhancement
    | 'rune_forge'          // Inscription crafting
    | 'metal_reserve';      // Allomantic metal storage
  params: Record<string, unknown>;
}

/**
 * Magical effect that a building provides to nearby entities.
 */
export interface MagicalEffect {
  /** Type of magical effect */
  type:
    | 'mana_regen'          // +X mana per tick
    | 'spell_power'         // +X% spell effectiveness
    | 'cast_speed'          // -X% casting time
    | 'cost_reduction'      // -X% resource costs
    | 'range_extension'     // +X% spell range
    | 'duration_extension'  // +X% spell duration
    | 'protection'          // Damage reduction / resistance
    | 'elemental_attune'    // Bonus to element (feng shui)
    | 'paradigm_bonus'      // Bonus to specific paradigm
    | 'spirit_attraction'   // Draws friendly spirits
    | 'corruption_resist'   // Resists dimensional corruption
    | 'luck_modifier'       // Affects probability
    | 'dream_stability'     // Stabilizes dream magic
    | 'blood_efficiency'    // Reduces blood magic costs
    | 'name_protection'     // Shields true names
    | 'pact_leverage'       // Better contract terms
    | 'mood_aura';          // Affects occupant mood (+/-)

  /** Magnitude of the effect */
  magnitude: number;

  /** Radius of effect in tiles (0 = building only) */
  radius: number;

  /** Which paradigm this affects (if paradigm-specific) */
  paradigm?: MagicParadigm;

  /** Which element this affects (if element-specific) */
  element?: FengShuiElement;

  /** Conditions for the effect to apply */
  conditions?: {
    timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
    moonPhase?: 'new' | 'waxing' | 'full' | 'waning';
    weather?: string;
    minOccupants?: number;
    ritualActive?: boolean;
  };
}

/**
 * A room within a building (detected via flood-fill).
 */
export interface Room {
  id: string;
  name?: string;
  purpose?: string;
  tiles: Array<{ x: number; y: number; floor?: number }>;
  area: number;
  isEnclosed: boolean;
  floor?: number;
}

/**
 * A single floor in a multi-story building.
 */
export interface BuildingFloor {
  /** Floor number (0 = ground floor, 1 = first floor, etc.) */
  level: number;
  /** Optional name for this floor */
  name?: string;
  /** ASCII layout for this floor */
  layout: string[];
  /** Ceiling height in voxels (default depends on species) */
  ceilingHeight?: number;
}

// =============================================================================
// SPECIES & ROOM HEIGHT
// =============================================================================

/**
 * Creature height specification.
 * Can use named species or custom height values.
 */
export interface CreatureHeight {
  /** Height of the creature in voxel units */
  standingHeight: number;
  /** Minimum ceiling to physically fit (standingHeight + clearance) */
  minCeiling: number;
  /** Comfortable ceiling (standingHeight * comfort multiplier) */
  comfortableCeiling: number;
  /** Preferred door height */
  doorHeight: number;
}

/**
 * Pre-defined species with height configurations.
 * Use these or define custom heights.
 */
export type NamedSpecies =
  | 'tiny'       // 0.5 units (fairy, sprite)
  | 'small'      // 1 unit (gnome, halfling)
  | 'short'      // 1.5 units (dwarf, goblin)
  | 'medium'     // 2 units (human, orc)
  | 'tall'       // 2.5 units (elf, alien)
  | 'large'      // 3 units (ogre, troll)
  | 'huge'       // 4+ units (giant, dragon)
  | 'custom';    // Use customHeight field

export type BuilderSpecies = NamedSpecies;

/**
 * Height configurations for named species.
 * Ceiling comfort = how "open" a space feels.
 *
 * Comfort zones:
 * - cramped: ceiling < height * 1.2 (uncomfortable, ducking)
 * - snug: ceiling < height * 1.5 (cozy but not spacious)
 * - comfortable: ceiling = height * 1.5 to 2.0 (normal living)
 * - airy: ceiling = height * 2.0 to 3.0 (spacious, grand)
 * - cavernous: ceiling > height * 3.0 (cathedral-like)
 */
export const SPECIES_HEIGHT_REQUIREMENTS: Record<Exclude<NamedSpecies, 'custom'>, CreatureHeight & { description: string }> = {
  tiny: {
    standingHeight: 0.5,
    minCeiling: 1,
    comfortableCeiling: 1.5,
    doorHeight: 1,
    description: 'Tiny creatures (fairies, sprites) - half a voxel tall',
  },
  small: {
    standingHeight: 1,
    minCeiling: 1.5,
    comfortableCeiling: 2,
    doorHeight: 1.5,
    description: 'Small folk (gnomes, halflings) - 1 voxel tall',
  },
  short: {
    standingHeight: 1.5,
    minCeiling: 2,
    comfortableCeiling: 3,
    doorHeight: 2,
    description: 'Short beings (dwarves, goblins) - 1.5 voxels',
  },
  medium: {
    standingHeight: 2,
    minCeiling: 2.5,
    comfortableCeiling: 4,
    doorHeight: 2.5,
    description: 'Medium creatures (humans, orcs) - 2 voxels',
  },
  tall: {
    standingHeight: 2.5,
    minCeiling: 3,
    comfortableCeiling: 5,
    doorHeight: 3,
    description: 'Tall beings (elves, aliens) - 2.5 voxels',
  },
  large: {
    standingHeight: 3,
    minCeiling: 4,
    comfortableCeiling: 6,
    doorHeight: 4,
    description: 'Large creatures (ogres, trolls) - 3 voxels',
  },
  huge: {
    standingHeight: 5,
    minCeiling: 6,
    comfortableCeiling: 10,
    doorHeight: 6,
    description: 'Huge beings (giants, dragons) - 5+ voxels',
  },
};

/**
 * Calculate how comfortable a ceiling height feels for a creature.
 * Returns a comfort level and mood modifier.
 */
export function calculateCeilingComfort(
  creatureHeight: number,
  ceilingHeight: number
): { level: 'cramped' | 'snug' | 'comfortable' | 'airy' | 'cavernous'; moodModifier: number; description: string } {
  const ratio = ceilingHeight / creatureHeight;

  if (ratio < 1.2) {
    return { level: 'cramped', moodModifier: -20, description: 'Must duck constantly, very uncomfortable' };
  } else if (ratio < 1.5) {
    return { level: 'snug', moodModifier: -5, description: 'Tight fit, can feel claustrophobic' };
  } else if (ratio < 2.0) {
    return { level: 'comfortable', moodModifier: 0, description: 'Normal living space' };
  } else if (ratio < 3.0) {
    return { level: 'airy', moodModifier: 5, description: 'Spacious and open feeling' };
  } else {
    return { level: 'cavernous', moodModifier: 10, description: 'Grand cathedral-like space' };
  }
}

// =============================================================================
// FENG SHUI & SPATIAL HARMONY
// =============================================================================

/**
 * Feng Shui principles for building evaluation.
 * These affect occupant mood and wellbeing.
 */
export interface FengShuiAnalysis {
  /** Overall harmony score (0-100) */
  harmonyScore: number;

  /** Chi (energy) flow analysis */
  chiFlow: {
    /** Is there a clear path from entrance through the building? */
    hasGoodFlow: boolean;
    /** Are there any blocked or stagnant areas? */
    stagnantAreas: Array<{ x: number; y: number; floor?: number }>;
    /** Does energy rush straight through (bad)? */
    hasShaQi: boolean; // "Killing breath" - straight line from door to door/window
  };

  /** Room proportions */
  proportions: {
    /** Are rooms reasonably proportioned (not too long/narrow)? */
    areBalanced: boolean;
    /** Rooms with problematic proportions */
    unbalancedRooms: string[];
  };

  /** Commanding position */
  commandingPositions: {
    /** Are beds/desks placed to see the door? */
    wellPlaced: boolean;
    /** Furniture placements that violate commanding position */
    violations: Array<{ furniture: string; issue: string; location: { x: number; y: number } }>;
  };

  /** Five elements balance (wood, fire, earth, metal, water) */
  elementBalance: {
    wood: number;   // Plants, wooden furniture
    fire: number;   // Hearths, red/orange colors
    earth: number;  // Stone, ceramics
    metal: number;  // Metal objects
    water: number;  // Fountains, blue colors
  };

  /** Specific issues found */
  issues: Array<{
    principle: string;
    issue: string;
    suggestion: string;
    location?: { x: number; y: number; floor?: number };
  }>;
}

/**
 * Feng Shui element associations for materials and furniture.
 */
export const FENG_SHUI_ELEMENTS: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  // Materials
  'wood': 'wood',
  'thatch': 'wood',
  'stone': 'earth',
  'mud_brick': 'earth',
  'metal': 'metal',
  'glass': 'water',  // Reflective like water
  'ice': 'water',

  // Furniture
  'table': 'wood',
  'bed': 'wood',
  'storage': 'earth',
  'workstation': 'metal',
  'counter': 'wood',
};

/**
 * Complete building definition for LLM generation.
 * This is the primary schema LLMs should output.
 */
export interface VoxelBuildingDefinition {
  /** Unique identifier for this building design */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of the building's purpose and style */
  description: string;

  /** Building category */
  category: BuildingCategory;

  /** Tier level (1-5) for balance */
  tier: number;

  /**
   * ASCII layout of the building (single floor).
   * Each string is a row (Y-axis), characters are columns (X-axis).
   * Use TILE_SYMBOLS for consistency.
   *
   * For multi-floor buildings, use `floors` instead.
   *
   * Example:
   * ```
   * [
   *   "#####",
   *   "#...#",
   *   "#...D",
   *   "#...#",
   *   "#####"
   * ]
   * ```
   */
  layout: string[];

  /**
   * Multi-floor layouts (optional).
   * If provided, `layout` becomes the ground floor (level 0).
   * Use ^ for stairs up, v for stairs down, X for stairwells.
   */
  floors?: BuildingFloor[];

  /** Species this building is designed for (affects ceiling heights) */
  species?: BuilderSpecies;

  /** Default materials for each tile type */
  materials: {
    wall: WallMaterial;
    floor: FloorMaterial;
    door: DoorMaterial;
  };

  /** Named rooms within the building (optional, can be auto-detected) */
  rooms?: Array<{
    name: string;
    purpose: string;
    /** Coordinates of a tile in this room (for flood-fill anchor) */
    anchorTile: { x: number; y: number; floor?: number };
  }>;

  /** What functions this building provides */
  functionality: BuildingFunction[];

  /** Magical effects this building provides (auras, buffs, etc.) */
  magicalEffects?: MagicalEffect[];

  /**
   * Magic paradigms this building supports or enhances.
   * Buildings can be attuned to specific magical traditions.
   */
  paradigmAffinity?: MagicParadigm[];

  /**
   * Feng shui element this building is attuned to.
   * Affects chi flow and elemental balance in the area.
   */
  elementalAttunement?: FengShuiElement;

  /** Capacity (workers, storage slots, beds, etc.) */
  capacity: number;

  /** Architectural style for visual theming */
  style?: 'rustic' | 'stone_craft' | 'elven' | 'dwarven' | 'modern' | 'whimsical' | 'ancient' | 'arcane' | 'divine' | 'ethereal'
    | 'academic' | 'impossible' | 'unsettling' | 'theatrical' | 'colorful' | 'dark' | 'industrial' | 'organic' | 'crystalline';

  /** Optional lore/backstory for the building */
  lore?: string;

  /** Designer attribution (agent ID or "LLM") */
  designedBy?: string;

  /**
   * Compositional assembly (alternative to layout).
   * LLMs can describe the building using pre-defined modules
   * instead of specifying every tile.
   */
  composition?: BuildingComposition;
}

// =============================================================================
// COMPOSITIONAL BUILDING SYSTEM
// =============================================================================

/**
 * Pre-defined building modules that can be composed together.
 * LLMs can use these instead of laying out individual tiles.
 */
export type ModuleType =
  // Basic rooms
  | 'empty_room'           // Just walls and floor
  | 'room_with_door'       // Empty room with door on one side
  // Functional rooms
  | 'bedroom'              // Room with bed
  | 'storage_room'         // Room with storage containers
  | 'workshop'             // Room with workstation
  | 'kitchen'              // Room with counter and storage
  | 'dining_hall'          // Room with tables
  | 'library'              // Room with storage (books) and tables
  // Connectors
  | 'hallway'              // Narrow walkway
  | 'entrance_hall'        // Entry area with main door
  | 'stairwell'            // Vertical connector between floors
  // Special
  | 'courtyard'            // Open area (no roof)
  | 'balcony'              // Exterior extension with void below
  | 'tower_base';          // Circular or octagonal room

/**
 * Direction for module connections and door placement.
 */
export type Direction = 'north' | 'south' | 'east' | 'west';

/**
 * A single module placement in a composition.
 */
export interface ModulePlacement {
  /** Type of module to place */
  module: ModuleType;
  /** Size of this module instance */
  size: { width: number; height: number };
  /** Position in the composition grid (0,0 = top-left) */
  position: { x: number; y: number; floor?: number };
  /** Which sides have doors connecting to other modules */
  connections?: Direction[];
  /** Optional custom name for this room */
  name?: string;
  /** Rotation (0, 90, 180, 270 degrees) */
  rotation?: 0 | 90 | 180 | 270;
}

/**
 * Compositional building definition.
 * LLMs can describe buildings as arrangements of modules.
 */
export interface BuildingComposition {
  /** Overall footprint size */
  footprint: { width: number; height: number };
  /** Number of floors */
  floorCount: number;
  /** Module placements */
  modules: ModulePlacement[];
  /** Main entrance location */
  entrance: { x: number; y: number; facing: Direction };
}

// =============================================================================
// VALIDATION RESULTS
// =============================================================================

/**
 * Types of validation issues.
 */
export type ValidationIssueType =
  | 'no_entrance'           // Building has no door/entrance
  | 'multiple_entrances'    // Multiple doors on exterior (may be intentional)
  | 'unreachable_room'      // Room cannot be reached from entrance
  | 'hole_in_wall'          // Gap in wall that should be closed
  | 'floating_wall'         // Wall segment not connected to structure
  | 'room_too_small'        // Room is smaller than minimum size
  | 'room_too_large'        // Room exceeds maximum size
  | 'no_floor'              // Floor tiles missing inside walls
  | 'wall_inside_room'      // Unexpected wall inside a room
  | 'door_to_nowhere'       // Door leads outside or to wall
  | 'pathfinding_blocked'   // Agent cannot path through building
  | 'structural_issue'      // Generic structural problem
  | 'material_mismatch';    // Inconsistent materials

export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * A single validation issue.
 */
export interface ValidationIssue {
  type: ValidationIssueType;
  severity: ValidationSeverity;
  message: string;
  /** Location of the issue (if applicable) */
  location?: { x: number; y: number };
  /** Suggested fix (if available) */
  suggestion?: string;
}

/**
 * Complete validation result for a building.
 */
export interface ValidationResult {
  /** Is the building valid (no errors)? */
  isValid: boolean;

  /** List of all issues found */
  issues: ValidationIssue[];

  /** Detected rooms */
  rooms: Room[];

  /** Building dimensions */
  dimensions: { width: number; height: number };

  /** Total tile counts */
  tileCounts: {
    walls: number;
    floors: number;
    doors: number;
    windows: number;
    empty: number;
  };

  /** Estimated resource cost */
  resourceCost: Record<string, number>;

  /** Pathfinding analysis */
  pathfinding: {
    isTraversable: boolean;
    entrances: Array<{ x: number; y: number }>;
    deadEnds: Array<{ x: number; y: number }>;
  };
}

// =============================================================================
// LLM GENERATION REQUEST
// =============================================================================

/**
 * Request format for LLM building generation.
 */
export interface BuildingGenerationRequest {
  /** What type of building to generate */
  category: BuildingCategory;

  /** Approximate size (width x height) */
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge';

  /** Primary material preference */
  preferredMaterial?: WallMaterial;

  /** Architectural style */
  style?: string;

  /** Specific requirements */
  requirements?: {
    minRooms?: number;
    maxRooms?: number;
    mustHave?: string[];  // e.g., ["kitchen", "bedroom", "storage"]
    features?: string[];  // e.g., ["courtyard", "balcony"]
  };

  /** Additional context or constraints */
  context?: string;
}

/**
 * Size constraints for building generation.
 */
export const SIZE_CONSTRAINTS: Record<string, { minWidth: number; maxWidth: number; minHeight: number; maxHeight: number }> = {
  tiny: { minWidth: 3, maxWidth: 5, minHeight: 3, maxHeight: 5 },
  small: { minWidth: 5, maxWidth: 8, minHeight: 5, maxHeight: 8 },
  medium: { minWidth: 8, maxWidth: 15, minHeight: 8, maxHeight: 15 },
  large: { minWidth: 15, maxWidth: 25, minHeight: 15, maxHeight: 25 },
  huge: { minWidth: 25, maxWidth: 50, minHeight: 25, maxHeight: 50 },
};
