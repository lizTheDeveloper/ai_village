# Building Designer Package - Voxel Building System

> **For Language Models:** This README is optimized for LM understanding. Read this document completely before working with the building system to understand its architecture, interfaces, and usage patterns.

## Overview

The **Building Designer Package** (`@ai-village/building-designer`) is a standalone module for creating, validating, and managing voxel-based building designs for the AI Village game. It provides a comprehensive system for defining buildings using ASCII layouts, materials, and functionality, with support for LLM-driven generation.

**What it does:**
- Define buildings via ASCII layouts with voxel-based architecture
- Validate building designs for structural integrity and pathfinding
- Support multi-floor buildings with variable ceiling heights
- Provide species-specific height requirements (fairy → giant)
- Feng Shui analysis for spatial harmony
- Magic paradigm integration (30+ paradigms)
- Material effects system (200+ materials including exotic/magical types)
- Compositional building system (room-based assembly)
- City generation and layout planning
- LLM-optimized prompts for building generation

**Key files:**
- `src/types.ts` - Core type definitions (VoxelBuildingDefinition, materials, etc.)
- `src/validator.ts` - Structural validation and pathfinding checks
- `src/building-library.ts` - 57 pre-built buildings organized by species/category
- `src/prompts.ts` - LLM generation prompts and JSON schema
- `src/feng-shui.ts` - Spatial harmony analysis
- `src/magic-buildings.ts` - Paradigm-integrated buildings (30+ paradigms)
- `src/material-effects.ts` - Material property database (200+ materials)

---

## Package Structure

```
packages/building-designer/
├── src/
│   ├── types.ts                   # Core building schema and types
│   ├── validator.ts               # Structural validation engine
│   ├── visualizer.ts              # ASCII/floor visualization tools
│   ├── building-library.ts        # 57 buildings (fairy → giant)
│   ├── prompts.ts                 # LLM generation prompts
│   ├── feng-shui.ts               # Spatial harmony analyzer
│   ├── magic-buildings.ts         # 30+ paradigm-integrated buildings
│   ├── material-effects.ts        # 200+ material property database
│   ├── exotic-buildings.ts        # Higher-dimensional buildings
│   ├── crafting-buildings.ts      # Research-gated crafting buildings
│   ├── city-generator.ts          # City layout and district planning
│   ├── composer.ts                # Compositional module system
│   ├── room-composer.ts           # Room-based building assembly
│   ├── showcase-buildings.ts      # Example complex buildings
│   └── index.ts                   # Package exports
├── package.json
└── README.md                      # This file

Integration with Core:
packages/core/src/buildings/
├── BuildingBlueprintRegistry.ts   # In-game blueprint storage
├── PlacementValidator.ts          # Terrain/collision validation
└── BuildingSystem.ts              # Entity lifecycle management

packages/renderer/src/
└── BuildingPlacementUI.ts         # UI for building placement
```

---

## Core Concepts

### 1. Voxel-Based Buildings

Buildings are defined as **3D voxel grids** using **ASCII layouts**:

```typescript
const SIMPLE_HUT: VoxelBuildingDefinition = {
  id: 'simple_hut',
  name: 'Thatched Hut',
  description: 'A basic shelter.',
  category: 'residential',
  tier: 1,

  // ASCII layout: Each string = row (Y-axis), chars = columns (X-axis)
  layout: [
    '#####',  // Row 0: Walls
    '#B..#',  // Row 1: Bed, floor, walls
    '#...D',  // Row 2: Floor, floor, door
    '#.S.#',  // Row 3: Storage, floor, walls
    '#####',  // Row 4: Walls
  ],

  materials: {
    wall: 'wood',
    floor: 'dirt',
    door: 'wood',
  },

  functionality: [
    { type: 'sleeping', params: { beds: 1 } }
  ],

  capacity: 2,  // Max occupants
  species: 'medium',  // For humans (2 voxel height)
};
```

**Tile Symbols** (from `TILE_SYMBOLS`):
- `#` - Wall (solid, blocks movement)
- `.` - Floor (walkable interior)
- `D` - Door (can open/close)
- `W` - Window (in wall, blocks movement, allows light)
- ` ` (space) - Empty/exterior
- `E` - Entrance (main door to exterior)
- `B` - Bed
- `S` - Storage
- `T` - Table
- `C` - Counter
- `K` - Workstation
- `^` - Stairs up
- `v` - Stairs down
- `X` - Stairwell (connects both directions)
- `P` - Pillar

