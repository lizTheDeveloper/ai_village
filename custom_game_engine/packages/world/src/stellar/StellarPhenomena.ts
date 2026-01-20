/**
 * Stellar Phenomena - Exotic astronomical objects and their resource spawning
 *
 * Stellar phenomena are special locations in star systems that contain rare resources
 * required for advanced technology eras (10+). They include:
 * - Black holes (void essence, exotic matter)
 * - Neutron stars (degenerate matter, strange matter)
 * - Pulsars (temporal dust, magnetar fragments)
 * - White dwarfs (quantum foam, helium-3)
 * - Nebulae (raw gases, stellar dust)
 * - Supernovae remnants (neutronium, heavy elements)
 *
 * Resource discovery is gated by:
 * - Ship arrival at phenomenon coordinates
 * - Sensor quality (ship type dependent)
 * - Crew science skill
 * - Mission duration and type
 *
 * See: custom_game_engine/openspec/specs/grand-strategy/08-TECHNOLOGY-ERAS.md
 */

/** Resource type identifier (string) */
export type ResourceType = string;

// ============================================================================
// Types
// ============================================================================

/**
 * Types of stellar phenomena found in star systems
 */
export enum StellarPhenomenonType {
  BLACK_HOLE = 'black_hole',
  NEUTRON_STAR = 'neutron_star',
  PULSAR = 'pulsar',
  WHITE_DWARF = 'white_dwarf',
  RED_GIANT = 'red_giant',
  PROTOSTAR = 'protostar',
  NEBULA = 'nebula',
  SUPERNOVA_REMNANT = 'supernova_remnant',
}

/**
 * Resource availability at a stellar phenomenon
 */
export interface ResourceSpawn {
  /** Resource type identifier */
  resourceType: ResourceType;
  /** Abundance (0-1) - probability of finding this resource */
  abundance: number;
  /** Difficulty (0-1) - how hard to extract (requires higher tech) */
  difficulty: number;
  /** Base harvest rate (units per tick when mining) */
  baseHarvestRate: number;
}

/**
 * Stellar phenomenon - astronomical object with special resources
 */
export interface StellarPhenomenon {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Phenomenon type */
  type: StellarPhenomenonType;
  /** 3D coordinates in star system (AU from center) */
  coordinates: { x: number; y: number; z: number };
  /** Mass in solar masses */
  mass: number;
  /** Radius in kilometers */
  radius: number;
  /** Age in millions of years */
  age: number;
  /** Available resources */
  resources: ResourceSpawn[];
  /** Parent star system ID */
  systemId: string;
  /** Discovery status */
  discoveredBy?: string; // Civilization/nation ID
  /** Discovery tick */
  discoveredAt?: number;
}

// ============================================================================
// Resource Spawning Rules by Phenomenon Type
// ============================================================================

/**
 * Get resource spawning configuration for a stellar phenomenon type
 *
 * Resource difficulty determines tech level required:
 * - difficulty 0.0-0.3: Tech level 9+ (Fusion era)
 * - difficulty 0.4-0.6: Tech level 10+ (Interplanetary)
 * - difficulty 0.7-0.8: Tech level 11+ (Interstellar)
 * - difficulty 0.9+: Tech level 12+ (Transgalactic)
 *
 * Abundance affects discovery chance:
 * - discoveryChance = sensorQuality × crewSkill × abundance
 *
 * Base harvest rate is modified by:
 * - Ship mining equipment quality
 * - Crew skill
 * - Technology level vs required level
 */
