/**
 * LLM Building Designer
 *
 * A standalone module for language models to design voxel-based buildings
 * with validation and automated checks.
 *
 * Usage:
 *   import { validateBuilding, BUILDING_DESIGNER_SYSTEM_PROMPT } from './llm-building-designer.js';
 *
 * The module provides:
 * - Type definitions for building schemas
 * - Validation functions for structural integrity
 * - Pathfinding validation
 * - Prompt templates for LLM generation
 * - Example buildings
 * - Compositional module system (for smaller LLMs)
 * - Multi-floor visualization (floor slicer)
 * - Species height requirements
 * - Feng Shui spatial harmony analysis
 */

// Types (use export type for interfaces and type aliases)
export type {
  // Core types
  VoxelBuildingDefinition,
  ValidationResult,
  ValidationIssue,
  Room,

  // Multi-floor support
  BuildingFloor,

  // Tile symbols and materials
  TileSymbol,
  Material,
  WallMaterial,
  FloorMaterial,
  DoorMaterial,

  // Categories and functions
  BuildingCategory,
  BuildingFunction,

  // Magic system types
  MagicParadigm,
  MagicalEffect,
  FengShuiElement,
  ChiState,

  // Generation request
  BuildingGenerationRequest,

  // Species & height requirements
  CreatureHeight,
  NamedSpecies,
  BuilderSpecies,

  // Feng Shui
  FengShuiAnalysis,

  // Compositional system
  ModuleType,
  Direction,
  ModulePlacement,
  BuildingComposition,
} from './types.js';

// Constants (use regular export for const objects)
export {
  TILE_SYMBOLS,
  MATERIAL_PROPERTIES,
  SIZE_CONSTRAINTS,
  SPECIES_HEIGHT_REQUIREMENTS,
  FENG_SHUI_ELEMENTS,
  calculateCeilingComfort,
} from './types.js';

// Validation
export {
  validateBuilding,
  isValidBuilding,
  formatValidationResult,
  visualizeBuilding,
} from './validator.js';

// Enhanced Visualizer (for LLM understanding)
export {
  visualizeGrid,
  visualizeAnalysis,
  visualizePathfinding,
  summarizeBuilding,
  // Multi-floor visualization (floor slicer)
  getAllFloors,
  visualizeFloor,
  visualizeAllFloors,
  visualizeCrossSection,
  visualizeCeilingComfort,
} from './visualizer.js';

// Compositional Module System
export {
  generateModule,
  expandComposition,
  composeBuilding,
  MODULE_DESCRIPTIONS,
  BUILDING_TEMPLATES,
} from './composer.js';

// Room-Based Composition (simpler API)
export {
  // Core function
  composeFromRooms,

  // Room helpers
  room,
  ROOM_SIZES,

  // Quick generators
  simpleHouse,
  cottage,
  workshop,
  library,

  // Types
  RoomSpec,
  RoomType,
  BuildingSpec,
} from './room-composer.js';

// Feng Shui Analysis & Evolution
export {
  // Core analyzer
  analyzeFengShui,
  visualizeFengShui,

  // Evolution
  evolveForFengShui,
  suggestImprovements,

  // Element data
  ELEMENT_CONTROLS,
} from './feng-shui.js';

// Prompts
export {
  BUILDING_DESIGNER_SYSTEM_PROMPT,
  BUILDING_JSON_SCHEMA,
  BUILDING_DESIGNER_TOOL,
  generateBuildingPrompt,
  generateFixPrompt,
  generateBuildingSetPrompt,
} from './prompts.js';

// Examples (for testing)
export {
  // Individual buildings
  SIMPLE_HUT,
  STORAGE_SHED,
  CABIN_WITH_WINDOWS,
  WORKSHOP,
  HOUSE_WITH_ROOMS,
  L_SHAPED_WORKSHOP,
  BARN,
  MANOR,
  TOWN_HALL,
  CATHEDRAL,

  // Invalid examples for testing
  INVALID_NO_ENTRANCE,
  INVALID_UNREACHABLE_ROOM,
  INVALID_HOLE_IN_WALL,
  INVALID_DOOR_TO_WALL,

  // Collections
  ALL_VALID_EXAMPLES,
  ALL_INVALID_EXAMPLES,
  EXAMPLES_BY_TIER,
  EXAMPLES_BY_CATEGORY,
} from './examples.js';

