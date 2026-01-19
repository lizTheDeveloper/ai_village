/**
 * Data Loader - Loads magic paradigm data from JSON files
 *
 * This module provides functions to load paradigm data from external JSON files
 * instead of hardcoding them in TypeScript. This separates data from code and
 * makes the data easier to maintain and modify.
 */

import type { MagicParadigm } from './MagicParadigm.js';
import coreParadigmsData from '../data/core-paradigms.json';
import animistData from '../data/animist-paradigms.json';
import creativeParadigmsData from '../data/creative-paradigms.json';

/**
 * Load and validate a paradigm from JSON data
 */
function validateParadigm(data: any): MagicParadigm {
  // Basic validation - ensure required fields exist
  if (!data.id || !data.name || !data.description) {
    throw new Error(`Invalid paradigm data: missing required fields (id, name, or description)`);
  }

  return data as MagicParadigm;
}

/**
 * Load core paradigms from JSON
 */
export function loadCoreParadigms(): Record<string, MagicParadigm> {
  const paradigms: Record<string, MagicParadigm> = {};

  for (const [key, data] of Object.entries(coreParadigmsData)) {
    paradigms[key] = validateParadigm(data);
  }

  return paradigms;
}

/**
 * Get example kami from JSON data
 */
export function loadExampleKami(): any[] {
  return animistData.example_kami || [];
}

/**
 * Get allomantic metals from JSON data
 */
export function loadAllomanticMetals(): any[] {
  return animistData.allomantic_metals || [];
}

/**
 * Load animist paradigms from JSON
 */
export function loadAnimistParadigms(): Record<string, MagicParadigm> {
  const paradigms: Record<string, MagicParadigm> = {};

  for (const [key, data] of Object.entries(animistData)) {
    // Skip helper data (example_kami, allomantic_metals)
    if (key === 'example_kami' || key === 'allomantic_metals') {
      continue;
    }
    paradigms[key] = validateParadigm(data);
  }

  return paradigms;
}

/**
 * Load creative paradigms from JSON
 */
export function loadCreativeParadigms(): Record<string, MagicParadigm> {
  const paradigms: Record<string, MagicParadigm> = {};

  for (const [key, data] of Object.entries(creativeParadigmsData)) {
    paradigms[key] = validateParadigm(data);
  }

  return paradigms;
}
