# Procedural Herbal Botany System
## Latitudinal Distribution, Aquatic Ecosystems, and Regional Chemotypes

> *Dedicated to:*
> - **Tarn Adams** and *Dwarf Fortress* - For teaching us that emergence comes from simple rules applied consistently
> - **Ursula K. Le Guin** - For showing that fantasy botany can be both magical and grounded in real ecology
> - **Terry Pratchett** - For plants with personality and ecosystems with opinions
> - **Every botanist who has stared at a chemotype variation table and wondered "why does soil matter so much?"**

---

## Overview

This specification defines a **procedural herbal system** where:
- **Latitude affects plant distribution** - Polar, temperate, and equatorial zones have distinct flora
- **Biomes generate specific herbology** - Forest understory, grassland, wetland, desert, and aquatic plants
- **Regional chemotypes vary** - Same species, different soil = different medicinal properties
- **Aquatic ecosystems are distinct** - Emergent, floating, submerged, and benthic zones
- **Integration with existing systems** - PlantComponent, GatheringSystem, CraftingSystem

### Core Philosophy

Plants don't know they're data structures. They just grow, or don't, according to rules they never consented to. But when a player finds *Mourning Fern* growing wild in the shadow of a northern pine, we *created the conditions* that caused it to emerge there.

This is procedural botany as world-building: not placing plants manually, but creating the **ecological logic** that makes their distribution inevitable.

---

## Part 1: Latitudinal Flora Distribution

### The Botanical Gradient

Latitude determines:
- **Temperature range** - Polar plants tolerate cold; equatorial plants demand heat
- **Growing season length** - Short at poles, year-round at equator
- **Solar intensity** - Affects photosynthesis rates and flowering
- **Seasonal variation** - Four seasons vs. wet/dry cycles

```typescript
/**
 * Latitudinal zone classification
 */
export enum LatitudeZone {
  Polar = 'polar',              // 60°-90° N/S
  Subpolar = 'subpolar',        // 45°-60°
  Temperate = 'temperate',      // 23°-45°
  Subtropical = 'subtropical',  // 10°-23°
  Tropical = 'tropical',        // 0°-10°
}

/**
 * Calculate latitude from world position
 */
function getLatitude(y: number, worldRadius: number): number {
  // World is a flat array pretending to be a sphere
  // y ranges from 0 (north pole) to worldHeight (south pole)
  const worldHeight = worldRadius * 2;
  const normalizedY = (y / worldHeight) - 0.5;  // -0.5 to 0.5
  return normalizedY * 180;  // -90 to 90 degrees
}

/**
 * Determine latitudinal zone
 */
function getLatitudeZone(latitude: number): LatitudeZone {
  const absLat = Math.abs(latitude);
  if (absLat >= 60) return LatitudeZone.Polar;
  if (absLat >= 45) return LatitudeZone.Subpolar;
  if (absLat >= 23) return LatitudeZone.Temperate;
  if (absLat >= 10) return LatitudeZone.Subtropical;
  return LatitudeZone.Tropical;
}

/**
 * Temperature modification by latitude
 */
function getTemperatureModifier(latitude: number): number {
  const absLat = Math.abs(latitude);
  // Cosine distribution: warmest at equator, coldest at poles
  return Math.cos((absLat / 90) * (Math.PI / 2));
}
```

### Zone-Specific Flora

**Polar Zone** (60°-90°):
- Plants huddle close to the ground
- Lichen, moss, dwarf shrubs
- Growing season: 2-3 months
- Example species: *Arcticwillow*, *Frostlichen*, *Permafrost Moss*

**Temperate Zone** (23°-45°):
- Maximum biodiversity
- Deciduous and coniferous forests
- Four distinct seasons
- Example species: *Goldenrod*, *Blackroot*, *Widow's Lace*

**Tropical Zone** (0°-10°):
- Year-round growth
- Rapid lifecycle, intense competition
- Vines, epiphytes, massive trees
- Example species: *Stranglervine*, *Skyfruit*, *Bloodorchid*

---

## Part 2: Biome-Specific Herbology

### 2.1 Forest Understory

The forest floor is a **shadow economy** of medicinal exchange. Trees leak their excess magic downward; mushrooms collect it like rain.

