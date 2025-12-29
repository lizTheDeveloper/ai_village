/**
 * PreferenceComponent - Tracks agent food preferences and taste profiles
 *
 * Each agent develops unique food preferences based on:
 * - Innate flavor preferences (personality-based)
 * - Learned preferences from eating experiences
 * - Cultural/community influences
 *
 * Part of Phase 3: Food Depth
 */

import type { Component } from '../ecs/Component.js';

/**
 * Flavor types that foods can have.
 */
export type FlavorType = 'sweet' | 'savory' | 'spicy' | 'bitter' | 'sour' | 'umami';

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
 * PreferenceComponent tracks an agent's food preferences.
 */
export interface PreferenceComponent extends Component {
  type: 'preference';

  /**
   * Flavor preferences from -1 (hate) to 1 (love).
   * These are initially set based on personality and evolve with experience.
   */
  flavorPreferences: FlavorPreferences;

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
  }
): PreferenceComponent {
  const openness = personalityFactors?.openness ?? 0.5;
  const neuroticism = personalityFactors?.neuroticism ?? 0.5;

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
