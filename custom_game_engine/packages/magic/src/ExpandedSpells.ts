/**
 * Expanded Spell Library - Comprehensive spell definitions for all paradigms
 *
 * Spell data is loaded from JSON files in ../data/ directory.
 * This maintains the blended voice style in descriptions:
 * - Baroque encyclopedic detail (Pratchett-esque)
 * - Dry cosmic pragmatism (Adams-esque)
 * - Humane satire with moral clarity
 * - Lyrical intimate mythology (Gaiman-esque)
 */

import type { SpellDefinition } from './SpellRegistry.js';

// Import spell data from JSON files
import divineSpellsData from '../data/divine_spells.json';
import academicSpellsData from '../data/academic_spells.json';
import bloodSpellsData from '../data/blood_spells.json';
import nameSpellsData from '../data/name_spells.json';
import breathSpellsData from '../data/breath_spells.json';
import pactSpellsData from '../data/pact_spells.json';

// ============================================================================
// PARADIGM SPELL ARRAYS - Loaded from JSON
// ============================================================================

/**
 * DIVINE PARADIGM SPELLS - Faith, Worship, and Miracles
 * Source: ../data/divine_spells.json
 */
export const DIVINE_SPELLS: SpellDefinition[] = divineSpellsData as SpellDefinition[];

/**
 * ACADEMIC PARADIGM SPELLS - Systematic Study, Formulaic Magic
 * Source: ../data/academic_spells.json
 */
export const ACADEMIC_SPELLS: SpellDefinition[] = academicSpellsData as SpellDefinition[];

/**
 * BLOOD PARADIGM SPELLS - Sacrifice, Vitality, Life Force
 * Source: ../data/blood_spells.json
 */
export const BLOOD_SPELLS: SpellDefinition[] = bloodSpellsData as SpellDefinition[];

/**
 * NAME PARADIGM SPELLS - True Names, Identity Magic
 * Source: ../data/name_spells.json
 */
export const NAME_SPELLS: SpellDefinition[] = nameSpellsData as SpellDefinition[];

/**
 * BREATH PARADIGM SPELLS - Song, Voice, Wind Magic
 * Source: ../data/breath_spells.json
 */
export const BREATH_SPELLS: SpellDefinition[] = breathSpellsData as SpellDefinition[];

/**
 * PACT PARADIGM SPELLS - Contracts, Bargains, Cosmic Deals
 * Source: ../data/pact_spells.json
 */
export const PACT_SPELLS: SpellDefinition[] = pactSpellsData as SpellDefinition[];

// ============================================================================
// SPELL COUNTS - For validation
// ============================================================================

export const SPELL_COUNTS = {
  divine: DIVINE_SPELLS.length,
  academic: ACADEMIC_SPELLS.length,
  blood: BLOOD_SPELLS.length,
  name: NAME_SPELLS.length,
  breath: BREATH_SPELLS.length,
  pact: PACT_SPELLS.length,
  total:
    DIVINE_SPELLS.length +
    ACADEMIC_SPELLS.length +
    BLOOD_SPELLS.length +
    NAME_SPELLS.length +
    BREATH_SPELLS.length +
    PACT_SPELLS.length,
};

// ============================================================================
// EXPORTS - All spell arrays
// ============================================================================

export const ALL_SPELL_ARRAYS = {
  DIVINE_SPELLS,
  ACADEMIC_SPELLS,
  BLOOD_SPELLS,
  NAME_SPELLS,
  BREATH_SPELLS,
  PACT_SPELLS,
};