### 2. Multi-Floor Buildings

Buildings can have multiple floors with variable ceiling heights:

```typescript
const TWO_STORY_HOUSE: VoxelBuildingDefinition = {
  id: 'two_story_house',
  name: 'Townhouse',
  layout: [
    // Ground floor
    '###########',
    '#....#....#',
    '#.CC.D.TT.#',
    '#....#....#',
    '#.....^...#',  // ^ = Stairs up
    '#####D#####',
  ],
  floors: [
    {
      level: 1,
      name: 'Bedrooms',
      ceilingHeight: 4,  // 4 voxels tall
      layout: [
        '###########',
        '#BB.#BB.###',
        '#...D...###',
        '#...#.v.###',  // v = Stairs down
        '###########',
      ],
    },
  ],
  species: 'medium',  // Human-sized (standing height = 2 voxels)
};
```

**Ceiling Comfort** (per species):
- **Cramped**: ceiling < height × 1.2 (mood -20)
- **Snug**: ceiling < height × 1.5 (mood -5)
- **Comfortable**: ceiling = height × 1.5-2.0 (mood 0)
- **Airy**: ceiling = height × 2.0-3.0 (mood +5)
- **Cavernous**: ceiling > height × 3.0 (mood +10)

### 3. Species Height Requirements

Buildings are designed for specific species with different height needs:

```typescript
type NamedSpecies =
  | 'tiny'    // 0.5 voxels (fairy, sprite)
  | 'small'   // 1 voxel (gnome, halfling)
  | 'short'   // 1.5 voxels (dwarf, goblin)
  | 'medium'  // 2 voxels (human, orc)
  | 'tall'    // 2.5 voxels (elf, alien)
  | 'large'   // 3 voxels (ogre, troll)
  | 'huge';   // 5+ voxels (giant)
```

**Example: Fairy Cottage** (tiny species):
```typescript
const FAIRY_COTTAGE: VoxelBuildingDefinition = {
  species: 'tiny',  // Standing height = 0.5 voxels
  layout: [
    ' ### ',
    '##B##',
    '#...#',
    '##D##',
  ],
  // Default ceiling = 1.5 voxels (comfortable for fairies)
};
```

**Example: Giant Cabin** (huge species):
```typescript
const GIANT_CABIN: VoxelBuildingDefinition = {
  species: 'huge',  // Standing height = 5 voxels
  layout: [/* 18×13 layout */],
  floors: [{
    level: 0,
    ceilingHeight: 12,  // 12 voxels tall for comfortable giant living
  }],
};
```

### 4. Materials System

**200+ materials** including standard, magical, and exotic types:

```typescript
type Material =
  // Standard
  | 'wood' | 'stone' | 'metal' | 'glass' | 'brick' | 'thatch'

  // Precious
  | 'gold' | 'silver' | 'diamond' | 'ruby' | 'emerald'

  // Organic
  | 'flesh' | 'bone' | 'coral' | 'living_wood' | 'amber'

  // Magical/Abstract
  | 'dreams' | 'moonlight' | 'starlight' | 'void' | 'time'
  | 'solidified_mana' | 'crystallized_thought' | 'frozen_time'

  // Elemental
  | 'fire' | 'water' | 'lightning' | 'magma' | 'frost'

  // Fantasy metals
  | 'mithril' | 'adamantine' | 'valyrian_steel' | 'orichalcum'

  // Creature materials
  | 'dragon_scale' | 'phoenix_feather' | 'unicorn_hair'

  // And 100+ more...
```

**Material Properties**:
```typescript
interface MaterialProperties {
  insulation: number;          // 0-100: heat retention
  durability: number;          // 0-100: damage resistance
  constructionDifficulty: number;  // 0-100: time/skill to build
  resourceCost: number;        // Units of material per tile
}

// Example:
stone: { insulation: 80, durability: 90, constructionDifficulty: 50, resourceCost: 3 }
dreams: { insulation: 50, durability: 20, constructionDifficulty: 100, resourceCost: 200 }
```

**Material Effects** (from `material-effects.ts`):
```typescript
// Magic paradigm affinities
MATERIAL_EFFECTS['moonlight'] = {
  paradigmAffinity: ['lunar', 'dream', 'silence'],
  moodModifier: 15,
  atmosphere: 'Serene, dreamlike glow',
  specialEffects: [
    { type: 'moon_phase_resonance', magnitude: 2.0 },
    { type: 'dream_clarity', magnitude: 1.5 },
  ],
};

// Elemental attunement
MATERIAL_EFFECTS['living_wood'] = {
  elementalAffinity: 'wood',
  paradigmAffinity: ['shinto', 'breath'],
  moodModifier: 10,
};
```