```typescript
/**
 * Forest understory plant requirements
 */
interface ForestUnderstoryPlant extends PlantSpecies {
  /** Shade tolerance (0-100, higher = more tolerant) */
  shadeTolerance: number;

  /** Requires nurse log? */
  nursLogRequired: boolean;

  /** Vertical layer */
  canopyLayer: 'ground' | 'understory' | 'shrub' | 'canopy';

  /** Mycelial association */
  mycorrhizalPartner?: string;  // Optional fungal symbiont
}

/**
 * Vertical stratification
 */
const FOREST_LAYERS = {
  canopy: { height: [15, 30], lightLevel: 100 },
  shrub: { height: [3, 15], lightLevel: 40 },
  understory: { height: [0.5, 3], lightLevel: 15 },
  ground: { height: [0, 0.5], lightLevel: 5 },
  mycelial: { height: [-1, 0], lightLevel: 0 },  // Underground
} as const;

/**
 * Example: Shadowcap Mushroom
 */
export const SHADOWCAP = definePlantSpecies('shadowcap', {
  displayName: 'Shadowcap',
  type: 'fungus',
  biomes: ['forest', 'swamp'],
  latitudeRange: [30, 60],  // Temperate to subpolar
  canopyLayer: 'ground',
  shadeTolerance: 95,
  nursLogRequired: true,  // Only grows on dead logs
  medicinalProperties: {
    compounds: [
      { name: 'umbrosin', potency: 70, effect: 'dark_vision' },
      { name: 'spore_toxin', potency: 20, effect: 'hallucination' },
    ],
  },
  help: {
    summary: 'Mushroom that grows on rotting logs in deep forest shade.',
    lore: 'Shadowcaps absorb the last dreams of dying trees. Consuming them grants vision in darkness, but also fleeting glimpses of wooden memories.',
  },
});
```

### 2.2 Grassland Apothecary

Open sky means exposure. Grassland herbs grow low, spread wide, and keep their valuable parts underground.

```typescript
/**
 * Grassland plant adaptations
 */
interface GrasslandPlant extends PlantSpecies {
  /** Fire tolerance (0-100) */
  fireResistance: number;

  /** Benefits from fire? */
  fireStimulated: boolean;

  /** Tap root depth (meters) */
  tapRootDepth: number;

  /** Wind dispersal mechanism */
  seedDispersal: 'wind' | 'animal' | 'explosive' | 'gravity';

  /** Grazing tolerance */
  grazingRecovery: number;  // 0-100
}

/**
 * Example: Prairie Sage
 */
export const PRAIRIE_SAGE = definePlantSpecies('prairie_sage', {
  displayName: 'Prairie Sage',
  type: 'herb',
  biomes: ['grassland', 'savanna'],
  latitudeRange: [20, 50],
  fireResistance: 80,
  fireStimulated: true,  // Blooms after fires
  tapRootDepth: 3.0,  // Deep root for drought
  seedDispersal: 'wind',
  grazingRecovery: 60,
  medicinalProperties: {
    compounds: [
      { name: 'sage_oil', potency: 50, effect: 'clarity' },
      { name: 'fire_essence', potency: 30, effect: 'purification' },
    ],
  },
});
```

### 2.3 Wetland Pharmacopoeia

Wetlands are where water and land conduct their ongoing divorce proceedings. Plants here tolerate flooding and contain more medicinal alkaloids than seems strictly necessary.

```typescript
/**
 * Wetland plant component
 */
interface WetlandPlant extends PlantSpecies {
  /** Flood tolerance (days) */
  floodTolerance: number;

  /** Anaerobic soil tolerance */
  anaerobicAdaptation: boolean;

  /** Aerenchyma tissue (internal air channels) */
  hasAerenchyma: boolean;

  /** Rhizomatic spreading */
  rhizomaticGrowth: boolean;

  /** Tannin content (chemical warfare against decay) */
  tanninLevel: number;  // 0-100
}

/**
 * Example: Swamp Willow
 */
export const SWAMP_WILLOW = definePlantSpecies('swamp_willow', {
  displayName: 'Swamp Willow',
  type: 'tree',
  biomes: ['wetland', 'swamp'],
  floodTolerance: 180,  // Can survive 6 months flooded
  anaerobicAdaptation: true,
  hasAerenchyma: true,
  rhizomaticGrowth: true,
  tanninLevel: 75,
  medicinalProperties: {
    compounds: [
      { name: 'salicylic_acid', potency: 60, effect: 'pain_relief' },
      { name: 'marsh_tannin', potency: 40, effect: 'preservation' },
    ],
  },
});
```

