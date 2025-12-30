/**
 * MoodComponent - Tracks an agent's emotional state
 *
 * The mood system aggregates physical needs, social interactions,
 * food experiences, and memories into a coherent emotional state.
 *
 * Part of the Mood System (Phase 2)
 */

import type { Component } from '../ecs/Component.js';
import { MOOD_DECAY_RATE } from '../constants/index.js';

/**
 * Emotional states that describe the agent's current mood.
 */
export type EmotionalState =
  | 'content'      // Neutral, satisfied
  | 'joyful'       // Very happy
  | 'excited'      // Energized, anticipatory
  | 'melancholic'  // Sad, wistful
  | 'anxious'      // Worried, stressed
  | 'nostalgic'    // Reminiscing, bittersweet
  | 'frustrated'   // Annoyed, blocked
  | 'lonely'       // Isolated, craving connection
  | 'proud'        // Accomplished, self-satisfied
  | 'grateful'     // Appreciative, thankful
  // Forward-compatibility: Mental breakdown states
  | 'enraged'      // Tantrum state - may attack or destroy
  | 'despairing'   // Deep depression - may become catatonic
  | 'manic'        // Hyperactive, reckless behavior
  | 'obsessed'     // Strange mood - focused on single task
  | 'terrified';   // Panic state - may flee or freeze

// ============================================================================
// Forward-Compatibility: Stress & Trauma System
// Separate from mood - stress accumulates over time and can trigger breakdowns
// ============================================================================

/** Types of traumatic events that cause stress */
export type TraumaType =
  | 'death_witnessed'    // Saw someone die
  | 'death_of_friend'    // Close relationship died
  | 'injury_severe'      // Was badly injured
  | 'starvation'         // Nearly starved to death
  | 'isolation'          // Extended loneliness
  | 'failure_public'     // Failed at something publicly
  | 'betrayal'           // Trust was violated
  | 'loss_of_home'       // Lost dwelling/territory
  | 'attack_survived';   // Was attacked and survived

/**
 * Represents a traumatic event that contributes to stress.
 */
export interface Trauma {
  /** Unique identifier */
  id: string;
  /** Type of trauma */
  type: TraumaType;
  /** How severe this trauma was (0-1) */
  severity: number;
  /** Game tick when trauma occurred */
  timestamp: number;
  /** Whether the agent has processed/resolved this trauma */
  resolved: boolean;
  /** Related entity (who died, who attacked, etc.) */
  relatedEntityId?: string;
  /** Description for memory/journal */
  description?: string;
}

/** Types of mental breakdowns */
export type BreakdownType =
  | 'tantrum'        // Destructive rage
  | 'catatonic'      // Unresponsive, won't move
  | 'berserk'        // Attack anyone nearby
  | 'strange_mood'   // Compelled to create artifact
  | 'depression'     // Severe sadness, slow movement
  | 'panic_attack';  // Flee and hide

/** Coping mechanisms agents can use to reduce stress */
export type CopingMechanism =
  | 'socializing'    // Talking to others
  | 'crafting'       // Creating things
  | 'eating'         // Comfort eating
  | 'sleeping'       // Rest and recovery
  | 'drinking'       // Alcohol (future)
  | 'praying'        // Religious activity (future)
  | 'art'            // Creating or viewing art
  | 'nature'         // Being outdoors
  | 'exercise';      // Physical activity

/**
 * Stress state tracking, separate from mood.
 * Stress accumulates from trauma and decays slowly.
 * High stress can trigger mental breakdowns.
 */
export interface StressState {
  /** Current stress level (0-100) */
  level: number;

  /** Stress threshold for breakdown (varies by personality, 50-90) */
  breakdownThreshold: number;

  /** Recent traumatic events */
  recentTraumas: Trauma[];

  /** Coping mechanisms this agent uses */
  copingMechanisms: CopingMechanism[];

  /** Whether agent is currently in a breakdown state */
  inBreakdown: boolean;

  /** Type of current breakdown (if any) */
  breakdownType?: BreakdownType;

  /** Game tick when breakdown started */
  breakdownStartedAt?: number;

  /** How many breakdowns this agent has had (lifetime) */
  totalBreakdowns: number;

  /** Last tick when stress was reduced via coping */
  lastCopingTick: number;
}

/**
 * Factors that contribute to current mood.
 * Each factor is -100 to 100, representing its impact on mood.
 */
export interface MoodFactors {
  /** Physical needs satisfaction (hunger, energy, health) */
  physical: number;

  /** Food quality and variety satisfaction */
  foodSatisfaction: number;

  /** Eating diverse foods vs. monotony */
  foodVariety: number;

  /** Social connection - eating with others, conversations */
  social: number;

  /** Comfort from favorite foods or familiar routines */
  comfort: number;

  /** Rest quality and energy levels */
  rest: number;

  /** Achievement - completing tasks, building, gathering */
  achievement: number;

  /** Environmental factors (weather, temperature, shelter) */
  environment: number;
}

/**
 * A single entry in mood history for pattern detection.
 */
