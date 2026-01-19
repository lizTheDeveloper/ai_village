/**
 * Traditional Ranged Weapon Item Definitions
 *
 * Includes bows, crossbows, slings, and throwing weapons.
 * Part of the Weapons Expansion (weapons-expansion spec)
 *
 * NOTE: Weapon definitions have been migrated to JSON.
 * See: packages/core/src/data/weapons.json
 * Loader: packages/core/src/data/WeaponsLoader.ts
 */

import { type ItemDefinition } from '../ItemDefinition.js';
import { RANGED_WEAPONS as ALL_RANGED, WeaponsLoader } from '../../data/WeaponsLoader.js';

/**
 * All traditional ranged weapons combined
 */
export const ALL_TRADITIONAL_RANGED: ItemDefinition[] = ALL_RANGED;

/**
 * Sub-categories for backward compatibility
 */
const rangedWeapons = WeaponsLoader.getByCategory('ranged');

// Bows
export const BOW_WEAPONS: ItemDefinition[] = rangedWeapons.filter(w =>
  ['shortbow_wood', 'hunting_bow', 'longbow_yew', 'composite_bow', 'recurve_bow', 'warbow'].includes(w.id)
);

// Crossbows
export const CROSSBOW_WEAPONS: ItemDefinition[] = rangedWeapons.filter(w =>
  ['crossbow_light', 'crossbow_hunting', 'crossbow_heavy', 'repeating_crossbow', 'hand_crossbow'].includes(w.id)
);

// Slings
export const SLING_WEAPONS: ItemDefinition[] = rangedWeapons.filter(w =>
  ['sling_leather', 'staff_sling'].includes(w.id)
);

// Throwing weapons
export const THROWING_WEAPONS: ItemDefinition[] = rangedWeapons.filter(w =>
  ['throwing_knife', 'throwing_axe', 'javelin', 'javelin_iron', 'shuriken', 'bolas', 'chakram'].includes(w.id)
);
