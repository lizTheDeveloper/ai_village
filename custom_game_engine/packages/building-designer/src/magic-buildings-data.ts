/**
 * Magic Buildings - JSON Data Loader
 *
 * This file loads magic building definitions from JSON instead of hardcoding them in TypeScript.
 * Buildings are now maintained in data/magic-buildings.json for easier editing.
 *
 * Migration completed: 42 buildings extracted from magic-buildings.ts
 */

import { VoxelBuildingDefinition, MagicParadigm, MagicalEffect } from './types';
import buildingsData from '../data/magic-buildings.json';

// Type assertion
const buildings = buildingsData as VoxelBuildingDefinition[];

// Create map for easy lookup
const buildingMap = new Map<string, VoxelBuildingDefinition>();
for (const building of buildings) {
  buildingMap.set(building.id, building);
}

// Export individual buildings (maintaining backwards compatibility)
export const MANA_WELL = buildingMap.get('mana_well')!;
export const LEYLINE_NEXUS = buildingMap.get('leyline_nexus')!;
export const SPELL_FOCUS_TOWER = buildingMap.get('spell_focus_tower')!;
export const SACRED_SHRINE = buildingMap.get('sacred_shrine')!;
export const TEMPLE_OF_MIRACLES = buildingMap.get('temple_of_miracles')!;
export const KAMI_SHRINE = buildingMap.get('kami_shrine')!;
export const TORII_GATE = buildingMap.get('torii_gate')!;
export const DREAM_SANCTUARY = buildingMap.get('dream_sanctuary')!;
export const NIGHTMARE_WARD = buildingMap.get('nightmare_ward')!;
export const HARMONY_HALL = buildingMap.get('harmony_hall')!;
export const ECHO_CHAMBER = buildingMap.get('echo_chamber')!;
export const RUNE_FORGE = buildingMap.get('rune_forge')!;
export const STANDING_STONES = buildingMap.get('standing_stones')!;
export const VITALITY_FONT = buildingMap.get('vitality_font')!;
export const PACT_CIRCLE = buildingMap.get('pact_circle')!;
export const TRUE_NAME_VAULT = buildingMap.get('true_name_vault')!;
export const METAL_RESERVE = buildingMap.get('metal_reserve')!;
export const HARMONY_GARDEN = buildingMap.get('harmony_garden')!;
export const FIRE_FOUNT = buildingMap.get('fire_fount')!;
export const WATER_FOUNT = buildingMap.get('water_fount')!;
export const DIMENSIONAL_ANCHOR = buildingMap.get('dimensional_anchor')!;
export const CHAOS_NEXUS = buildingMap.get('chaos_nexus')!;
export const PASSION_CHAMBER = buildingMap.get('passion_chamber')!;
export const CATHARSIS_POOL = buildingMap.get('catharsis_pool')!;
export const SYMPATHY_LINK_CHAMBER = buildingMap.get('sympathy_link_chamber')!;
export const DEBT_LEDGER_HALL = buildingMap.get('debt_ledger_hall')!;
export const BUREAU_OF_FORMS = buildingMap.get('bureau_of_forms')!;
export const FORTUNES_WHEEL = buildingMap.get('fortunes_wheel')!;
export const VOID_CHAPEL = buildingMap.get('void_chapel')!;
export const ESCHER_OBSERVATORY = buildingMap.get('escher_observatory')!;
export const MEMORY_ARCHIVE = buildingMap.get('memory_archive')!;
export const ARCADE_SANCTUM = buildingMap.get('arcade_sanctum')!;
export const MAKERS_SANCTUM = buildingMap.get('makers_sanctum')!;
export const MERCHANTS_EXCHANGE = buildingMap.get('merchants_exchange')!;
export const MOON_TEMPLE = buildingMap.get('moon_temple')!;
export const SOLSTICE_CIRCLE = buildingMap.get('solstice_circle')!;
export const DAEMON_SANCTUM = buildingMap.get('daemon_sanctum')!;
export const ABSORPTION_CHAMBER = buildingMap.get('absorption_chamber')!;
export const TALENT_REGISTRY = buildingMap.get('talent_registry')!;
export const STORY_CIRCLE = buildingMap.get('story_circle')!;
export const LIBRARY_OF_BABEL = buildingMap.get('library_of_babel')!;
export const AWAKENING_WORKSHOP = buildingMap.get('awakening_workshop')!;
export const CRIMSON_ALTAR = buildingMap.get('crimson_altar')!;

// Export collections
export const ALL_MAGIC_BUILDINGS = buildings;

export const CORE_MAGIC_BUILDINGS = buildings.filter(b =>
  ['mana_well', 'leyline_nexus', 'spell_focus_tower'].includes(b.id)
);

export const DIVINE_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('divine')
);

export const SPIRIT_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('shinto')
);

export const DREAM_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('dream')
);

export const SONG_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('song')
);

export const RUNE_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('rune')
);

export const SPECIALTY_BUILDINGS = buildings.filter(b =>
  ['vitality_font', 'pact_circle', 'true_name_vault', 'metal_reserve'].includes(b.id)
);

export const ELEMENTAL_BUILDINGS = buildings.filter(b =>
  ['harmony_garden', 'fire_fount', 'water_fount'].includes(b.id)
);

export const DIMENSIONAL_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('dimensional')
);

export const EMOTIONAL_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('emotional')
);

export const SYMPATHY_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('sympathy')
);

export const DEBT_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('debt')
);

export const BUREAUCRATIC_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('bureaucratic')
);

export const LUCK_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('luck')
);

export const SILENCE_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('silence')
);

export const PARADOX_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('paradox')
);

export const ECHO_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('echo')
);

export const GAME_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('game')
);

export const CRAFT_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('craft')
);

export const COMMERCE_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('commerce')
);

export const LUNAR_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('lunar')
);

export const SEASONAL_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('seasonal')
);

export const DAEMON_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('daemon')
);

export const CONSUMPTION_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('consumption')
);

export const TALENT_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('talent')
);

export const NARRATIVE_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('narrative')
);

export const LITERARY_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('literary')
);

export const BREATH_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('breath')
);

export const BLOOD_BUILDINGS = buildings.filter(b =>
  b.paradigmAffinity?.includes('blood')
);

/**
 * Get buildings that support a specific paradigm
 */
export function getBuildingsForParadigm(paradigm: MagicParadigm): VoxelBuildingDefinition[] {
  return buildings.filter(b => b.paradigmAffinity?.includes(paradigm));
}

/**
 * Get buildings with a specific magical effect type
 */
export function getBuildingsWithEffect(effectType: MagicalEffect['type']): VoxelBuildingDefinition[] {
  return buildings.filter(b =>
    b.magicalEffects?.some(e => e.type === effectType)
  );
}
