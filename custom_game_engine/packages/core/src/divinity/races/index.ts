/**
 * Race Templates - Organized by Pantheon/Culture
 *
 * This module organizes divine race templates by their mythological origin.
 */

// Import from the original file
import {
  COMMON_TRAITS,
  // Greek/Olympian
  OLYMPIAN_RACE,
  DEMIGOD_RACE,
  NYMPH_RACE,
  SATYR_RACE,
  // Celtic Fey
  SIDHE_RACE,
  PIXIE_RACE,
  REDCAP_RACE,
  // Underworld
  SHADE_RACE,
  FURY_RACE,
  // Norse
  AESIR_RACE,
  VALKYRIE_RACE,
  EINHERJAR_RACE,
  // Celestial
  SERAPH_RACE,
  ANGEL_RACE,
  // Dream Realm
  ONEIROI_RACE,
  NIGHTMARE_RACE,
  // Elemental
  EFREET_RACE,
} from '../RaceTemplates.js';

// Re-export everything
export {
  COMMON_TRAITS,
  OLYMPIAN_RACE,
  DEMIGOD_RACE,
  NYMPH_RACE,
  SATYR_RACE,
  SIDHE_RACE,
  PIXIE_RACE,
  REDCAP_RACE,
  SHADE_RACE,
  FURY_RACE,
  AESIR_RACE,
  VALKYRIE_RACE,
  EINHERJAR_RACE,
  SERAPH_RACE,
  ANGEL_RACE,
  ONEIROI_RACE,
  NIGHTMARE_RACE,
  EFREET_RACE,
};

// Pantheon groupings
export const GREEK_RACES = [OLYMPIAN_RACE, DEMIGOD_RACE, NYMPH_RACE, SATYR_RACE];
export const CELTIC_RACES = [SIDHE_RACE, PIXIE_RACE, REDCAP_RACE];
export const UNDERWORLD_RACES = [SHADE_RACE, FURY_RACE];
export const NORSE_RACES = [AESIR_RACE, VALKYRIE_RACE, EINHERJAR_RACE];
export const CELESTIAL_RACES = [SERAPH_RACE, ANGEL_RACE];
export const DREAM_RACES = [ONEIROI_RACE, NIGHTMARE_RACE];
export const ELEMENTAL_RACES = [EFREET_RACE];

// All races combined
export const ALL_RACES = [
  ...GREEK_RACES,
  ...CELTIC_RACES,
  ...UNDERWORLD_RACES,
  ...NORSE_RACES,
  ...CELESTIAL_RACES,
  ...DREAM_RACES,
  ...ELEMENTAL_RACES,
];

// Pantheon metadata
export const PANTHEONS = {
  greek: {
    name: 'Greek/Olympian',
    description: 'Beings from the Greek mythological tradition',
    races: GREEK_RACES,
  },
  celtic: {
    name: 'Celtic Fey',
    description: 'The fair folk and otherworldly beings of Celtic myth',
    races: CELTIC_RACES,
  },
  underworld: {
    name: 'Underworld',
    description: 'Spirits and entities from the realm of the dead',
    races: UNDERWORLD_RACES,
  },
  norse: {
    name: 'Norse',
    description: 'Gods and beings from Norse mythology',
    races: NORSE_RACES,
  },
  celestial: {
    name: 'Celestial',
    description: 'Divine servants and heavenly beings',
    races: CELESTIAL_RACES,
  },
  dream: {
    name: 'Dream Realm',
    description: 'Entities born of dreams and nightmares',
    races: DREAM_RACES,
  },
  elemental: {
    name: 'Elemental',
    description: 'Beings of pure elemental force',
    races: ELEMENTAL_RACES,
  },
} as const;

export type Pantheon = keyof typeof PANTHEONS;
