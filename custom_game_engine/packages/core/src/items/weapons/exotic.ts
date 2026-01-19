/**
 * Exotic Weapon Item Definitions
 *
 * Includes energy blades (lightsaber-style), force weapons, psionic weapons,
 * soul weapons, radiant weapons, and void weapons.
 * Part of the Weapons Expansion (weapons-expansion spec)
 *
 * NOTE: These are high-tier/transcendent weapons requiring special research or divine favor.
 *
 * NOTE: Weapon definitions have been migrated to JSON.
 * See: packages/core/src/data/weapons.json
 * Loader: packages/core/src/data/WeaponsLoader.ts
 */

import { type ItemDefinition } from '../ItemDefinition.js';
import { EXOTIC_WEAPONS as ALL_EXOTIC, WeaponsLoader } from '../../data/WeaponsLoader.js';

/**
 * All exotic weapons combined
 */
export const ALL_EXOTIC_WEAPONS: ItemDefinition[] = ALL_EXOTIC;

/**
 * Sub-categories for backward compatibility
 */
const exoticWeapons = WeaponsLoader.getByCategory('exotic');

// Energy blades - lightsaber-style plasma melee weapons
export const ENERGY_BLADE_WEAPONS: ItemDefinition[] = exoticWeapons.filter(w =>
  ['energy_blade', 'energy_blade_dual', 'energy_blade_great', 'energy_dagger'].includes(w.id)
);

// Force weapons - telekinetic/kinetic damage
export const FORCE_WEAPONS: ItemDefinition[] = exoticWeapons.filter(w =>
  ['force_hammer', 'force_lance', 'force_gauntlets', 'force_blade'].includes(w.id)
);

// Psionic weapons - mental/psychic damage
export const PSIONIC_WEAPONS: ItemDefinition[] = exoticWeapons.filter(w =>
  ['psionic_blade', 'mind_lash', 'thought_spike'].includes(w.id)
);

// Soul weapons - necrotic/death damage, lifesteal
export const SOUL_WEAPONS: ItemDefinition[] = exoticWeapons.filter(w =>
  ['soul_reaver', 'death_scythe', 'soul_drinker', 'wraith_blade'].includes(w.id)
);

// Radiant weapons - holy/divine damage
export const RADIANT_WEAPONS: ItemDefinition[] = exoticWeapons.filter(w =>
  ['blessed_blade', 'holy_avenger', 'dawn_mace', 'celestial_spear'].includes(w.id)
);

// Void weapons - entropy/antimatter damage
export const VOID_WEAPONS: ItemDefinition[] = exoticWeapons.filter(w =>
  ['void_dagger', 'entropy_blade', 'oblivion_hammer', 'null_lance'].includes(w.id)
);