export function getResourceSpawning(type: StellarPhenomenonType): ResourceSpawn[] {
  switch (type) {
    case StellarPhenomenonType.BLACK_HOLE:
      // Era 11+ gated resources - extremely difficult
      return [
        {
          resourceType: 'void_essence',
          abundance: 0.8,
          difficulty: 0.9,
          baseHarvestRate: 0.1, // Very slow extraction
        },
        {
          resourceType: 'exotic_matter',
          abundance: 0.6,
          difficulty: 0.85,
          baseHarvestRate: 0.15,
        },
        {
          resourceType: 'frame_dragging_residue',
          abundance: 0.4,
          difficulty: 0.95,
          baseHarvestRate: 0.05,
        },
        {
          resourceType: 'singularity_fragment',
          abundance: 0.2,
          difficulty: 0.98,
          baseHarvestRate: 0.02, // Clarketech-level rarity
        },
      ];

    case StellarPhenomenonType.NEUTRON_STAR:
      // Era 11+ resources - extreme density materials
      return [
        {
          resourceType: 'degenerate_matter',
          abundance: 0.9,
          difficulty: 0.85,
          baseHarvestRate: 0.2,
        },
        {
          resourceType: 'strange_matter',
          abundance: 0.3,
          difficulty: 0.92,
          baseHarvestRate: 0.08,
        },
        {
          resourceType: 'neutronium',
          abundance: 0.7,
          difficulty: 0.88,
          baseHarvestRate: 0.12,
        },
        {
          resourceType: 'quark_plasma',
          abundance: 0.15,
          difficulty: 0.95,
          baseHarvestRate: 0.03,
        },
      ];

    case StellarPhenomenonType.PULSAR:
      // Era 11+ resources - temporal and magnetic anomalies
      return [
        {
          resourceType: 'temporal_dust',
          abundance: 0.5,
          difficulty: 0.75,
          baseHarvestRate: 0.3,
        },
        {
          resourceType: 'frame_dragging_residue',
          abundance: 0.6,
          difficulty: 0.7,
          baseHarvestRate: 0.25,
        },
        {
          resourceType: 'magnetar_fragments',
          abundance: 0.4,
          difficulty: 0.8,
          baseHarvestRate: 0.18,
        },
        {
          resourceType: 'chronon_particles',
          abundance: 0.2,
          difficulty: 0.9,
          baseHarvestRate: 0.1,
        },
      ];

    case StellarPhenomenonType.WHITE_DWARF:
      // Era 10+ resources - easier to access
      return [
        {
          resourceType: 'quantum_foam',
          abundance: 0.4,
          difficulty: 0.6,
          baseHarvestRate: 0.4,
        },
        {
          resourceType: 'carbon_diamonds',
          abundance: 0.8,
          difficulty: 0.5,
          baseHarvestRate: 0.6,
        },
        {
          resourceType: 'helium_3',
          abundance: 0.3,
          difficulty: 0.4,
          baseHarvestRate: 0.8,
        },
        {
          resourceType: 'crystallized_hydrogen',
          abundance: 0.5,
          difficulty: 0.55,
          baseHarvestRate: 0.5,
        },
      ];

    case StellarPhenomenonType.RED_GIANT:
      // Era 10+ resources - heavy element fusion
      return [
        {
          resourceType: 'heavy_metals',
          abundance: 0.9,
          difficulty: 0.5,
          baseHarvestRate: 0.7,
        },
        {
          resourceType: 'fusion_catalysts',
          abundance: 0.6,
          difficulty: 0.6,
          baseHarvestRate: 0.5,
        },
        {
          resourceType: 'stellar_iron',
          abundance: 0.8,
          difficulty: 0.45,
          baseHarvestRate: 0.75,
        },
        {
          resourceType: 'technetium',
          abundance: 0.3,
          difficulty: 0.7,
          baseHarvestRate: 0.3,
        },
      ];

    case StellarPhenomenonType.PROTOSTAR:
      // Era 10+ resources - primordial materials
      return [
        {
          resourceType: 'primordial_hydrogen',
          abundance: 1.0,
          difficulty: 0.3,
          baseHarvestRate: 1.0,
        },
        {
          resourceType: 'deuterium',
          abundance: 0.7,
          difficulty: 0.4,
          baseHarvestRate: 0.8,
        },
        {
          resourceType: 'stellar_dust',
          abundance: 0.9,
          difficulty: 0.35,
          baseHarvestRate: 0.9,
        },
        {
          resourceType: 'protoplanetary_minerals',
          abundance: 0.5,
          difficulty: 0.5,
          baseHarvestRate: 0.6,
        },
      ];

    case StellarPhenomenonType.NEBULA:
      // Era 9-10 resources - easiest to access
      return [
        {
          resourceType: 'nebular_gas',
          abundance: 1.0,
          difficulty: 0.2,
          baseHarvestRate: 1.2,
        },
        {
          resourceType: 'cosmic_dust',
          abundance: 0.95,
          difficulty: 0.25,
          baseHarvestRate: 1.1,
        },
        {
          resourceType: 'hydrogen_clouds',
          abundance: 1.0,
          difficulty: 0.15,
          baseHarvestRate: 1.5,
        },
        {
          resourceType: 'ionized_plasma',
          abundance: 0.8,
          difficulty: 0.3,
          baseHarvestRate: 0.9,
        },
      ];

    case StellarPhenomenonType.SUPERNOVA_REMNANT:
      // Era 11+ resources - post-stellar-death materials
      return [
        {
          resourceType: 'neutronium_precursor',
          abundance: 0.6,
          difficulty: 0.8,
          baseHarvestRate: 0.2,
        },
        {
          resourceType: 'superheavy_elements',
          abundance: 0.7,
          difficulty: 0.75,
          baseHarvestRate: 0.3,
        },
        {
          resourceType: 'r_process_metals',
          abundance: 0.8,
          difficulty: 0.7,
          baseHarvestRate: 0.4,
        },
        {
          resourceType: 'gamma_ray_residue',
          abundance: 0.4,
          difficulty: 0.85,
          baseHarvestRate: 0.15,
        },
      ];

    default:
      throw new Error(`Unknown stellar phenomenon type: ${type}`);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a stellar phenomenon
 */
export function createStellarPhenomenon(
  id: string,
  name: string,
  type: StellarPhenomenonType,
  coordinates: { x: number; y: number; z: number },
  systemId: string,
  mass: number,
  radius: number,
  age: number
): StellarPhenomenon {
  return {
    id,
    name,
    type,
    coordinates,
    mass,
    radius,
    age,
    resources: getResourceSpawning(type),
    systemId,
  };
}

/**
 * Calculate required tech level for mining a resource
 */
export function getRequiredTechLevel(difficulty: number): number {
  // difficulty 0.0-0.3 → tech 9
  // difficulty 0.4-0.6 → tech 10
  // difficulty 0.7-0.8 → tech 11
  // difficulty 0.9+ → tech 12
  return 9 + difficulty * 3;
}

/**
 * Calculate mining efficiency based on tech level
 */
export function calculateMiningEfficiency(
  requiredTechLevel: number,
  civilizationTechLevel: number
): number {
  if (civilizationTechLevel < requiredTechLevel) {
    // Below required tech - exponential penalty
    const deficit = requiredTechLevel - civilizationTechLevel;
    return Math.max(0.01, Math.exp(-deficit * 0.5));
  }

  // At or above required tech - diminishing returns
  const surplus = civilizationTechLevel - requiredTechLevel;
  return Math.min(1.0, 0.6 + surplus * 0.2);
}

/**
 * Generate random stellar phenomena for a star system
 * Returns 0-2 phenomena per system (10% chance per system)
 */
export function generateStellarPhenomena(
  systemId: string,
  seed: number
): StellarPhenomenon[] {
  const phenomena: StellarPhenomenon[] = [];

  // Seeded random
  const rng = (): number => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // 10% chance of having any phenomena
  if (rng() > 0.1) {
    return phenomena;
  }

  // Weighted random phenomenon type
  const typeWeights = [
    { type: StellarPhenomenonType.BLACK_HOLE, weight: 0.05 },
    { type: StellarPhenomenonType.NEUTRON_STAR, weight: 0.1 },
    { type: StellarPhenomenonType.PULSAR, weight: 0.08 },
    { type: StellarPhenomenonType.WHITE_DWARF, weight: 0.3 },
    { type: StellarPhenomenonType.NEBULA, weight: 0.4 },
    { type: StellarPhenomenonType.SUPERNOVA_REMNANT, weight: 0.07 },
  ];

  const totalWeight = typeWeights.reduce((sum, w) => sum + w.weight, 0);
  const roll = rng() * totalWeight;

  let cumulative = 0;
  let selectedType = StellarPhenomenonType.NEBULA;

  for (const { type, weight } of typeWeights) {
    cumulative += weight;
    if (roll <= cumulative) {
      selectedType = type;
      break;
    }
  }

  // Generate coordinates (10-100 AU from center)
  const distance = 10 + rng() * 90;
  const theta = rng() * Math.PI * 2;
  const phi = rng() * Math.PI;

  const coordinates = {
    x: distance * Math.sin(phi) * Math.cos(theta),
    y: distance * Math.sin(phi) * Math.sin(theta),
    z: distance * Math.cos(phi),
  };

  // Type-specific physical properties
  let mass: number;
  let radius: number;
  let age: number;

  switch (selectedType) {
    case StellarPhenomenonType.BLACK_HOLE:
      mass = 5 + rng() * 95; // 5-100 solar masses
      radius = mass * 2.95; // Schwarzschild radius in km
      age = 100 + rng() * 9900; // 100-10,000 million years
      break;

    case StellarPhenomenonType.NEUTRON_STAR:
    case StellarPhenomenonType.PULSAR:
      mass = 1.4 + rng() * 0.6; // 1.4-2.0 solar masses
      radius = 10 + rng() * 10; // 10-20 km
      age = 10 + rng() * 990; // 10-1,000 million years
      break;

    case StellarPhenomenonType.WHITE_DWARF:
      mass = 0.5 + rng() * 0.7; // 0.5-1.2 solar masses
      radius = 5000 + rng() * 10000; // Earth-sized
      age = 1000 + rng() * 9000; // Old stars
      break;

    case StellarPhenomenonType.RED_GIANT:
      mass = 0.8 + rng() * 7.2; // 0.8-8 solar masses
      radius = 100000000 + rng() * 500000000; // Very large
      age = 5000 + rng() * 5000; // Old main sequence stars
      break;

    case StellarPhenomenonType.NEBULA:
      mass = 10 + rng() * 1000; // 10-1,010 solar masses (diffuse)
      radius = 1e9 + rng() * 9e9; // Light-years in km
      age = 1 + rng() * 10; // Young
      break;

    case StellarPhenomenonType.SUPERNOVA_REMNANT:
      mass = 5 + rng() * 15; // Remnant mass
      radius = 1e8 + rng() * 9e8; // Expanding shell
      age = 0.001 + rng() * 10; // Recently exploded
      break;

    default:
      mass = 1;
      radius = 695700; // Solar radius
      age = 4600;
  }

  const phenomenon = createStellarPhenomenon(
    `${systemId}_phenomenon_${Date.now()}_${Math.floor(rng() * 1000000)}`,
    `${selectedType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} ${systemId.slice(-4)}`,
    selectedType,
    coordinates,
    systemId,
    mass,
    radius,
    age
  );

  phenomena.push(phenomenon);

  // Small chance of second phenomenon (5%)
  if (rng() < 0.05) {
    // Generate another with different type
    const secondPhenomenon = generateStellarPhenomena(systemId, seed + 1000)[0];
    if (secondPhenomenon) {
      phenomena.push(secondPhenomenon);
    }
  }

  return phenomena;
}
