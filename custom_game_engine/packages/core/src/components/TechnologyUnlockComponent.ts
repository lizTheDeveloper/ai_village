/**
 * TechnologyUnlockComponent - Global technology/building unlock tracker
 *
 * This singleton component tracks what buildings and technologies have been
 * "discovered" by the player's city. Once unlocked, other NPC cities can
 * start building them.
 *
 * Key mechanics:
 * - Player city builds first X → Unlocks X for all other cities
 * - Some buildings start unlocked (primitive: tent, campfire, etc.)
 * - Universities unlock research collaboration
 * - Internet unlocks global research sharing boost
 */

import type { Component } from '../ecs/Component.js';

export type TechnologyEra =
  | 'primitive'      // Tents, campfires, basic tools
  | 'agricultural'   // Farms, granaries, basic infrastructure
  | 'industrial'     // Forges, workshops, factories
  | 'modern'         // Publishing, newspapers, universities
  | 'information';   // TV stations, internet, global networks

export interface BuildingUnlock {
  buildingType: string; // BuildingType or custom component type
  unlockedTick: number;
  unlockedByCity?: string; // City ID that first built it
  era: TechnologyEra;
}

export interface TechnologyUnlock {
  technologyId: string;
  name: string;
  unlockedTick: number;
  unlockedBy?: string; // Entity ID that unlocked it
  effect: string; // Description of what this enables
}

export interface TechnologyUnlockComponent extends Component {
  type: 'technology_unlock';

  /** Map of buildingType → unlock info */
  unlockedBuildings: Map<string, BuildingUnlock>;

  /** Map of technologyId → unlock info */
  unlockedTechnologies: Map<string, TechnologyUnlock>;

  /** Player's city ID (the "first mover") */
  playerCityId: string | null;

  /** Is university research collaboration enabled? */
  universityCollaborationEnabled: boolean;

  /** Is internet research sharing enabled? */
  internetResearchBoostEnabled: boolean;

