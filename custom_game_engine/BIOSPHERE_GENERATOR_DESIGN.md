# Alien Biosphere Generator - Design Document

## Overview

A complete system for procedurally generating alien planets with ecologically coherent biospheres, filling each planet with species adapted to their specific niches using deterministic generation.

## Architecture

```
PlanetConfig (seed, type, atmosphere, gravity, biomes)
    ↓
BiosphereGenerator.generateBiosphere()
    ↓
1. Analyze Planet Conditions
   - Temperature ranges per biome
   - Gravity effects on body plans
   - Atmosphere composition → respiration needs
   - Radiation levels → defensive adaptations
   - Available chemistry → diet possibilities
    ↓
2. Identify Ecological Niches
   - Energy sources (photosynthesis, chemosynthesis, predation)
   - Microhabitats (aerial, aquatic, burrowing, surface)
   - Resource levels (primary producers, herbivores, carnivores, apex predators, decomposers)
   - Size classes (microbes, small, medium, large, megafauna)
    ↓
3. Generate Species per Niche (using AlienSpeciesGenerator)
   - Body plan adapted to planet gravity + niche requirements
   - Locomotion adapted to terrain + atmosphere
   - Sensory systems adapted to atmosphere + lighting
   - Diet matching energy source
   - Reproduction adapted to environment
   - Intelligence variable (with sapient species as rare outcomes)
    ↓
4. Generate Species Descriptions (LLM)
   - Scientific name (binomial nomenclature)
   - Common name
   - Ecology and behavior
   - Relationship to other species
   - Cultural notes (if sapient)
    ↓
5. Generate Sprite Descriptions
   - Based on body plan, planet conditions, niche
   - Environmental coloration
   - Size relative to gravity
   - Atmospheric visual effects
    ↓
6. Queue Sprites for Generation
   - Add to PixelLab queue
   - Deterministic seed: planet_seed + species_id
   - Art style based on planet type
    ↓
BiosphereData {
  planet: PlanetConfig
  species: AlienSpecies[]
  foodWeb: TrophicRelationships
  nicheFilling: Map<Niche, Species[]>
  sapientSpecies: Species[]
  generationMetadata
}
```

## Components

### 1. EcologicalNicheIdentifier

Analyzes planet to determine available niches:

```typescript
interface EcologicalNiche {
  id: string;  // "primary_producer_aquatic_shallow"
  category: 'producer' | 'herbivore' | 'carnivore' | 'omnivore' | 'decomposer' | 'parasite';
  energySource: 'photosynthesis' | 'chemosynthesis' | 'herbivory' | 'predation' | 'scavenging';
  habitat: {
    biomes: BiomeType[];
    verticalZone: 'aerial' | 'surface' | 'burrowing' | 'aquatic_surface' | 'aquatic_deep' | 'canopy';
    activityPattern: 'diurnal' | 'nocturnal' | 'crepuscular' | 'continuous';
  };
  sizeClass: 'microscopic' | 'tiny' | 'small' | 'medium' | 'large' | 'megafauna';

  // Constraints from planet conditions
  constraints: {
    requiredGravityRange?: [number, number];  // [0.1, 2.0]
    requiredAtmosphere?: string[];  // ['oxygen', 'nitrogen']
    requiredTemperatureRange?: [number, number];  // [-50, 50] celsius
    requiredPressure?: [number, number];  // [0.1, 10] atmospheres
  };

  // How many species can fill this niche
  expectedSpeciesCount: number;  // Based on niche complexity
}
```

**Algorithm:**

1. **Energy Foundation**
   - Photosynthesis possible? → Check star presence, atmosphere transparency
   - Chemosynthesis possible? → Check volcanic activity, chemical gradients
   - If neither → Import-based ecosystem (meteorites, subsurface reserves)

2. **Trophic Pyramid**
   ```
   Primary Producers (photosynthetic/chemosynthetic)
      ↓ (10% energy transfer)
   Primary Consumers (herbivores)
      ↓
   Secondary Consumers (small carnivores)
      ↓
   Tertiary Consumers (apex predators)
      ↓
   Decomposers (recycle nutrients)
   ```

3. **Habitat Subdivision**
   - For each biome on planet
   - For each vertical zone (aerial, surface, burrowing)
   - For each size class
   - Create niche combination

