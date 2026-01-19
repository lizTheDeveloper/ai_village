/**
 * Courtship Paradigms
 *
 * Defines species-specific courtship protocols and mating behaviors.
 * Data is loaded from JSON files.
 */

import type { CourtshipParadigm } from './types';
import paradigmsData from '../../data/courtship-paradigms.json';

// ============================================================================
// Load Paradigms from JSON
// ============================================================================

function loadParadigmsFromJSON(): Record<string, CourtshipParadigm> {
  // Validate that the JSON has the expected structure
  if (!paradigmsData || typeof paradigmsData !== 'object') {
    throw new Error('Invalid paradigms data: expected an object');
  }

  const requiredSpecies = ['human', 'dwarf', 'bird_folk', 'mystif', 'elf', 'default'];
  for (const species of requiredSpecies) {
    if (!(species in paradigmsData)) {
      throw new Error(`Invalid paradigms data: missing paradigm for ${species}`);
    }
  }

  return paradigmsData as Record<string, CourtshipParadigm>;
}

const loadedParadigms = loadParadigmsFromJSON();

// ============================================================================
// Export Individual Paradigms
// ============================================================================

export const HUMAN_COURTSHIP_PARADIGM: CourtshipParadigm = loadedParadigms.human!;
export const DWARF_COURTSHIP_PARADIGM: CourtshipParadigm = loadedParadigms.dwarf!;
export const BIRD_FOLK_COURTSHIP_PARADIGM: CourtshipParadigm = loadedParadigms.bird_folk!;
export const MYSTIF_COURTSHIP_PARADIGM: CourtshipParadigm = loadedParadigms.mystif!;
export const ELF_COURTSHIP_PARADIGM: CourtshipParadigm = loadedParadigms.elf!;
export const DEFAULT_COURTSHIP_PARADIGM: CourtshipParadigm = loadedParadigms.default!;

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