  /** Research multiplier from internet (default 1.0, boosted when internet enabled) */
  globalResearchMultiplier: number;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create the global technology unlock component (singleton).
 */
export function createTechnologyUnlockComponent(): TechnologyUnlockComponent {
  const unlocked = new Map<string, BuildingUnlock>();

  // Primitive era buildings start unlocked
  const primitiveBuildings = [
    'tent',
    'lean-to',
    'campfire',
    'bedroll',
    'bed',
    'storage-box',
    'storage-chest',
    'workbench',
  ];

  for (const buildingType of primitiveBuildings) {
    unlocked.set(buildingType, {
      buildingType,
      unlockedTick: 0,
      era: 'primitive',
    });
  }

  return {
    type: 'technology_unlock',
    version: 1,
    unlockedBuildings: unlocked,
    unlockedTechnologies: new Map(),
    playerCityId: null,
    universityCollaborationEnabled: false,
    internetResearchBoostEnabled: false,
    globalResearchMultiplier: 1.0,
  };
}

// ============================================================================
// BUILDING ERA DEFINITIONS
// ============================================================================

/**
 * Define which era each building type belongs to.
 */
export const BUILDING_ERAS: Record<string, TechnologyEra> = {
  // Primitive (always available)
  'tent': 'primitive',
  'lean-to': 'primitive',
  'campfire': 'primitive',
  'bedroll': 'primitive',
  'bed': 'primitive',
  'storage-box': 'primitive',
  'storage-chest': 'primitive',
  'workbench': 'primitive',

  // Agricultural
  'farm_shed': 'agricultural',
  'granary': 'agricultural',
  'well': 'agricultural',
  'barn': 'agricultural',
  'silo': 'agricultural',
  'mill': 'agricultural',

  // Industrial
  'forge': 'industrial',
  'workshop': 'industrial',
  'loom': 'industrial',
  'oven': 'industrial',
  'warehouse': 'industrial',
  'factory': 'industrial',
  'power_plant': 'industrial',

  // Modern (requires player unlock)
  'library': 'modern',
  'bookstore': 'modern',
  'publishing_company': 'modern',
  'newspaper': 'modern',
  'university': 'modern',
  'research_lab': 'modern',
  'hospital': 'modern',
  'school': 'modern',

  // Information age (requires player unlock)
  'tv_station': 'information',
  'radio_station': 'information',
  'internet_hub': 'information',
  'data_center': 'information',
  'telecommunication_tower': 'information',
};

/**
 * Get era for a building type.
 */
export function getBuildingEra(buildingType: string): TechnologyEra {
  return BUILDING_ERAS[buildingType] || 'modern'; // Default to modern if unknown
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a building type is unlocked globally.
 */
export function isBuildingUnlocked(
  unlock: TechnologyUnlockComponent,
  buildingType: string
): boolean {
  return unlock.unlockedBuildings.has(buildingType);
}

/**
 * Unlock a building type globally.
 */
export function unlockBuilding(
  unlock: TechnologyUnlockComponent,
  buildingType: string,
  tick: number,
  cityId?: string
): void {
  if (unlock.unlockedBuildings.has(buildingType)) {
    return; // Already unlocked
  }

  const era = getBuildingEra(buildingType);

  unlock.unlockedBuildings.set(buildingType, {
    buildingType,
    unlockedTick: tick,
    unlockedByCity: cityId,
    era,
  });

  // Special unlocks
  if (buildingType === 'university') {
    unlock.universityCollaborationEnabled = true;
    unlockTechnology(
      unlock,
      'university_collaboration',
      'University Research Collaboration',
      tick,
      'Universities can now share research findings',
      cityId
    );
  }

  if (buildingType === 'internet_hub') {
    unlock.internetResearchBoostEnabled = true;
    unlock.globalResearchMultiplier = 3.0; // 3x research speed
    unlockTechnology(
      unlock,
      'internet_research_sharing',
      'Internet Research Sharing',
      tick,
      'Research discoveries are now shared instantly across all universities',
      cityId
    );
  }
}

/**
 * Unlock a technology globally.
 */
export function unlockTechnology(
  unlock: TechnologyUnlockComponent,
  technologyId: string,
  name: string,
  tick: number,
  effect: string,
  unlockedBy?: string
): void {
  if (unlock.unlockedTechnologies.has(technologyId)) {
    return; // Already unlocked
  }

  unlock.unlockedTechnologies.set(technologyId, {
    technologyId,
    name,
    unlockedTick: tick,
    unlockedBy,
    effect,
  });
}

/**
 * Check if a technology is unlocked.
 */
export function isTechnologyUnlocked(
  unlock: TechnologyUnlockComponent,
  technologyId: string
): boolean {
  return unlock.unlockedTechnologies.has(technologyId);
}

/**
 * Set the player's city ID.
 */
export function setPlayerCity(
  unlock: TechnologyUnlockComponent,
  cityId: string
): void {
  unlock.playerCityId = cityId;
}

/**
 * Check if a city is the player's city.
 */
export function isPlayerCity(
  unlock: TechnologyUnlockComponent,
  cityId: string
): boolean {
  return unlock.playerCityId === cityId;
}

/**
 * Get all unlocked buildings in an era.
 */
export function getUnlockedBuildingsInEra(
  unlock: TechnologyUnlockComponent,
  era: TechnologyEra
): string[] {
  const buildings: string[] = [];
  for (const [buildingType, unlockInfo] of unlock.unlockedBuildings) {
    if (unlockInfo.era === era) {
      buildings.push(buildingType);
    }
  }
  return buildings;
}

/**
 * Get all buildings available to a city (based on unlocks).
 */
export function getAvailableBuildings(
  unlock: TechnologyUnlockComponent,
  cityId: string
): string[] {
  // Player city can build anything they've unlocked
  if (isPlayerCity(unlock, cityId)) {
    return Array.from(unlock.unlockedBuildings.keys());
  }

  // NPC cities can only build unlocked buildings
  return Array.from(unlock.unlockedBuildings.keys());
}

/**
 * Get current research multiplier for a city.
 */
export function getResearchMultiplier(
  unlock: TechnologyUnlockComponent,
  _cityId: string,
  hasUniversity: boolean
): number {
  let multiplier = 1.0;

  // Base research requires university
  if (!hasUniversity) {
    return 0; // No research without university
  }

  // University collaboration boost
  if (unlock.universityCollaborationEnabled) {
    multiplier *= 1.5; // 50% boost from collaboration
  }

  // Internet research sharing boost
  if (unlock.internetResearchBoostEnabled) {
    multiplier *= unlock.globalResearchMultiplier; // 3x boost from internet
  }

  return multiplier;
}
