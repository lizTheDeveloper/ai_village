/**
 * Exotic Building Generator
 *
 * Generates non-standard buildings:
 * - Exotic materials (candy, flesh, bone, crystal, books, etc.)
 * - Organic structures (hives, nests, burrows)
 * - Vertical structures (spires, towers, stalactites)
 * - Floating structures (clouds, levitating, suspended)
 * - Non-Euclidean / higher-dimensional buildings
 * - Multi-universe portal buildings (clarketech)
 * - Realm pocket dimensions (small exterior -> infinite interior)
 *
 * INTEGRATION NOTES:
 * This module defines types that align with the core game engine:
 * - DimensionCount aligns with packages/core/src/magic/DimensionalParadigms.ts
 * - RealmPocketConfig aligns with packages/core/src/realms/RealmTypes.ts
 * - UniversePortal aligns with packages/core/src/components/PortalComponent.ts
 * - ClarkeTechTier aligns with architecture/AUTOMATION_LOGISTICS_SPEC.md
 */

import { VoxelBuildingDefinition, TILE_SYMBOLS } from './types';

// =============================================================================
// CORE TYPE ALIGNMENTS (matches packages/core/src/magic/DimensionalParadigms.ts)
// =============================================================================

/**
 * Dimension count aligned with DimensionalParadigms.DimensionCount
 * - 2D: Flatland beings, flattened structures
 * - 3D: Normal universe
 * - 4D: W-axis spatial dimension (HyperRogue style)
 * - 5D: Multiverse level (crossing between universes)
 */
export type DimensionCount = 2 | 3 | 4 | 5 | 6;

/**
 * 4D Position aligned with DimensionalParadigms.Position4D
 */
export interface Position4D {
  x: number;
  y: number;
  z: number;
  w: number;
  wExtent?: number;  // Half-width in W dimension for multi-slice entities
}

/**
 * Dimensional rift aligned with DimensionalParadigms.DimensionalRift
 */
export interface DimensionalRift {
  id: string;
  name: string;
  position: { x: number; y: number; z?: number; w?: number };
  sourceDimensions: DimensionCount;
  targetDimensions: DimensionCount;
  stability: number;  // 0-1
  radius: number;
  visible: boolean;
}

// =============================================================================
// CLARKETECH TIERS (matches architecture/AUTOMATION_LOGISTICS_SPEC.md)
// =============================================================================

/**
 * Clarke's Third Law technology tiers.
 * Buildings can require a minimum clarketech tier to construct.
 */
export type ClarkeTechTier =
  | 0  // Primitive (stone, wood)
  | 1  // Bronze Age
  | 2  // Iron Age
  | 3  // Industrial
  | 4  // Electronic
  | 5  // Quantum (quantum computing, teleportation)
  | 6  // Post-Scarcity (matter compilers, antimatter)
  | 7  // Exotic Physics (wormholes, reality manipulation)
  | 8; // Multiversal (universe gates, dimensional anchors)

export const CLARKETECH_REQUIREMENTS = {
  // Standard buildings: Tier 0-4
  normal: 0,
  automated: 4,

  // Higher dimensional: Tier 7+ (Exotic Physics)
  tesseract: 7,
  penteract: 7,
  hexeract: 8,

  // Multi-universe: Tier 8 (Multiversal)
  universe_gate: 8,
  dimensional_anchor: 7,

  // Realm pockets: Tier 5-7 (depends on size)
  pocket_realm: 5,
  domain_realm: 6,
  infinite_realm: 7,
} as const;

// =============================================================================
// UNIVERSE PORTAL (matches architecture/AUTOMATION_LOGISTICS_SPEC.md)
// =============================================================================

/**
 * Universe gate for multi-universe buildings.
 * Aligned with UniverseGateComponent from AUTOMATION_LOGISTICS_SPEC.md
 */
export interface UniversePortal {
  id: string;
  name: string;

  /** Target universe ID */
  targetUniverseId: string;

  /** Position within building (tile coordinates) */
  position: { x: number; y: number };

  /** Gate status */
  status: 'dormant' | 'calibrating' | 'stable' | 'unstable' | 'collapsed';

  /** Does target universe have a paired anchor? */
  anchored: boolean;

  /** Energy cost per traversal */
  traversalCost: number;

  /** Can entities pass through? */
  traversable: boolean;

  /** Visual appearance */
  visualEffect: 'swirling_void' | 'starfield' | 'prismatic' | 'shadow_gate';
}

// =============================================================================
// REALM POCKET DIMENSIONS (matches packages/core/src/realms/RealmTypes.ts)
// =============================================================================

/**
 * Realm size categories aligned with RealmTypes.RealmSize
 */
export type RealmSize = 'pocket' | 'domain' | 'territory' | 'kingdom' | 'infinite';

/**
 * Time flow in pocket realms
 */
export type TimeFlowType = 'frozen' | 'crawling' | 'slow' | 'normal' | 'fast' | 'rushing' | 'subjective';

/**
 * Configuration for realm pocket dimensions.
 * These are buildings that are small on the outside but large on the inside.
 * The interior exists in a pocket realm.
 */
export interface RealmPocketConfig {
  /** Exterior size in tiles */
  exteriorSize: { width: number; height: number };

  /** Interior realm size category */
  interiorSize: RealmSize;

  /** Actual interior dimensions (can be much larger than exterior) */
  interiorDimensions: { width: number; height: number };

  /** Time flow inside the pocket */
  timeFlow: TimeFlowType;

  /** Ratio: 1.0 = normal, 0.1 = 10x slower inside, 10 = 10x faster inside */
  timeRatio: number;

  /** Realm stability (0-1, lower = more reality-bending effects) */
  stability: number;

  /** Can entities leave freely? */
  canExit: boolean;

  /** Environmental description */
  environment: string;

  /** Special laws that apply inside */
  laws: Array<{
    name: string;
    effect: string;
    description: string;
  }>;

  /** Divine/magical maintenance cost per tick */
  maintenanceCost: number;
}

// =============================================================================
// EXOTIC MATERIALS
// =============================================================================

export type ExoticMaterial =
  // Organic
  | 'flesh'        // Living tissue, pulsing walls
  | 'bone'         // Skeletal architecture
  | 'chitin'       // Insect exoskeleton
  | 'coral'        // Underwater growths
  | 'web'          // Spider silk structures
  | 'wax'          // Honeycomb material
  | 'fungus'       // Mushroom material
  | 'living_wood'  // Trees grown into shape
  | 'vines'        // Woven plant matter
  // Candy/Food
  | 'candy'        // Hard candy, sugar
  | 'chocolate'    // Solid chocolate
  | 'gingerbread'  // Cookie material
  | 'cake'         // Cake walls (soft)
  | 'ice_cream'    // Frozen dairy
  | 'cheese'       // Aged cheese blocks
  // Magical/Abstract
  | 'crystal'      // Crystalline growths
  | 'obsidian'     // Volcanic glass
  | 'void'         // Dark matter, absence
  | 'light'        // Solidified light
  | 'dreams'       // Thought-stuff
  | 'time'         // Frozen moments
  | 'pages'        // Book pages, paper
  | 'music'        // Solidified sound
  // Technological
  | 'circuitry'    // Electronic patterns
  | 'data'         // Digital constructs
  | 'plasma'       // Contained energy
  | 'force_field'  // Energy barriers
  // Elemental
  | 'fire'         // Burning eternally
  | 'water'        // Solid water (not ice)
  | 'air'          // Compressed air blocks
  | 'shadow'       // Darkness given form
  | 'starlight';   // Celestial material

export interface ExoticMaterialProperties {
  insulation: number;
  durability: number;
  weirdness: number;      // How reality-bending (0-100)
  maintenance: number;    // Upkeep difficulty (0-100)
  edible: boolean;
  alive: boolean;
  glows: boolean;
  intangible: boolean;    // Can pass through?
  description: string;
}

