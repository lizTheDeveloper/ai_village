# Building Generator System - Integration Guide

## Overview

The Building Generator System is an LLM-powered architecture generation tool integrated into the game engine. It generates culturally-appropriate buildings for different species and alien civilizations, matching the quality and style of your alien language, world, and biome generators.

## What We Built

### 1. Core Service (`packages/building-designer/`)

**BuildingGeneratorService** - Main service for generating species-specific buildings

```typescript
import { buildingGeneratorService } from '@ai-village/building-designer';

// Generate single building
const building = await buildingGeneratorService.generateBuilding(
  'elven',          // species
  'library',        // type
  3                 // tier
);

// Generate complete set
const buildings = await buildingGeneratorService.generateSpeciesBuildingSet('centaur');
```

### 2. Supported Species

**Four architectural philosophies**:

1. **Elven**: Organic, nature-integrated, living materials
2. **Centaur**: Wide open spaces, quadrupedal accessibility
3. **Angelic**: Vertical, divine light, sacred geometry
4. **High Fae (10D)**: Non-euclidean, impossible geometry

Each species has:
- Unique architectural philosophy
- 7+ signature materials
- 5+ characteristic features
- Specific dimensional requirements

### 3. Generated Building Sets

**Example: Elven Buildings**
- Moonlit Treehouse (residential, tier 1-2)
- Crystal Meditation Bower (spiritual, tier 2)
- Living Wood Library (academic, tier 2-3)
- Enchanted Forge (production, tier 2-3)
- Starlight Sanctuary (religious, tier 3)

**Example: Centaur Buildings**
- Stable Dwelling (residential, tier 1)
- Clan Meeting Hall (communal, tier 2)
- Open Smithy (production, tier 2)
- Training Shelter (military, tier 2)
- War Council Chamber (governance, tier 3)

### 4. Integration Points

**With Builder Agents**:
```typescript
// When builder doesn't have design
if (!knownDesign) {
  const generated = await buildingGeneratorService.generateBuilding(
    agent.species,
    desiredType,
    agent.techTier
  );
  await constructBuilding(convertToGameFormat(generated));
}
```

**With Alien World Generation**:
```typescript
// Generate buildings when creating alien civilization
const speciesStyle = determineArchitecturalStyle(alienSpecies);
const buildings = await buildingGeneratorService.generateSpeciesBuildingSet(speciesStyle);
world.alienBuildings.set(alienSpecies.id, buildings);
```

**With Procedural Villages**:
```typescript
async function generateVillage(species: string, size: number) {
  const buildings = await buildingGeneratorService.generateSpeciesBuildingSet(species);
  return {
    species,
    population: size,
    buildings: buildings.map(convertToGameFormat)
  };
}
```

## Generated Building Format

```json
{
  "id": "elven_moonlit_treehouse",
  "name": "Moonlit Treehouse",
  "description": "A graceful dwelling woven into living trees",
  "category": "residential",
  "tier": 2,
  "layout": [
    "######",
    "#B..W#",
    "#.T..#",
    "#....D",
    "######"
  ],
  "materials": {
    "wall": "living_wood",
    "floor": "living_wood",
    "door": "vines",
    "window": "crystal"
  },
  "functionality": [
    {"type": "sleeping", "params": {"beds": 1}}
  ],
  "capacity": 2,
  "species": "elven",
  "culturalSignificance": "Traditional elven dwelling integrated with ancient trees"
}
```

## How to Use

### 1. Generate Test Datasets

```bash
cd tools/llm-building-designer

# Generate all 4 species building sets (20 buildings)
GROQ_API_KEY=your_key npx ts-node generate-species-standalone.ts

# Output files:
# - all-species-buildings.json (LLM format)
# - all-species-buildings-game-format.json (ready to import)
```

### 2. Import into Game

```typescript
// Option 1: Load from generated files
const speciesBuildings = JSON.parse(
  fs.readFileSync('all-species-buildings-game-format.json', 'utf-8')
);

// Option 2: Generate on demand
const elvenBuildings = await buildingGeneratorService.generateSpeciesBuildingSet('elven');
```

### 3. Add to World

