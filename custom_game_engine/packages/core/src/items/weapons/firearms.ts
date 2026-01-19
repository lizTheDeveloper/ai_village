/**
 * Firearm Weapon Item Definitions
 *
 * Includes pistols, rifles, shotguns, SMGs, and heavy weapons.
 * Part of the Weapons Expansion (weapons-expansion spec)
 *
 * NOTE: Weapon definitions have been migrated to JSON.
 * See: packages/core/src/data/weapons.json
 * Loader: packages/core/src/data/WeaponsLoader.ts
 */

import { type ItemDefinition } from '../ItemDefinition.js';
import { FIREARMS as ALL_FIREARMS_DATA, WeaponsLoader } from '../../data/WeaponsLoader.js';

/**
 * All firearms combined
 */
export const ALL_FIREARMS: ItemDefinition[] = ALL_FIREARMS_DATA;

/**
 * Sub-categories for backward compatibility
 */
const firearms = WeaponsLoader.getByCategory('firearms');

// Early firearms (black powder era)
export const BLACKPOWDER_FIREARMS: ItemDefinition[] = firearms.filter(w =>
  ['flintlock_pistol', 'musket', 'blunderbuss'].includes(w.id)
);

// Pistols (revolvers and semi-automatic)
export const PISTOL_WEAPONS: ItemDefinition[] = firearms.filter(w =>
  ['revolver', 'revolver_magnum', 'pistol_auto', 'pistol_heavy', 'machine_pistol'].includes(w.id)
);

// Rifles
export const RIFLE_WEAPONS: ItemDefinition[] = firearms.filter(w =>
  ['rifle_bolt', 'rifle_lever', 'rifle_semi', 'rifle_auto', 'rifle_sniper', 'rifle_anti_material'].includes(w.id)
);

// Shotguns
export const SHOTGUN_WEAPONS: ItemDefinition[] = firearms.filter(w =>
  ['shotgun_double', 'shotgun_pump', 'shotgun_semi', 'shotgun_auto', 'shotgun_sawed'].includes(w.id)
);

// Submachine guns
export const SMG_WEAPONS: ItemDefinition[] = firearms.filter(w =>
  ['smg_compact', 'smg', 'smg_tactical'].includes(w.id)
);

// Heavy weapons
export const HEAVY_WEAPONS: ItemDefinition[] = firearms.filter(w =>
  ['lmg', 'minigun', 'grenade_launcher', 'rocket_launcher'].includes(w.id)
);