4. **Niche Availability**
   - Ocean planet: Aquatic niches only
   - Desert planet: Burrowing niches expanded, aerial reduced
   - High gravity: Large species impossible, burrowing easier
   - Thick atmosphere: Aerial species more viable
   - Tidally locked: Twilight zone niches unique

### 2. SpeciesNicheFitter

Matches alien traits to niche requirements:

```typescript
interface NicheConstraints {
  // Body plan constraints
  bodyPlanTypes: string[];  // ['radial_platform', 'crystalline_lattice'] for sessile producers
  excludedBodyPlans: string[];  // ['humanoid_standard'] for aquatic deep niches

  // Locomotion constraints
  requiredLocomotion?: string[];  // ['swimming_undulation'] for aquatic
  excludedLocomotion?: string[];  // ['bipedal_walking'] for zero-g environments

  // Size constraints from gravity and niche
  sizeRange: {
    min: number;  // kg
    max: number;  // kg - lower on high-gravity planets
  };

  // Sensory requirements
  preferredSenses: string[];  // ['echolocation'] for dark caves, deep ocean

  // Dietary lock-ins
  diet: string[];  // Must be compatible with niche energy source

  // Intelligence range
  intelligenceRange: ['instinctual_only', 'hive_intelligence'];  // Most niches
  sapientPossible: boolean;  // Rare, but some niches allow it
}
```

**Fitting Algorithm:**

```typescript
function fitSpeciesToNiche(niche: EcologicalNiche, planet: PlanetConfig): AlienGenerationConstraints {
  const constraints: AlienGenerationConstraints = {};

  // 1. Determine environment from niche habitat
  if (niche.habitat.verticalZone === 'aquatic_deep' || niche.habitat.verticalZone === 'aquatic_surface') {
    constraints.environment = 'aquatic';
  } else if (niche.habitat.verticalZone === 'aerial') {
    constraints.environment = 'aerial';
  } else if (niche.habitat.verticalZone === 'burrowing') {
    constraints.environment = 'subterranean';
  } else {
    constraints.environment = 'terrestrial';
  }

  // 2. Intelligence based on niche (most are non-sapient, rare sapient)
  if (Math.random() < 0.05 && niche.sapientPossible) {
    constraints.intelligence = randomChoice(['proto_sapient', 'fully_sapient']);
    constraints.requireSapient = true;
  } else {
    constraints.intelligence = randomChoice(['instinctual_only', 'basic_learning', 'problem_solver']);
  }

  // 3. Danger level from position in food web
  if (niche.category === 'carnivore' && niche.sizeClass === 'large') {
    constraints.dangerLevel = randomChoice(['moderate', 'severe']);
  } else if (niche.category === 'producer' || niche.category === 'herbivore') {
    constraints.dangerLevel = randomChoice(['harmless', 'minor']);
  }

  // 4. Native world
  constraints.nativeWorld = planet.name;

  return constraints;
}
```

### 3. BiosphereGenerator (Main Class)

```typescript
interface BiosphereData {
  planet: PlanetConfig;
  niches: EcologicalNiche[];
  species: GeneratedAlienSpecies[];
  foodWeb: {
    [speciesId: string]: {
      preys: string[];  // Species this one eats
      predators: string[];  // Species that eat this one
      competitors: string[];  // Species in same niche
      mutualists: string[];  // Symbiotic relationships
    };
  };
  nicheFilling: Map<string, string[]>;  // nicheId → [speciesIds]
  sapientSpecies: GeneratedAlienSpecies[];
  statistics: {
    totalSpecies: number;
    speciesPerNiche: number;
    trophicLevels: number;
    sapientCount: number;
    generationTimeMs: number;
  };
}

class BiosphereGenerator {
  constructor(
    private alienGenerator: AlienSpeciesGenerator,
    private planetConfig: PlanetConfig
  ) {}

  async generateBiosphere(): Promise<BiosphereData> {
    // Phase 1: Analyze planet and identify niches
    const niches = this.identifyEcologicalNiches();

    // Phase 2: Generate species for each niche
    const speciesPromises = [];
    for (const niche of niches) {
      const speciesCount = niche.expectedSpeciesCount;
      for (let i = 0; i < speciesCount; i++) {
        const constraints = this.fitNicheConstraints(niche);
        speciesPromises.push(
          this.alienGenerator.generateAlienSpecies(constraints)
        );
      }
    }
    const species = await Promise.all(speciesPromises);

    // Phase 3: Build food web relationships
    const foodWeb = this.buildFoodWeb(species, niches);

    // Phase 4: Identify sapient species
    const sapientSpecies = species.filter(s =>
      s.intelligence === 'fully_sapient' ||
      s.intelligence === 'proto_sapient'
    );

    // Phase 5: Queue sprite generation
    await this.queueSpriteGeneration(species);

    return {
      planet: this.planetConfig,
      niches,
      species,
      foodWeb,
      nicheFilling: this.mapNichesToSpecies(niches, species),
      sapientSpecies,
      statistics: this.calculateStatistics(species, niches)
    };
  }

  private identifyEcologicalNiches(): EcologicalNiche[] {
    // Implementation based on planet conditions
  }

  private buildFoodWeb(species: GeneratedAlienSpecies[], niches: EcologicalNiche[]): FoodWeb {
    // Connect species based on diet and size relationships
  }

  private async queueSpriteGeneration(species: GeneratedAlienSpecies[]): Promise<void> {
    // Add each species to PixelLab sprite queue
  }
}
```

