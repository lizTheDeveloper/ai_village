> **System:** building-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Generative Cities & Complex Buildings
## Procedural Settlement Generation, Multi-Tile Structures, and Cultural Architecture

> *Dedicated to:*
> - **Tarn Adams** and *Dwarf Fortress* - For showing us that architecture emerges from culture and necessity
> - **Italo Calvino** and *Invisible Cities* - For fifty-five imaginary cities, each unique and impossible
> - **Christopher Alexander** and *A Pattern Language* - For understanding that good design comes from patterns
> - **Jane Jacobs** - For teaching us that cities are living organisms, not static plans
> - **M.C. Escher** - For impossible architecture that still feels right
> - **China Miéville** - For New Crobuzon, a city of a thousand neighborhoods and zero zoning laws

---

## Overview

Procedurally generated settlements that reflect the cultures, obsessions, and architectural philosophies of their inhabitants.

## Problem Statement

Currently, the building system has limitations:
- **Single-tile buildings only** - Can't represent apartments, pueblos, great halls, or complex structures
- **No culture-specific architecture** - All buildings look/function the same regardless of inhabitants
- **No district zoning** - Cities don't organize into coherent neighborhoods
- **No procedural generation** - Cities must be manually placed
- **No architectural weirdness** - Can't represent Gastromancer kitchens, Horolomancer clock towers, or narrative-structured buildings

This spec addresses all of these.

---

## 1. Multi-Tile Building System

### 1.1 Building Footprint System

```typescript
export interface BuildingFootprint {
  // Footprint shape
  occupiedTiles: TileOffset[];  // Relative positions from anchor
  anchorPoint: TileOffset;      // Which tile is the "main" entrance

  // 3D information
  height: number;  // Vertical floors/stories
  hasBasement: boolean;
  hasRoof: boolean;

  // Access points
  entrances: TileOffset[];  // Which tiles can be entered from

  // Internal structure
  interiorLayout?: FloorPlan[];  // Optional detailed interior
}

export interface TileOffset {
  x: number;
  y: number;
  z?: number;  // For multi-story
}

// Example: 2x3 Pueblo
const PUEBLO_FOOTPRINT: BuildingFootprint = {
  occupiedTiles: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 0, y: 2 },
    { x: 1, y: 2 },
  ],
  anchorPoint: { x: 0, y: 1 },  // Center-left entrance
  height: 2,  // Two stories
  hasBasement: false,
  hasRoof: true,
  entrances: [
    { x: 0, y: 1 },  // Main entrance
    { x: 1, y: 2 },  // Side entrance
  ],
};

// Example: Gastromancer Great Kitchen (irregular shape)
const GREAT_KITCHEN_FOOTPRINT: BuildingFootprint = {
  occupiedTiles: [
    // Oven section (hot)
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    // Prep area
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    // Storage pantry
    { x: 2, y: 0 },
    { x: 2, y: 2 },
  ],
  anchorPoint: { x: 1, y: 1 },  // Center prep area
  height: 3,  // Tall chimney
  entrances: [
    { x: 0, y: 1 },  // Deliveries
    { x: 2, y: 1 },  // Public dining
  ],
};
```

### 1.2 Interior Layouts (Optional Detail)

For buildings that matter, we can define interior structure:

```typescript
export interface FloorPlan {
  floor: number;  // 0 = ground, 1 = second story, -1 = basement

  rooms: Room[];

  // Vertical connections
  stairsUp?: TileOffset[];
  stairsDown?: TileOffset[];
  ladders?: TileOffset[];
}

export interface Room {
  tiles: TileOffset[];

  purpose: RoomPurpose;

  // Room properties
  temperature?: number;
  lighting?: number;
  privacy?: number;  // How secluded

  // Contents
  furniture?: Furniture[];
  storage?: StorageCapacity;
}

export type RoomPurpose =
  | 'bedroom'
  | 'kitchen'
  | 'workshop'
  | 'storage'
  | 'communal_hall'
  | 'library'  // For bibliomancers
  | 'dream_chamber'  // For somnomancers
  | 'name_vault'  // For onomancers
  | 'color_studio'  // For chromomancers
  | 'echo_chamber'  // For echomancers
  | 'silent_room'  // For silentomancers
  | 'ritual_space'
  | 'marketplace'
  | 'custom';

// Example: Bibliomancer Tower (3 floors)
const BIBLIOMANCER_TOWER: FloorPlan[] = [
  // Ground floor
  {
    floor: 0,
    rooms: [
      {
        tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        purpose: 'library',
        lighting: 0.8,  // Well-lit for reading
        privacy: 0.3,   // Public access
        furniture: [
          { type: 'bookshelf', count: 12 },
          { type: 'reading_desk', count: 4 },
        ],
      },
    ],
    stairsUp: [{ x: 1, y: 1 }],
  },

  // Second floor - rare books
  {
    floor: 1,
    rooms: [
      {
        tiles: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
        purpose: 'library',
        lighting: 0.5,  // Dimmer to preserve books
        privacy: 0.7,   // Restricted access
        furniture: [
          { type: 'secured_bookshelf', count: 8 },
          { type: 'study_desk', count: 2 },
        ],
      },
    ],
    stairsUp: [{ x: 0, y: 1 }],
    stairsDown: [{ x: 1, y: 1 }],
  },

  // Top floor - grimoire chamber
  {
    floor: 2,
    rooms: [
      {
        tiles: [{ x: 0, y: 0 }],
        purpose: 'custom',  // Spell crafting
        lighting: 1.0,  // Magical illumination
        privacy: 1.0,   // Highly private
        furniture: [
          { type: 'spell_crafting_desk', count: 1 },
          { type: 'enchanted_lectern', count: 1 },
        ],
      },
    ],
    stairsDown: [{ x: 0, y: 1 }],
  },
];
```

---

## 2. Culture-Specific Architecture

### 2.1 Architectural Paradigms

Each culture has architectural rules:

```typescript
export interface ArchitecturalParadigm {
  culture: string;  // 'gastromancer', 'horolomancer', etc.

  // Building shape preferences
  preferredShapes: BuildingShape[];
  avoidedShapes: BuildingShape[];

  // Material preferences
  preferredMaterials: Material[];
  symbolicMaterials?: Map<Material, string>;  // Meaning

  // Spatial organization
  organizationPrinciple: OrganizationPrinciple;

  // Aesthetic rules
  symmetryPreference: number;  // 0 = chaotic, 1 = perfectly symmetric
  colorPalette?: ColorScheme;

  // Functional requirements
  requiredBuildings: BuildingType[];  // Must have these
  forbiddenBuildings: BuildingType[];  // Cannot have these

  // Special features
  uniqueFeatures: ArchitecturalFeature[];
}

export type BuildingShape =
  | 'rectangular'
  | 'circular'
  | 'irregular'
  | 'L_shaped'
  | 'T_shaped'
  | 'cross_shaped'
  | 'organic'  // Follows natural contours
  | 'geometric'  // Perfect mathematical shapes
  | 'narrative';  // Follows story structure

export type OrganizationPrinciple =
  | 'grid'  // Perfect rectangular grid
  | 'radial'  // Circles radiating from center
  | 'organic'  // Natural growth pattern
  | 'hierarchical'  // Size/importance-based
  | 'chaotic'  // No pattern
  | 'temporal'  // Organized by time zones
  | 'chromatic'  // Organized by color
  | 'acoustic'  // Organized by sound
  | 'narrative';  // Organized by story progression

export interface ArchitecturalFeature {
  name: string;
  effect: string;
  appearance: string;
}

// Examples:

const GASTROMANCER_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'gastromancer',

  preferredShapes: ['organic', 'irregular'],  // Like food
  avoidedShapes: ['rectangular'],  // Too boring

  preferredMaterials: ['ceramic', 'copper', 'brick'],
  symbolicMaterials: new Map([
    ['copper', 'Cookware metal, sacred'],
    ['brick', 'Oven material, essential'],
    ['ceramic', 'Dishware, practical and beautiful'],
  ]),

  organizationPrinciple: 'organic',  // Kitchen workflow logic

  symmetryPreference: 0.3,  // Some asymmetry (like real kitchens)

  colorPalette: {
    primary: ['red', 'orange', 'copper'],  // Fire colors
    accent: ['white', 'cream'],  // Clean kitchen
    forbidden: ['gray', 'black'],  // Unappetizing
  },

  requiredBuildings: [
    'great_kitchen',
    'pantry',
    'spice_market',
    'culinary_academy',
  ],

  forbiddenBuildings: [
    'fasting_temple',  // Antithetical to culture
  ],

  uniqueFeatures: [
    {
      name: 'Eternal Ovens',
      effect: 'Always hot, never extinguished',
      appearance: 'Smoking chimneys visible from distance',
    },
    {
      name: 'Scent Gardens',
      effect: 'Herb gardens integrated into all buildings',
      appearance: 'Green growing from every surface',
    },
    {
      name: 'Taste Fountains',
      effect: 'Public fountains of soup/sauce',
      appearance: 'Steaming fountains in squares',
    },
  ],
};

const HOROLOMANCER_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'horolomancer',

  preferredShapes: ['geometric', 'circular', 'cross_shaped'],
  avoidedShapes: ['irregular', 'organic'],

  preferredMaterials: ['metal', 'glass', 'crystal'],
  symbolicMaterials: new Map([
    ['metal', 'Clock gears, precision'],
    ['glass', 'Transparency of time'],
    ['crystal', 'Temporal clarity'],
  ]),

  organizationPrinciple: 'temporal',  // Organized by time zones

  symmetryPreference: 1.0,  // Perfect symmetry always

  colorPalette: {
    primary: ['silver', 'gold', 'bronze'],  // Metal colors
    accent: ['white', 'black'],  // Clock faces
    forbidden: ['chaotic_patterns'],
  },

  requiredBuildings: [
    'central_clock_tower',
    'time_keeping_observatory',
    'schedule_bureau',
    'punctuality_enforcement',
  ],

  forbiddenBuildings: [
    'spontaneity_hall',  // Cannot exist
  ],

  uniqueFeatures: [
    {
      name: 'Temporal Zones',
      effect: 'City divided into time zones, each on different schedule',
      appearance: 'Invisible boundaries marked by clock towers',
    },
    {
      name: 'Synchronized Bells',
      effect: 'All clocks chime in perfect harmony',
      appearance: 'Massive bell towers at intersections',
    },
    {
      name: 'Time Locks',
      effect: 'Doors only open at specific times',
      appearance: 'Clock mechanisms on every door',
    },
  ],
};

const UMBRAMANCER_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'umbramancer',

  preferredShapes: ['irregular', 'organic'],  // Shaped by shadows
  avoidedShapes: ['circular'],  // Too much light

  preferredMaterials: ['obsidian', 'basalt', 'dark_wood'],
  symbolicMaterials: new Map([
    ['obsidian', 'Captures shadows'],
    ['basalt', 'Absorbs light'],
    ['dark_wood', 'Natural darkness'],
  ]),

  organizationPrinciple: 'chaotic',  // Follows shadow patterns

  symmetryPreference: 0.2,  // Shadows are asymmetric

  colorPalette: {
    primary: ['black', 'deep_purple', 'midnight_blue'],
    accent: ['silver'],  // Only for contrast
    forbidden: ['bright_colors'],
  },

  requiredBuildings: [
    'shadow_repository',
    'umbral_training_ground',
    'eclipse_temple',
  ],

  uniqueFeatures: [
    {
      name: 'Perpetual Shade',
      effect: 'Buildings block all direct sunlight',
      appearance: 'Overhangs, awnings, massive shadows',
    },
    {
      name: 'Shadow Streets',
      effect: 'Roads are always in shadow',
      appearance: 'Narrow alleys, covered passages',
    },
    {
      name: 'Captured Shadows',
      effect: 'Stolen shadows displayed as trophies',
      appearance: 'Shadow silhouettes on walls',
    },
  ],
};

const BIBLIOMANCER_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'bibliomancer',

  preferredShapes: ['rectangular', 'T_shaped'],  // Like books
  avoidedShapes: ['circular'],  // Hard to shelve

  preferredMaterials: ['wood', 'paper', 'leather'],
  symbolicMaterials: new Map([
    ['wood', 'Paper\'s origin'],
    ['leather', 'Book bindings'],
    ['paper', 'The sacred material'],
  ]),

  organizationPrinciple: 'hierarchical',  // By book importance

  symmetryPreference: 0.8,  // Mostly organized

  colorPalette: {
    primary: ['brown', 'beige', 'cream'],
    accent: ['red', 'gold'],  // Fancy books
    forbidden: ['none'],  // All colors acceptable
  },

  requiredBuildings: [
    'grand_library',
    'scriptoriumm',
    'bookbindery',
    'paper_mill',
  ],

  uniqueFeatures: [
    {
      name: 'Infinite Shelves',
      effect: 'Buildings larger inside than outside',
      appearance: 'TARDIS-like from exterior',
    },
    {
      name: 'Living Books',
      effect: 'Books float, organize themselves',
      appearance: 'Books drifting through air',
    },
    {
      name: 'Paper Streets',
      effect: 'Roads paved with preserved pages',
      appearance: 'Text underfoot, readable streets',
    },
  ],
};
```

### 2.2 Building Generation Rules

```typescript
export interface BuildingGenerator {
  // Select building type
  selectBuildingType(
    culture: string,
    purpose: BuildingPurpose,
    availableSpace: number
  ): BuildingType;

  // Generate footprint
  generateFootprint(
    buildingType: BuildingType,
    architecture: ArchitecturalParadigm,
    constraints: SpatialConstraints
  ): BuildingFootprint;

  // Generate interior (optional)
  generateInterior(
    footprint: BuildingFootprint,
    buildingType: BuildingType,
    culture: string
  ): FloorPlan[];

  // Apply cultural modifications
  applyCulturalStyle(
    building: Building,
    architecture: ArchitecturalParadigm
  ): Building;
}

export interface SpatialConstraints {
  maxWidth: number;
  maxHeight: number;
  maxDepth: number;

  mustFaceDirection?: Direction;
  mustBeAdjacentTo?: BuildingType;
  cannotBeNear?: BuildingType[];

  terrain: TerrainType;
  slope?: number;
}
```

---

## 3. District System

### 3.1 District Types