### 5. Building Functionality

Buildings provide gameplay functions:

```typescript
type BuildingFunction =
  // Basic
  | { type: 'sleeping'; params: { beds: number } }
  | { type: 'crafting'; params: { speed: number; recipes: string[] } }
  | { type: 'storage'; params: { capacity: number; itemTypes?: string[] } }
  | { type: 'research'; params: { bonus: number; fields: string[] } }
  | { type: 'mood_aura'; params: { bonus: number; radius: number } }

  // Magical
  | { type: 'mana_well'; params: { regenRate: number; radius: number } }
  | { type: 'paradigm_amplifier'; params: { paradigm: string; bonus: number } }
  | { type: 'spell_focus'; params: { costReduction: number } }
  | { type: 'summoning_circle'; params: { entityTypes: string[] } }
  | { type: 'ward'; params: { protection: number; radius: number } }

  // And more...
```

**Example: Blacksmith Forge**:
```typescript
const BLACKSMITH_FORGE: VoxelBuildingDefinition = {
  functionality: [
    {
      type: 'crafting',
      params: {
        speed: 1.5,  // 50% faster crafting
        recipes: ['weapons', 'armor', 'tools']
      }
    }
  ],
};
```

### 6. Feng Shui Spatial Harmony

Buildings are analyzed for spatial harmony:

```typescript
import { analyzeFengShui } from '@ai-village/building-designer';

const analysis = analyzeFengShui(building);
// Returns:
{
  harmonyScore: 85,  // 0-100
  chiFlow: {
    hasGoodFlow: true,
    stagnantAreas: [],
    hasShaQi: false,  // No "killing breath" (door-to-window straight line)
  },
  elementBalance: {
    wood: 30,
    fire: 10,
    earth: 25,
    metal: 15,
    water: 20,
  },
  issues: [
    {
      principle: 'commanding_position',
      issue: 'Bed cannot see the door',
      suggestion: 'Place bed with view of entrance',
      location: { x: 2, y: 3 },
    }
  ],
}
```

### 7. Magic Paradigm Integration

Buildings can be attuned to **30+ magic paradigms**:

```typescript
type MagicParadigm =
  // Core
  | 'academic' | 'divine' | 'blood' | 'breath' | 'pact' | 'name' | 'emotional'

  // Animist
  | 'shinto' | 'sympathy' | 'allomancy' | 'dream' | 'song' | 'rune' | 'daemon'

  // Creative
  | 'debt' | 'bureaucratic' | 'luck' | 'threshold' | 'belief' | 'echo' | 'game' | 'commerce'

  // Dimensional
  | 'dimensional' | 'literary'

  // Whimsical
  | 'talent' | 'narrative' | 'wild'

  // Additional
  | 'silence' | 'paradox' | 'craft' | 'lunar' | 'seasonal' | 'consumption';
```

**Example: Dream Magic Building**:
```typescript
const DREAM_SANCTUARY: VoxelBuildingDefinition = {
  id: 'dream_sanctuary',
  name: 'Oneiric Sanctuary',
  materials: {
    wall: 'moonlight',
    floor: 'dreams',
    door: 'starlight',
  },
  paradigmAffinity: ['dream', 'lunar', 'silence'],
  elementalAttunement: 'water',
  magicalEffects: [
    {
      type: 'dream_stability',
      magnitude: 2.0,
      radius: 10,
      paradigm: 'dream',
    },
    {
      type: 'mana_regen',
      magnitude: 5,
      radius: 5,
      conditions: { timeOfDay: 'night', moonPhase: 'full' },
    },
  ],
  functionality: [
    { type: 'dream_anchor'; params: { stability: 2.0 } },
    { type: 'meditation_site'; params: { visionClarityBonus: 50 } },
  ],
};
```

---

## Validation API

### validateBuilding()

Validates structural integrity, pathfinding, and design issues:

```typescript
import { validateBuilding } from '@ai-village/building-designer';

const result = validateBuilding(building);

// Returns:
interface ValidationResult {
  isValid: boolean;  // No errors

  issues: ValidationIssue[];  // Problems found

  rooms: Room[];  // Detected rooms

  dimensions: { width: number; height: number };

  tileCounts: {
    walls: number;
    floors: number;
    doors: number;
    windows: number;
    empty: number;
  };

  resourceCost: Record<string, number>;  // Material quantities

  pathfinding: {
    isTraversable: boolean;  // Can walk through building
    entrances: Array<{ x: number; y: number }>;
    deadEnds: Array<{ x: number; y: number }>;
  };
}
```