// Building Library (57 buildings)
export {
  // Houses by species
  FAIRY_COTTAGE,
  FAIRY_TREEHOUSE,
  SPRITE_POD,
  GNOME_BURROW,
  HALFLING_HOLE,
  HALFLING_COTTAGE,
  GNOME_WORKSHOP_HOME,
  DWARF_STONEHOME,
  DWARF_CLAN_HALL,
  GOBLIN_SHANTY,
  GOBLIN_WARREN,
  HUMAN_HUT_TINY,
  HUMAN_COTTAGE_SMALL,
  HUMAN_HOUSE_MEDIUM,
  HUMAN_HOUSE_LARGE,
  HUMAN_MANOR,
  ORC_LONGHOUSE,
  ORC_CHIEFTAIN_HUT,
  ELF_TREEHOUSE,
  ELF_SPIRE_HOME,
  ALIEN_DOME,
  OGRE_CAVE_HOME,
  TROLL_BRIDGE_HOUSE,
  GIANT_CABIN,
  GIANT_CASTLE_KEEP,

  // Production buildings
  BLACKSMITH_FORGE,
  CARPENTER_WORKSHOP,
  WEAVER_SHOP,
  BAKERY,
  TANNERY,
  POTTERY_KILN,
  BREWERY,
  WINDMILL,

  // Commercial buildings
  GENERAL_STORE,
  TAVERN_SMALL,
  TAVERN_LARGE,
  TRADING_POST,

  // Storage buildings
  GRAIN_SILO,
  WAREHOUSE,
  COLD_STORAGE,
  BARN as LIBRARY_BARN,

  // Community buildings
  TOWN_HALL as LIBRARY_TOWN_HALL,
  TEMPLE_SMALL,
  TEMPLE_LARGE,
  WELL,
  SCHOOL,

  // Military buildings
  GUARD_POST,
  BARRACKS,
  ARMORY,
  TRAINING_YARD,

  // Farming buildings
  CHICKEN_COOP,
  STABLE,
  GREENHOUSE,
  BEEHIVE_HOUSE,

  // Research buildings
  LIBRARY,
  ALCHEMY_LAB,
  OBSERVATORY,

  // Collections
  ALL_BUILDINGS,

  // By species
  TINY_SPECIES_BUILDINGS,
  SMALL_SPECIES_BUILDINGS,
  SHORT_SPECIES_BUILDINGS,
  MEDIUM_SPECIES_BUILDINGS,
  TALL_SPECIES_BUILDINGS,
  LARGE_SPECIES_BUILDINGS,
  HUGE_SPECIES_BUILDINGS,

  // By category
  RESIDENTIAL_BUILDINGS,
  PRODUCTION_BUILDINGS,
  STORAGE_BUILDINGS,
  COMMERCIAL_BUILDINGS,
  COMMUNITY_BUILDINGS,
  FARMING_BUILDINGS,
  RESEARCH_BUILDINGS,
  MILITARY_BUILDINGS,
} from './building-library-data.js';

// Exotic Buildings (non-standard, higher-dimensional)
export {
  // Core type alignments (matches DimensionalParadigms.ts)
  DimensionCount,
  Position4D,
  DimensionalRift,

  // Clarketech (matches AUTOMATION_LOGISTICS_SPEC.md)
  ClarkeTechTier,
  CLARKETECH_REQUIREMENTS,

  // Universe portals (matches UniverseGateComponent)
  UniversePortal,

  // Realm pockets (matches RealmTypes.ts)
  RealmSize,
  TimeFlowType,
  RealmPocketConfig,

  // Exotic materials
  ExoticMaterial,
  ExoticMaterialProperties,
  EXOTIC_MATERIALS,

  // Building archetypes
  BuildingArchetype,

  // Building types
  DimensionalConfig,
  HigherDimensionalBuilding,
  ExoticBuildingSpec,

  // Generator
  generateExoticBuilding,
} from './exotic-buildings.js';

// Crafting & Research Buildings (matching game systems)
export {
  // Tier 1 - Basic
  CAMPFIRE_BASIC,
  WORKBENCH_BASIC,
  STORAGE_CHEST_HUT,

  // Tier 2 - Expanded
  FORGE_SMALL,
  LOOM_WORKSHOP,
  OVEN_BAKERY,
  WAREHOUSE_LARGE,
  LIBRARY_BUILDING,
  SCRIPTORIUM,
  GRILL_STATION,
  STEW_KITCHEN,
  SMOKEHOUSE,
  GRANARY_BUILDING,

  // Tier 3 - Advanced
  FORGE_LARGE,
  WORKSHOP_ADVANCED,
  ALCHEMY_LAB_BUILDING,
  WINDMILL_BUILDING,
  WATER_WHEEL_BUILDING,
  GREENHOUSE_BUILDING,

  // Tier 4 - Mastery
  TRADING_POST_BUILDING,
  BANK_BUILDING,
  AUTO_FARM_BUILDING,
  BREEDING_FACILITY,

  // Tier 5 - Endgame
  INVENTORS_HALL,
  ARCANE_TOWER_BUILDING,
  GENE_LAB_BUILDING,
  GRAND_HALL_BUILDING,
  MONUMENT,

  // Collections by tier
  TIER_1_CRAFTING,
  TIER_2_CRAFTING,
  TIER_3_CRAFTING,
  TIER_4_CRAFTING,
  TIER_5_CRAFTING,
  ALL_CRAFTING_BUILDINGS,

  // Research tree mapping
  RESEARCH_BUILDING_REQUIREMENTS,
} from './crafting-buildings-data.js';