```typescript
export interface District {
  id: string;
  name: string;

  // Core properties
  districtType: DistrictType;
  dominantCulture?: string;  // Which mancers live here

  // Boundaries
  bounds: Polygon;  // Actual shape
  centerPoint: Position;

  // Zoning
  allowedBuildings: BuildingType[];
  densityLevel: number;  // 0-1, how packed

  // Special effects
  districtEffects: DistrictEffect[];

  // Infrastructure
  hasWalls: boolean;
  hasGate: boolean;
  roadNetwork: RoadGraph;
}

export type DistrictType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'religious'
  | 'educational'
  | 'governmental'
  // Literary-specific
  | 'word_district'  // Language mancers
  | 'sensory_quarter'  // Aromancers, audiomancers, chromomancers
  | 'temporal_enclave'  // Time-based mancers
  | 'shadow_slums'  // Umbramancers, somnomancers
  | 'dream_bazaar'  // Somnomancer market
  | 'name_vault_quarter'  // Onomancer security zone
  | 'echo_district'  // Everything repeats
  | 'silent_enclave'  // Quiet zone
  | 'mancer_neutral';  // Mixed

export interface DistrictEffect {
  name: string;
  type: EffectType;
  magnitude: number;
  radius: number;  // -1 = entire district
}

export type EffectType =
  | 'time_dilation'  // Temporal enclave
  | 'genre_contamination'  // Horror/romance/etc physics
  | 'sensory_amplification'  // Sensory quarter
  | 'shadow_deepening'  // Shadow slums
  | 'language_density'  // Word district
  | 'silence_zone'  // Silent enclave
  | 'echo_multiplication'  // Echo district
  | 'color_saturation';  // Chromomancer areas

// Examples:

const WORD_DISTRICT: District = {
  id: 'district_word_01',
  name: 'The Lexicon Quarter',

  districtType: 'word_district',
  dominantCulture: 'mixed_linguistic_mancers',

  bounds: {/* polygon */},
  centerPoint: { x: 100, y: 100 },

  allowedBuildings: [
    'bibliomancer_library',
    'onomancer_vault',
    'syntaxomancer_school',
    'rhetoricmancer_debate_hall',
    'marginomancer_archive',
    'residential_tower',
  ],

  densityLevel: 0.7,  // Fairly packed

  districtEffects: [
    {
      name: 'Floating Words',
      type: 'language_density',
      magnitude: 0.8,
      radius: -1,  // Entire district
    },
    {
      name: 'Literal Metaphors',
      type: 'genre_contamination',
      magnitude: 0.5,
      radius: -1,
    },
  ],

  hasWalls: true,  // Book-based wards
  hasGate: true,
  roadNetwork: {/* ... */},
};

const TEMPORAL_ENCLAVE: District = {
  id: 'district_time_01',
  name: 'Clockwork Sector',

  districtType: 'temporal_enclave',
  dominantCulture: 'horolomancers',

  bounds: {/* perfect circular polygon */},
  centerPoint: { x: 200, y: 200 },

  allowedBuildings: [
    'clock_tower',
    'time_keeping_observatory',
    'schedule_bureau',
    'chronogramancer_calendar_hall',
    'punctuality_court',
  ],

  densityLevel: 0.9,  // Very organized, packed

  districtEffects: [
    {
      name: 'Temporal Precision',
      type: 'time_dilation',
      magnitude: 1.0,  // Time perfectly measured
      radius: -1,
    },
  ],

  hasWalls: true,
  hasGate: true,  // Gate only opens on schedule
  roadNetwork: {/* perfect radial */},
};

const SHADOW_SLUMS: District = {
  id: 'district_shadow_01',
  name: 'The Umbral Quarter',

  districtType: 'shadow_slums',
  dominantCulture: 'umbramancers',

  bounds: {/* irregular, follows shadows */},
  centerPoint: { x: 50, y: 300 },

  allowedBuildings: [
    'shadow_repository',
    'somnomancer_dormitory',
    'silent_temple',
    'umbral_tenement',
  ],

  densityLevel: 0.4,  // Sparse, dark

  districtEffects: [
    {
      name: 'Perpetual Shadow',
      type: 'shadow_deepening',
      magnitude: 0.9,
      radius: -1,
    },
    {
      name: 'Dream Leakage',
      type: 'genre_contamination',
      magnitude: 0.6,  // Dreamlike
      radius: -1,
    },
  ],

  hasWalls: false,  // No clear boundary
  hasGate: false,
  roadNetwork: {/* chaotic */},
};
```

### 3.2 District Placement Algorithm

```typescript
export interface DistrictPlacer {
  // Generate district layout for a city
  generateDistricts(
    cityBounds: Polygon,
    population: Population,
    cultures: CultureMix
  ): District[];

  // Rules for district adjacency
  getDistrictAffinity(
    district1: DistrictType,
    district2: DistrictType
  ): number;  // -1 to 1, negative = incompatible

  // Generate roads between districts
  connectDistricts(
    districts: District[]
  ): RoadNetwork;
}

// Affinity matrix (which districts want to be near each other)
const DISTRICT_AFFINITY: Map<[DistrictType, DistrictType], number> = new Map([
  // Compatible
  [['word_district', 'educational'], 0.8],  // Synergy
  [['temporal_enclave', 'governmental'], 0.7],  // Order
  [['sensory_quarter', 'commercial'], 0.6],  // Markets

  // Incompatible
  [['shadow_slums', 'temporal_enclave'], -0.9],  // Chaos vs order
  [['silent_enclave', 'sensory_quarter'], -0.8],  // Silence vs noise
  [['echo_district', 'silent_enclave'], -1.0],  // Impossible

  // Neutral
  [['residential', 'commercial'], 0.5],
  [['industrial', 'residential'], -0.3],  // Slight negative
]);
```

---

## 4. Procedural City Generation

### 4.1 City Generator

```typescript
export interface CityGenerator {
  generateCity(params: CityGenerationParams): City;
}

export interface CityGenerationParams {
  // Basic parameters
  name?: string;
  location: Position;
  size: CitySize;

  // Cultural composition
  dominantCulture: string;  // Primary mancer type
  minorityCultures: Map<string, number>;  // % of population

  // Geography
  terrain: TerrainType;
  waterAccess: boolean;
  elevation: number;

  // Starting resources
  initialPopulation: number;
  startingResources: Resources;

  // Constraints
  maxRadius: number;
  mustIncludeBuildings?: BuildingType[];

  // Generation style
  organizationStyle: 'organic' | 'planned' | 'mixed';
  weirdnessLevel: number;  // 0-1, how surreal
}

export type CitySize =
  | 'hamlet'  // 10-50 people
  | 'village'  // 50-200 people
  | 'town'  // 200-1000 people
  | 'city'  // 1000-5000 people
  | 'metropolis';  // 5000+ people

export interface City {
  name: string;
  location: Position;

  // Structure
  districts: District[];
  buildings: Building[];
  roads: RoadNetwork;

  // Infrastructure
  walls?: CityWalls;
  gates: Gate[];
  landmarks: Landmark[];

  // Population
  population: Population;

  // Culture
  primaryCulture: string;
  culturalMix: Map<string, number>;

  // Special features
  cityWideEffects: CityEffect[];
  uniqueFeatures: string[];
}

// Example generation:
const generateGastromancerCity = (params: CityGenerationParams): City => {
  const architecture = GASTROMANCER_ARCHITECTURE;

  // 1. Generate districts
  const districts = [
    createKitchenDistrict(),  // Industrial cooking
    createMarketDistrict(),   // Food sales
    createResidentialDistrict(),  // Housing
    createCulinaryAcademyDistrict(),  // Education
  ];

  // 2. Place buildings per district
  for (const district of districts) {
    const buildings = placeBuildingsInDistrict(
      district,
      architecture,
      params
    );
  }

  // 3. Connect with roads (follow kitchen workflow logic)
  const roads = createOrganicRoadNetwork(districts, 'kitchen_workflow');

  // 4. Add city-wide features
  const cityWideEffects = [
    {
      name: 'Eternal Aroma',
      description: 'City always smells delicious',
      mechanicalEffect: 'Aromancy +20% effectiveness',
    },
    {
      name: 'Culinary Competition',
      description: 'Daily cooking contests',
      mechanicalEffect: 'Social status tied to cooking skill',
    },
  ];

  return {
    name: params.name || 'Flavopolis',
    location: params.location,
    districts,
    buildings: [...],  // Collected from districts
    roads,
    population: {...},
    primaryCulture: 'gastromancer',
    cityWideEffects,
    uniqueFeatures: [
      'Great Kitchen - largest in world',
      'Spice Market - 1000+ varieties',
      'Eternal Ovens - never extinguished for 200 years',
    ],
  };
};
```

### 4.2 Building Placement Logic

```typescript
export interface BuildingPlacer {
  // Place buildings following cultural rules
  placeBuildings(
    district: District,
    architecture: ArchitecturalParadigm,
    availableSpace: Polygon
  ): Building[];

  // Check if placement is valid
  isValidPlacement(
    building: Building,
    position: Position,
    existing: Building[]
  ): boolean;

  // Get placement priority
  getPlacementPriority(
    buildingType: BuildingType,
    culture: string
  ): number;  // Higher = place first
}

// Placement rules by culture:
const PLACEMENT_RULES = {
  gastromancer: {
    // Central great kitchen
    centerpiece: 'great_kitchen',

    // Cluster related buildings
    clusters: [
      ['pantry', 'cold_storage', 'spice_vault'],
      ['prep_kitchen', 'cooking_stations', 'serving_hall'],
      ['marketplace', 'butcher', 'baker', 'fishmonger'],
    ],

    // Spacing rules
    minDistance: {
      'oven': 10,  // Fire safety
      'cold_storage': -1,  // Can be anywhere
    },
  },

  horolomancer: {
    // Perfect radial layout
    centerpiece: 'central_clock_tower',

    // Concentric rings
    rings: [
      { radius: 50, buildings: ['time_keeping_observatory'] },
      { radius: 100, buildings: ['schedule_bureau', 'punctuality_court'] },
      { radius: 150, buildings: ['residential_tower'] },
    ],

    // Perfect angles
    angularSpacing: 30,  // Buildings every 30 degrees
  },

  umbramancer: {
    // No center, organic growth
    centerpiece: null,

    // Avoid light sources
    avoidSunlight: true,

    // Cluster in darkness
    preferShaded: true,

    // Irregular spacing
    randomOffset: 0.7,  // High chaos
  },
};
```

---

## 5. Special Building Types

### 5.1 Narrative Buildings

Buildings that follow story structure:

```typescript
export interface NarrativeBuilding extends Building {
  storyStructure: StoryStructure;
  narrativeState: 'setup' | 'rising' | 'climax' | 'falling' | 'resolution';

  // Rooms follow plot
  plotRooms: {
    ordinary_world: Room;
    inciting_incident: Room;
    rising_action: Room[];
    climax: Room;
    falling_action: Room[];
    resolution: Room;
  };

  // Can only navigate by following story
  mustFollowPlot: boolean;
}

// Example: Tragedy Tower
const TRAGEDY_TOWER: NarrativeBuilding = {
  // ... standard building fields

  storyStructure: 'tragedy',
  narrativeState: 'setup',

  plotRooms: {
    ordinary_world: {
      tiles: [{ x: 0, y: 0, z: 0 }],  // Ground floor
      purpose: 'custom',
      atmosphere: 'Normal, mundane',
    },

    inciting_incident: {
      tiles: [{ x: 0, y: 0, z: 1 }],  // Floor 1
      purpose: 'custom',
      atmosphere: 'Tension begins, something wrong',
    },

    rising_action: [
      { tiles: [{ x: 0, y: 0, z: 2 }], atmosphere: 'Conflict escalates' },
      { tiles: [{ x: 0, y: 0, z: 3 }], atmosphere: 'Hope appears, then fades' },
      { tiles: [{ x: 0, y: 0, z: 4 }], atmosphere: 'Desperation sets in' },
    ],

    climax: {
      tiles: [{ x: 0, y: 0, z: 5 }],  // Top floor
      purpose: 'custom',
      atmosphere: 'Inevitable catastrophe',
      effect: 'No way down except falling',
    },

    falling_action: [
      { tiles: [{ x: 0, y: 0, z: 4 }], atmosphere: 'Aftermath, realization' },
    ],

    resolution: {
      tiles: [{ x: 0, y: 0, z: 0 }],  // Back to ground
      purpose: 'custom',
      atmosphere: 'Changed forever, scarred',
    },
  },

  mustFollowPlot: true,  // Can't skip floors
};
```

### 5.2 Impossible Geometry Buildings

```typescript
export interface ImpossibleBuilding extends Building {
  geometryType: ImpossibleGeometry;

  // Interior larger than exterior
  interiorMultiplier?: number;  // 1.0 = normal, 10.0 = TARDIS

  // Non-Euclidean properties
  loopingCorridors?: boolean;
  escherStairs?: boolean;
  kleinBottleRooms?: boolean;
}

export type ImpossibleGeometry =
  | 'larger_inside'  // TARDIS
  | 'mobius_corridor'  // Loop back on yourself
  | 'escher_stairs'  // Stairs go nowhere/everywhere
  | 'klein_bottle'  // Inside is outside
  | 'fractal_chambers'  // Self-similar at all scales
  | 'temporal_displacement';  // Different rooms in different times

// Example: The Library That Contains Itself
const INFINITE_LIBRARY: ImpossibleBuilding = {
  // ... standard fields

  geometryType: 'fractal_chambers',
  interiorMultiplier: Infinity,  // Literally infinite

  specialRules: {
    selfReference: true,  // Contains book about itself
    recursiveDepth: Infinity,
    escapeCondition: 'Solve the recursion paradox',
  },
};
```

---

## 6. Fantasy & Standard City Archetypes

### 6.1 Medieval Fantasy Cities

```typescript
const FORTRESS_CITY_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'fortress_military',

  preferredShapes: ['rectangular', 'cross_shaped'],
  avoidedShapes: ['organic'],

  preferredMaterials: ['stone', 'iron', 'steel'],
  symbolicMaterials: new Map([
    ['stone', 'Defensive strength'],
    ['iron', 'Military power'],
  ]),

  organizationPrinciple: 'hierarchical',  // Military rank-based

  symmetryPreference: 0.9,  // Very organized

  requiredBuildings: [
    'castle_keep',
    'barracks',
    'armory',
    'training_grounds',
    'watchtower',
    'city_walls',
    'gatehouse',
  ],

  uniqueFeatures: [
    {
      name: 'Concentric Walls',
      effect: 'Multiple defensive layers',
      appearance: 'Walls within walls',
    },
    {
      name: 'Strategic Chokepoints',
      effect: 'All roads lead through defensible positions',
      appearance: 'Narrow passages with murder holes',
    },
  ],
};

const MAGIC_ACADEMY_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'arcane_scholarly',

  preferredShapes: ['geometric', 'circular'],  // Sacred geometry
  avoidedShapes: ['irregular'],

  preferredMaterials: ['crystal', 'marble', 'enchanted_stone'],
  symbolicMaterials: new Map([
    ['crystal', 'Magical focus'],
    ['marble', 'Purity of knowledge'],
  ]),

  organizationPrinciple: 'radial',  // Ley line-based

  symmetryPreference: 1.0,  // Perfect geometric patterns

  requiredBuildings: [
    'grand_library',
    'arcane_laboratory',
    'spell_forge',
    'summoning_circle',
    'elemental_attunement_chamber',
    'wizard_tower',
    'enchantment_workshop',
  ],

  uniqueFeatures: [
    {
      name: 'Ley Line Convergence',
      effect: 'Built on magical nexus',
      appearance: 'Visible arcane energy streams',
    },
    {
      name: 'Floating Structures',
      effect: 'Some buildings levitate',
      appearance: 'Towers suspended in air',
    },
  ],
};

const PORT_CITY_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'maritime_trade',

  preferredShapes: ['organic', 'L_shaped'],  // Follow coastline
  avoidedShapes: ['circular'],

  preferredMaterials: ['wood', 'rope', 'canvas', 'copper'],
  symbolicMaterials: new Map([
    ['wood', 'Ships and docks'],
    ['copper', 'Navigation instruments'],
  ]),

  organizationPrinciple: 'organic',  // Follows water

  symmetryPreference: 0.3,  // Very irregular

  requiredBuildings: [
    'harbor',
    'shipyard',
    'lighthouse',
    'customs_house',
    'fish_market',
    'warehouse',
    'sailors_tavern',
  ],

  uniqueFeatures: [
    {
      name: 'Tidal Districts',
      effect: 'Some areas flood at high tide',
      appearance: 'Buildings on stilts',
    },
    {
      name: 'Ship-Based Housing',
      effect: 'Decommissioned ships as apartments',
      appearance: 'Boats permanently docked',
    },
  ],
};

const MINING_TOWN_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'underground_mining',

  preferredShapes: ['rectangular', 'irregular'],
  avoidedShapes: ['circular'],

  preferredMaterials: ['stone', 'iron', 'coal'],
  symbolicMaterials: new Map([
    ['stone', 'What we dig from earth'],
    ['iron', 'What we forge from ore'],
  ]),

  organizationPrinciple: 'organic',  // Follows mine shafts

  symmetryPreference: 0.4,

  requiredBuildings: [
    'mine_entrance',
    'smelter',
    'forge',
    'ore_storage',
    'miners_barracks',
    'company_store',
  ],

  uniqueFeatures: [
    {
      name: 'Surface/Underground Split',
      effect: 'City exists on two levels',
      appearance: 'Buildings with deep basements',
    },
    {
      name: 'Ventilation Shafts',
      effect: 'Tall chimneys everywhere',
      appearance: 'Smoke and steam rising',
    },
  ],
};

const AGRICULTURAL_SETTLEMENT: ArchitecturalParadigm = {
  culture: 'farming_pastoral',

  preferredShapes: ['organic', 'rectangular'],
  avoidedShapes: ['geometric'],

  preferredMaterials: ['wood', 'thatch', 'mud_brick'],

  organizationPrinciple: 'organic',  // Follows farmland

  symmetryPreference: 0.2,

  requiredBuildings: [
    'barn',
    'granary',
    'mill',
    'market_square',
    'farmhouse',
  ],

  uniqueFeatures: [
    {
      name: 'Integrated Farmland',
      effect: 'Fields between buildings',
      appearance: 'Green spaces throughout',
    },
  ],
};
```

