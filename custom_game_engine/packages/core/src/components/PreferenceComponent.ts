/**
 * PreferenceComponent - Tracks agent preferences across all domains
 *
 * Each agent develops unique preferences based on:
 * - Innate preferences (personality-based)
 * - Learned preferences from experiences
 * - Cultural/community influences
 *
 * Covers: food flavors, clothing materials, armor, weapons, metals, plants, etc.
 */

import type { Component } from '../ecs/Component.js';
import type { FlavorType } from '../types/ItemTypes.js';

// Re-export for backwards compatibility
export type { FlavorType };

/**
 * All possible flavor types.
 */
export const ALL_FLAVORS: readonly FlavorType[] = [
  'sweet',
  'savory',
  'spicy',
  'bitter',
  'sour',
  'umami',
] as const;

// ============================================
// MATERIAL PREFERENCE CATEGORIES
// ============================================

/**
 * Clothing material options
 */
export const CLOTHING_MATERIALS = [
  'cotton', 'linen', 'wool', 'silk', 'leather', 'fur', 'velvet', 'canvas',
] as const;
export type ClothingMaterial = typeof CLOTHING_MATERIALS[number];

/**
 * Armor material options
 */
export const ARMOR_MATERIALS = [
  'leather', 'padded', 'chainmail', 'iron', 'steel', 'bronze', 'plate',
] as const;
export type ArmorMaterial = typeof ARMOR_MATERIALS[number];

/**
 * Weapon type options
 */
export const WEAPON_TYPES = [
  'sword', 'axe', 'mace', 'spear', 'bow', 'crossbow', 'dagger', 'staff', 'hammer',
] as const;
export type WeaponType = typeof WEAPON_TYPES[number];

/**
 * Metal options
 */
export const METALS = [
  'iron', 'copper', 'bronze', 'steel', 'gold', 'silver', 'titanium',
] as const;
export type MetalType = typeof METALS[number];

/**
 * Wood type options
 */
export const WOOD_TYPES = [
  'oak', 'pine', 'birch', 'maple', 'cherry', 'walnut', 'cedar', 'ash',
] as const;
export type WoodType = typeof WOOD_TYPES[number];

/**
 * Plant/flower options
 */
export const PLANTS = [
  'rose', 'lavender', 'sunflower', 'tulip', 'daisy', 'lily', 'orchid',
  'mint', 'basil', 'rosemary', 'thyme', 'sage',
] as const;
export type PlantType = typeof PLANTS[number];

/**
 * Gemstone options
 */
export const GEMSTONES = [
  'ruby', 'emerald', 'sapphire', 'diamond', 'amethyst', 'topaz', 'opal', 'pearl',
] as const;
export type GemstoneType = typeof GEMSTONES[number];

/**
 * Color preferences
 */
export const COLORS = [
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'black', 'white',
  'brown', 'pink', 'gold', 'silver', 'teal', 'crimson',
] as const;
export type ColorType = typeof COLORS[number];

/**
 * A preference entry with favorite and disliked
 */
export interface CategoryPreference<T extends string> {
  /** Most preferred item in this category */
  favorite: T;
  /** Most disliked item in this category */
  disliked: T;
  /** Affinity scores for each item (-1 to 1) */
  affinities: Partial<Record<T, number>>;
}

/**
 * All material/item preferences
 */
export interface MaterialPreferences {
  clothing: CategoryPreference<ClothingMaterial>;
  armor: CategoryPreference<ArmorMaterial>;
  weapon: CategoryPreference<WeaponType>;
  metal: CategoryPreference<MetalType>;
  wood: CategoryPreference<WoodType>;
  plant: CategoryPreference<PlantType>;
  gemstone: CategoryPreference<GemstoneType>;
  color: CategoryPreference<ColorType>;
}

/**
 * A food memory entry tracking an eating experience.
 */
export interface FoodMemory {
  /** The food item that was eaten */
  foodId: string;

  /** Whether the experience was positive, neutral, or negative */
  experience: 'positive' | 'neutral' | 'negative';

  /** Context of the meal (e.g., "shared with friends", "first time trying") */
  context: string;

  /** Emotional impact (-1 to 1, how much it affected mood) */
  emotionalImpact: number;