**Validation Issue Types**:
```typescript
type ValidationIssueType =
  | 'no_entrance'           // Missing door
  | 'unreachable_room'      // Room cannot be reached
  | 'hole_in_wall'          // Gap in wall
  | 'floating_wall'         // Disconnected wall segment
  | 'room_too_small'        // Below minimum size
  | 'door_to_nowhere'       // Door leads to wall/outside
  | 'pathfinding_blocked';  // Cannot navigate through
```

**Example Usage**:
```typescript
const building = {
  layout: [
    '#####',
    '#B..#',
    '#...#',  // Missing door!
    '#.S.#',
    '#####',
  ],
  // ... other fields
};

const result = validateBuilding(building);

console.log(result.isValid);  // false
console.log(result.issues);
// [
//   {
//     type: 'no_entrance',
//     severity: 'error',
//     message: 'Building has no entrance',
//     suggestion: 'Add a door (D) or entrance (E) tile',
//   }
// ]
```

---

## Building Library API

### Pre-Built Buildings

**57 buildings** organized by species and category:

```typescript
import {
  // Houses by species
  FAIRY_COTTAGE,        // Tiny (0.5 voxel)
  GNOME_BURROW,         // Small (1 voxel)
  DWARF_STONEHOME,      // Short (1.5 voxel)
  HUMAN_COTTAGE_SMALL,  // Medium (2 voxel)
  ELF_TREEHOUSE,        // Tall (2.5 voxel)
  OGRE_CAVE_HOME,       // Large (3 voxel)
  GIANT_CABIN,          // Huge (5 voxel)

  // Production
  BLACKSMITH_FORGE,
  CARPENTER_WORKSHOP,
  BAKERY,
  BREWERY,

  // Commercial
  TAVERN_LARGE,
  TRADING_POST,

  // Community
  TEMPLE_LARGE,
  TOWN_HALL,

  // Magic buildings (30+ paradigms)
  MANA_WELL,            // Academic magic
  KAMI_SHRINE,          // Shinto
  DREAM_SANCTUARY,      // Dream magic
  RUNE_FORGE,           // Rune magic

  // Collections
  ALL_HOUSES,
  ALL_PRODUCTION,
  ALL_MAGIC_BUILDINGS,
} from '@ai-village/building-designer';
```

### Utility Functions

```typescript
// Get buildings for a specific species
const humanBuildings = getBuildingsForSpecies('medium');
// Returns: [HUMAN_HUT_TINY, HUMAN_COTTAGE_SMALL, HUMAN_HOUSE_MEDIUM, ...]

// Get houses only for a species
const elfHouses = getHousesForSpecies('tall');
// Returns: [ELF_TREEHOUSE, ELF_SPIRE_HOME]

// Get buildings by paradigm affinity
const dreamBuildings = getBuildingsForParadigm('dream');
// Returns: [DREAM_SANCTUARY, NIGHTMARE_WARD, ...]

// Get buildings with specific effect
const manaBuildings = getBuildingsWithEffect('mana_regen');
// Returns: [MANA_WELL, LEYLINE_NEXUS, SPELL_FOCUS_TOWER, ...]
```

---

## LLM Generation API

### System Prompt

```typescript
import { BUILDING_DESIGNER_SYSTEM_PROMPT } from '@ai-village/building-designer';

// Use in LLM context:
const messages = [
  { role: 'system', content: BUILDING_DESIGNER_SYSTEM_PROMPT },
  { role: 'user', content: 'Design a small wizard tower' },
];
```

### JSON Schema

```typescript
import { BUILDING_JSON_SCHEMA } from '@ai-village/building-designer';

// For LLM tool calling:
const tools = [
  {
    name: 'design_building',
    description: 'Design a voxel-based building',
    parameters: BUILDING_JSON_SCHEMA,
  },
];
```

### Generation Prompts

```typescript
import { generateBuildingPrompt } from '@ai-village/building-designer';

const prompt = generateBuildingPrompt({
  category: 'residential',
  size: 'small',
  preferredMaterial: 'wood',
  style: 'rustic',
  requirements: {
    minRooms: 2,
    mustHave: ['bedroom', 'storage'],
  },
  context: 'For a human farmer in a forest village',
});

// Returns optimized prompt for LLM generation
```

