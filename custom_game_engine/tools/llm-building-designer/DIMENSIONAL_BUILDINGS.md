# Dimensional Building Generator - LLM-Powered

## Overview

This system generates higher-dimensional buildings (3D, 4D, 5D, 6D) using LLM prompts, **replacing the hard-coded algorithmic generators** in `exotic-buildings.ts`.

## Key Innovation

**Before**: Hard-coded algorithms generated tesseracts, penteracts, hexeracts
**Now**: LLM generates dimensional buildings with natural variation and species-appropriate designs

## Supported Dimensions

### 3D Buildings (Standard Multi-Floor)
- Multiple floors connected by stairs
- Vertical architecture (spires, towers)
- Example: Angelic Prayer Spire (3 floors), Elven Treehouse (2 floors)

### 4D Buildings (W-Axis)
- Multiple spatial slices along W-axis
- Navigate between slices (like scrolling through parallel 3D spaces)
- Example: Tesseract (outer cube contains inner cube), Folded Manor (impossible geometry)
- **Pattern**: `dimensional.w_axis.sliceLayouts` = array of 2D layouts for each W-slice

### 5D Buildings (V-Axis Phase-Shifting)
- Multiple phase configurations that cycle/morph
- Walls shift, doors appear/disappear between phases
- Example: Chronodream Spire (past/present/future phases), Morphing Fortress
- **Pattern**: `dimensional.v_axis.phaseLayouts` = array of layouts that transition

### 6D Buildings (U-Axis Quantum Superposition)
- Multiple states exist simultaneously
- Probability weights for each state
- Observation collapses superposition (temporarily)
- Example: Tesseract Court (throne room + war room + garden simultaneously)
- **Pattern**: `dimensional.u_axis.stateLayouts` + `stateWeights`

## Architecture

### File Structure

```
tools/llm-building-designer/
├── generate-dimensional-buildings.ts    # New LLM-based generator
├── generate-species-standalone.ts       # Old simple generator (2D layouts)
├── src/
│   ├── exotic-buildings.ts             # Reference implementation (algorithmic)
│   └── import-to-game.ts               # Conversion utilities
└── DIMENSIONAL_BUILDINGS.md            # This file
```

### Data Flow

```
LLM Prompt (dimensional spec)
    ↓
Groq API (Qwen 32B)
    ↓
JSON Building Definition
    ↓
Validation & Enhancement
    ↓
Game Format Conversion
    ↓
buildings.json / SpeciesBuildings.ts
```

## Species-Specific Dimensional Designs

### Elven (3D Multi-Floor)
- **Philosophy**: Organic vertical growth
- **Dimensions**: 2-3 floors, spiral staircases
- **Materials**: living_wood, crystal, vines, starlight
- **Example**: Living Wood Treehouse with integrated tree growth across floors

### Centaur (3D Wide Open)
- **Philosophy**: Quadrupedal accessibility
- **Dimensions**: Single floor, 15+ tiles wide, minimal walls
- **Materials**: stone, wood, thatch, clay
- **Example**: Clan Meeting Hall with completely open interior, perimeter columns only

### Angelic (3D Vertical + 4D Light)
- **Philosophy**: Vertical transcendence, divine light
- **Dimensions**: 3+ floors (3D) or 2-3 W-slices (4D)
- **Materials**: marble, gold, crystal, starlight
- **Example**: Prayer Spire (3D tower), Celestial Archives (4D library with W-axis stacks)

### High Fae 10D (4D/5D/6D)
- **Philosophy**: Reality is negotiable
- **Dimensions**: 4D folding, 5D phase-shifting, 6D quantum superposition
- **Materials**: frozen_time, crystallized_dreams, void, plasma
- **Examples**:
  - **Folded Manor (4D)**: Rooms larger inside, impossible staircases between W-slices
  - **Chronodream Spire (5D)**: Morphs between past/present/future phases
  - **Tesseract Court (6D)**: Multiple throne rooms in quantum superposition