### 2.4 Desert Pharmaceutical Minimalism

Deserts practice herbal Buddhism—less is more, water is sacred, and every leaf is an expensive mistake. Magic here concentrates like evaporated brine.

```typescript
/**
 * Desert plant adaptations
 */
interface DesertPlant extends PlantSpecies {
  /** CAM photosynthesis (night breathing) */
  camPhotosynthesis: boolean;

  /** Water storage capacity (liters) */
  waterStorageCapacity: number;

  /** Resin/oil armor */
  volatileOilContent: number;  // 0-100

  /** Seed dormancy period (years) */
  seedDormancyMax: number;

  /** Drought tolerance (days without water) */
  droughtTolerance: number;
}

/**
 * Example: Desert Sage
 */
export const DESERT_SAGE = definePlantSpecies('desert_sage', {
  displayName: 'Desert Sage',
  type: 'shrub',
  biomes: ['desert', 'badlands'],
  camPhotosynthesis: true,
  waterStorageCapacity: 0.5,
  volatileOilContent: 85,  // Heavy resin coating
  seedDormancyMax: 10,  // Seeds can wait a decade
  droughtTolerance: 365,  // Can survive a year dry
  medicinalProperties: {
    compounds: [
      { name: 'desert_resin', potency: 80, effect: 'focus' },
      { name: 'solar_essence', potency: 50, effect: 'heat_resistance' },
    ],
  },
});
```

---

## Part 3: Aquatic Herbology

Underwater plants occupy a space between plant and not-plant, breathing through their leaves, anchored in sediment that may contain anything from silt to the corpses of small gods.

### Water Depth Zones

```typescript
/**
 * Aquatic depth classification
 */
export enum WaterDepth {
  Shore = 0,      // 0-1 tiles: emergent plants
  Shallow = 1,    // 1-5 tiles: floating/rooted
  Medium = 5,     // 5-15 tiles: submerged
  Deep = 15,      // 15-50 tiles: benthic
  Abyssal = 50,   // 50+ tiles: void specialists
}

/**
 * Aquatic plant zones
 */
interface AquaticPlant extends PlantSpecies {
  /** Optimal depth range */
  depthRange: [number, number];

  /** Aquatic zone */
  aquaticZone: 'emergent' | 'floating' | 'submerged' | 'benthic';

  /** Salinity tolerance */
  salinityTolerance: {
    freshwater: boolean;
    brackish: boolean;
    marine: boolean;
  };

  /** Oxygen production (for fish) */
  oxygenProduction: number;  // 0-100

  /** Bioluminescent */
  bioluminescent: boolean;
}
```

### Emergent Zone (Stems in water, leaves in air)

Identity crisis embodied. Duck food and magical catalyst.

```typescript
/**
 * Example: Starwater Lotus
 */
export const STARWATER_LOTUS = definePlantSpecies('starwater_lotus', {
  displayName: 'Starwater Lotus',
  type: 'aquatic_flower',
  biomes: ['lake', 'pond', 'slow_river'],
  depthRange: [0, 2],
  aquaticZone: 'emergent',
  salinityTolerance: {
    freshwater: true,
    brackish: false,
    marine: false,
  },
  oxygenProduction: 40,
  medicinalProperties: {
    compounds: [
      { name: 'lotus_nectar', potency: 70, effect: 'tranquility' },
      { name: 'starlight_pollen', potency: 50, effect: 'lucid_dreams' },
    ],
  },
  help: {
    summary: 'Luminous lotus that blooms at night on still water.',
    lore: 'Starwater Lotus petals reflect moonlight so perfectly that fish mistake them for fallen stars. Herbalists harvest them at dawn, before the flowers close.',
  },
});
```

### Floating Zone (Untethered optimists)

No roots, all surface area. Prone to forming empires.