  /** When this happened (game tick) */
  timestamp: number;
}

/**
 * Flavor preference values for each flavor type.
 * Values range from -1 (hate) to 1 (love).
 */
export interface FlavorPreferences {
  sweet: number;
  savory: number;
  spicy: number;
  bitter: number;
  sour: number;
  umami: number;
}

/**
 * PreferenceComponent tracks an agent's preferences across all domains.
 */
export interface PreferenceComponent extends Component {
  type: 'preference';

  /**
   * Flavor preferences from -1 (hate) to 1 (love).
   * These are initially set based on personality and evolve with experience.
   */
  flavorPreferences: FlavorPreferences;

  /**
   * Material and item preferences (clothing, weapons, colors, etc.)
   */
  materialPreferences: MaterialPreferences;

  /**
   * History of food experiences that shape preferences.
   * Limited to recent entries (circular buffer).
   */
  foodMemories: FoodMemory[];

  /**
   * Foods or categories the agent avoids.
   * Can develop from repeated negative experiences.
   */
  avoids: string[];

  /**
   * Counter for each food eaten - helps identify favorites over time.
   */
  foodFrequency: Record<string, number>;

  /**
   * Last time preferences were updated (game tick).
   */
  lastUpdate: number;
}

/**
 * Create a new PreferenceComponent with randomized initial preferences.
 * Personality traits can influence starting preferences.
 */
export function createPreferenceComponent(
  personalityFactors?: {
    openness?: number; // Higher = more accepting of new/exotic flavors
    neuroticism?: number; // Higher = more sensitive to bitter/sour
    extraversion?: number; // Higher = bolder color/style preferences
    conscientiousness?: number; // Higher = practical material preferences
  }
): PreferenceComponent {
  const openness = personalityFactors?.openness ?? 0.5;
  const neuroticism = personalityFactors?.neuroticism ?? 0.5;
  const extraversion = personalityFactors?.extraversion ?? 0.5;
  const conscientiousness = personalityFactors?.conscientiousness ?? 0.5;

  // Generate flavor preferences based on personality
  // Higher openness = more positive toward unusual flavors
  // Higher neuroticism = more aversion to bitter/sour

  return {
    type: 'preference',
    version: 1,
    flavorPreferences: {
      sweet: randomPreference(0.3, 0.3), // Most people like sweet
      savory: randomPreference(0.2, 0.3), // Generally liked
      spicy: randomPreference(-0.1 + openness * 0.4, 0.4), // Openness helps
      bitter: randomPreference(-0.2 - neuroticism * 0.2, 0.3), // Often disliked
      sour: randomPreference(0, 0.3), // Neutral baseline
      umami: randomPreference(0.2, 0.2), // Generally liked
    },
    materialPreferences: generateMaterialPreferences({
      openness,
      extraversion,
      conscientiousness,
    }),
    foodMemories: [],
    avoids: [],
    foodFrequency: {},
    lastUpdate: 0,
  };
}

/**
 * Generate a random preference value with a bias and variance.
 */
function randomPreference(bias: number, variance: number): number {
  const value = bias + (Math.random() - 0.5) * variance * 2;
  return Math.max(-1, Math.min(1, value));
}

/**
 * Generate random material preferences based on personality.
 */
function generateMaterialPreferences(factors: {
  openness: number;
  extraversion: number;
  conscientiousness: number;
}): MaterialPreferences {
  return {
    clothing: generateCategoryPreference(CLOTHING_MATERIALS, factors),
    armor: generateCategoryPreference(ARMOR_MATERIALS, factors),
    weapon: generateCategoryPreference(WEAPON_TYPES, factors),
    metal: generateCategoryPreference(METALS, factors),
    wood: generateCategoryPreference(WOOD_TYPES, factors),
    plant: generateCategoryPreference(PLANTS, factors),
    gemstone: generateCategoryPreference(GEMSTONES, factors),
    color: generateColorPreference(factors),
  };
}

/**
 * Generate a category preference with random favorite and disliked.
 */
