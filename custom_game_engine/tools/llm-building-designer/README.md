# LLM Building Designer

A standalone module for generating and validating voxel-based building designs using language models.

## Purpose

This tool allows LLMs to:
1. Design buildings using a simple ASCII layout format
2. Validate designs for structural integrity and pathfinding
3. Get feedback on issues before integration into the game

**This module is intentionally separate from the main game engine** to enable building generation and validation without game dependencies.

## Quick Start

### Dimensional Building Generation (NEW)

Generate species-specific and higher-dimensional buildings using LLM:

```bash
cd custom_game_engine/tools/llm-building-designer

# Simple species buildings (2D layouts)
GROQ_API_KEY=your_key npx ts-node generate-species-standalone.ts

# Advanced dimensional buildings (3D/4D/5D/6D)
GROQ_API_KEY=your_key npx ts-node generate-dimensional-buildings.ts
```

**See [DIMENSIONAL_BUILDINGS.md](./DIMENSIONAL_BUILDINGS.md) for comprehensive guide.**

### Validation and Testing

```bash
npm install
npm test      # Run validation tests
npm run demo  # See example buildings and validation
```

## Building Schema

Buildings are defined using ASCII layouts where each character represents a tile type:

| Symbol | Meaning | Properties |
|--------|---------|------------|
| `#` | Wall | Blocks movement, provides insulation |
| `.` | Floor | Walkable interior space |
| `D` | Door | Can be opened/closed, allows passage |
| `W` | Window | In walls, blocks movement, allows light |
| ` ` | Empty | Exterior/outside space |

### Example Building

```typescript
const cabin: VoxelBuildingDefinition = {
  id: 'cozy_cabin',
  name: 'Cozy Cabin',
  description: 'A small cabin with windows',
  category: 'residential',
  tier: 2,
  layout: [
    '#######',
    '#.....#',
    'W.....W',
    '#.....D',
    '#######',
  ],
  materials: {
    wall: 'wood',
    floor: 'wood',
    door: 'wood',
  },
  functionality: [
    { type: 'sleeping', params: { beds: 2 } },
  ],
  capacity: 2,
};
```

## Validation

The validator checks for:

### Errors (Must Fix)
- **No entrance**: Building has no door connecting to exterior
- **Unreachable rooms**: Rooms that can't be reached from any entrance
- **Invalid doors**: Doors not properly placed between walls

### Warnings (Should Review)
- **Holes in walls**: Gaps where walls should connect
- **Floating walls**: Wall segments not connected to structure
- **Misplaced windows**: Windows not in wall lines
- **Small rooms**: Rooms with less than 4 tiles
- **No windows**: Large rooms without any windows

### Info (Optional)
- **Large rooms**: Rooms exceeding 400 tiles
- **Dead ends**: Walkable tiles with only one exit

## Usage with LLMs

### System Prompt

```typescript
import { BUILDING_DESIGNER_SYSTEM_PROMPT } from '@ai-village/llm-building-designer';

// Include in your LLM system prompt
const messages = [
  { role: 'system', content: BUILDING_DESIGNER_SYSTEM_PROMPT },
  { role: 'user', content: 'Design a medium stone workshop' },
];
```

### Generation Request

```typescript
import { generateBuildingPrompt } from '@ai-village/llm-building-designer';

const prompt = generateBuildingPrompt({
  category: 'production',
  size: 'medium',
  preferredMaterial: 'stone',
  style: 'dwarven',
  requirements: {
    minRooms: 2,
    mustHave: ['forge', 'storage'],
  },
});
```

### Validation

```typescript
import { validateBuilding, formatValidationResult } from '@ai-village/llm-building-designer';

// Parse LLM output
const building = JSON.parse(llmOutput);

// Validate
const result = validateBuilding(building);

if (!result.isValid) {
  console.log(formatValidationResult(result));
  // Ask LLM to fix issues using generateFixPrompt()
}
```

### JSON Schema for Structured Output

```typescript
import { BUILDING_JSON_SCHEMA } from '@ai-village/llm-building-designer';

// Use with OpenAI function calling or Claude tool use
const tool = {
  name: 'design_building',
  input_schema: BUILDING_JSON_SCHEMA,
};
```

## API Reference

### Types

```typescript
// Main building definition
interface VoxelBuildingDefinition {
  id: string;
  name: string;
  description: string;
  category: BuildingCategory;
  tier: number;
  layout: string[];
  materials: { wall: WallMaterial; floor: FloorMaterial; door: DoorMaterial };
  functionality: BuildingFunction[];
  capacity: number;
  style?: string;
  lore?: string;
}

// Validation result
interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  rooms: Room[];
  dimensions: { width: number; height: number };
  tileCounts: { walls: number; floors: number; doors: number; windows: number };
  resourceCost: Record<string, number>;
  pathfinding: { isTraversable: boolean; entrances: Position[]; deadEnds: Position[] };
}
```