```typescript
/**
 * Example: Drifting Sage
 */
export const DRIFTING_SAGE = definePlantSpecies('drifting_sage', {
  displayName: 'Drifting Sage',
  type: 'aquatic_herb',
  biomes: ['lake', 'slow_river'],
  depthRange: [0.5, 5],
  aquaticZone: 'floating',
  salinityTolerance: {
    freshwater: true,
    brackish: true,
    marine: false,
  },
  oxygenProduction: 60,
  medicinalProperties: {
    compounds: [
      { name: 'water_wisdom', potency: 60, effect: 'meditation' },
      { name: 'drift_essence', potency: 40, effect: 'flow_state' },
    ],
  },
  ecologicalBehavior: {
    formsMats: true,  // Can cover entire ponds
    rapidGrowth: true,
    canBlock: 'light',  // Shades underwater plants
  },
});
```

### Submerged Zone (Committed to the bit)

Photosynthesis through green murk. Oxygenate water (heroes, mostly unappreciated).

```typescript
/**
 * Example: Silkweed
 */
export const SILKWEED = definePlantSpecies('silkweed', {
  displayName: 'Silkweed',
  type: 'aquatic_grass',
  biomes: ['lake', 'river'],
  depthRange: [2, 15],
  aquaticZone: 'submerged',
  salinityTolerance: {
    freshwater: true,
    brackish: true,
    marine: false,
  },
  oxygenProduction: 90,  // Primary oxygenator
  medicinalProperties: {
    compounds: [
      { name: 'aquatic_fiber', potency: 30, effect: 'water_breathing' },
      { name: 'oxygen_essence', potency: 50, effect: 'stamina' },
    ],
  },
  help: {
    summary: 'Underwater grass meadows that produce oxygen for fish.',
    lore: 'Fish gather in Silkweed meadows like travelers at an inn. The grass whispers with dissolved air, and breathing is easier here.',
  },
});
```

### Benthic Zone (Dark, cold, knows things)

Deep water specialists. Bioluminescent (for courtship or warning, unclear).

```typescript
/**
 * Example: Abyssal Fern
 */
export const ABYSSAL_FERN = definePlantSpecies('abyssal_fern', {
  displayName: 'Abyssal Fern',
  type: 'deep_aquatic',
  biomes: ['deep_lake', 'ocean'],
  depthRange: [50, 200],
  aquaticZone: 'benthic',
  salinityTolerance: {
    freshwater: true,
    brackish: true,
    marine: true,
  },
  oxygenProduction: 10,  // Minimal, no light
  bioluminescent: true,
  medicinalProperties: {
    compounds: [
      { name: 'deep_glow', potency: 80, effect: 'dark_vision' },
      { name: 'pressure_adapt', potency: 70, effect: 'depth_tolerance' },
    ],
  },
  help: {
    summary: 'Glowing fern found in absolute darkness of deep water.',
    lore: 'Abyssal Fern emits a pale green light. Deep divers say it remembers things that happened in the water above, storing memories in bioluminescent patterns.',
  },
});
```

---

## Part 4: Regional Chemotype Variation

The same species, *Artemisia vulgaris*, means different things in different soils. In volcanic ash, it concentrates selenium. In chalk, it becomes bitter with calcium. This is **chemotype variation**.

### Soil-Based Modification