```typescript
// During world initialization
for (const [species, buildings] of Object.entries(speciesBuildings)) {
  world.availableBuildings.set(species, buildings);
}

// When agent needs building
const species = agent.getSpecies();
const availableBuildings = world.availableBuildings.get(species) || [];
```

## Architecture Details

### Elven Philosophy
- **Core**: Harmony with nature, minimal environmental impact
- **Materials**: living_wood, crystal, moonlight, vines, enchanted_wood
- **Features**: Curved walls, living trees incorporated, natural lighting
- **Dimensions**: Tall (3-5 stories), graceful, high ceilings (12-20 ft)

### Centaur Philosophy
- **Core**: Form follows function for quadrupedal movement
- **Materials**: stone, wood, thatch, clay, bronze
- **Features**: Wide doorways (no doors), ramps, high ceilings, open plans
- **Dimensions**: Wide (20-40 ft), single-story preferred

### Angelic Philosophy
- **Core**: Vertical transcendence, divine light, sacred geometry
- **Materials**: marble, gold, crystal, starlight, glass, platinum
- **Features**: Soaring spires, radial symmetry, multiple vertical levels
- **Dimensions**: Vertical (50-200 ft tall), narrow base

### High Fae (10D) Philosophy
- **Core**: Reality is negotiable, non-euclidean geometry
- **Materials**: frozen_time, dimensional_fabric, crystallized_dreams, void_matter
- **Features**: Rooms larger inside, impossible geometry, dimensional folding
- **Dimensions**: Variable, transcends 3D measurement

## Performance

