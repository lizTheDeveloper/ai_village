# LLM Building Designer - Import & Integration Guide

Complete guide for using LLMs to design buildings and import them into the game.

## Quick Start

```bash
# 1. Generate buildings (manual or LLM)
#    Edit: generated-buildings.json

# 2. Validate buildings
npm run test:validate

# 3. Convert to game format
npx ts-node src/import-to-game.ts

# 4. Import into game
#    Copy from: generated-buildings-game-format.json
#    Paste into: packages/core/data/buildings.json
```

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   LLM Building Designer                      │
│                                                               │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │   Design    │   │   Validate   │   │  Convert to     │  │
│  │  (LLM/Human)│──▶│  (Automated) │──▶│  Game Format    │  │
│  └─────────────┘   └──────────────┘   └─────────────────┘  │
│         │                  │                    │            │
│         ▼                  ▼                    ▼            │
│    Building JSON    Validation Report    BuildingBlueprint  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Import to Game │
                    │  buildings.json  │
                    └──────────────────┘
```

## File Formats

### LLM Designer Format (VoxelBuildingDefinition)

Simple, LLM-friendly format focused on layout:

```json
{
  "id": "example_cottage",
  "name": "Cozy Cottage",
  "description": "A warm place to call home",
  "category": "residential",
  "tier": 2,
  "layout": [
    "######",
    "#B.T.#",
    "W....D",
    "#S...#",
    "######"
  ],
  "materials": {
    "wall": "wood",
    "floor": "wood",
    "door": "wood"
  },
  "functionality": [
    { "type": "sleeping", "params": { "beds": 1 } }
  ],
  "capacity": 2
}
```

### Game Format (BuildingBlueprint)

Complete game format with costs, requirements, and placement rules:

```json
{
  "id": "example_cottage",
  "name": "Cozy Cottage",
  "description": "A warm place to call home",
  "category": "residential",
  "tier": 2,
  "width": 6,
  "height": 5,
  "resourceCost": [
    { "resourceId": "wood", "amountRequired": 100 }
  ],
  "techRequired": [],
  "terrainRequired": [],
  "terrainForbidden": ["water"],
  "unlocked": true,
  "buildTime": 180,
  "functionality": [...],
  "canRotate": true,
  "rotationAngles": [0, 90, 180, 270],
  "snapToGrid": true,
  "requiresFoundation": false,
  "layout": [...],
  "materials": {...},
  "capacity": 2
}
```

## Workflow

### 1. Design Buildings

**Option A: Manual Design**

Edit `generated-buildings.json` directly:

```json
[
  {
    "id": "my_building",
    "name": "My Building",
    // ... rest of fields
  }
]
```

**Option B: LLM Design (Qwen, Claude, etc.)**

Use the provided prompts:

```typescript
import { BUILDING_DESIGNER_PROMPT } from './src/test-qwen';

// Call your LLM with this prompt
const response = await callLLM({
  system: BUILDING_DESIGNER_PROMPT,
  user: 'Design a tier-2 cottage for 2 people'
});

// Parse and validate
const building = JSON.parse(response);
```

### 2. Validate Buildings

```bash
# Validate all buildings
npx ts-node src/validate-generated.ts

# Should see:
# ✅ VALID for all buildings
# Any errors will show specific issues to fix
```

Validation checks:
- ✅ Has at least one door to exterior
- ✅ All rooms are reachable
- ✅ Doors properly placed between walls
- ✅ No floating wall segments
- ⚠️  Warnings for small rooms, no windows, etc.

### 3. Convert to Game Format

```bash
npx ts-node src/import-to-game.ts
```

This creates `generated-buildings-game-format.json` with:
- Auto-calculated resource costs based on materials
- Build time based on size and tier
- Placement rules (rotation, snap to grid, etc.)
- Auto-unlock tier 1-2 buildings

### 4. Import into Game

**Manual Import:**

1. Open `packages/core/data/buildings.json`
2. Copy buildings from `generated-buildings-game-format.json`
3. Paste into the `buildings` array
4. Save - Vite will auto-reload (2 seconds)

**Automatic Merging (TODO):**

```bash
npx ts-node src/merge-into-game.ts
# Automatically merges into game's buildings.json
```

### 5. Verify in Game

1. Start game: `./start.sh`
2. Open building menu
3. Your buildings should appear in their tier/category
4. Test placement and functionality

## Testing Qwen

The system is pre-configured to work with Qwen via Groq:

```typescript
// In your code or test
import { ProxyLLMProvider } from '@ai-village/llm';

const provider = new ProxyLLMProvider();
const response = await provider.chat({
  model: 'qwen-3-32b', // Routes to Groq automatically
  messages: [
    { role: 'system', content: BUILDING_DESIGNER_PROMPT },
    { role: 'user', content: 'Design a tier-2 cottage' }
  ],
  temperature: 0.7
});

