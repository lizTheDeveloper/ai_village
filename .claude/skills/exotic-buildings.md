# Exotic Building Generator Skill

**Purpose**: Generate buildings with arbitrary spatial dimensions (3D, 4D, 5D, 6D), furniture, multi-floor layouts, and exotic materials using the `llm-building-designer` system.

## Location

All building generation code is in:
```
custom_game_engine/tools/llm-building-designer/src/
```

## Quick Start

```typescript
import { generateExoticBuilding, visualizeAllFloors } from './custom_game_engine/tools/llm-building-designer/src/index.js';

// Generate a simple 3D house with furniture
const house = generateExoticBuilding({
  archetype: 'standard',
  material: 'wood',
  size: 'medium',
  roomCount: 3,
  features: ['beds', 'storage', 'windows'],
});

// Visualize all floors (including side views)
console.log(visualizeAllFloors(house));
```

## Tile Symbols (Furniture Support)

The system ALREADY supports furniture via tile symbols:

### Structural
- `#` = Wall (blocks movement)
- `.` = Floor (walkable)
- `D` = Door (entrance/exit)
- `W` = Window (in walls, allows light)
- ` ` = Empty (outside)

### Furniture (blocks movement but not walls)
- `B` = Bed (sleeping)
- `S` = Storage chest/crate
- `T` = Table
- `K` = Workstation/anvil/forge
- `C` = Counter/bar

### Vertical Connections
- `^` = Stairs up
- `v` = Stairs down
- `X` = Stairs both directions
- `L` = Ladder up
- `P` = Pillar

## Building a 3D House with Furniture

```typescript
import { VoxelBuildingDefinition, TILE_SYMBOLS, visualizeAllFloors } from './custom_game_engine/tools/llm-building-designer/src/index.js';

const houseWithFurniture: VoxelBuildingDefinition = {
  name: 'Cozy Cottage',
  category: 'residential',
  tier: 2,

  // Ground floor layout with furniture
  layout: [
    '######',
    '#B..S#',  // Bed (B) and Storage (S)
    'W....W',  // Windows for light
    '#T..T#',  // Tables (T)
    '#....#',
    '###D##',  // Centered door
  ],

  materials: {
    wall: 'wood',
    floor: 'wood_floor',
  },

  // Multi-floor support
  floors: [
    {
      level: 1,  // Second floor
      name: 'Bedroom',
      layout: [
        '######',
        '#B..B#',  // Two beds
        '#....#',
        '#.SS.#',  // Storage chests
        '#....#',
        '######',  // No door, accessed via stairs
      ],
      ceilingHeight: 3,
    },
  ],
};

// Visualize with side views
console.log(visualizeAllFloors(houseWithFurniture));
```

## Visualizing Side Views and Roofs

```typescript
import { visualizeCrossSection, visualizeFloor } from './custom_game_engine/tools/llm-building-designer/src/index.js';

// Show side view (cross-section) to check roof
console.log(visualizeCrossSection(houseWithFurniture, 'vertical'));

// Show each floor separately
const floors = getAllFloors(houseWithFurniture);
floors.forEach((floor, i) => {
  console.log(`\n=== Floor ${i} ===`);
  console.log(visualizeFloor(floor));
});
```

## Dimensional Buildings (4D, 5D, 6D)

### 4D Tesseract (W-Axis Slices)

A 4D building exists across multiple W-slices that you can scroll through:

```typescript
const tesseract = generateExoticBuilding({
  archetype: 'tesseract',
  material: 'crystal',
  size: 'medium',
});

// Tesseract has w_axis configuration
console.log(tesseract.dimensional?.w_axis?.layers);  // Number of W-slices
console.log(tesseract.dimensional?.w_axis?.sliceLayouts);  // Layout for each slice
```

### 5D Penteract (Phase States)

A 5D building cycles through multiple phase states:

```typescript
const penteract = generateExoticBuilding({
  archetype: 'penteract',
  material: 'starlight',
  size: 'large',
});

// Penteract has v_axis configuration
console.log(penteract.dimensional?.v_axis?.phases);  // Number of phases
console.log(penteract.dimensional?.v_axis?.phaseLayouts);  // Layout for each phase
```

### 6D Hexeract (Quantum Superposition)

A 6D building exists in multiple probability states simultaneously:

```typescript
const hexeract = generateExoticBuilding({
  archetype: 'hexeract',
  material: 'void',
  size: 'huge',
});

// Hexeract has u_axis configuration
console.log(hexeract.dimensional?.u_axis?.probabilityStates);  // Number of states
console.log(hexeract.dimensional?.u_axis?.stateWeights);  // Probability of each
console.log(hexeract.dimensional?.u_axis?.collapsed);  // Has it collapsed?
```

