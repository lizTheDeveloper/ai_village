# City Generation Design Document

## Overview

This document outlines a procedural city generation system that leverages the existing building library (85+ buildings) and exotic-buildings module to create diverse settlement types, from organized human cities to non-Euclidean eldritch nightmares.

## Existing Infrastructure

From codebase analysis:
- **ZoneManager**: Player-designated zones (housing, industry, farming, etc.) with priority levels
- **PlacementScorer**: Multi-layer building placement with terrain, crowding, and accessibility checks
- **MapKnowledge**: Sector-based (16x16) tracking of traffic, resources, elevation
- **BuildingBlueprintRegistry**: 10 categories with dimension, cost, and tech requirements
- **LLM Building Designer**: 85+ validated buildings across species and functions

## City Archetypes

### 1. Grid Cities (Planned Human)

**Characteristics:**
- Orthogonal street grid
- Regular block sizes
- Clear functional zoning
- Efficient traffic flow

**Algorithm:**
```
1. Define city bounds and main axes
2. Create primary roads (arterials) at regular intervals
3. Subdivide into rectangular blocks
4. Assign zone types by distance from center:
   - Core: Commercial, Community
   - Ring 1: Production, Research
   - Ring 2: Residential
   - Outer: Farming, Storage
5. Place buildings within blocks respecting setbacks
```

**Street Pattern:**
```
MAIN_ROAD_SPACING = 8 sectors (128 tiles)
SECONDARY_ROAD_SPACING = 2 sectors (32 tiles)
BLOCK_SIZE = 2x2 sectors minimum
```

