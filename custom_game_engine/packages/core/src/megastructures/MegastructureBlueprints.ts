/**
 * Megastructure Type Definitions and Blueprints
 *
 * Phase 5: Megastructure Construction
 *
 * Defines all megastructure types from orbital stations to transcendent reality anchors.
 * Each blueprint includes requirements, construction phases, capabilities, and risks.
 *
 * Categories:
 * - Orbital (Tech 7-9): Space stations, O'Neill cylinders, Bishop rings
 * - Planetary (Tech 8-9.5): Terraformers, planet crackers, world engines
 * - Stellar (Tech 9-10): Dyson swarms/spheres, stellar engines, star lifters
 * - Galactic (Tech 10): Wormhole gates, matrioshka brains, Birch worlds
 * - Transcendent (Tech 10+): Universe engines, reality anchors, dimensional gates
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MegastructureCategory = 'orbital' | 'planetary' | 'stellar' | 'galactic' | 'transcendent';
export type MegastructureTier = 'planet' | 'system' | 'sector' | 'galaxy';

export interface MegastructurePhase {
  name: string;
  durationPercent: number;  // % of total construction time
  resourcePercent: number;  // % of total resources consumed
  description: string;
}

export interface MegastructureCapabilities {
  populationCapacity?: number;
  energyOutput?: number;  // watts
  defenseRating?: number;
  computationalPower?: number;  // FLOPS
  storageCapacity?: number;  // bytes
  terraformingRate?: number;  // planets per year
  miningRate?: number;  // kg per year
  transportCapacity?: number;  // kg per year
  communicationRange?: number;  // light years
  timelineManipulation?: boolean;
  realityManipulation?: boolean;
}

export interface MegastructurePrerequisites {
  megastructures?: string[];  // Required existing megastructures
  research?: string[];  // Required research
  techLevel?: number;  // Minimum tech level
}

export interface MegastructureBlueprint {
  id: string;
  name: string;
  category: MegastructureCategory;
  tier: MegastructureTier;

  // Requirements
  techLevelRequired: number;
  totalMass: number;  // kg
  constructionTimeYears: number;
  laborRequired: number;  // person-years
  operationTimeYears?: number;  // For structures that require operation time (e.g., terraformers)

  // Resource requirements (itemId -> quantity)
  resources: Record<string, number>;

  // Prerequisites
  prerequisites?: MegastructurePrerequisites;

  // Construction phases
  phases: MegastructurePhase[];

  // Capabilities when complete
  capabilities: MegastructureCapabilities;

  // Maintenance
  maintenancePerYear: Record<string, number>;
  energyMaintenancePerYear: number;  // watts
  degradationRate: number;  // % per year
  failureTimeYears: number;  // MTBF without maintenance

  // Strategic value
  militaryValue: number;  // 0-100
  economicValue: number;  // 0-100
  culturalValue: number;  // 0-100

  // Risks
  collapseRiskBase: number;  // % per year
  vulnerableTo: string[];  // What can damage/destroy this
}

// ============================================================================
// ORBITAL CATEGORY (Tech 7-9)
// ============================================================================

const SPACE_STATION: MegastructureBlueprint = {
  id: 'space_station',
  name: 'Space Station',
  category: 'orbital',
  tier: 'planet',
  techLevelRequired: 7.0,
  totalMass: 500_000,  // 500 tons
  constructionTimeYears: 5,
  laborRequired: 10_000,  // 2000 person-years average

  resources: {
    stellarite_plate: 1_000,
    steel_ingot: 5_000,
    hull_plating: 200,
    life_support_module: 50,
    power_core: 10,
    advanced_circuit: 2_000,
    communication_relay: 20,
  },

  prerequisites: {
    research: ['orbital_construction', 'life_support_systems'],
    techLevel: 7.0,
  },

  phases: [
    {
      name: 'Foundation',
      durationPercent: 20,
      resourcePercent: 30,
      description: 'Core structure and docking systems',
    },
    {
      name: 'Habitation',
      durationPercent: 40,
      resourcePercent: 40,
      description: 'Life support and living quarters',
    },
    {
      name: 'Systems Integration',
      durationPercent: 30,
      resourcePercent: 20,
      description: 'Power, communications, and final systems',
    },
    {
      name: 'Commissioning',
      durationPercent: 10,
      resourcePercent: 10,
      description: 'Testing and crew transfer',
    },
  ],

  capabilities: {
    populationCapacity: 1_000,
    energyOutput: 10_000_000,  // 10 MW
    defenseRating: 20,
    storageCapacity: 50_000_000,  // 50 TB
  },

  maintenancePerYear: {
    stellarite_plate: 10,
    advanced_circuit: 50,
    power_core: 1,
  },
  energyMaintenancePerYear: 0,  // Self-powered
  degradationRate: 2.0,
  failureTimeYears: 20,

  militaryValue: 30,
  economicValue: 50,
  culturalValue: 60,

  collapseRiskBase: 0.5,
  vulnerableTo: ['kinetic_weapons', 'solar_flares', 'debris_collision', 'sabotage'],
};

const STANFORD_TORUS: MegastructureBlueprint = {
  id: 'stanford_torus',
  name: 'Stanford Torus',
  category: 'orbital',
  tier: 'planet',
  techLevelRequired: 7.5,
  totalMass: 1_000_000_000,  // 1 million tons
  constructionTimeYears: 10,
  laborRequired: 50_000,

  resources: {
    stellarite_plate: 50_000,
    reinforced_hull: 10_000,
    steel_ingot: 500_000,
    hull_plating: 20_000,
    life_support_module: 500,
    power_core: 100,
    shield_generator: 50,
    advanced_circuit: 50_000,
  },

  prerequisites: {
    megastructures: ['space_station'],
    research: ['rotating_habitats', 'artificial_gravity', 'advanced_life_support'],
    techLevel: 7.5,
  },

  phases: [
    {
      name: 'Spoke Construction',
      durationPercent: 25,
      resourcePercent: 20,
      description: 'Central hub and support spokes',
    },
    {
      name: 'Ring Assembly',
      durationPercent: 35,
      resourcePercent: 50,
      description: 'Main rotating ring structure',
    },
    {
      name: 'Interior Development',
      durationPercent: 30,
      resourcePercent: 25,
      description: 'Habitation, agriculture, and infrastructure',
    },
    {
      name: 'Spin-Up',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Gradual rotation to 1g',
    },
  ],

  capabilities: {
    populationCapacity: 10_000,
    energyOutput: 100_000_000,  // 100 MW
    defenseRating: 40,
    storageCapacity: 500_000_000_000,  // 500 TB
  },

  maintenancePerYear: {
    stellarite_plate: 100,
    hull_plating: 200,
    advanced_circuit: 500,
    power_core: 5,
  },
  energyMaintenancePerYear: 0,
  degradationRate: 1.0,
  failureTimeYears: 50,

  militaryValue: 40,
  economicValue: 70,
  culturalValue: 75,

  collapseRiskBase: 0.2,
  vulnerableTo: ['structural_fatigue', 'bearing_failure', 'kinetic_weapons', 'solar_flares'],
};

const ONEILL_CYLINDER: MegastructureBlueprint = {
  id: 'oneill_cylinder',
  name: "O'Neill Cylinder",
  category: 'orbital',
  tier: 'planet',
  techLevelRequired: 8.0,
  totalMass: 10_000_000_000,  // 10 million tons
  constructionTimeYears: 20,
  laborRequired: 200_000,

  resources: {
    stellarite_plate: 500_000,
    reinforced_hull: 100_000,
    neutronium_core: 10,
    steel_ingot: 5_000_000,
    hull_plating: 200_000,
    life_support_module: 5_000,
    power_core: 1_000,
    shield_generator: 500,
    advanced_circuit: 500_000,
    quantum_processor: 1_000,
  },

  prerequisites: {
    megastructures: ['stanford_torus'],
    research: ['megastructure_engineering', 'closed_ecology', 'mass_drivers'],
    techLevel: 8.0,
  },

  phases: [
    {
      name: 'Endcap Foundations',
      durationPercent: 15,
      resourcePercent: 15,
      description: 'Counter-rotating endcap structures',
    },
    {
      name: 'Cylinder Shell',
      durationPercent: 40,
      resourcePercent: 50,
      description: 'Main cylinder and mirror systems',
    },
    {
      name: 'Ecological Engineering',
      durationPercent: 30,
      resourcePercent: 25,
      description: 'Soil, water, atmosphere, biosphere',
    },
    {
      name: 'Population Transfer',
      durationPercent: 15,
      resourcePercent: 10,
      description: 'Gradual settlement and ecosystem stabilization',
    },
  ],

  capabilities: {
    populationCapacity: 1_000_000,
    energyOutput: 1_000_000_000,  // 1 GW
    defenseRating: 60,
    storageCapacity: 10_000_000_000_000,  // 10 PB
  },

  maintenancePerYear: {
    stellarite_plate: 1_000,
    hull_plating: 2_000,
    advanced_circuit: 5_000,
    power_core: 50,
    life_support_module: 100,
  },
  energyMaintenancePerYear: 0,
  degradationRate: 0.5,
  failureTimeYears: 100,

  militaryValue: 50,
  economicValue: 85,
  culturalValue: 90,

  collapseRiskBase: 0.1,
  vulnerableTo: ['catastrophic_decompression', 'ecosystem_collapse', 'bearing_failure', 'asteroid_impact'],
};

const BISHOP_RING: MegastructureBlueprint = {
  id: 'bishop_ring',
  name: 'Bishop Ring',
  category: 'orbital',
  tier: 'planet',
  techLevelRequired: 9.0,
  totalMass: 10_000_000_000_000_000,  // 10 quadrillion tons
  constructionTimeYears: 100,
  laborRequired: 50_000_000,

  resources: {
    stellarite_plate: 100_000_000,
    reinforced_hull: 50_000_000,
    neutronium_core: 10_000,
    hull_plating: 500_000_000,
    life_support_module: 1_000_000,
    power_core: 500_000,
    shield_generator: 100_000,
    quantum_processor: 100_000,
    void_capacitor: 50_000,
  },

  prerequisites: {
    megastructures: ['oneill_cylinder'],
    research: ['planetary_scale_engineering', 'active_support_structures', 'atmospheric_retention'],
    techLevel: 9.0,
  },

  phases: [
    {
      name: 'Foundation Ring',
      durationPercent: 20,
      resourcePercent: 25,
      description: 'Core structural ring with active support',
    },
    {
      name: 'Habitat Band',
      durationPercent: 40,
      resourcePercent: 45,
      description: 'Habitable surface area and containment walls',
    },
    {
      name: 'Atmospheric Seeding',
      durationPercent: 20,
      resourcePercent: 15,
      description: 'Air, water, and radiation shielding',
    },
    {
      name: 'Ecological Development',
      durationPercent: 20,
      resourcePercent: 15,
      description: 'Biosphere establishment and settlement',
    },
  ],

  capabilities: {
    populationCapacity: 100_000_000,
    energyOutput: 100_000_000_000,  // 100 GW
    defenseRating: 75,
    storageCapacity: 1_000_000_000_000_000,  // 1 EB
  },

  maintenancePerYear: {
    stellarite_plate: 100_000,
    reinforced_hull: 50_000,
    neutronium_core: 10,
    power_core: 5_000,
    shield_generator: 1_000,
  },
  energyMaintenancePerYear: 10_000_000_000,  // 10 GW for active support
  degradationRate: 0.2,
  failureTimeYears: 500,

  militaryValue: 70,
  economicValue: 95,
  culturalValue: 95,

  collapseRiskBase: 0.05,
  vulnerableTo: ['structural_resonance', 'active_support_failure', 'atmospheric_loss', 'stellar_collision'],
};

const ORBITAL_RING: MegastructureBlueprint = {
  id: 'orbital_ring',
  name: 'Orbital Ring',
  category: 'orbital',
  tier: 'planet',
  techLevelRequired: 9.0,
  totalMass: 1_000_000_000_000,  // 1 trillion tons
  constructionTimeYears: 50,
  laborRequired: 20_000_000,

  resources: {
    stellarite_plate: 10_000_000,
    reinforced_hull: 5_000_000,
    neutronium_core: 1_000,
    hull_plating: 50_000_000,
    power_core: 100_000,
    shield_generator: 50_000,
    quantum_processor: 50_000,
    navigation_array: 10_000,
    void_engine_component: 100_000,
  },

  prerequisites: {
    megastructures: ['space_station'],
    research: ['orbital_mechanics_mastery', 'mass_stream_systems', 'space_elevator'],
    techLevel: 9.0,
  },

  phases: [
    {
      name: 'Launch Loop',
      durationPercent: 30,
      resourcePercent: 35,
      description: 'Magnetic levitation stream in orbit',
    },
    {
      name: 'Stationary Ring',
      durationPercent: 40,
      resourcePercent: 45,
      description: 'Outer stationary ring and tethers',
    },
    {
      name: 'Station Integration',
      durationPercent: 20,
      resourcePercent: 15,
      description: 'Docking stations and cargo systems',
    },
    {
      name: 'Traffic Management',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Operational testing and certification',
    },
  ],

  capabilities: {
    transportCapacity: 100_000_000_000,  // 100 billion kg/year
    energyOutput: 50_000_000_000,  // 50 GW
    defenseRating: 50,
    storageCapacity: 100_000_000_000_000,  // 100 TB
  },

  maintenancePerYear: {
    stellarite_plate: 10_000,
    power_core: 1_000,
    void_engine_component: 1_000,
    quantum_processor: 500,
  },
  energyMaintenancePerYear: 5_000_000_000,  // 5 GW for mass stream
  degradationRate: 0.5,
  failureTimeYears: 200,

  militaryValue: 60,
  economicValue: 95,
  culturalValue: 70,

  collapseRiskBase: 0.1,
  vulnerableTo: ['mass_stream_disruption', 'tether_failure', 'debris_cascade', 'sabotage'],
};

// ============================================================================
// PLANETARY CATEGORY (Tech 8-9.5)
// ============================================================================

const PLANETARY_TERRAFORMER: MegastructureBlueprint = {
  id: 'planetary_terraformer',
  name: 'Planetary Terraformer',
  category: 'planetary',
  tier: 'planet',
  techLevelRequired: 8.5,
  totalMass: 100_000_000_000,  // 100 million tons
  constructionTimeYears: 100,
  operationTimeYears: 500,  // Terraforming operation time
  laborRequired: 10_000_000,

  resources: {
    stellarite_plate: 1_000_000,
    reinforced_hull: 500_000,
    neutronium_core: 100,
    power_core: 50_000,
    shield_generator: 10_000,
    quantum_processor: 10_000,
    void_capacitor: 5_000,
    focusing_array: 50_000,
  },

  prerequisites: {
    research: ['planetary_engineering', 'atmospheric_chemistry', 'magnetic_field_generation', 'ecosystem_design'],
    techLevel: 8.5,
  },

  phases: [
    {
      name: 'Orbital Infrastructure',
      durationPercent: 20,
      resourcePercent: 30,
      description: 'Solar mirrors and orbital control systems',
    },
    {
      name: 'Surface Installations',
      durationPercent: 30,
      resourcePercent: 40,
      description: 'Atmosphere processors and magnetic generators',
    },
    {
      name: 'System Integration',
      durationPercent: 30,
      resourcePercent: 20,
      description: 'Coordination and control networks',
    },
    {
      name: 'Initial Operation',
      durationPercent: 20,
      resourcePercent: 10,
      description: 'Begin planetary transformation',
    },
  ],

  capabilities: {
    terraformingRate: 0.002,  // ~1 planet per 500 years
    energyOutput: 10_000_000_000,  // 10 GW
    defenseRating: 45,
  },

  maintenancePerYear: {
    stellarite_plate: 10_000,
    power_core: 500,
    quantum_processor: 100,
    void_capacitor: 50,
  },
  energyMaintenancePerYear: 2_000_000_000,  // 2 GW
  degradationRate: 0.3,
  failureTimeYears: 100,

  militaryValue: 30,
  economicValue: 90,
  culturalValue: 85,

  collapseRiskBase: 0.2,
  vulnerableTo: ['system_cascade_failure', 'planetary_instability', 'resource_depletion'],
};

const PLANET_CRACKER: MegastructureBlueprint = {
  id: 'planet_cracker',
  name: 'Planet Cracker',
  category: 'planetary',
  tier: 'planet',
  techLevelRequired: 9.0,
  totalMass: 10_000_000_000_000,  // 10 trillion tons
  constructionTimeYears: 20,
  operationTimeYears: 50,  // Planet disassembly time
  laborRequired: 5_000_000,

  resources: {
    stellarite_plate: 10_000_000,
    reinforced_hull: 5_000_000,
    neutronium_core: 5_000,
    power_core: 500_000,
    shield_generator: 100_000,
    quantum_processor: 50_000,
    void_capacitor: 100_000,
    focusing_array: 500_000,
    void_engine_component: 50_000,
  },

  prerequisites: {
    research: ['planetary_disassembly', 'gravity_manipulation', 'mass_extraction', 'resource_processing'],
    techLevel: 9.0,
  },

  phases: [
    {
      name: 'Mining Platform',
      durationPercent: 30,
      resourcePercent: 40,
      description: 'Orbital extraction and processing facility',
    },
    {
      name: 'Gravity Disruptors',
      durationPercent: 40,
      resourcePercent: 40,
      description: 'Core penetration and tectonic manipulation systems',
    },
    {
      name: 'Mass Stream Network',
      durationPercent: 20,
      resourcePercent: 15,
      description: 'Material transport to orbit',
    },
    {
      name: 'Commissioning',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'System testing and initial operation',
    },
  ],

  capabilities: {
    miningRate: 200_000_000_000_000,  // 200 trillion kg/year
    energyOutput: 100_000_000_000,  // 100 GW
    defenseRating: 55,
  },

  maintenancePerYear: {
    stellarite_plate: 100_000,
    neutronium_core: 50,
    power_core: 5_000,
    void_capacitor: 1_000,
  },
  energyMaintenancePerYear: 20_000_000_000,  // 20 GW
  degradationRate: 0.5,
  failureTimeYears: 100,

  militaryValue: 85,
  economicValue: 95,
  culturalValue: 40,

  collapseRiskBase: 0.3,
  vulnerableTo: ['planetary_core_instability', 'gravity_cascade', 'mass_stream_failure'],
};

const WORLD_ENGINE: MegastructureBlueprint = {
  id: 'world_engine',
  name: 'World Engine',
  category: 'planetary',
  tier: 'system',
  techLevelRequired: 9.5,
  totalMass: 100_000_000_000_000,  // 100 trillion tons
  constructionTimeYears: 100,
  operationTimeYears: 500,  // Planet relocation time
  laborRequired: 50_000_000,

  resources: {
    stellarite_plate: 100_000_000,
    reinforced_hull: 50_000_000,
    neutronium_core: 50_000,
    power_core: 5_000_000,
    shield_generator: 1_000_000,
    quantum_processor: 500_000,
    void_engine_component: 1_000_000,
    propulsion_unit: 500_000,
    navigation_array: 100_000,
  },

  prerequisites: {
    research: ['planetary_propulsion', 'stellar_navigation', 'tectonic_stabilization', 'biosphere_protection'],
    techLevel: 9.5,
  },

  phases: [
    {
      name: 'Foundation Anchors',
      durationPercent: 25,
      resourcePercent: 30,
      description: 'Deep core anchoring systems',
    },
    {
      name: 'Propulsion Arrays',
      durationPercent: 40,
      resourcePercent: 45,
      description: 'Planetary-scale engines and thrusters',
    },
    {
      name: 'Navigation Systems',
      durationPercent: 20,
      resourcePercent: 15,
      description: 'Stellar navigation and course control',
    },
    {
      name: 'Biosphere Protection',
      durationPercent: 15,
      resourcePercent: 10,
      description: 'Shields and stabilization for inhabitants',
    },
  ],

  capabilities: {
    transportCapacity: 5_972_000_000_000_000_000_000_000,  // Mass of Earth
    defenseRating: 80,
    energyOutput: 500_000_000_000,  // 500 GW
  },

  maintenancePerYear: {
    stellarite_plate: 1_000_000,
    neutronium_core: 500,
    void_engine_component: 10_000,
    power_core: 50_000,
  },
  energyMaintenancePerYear: 100_000_000_000,  // 100 GW
  degradationRate: 0.1,
  failureTimeYears: 1000,

  militaryValue: 90,
  economicValue: 85,
  culturalValue: 95,

  collapseRiskBase: 0.05,
  vulnerableTo: ['tectonic_catastrophe', 'engine_failure', 'navigation_error', 'stellar_collision'],
};

const PLANETARY_SHIELD: MegastructureBlueprint = {
  id: 'planetary_shield',
  name: 'Planetary Shield',
  category: 'planetary',
  tier: 'planet',
  techLevelRequired: 9.0,
  totalMass: 1_000_000_000_000,  // 1 trillion tons
  constructionTimeYears: 30,
  laborRequired: 10_000_000,

  resources: {
    stellarite_plate: 10_000_000,
    reinforced_hull: 5_000_000,
    neutronium_core: 1_000,
    power_core: 500_000,
    shield_generator: 500_000,
    quantum_processor: 100_000,
    void_capacitor: 100_000,
    focusing_array: 200_000,
  },

  prerequisites: {
    research: ['planetary_scale_shields', 'magnetic_field_projection', 'energy_distribution'],
    techLevel: 9.0,
  },

  phases: [
    {
      name: 'Generator Network',
      durationPercent: 35,
      resourcePercent: 50,
      description: 'Surface and orbital shield generators',
    },
    {
      name: 'Power Grid',
      durationPercent: 30,
      resourcePercent: 30,
      description: 'Energy distribution and storage systems',
    },
    {
      name: 'Control Systems',
      durationPercent: 25,
      resourcePercent: 15,
      description: 'Coordination and threat response',
    },
    {
      name: 'Calibration',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Field tuning and testing',
    },
  ],

  capabilities: {
    defenseRating: 95,
    energyOutput: 0,  // Pure defense
  },

  maintenancePerYear: {
    shield_generator: 10_000,
    power_core: 5_000,
    quantum_processor: 1_000,
    void_capacitor: 1_000,
  },
  energyMaintenancePerYear: 50_000_000_000,  // 50 GW
  degradationRate: 0.4,
  failureTimeYears: 150,

  militaryValue: 95,
  economicValue: 60,
  culturalValue: 80,

  collapseRiskBase: 0.15,
  vulnerableTo: ['power_grid_failure', 'coordinated_assault', 'emp_attack'],
};

const CLIMATE_ENGINE: MegastructureBlueprint = {
  id: 'climate_engine',
  name: 'Climate Engine',
  category: 'planetary',
  tier: 'planet',
  techLevelRequired: 8.5,
  totalMass: 10_000_000_000,  // 10 billion tons
  constructionTimeYears: 50,
  laborRequired: 5_000_000,

  resources: {
    stellarite_plate: 1_000_000,
    reinforced_hull: 500_000,
    power_core: 50_000,
    shield_generator: 10_000,
    quantum_processor: 20_000,
    void_capacitor: 10_000,
    focusing_array: 100_000,
  },

  prerequisites: {
    research: ['climate_control', 'weather_manipulation', 'atmospheric_engineering'],
    techLevel: 8.5,
  },

  phases: [
    {
      name: 'Weather Stations',
      durationPercent: 30,
      resourcePercent: 35,
      description: 'Global network of control stations',
    },
    {
      name: 'Atmospheric Processors',
      durationPercent: 40,
      resourcePercent: 45,
      description: 'Large-scale atmosphere manipulation',
    },
    {
      name: 'Ocean Systems',
      durationPercent: 20,
      resourcePercent: 15,
      description: 'Ocean current and temperature control',
    },
    {
      name: 'Integration',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Global climate coordination',
    },
  ],

  capabilities: {
    defenseRating: 25,
    energyOutput: 5_000_000_000,  // 5 GW
  },

  maintenancePerYear: {
    stellarite_plate: 10_000,
    power_core: 500,
    quantum_processor: 200,
  },
  energyMaintenancePerYear: 1_000_000_000,  // 1 GW
  degradationRate: 0.5,
  failureTimeYears: 100,

  militaryValue: 40,
  economicValue: 85,
  culturalValue: 75,

  collapseRiskBase: 0.25,
  vulnerableTo: ['system_desynchronization', 'extreme_weather_cascade', 'power_failure'],
};

// ============================================================================
// STELLAR CATEGORY (Tech 9-10)
// ============================================================================

const DYSON_SWARM: MegastructureBlueprint = {
  id: 'dyson_swarm',
  name: 'Dyson Swarm',
  category: 'stellar',
  tier: 'system',
  techLevelRequired: 9.0,
  totalMass: 10_000_000_000_000_000_000,  // 10 quintillion tons
  constructionTimeYears: 100,
  laborRequired: 1_000_000_000,

  resources: {
    stellarite_plate: 100_000_000_000,
    hull_plating: 1_000_000_000_000,
    power_core: 10_000_000_000,
    shield_generator: 1_000_000_000,
    quantum_processor: 100_000_000,
    navigation_array: 50_000_000,
    communication_relay: 100_000_000,
    focusing_array: 1_000_000_000,
  },

  prerequisites: {
    megastructures: ['planet_cracker'],
    research: ['stellar_engineering', 'self_replicating_systems', 'swarm_coordination'],
    techLevel: 9.0,
  },

  phases: [
    {
      name: 'Collector Prototypes',
      durationPercent: 10,
      resourcePercent: 1,
      description: 'Design and test collector units',
    },
    {
      name: 'Self-Replication',
      durationPercent: 30,
      resourcePercent: 10,
      description: 'Deploy self-replicating factories',
    },
    {
      name: 'Swarm Deployment',
      durationPercent: 50,
      resourcePercent: 80,
      description: 'Exponential collector expansion',
    },
    {
      name: 'Network Integration',
      durationPercent: 10,
      resourcePercent: 9,
      description: 'Communication and power distribution',
    },
  ],

  capabilities: {
    energyOutput: 380_000_000_000_000_000_000_000_000,  // 380 YW (Sun's output)
    computationalPower: 1e30,  // ~1 nonillion FLOPS
    defenseRating: 70,
    communicationRange: 1000,  // light years
  },

  maintenancePerYear: {
    stellarite_plate: 100_000_000,
    quantum_processor: 1_000_000,
    navigation_array: 500_000,
  },
  energyMaintenancePerYear: 0,  // Self-powered
  degradationRate: 0.1,
  failureTimeYears: 10_000,

  militaryValue: 85,
  economicValue: 100,
  culturalValue: 90,

  collapseRiskBase: 0.01,
  vulnerableTo: ['swarm_desynchronization', 'stellar_flare', 'cascading_collision'],
};

const DYSON_SPHERE: MegastructureBlueprint = {
  id: 'dyson_sphere',
  name: 'Dyson Sphere',
  category: 'stellar',
  tier: 'system',
  techLevelRequired: 10.0,
  totalMass: 10_000_000_000_000_000_000_000_000,  // 10 sextillion tons (Earth mass × 1.67 million)
  constructionTimeYears: 1000,
  laborRequired: 100_000_000_000,

  resources: {
    stellarite_plate: 1_000_000_000_000_000,
    reinforced_hull: 500_000_000_000_000,
    neutronium_core: 100_000_000_000,
    power_core: 1_000_000_000_000,
    shield_generator: 100_000_000_000,
    quantum_processor: 10_000_000_000,
    void_capacitor: 10_000_000_000,
    focusing_array: 100_000_000_000,
  },

  prerequisites: {
    megastructures: ['dyson_swarm'],
    research: ['rigid_shell_engineering', 'active_support_systems', 'stellar_containment'],
    techLevel: 10.0,
  },

  phases: [
    {
      name: 'Swarm Foundation',
      durationPercent: 20,
      resourcePercent: 10,
      description: 'Use existing Dyson swarm as scaffold',
    },
    {
      name: 'Structural Framework',
      durationPercent: 40,
      resourcePercent: 50,
      description: 'Rigid shell segments with active support',
    },
    {
      name: 'Shell Completion',
      durationPercent: 30,
      resourcePercent: 35,
      description: 'Seal segments into complete sphere',
    },
    {
      name: 'Interior Development',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Habitable surface and infrastructure',
    },
  ],

  capabilities: {
    populationCapacity: 1_000_000_000_000_000_000,  // 1 quintillion
    energyOutput: 380_000_000_000_000_000_000_000_000,  // 380 YW
    computationalPower: 1e40,  // Unimaginable computing power
    defenseRating: 90,
    communicationRange: 10_000,  // light years
  },

  maintenancePerYear: {
    stellarite_plate: 10_000_000_000,
    neutronium_core: 1_000_000,
    power_core: 100_000_000,
    shield_generator: 10_000_000,
  },
  energyMaintenancePerYear: 1_000_000_000_000,  // 1 TW for active support
  degradationRate: 0.01,
  failureTimeYears: 100_000,

  militaryValue: 100,
  economicValue: 100,
  culturalValue: 100,

  collapseRiskBase: 0.001,
  vulnerableTo: ['stellar_evolution', 'active_support_cascade', 'catastrophic_breach'],
};

const STELLAR_ENGINE: MegastructureBlueprint = {
  id: 'stellar_engine',
  name: 'Stellar Engine (Shkadov Thruster)',
  category: 'stellar',
  tier: 'system',
  techLevelRequired: 10.0,
  totalMass: 1_000_000_000_000_000_000_000_000,  // 1 sextillion tons
  constructionTimeYears: 500,
  operationTimeYears: 1_000_000,  // Million-year operation
  laborRequired: 50_000_000_000,

  resources: {
    stellarite_plate: 100_000_000_000_000,
    reinforced_hull: 50_000_000_000_000,
    neutronium_core: 10_000_000_000,
    power_core: 100_000_000_000,
    shield_generator: 50_000_000_000,
    quantum_processor: 5_000_000_000,
    focusing_array: 50_000_000_000,
    void_capacitor: 10_000_000_000,
  },

  prerequisites: {
    megastructures: ['dyson_swarm'],
    research: ['stellar_propulsion', 'radiation_pressure_control', 'galactic_navigation'],
    techLevel: 10.0,
  },

  phases: [
    {
      name: 'Mirror Arc',
      durationPercent: 40,
      resourcePercent: 50,
      description: 'Enormous curved mirror to reflect light',
    },
    {
      name: 'Collector Ring',
      durationPercent: 30,
      resourcePercent: 30,
      description: 'Energy collection for station-keeping',
    },
    {
      name: 'Stabilization Systems',
      durationPercent: 20,
      resourcePercent: 15,
      description: 'Maintain position relative to star',
    },
    {
      name: 'Navigation Calibration',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Course plotting and initiation',
    },
  ],

  capabilities: {
    transportCapacity: 2e30,  // Solar mass
    energyOutput: 50_000_000_000_000_000_000_000_000,  // 50 YW
    defenseRating: 75,
    communicationRange: 5_000,
  },

  maintenancePerYear: {
    stellarite_plate: 1_000_000_000,
    neutronium_core: 100_000,
    power_core: 10_000_000,
    shield_generator: 5_000_000,
  },
  energyMaintenancePerYear: 100_000_000_000,  // 100 GW
  degradationRate: 0.01,
  failureTimeYears: 100_000,

  militaryValue: 95,
  economicValue: 80,
  culturalValue: 95,

  collapseRiskBase: 0.005,
  vulnerableTo: ['stellar_instability', 'mirror_deformation', 'navigation_drift'],
};

const STAR_LIFTER: MegastructureBlueprint = {
  id: 'star_lifter',
  name: 'Star Lifter',
  category: 'stellar',
  tier: 'system',
  techLevelRequired: 9.5,
  totalMass: 1_000_000_000_000_000,  // 1 quadrillion tons
  constructionTimeYears: 100,
  laborRequired: 10_000_000_000,

  resources: {
    stellarite_plate: 100_000_000_000,
    reinforced_hull: 50_000_000_000,
    neutronium_core: 1_000_000,
    power_core: 10_000_000_000,
    shield_generator: 5_000_000_000,
    quantum_processor: 1_000_000_000,
    void_capacitor: 1_000_000_000,
    focusing_array: 10_000_000_000,
  },

  prerequisites: {
    research: ['stellar_mining', 'magnetic_field_manipulation', 'plasma_extraction'],
    techLevel: 9.5,
  },

  phases: [
    {
      name: 'Orbital Collectors',
      durationPercent: 35,
      resourcePercent: 40,
      description: 'Ring of material extraction stations',
    },
    {
      name: 'Magnetic Pumps',
      durationPercent: 35,
      resourcePercent: 40,
      description: 'Systems to lift stellar material',
    },
    {
      name: 'Processing Facilities',
      durationPercent: 20,
      resourcePercent: 15,
      description: 'Refinement and storage',
    },
    {
      name: 'Commissioning',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Begin extraction operations',
    },
  ],

  capabilities: {
    miningRate: 1_000_000_000_000_000_000,  // 1 quintillion kg/year
    energyOutput: 10_000_000_000_000,  // 10 TW
    defenseRating: 60,
  },

  maintenancePerYear: {
    stellarite_plate: 100_000_000,
    neutronium_core: 10_000,
    shield_generator: 5_000_000,
    void_capacitor: 1_000_000,
  },
  energyMaintenancePerYear: 1_000_000_000_000,  // 1 TW
  degradationRate: 0.2,
  failureTimeYears: 5_000,

  militaryValue: 60,
  economicValue: 95,
  culturalValue: 70,

  collapseRiskBase: 0.1,
  vulnerableTo: ['stellar_flare', 'magnetic_field_collapse', 'plasma_containment_failure'],
};

const NICOLL_DYSON_BEAM: MegastructureBlueprint = {
  id: 'nicoll_dyson_beam',
  name: 'Nicoll-Dyson Beam',
  category: 'stellar',
  tier: 'system',
  techLevelRequired: 10.0,
  totalMass: 100_000_000_000_000,  // 100 trillion tons (addition to Dyson swarm)
  constructionTimeYears: 50,
  laborRequired: 5_000_000_000,

  resources: {
    stellarite_plate: 10_000_000_000,
    reinforced_hull: 5_000_000_000,
    neutronium_core: 100_000,
    power_core: 1_000_000_000,
    shield_generator: 500_000_000,
    quantum_processor: 100_000_000,
    focusing_array: 10_000_000_000,
    probability_lens: 1_000_000,
  },

  prerequisites: {
    megastructures: ['dyson_swarm'],
    research: ['stellar_laser_focusing', 'long_range_targeting', 'energy_coherence'],
    techLevel: 10.0,
  },

  phases: [
    {
      name: 'Focusing Array',
      durationPercent: 40,
      resourcePercent: 50,
      description: 'Massive lens system',
    },
    {
      name: 'Beam Control',
      durationPercent: 30,
      resourcePercent: 30,
      description: 'Targeting and modulation systems',
    },
    {
      name: 'Power Routing',
      durationPercent: 20,
      resourcePercent: 15,
      description: 'Channel swarm output to beam',
    },
    {
      name: 'Calibration',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Test firing and accuracy tuning',
    },
  ],

  capabilities: {
    energyOutput: 0,  // Weaponized, not production
    defenseRating: 100,  // Offensive weapon
    communicationRange: 10_000,
  },

  maintenancePerYear: {
    focusing_array: 10_000_000,
    quantum_processor: 1_000_000,
    probability_lens: 10_000,
  },
  energyMaintenancePerYear: 10_000_000_000,  // 10 GW
  degradationRate: 0.3,
  failureTimeYears: 1_000,

  militaryValue: 100,
  economicValue: 20,
  culturalValue: 50,

  collapseRiskBase: 0.05,
  vulnerableTo: ['lens_damage', 'targeting_failure', 'power_fluctuation'],
};

// ============================================================================
// GALACTIC CATEGORY (Tech 10)
// ============================================================================

const WORMHOLE_GATE: MegastructureBlueprint = {
  id: 'wormhole_gate',
  name: 'Wormhole Gate',
  category: 'galactic',
  tier: 'sector',
  techLevelRequired: 10.0,
  totalMass: 10_000_000_000_000_000,  // 10 quadrillion tons per gate
  constructionTimeYears: 10,  // Per gate
  laborRequired: 10_000_000_000,

  resources: {
    stellarite_plate: 1_000_000_000_000,
    reinforced_hull: 500_000_000_000,
    neutronium_core: 100_000_000,
    power_core: 100_000_000_000,
    quantum_processor: 10_000_000_000,
    void_capacitor: 10_000_000_000,
    timeline_anchor: 1_000_000,
    reality_thread: 100_000,
    probability_lens: 1_000_000,
  },

  prerequisites: {
    research: ['wormhole_theory', 'spacetime_engineering', 'exotic_matter_production', 'quantum_entanglement_scaling'],
    techLevel: 10.0,
  },

  phases: [
    {
      name: 'Ring Frame',
      durationPercent: 30,
      resourcePercent: 40,
      description: 'Massive circular structure',
    },
    {
      name: 'Exotic Matter Core',
      durationPercent: 40,
      resourcePercent: 45,
      description: 'Negative energy generation',
    },
    {
      name: 'Spacetime Manipulation',
      durationPercent: 20,
      resourcePercent: 10,
      description: 'Fold space and create wormhole',
    },
    {
      name: 'Stabilization',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Maintain stable throat',
    },
  ],

  capabilities: {
    transportCapacity: 1_000_000_000_000_000,  // 1 quadrillion kg/year
    energyOutput: 0,
    defenseRating: 50,
    communicationRange: 100_000,  // Instantaneous across galaxy
  },

  maintenancePerYear: {
    neutronium_core: 1_000_000,
    timeline_anchor: 10_000,
    reality_thread: 1_000,
    void_capacitor: 100_000_000,
  },
  energyMaintenancePerYear: 100_000_000_000_000,  // 100 TW
  degradationRate: 0.5,
  failureTimeYears: 100,

  militaryValue: 85,
  economicValue: 100,
  culturalValue: 95,

  collapseRiskBase: 0.2,
  vulnerableTo: ['exotic_matter_depletion', 'gravitational_disruption', 'hawking_radiation'],
};

const GALACTIC_HIGHWAY: MegastructureBlueprint = {
  id: 'galactic_highway',
  name: 'Galactic Highway',
  category: 'galactic',
  tier: 'galaxy',
  techLevelRequired: 10.0,
  totalMass: 1_000_000_000_000,  // 1 trillion tons per light-year
  constructionTimeYears: 1,  // Per light-year
  laborRequired: 100_000_000,  // Per light-year

  resources: {
    stellarite_plate: 100_000_000,
    quantum_processor: 10_000_000,
    navigation_array: 10_000_000,
    communication_relay: 50_000_000,
    void_capacitor: 1_000_000,
    timeline_anchor: 1_000,
    reality_thread: 100,
  },

  prerequisites: {
    megastructures: ['wormhole_gate'],
    research: ['interstellar_infrastructure', 'navigation_beacons', 'faster_than_light_lanes'],
    techLevel: 10.0,
  },

  phases: [
    {
      name: 'Beacon Deployment',
      durationPercent: 40,
      resourcePercent: 30,
      description: 'Navigation and guidance beacons',
    },
    {
      name: 'FTL Lane Formation',
      durationPercent: 40,
      resourcePercent: 50,
      description: 'Stabilized faster-than-light corridors',
    },
    {
      name: 'Traffic Control',
      durationPercent: 15,
      resourcePercent: 15,
      description: 'Communication and safety systems',
    },
    {
      name: 'Certification',
      durationPercent: 5,
      resourcePercent: 5,
      description: 'Testing and opening to traffic',
    },
  ],

  capabilities: {
    transportCapacity: 10_000_000_000_000_000,  // 10 quadrillion kg/year per light-year
    communicationRange: 100_000,
    defenseRating: 30,
  },

  maintenancePerYear: {
    quantum_processor: 100_000,
    navigation_array: 100_000,
    void_capacitor: 10_000,
    timeline_anchor: 10,
  },
  energyMaintenancePerYear: 1_000_000_000,  // 1 GW per light-year
  degradationRate: 0.3,
  failureTimeYears: 500,

  militaryValue: 70,
  economicValue: 95,
  culturalValue: 85,

  collapseRiskBase: 0.1,
  vulnerableTo: ['beacon_failure', 'ftl_lane_collapse', 'traffic_overload'],
};

const MATRIOSHKA_BRAIN: MegastructureBlueprint = {
  id: 'matrioshka_brain',
  name: 'Matrioshka Brain',
  category: 'galactic',
  tier: 'system',
  techLevelRequired: 10.0,
  totalMass: 100_000_000_000_000_000_000_000_000,  // 100 sextillion tons
  constructionTimeYears: 10_000,
  laborRequired: 1_000_000_000_000,

  resources: {
    stellarite_plate: 10_000_000_000_000_000,
    reinforced_hull: 5_000_000_000_000_000,
    neutronium_core: 1_000_000_000_000,
    quantum_processor: 10_000_000_000_000_000,
    power_core: 10_000_000_000_000,
    shield_generator: 1_000_000_000_000,
    void_capacitor: 100_000_000_000,
    focusing_array: 1_000_000_000_000,
  },

  prerequisites: {
    megastructures: ['dyson_sphere'],
    research: ['stellar_scale_computing', 'waste_heat_management', 'nested_shell_design', 'computational_supremacy'],
    techLevel: 10.0,
  },

  phases: [
    {
      name: 'Inner Computation Shell',
      durationPercent: 20,
      resourcePercent: 10,
      description: 'Highest-energy computing layer',
    },
    {
      name: 'Middle Shells',
      durationPercent: 50,
      resourcePercent: 60,
      description: 'Multiple nested processing layers',
    },
    {
      name: 'Outer Radiator Shell',
      durationPercent: 20,
      resourcePercent: 25,
      description: 'Final heat radiation layer',
    },
    {
      name: 'Network Integration',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Inter-shell communication and coordination',
    },
  ],

  capabilities: {
    computationalPower: 1e50,  // Beyond comprehension
    energyOutput: 0,  // All energy used for computation
    defenseRating: 85,
    communicationRange: 100_000,
  },

  maintenancePerYear: {
    quantum_processor: 100_000_000_000_000,
    neutronium_core: 10_000_000,
    power_core: 1_000_000_000,
  },
  energyMaintenancePerYear: 0,  // Self-powered
  degradationRate: 0.005,
  failureTimeYears: 1_000_000,

  militaryValue: 90,
  economicValue: 100,
  culturalValue: 100,

  collapseRiskBase: 0.001,
  vulnerableTo: ['stellar_evolution', 'computational_cascade', 'thermal_runaway'],
};

const BIRCH_WORLD: MegastructureBlueprint = {
  id: 'birch_world',
  name: 'Birch World (Supramundane Planet)',
  category: 'galactic',
  tier: 'system',
  techLevelRequired: 10.0,
  totalMass: 10_000_000_000_000_000_000_000_000_000,  // 10 octillion tons
  constructionTimeYears: 1_000_000,
  laborRequired: 10_000_000_000_000,

  resources: {
    stellarite_plate: 1_000_000_000_000_000_000,
    reinforced_hull: 500_000_000_000_000_000,
    neutronium_core: 100_000_000_000_000,
    power_core: 100_000_000_000_000,
    shield_generator: 10_000_000_000_000,
    quantum_processor: 1_000_000_000_000,
    void_capacitor: 100_000_000_000,
  },

  prerequisites: {
    megastructures: ['dyson_sphere'],
    research: ['supramassive_engineering', 'black_hole_manipulation', 'planetary_scale_habitats'],
    techLevel: 10.0,
  },

  phases: [
    {
      name: 'Black Hole Core',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Create or capture central black hole',
    },
    {
      name: 'Shell Foundation',
      durationPercent: 30,
      resourcePercent: 35,
      description: 'Massive spherical shell around black hole',
    },
    {
      name: 'Multi-Layer Construction',
      durationPercent: 40,
      resourcePercent: 45,
      description: 'Concentric habitable shells',
    },
    {
      name: 'Biosphere Seeding',
      durationPercent: 20,
      resourcePercent: 15,
      description: 'Populate with life and civilizations',
    },
  ],

  capabilities: {
    populationCapacity: 1_000_000_000_000_000_000_000,  // 1 sextillion
    energyOutput: 1_000_000_000_000_000_000,  // 1 EW from black hole
    defenseRating: 95,
    storageCapacity: 1e30,  // Unimaginable
  },

  maintenancePerYear: {
    stellarite_plate: 100_000_000_000_000,
    neutronium_core: 1_000_000_000,
    power_core: 10_000_000_000,
    shield_generator: 1_000_000_000,
  },
  energyMaintenancePerYear: 100_000_000_000_000,  // 100 TW for gravity support
  degradationRate: 0.0001,
  failureTimeYears: 10_000_000,

  militaryValue: 100,
  economicValue: 100,
  culturalValue: 100,

  collapseRiskBase: 0.0001,
  vulnerableTo: ['black_hole_evaporation', 'structural_collapse', 'gravitational_instability'],
};

// ============================================================================
// TRANSCENDENT CATEGORY (Tech 10+)
// ============================================================================

const UNIVERSE_ENGINE: MegastructureBlueprint = {
  id: 'universe_engine',
  name: 'Universe Engine',
  category: 'transcendent',
  tier: 'galaxy',
  techLevelRequired: 10.5,
  totalMass: 1_000_000_000_000_000_000_000_000,  // 1 sextillion tons
  constructionTimeYears: 1_000_000,
  laborRequired: 100_000_000_000_000,

  resources: {
    neutronium_core: 1_000_000_000_000,
    quantum_processor: 100_000_000_000_000,
    timeline_anchor: 1_000_000_000,
    reality_thread: 100_000_000,
    probability_lens: 10_000_000,
    void_capacitor: 1_000_000_000_000,
    coherence_crystal: 1_000_000_000,
  },

  prerequisites: {
    research: ['universe_creation', 'physical_constant_engineering', 'dimensional_manipulation', 'computational_cosmology'],
    techLevel: 10.5,
  },

  phases: [
    {
      name: 'Vacuum Energy Extractor',
      durationPercent: 25,
      resourcePercent: 30,
      description: 'Harvest zero-point energy',
    },
    {
      name: 'Dimensional Forge',
      durationPercent: 35,
      resourcePercent: 40,
      description: 'Create baby universe bubble',
    },
    {
      name: 'Physical Law Programming',
      durationPercent: 25,
      resourcePercent: 20,
      description: 'Set fundamental constants',
    },
    {
      name: 'Controlled Inflation',
      durationPercent: 15,
      resourcePercent: 10,
      description: 'Expand pocket universe',
    },
  ],

  capabilities: {
    defenseRating: 100,
    energyOutput: 1e30,  // Near-infinite from vacuum
    computationalPower: 1e60,
    realityManipulation: true,
  },

  maintenancePerYear: {
    timeline_anchor: 1_000_000,
    reality_thread: 100_000,
    quantum_processor: 1_000_000_000,
  },
  energyMaintenancePerYear: 0,  // Self-powered from vacuum
  degradationRate: 0.00001,
  failureTimeYears: 100_000_000,

  militaryValue: 100,
  economicValue: 100,
  culturalValue: 100,

  collapseRiskBase: 0.0001,
  vulnerableTo: ['vacuum_decay', 'dimensional_rupture', 'false_vacuum_transition'],
};

const REALITY_ANCHOR: MegastructureBlueprint = {
  id: 'reality_anchor',
  name: 'Reality Anchor',
  category: 'transcendent',
  tier: 'galaxy',
  techLevelRequired: 10.5,
  totalMass: 0,  // Exists across timelines, not measurable in single timeline
  constructionTimeYears: 10_000_000,
  laborRequired: 1_000_000_000_000_000,

  resources: {
    timeline_anchor: 1_000_000_000_000_000,  // Quadrillions
    reality_thread: 100_000_000_000_000,  // Trillions
    probability_lens: 10_000_000_000,
    quantum_processor: 10_000_000_000_000,
    soul_anchor: 1_000_000_000,
    coherence_crystal: 10_000_000_000,
  },

  prerequisites: {
    research: ['timeline_stabilization', 'probability_manipulation', 'quantum_immortality', 'multiversal_anchoring'],
    techLevel: 10.5,
  },

  phases: [
    {
      name: 'Timeline Network',
      durationPercent: 30,
      resourcePercent: 35,
      description: 'Identify and connect parallel timelines',
    },
    {
      name: 'Anchor Placement',
      durationPercent: 40,
      resourcePercent: 45,
      description: 'Deploy anchors across timelines',
    },
    {
      name: 'Coherence Field',
      durationPercent: 20,
      resourcePercent: 15,
      description: 'Stabilize probability waves',
    },
    {
      name: 'Eternal Maintenance',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Establish self-sustaining protection',
    },
  ],

  capabilities: {
    defenseRating: 100,
    timelineManipulation: true,
    realityManipulation: true,
    computationalPower: 1e70,
  },

  maintenancePerYear: {
    timeline_anchor: 100_000_000_000,
    reality_thread: 10_000_000_000,
    probability_lens: 1_000_000,
  },
  energyMaintenancePerYear: 0,  // Draws from timeline divergence
  degradationRate: 0.000001,
  failureTimeYears: 1_000_000_000,

  militaryValue: 100,
  economicValue: 100,
  culturalValue: 100,

  collapseRiskBase: 0.00001,
  vulnerableTo: ['timeline_pruning', 'quantum_decoherence', 'paradox_cascade'],
};

const DIMENSIONAL_GATE: MegastructureBlueprint = {
  id: 'dimensional_gate',
  name: 'Dimensional Gate',
  category: 'transcendent',
  tier: 'galaxy',
  techLevelRequired: 10.5,
  totalMass: 10_000_000_000_000_000_000,  // 10 quintillion tons
  constructionTimeYears: 100_000,
  laborRequired: 10_000_000_000_000,

  resources: {
    neutronium_core: 100_000_000_000,
    quantum_processor: 10_000_000_000_000,
    timeline_anchor: 10_000_000_000,
    reality_thread: 10_000_000_000_000,  // 10 trillion reality threads
    probability_lens: 1_000_000_000,
    void_capacitor: 100_000_000_000,
    observation_nullifier: 1_000_000_000,
  },

  prerequisites: {
    research: ['dimensional_physics', 'brane_engineering', 'extra_dimensional_access', 'membrane_puncture'],
    techLevel: 10.5,
  },

  phases: [
    {
      name: 'Dimensional Probe',
      durationPercent: 25,
      resourcePercent: 20,
      description: 'Detect and map adjacent dimensions',
    },
    {
      name: 'Brane Puncture',
      durationPercent: 35,
      resourcePercent: 45,
      description: 'Create stable opening in dimensional membrane',
    },
    {
      name: 'Gate Stabilization',
      durationPercent: 30,
      resourcePercent: 30,
      description: 'Maintain connection to other dimension',
    },
    {
      name: 'Transit Systems',
      durationPercent: 10,
      resourcePercent: 5,
      description: 'Safe passage mechanisms',
    },
  ],

  capabilities: {
    transportCapacity: 1_000_000_000_000_000,  // 1 quadrillion kg/year
    defenseRating: 70,
    energyOutput: 0,
    realityManipulation: true,
    communicationRange: 1_000_000,  // Cross-dimensional
  },

  maintenancePerYear: {
    reality_thread: 1_000_000_000,  // 1 billion per year
    timeline_anchor: 100_000_000,
    quantum_processor: 1_000_000_000,
    void_capacitor: 10_000_000,
  },
  energyMaintenancePerYear: 1_000_000_000_000_000,  // 1 PW
  degradationRate: 0.1,
  failureTimeYears: 10_000,

  militaryValue: 95,
  economicValue: 95,
  culturalValue: 100,

  collapseRiskBase: 0.05,
  vulnerableTo: ['dimensional_collapse', 'brane_rupture', 'exotic_entity_incursion'],
};

// ============================================================================
// BLUEPRINT REGISTRY
// ============================================================================

export const MEGASTRUCTURE_BLUEPRINTS: Record<string, MegastructureBlueprint> = {
  // Orbital
  space_station: SPACE_STATION,
  stanford_torus: STANFORD_TORUS,
  oneill_cylinder: ONEILL_CYLINDER,
  bishop_ring: BISHOP_RING,
  orbital_ring: ORBITAL_RING,

  // Planetary
  planetary_terraformer: PLANETARY_TERRAFORMER,
  planet_cracker: PLANET_CRACKER,
  world_engine: WORLD_ENGINE,
  planetary_shield: PLANETARY_SHIELD,
  climate_engine: CLIMATE_ENGINE,

  // Stellar
  dyson_swarm: DYSON_SWARM,
  dyson_sphere: DYSON_SPHERE,
  stellar_engine: STELLAR_ENGINE,
  star_lifter: STAR_LIFTER,
  nicoll_dyson_beam: NICOLL_DYSON_BEAM,

  // Galactic
  wormhole_gate: WORMHOLE_GATE,
  galactic_highway: GALACTIC_HIGHWAY,
  matrioshka_brain: MATRIOSHKA_BRAIN,
  birch_world: BIRCH_WORLD,

  // Transcendent
  universe_engine: UNIVERSE_ENGINE,
  reality_anchor: REALITY_ANCHOR,
  dimensional_gate: DIMENSIONAL_GATE,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a megastructure blueprint by ID
 */