### Functions

```typescript
// Validate a building
validateBuilding(building: VoxelBuildingDefinition): ValidationResult

// Quick check if valid
isValidBuilding(building: VoxelBuildingDefinition): boolean

// Format result as string
formatValidationResult(result: ValidationResult): string

// Visualize building layout
visualizeBuilding(building: VoxelBuildingDefinition): string

// Generate prompts
generateBuildingPrompt(request: BuildingGenerationRequest): string
generateFixPrompt(building, issues): string
generateBuildingSetPrompt(theme, types, style): string
```

## Materials

| Wall Material | Insulation | Durability | Difficulty | Cost |
|--------------|------------|------------|------------|------|
| wood | 50 | 40 | 20 | 2 |
| stone | 80 | 90 | 50 | 3 |
| mud_brick | 60 | 30 | 30 | 2 |
| ice | 30 | 20 | 40 | 4 |
| metal | 20 | 100 | 70 | 5 |
| glass | 10 | 10 | 60 | 4 |
| thatch | 40 | 15 | 10 | 1 |

## Size Guidelines

| Size | Width | Height | Use Case |
|------|-------|--------|----------|
| tiny | 3-5 | 3-5 | Hut, shed |
| small | 5-8 | 5-8 | Cabin, workshop |
| medium | 8-15 | 8-15 | House, barn |
| large | 15-25 | 15-25 | Manor, warehouse |
| huge | 25-50 | 25-50 | Cathedral, town hall |

## Examples

The module includes example buildings at each tier:

- **Tier 1**: Simple Hut, Storage Shed
- **Tier 2**: Cabin with Windows, Workshop
- **Tier 3**: House with Rooms, L-Shaped Workshop, Barn
- **Tier 4**: Manor, Town Hall
- **Tier 5**: Cathedral

See `src/examples.ts` for full implementations.

## Future Integration

Once buildings are validated, they can be converted to the game's `TileBasedBlueprint` format:

```typescript
// Future: Convert to game format
function toGameBlueprint(building: VoxelBuildingDefinition): TileBasedBlueprint {
  return {
    id: building.id,
    name: building.name,
    layoutString: building.layout,
    wallMaterial: building.materials.wall,
    floorMaterial: building.materials.floor,
    doorMaterial: building.materials.door,
    // ... additional game-specific fields
  };
}
```

## Higher-Dimensional Buildings

This tool now supports generating buildings across multiple dimensions:

### 3D Multi-Floor Buildings
Standard vertical architecture with floors connected by stairs.
- **Species**: Elven (organic treehouses), Angelic (prayer spires)
- **Example**: 3-floor treehouse with spiral growth

### 4D W-Axis Buildings
Buildings that exist across multiple spatial slices along the W-axis.
- **Species**: High Fae 10D
- **Example**: Folded Manor with impossible geometry across W-slices
- **Feature**: `dimensional.w_axis.sliceLayouts` = array of 2D layouts per slice

### 5D V-Axis Buildings
Phase-shifting structures that morph between configurations.
- **Species**: High Fae 10D
- **Example**: Chronodream Spire cycling through time phases
- **Feature**: `dimensional.v_axis.phaseLayouts` = array of transitioning layouts

### 6D U-Axis Buildings
Quantum superposition structures with multiple simultaneous states.
- **Species**: High Fae 10D
- **Example**: Tesseract Court (throne room + war room + garden coexist)
- **Feature**: `dimensional.u_axis.stateLayouts` + probability weights

### Scripts

| Script | Purpose | Output |
|--------|---------|--------|
| `generate-species-standalone.ts` | Simple 2D species buildings | 18 buildings, basic layouts |
| `generate-dimensional-buildings.ts` | Advanced 3D/4D/5D/6D buildings | 13 buildings with dimensional features |

**Full documentation**: [DIMENSIONAL_BUILDINGS.md](./DIMENSIONAL_BUILDINGS.md)

## File Organization

```
tools/llm-building-designer/
├── README.md                           # This file
├── DIMENSIONAL_BUILDINGS.md            # Dimensional building guide (NEW)
├── generate-species-standalone.ts      # Simple 2D generator
├── generate-dimensional-buildings.ts   # Advanced dimensional generator (NEW)
├── src/
│   ├── exotic-buildings.ts            # Algorithmic reference implementation
│   ├── import-to-game.ts              # Game format conversion
│   └── types.ts                       # Building type definitions
└── [output files]                     # Generated JSON files
```

## License

Part of Multiverse: The End of Eternity project.
