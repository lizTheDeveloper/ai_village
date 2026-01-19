/**
 * Spells JSON Loader
 *
 * Phase 3: Content Extraction
 * Provides type-safe access to spells.json with lazy loading
 */

import type { SpellDefinition } from '../magic/SpellRegistry.js';

export interface SpellsData {
  version: string;
  generatedAt: string;
  source: string;
  paradigms: {
    divine: SpellDefinition[];
    academic: SpellDefinition[];
    blood: SpellDefinition[];
    names: SpellDefinition[];
    breath: SpellDefinition[];
    pact: SpellDefinition[];
  };
}

// Lazy-loaded data cache
let typedSpellsData: SpellsData | null = null;

/**
 * Load spells data on first access
 */
function loadSpellsData(): SpellsData {
  if (!typedSpellsData) {
    const spellsData = require('../../../../data/spells.json');
    typedSpellsData = spellsData as unknown as SpellsData;
  }
  return typedSpellsData;
}

/**
 * Get all spells for a specific paradigm
 */
export function getSpellsByParadigm(paradigmId: keyof SpellsData['paradigms']): SpellDefinition[] {
  const data = loadSpellsData();
  return data.paradigms[paradigmId] || [];
}

/**
 * Get all spells across all paradigms
 */
export function getAllSpells(): SpellDefinition[] {
  const data = loadSpellsData();
  return Object.values(data.paradigms).flat();
}

/**
 * Get a specific spell by ID
 */
export function getSpellById(id: string): SpellDefinition | undefined {
  return getAllSpells().find(spell => spell.id === id);
}

// Lazy getter functions for backward compatibility
export function getDivineSpells(): SpellDefinition[] {
  return getSpellsByParadigm('divine');
}

export function getAcademicSpells(): SpellDefinition[] {
  return getSpellsByParadigm('academic');
}

export function getBloodSpells(): SpellDefinition[] {
  return getSpellsByParadigm('blood');
}

export function getNameSpells(): SpellDefinition[] {
  return getSpellsByParadigm('names');
}

export function getBreathSpells(): SpellDefinition[] {
  return getSpellsByParadigm('breath');
}

export function getPactSpells(): SpellDefinition[] {
  return getSpellsByParadigm('pact');
}

// Deprecated: Use getter functions instead
// These are kept for backward compatibility but trigger lazy loading
Object.defineProperty(exports, 'DIVINE_SPELLS', { get: getDivineSpells });
Object.defineProperty(exports, 'ACADEMIC_SPELLS', { get: getAcademicSpells });
Object.defineProperty(exports, 'BLOOD_SPELLS', { get: getBloodSpells });
Object.defineProperty(exports, 'NAME_SPELLS', { get: getNameSpells });
Object.defineProperty(exports, 'BREATH_SPELLS', { get: getBreathSpells });
Object.defineProperty(exports, 'PACT_SPELLS', { get: getPactSpells });