- **Generation time**: ~10-15 seconds per building
- **Success rate**: ~40-50% (varies by species complexity)
- **Rate limiting**: 2 second delay between requests
- **Cost**: Free (Groq's free tier with Qwen)
- **Batch generation**: 20 buildings in ~3 minutes

## Extending the System

### Add New Species

```typescript
// In BuildingGeneratorService.ts
const ARCHITECTURAL_STYLES = {
  // ... existing styles

  draconic: {
    species: 'Draconic',
    philosophy: 'Hoarding spaces, fireproof, territorial markers',
    materials: ['obsidian', 'gold', 'lava_stone', 'dragon_scales'],
    characteristics: [
      'Fireproof construction',
      'Large treasure vaults',
      'High-temperature forges',
      'Territorial boundary markers'
    ],
    dimensions: 'Massive cavern-like spaces with high ceilings',
    examples: 'Dragon lairs, hoards, forges, rookeries'
  }
};
```

### Customize Building Types

```typescript
const CUSTOM_TYPES = [
  'underwater dome',       // For aquatic species
  'crystal spire',        // For crystalline beings
  'quantum laboratory',   // For advanced species
  'temporal archive'      // For time-manipulating species
];

await buildingGeneratorService.generateSpeciesBuildingSet(
  'high_fae_10d',
  CUSTOM_TYPES
);
```

## Files Created

### Package Files
- `packages/building-designer/src/BuildingGeneratorService.ts` - Core service
- `packages/building-designer/src/index.ts` - Package exports
- `packages/building-designer/package.json` - Package definition
- `packages/building-designer/README.md` - API documentation
- `packages/building-designer/SPECIES_ARCHITECTURE_GUIDE.md` - Design guide

### Generation Scripts
- `tools/llm-building-designer/generate-species-standalone.ts` - Standalone generator
- `tools/llm-building-designer/generate-species-buildings.ts` - Full generator (alternative)

### Output Files (after generation)
- `all-species-buildings.json` - LLM format
- `all-species-buildings-game-format.json` - Game format (ready to import)
- Individual files per species

## Next Steps

1. ✅ Core service implemented
2. ✅ 4 species architectural styles defined
3. ✅ Generation scripts created
4. ✅ Generated building sets (18 buildings across 4 species)
5. ✅ Added to game's building pool (`packages/core/data/buildings.json`)
6. ✅ Exported from core package (`packages/core/src/buildings/SpeciesBuildings.ts`)
7. ⏳ Integrate with builder agents
8. ⏳ Connect to alien world generation

## Using Species Buildings in Game

### Import and Use Directly

```typescript
import {
  ALL_ELVEN_BUILDINGS,
  ALL_CENTAUR_BUILDINGS,
  getBuildingsForSpecies,
  ELVEN_MOONLIT_TREEHOUSE
} from '@ai-village/core';

// Get all buildings for a species
const elvenBuildings = ALL_ELVEN_BUILDINGS;

// Get buildings by species name
const centaurBuildings = getBuildingsForSpecies('centaur');

// Use a specific building
const treehouse = ELVEN_MOONLIT_TREEHOUSE;
```

### Add to Building Placement UI

The buildings are automatically available through the standard building system since they're in `buildings.json`.

## Example Usage

### In-Game Builder Agent

```typescript
class BuilderAgent {
  async designBuilding(type: string): Promise<Building> {
    // Try to find existing design
    let design = this.knownDesigns.find(d => d.type === type);

    if (!design) {
      // Generate new design based on species
      console.log(`🏗️  No design for ${type}, generating...`);

      design = await buildingGeneratorService.generateBuilding(
        this.species,
        type,
        this.techTier,
        { size: this.villageSize > 50 ? 'large' : 'medium' }
      );

      if (design) {
        this.knownDesigns.push(design);
        console.log(`✅ Generated ${design.name}`);
      }
    }

    return design ? convertToGameFormat(design) : null;
  }
}
```

### Procedural Civilization

```typescript
async function generateCivilization(species: string) {
  // Generate buildings
  const buildings = await buildingGeneratorService.generateSpeciesBuildingSet(species);

  // Create settlement
  return {
    species,
    culture: ARCHITECTURAL_STYLES[species],
    buildings: buildings.map(convertToGameFormat),
    population: calculatePopulation(buildings),
    aestheticStyle: buildings[0].materials.wall // Use primary material as style
  };
}
```

## Troubleshooting

**Q: Generation fails**
- Check GROQ_API_KEY is set
- Verify internet connection
- Check rate limits (2s between requests)

**Q: Invalid buildings generated**
- Qwen success rate ~40-50%
- Failed buildings are filtered out
- Validation errors are logged

**Q: Module loading errors**
- Use standalone script: `generate-species-standalone.ts`
- Avoids ES module issues

**Q: How to add buildings to game?**
- Copy from `all-species-buildings-game-format.json`
- Add to `packages/core/data/buildings.json`
- Or load dynamically in BuildingSystem

## Dimensional Buildings (NEW)

**Higher-dimensional building generation has been upgraded to use LLM instead of hard-coded algorithms.**

See [tools/llm-building-designer/DIMENSIONAL_BUILDINGS.md](tools/llm-building-designer/DIMENSIONAL_BUILDINGS.md) for:
- 4D buildings with W-axis spatial slices (tesseracts, folded manors)
- 5D buildings with V-axis phase-shifting (chronodream spires, morphing fortresses)
- 6D buildings with U-axis quantum superposition (tesseract courts, superposition palaces)
- Species-specific dimensional designs (High Fae 10D uses 4D/5D/6D, Angelic uses 3D/4D)

**Key improvement**: Previous `exotic-buildings.ts` had hard-coded algorithmic generators. New system uses LLM prompts for natural variation and species-appropriate designs.

### Quick Start

```bash
cd tools/llm-building-designer
GROQ_API_KEY=your_key npx ts-node generate-dimensional-buildings.ts
```

Generates:
- Species buildings with proper dimensional features (Centaur = wide 3D, High Fae = 4D/5D/6D)
- Exotic templates (tesseracts, penteracts, hexeracts)
- ~13 buildings in 2-3 minutes

## See Also

- [Dimensional Buildings Guide](tools/llm-building-designer/DIMENSIONAL_BUILDINGS.md) - LLM-based higher-dimensional building generation
- [Exotic Buildings Reference](tools/llm-building-designer/src/exotic-buildings.ts) - Algorithmic generators (reference implementation)
- [Alien Language Generator](packages/llm/README.md)
- [Alien World Generator](packages/world/README.md)
- [Alien Biome Generator](packages/environment/README.md)
- [LLM Building Designer Tool](tools/llm-building-designer/IMPORT_GUIDE.md)