export function getMegastructureBlueprint(id: string): MegastructureBlueprint | undefined {
  return MEGASTRUCTURE_BLUEPRINTS[id];
}

/**
 * Get all megastructures in a category
 */
export function getMegastructuresByCategory(category: MegastructureCategory): MegastructureBlueprint[] {
  return Object.values(MEGASTRUCTURE_BLUEPRINTS).filter(bp => bp.category === category);
}

/**
 * Get megastructures within a tech level range
 */
export function getMegastructuresByTechLevel(minTech: number, maxTech: number): MegastructureBlueprint[] {
  return Object.values(MEGASTRUCTURE_BLUEPRINTS).filter(
    bp => bp.techLevelRequired >= minTech && bp.techLevelRequired <= maxTech
  );
}

/**
 * Check if civilization can build a megastructure
 */
export interface CivilizationStats {
  techLevel: number;
  availableResources: Record<string, number>;
  completedMegastructures: string[];
  researchCompleted: string[];
}

export interface CanBuildResult {
  canBuild: boolean;
  missingRequirements: string[];
}

export function canBuildMegastructure(
  blueprintId: string,
  civStats: CivilizationStats
): CanBuildResult {
  const blueprint = getMegastructureBlueprint(blueprintId);

  if (!blueprint) {
    return {
      canBuild: false,
      missingRequirements: [`Unknown megastructure: ${blueprintId}`],
    };
  }

  const missing: string[] = [];

  // Check tech level
  if (civStats.techLevel < blueprint.techLevelRequired) {
    missing.push(
      `Tech level ${blueprint.techLevelRequired} required (current: ${civStats.techLevel})`
    );
  }

  // Check prerequisite megastructures
  if (blueprint.prerequisites?.megastructures) {
    for (const reqMega of blueprint.prerequisites.megastructures) {
      if (!civStats.completedMegastructures.includes(reqMega)) {
        const reqBlueprint = getMegastructureBlueprint(reqMega);
        missing.push(
          `Required megastructure: ${reqBlueprint?.name || reqMega}`
        );
      }
    }
  }

  // Check prerequisite research
  if (blueprint.prerequisites?.research) {
    for (const reqResearch of blueprint.prerequisites.research) {
      if (!civStats.researchCompleted.includes(reqResearch)) {
        missing.push(`Required research: ${reqResearch}`);
      }
    }
  }

  // Check resources
  for (const [itemId, required] of Object.entries(blueprint.resources)) {
    const available = civStats.availableResources[itemId] || 0;
    if (available < required) {
      missing.push(
        `Insufficient ${itemId}: ${available}/${required} (need ${required - available} more)`
      );
    }
  }

  return {
    canBuild: missing.length === 0,
    missingRequirements: missing,
  };
}