### 4. Deterministic Generation

**Seed Structure:**
```
Planet Seed: universe_seed + planet_id
  ↓
Niche Seed: planet_seed + niche_id
  ↓
Species Seed: niche_seed + species_index
  ↓
Sprite Seed: species_seed
```

**Benefits:**
- Same planet always generates same biosphere
- Time travel compatible
- Multiplayer consistent
- Debugging reproducible

### 5. Art Style Selection per Planet

```typescript
function getPlanetArtStyle(planetType: PlanetType): ArtStyle {
  const styleMap: Record<PlanetType, ArtStyle> = {
    'terrestrial': 'snes',  // 16-bit classic
    'super_earth': 'ps1',   // 32-bit chunky
    'desert': 'nes',        // 8-bit retro
    'ice': 'gameboy',       // 4-shade monochrome
    'ocean': 'gba',         // GBA water effects
    'volcanic': 'genesis',  // Sega red/orange palette
    'carbon': 'c64',        // Commodore 64 style
    'iron': 'mastersystem', // Sega 8-bit
    'tidally_locked': 'turbografx',
    'hycean': 'neogeo',     // Arcade detailed
    'rogue': 'zxspectrum',  // Dark limited palette
    'gas_dwarf': 'amiga',
    'moon': 'virtualboy',   // Red monochrome
    'magical': 'celeste',   // Modern indie
    'corrupted': 'undertale',  // Creepy pixel art
    'fungal': 'stardew',    // Organic modern
    'crystal': 'terraria',  // Colorful modern
  };

  return styleMap[planetType] || 'snes';
}
```

### 6. Sprite Queue Integration

```typescript
interface SpriteQueueEntry {
  folderId: string;  // Species ID
  description: string;  // Generated sprite prompt
  status: 'queued' | 'processing' | 'complete' | 'failed';
  queuedAt: number;
  options: {
    type: 'animal';
    size: number;  // Based on species size class
    artStyle: ArtStyle;  // Planet-specific
  };
  metadata: {
    planetId: string;
    nicheId: string;
    speciesName: string;
  };
}

async function queueBiosphereSprites(biosphere: BiosphereData): Promise<void> {
  const queue = loadSpriteQueue();
  const artStyle = getPlanetArtStyle(biosphere.planet.type);

  for (const species of biosphere.species) {
    // Determine sprite size from size class
    const sizeMap = {
      'microscopic': 16,
      'tiny': 24,
      'small': 32,
      'medium': 48,
      'large': 64,
      'megafauna': 96,
    };
    const size = sizeMap[species.sizeClass] || 48;

    queue.sprites.push({
      folderId: species.id,
      description: species.spritePrompt,
      status: 'queued',
      queuedAt: Date.now(),
      options: {
        type: 'animal',
        size,
        artStyle,
      },
      metadata: {
        planetId: biosphere.planet.id,
        nicheId: species.nicheId,
        speciesName: species.name,
      },
    });
  }

  saveSpriteQueue(queue);
}
```

## Usage Example

