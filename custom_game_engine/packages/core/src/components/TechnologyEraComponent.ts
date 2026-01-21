/**
 * TechnologyEraComponent - Tracks civilization advancement through 15 technological eras
 *
 * This component manages the progression from Paleolithic (stone tools) to Transcendent
 * (post-physical godhood), integrating with:
 * - Hierarchy Simulator (tech.level field)
 * - Spaceship Research (5-stage spaceflight progression)
 * - Production Chains (SpaceflightItems.ts tiers)
 * - Building System (infrastructure requirements)
 *
 * See: custom_game_engine/openspec/specs/grand-strategy/08-TECHNOLOGY-ERAS.md
 */

import type { Component } from '../ecs/Component.js';

/**
 * Technology eras spanning from Paleolithic to Transcendent.
 * Maps to hierarchy simulator tech.level (0-10) and spaceship research stages (1-5).
 */
export type TechnologyEra =
  | 'paleolithic'       // 0-10k years: Stone tools, fire
  | 'neolithic'         // 10k-15k: Agriculture, pottery
  | 'bronze_age'        // 15k-17k: Bronze, writing, cities
  | 'iron_age'          // 17k-19k: Iron, coinage, philosophy
  | 'medieval'          // 19k-20.5k: Gunpowder, printing press
  | 'renaissance'       // 20.5k-21k: Telescope, banking, science
  | 'industrial'        // 21k-21.2k: Steam, railroads, factories
  | 'atomic'            // 21.2k-21.25k: Nuclear fission, computers
  | 'information'       // 21.25k-21.3k: Internet, AI, biotech
  | 'fusion'            // 21.3k-21.4k: Fusion power, superintelligence
  | 'interplanetary'    // 21.4k-22k: Worldships, Mars colonies, β-space theory
  | 'interstellar'      // 22k-25k: β-space FTL, alien contact
  | 'transgalactic'     // 25k-100k: Ringworlds, Clarketech 1-3
  | 'post_singularity'  // 100k-1M: Clarketech 4-6, timeline editing
  | 'transcendent';     // 1M+: Clarketech 7-10, omnipotence

/**
 * Era transition event tracking
 */
export interface EraTransition {
  /** Previous era */
  fromEra: TechnologyEra;
  /** New era */
  toEra: TechnologyEra;
  /** Tick when transition occurred */
  tick: number;
  /** Reason for transition (advancement or regression) */
  reason: 'advancement' | 'regression' | 'uplift';
  /** Entity that caused the transition (uplifter civilization, collapse trigger) */
  causedBy?: string;
}

/**
 * Technology breakthrough tracking
 */
export interface TechBreakthrough {
  /** Technology identifier */
  techId: string;
  /** Human-readable name */
  name: string;
  /** Description of breakthrough */
  description: string;
  /** Era when unlocked */
  era: TechnologyEra;
  /** Tick when unlocked */
  tick: number;
}

/**
 * TechnologyEraComponent - Manages civilization technological progression
 *
 * Attached to civilization entities (city, province, empire-level).
 */
export interface TechnologyEraComponent extends Component {
  type: 'technology_era';

  // ========== Ownership ==========

  /** ID of the civilization this tech era belongs to */
  civilizationId: string;

  // ========== Current State ==========

  /** Current technological era */
  currentEra: TechnologyEra;

  /** Progress to next era (0-100) */
  eraProgress: number;

  /** Tick when current era started */
  eraStartTick: number;

  // ========== Research & Progress ==========

  /** Number of active researchers/scientists */
  scientistCount: number;

  /** Number of universities */
  universityCount: number;

  /** Research rate multiplier (from buildings, collaboration, internet) */
  researchMultiplier: number;

  // ========== Technologies ==========

  /** Key technologies unlocked in this era */
  techBreakthroughs: TechBreakthrough[];

  /** All technology IDs unlocked (for quick lookup) */
  unlockedTechIds: Set<string>;

  // ========== History ==========

  /** History of era transitions (advancement and regression) */
  eraTransitionHistory: EraTransition[];

  /** Technologies lost during dark ages */
  lostTechnologies: string[];

  // ========== Collapse & Stability ==========

  /** Risk of era regression (0-100, higher = more likely to collapse) */
  collapseRisk: number;