export interface MoodHistoryEntry {
  timestamp: number;
  mood: number;
  primaryFactor: keyof MoodFactors;
  emotionalState: EmotionalState;
}

/**
 * Recent meal tracking for variety calculations.
 */
export interface RecentMeal {
  foodId: string;
  foodName: string;
  timestamp: number;
  quality: number;
  withCompanions: boolean;
}

/**
 * MoodComponent tracks an agent's emotional state.
 */
export interface MoodComponent extends Component {
  type: 'mood';

  /** Current mood value (-100 to 100) */
  currentMood: number;

  /** Baseline mood from personality (some agents are more cheerful) */
  baselineMood: number;

  /** Individual factors contributing to mood */
  factors: MoodFactors;

  /** Current emotional state */
  emotionalState: EmotionalState;

  /** History for pattern detection */
  moodHistory: MoodHistoryEntry[];

  /** Recent meals for variety tracking (circular buffer) */
  recentMeals: RecentMeal[];

  /** Foods this agent has identified as favorites */
  favorites: string[];

  /** Comfort foods (associated with positive memories) */
  comfortFoods: string[];

  /** Last time mood was updated (tick) */
  lastUpdate: number;

  // ============================================================================
  // Forward-Compatibility: Stress System (optional)
  // ============================================================================

  /**
   * Stress state tracking.
   * Future: Used for mental breakdown mechanics (tantrum spirals, strange moods).
   * When undefined, agent has no stress tracking (backward compatible).
   */
  stress?: StressState;
}

/**
 * Create a default stress state for an agent.
 * @param breakdownThreshold - How much stress before breakdown (50-90, based on personality)
 * @param copingMechanisms - What helps this agent cope with stress
 */
export function createStressState(
  breakdownThreshold: number = 70,
  copingMechanisms: CopingMechanism[] = ['socializing', 'sleeping']
): StressState {
  return {
    level: 0,
    breakdownThreshold,
    recentTraumas: [],
    copingMechanisms,
    inBreakdown: false,
    totalBreakdowns: 0,
    lastCopingTick: 0,
  };
}

/**
 * Create a new MoodComponent with neutral defaults.
 */
export function createMoodComponent(baselineMood: number = 0): MoodComponent {
  return {
    type: 'mood',
    version: 1,
    currentMood: baselineMood,
    baselineMood,
    factors: {
      physical: 0,
      foodSatisfaction: 0,
      foodVariety: 0,
      social: 0,
      comfort: 0,
      rest: 0,
      achievement: 0,
      environment: 0,
    },
    emotionalState: 'content',
    moodHistory: [],
    recentMeals: [],
    favorites: [],
    comfortFoods: [],
    lastUpdate: 0,
  };
}

/**
 * Calculate overall mood from factors.
 * Each factor is weighted and summed.
 */
export function calculateMoodFromFactors(factors: MoodFactors): number {
  const weights = {
    physical: 0.25,       // Being hungry/tired has big impact
    foodSatisfaction: 0.10,
    foodVariety: 0.05,
    social: 0.20,         // Social connection matters a lot
    comfort: 0.10,
    rest: 0.10,
    achievement: 0.10,
    environment: 0.10,
  };

  let weightedSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    weightedSum += factors[key as keyof MoodFactors] * weight;
  }

  return Math.max(-100, Math.min(100, weightedSum));
}

/**
 * Determine emotional state from mood value and factors.
 */
export function determineEmotionalState(
  mood: number,
  factors: MoodFactors
): EmotionalState {
  // Check for specific emotional states based on factors
  if (factors.social < -50) {
    return 'lonely';
  }
  if (factors.achievement > 60) {
    return 'proud';
  }
  if (factors.social > 50 && mood > 30) {
    return 'grateful';
  }
  if (factors.physical < -40) {
    return 'anxious';
  }
  if (factors.comfort > 40 && mood > 20) {
    return 'nostalgic';
  }

  // General mood-based states
  if (mood > 60) {
    return 'joyful';
  }
  if (mood > 40) {
    return 'excited';
  }
  if (mood < -40) {
    return 'melancholic';
  }
  if (mood < -20) {
    return 'frustrated';
  }

  return 'content';
}

/**
 * Update a mood factor.
 */
export function updateMoodFactor(
  component: MoodComponent,
  factor: keyof MoodFactors,
  value: number
): MoodComponent {
  const newFactors = {
    ...component.factors,
    [factor]: Math.max(-100, Math.min(100, value)),
  };

  const newMood = calculateMoodFromFactors(newFactors);
  const newState = determineEmotionalState(newMood, newFactors);

  return {
    ...component,
    factors: newFactors,
    currentMood: newMood,
    emotionalState: newState,
  };
}

/**
 * Apply mood delta with decay toward baseline.
 */