### 6.2 Fantasy District Types

```typescript
export type FantasyDistrictType =
  // Classic fantasy
  | 'wizards_quarter'     // Magic users
  | 'merchants_district'  // Trade and commerce
  | 'nobles_quarter'      // Wealthy elite
  | 'craftsman_district'  // Artisans and workshops
  | 'slums'               // Poor district
  | 'temple_district'     // Religious center
  | 'foreign_quarter'     // Immigrant/alien district
  | 'thieves_quarter'     // Criminal underground
  | 'military_barracks'   // Soldiers and weapons
  | 'docks'               // Waterfront
  | 'university'          // Academic district
  | 'arena_district'      // Entertainment/combat
  | 'red_light'           // Vice and pleasure
  | 'market_bazaar'       // Trading hub
  | 'garden_district';    // Parks and nature

const WIZARDS_QUARTER: District = {
  id: 'district_wizards_01',
  name: 'The Arcane Quarter',
  districtType: 'wizards_quarter',

  allowedBuildings: [
    'wizard_tower',
    'spell_component_shop',
    'familiar_stable',
    'potion_brewery',
    'enchantment_workshop',
    'arcane_library',
  ],

  districtEffects: [
    {
      name: 'Ambient Magic',
      type: 'magic_amplification',
      magnitude: 0.5,
      radius: -1,
    },
    {
      name: 'Wild Magic Surges',
      type: 'random_magic_events',
      magnitude: 0.3,
      radius: -1,
    },
  ],
};

const THIEVES_QUARTER: District = {
  id: 'district_thieves_01',
  name: 'The Warrens',
  districtType: 'thieves_quarter',

  allowedBuildings: [
    'thieves_guild_hideout',
    'fence_shop',
    'smuggling_den',
    'gambling_house',
  ],

  districtEffects: [
    {
      name: 'Hidden Passages',
      type: 'secret_routes',
      magnitude: 0.8,
      radius: -1,
    },
    {
      name: 'Guard Avoidance',
      type: 'low_law_enforcement',
      magnitude: 0.9,
      radius: -1,
    },
  ],
};
```

---

## 7. Industrial & Steampunk Cities

### 7.1 Industrial Revolution Architecture

```typescript
const INDUSTRIAL_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'industrial_manufacturing',

  preferredShapes: ['rectangular', 'L_shaped'],
  avoidedShapes: ['organic', 'narrative'],

  preferredMaterials: ['brick', 'iron', 'steel', 'glass'],
  symbolicMaterials: new Map([
    ['brick', 'Factory walls'],
    ['iron', 'Machines and gears'],
    ['steel', 'Progress and modernity'],
  ]),

  organizationPrinciple: 'grid',  // Efficient urban planning

  symmetryPreference: 0.7,

  colorPalette: {
    primary: ['gray', 'brown', 'rust'],
    accent: ['smoke_black', 'coal_dust'],
  },

  requiredBuildings: [
    'factory',
    'power_plant',
    'warehouse',
    'rail_station',
    'worker_tenement',
    'company_store',
  ],

  uniqueFeatures: [
    {
      name: 'Constant Smoke',
      effect: 'Chimneys always burning',
      appearance: 'Smog layer over city',
    },
    {
      name: 'Rail Network',
      effect: 'Trains connect all factories',
      appearance: 'Tracks crisscross city',
    },
    {
      name: 'Shift Bells',
      effect: 'City runs on factory schedule',
      appearance: 'Bells ring for shift changes',
    },
  ],
};

const STEAMPUNK_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'steampunk_magitech',

  preferredShapes: ['geometric', 'cross_shaped'],
  avoidedShapes: ['organic'],

  preferredMaterials: ['brass', 'copper', 'polished_steel', 'glass'],
  symbolicMaterials: new Map([
    ['brass', 'Victorian elegance + machinery'],
    ['copper', 'Steam pipes and wiring'],
  ]),

  organizationPrinciple: 'radial',  // Around central power hub

  symmetryPreference: 0.8,

  requiredBuildings: [
    'steam_generator',
    'clockwork_workshop',
    'airship_dock',
    'pneumatic_tube_station',
    'gear_forge',
    'tesla_coil_tower',
  ],

  uniqueFeatures: [
    {
      name: 'Visible Machinery',
      effect: 'Gears and pipes on building exteriors',
      appearance: 'Buildings are machines',
    },
    {
      name: 'Steam Vents',
      effect: 'Constant steam release',
      appearance: 'Hissing white clouds everywhere',
    },
    {
      name: 'Pneumatic Network',
      effect: 'Tubes connect all buildings',
      appearance: 'Transparent pipes overhead',
    },
  ],
};
```

### 7.2 Industrial District Types

```typescript
export type IndustrialDistrictType =
  | 'factory_district'        // Manufacturing
  | 'warehouse_sector'        // Storage and logistics
  | 'power_generation'        // Energy production
  | 'worker_housing'          // Tenements and slums
  | 'rail_yard'               // Transportation hub
  | 'refinery_complex'        // Resource processing
  | 'steelworks'              // Heavy industry
  | 'chemical_plants'         // Dangerous production
  | 'scrapyard'               // Recycling/salvage
  | 'industrial_ruins';       // Abandoned factories

const FACTORY_DISTRICT: District = {
  id: 'district_factory_01',
  name: 'The Manufactories',
  districtType: 'factory_district',

  allowedBuildings: [
    'textile_mill',
    'steel_mill',
    'assembly_plant',
    'power_station',
    'warehouse',
  ],

  districtEffects: [
    {
      name: 'Industrial Pollution',
      type: 'environmental_damage',
      magnitude: 0.7,
      radius: -1,
    },
    {
      name: 'Constant Noise',
      type: 'sound_pollution',
      magnitude: 0.8,
      radius: -1,
    },
    {
      name: 'Factory Schedule',
      type: 'time_regulation',
      magnitude: 0.6,
      radius: -1,
    },
  ],
};
```

---

## 8. Factorio-Style Factory Cities

### 8.1 Automated Production Districts

*Integrates with `AUTOMATION_LOGISTICS_SPEC.md`*

```typescript
const AUTOMATION_CITY_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'automation_factorio',

  preferredShapes: ['rectangular', 'grid'],
  avoidedShapes: ['organic', 'narrative'],

  preferredMaterials: ['steel', 'concrete', 'copper', 'circuits'],

  organizationPrinciple: 'grid',  // Perfect efficiency

  symmetryPreference: 1.0,  // Mathematically optimal

  requiredBuildings: [
    // From AUTOMATION_LOGISTICS_SPEC.md
    'assembling_machine',
    'belt_network',
    'inserter_array',
    'roboport',
    'logistics_storage',
    'power_substation',
    'solar_array',
    'circuit_network_hub',
  ],

  uniqueFeatures: [
    {
      name: 'Belt Spaghetti',
      effect: 'Conveyor belts everywhere',
      appearance: 'Yellow/red/blue ribbons of items',
    },
    {
      name: 'Robot Swarms',
      effect: 'Flying logistics bots',
      appearance: 'Orange construction bots buzzing',
    },
    {
      name: 'Perfect Ratios',
      effect: 'All production mathematically optimized',
      appearance: 'Everything perfectly balanced',
    },
  ],
};

export type FactorioDistrictType =
  | 'smelting_array'          // Ore → plates
  | 'circuit_fabrication'     // Advanced components
  | 'assembly_lines'          // Final products
  | 'logistics_hub'           // Robot networks
  | 'power_grid'              // Energy generation/distribution
  | 'research_labs'           // Science production
  | 'mall'                    // Self-producing item factory
  | 'train_network'           // Rail-based logistics
  | 'military_production';    // Weapons and defenses

const SMELTING_ARRAY: District = {
  id: 'district_smelting_01',
  name: 'The Furnace Fields',
  districtType: 'smelting_array',

  allowedBuildings: [
    'electric_furnace',
    'steel_furnace',
    'ore_unloader',
    'plate_loader',
    'power_pole',
    'beacon',  // Speed/productivity modules
  ],

  districtEffects: [
    {
      name: 'Heat Radiation',
      type: 'environmental_effect',
      magnitude: 0.6,
      radius: -1,
    },
    {
      name: 'Perfect Throughput',
      type: 'production_bonus',
      magnitude: 0.9,
      radius: -1,
    },
  ],

  // Special: Optimized belt ratios
  beltLayout: 'parallel_lines',  // Each furnace line perfectly fed
};

const LOGISTICS_HUB: District = {
  id: 'district_logistics_01',
  name: 'The Roboport Network',
  districtType: 'logistics_hub',

  allowedBuildings: [
    'roboport',
    'passive_provider_chest',
    'active_provider_chest',
    'storage_chest',
    'requester_chest',
    'buffer_chest',
  ],

  districtEffects: [
    {
      name: 'Robot Coverage',
      type: 'autonomous_logistics',
      magnitude: 1.0,
      radius: 100,  // Large roboport range
    },
    {
      name: 'Zero Manual Labor',
      type: 'full_automation',
      magnitude: 1.0,
      radius: -1,
    },
  ],
};
```

### 8.2 Factory Buildings from Automation Spec

```typescript
// Extended building types for factory cities:
export enum FactoryBuildingType {
  // Tier 2: Mechanical (from spec)
  WATER_WHEEL = 'water_wheel',
  WINDMILL = 'windmill',
  BASIC_ASSEMBLER = 'basic_assembler',
  SIMPLE_BELT = 'simple_belt',

  // Tier 3: Electrical
  COAL_BURNER = 'coal_burner',
  SOLAR_PANEL = 'solar_panel',
  ASSEMBLY_MACHINE_1 = 'assembly_machine_1',
  ELECTRIC_BELT = 'electric_belt',
  INSERTER = 'inserter',
  POWER_POLE = 'power_pole',

  // Tier 4: Advanced
  ADVANCED_ASSEMBLER = 'advanced_assembler',
  FAST_BELT = 'fast_belt',
  FAST_INSERTER = 'fast_inserter',
  ROBOPORT = 'roboport',
  LOGISTICS_BOT = 'logistics_bot',
  CONSTRUCTION_BOT = 'construction_bot',

  // Tier 5: Arcane (from spec)
  TELEPORTATION_ARRAY = 'teleportation_array',
  MATTER_TRANSMUTER = 'matter_transmuter',
  MANA_CONDUIT = 'mana_conduit',
  INSTANT_FABRICATOR = 'instant_fabricator',

  // Support structures
  STORAGE_TANK = 'storage_tank',
  WAREHOUSE = 'warehouse',
  TRAIN_STATION = 'train_station',
  CIRCUIT_NETWORK = 'circuit_network',
  BEACON = 'beacon',  // Module effects
}
```

---

## 9. Ruined & Abandoned Cities

### 9.1 Ruins System

```typescript
export interface RuinedBuilding extends Building {
  originalType: BuildingType;
  ruinState: RuinState;

  decay: number;  // 0 = perfect, 1 = collapsed

  // What remains
  salvageableResources: Item[];
  dangerLevel: number;  // Structural collapse, monsters, etc.

  // History
  ageYears: number;
  reasonAbandoned: string;
}

export type RuinState =
  | 'recent'       // Just abandoned, mostly intact
  | 'decayed'      // Years of neglect
  | 'crumbling'    // Dangerous to enter
  | 'collapsed'    // Mostly rubble
  | 'ancient';     // Centuries old, mysterious

const RUINED_FACTORY: RuinedBuilding = {
  originalType: 'assembly_machine_1',
  ruinState: 'decayed',

  decay: 0.6,

  salvageableResources: [
    { id: 'scrap_metal', quantity: 50 },
    { id: 'broken_circuits', quantity: 20 },
    { id: 'rusted_gears', quantity: 30 },
  ],

  dangerLevel: 0.4,  // Some structural issues

  ageYears: 50,
  reasonAbandoned: 'Resource depletion - ore ran out',
};
```

### 9.2 Ruined District Types

```typescript
export type RuinDistrictType =
  | 'abandoned_factory'       // Old industrial zone
  | 'ghost_town'              // Deserted settlement
  | 'ancient_ruins'           // Mysterious old civilization
  | 'collapsed_mine'          // Dangerous underground
  | 'overgrown_city'          // Nature reclaiming
  | 'war_torn'                // Destroyed by conflict
  | 'plague_quarter'          // Abandoned due to disease
  | 'flooded_district'        // Water damage
  | 'burned_sector';          // Fire damage

const ABANDONED_FACTORY_DISTRICT: District = {
  id: 'district_ruins_factory_01',
  name: 'The Dead Manufactories',
  districtType: 'abandoned_factory',

  allowedBuildings: [
    'ruined_factory',
    'collapsed_warehouse',
    'broken_power_station',
    'overgrown_conveyor_belt',
  ],

  districtEffects: [
    {
      name: 'Salvage Opportunity',
      type: 'resource_bonus',
      magnitude: 0.7,
      radius: -1,
    },
    {
      name: 'Structural Hazards',
      type: 'danger_zone',
      magnitude: 0.5,
      radius: -1,
    },
    {
      name: 'Mechanical Monsters',
      type: 'hostile_creatures',
      magnitude: 0.6,  // Malfunctioning robots
      radius: -1,
    },
  ],

  densityLevel: 0.3,  // Lots of open space

  ruinFeatures: [
    'Rusted conveyor belts still trying to move',
    'Broken robots wandering aimlessly',
    'Power surges from damaged grid',
    'Toxic chemical leaks',
  ],
};

const ANCIENT_MAGICAL_RUINS: District = {
  id: 'district_ruins_ancient_01',
  name: 'The Forgotten Academy',
  districtType: 'ancient_ruins',

  allowedBuildings: [
    'ruined_wizard_tower',
    'crumbling_library',
    'broken_enchantment_circle',
  ],

  districtEffects: [
    {
      name: 'Residual Magic',
      type: 'wild_magic',
      magnitude: 0.8,
      radius: -1,
    },
    {
      name: 'Ancient Guardians',
      type: 'magical_constructs',
      magnitude: 0.7,
      radius: -1,
    },
  ],

  ruinFeatures: [
    'Spell matrices still flickering',
    'Unstable teleportation circles',
    'Awakened spell-books seeking readers',
    'Trapped apprentice ghosts',
  ],
};
```

### 9.3 Mixed Active/Ruined Cities

```typescript
export interface MixedEraCit {
  // Cities with multiple technological/magical eras
  activeDistricts: District[];
  ruinedDistricts: District[];

  // Contrasts
  techGradient: {
    modern: District[];    // Current tech
    outdated: District[];  // Old but functional
    ruined: District[];    // Abandoned
    ancient: District[];   // Mysterious
  };

  // Scavenging economy
  salvageRoutes: {
    from: District;  // Ruins
    to: District;    // Active factories
    resources: Item[];
  }[];
}

const MIXED_FACTORY_CITY: MixedEraCity = {
  activeDistricts: [
    LOGISTICS_HUB,  // Modern Factorio-style
    FACTORY_DISTRICT,  // Active production
  ],

  ruinedDistricts: [
    ABANDONED_FACTORY_DISTRICT,  // Old collapsed factories
  ],

  techGradient: {
    modern: ['Roboport networks', 'Solar arrays'],
    outdated: ['Coal-powered factories still running'],
    ruined: ['Abandoned mechanical workshops'],
    ancient: ['Mysterious pre-industrial mechanisms'],
  },

  salvageRoutes: [
    {
      from: ABANDONED_FACTORY_DISTRICT,
      to: FACTORY_DISTRICT,
      resources: ['scrap_metal', 'broken_circuits', 'salvaged_gears'],
    },
  ],
};
```