// City Generation
export {
  // Types
  CityType,
  CitySize,
  DistrictType,
  Position,
  Plot,
  Street,
  District,
  CityLayout,
  CitySpec,
  GeneratedCity,
  FlyingCityConfig,

  // Constants
  DISTRICT_AFFINITIES,
  CITY_LEGEND,

  // City spacing & generation rates (realistic scale: 1 tile = 1 meter)
  CITY_SPACING,
  CITY_DENSITY_PER_MILLION_KM2,
  BIOME_CITY_TYPES,
  BIOME_MAX_CITY_SIZE,

  // Generator
  generateCity,
  visualizeCity,
} from './city-generator.js';

// Magic Buildings (paradigm-integrated)
export {
  // Core magic buildings
  MANA_WELL,
  LEYLINE_NEXUS,
  SPELL_FOCUS_TOWER,

  // Divine buildings
  SACRED_SHRINE,
  TEMPLE_OF_MIRACLES,

  // Spirit/Kami buildings
  KAMI_SHRINE,
  TORII_GATE,

  // Dream magic buildings
  DREAM_SANCTUARY,
  NIGHTMARE_WARD,

  // Song/Bardic buildings
  HARMONY_HALL,
  ECHO_CHAMBER,

  // Rune magic buildings
  RUNE_FORGE,
  STANDING_STONES,

  // Specialty paradigm buildings
  VITALITY_FONT,
  PACT_CIRCLE,
  TRUE_NAME_VAULT,
  METAL_RESERVE,

  // Elemental/Feng Shui buildings
  HARMONY_GARDEN,
  FIRE_FOUNT,
  WATER_FOUNT,

  // Dimensional buildings
  DIMENSIONAL_ANCHOR,
  CHAOS_NEXUS,

  // Emotional paradigm
  PASSION_CHAMBER,
  CATHARSIS_POOL,

  // Sympathy paradigm
  SYMPATHY_LINK_CHAMBER,

  // Debt paradigm
  DEBT_LEDGER_HALL,

  // Bureaucratic paradigm
  BUREAU_OF_FORMS,

  // Luck paradigm
  FORTUNES_WHEEL,

  // Silence paradigm
  VOID_CHAPEL,

  // Paradox paradigm
  ESCHER_OBSERVATORY,

  // Echo paradigm
  MEMORY_ARCHIVE,

  // Game paradigm
  ARCADE_SANCTUM,

  // Craft paradigm
  MAKERS_SANCTUM,

  // Commerce paradigm
  MERCHANTS_EXCHANGE,

  // Lunar paradigm
  MOON_TEMPLE,

  // Seasonal paradigm
  SOLSTICE_CIRCLE,

  // Daemon paradigm
  DAEMON_SANCTUM,

  // Consumption paradigm
  ABSORPTION_CHAMBER,

  // Talent paradigm
  TALENT_REGISTRY,

  // Narrative paradigm
  STORY_CIRCLE,

  // Literary paradigm
  LIBRARY_OF_BABEL,

  // Breath paradigm
  AWAKENING_WORKSHOP,

  // Blood paradigm
  CRIMSON_ALTAR,

  // Collections
  CORE_MAGIC_BUILDINGS,
  DIVINE_BUILDINGS,
  SPIRIT_BUILDINGS,
  DREAM_BUILDINGS,
  SONG_BUILDINGS,
  RUNE_BUILDINGS,
  SPECIALTY_BUILDINGS,
  ELEMENTAL_BUILDINGS,
  DIMENSIONAL_BUILDINGS,
  EMOTIONAL_BUILDINGS,
  SYMPATHY_BUILDINGS,
  DEBT_BUILDINGS,
  BUREAUCRATIC_BUILDINGS,
  LUCK_BUILDINGS,
  SILENCE_BUILDINGS,
  PARADOX_BUILDINGS,
  ECHO_BUILDINGS,
  GAME_BUILDINGS,
  CRAFT_BUILDINGS,
  COMMERCE_BUILDINGS,
  LUNAR_BUILDINGS,
  SEASONAL_BUILDINGS,
  DAEMON_BUILDINGS,
  CONSUMPTION_BUILDINGS,
  TALENT_BUILDINGS,
  NARRATIVE_BUILDINGS,
  LITERARY_BUILDINGS,
  BREATH_BUILDINGS,
  BLOOD_BUILDINGS,
  ALL_MAGIC_BUILDINGS,

  // Utility functions
  getBuildingsForParadigm,
  getBuildingsWithEffect,
} from './magic-buildings-data.js';

// Material Effects System
export {
  // Material effect types (Material itself is in types.ts)
  MaterialEffectProperties,
  MaterialSpecialEffect,

  // Material database
  MATERIAL_EFFECTS,

  // Calculation functions
  calculateBuildingEffects,
  getDominantParadigm,
  getMoodModifier,
  getAtmosphere,
  isStableCombination,
  suggestComplementaryMaterials,
} from './material-effects.js';
