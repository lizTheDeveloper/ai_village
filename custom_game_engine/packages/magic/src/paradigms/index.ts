/**
 * Magic Paradigms - Organized by Type
 *
 * This module organizes magic paradigms (magical systems/traditions)
 * for easier navigation and maintainability.
 */

// Import from dimensional paradigms
import {
  DIMENSIONAL_POWERS,
  DIMENSION_PARADIGM,
  ESCALATION_PARADIGM,
  CORRUPTION_PARADIGM,
  DIMENSIONAL_PARADIGM_REGISTRY,
} from '../DimensionalParadigms.js';

// Import from creative paradigms
import {
  SYMPATHY_PARADIGM,
  ALLOMANCY_PARADIGM,
  DREAM_PARADIGM,
  SONG_PARADIGM,
  RUNE_PARADIGM,
  DEBT_PARADIGM,
  BUREAUCRATIC_PARADIGM,
  LUCK_PARADIGM,
  THRESHOLD_PARADIGM,
  BELIEF_PARADIGM,
  CONSUMPTION_PARADIGM,
  SILENCE_PARADIGM,
  PARADOX_PARADIGM,
  ECHO_PARADIGM,
  GAME_PARADIGM,
  CRAFT_PARADIGM,
  COMMERCE_PARADIGM,
  LUNAR_PARADIGM,
  SEASONAL_PARADIGM,
  AGE_PARADIGM,
  SHINTO_PARADIGM,
  ALL_CREATIVE_PARADIGMS,
} from '../CreativeParadigms.js';

// Import from animist paradigms
import {
  DAEMON_PARADIGM,
  ANIMIST_PARADIGM_REGISTRY,
} from '../AnimistParadigms.js';

// Re-export all paradigms
export {
  // Dimensional
  DIMENSIONAL_POWERS,
  DIMENSION_PARADIGM,
  ESCALATION_PARADIGM,
  CORRUPTION_PARADIGM,
  DIMENSIONAL_PARADIGM_REGISTRY,
  // Creative
  SYMPATHY_PARADIGM,
  ALLOMANCY_PARADIGM,
  DREAM_PARADIGM,
  SONG_PARADIGM,
  RUNE_PARADIGM,
  DEBT_PARADIGM,
  BUREAUCRATIC_PARADIGM,
  LUCK_PARADIGM,
  THRESHOLD_PARADIGM,
  BELIEF_PARADIGM,
  CONSUMPTION_PARADIGM,
  SILENCE_PARADIGM,
  PARADOX_PARADIGM,
  ECHO_PARADIGM,
  GAME_PARADIGM,
  CRAFT_PARADIGM,
  COMMERCE_PARADIGM,
  LUNAR_PARADIGM,
  SEASONAL_PARADIGM,
  AGE_PARADIGM,
  SHINTO_PARADIGM,
  ALL_CREATIVE_PARADIGMS,
  // Animist
  DAEMON_PARADIGM,
  ANIMIST_PARADIGM_REGISTRY,
};

// Paradigm category groupings
export const DIMENSIONAL_PARADIGMS = [
  DIMENSION_PARADIGM,
  ESCALATION_PARADIGM,
  CORRUPTION_PARADIGM,
];

// Creative paradigms - re-exported from the original file
export const CREATIVE_PARADIGMS = ALL_CREATIVE_PARADIGMS;

// Animist/Spirit paradigms - unique to AnimistParadigms.ts
export const ANIMIST_PARADIGMS = [
  SHINTO_PARADIGM,
  DAEMON_PARADIGM,
];

// All paradigms combined
export const ALL_PARADIGMS = [
  ...DIMENSIONAL_PARADIGMS,
  ...CREATIVE_PARADIGMS,
  ...ANIMIST_PARADIGMS,
];

// Combined registry
export const ALL_PARADIGM_REGISTRIES = {
  ...DIMENSIONAL_PARADIGM_REGISTRY,
  ...ANIMIST_PARADIGM_REGISTRY,
};

// Category metadata
export const PARADIGM_CATEGORIES = {
  dimensional: {
    name: 'Dimensional Magic',
    description: 'Magic involving other dimensions, planes, and reality manipulation',
    paradigms: DIMENSIONAL_PARADIGMS,
  },
  creative: {
    name: 'Creative Magic',
    description: 'Diverse magical traditions from literature, myth, and imagination',
    paradigms: CREATIVE_PARADIGMS,
  },
  animist: {
    name: 'Animist Magic',
    description: 'Magic involving spirits, kami, and daemons',
    paradigms: ANIMIST_PARADIGMS,
  },
} as const;

export type ParadigmCategory = keyof typeof PARADIGM_CATEGORIES;
