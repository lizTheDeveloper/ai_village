/**
 * CoreParadigms - Foundational magic paradigms for different universe types
 *
 * These are the classical, widely-used magical traditions that form the
 * foundation of most fantasy magic systems: academic wizardry, divine miracles,
 * blood magic, true names, pacts, breath-based awakening, and emotional power.
 *
 * Data is now loaded from JSON files for easier maintenance.
 */

import type { MagicParadigm } from './MagicParadigm.js';
import { loadCoreParadigms } from './data-loader.js';

// Load paradigms from JSON
const LOADED_PARADIGMS = loadCoreParadigms();

// Export individual paradigms for backward compatibility
export const ACADEMIC_PARADIGM: MagicParadigm = LOADED_PARADIGMS.academic!;
export const PACT_PARADIGM: MagicParadigm = LOADED_PARADIGMS.pact!;
export const NAME_PARADIGM: MagicParadigm = LOADED_PARADIGMS.names!;
export const BREATH_PARADIGM: MagicParadigm = LOADED_PARADIGMS.breath!;
export const DIVINE_PARADIGM: MagicParadigm = LOADED_PARADIGMS.divine!;
export const BLOOD_PARADIGM: MagicParadigm = LOADED_PARADIGMS.blood!;
export const EMOTIONAL_PARADIGM: MagicParadigm = LOADED_PARADIGMS.emotional!;

// ============================================================================
// Core Paradigm Registry
// ============================================================================

/** All core paradigms - foundational magic systems */
export const CORE_PARADIGM_REGISTRY: Record<string, MagicParadigm> = LOADED_PARADIGMS;

/**
 * Get a core paradigm by ID.
 */
export function getCoreParadigm(id: string): MagicParadigm {
  const paradigm = CORE_PARADIGM_REGISTRY[id];
  if (!paradigm) {
    throw new Error(`Unknown core paradigm: ${id}. Available: ${Object.keys(CORE_PARADIGM_REGISTRY).join(', ')}`);
  }
  return paradigm;
}

/**
 * Get all core paradigm IDs.
 */
export function getCoreParadigmIds(): string[] {
  return Object.keys(CORE_PARADIGM_REGISTRY);
}

/**
 * Find core paradigms for a universe.
 */
export function getCoreParadigmsForUniverse(universeId: string): MagicParadigm[] {
  return Object.values(CORE_PARADIGM_REGISTRY).filter(p => p.universeIds.includes(universeId));
}