---

## Examples

For detailed building design examples and demonstrations, see:

- **[src/showcase-buildings.ts](src/showcase-buildings.ts)** - 10 fully-designed showcase buildings (wizard tower, dwarven forge, fairy mushroom, market hall, elemental temple, hobbit hole, giant hall, apothecary, watchtower, underground vault) with multi-floor layouts, species-specific dimensions, validation, and lore
- **[src/examples.ts](src/examples.ts)** - Building design examples by tier (tier 1-5 buildings including huts, forges, towers, temples), demonstrating layout patterns, material choices, and functionality integration
- **[src/multifloor-demo.ts](src/multifloor-demo.ts)** - Multi-floor building demonstrations (variable ceiling heights, stairs, vertical navigation, floor-specific layouts)

**Usage:** These examples demonstrate complete building designs with proper validation, ASCII layouts, multi-floor structures, and species-specific requirements. Essential reference for creating custom buildings.

---

## Usage Examples

### Example 1: Creating a Simple Building

```typescript
import { VoxelBuildingDefinition } from '@ai-village/building-designer';

const myBuilding: VoxelBuildingDefinition = {
  id: 'my_hut',
  name: 'Cozy Hut',
  description: 'A small shelter',
  category: 'residential',
  tier: 1,

  layout: [
    '#####',
    '#B.S#',
    'W...D',
    '#####',
  ],

  materials: {
    wall: 'wood',
    floor: 'dirt',
    door: 'wood',
  },

  functionality: [
    { type: 'sleeping', params: { beds: 1 } }
  ],

  capacity: 2,
  species: 'medium',
};
```

### Example 2: Validating a Building

```typescript
import { validateBuilding, isValidBuilding } from '@ai-village/building-designer';

const result = validateBuilding(myBuilding);

if (result.isValid) {
  console.log('Building is valid!');
  console.log(`Found ${result.rooms.length} rooms`);
  console.log(`Resource cost:`, result.resourceCost);
} else {
  console.error('Validation failed:');
  for (const issue of result.issues) {
    if (issue.severity === 'error') {
      console.error(`  [ERROR] ${issue.message}`);
      if (issue.suggestion) {
        console.error(`    → ${issue.suggestion}`);
      }
    }
  }
}

// Quick check (boolean only):
if (isValidBuilding(myBuilding)) {
  // Proceed with building
}
```

### Example 3: Multi-Floor Building

```typescript
const WIZARD_TOWER: VoxelBuildingDefinition = {
  id: 'wizard_tower',
  name: 'Arcane Spire',
  description: 'A three-story wizard tower',
  category: 'research',
  tier: 4,
  species: 'medium',

  // Ground floor
  layout: [
    ' ##### ',
    '##...##',
    '#..^..#',  // Stairs up
    'W.....W',
    '#.....#',
    '##...##',
    ' ##D## ',
  ],

  // Upper floors
  floors: [
    {
      level: 1,
      name: 'Study',
      ceilingHeight: 5,
      layout: [
        ' ##### ',
        '##SSS##',
        '#..X..#',  // Stairwell (up and down)
        'W.TT.W',
        '#.....#',
        '##...##',
        ' ##### ',
      ],
    },
    {
      level: 2,
      name: 'Observatory',
      ceilingHeight: 6,
      layout: [
        ' ##### ',
        '##...##',
        '#..v..#',  // Stairs down
        'W..K..W',  // Workstation
        '#.....#',
        '##...##',
        ' ##### ',
      ],
    },
  ],

  materials: {
    wall: 'stone',
    floor: 'marble',
    door: 'crystal',
  },

  paradigmAffinity: ['academic', 'dimensional'],

  functionality: [
    { type: 'research'; params: { bonus: 2.5; fields: ['magic', 'astronomy'] } },
    { type: 'mana_well'; params: { regenRate: 10; radius: 15 } },
  ],

  capacity: 3,
};
```

### Example 4: Feng Shui Analysis

```typescript
import { analyzeFengShui, visualizeFengShui } from '@ai-village/building-designer';

const analysis = analyzeFengShui(WIZARD_TOWER);

console.log(`Harmony Score: ${analysis.harmonyScore}/100`);
console.log(`Chi Flow: ${analysis.chiFlow.hasGoodFlow ? 'Good' : 'Poor'}`);

// Element balance
console.log('Element Balance:');
for (const [element, value] of Object.entries(analysis.elementBalance)) {
  console.log(`  ${element}: ${value}%`);
}

// Issues
if (analysis.issues.length > 0) {
  console.log('\nFeng Shui Issues:');
  for (const issue of analysis.issues) {
    console.log(`  - ${issue.issue}`);
    console.log(`    Suggestion: ${issue.suggestion}`);
  }
}

// Visual representation
const visualization = visualizeFengShui(WIZARD_TOWER);
console.log(visualization);
```

