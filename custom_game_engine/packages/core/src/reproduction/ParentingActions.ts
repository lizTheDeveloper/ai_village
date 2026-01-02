/**
 * Species-Specific Parenting Actions
 *
 * Different species have fundamentally different parenting behaviors.
 * Actions are derived from the species' ParentalCareType.
 */

import type { ParentalCareType } from './MatingParadigm';

/**
 * A parenting action available to a species
 */
export interface ParentingAction {
  /** Action ID for LLM */
  action: string;

  /** Human-readable description */
  description: string;

  /** What care type this action belongs to */
  careType: ParentalCareType;

  /** Frequency of need (continuous, periodic, rare) */
  frequency: 'continuous' | 'periodic' | 'rare';

  /** How effective this action is at meeting child needs (0-1) */
  effectiveness: number;

  /** What child state this addresses */
  addresses: Array<'hunger' | 'health' | 'safety' | 'development' | 'social' | 'emotional'>;
}

/**
 * Get species-specific parenting actions based on care type
 */
export function getParentingActionsForCareType(careType: ParentalCareType): ParentingAction[] {
  return PARENTING_ACTIONS_BY_TYPE[careType] || [];
}

/**
 * All parenting actions organized by care type
 */
const PARENTING_ACTIONS_BY_TYPE: Record<ParentalCareType, ParentingAction[]> = {
  // ============================================================================
  // NONE - No parental care
  // ============================================================================
  none: [],

  // ============================================================================
  // EGG_GUARDING - Protect and regulate eggs
  // ============================================================================
  egg_guarding: [
    {
      action: 'guard_eggs',
      description: 'Stand watch over eggs to protect from predators',
      careType: 'egg_guarding',
      frequency: 'continuous',
      effectiveness: 0.8,
      addresses: ['safety'],
    },
    {
      action: 'regulate_nest_temperature',
      description: 'Adjust position to warm or cool eggs',
      careType: 'egg_guarding',
      frequency: 'continuous',
      effectiveness: 0.9,
      addresses: ['health'],
    },
    {
      action: 'rotate_eggs',
      description: 'Turn eggs to ensure even development',
      careType: 'egg_guarding',
      frequency: 'periodic',
      effectiveness: 0.7,
      addresses: ['health', 'development'],
    },
    {
      action: 'clean_nest',
      description: 'Remove debris and parasites from nest',
      careType: 'egg_guarding',
      frequency: 'periodic',
      effectiveness: 0.6,
      addresses: ['health'],
    },
    {
      action: 'reinforce_nest',
      description: 'Repair and strengthen nest structure',
      careType: 'egg_guarding',
      frequency: 'rare',
      effectiveness: 0.7,
      addresses: ['safety'],
    },
  ],

  // ============================================================================
  // FEEDING - Provide food to offspring
  // ============================================================================
  feeding: [
    {
      action: 'hunt_for_offspring',
      description: 'Hunt prey to feed your young',
      careType: 'feeding',
      frequency: 'periodic',
      effectiveness: 0.9,
      addresses: ['hunger', 'development'],
    },
    {
      action: 'regurgitate_food',
      description: 'Regurgitate pre-digested food for offspring',
      careType: 'feeding',
      frequency: 'periodic',
      effectiveness: 0.8,
      addresses: ['hunger'],
    },
    {
      action: 'bring_food_to_nest',
      description: 'Carry food back to nest for offspring',
      careType: 'feeding',
      frequency: 'periodic',
      effectiveness: 0.9,
      addresses: ['hunger'],
    },
    {
      action: 'show_food_location',
      description: 'Lead offspring to food source',
      careType: 'feeding',
      frequency: 'periodic',
      effectiveness: 0.7,
      addresses: ['hunger', 'development'],
    },
  ],

  // ============================================================================
  // TEACHING - Teach skills and knowledge
  // ============================================================================
  teaching: [
    {
      action: 'demonstrate_skill',
      description: 'Show offspring how to perform a skill',
      careType: 'teaching',
      frequency: 'periodic',
      effectiveness: 0.9,
      addresses: ['development'],
    },
    {
      action: 'share_knowledge',
      description: 'Teach offspring about the world',
      careType: 'teaching',
      frequency: 'periodic',
      effectiveness: 0.8,
      addresses: ['development'],
    },
    {
      action: 'correct_mistakes',
      description: 'Guide offspring when they make errors',
      careType: 'teaching',
      frequency: 'periodic',
      effectiveness: 0.7,
      addresses: ['development'],
    },
    {
      action: 'encourage_practice',
      description: 'Motivate offspring to practice skills',
      careType: 'teaching',
      frequency: 'periodic',
      effectiveness: 0.6,
      addresses: ['development', 'emotional'],
    },
    {
      action: 'test_understanding',
      description: 'Check if offspring has learned the lesson',
      careType: 'teaching',
      frequency: 'rare',
      effectiveness: 0.8,
      addresses: ['development'],
    },
  ],

  // ============================================================================
  // PROTECTION - Defend offspring from threats
  // ============================================================================
  protection: [
    {
      action: 'guard_offspring',
      description: 'Stay close to protect from predators',
      careType: 'protection',
      frequency: 'continuous',
      effectiveness: 0.9,
      addresses: ['safety'],
    },
    {
      action: 'warn_of_danger',
      description: 'Alert offspring to threats',
      careType: 'protection',
      frequency: 'periodic',
      effectiveness: 0.8,
      addresses: ['safety', 'development'],
    },
    {
      action: 'attack_threat',
      description: 'Fight off predators or threats',
      careType: 'protection',
      frequency: 'rare',
      effectiveness: 1.0,
      addresses: ['safety'],
    },
    {
      action: 'hide_offspring',
      description: 'Conceal offspring from danger',
      careType: 'protection',
      frequency: 'periodic',
      effectiveness: 0.7,
      addresses: ['safety'],
    },
    {
      action: 'teach_vigilance',
      description: 'Train offspring to watch for danger',
      careType: 'protection',
      frequency: 'periodic',
      effectiveness: 0.6,
      addresses: ['safety', 'development'],
    },
  ],

  // ============================================================================
  // FULL_NURTURING - Comprehensive care (human-like)
  // ============================================================================
  full_nurturing: [
    {
      action: 'feed_child',
      description: 'Provide food to satisfy hunger',
      careType: 'full_nurturing',
      frequency: 'periodic',
      effectiveness: 0.9,
      addresses: ['hunger'],
    },
    {
      action: 'comfort_child',
      description: 'Soothe distress and provide emotional support',
      careType: 'full_nurturing',
      frequency: 'periodic',
      effectiveness: 0.8,
      addresses: ['emotional'],
    },
    {
      action: 'play_with_child',
      description: 'Engage in play to bond and develop skills',
      careType: 'full_nurturing',
      frequency: 'periodic',
      effectiveness: 0.7,
      addresses: ['emotional', 'social', 'development'],
    },
    {
      action: 'teach_child',
      description: 'Teach skills, knowledge, or values',
      careType: 'full_nurturing',
      frequency: 'periodic',
      effectiveness: 0.9,
      addresses: ['development'],
    },
    {
      action: 'monitor_health',
      description: "Check on child's wellbeing",
      careType: 'full_nurturing',
      frequency: 'periodic',
      effectiveness: 0.6,
      addresses: ['health'],
    },
    {
      action: 'protect_child',
      description: 'Shield from danger or harm',
      careType: 'full_nurturing',
      frequency: 'continuous',
      effectiveness: 0.9,
      addresses: ['safety'],
    },
    {
      action: 'socialize_child',
      description: 'Introduce to community and teach social norms',
      careType: 'full_nurturing',
      frequency: 'periodic',
      effectiveness: 0.7,
      addresses: ['social', 'development'],
    },
  ],

  // ============================================================================
  // COMMUNAL_CARE - Community raises children together
  // ============================================================================
  communal_care: [
    {
      action: 'contribute_to_childcare',
      description: "Help care for community's children",
      careType: 'communal_care',
      frequency: 'periodic',
      effectiveness: 0.7,
      addresses: ['hunger', 'health', 'safety'],
    },
    {
      action: 'coordinate_with_caregivers',
      description: 'Work with other adults to share childcare',
      careType: 'communal_care',
      frequency: 'periodic',
      effectiveness: 0.8,
      addresses: ['social'],
    },
    {
      action: 'organize_group_activity',
      description: 'Lead group learning or play for children',
      careType: 'communal_care',
      frequency: 'periodic',
      effectiveness: 0.8,
      addresses: ['social', 'development'],
    },
    {
      action: 'provide_to_children_pool',
      description: 'Contribute resources for all children',
      careType: 'communal_care',
      frequency: 'periodic',
      effectiveness: 0.7,
      addresses: ['hunger'],
    },
  ],

  // ============================================================================
  // HIVE_INTEGRATION - Integrate offspring into hive collective
  // ============================================================================
  hive_integration: [
    {
      action: 'assign_caste',
      description: "Determine offspring's role in the hive",
      careType: 'hive_integration',
      frequency: 'rare',
      effectiveness: 1.0,
      addresses: ['development', 'social'],
    },
    {
      action: 'feed_royal_jelly',
      description: 'Provide special nutrients for caste development',
      careType: 'hive_integration',
      frequency: 'periodic',
      effectiveness: 0.9,
      addresses: ['hunger', 'development'],
    },
    {
      action: 'integrate_into_collective',
      description: 'Merge offspring consciousness with hive mind',
      careType: 'hive_integration',
      frequency: 'rare',
      effectiveness: 1.0,
      addresses: ['social', 'development'],
    },
    {
      action: 'train_hive_role',
      description: 'Teach offspring their function in the colony',
      careType: 'hive_integration',
      frequency: 'periodic',
      effectiveness: 0.9,
      addresses: ['development'],
    },
    {
      action: 'synchronize_pheromones',
      description: "Align offspring's chemical signals with hive",
      careType: 'hive_integration',
      frequency: 'continuous',
      effectiveness: 0.8,
      addresses: ['social'],
    },
  ],

  // ============================================================================
  // ABANDONMENT_SURVIVAL - Minimal/no care, offspring must survive
  // ============================================================================
  abandonment_survival: [
    {
      action: 'leave_offspring',
      description: 'Depart and let offspring fend for themselves',
      careType: 'abandonment_survival',
      frequency: 'rare',
      effectiveness: 0.0,
      addresses: [],
    },
    {
      action: 'provide_initial_resources',
      description: 'Leave food or shelter before departing',
      careType: 'abandonment_survival',
      frequency: 'rare',
      effectiveness: 0.3,
      addresses: ['hunger', 'safety'],
    },
  ],

  // ============================================================================
  // MEMORY_INHERITANCE - Transfer memories and experiences
  // ============================================================================
  memory_inheritance: [
    {
      action: 'transfer_memories',
      description: 'Share your memories with offspring directly',
      careType: 'memory_inheritance',
      frequency: 'rare',
      effectiveness: 1.0,
      addresses: ['development'],
    },
    {
      action: 'imprint_experiences',
      description: "Imprint key experiences into offspring's mind",
      careType: 'memory_inheritance',
      frequency: 'periodic',
      effectiveness: 0.9,
      addresses: ['development'],
    },
    {
      action: 'share_ancestral_knowledge',
      description: 'Pass down knowledge from previous generations',
      careType: 'memory_inheritance',
      frequency: 'rare',
      effectiveness: 1.0,
      addresses: ['development'],
    },
    {
      action: 'merge_consciousness',
      description: 'Temporarily merge minds to transfer understanding',
      careType: 'memory_inheritance',
      frequency: 'rare',
      effectiveness: 1.0,
      addresses: ['development', 'emotional'],
    },
  ],

  // ============================================================================
  // SACRIFICE - Parent sacrifices for offspring
  // ============================================================================
  sacrifice: [
    {
      action: 'provide_body_nutrients',
      description: 'Allow offspring to consume your body for nourishment',
      careType: 'sacrifice',
      frequency: 'continuous',
      effectiveness: 1.0,
      addresses: ['hunger', 'health', 'development'],
    },
    {
      action: 'transfer_life_force',
      description: 'Give your life energy to strengthen offspring',
      careType: 'sacrifice',
      frequency: 'continuous',
      effectiveness: 1.0,
      addresses: ['health', 'development'],
    },
    {
      action: 'sacrifice_self',
      description: 'Die to ensure offspring survival',
      careType: 'sacrifice',
      frequency: 'rare',
      effectiveness: 1.0,
      addresses: ['hunger', 'health', 'safety', 'development'],
    },
  ],

  // ============================================================================
  // CONSUMPTION_RISK - May eat weaker offspring
  // ============================================================================
  consumption_risk: [
    {
      action: 'feed_strongest',
      description: 'Provide food only to strongest offspring',
      careType: 'consumption_risk',
      frequency: 'periodic',
      effectiveness: 0.9,
      addresses: ['hunger'],
    },
    {
      action: 'cull_weak',
      description: 'Consume or abandon weak offspring',
      careType: 'consumption_risk',
      frequency: 'rare',
      effectiveness: 0.0,
      addresses: [],
    },
    {
      action: 'pit_offspring_against_each_other',
      description: 'Make offspring compete for resources',
      careType: 'consumption_risk',
      frequency: 'periodic',
      effectiveness: 0.5,
      addresses: ['development'],
    },
  ],
};

/**
 * Get all available parenting actions for an agent based on their species paradigm
 */
export function getParentingActionsForAgent(careType: ParentalCareType): ParentingAction[] {
  const actions = getParentingActionsForCareType(careType);

  // Return copy to prevent mutation
  return actions.map((a) => ({ ...a }));
}

/**
 * Check if an action is appropriate for a care type
 */
export function isActionValidForCareType(action: string, careType: ParentalCareType): boolean {
  const actions = getParentingActionsForCareType(careType);
  return actions.some((a) => a.action === action);
}