const building = JSON.parse(response.content);
const validation = validateBuilding(building);

if (validation.isValid) {
  console.log('✅ Qwen designed a valid building!');
}
```

**Quick Test:**

```bash
npx ts-node src/test-qwen-real.ts
# Tests with simulated responses
# Replace callQwen() with real API call to test live
```

## Material to Resource Mapping

The converter automatically maps exotic materials to base resources:

| Material Type | Maps To | Example |
|--------------|---------|----------|
| Standard | Themselves | wood → wood, stone → stone |
| Processed | Base material | brick → stone, steel → metal |
| Organic | wood | fungus, bamboo, thatch → wood |
| Frozen | water | ice → water |
| Precious | High cost metal | crystal → glass, obsidian → stone |
| Food | wood | gingerbread, candy → wood |
| Magical | Special | starlight → magic |

**Resource Costs:**
- Wall tiles: 2 resources each
- Floor tiles: 2 resources each
- Doors: 5 resources each (higher cost)
- Windows: 3 glass each

**Build Time:**
```
buildTime = tileCount × tier × 2 (seconds)
```

## Examples

### 15 Pre-Validated Buildings

The project includes 15 hand-crafted, validated buildings in `generated-buildings.json`:

1. **Canopy Treehouse** - Tier 3 living_wood residential
2. **Stone Bunker** - Tier 3 fortified granite shelter
3. **Enchanter's Tower** - Tier 5 crystal academic building
4. **Crystal Greenhouse** - Tier 4 glass production
5. **Master Forge** - Tier 3 stone smithy
6. **Alchemical Laboratory** - Tier 4 scientific workshop
7. **Grand Library** - Tier 4 wooden academic
8. **Sacred Temple** - Tier 4 marble religious
9. **Trading Post** - Tier 2 commercial marketplace
10. **The Wanderer's Rest** - Tier 3 tavern/inn
11. **Frozen Chamber** - Tier 4 ice residential
12. **Fungal Dwelling** - Tier 2 organic mushroom hut
13. **Dark Fortress** - Tier 5 obsidian military
14. **Gingerbread House** - Tier 3 whimsical candy cottage
15. **Ossuary Chapel** - Tier 4 bone religious building

All buildings:
- ✅ Pass validation (no errors)
- ✅ Have proper entrances and pathfinding
- ✅ Use exotic materials (200+ options)
- ✅ Include special functionality
- ✅ Ready to import into game

## Advanced Features

### Multi-Floor Buildings

Add floors above ground level:

```json
{
  "layout": ["###", "#D#", "###"],  // Ground floor
  "floors": [
    {
      "level": 1,
      "name": "Second Floor",
      "layout": ["###", "#S#", "###"],
      "ceilingHeight": 3
    }
  ]
}
```

### Furniture Symbols

Beyond basic tiles:

- `B` = Bed
- `T` = Table
- `S` = Storage chest
- `K` = Workstation/crafting
- `C` = Counter

### Validation Levels

- **ERROR** (blocks import): No entrance, unreachable rooms, invalid doors
- **WARNING** (review recommended): Floating walls, small rooms, no windows
- **INFO** (optional): Large rooms, dead ends

## Troubleshooting

**"Building has no entrance"**
- Add `D` (door) connecting interior to exterior
- Doors must touch both interior floors and exterior spaces

**"Room cannot be reached"**
- Ensure continuous floor path from door to all rooms
- Add doors between rooms if needed

**"Door not properly placed"**
- Doors need walls on OPPOSITE sides (either N-S or E-W)
- ✅ `#D#` (wall-door-wall vertical)
- ❌ `#D.` (wall-door-floor - invalid)

**"Floating wall segment"**
- Interior walls creating small rooms
- Either connect to outer walls or remove

**JSON parse error**
- Ensure valid JSON (use JSON validator)
- No trailing commas
- Proper quote escaping

## Next Steps

1. **Test Qwen Integration**: Wire up actual Qwen API in `test-qwen-real.ts`
2. **Automated Merging**: Create `merge-into-game.ts` to auto-merge buildings
3. **Web UI**: Create browser-based building designer with live preview
4. **LLM Fine-Tuning**: Train on successful buildings to improve quality
5. **Procedural Generation**: Use buildings as templates for variations

## Resources

- **Main README**: `../README.md` - Tool overview and API reference
- **Types**: `src/types.ts` - All building types and materials
- **Validator**: `src/validator.ts` - Validation logic
- **Examples**: `src/examples.ts` - Reference implementations
- **Converter**: `src/import-to-game.ts` - Format conversion logic

## Questions?

Check the existing buildings in `generated-buildings.json` for examples, or run validation on any building to see what's expected.