## Pocket Realms (Bigger Inside Than Outside)

Small exterior, massive interior (like the TARDIS):

```typescript
// Tier 5: Pocket Cabin (5x5 outside, 15x15 inside)
const pocketCabin = generateExoticBuilding({
  archetype: 'pocket_cabin',
  material: 'living_wood',
  size: 'small',
});

// Tier 6: Pocket Manor (9x7 outside, 35x35 inside)
const pocketManor = generateExoticBuilding({
  archetype: 'pocket_manor',
  material: 'crystal',
  size: 'medium',
});

// Tier 7: Pocket Realm (5x5 outside, 100x100 inside)
const pocketRealm = generateExoticBuilding({
  archetype: 'pocket_realm',
  material: 'dreams',
  size: 'medium',
});

// Check the pocket configuration
console.log(pocketCabin.realmPocket?.exteriorSize);  // {width: 5, height: 5}
console.log(pocketCabin.realmPocket?.interiorDimensions);  // {width: 15, height: 15}
console.log(pocketCabin.realmPocket?.timeFlow);  // 'normal' | 'fast' | 'slow' etc.
```

## Universe Gates (Multiverse Portals)

Tier 8 Clarketech buildings with portals to other universes:

```typescript
const universeGate = generateExoticBuilding({
  archetype: 'universe_gate',
  material: 'starlight',
  size: 'medium',
});

// Check portal configuration
console.log(universeGate.dimensional?.multiverse?.connectedUniverses);
console.log(universeGate.dimensional?.multiverse?.portals);

// Nexus building (connects 3+ universes)
const nexus = generateExoticBuilding({
  archetype: 'nexus',
  material: 'void',
  size: 'large',
});
```

## Available Archetypes

### Standard (3D)
- `'standard'` - Normal building
- `'hive'` - Organic honeycomb structure
- `'shell'` - Nautilus-spiral design
- `'web_structure'` - Spider web architecture
- `'spire'` - Tall narrow tower
- `'stalactite'` - Hanging from above
- `'bubble'` - Spherical enclosed space

### 4D (Tier 7 Clarketech)
- `'tesseract'` - 4D cube with W-axis slices
- `'hypercube'` - Generic 4D structure
- `'klein_bottle'` - Inside-out building
- `'mobius'` - Twisted continuous space

### 5D (Tier 7 Clarketech)
- `'penteract'` - 5D hypercube with phase states

### 6D (Tier 8 Clarketech)
- `'hexeract'` - 6D hypercube with quantum superposition

### Multiverse (Tier 8 Clarketech)
- `'universe_gate'` - Portal to another universe
- `'nexus'` - Connects 3+ universes
- `'anchor_station'` - Dimensional anchor

### Pocket Realms (Tier 5-7 Clarketech)
- `'pocket_cabin'` - Small cabin → room-sized interior (Tier 5)
- `'pocket_manor'` - Small house → mansion interior (Tier 6)
- `'pocket_realm'` - Tiny structure → village-sized interior (Tier 7)
- `'infinite_room'` - Finite exterior → infinite interior (Tier 7)

## Available Materials

### Standard
- `'wood'`, `'stone'`, `'metal'`, `'glass'`, `'brick'`, `'marble'`

### Exotic Organic
- `'flesh'`, `'bone'`, `'chitin'`, `'coral'`, `'web'`, `'wax'`

### Exotic Abstract
- `'void'`, `'light'`, `'darkness'`, `'dreams'`, `'nightmares'`, `'time'`
- `'starlight'`, `'moonlight'`, `'shadow'`, `'mist'`, `'smoke'`

### Exotic Condensed
- `'solidified_mana'`, `'frozen_time'`, `'crystallized_thought'`
- `'bottled_lightning'`, `'woven_moonbeams'`

### Food (Whimsical)
- `'candy'`, `'chocolate'`, `'gingerbread'`, `'cake'`, `'cheese'`

### Fantasy Metals
- `'mithril'`, `'adamantine'`, `'orichalcum'`, `'valyrian_steel'`
- `'starmetal'`, `'moonsilver'`, `'soulsteel'`

## Validation and Analysis

```typescript
import { validateBuilding, analyzeFengShui, visualizeAnalysis } from './custom_game_engine/tools/llm-building-designer/src/index.js';

// Validate structure
const validation = validateBuilding(house);
console.log(validation.valid);
console.log(validation.errors);  // Critical issues
console.log(validation.warnings);  // Suggestions

// Feng Shui analysis
const fengShui = analyzeFengShui(house);
console.log(fengShui.harmony);  // Overall harmony score
console.log(fengShui.elementBalance);  // Fire, Water, Earth, Metal, Wood

// Full analysis with visualization
console.log(visualizeAnalysis(house));
```

