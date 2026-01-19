/**
 * Spaceflight Item Definitions
 *
 * A Factorio-inspired production chain for spaceship construction.
 * Items are organized into tiers representing increasing complexity:
 *
 * Tier 0: Raw Resources - gathered from the environment
 * Tier 1: Basic Processed Materials - simple smelting/refining
 * Tier 2: Intermediate Components - combine basic materials
 * Tier 3: Advanced Components - combine intermediates
 * Tier 4: Exotic Materials - require special buildings/magic
 * Tier 5: Ship Components - structural parts and systems
 * Tier 6: Ship Modules - complex integrated assemblies
 *
 * Production chain follows the pattern:
 * raw_resource -> refined_material -> component -> advanced_component -> ship_part
 */

import { defineItem, type ItemDefinition } from './ItemDefinition.js';
import itemsData from '../../data/items/spaceflight.json';

function loadSpaceflightItems(): ItemDefinition[] {
  if (!Array.isArray(itemsData)) {
    throw new Error('Failed to load spaceflight items: data is not an array');
  }

  return itemsData.map((item) => {
    return defineItem(item.id, item.name, item.type as any, {
      weight: item.weight,
      stackSize: item.stackSize,
      baseValue: item.baseValue,
      rarity: item.rarity as any,
      craftedFrom: item.craftedFrom,
      researchRequired: item.researchRequired,
      clarketechTier: item.clarketechTier,
    });
  });
}

export const ALL_SPACEFLIGHT_ITEMS: ItemDefinition[] = loadSpaceflightItems();

// Individual item exports for backward compatibility
export const MANA_SHARD = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'mana_shard')!;
export const RARE_EARTH_ORE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'rare_earth_ore')!;
export const SILICON_SAND = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'silicon_sand')!;
export const RAW_CRYSTAL = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'raw_crystal')!;
export const VOID_ESSENCE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'void_essence')!;
export const TEMPORAL_DUST = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'temporal_dust')!;
export const EMOTIONAL_RESONANCE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'emotional_resonance')!;
export const SOUL_FRAGMENT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'soul_fragment')!;
export const STELLARITE_ORE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'stellarite_ore')!;
export const NEUTRONIUM_SHARD = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'neutronium_shard')!;

export const REFINED_MANA = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'refined_mana')!;
export const RARE_EARTH_COMPOUND = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'rare_earth_compound')!;
export const SILICON_WAFER = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'silicon_wafer')!;
export const CRYSTAL_LENS = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'crystal_lens')!;
export const STELLARITE_INGOT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'stellarite_ingot')!;
export const CONDENSED_VOID = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'condensed_void')!;
export const TEMPORAL_CRYSTAL = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'temporal_crystal')!;
export const EMOTIONAL_ESSENCE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'emotional_essence')!;

export const MANA_CRYSTAL = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'mana_crystal')!;
export const BASIC_CIRCUIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'basic_circuit')!;
export const ADVANCED_CIRCUIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'advanced_circuit')!;
export const RESONANCE_COIL = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'resonance_coil')!;
export const FOCUSING_ARRAY = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'focusing_array')!;
export const VOID_CAPACITOR = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'void_capacitor')!;
export const TEMPORAL_REGULATOR = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'temporal_regulator')!;
export const EMOTIONAL_AMPLIFIER = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'emotional_amplifier')!;
export const STELLARITE_PLATE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'stellarite_plate')!;

export const PROCESSING_UNIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'processing_unit')!;
export const QUANTUM_PROCESSOR = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'quantum_processor')!;
export const RESONANCE_CORE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'resonance_core')!;
export const EMOTIONAL_MATRIX = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'emotional_matrix')!;
export const VOID_ENGINE_COMPONENT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'void_engine_component')!;
export const LIFE_SUPPORT_MODULE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'life_support_module')!;
export const NEURAL_INTERFACE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'neural_interface')!;

export const SOUL_ANCHOR = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'soul_anchor')!;
export const TIMELINE_ANCHOR = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'timeline_anchor')!;
export const OBSERVATION_NULLIFIER = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'observation_nullifier')!;
export const PROBABILITY_LENS = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'probability_lens')!;
export const REALITY_THREAD = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'reality_thread')!;
export const COHERENCE_CRYSTAL = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'coherence_crystal')!;
export const NEUTRONIUM_CORE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'neutronium_core')!;

export const HULL_PLATING = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'hull_plating')!;
export const REINFORCED_HULL = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'reinforced_hull')!;
export const PROPULSION_UNIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'propulsion_unit')!;
export const NAVIGATION_ARRAY = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'navigation_array')!;
export const COMMUNICATION_RELAY = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'communication_relay')!;
export const POWER_CORE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'power_core')!;
export const SHIELD_GENERATOR = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'shield_generator')!;

