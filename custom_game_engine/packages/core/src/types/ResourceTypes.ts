/**
 * Centralized resource and plant type definitions
 */

export type ResourceType = 'food' | 'wood' | 'stone' | 'water' | 'fiber' | 'leaves' | 'iron_ore' | 'coal' | 'copper_ore' | 'gold_ore';

export type PlantRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export type HarvestResetStage = 'flowering' | 'fruiting' | 'vegetative';

export type SeedSourceType = 'wild' | 'cultivated' | 'traded' | 'generated';

export type SleepArchetype = 'earlyBird' | 'nightOwl' | 'lightSleeper' | 'heavySleeper';

export type MarketEventType = 'shortage' | 'surplus' | 'festival' | 'merchant_arrival';

export type StoragePriority = 'high' | 'medium' | 'low';
