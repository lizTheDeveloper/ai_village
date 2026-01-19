/**
 * Material Effects Loader
 * Loads material effects from JSON data file
 */

import { Material, MaterialEffectProperties } from './types.js';
import materialEffectsData from '../data/material-effects.json' assert { type: 'json' };

/**
 * Complete material effect definitions loaded from JSON.
 * All 205 materials with their properties.
 */
export const MATERIAL_EFFECTS: Record<Material, MaterialEffectProperties> =
  materialEffectsData as Record<Material, MaterialEffectProperties>;

/**
 * Get effect properties for a material.
 */
export function getMaterialEffects(material: Material): MaterialEffectProperties {
  const effects = MATERIAL_EFFECTS[material];
  if (!effects) {
    throw new Error(`Unknown material: ${material}`);
  }
  return effects;
}

/**
 * Check if a material exists in the database.
 */
export function isMaterial(name: string): name is Material {
  return name in MATERIAL_EFFECTS;
}

/**
 * Get all available materials.
 */
export function getAllMaterials(): Material[] {
  return Object.keys(MATERIAL_EFFECTS) as Material[];
}

/**
 * Get materials by category (based on properties).
 */
export function getMaterialsByCategory(category: {
  element?: string;
  alive?: boolean;
  glows?: boolean;
  edible?: boolean;
  minDurability?: number;
  maxWeirdness?: number;
}): Material[] {
  return getAllMaterials().filter(material => {
    const props = MATERIAL_EFFECTS[material];

    if (category.element && props.element !== category.element) return false;
    if (category.alive !== undefined && props.alive !== category.alive) return false;
    if (category.glows !== undefined && props.glows !== category.glows) return false;
    if (category.edible !== undefined && props.edible !== category.edible) return false;
    if (category.minDurability && props.durability < category.minDurability) return false;
    if (category.maxWeirdness && props.weirdness > category.maxWeirdness) return false;

    return true;
  });
}