export const HEART_CHAMBER_CORE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'heart_chamber_core')!;
export const EMOTION_THEATER_SYSTEM = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'emotion_theater_system')!;
export const MEMORY_HALL_ARCHIVE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'memory_hall_archive')!;
export const MEDITATION_CHAMBER_UNIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'meditation_chamber_unit')!;
export const VR_IMMERSION_POD = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'vr_immersion_pod')!;
export const GLEISNER_BODY_FRAME = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'gleisner_body_frame')!;
export const SVETZ_RETRIEVAL_ENGINE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'svetz_retrieval_engine')!;
export const PROBABILITY_DRIVE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'probability_drive')!;
export const TIMELINE_MERGER_CORE = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'timeline_merger_core')!;

export const WORLDSHIP_HULL_KIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'worldship_hull_kit')!;
export const THRESHOLD_HULL_KIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'threshold_hull_kit')!;
export const COURIER_HULL_KIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'courier_hull_kit')!;
export const BRAINSHIP_HULL_KIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'brainship_hull_kit')!;
export const STORYSHIP_HULL_KIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'storyship_hull_kit')!;
export const GLEISNER_HULL_KIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'gleisner_hull_kit')!;
export const SVETZ_HULL_KIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'svetz_hull_kit')!;
export const PROBABILITY_SCOUT_HULL_KIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'probability_scout_hull_kit')!;
export const TIMELINE_MERGER_HULL_KIT = ALL_SPACEFLIGHT_ITEMS.find((i) => i.id === 'timeline_merger_hull_kit')!;

// Legacy tier-based exports for backward compatibility
export const RAW_SPACEFLIGHT_RESOURCES: ItemDefinition[] = [
  MANA_SHARD,
  RARE_EARTH_ORE,
  SILICON_SAND,
  RAW_CRYSTAL,
  VOID_ESSENCE,
  TEMPORAL_DUST,
  EMOTIONAL_RESONANCE,
  SOUL_FRAGMENT,
  STELLARITE_ORE,
  NEUTRONIUM_SHARD,
];

export const PROCESSED_SPACEFLIGHT_MATERIALS: ItemDefinition[] = [
  REFINED_MANA,
  RARE_EARTH_COMPOUND,
  SILICON_WAFER,
  CRYSTAL_LENS,
  STELLARITE_INGOT,
  CONDENSED_VOID,
  TEMPORAL_CRYSTAL,
  EMOTIONAL_ESSENCE,
];

export const INTERMEDIATE_SPACEFLIGHT_COMPONENTS: ItemDefinition[] = [
  MANA_CRYSTAL,
  BASIC_CIRCUIT,
  ADVANCED_CIRCUIT,
  RESONANCE_COIL,
  FOCUSING_ARRAY,
  VOID_CAPACITOR,
  TEMPORAL_REGULATOR,
  EMOTIONAL_AMPLIFIER,
  STELLARITE_PLATE,
];

export const ADVANCED_SPACEFLIGHT_COMPONENTS: ItemDefinition[] = [
  PROCESSING_UNIT,
  QUANTUM_PROCESSOR,
  RESONANCE_CORE,
  EMOTIONAL_MATRIX,
  VOID_ENGINE_COMPONENT,
  LIFE_SUPPORT_MODULE,
  NEURAL_INTERFACE,
];

export const EXOTIC_SPACEFLIGHT_MATERIALS: ItemDefinition[] = [
  SOUL_ANCHOR,
  TIMELINE_ANCHOR,
  OBSERVATION_NULLIFIER,
  PROBABILITY_LENS,
  REALITY_THREAD,
  COHERENCE_CRYSTAL,
  NEUTRONIUM_CORE,
];

export const SHIP_STRUCTURAL_COMPONENTS: ItemDefinition[] = [
  HULL_PLATING,
  REINFORCED_HULL,
  PROPULSION_UNIT,
  NAVIGATION_ARRAY,
  COMMUNICATION_RELAY,
  POWER_CORE,
  SHIELD_GENERATOR,
];

export const SHIP_MODULES: ItemDefinition[] = [
  HEART_CHAMBER_CORE,
  EMOTION_THEATER_SYSTEM,
  MEMORY_HALL_ARCHIVE,
  MEDITATION_CHAMBER_UNIT,
  VR_IMMERSION_POD,
  GLEISNER_BODY_FRAME,
  SVETZ_RETRIEVAL_ENGINE,
  PROBABILITY_DRIVE,
  TIMELINE_MERGER_CORE,
];

export const SHIP_HULL_KITS: ItemDefinition[] = [
  WORLDSHIP_HULL_KIT,
  THRESHOLD_HULL_KIT,
  COURIER_HULL_KIT,
  BRAINSHIP_HULL_KIT,
  STORYSHIP_HULL_KIT,
  GLEISNER_HULL_KIT,
  SVETZ_HULL_KIT,
  PROBABILITY_SCOUT_HULL_KIT,
  TIMELINE_MERGER_HULL_KIT,
];

/**
 * Register all spaceflight items with the item registry.
 */
export function registerSpaceflightItems(registry: { registerAll: (items: ItemDefinition[]) => void }): void {
  registry.registerAll(ALL_SPACEFLIGHT_ITEMS);
}