export const EXOTIC_MATERIALS: Record<ExoticMaterial, ExoticMaterialProperties> = {
  // Organic
  flesh:       { insulation: 70, durability: 30, weirdness: 80, maintenance: 90, edible: true, alive: true, glows: false, intangible: false, description: 'Pulsing living tissue' },
  bone:        { insulation: 40, durability: 70, weirdness: 60, maintenance: 10, edible: false, alive: false, glows: false, intangible: false, description: 'Bleached skeletal remains' },
  chitin:      { insulation: 50, durability: 80, weirdness: 40, maintenance: 20, edible: false, alive: false, glows: false, intangible: false, description: 'Hard insect exoskeleton' },
  coral:       { insulation: 30, durability: 60, weirdness: 20, maintenance: 50, edible: false, alive: true, glows: false, intangible: false, description: 'Living coral formations' },
  web:         { insulation: 20, durability: 40, weirdness: 30, maintenance: 40, edible: false, alive: false, glows: false, intangible: false, description: 'Strong spider silk' },
  wax:         { insulation: 60, durability: 30, weirdness: 20, maintenance: 30, edible: false, alive: false, glows: false, intangible: false, description: 'Honeycomb wax' },
  fungus:      { insulation: 50, durability: 40, weirdness: 40, maintenance: 60, edible: true, alive: true, glows: true, intangible: false, description: 'Bioluminescent mushroom' },
  living_wood: { insulation: 60, durability: 70, weirdness: 30, maintenance: 40, edible: false, alive: true, glows: false, intangible: false, description: 'Trees shaped while growing' },
  vines:       { insulation: 40, durability: 50, weirdness: 20, maintenance: 50, edible: false, alive: true, glows: false, intangible: false, description: 'Woven plant matter' },

  // Candy/Food
  candy:       { insulation: 30, durability: 20, weirdness: 50, maintenance: 80, edible: true, alive: false, glows: false, intangible: false, description: 'Hard crystallized sugar' },
  chocolate:   { insulation: 40, durability: 15, weirdness: 50, maintenance: 90, edible: true, alive: false, glows: false, intangible: false, description: 'Solid dark chocolate' },
  gingerbread: { insulation: 35, durability: 25, weirdness: 40, maintenance: 70, edible: true, alive: false, glows: false, intangible: false, description: 'Spiced cookie material' },
  cake:        { insulation: 50, durability: 10, weirdness: 60, maintenance: 95, edible: true, alive: false, glows: false, intangible: false, description: 'Soft sponge cake' },
  ice_cream:   { insulation: 90, durability: 5, weirdness: 70, maintenance: 100, edible: true, alive: false, glows: false, intangible: false, description: 'Magically frozen dessert' },
  cheese:      { insulation: 45, durability: 30, weirdness: 30, maintenance: 60, edible: true, alive: false, glows: false, intangible: false, description: 'Aged cheese blocks' },

  // Magical/Abstract
  crystal:     { insulation: 20, durability: 60, weirdness: 50, maintenance: 10, edible: false, alive: false, glows: true, intangible: false, description: 'Prismatic crystal' },
  obsidian:    { insulation: 10, durability: 95, weirdness: 30, maintenance: 5, edible: false, alive: false, glows: false, intangible: false, description: 'Volcanic glass' },
  void:        { insulation: 0, durability: 100, weirdness: 100, maintenance: 0, edible: false, alive: false, glows: false, intangible: true, description: 'Absence of reality' },
  light:       { insulation: 0, durability: 50, weirdness: 90, maintenance: 50, edible: false, alive: false, glows: true, intangible: true, description: 'Solidified photons' },
  dreams:      { insulation: 100, durability: 20, weirdness: 100, maintenance: 80, edible: false, alive: true, glows: true, intangible: true, description: 'Crystallized thoughts' },
  time:        { insulation: 50, durability: 100, weirdness: 100, maintenance: 100, edible: false, alive: false, glows: true, intangible: false, description: 'Frozen moments' },
  pages:       { insulation: 40, durability: 20, weirdness: 40, maintenance: 50, edible: false, alive: false, glows: false, intangible: false, description: 'Layered book pages' },
  music:       { insulation: 30, durability: 30, weirdness: 80, maintenance: 60, edible: false, alive: false, glows: true, intangible: true, description: 'Visible sound waves' },

  // Technological
  circuitry:   { insulation: 20, durability: 50, weirdness: 40, maintenance: 70, edible: false, alive: false, glows: true, intangible: false, description: 'Living circuits' },
  data:        { insulation: 0, durability: 80, weirdness: 80, maintenance: 40, edible: false, alive: false, glows: true, intangible: true, description: 'Digital constructs' },
  plasma:      { insulation: 0, durability: 40, weirdness: 70, maintenance: 90, edible: false, alive: false, glows: true, intangible: false, description: 'Contained energy' },
  force_field: { insulation: 0, durability: 100, weirdness: 60, maintenance: 80, edible: false, alive: false, glows: true, intangible: true, description: 'Energy barrier' },

  // Elemental
  fire:        { insulation: -50, durability: 30, weirdness: 70, maintenance: 80, edible: false, alive: true, glows: true, intangible: false, description: 'Eternal flames' },
  water:       { insulation: 20, durability: 20, weirdness: 60, maintenance: 70, edible: true, alive: false, glows: false, intangible: false, description: 'Solid water (not ice)' },
  air:         { insulation: 0, durability: 10, weirdness: 50, maintenance: 60, edible: false, alive: false, glows: false, intangible: true, description: 'Compressed air' },
  shadow:      { insulation: 80, durability: 40, weirdness: 90, maintenance: 30, edible: false, alive: false, glows: false, intangible: true, description: 'Darkness given form' },
  starlight:   { insulation: 10, durability: 60, weirdness: 80, maintenance: 20, edible: false, alive: false, glows: true, intangible: false, description: 'Celestial radiance' },
};

// =============================================================================
// BUILDING ARCHETYPES
// =============================================================================

export type BuildingArchetype =
  // Organic
  | 'hive'           // Insect colony structure
  | 'nest'           // Bird/creature nest
  | 'burrow'         // Underground warren
  | 'cocoon'         // Wrapped organic shelter
  | 'shell'          // Spiral shell structure
  | 'web_structure'  // Spider web architecture
  // Vertical
  | 'spire'          // Tall narrow tower
  | 'stalactite'     // Hanging from above
  | 'stalagmite'     // Growing from below
  | 'pillar'         // Massive column
  | 'tree_home'      // Built in giant tree
  // Floating
  | 'cloud_castle'   // On clouds
  | 'levitating'     // Floating in air
  | 'suspended'      // Hanging from chains
  | 'bubble'         // Enclosed sphere
  // Non-Euclidean (4D) - Tier 7 Clarketech
  | 'tesseract'      // 4D cube projection (W-axis slices)
  | 'hypercube'      // Generic 4D structure
  | 'klein_bottle'   // Inside-out building
  | 'mobius'         // Twisted continuous space
  // Higher Dimensional (5D/6D) - Tier 7-8 Clarketech
  | 'penteract'      // 5D hypercube (phase-shifting)
  | 'hexeract'       // 6D hypercube (quantum superposition)
  // Multiverse (5D) - Tier 8 Clarketech
  | 'universe_gate'  // Portal hub to other universes
  | 'nexus'          // Connects 3+ universes
  | 'anchor_station' // Dimensional anchor for universe gates
  // Realm Pockets (small outside, big inside) - Tier 5-7
  | 'pocket_cabin'   // Small cabin -> room-sized interior
  | 'pocket_manor'   // Small house -> mansion interior
  | 'pocket_realm'   // Tiny structure -> village-sized interior
  | 'infinite_room'  // Finite exterior -> infinite interior
  | 'folded_space'   // Multiple overlapping rooms
  | 'time_loop'      // Same room in different times
  // Abstract
  | 'fractal'        // Self-similar at all scales
  | 'impossible'     // Escher-like geometry
  | 'void_pocket'    // Hole in reality
  | 'dream_realm';   // Shifting, unstable

// =============================================================================
// HIGHER-DIMENSIONAL BUILDING DATA
// =============================================================================

/**
 * Dimensional configuration for buildings beyond 3D.
 * Aligned with DimensionalParadigms.ts semantics:
 * - 4D: W-axis spatial dimension (HyperRogue scrolling slices)
 * - 5D: Multiverse connections (portals between universes)
 */
export interface DimensionalConfig {
  /** Base dimension count of the building (aligned with DimensionCount) */
  dimension: DimensionCount;

  /**
   * 4D W-axis configuration.
   * Building exists across multiple W-slices, navigable by scrolling.
   */
  w_axis?: {
    /** Number of W-axis slices this building spans */
    layers: number;

    /** Currently visible slice (0 to layers-1) */
    currentSlice: number;

    /** Layout for each W-slice (may differ per slice) */
    sliceLayouts?: string[][];

    /** Building's position in 4D space */
    position4D?: Position4D;
  };

  /**
   * 5D V-axis configuration (for penteracts).
   * Building cycles through multiple phase configurations.
   */
  v_axis?: {
    /** Number of phase states */
    phases: number;

    /** Current active phase (0 to phases-1) */
    currentPhase: number;

    /** Layouts for each phase state */
    phaseLayouts?: string[][];

    /** Rate of phase transitions (0-1) */
    transitionRate: number;
  };

  /**
   * 6D U-axis configuration (for hexeracts).
   * Building exists in quantum superposition of states.
   */
  u_axis?: {
    /** Number of probability states */
    probabilityStates: number;

    /** Whether the superposition has collapsed */
    collapsed: boolean;

    /** Probability weights for each state */
    stateWeights: number[];

    /** Layouts for each probability state */
    stateLayouts?: string[][];
  };

  /**
   * 5D Multiverse configuration.
   * Building contains portals to other universes.
   */
  multiverse?: {
    /** Universe IDs this building connects to */
    connectedUniverses: string[];

    /** Portal definitions within the building */
    portals: UniversePortal[];

    /** Is this a nexus building (connects 3+ universes)? */
    isNexus: boolean;
  };