```typescript
/**
 * Regional chemotype system
 */
interface RegionalChemotype {
  /** Base plant species */
  baseSpecies: PlantSpecies;

  /** Soil and environmental conditions */
  region: {
    soilType: 'volcanic' | 'calcareous' | 'sandy' | 'clay' | 'peat' | 'loam';
    mineralProfile: string[];  // ['iron', 'selenium', 'calcium']
    pH: number;  // 0-14
    elevation: number;
    proximity?: 'coast' | 'mountain' | 'river' | 'ley_line';
  };

  /** How properties change */
  modifications: {
    activeCompounds: Array<{ compound: string; multiplier: number }>;
    newCompounds?: string[];  // Compounds that appear
    flavor: TasteProfile;
    potency: number;  // Overall modifier
    color?: string;  // Visual variation
  };
}

/**
 * Example: Moonflower regional variation
 */
const NORTHERN_MOONFLOWER: RegionalChemotype = {
  baseSpecies: MOONFLOWER,
  region: {
    soilType: 'calcareous',
    mineralProfile: ['calcium', 'magnesium'],
    pH: 8.0,  // Alkaline
    elevation: 1000,
    proximity: 'mountain',
  },
  modifications: {
    activeCompounds: [
      { compound: 'lunar_essence', multiplier: 0.7 },  // Reduced
      { compound: 'frost_dream', multiplier: 1.5 },    // Increased
    ],
    newCompounds: ['calcium_carbonate'],
    flavor: { bitter: 40, sweet: 10, astringent: 60 },
    potency: 0.9,
    color: 'pale_blue',
  },
};

const SOUTHERN_MOONFLOWER: RegionalChemotype = {
  baseSpecies: MOONFLOWER,
  region: {
    soilType: 'peat',
    mineralProfile: ['iron', 'nitrogen'],
    pH: 5.5,  // Acidic
    elevation: 10,
    proximity: 'coast',
  },
  modifications: {
    activeCompounds: [
      { compound: 'lunar_essence', multiplier: 1.3 },
      { compound: 'rot_dream', multiplier: 2.0 },  // New compound emerges
    ],
    newCompounds: ['iron_tannin'],
    flavor: { bitter: 70, earthy: 80, sweet: 5 },
    potency: 1.2,
    color: 'indigo',
  },
};

/**
 * Apply regional modification to plant instance
 */
function applyRegionalModification(
  plant: PlantInstance,
  tile: Tile
): PlantInstance {
  const chemotype = getRegionalChemotype(plant.speciesId, tile);
  if (!chemotype) return plant;

  // Modify medicinal properties
  const modified = { ...plant };
  modified.medicinalProperties = applyChemotypeModifications(
    plant.medicinalProperties,
    chemotype.modifications
  );

  // Visual variation
  if (chemotype.modifications.color) {
    modified.appearance.color = chemotype.modifications.color;
  }

  return modified;
}
```

---

## Part 5: Plant Distribution Algorithm

### Spawn Probability

```typescript
/**
 * Determine if a plant should spawn at a tile
 */
function shouldPlantSpawnHere(
  plant: PlantSpecies,
  tile: {
    biome: BiomeType;
    latitude: number;
    elevation: number;
    moisture: number;
    temperature: number;
    soilType: string;
    waterDepth?: number;
  }
): boolean {
  // 1. Biome compatibility
  if (!plant.biomes.includes(tile.biome)) {
    return false;
  }

  // 2. Latitudinal range
  const latRange = plant.latitudeRange ?? [-90, 90];
  if (tile.latitude < latRange[0] || tile.latitude > latRange[1]) {
    return false;
  }

  // 3. Temperature tolerance
  const temp = calculateTemperature(tile.latitude, tile.elevation);
  const tempRange = plant.optimalTemperatureRange ?? [-50, 50];
  if (temp < tempRange[0] - 10 || temp > tempRange[1] + 10) {
    return false;
  }

  // 4. Moisture requirements
  const moistRange = plant.optimalMoistureRange ?? [0, 100];
  if (tile.moisture < moistRange[0] - 20 || tile.moisture > moistRange[1] + 20) {
    return false;
  }

  // 5. Aquatic depth check
  if (plant.aquaticZone) {
    if (!tile.waterDepth) return false;  // Needs water
    const depthRange = plant.depthRange ?? [0, 1000];
    if (tile.waterDepth < depthRange[0] || tile.waterDepth > depthRange[1]) {
      return false;
    }
  }

  // 6. Soil compatibility
  if (plant.requiredSoilType && tile.soilType !== plant.requiredSoilType) {
    return false;
  }

  // 7. Rarity-based spawn chance
  const spawnChance = getRaritySpawnChance(plant.rarity);
  return Math.random() < spawnChance;
}

/**
 * Rarity to spawn probability
 */
function getRaritySpawnChance(rarity: PlantRarity): number {
  switch (rarity) {
    case 'common': return 0.3;      // 30% if conditions met
    case 'uncommon': return 0.1;    // 10%
    case 'rare': return 0.03;       // 3%
    case 'very_rare': return 0.01;  // 1%
    case 'legendary': return 0.001; // 0.1%
  }
}
```

### World Generation Integration