function generateCategoryPreference<T extends string>(
  options: readonly T[],
  _factors: { openness: number; extraversion: number; conscientiousness: number }
): CategoryPreference<T> {
  // Pick random favorite and disliked (must be different)
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  const favorite = shuffled[0] as T;
  const disliked = shuffled[shuffled.length - 1] as T;

  // Generate affinities for each option
  const affinities: Partial<Record<T, number>> = {};
  for (const option of options) {
    if (option === favorite) {
      affinities[option] = 0.7 + Math.random() * 0.3; // 0.7 to 1.0
    } else if (option === disliked) {
      affinities[option] = -0.7 - Math.random() * 0.3; // -1.0 to -0.7
    } else {
      affinities[option] = (Math.random() - 0.5) * 0.8; // -0.4 to 0.4
    }
  }

  return { favorite, disliked, affinities };
}

/**
 * Generate color preferences influenced by personality.
 * Extraverts prefer bolder colors, introverts prefer muted.
 */
function generateColorPreference(factors: {
  openness: number;
  extraversion: number;
  conscientiousness: number;
}): CategoryPreference<ColorType> {
  // Bold colors for extraverts
  const boldColors: ColorType[] = ['red', 'purple', 'orange', 'gold', 'crimson'];
  const mutedColors: ColorType[] = ['brown', 'black', 'white', 'silver', 'teal'];
  const neutralColors: ColorType[] = ['blue', 'green', 'yellow', 'pink'];

  // Higher extraversion = prefer bold, lower = prefer muted
  let favoritePool: ColorType[];
  let dislikedPool: ColorType[];

  if (factors.extraversion > 0.6) {
    favoritePool = boldColors;
    dislikedPool = mutedColors;
  } else if (factors.extraversion < 0.4) {
    favoritePool = mutedColors;
    dislikedPool = boldColors;
  } else {
    favoritePool = neutralColors;
    dislikedPool = [...boldColors, ...mutedColors];
  }

  const favorite = favoritePool[Math.floor(Math.random() * favoritePool.length)] as ColorType;
  const disliked = dislikedPool[Math.floor(Math.random() * dislikedPool.length)] as ColorType;

  // Generate affinities
  const affinities: Partial<Record<ColorType, number>> = {};
  for (const color of COLORS) {
    if (color === favorite) {
      affinities[color] = 0.7 + Math.random() * 0.3;
    } else if (color === disliked) {
      affinities[color] = -0.7 - Math.random() * 0.3;
    } else if (boldColors.includes(color)) {
      affinities[color] = (factors.extraversion - 0.5) * 0.6 + (Math.random() - 0.5) * 0.3;
    } else if (mutedColors.includes(color)) {
      affinities[color] = (0.5 - factors.extraversion) * 0.6 + (Math.random() - 0.5) * 0.3;
    } else {
      affinities[color] = (Math.random() - 0.5) * 0.5;
    }
  }

  return { favorite, disliked, affinities };
}

/**
 * Record a food experience and update preferences.
 */
export function recordFoodExperience(
  component: PreferenceComponent,
  foodId: string,
  experience: 'positive' | 'neutral' | 'negative',
  context: string,
  emotionalImpact: number,
  timestamp: number
): PreferenceComponent {
  const memory: FoodMemory = {
    foodId,
    experience,
    context,
    emotionalImpact: Math.max(-1, Math.min(1, emotionalImpact)),
    timestamp,
  };

  // Add to memories (keep last 50)
  const newMemories = [...component.foodMemories.slice(-49), memory];

  // Update food frequency
  const newFrequency = {
    ...component.foodFrequency,
    [foodId]: (component.foodFrequency[foodId] || 0) + 1,
  };

  // Check if food should be added to avoids (3+ negative experiences)
  let newAvoids = [...component.avoids];
  if (experience === 'negative' && !newAvoids.includes(foodId)) {
    const negativeCount = newMemories.filter(
      (m) => m.foodId === foodId && m.experience === 'negative'
    ).length;
    if (negativeCount >= 3) {
      newAvoids = [...newAvoids, foodId];
    }
  }

  return {
    ...component,
    foodMemories: newMemories,
    foodFrequency: newFrequency,
    avoids: newAvoids,
    lastUpdate: timestamp,
  };
}

