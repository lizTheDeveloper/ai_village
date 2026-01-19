/**
 * Courtship Tactics Registry
 *
 * Defines all available courtship tactics that agents can use.
 * Data is loaded from JSON files.
 */

import type { CourtshipTactic } from './types';
import tacticsData from '../data/courtship-tactics.json';

// ============================================================================
// Load Tactics from JSON
// ============================================================================

function loadTacticsFromJSON(): {
  universal: CourtshipTactic[];
  dwarf: CourtshipTactic[];
  bird_folk: CourtshipTactic[];
  mystif: CourtshipTactic[];
  negative: CourtshipTactic[];
} {
  // Validate that the JSON has the expected structure
  if (!tacticsData.universal || !Array.isArray(tacticsData.universal)) {
    throw new Error('Invalid tactics data: missing or invalid universal tactics');
  }
  if (!tacticsData.dwarf || !Array.isArray(tacticsData.dwarf)) {
    throw new Error('Invalid tactics data: missing or invalid dwarf tactics');
  }
  if (!tacticsData.bird_folk || !Array.isArray(tacticsData.bird_folk)) {
    throw new Error('Invalid tactics data: missing or invalid bird_folk tactics');
  }
  if (!tacticsData.mystif || !Array.isArray(tacticsData.mystif)) {
    throw new Error('Invalid tactics data: missing or invalid mystif tactics');
  }
  if (!tacticsData.negative || !Array.isArray(tacticsData.negative)) {
    throw new Error('Invalid tactics data: missing or invalid negative tactics');
  }

  return {
    universal: tacticsData.universal as CourtshipTactic[],
    dwarf: tacticsData.dwarf as CourtshipTactic[],
    bird_folk: tacticsData.bird_folk as CourtshipTactic[],
    mystif: tacticsData.mystif as CourtshipTactic[],
    negative: tacticsData.negative as CourtshipTactic[],
  };
}

const loadedTactics = loadTacticsFromJSON();

// ============================================================================
// Export Tactic Collections
// ============================================================================

export const UNIVERSAL_TACTICS: CourtshipTactic[] = loadedTactics.universal;
export const DWARF_TACTICS: CourtshipTactic[] = loadedTactics.dwarf;
export const BIRD_FOLK_TACTICS: CourtshipTactic[] = loadedTactics.bird_folk;
export const MYSTIF_TACTICS: CourtshipTactic[] = loadedTactics.mystif;
export const NEGATIVE_TACTICS: CourtshipTactic[] = loadedTactics.negative;

// ============================================================================
// Tactic Registry
// ============================================================================

export const ALL_TACTICS: CourtshipTactic[] = [
  ...UNIVERSAL_TACTICS,
  ...DWARF_TACTICS,
  ...BIRD_FOLK_TACTICS,
  ...MYSTIF_TACTICS,
  ...NEGATIVE_TACTICS,
];

export const TACTICS_BY_ID = new Map<string, CourtshipTactic>(
  ALL_TACTICS.map((t) => [t.id, t])
);

export function getTactic(id: string): CourtshipTactic | undefined {
  return TACTICS_BY_ID.get(id);
}

export function getTacticsByCategory(category: string): CourtshipTactic[] {
  return ALL_TACTICS.filter((t) => t.category === category);
}

export function getTacticsForSpecies(species: string): CourtshipTactic[] {
  const tactics = [...UNIVERSAL_TACTICS];

  switch (species.toLowerCase()) {
    case 'dwarf':
      tactics.push(...DWARF_TACTICS);
      break;
    case 'bird_folk':
    case 'avian':
      tactics.push(...BIRD_FOLK_TACTICS);
      break;
    case 'mystif':
      tactics.push(...MYSTIF_TACTICS);
      break;
  }

  return tactics;
}