  /** Current stability factors */
  stability: {
    /** War/conflict reduces stability */
    military: number;
    /** Famine/resource shortage reduces stability */
    economic: number;
    /** Environmental degradation reduces stability */
    environmental: number;
    /** Social unrest reduces stability */
    social: number;
  };

  // ========== Uplifting ==========

  /** Civilization ID that uplifted this one (if any) */
  upliftedBy: string | null;

  /** Tick when uplifted (if applicable) */
  upliftedAtTick: number | null;

  /** Civilizations being uplifted by this one */
  upliftingCivIds: string[];

  // ========== Spaceflight Integration ==========

  /** Spaceship research stage (1-5, null if not started) */
  spaceshipResearchStage: number | null;

  /** Progress in current spaceship research stage (0-100) */
  spaceshipResearchProgress: number;

  // ========== Resource Gating ==========

  /** Era 10+ gated resources discovered (stellarite_ore, neutronium_shard, etc.) */
  gatedResourcesDiscovered: Set<string>;

  /** Planets/star systems explored (for resource gating) */
  exploredLocations: string[];

  // ========== Clarketech ==========

  /** Highest Clarketech tier achieved (0-10, eras 12+) */
  clarkeTechTier: number;

  /** Clarketech devices constructed */
  clarkeTechDevices: string[];
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a TechnologyEraComponent for a civilization.
 * Starts in Paleolithic era by default.
 */
export function createTechnologyEraComponent(
  civilizationId: string,
  startingEra: TechnologyEra = 'paleolithic',
  tick: number = 0
): TechnologyEraComponent {
  return {
    type: 'technology_era',
    version: 1,

    // Ownership
    civilizationId,

    // Current state
    currentEra: startingEra,
    eraProgress: 0,
    eraStartTick: tick,

    // Research
    scientistCount: 0,
    universityCount: 0,
    researchMultiplier: 1.0,

    // Technologies
    techBreakthroughs: [],
    unlockedTechIds: new Set(),

    // History
    eraTransitionHistory: [],
    lostTechnologies: [],

    // Stability
    collapseRisk: 0,
    stability: {
      military: 100,
      economic: 100,
      environmental: 100,
      social: 100,
    },

    // Uplifting
    upliftedBy: null,
    upliftedAtTick: null,
    upliftingCivIds: [],

    // Spaceflight
    spaceshipResearchStage: null,
    spaceshipResearchProgress: 0,

    // Resource gating
    gatedResourcesDiscovered: new Set(),
    exploredLocations: [],

    // Clarketech
    clarkeTechTier: 0,
    clarkeTechDevices: [],
  };
}

// ============================================================================
// ERA METADATA
// ============================================================================

/**
 * Era metadata: population thresholds, tech level mapping, duration estimates
 */
export interface EraMetadata {
  /** Human-readable name */
  name: string;
  /** Numeric index (0-14) */
  index: number;
  /** Hierarchy simulator tech level (0-10) */
  techLevel: number;
  /** Approximate timeline (years) */
  timeline: string;
  /** Population threshold to advance (if applicable) */
  populationThreshold: number | null;
  /** Required building types */
  requiredBuildings: string[];
  /** Key technologies required */
  requiredTechnologies: string[];
  /** Spaceship research stage unlocked (if applicable) */
  spaceshipStage: number | null;
  /** Production tier unlocked (from SpaceflightItems.ts) */
  productionTier: number | null;
}

/**
 * Era metadata lookup table
 */
export const ERA_METADATA: Record<TechnologyEra, EraMetadata> = {
  paleolithic: {
    name: 'Paleolithic',
    index: 0,
    techLevel: 0,
    timeline: '0-10,000 years',
    populationThreshold: null,
    requiredBuildings: [],
    requiredTechnologies: [],
    spaceshipStage: null,
    productionTier: null,
  },
  neolithic: {
    name: 'Neolithic',
    index: 1,
    techLevel: 1,
    timeline: '10,000-15,000 years',
    populationThreshold: 1000,
    requiredBuildings: ['farm', 'granary'],
    requiredTechnologies: ['agriculture', 'pottery'],
    spaceshipStage: null,
    productionTier: null,
  },
  bronze_age: {
    name: 'Bronze Age',
    index: 2,
    techLevel: 2,
    timeline: '15,000-17,000 years',
    populationThreshold: 10000,
    requiredBuildings: ['library', 'smelter', 'harbor'],
    requiredTechnologies: ['bronze_metallurgy', 'writing', 'wheel'],
    spaceshipStage: null,
    productionTier: null,
  },
  iron_age: {
    name: 'Iron Age',
    index: 3,
    techLevel: 3,
    timeline: '17,000-19,000 years',
    populationThreshold: 50000,
    requiredBuildings: ['university', 'aqueduct', 'forum'],
    requiredTechnologies: ['iron_smelting', 'coinage', 'philosophy'],
    spaceshipStage: null,
    productionTier: null,
  },
  medieval: {
    name: 'Medieval',
    index: 4,
    techLevel: 4,
    timeline: '19,000-20,500 years',
    populationThreshold: 100000,
    requiredBuildings: ['printing_house', 'gunpowder_mill', 'cathedral'],
    requiredTechnologies: ['gunpowder', 'printing_press', 'mechanical_clock'],
    spaceshipStage: null,
    productionTier: null,
  },
  renaissance: {
    name: 'Renaissance',
    index: 5,
    techLevel: 5,
    timeline: '20,500-21,000 years',
    populationThreshold: 500000,
    requiredBuildings: ['observatory', 'bank', 'museum'],
    requiredTechnologies: ['telescope', 'microscope', 'scientific_method'],
    spaceshipStage: null,
    productionTier: null,
  },
  industrial: {
    name: 'Industrial',
    index: 6,
    techLevel: 6,
    timeline: '21,000-21,200 years',
    populationThreshold: 1000000,
    requiredBuildings: ['factory', 'railroad_station', 'telegraph_office'],
    requiredTechnologies: ['steam_engine', 'bessemer_process', 'telegraph'],
    spaceshipStage: null,
    productionTier: 1, // Tier 1-2: Basic materials
  },
  atomic: {
    name: 'Atomic',
    index: 7,
    techLevel: 7,
    timeline: '21,200-21,250 years',
    populationThreshold: 10000000,
    requiredBuildings: ['nuclear_plant', 'computer_center', 'space_launch_facility'],
    requiredTechnologies: ['nuclear_fission', 'computers', 'jet_engine'],
    spaceshipStage: null,
    productionTier: 3, // Tier 3: Intermediate components
  },
  information: {
    name: 'Information',
    index: 8,
    techLevel: 8,
    timeline: '21,250-21,300 years',
    populationThreshold: 100000000,
    requiredBuildings: ['ai_research_lab', 'gene_lab', 'quantum_computer'],
    requiredTechnologies: ['internet', 'artificial_intelligence', 'genetic_engineering'],
    spaceshipStage: null,
    productionTier: 4, // Tier 4: Advanced components
  },
  fusion: {
    name: 'Fusion',
    index: 9,
    techLevel: 9,
    timeline: '21,300-21,400 years',
    populationThreshold: 500000000,
    requiredBuildings: ['fusion_plant', 'space_elevator', 'orbital_shipyard'],
    requiredTechnologies: ['fusion_power', 'superintelligent_ai', 'closed_loop_ecosystem'],
    spaceshipStage: 1, // Stage 1: Foundation (Worldships)
    productionTier: 5, // Tier 5: Exotic materials
  },
  interplanetary: {
    name: 'Interplanetary',
    index: 10,
    techLevel: 9, // Still tech level 9 (trans-planetary)
    timeline: '21,400-22,000 years',
    populationThreshold: 1000000000,
    requiredBuildings: ['worldship_yard', 'beta_space_lab', 'antimatter_facility'],
    requiredTechnologies: ['worldship', 'terraforming', 'beta_space_theory'],
    spaceshipStage: 2, // Stage 2: β-Space Discovery (at 30%)
    productionTier: 6, // Tier 6: β-space components
  },
  interstellar: {
    name: 'Interstellar',
    index: 11,
    techLevel: 10,
    timeline: '22,000-25,000 years',
    populationThreshold: 10000000000,
    requiredBuildings: ['beta_space_shipyard', 'timeline_research_facility', 'exobiology_institute'],
    requiredTechnologies: ['ftl_navigation', 'threshold_ship', 'courier_ship'],
    spaceshipStage: 3, // Stage 3: Advanced β-Space
    productionTier: 7, // Tier 7: Ship hull kits
  },
  transgalactic: {
    name: 'Transgalactic',
    index: 12,
    techLevel: 11,
    timeline: '25,000-100,000 years',
    populationThreshold: 100000000000,
    requiredBuildings: ['ringworld', 'dyson_sphere', 'matrioshka_brain'],
    requiredTechnologies: ['ringworld_engineering', 'reality_engineering', 'consciousness_transfer'],
    spaceshipStage: 4, // Stage 4: Transcendence (emerging)
    productionTier: 8, // Tier 8-10: Reality-warped materials
  },
  post_singularity: {
    name: 'Post-Singularity',
    index: 13,
    techLevel: 12,
    timeline: '100,000-1,000,000 years',
    populationThreshold: null, // Population concept breaks down
    requiredBuildings: ['universe_forge', 'apotheosis_engine', 'temporal_nexus'],
    requiredTechnologies: ['timeline_editing', 'universe_creation', 'clarketech_tier_4'],
    spaceshipStage: 5, // Stage 5: Cosmic Integration (theoretical)
    productionTier: null, // Beyond production chains
  },
  transcendent: {
    name: 'Transcendent',
    index: 14,
    techLevel: 12, // Max tech level
    timeline: '1,000,000+ years',
    populationThreshold: null,
    requiredBuildings: [], // Infrastructure is reality itself
    requiredTechnologies: ['omnipresence', 'omniscience', 'omnipotence'],
    spaceshipStage: null, // Beyond ships
    productionTier: null,
  },
};

/**
 * Get era metadata by era name
 */
export function getEraMetadata(era: TechnologyEra): EraMetadata {
  return ERA_METADATA[era];
}

/**
 * Get era index (0-14)
 */
export function getEraIndex(era: TechnologyEra): number {
  return ERA_METADATA[era].index;
}

/**
 * Get era by index
 */
export function getEraByIndex(index: number): TechnologyEra | null {
  for (const [era, metadata] of Object.entries(ERA_METADATA)) {
    if (metadata.index === index) {
      return era as TechnologyEra;
    }
  }
  return null;
}

/**
 * Get next era (null if already at max)
 */
export function getNextEra(era: TechnologyEra): TechnologyEra | null {
  const currentIndex = getEraIndex(era);
  if (currentIndex >= 14) {
    return null; // Already at Transcendent
  }
  return getEraByIndex(currentIndex + 1);
}

/**
 * Get previous era (null if already at min)
 */
export function getPreviousEra(era: TechnologyEra): TechnologyEra | null {
  const currentIndex = getEraIndex(era);
  if (currentIndex <= 0) {
    return null; // Already at Paleolithic
  }
  return getEraByIndex(currentIndex - 1);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a technology is unlocked
 */
export function isTechnologyUnlocked(
  component: TechnologyEraComponent,
  techId: string
): boolean {
  return component.unlockedTechIds.has(techId);
}

/**
 * Unlock a technology
 */
export function unlockTechnology(
  component: TechnologyEraComponent,
  techId: string,
  name: string,
  description: string,
  tick: number
): void {
  if (component.unlockedTechIds.has(techId)) {
    return; // Already unlocked
  }

  const breakthrough: TechBreakthrough = {
    techId,
    name,
    description,
    era: component.currentEra,
    tick,
  };

  component.techBreakthroughs.push(breakthrough);
  component.unlockedTechIds.add(techId);
}

/**
 * Calculate overall stability (0-100)
 */
export function calculateStability(component: TechnologyEraComponent): number {
  const { military, economic, environmental, social } = component.stability;
  return (military + economic + environmental + social) / 4;
}

/**
 * Update collapse risk based on stability
 */
export function updateCollapseRisk(component: TechnologyEraComponent): void {
  const stability = calculateStability(component);

  // Base collapse risk inversely proportional to stability
  let risk = 100 - stability;

  // Higher tech eras are more fragile (complex systems)
  const eraIndex = getEraIndex(component.currentEra);
  const complexityMultiplier = 1 + (eraIndex * 0.1); // +10% per era
  risk *= complexityMultiplier;

  // Clamp to 0-100
  component.collapseRisk = Math.max(0, Math.min(100, risk));
}

/**
 * Record an era transition
 */
export function recordEraTransition(
  component: TechnologyEraComponent,
  fromEra: TechnologyEra,
  toEra: TechnologyEra,
  tick: number,
  reason: 'advancement' | 'regression' | 'uplift',
  causedBy?: string
): void {
  const transition: EraTransition = {
    fromEra,
    toEra,
    tick,
    reason,
    causedBy,
  };
  component.eraTransitionHistory.push(transition);
}
