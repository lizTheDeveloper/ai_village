# Biosphere Generator - Alien Ecosystem Creation

> Procedurally generates ecologically coherent alien biospheres for planets

## Overview

The Biosphere Generator creates complete alien ecosystems by:
1. Analyzing planet conditions (gravity, atmosphere, temperature, biomes)
2. Identifying ecological niches (producers, herbivores, carnivores, decomposers)
3. Generating species adapted to each niche using `AlienSpeciesGenerator`
4. Building food web relationships
5. Queueing sprite generation for all species

## Quick Start

```typescript
import { BiosphereGenerator } from '@ai-village/world/biosphere';
import { queueBiosphereSprites } from '@ai-village/world/biosphere';
import type { PlanetConfig } from '@ai-village/world';
import type { LLMProvider } from '@ai-village/core';

// 1. Define planet
const planet: PlanetConfig = {
  id: 'my_planet_001',
  name: 'New Terra',
  type: 'terrestrial',
  seed: 'universe_001_planet_001',
  gravity: 1.0,
  atmosphereDensity: 1.0,
  temperatureOffset: 0.0,
  moistureOffset: 0.0,
  elevationOffset: 0.0,
  temperatureScale: 1.0,
  moistureScale: 1.0,
  elevationScale: 1.0,
  seaLevel: -0.3,
  allowedBiomes: ['plains', 'forest', 'ocean', 'mountains'],
};

// 2. Generate biosphere
const generator = new BiosphereGenerator(llmProvider, planet);
const biosphere = await generator.generateBiosphere();

console.log(`Generated ${biosphere.species.length} species`);
console.log(`Sapient species: ${biosphere.sapientSpecies.length}`);
console.log(`Art style: ${biosphere.artStyle}`);

// 3. Queue sprites
await queueBiosphereSprites(biosphere);
```

## Architecture

```
PlanetConfig
    ↓
EcologicalNicheIdentifier
    ├─ Analyze planet conditions
    ├─ Determine energy sources (photosynthesis vs chemosynthesis)
    ├─ Identify vertical zones (aerial, surface, burrowing, aquatic)
    └─ Create niche combinations
    ↓
BiosphereGenerator
    ├─ Generate species for each niche
    ├─ Build food web (predator-prey relationships)
    ├─ Select art style (deterministic from seed)
    └─ Package biosphere data
    ↓
queueBiosphereSprites
    └─ Add to PixelLab daemon queue
```

## Components

### `EcologicalNicheIdentifier`

Analyzes planet to determine available niches:

```typescript
interface EcologicalNiche {
  id: string;  // 'herbivore_grazer_surface'
  category: 'producer' | 'herbivore' | 'carnivore' | 'decomposer';
  energySource: 'photosynthesis' | 'chemosynthesis' | 'predation';
  habitat: {
    biomes: BiomeType[];
    verticalZone: 'aerial' | 'surface' | 'burrowing' | 'aquatic_surface' | 'aquatic_deep';
    activityPattern: 'diurnal' | 'nocturnal' | 'continuous';
  };
  sizeClass: 'microscopic' | 'tiny' | 'small' | 'medium' | 'large' | 'megafauna';
  expectedSpeciesCount: number;  // How many species fill this niche
}
```

**Niche Adaptation Examples:**
- **High-gravity planet (1.6g)**: Max size limited to 'medium', more burrowing niches
- **Ocean world**: Only aquatic niches
- **Rogue planet** (starless): Only chemosynthetic producers, limited ecosystem
- **Thick atmosphere**: More aerial niches
- **Tidally locked**: Unique twilight-zone niches

### `BiosphereGenerator`

Main orchestrator:

```typescript
class BiosphereGenerator {
  constructor(llmProvider: LLMProvider, planet: PlanetConfig);

  async generateBiosphere(): Promise<BiosphereData>;
}
```

**Output:**
```typescript
interface BiosphereData {
  planet: PlanetConfig;
  niches: EcologicalNiche[];
  species: GeneratedAlienSpecies[];
  foodWeb: FoodWeb;  // Predator-prey relationships
  nicheFilling: Record<string, string[]>;  // nicheId → speciesIds
  sapientSpecies: GeneratedAlienSpecies[];  // Potential civilizations
  artStyle: string;  // 'snes', 'ps1', 'gba', etc.
  metadata: {
    totalSpecies: number;
    sapientCount: number;
    trophicLevels: number;
    generationTimeMs: number;
  };
}
```

### Food Web

Automatically builds ecological relationships:

```typescript
interface FoodWeb {
  [speciesId: string]: {
    preys: string[];        // Species this one eats
    predators: string[];    // Species that eat this one
    competitors: string[];  // Species in same niche
    mutualists: string[];   // Symbiotic partners
  };
}
```

**Food Web Rules:**
- Carnivores eat herbivores and smaller carnivores
- Herbivores eat producers
- Apex predators eat everything smaller
- Species in same niche compete

## Example: Terrestrial Planet