---

## 10. Massively Expanded Building & District Diversity

### 10.1 Complete Building Type List

```typescript
export enum AllBuildingTypes {
  // RESIDENTIAL (50+ types)
  COTTAGE = 'cottage',
  FARMHOUSE = 'farmhouse',
  TOWNHOUSE = 'townhouse',
  APARTMENT_BUILDING = 'apartment_building',
  PUEBLO = 'pueblo',
  TENEMENT = 'tenement',
  VILLA = 'villa',
  MANSION = 'mansion',
  PALACE = 'palace',
  WORKER_HOUSING = 'worker_housing',
  STUDENT_DORMITORY = 'student_dormitory',
  BARRACKS = 'barracks',
  MONASTERY = 'monastery',
  TREE_HOUSE = 'tree_house',
  UNDERGROUND_DWELLING = 'underground_dwelling',
  FLOATING_HOME = 'floating_home',
  SHIP_HOME = 'ship_home',

  // COMMERCIAL (40+ types)
  GENERAL_STORE = 'general_store',
  BLACKSMITH = 'blacksmith',
  TAILOR = 'tailor',
  BAKERY = 'bakery',
  BUTCHER = 'butcher',
  TAVERN = 'tavern',
  INN = 'inn',
  MARKET_STALL = 'market_stall',
  WAREHOUSE = 'warehouse',
  BANK = 'bank',
  PAWN_SHOP = 'pawn_shop',
  AUCTION_HOUSE = 'auction_house',
  TRADING_POST = 'trading_post',
  FENCE_SHOP = 'fence_shop',
  MAGIC_SHOP = 'magic_shop',
  POTION_SHOP = 'potion_shop',
  BOOKSTORE = 'bookstore',
  SCROLL_SHOP = 'scroll_shop',

  // INDUSTRIAL (60+ types)
  FACTORY = 'factory',
  MILL = 'mill',
  FORGE = 'forge',
  SMELTER = 'smelter',
  KILN = 'kiln',
  TANNERY = 'tannery',
  BREWERY = 'brewery',
  DISTILLERY = 'distillery',
  PAPER_MILL = 'paper_mill',
  TEXTILE_MILL = 'textile_mill',
  SAWMILL = 'sawmill',
  PRINTING_PRESS = 'printing_press',
  GLASSWORKS = 'glassworks',
  POTTERY_WORKSHOP = 'pottery_workshop',
  CARPENTRY_SHOP = 'carpentry_shop',
  JEWELER = 'jeweler',
  CLOCKMAKER = 'clockmaker',
  ALCHEMICAL_LAB = 'alchemical_lab',
  ENCHANTMENT_WORKSHOP = 'enchantment_workshop',

  // CIVIC (30+ types)
  TOWN_HALL = 'town_hall',
  COURTHOUSE = 'courthouse',
  PRISON = 'prison',
  GUARD_HOUSE = 'guard_house',
  FIRE_STATION = 'fire_station',
  HOSPITAL = 'hospital',
  ORPHANAGE = 'orphanage',
  ALMSHOUSE = 'almshouse',
  BATHHOUSE = 'bathhouse',
  AQUEDUCT = 'aqueduct',
  FOUNTAIN = 'fountain',
  PARK = 'park',
  CEMETERY = 'cemetery',
  MONUMENT = 'monument',
  STATUE = 'statue',

  // RELIGIOUS (25+ types)
  TEMPLE = 'temple',
  CATHEDRAL = 'cathedral',
  SHRINE = 'shrine',
  ALTAR = 'altar',
  CLOISTER = 'cloister',
  SEMINARY = 'seminary',
  PILGRIMAGE_SITE = 'pilgrimage_site',

  // EDUCATIONAL (20+ types)
  SCHOOL = 'school',
  UNIVERSITY = 'university',
  LIBRARY = 'library',
  ARCHIVE = 'archive',
  SCRIPTORIUM = 'scriptorium',
  LECTURE_HALL = 'lecture_hall',
  LABORATORY = 'laboratory',
  OBSERVATORY = 'observatory',
  MUSEUM = 'museum',

  // MILITARY (30+ types)
  CASTLE = 'castle',
  FORTRESS = 'fortress',
  KEEP = 'keep',
  WATCHTOWER = 'watchtower',
  ARMORY = 'armory',
  TRAINING_GROUNDS = 'training_grounds',
  SIEGE_WORKSHOP = 'siege_workshop',
  STABLE = 'stable',
  KENNEL = 'kennel',

  // ENTERTAINMENT (25+ types)
  THEATER = 'theater',
  ARENA = 'arena',
  COLOSSEUM = 'colosseum',
  CIRCUS = 'circus',
  GAMBLING_HOUSE = 'gambling_house',
  BROTHEL = 'brothel',
  MUSIC_HALL = 'music_hall',
  ART_GALLERY = 'art_gallery',

  // INFRASTRUCTURE (50+ types)
  BRIDGE = 'bridge',
  GATE = 'gate',
  WALL_SECTION = 'wall_section',
  ROAD = 'road',
  SEWER = 'sewer',
  WELL = 'well',
  CISTERN = 'cistern',
  GRANARY = 'granary',
  SILO = 'silo',
  LIGHTHOUSE = 'lighthouse',
  PORT = 'port',
  DOCK = 'dock',
  SHIPYARD = 'shipyard',
  RAIL_STATION = 'rail_station',
  AIRSHIP_DOCK = 'airship_dock',

  // MAGICAL (40+ types from Literary Surrealism)
  BIBLIOMANCER_LIBRARY = 'bibliomancer_library',
  ONOMANCER_VAULT = 'onomancer_vault',
  SOMNOMANCER_DORMITORY = 'somnomancer_dormitory',
  CHROMOMANCER_STUDIO = 'chromomancer_studio',
  WIZARD_TOWER = 'wizard_tower',
  SPELL_FORGE = 'spell_forge',
  SUMMONING_CIRCLE = 'summoning_circle',
  TELEPORTATION_CIRCLE = 'teleportation_circle',
  PORTAL_GATE = 'portal_gate',
  LEY_LINE_NEXUS = 'ley_line_nexus',

  // FACTORIO (40+ types from Automation Spec)
  ASSEMBLING_MACHINE = 'assembling_machine',
  ELECTRIC_FURNACE = 'electric_furnace',
  CHEMICAL_PLANT = 'chemical_plant',
  OIL_REFINERY = 'oil_refinery',
  ROBOPORT = 'roboport',
  POWER_SUBSTATION = 'power_substation',
  SOLAR_ARRAY = 'solar_array',
  ACCUMULATOR = 'accumulator',
  STEAM_ENGINE = 'steam_engine',
  NUCLEAR_REACTOR = 'nuclear_reactor',

  // EXOTIC (30+ types)
  DIMENSIONAL_TEAR = 'dimensional_tear',
  TIME_DILATION_CHAMBER = 'time_dilation_chamber',
  GRAVITY_WELL = 'gravity_well',
  LIVING_BUILDING = 'living_building',  // Biological architecture
  CRYSTALLINE_STRUCTURE = 'crystalline_structure',
  SHADOW_REPOSITORY = 'shadow_repository',
  DREAM_ANCHOR = 'dream_anchor',

  // RUINS (20+ types)
  RUINED_FACTORY = 'ruined_factory',
  COLLAPSED_TOWER = 'collapsed_tower',
  ANCIENT_TEMPLE = 'ancient_temple',
  OVERGROWN_MANSION = 'overgrown_mansion',
  FLOODED_BASEMENT = 'flooded_basement',
}

// Total: 400+ unique building types
```

### 10.2 Complete District Type List

```typescript
export type AllDistrictTypes =
  // Fantasy (15)
  | 'wizards_quarter' | 'merchants_district' | 'nobles_quarter'
  | 'craftsman_district' | 'slums' | 'temple_district'
  | 'foreign_quarter' | 'thieves_quarter' | 'military_barracks'
  | 'docks' | 'university' | 'arena_district'
  | 'red_light' | 'market_bazaar' | 'garden_district'

  // Literary Mancers (10)
  | 'word_district' | 'sensory_quarter' | 'temporal_enclave'
  | 'shadow_slums' | 'dream_bazaar' | 'name_vault_quarter'
  | 'echo_district' | 'silent_enclave' | 'color_quarter'
  | 'mancer_neutral'

  // Industrial (10)
  | 'factory_district' | 'warehouse_sector' | 'power_generation'
  | 'worker_housing' | 'rail_yard' | 'refinery_complex'
  | 'steelworks' | 'chemical_plants' | 'scrapyard'
  | 'industrial_ruins'

  // Factorio (9)
  | 'smelting_array' | 'circuit_fabrication' | 'assembly_lines'
  | 'logistics_hub' | 'power_grid' | 'research_labs'
  | 'mall' | 'train_network' | 'military_production'

  // Ruins (9)
  | 'abandoned_factory' | 'ghost_town' | 'ancient_ruins'
  | 'collapsed_mine' | 'overgrown_city' | 'war_torn'
  | 'plague_quarter' | 'flooded_district' | 'burned_sector'

  // Agricultural (5)
  | 'farmland' | 'orchards' | 'pastures' | 'vineyard' | 'fishery'

  // Exotic (12)
  | 'dimensional_overlap' | 'time_bubble' | 'anti_gravity_zone'
  | 'living_district' | 'crystalline_gardens' | 'underwater_quarter'
  | 'sky_platforms' | 'underground_caverns' | 'pocket_dimension'
  | 'phase_shifted' | 'mirror_realm' | 'quantum_district';

// Total: 80+ distinct district types
```

---

## 11. Surreal & Material-Based Cities

> *Cities built from impossible materials: flesh, candy, shadow, frozen music, crystallized dreams*

### 11.1 Material-Based City Paradigm

Each surreal city is defined by its **primary building material**, which determines everything from structure to behavior.

```typescript
export interface SurrealMaterial {
  id: string;
  name: string;

  // Material Properties
  isLiving: boolean;          // Does it grow/breathe/bleed?
  isEdible: boolean;          // Can you eat the buildings?
  isTransient: boolean;       // Does it fade/melt/dissolve?
  isSolid: boolean;           // Can you walk through it?

  // Environmental Requirements
  requiresLight?: boolean;    // Withers in darkness
  requiresDark?: boolean;     // Dissolves in light
  requiresHeat?: boolean;     // Melts without heat
  requiresCold?: boolean;     // Melts in heat
  requiresDreams?: boolean;   // Needs sleeping minds nearby
  requiresSound?: boolean;    // Needs constant music

  // Dangers
  decayRate: number;          // How fast it degrades (0 = stable)
  hostility: number;          // Does it attack inhabitants? (0-1)

  // Special Properties
  transmutation?: string;     // What happens when conditions aren't met
  harvestable?: Item[];       // Can you harvest resources from buildings?

  // Narrative Effects
  psychologicalEffect?: string;  // Living in this city makes you...
  aestheticDescription: string;
}
```

### 11.2 Flesh Cities

**Core Concept**: Cities grown from living tissue, bone, and organ systems. Buildings breathe, bleed when damaged, and require feeding.

```typescript
const FLESH_MATERIAL: SurrealMaterial = {
  id: 'flesh',
  name: 'Living Flesh',

  isLiving: true,
  isEdible: true,  // Technically, but horrifying
  isTransient: false,
  isSolid: true,

  requiresLight: false,
  requiresDark: false,
  requiresHeat: true,  // Cold = necrosis

  decayRate: 0.02,  // Slow natural decay
  hostility: 0.3,   // Sometimes grows teeth/attacks

  harvestable: [
    { id: 'flesh_brick', name: 'Flesh Brick' },
    { id: 'bone_beam', name: 'Bone Structural Beam' },
    { id: 'sinew_rope', name: 'Sinew Rope' },
  ],

  psychologicalEffect: 'Residents develop body horror, struggle with boundaries between self and city',
  aestheticDescription: 'Pulsing pink-red walls, visible veins, breathing doors, bone lattice windows',
};

// Flesh City Architecture
const FLESH_CITY_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'flesh_organic',

  preferredShapes: ['organic', 'bulbous', 'curved'],
  avoidedShapes: ['rectangular', 'angular'],

  preferredMaterials: ['flesh', 'bone', 'cartilage', 'sinew'],
  symbolicMaterials: new Map([
    ['bone', 'Structure and permanence'],
    ['flesh', 'Growth and sustenance'],
    ['organs', 'Function and vitality'],
  ]),

  organizationPrinciple: 'organic',  // Like a body plan
  symmetryPreference: 0.7,  // Bilateral like bodies

  requiredBuildings: [
    'heart_chamber',      // Central pumping station
    'lung_spires',        // Air circulation
    'digestive_pit',      // Waste processing
    'brain_tower',        // Central control
    'bone_wall',          // Skeletal fortifications
  ],

  uniqueFeatures: [
    {
      name: 'Vascular Network',
      effect: 'Blood vessels connect all buildings, transport resources',
      appearance: 'Pulsing red tubes between structures',
    },
    {
      name: 'Immune Response',
      effect: 'City attacks foreign entities like white blood cells',
      appearance: 'Flesh walls grow teeth/pseudopods when threatened',
    },
    {
      name: 'Wound Healing',
      effect: 'Damaged buildings regenerate slowly',
      appearance: 'Scabs, new flesh growing over damaged areas',
    },
  ],
};

export type FleshBuildingType =
  | 'heart_chamber'        // Central pumping, distributes "blood" (resources)
  | 'lung_spires'          // Tall breathing towers, air purification
  | 'brain_tower'          // Nerve center, coordination
  | 'digestive_pit'        // Breaks down waste, produces nutrients
  | 'bone_fortress'        // Skeletal defenses
  | 'muscle_mill'          // Contracting walls power machinery
  | 'eye_observatory'      // Giant eye that watches
  | 'ear_listening_post'   // Massive ear for surveillance
  | 'skin_dwelling'        // Layered dermis housing
  | 'gland_factory'        // Produces hormones/chemicals
  | 'marrow_mine'          // Extract resources from bone
  | 'vein_highway'         // Blood vessel transit system
  | 'stomach_storage'      // Acid-resistant warehouses
  | 'liver_filtration'     // Toxin removal
  | 'womb_incubator';      // Grows new buildings/entities

export type FleshDistrictType =
  | 'organ_quarter'        // Dense with vital organs
  | 'skeletal_sector'      // Bone-heavy defensive zone
  | 'vascular_network'     // Major blood vessel junctions
  | 'nervous_system'       // Brain/nerve clusters
  | 'muscular_district'    // Power generation
  | 'digestive_tract'      // Processing and waste
  | 'sensory_organs'       // Eyes, ears, tongues
  | 'reproductive_zone'    // Growth and spawning
  | 'necrotic_slums';      // Dying/dead tissue areas

// Special Mechanics
export interface FleshCityMechanics {
  // City Needs (like a living creature)
  hunger: number;           // 0 = starving, 100 = fed
  oxygenation: number;      // 0 = suffocating, 100 = breathing
  health: number;           // 0 = diseased, 100 = healthy

  // Feeding the City
  feedingSchedule: number;  // Ticks between meals
  acceptedFood: Item[];     // What the city eats

  // Disease System
  infections: FleshDisease[];
  immuneResponse: number;   // How well it fights disease

  // Growth
  growthRate: number;       // How fast new buildings sprout
  mutationChance: number;   // Random changes during growth
}

export interface FleshDisease {
  name: string;
  infectedBuildings: number;
  spreadRate: number;
  effect: string;  // 'reduced_function' | 'necrosis' | 'mutation' | 'parasites'
  cure?: Item;
}
```

### 11.3 Candy Cities

**Core Concept**: Edible cities made of sugar, chocolate, gingerbread, and crystallized sweets. Delicious but vulnerable to weather, vermin, and hungry visitors.

