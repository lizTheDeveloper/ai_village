/**
 * BuildingType - Centralized enum for all building types
 *
 * Can be used as both runtime values and types:
 * - Runtime: BuildingType.Workbench
 * - Type: buildingType: BuildingTypeString
 *
 * Building IDs follow kebab-case or snake_case naming convention from blueprints
 */

export enum BuildingType {
  // Tier 1 Basic Buildings
  Workbench = 'workbench',
  StorageChest = 'storage-chest',
  Campfire = 'campfire',
  Tent = 'tent',
  Bed = 'bed',
  Bedroll = 'bedroll',
  Well = 'well',
  LeanTo = 'lean-to',
  StorageBox = 'storage-box',

  // Tier 2 Crafting Stations
  Forge = 'forge',
  ButcheringTable = 'butchering_table',
  FarmShed = 'farm_shed',
  MarketStall = 'market_stall',
  Windmill = 'windmill',

  // Tier 3 Advanced Stations
  Workshop = 'workshop',
  Barn = 'barn',

  // Animal Housing Buildings (Tier 2.5)
  ChickenCoop = 'chicken-coop',
  Kennel = 'kennel',
  Stable = 'stable',
  Apiary = 'apiary',
  Aquarium = 'aquarium',

  // Example/Decoration Buildings
  GardenFence = 'garden_fence',
  Library = 'library',
  AutoFarm = 'auto_farm',

  // Research Unlocked Buildings (Tier 1)
  SmallGarden = 'small_garden',
  Loom = 'loom',
  Oven = 'oven',

  // Research Unlocked Buildings (Tier 2)
  IrrigationChannel = 'irrigation_channel',
  Warehouse = 'warehouse',
  Monument = 'monument',
  AlchemyLab = 'alchemy_lab',
  WaterWheel = 'water_wheel',

  // Research Unlocked Buildings (Tier 3)
  Greenhouse = 'greenhouse',
  GrandHall = 'grand_hall',
  ConveyorSystem = 'conveyor_system',

  // Research Unlocked Buildings (Tier 4)
  TradingPost = 'trading_post',
  Bank = 'bank',

  // Research Unlocked Buildings (Tier 5)
  ArcaneTower = 'arcane_tower',
  InventorsHall = 'inventors_hall',

  // Governance Buildings
  TownHall = 'town-hall',
  CensusBureau = 'census-bureau',
  Granary = 'granary',
  WeatherStation = 'weather-station',
  HealthClinic = 'health-clinic',
  MeetingHall = 'meeting-hall',
  Watchtower = 'watchtower',
  LaborGuild = 'labor-guild',
  Archive = 'archive',
}

/**
 * BuildingTypeString - String union type for building types
 * Use this for component fields that need to accept string literals
 */
export type BuildingTypeString = `${BuildingType}`;
