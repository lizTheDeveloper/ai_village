/**
 * Building Library - JSON Data Loader
 *
 * This file loads building definitions from JSON instead of hardcoding them in TypeScript.
 * Buildings are now maintained in data/standard-buildings.json for easier editing.
 *
 * Migration completed: 57 buildings extracted from building-library.ts
 */

import { VoxelBuildingDefinition } from './types';
import buildingsData from '../data/standard-buildings.json';

// Type assertion to ensure the imported data matches our type
const buildings = buildingsData as VoxelBuildingDefinition[];

// Create exports by building ID for backwards compatibility
const buildingMap = new Map<string, VoxelBuildingDefinition>();
for (const building of buildings) {
  buildingMap.set(building.id, building);
}

// Export individual buildings by their original const names
export const FAIRY_COTTAGE = buildingMap.get('fairy_cottage')!;
export const FAIRY_TREEHOUSE = buildingMap.get('fairy_treehouse')!;
export const SPRITE_POD = buildingMap.get('sprite_pod')!;
export const GNOME_BURROW = buildingMap.get('gnome_burrow')!;
export const HALFLING_HOLE = buildingMap.get('halfling_hole')!;
export const HALFLING_COTTAGE = buildingMap.get('halfling_cottage')!;
export const GNOME_WORKSHOP_HOME = buildingMap.get('gnome_workshop_home')!;
export const DWARF_STONEHOME = buildingMap.get('dwarf_stonehome')!;
export const DWARF_CLAN_HALL = buildingMap.get('dwarf_clan_hall')!;
export const GOBLIN_SHANTY = buildingMap.get('goblin_shanty')!;
export const GOBLIN_WARREN = buildingMap.get('goblin_warren')!;
export const HUMAN_HUT_TINY = buildingMap.get('human_hut_tiny')!;
export const HUMAN_COTTAGE_SMALL = buildingMap.get('human_cottage_small')!;
export const HUMAN_HOUSE_MEDIUM = buildingMap.get('human_house_medium')!;
export const HUMAN_HOUSE_LARGE = buildingMap.get('human_house_large')!;
export const HUMAN_MANOR = buildingMap.get('human_manor')!;
export const ORC_LONGHOUSE = buildingMap.get('orc_longhouse')!;
export const ORC_CHIEFTAIN_HUT = buildingMap.get('orc_chieftain_hut')!;
export const ELF_TREEHOUSE = buildingMap.get('elf_treehouse')!;
export const ELF_SPIRE_HOME = buildingMap.get('elf_spire_home')!;
export const ALIEN_DOME = buildingMap.get('alien_dome')!;
export const OGRE_CAVE_HOME = buildingMap.get('ogre_cave_home')!;
export const TROLL_BRIDGE_HOUSE = buildingMap.get('troll_bridge_house')!;
export const GIANT_CABIN = buildingMap.get('giant_cabin')!;
export const GIANT_CASTLE_KEEP = buildingMap.get('giant_castle_keep')!;
export const BLACKSMITH_FORGE = buildingMap.get('blacksmith_forge')!;
export const CARPENTER_WORKSHOP = buildingMap.get('carpenter_workshop')!;
export const WEAVER_SHOP = buildingMap.get('weaver_shop')!;
export const BAKERY = buildingMap.get('bakery')!;
export const TANNERY = buildingMap.get('tannery')!;
export const POTTERY_KILN = buildingMap.get('pottery_kiln')!;
export const BREWERY = buildingMap.get('brewery')!;
export const WINDMILL = buildingMap.get('windmill')!;
export const GENERAL_STORE = buildingMap.get('general_store')!;
export const TAVERN_SMALL = buildingMap.get('tavern_small')!;
export const TAVERN_LARGE = buildingMap.get('tavern_large')!;
export const TRADING_POST = buildingMap.get('trading_post')!;
export const GRAIN_SILO = buildingMap.get('grain_silo')!;
export const WAREHOUSE = buildingMap.get('warehouse')!;
export const COLD_STORAGE = buildingMap.get('cold_storage')!;
export const BARN = buildingMap.get('barn')!;
export const TOWN_HALL = buildingMap.get('town_hall')!;
export const TEMPLE_SMALL = buildingMap.get('temple_small')!;
export const TEMPLE_LARGE = buildingMap.get('temple_large')!;
export const WELL = buildingMap.get('well')!;
export const SCHOOL = buildingMap.get('school')!;
export const GUARD_POST = buildingMap.get('guard_post')!;
export const BARRACKS = buildingMap.get('barracks')!;
export const ARMORY = buildingMap.get('armory')!;
export const TRAINING_YARD = buildingMap.get('training_yard')!;
export const CHICKEN_COOP = buildingMap.get('chicken_coop')!;
export const STABLE = buildingMap.get('stable')!;
export const GREENHOUSE = buildingMap.get('greenhouse')!;
export const BEEHIVE_HOUSE = buildingMap.get('beehive_house')!;
export const LIBRARY = buildingMap.get('library')!;
export const ALCHEMY_LAB = buildingMap.get('alchemy_lab')!;
export const OBSERVATORY = buildingMap.get('observatory')!;

// Export arrays for convenience
export const ALL_BUILDINGS = buildings;

// Export by species category
export const TINY_SPECIES_BUILDINGS = buildings.filter(b => b.species === 'tiny');
export const SMALL_SPECIES_BUILDINGS = buildings.filter(b => b.species === 'small');
export const SHORT_SPECIES_BUILDINGS = buildings.filter(b => b.species === 'short');
export const MEDIUM_SPECIES_BUILDINGS = buildings.filter(b => b.species === 'medium');
export const TALL_SPECIES_BUILDINGS = buildings.filter(b => b.species === 'tall');
export const LARGE_SPECIES_BUILDINGS = buildings.filter(b => b.species === 'large');
export const HUGE_SPECIES_BUILDINGS = buildings.filter(b => b.species === 'huge');

// Export by category
export const RESIDENTIAL_BUILDINGS = buildings.filter(b => b.category === 'residential');
export const PRODUCTION_BUILDINGS = buildings.filter(b => b.category === 'production');
export const STORAGE_BUILDINGS = buildings.filter(b => b.category === 'storage');
export const COMMERCIAL_BUILDINGS = buildings.filter(b => b.category === 'commercial');
export const COMMUNITY_BUILDINGS = buildings.filter(b => b.category === 'community');
export const FARMING_BUILDINGS = buildings.filter(b => b.category === 'farming');
export const RESEARCH_BUILDINGS = buildings.filter(b => b.category === 'research');
export const MILITARY_BUILDINGS = buildings.filter(b => b.category === 'military');
