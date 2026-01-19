/**
 * Magic Focus Weapon Item Definitions
 *
 * Includes staves, wands, orbs, and grimoires.
 * These weapons enhance spellcasting rather than dealing direct physical damage.
 * Part of the Weapons Expansion (weapons-expansion spec)
 *
 * NOTE: Weapon definitions have been migrated to JSON.
 * See: packages/core/src/data/weapons.json
 * Loader: packages/core/src/data/WeaponsLoader.ts
 */

import { type ItemDefinition } from '../ItemDefinition.js';
import { getMagicWeapons, WeaponsLoader } from '../../data/WeaponsLoader.js';

/**
 * All magic focus weapons combined
 */
export const ALL_MAGIC_WEAPONS: ItemDefinition[] = getMagicWeapons();

/**
 * Sub-categories for backward compatibility
 */
const magicWeapons = WeaponsLoader.getByCategory('magic');

// Staves - two-handed magic focus weapons
export const STAFF_WEAPONS: ItemDefinition[] = magicWeapons.filter(w =>
  ['oak_staff', 'ash_staff', 'arcane_staff', 'fire_staff', 'frost_staff', 'lightning_staff', 'staff_archmage', 'staff_elements'].includes(w.id)
);

// Wands - one-handed ranged magic weapons
export const WAND_WEAPONS: ItemDefinition[] = magicWeapons.filter(w =>
  ['wand_basic', 'wand_fire', 'wand_frost', 'wand_lightning', 'wand_death', 'wand_master'].includes(w.id)
);

// Orbs - off-hand magic focus items
export const ORB_WEAPONS: ItemDefinition[] = magicWeapons.filter(w =>
  ['crystal_orb', 'orb_fire', 'orb_shadow', 'orb_chaos', 'orb_souls'].includes(w.id)
);

// Grimoires - spell books
export const GRIMOIRE_WEAPONS: ItemDefinition[] = magicWeapons.filter(w =>
  ['grimoire_apprentice', 'grimoire_fire', 'grimoire_necromancy', 'grimoire_summoning', 'grimoire_archmage', 'grimoire_forbidden'].includes(w.id)
);