```typescript
/**
 * Populate world with plants during generation
 */
export class PlantPopulationSystem {
  /**
   * Generate plants for a tile
   */
  populateTile(tile: Tile, world: World): void {
    const allPlantSpecies = world.plantRegistry.getAllSpecies();

    for (const species of allPlantSpecies) {
      if (shouldPlantSpawnHere(species, tile)) {
        // Create plant instance
        const plant = world.createEntity();
        plant.addComponent<PlantComponent>(CT.Plant, {
          speciesId: species.id,
          growthStage: Math.random() > 0.8 ? 'mature' : 'growing',
          health: 100,
          age: Math.random() * species.maturityAge,
        });

        // Apply regional modifications
        const modified = applyRegionalModification(plant, tile);

        // Place at tile
        plant.addComponent<PositionComponent>(CT.Position, {
          x: tile.x,
          y: tile.y,
        });

        // Add to world
        world.addEntity(plant);
      }
    }
  }

  /**
   * Populate entire world
   */
  populateWorld(world: World): void {
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.getTile(x, y);
        this.populateTile(tile, world);
      }
    }
  }
}
```

---

## Part 6: Integration with Existing Systems

### 6.1 PlantComponent

Extend existing PlantComponent to support regional variation:

```typescript
/**
 * Enhanced PlantComponent
 */
interface PlantComponent extends Component {
  readonly type: 'plant';

  /** Species ID */
  speciesId: string;

  /** Growth stage */
  growthStage: 'seed' | 'sprout' | 'growing' | 'mature' | 'flowering' | 'seeding';

  /** Current health */
  health: number;

  /** Age in ticks */
  age: number;

  /** Regional chemotype applied */
  chemotype?: RegionalChemotype;

  /** Medicinal properties (potentially modified by region) */
  medicinalProperties: MedicinalProperties;

  /** Visual appearance (potentially modified by region) */
  appearance: {
    color: string;
    size: number;
    bioluminescent?: boolean;
  };

  /** For aquatic plants */
  oxygenProduction?: number;
}
```

### 6.2 GatheringSystem

When gathering plants, chemotype affects yield:

```typescript
/**
 * Harvest plant with regional variation
 */
function harvestPlant(plant: Entity, gatherer: Entity, world: World): void {
  const plantComp = plant.getComponent<PlantComponent>(CT.Plant);
  if (!plantComp) return;

  const species = world.plantRegistry.getSpecies(plantComp.speciesId);
  if (!species.isGatherable) return;

  // Determine yield
  const baseYield = species.gatherYield ?? 1;
  const potencyMod = plantComp.chemotype?.modifications.potency ?? 1.0;
  const finalYield = Math.floor(baseYield * potencyMod);

  // Create gathered item
  const item = {
    definitionId: `herb_${species.id}`,
    quantity: finalYield,
    metadata: {
      chemotype: plantComp.chemotype?.region,
      harvestedAt: world.tick,
      gatheredBy: gatherer.id,
    },
  };

  // Add to gatherer's inventory
  const inventory = gatherer.getComponent<InventoryComponent>(CT.Inventory);
  addToInventory(inventory, item);

  // Plant may regenerate or die
  if (species.regeneratesAfterHarvest) {
    plantComp.growthStage = 'growing';
    plantComp.health = 50;
  } else {
    world.removeEntity(plant.id);
  }
}
```

### 6.3 CraftingSystem

Chemotype affects potion/medicine crafting:

```typescript
/**
 * Craft medicine using herbs with regional variation
 */
function craftMedicine(
  recipe: CraftingRecipe,
  ingredients: ItemInstance[],
  world: World
): ItemInstance | null {
  // Check if ingredients have chemotype metadata
  const herbIngredients = ingredients.filter(i => i.metadata?.chemotype);

  let potencyBonus = 1.0;
  const specialEffects: string[] = [];

  for (const herb of herbIngredients) {
    const chemotype = herb.metadata.chemotype;
    if (chemotype) {
      // Volcanic soil herbs boost fire-based potions
      if (chemotype.soilType === 'volcanic' && recipe.type === 'fire_potion') {
        potencyBonus *= 1.3;
      }

      // Coastal herbs add salt effects
      if (chemotype.proximity === 'coast') {
        specialEffects.push('preservation');
      }

      // Ley line proximity adds magical potency
      if (chemotype.proximity === 'ley_line') {
        potencyBonus *= 1.5;
        specialEffects.push('arcane_resonance');
      }
    }
  }

  // Create result item
  const result = {
    definitionId: recipe.resultItemId,
    quantity: recipe.resultQuantity,
    metadata: {
      potency: (recipe.basePotency ?? 1.0) * potencyBonus,
      specialEffects,
      craftedAt: world.tick,
    },
  };

  return result;
}
```

---

## Part 7: Aquatic Oxygen Production