**New Terra** (Earth-like)
- Gravity: 1.0g
- Atmosphere: Nitrogen-oxygen
- Biomes: Plains, Forest, Ocean, Mountains

**Generated Niches (17 total):**
1. Land Photosynthesizers (producer) - 12 species
2. Aquatic Photosynthesizers (producer) - 8 species
3. Surface Grazers (herbivore) - 6 species
4. Aerial Grazers (herbivore) - 6 species
5. Aquatic Grazers (herbivore) - 10 species
6. Surface Predators (carnivore) - 6 species
7. Aerial Predators (carnivore) - 6 species
8. Aquatic Predators (carnivore) - 8 species
9. Decomposers - 3 species
10. Scavengers - 2 species
11. Parasites - 3 species

**Total: 72 species, 2 sapient, 4 trophic levels**

## Example: Ocean World

**Aquarius Prime** (Hycean)
- Gravity: 1.2g
- Atmosphere: Hydrogen
- Biomes: Ocean, Wetland (99% water coverage)

**Generated Niches (17 total):**
- Mostly aquatic niches across 3 depth zones
- Limited land producers
- Focus on filter feeders and deep-ocean predators

**Total: 46 species, 1 sapient, 4 trophic levels**

## Example: Rogue Planet

**Wanderer-7** (Starless)
- Gravity: 0.8g
- No star → no photosynthesis
- Atmosphere: Methane

**Generated Niches (1 total):**
- Only decomposers (eating imported organics from meteorites)
- No trophic pyramid

**Total: 3 species, 0 sapient, 1 trophic level**

## Art Style Selection

Each planet gets a deterministic art style based on its seed:

```typescript
function selectArtStyle(planetSeed: string): ArtStyle {
  // Hash seed → choose from 28 available styles
  // Same seed always produces same style
}
```

**Available Styles:**
- Retro: NES, SNES, Genesis, Game Boy, GBA
- 32-bit: PS1, N64, Saturn, Dreamcast
- Arcade: Neo Geo, CPS2
- Home computers: C64, Amiga, Atari ST
- Modern indie: Celeste, Undertale, Stardew Valley, Terraria

## Sprite Generation

Species are queued to the PixelLab daemon:

```typescript
await queueBiosphereSprites(biosphere);
```

**Queue Entry:**
```json
{
  "folderId": "alien_xenoform_001",
  "description": "Pixel art alien creature: bilateral symmetry body, 4-6 limbs, ...",
  "status": "queued",
  "options": {
    "type": "animal",
    "size": 48
  },
  "metadata": {
    "planetId": "my_planet_001",
    "planetName": "New Terra",
    "artStyle": "snes",
    "nicheId": "carnivore_apex_surface",
    "speciesName": "Crystal Stalker",
    "scientificName": "Xenoform crystallis"
  }
}
```

**Size Mapping:**
- Microscopic → 16px
- Tiny → 24px
- Small → 32px
- Medium → 48px
- Large → 64px
- Megafauna → 96px

## Sapient Species

~5% of species in appropriate niches become sapient:

```typescript
biosphere.sapientSpecies.forEach(species => {
  console.log(`${species.name} (${species.scientificName})`);
  console.log(`  Intelligence: ${species.intelligence}`);
  // 'proto_sapient', 'fully_sapient', 'hive_intelligence'
});
```

**Sapience-Capable Niches:**
- Surface herbivores (social groups)
- Small pack predators (cooperative hunting)
- Apex predators (intelligence for complex strategies)
- Scavengers (tool use, problem solving)

## Testing

Run test suite:

```bash
npx tsx packages/world/src/biosphere/test-biosphere-generation.ts
```

Generates biospheres for 5 test planets and saves JSON output.

## Integration

Add to planet creation:

```typescript
// When creating new planet
const planet = createPlanet({ type: 'terrestrial', ... });

// Generate biosphere
const biosphere = await new BiosphereGenerator(llm, planet).generateBiosphere();

// Store with planet data
savePlanetBiosphere(planet.id, biosphere);

// Queue sprites
await queueBiosphereSprites(biosphere);
```

## Files

```
packages/world/src/biosphere/
├── BiosphereTypes.ts              # Type definitions
├── EcologicalNicheIdentifier.ts   # Niche analysis
├── BiosphereGenerator.ts          # Main generator
├── queueBiosphereSprites.ts       # Sprite queue integration
├── test-biosphere-generation.ts   # Test script
└── README.md                      # This file
```

## Performance

- **New Terra** (72 species): ~7ms generation time
- **Ocean World** (46 species): ~2ms generation time
- **Rogue Planet** (3 species): ~2ms generation time

Fast enough for runtime generation!

## Future Enhancements

- [ ] Evolutionary simulation (species adapt over time)
- [ ] Extinction events
- [ ] Player-caused ecosystem disruption
- [ ] Invasive species when mixing biospheres
- [ ] Ecosystem health metrics
- [ ] Mutualism/symbiosis relationships
- [ ] Migration patterns
- [ ] Seasonal variations