```typescript
const CANDY_MATERIAL: SurrealMaterial = {
  id: 'candy',
  name: 'Crystallized Sugar',

  isLiving: false,
  isEdible: true,
  isTransient: true,   // Melts in heat, dissolves in rain
  isSolid: true,

  requiresHeat: false,
  requiresCold: true,  // Melts in heat

  decayRate: 0.05,     // Faster decay than flesh
  hostility: 0,        // Harmless

  transmutation: 'melts into syrup in heat, dissolves in water',

  harvestable: [
    { id: 'sugar_brick', name: 'Sugar Brick' },
    { id: 'hard_candy_pane', name: 'Hard Candy Window' },
    { id: 'chocolate_beam', name: 'Solid Chocolate Beam' },
    { id: 'gingerbread_plank', name: 'Gingerbread Plank' },
    { id: 'licorice_rope', name: 'Licorice Rope' },
  ],

  psychologicalEffect: 'Constant sugar rush, tooth decay, irrational joy, eventual diabetes',
  aestheticDescription: 'Rainbow colors, translucent candy windows, frosting decorations, smell of vanilla',
};

const CANDY_CITY_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'candy_confection',

  preferredShapes: ['curved', 'whimsical', 'decorated'],
  avoidedShapes: ['angular', 'brutal'],

  preferredMaterials: ['sugar', 'chocolate', 'gingerbread', 'candy', 'frosting'],
  symbolicMaterials: new Map([
    ['hard_candy', 'Transparency and fragility'],
    ['chocolate', 'Richness and indulgence'],
    ['gingerbread', 'Structure and tradition'],
  ]),

  organizationPrinciple: 'whimsical',
  symmetryPreference: 0.3,  // Chaotic like candy land

  requiredBuildings: [
    'candy_cane_tower',
    'chocolate_factory',
    'gingerbread_house',
    'lollipop_forest',
    'frosting_fountain',
  ],

  uniqueFeatures: [
    {
      name: 'Edible Everything',
      effect: 'Entire city is food source, but eating it destroys infrastructure',
      appearance: 'Bite marks on buildings, missing chunks',
    },
    {
      name: 'Weather Vulnerability',
      effect: 'Rain dissolves buildings, heat melts them, cold preserves',
      appearance: 'Melting walls, sticky puddles, crystallized frost',
    },
    {
      name: 'Vermin Infestation',
      effect: 'Attracts ants, rats, birds who eat the city',
      appearance: 'Ant highways, rat gnaw marks, bird pecks',
    },
  ],
};

export type CandyBuildingType =
  | 'candy_cane_tower'      // Striped spiral towers
  | 'gingerbread_house'     // Classic housing
  | 'chocolate_factory'     // Produces more candy materials
  | 'lollipop_forest'       // Giant lollipops as trees/poles
  | 'gumdrop_dome'          // Chewy dome structures
  | 'licorice_bridge'       // Rope candy bridges
  | 'hard_candy_wall'       // Translucent defenses
  | 'frosting_fountain'     // Decorative/coating station
  | 'jawbreaker_vault'      // Extremely hard storage
  | 'cotton_candy_cloud'    // Fluffy floating structures
  | 'caramel_pit'           // Sticky trap defenses
  | 'peppermint_palace'     | 'nougat_dwelling'
  | 'fudge_forge'           // Craft candy items
  | 'sugar_crystal_mine';   // Extract raw sugar

export type CandyDistrictType =
  | 'confection_quarter'    // Mixed candy types
  | 'chocolate_district'    // All chocolate
  | 'hard_candy_sector'     // Brittle structures
  | 'gummy_zone'            // Chewy/flexible buildings
  | 'baking_district'       // Production areas
  | 'melted_ruins'          // Heat-damaged area
  | 'ant_infestation';      // Vermin-controlled sector

export interface CandyCityMechanics {
  temperature: number;      // Current temp (affects melting)
  humidity: number;         // Rain/moisture (dissolves candy)

  meltingThreshold: number; // Temp above which buildings melt

  verminPopulation: number; // How many pests eating the city
  verminGrowthRate: number; // Pest reproduction

  repairMaterial: Item[];   // Sugar, chocolate, etc. to rebuild

  // Special: Inhabitants slowly eat their own city
  hungerDamage: number;     // How much city is consumed per day
}
```

### 11.4 Shadow Cities

**Core Concept**: Cities made of solidified darkness and frozen shadows. Only exist in darkness, vanish in light.

```typescript
const SHADOW_MATERIAL: SurrealMaterial = {
  id: 'shadow',
  name: 'Solidified Shadow',

  isLiving: false,
  isEdible: false,
  isTransient: true,
  isSolid: true,  // But only in darkness

  requiresLight: false,
  requiresDark: true,  // CRITICAL: Vanishes in light

  decayRate: 0,  // Stable in darkness
  hostility: 0.2,  // Shadows can be dangerous

  transmutation: 'dissolves instantly in bright light, becomes intangible',

  harvestable: [
    { id: 'shadow_essence', name: 'Bottled Shadow' },
    { id: 'darkness_shard', name: 'Crystallized Dark' },
  ],

  psychologicalEffect: 'Fear of light, photophobia, nocturnal habits, visual hallucinations',
  aestheticDescription: 'Pure black structures, no reflection, absolute darkness, visible only by absence of light',
};

const SHADOW_CITY_ARCHITECTURE: ArchitecturalParadigm = {
  culture: 'shadow_umbral',

  preferredShapes: ['irregular', 'angular', 'sharp'],
  avoidedShapes: ['rounded'],

  preferredMaterials: ['shadow', 'darkness', 'void'],
  symbolicMaterials: new Map([
    ['shadow', 'Secrecy and concealment'],
    ['darkness', 'Safety from light'],
  ]),

  organizationPrinciple: 'concealing',
  symmetryPreference: 0.4,

  requiredBuildings: [
    'umbral_vault',
    'shadow_gate',
    'darkness_generator',
    'light_trap',
    'void_chamber',
  ],

  uniqueFeatures: [
    {
      name: 'Light Vulnerability',
      effect: 'Any light source dissolves buildings instantly',
      appearance: 'Buildings vanish like smoke in light',
    },
    {
      name: 'Permanent Darkness',
      effect: 'City generates darkness field, blocks all light',
      appearance: 'Absolute blackness, even torches dim',
    },
    {
      name: 'Shadow-Walking',
      effect: 'Can travel instantly between shadows',
      appearance: 'Step into one shadow, emerge from another',
    },
  ],
};

export type ShadowBuildingType =
  | 'umbral_vault'          // Shadow treasury
  | 'darkness_generator'    // Creates darkness field
  | 'light_trap'            // Captures/destroys light
  | 'shadow_gate'           // Teleportation via shadows
  | 'void_chamber'          // Absolute absence
  | 'twilight_border'       // Edge between light/dark
  | 'shade_dwelling'        // Housing
  | 'eclipse_tower'         // Blocks sunlight
  | 'obsidian_mirror'       // Reflects but inverted
  | 'nightmare_den';        // Where fears manifest

export type ShadowDistrictType =
  | 'umbral_core'           // Deepest darkness
  | 'twilight_edge'         // Border with outside
  | 'shadow_market'         // Trade in dark goods
  | 'void_quarter';         // Absolute emptiness

export interface ShadowCityMechanics {
  darknessLevel: number;    // 0 = bright light (city vanishes), 100 = absolute dark

  lightSources: Entity[];   // Tracked threats to city

  // Darkness field generation
  darknessRadius: number;   // How far darkness extends
  lightBlockStrength: number; // How much light is blocked

  // If light breaches
  dissolutionRate: number;  // How fast buildings vanish in light
  reconstitutionTime: number; // How long to reform in darkness
}
```

### 11.5 More Surreal Material Cities

Quick reference for additional surreal city types:

```typescript
// Glass Cities - Transparent, fragile, reflective
const GLASS_MATERIAL: SurrealMaterial = {
  id: 'glass',
  name: 'Living Glass',
  isLiving: false,
  isEdible: false,
  isTransient: false,
  isSolid: true,
  decayRate: 0,
  hostility: 0.1,  // Shatters and cuts
  aestheticDescription: 'Transparent walls, prismatic light, mirrors everywhere, easily shattered',
};

// Paper Cities - Origami architecture, book-based
const PAPER_MATERIAL: SurrealMaterial = {
  id: 'paper',
  name: 'Folded Parchment',
  isLiving: false,
  isEdible: false,
  isTransient: true,  // Fire and water vulnerability
  isSolid: true,
  requiresHeat: false,
  decayRate: 0.03,
  hostility: 0,
  aestheticDescription: 'Origami buildings, written words everywhere, paper lanterns, rustling sounds',
};

// Crystal Cities - Resonant, geometric, musical
const CRYSTAL_MATERIAL: SurrealMaterial = {
  id: 'crystal',
  name: 'Resonant Crystal',
  isLiving: false,
  isEdible: false,
  isTransient: false,
  isSolid: true,
  requiresSound: true,  // Needs vibration to stay stable
  decayRate: 0,
  hostility: 0,
  aestheticDescription: 'Geometric formations, rainbow light, constant humming, vibrations',
};

// Bone Cities - Skeletal, ancient, necromantic
const BONE_MATERIAL: SurrealMaterial = {
  id: 'bone',
  name: 'Ancient Bone',
  isLiving: false,
  isEdible: false,
  isTransient: false,
  isSolid: true,
  decayRate: 0.01,
  hostility: 0.3,  // Haunted
  aestheticDescription: 'White calcium structures, ossified architecture, marrow-filled chambers',
};

// Ice Cities - Frozen, melting, seasonal
const ICE_MATERIAL: SurrealMaterial = {
  id: 'ice',
  name: 'Eternal Ice',
  isLiving: false,
  isEdible: false,
  isTransient: true,
  isSolid: true,
  requiresCold: true,
  decayRate: 0.1,  // Fast in heat
  hostility: 0,
  transmutation: 'melts into water, refreezes in cold',
  aestheticDescription: 'Translucent blue-white, icicle spires, frost patterns, slippery surfaces',
};

// Clockwork Cities - All gears, mechanical, precise
const CLOCKWORK_MATERIAL: SurrealMaterial = {
  id: 'clockwork',
  name: 'Living Gears',
  isLiving: true,  // Mechanical life
  isEdible: false,
  isTransient: false,
  isSolid: true,
  decayRate: 0.02,  // Rust
  hostility: 0.2,  // Moving gears are dangerous
  aestheticDescription: 'Brass gears, ticking sounds, rotating buildings, spring-powered',
};

// Dream Cities - Illogical, shifting, unstable
const DREAM_MATERIAL: SurrealMaterial = {
  id: 'dream',
  name: 'Crystallized Dreams',
  isLiving: false,
  isEdible: false,
  isTransient: true,
  isSolid: false,  // Semi-solid, shifts
  requiresDreams: true,
  decayRate: 0.2,  // Very unstable
  hostility: 0.5,  // Dream logic is dangerous
  aestheticDescription: 'Impossible geometry, shifting colors, dream logic, unstable',
};

// Sound Cities - Made of frozen music
const SOUND_MATERIAL: SurrealMaterial = {
  id: 'sound',
  name: 'Frozen Music',
  isLiving: false,
  isEdible: false,
  isTransient: true,
  isSolid: false,  // Tangible but not solid
  requiresSound: true,  // Silence destroys it
  decayRate: 0.15,
  hostility: 0,
  transmutation: 'dissipates in silence, resonates in sound',
  aestheticDescription: 'Visible sound waves, harmonic structures, constant music, vibrations',
};

// Memory Cities - Built from crystallized memories
const MEMORY_MATERIAL: SurrealMaterial = {
  id: 'memory',
  name: 'Crystallized Memory',
  isLiving: false,
  isEdible: false,
  isTransient: true,
  isSolid: true,
  requiresDreams: false,
  decayRate: 0.1,  // Memories fade
  hostility: 0.4,  // Dangerous to experience
  aestheticDescription: 'Translucent scenes frozen in walls, touch = experience memory, fading over time',
};

// Coral Cities - Underwater, living reef
const CORAL_MATERIAL: SurrealMaterial = {
  id: 'coral',
  name: 'Living Coral',
  isLiving: true,
  isEdible: false,
  isTransient: false,
  isSolid: true,
  requiresLight: true,  // Photosynthetic
  decayRate: 0,
  hostility: 0.1,  // Some coral stings
  aestheticDescription: 'Colorful polyps, underwater growth, calcium carbonate, living ecosystem',
};
```

### 11.6 District Types for Surreal Cities

```typescript
export type SurrealDistrictType =
  // Flesh Cities
  | 'organ_quarter' | 'skeletal_sector' | 'vascular_network'
  | 'nervous_system' | 'muscular_district' | 'digestive_tract'
  | 'sensory_organs' | 'reproductive_zone' | 'necrotic_slums'

  // Candy Cities
  | 'confection_quarter' | 'chocolate_district' | 'hard_candy_sector'
  | 'gummy_zone' | 'baking_district' | 'melted_ruins' | 'ant_infestation'

  // Shadow Cities
  | 'umbral_core' | 'twilight_edge' | 'shadow_market' | 'void_quarter'

  // Glass Cities
  | 'crystal_prism' | 'mirror_maze' | 'shattered_sector' | 'lens_array'

  // Paper Cities
  | 'library_district' | 'origami_quarter' | 'scroll_sector' | 'burned_pages'

  // Crystal Cities
  | 'resonance_chamber' | 'geometric_core' | 'harmonic_district'

  // Bone Cities
  | 'ossuary_quarter' | 'marrow_mines' | 'skull_citadel' | 'cemetery_sector'

  // Ice Cities
  | 'glacier_district' | 'frost_quarter' | 'ice_palace' | 'melting_slums'

  // Clockwork Cities
  | 'gear_district' | 'spring_sector' | 'clock_tower_quarter' | 'mechanism_core'

  // Dream Cities
  | 'nightmare_sector' | 'lucid_quarter' | 'shifting_maze' | 'dreamless_void'

  // Sound Cities
  | 'symphony_hall' | 'echo_chamber' | 'silent_zone' | 'resonance_district'

  // Memory Cities
  | 'nostalgia_quarter' | 'forgotten_sector' | 'trauma_district' | 'happy_memories';
```

### 11.7 Integration with Literary Surrealism

Surreal material cities naturally integrate with the mancer disciplines:

```typescript
export const MANCER_CITY_SYNERGIES = {
  flesh_cities: {
    compatible_mancers: ['somnomancy', 'onomancy'],  // Dream of flesh, name organs
    powerful_spells: ['flesh_manipulation', 'organ_command', 'blood_magic'],
  },

  candy_cities: {
    compatible_mancers: ['gastromancy', 'aromancy'],  // Food magic, scent magic
    powerful_spells: ['sugar_crystallization', 'flavor_enhancement', 'edible_architecture'],
  },

  shadow_cities: {
    compatible_mancers: ['umbramancy', 'somnomancy'],  // Shadow magic, nightmare magic
    powerful_spells: ['shadow_solidification', 'darkness_field', 'light_banishment'],
  },

  paper_cities: {
    compatible_mancers: ['bibliomancy', 'typomancy', 'onomancy'],  // Book/writing/name magic
    powerful_spells: ['origami_animation', 'word_architecture', 'paper_portal'],
  },

  crystal_cities: {
    compatible_mancers: ['audiomancy', 'chromomancy'],  // Sound/color magic
    powerful_spells: ['resonance_architecture', 'harmonic_stabilization', 'prismatic_defense'],
  },

  dream_cities: {
    compatible_mancers: ['somnomancy', 'mnemonimancy'],  // Dream/memory magic
    powerful_spells: ['dream_stabilization', 'lucid_architecture', 'nightmare_banishment'],
  },

  sound_cities: {
    compatible_mancers: ['audiomancy', 'echomancy'],  // Sound/echo magic
    powerful_spells: ['sonic_construction', 'harmonic_resonance', 'silence_barrier'],
  },

  memory_cities: {
    compatible_mancers: ['mnemonimancy', 'bibliomancy'],  // Memory/record magic
    powerful_spells: ['memory_extraction', 'recall_architecture', 'forgetting_curse'],
  },
};
```

### 11.8 Mixed Material Cities

Cities can combine multiple surreal materials:

```typescript
export interface HybridSurrealCity {
  primaryMaterial: SurrealMaterial;
  secondaryMaterial: SurrealMaterial;

  blendingStrategy: 'layered' | 'intermingled' | 'district_separated' | 'nested';

  // Example: Flesh-Candy City
  // - Candy arteries pump syrup instead of blood
  // - Flesh wrapped in hard candy shell
  // - Organs made of gummy material

  hybridBuildings: Building[];
  materialConflicts: MaterialConflict[];
}

export interface MaterialConflict {
  material1: string;
  material2: string;
  conflictType: 'destructive' | 'unstable' | 'synergistic' | 'transformative';
  effect: string;

  // Example conflicts:
  // - ice + fire = constant melting/refreezing
  // - shadow + light = twilight zone, neither stable
  // - flesh + candy = rot attracts vermin to sugar
  // - dream + clockwork = mechanical precision vs chaos
}

// Example Hybrid: Candy-Bone Necropolis
const CANDY_BONE_CITY = {
  primaryMaterial: CANDY_MATERIAL,
  secondaryMaterial: BONE_MATERIAL,
  blendingStrategy: 'layered',

  concept: 'Ancient bone structure overgrown with candy coral',
  aesthetics: 'Skull buildings decorated with frosting, bone towers with candy cane spires',

  hybridBuildings: [
    {
      type: 'skull_candy_palace',
      description: 'Massive skull made of white chocolate, eye sockets glow with hard candy',
    },
    {
      type: 'marrow_fudge_mine',
      description: 'Extract bone marrow that crystallizes into fudge',
    },
  ],
};
```

### 11.9 Environmental Hazards of Surreal Cities

```typescript
export interface SurrealCityHazard {
  cityType: string;
  hazards: Hazard[];
}

const SURREAL_HAZARDS: SurrealCityHazard[] = [
  {
    cityType: 'flesh',
    hazards: [
      { name: 'Infection', effect: 'Disease spreads through city', severity: 'high' },
      { name: 'Starvation', effect: 'City dies if not fed', severity: 'critical' },
      { name: 'Immune Response', effect: 'City attacks foreign entities', severity: 'medium' },
      { name: 'Cancer Growth', effect: 'Buildings mutate uncontrollably', severity: 'high' },
      { name: 'Necrosis', effect: 'Sections die and rot', severity: 'high' },
    ],
  },
  {
    cityType: 'candy',
    hazards: [
      { name: 'Melting', effect: 'Buildings dissolve in heat', severity: 'high' },
      { name: 'Rain Dissolution', effect: 'Water erodes structures', severity: 'critical' },
      { name: 'Vermin', effect: 'Insects/animals eat city', severity: 'medium' },
      { name: 'Tooth Decay', effect: 'Residents develop health issues', severity: 'low' },
      { name: 'Stickiness', effect: 'Everything gets stuck together', severity: 'low' },
    ],
  },
  {
    cityType: 'shadow',
    hazards: [
      { name: 'Light Breach', effect: 'Buildings vanish in light', severity: 'critical' },
      { name: 'Madness', effect: 'Darkness drives residents insane', severity: 'medium' },
      { name: 'Shadow Possession', effect: 'Shadows become sentient/hostile', severity: 'medium' },
      { name: 'Void Collapse', effect: 'Absolute emptiness consumes city', severity: 'high' },
    ],
  },
  {
    cityType: 'dream',
    hazards: [
      { name: 'Logic Failure', effect: 'Physics stops working randomly', severity: 'high' },
      { name: 'Nightmare Invasion', effect: 'Bad dreams manifest physically', severity: 'high' },
      { name: 'Reality Erosion', effect: 'City becomes less real over time', severity: 'critical' },
      { name: 'Awakening', effect: 'If dreamer wakes, city vanishes', severity: 'critical' },
    ],
  },
  {
    cityType: 'ice',
    hazards: [
      { name: 'Melting', effect: 'Heat destroys structures', severity: 'critical' },
      { name: 'Avalanche', effect: 'Buildings collapse', severity: 'high' },
      { name: 'Frostbite', effect: 'Residents freeze', severity: 'medium' },
      { name: 'Brittleness', effect: 'Structures shatter easily', severity: 'medium' },
    ],
  },
];
```

### 11.10 Extended Material Compendium

Add traditional and elemental materials to enable unexpected combinations:

```typescript
// Traditional Materials
const STONE_MATERIAL: SurrealMaterial = {
  id: 'stone',
  name: 'Living Stone',
  isLiving: false,
  isEdible: false,
  isTransient: false,
  isSolid: true,
  decayRate: 0,
  hostility: 0,
  aestheticDescription: 'Gray granite, carved surfaces, weathered textures, ancient and enduring',
};

const WOOD_MATERIAL: SurrealMaterial = {
  id: 'wood',
  name: 'Growing Wood',
  isLiving: true,
  isEdible: false,
  isTransient: false,
  isSolid: true,
  requiresLight: true,  // Trees need sun
  decayRate: 0.01,  // Slow rot
  hostility: 0.1,  // Splinters, thorns
  aestheticDescription: 'Living timber, growing branches, carved trunks, bark walls, leaf roofs',
};

const METAL_MATERIAL: SurrealMaterial = {
  id: 'metal',
  name: 'Forged Steel',
  isLiving: false,
  isEdible: false,
  isTransient: false,
  isSolid: true,
  decayRate: 0.02,  // Rust
  hostility: 0.2,  // Sharp edges, heat
  aestheticDescription: 'Polished steel, riveted plates, brass fittings, iron beams, metallic echoes',
};

const DIAMOND_MATERIAL: SurrealMaterial = {
  id: 'diamond',
  name: 'Pure Diamond',
  isLiving: false,
  isEdible: false,
  isTransient: false,
  isSolid: true,
  decayRate: 0,
  hostility: 0.3,  // Sharp edges, blindingly bright
  harvestable: [
    { id: 'diamond_shard', name: 'Diamond Shard' },
    { id: 'diamond_dust', name: 'Diamond Dust' },
  ],
  aestheticDescription: 'Brilliant facets, rainbow refraction, unbreakable hardness, blinding light',
};

const SAND_MATERIAL: SurrealMaterial = {
  id: 'sand',
  name: 'Flowing Sand',
  isLiving: false,
  isEdible: false,
  isTransient: true,  // Shifts and erodes
  isSolid: false,  // Granular, unstable
  decayRate: 0.3,  // Constant erosion
  hostility: 0.1,  // Sandstorms, suffocation
  transmutation: 'collapses without support, blown away by wind',
  aestheticDescription: 'Golden dunes, shifting textures, granular surfaces, wind-carved patterns',
};

const WATER_MATERIAL: SurrealMaterial = {
  id: 'water',
  name: 'Frozen Water',
  isLiving: false,
  isEdible: true,
  isTransient: true,
  isSolid: false,  // Fluid but can be shaped
  requiresCold: true,
  decayRate: 0.5,  // Evaporates quickly
  hostility: 0.1,  // Drowning risk
  transmutation: 'evaporates in heat, flows without containment',
  aestheticDescription: 'Liquid walls, flowing surfaces, reflective ripples, constant motion',
};

const FIRE_MATERIAL: SurrealMaterial = {
  id: 'fire',
  name: 'Eternal Flame',
  isLiving: true,  // Fire "lives"
  isEdible: false,
  isTransient: true,
  isSolid: false,
  requiresHeat: true,  // Needs fuel/heat
  decayRate: 0.6,  // Burns out fast
  hostility: 0.9,  // Extremely dangerous
  transmutation: 'extinguishes without fuel, spreads uncontrollably',
  aestheticDescription: 'Living flames, crackling sounds, orange-red glow, intense heat, smoke',
};

const SMOKE_MATERIAL: SurrealMaterial = {
  id: 'smoke',
  name: 'Solidified Smoke',
  isLiving: false,
  isEdible: false,
  isTransient: true,
  isSolid: false,
  decayRate: 0.4,
  hostility: 0.3,  // Suffocation
  transmutation: 'disperses in wind, condenses in calm',
  aestheticDescription: 'Gray wisps, swirling patterns, semi-tangible, acrid smell',
};

const CLAY_MATERIAL: SurrealMaterial = {
  id: 'clay',
  name: 'Living Clay',
  isLiving: true,  // Can be molded, reshaped
  isEdible: false,
  isTransient: false,
  isSolid: true,
  decayRate: 0.05,  // Slow erosion
  hostility: 0,
  aestheticDescription: 'Malleable terracotta, hand-molded surfaces, organic shapes, earthy colors',
};

const RUST_MATERIAL: SurrealMaterial = {
  id: 'rust',
  name: 'Oxidized Metal',
  isLiving: false,
  isEdible: false,
  isTransient: true,
  isSolid: true,
  decayRate: 0.15,  // Continues rusting
  hostility: 0.2,  // Tetanus, collapse
  aestheticDescription: 'Orange-brown corrosion, flaking surfaces, metallic decay, industrial rot',
};

const SILK_MATERIAL: SurrealMaterial = {
  id: 'silk',
  name: 'Woven Silk',
  isLiving: false,
  isEdible: false,
  isTransient: true,
  isSolid: true,
  decayRate: 0.08,
  hostility: 0,
  aestheticDescription: 'Shimmering fabric, flowing drapes, soft textures, delicate strength',
};

const AMBER_MATERIAL: SurrealMaterial = {
  id: 'amber',
  name: 'Fossilized Resin',
  isLiving: false,
  isEdible: false,
  isTransient: false,
  isSolid: true,
  decayRate: 0,
  hostility: 0,
  aestheticDescription: 'Golden-orange translucence, preserved insects, warm glow, ancient feel',
};

const SALT_MATERIAL: SurrealMaterial = {
  id: 'salt',
  name: 'Crystalline Salt',
  isLiving: false,
  isEdible: true,
  isTransient: true,  // Dissolves in water
  isSolid: true,
  decayRate: 0.1,
  hostility: 0.2,  // Corrosive, desiccating
  transmutation: 'dissolves in rain, corrodes metal',
  aestheticDescription: 'White crystals, cubic formations, preserving properties, sharp taste',
};

const WAX_MATERIAL: SurrealMaterial = {
  id: 'wax',
  name: 'Beeswax',
  isLiving: false,
  isEdible: false,
  isTransient: true,
  isSolid: true,
  requiresCold: true,  // Melts in heat
  decayRate: 0.05,
  hostility: 0,
  transmutation: 'melts into liquid, hardens when cool',
  aestheticDescription: 'Honeycomb patterns, yellow-white color, waxy smell, smooth surfaces',
};

const COAL_MATERIAL: SurrealMaterial = {
  id: 'coal',
  name: 'Compressed Coal',
  isLiving: false,
  isEdible: false,
  isTransient: false,
  isSolid: true,
  decayRate: 0,
  hostility: 0.1,  // Combustible
  aestheticDescription: 'Black carbon, shiny surfaces, fuel potential, sooty residue',
};

const FUNGUS_MATERIAL: SurrealMaterial = {
  id: 'fungus',
  name: 'Giant Mushroom',
  isLiving: true,
  isEdible: true,  // Some are edible
  isTransient: false,
  isSolid: true,
  requiresDark: true,  // Mushrooms prefer darkness
  decayRate: 0.03,
  hostility: 0.4,  // Toxic spores, poisonous varieties
  aestheticDescription: 'Spongy caps, mycelium networks, bioluminescent glow, earthy smell',
};

const POISON_MATERIAL: SurrealMaterial = {
  id: 'poison',
  name: 'Crystallized Toxin',
  isLiving: false,
  isEdible: false,
  isTransient: false,
  isSolid: true,
  decayRate: 0,
  hostility: 0.95,  // Extremely dangerous
  aestheticDescription: 'Sickly green crystals, noxious fumes, deadly to touch, warning colors',
};

const PORCELAIN_MATERIAL: SurrealMaterial = {
  id: 'porcelain',
  name: 'Delicate Porcelain',
  isLiving: false,
  isEdible: false,
  isTransient: false,
  isSolid: true,
  decayRate: 0,
  hostility: 0.4,  // Extremely fragile
  aestheticDescription: 'White glazed surfaces, hand-painted patterns, delicate strength, shatters easily',
};
```

### 11.11 Material Combination System

Procedurally generate cities from 2-3 random materials with emergent properties:

```typescript
export interface MaterialCombination {
  materials: SurrealMaterial[];
  blendingStrategy: BlendingStrategy;

  // Emergent properties from combination
  synergies: MaterialSynergy[];
  conflicts: MaterialConflict[];

  // Result
  combinedName: string;
  combinedDescription: string;
  uniqueFeatures: UniqueFeature[];
}

export type BlendingStrategy =
  | 'layered'           // One material coating another
  | 'intermingled'      // Mixed throughout
  | 'district_separated' // Different districts use different materials
  | 'nested'            // One inside the other
  | 'gradient'          // Gradual transition
  | 'mosaic'            // Patchwork pattern
  | 'veined'            // One material runs through another
  | 'hybrid_buildings'; // Each building uses both

export interface MaterialSynergy {
  effect: string;
  strength: 'weak' | 'moderate' | 'powerful' | 'transformative';

  // Examples:
  // - flesh + metal = cyborg organs
  // - candy + sand = sugar-crystal dunes
  // - shadow + glass = dark mirrors
  // - ice + fire = steam city
}

// Material Combination Generator
export class MaterialCombinator {
  private materials: Map<string, SurrealMaterial>;

  constructor() {
    this.materials = new Map();
    // Load all materials from compendium
    this.registerAllMaterials();
  }

  // Generate random city from 2-3 materials
  generateRandomCity(): MaterialCombination {
    const count = Math.random() > 0.7 ? 3 : 2;
    const selected = this.selectRandomMaterials(count);
    return this.combineMaterials(selected);
  }

  combineMaterials(materials: SurrealMaterial[]): MaterialCombination {
    const combination: MaterialCombination = {
      materials,
      blendingStrategy: this.chooseBlending(materials),
      synergies: this.detectSynergies(materials),
      conflicts: this.detectConflicts(materials),
      combinedName: this.generateName(materials),
      combinedDescription: this.generateDescription(materials),
      uniqueFeatures: this.generateFeatures(materials),
    };

    return combination;
  }

  // Detect emergent properties
  private detectSynergies(materials: SurrealMaterial[]): MaterialSynergy[] {
    const synergies: MaterialSynergy[] = [];

    // Check each pair
    for (let i = 0; i < materials.length; i++) {
      for (let j = i + 1; j < materials.length; j++) {
        const synergy = this.checkSynergy(materials[i], materials[j]);
        if (synergy) synergies.push(synergy);
      }
    }

    return synergies;
  }

  private checkSynergy(mat1: SurrealMaterial, mat2: SurrealMaterial): MaterialSynergy | null {
    // Pattern matching for interesting combinations

    // Living + Non-living = Hybrid life
    if (mat1.isLiving && !mat2.isLiving) {
      return {
        effect: `${mat2.name} infused with life force`,
        strength: 'powerful',
      };
    }

    // Edible + Non-edible = Weird cuisine
    if (mat1.isEdible && !mat2.isEdible) {
      return {
        effect: `Edible ${mat1.name} shaped like ${mat2.name}`,
        strength: 'moderate',
      };
    }

    // Solid + Non-solid = Phase transitions
    if (mat1.isSolid && !mat2.isSolid) {
      return {
        effect: `${mat1.name} constantly melting/reforming`,
        strength: 'powerful',
      };
    }

    // Opposite temperature requirements = Steam/conflict
    if (mat1.requiresHeat && mat2.requiresCold) {
      return {
        effect: 'Constant steam generation, unstable temperature zones',
        strength: 'transformative',
      };
    }

    // Light + Dark requirements = Twilight
    if (mat1.requiresLight && mat2.requiresDark) {
      return {
        effect: 'Eternal twilight zone, neither material fully stable',
        strength: 'powerful',
      };
    }

    return null;
  }
}

// Example Combinations
const EXAMPLE_COMBINATIONS = {
  diamond_flesh: {
    materials: [DIAMOND_MATERIAL, FLESH_MATERIAL],
    blendingStrategy: 'veined',
    combinedName: 'Diamond-Flesh Citadel',
    combinedDescription: 'Living organs encased in crystalline diamond, pulsing with rainbow light',
    synergies: [
      {
        effect: 'Organs are indestructible but still bleed rainbow blood',
        strength: 'transformative',
      },
      {
        effect: 'Heart pumps diamond dust through veins, making inhabitants sparkle',
        strength: 'powerful',
      },
    ],
    uniqueFeatures: [
      {
        name: 'Crystalline Organs',
        description: 'Heart, lungs, brain all visible through diamond casing',
        effect: 'Residents can see their own organs working',
      },
      {
        name: 'Bleeding Light',
        description: 'When damaged, buildings bleed refracted rainbow light',
        effect: 'Wounds are beautiful and terrifying',
      },
    ],
  },

  candy_sand: {
    materials: [CANDY_MATERIAL, SAND_MATERIAL],
    blendingStrategy: 'intermingled',
    combinedName: 'Sugar Dune Oasis',
    combinedDescription: 'Candy castles built from hardened sugar-sand, constantly eroding and reforming',
    synergies: [
      {
        effect: 'Sand hardens into candy when wet with syrup',
        strength: 'powerful',
      },
      {
        effect: 'Buildings taste like rock candy with sandy crunch',
        strength: 'moderate',
      },
    ],
    conflicts: [
      {
        material1: 'candy',
        material2: 'sand',
        conflictType: 'unstable',
        effect: 'Wind erodes candy-sand faster than pure candy, constant repair needed',
      },
    ],
    uniqueFeatures: [
      {
        name: 'Edible Erosion',
        description: 'Visitors eat the walls, creating new architectural forms',
        effect: 'City shape changes based on consumption patterns',
      },
      {
        name: 'Sandstorm Sweetness',
        description: 'Sandstorms taste like cotton candy, coat everything in sugar',
        effect: 'After storms, city is reglazed with fresh candy coating',
      },
    ],
  },

  metal_bone: {
    materials: [METAL_MATERIAL, BONE_MATERIAL],
    blendingStrategy: 'hybrid_buildings',
    combinedName: 'Cyborg Necropolis',
    combinedDescription: 'Ancient skeletons augmented with steel plating and mechanical joints',
    synergies: [
      {
        effect: 'Bone provides organic structure, metal adds strength',
        strength: 'powerful',
      },
      {
        effect: 'Mechanical skeletons can move and reconfigure',
        strength: 'transformative',
      },
    ],
    uniqueFeatures: [
      {
        name: 'Walking Buildings',
        description: 'Bone-metal skeletons can stand up and relocate',
        effect: 'City layout changes over time',
      },
      {
        name: 'Marrow Forges',
        description: 'Bone marrow used as fuel for metalworking',
        effect: 'Self-sustaining industrial cycle',
      },
    ],
  },

  shadow_glass: {
    materials: [SHADOW_MATERIAL, GLASS_MATERIAL],
    blendingStrategy: 'layered',
    combinedName: 'Dark Mirror Labyrinth',
    combinedDescription: 'Glass structures filled with trapped shadows, creating dark reflections',
    synergies: [
      {
        effect: 'Shadows trapped inside glass become permanent',
        strength: 'powerful',
      },
      {
        effect: 'Glass reflects inverted shadow-world',
        strength: 'transformative',
      },
    ],
    uniqueFeatures: [
      {
        name: 'Mirror Paradox',
        description: 'Reflections show shadow-realm, not real world',
        effect: 'Inhabitants see their shadow-selves in mirrors',
      },
      {
        name: 'Shatter Release',
        description: 'Breaking glass releases trapped shadows',
        effect: 'Combat involves shattering to free darkness',
      },
    ],
  },

  ice_fire: {
    materials: [ICE_MATERIAL, FIRE_MATERIAL],
    blendingStrategy: 'district_separated',
    combinedName: 'Eternal Steam Metropolis',
    combinedDescription: 'Ice district and fire district constantly producing steam boundary',
    synergies: [
      {
        effect: 'Eternal steam generation powers machinery',
        strength: 'transformative',
      },
      {
        effect: 'Neither material can fully exist, creating dynamic balance',
        strength: 'powerful',
      },
    ],
    conflicts: [
      {
        material1: 'ice',
        material2: 'fire',
        conflictType: 'destructive',
        effect: 'Constant melting vs. constant burning, creates perpetual steam',
      },
    ],
    uniqueFeatures: [
      {
        name: 'Steam Barrier',
        description: 'Thick steam wall between fire and ice districts',
        effect: 'Cannot cross without steam-proof gear',
      },
      {
        name: 'Temperature Gradient',
        description: 'From frozen wasteland to burning inferno across city',
        effect: 'Different species adapted to each zone',
      },
    ],
  },

  paper_water: {
    materials: [PAPER_MATERIAL, WATER_MATERIAL],
    blendingStrategy: 'mosaic',
    combinedName: 'Soggy Manuscript City',
    combinedDescription: 'Paper buildings constantly wet, words running and reforming',
    conflicts: [
      {
        material1: 'paper',
        material2: 'water',
        conflictType: 'destructive',
        effect: 'Water dissolves paper unless magically treated',
      },
    ],
    synergies: [
      {
        effect: 'Wet paper becomes malleable, can be reshaped',
        strength: 'moderate',
      },
      {
        effect: 'Words written on wet paper flow into water, become liquid text',
        strength: 'powerful',
      },
    ],
    uniqueFeatures: [
      {
        name: 'Flowing Literature',
        description: 'Text flows off pages into water streams',
        effect: 'Rivers contain readable stories',
      },
      {
        name: 'Pulp Architecture',
        description: 'Buildings constantly dissolving and being reformed',
        effect: 'City shape changes like origami',
      },
    ],
  },

  fungus_diamond: {
    materials: [FUNGUS_MATERIAL, DIAMOND_MATERIAL],
    blendingStrategy: 'veined',
    combinedName: 'Crystalline Mycelium Network',
    combinedDescription: 'Giant mushrooms with diamond caps, mycelium veined with crystals',
    synergies: [
      {
        effect: 'Fungus grows around diamonds, creating living jewelry',
        strength: 'powerful',
      },
      {
        effect: 'Spores crystallize in air, rain down as diamond dust',
        strength: 'transformative',
      },
    ],
    uniqueFeatures: [
      {
        name: 'Gem Harvest',
        description: 'Mushroom caps shed diamond scales',
        effect: 'Valuable but requires dealing with toxic spores',
      },
      {
        name: 'Bioluminescent Facets',
        description: 'Glowing mushrooms refract through diamonds',
        effect: 'City sparkles with eerie light',
      },
    ],
  },

  poison_candy: {
    materials: [POISON_MATERIAL, CANDY_MATERIAL],
    blendingStrategy: 'intermingled',
    combinedName: 'Toxic Sweetness',
    combinedDescription: 'Delicious-looking candy that is actually crystallized poison',
    conflicts: [
      {
        material1: 'poison',
        material2: 'candy',
        conflictType: 'synergistic',  // Horrifyingly effective combination
        effect: 'Looks edible, tastes sweet, kills you',
      },
    ],
    uniqueFeatures: [
      {
        name: 'Deceptive Deliciousness',
        description: 'Poison tastes like finest candy',
        effect: 'Visitors accidentally poison themselves',
      },
      {
        name: 'Toxic Vermin',
        description: 'Ants and rats eating the city become poisonous',
        effect: 'Pest control becomes hazardous',
      },
    ],
  },

  smoke_silk: {
    materials: [SMOKE_MATERIAL, SILK_MATERIAL],
    blendingStrategy: 'layered',
    combinedName: 'Woven Fog Pavilion',
    combinedDescription: 'Silk fabric woven from solidified smoke, flows like fog',
    synergies: [
      {
        effect: 'Smoke trapped in silk weave becomes permanent',
        strength: 'powerful',
      },
      {
        effect: 'Fabric billows and flows like smoke',
        strength: 'moderate',
      },
    ],
    uniqueFeatures: [
      {
        name: 'Ephemeral Architecture',
        description: 'Buildings made of flowing smoke-silk',
        effect: 'Walls ripple and wave in breeze',
      },
      {
        name: 'Suffocation Hazard',
        description: 'Too much smoke-silk in one place depletes oxygen',
        effect: 'Need ventilation systems',
      },
    ],
  },
};
```

### 11.12 Procedural Combination Table

Quick reference for material interaction patterns:

```typescript
export const MATERIAL_INTERACTION_PATTERNS = {
  // Pattern: Two living materials
  living_living: {
    examples: ['flesh + fungus', 'wood + coral', 'clay + flesh'],
    effect: 'Symbiotic or parasitic relationship, hybrid organism',
    aesthetics: 'Two life forms merged into one',
  },

  // Pattern: Living + dead/inert
  living_dead: {
    examples: ['flesh + bone', 'wood + stone', 'fungus + metal'],
    effect: 'Life infusing death, organic over inorganic',
    aesthetics: 'Creeping life overtaking static structure',
  },

  // Pattern: Solid + fluid
  solid_fluid: {
    examples: ['stone + water', 'metal + fire', 'glass + smoke'],
    effect: 'Containment or erosion, shape vs. formlessness',
    aesthetics: 'One material trying to hold/escape the other',
  },

  // Pattern: Precious + mundane
  precious_mundane: {
    examples: ['diamond + dirt', 'gold + rust', 'crystal + clay'],
    effect: 'Value contrast, beauty in decay',
    aesthetics: 'Luxury corrupted or enhanced by common materials',
  },

  // Pattern: Edible + toxic
  edible_toxic: {
    examples: ['candy + poison', 'flesh + acid', 'food + rust'],
    effect: 'Deceptive danger, forbidden consumption',
    aesthetics: 'Appetizing but deadly',
  },

  // Pattern: Transparent + opaque
  transparent_opaque: {
    examples: ['glass + shadow', 'ice + smoke', 'crystal + stone'],
    effect: 'Visibility vs. concealment',
    aesthetics: 'See-through structures hiding darkness',
  },

  // Pattern: Opposite temperatures
  hot_cold: {
    examples: ['fire + ice', 'metal + frost', 'lava + water'],
    effect: 'Perpetual transformation, steam generation',
    aesthetics: 'Constant state change, energy release',
  },

  // Pattern: Fragile + durable
  fragile_durable: {
    examples: ['glass + diamond', 'paper + stone', 'silk + metal'],
    effect: 'Protection or ironic vulnerability',
    aesthetics: 'Delicate beauty protected by strength',
  },
};

// Random combination generator
export function generateRandomMaterialCity(): MaterialCombination {
  const allMaterials = [
    FLESH_MATERIAL, CANDY_MATERIAL, SHADOW_MATERIAL, GLASS_MATERIAL,
    PAPER_MATERIAL, CRYSTAL_MATERIAL, BONE_MATERIAL, ICE_MATERIAL,
    CLOCKWORK_MATERIAL, DREAM_MATERIAL, SOUND_MATERIAL, MEMORY_MATERIAL,
    CORAL_MATERIAL, STONE_MATERIAL, WOOD_MATERIAL, METAL_MATERIAL,
    DIAMOND_MATERIAL, SAND_MATERIAL, WATER_MATERIAL, FIRE_MATERIAL,
    SMOKE_MATERIAL, CLAY_MATERIAL, RUST_MATERIAL, SILK_MATERIAL,
    AMBER_MATERIAL, SALT_MATERIAL, WAX_MATERIAL, COAL_MATERIAL,
    FUNGUS_MATERIAL, POISON_MATERIAL, PORCELAIN_MATERIAL,
  ];

  // Select 2-3 random materials
  const count = Math.random() > 0.7 ? 3 : 2;
  const selected: SurrealMaterial[] = [];

  for (let i = 0; i < count; i++) {
    const remaining = allMaterials.filter(m => !selected.includes(m));
    const random = remaining[Math.floor(Math.random() * remaining.length)];
    selected.push(random);
  }

  const combinator = new MaterialCombinator();
  return combinator.combineMaterials(selected);
}

// Total material count: 31 unique materials
// Possible 2-material combinations: 465
// Possible 3-material combinations: 4,495
// Total possible combinations: ~5,000 unique cities
```

### 11.13 Building the Surreal: Generation Algorithm

```typescript
export interface SurrealCityGenerator {
  // Step 1: Choose material(s) - now from compendium
  selectMaterial(params: GenerationParams): SurrealMaterial | SurrealMaterial[];

  // Step 2: Establish environmental requirements
  createEnvironment(material: SurrealMaterial): CityEnvironment;

  // Step 3: Generate core buildings
  generateCoreBuildings(material: SurrealMaterial): Building[];

  // Step 4: Create districts
  layoutDistricts(material: SurrealMaterial, buildings: Building[]): District[];

  // Step 5: Add hazards and maintenance systems
  addHazardSystems(city: City): HazardSystem;

  // Step 6: Integrate with mancer societies
  integrateManc ers(city: City): MancerSociety[];
}

// Example: Generate a Flesh City
function generateFleshCity(params: GenerationParams): City {
  const city = new City();

  // 1. Material
  city.primaryMaterial = FLESH_MATERIAL;

  // 2. Environment
  city.environment = {
    temperature: 98.6,  // Human body temp
    humidity: 0.7,      // Moist
    lighting: 'dim',    // Inside a body
  };

  // 3. Core buildings (like organs)
  city.buildings.push(
    createBuilding('heart_chamber', { x: 0, y: 0 }),
    createBuilding('lung_spires', { x: -10, y: 5 }),
    createBuilding('lung_spires', { x: 10, y: 5 }),
    createBuilding('brain_tower', { x: 0, y: 15 }),
    createBuilding('digestive_pit', { x: 0, y: -10 }),
  );

  // 4. Districts (like body systems)
  city.districts = [
    { type: 'organ_quarter', center: { x: 0, y: 0 }, radius: 20 },
    { type: 'skeletal_sector', center: { x: 30, y: 0 }, radius: 15 },
    { type: 'vascular_network', spans: 'entire_city' },
  ];

  // 5. Hazards
  city.hazards = {
    infections: [],
    hungerLevel: 50,
    healthLevel: 100,
  };

  // 6. Compatible mancers
  city.residentMancers = ['somnomancers', 'onomancers'];

  return city;
}
```

---

## 12. Integration with Existing Building System

### 6.1 Extending BuildingComponent

```typescript
// Current BuildingComponent needs these additions:

export interface BuildingComponent extends ComponentBase {
  readonly type: 'building';

  // EXISTING FIELDS
  buildingType: BuildingType;
  constructionProgress: number;
  // ...

  // NEW FIELDS FOR MULTI-TILE
  footprint?: BuildingFootprint;  // For multi-tile buildings
  anchorPosition: Position;  // Main tile
  occupiedPositions?: Position[];  // All tiles this building uses

  // NEW FIELDS FOR INTERIOR
  floors?: FloorPlan[];  // Optional detailed interior
  currentFloor?: number;  // For multi-story navigation

  // NEW FIELDS FOR CULTURE
  culturalStyle?: string;  // Which architecture paradigm
  districtId?: string;  // Which district this belongs to

  // NEW FIELDS FOR SPECIAL BUILDINGS
  narrativeState?: 'setup' | 'rising' | 'climax' | 'falling' | 'resolution';
  impossibleGeometry?: ImpossibleGeometry;

  // NEW FIELDS FOR EFFECTS
  buildingEffects?: BuildingEffect[];  // Auras, zones, etc.
}

export interface BuildingEffect {
  type: string;
  radius: number;
  strength: number;
  affectedAgents?: string[];  // IDs of affected agents
}
```

### 6.2 New Building Types Needed

