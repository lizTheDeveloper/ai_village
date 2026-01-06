/**
 * Spells JSON Loader
 *
 * Phase 3: Content Extraction
 * Provides type-safe access to spells.json
 */

import type { SpellDefinition } from '../magic/SpellRegistry.js';
import spellsData from '../../../../data/spells.json';

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

// Cast JSON data to typed interface
const typedSpellsData = spellsData as unknown as SpellsData;

/**
 * Get all spells for a specific paradigm
 */
export function getSpellsByParadigm(paradigmId: keyof SpellsData['paradigms']): SpellDefinition[] {
  return typedSpellsData.paradigms[paradigmId] || [];
}

/**
 * Get all spells across all paradigms
 */
export function getAllSpells(): SpellDefinition[] {
  return Object.values(typedSpellsData.paradigms).flat();
}

/**
 * Get a specific spell by ID
 */
export function getSpellById(id: string): SpellDefinition | undefined {
  return getAllSpells().find(spell => spell.id === id);
}

// Export arrays for backward compatibility
export const DIVINE_SPELLS = typedSpellsData.paradigms.divine;
export const ACADEMIC_SPELLS = typedSpellsData.paradigms.academic;
export const BLOOD_SPELLS = typedSpellsData.paradigms.blood;
export const NAME_SPELLS = typedSpellsData.paradigms.names;
export const BREATH_SPELLS = typedSpellsData.paradigms.breath;
export const PACT_SPELLS = typedSpellsData.paradigms.pact;
