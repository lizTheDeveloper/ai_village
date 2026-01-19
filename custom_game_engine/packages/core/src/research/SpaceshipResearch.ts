/**
 * SpaceshipResearch - Research definitions for spaceship technology
 *
 * Tech tree for unlocking spaceship types and components.
 * Follows the progression from spaceships-and-vr-spec.md:
 *
 * Tier 1: Basic Spaceflight (worldships, physical propulsion)
 * Tier 2: β-Space Awareness (threshold ships, emotional navigation)
 * Tier 3: Advanced Navigation (story ships, gleisner vessels)
 * Tier 4: Specialized Ships (svetz retrieval, probability scouts)
 * Tier 5: Reality Engineering (timeline mergers)
 *
 * Based on dimensional awareness levels:
 * - Stage 1: Pre-temporal (material space only)
 * - Stage 2: Temporal awareness (β-space navigation)
 * - Stage 3: Multi-dimensional (probability manipulation)
 */

import type { ResearchDefinition } from './types.js';
import researchData from '../../data/research/spaceship.json';

/**
 * Load spaceflight research from JSON data
 */
function loadSpaceflightResearch(): ResearchDefinition[] {
  if (!Array.isArray(researchData)) {
    throw new Error('Failed to load spaceflight research: data is not an array');
  }
  return researchData as ResearchDefinition[];
}

// ============================================================================
// Export All Research
// ============================================================================

export const SPACEFLIGHT_RESEARCH: ResearchDefinition[] = loadSpaceflightResearch();

// Individual exports for backward compatibility
export const BASIC_PROPULSION = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_basic_propulsion')!;
export const WORLDSHIP_DESIGN = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_worldship')!;
export const LIFE_SUPPORT_SYSTEMS = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_life_support')!;
export const EMOTIONAL_TOPOLOGY = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_emotional_topology')!;
export const THRESHOLD_SHIP = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_threshold_ship')!;
export const COURIER_SHIP = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_courier_ship')!;
export const BRAINSHIP_SYMBIOSIS = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_brainship')!;
export const THE_HEART = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_the_heart')!;
export const MEDITATION_CHAMBERS = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_meditation_chambers')!;
export const STORY_SHIP = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_story_ship')!;
export const GLEISNER_VESSEL = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_gleisner_vessel')!;
export const MEMORY_HALLS = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_memory_halls')!;
export const EMOTION_THEATERS = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_emotion_theaters')!;
export const SVETZ_RETRIEVAL = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_svetz_retrieval')!;
export const PROBABILITY_SCOUT = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_probability_scout')!;
export const TIMELINE_MERGER = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_timeline_merger')!;
export const SHIPYARD_CONSTRUCTION = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_shipyard')!;
export const ADVANCED_SHIPYARD = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_advanced_shipyard')!;
export const VR_SYSTEMS = SPACEFLIGHT_RESEARCH.find((r) => r.id === 'spaceflight_vr_systems')!;

/**
 * Register all spaceflight research with the ResearchRegistry.
 */
export function registerSpaceflightResearch(): void {
  // Dynamically import to avoid circular dependency
  import('./ResearchRegistry.js').then(({ ResearchRegistry }) => {
    const registry = ResearchRegistry.getInstance();
    for (const research of SPACEFLIGHT_RESEARCH) {
      if (!registry.has(research.id)) {
        registry.register(research);
      }
    }
  });
}