### Example 5: Room-Based Composition

```typescript
import { composeFromRooms, room, ROOM_SIZES } from '@ai-village/building-designer';

// Define rooms
const bedroom = room('bedroom', 'small');  // 5×5
const kitchen = room('kitchen', 'medium'); // 7×7
const storage = room('storage', 'tiny');   // 3×3

// Compose building
const house = composeFromRooms({
  name: 'Farmhouse',
  rooms: [bedroom, kitchen, storage],
  layout: 'horizontal',  // Or 'vertical', 'grid'
  materials: {
    wall: 'wood',
    floor: 'wood',
    door: 'wood',
  },
});

// Returns a valid VoxelBuildingDefinition
console.log(house.layout);
```

### Example 6: Magic Building with Material Effects

```typescript
import {
  createMagicBuilding,
  describeMaterialEffects,
} from '@ai-village/building-designer';

const MOONLIGHT_SHRINE = createMagicBuilding({
  name: 'Lunar Temple',
  primaryMaterial: 'moonlight',
  secondaryMaterials: ['starlight', 'crystal'],
  paradigms: ['lunar', 'dream', 'silence'],
  size: 'medium',
});

// Check material synergies
const effects = describeMaterialEffects(MOONLIGHT_SHRINE);
console.log(effects);
// "The moonlight walls create a serene, dreamlike glow. The starlight accents resonate with lunar phases for enhanced moon magic. Crystal elements amplify spell focus."
```

---

## Architecture & Data Flow

### Building Definition Flow

```
1. Define Building
   ↓ VoxelBuildingDefinition (types.ts)

2. Validate
   ↓ validateBuilding() (validator.ts)

3. Register
   ↓ BuildingBlueprintRegistry.register() (core/buildings/)

4. Display in UI
   ↓ BuildingPlacementUI (renderer/)

5. Place in World
   ↓ BuildingSystem.placeBuilding() (core/systems/)

6. Create Entity
   ↓ World.createEntity() with 'building' component
```

### Validation Pipeline

```
validateBuilding(definition)
  ↓
1. Parse Layout → ParsedLayout
  ↓
2. Detect Rooms → floodFillRoom()
  ↓
3. Check Structure
   - Entrance validation
   - Wall integrity
   - Room connectivity
  ↓
4. Pathfinding Analysis
   - Entrance → all rooms
   - Dead-end detection
  ↓
5. Resource Calculation
   - Material costs
   - Build time estimate
  ↓
6. Return ValidationResult
```

### Material Effects Calculation

```
calculateBuildingEffects(building)
  ↓
1. Analyze Materials
   - Primary material (wall)
   - Secondary material (floor/door)
   - Exotic material properties
  ↓
2. Determine Paradigm Affinity
   - Material → paradigm mapping
   - Dominant paradigm selection
  ↓
3. Calculate Mood Modifier
   - Material atmosphere
   - Feng Shui harmony
   - Species comfort
  ↓
4. Generate Magical Effects
   - Paradigm bonuses
   - Element attunement
   - Special effects
  ↓
5. Return BuildingEffectSummary
```

---

## Performance Considerations

**Optimization strategies:**

1. **Validation Caching**: Validation results are expensive - cache them
2. **Layout Parsing**: Parse layout once, reuse ParsedLayout
3. **Flood Fill**: Use visited set to avoid re-checking tiles
4. **Material Lookups**: Use Map for O(1) material property access
5. **LLM Prompts**: Keep prompts under 2000 tokens for fast generation

**Query caching:**

```typescript
// ❌ BAD: Re-validate every frame
for (const building of buildings) {
  const result = validateBuilding(building);  // Expensive!
  if (result.isValid) { /* ... */ }
}

// ✅ GOOD: Validate once, cache results
const validationCache = new Map<string, ValidationResult>();
for (const building of buildings) {
  if (!validationCache.has(building.id)) {
    validationCache.set(building.id, validateBuilding(building));
  }
  const result = validationCache.get(building.id)!;
  if (result.isValid) { /* ... */ }
}
```

**Lazy material loading:**

