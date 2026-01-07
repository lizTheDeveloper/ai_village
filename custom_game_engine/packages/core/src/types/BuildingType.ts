/**
 * BuildingType - Single-tile furniture and workstation entities
 *
 * NOTE: Multi-tile buildings (houses, barns, workshops, etc.) should use
 * the TileBasedBlueprint system instead. This enum is ONLY for:
 * - Single-tile furniture (beds, chests, campfires)
 * - Crafting stations (workbenches, forges, ovens)
 * - Utility stations (wells, market stalls)
 *
 * Can be used as both runtime values and types:
 * - Runtime: BuildingType.Workbench
 * - Type: buildingType: BuildingTypeString
 */

export enum BuildingType {
  // Storage Furniture
  StorageChest = 'storage-chest',
  StorageBox = 'storage-box',

  // Sleeping Furniture
  Bed = 'bed',
  Bedroll = 'bedroll',

  // Utility Stations
  Campfire = 'campfire',
  Well = 'well',
  MarketStall = 'market_stall',

  // Crafting Stations
  Workbench = 'workbench',
  Forge = 'forge',
  ButcheringTable = 'butchering_table',
  Loom = 'loom',
  Oven = 'oven',

  // Animal Housing Buildings
  ChickenCoop = 'chicken-coop',
  Kennel = 'kennel',
  Stable = 'stable',
  Apiary = 'apiary',
  Aquarium = 'aquarium',
  Barn = 'barn',

  // Special Buildings (some may be multi-tile, but need enum for backwards compatibility)
  University = 'university',
  TownHall = 'town-hall',
  CensusBureau = 'census-bureau',
  WeatherStation = 'weather-station',
  HealthClinic = 'health-clinic',
}

/**
 * BuildingTypeString - String union type for building types
 * Use this for component fields that need to accept string literals
 */
export type BuildingTypeString = `${BuildingType}`;