  /** Dimensional rifts within the building */
  rifts?: DimensionalRift[];
}

/**
 * Extended building definition with exotic properties.
 * Integrates with:
 * - DimensionalParadigms (dimensional config)
 * - RealmTypes (pocket dimensions)
 * - ClarkeTech (technology requirements)
 */
export interface HigherDimensionalBuilding extends VoxelBuildingDefinition {
  /** Exotic construction material */
  exoticMaterial?: ExoticMaterial;

  /** Building archetype (hive, spire, tesseract, etc.) */
  archetype?: BuildingArchetype;

  /** Dimensional configuration for 4D+ buildings */
  dimensional?: DimensionalConfig;

  /** Realm pocket configuration (small outside, big inside) */
  realmPocket?: RealmPocketConfig;

  /** Multi-universe portal configuration */
  universePortals?: UniversePortal[];

  /** Minimum clarketech tier required to build */
  clarkeTechTier?: ClarkeTechTier;

  /** Research prerequisites */
  researchRequired?: string[];
}

// =============================================================================
// EXOTIC BUILDING GENERATOR
// =============================================================================

export interface ExoticBuildingSpec {
  name?: string;
  archetype: BuildingArchetype;
  material: ExoticMaterial;
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
  roomCount?: number;
  features?: string[];
}

/**
 * Generate an exotic building based on specifications.
 */
export function generateExoticBuilding(spec: ExoticBuildingSpec): HigherDimensionalBuilding {
  // Get base generator for archetype
  switch (spec.archetype) {
    // Organic
    case 'hive':
      return generateHive(spec);
    case 'shell':
      return generateShell(spec);
    case 'web_structure':
      return generateWebStructure(spec);

    // Vertical
    case 'spire':
      return generateSpire(spec);
    case 'stalactite':
      return generateStalactite(spec);
    case 'bubble':
      return generateBubble(spec);

    // 4D Non-Euclidean (Tier 7)
    case 'tesseract':
    case 'hypercube':
      return generateTesseract(spec);

    // 5D/6D Higher-dimensional (Tier 7-8)
    case 'penteract':
      return generatePenteract(spec);
    case 'hexeract':
      return generateHexeract(spec);

    // Multiverse (Tier 8)
    case 'universe_gate':
      return generateUniverseGate(spec);
    case 'nexus':
      return generateNexus(spec);

    // Realm Pockets (Tier 5-7)
    case 'pocket_cabin':
      return generatePocketCabin(spec);
    case 'pocket_manor':
      return generatePocketManor(spec);
    case 'pocket_realm':
      return generatePocketRealm(spec);
    case 'infinite_room':
      return generateInfiniteRoom(spec);

    // Abstract
    case 'fractal':
      return generateFractal(spec);

    default:
      return generateGenericExotic(spec);
  }
}

// =============================================================================
// HIVE GENERATOR (Hexagonal insectoid structures)
// =============================================================================

function generateHive(spec: ExoticBuildingSpec): VoxelBuildingDefinition {
  const sizes = { tiny: 7, small: 11, medium: 15, large: 21, huge: 31 };
  const size = sizes[spec.size];
  const cells = Math.floor(size / 4);

  // Create hexagonal-ish cells
  const layout: string[] = [];
  const center = Math.floor(size / 2);

  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > center - 1) {
        row += ' ';
      } else if (dist > center - 2) {
        row += TILE_SYMBOLS.WALL;
      } else {
        // Create honeycomb pattern
        const inCellX = x % 3;
        const inCellY = y % 3;

        if (inCellX === 0 || inCellY === 0) {
          row += TILE_SYMBOLS.WALL;
        } else {
          row += TILE_SYMBOLS.FLOOR;
        }
      }
    }
    layout.push(row);
  }

  // Add entrance
  const entranceY = size - 2;
  const entranceX = center;
  layout[entranceY] = replaceAt(layout[entranceY]!, entranceX, TILE_SYMBOLS.DOOR);

  // Add some egg chambers (storage)
  for (let i = 0; i < cells; i++) {
    const rx = 2 + Math.floor(Math.random() * (size - 4));
    const ry = 2 + Math.floor(Math.random() * (size - 4));
    if (layout[ry]?.[rx] === TILE_SYMBOLS.FLOOR) {
      layout[ry] = replaceAt(layout[ry]!, rx, TILE_SYMBOLS.STORAGE);
    }
  }

  return {
    id: `hive_${spec.material}`,
    name: spec.name || `${capitalize(spec.material)} Hive`,
    description: `A ${spec.size} insectoid hive made of ${spec.material}.`,
    category: 'residential',
    tier: 3,
    species: 'custom',
    layout,
    materials: {
      wall: 'stone',  // Will use exotic material in renderer
      floor: 'stone',
      door: 'stone',
    },
    functionality: [
      { type: 'sleeping', params: { beds: cells } },
      { type: 'storage', params: { capacity: cells * 20 } },
    ],
    capacity: cells * 2,
    style: 'ancient',
    lore: `Built by hive-mind creatures from ${spec.material}. The hexagonal cells provide optimal space usage.`,
    exoticMaterial: spec.material,
    archetype: spec.archetype,
  } as VoxelBuildingDefinition & { exoticMaterial: ExoticMaterial; archetype: BuildingArchetype };
}

// =============================================================================
// SPIRE GENERATOR (Tall narrow towers)
// =============================================================================

function generateSpire(spec: ExoticBuildingSpec): VoxelBuildingDefinition {
  const widths = { tiny: 5, small: 7, medium: 9, large: 11, huge: 15 };
  const floors = { tiny: 2, small: 3, medium: 4, large: 5, huge: 7 };

  const baseWidth = widths[spec.size];
  const floorCount = floors[spec.size];

  // Ground floor (widest)
  const groundFloor = generateSpireFloor(baseWidth);

  // Upper floors (progressively narrower)
  const upperFloors = [];
  for (let f = 1; f < floorCount; f++) {
    const width = Math.max(5, baseWidth - f * 2);
    upperFloors.push({
      level: f,
      name: f === floorCount - 1 ? 'Pinnacle' : `Level ${f + 1}`,
      ceilingHeight: 4 - Math.floor(f / 2),
      layout: generateSpireFloor(width),
    });
  }

  return {
    id: `spire_${spec.material}`,
    name: spec.name || `${capitalize(spec.material)} Spire`,
    description: `A ${floorCount}-story spire reaching toward the sky, built of ${spec.material}.`,
    category: 'research',
    tier: 4,
    species: 'tall',
    layout: groundFloor,
    floors: upperFloors,
    materials: {
      wall: 'stone',
      floor: 'stone',
      door: 'stone',
    },
    functionality: [
      { type: 'research', params: { bonus: 1.5 + floorCount * 0.2 } },
    ],
    capacity: floorCount * 3,
    style: 'ancient',
    lore: `This ${spec.material} spire pierces the heavens. Scholars climb its ${floorCount} levels seeking enlightenment.`,
  };
}