```typescript
// 1. Create planet
const planet: PlanetConfig = {
  id: 'exoplanet_kepler_442b',
  name: 'Kepler-442b',
  type: 'super_earth',
  seed: 'universe_alpha_001_kepler_442b',
  gravity: 1.6,
  atmosphereDensity: 1.2,
  temperatureOffset: 0.1,
  temperatureScale: 1.0,
  moistureOffset: 0.2,
  moistureScale: 1.1,
  elevationOffset: 0.0,
  elevationScale: 1.3,
  seaLevel: -0.2,
  allowedBiomes: ['ocean', 'plains', 'forest', 'mountains', 'wetland'],
};

// 2. Generate biosphere
const llmProvider = getLLMProvider();
const alienGen = new AlienSpeciesGenerator(llmProvider);
const biosphereGen = new BiosphereGenerator(alienGen, planet);

const biosphere = await biosphereGen.generateBiosphere();

console.log(`Generated ${biosphere.species.length} species`);
console.log(`Sapient species: ${biosphere.sapientSpecies.length}`);
console.log(`Trophic levels: ${biosphere.statistics.trophicLevels}`);

// 3. Queue sprites
await queueBiosphereSprites(biosphere);

// 4. Save biosphere data
saveBiosphereData(planet.id, biosphere);
```

## Niche Examples

### Ocean Planet (Hycean World)

```json
{
  "niches": [
    {
      "id": "producer_photosynthetic_surface",
      "category": "producer",
      "energySource": "photosynthesis",
      "habitat": {
        "biomes": ["ocean"],
        "verticalZone": "aquatic_surface",
        "activityPattern": "diurnal"
      },
      "sizeClass": "microscopic",
      "expectedSpeciesCount": 10
    },
    {
      "id": "herbivore_filter_feeder_surface",
      "category": "herbivore",
      "energySource": "herbivory",
      "habitat": {
        "biomes": ["ocean"],
        "verticalZone": "aquatic_surface",
        "activityPattern": "continuous"
      },
      "sizeClass": "small",
      "expectedSpeciesCount": 5
    },
    {
      "id": "carnivore_ambush_deep",
      "category": "carnivore",
      "energySource": "predation",
      "habitat": {
        "biomes": ["ocean"],
        "verticalZone": "aquatic_deep",
        "activityPattern": "nocturnal"
      },
      "sizeClass": "large",
      "expectedSpeciesCount": 2
    }
  ]
}
```

### Tidally Locked Planet

```json
{
  "niches": [
    {
      "id": "producer_twilight_zone",
      "category": "producer",
      "energySource": "photosynthesis",
      "habitat": {
        "biomes": ["plains"],
        "verticalZone": "surface",
        "activityPattern": "continuous"
      },
      "sizeClass": "medium",
      "constraints": {
        "requiredTemperatureRange": [-10, 30]
      },
      "expectedSpeciesCount": 8
    },
    {
      "id": "nocturnal_predator_night_side",
      "category": "carnivore",
      "energySource": "predation",
      "habitat": {
        "biomes": ["plains", "desert"],
        "verticalZone": "surface",
        "activityPattern": "continuous"
      },
      "sizeClass": "medium",
      "constraints": {
        "requiredTemperatureRange": [-100, -30]
      },
      "preferredSenses": ["infrared_vision", "echolocation"],
      "expectedSpeciesCount": 3
    }
  ]
}
```

## Next Steps

1. **Implement EcologicalNicheIdentifier**
   - Planet condition analyzer
   - Niche generation logic
   - Constraint calculator

2. **Implement BiosphereGenerator**
   - Niche → Species mapping
   - Food web builder
   - Sprite queue integration

3. **Create UI for Biosphere Viewing**
   - Planet overview
   - Species catalog
   - Food web visualization
   - Niche distribution chart

4. **Integrate with Game**
   - Add to planet creation flow
   - Spawn alien entities from biosphere data
   - Use generated sprites
   - Enable alien encounters

5. **Add Biosphere Evolution**
   - Species adapt over time
   - Extinctions from player actions
   - New species emerge
   - Ecosystem simulation

## File Structure

```
packages/world/src/
├── biosphere/
│   ├── BiosphereGenerator.ts         # Main generator class
│   ├── EcologicalNicheIdentifier.ts  # Niche analysis
│   ├── SpeciesNicheFitter.ts         # Constraint generation
│   ├── FoodWebBuilder.ts             # Relationship mapping
│   ├── BiosphereTypes.ts             # Type definitions
│   └── README.md                     # Documentation
├── alien-generation/
│   ├── AlienSpeciesGenerator.ts      # (Existing)
│   └── creatures/                    # (Existing trait libraries)
└── planet/
    ├── PlanetTypes.ts                # (Existing)
    └── PlanetGenerator.ts            # (Existing)
```
