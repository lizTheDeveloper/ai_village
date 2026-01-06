/**
 * Courtship Paradigms
 *
 * Defines species-specific courtship protocols and mating behaviors.
 */

import type { CourtshipParadigm } from './types';

// ============================================================================
// Human Courtship Paradigm
// ============================================================================

export const HUMAN_COURTSHIP_PARADIGM: CourtshipParadigm = {
  type: 'gradual_proximity',
  requiredTactics: ['conversation', 'shared_activity', 'physical_proximity'],
  optionalTactics: ['gift_giving', 'compliment', 'humor', 'touch', 'shared_meal'],
  forbiddenTactics: ['aggressive_display', 'dominance_combat'],
  minimumTactics: 5,
  typicalDuration: [10000, 50000], // ~8-40 minutes at 20 tps
  locationRequirement: null,
  matingBehavior: {
    type: 'private_location',
    requiredLocation: 'bed',
    bothMustBePresent: true,
    privateSpace: true,
    duration: 600, // ~30 seconds
    postMatingEffects: {
      moodBoost: 20,
      energyCost: 15,
      bondStrength: 0.8,
    },
  },
};

// ============================================================================
// Dwarf Courtship Paradigm
// ============================================================================

export const DWARF_COURTSHIP_PARADIGM: CourtshipParadigm = {
  type: 'construction',
  requiredTactics: ['craft_gift', 'demonstrate_skill', 'shared_project'],
  optionalTactics: ['share_ale', 'tell_saga', 'show_wealth'],
  forbiddenTactics: ['hasty_approach'],
  minimumTactics: 4,
  typicalDuration: [30000, 100000], // Very long courtship (~25-80 minutes)
  locationRequirement: {
    type: 'workshop',
    requiresQuality: 'high',
  },
  matingBehavior: {
    type: 'private_location',
    requiredLocation: 'bed',
    bothMustBePresent: true,
    privateSpace: true,
    duration: 600,
    postMatingEffects: {
      moodBoost: 25,
      energyCost: 12,
      bondStrength: 0.95, // Dwarves bond very strongly
    },
  },
};

// ============================================================================
// Bird-Folk Courtship Paradigm
// ============================================================================

export const BIRD_FOLK_COURTSHIP_PARADIGM: CourtshipParadigm = {
  type: 'display',
  requiredTactics: ['aerial_dance', 'plumage_display', 'song'],
  optionalTactics: ['gift_giving', 'nest_construction'],
  forbiddenTactics: [],
  minimumTactics: 3,
  typicalDuration: [5000, 15000], // Shorter courtship (~4-12 minutes)
  locationRequirement: {
    type: 'elevated',
    minHeight: 5,
    visibility: 'public',
  },
  matingBehavior: {
    type: 'nest_location',
    requiredLocation: 'nest',
    bothMustBePresent: true,
    privateSpace: true,
    duration: 300, // ~15 seconds
    postMatingEffects: {
      moodBoost: 25,
      energyCost: 10,
      bondStrength: 0.9,
    },
  },
};

// ============================================================================
// Mystif Courtship Paradigm
// ============================================================================

export const MYSTIF_COURTSHIP_PARADIGM: CourtshipParadigm = {
  type: 'resonance',
  requiredTactics: ['mind_touch', 'aura_display', 'magic_sharing'],
  optionalTactics: ['dream_meeting', 'conversation'],
  forbiddenTactics: ['aggressive_display', 'dominance_combat'],
  minimumTactics: 3,
  typicalDuration: [8000, 20000], // ~6-16 minutes
  locationRequirement: {
    type: 'ley_line',
    magicalIntensity: 'high',
  },
  matingBehavior: {
    type: 'ritual_space',
    requiredLocation: 'union_circle',
    bothMustBePresent: true,
    privateSpace: false, // Mystif mating is communal/witnessed
    duration: 1200, // ~1 minute
    ritualComponents: ['union_candles', 'incense', 'union_chalk'],
    postMatingEffects: {
      moodBoost: 30,
      energyCost: 25,
      bondStrength: 1.0, // Maximum bond
    },
  },
};

// ============================================================================
// Elf Courtship Paradigm
// ============================================================================

export const ELF_COURTSHIP_PARADIGM: CourtshipParadigm = {
  type: 'gradual_proximity',
  requiredTactics: ['conversation', 'shared_activity', 'song'],
  optionalTactics: ['gift_giving', 'compliment', 'shared_meal', 'aura_display'],
  forbiddenTactics: ['aggressive_display', 'dominance_combat', 'hasty_approach'],
  minimumTactics: 6, // Very deliberate courtship
  typicalDuration: [40000, 120000], // Very long (~30-100 minutes)
  locationRequirement: {
    type: 'natural',
    visibility: 'private',
  },
  matingBehavior: {
    type: 'private_location',
    requiredLocation: 'bed',
    bothMustBePresent: true,
    privateSpace: true,
    duration: 800,
    postMatingEffects: {
      moodBoost: 30,
      energyCost: 10,
      bondStrength: 0.98, // Nearly permanent bonds
    },
  },
};

// ============================================================================
// Default/Generic Courtship Paradigm
// ============================================================================

export const DEFAULT_COURTSHIP_PARADIGM: CourtshipParadigm = {
  type: 'gradual_proximity',
  requiredTactics: ['conversation', 'shared_activity'],
  optionalTactics: ['gift_giving', 'compliment', 'humor', 'shared_meal'],
  forbiddenTactics: [],
  minimumTactics: 3,
  typicalDuration: [10000, 30000],
  locationRequirement: null,
  matingBehavior: {
    type: 'private_location',
    requiredLocation: 'bed',
    bothMustBePresent: true,
    privateSpace: true,
    duration: 600,
    postMatingEffects: {
      moodBoost: 20,
      energyCost: 15,
      bondStrength: 0.7,
    },
  },
};

// ============================================================================
// Paradigm Registry
// ============================================================================

export const PARADIGMS_BY_SPECIES = new Map<string, CourtshipParadigm>([
  ['human', HUMAN_COURTSHIP_PARADIGM],
  ['dwarf', DWARF_COURTSHIP_PARADIGM],
  ['bird_folk', BIRD_FOLK_COURTSHIP_PARADIGM],
  ['avian', BIRD_FOLK_COURTSHIP_PARADIGM],
  ['mystif', MYSTIF_COURTSHIP_PARADIGM],
  ['elf', ELF_COURTSHIP_PARADIGM],
  ['default', DEFAULT_COURTSHIP_PARADIGM],
]);

export function getCourtshipParadigm(species: string): CourtshipParadigm {
  const paradigm = PARADIGMS_BY_SPECIES.get(species.toLowerCase());
  if (!paradigm) {
    return DEFAULT_COURTSHIP_PARADIGM;
  }
  return paradigm;
}

export function createCourtshipParadigmForSpecies(species: string): CourtshipParadigm {
  return getCourtshipParadigm(species);
}