```typescript
// ❌ BAD: Load all 200+ material effects upfront
import { MATERIAL_EFFECTS } from '@ai-village/building-designer';
const effects = MATERIAL_EFFECTS;  // Large object!

// ✅ GOOD: Load only needed materials
import { MATERIAL_EFFECTS } from '@ai-village/building-designer';
const getEffect = (material: Material) => MATERIAL_EFFECTS[material];
```

---

## Troubleshooting

### Building validation fails with "no_entrance"

**Check:**
1. Layout has at least one `D` (door) or `E` (entrance) tile
2. Door is on the exterior edge (adjacent to ` ` space)
3. Door is not surrounded by walls on all sides

**Debug:**
```typescript
const layout = building.layout;
console.log('Layout:');
layout.forEach((row, i) => console.log(`${i}: ${row}`));

// Search for doors
layout.forEach((row, y) => {
  [...row].forEach((tile, x) => {
    if (tile === 'D' || tile === 'E') {
      console.log(`Found door at (${x}, ${y})`);
    }
  });
});
```

### Room is marked as "unreachable"

**Check:**
1. Path exists from entrance to room
2. No blocking furniture in doorways
3. Doors are correctly placed (not in middle of wall)

**Debug:**
```typescript
const result = validateBuilding(building);
console.log('Rooms detected:', result.rooms.length);
result.rooms.forEach((room, i) => {
  console.log(`Room ${i}: ${room.area} tiles, enclosed: ${room.isEnclosed}`);
});

if (result.pathfinding) {
  console.log('Entrance:', result.pathfinding.entrances);
  console.log('Traversable:', result.pathfinding.isTraversable);
}
```

### Multi-floor building has misaligned stairs

**Error:** `Stairs do not align between floors`

**Fix:** Ensure stair tiles align vertically:

```typescript
// ✅ GOOD: Aligned stairs
layout: [
  '###',
  '#^#',  // Stairs up at (1, 1)
  '###',
],
floors: [{
  layout: [
    '###',
    '#v#',  // Stairs down at (1, 1) - ALIGNED
    '###',
  ],
}],

// ❌ BAD: Misaligned stairs
layout: [
  '###',
  '#^#',  // Stairs up at (1, 1)
  '###',
],
floors: [{
  layout: [
    '###',
    '##v',  // Stairs down at (2, 1) - MISALIGNED!
    '###',
  ],
}],
```

### Species height mismatch causes cramped spaces

**Error:** Building feels too small/large for species

**Check:**
```typescript
import { calculateCeilingComfort, SPECIES_HEIGHT_REQUIREMENTS } from '@ai-village/building-designer';

const species = 'medium';  // Human
const creatureHeight = SPECIES_HEIGHT_REQUIREMENTS[species].standingHeight;  // 2
const ceilingHeight = building.floors?.[0]?.ceilingHeight ?? 4;  // Default

const comfort = calculateCeilingComfort(creatureHeight, ceilingHeight);
console.log(`Comfort: ${comfort.level} (mood ${comfort.moodModifier})`);
console.log(`Description: ${comfort.description}`);

// If cramped: Increase ceilingHeight
// If cavernous: This might be intentional (grand halls)
```

### Material not found in MATERIAL_EFFECTS

**Error:** `Material 'xyz' has no defined effects`

**Fix:** Check if material exists in types.ts:

```typescript
import { Material } from '@ai-village/building-designer';

// Valid material types are in the Material union
// If material is missing, it's a standard construction material
// Use MATERIAL_PROPERTIES instead:
import { MATERIAL_PROPERTIES } from '@ai-village/building-designer';

const props = MATERIAL_PROPERTIES['wood'];
console.log(props);  // { insulation: 50, durability: 40, ... }
```

---

## Integration with Game Systems

### BuildingBlueprintRegistry (Core)

Buildings are registered in the game via `BuildingBlueprintRegistry`:

