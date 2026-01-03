/**
 * Cross-realm phone items
 *
 * High-tier Clarketech communication devices that combine magical enchantments
 * with advanced technology to enable real-time communication across universes.
 */

import type { ItemDefinition } from './ItemDefinition.js';

/**
 * Basic Inter-Universe Phone
 */
export const BASIC_CROSS_REALM_PHONE: ItemDefinition = {
  id: 'basic_cross_realm_phone',
  displayName: 'Inter-Universe Phone (Basic)',
  category: 'tool',
  weight: 0.5,
  stackSize: 1,
  isEdible: false,
  isStorable: true,
  isGatherable: false,
  baseValue: 5000,
  rarity: 'rare',
};

/**
 * Advanced Cross-Universe Phone
 */
export const ADVANCED_CROSS_REALM_PHONE: ItemDefinition = {
  id: 'advanced_cross_realm_phone',
  displayName: 'Cross-Universe Phone (Advanced)',
  category: 'tool',
  weight: 0.6,
  stackSize: 1,
  isEdible: false,
  isStorable: true,
  isGatherable: false,
  baseValue: 50000,
  rarity: 'epic',
};

/**
 * Transcendent Multiverse Phone
 */
export const TRANSCENDENT_MULTIVERSE_PHONE: ItemDefinition = {
  id: 'transcendent_multiverse_phone',
  displayName: 'Transcendent Multiverse Phone',
  category: 'tool',
  weight: 0.3,
  stackSize: 1,
  isEdible: false,
  isStorable: true,
  isGatherable: false,
  baseValue: 500000,
  rarity: 'legendary',
};

/**
 * Phone Enchantment Runes
 */

export const RANGE_BOOST_RUNE: ItemDefinition = {
  id: 'range_boost_rune',
  displayName: 'Range Boost Rune',
  category: 'material',
  weight: 0.01,
  stackSize: 20,
  isEdible: false,
  isStorable: true,
  isGatherable: false,
  baseValue: 1000,
  rarity: 'uncommon',
};

export const CLARITY_RUNE: ItemDefinition = {
  id: 'clarity_rune',
  displayName: 'Clarity Rune',
  category: 'material',
  weight: 0.01,
  stackSize: 20,
  isEdible: false,
  isStorable: true,
  isGatherable: false,
  baseValue: 800,
  rarity: 'uncommon',
};

export const PRIVACY_RUNE: ItemDefinition = {
  id: 'privacy_rune',
  displayName: 'Privacy Rune',
  category: 'material',
  weight: 0.01,
  stackSize: 20,
  isEdible: false,
  isStorable: true,
  isGatherable: false,
  baseValue: 2000,
  rarity: 'rare',
};

export const RECORDING_RUNE: ItemDefinition = {
  id: 'recording_rune',
  displayName: 'Recording Rune',
  category: 'material',
  weight: 0.01,
  stackSize: 20,
  isEdible: false,
  isStorable: true,
  isGatherable: false,
  baseValue: 1500,
  rarity: 'rare',
};

export const EMERGENCY_BEACON_RUNE: ItemDefinition = {
  id: 'emergency_beacon_rune',
  displayName: 'Emergency Beacon Rune',
  category: 'material',
  weight: 0.01,
  stackSize: 10,
  isEdible: false,
  isStorable: true,
  isGatherable: false,
  baseValue: 5000,
  rarity: 'epic',
};

export const MULTI_PARTY_RUNE: ItemDefinition = {
  id: 'multi_party_rune',
  displayName: 'Multi-Party Conference Rune',
  category: 'material',
  weight: 0.01,
  stackSize: 10,
  isEdible: false,
  isStorable: true,
  isGatherable: false,
  baseValue: 3000,
  rarity: 'rare',
};

/**
 * Charging Station
 */

export const MANA_CHARGING_STATION: ItemDefinition = {
  id: 'mana_charging_station',
  displayName: 'Mana Charging Station',
  category: 'tool',
  weight: 50,
  stackSize: 1,
  isEdible: false,
  isStorable: true,
  isGatherable: false,
  baseValue: 10000,
  rarity: 'rare',
};

/**
 * All cross-realm phone items
 */
export const CROSS_REALM_PHONE_ITEMS = [
  BASIC_CROSS_REALM_PHONE,
  ADVANCED_CROSS_REALM_PHONE,
  TRANSCENDENT_MULTIVERSE_PHONE,
  RANGE_BOOST_RUNE,
  CLARITY_RUNE,
  PRIVACY_RUNE,
  RECORDING_RUNE,
  EMERGENCY_BEACON_RUNE,
  MULTI_PARTY_RUNE,
  MANA_CHARGING_STATION,
];
