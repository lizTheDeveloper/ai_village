/**
 * MatingParadigmRegistry - Concrete mating paradigm definitions
 *
 * Each paradigm fully parameterizes how reproduction, courtship, bonding,
 * and sexuality work for a set of species. The same engine can simulate
 * humans, Gethenians, hive insects, mystifs, and quantum beings.
 *
 * Paradigm data is now loaded from JSON for easier editing and maintenance.
 */

import type { MatingParadigm, TemperamentDefinition } from './MatingParadigm.js';
import paradigmData from './data/mating-paradigms.json';

// ============================================================================
// Pre-defined Temperaments (The Unraveling)
// ============================================================================

/** Pre-defined Staid temperament (The Unraveling) */
export const STAID_TEMPERAMENT: TemperamentDefinition = {
  id: 'staid',
  name: 'Staid',
  description: 'Rational, emotionally controlled, values stability and order. Expected to suppress emotional displays and approach problems logically.',
  emotionalExpression: 0.2,
  typicalActivities: ['administration', 'planning', 'arbitration', 'record_keeping', 'logistics'],
  socialExpectations: [
    'Maintain emotional composure',
    'Prioritize reason over feeling',
    'Provide stability in crises',
    'Mediate disputes impartially',
  ],
  canChangeTo: false, // In The Unraveling, temperament is assigned
  prevalence: 0.5,
};

/** Pre-defined Vail temperament (The Unraveling) */
export const VAIL_TEMPERAMENT: TemperamentDefinition = {
  id: 'vail',
  name: 'Vail',
  description: 'Emotional, expressive, values passion and authenticity. Expected to express feelings openly, engage in art, performance, and emotional labor.',
  emotionalExpression: 0.9,
  typicalActivities: ['art', 'dance', 'music', 'emotional_support', 'conflict_expression', 'celebration'],
  socialExpectations: [
    'Express emotions authentically',
    'Create art and beauty',
    'Handle emotional situations',
    'Bring passion to endeavors',
  ],
  canChangeTo: false,
  prevalence: 0.5,
};

// ============================================================================
// Paradigm Constants (loaded from JSON)
// ============================================================================

export const HUMAN_PARADIGM: MatingParadigm = paradigmData.human_standard as unknown as MatingParadigm;
export const KEMMER_PARADIGM: MatingParadigm = paradigmData.kemmer as unknown as MatingParadigm;
export const HIVE_PARADIGM: MatingParadigm = paradigmData.hive as unknown as MatingParadigm;
export const OPPORTUNISTIC_PARADIGM: MatingParadigm = paradigmData.opportunistic as unknown as MatingParadigm;
export const MYSTIF_PARADIGM: MatingParadigm = paradigmData.mystif as unknown as MatingParadigm;
export const QUANTUM_PARADIGM: MatingParadigm = paradigmData.quantum as unknown as MatingParadigm;
export const TEMPORAL_PARADIGM: MatingParadigm = paradigmData.temporal as unknown as MatingParadigm;
export const ASEXUAL_PARADIGM: MatingParadigm = paradigmData.asexual as unknown as MatingParadigm;
export const HIVEMIND_PARADIGM: MatingParadigm = paradigmData.hivemind as unknown as MatingParadigm;
export const POLYAMOROUS_PARADIGM: MatingParadigm = paradigmData.polyamorous as unknown as MatingParadigm;
export const THREE_SEX_PARADIGM: MatingParadigm = paradigmData.three_sex as unknown as MatingParadigm;
export const PARASITIC_HIVEMIND_PARADIGM: MatingParadigm = paradigmData.parasitic_hivemind as unknown as MatingParadigm;
export const SYMBIOTIC_PARADIGM: MatingParadigm = paradigmData.symbiotic as unknown as MatingParadigm;
export const UNRAVELING_PARADIGM: MatingParadigm = paradigmData.unraveling as unknown as MatingParadigm;

// ============================================================================
// Registry
// ============================================================================

/** All registered mating paradigms */
export const MATING_PARADIGMS: Record<string, MatingParadigm> = {
  human_standard: HUMAN_PARADIGM,
  kemmer: KEMMER_PARADIGM,
  hive: HIVE_PARADIGM,
  hivemind: HIVEMIND_PARADIGM,
  parasitic_hivemind: PARASITIC_HIVEMIND_PARADIGM,
  symbiotic: SYMBIOTIC_PARADIGM,
  polyamorous: POLYAMOROUS_PARADIGM,
  three_sex: THREE_SEX_PARADIGM,
  opportunistic: OPPORTUNISTIC_PARADIGM,
  mystif: MYSTIF_PARADIGM,
  quantum: QUANTUM_PARADIGM,
  temporal: TEMPORAL_PARADIGM,
  asexual: ASEXUAL_PARADIGM,
  unraveling: UNRAVELING_PARADIGM,
};

/**
 * Get a mating paradigm by ID.
 */
export function getMatingParadigm(id: string): MatingParadigm {
  const paradigm = MATING_PARADIGMS[id];
  if (!paradigm) {
    throw new Error(`Unknown mating paradigm: ${id}`);
  }
  return paradigm;
}

/**
 * Get the mating paradigm for a species.
 */
export function getParadigmForSpecies(speciesId: string): MatingParadigm | undefined {
  for (const paradigm of Object.values(MATING_PARADIGMS)) {
    if (paradigm.speciesIds.includes(speciesId)) {
      return paradigm;
    }
  }
  return undefined;
}

/**
 * Check if two species can mate.
 */
export function canSpeciesMate(species1: string, species2: string): boolean {
  const p1 = getParadigmForSpecies(species1);
  const p2 = getParadigmForSpecies(species2);

  if (!p1 || !p2) return false;

  // Same paradigm
  if (p1.id === p2.id) return true;

  // Check hybridization compatibility
  if (p1.hybridization.possible && p1.hybridization.compatibleSpecies?.includes(species2)) {
    return true;
  }
  if (p2.hybridization.possible && p2.hybridization.compatibleSpecies?.includes(species1)) {
    return true;
  }

  // Check paradigm compatibility
  if (p1.paradigmCompatibility === 'compatible' && p2.paradigmCompatibility === 'compatible') {
    return true;
  }
  if (p1.paradigmCompatibility === 'absorbs' || p2.paradigmCompatibility === 'absorbs') {
    return true;
  }

  return false;
}

/**
 * Register a custom mating paradigm.
 */
export function registerMatingParadigm(paradigm: MatingParadigm): void {
  MATING_PARADIGMS[paradigm.id] = paradigm;
}
