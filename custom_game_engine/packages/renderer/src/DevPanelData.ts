/**
 * DevPanel Data Generators - Paradigm, divine resource, and skill tree generation
 */

import type { MagicParadigm } from '@ai-village/magic';
import {
  CORE_PARADIGM_REGISTRY,
  ANIMIST_PARADIGM_REGISTRY,
  WHIMSICAL_PARADIGM_REGISTRY,
  NULL_PARADIGM_REGISTRY,
  DIMENSIONAL_PARADIGM_REGISTRY,
  HYBRID_PARADIGM_REGISTRY,
} from '@ai-village/magic';
import {
  POWER_TIER_THRESHOLDS,
  BELIEF_GENERATION_RATES,
} from '@ai-village/divinity';
import type { DevParadigmData, DevDivineResource, DevSkillTree } from './DevPanelTypes.js';

// ============================================================================
// Paradigm Data Generation
// ============================================================================

/**
 * Extract mana type from a MagicParadigm's sources.
 * Falls back to the first source's name or the paradigm id.
 */
function getManaType(paradigm: MagicParadigm): string {
  if (paradigm.sources && paradigm.sources.length > 0) {
    const firstSource = paradigm.sources[0];
    if (!firstSource) return paradigm.id;

    // Try to get id, name, or fallback to type
    if ('id' in firstSource && firstSource.id) {
      return firstSource.id;
    }
    if ('name' in firstSource && firstSource.name) {
      return firstSource.name.toLowerCase().replace(/\s+/g, '_');
    }
    if ('type' in firstSource) {
      return String(firstSource.type);
    }
  }
  return paradigm.id;
}

/**
 * Convert a MagicParadigm from the registry to DevPanel format.
 */
function paradigmToDevData(paradigm: MagicParadigm, category: string): DevParadigmData {
  // Determine default maxMana based on source type
  let maxMana = 100;
  if (paradigm.sources && paradigm.sources.length > 0) {
    const sourceType = paradigm.sources[0]?.type;
    // Some source types have different defaults
    if (sourceType === 'material') maxMana = 20;
    if (sourceType === 'temporal') maxMana = 80;
    if (sourceType === 'void') maxMana = 50;
  }

  // Null paradigms often have 0 max
  const isNull = category === 'null';
  if (isNull && (paradigm.id === 'null' || paradigm.id === 'dead')) {
    maxMana = 0;
  }

  return {
    id: paradigm.id,
    name: paradigm.name,
    enabled: false,
    active: false,
    manaType: getManaType(paradigm),
    mana: 0,
    maxMana,
    category,
  };
}

/**
 * Generate all paradigms from the registries.
 * This ensures the UI automatically includes any new paradigms added to the registries.
 */
export function generateParadigmList(): DevParadigmData[] {
  const paradigms: DevParadigmData[] = [];
  const seen = new Set<string>();

  // Helper to add paradigms from a registry
  const addFromRegistry = (
    registry: Record<string, MagicParadigm>,
    category: string
  ) => {
    for (const paradigm of Object.values(registry)) {
      if (!seen.has(paradigm.id)) {
        seen.add(paradigm.id);
        paradigms.push(paradigmToDevData(paradigm, category));
      }
    }
  };

  // Add from all registries in order
  addFromRegistry(CORE_PARADIGM_REGISTRY, 'core');
  addFromRegistry(ANIMIST_PARADIGM_REGISTRY, 'animist');
  addFromRegistry(WHIMSICAL_PARADIGM_REGISTRY, 'whimsical');
  addFromRegistry(NULL_PARADIGM_REGISTRY, 'null');
  addFromRegistry(DIMENSIONAL_PARADIGM_REGISTRY, 'dimensional');
  addFromRegistry(HYBRID_PARADIGM_REGISTRY, 'hybrid');

  return paradigms;
}

// ============================================================================
// Divine Resource Generation
// ============================================================================

/**
 * Generate divine resources from the core divinity types.
 * This ensures the UI automatically reflects any new divine mechanics.
 */
export function generateDivineResources(): DevDivineResource[] {
  const resources: DevDivineResource[] = [];

  // Core belief resource (using highest tier threshold as max)
  const maxBeliefFromTiers = Math.max(...(Object.values(POWER_TIER_THRESHOLDS) as number[]));
  resources.push({
    id: 'belief',
    name: 'Belief',
    value: 0,
    min: 0,
    max: maxBeliefFromTiers * 2, // Allow twice the world_shaping threshold
    section: 'divinity',
    category: 'belief',
  });

  // Belief rate (based on belief activities)
  const maxBeliefRate = Math.max(...(Object.values(BELIEF_GENERATION_RATES) as number[])) * 100; // Scaled for multiple believers
  resources.push({
    id: 'beliefRate',
    name: 'Belief/Hour',
    value: 0,
    min: 0,
    max: Math.ceil(maxBeliefRate),
    section: 'divinity',
    category: 'belief',
  });

  // Divine energy (from DivineAbilityComponent)
  resources.push({
    id: 'divine_energy',
    name: 'Divine Energy',
    value: 0,
    min: 0,
    max: 1000, // Will be updated from actual maxDivineEnergy
    section: 'divinity',
    category: 'energy',
  });

  // Power tier thresholds as resources (shows current belief relative to tiers)
  const tierOrder = ['dormant', 'minor', 'moderate', 'major', 'supreme', 'world_shaping'] as const;
  for (const tier of tierOrder) {
    if (tier === 'dormant') continue; // Skip dormant
    resources.push({
      id: `tier_${tier}`,
      name: `${tier.charAt(0).toUpperCase() + tier.slice(1).replace('_', ' ')} Tier`,
      value: POWER_TIER_THRESHOLDS[tier],
      min: 0,
      max: POWER_TIER_THRESHOLDS[tier],
      section: 'divinity',
      category: 'power_tier',
    });
  }

  // Divine entity counts
  resources.push({
    id: 'believers',
    name: 'Believer Count',
    value: 0,
    min: 0,
    max: 1000,
    section: 'divinity',
    category: 'entity',
  });

  resources.push({
    id: 'angels',
    name: 'Angel Count',
    value: 0,
    min: 0,
    max: 20,
    section: 'divinity',
    category: 'entity',
  });

  // Divine attributes
  resources.push({
    id: 'benevolence',
    name: 'Benevolence',
    value: 0,
    min: -100,
    max: 100,
    section: 'divinity',
    category: 'attribute',
  });

  resources.push({
    id: 'wrath',
    name: 'Wrathfulness',
    value: 0,
    min: 0,
    max: 100,
    section: 'divinity',
    category: 'attribute',
  });

  resources.push({
    id: 'mysteriousness',
    name: 'Mysteriousness',
    value: 0,
    min: 0,
    max: 100,
    section: 'divinity',
    category: 'attribute',
  });

  return resources;
}

// ============================================================================
// Skill Tree Generation
// ============================================================================

/**
 * Generate skill trees from paradigms.
 * Creates a skill tree entry for each paradigm (skill progression is paradigm-based).
 */
export function generateSkillTrees(paradigms: DevParadigmData[]): DevSkillTree[] {
  return paradigms.map(paradigm => ({
    id: paradigm.id,
    name: paradigm.name,
    xp: 0,
    level: 0,
  }));
}

// ============================================================================
// Pre-generated Data
// ============================================================================

// Dynamically generated paradigm list from all registries
export const PARADIGMS = generateParadigmList();

// Dynamically generated divine resources from divinity types
export const DIVINE_RESOURCES = generateDivineResources();

// Dynamically generated skill trees from paradigms
export const SKILL_TREES = generateSkillTrees(PARADIGMS);