/**
 * Get all buildable megastructures for a civilization
 */
export function getBuildableMegastructures(civStats: CivilizationStats): MegastructureBlueprint[] {
  return Object.values(MEGASTRUCTURE_BLUEPRINTS).filter(
    blueprint => canBuildMegastructure(blueprint.id, civStats).canBuild
  );
}

/**
 * Calculate total construction cost in person-years
 */
export function calculateTotalLaborCost(blueprint: MegastructureBlueprint): number {
  return blueprint.laborRequired;
}

/**
 * Calculate yearly maintenance cost value
 */
export function calculateMaintenanceValue(
  blueprint: MegastructureBlueprint,
  itemValues: Record<string, number>
): number {
  let total = 0;
  for (const [itemId, amount] of Object.entries(blueprint.maintenancePerYear)) {
    total += (itemValues[itemId] || 0) * amount;
  }
  return total;
}

/**
 * Get megastructures by tier
 */
export function getMegastructuresByTier(tier: MegastructureTier): MegastructureBlueprint[] {
  return Object.values(MEGASTRUCTURE_BLUEPRINTS).filter(bp => bp.tier === tier);
}

/**
 * Get the most expensive megastructures by total mass
 */
export function getMostMassiveMegastructures(count: number = 10): MegastructureBlueprint[] {
  return Object.values(MEGASTRUCTURE_BLUEPRINTS)
    .sort((a, b) => b.totalMass - a.totalMass)
    .slice(0, count);
}

/**
 * Get megastructures that require a specific prerequisite
 */
export function getMegastructuresRequiring(prerequisiteId: string): MegastructureBlueprint[] {
  return Object.values(MEGASTRUCTURE_BLUEPRINTS).filter(
    bp => bp.prerequisites?.megastructures?.includes(prerequisiteId)
  );
}