function generateSpireFloor(width: number): string[] {
  const layout: string[] = [];
  const center = Math.floor(width / 2);

  for (let y = 0; y < width; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const dx = Math.abs(x - center);
      const dy = Math.abs(y - center);

      // Octagonal shape
      if (dx + dy > center + 1) {
        row += ' ';
      } else if (dx + dy > center - 1 || x === 0 || x === width - 1 || y === 0 || y === width - 1) {
        row += TILE_SYMBOLS.WALL;
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    layout.push(row);
  }

  // Add stairs
  layout[center] = replaceAt(layout[center]!, center, TILE_SYMBOLS.STAIRS_BOTH);

  // Add entrance on bottom floor
  layout[width - 1] = replaceAt(layout[width - 1]!, center, TILE_SYMBOLS.DOOR);

  return layout;
}

// =============================================================================
// TESSERACT GENERATOR (4D hypercube projection)
// =============================================================================

function generateTesseract(spec: ExoticBuildingSpec): HigherDimensionalBuilding {
  // A tesseract projected into 3D appears as a cube within a cube
  // We represent this as rooms that "overlap" - same coordinates, different floors
  const sizes = { tiny: 7, small: 11, medium: 15, large: 19, huge: 25 };
  const size = sizes[spec.size];
  const innerSize = Math.floor(size * 0.6);
  const offset = Math.floor((size - innerSize) / 2);

  // Outer cube (floor 0)
  const outerLayout: string[] = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
        row += TILE_SYMBOLS.WALL;
      } else if (x === offset || x === size - offset - 1 || y === offset || y === size - offset - 1) {
        row += TILE_SYMBOLS.WALL; // Inner cube walls visible in outer
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    outerLayout.push(row);
  }

  // Add stairs to "inner dimension"
  const center = Math.floor(size / 2);
  outerLayout[center] = replaceAt(outerLayout[center]!, center, TILE_SYMBOLS.STAIRS_UP);

  // Add entrance
  outerLayout[size - 1] = replaceAt(outerLayout[size - 1]!, center, TILE_SYMBOLS.DOOR);

  // Inner cube (floor 1) - same physical space, different dimension
  const innerLayout: string[] = [];
  for (let y = 0; y < innerSize; y++) {
    let row = ' '.repeat(offset);
    for (let x = 0; x < innerSize; x++) {
      if (x === 0 || x === innerSize - 1 || y === 0 || y === innerSize - 1) {
        row += TILE_SYMBOLS.WALL;
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    row += ' '.repeat(offset);
    innerLayout.push(row);
  }

  // Add padding rows
  const paddedInner = [
    ...Array(offset).fill(' '.repeat(size)),
    ...innerLayout,
    ...Array(offset).fill(' '.repeat(size)),
  ];

  // Stairs back
  paddedInner[center] = replaceAt(paddedInner[center]!, center, TILE_SYMBOLS.STAIRS_DOWN);

  return {
    id: `tesseract_${spec.material}`,
    name: spec.name || `${capitalize(spec.material)} Tesseract`,
    description: `A 4-dimensional hypercube projected into 3D space. The inner cube exists in a parallel dimension.`,
    category: 'research',
    tier: 5,
    species: 'medium',
    layout: outerLayout,
    floors: [{
      level: 1,
      name: 'Inner Dimension',
      ceilingHeight: 6,
      layout: paddedInner,
    }],
    materials: {
      wall: 'glass',
      floor: 'stone',
      door: 'metal',
    },
    functionality: [
      { type: 'research', params: { bonus: 3.0, fields: ['dimensional', 'arcane'] } },
      { type: 'storage', params: { capacity: 500, itemTypes: ['artifacts'] } }, // Bigger on inside!
    ],
    capacity: 8,
    style: 'modern',
    lore: `This structure exists partially in the 4th dimension. The inner chamber contains more space than should be possible.`,
    exoticMaterial: spec.material,
    archetype: 'tesseract',
    clarkeTechTier: 7,
    researchRequired: ['exotic_physics_ii', 'tesseract_geometry'],
    dimensional: {
      dimension: 4,
      w_axis: {
        layers: 2,
        currentSlice: 0,
        sliceLayouts: [outerLayout, paddedInner],
        position4D: { x: 0, y: 0, z: 0, w: 0, wExtent: 1 },
      },
    },
  };
}

// =============================================================================
// PENTERACT GENERATOR (5D hypercube - phase-shifting structure)
// =============================================================================

/**
 * 5D Penteract: Projects as a tesseract that cycles through multiple "phase states".
 * Each phase represents a different slice along the 5th dimension (V-axis).
 * Rooms shift, doors appear/disappear, furniture rearranges between phases.
 */
function generatePenteract(spec: ExoticBuildingSpec): HigherDimensionalBuilding {
  const sizes = { tiny: 9, small: 13, medium: 17, large: 21, huge: 27 };
  const size = sizes[spec.size];
  const phaseCount = { tiny: 2, small: 3, medium: 4, large: 5, huge: 6 }[spec.size];
  const center = Math.floor(size / 2);

  // Generate multiple phase layouts - each phase is a different configuration
  const phaseLayouts: string[][] = [];

  for (let phase = 0; phase < phaseCount; phase++) {
    const layout: string[] = [];
    const rotation = (phase * Math.PI * 2) / phaseCount; // Each phase rotates the structure

    for (let y = 0; y < size; y++) {
      let row = '';
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;

        // Rotate coordinates based on phase
        const rx = dx * Math.cos(rotation) - dy * Math.sin(rotation);
        const ry = dx * Math.sin(rotation) + dy * Math.cos(rotation);
        const distSq = rx * rx + ry * ry;
        const centerMinus1Sq = (center - 1) * (center - 1);
        const centerMinus2Sq = (center - 2) * (center - 2);

        // Outer boundary
        if (distSq > centerMinus1Sq) {
          row += ' ';
        } else if (distSq > centerMinus2Sq) {
          row += TILE_SYMBOLS.WALL;
        } else {
          // Internal structure varies by phase
          const cellX = Math.floor((rx + center) / 4);
          const cellY = Math.floor((ry + center) / 4);
          const phaseOffset = (cellX + cellY + phase) % 3;

          if (phaseOffset === 0 && distSq > 9) {
            row += TILE_SYMBOLS.WALL; // Walls shift with phase
          } else if ((x + y + phase) % 7 === 0 && distSq > 4) {
            row += TILE_SYMBOLS.PILLAR; // Pillars mark phase boundaries
          } else {
            row += TILE_SYMBOLS.FLOOR;
          }
        }
      }
      layout.push(row);
    }

    // Add phase-specific features
    // Entrance position rotates with phase
    const entranceAngle = rotation + Math.PI;
    const entranceX = center + Math.round(Math.cos(entranceAngle) * (center - 1));
    const entranceY = center + Math.round(Math.sin(entranceAngle) * (center - 1));
    if (layout[entranceY]) {
      layout[entranceY] = replaceAt(layout[entranceY]!, entranceX, TILE_SYMBOLS.DOOR);
    }

    // Central stairs to higher dimension
    layout[center] = replaceAt(layout[center]!, center, TILE_SYMBOLS.STAIRS_BOTH);

    // Phase-specific furniture
    const furnitureAngle = rotation;
    for (let i = 0; i < phase + 2; i++) {
      const angle = furnitureAngle + (i * Math.PI * 2) / (phase + 2);
      const fx = center + Math.round(Math.cos(angle) * (center / 2));
      const fy = center + Math.round(Math.sin(angle) * (center / 2));
      const furniture = [TILE_SYMBOLS.TABLE, TILE_SYMBOLS.STORAGE, TILE_SYMBOLS.WORKSTATION][i % 3]!;
      if (layout[fy]?.[fx] === TILE_SYMBOLS.FLOOR) {
        layout[fy] = replaceAt(layout[fy]!, fx, furniture);
      }
    }

    phaseLayouts.push(layout);
  }

  return {
    id: `penteract_${spec.material}`,
    name: spec.name || `${capitalize(spec.material)} Penteract`,
    description: `A 5-dimensional structure that phases between ${phaseCount} configurations. Walls shift, doors relocate, and rooms transform as it cycles through the V-axis.`,
    category: 'research',
    tier: 5,
    species: 'medium',
    layout: phaseLayouts[0]!, // Current visible layout
    materials: {
      wall: 'glass',
      floor: 'tile',
      door: 'metal',
    },
    functionality: [
      { type: 'research', params: { bonus: 4.0, fields: ['dimensional', 'temporal', 'arcane'] } },
      { type: 'mood_aura', params: { bonus: -15 } }, // Disorienting
    ],
    capacity: 12,
    style: 'modern',
    lore: `This structure exists in 5-dimensional space. It cycles through ${phaseCount} distinct configurations as it rotates along the V-axis. Occupants report déjà vu and temporal disorientation.`,
    exoticMaterial: spec.material,
    archetype: 'penteract',
    dimensional: {
      dimension: 5,
      w_axis: { layers: 2, currentSlice: 0 },
      v_axis: {
        phases: phaseCount,
        currentPhase: 0,
        phaseLayouts,
        transitionRate: 0.1, // Slow phase transitions
      },
    },
  };
}

// =============================================================================
// HEXERACT GENERATOR (6D hypercube - quantum superposition)
// =============================================================================

/**
 * 6D Hexeract: A structure existing in quantum superposition.
 * Multiple possible configurations exist simultaneously until observed.
 * The U-axis represents probability states that collapse on observation.
 */
function generateHexeract(spec: ExoticBuildingSpec): HigherDimensionalBuilding {
  const sizes = { tiny: 11, small: 15, medium: 19, large: 25, huge: 31 };
  const size = sizes[spec.size];
  const stateCount = { tiny: 2, small: 3, medium: 4, large: 6, huge: 8 }[spec.size];
  const center = Math.floor(size / 2);

  // Generate probability state layouts
  const stateLayouts: string[][] = [];
  const stateWeights: number[] = [];

  for (let state = 0; state < stateCount; state++) {
    const layout: string[] = [];
    const chaos = (state + 1) / stateCount; // Higher states = more chaotic
    // State-level seed for features that depend on the state
    const stateSeed = ((state * 31 + stateCount * 17) % 100) / 100;

    // Weight inversely proportional to chaos (stable states more likely)
    stateWeights.push(1 / (chaos + 0.5));

    for (let y = 0; y < size; y++) {
      let row = '';
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        const distSq = dx * dx + dy * dy;
        const centerMinus1Sq = (center - 1) * (center - 1);
        const centerMinus2Sq = (center - 2) * (center - 2);

        // Seed random based on position and state for reproducibility
        const cellSeed = ((x * 31 + y * 17 + state * 13) % 100) / 100;

        if (distSq > centerMinus1Sq) {
          row += ' ';
        } else if (distSq > centerMinus2Sq) {
          // Boundary - solid in low-chaos states, broken in high
          if (cellSeed > chaos * 0.3) {
            row += TILE_SYMBOLS.WALL;
          } else {
            row += TILE_SYMBOLS.FLOOR; // Holes in reality
          }
        } else {
          // Interior structure depends on probability state
          const pattern = (x * y + state) % 5;
          const centerHalfSq = (center / 2) * (center / 2);

          if (pattern === 0 && cellSeed < chaos) {
            row += TILE_SYMBOLS.VOID; // Void patches in chaotic states
          } else if (pattern === 1 && cellSeed > chaos * 0.5) {
            row += TILE_SYMBOLS.WALL;
          } else if (pattern === 2 && distSq < centerHalfSq && cellSeed < chaos * 0.8) {
            row += TILE_SYMBOLS.PILLAR;
          } else {
            row += TILE_SYMBOLS.FLOOR;
          }
        }
      }
      layout.push(row);
    }

    // State-specific entrance (uncertainty in where doors are)
    const entranceX = center + Math.floor((stateSeed - 0.5) * 4);
    layout[size - 2] = replaceAt(layout[size - 2]!, Math.max(1, Math.min(size - 2, entranceX)), TILE_SYMBOLS.DOOR);

    // Central observation point
    layout[center] = replaceAt(layout[center]!, center, TILE_SYMBOLS.STAIRS_BOTH);

    // Probability furniture - more in stable states
    const furnitureCount = Math.floor((1 - chaos) * 8) + 2;
    for (let i = 0; i < furnitureCount; i++) {
      const angle = (i * Math.PI * 2) / furnitureCount + state;
      const radius = center / 2 + ((stateSeed * 10) % 3);
      const fx = center + Math.round(Math.cos(angle) * radius);
      const fy = center + Math.round(Math.sin(angle) * radius);

      if (layout[fy]?.[fx] === TILE_SYMBOLS.FLOOR) {
        const furniture = [
          TILE_SYMBOLS.TABLE,
          TILE_SYMBOLS.STORAGE,
          TILE_SYMBOLS.WORKSTATION,
          TILE_SYMBOLS.BED,
        ][i % 4]!;
        layout[fy] = replaceAt(layout[fy]!, fx, furniture);
      }
    }

    stateLayouts.push(layout);
  }

  // Normalize weights
  const totalWeight = stateWeights.reduce((a, b) => a + b, 0);
  const normalizedWeights = stateWeights.map(w => w / totalWeight);

  return {
    id: `hexeract_${spec.material}`,
    name: spec.name || `${capitalize(spec.material)} Hexeract`,
    description: `A 6-dimensional structure existing in quantum superposition. It has ${stateCount} probability states that collapse when observed.`,
    category: 'research',
    tier: 5,
    species: 'medium',
    layout: stateLayouts[0]!, // Most probable state shown by default
    materials: {
      wall: 'glass',
      floor: 'tile',
      door: 'metal',
    },
    functionality: [
      { type: 'research', params: { bonus: 5.0, fields: ['dimensional', 'quantum', 'probability'] } },
      { type: 'mood_aura', params: { bonus: -25 } }, // Extremely unsettling
      { type: 'storage', params: { capacity: 1000 } }, // Items in superposition
    ],
    capacity: 16,
    style: 'modern',
    lore: `This structure exists in ${stateCount} simultaneous probability states along the U-axis. Observers collapse the superposition, but different observers may see different configurations. Schrödinger would be proud.`,
    exoticMaterial: spec.material,
    archetype: 'hexeract',
    dimensional: {
      dimension: 6,
      w_axis: { layers: 2, currentSlice: 0 },
      v_axis: {
        phases: 3,
        currentPhase: 0,
        phaseLayouts: stateLayouts.slice(0, 3),
        transitionRate: 0.05,
      },
      u_axis: {
        probabilityStates: stateCount,
        collapsed: false,
        stateWeights: normalizedWeights,
        stateLayouts,
      },
    },
  };
}

