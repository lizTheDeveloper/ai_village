/**
 * City Generator Types
 *
 * Type definitions for the city generation system.
 */

import type { VoxelBuildingDefinition } from '../types.js';

// =============================================================================
// CITY TYPES
// =============================================================================

export type CityType =
  | 'grid'           // Planned human city with orthogonal streets
  | 'organic'        // Medieval organic growth
  | 'flying'         // Vertical city for flying creatures
  | 'non_euclidean'  // impossible geometry
  | 'dwarven'        // Underground vertical fortress (Dwarf Fortress homage)
  | 'literary'       // Underground literary realm (The Footnotes, Libraries)
  // Alien & Fantastical
  | 'crystalline'    // Geometric crystal lattice with resonance chambers
  | 'hive'           // Insectoid hexagonal cells and pheromone highways
  | 'fungal'         // Mycelium network with spore towers
  | 'aquatic'        // Underwater bubble domes and current highways
  | 'temporal'       // Exists across multiple time periods simultaneously
  | 'dream'          // Surreal Escher-like shifting architecture
  | 'void'           // Floating fragments in the space between stars
  | 'symbiotic'      // Living organism that IS the city
  | 'fractal'        // Self-similar recursive patterns at every scale
  | 'musical';       // Built from solidified sound and harmonic resonance

export type CitySize = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

export type DistrictType =
  | 'civic'        // Town hall, temples, schools
  | 'market'       // Shops, taverns, trading posts
  | 'residential'  // Houses of various tiers
  | 'industrial'   // Forges, workshops, tanneries
  | 'research'     // Libraries, labs, observatories
  | 'agricultural' // Farms, barns, mills
  | 'storage'      // Warehouses, silos, granaries
  | 'military'     // Barracks, armory, guard posts
  | 'slums'        // Poor housing
  | 'wealthy'      // Rich housing, manors
  // Dwarven underground
  | 'mine'         // Mining tunnels and ore extraction
  | 'forge'        // Magma forges, metalworking
  | 'greathall'    // Grand dining and meeting halls
  | 'crafthall'    // Workshops for skilled crafts
  | 'mushroom_farm' // Underground fungal farms
  // Literary underground
  | 'library'      // The great libraries and archives
  | 'margins'      // Space between written lines
  | 'footnotes'    // Underground realm of citations
  | 'typo_void'    // Chaotic misspelled realm
  | 'scriptorium'  // Where books are written
  // Crystalline districts
  | 'resonance_chamber'  // Harmonic frequency zones
  | 'prism_core'         // Central light-splitting nexus
  | 'facet_housing'      // Geometric living spaces
  | 'refraction_lab'     // Light manipulation research
  // Hive districts
  | 'brood_chamber'      // Where larvae grow
  | 'royal_cell'         // Queen's domain
  | 'worker_warren'      // Dense worker housing
  | 'nectar_store'       // Resource storage
  | 'pheromone_hub'      // Communication center
  // Fungal districts
  | 'mycelium_network'   // Underground connections
  | 'spore_tower'        // Reproduction/communication
  | 'decomposition_pit'  // Breaking down matter
  | 'fruiting_body'      // Surface structures
  // Aquatic districts
  | 'bubble_dome'        // Air-filled living spaces
  | 'kelp_forest'        // Farming/oxygen production
  | 'pressure_lock'      // Entry/exit zones
  | 'current_channel'    // Transportation highways
  | 'abyssal_shrine'     // Deep religious sites
  // Temporal districts
  | 'past_echo'          // Ruins of what was
  | 'present_anchor'     // Stable current moment
  | 'future_shadow'      // What may yet be
  | 'chrono_nexus'       // Time manipulation center
  | 'paradox_zone'       // Unstable temporal region
  // Dream districts
  | 'lucid_plaza'        // Clear, controlled space
  | 'nightmare_quarter'  // Dark twisted areas
  | 'memory_palace'      // Stored experiences
  | 'impossible_stair'   // Escher architecture
  | 'waking_edge'        // Boundary with reality
  // Void districts
  | 'gravity_anchor'     // Stable platform
  | 'star_dock'          // Arrival/departure
  | 'void_garden'        // Growing in nothing
  | 'silence_temple'     // Religious/meditative
  | 'tether_station'     // Connections between fragments
  // Symbiotic districts
  | 'heart_chamber'      // Central pumping organ
  | 'neural_cluster'     // Decision making center
  | 'digestion_tract'    // Processing/manufacturing
  | 'membrane_quarter'   // Outer protective layer
  | 'growth_bud'         // Expansion zones
  // Fractal districts
  | 'seed_pattern'       // Core recursive motif
  | 'iteration_ring'     // Repeating boundary
  | 'scale_bridge'       // Connects different sizes
  | 'infinity_edge'      // Where pattern continues forever
  // Musical districts
  | 'harmony_hall'       // Central consonance
  | 'rhythm_quarter'     // Percussion/timing
  | 'melody_spire'       // High-pitched structures
  | 'bass_foundation'    // Deep vibration base
  | 'dissonance_pit';    // Experimental/unstable

