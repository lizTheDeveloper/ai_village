/**
 * Lazy Research Loader
 *
 * Defers research registration until first access to reduce startup time.
 * Research is only loaded when:
 * - Research panel/tech tree opens
 * - Research query is made
 * - Research system needs tech tree data
 */

import { ResearchRegistry } from './ResearchRegistry.js';
import { registerDefaultResearch } from './defaultResearch.js';

// Track if research has been loaded
let researchLoaded = false;

/**
 * Ensure default research is loaded (idempotent).
 * Returns immediately if already loaded, otherwise loads research once.
 */
export function ensureResearchLoaded(registry: ResearchRegistry = ResearchRegistry.getInstance()): void {
  if (researchLoaded) {
    return;
  }

  registerDefaultResearch(registry);
  researchLoaded = true;
}

/**
 * Check if research has been loaded (synchronous).
 */
export function isResearchLoaded(): boolean {
  return researchLoaded;
}

/**
 * Reset lazy loading state (for testing).
 */
export function resetResearchLoader(): void {
  researchLoaded = false;
}