export function applyMoodChange(
  component: MoodComponent,
  delta: number,
  tick: number
): MoodComponent {
  // Apply mood decay toward baseline
  const decayedMood = component.currentMood + (component.baselineMood - component.currentMood) * MOOD_DECAY_RATE;

  // Apply the mood change
  const newMood = Math.max(-100, Math.min(100, decayedMood + delta));
  const newState = determineEmotionalState(newMood, component.factors);

  // Find primary factor (highest absolute value)
  let primaryFactor: keyof MoodFactors = 'physical';
  let maxAbsValue = 0;
  for (const [key, value] of Object.entries(component.factors)) {
    if (Math.abs(value) > maxAbsValue) {
      maxAbsValue = Math.abs(value);
      primaryFactor = key as keyof MoodFactors;
    }
  }

  // Add to history (keep last 24 entries)
  const newHistory = [
    ...component.moodHistory.slice(-23),
    {
      timestamp: tick,
      mood: newMood,
      primaryFactor,
      emotionalState: newState,
    },
  ];

  return {
    ...component,
    currentMood: newMood,
    emotionalState: newState,
    moodHistory: newHistory,
    lastUpdate: tick,
  };
}

/**
 * Record a meal and update food-related mood factors.
 */
export function recordMeal(
  component: MoodComponent,
  meal: RecentMeal,
  isFavorite: boolean,
  isComfortFood: boolean
): MoodComponent {
  // Add to recent meals (keep last 10)
  const newRecentMeals = [...component.recentMeals.slice(-9), meal];

  // Calculate variety score
  const uniqueFoods = new Set(newRecentMeals.map((m) => m.foodId)).size;
  const varietyScore = (uniqueFoods / newRecentMeals.length - 0.5) * 100; // -50 to +50

  // Calculate food satisfaction from quality
  const avgQuality = newRecentMeals.reduce((sum, m) => sum + m.quality, 0) / newRecentMeals.length;
  const satisfactionScore = (avgQuality - 50) * 0.5; // -25 to +25

  // Comfort bonus
  const comfortBonus = isComfortFood ? 20 : isFavorite ? 10 : 0;

  // Social bonus from shared meals - TODO: Implement this feature
  // const recentSocialMeals = newRecentMeals.filter((m) => m.withCompanions).length;
  // const socialBonus = (recentSocialMeals / newRecentMeals.length - 0.3) * 50; // Bonus if > 30% are social

  const newFactors = {
    ...component.factors,
    foodVariety: varietyScore,
    foodSatisfaction: satisfactionScore + comfortBonus,
    social: Math.max(-100, Math.min(100, component.factors.social + (meal.withCompanions ? 5 : -2))),
    comfort: Math.max(-100, Math.min(100, component.factors.comfort + (isComfortFood ? 10 : 0))),
  };

  const newMood = calculateMoodFromFactors(newFactors);
  const newState = determineEmotionalState(newMood, newFactors);

  return {
    ...component,
    factors: newFactors,
    currentMood: newMood,
    emotionalState: newState,
    recentMeals: newRecentMeals,
  };
}

/**
 * Add a food to favorites list.
 */
export function addFavoriteFood(
  component: MoodComponent,
  foodId: string
): MoodComponent {
  if (component.favorites.includes(foodId)) {
    return component;
  }
  return {
    ...component,
    favorites: [...component.favorites, foodId],
  };
}

/**
 * Add a food to comfort foods list.
 */
export function addComfortFood(
  component: MoodComponent,
  foodId: string
): MoodComponent {
  if (component.comfortFoods.includes(foodId)) {
    return component;
  }
  return {
    ...component,
    comfortFoods: [...component.comfortFoods, foodId],
  };
}

/**
 * Get a text description of current mood for LLM context.
 */
export function getMoodDescription(component: MoodComponent): string {
  const moodLevel = component.currentMood > 50 ? 'very happy' :
                    component.currentMood > 20 ? 'happy' :
                    component.currentMood > -20 ? 'neutral' :
                    component.currentMood > -50 ? 'unhappy' : 'very unhappy';

  const stateDescriptions: Record<EmotionalState, string> = {
    content: 'feeling content',
    joyful: 'feeling joyful',
    excited: 'feeling excited',
    melancholic: 'feeling sad',
    anxious: 'feeling anxious',
    nostalgic: 'feeling nostalgic',
    frustrated: 'feeling frustrated',
    lonely: 'feeling lonely',
    proud: 'feeling proud',
    grateful: 'feeling grateful',
    // Forward-compatibility: breakdown states
    enraged: 'in a violent rage',
    despairing: 'in deep despair',
    manic: 'in a manic state',
    obsessed: 'obsessively focused',
    terrified: 'paralyzed with fear',
  };

  return `${moodLevel}, ${stateDescriptions[component.emotionalState]}`;
}

/**
 * Get the primary mood factor (what's most affecting mood).
 */
export function getPrimaryMoodFactor(component: MoodComponent): keyof MoodFactors {
  let primary: keyof MoodFactors = 'physical';
  let maxAbsValue = 0;

  for (const [key, value] of Object.entries(component.factors)) {
    if (Math.abs(value) > maxAbsValue) {
      maxAbsValue = Math.abs(value);
      primary = key as keyof MoodFactors;
    }
  }

  return primary;
}