Submerged plants produce oxygen. Fish breathe it. This creates underwater meadows where breathing is easier.

### Oxygen Saturation System

```typescript
/**
 * Track oxygen levels in water tiles
 */
interface WaterTileComponent extends Component {
  readonly type: 'water_tile';

  /** Current oxygen saturation (0-200%) */
  oxygenSaturation: number;

  /** Depth in tiles */
  depth: number;

  /** Temperature (affects oxygen capacity) */
  temperature: number;
}

/**
 * Aquatic Plant Oxygen System
 */
export class AquaticOxygenSystem implements System {
  public readonly id: SystemId = 'aquatic_oxygen';
  public readonly priority: number = 70;

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Find all submerged plants
    const aquaticPlants = world.query()
      .with(CT.Plant)
      .with(CT.Position)
      .executeEntities()
      .filter(e => {
        const plant = e.getComponent<PlantComponent>(CT.Plant);
        const species = world.plantRegistry.getSpecies(plant.speciesId);
        return species.aquaticZone === 'submerged' && species.oxygenProduction > 0;
      });

    // Each plant adds oxygen to its tile
    for (const plantEntity of aquaticPlants) {
      const position = plantEntity.getComponent<PositionComponent>(CT.Position);
      const plant = plantEntity.getComponent<PlantComponent>(CT.Plant);
      const species = world.plantRegistry.getSpecies(plant.speciesId);

      const tile = world.getTile(position.x, position.y);
      const waterTile = tile.getComponent<WaterTileComponent>(CT.WaterTile);
      if (!waterTile) continue;

      // Add oxygen (scaled by plant health and maturity)
      const healthMod = plant.health / 100;
      const maturityMod = plant.growthStage === 'mature' ? 1.0 : 0.5;
      const oxygenAdded = species.oxygenProduction * healthMod * maturityMod * deltaTime;

      // Explicit saturation at physical maximum (200% = super-saturated water)
      const newSaturation = waterTile.oxygenSaturation + oxygenAdded;
      if (newSaturation > 200) {
        waterTile.oxygenSaturation = 200;  // Physical maximum
        // Excess oxygen bubbles out (could emit event for visual effect)
      } else {
        waterTile.oxygenSaturation = newSaturation;
      }
    }

    // Oxygen naturally diffuses and depletes
    this.diffuseOxygen(world);
  }

  /**
   * Oxygen diffuses between adjacent water tiles
   */
  private diffuseOxygen(world: World): void {
    // Simplified diffusion: average with neighbors
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.getTile(x, y);
        const waterTile = tile.getComponent<WaterTileComponent>(CT.WaterTile);
        if (!waterTile) continue;

        // Get neighbor oxygen levels
        const neighbors = getNeighborTiles(x, y, world);
        const waterNeighbors = neighbors
          .map(t => t.getComponent<WaterTileComponent>(CT.WaterTile))
          .filter(w => w !== undefined);

        if (waterNeighbors.length === 0) continue;

        // Average oxygen levels
        const avgOxygen = waterNeighbors.reduce((sum, w) => sum + w.oxygenSaturation, 0) / waterNeighbors.length;
        const diffusionRate = 0.1;  // 10% per tick
        waterTile.oxygenSaturation += (avgOxygen - waterTile.oxygenSaturation) * diffusionRate;
      }
    }
  }
}

/**
 * Fish use oxygen levels
 */
function updateFishBehavior(fish: Entity, world: World): void {
  const position = fish.getComponent<PositionComponent>(CT.Position);
  const tile = world.getTile(position.x, position.y);
  const waterTile = tile.getComponent<WaterTileComponent>(CT.WaterTile);

  if (!waterTile) return;

  const needs = fish.getComponent<NeedsComponent>(CT.Needs);

  // Low oxygen = fish seeks better water
  if (waterTile.oxygenSaturation < 50) {
    needs.stamina -= 1;  // Suffocating
    // AI should seek high-oxygen areas (Silkweed meadows)
  } else if (waterTile.oxygenSaturation > 70) {
    needs.stamina += 0.5;  // Thriving
  }
}
```

---

## Dependencies & Integration

### Depends On (Prerequisites)
These systems must be implemented before this spec:
- **World Generation System** - For generating latitudinal zones and biomes
- **Chunk System** - Tile-based world structure for plant placement
- **Plant System** - Existing PlantComponent and growth mechanics
- **Gathering System** - Agent ability to harvest plants

