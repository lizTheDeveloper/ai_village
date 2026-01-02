/**
 * ClothingTrait - Social and thermal properties for clothing
 *
 * Clothing provides minimal defense but significant social and environmental benefits.
 * Integrates with Temperature System and Social System.
 *
 * Part of Phase 36: Equipment System
 */

/** Social class associated with clothing */
export type SocialClass =
  | 'peasant'      // Work clothes, simple
  | 'common'       // Everyday wear
  | 'merchant'     // Nice but practical
  | 'noble'        // Fancy, decorative
  | 'royal';       // Extravagant, impractical

/**
 * ClothingTrait adds social and environmental properties to armor.
 * Use alongside ArmorTrait for complete clothing definition.
 *
 * Example usage:
 * ```typescript
 * const silkRobe: ItemTraits = {
 *   armor: {
 *     defense: 0,
 *     armorClass: 'clothing',
 *     target: { bodyPartType: 'torso' },
 *     weight: 0.8,
 *     durability: 0.8,
 *     movementPenalty: 0.0,
 *   },
 *   clothing: {
 *     formalityLevel: 9,
 *     socialClass: 'noble',
 *     thermalInsulation: 0.6,
 *     breathability: 0.9,
 *     waterResistance: 0.0,
 *     color: 'crimson',
 *     pattern: 'embroidered',
 *     condition: 1.0,
 *   }
 * };
 * ```
 */
export interface ClothingTrait {
  // ============================================================================
  // Social Properties
  // ============================================================================

  /** Formality level (0-10, 0=rags, 10=royal robes) */
  formalityLevel: number;

  /** Cultural style identifier */
  culturalStyle?: string;  // e.g., "medieval_european", "eastern", "tribal"

  /** Social class - affects NPC reactions */
  socialClass?: SocialClass;

  // ============================================================================
  // Thermal Properties (integrates with Temperature System)
  // ============================================================================

  /** Cold resistance (0-1, higher = warmer) */
  thermalInsulation: number;

  /** Heat resistance (0-1, higher = cooler in hot weather) */
  breathability: number;

  /** Rain/wet protection (0-1, higher = better waterproofing) */
  waterResistance: number;

  // ============================================================================
  // Appearance
  // ============================================================================

  /** Clothing color */
  color?: string;

  /** Visual pattern */
  pattern?: string;  // "striped", "checkered", "embroidered", "plain"

  /** Clothing condition (0-1, affects appearance and social value) */
  condition: number;

  /** Embellishments or decorations */
  embellishments?: string[];  // ["gold trim", "gemstone buttons", "fur collar"]
}

/**
 * Calculate social modifier from clothing.
 * Higher formality = better reactions from nobles, worse from peasants.
 */
export function getSocialModifier(
  clothing: ClothingTrait,
  targetSocialClass: SocialClass
): number {
  const classHierarchy: Record<SocialClass, number> = {
    peasant: 0,
    common: 1,
    merchant: 2,
    noble: 3,
    royal: 4,
  };

  const wearerClass = classHierarchy[clothing.socialClass ?? 'common'];
  const targetClass = classHierarchy[targetSocialClass];

  // Same class or close? Positive modifier
  const classDiff = Math.abs(wearerClass - targetClass);

  if (classDiff === 0) return 0.2;  // +20% to interactions
  if (classDiff === 1) return 0.1;  // +10% to interactions
  if (classDiff === 2) return 0.0;  // Neutral
  return -0.1 * classDiff;  // -10% per class difference
}

/**
 * Calculate temperature modifier from clothing.
 * Positive = warmer, negative = cooler
 */
export function getTemperatureModifier(
  clothing: ClothingTrait,
  ambientTemperature: number
): number {
  if (ambientTemperature < 10) {
    // Cold weather - insulation helps
    return clothing.thermalInsulation * 5; // +5°C per 1.0 insulation
  } else if (ambientTemperature > 30) {
    // Hot weather - breathability helps
    return -(clothing.breathability * 5); // -5°C per 1.0 breathability
  }

  return 0; // Comfortable range
}

/**
 * Check if clothing provides rain protection.
 */
export function isWaterproof(clothing: ClothingTrait): boolean {
  return clothing.waterResistance >= 0.7;
}

/**
 * Calculate clothing degradation from weather/use.
 */
export function degradeClothing(
  clothing: ClothingTrait,
  weatherDamage: number = 0.01
): ClothingTrait {
  return {
    ...clothing,
    condition: Math.max(0, clothing.condition - weatherDamage),
  };
}

/**
 * Check if clothing is too worn/damaged.
 */
export function isClothingWorn(clothing: ClothingTrait): boolean {
  return clothing.condition < 0.3;  // Below 30% = rags
}
