/**
 * Creative & Unusual Weapon Definitions
 *
 * Unique, imaginative weapons that don't fit standard categories.
 * Includes living weapons, conceptual weapons, cursed items, and oddities.
 *
 * Part of the Weapons Expansion (weapons-expansion spec)
 *
 * NOTE: Weapon definitions have been migrated to JSON.
 * See: packages/core/src/data/weapons.json
 * Loader: packages/core/src/data/WeaponsLoader.ts
 */

import { type ItemDefinition } from '../ItemDefinition.js';
import { CREATIVE_WEAPONS, WeaponsLoader } from '../../data/WeaponsLoader.js';

/**
 * All creative weapons combined
 */
export const ALL_CREATIVE_WEAPONS: ItemDefinition[] = CREATIVE_WEAPONS;

/**
 * Sub-categories for backward compatibility
 * Note: JSON structure doesn't maintain strict subcategory separation,
 * but all creative weapons are available through ALL_CREATIVE_WEAPONS
 */

// Get weapons by subcategory (defined in JSON)
const creativeWeapons = WeaponsLoader.getByCategory('creative');

// Living weapons - first 7
export const LIVING_WEAPONS: ItemDefinition[] = creativeWeapons.filter(w =>
  ['bone_scythe', 'tentacle_whip', 'living_blade', 'tooth_dagger', 'swarm_orb', 'fungal_staff', 'blood_weapon'].includes(w.id)
);

// Conceptual weapons - next 7
export const CONCEPTUAL_WEAPONS: ItemDefinition[] = creativeWeapons.filter(w =>
  ['blade_of_unmaking', 'memory_dagger', 'paradox_bow', 'echo_hammer', 'silence_knife', 'dream_staff', 'gravity_mace'].includes(w.id)
);

// Musical weapons - next 5
export const MUSICAL_WEAPONS: ItemDefinition[] = creativeWeapons.filter(w =>
  ['war_horn', 'sonic_lute', 'death_whistle', 'thunder_drums', 'resonance_blade'].includes(w.id)
);

// Trick weapons - next 8
export const TRICK_WEAPONS: ItemDefinition[] = creativeWeapons.filter(w =>
  ['cane_sword', 'whip_sword', 'gunblade', 'sawcleaver', 'threaded_cane', 'blade_fan', 'chain_sickle', 'shield_blade'].includes(w.id)
);

// Elemental oddities - next 6
export const ELEMENTAL_ODDITIES: ItemDefinition[] = creativeWeapons.filter(w =>
  ['frost_breath_vial', 'storm_jar', 'magma_heart', 'wind_fan', 'quicksand_pouch', 'aurora_prism'].includes(w.id)
);

// Cursed weapons - next 5
export const CURSED_WEAPONS: ItemDefinition[] = creativeWeapons.filter(w =>
  ['betrayer_blade', 'hungry_axe', 'mirror_shield', 'puppet_strings', 'doom_bell'].includes(w.id)
);

// Weird science weapons - next 6
export const WEIRD_SCIENCE_WEAPONS: ItemDefinition[] = creativeWeapons.filter(w =>
  ['shrink_ray', 'tesla_glove', 'probability_gun', 'portal_gun', 'gravity_boots', 'freeze_ray'].includes(w.id)
);

// Improvised weapons - next 7
export const IMPROVISED_WEAPONS: ItemDefinition[] = creativeWeapons.filter(w =>
  ['frying_pan', 'broken_bottle', 'sock_of_coins', 'chair_leg', 'bag_of_rats', 'beehive', 'hot_soup'].includes(w.id)
);

// Mythological weapons - last 7
export const MYTHOLOGICAL_WEAPONS: ItemDefinition[] = creativeWeapons.filter(w =>
  ['gungnir', 'mjolnir', 'kusanagi', 'gae_bolg', 'ruyi_jingu_bang', 'excalibur', 'trident_of_poseidon'].includes(w.id)
);