### Integrates With (Parallel Systems)
These systems work alongside this spec:
- **Crafting System** - Uses regional chemotypes for recipe bonuses and potion creation
- **Item System** - Stores chemotype metadata on harvested herbs

### Enables (Dependent Systems)
These systems build on top of this spec:
- **Medicine Crafting** - Advanced potion and remedy system using regional plant variations
- **Regional Plant Variety** - Procedural chemotype generation for different soil types
- **Aquatic Ecosystems** - Underwater plant zones and oxygen production for fish

---

## Part 8: Implementation Checklist

### Phase 1: Core Systems
- [ ] Define `PlantSpecies` interface with latitude, biome, and chemotype support
- [ ] Implement `getLatitudeZone()` and `getTemperatureModifier()`
- [ ] Create `PlantRegistry` to store all plant species
- [ ] Extend `PlantComponent` with chemotype and regional properties

### Phase 2: Biome-Specific Plants
- [ ] Define forest understory plants (Shadowcap, Mourning Fern, Widow's Lace)
- [ ] Define grassland plants (Prairie Sage, etc.)
- [ ] Define wetland plants (Swamp Willow, etc.)
- [ ] Define desert plants (Desert Sage, etc.)
- [ ] Add biome compatibility checks to spawn algorithm

### Phase 3: Aquatic Ecosystem
- [ ] Define aquatic depth zones (emergent, floating, submerged, benthic)
- [ ] Create aquatic plant species (Starwater Lotus, Drifting Sage, Silkweed, Abyssal Fern)
- [ ] Implement `WaterTileComponent` with oxygen saturation
- [ ] Create `AquaticOxygenSystem` for oxygen production/diffusion
- [ ] Integrate oxygen levels with fish AI

### Phase 4: Regional Chemotypes
- [ ] Define `RegionalChemotype` system
- [ ] Implement `applyRegionalModification()` based on soil, elevation, proximity
- [ ] Create example chemotypes (Northern Moonflower, Southern Moonflower)
- [ ] Add chemotype metadata to harvested items
- [ ] Update crafting system to use chemotype bonuses

### Phase 5: World Generation
- [ ] Implement `PlantPopulationSystem`
- [ ] Call `populateWorld()` during world generation
- [ ] Add `shouldPlantSpawnHere()` spawn logic
- [ ] Test latitudinal distribution (arctic, temperate, tropical)
- [ ] Test biome-specific spawning

### Phase 6: Integration & Polish
- [ ] Update `GatheringSystem` to respect chemotypes
- [ ] Update `CraftingSystem` to apply regional bonuses
- [ ] Add plant species to item definitions
- [ ] Write help entries for medicinal plants
- [ ] Test end-to-end: spawn → gather → craft → use

---

## Research Questions

1. **Genetic Drift**: Should plants in isolated regions develop subspecies over time?
2. **Invasive Species**: Can plants spread to non-native biomes if carried by agents?
3. **Pollination**: Should flowering plants require pollinators (bees, birds)?
4. **Seasonal Variation**: How do seasonal cycles affect plant availability?
5. **Magical Mutation**: Can ley line proximity cause plants to mutate?
6. **Underwater Forests**: Should kelp forests have canopy stratification like land forests?
7. **Player Cultivation**: Can players farm plants in non-native biomes (with penalties)?

---

## Conclusion: On the Ethics of Procedural Botany

We create these plants—give them Latin names, medicinal properties, ecological niches—and then let algorithms decide where they grow. There's something quietly mythic about that. The plants don't know they're data structures. They just grow, or don't, according to rules they never consented to.

But perhaps that's not so different from actual plants.

The difference is that when a player finds *Mourning Fern* growing wild in the shadow of a northern pine, we *created the conditions* that caused it to emerge there, which might be the same thing as placing it manually, or might be fundamentally different.

Magic systems, herbal lore, ecological simulation—all of it is just different ways of asking the same question: *What does it mean for a thing to grow?*

The answer, encoded in Perlin noise and spawn weights and chemical compound tables, is both everything and nothing.

The plants, mercifully, do not philosophize.

They just grow.

---

*End of specification. May your herbs be potent, your chemotypes favorable, and your wetlands navigable.*