**Reference:** [Procedural City Generation](https://www.tmwhere.com/city_generation.html)

---

### 2. Organic Medieval Cities

**Characteristics:**
- Irregular street patterns
- Radial growth from center (castle/temple/market)
- Narrow winding streets
- Density increases toward center
- District emergence from organic clustering

**Algorithm (Voronoi-based):**
```
1. Place seed points with noise distribution
2. Generate Voronoi cells as proto-blocks
3. Merge adjacent cells based on similarity
4. Assign types from center outward:
   - Center: Temple/Castle/Market square
   - Inner ring: Wealthy residential, guild halls
   - Middle ring: Craftsmen, shops
   - Outer ring: Common housing
   - Walls: Military
   - Outside: Farms, pastures
5. Streets emerge as cell boundaries
6. Widen main streets, narrow alleys
```

**Key Features:**
- **Central Focus**: All roads lead to center
- **Walls & Gates**: Defense perimeter with limited entry points
- **Organic Blocks**: Irregular polygons, not rectangles
- **Height Variation**: Buildings taller near center

**Reference:** [Medieval Fantasy City Generator](https://watabou.itch.io/medieval-fantasy-city-generator) by Oleg Dolya

---

### 3. Fantasy Species Cities

**Per-Species Adaptations:**

#### Dwarven Cities (Underground)
```
Layout: Vertical layers connected by central shaft
Districts: Mining (deep), Forges (mid), Living (upper)
Materials: Stone, metal
Features:
  - Gravity-independent placement
  - Natural cavern integration
  - Lava forges near magma
  - Defensive chokepoints
```

#### Elven Cities (Arboreal)
```
Layout: Organic, follows terrain and trees
Districts: Blend with nature
Materials: Living wood, crystal
Features:
  - Tree-integrated structures
  - Bridges between canopy buildings
  - Ground-level vs canopy districts
  - Natural clearings as plazas
```

#### Goblin Warrens
```
Layout: Chaotic, tunneled, overlapping
Districts: None - functional clustering
Materials: Salvage, mud, stolen goods
Features:
  - Multiple entrances (escape routes)
  - Hidden passages
  - Trap zones
  - Refuse areas
```

---

### 4. Flying Creature Cities (Avian/Dragon/Angel)

**Key Design Principles:**
- **Vertical Axis Primary**: Height matters more than ground area
- **Landing Platforms**: Every structure needs approach/departure zones
- **No Ground Infrastructure**: Streets become air lanes
- **Open Structures**: Walls optional, roofs important for weather
- **Thermal Columns**: Districts align with rising air currents

**Layout Algorithm:**
```
1. Generate 3D point cloud for building locations
2. Assign altitude bands:
   - High (Elite, temples, lookouts)
   - Mid (Residential, commerce)
   - Low (Storage, ground-interface)
3. Connect via flight paths (shortest 3D routes)
4. Ensure landing zone clearance (wingspan * 2)
5. Add perching surfaces to all structures
```

**Unique Features:**
```typescript
interface FlyingCityConfig {
  altitudeBands: {
    elite: { min: 100, max: 200 },    // High spires
    residential: { min: 40, max: 100 },
    commerce: { min: 20, max: 60 },
    groundInterface: { min: 0, max: 30 },
  };
  landingPadSize: number;  // Based on largest wingspan
  flightLaneWidth: number; // Clearance between structures
  thermalColumns: Position[]; // Preferred updraft locations
  nestingLedges: boolean;
  roostingBars: boolean;
}
```

**Building Modifications for Flying Species:**
- Remove ground-level doors (or make optional)
- Add rooftop/ledge entrances
- Include perching/landing platforms
- Open-air sections (no roof, partial walls)
- Nest alcoves in walls
- Wind-sheltered sleep areas

**District Layout (Top-Down View):**
```
         [Temple Spire - Highest]
              /    \
    [Residential]  [Residential]
         |              |
    [Commerce Ring - Mid-altitude]
         |              |
    [Nesting Towers] [Watch Posts]
              \    /
      [Ground Trading Post - For non-flyers]
```

**Reference:** [Avian Urbanism](https://architecture.live/nurturing-avian-life-through-thoughtful-urbanism/)

---

### 5. Non-Euclidean Cities (R'lyeh-style)

**Lovecraftian Principles:**
- Angles that behave incorrectly (acute looks obtuse)
- Surfaces shift between concave and convex
- Spatial instability - structures change from different viewpoints
- Massive scale overwhelming human proportions
- Geometry without repeatable patterns

**Implementation Approaches:**

#### A. Portal-Based Fake Non-Euclidean
```typescript
interface NonEuclideanBlock {
  exteriorAppearance: VoxelBuildingDefinition;
  interiorReality: VoxelBuildingDefinition; // Different!
  viewpointLayouts: Map<Direction, string[]>; // Changes per angle
  portalConnections: Array<{
    from: Position;
    to: Position;  // May be in different building
    visualDistortion: 'acute_obtuse' | 'concave_convex' | 'scale_shift';
  }>;
}
```

#### B. True Hyperbolic Geometry (Advanced)
Uses principles from [HyperRogue](https://zenorogue.medium.com/h-p-lovecraft-and-non-euclidean-geometry-414aef9feac0):
- Hyperbolic tiling where parallel lines diverge
- More space exists than expected
- Triangles have angle sum < 180°
- Walking in a "straight line" curves

#### C. Phase-Shifting Districts (5D Integration)
Leverage existing penteract system:
```typescript
interface RlyehDistrict {
  phases: number; // 3-7 overlapping configurations
  currentPhase: number;
  phaseTransitionTrigger: 'observation' | 'time' | 'sanity' | 'random';
  // Each phase has different building connections
  phaseLayouts: DistrictLayout[];
}
```

**Architectural Elements:**

| Element | Normal City | R'lyeh |
|---------|-------------|--------|
| Streets | Connect buildings | Loop impossibly, dead-end into themselves |
| Blocks | Rectangular/polygonal | Shapes that tile but shouldn't |
| Buildings | Static | Shift while observed |
| Doors | Lead inside | Lead to unexpected locations |
| Windows | Show outside | Show other dimensions |
| Stairs | Go up/down | Go sideways, loop |
| Walls | Solid | Sometimes passable at wrong angles |

**Sanity Mechanics:**
```typescript
interface RlyehExposure {
  currentSanity: number;
  exposureTime: number;
  effects: {
    // As sanity decreases:
    mild: 'paths_seem_longer',
    moderate: 'buildings_shift_slightly',
    severe: 'geometry_actively_hostile',
    critical: 'trapped_in_impossible_angle',
  };
}
```

**Reference:** [Architecture of R'lyeh](https://lovecraftianscience.wordpress.com/2014/02/17/the-architecture-of-rlyeh/)

---

## Street Generation

### Road Hierarchy

```
ARTERIAL:     Width 6+ tiles, connects districts
COLLECTOR:    Width 4 tiles, connects blocks to arterials
LOCAL:        Width 2-3 tiles, within blocks
ALLEY:        Width 1 tile, service access
PLAZA:        Open space, no through traffic
```

### Generation Methods

#### 1. L-System (Parish & Müller 2001)
```
Axiom: Main road segments
Rules:
  F → FF         (extend)
  F → F[+F][-F]  (branch)
  + → turn right
  - → turn left
```

#### 2. Agent-Based
```
1. Spawn road agents at city gates/center
2. Each agent:
   - Moves forward, laying road
   - Branches with probability P
   - Connects to nearby roads
   - Dies at city boundary or after N steps
3. Post-process: remove dead ends, widen main routes
```

#### 3. Voronoi Edges
```
1. Place district centers as Voronoi seeds
2. Cell boundaries become streets
3. Widen boundaries between different zone types
4. Add internal streets within large cells
```

---

## District System

### Zone Affinities (from existing ZoneManager)

```typescript
const DISTRICT_TYPES = {
  // Core
  civic: { zones: ['community'], buildings: ['town_hall', 'temple', 'school'] },
  market: { zones: ['commercial'], buildings: ['store', 'tavern', 'trading_post'] },

  // Production
  industrial: { zones: ['industry'], buildings: ['forge', 'workshop', 'tannery'] },
  research: { zones: ['research'], buildings: ['library', 'alchemy_lab', 'observatory'] },

  // Residential
  wealthy: { zones: ['housing'], buildings: ['manor', 'elf_spire'] },
  common: { zones: ['housing'], buildings: ['cottage', 'human_house'] },
  slums: { zones: ['housing'], buildings: ['goblin_shanty', 'tent'] },

  // Support
  agricultural: { zones: ['farming'], buildings: ['barn', 'greenhouse', 'windmill'] },
  storage: { zones: ['storage'], buildings: ['warehouse', 'granary', 'silo'] },
  military: { zones: ['restricted'], buildings: ['barracks', 'armory', 'guard_post'] },
};
```

### District Placement Rules

```typescript
interface DistrictRule {
  type: string;
  preferredNeighbors: string[];   // Good adjacencies
  avoidNeighbors: string[];       // Bad adjacencies
  minDistanceFromCenter: number;
  maxDistanceFromCenter: number;
  requiresWater: boolean;
  requiresRoad: 'arterial' | 'collector' | 'any' | 'none';
}

const RULES: DistrictRule[] = [
  { type: 'civic', preferredNeighbors: ['market'], avoidNeighbors: ['industrial', 'slums'],
    minDistanceFromCenter: 0, maxDistanceFromCenter: 2, requiresWater: false, requiresRoad: 'arterial' },
  { type: 'industrial', preferredNeighbors: ['storage'], avoidNeighbors: ['wealthy', 'civic'],
    minDistanceFromCenter: 3, maxDistanceFromCenter: 8, requiresWater: true, requiresRoad: 'collector' },
  // ... etc
];
```

---

## Integration with Building Library

### Building Selection

```typescript
function selectBuildingForPlot(
  plot: PlotDefinition,
  district: DistrictType,
  species: BuilderSpecies,
  techLevel: number,
): VoxelBuildingDefinition {
  const candidates = ALL_BUILDINGS.filter(b =>
    b.category === district.buildingCategory &&
    b.species === species &&
    b.tier <= techLevel &&
    fitsInPlot(b, plot)
  );

  // Score by district affinity, variety, style consistency
  return weightedRandomSelect(candidates, scoringFunction);
}
```

### Plot Subdivision

```typescript
interface CityBlock {
  boundary: Polygon;
  zoneType: ZoneType;
  plots: Plot[];
}

function subdivideBlock(block: CityBlock): Plot[] {
  const plots: Plot[] = [];

  // Larger plots near main streets
  // Smaller plots in interior
  // Irregular subdivision for organic cities
  // Regular grid for planned cities

  return plots;
}
```

---

## City Templates

### Template: Human Trade Town
```typescript
{
  type: 'grid',
  size: 'medium',  // 8x8 sectors
  species: 'medium',
  districts: [
    { type: 'market', position: 'center', size: 1 },
    { type: 'civic', position: 'center-north', size: 1 },
    { type: 'residential', position: 'ring-1', size: 4 },
    { type: 'industrial', position: 'east', size: 2 },
    { type: 'agricultural', position: 'outer', size: 4 },
  ],
  features: ['walls', 'gates', 'main_square'],
}
```

### Template: Elven Forest City
```typescript
{
  type: 'organic',
  size: 'large',
  species: 'tall',
  districts: [
    { type: 'temple', position: 'largest_tree', size: 1 },
    { type: 'residential', position: 'canopy', size: 6 },
    { type: 'research', position: 'ancient_grove', size: 2 },
    { type: 'ground_market', position: 'clearing', size: 1 },
  ],
  features: ['tree_integration', 'bridges', 'no_walls'],
  verticalLayers: ['ground', 'understory', 'canopy', 'emergent'],
}
```

### Template: Dwarven Hold
```typescript
{
  type: 'vertical',
  size: 'huge',
  species: 'medium',
  districts: [
    { type: 'throne_hall', position: 'deep_center', size: 2 },
    { type: 'forges', position: 'magma_level', size: 4 },
    { type: 'residential', position: 'mid_levels', size: 6 },
    { type: 'farming', position: 'fungus_caves', size: 3 },
    { type: 'military', position: 'entrance', size: 2 },
  ],
  features: ['central_shaft', 'defensive_gates', 'lava_moat'],
  verticalLayers: ['surface', 'upper', 'middle', 'deep', 'abyss'],
}
```

### Template: Avian Spire City
```typescript
{
  type: 'vertical_flying',
  size: 'medium',
  species: 'flying',
  districts: [
    { type: 'temple', position: 'highest_peak', altitude: 'elite' },
    { type: 'residential', position: 'thermal_columns', altitude: 'mid' },
    { type: 'commerce', position: 'mid_ring', altitude: 'commerce' },
    { type: 'ground_trade', position: 'base', altitude: 'ground' },
  ],
  features: ['landing_platforms', 'flight_lanes', 'no_streets', 'perching_bars'],
  flightLaneWidth: 20,
  thermalLocations: ['southeast_cliff', 'central_chimney'],
}
```

### Template: R'lyeh (Non-Euclidean)
```typescript
{
  type: 'non_euclidean',
  size: 'unknowable',
  species: 'alien',
  districts: [
    { type: 'central_tomb', position: 'everywhere_and_nowhere' },
    { type: 'cyclopean_halls', position: 'phase_dependent' },
    { type: 'impossible_towers', position: 'shifts_with_observation' },
  ],
  features: [
    'acute_obtuse_angles',
    'concave_convex_surfaces',
    'portal_doors',
    'phase_shifting_blocks',
    'sanity_drain',
  ],
  clarkeTechTier: 8,
  dimensionalConfig: {
    dimension: 5,
    v_axis: { phases: 7, transitionRate: 0.05 },
    rifts: true,
  },
}
```

---

## Implementation Phases

### Phase 1: Core Framework
- CityGenerator class with template system
- Street network generation (grid + organic)
- District placement with adjacency rules
- Plot subdivision

### Phase 2: Building Integration
- Connect to building library
- Building selection by district/species/tech
- Placement validation
- Style consistency within districts

### Phase 3: Vertical Cities
- Multi-level support for dwarven/flying cities
- Altitude-based district placement
- Vertical connections (stairs, shafts, bridges)
- Landing platforms for flyers

### Phase 4: Non-Euclidean
- Portal-based impossible geometry
- Phase-shifting districts
- View-dependent layouts
- Integration with exotic-buildings tesseract/penteract

---

## Sources

- [Procedural City Generation Survey](https://www.citygen.net/files/images/Procedural_City_Generation_Survey.pdf)
- [Medieval Fantasy City Generator](https://watabou.itch.io/medieval-fantasy-city-generator) by Oleg Dolya
- [tmwhere City Generation](https://www.tmwhere.com/city_generation.html)
- [Architecture of R'lyeh](https://lovecraftianscience.wordpress.com/2014/02/17/the-architecture-of-rlyeh/)
- [HyperRogue Non-Euclidean Geometry](https://zenorogue.medium.com/h-p-lovecraft-and-non-euclidean-geometry-414aef9feac0)
- [Avian Urbanism](https://architecture.live/nurturing-avian-life-through-thoughtful-urbanism/)
- [Game Dev Indie Voronoi Approach](https://gamedevindie.com/city-procedural-generation-voronoi-approach/)
- Parish & Müller, "Procedural Modeling of Cities" (SIGGRAPH 2001)