// =============================================================================
// POSITION TYPES
// =============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface Position3D extends Position {
  z: number;  // Altitude for flying cities
}

// =============================================================================
// CITY STRUCTURES
// =============================================================================

export interface Plot {
  id: string;
  bounds: { x: number; y: number; width: number; height: number };
  districtType: DistrictType;
  building?: VoxelBuildingDefinition;
  rotation?: 0 | 90 | 180 | 270;
}

export interface Street {
  id: string;
  points: Position[];
  width: number;
  type: 'arterial' | 'collector' | 'local' | 'alley';
}

export interface District {
  id: string;
  type: DistrictType;
  bounds: { x: number; y: number; width: number; height: number };
  plots: Plot[];
}

export interface CityLayout {
  width: number;
  height: number;
  grid: string[][];  // ASCII representation
  districts: District[];
  streets: Street[];
  plots: Plot[];
}

export interface CitySpec {
  type: CityType;
  size: CitySize;
  species: import('../types.js').BuilderSpecies;
  name?: string;
  seed?: number;
  // Optional overrides
  districtWeights?: Partial<Record<DistrictType, number>>;
  wallsEnabled?: boolean;
  gatesCount?: number;
}

export interface GeneratedCity {
  spec: CitySpec;
  layout: CityLayout;
  buildings: VoxelBuildingDefinition[];
  ascii: string;  // Full ASCII representation
  stats: {
    totalBuildings: number;
    totalPlots: number;
    districtCounts: Record<DistrictType, number>;
    streetLength: number;
  };
  /** City-level Feng Shui harmony analysis */
  harmony?: import('../city-feng-shui.js').CityHarmonyAnalysis;
}

// =============================================================================
// FLYING CITY SPECIFIC
// =============================================================================

export interface FlyingCityConfig {
  altitudeBands: {
    elite: { min: number; max: number };
    residential: { min: number; max: number };
    commerce: { min: number; max: number };
    ground: { min: number; max: number };
  };
  landingPadSize: number;
  flightLaneWidth: number;
}

export interface FlyingPlot extends Plot {
  altitude: number;
  hasLandingPad: boolean;
  connectedTo: string[];  // IDs of connected plots (flight lanes)
}

// =============================================================================
// NON-EUCLIDEAN SPECIFIC
// =============================================================================

export interface NonEuclideanPlot extends Plot {
  phase: number;  // Which phase this plot appears in (0 = all phases)
  viewpointVariants: Map<string, string[]>;  // Different layouts from different angles
  portalConnections: Array<{ targetPlotId: string; visualDistortion: string }>;
  sanityDrain: number;  // 0-10
}

// =============================================================================
// DWARVEN SPECIFIC
// =============================================================================

export interface DwarvenLevel {
  z: number;
  name: string;
  districts: DistrictType[];
  char: string;
}
