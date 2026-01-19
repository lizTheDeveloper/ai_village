/**
 * Melee Weapon Item Definitions
 *
 * Includes primitive, medieval, and exotic melee weapons.
 * Part of the Weapons Expansion (weapons-expansion spec)
 *
 * NOTE: Weapon definitions have been migrated to JSON.
 * See: packages/core/src/data/weapons.json
 * Loader: packages/core/src/data/WeaponsLoader.ts
 */

import { type ItemDefinition } from '../ItemDefinition.js';
import { getMeleeWeapons, WeaponsLoader } from '../../data/WeaponsLoader.js';

/**
 * All melee weapons combined
 */
export const ALL_MELEE_WEAPONS: ItemDefinition[] = getMeleeWeapons();

/**
 * Sub-categories for backward compatibility
 */
const meleeWeapons = WeaponsLoader.getByCategory('melee');

// Primitive melee weapons (early game, no metalworking required)
export const PRIMITIVE_MELEE: ItemDefinition[] = meleeWeapons.filter(w =>
  ['club_wood', 'stone_axe_weapon', 'flint_spear', 'bone_knife'].includes(w.id)
);

// Medieval melee weapons (requires metalworking)
export const MEDIEVAL_MELEE: ItemDefinition[] = meleeWeapons.filter(w =>
  !['club_wood', 'stone_axe_weapon', 'flint_spear', 'bone_knife'].includes(w.id)
);