/**
 * Update flavor preferences based on a food experience.
 * Eating a food with certain flavors adjusts preference for those flavors.
 */
export function updateFlavorPreferences(
  component: PreferenceComponent,
  flavors: FlavorType[],
  experience: 'positive' | 'neutral' | 'negative',
  intensity: number = 0.1
): PreferenceComponent {
  if (flavors.length === 0 || experience === 'neutral') {
    return component;
  }

  const delta = experience === 'positive' ? intensity : -intensity;
  const newPreferences = { ...component.flavorPreferences };

  for (const flavor of flavors) {
    const current = newPreferences[flavor];
    newPreferences[flavor] = Math.max(-1, Math.min(1, current + delta));
  }

  return {
    ...component,
    flavorPreferences: newPreferences,
  };
}

/**
 * Calculate how much an agent would enjoy a food based on its flavors.
 * Returns a value from -1 (would hate it) to 1 (would love it).
 */
export function calculateFlavorAffinity(
  component: PreferenceComponent,
  flavors: FlavorType[]
): number {
  if (flavors.length === 0) {
    return 0; // No flavor data, neutral
  }

  let totalAffinity = 0;
  for (const flavor of flavors) {
    totalAffinity += component.flavorPreferences[flavor];
  }

  return totalAffinity / flavors.length;
}

/**
 * Check if an agent would avoid a specific food.
 */
export function wouldAvoidFood(
  component: PreferenceComponent,
  foodId: string
): boolean {
  return component.avoids.includes(foodId);
}

/**
 * Get the top N most frequently eaten foods.
 */