```typescript
// Add to existing BuildingType enum:

export enum BuildingType {
  // ... existing types

  // Mancer-specific
  BIBLIOMANCER_LIBRARY = 'bibliomancer_library',
  ONOMANCER_VAULT = 'onomancer_vault',
  SOMNOMANCER_DORMITORY = 'somnomancer_dormitory',
  CHROMOMANCER_STUDIO = 'chromomancer_studio',
  CARTOMANCER_PLANNING_OFFICE = 'cartomancer_planning_office',
  HOROLOMANCER_CLOCK_TOWER = 'horolomancer_clock_tower',
  AUDIOMANCER_CONCERT_HALL = 'audiomancer_concert_hall',
  MNEMONIMANCER_ARCHIVE = 'mnemonimancer_archive',
  UMBRAMANCER_SHADOW_REPOSITORY = 'umbramancer_shadow_repository',
  RHETORICMANCER_DEBATE_HALL = 'rhetoricmancer_debate_hall',
  SYNTAXOMANCER_GRAMMAR_SCHOOL = 'syntaxomancer_grammar_school',
  TYPOMANCER_CHAOS_LAB = 'typomancer_chaos_lab',
  ECHOMANCER_RESONANCE_CHAMBER = 'echomancer_resonance_chamber',
  SILENTOMANCER_QUIET_TEMPLE = 'silentomancer_quiet_temple',

  // Gastromancer buildings
  GREAT_KITCHEN = 'great_kitchen',
  CULINARY_ACADEMY = 'culinary_academy',
  SPICE_MARKET = 'spice_market',
  TASTE_FOUNTAIN = 'taste_fountain',

  // Narrative buildings
  TRAGEDY_TOWER = 'tragedy_tower',
  COMEDY_COTTAGE = 'comedy_cottage',
  MYSTERY_MANSION = 'mystery_mansion',

  // Multi-tile residential
  APARTMENT_BUILDING = 'apartment_building',
  PUEBLO = 'pueblo',
  TENEMENT = 'tenement',
  VILLA = 'villa',
}
```

---

## Dependencies & Integration

### Depends On (Prerequisites)
These systems must be implemented before this spec:
- **Building System** - Foundation for building entities and placement mechanics
- **Multi-tile Building Support** - Ability to have buildings span multiple tiles
- **Settlement System** - Basic settlement creation and management

### Integrates With (Parallel Systems)
These systems work alongside this spec:
- **Cultural Systems** - Defines architectural paradigms based on culture traits
- **Magic System** - Enables impossible geometry and magical architectural effects

### Enables (Dependent Systems)
These systems build on top of this spec:
- **Dimensional Ascension** - Cities in created universes with custom physics and architecture
- **Procedural Civilizations** - Entire cultures with unique architectural traditions
- **Settlement Evolution** - Cities that grow and change based on population needs

---

## 7. Implementation Checklist

### Phase 1: Multi-Tile Building Support
- [ ] Define `BuildingFootprint` type with `width`, `height`, `occupiedTiles` coordinates
- [ ] Add `footprint: BuildingFootprint` field to BuildingComponent
- [ ] Add `occupiedTiles: Position[]` to track all tiles used by building
- [ ] Update BuildingSystem placement logic to check all tiles in footprint
- [ ] Implement `canPlaceBuilding()` function checking all footprint tiles
- [ ] Add collision detection for multi-tile buildings
- [ ] Update building removal to clear all occupied tiles
- [ ] Add tile ownership tracking (which building owns which tile)
- [ ] Implement anchor point system (which tile is "main" tile)
- [ ] Update pathfinding to route around multi-tile obstacles
- [ ] Add visual rendering for large building sprites
- [ ] Create building placement preview showing full footprint
- [ ] Write unit tests for footprint calculations
- [ ] Write integration tests for multi-tile placement

**Dependencies:** Understanding of existing BuildingSystem

**Integration Points:**
- Existing BuildingComponent and BuildingSystem
- Tile/grid system for occupancy tracking
- Pathfinding systems for obstacle avoidance
- Renderer for multi-tile sprite rendering

**Testing Requirements:**
- Unit test: 2x2 pueblo generates correct 4-tile footprint
- Unit test: Cannot place building if any footprint tile is occupied
- Integration test: Place 3x3 building, verify all 9 tiles occupied
- Integration test: Agents path around multi-tile buildings correctly

---

### Phase 2: Interior Layouts
- [ ] Define `Room` interface with `name`, `dimensions`, `purpose`, `connections`
- [ ] Define `FloorPlan` interface with `floors`, `rooms[]`, `stairs`, `layout`
- [ ] Add `interiorLayout: FloorPlan` to BuildingComponent
- [ ] Implement room generation algorithms (rectangular subdivision)
- [ ] Add room purpose assignment (bedroom, kitchen, workshop, etc.)
- [ ] Create hallway/corridor generation between rooms
- [ ] Implement staircase placement for multi-floor buildings
- [ ] Add room navigation data structure (adjacency graph)
- [ ] Create `InteriorNavigationSystem` for multi-floor pathfinding
- [ ] Implement enter/exit building transitions
- [ ] Add room-to-room movement logic
- [ ] Implement floor-to-floor navigation via stairs
- [ ] Create interior rendering (room visualization)
- [ ] Add room furniture placement system
- [ ] Write unit tests for room generation
- [ ] Write integration tests for multi-floor navigation

**Dependencies:** Phase 1 (multi-tile buildings)

**Integration Points:**
- Existing pathfinding for interior navigation
- BuildingComponent for interior data storage
- Renderer for interior visualization
- Agent movement systems for room transitions

**Testing Requirements:**
- Unit test: 3-floor tower generates rooms on all floors
- Unit test: All rooms connected via hallways or doors
- Integration test: Agent enters building, navigates to 3rd floor room
- Integration test: Staircase placement doesn't block room access

---

### Phase 3: Architectural Paradigms
- [ ] Define `ArchitecturalParadigm` interface with `style`, `materials`, `colors`, `rules`
- [ ] Create Gastromancer paradigm (kitchen-centric, warm colors, food motifs)
- [ ] Create Bibliomancer paradigm (library-style, books everywhere, scholarly)
- [ ] Create Onomancer paradigm (name-inscribed, crystal structures, glowing runes)
- [ ] Create Somnomancer paradigm (dreamlike, soft edges, floating elements)
- [ ] Create Chromomancer paradigm (color-coded, vibrant, rainbow patterns)
- [ ] Create Cartomancer paradigm (map-themed, geometric precision)
- [ ] Create Horolomancer paradigm (clock towers, gears, temporal aesthetics)
- [ ] Create Umbramancer paradigm (dark, shadowy, minimal light)
- [ ] Add paradigm-specific building generation rules
- [ ] Implement material selection based on paradigm
- [ ] Add color palette application per paradigm
- [ ] Create architectural detail generation (ornaments, decorations)
- [ ] Implement paradigm visual rendering
- [ ] Add paradigm mixing for multi-cultural cities
- [ ] Write unit tests for each paradigm
- [ ] Write integration tests for paradigm generation

**Dependencies:** Phase 1 (multi-tile foundation)

**Integration Points:**
- BuildingComponent for paradigm storage
- Material/resource systems for building materials
- Renderer for paradigm-specific visuals
- Cultural/mancer society definitions

**Testing Requirements:**
- Unit test: Gastromancer building uses warm colors and kitchen features
- Unit test: Horolomancer building includes clock motifs and gears
- Integration test: Generate 10 buildings per paradigm, verify visual distinction
- Integration test: Mixed-paradigm city has coherent aesthetic per district

---

### Phase 4: District System
- [ ] Define `District` interface with `type`, `bounds`, `culturalFocus`, `effects`
- [ ] Define `DistrictType` enum (residential, commercial, industrial, cultural, etc.)
- [ ] Add district boundary representation (polygon or tile set)
- [ ] Create `DistrictComponent` for district entities
- [ ] Implement district effect auras (mood, productivity, magic power)
- [ ] Add district-specific building restrictions
- [ ] Create district placement algorithm (Voronoi-based or grid-based)
- [ ] Implement road network generation within districts
- [ ] Add district-to-district road connections
- [ ] Create district center/landmark placement
- [ ] Implement district population density calculations
- [ ] Add district cultural identity (dominant mancer type)
- [ ] Create cross-district effects and interactions
- [ ] Implement district growth/evolution system
- [ ] Add visual district boundaries rendering
- [ ] Write unit tests for district algorithms
- [ ] Write integration tests for multi-district cities

**Dependencies:** Phase 3 (architectural paradigms)

**Integration Points:**
- World spatial partitioning systems
- BuildingSystem for district building placement
- Effect/aura systems for district effects
- Road/path generation systems

**Testing Requirements:**
- Unit test: District boundaries don't overlap
- Unit test: Road network connects all district centers
- Integration test: Create city with 3 districts, verify distinct identities
- Integration test: District aura effects apply correctly to buildings/agents

---

### Phase 5: City Generation
- [ ] Define `CityGenerationParameters` with `size`, `culturalMix`, `districts`, `density`
- [ ] Create city generation algorithm (top-down placement)
- [ ] Implement district layout generation (Voronoi or radial)
- [ ] Add cultural proportion system (70% Gastromancer, 30% Bibliomancer, etc.)
- [ ] Create district sizing algorithm based on population needs
- [ ] Implement building placement within districts (respecting paradigm)
- [ ] Add building density variation (dense downtown, sparse suburbs)
- [ ] Create city landmark placement (central plaza, monuments, etc.)
- [ ] Implement city wall/boundary generation
- [ ] Add city-wide road network (main streets, alleys)
- [ ] Create city center identification and embellishment
- [ ] Implement city-wide effects (government type, laws, economy)
- [ ] Add procedural city name generation
- [ ] Create city growth simulation (optional)
- [ ] Implement city save/load functionality
- [ ] Write unit tests for generation algorithms
- [ ] Write integration tests for complete city generation

**Dependencies:** Phase 4 (district system)

**Integration Points:**
- All previous building/district systems
- World generation for city placement
- Procedural generation utilities
- Economy/governance systems

**Testing Requirements:**
- Unit test: City generation produces valid district layout
- Unit test: Building counts match population parameters
- Integration test: Generate Gastromancer city, verify 80%+ food-related buildings
- Integration test: Generate 100-building city, verify all buildings accessible

---

### Phase 6: Special Buildings
- [ ] Define `ImpossibleGeometryComponent` with type `'impossible_geometry'`
- [ ] Add `geometryType` enum (TARDIS, Escher, fractal, non-Euclidean)
- [ ] Add `interiorMultiplier` for TARDIS buildings (bigger on inside)
- [ ] Implement TARDIS interior generation (10x exterior size)
- [ ] Create Escher staircase generation (infinite loops, impossible connections)
- [ ] Implement fractal chamber generation (rooms contain smaller versions)
- [ ] Add non-Euclidean corridor generation (parallel lines meet)
- [ ] Create impossible geometry navigation rules
- [ ] Implement narrative building structure (from Literary Surrealism spec)
- [ ] Add tragedy tower progression system
- [ ] Add comedy cottage interaction mechanics
- [ ] Add mystery mansion clue system
- [ ] Create special building entrance requirements (quests, items, etc.)
- [ ] Add special building effects on occupants
- [ ] Implement special building visual rendering
- [ ] Write unit tests for each special building type
- [ ] Write integration tests for impossible geometry navigation

**Dependencies:** Phase 2 (interior layouts), Phase 3 (architectural paradigms)

**Integration Points:**
- InteriorNavigationSystem for impossible geometry
- NarrativeStructureComponent from Literary Surrealism spec
- Renderer for special visual effects
- Quest/objective systems for narrative buildings

**Testing Requirements:**
- Unit test: TARDIS building interior area > 10x exterior footprint
- Unit test: Escher staircase creates valid navigation loop
- Integration test: Walk through fractal chamber, verify recursive generation
- Integration test: Complete tragedy tower narrative progression

---

### Phase 7: Integration & Polish
- [ ] Integrate city generation with existing SettlementSystem
- [ ] Add city generation option to universe creation
- [ ] Implement performance optimization for large cities (spatial partitioning)
- [ ] Add level-of-detail (LOD) system for distant buildings
- [ ] Optimize pathfinding for 100+ building cities
- [ ] Add building serialization for save/load
- [ ] Add district serialization for save/load
- [ ] Test save/load with complex multi-district cities
- [ ] Create UI panel for city management
- [ ] Add city overview map rendering
- [ ] Implement building inspection UI
- [ ] Add district statistics display
- [ ] Create city builder mode (optional creative mode)
- [ ] Add city generation presets (small village, large metropolis, etc.)
- [ ] Perform full integration testing with all game systems
- [ ] Optimize rendering for cities with 500+ buildings
- [ ] Write comprehensive end-to-end tests

**Dependencies:** All previous phases

**Integration Points:**
- Existing SettlementSystem
- SaveLoadService for persistence
- UI/renderer systems for city management
- Performance profiling and optimization

**Testing Requirements:**
- Integration test: Generate city, save, load, verify identical state
- Performance test: 500-building city maintains 30+ FPS
- Integration test: City generation works in new game creation flow
- Integration test: All city features work with existing gameplay systems

---

## Research Questions

- **Procedural Generation:** Which algorithm produces the most realistic city layouts? Test Voronoi, radial, organic growth, and grid-based approaches
- **District Sizing:** How to dynamically size districts based on population needs? Use population density targets or fixed size ranges?
- **Road Networks:** Should roads follow terrain (realistic) or ignore it (gameplay)? Performance implications?
- **Building Density:** How to prevent cities feeling too sparse or too crowded? Define optimal buildings per tile ratio
- **Interior Generation:** Performance impact of full interior layouts vs simplified room abstractions? Profile both approaches
- **Impossible Geometry:** How to render non-Euclidean spaces in 2D/isometric view? Use shader effects or perspective tricks?
- **Cultural Mixing:** How to handle district borders between different cultures? Sharp boundaries or gradual transitions?
- **Save File Size:** How much space do complex cities consume in save files? Consider compression or selective persistence
- **Pathfinding Scale:** Can existing pathfinding handle 1000+ room interiors? May need hierarchical pathfinding
- **Landmark Placement:** How to ensure landmarks are visually prominent and accessible? Use prominence algorithms or manual placement

---

## Performance Optimization Strategies

- **Spatial Partitioning:** Use quadtree or grid-based partitioning for building lookups
- **Culling:** Only render buildings visible on screen
- **LOD System:** Simplified rendering for distant buildings
- **Lazy Interior Generation:** Generate interiors only when entered
- **Pathfinding Caching:** Cache common paths within buildings
- **District Instancing:** Reuse similar building models within districts
- **Async Generation:** Generate cities in background thread if possible
- **Building Limits:** Cap total buildings per city (suggest 500 max for performance)

---

## Backward Compatibility Notes

- Multi-tile buildings coexist with single-tile buildings
- Existing buildings can be converted to multi-tile format (1x1 footprint)
- Cities are optional - villages/settlements still work as before
- Interior layouts optional - buildings without interiors use simple abstraction
- Save files gracefully handle missing city data (regenerate or skip)
- All new components use proper ComponentBase extension with type strings

---

## Integration with Literary Surrealism Spec

This spec complements the Literary Surrealism spec by providing:
- Physical structures for narrative buildings (tragedy towers, comedy cottages)
- District system for housing mancer cultures (Gastromancer kitchen districts, etc.)
- Interior layouts for impossible geometry (Escher libraries, fractal archives)
- Architectural paradigms that express cultural magical practices
- City generation that creates settings for surreal literary gameplay

The two specs work together to create coherent, culturally-rich, architecturally-diverse cities where surreal literary magic flourishes.

---

## 8. Summary

This spec enables:

✅ **Multi-tile buildings** - Apartments, pueblos, great halls, complex structures
✅ **Interior layouts** - Multi-floor buildings with room-by-room detail
✅ **Cultural architecture** - Buildings reflect mancer culture (kitchen cities, clock towers, shadow slums)
✅ **District system** - Cities organize into coherent neighborhoods with unique effects
✅ **Procedural generation** - Complete cities generated from cultural parameters
✅ **Narrative buildings** - Structures that follow story logic
✅ **Impossible geometry** - TARDIS buildings, Escher stairs, fractal chambers
✅ **Integration** - Works with existing building system, just extends it

All designed to support the weird literary societies from the Literary Surrealism spec while being practical and implementable.
