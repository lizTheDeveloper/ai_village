/**
 * Spells - Organized by School of Magic
 *
 * This module organizes spell definitions by their magical tradition.
 */

// Import from the original file
import {
  DIVINE_SPELLS,
  ACADEMIC_SPELLS,
  BLOOD_SPELLS,
  NAME_SPELLS,
  BREATH_SPELLS,
  PACT_SPELLS,
} from '../ExpandedSpells.js';

// Re-export by school
export {
  DIVINE_SPELLS,
  ACADEMIC_SPELLS,
  BLOOD_SPELLS,
  NAME_SPELLS,
  BREATH_SPELLS,
  PACT_SPELLS,
};

// Combined exports for convenience
export const ALL_EXPANDED_SPELLS = [
  ...DIVINE_SPELLS,
  ...ACADEMIC_SPELLS,
  ...BLOOD_SPELLS,
  ...NAME_SPELLS,
  ...BREATH_SPELLS,
  ...PACT_SPELLS,
];

// School metadata
export const SPELL_SCHOOLS = {
  divine: {
    name: 'Divine Magic',
    description: 'Magic drawn from faith, prayer, and divine connection',
    spells: DIVINE_SPELLS,
  },
  academic: {
    name: 'Academic Magic',
    description: 'Magic learned through study, formulae, and precise manipulation',
    spells: ACADEMIC_SPELLS,
  },
  blood: {
    name: 'Blood Magic',
    description: 'Magic powered by life force and sacrifice',
    spells: BLOOD_SPELLS,
  },
  name: {
    name: 'Name Magic',
    description: 'Magic that uses true names to command and transform',
    spells: NAME_SPELLS,
  },
  breath: {
    name: 'Breath Magic',
    description: 'Magic channeled through breath, voice, and life essence',
    spells: BREATH_SPELLS,
  },
  pact: {
    name: 'Pact Magic',
    description: 'Magic gained through contracts with otherworldly entities',
    spells: PACT_SPELLS,
  },
} as const;

export type SpellSchool = keyof typeof SPELL_SCHOOLS;