```typescript
import { BuildingBlueprintRegistry } from '@ai-village/core';
import { SIMPLE_HUT } from '@ai-village/building-designer';

const registry = new BuildingBlueprintRegistry();

// Convert designer format to blueprint
registry.register({
  id: SIMPLE_HUT.id,
  name: SIMPLE_HUT.name,
  description: SIMPLE_HUT.description,
  category: SIMPLE_HUT.category,
  width: Math.max(...SIMPLE_HUT.layout.map(r => r.length)),
  height: SIMPLE_HUT.layout.length,
  resourceCost: [
    { resourceId: 'wood', amountRequired: 20 },
  ],
  techRequired: [],
  terrainRequired: [],
  terrainForbidden: ['water'],
  unlocked: true,
  buildTime: 60,
  tier: SIMPLE_HUT.tier,
  functionality: SIMPLE_HUT.functionality.map(f => ({
    type: f.type,
    ...f.params,
  })),
  canRotate: true,
  rotationAngles: [0, 90, 180, 270],
  snapToGrid: true,
  requiresFoundation: false,
  layout: SIMPLE_HUT.layout,
  materials: SIMPLE_HUT.materials,
  species: SIMPLE_HUT.species,
  capacity: SIMPLE_HUT.capacity,
});

// Get blueprint
const blueprint = registry.get('simple_hut');
```

### BuildingPlacementUI (Renderer)

UI for placing buildings in the game:

```typescript
import { BuildingPlacementUI } from '@ai-village/renderer';

const placementUI = new BuildingPlacementUI({
  registry: buildingRegistry,
  validator: placementValidator,
  camera: gameCamera,
  eventBus: world.eventBus,
});

// Open building menu (triggered by 'B' key)
placementUI.toggleMenu();

// Select building
placementUI.selectBuilding('simple_hut');

// Place building at position
placementUI.confirmPlacement(world);
// Emits: 'building:placed' event
```

### BuildingSystem (Core)

Manages building lifecycle:

```typescript
// Listen for placement events
world.eventBus.on('building:placed', ({ blueprintId, position, rotation }) => {
  const blueprint = registry.get(blueprintId);

  // Create building entity
  const entity = world.createEntity();
  entity.addComponent({
    type: 'building',
    blueprintId: blueprint.id,
    position: position,
    rotation: rotation,
    constructionProgress: 0,
    isComplete: false,
  });

  // BuildingSystem will handle construction
});
```

---

## Testing

Run building designer tests:

```bash
cd custom_game_engine/packages/building-designer
npm test
```

**Key test files:**
- `src/__tests__/validator.test.ts` - Validation logic
- `src/__tests__/feng-shui.test.ts` - Spatial harmony
- `src/__tests__/material-effects.test.ts` - Material calculations

---

## Further Reading

- **SYSTEMS_CATALOG.md** - BuildingSystem reference (priority 115)
- **COMPONENTS_REFERENCE.md** - Building component types
- **METASYSTEMS_GUIDE.md** - Magic paradigms overview
- **Construction System Spec** - `openspec/specs/systems/construction-system/spec.md`
- **Magic System Docs** - `packages/magic/README.md`
- **Material Effects Guide** - `src/material-effects.ts` (inline documentation)

---

## Summary for Language Models

**Before working with building-designer:**
1. Understand the voxel-based ASCII layout system (tiles = characters)
2. Know the validation pipeline (structure → rooms → pathfinding)
3. Understand species height requirements (fairy → giant)
4. Know material types (standard vs. magical/exotic)
5. Understand the separation: building-designer (design) vs. core/buildings (in-game blueprints)

**Common tasks:**
- **Create building:** Define `VoxelBuildingDefinition` with layout, materials, functionality
- **Validate building:** Call `validateBuilding()`, check `isValid` and `issues`
- **Multi-floor building:** Use `floors` array with `ceilingHeight` per floor
- **Magic building:** Set `paradigmAffinity`, use exotic materials, add `magicalEffects`
- **Feng Shui analysis:** Call `analyzeFengShui()` for harmony score and issues
- **LLM generation:** Use `BUILDING_DESIGNER_SYSTEM_PROMPT` and `generateBuildingPrompt()`

**Critical rules:**
- **ASCII layouts are Y-down**: Row 0 = top of building, row[n] = bottom
- **Tile symbols matter**: Use `TILE_SYMBOLS` constants, not arbitrary characters
- **No silent validation**: Always check `ValidationResult.isValid` before using a building
- **Species determines scale**: Fairy cottage ≠ giant cabin (different voxel sizes)
- **Materials have effects**: Exotic materials (moonlight, dreams) have paradigm affinities
- **Multi-floor stairs must align**: `^` on floor N must match `v` on floor N+1
- **Entrances are exterior**: Doors must be adjacent to ` ` (empty) tiles

**Event-driven architecture:**
- building-designer is **standalone** (no events, pure functions)
- Integration happens in `@ai-village/core` via `BuildingSystem`
- Listen to `building:placed` events for construction triggers
- Never bypass `BuildingBlueprintRegistry` for in-game blueprints