## Usage

### Generate All Dimensional Buildings

```bash
cd tools/llm-building-designer
GROQ_API_KEY=your_key npx ts-node generate-dimensional-buildings.ts
```

Output:
- `dimensional-buildings.json` - LLM format with dimensional metadata
- `dimensional-buildings-game-format.json` - Ready to import to game

### Generated Building Counts

**Species Buildings**:
- Elven: 2 buildings (2×3D multi-floor)
- Centaur: 2 buildings (2×3D wide open)
- Angelic: 2 buildings (1×3D + 1×4D)
- High Fae: 3 buildings (1×4D + 1×5D + 1×6D)

**Exotic Templates**:
- 2× 4D Tesseracts (research lab, vault)
- 2× 5D Penteracts (temple, fortress)
- 2× 6D Hexeracts (observatory, palace)

**Total**: 13 dimensional buildings

### Processing Time

- ~2 seconds delay between requests (rate limiting)
- ~5 seconds per building generation
- **Full run**: ~2-3 minutes for all 13 buildings

## Dimensional Building Format

### 3D Multi-Floor Example (Elven Treehouse)

```json
{
  "id": "elven_treehouse_3d",
  "name": "Living Wood Treehouse",
  "description": "Multi-story dwelling grown into ancient tree",
  "category": "residential",
  "tier": 2,
  "species": "elven",
  "layout": [
    "########",
    "#......#",
    "#..T...#",
    "#......D",
    "########"
  ],
  "floors": [
    {
      "level": 1,
      "name": "Sleeping Loft",
      "layout": [
        "########",
        "#B....B#",
        "#......#",
        "#..<<..#",
        "########"
      ]
    }
  ],
  "materials": {
    "wall": "living_wood",
    "floor": "living_wood",
    "door": "vines"
  },
  "functionality": [
    {"type": "sleeping", "params": {"beds": 2}}
  ],
  "capacity": 4
}
```

### 4D W-Axis Example (High Fae Folded Manor)

```json
{
  "id": "high_fae_folded_manor",
  "name": "Folded Manor",
  "description": "Non-euclidean residence folded across W-axis",
  "category": "residential",
  "tier": 4,
  "species": "high_fae_10d",
  "layout": [
    "###########",
    "#.........#",
    "#.........#",
    "#....>....#",
    "#.........#",
    "###########"
  ],
  "materials": {
    "wall": "frozen_time",
    "floor": "crystallized_dreams",
    "door": "void"
  },
  "dimensional": {
    "dimension": 4,
    "w_axis": {
      "layers": 2,
      "sliceLayouts": [
        [
          "###########",
          "#.........#",
          "#....T....#",
          "#....>....#",
          "#.........#",
          "###########"
        ],
        [
          "#######",
          "#.....#",
          "#.B.B.#",
          "#.....#",
          "#######"
        ]
      ]
    }
  },
  "functionality": [
    {"type": "sleeping", "params": {"beds": 2}}
  ],
  "capacity": 6
}
```

### 5D V-Axis Example (Chronodream Spire)

```json
{
  "id": "high_fae_chronodream_spire",
  "name": "Chronodream Spire",
  "description": "Tower that phase-shifts through time",
  "category": "spiritual",
  "tier": 5,
  "species": "high_fae_10d",
  "layout": [
    "#########",
    "#.......#",
    "#.......#",
    "#...+...#",
    "#.......#",
    "#########"
  ],
  "materials": {
    "wall": "time",
    "floor": "dreams",
    "door": "crystallized_dreams"
  },
  "dimensional": {
    "dimension": 5,
    "v_axis": {
      "phases": 4,
      "phaseLayouts": [
        [
          "#########",
          "#.......#",
          "#.......#",
          "#...+...#",
          "#.......#",
          "####D####"
        ],
        [
          "#########",
          "#.......#",
          "#...#...#",
          "#.##+#..#",
          "#.......#",
          "#########"
        ],
        [
          "#########",
          "#.#####.#",
          "#.......#",
          "#...+...#",
          "#.......#",
          "#########"
        ],
        [
          "#########",
          "#.......#",
          "D.......D",
          "#...+...#",
          "#.......#",
          "#########"
        ]
      ],
      "transitionRate": 0.2
    }
  },
  "functionality": [
    {"type": "spiritual", "params": {"meditation_bonus": 2.5}}
  ],
  "capacity": 8
}
```