// =============================================================================
// INFINITE ROOM (Bigger on the inside)
// =============================================================================

function generateInfiniteRoom(spec: ExoticBuildingSpec): HigherDimensionalBuilding {
  // Small exterior, massive interior
  const exteriorSize = 7;
  const interiorMultiplier = { tiny: 2, small: 3, medium: 4, large: 6, huge: 10 };
  const interiorSize = exteriorSize * interiorMultiplier[spec.size];

  // Tiny exterior
  const exterior: string[] = [
    '#######',
    '#.....#',
    '#..^..#',
    '#.....#',
    '#.....#',
    '#..D..#',
    '#######',
  ];

  // Massive interior
  const interior: string[] = [];
  for (let y = 0; y < interiorSize; y++) {
    let row = '';
    for (let x = 0; x < interiorSize; x++) {
      if (x === 0 || x === interiorSize - 1 || y === 0 || y === interiorSize - 1) {
        row += TILE_SYMBOLS.WALL;
      } else if ((x % 10 === 0 || y % 10 === 0) && x > 0 && y > 0) {
        row += TILE_SYMBOLS.PILLAR; // Pillars for structure
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    interior.push(row);
  }

  // Stairs down in center
  const center = Math.floor(interiorSize / 2);
  interior[center] = replaceAt(interior[center]!, center, TILE_SYMBOLS.STAIRS_DOWN);

  // Add furniture throughout
  for (let i = 0; i < interiorSize; i += 5) {
    for (let j = 0; j < interiorSize; j += 5) {
      if (interior[i]?.[j] === TILE_SYMBOLS.FLOOR) {
        const furniture = [TILE_SYMBOLS.TABLE, TILE_SYMBOLS.STORAGE, TILE_SYMBOLS.BED][Math.floor(Math.random() * 3)]!;
        interior[i] = replaceAt(interior[i]!, j, furniture);
      }
    }
  }

  return {
    id: `infinite_room_${spec.material}`,
    name: spec.name || `Infinite ${capitalize(spec.material)} Chamber`,
    description: `A small hut that contains an impossibly vast interior space.`,
    category: 'storage',
    tier: 5,
    species: 'medium',
    layout: exterior,
    floors: [{
      level: 1,
      name: 'The Infinite Interior',
      ceilingHeight: 20,
      layout: interior,
    }],
    materials: {
      wall: 'wood',
      floor: 'wood',
      door: 'wood',
    },
    functionality: [
      { type: 'storage', params: { capacity: interiorSize * interiorSize } },
      { type: 'mood_aura', params: { bonus: -10 } }, // Unsettling
    ],
    capacity: 100,
    style: 'whimsical',
    lore: `This humble exterior belies a ${interiorSize}x${interiorSize} interior. Space folds in on itself within.`,
    exoticMaterial: spec.material,
    archetype: 'infinite_room',
    clarkeTechTier: 7,
    researchRequired: ['exotic_physics_ii'],
    realmPocket: {
      exteriorSize: { width: exteriorSize, height: exteriorSize },
      interiorSize: 'infinite',
      interiorDimensions: { width: interiorSize, height: interiorSize },
      timeFlow: 'normal',
      timeRatio: 1.0,
      stability: 0.7,
      canExit: true,
      environment: 'vast_emptiness',
      laws: [
        { name: 'spatial_folding', effect: 'space_larger_inside', description: 'Interior space exceeds exterior boundaries' },
      ],
      maintenanceCost: 50,
    },
  };
}

// =============================================================================
// UNIVERSE GATE GENERATORS (Tier 8 Clarketech)
// =============================================================================

/**
 * Universe Gate: A building containing a portal to another universe.
 * Requires Tier 8 clarketech (Multiversal).
 */
function generateUniverseGate(spec: ExoticBuildingSpec): HigherDimensionalBuilding {
  const sizes = { tiny: 9, small: 13, medium: 17, large: 23, huge: 31 };
  const size = sizes[spec.size];
  const center = Math.floor(size / 2);

  const layout: string[] = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const distSq = dx * dx + dy * dy;
      const centerMinus1Sq = (center - 1) * (center - 1);
      const centerMinus2Sq = (center - 2) * (center - 2);

      if (distSq > centerMinus1Sq) {
        row += ' ';
      } else if (distSq > centerMinus2Sq) {
        row += TILE_SYMBOLS.WALL;
      } else if (distSq < 9) { // 3^2 = 9
        // Central portal area (marked with void)
        row += TILE_SYMBOLS.VOID;
      } else if ((x + y) % 4 === 0) {
        row += TILE_SYMBOLS.PILLAR; // Support pillars
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    layout.push(row);
  }

  // Entrance
  layout[size - 2] = replaceAt(layout[size - 2]!, center, TILE_SYMBOLS.DOOR);

  // Control stations around portal
  const controlPositions = [
    { x: center - 4, y: center },
    { x: center + 4, y: center },
    { x: center, y: center - 4 },
    { x: center, y: center + 4 },
  ];
  for (const pos of controlPositions) {
    if (layout[pos.y]?.[pos.x] === TILE_SYMBOLS.FLOOR) {
      layout[pos.y] = replaceAt(layout[pos.y]!, pos.x, TILE_SYMBOLS.WORKSTATION);
    }
  }

  return {
    id: `universe_gate_${spec.material}`,
    name: spec.name || `${capitalize(spec.material)} Universe Gate`,
    description: 'A facility containing a stabilized portal to another universe. Requires dimensional anchors at both ends.',
    category: 'research',
    tier: 5,
    species: 'medium',
    layout,
    materials: {
      wall: 'metal',
      floor: 'tile',
      door: 'metal',
    },
    functionality: [
      { type: 'research', params: { bonus: 3.0, fields: ['dimensional', 'multiverse'] } },
    ],
    capacity: 20,
    style: 'modern',
    lore: 'This facility houses a stabilized rift to another universe. The central void leads to realities beyond imagination.',
    exoticMaterial: spec.material,
    archetype: 'universe_gate',
    clarkeTechTier: 8,
    researchRequired: ['exotic_physics_iii', 'universe_bridging'],
    dimensional: {
      dimension: 5,
      multiverse: {
        connectedUniverses: ['target_universe'],  // Placeholder
        portals: [{
          id: 'main_portal',
          name: 'Primary Universe Gate',
          targetUniverseId: 'target_universe',
          position: { x: center, y: center },
          status: 'dormant',
          anchored: false,
          traversalCost: 1000,
          traversable: false,
          visualEffect: 'swirling_void',
        }],
        isNexus: false,
      },
    },
  };
}

/**
 * Nexus: A building connecting 3+ universes.
 * The ultimate Tier 8 structure.
 */
function generateNexus(spec: ExoticBuildingSpec): HigherDimensionalBuilding {
  const sizes = { tiny: 15, small: 21, medium: 27, large: 35, huge: 45 };
  const size = sizes[spec.size];
  const center = Math.floor(size / 2);
  const portalCount = { tiny: 3, small: 4, medium: 5, large: 6, huge: 8 }[spec.size];

  const layout: string[] = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const distSq = dx * dx + dy * dy;
      const centerMinus1Sq = (center - 1) * (center - 1);
      const centerMinus2Sq = (center - 2) * (center - 2);

      if (distSq > centerMinus1Sq) {
        row += ' ';
      } else if (distSq > centerMinus2Sq) {
        row += TILE_SYMBOLS.WALL;
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    layout.push(row);
  }

  // Create portal alcoves around the perimeter
  const portals: UniversePortal[] = [];
  for (let i = 0; i < portalCount; i++) {
    const angle = (i * Math.PI * 2) / portalCount;
    const portalX = center + Math.round(Math.cos(angle) * (center - 4));
    const portalY = center + Math.round(Math.sin(angle) * (center - 4));

    // Create void portal
    if (layout[portalY]) {
      layout[portalY] = replaceAt(layout[portalY]!, portalX, TILE_SYMBOLS.VOID);
    }

    const visualEffects: Array<'swirling_void' | 'starfield' | 'prismatic' | 'shadow_gate'> =
      ['swirling_void', 'starfield', 'prismatic', 'shadow_gate'];

    portals.push({
      id: `portal_${i}`,
      name: `Gate ${i + 1}`,
      targetUniverseId: `universe_${i}`,
      position: { x: portalX, y: portalY },
      status: 'dormant',
      anchored: false,
      traversalCost: 500,
      traversable: false,
      visualEffect: visualEffects[i % 4]!,
    });
  }

  // Central control hub
  layout[center] = replaceAt(layout[center]!, center, TILE_SYMBOLS.WORKSTATION);

  // Entrance
  layout[size - 2] = replaceAt(layout[size - 2]!, center, TILE_SYMBOLS.DOOR);

  return {
    id: `nexus_${spec.material}`,
    name: spec.name || `${capitalize(spec.material)} Nexus`,
    description: `A multiversal hub connecting ${portalCount} different universes. The crossroads of reality.`,
    category: 'research',
    tier: 5,
    species: 'medium',
    layout,
    materials: {
      wall: 'glass',
      floor: 'tile',
      door: 'metal',
    },
    functionality: [
      { type: 'research', params: { bonus: 5.0, fields: ['dimensional', 'multiverse', 'cosmology'] } },
    ],
    capacity: 50,
    style: 'modern',
    lore: `This nexus point connects ${portalCount} universes. Reality itself bends at the seams here.`,
    exoticMaterial: spec.material,
    archetype: 'nexus',
    clarkeTechTier: 8,
    researchRequired: ['exotic_physics_iii', 'universe_bridging', 'nexus_architecture'],
    dimensional: {
      dimension: 5,
      multiverse: {
        connectedUniverses: portals.map(p => p.targetUniverseId),
        portals,
        isNexus: true,
      },
    },
  };
}

// =============================================================================
// POCKET REALM GENERATORS (Tier 5-7 Clarketech)
// =============================================================================

/**
 * Pocket Cabin: A small cabin exterior with a comfortable room-sized interior.
 * Entry-level realm pocket (Tier 5).
 */
function generatePocketCabin(spec: ExoticBuildingSpec): HigherDimensionalBuilding {
  // Exterior: tiny 5x5 cabin
  const exterior: string[] = [
    '#####',
    '#...#',
    '#.^.#',
    '#...#',
    '##D##',
  ];

  // Interior: 15x15 comfortable space
  const interiorSize = 15;
  const interior: string[] = [];
  for (let y = 0; y < interiorSize; y++) {
    let row = '';
    for (let x = 0; x < interiorSize; x++) {
      if (x === 0 || x === interiorSize - 1 || y === 0 || y === interiorSize - 1) {
        row += TILE_SYMBOLS.WALL;
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    interior.push(row);
  }

  // Add cozy furniture
  interior[2] = replaceAt(interior[2]!, 2, TILE_SYMBOLS.BED);
  interior[2] = replaceAt(interior[2]!, 3, TILE_SYMBOLS.BED);
  interior[2] = replaceAt(interior[2]!, interiorSize - 3, TILE_SYMBOLS.STORAGE);
  interior[7] = replaceAt(interior[7]!, 7, TILE_SYMBOLS.TABLE);
  interior[interiorSize - 3] = replaceAt(interior[interiorSize - 3]!, 2, TILE_SYMBOLS.COUNTER);
  interior[interiorSize - 3] = replaceAt(interior[interiorSize - 3]!, 3, TILE_SYMBOLS.COUNTER);
  interior[Math.floor(interiorSize / 2)] = replaceAt(interior[Math.floor(interiorSize / 2)]!, Math.floor(interiorSize / 2), TILE_SYMBOLS.STAIRS_DOWN);

  return {
    id: `pocket_cabin_${spec.material}`,
    name: spec.name || `${capitalize(spec.material)} Pocket Cabin`,
    description: 'A humble cabin that opens into a spacious interior. Cozy yet impossibly roomy.',
    category: 'residential',
    tier: 3,
    species: 'medium',
    layout: exterior,
    floors: [{
      level: 1,
      name: 'Expanded Interior',
      ceilingHeight: 8,
      layout: interior,
    }],
    materials: {
      wall: 'wood',
      floor: 'wood',
      door: 'wood',
    },
    functionality: [
      { type: 'sleeping', params: { beds: 2 } },
      { type: 'storage', params: { capacity: 100 } },
    ],
    capacity: 4,
    style: 'rustic',
    lore: 'Step through the door and find yourself in a space far larger than the outside suggests.',
    exoticMaterial: spec.material,
    archetype: 'pocket_cabin',
    clarkeTechTier: 5,
    researchRequired: ['spatial_folding'],
    realmPocket: {
      exteriorSize: { width: 5, height: 5 },
      interiorSize: 'pocket',
      interiorDimensions: { width: interiorSize, height: interiorSize },
      timeFlow: 'normal',
      timeRatio: 1.0,
      stability: 0.95,
      canExit: true,
      environment: 'cozy_warmth',
      laws: [],
      maintenanceCost: 5,
    },
  };
}

/**
 * Pocket Manor: A modest house exterior with a mansion interior.
 * Mid-tier realm pocket (Tier 6).
 */
function generatePocketManor(spec: ExoticBuildingSpec): HigherDimensionalBuilding {
  // Exterior: modest 9x7 house
  const exterior: string[] = [
    '#########',
    '#.......#',
    '#.......#',
    '#...^...#',
    '#.......#',
    '#.......#',
    '####D####',
  ];

  // Interior: 40x40 manor
  const interiorSize = 40;
  const interior: string[] = [];
  for (let y = 0; y < interiorSize; y++) {
    let row = '';
    for (let x = 0; x < interiorSize; x++) {
      if (x === 0 || x === interiorSize - 1 || y === 0 || y === interiorSize - 1) {
        row += TILE_SYMBOLS.WALL;
      } else if (x === 20 && y > 5 && y < 35) {
        row += TILE_SYMBOLS.WALL; // Central divider
      } else if (y === 20 && x > 5 && x < 35 && x !== 20) {
        row += TILE_SYMBOLS.WALL; // Horizontal divider
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    interior.push(row);
  }

  // Add doors between sections
  interior[20] = replaceAt(interior[20]!, 10, TILE_SYMBOLS.DOOR);
  interior[20] = replaceAt(interior[20]!, 30, TILE_SYMBOLS.DOOR);
  interior[10] = replaceAt(interior[10]!, 20, TILE_SYMBOLS.DOOR);
  interior[30] = replaceAt(interior[30]!, 20, TILE_SYMBOLS.DOOR);

  // Stairs in center
  interior[20] = replaceAt(interior[20]!, 20, TILE_SYMBOLS.STAIRS_DOWN);

  return {
    id: `pocket_manor_${spec.material}`,
    name: spec.name || `${capitalize(spec.material)} Pocket Manor`,
    description: 'A modest house that contains an entire manor within. Multiple wings and rooms await inside.',
    category: 'residential',
    tier: 4,
    species: 'medium',
    layout: exterior,
    floors: [{
      level: 1,
      name: 'Manor Interior',
      ceilingHeight: 12,
      layout: interior,
    }],
    materials: {
      wall: 'stone',
      floor: 'wood',
      door: 'wood',
    },
    functionality: [
      { type: 'sleeping', params: { beds: 8 } },
      { type: 'storage', params: { capacity: 500 } },
      { type: 'mood_aura', params: { bonus: 10 } },
    ],
    capacity: 20,
    style: 'elven',
    lore: 'The architecture within defies the humble exterior. An entire household can live comfortably here.',
    exoticMaterial: spec.material,
    archetype: 'pocket_manor',
    clarkeTechTier: 6,
    researchRequired: ['spatial_folding', 'realm_anchoring'],
    realmPocket: {
      exteriorSize: { width: 9, height: 7 },
      interiorSize: 'domain',
      interiorDimensions: { width: interiorSize, height: interiorSize },
      timeFlow: 'slow',
      timeRatio: 0.5,  // Time flows slower inside - spend a day, only half a day passes outside
      stability: 0.85,
      canExit: true,
      environment: 'refined_comfort',
      laws: [
        { name: 'peaceful_domain', effect: 'reduced_aggression', description: 'Conflict is muted within these walls' },
      ],
      maintenanceCost: 20,
    },
  };
}

/**
 * Pocket Realm: A tiny structure containing an entire village-sized space.
 * High-tier realm pocket (Tier 7).
 */
function generatePocketRealm(spec: ExoticBuildingSpec): HigherDimensionalBuilding {
  // Exterior: tiny 5x5 shrine/gatehouse
  const exterior: string[] = [
    '##D##',
    '#...#',
    '#.^.#',
    '#...#',
    '#####',
  ];

  // Interior: 100x100 village space with multiple buildings
  const interiorSize = 100;
  const interior: string[] = [];
  for (let y = 0; y < interiorSize; y++) {
    let row = '';
    for (let x = 0; x < interiorSize; x++) {
      if (x === 0 || x === interiorSize - 1 || y === 0 || y === interiorSize - 1) {
        row += TILE_SYMBOLS.WALL;
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    interior.push(row);
  }

  // Add scattered structures (mini-buildings inside)
  const structures = [
    { x: 20, y: 20, w: 10, h: 10 },
    { x: 70, y: 20, w: 12, h: 8 },
    { x: 20, y: 70, w: 8, h: 12 },
    { x: 65, y: 65, w: 15, h: 15 },
    { x: 45, y: 45, w: 10, h: 10 },  // Central building
  ];

  for (const s of structures) {
    for (let y = s.y; y < s.y + s.h; y++) {
      for (let x = s.x; x < s.x + s.w; x++) {
        if (x === s.x || x === s.x + s.w - 1 || y === s.y || y === s.y + s.h - 1) {
          interior[y] = replaceAt(interior[y]!, x, TILE_SYMBOLS.WALL);
        }
      }
    }
    // Door on each structure
    interior[s.y + s.h - 1] = replaceAt(interior[s.y + s.h - 1]!, s.x + Math.floor(s.w / 2), TILE_SYMBOLS.DOOR);
  }

  // Exit portal in center
  interior[50] = replaceAt(interior[50]!, 50, TILE_SYMBOLS.STAIRS_DOWN);

  return {
    id: `pocket_realm_${spec.material}`,
    name: spec.name || `${capitalize(spec.material)} Pocket Realm`,
    description: 'A tiny gatehouse that opens into an entire pocket dimension. A village exists within.',
    category: 'community',
    tier: 5,
    species: 'medium',
    layout: exterior,
    floors: [{
      level: 1,
      name: 'The Pocket Realm',
      ceilingHeight: 50,
      layout: interior,
    }],
    materials: {
      wall: 'stone',
      floor: 'stone',
      door: 'metal',
    },
    functionality: [
      { type: 'sleeping', params: { beds: 50 } },
      { type: 'storage', params: { capacity: 2000 } },
      { type: 'crafting', params: { speed: 1.5 } },
      { type: 'research', params: { bonus: 2.0 } },
    ],
    capacity: 100,
    style: 'ancient',
    lore: 'An entire realm folded into a gatehouse. Generations could live within, never knowing the outside.',
    exoticMaterial: spec.material,
    archetype: 'pocket_realm',
    clarkeTechTier: 7,
    researchRequired: ['spatial_folding', 'realm_anchoring', 'pocket_dimension_mastery'],
    realmPocket: {
      exteriorSize: { width: 5, height: 5 },
      interiorSize: 'territory',
      interiorDimensions: { width: interiorSize, height: interiorSize },
      timeFlow: 'subjective',
      timeRatio: 0.1,  // 10x slower - a year inside = ~5 weeks outside
      stability: 0.7,
      canExit: true,
      environment: 'eternal_twilight',
      laws: [
        { name: 'realm_sovereignty', effect: 'owner_authority', description: 'The creator has absolute authority here' },
        { name: 'preserved_youth', effect: 'slow_aging', description: 'Inhabitants age slowly' },
      ],
      maintenanceCost: 100,
    },
  };
}

// =============================================================================
// OTHER GENERATORS
// =============================================================================

function generateShell(spec: ExoticBuildingSpec): VoxelBuildingDefinition {
  // Spiral shell structure
  const sizes = { tiny: 9, small: 13, medium: 17, large: 23, huge: 31 };
  const size = sizes[spec.size];
  const center = Math.floor(size / 2);

  const layout: string[] = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy); // Need actual distance for spiral formula

      // Spiral formula
      const spiralR = (angle + Math.PI) / (2 * Math.PI) * center + dist / 3;
      const inSpiral = Math.abs(dist - spiralR % center) < 2;

      if (dist > center) {
        row += ' ';
      } else if (inSpiral || dist > center - 2) {
        row += TILE_SYMBOLS.WALL;
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    layout.push(row);
  }

  // Entrance
  layout[size - 2] = replaceAt(layout[size - 2]!, center, TILE_SYMBOLS.DOOR);

  return createExoticBuilding(spec, layout, 'A spiraling shell structure that winds inward.');
}

function generateFractal(spec: ExoticBuildingSpec): VoxelBuildingDefinition {
  // Sierpinski-like fractal pattern
  const sizes = { tiny: 9, small: 27, medium: 27, large: 27, huge: 27 };
  const size = sizes[spec.size];

  const layout: string[][] = [];
  for (let y = 0; y < size; y++) {
    layout.push(new Array(size).fill(TILE_SYMBOLS.FLOOR));
  }

  // Recursive fractal carving
  function carve(x: number, y: number, s: number): void {
    if (s < 3) return;
    const third = Math.floor(s / 3);
    // Remove center
    for (let dy = third; dy < third * 2; dy++) {
      for (let dx = third; dx < third * 2; dx++) {
        if (layout[y + dy]) {
          layout[y + dy]![x + dx] = TILE_SYMBOLS.WALL;
        }
      }
    }
    // Recurse into 8 surrounding sections
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (i !== 1 || j !== 1) {
          carve(x + i * third, y + j * third, third);
        }
      }
    }
  }

  // Add outer walls
  for (let y = 0; y < size; y++) {
    layout[y]![0] = TILE_SYMBOLS.WALL;
    layout[y]![size - 1] = TILE_SYMBOLS.WALL;
  }
  for (let x = 0; x < size; x++) {
    layout[0]![x] = TILE_SYMBOLS.WALL;
    layout[size - 1]![x] = TILE_SYMBOLS.WALL;
  }

  carve(0, 0, size);

  // Entrance
  const center = Math.floor(size / 2);
  layout[size - 1]![center] = TILE_SYMBOLS.DOOR;

  return createExoticBuilding(spec, layout.map(r => r.join('')), 'A self-similar fractal structure, the same pattern at every scale.');
}

function generateBubble(spec: ExoticBuildingSpec): VoxelBuildingDefinition {
  const sizes = { tiny: 7, small: 11, medium: 15, large: 19, huge: 25 };
  const size = sizes[spec.size];
  const center = Math.floor(size / 2);
  const radius = center - 1;

  const layout: string[] = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const distSq = dx * dx + dy * dy;
      const radiusSq = radius * radius;
      const radiusMinus1Sq = (radius - 1) * (radius - 1);

      if (distSq > radiusSq) {
        row += ' ';
      } else if (distSq > radiusMinus1Sq) {
        row += TILE_SYMBOLS.WALL;
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    layout.push(row);
  }

  // Entrance at bottom
  layout[size - 2] = replaceAt(layout[size - 2]!, center, TILE_SYMBOLS.DOOR);

  return createExoticBuilding(spec, layout, 'A perfect spherical bubble floating in space.');
}

function generateStalactite(spec: ExoticBuildingSpec): VoxelBuildingDefinition {
  const widths = { tiny: 7, small: 9, medium: 11, large: 15, huge: 19 };
  const heights = { tiny: 10, small: 14, medium: 18, large: 24, huge: 32 };

  const width = widths[spec.size];
  const height = heights[spec.size];
  const center = Math.floor(width / 2);

  const layout: string[] = [];
  for (let y = 0; y < height; y++) {
    // Tapers toward bottom
    const progress = y / height;
    const currentWidth = Math.max(3, Math.floor(width * (1 - progress * 0.7)));
    const offset = Math.floor((width - currentWidth) / 2);

    let row = ' '.repeat(offset);
    for (let x = 0; x < currentWidth; x++) {
      if (x === 0 || x === currentWidth - 1) {
        row += TILE_SYMBOLS.WALL;
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    row += ' '.repeat(width - row.length);
    layout.push(row);
  }

  // Entrance at top (it hangs from ceiling)
  layout[0] = replaceAt(layout[0]!, center, TILE_SYMBOLS.DOOR);

  return createExoticBuilding(spec, layout, 'A structure hanging from above, tapering to a point.');
}

function generateWebStructure(spec: ExoticBuildingSpec): VoxelBuildingDefinition {
  const sizes = { tiny: 11, small: 15, medium: 21, large: 27, huge: 35 };
  const size = sizes[spec.size];
  const center = Math.floor(size / 2);

  const layout: string[][] = [];
  for (let y = 0; y < size; y++) {
    layout.push(new Array(size).fill(' '));
  }

  // Draw radial spokes
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
    for (let r = 0; r < center; r++) {
      const x = center + Math.round(Math.cos(angle) * r);
      const y = center + Math.round(Math.sin(angle) * r);
      if (layout[y]) layout[y]![x] = TILE_SYMBOLS.WALL;
    }
  }

  // Draw concentric rings
  for (let r = 3; r < center; r += 3) {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
      const x = center + Math.round(Math.cos(angle) * r);
      const y = center + Math.round(Math.sin(angle) * r);
      if (layout[y]) layout[y]![x] = TILE_SYMBOLS.WALL;
    }
  }

  // Fill spaces with floor
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const dx = x - center;
      const dy = y - center;
      const distSq = dx * dx + dy * dy;
      const centerMinus1Sq = (center - 1) * (center - 1);
      if (distSq < centerMinus1Sq && layout[y]![x] === ' ') {
        layout[y]![x] = TILE_SYMBOLS.FLOOR;
      }
    }
  }

  // Center chamber
  layout[center]![center] = TILE_SYMBOLS.STORAGE;

  // Entrance
  layout[size - 2]![center] = TILE_SYMBOLS.DOOR;

  return createExoticBuilding(spec, layout.map(r => r.join('')), 'A web-like structure with radial symmetry.');
}

function generateGenericExotic(spec: ExoticBuildingSpec): VoxelBuildingDefinition {
  const sizes = { tiny: 7, small: 11, medium: 15, large: 19, huge: 25 };
  const size = sizes[spec.size];

  const layout: string[] = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
        row += TILE_SYMBOLS.WALL;
      } else {
        row += TILE_SYMBOLS.FLOOR;
      }
    }
    layout.push(row);
  }

  const center = Math.floor(size / 2);
  layout[size - 1] = replaceAt(layout[size - 1]!, center, TILE_SYMBOLS.DOOR);

  return createExoticBuilding(spec, layout, `An exotic ${spec.archetype} structure.`);
}

