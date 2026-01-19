/**
 * Material Effects System
 *
 * Every material in the game has inherent magical and practical effects.
 * Buildings, items, and other constructs derive their properties from
 * the materials they're made of.
 *
 * This system provides:
 * - Unified material definitions (standard + exotic) - LOADED FROM JSON
 * - Magical/effect properties for each material
 * - Calculation functions for buildings and items
 * - Paradigm affinities based on material nature
 */

import { MagicParadigm, FengShuiElement, MagicalEffect, Material, MaterialEffectProperties, MaterialSpecialEffect } from './types.js';
import { MATERIAL_EFFECTS } from './material-effects-loader.js';

// Re-export Material, MaterialEffectProperties, MaterialSpecialEffect, and MATERIAL_EFFECTS for convenience
export type { Material, MaterialEffectProperties, MaterialSpecialEffect } from './types.js';
export { MATERIAL_EFFECTS };

// =============================================================================
// EFFECT CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate the total magical effects for a building based on its materials.
 */
export function calculateBuildingEffects(
  materials: { wall: Material; floor: Material; door: Material },
  size: { width: number; height: number; floors?: number },
): MagicalEffect[] {
  const effects: MagicalEffect[] = [];
  const floors = size.floors ?? 1;
  const area = size.width * size.height * floors;

  // Get material properties
  const wallProps = MATERIAL_EFFECTS[materials.wall];
  const floorProps = MATERIAL_EFFECTS[materials.floor];
  const doorProps = MATERIAL_EFFECTS[materials.door];

  // Walls contribute most (60%), floor (30%), door (10%)
  const wallWeight = 0.6;
  const floorWeight = 0.3;
  const doorWeight = 0.1;

  // Calculate weighted averages
  const avgManaRegen = (
    wallProps.manaRegen * wallWeight +
    floorProps.manaRegen * floorWeight +
    doorProps.manaRegen * doorWeight
  );

  const avgSpellPower = (
    wallProps.spellPower * wallWeight +
    floorProps.spellPower * floorWeight +
    doorProps.spellPower * doorWeight
  );

  const avgProtection = (
    wallProps.protection * wallWeight +
    floorProps.protection * floorWeight +
    doorProps.protection * doorWeight
  );

  const avgMood = (
    wallProps.moodModifier * wallWeight +
    floorProps.moodModifier * floorWeight +
    doorProps.moodModifier * doorWeight
  );

  // Scale by building size (larger = more effect, but diminishing returns)
  const sizeMultiplier = Math.log10(area + 10) / 2;
  const radius = Math.floor(Math.sqrt(area) * 0.5);

  // Add mana regeneration if significant
  if (avgManaRegen > 1.1) {
    effects.push({
      type: 'mana_regen',
      magnitude: (avgManaRegen - 1.0) * 2 * sizeMultiplier,
      radius: radius,
    });
  }

  // Add spell power if significant
  if (avgSpellPower > 5) {
    effects.push({
      type: 'spell_power',
      magnitude: avgSpellPower * sizeMultiplier,
      radius: radius,
    });
  }

  // Add protection if significant
  if (avgProtection > 5) {
    effects.push({
      type: 'protection',
      magnitude: avgProtection * sizeMultiplier,
      radius: Math.floor(radius * 0.7),
    });
  }

  // Add mood aura if significant (positive or negative)
  if (Math.abs(avgMood) > 5) {
    effects.push({
      type: 'mood_aura',
      magnitude: avgMood * sizeMultiplier,
      radius: radius,
    });
  }

  // Combine elemental effects
  const elements: FengShuiElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];
  for (const element of elements) {
    const strength = [wallProps, floorProps, doorProps]
      .filter(p => p.element === element)
      .reduce((sum, p) => sum + p.elementalStrength, 0) / 3;

    if (strength > 20) {
      effects.push({
        type: 'elemental_attune',
        magnitude: strength * sizeMultiplier * 0.5,
        radius: radius,
        element: element,
      });
    }
  }

  // Add paradigm bonuses
  const paradigmTotals: Partial<Record<MagicParadigm, number>> = {};
  for (const props of [wallProps, floorProps, doorProps]) {
    for (const [paradigm, bonus] of Object.entries(props.paradigmAffinities)) {
      const bonusNum = typeof bonus === 'number' ? bonus : 0;
      paradigmTotals[paradigm as MagicParadigm] =
        (paradigmTotals[paradigm as MagicParadigm] ?? 0) + bonusNum;
    }
  }

  for (const [paradigm, total] of Object.entries(paradigmTotals)) {
    if (total && total > 10) {
      effects.push({
        type: 'paradigm_bonus',
        magnitude: total * sizeMultiplier * 0.3,
        radius: radius,
        paradigm: paradigm as MagicParadigm,
      });
    }
  }

  // Add special effects from materials
  for (const props of [wallProps, floorProps, doorProps]) {
    for (const special of props.specialEffects) {
      // Convert material special effects to building magical effects
      const effectType = mapSpecialToMagicalEffect(special.type);
      if (effectType) {
        effects.push({
          type: effectType,
          magnitude: special.magnitude * sizeMultiplier,
          radius: special.radius ?? radius,
        });
      }
    }
  }

  return effects;
}

/**
 * Map material special effects to MagicalEffect types
 */