export function getMostEatenFoods(
  component: PreferenceComponent,
  count: number = 5
): Array<{ foodId: string; count: number }> {
  return Object.entries(component.foodFrequency)
    .map(([foodId, count]) => ({ foodId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, count);
}

/**
 * Get a text description of flavor preferences for LLM context.
 */
export function getPreferenceDescription(component: PreferenceComponent): string {
  const likes: string[] = [];
  const dislikes: string[] = [];

  for (const [flavor, value] of Object.entries(component.flavorPreferences)) {
    if (value > 0.3) {
      likes.push(flavor);
    } else if (value < -0.3) {
      dislikes.push(flavor);
    }
  }

  const parts: string[] = [];
  if (likes.length > 0) {
    parts.push(`likes ${likes.join(', ')} flavors`);
  }
  if (dislikes.length > 0) {
    parts.push(`dislikes ${dislikes.join(', ')} flavors`);
  }
  if (component.avoids.length > 0) {
    parts.push(`avoids eating: ${component.avoids.slice(0, 3).join(', ')}`);
  }

  return parts.length > 0 ? parts.join('; ') : 'has no strong food preferences';
}

/**
 * Get a complete description of all preferences for LLM context.
 * Useful for gods/telepaths who can read minds.
 */
export function getFullPreferenceDescription(component: PreferenceComponent): string {
  const mp = component.materialPreferences;

  const parts: string[] = [];

  // Flavor preferences
  parts.push(`Food: ${getPreferenceDescription(component)}`);

  // Material preferences
  parts.push(`Favorite color: ${mp.color.favorite}, hates ${mp.color.disliked}`);
  parts.push(`Clothing: loves ${mp.clothing.favorite}, hates ${mp.clothing.disliked}`);
  parts.push(`Weapons: prefers ${mp.weapon.favorite}, dislikes ${mp.weapon.disliked}`);
  parts.push(`Armor: prefers ${mp.armor.favorite}, dislikes ${mp.armor.disliked}`);
  parts.push(`Metals: loves ${mp.metal.favorite}, hates ${mp.metal.disliked}`);
  parts.push(`Wood: prefers ${mp.wood.favorite}, dislikes ${mp.wood.disliked}`);
  parts.push(`Plants/flowers: loves ${mp.plant.favorite}, dislikes ${mp.plant.disliked}`);
  parts.push(`Gemstones: loves ${mp.gemstone.favorite}, dislikes ${mp.gemstone.disliked}`);

  return parts.join('\n');
}

/**
 * Get preferences relevant for a specific craft type.
 * Used by the recipe system to suggest materials.
 */
export function getPreferencesForCraft(
  component: PreferenceComponent,
  craftType: 'food' | 'clothing' | 'armor' | 'weapon' | 'tool' | 'decoration' | 'potion'
): { favorites: string[]; dislikes: string[] } {
  const mp = component.materialPreferences;

  switch (craftType) {
    case 'food':
      return {
        favorites: Object.entries(component.flavorPreferences)
          .filter(([, v]) => v > 0.3)
          .map(([k]) => k),
        dislikes: Object.entries(component.flavorPreferences)
          .filter(([, v]) => v < -0.3)
          .map(([k]) => k),
      };

    case 'clothing':
      return {
        favorites: [mp.clothing.favorite, mp.color.favorite],
        dislikes: [mp.clothing.disliked, mp.color.disliked],
      };

    case 'armor':
      return {
        favorites: [mp.armor.favorite, mp.metal.favorite],
        dislikes: [mp.armor.disliked, mp.metal.disliked],
      };

    case 'weapon':
      return {
        favorites: [mp.weapon.favorite, mp.metal.favorite, mp.wood.favorite],
        dislikes: [mp.weapon.disliked, mp.metal.disliked],
      };

    case 'tool':
      return {
        favorites: [mp.wood.favorite, mp.metal.favorite],
        dislikes: [mp.wood.disliked, mp.metal.disliked],
      };

    case 'decoration':
      return {
        favorites: [mp.color.favorite, mp.gemstone.favorite, mp.plant.favorite],
        dislikes: [mp.color.disliked, mp.gemstone.disliked],
      };

    case 'potion':
      return {
        favorites: [mp.plant.favorite],
        dislikes: [mp.plant.disliked],
      };

    default:
      return { favorites: [], dislikes: [] };
  }
}

/**
 * Check if an agent would like a gift based on its properties.
 * Returns affinity score from -1 (hate) to 1 (love).
 */
export function calculateGiftAffinity(
  component: PreferenceComponent,
  giftProperties: {
    material?: string;
    color?: string;
    woodType?: string;
    metalType?: string;
    gemstone?: string;
    plant?: string;
  }
): number {
  const mp = component.materialPreferences;
  let totalAffinity = 0;
  let count = 0;

  // Check each property against preferences
  if (giftProperties.material) {
    const material = giftProperties.material.toLowerCase();
    // Check clothing materials
    if (CLOTHING_MATERIALS.includes(material as ClothingMaterial)) {
      totalAffinity += mp.clothing.affinities[material as ClothingMaterial] ?? 0;
      count++;
    }
    // Check armor materials
    if (ARMOR_MATERIALS.includes(material as ArmorMaterial)) {
      totalAffinity += mp.armor.affinities[material as ArmorMaterial] ?? 0;
      count++;
    }
  }

  if (giftProperties.color) {
    const color = giftProperties.color.toLowerCase() as ColorType;
    if (mp.color.affinities[color] !== undefined) {
      totalAffinity += mp.color.affinities[color] ?? 0;
      count++;
    }
  }

  if (giftProperties.woodType) {
    const wood = giftProperties.woodType.toLowerCase() as WoodType;
    if (mp.wood.affinities[wood] !== undefined) {
      totalAffinity += mp.wood.affinities[wood] ?? 0;
      count++;
    }
  }

  if (giftProperties.metalType) {
    const metal = giftProperties.metalType.toLowerCase() as MetalType;
    if (mp.metal.affinities[metal] !== undefined) {
      totalAffinity += mp.metal.affinities[metal] ?? 0;
      count++;
    }
  }

  if (giftProperties.gemstone) {
    const gem = giftProperties.gemstone.toLowerCase() as GemstoneType;
    if (mp.gemstone.affinities[gem] !== undefined) {
      totalAffinity += mp.gemstone.affinities[gem] ?? 0;
      count++;
    }
  }

  if (giftProperties.plant) {
    const plant = giftProperties.plant.toLowerCase() as PlantType;
    if (mp.plant.affinities[plant] !== undefined) {
      totalAffinity += mp.plant.affinities[plant] ?? 0;
      count++;
    }
  }

  return count > 0 ? totalAffinity / count : 0;
}
