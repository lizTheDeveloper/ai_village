/**
 * Ammunition Item Definitions
 *
 * All ammo types for ranged weapons: arrows, bolts, bullets, shells, energy cells, plasma.
 * Part of the Weapons Expansion (weapons-expansion spec)
 */

import { defineItem, type ItemDefinition } from '../ItemDefinition.js';
import ammoData from '../../../data/ammunition.json';

/**
 * Arrow ammunition for bows
 */
export const ARROW_AMMO: ItemDefinition[] = ammoData.arrow_ammo.map((item: any) =>
  defineItem(item.id, item.name, item.category, item)
);

/**
 * Bolt ammunition for crossbows
 */
export const BOLT_AMMO: ItemDefinition[] = ammoData.bolt_ammo.map((item: any) =>
  defineItem(item.id, item.name, item.category, item)
);

/**
 * Sling ammunition
 */
export const SLING_AMMO: ItemDefinition[] = ammoData.sling_ammo.map((item: any) =>
  defineItem(item.id, item.name, item.category, item)
);

/**
 * Firearm ammunition - pistol caliber
 */
export const PISTOL_AMMO: ItemDefinition[] = ammoData.pistol_ammo.map((item: any) =>
  defineItem(item.id, item.name, item.category, item)
);

/**
 * Firearm ammunition - rifle caliber
 */
export const RIFLE_AMMO: ItemDefinition[] = ammoData.rifle_ammo.map((item: any) =>
  defineItem(item.id, item.name, item.category, item)
);

/**
 * Shotgun shells
 */
export const SHOTGUN_AMMO: ItemDefinition[] = ammoData.shotgun_ammo.map((item: any) =>
  defineItem(item.id, item.name, item.category, item)
);

/**
 * Energy weapon power cells
 */
export const ENERGY_AMMO: ItemDefinition[] = ammoData.energy_ammo.map((item: any) =>
  defineItem(item.id, item.name, item.category, item)
);

/**
 * Plasma weapon fuel
 */
export const PLASMA_AMMO: ItemDefinition[] = ammoData.plasma_ammo.map((item: any) =>
  defineItem(item.id, item.name, item.category, item)
);

/**
 * All ammo items combined
 */
export const ALL_AMMO_ITEMS: ItemDefinition[] = [
  ...ARROW_AMMO,
  ...BOLT_AMMO,
  ...SLING_AMMO,
  ...PISTOL_AMMO,
  ...RIFLE_AMMO,
  ...SHOTGUN_AMMO,
  ...ENERGY_AMMO,
  ...PLASMA_AMMO,
];