function mapSpecialToMagicalEffect(
  specialType: MaterialSpecialEffect['type']
): MagicalEffect['type'] | null {
  const mapping: Partial<Record<MaterialSpecialEffect['type'], MagicalEffect['type']>> = {
    'healing_aura': 'mana_regen', // Approximate
    'dream_induction': 'dream_stability',
    'nightmare_ward': 'dream_stability',
    'spirit_attraction': 'spirit_attraction',
    'spirit_repulsion': 'protection',
    'dimensional_stability': 'corruption_resist',
    'dimensional_flux': 'paradigm_bonus',
    'corruption_resistance': 'corruption_resist',
    'metal_burning_boost': 'paradigm_bonus',
    'name_protection': 'name_protection',
    'pact_binding': 'pact_leverage',
    'blood_potency': 'blood_efficiency',
    'luck_modifier': 'luck_modifier',
  };

  return mapping[specialType] ?? null;
}

/**
 * Get the dominant paradigm affinity for a material combination
 */
export function getDominantParadigm(
  materials: { wall: Material; floor: Material; door: Material }
): MagicParadigm | null {
  const totals: Partial<Record<MagicParadigm, number>> = {};

  for (const mat of [materials.wall, materials.floor, materials.door]) {
    const props = MATERIAL_EFFECTS[mat];
    for (const [paradigm, bonus] of Object.entries(props.paradigmAffinities)) {
      const bonusValue = typeof bonus === 'number' ? bonus : 0;
      if (bonusValue > 0) {
        totals[paradigm as MagicParadigm] =
          (totals[paradigm as MagicParadigm] ?? 0) + bonusValue;
      }
    }
  }

  let maxParadigm: MagicParadigm | null = null;
  let maxValue = 0;

  for (const [paradigm, total] of Object.entries(totals)) {
    if (total && total > maxValue) {
      maxValue = total;
      maxParadigm = paradigm as MagicParadigm;
    }
  }

  return maxParadigm;
}

/**
 * Get the overall mood modifier for a material combination
 */
export function getMoodModifier(
  materials: { wall: Material; floor: Material; door: Material }
): number {
  const wallProps = MATERIAL_EFFECTS[materials.wall];
  const floorProps = MATERIAL_EFFECTS[materials.floor];
  const doorProps = MATERIAL_EFFECTS[materials.door];

  return (
    wallProps.moodModifier * 0.6 +
    floorProps.moodModifier * 0.3 +
    doorProps.moodModifier * 0.1
  );
}

/**
 * Get the dominant atmosphere for a material combination
 */
export function getAtmosphere(
  materials: { wall: Material; floor: Material; door: Material }
): MaterialEffectProperties['atmosphere'] {
  // Wall material dominates atmosphere
  return MATERIAL_EFFECTS[materials.wall].atmosphere;
}

/**
 * Check if a material combination is stable
 */
export function isStableCombination(
  materials: { wall: Material; floor: Material; door: Material }
): { stable: boolean; issues: string[] } {
  const issues: string[] = [];

  const wallProps = MATERIAL_EFFECTS[materials.wall];
  const floorProps = MATERIAL_EFFECTS[materials.floor];
  const doorProps = MATERIAL_EFFECTS[materials.door];

  // Check for conflicting elements
  const elements = [wallProps.element, floorProps.element, doorProps.element].filter(Boolean);
  if (elements.includes('fire') && elements.includes('water')) {
    issues.push('Fire and water elements conflict, reducing stability');
  }
  if (elements.includes('wood') && elements.includes('metal')) {
    issues.push('Wood and metal elements conflict (metal cuts wood)');
  }

  // Check for high maintenance combinations
  const avgMaintenance = (wallProps.maintenance + floorProps.maintenance + doorProps.maintenance) / 3;
  if (avgMaintenance > 70) {
    issues.push('High maintenance materials require constant upkeep');
  }

  // Check for intangible walls with tangible doors
  if (wallProps.intangible && !doorProps.intangible) {
    issues.push('Intangible walls with solid doors creates paradox');
  }

  // Check weirdness levels
  const avgWeirdness = (wallProps.weirdness + floorProps.weirdness + doorProps.weirdness) / 3;
  if (avgWeirdness > 80) {
    issues.push('Extreme weirdness may cause reality instability');
  }

  return {
    stable: issues.length === 0,
    issues,
  };
}

/**
 * Suggest complementary materials for a given primary material
 */
export function suggestComplementaryMaterials(primary: Material): {
  wall: Material[];
  floor: Material[];
  door: Material[];
} {
  const props = MATERIAL_EFFECTS[primary];

  // Find materials with compatible elements
  const compatibleElements: FengShuiElement[] = [];
  if (props.element) {
    // Feng shui productive cycle
    const productiveCycle: Record<FengShuiElement, FengShuiElement> = {
      wood: 'fire',
      fire: 'earth',
      earth: 'metal',
      metal: 'water',
      water: 'wood',
    };
    compatibleElements.push(props.element, productiveCycle[props.element]);
  }

  const suggestions = {
    wall: [] as Material[],
    floor: [] as Material[],
    door: [] as Material[],
  };

  for (const [mat, matProps] of Object.entries(MATERIAL_EFFECTS)) {
    const material = mat as Material;
    if (material === primary) continue;

    // Check compatibility
    const isCompatible =
      (!props.element || !matProps.element || compatibleElements.includes(matProps.element)) &&
      Math.abs(props.weirdness - matProps.weirdness) < 40;

    if (isCompatible) {
      if (matProps.durability > 40) suggestions.wall.push(material);
      if (!matProps.intangible) suggestions.floor.push(material);
      suggestions.door.push(material);
    }
  }

  // Limit suggestions
  return {
    wall: suggestions.wall.slice(0, 5),
    floor: suggestions.floor.slice(0, 5),
    door: suggestions.door.slice(0, 5),
  };
}