## Example: Standard Building Blueprints in Exotic System

Instead of using `TileBasedBlueprintRegistry`, use the exotic system for full features:

```typescript
// OLD: TileBasedBlueprint (2D floor plan only)
const oldHouse = {
  layoutString: [
    '#####',
    '#...#',
    'W...D',
    '#...#',
    '#####',
  ],
};

// NEW: VoxelBuildingDefinition (3D with furniture, roofs, multi-floor)
const newHouse: VoxelBuildingDefinition = {
  name: 'Small House',
  category: 'residential',
  tier: 1,
  layout: [
    '#####',
    '#B.S#',  // Bed and Storage
    'W...D',  // Window and Door
    '#...#',
    '#####',
  ],
  materials: {
    wall: 'wood',
    floor: 'wood_floor',
  },
  floors: [
    {
      level: 1,
      name: 'Attic',
      layout: [
        '#####',
        '#S.S#',  // Storage attic
        '#...#',
        '#...#',
        '#####',
      ],
      ceilingHeight: 2,  // Low ceiling for attic
    },
  ],
};
```

## Checking for Roof Holes

```typescript
import { visualizeCrossSection, validateBuilding } from './custom_game_engine/tools/llm-building-designer/src/index.js';

// Side view shows roof coverage
const crossSection = visualizeCrossSection(building, 'vertical');
console.log(crossSection);

// Validation checks structural integrity
const validation = validateBuilding(building);
if (validation.warnings.some(w => w.includes('roof'))) {
  console.log('⚠️ Roof issues detected!');
}
```

## Running Examples

```bash
# Visualize all example buildings (including 4D/5D/6D)
cd custom_game_engine/tools/llm-building-designer
npx tsx src/exotic-buildings.ts

# Test multi-floor visualization
npx tsx src/multifloor-demo.ts

# Validate all buildings
npx tsx src/validate-all.ts
```

## Integration with Game

The exotic building system integrates with:
- **DimensionalParadigms** (`packages/core/src/magic/DimensionalParadigms.ts`) - 4D/5D/6D magic
- **RealmTypes** (`packages/core/src/realms/RealmTypes.ts`) - Pocket dimensions
- **PortalComponent** (`packages/core/src/components/PortalComponent.ts`) - Universe gates
- **ClarkeTech** (`architecture/AUTOMATION_LOGISTICS_SPEC.md`) - Technology tiers

## Common Tasks

### Add Furniture to Existing Building

```typescript
// Just use furniture symbols in layout
const layout = [
  '######',
  '#B..S#',  // Add B (bed) and S (storage)
  'W....W',
  '#T..T#',  // Add T (tables)
  '#....#',
  '###D##',
];
```

### Create Multi-Story Building

```typescript
const building: VoxelBuildingDefinition = {
  name: 'Tower',
  category: 'community',
  tier: 2,
  layout: [
    // Ground floor
    '####',
    'W..W',
    'W..W',
    '##D#',
  ],
  materials: { wall: 'stone', floor: 'stone_floor' },
  floors: [
    {
      level: 1,
      name: 'Second Floor',
      layout: [/* ... */],
      ceilingHeight: 3,
    },
    {
      level: 2,
      name: 'Tower Top',
      layout: [/* ... */],
      ceilingHeight: 4,  // Tall ceiling for tower top
    },
  ],
};
```

### Generate Building from Specs

```typescript
const building = generateExoticBuilding({
  archetype: 'standard',  // or 'tesseract', 'penteract', etc.
  material: 'wood',  // or 'crystal', 'void', 'starlight', etc.
  size: 'medium',  // tiny, small, medium, large, huge
  roomCount: 4,
  features: ['beds', 'storage', 'windows', 'multi-floor'],
});
```

## Summary

The exotic building generator:
- ✅ **Supports furniture** (B, S, T, K, C symbols)
- ✅ **Multi-floor buildings** (stairs, multiple levels)
- ✅ **Side views and roofs** (cross-section visualization)
- ✅ **3D, 4D, 5D, 6D buildings** (arbitrary dimensions)
- ✅ **Pocket realms** (bigger inside than outside)
- ✅ **Universe portals** (multiverse gates)
- ✅ **Validation** (checks for holes, unreachable rooms, etc.)
- ✅ **Feng Shui analysis** (spatial harmony scoring)

Use this system instead of `TileBasedBlueprintRegistry` for full building features!