### 6D U-Axis Example (Tesseract Court)

```json
{
  "id": "high_fae_tesseract_court",
  "name": "Tesseract Court",
  "description": "Palace existing in quantum superposition",
  "category": "governance",
  "tier": 5,
  "species": "high_fae_10d",
  "layout": [
    "###############",
    "#.............#",
    "#.............#",
    "#......+......#",
    "#.............#",
    "#.............#",
    "###############"
  ],
  "materials": {
    "wall": "void",
    "floor": "crystallized_dreams",
    "door": "force_field"
  },
  "dimensional": {
    "dimension": 6,
    "u_axis": {
      "probabilityStates": 3,
      "stateWeights": [0.5, 0.3, 0.2],
      "stateLayouts": [
        [
          "###############",
          "#.............#",
          "#.....###.....#",
          "#.....#+#.....#",
          "#.....###.....#",
          "#.............#",
          "###############"
        ],
        [
          "###############",
          "#T...........T#",
          "#.............#",
          "#.....T+T.....#",
          "#.............#",
          "#T...........T#",
          "###############"
        ],
        [
          "###############",
          "#.............#",
          "#..#########..#",
          "#..##+##+##...#",
          "#..#########..#",
          "#.............#",
          "###############"
        ]
      ]
    }
  },
  "functionality": [
    {"type": "governance", "params": {"decision_bonus": 3.0}}
  ],
  "capacity": 12
}
```

## LLM Prompt Structure

### System Prompt

The system prompt explains:
1. Dimensional building concepts (W-axis, V-axis, U-axis)
2. Layout rules (rectangular grids, symbols, connectivity)
3. Dimensional feature requirements
4. JSON output format

### User Prompt (per building)

```
Design a 4-tier Folded Manor.
Species: high_fae_10d
Dimension: 4D
Size: 11-17 tiles per side

4D W-AXIS REQUIREMENTS:
- Create 2-4 W-axis slices in dimensional.w_axis.sliceLayouts
- Each slice is a different 3D cross-section
- Slices should be related but distinct (like nested cubes)
- Example: Outer cube (slice 0) contains inner cube (slice 1)
- Add stairs/portals to navigate between slices

Preferred materials: frozen_time, crystallized_dreams, void, starlight

Architectural characteristics:
- Non-euclidean W-axis folding
- Rooms larger inside than outside
- Impossible staircases between slices
- Reality-bending architecture
- Corridors that loop impossibly

Return ONLY valid JSON matching the format.
```

## Integration with Game

### Option 1: Replace Species Buildings

```bash
# Backup current species buildings
cp packages/core/data/buildings.json packages/core/data/buildings-backup.json

# Generate new dimensional buildings
cd tools/llm-building-designer
GROQ_API_KEY=your_key npx ts-node generate-dimensional-buildings.ts

# Replace in buildings.json (manual merge or script)
# Update packages/core/src/buildings/SpeciesBuildings.ts with new IDs
```

### Option 2: Add as New Category

```typescript
// In packages/core/src/buildings/index.ts
export * from './DimensionalBuildings.js';

// In packages/core/src/buildings/DimensionalBuildings.ts
export const ALL_4D_BUILDINGS = [...];
export const ALL_5D_BUILDINGS = [...];
export const ALL_6D_BUILDINGS = [...];
export const BUILDINGS_BY_DIMENSION = {
  '4D': ALL_4D_BUILDINGS,
  '5D': ALL_5D_BUILDINGS,
  '6D': ALL_6D_BUILDINGS
};
```