function createExoticBuilding(spec: ExoticBuildingSpec, layout: string[], description: string): VoxelBuildingDefinition {
  return {
    id: `${spec.archetype}_${spec.material}`,
    name: spec.name || `${capitalize(spec.material)} ${capitalize(spec.archetype)}`,
    description,
    category: 'residential',
    tier: 4,
    species: 'medium',
    layout,
    materials: {
      wall: 'stone',
      floor: 'stone',
      door: 'stone',
    },
    functionality: [{ type: 'mood_aura', params: { bonus: 5 } }],
    capacity: 10,
    style: 'ancient',
    lore: `Built from ${spec.material} in the ${spec.archetype} style.`,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function replaceAt(str: string, index: number, char: string): string {
  if (index < 0 || index >= str.length) return str;
  return str.substring(0, index) + char + str.substring(index + 1);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}

// =============================================================================
// DEMO
// =============================================================================

if (require.main === module) {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  EXOTIC BUILDING GENERATOR DEMO');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const examples = [
    // Organic
    { archetype: 'hive' as const, material: 'chitin' as const, size: 'medium' as const },
    // 4D (Tier 7)
    { archetype: 'tesseract' as const, material: 'void' as const, size: 'medium' as const },
    // Multiverse (Tier 8)
    { archetype: 'universe_gate' as const, material: 'starlight' as const, size: 'medium' as const },
    { archetype: 'nexus' as const, material: 'void' as const, size: 'small' as const },
    // Realm Pockets (Tier 5-7)
    { archetype: 'pocket_cabin' as const, material: 'living_wood' as const, size: 'small' as const },
    { archetype: 'pocket_manor' as const, material: 'crystal' as const, size: 'medium' as const },
    { archetype: 'pocket_realm' as const, material: 'dreams' as const, size: 'medium' as const },
    { archetype: 'infinite_room' as const, material: 'void' as const, size: 'small' as const },
  ];

  for (const spec of examples) {
    const building = generateExoticBuilding(spec);
    console.log(`\n=== ${building.name} ===`);
    console.log(`Archetype: ${spec.archetype} | Material: ${spec.material}`);

    // Clarketech tier
    if (building.clarkeTechTier) {
      console.log(`Clarketech Tier: ${building.clarkeTechTier}`);
    }

    // Dimensional info
    if (building.dimensional) {
      console.log(`Dimension: ${building.dimensional.dimension}D`);
      if (building.dimensional.w_axis) {
        console.log(`  W-axis layers: ${building.dimensional.w_axis.layers}`);
      }
      if (building.dimensional.multiverse) {
        console.log(`  Connected universes: ${building.dimensional.multiverse.connectedUniverses.length}`);
        console.log(`  Is nexus: ${building.dimensional.multiverse.isNexus}`);
      }
    }

    // Realm pocket info
    if (building.realmPocket) {
      console.log(`Realm Pocket:`);
      console.log(`  Exterior: ${building.realmPocket.exteriorSize.width}x${building.realmPocket.exteriorSize.height}`);
      console.log(`  Interior: ${building.realmPocket.interiorDimensions.width}x${building.realmPocket.interiorDimensions.height} (${building.realmPocket.interiorSize})`);
      console.log(`  Time flow: ${building.realmPocket.timeFlow} (ratio: ${building.realmPocket.timeRatio})`);
    }

    console.log(building.description);
    console.log('\nLayout (exterior):');
    for (const row of building.layout) {
      console.log('  ' + row);
    }
    if (building.floors && building.floors.length > 0) {
      console.log(`\n  + ${building.floors.length} additional floor(s) (interior realm)`);
    }
    console.log('');
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  AVAILABLE MATERIALS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const categories = {
    'Organic': ['flesh', 'bone', 'chitin', 'coral', 'web', 'wax', 'fungus', 'living_wood', 'vines'],
    'Candy/Food': ['candy', 'chocolate', 'gingerbread', 'cake', 'ice_cream', 'cheese'],
    'Magical': ['crystal', 'obsidian', 'void', 'light', 'dreams', 'time', 'pages', 'music'],
    'Tech': ['circuitry', 'data', 'plasma', 'force_field'],
    'Elemental': ['fire', 'water', 'air', 'shadow', 'starlight'],
  };

  for (const [category, materials] of Object.entries(categories)) {
    console.log(`${category}:`);
    for (const mat of materials) {
      const props = EXOTIC_MATERIALS[mat as ExoticMaterial];
      const tags = [];
      if (props.alive) tags.push('living');
      if (props.glows) tags.push('glows');
      if (props.intangible) tags.push('intangible');
      if (props.edible) tags.push('edible');
      console.log(`  ${mat.padEnd(14)} - ${props.description} ${tags.length ? `[${tags.join(', ')}]` : ''}`);
    }
    console.log('');
  }
}
