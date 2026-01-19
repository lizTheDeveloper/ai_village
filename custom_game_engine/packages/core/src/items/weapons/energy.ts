/**
 * Energy Weapon Item Definitions
 *
 * Includes lasers, plasma weapons, particle weapons, ion weapons, and beam weapons.
 * Part of the Weapons Expansion (weapons-expansion spec)
 *
 * NOTE: These are Clarketech-tier weapons requiring advanced research.
 *
 * NOTE: Weapon definitions have been migrated to JSON.
 * See: packages/core/src/data/weapons.json
 * Loader: packages/core/src/data/WeaponsLoader.ts
 */

import { type ItemDefinition } from '../ItemDefinition.js';
import { getEnergyWeapons, WeaponsLoader } from '../../data/WeaponsLoader.js';

/**
 * All energy weapons combined
 */
export const ALL_ENERGY_WEAPONS: ItemDefinition[] = getEnergyWeapons();

/**
 * Sub-categories for backward compatibility
 */
const energyWeapons = WeaponsLoader.getByCategory('energy');

// Laser weapons - precise, efficient, burning damage
export const LASER_WEAPONS: ItemDefinition[] = energyWeapons.filter(w =>
  ['laser_pistol', 'laser_carbine', 'laser_rifle', 'laser_sniper', 'laser_cannon'].includes(w.id)
);

// Plasma weapons - explosive, area damage, devastating
export const PLASMA_WEAPONS: ItemDefinition[] = energyWeapons.filter(w =>
  ['plasma_pistol', 'plasma_rifle', 'plasma_repeater', 'plasma_cannon', 'plasma_caster'].includes(w.id)
);

// Particle weapons - ignore armor, subatomic damage
export const PARTICLE_WEAPONS: ItemDefinition[] = energyWeapons.filter(w =>
  ['particle_pistol', 'particle_rifle', 'particle_accelerator'].includes(w.id)
);

// Ion weapons - disrupts electronics and magic
export const ION_WEAPONS: ItemDefinition[] = energyWeapons.filter(w =>
  ['ion_pistol', 'ion_rifle', 'ion_cannon'].includes(w.id)
);

// Beam weapons - continuous damage
export const BEAM_WEAPONS: ItemDefinition[] = energyWeapons.filter(w =>
  ['beam_rifle', 'plasma_beam', 'particle_beam'].includes(w.id)
);