### Option 3: Dynamic Loading

```typescript
// When builder unlocks 4D technology
if (builder.techTier >= 7) {
  const dimensionalBuildings = await fetch('/api/dimensional-buildings')
    .then(r => r.json());
  world.availableBuildings.set('dimensional', dimensionalBuildings);
}
```

## Extending the System

### Add New Species

```typescript
const SPECIES_DIMENSIONAL_SPECS: Record<string, DimensionalSpec[]> = {
  // ... existing species

  draconic: [
    {
      dimension: 3,
      buildingType: 'Hoard Vault',
      species: 'draconic',
      size: 'large',
      tier: 3,
      materials: ['obsidian', 'gold', 'lava_stone'],
      characteristics: [
        'Massive cavern-like space',
        'Fireproof construction',
        'High ceilings for flight',
        'Central treasure pile',
        'Lava moat perimeter'
      ]
    }
  ]
};
```

### Add New Exotic Templates

```typescript
const EXOTIC_TEMPLATES: DimensionalSpec[] = [
  // ... existing templates

  {
    dimension: 5,
    buildingType: 'Temporal Library',
    size: 'large',
    tier: 5,
    materials: ['time', 'pages', 'crystal', 'starlight'],
    characteristics: [
      '5D library with phase-shifting stacks',
      'Books from different timelines per phase',
      'Reading room stable across all phases',
      'Checkout desk phase-locked to present',
      'Archives shift to prevent paradoxes'
    ]
  }
];
```

## Comparison: Algorithmic vs LLM

### Algorithmic Generator (exotic-buildings.ts)

**Pros**:
- Deterministic, reproducible
- Fast (instant generation)
- Guaranteed valid structure
- Mathematical precision

**Cons**:
- Hard-coded, inflexible
- Same pattern every time
- Requires coding to add variations
- No species-specific customization

### LLM Generator (generate-dimensional-buildings.ts)

**Pros**:
- Natural variation in designs
- Species-appropriate architecture
- Easy to customize via prompts
- Can incorporate lore/flavor
- Non-programmers can add buildings

**Cons**:
- Non-deterministic (varies per run)
- Slower (~5 seconds per building)
- Requires validation (LLM may produce invalid JSON)
- API cost (mitigated by using Groq free tier)

## Best Practices

### When to Use LLM Generator

- Generating species-specific buildings
- Creating varied exotic buildings
- Rapid prototyping of new building types
- Non-programmer content creation

### When to Use Algorithmic Generator

- Real-time procedural generation in-game
- Performance-critical scenarios
- Guaranteed structural validity
- Reference implementations

### Hybrid Approach

1. Generate 20-30 buildings with LLM
2. Curate best designs
3. Save to `buildings.json`
4. Use algorithmic generators for procedural variations at runtime

## Troubleshooting

**Q: LLM generates invalid JSON**
- Check for `<think>` tags in response (script filters these)
- Validate JSON structure manually
- Failed buildings are logged and skipped

**Q: Dimensional features missing**
- LLM may not always include `dimensional` object
- Retry generation or add explicit validation

**Q: Layouts too small/large**
- Adjust `size` parameter in spec
- Update prompt with specific tile counts

**Q: Species characteristics ignored**
- Make characteristics more explicit in prompt
- Increase temperature for more variation (0.7-0.9)

## See Also

- [BUILDING_GENERATOR_SYSTEM.md](../../BUILDING_GENERATOR_SYSTEM.md) - Integration guide
- [exotic-buildings.ts](./src/exotic-buildings.ts) - Algorithmic reference implementation
- [packages/core/src/magic/DimensionalParadigms.ts](../../packages/core/src/magic/DimensionalParadigms.ts) - Dimensional mechanics
- [packages/core/src/buildings/SpeciesBuildings.ts](../../packages/core/src/buildings/SpeciesBuildings.ts) - Current species buildings
