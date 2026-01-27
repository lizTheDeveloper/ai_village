/**
 * Crafting Buildings - JSON Data Loader
 *
 * This file loads crafting building definitions from JSON instead of hardcoding them in TypeScript.
 * Buildings are now maintained in data/crafting-buildings.json for easier editing.
 *
 * Migration completed: 27 buildings extracted from crafting-buildings.ts
 */

import { VoxelBuildingDefinition } from './types';
import buildingsData from '../data/crafting-buildings.json';

// Type assertion
const buildings = buildingsData as VoxelBuildingDefinition[];

// Create map for easy lookup
const buildingMap = new Map<string, VoxelBuildingDefinition>();
for (const building of buildings) {
  buildingMap.set(building.id, building);
}

// Export individual buildings (maintaining backwards compatibility)
export const CAMPFIRE_BASIC = buildingMap.get('campfire_basic')!;
export const WORKBENCH_BASIC = buildingMap.get('workbench_basic')!;
export const STORAGE_CHEST_HUT = buildingMap.get('storage_chest_hut')!;
export const FORGE_SMALL = buildingMap.get('forge_small')!;
export const FORGE_LARGE = buildingMap.get('forge_large')!;
export const LOOM_WORKSHOP = buildingMap.get('loom_workshop')!;
export const OVEN_BAKERY = buildingMap.get('oven_bakery')!;
export const WAREHOUSE_LARGE = buildingMap.get('warehouse_large')!;
export const WORKSHOP_ADVANCED = buildingMap.get('workshop_advanced')!;
export const ALCHEMY_LAB_BUILDING = buildingMap.get('alchemy_lab_building')!;
export const WINDMILL_BUILDING = buildingMap.get('windmill_building')!;
export const WATER_WHEEL_BUILDING = buildingMap.get('water_wheel_building')!;
export const GREENHOUSE_BUILDING = buildingMap.get('greenhouse_building')!;
export const LIBRARY_BUILDING = buildingMap.get('library_building')!;
export const SCRIPTORIUM = buildingMap.get('scriptorium')!;
export const TRADING_POST_BUILDING = buildingMap.get('trading_post_building')!;
export const BANK_BUILDING = buildingMap.get('bank_building')!;
export const AUTO_FARM_BUILDING = buildingMap.get('auto_farm_building')!;
export const BREEDING_FACILITY = buildingMap.get('breeding_facility')!;
export const INVENTORS_HALL = buildingMap.get('inventors_hall')!;
export const ARCANE_TOWER_BUILDING = buildingMap.get('arcane_tower_building')!;
export const GENE_LAB_BUILDING = buildingMap.get('gene_lab_building')!;
export const GRAND_HALL_BUILDING = buildingMap.get('grand_hall_building')!;
export const MONUMENT = buildingMap.get('monument')!;
export const GRILL_STATION = buildingMap.get('grill_station')!;
export const STEW_KITCHEN = buildingMap.get('stew_kitchen')!;
export const SMOKEHOUSE = buildingMap.get('smokehouse')!;
export const GRANARY_BUILDING = buildingMap.get('granary_building')!;

// Export collections
export const ALL_CRAFTING_BUILDINGS = buildings;

export const TIER_1_CRAFTING = buildings.filter(b => b.tier === 1);
export const TIER_2_CRAFTING = buildings.filter(b => b.tier === 2);
export const TIER_3_CRAFTING = buildings.filter(b => b.tier === 3);
export const TIER_4_CRAFTING = buildings.filter(b => b.tier === 4);
export const TIER_5_CRAFTING = buildings.filter(b => b.tier === 5);

// Research requirements (from original file)
export const RESEARCH_BUILDING_REQUIREMENTS = {
  tier1: {
    buildings: ['campfire', 'workbench', 'storage_chest'],
    research: null as string | null,
  },
  tier2: {
    forge: { research: 'metallurgy_i', prereq: 'crafting_i' },
    loom: { research: 'textiles_i', prereq: 'crafting_i' },
    oven: { research: 'cuisine_i', prereq: 'agriculture_i' },
    warehouse: { research: 'construction_ii', prereq: 'construction_i' },
    library: { research: null as string | null, prereq: 'building skill 3' },
  },
  tier3: {
    workshop: { research: 'construction_ii', prereq: 'construction_i' },
    alchemy_lab: { research: 'alchemy_i', prereq: 'nature_i + cuisine_i' },
    windmill: { research: 'machinery_i', prereq: 'construction_ii + metallurgy_i' },
    water_wheel: { research: 'machinery_i', prereq: 'construction_ii + metallurgy_i' },
    greenhouse: { research: 'agriculture_iii', prereq: 'agriculture_ii + library' },
  },
  tier4: {
    trading_post: { research: 'society_ii', prereq: 'society_i + construction_ii' },
    bank: { research: 'society_ii', prereq: 'society_i + construction_ii' },
    auto_farm: { research: 'machinery_ii', prereq: 'machinery_i + metallurgy_ii' },
    breeding_facility: { research: 'genetics_ii', prereq: 'genetics_i + agriculture_iii' },
  },
  tier5: {
    inventors_hall: { research: 'experimental_research', prereq: 'alchemy_i + metallurgy_ii + agriculture_iii + library' },
    arcane_tower: { research: 'arcane_studies', prereq: 'alchemy_i + nature_i + library' },
    gene_lab: { research: 'genetic_engineering', prereq: 'genetics_ii + alchemy_i + experimental_research + inventors_hall' },
    grand_hall: { research: 'master_architecture', prereq: 'construction_ii + machinery_ii' },
  },
};
