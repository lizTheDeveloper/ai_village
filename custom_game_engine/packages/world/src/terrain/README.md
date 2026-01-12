# Terrain Generation

Procedural terrain generation using Perlin noise for world tiles. Generates elevation, biomes, terrain types, and places entities (trees, rocks, ore deposits, animals).

## TerrainGenerator

**Location:** `TerrainGenerator.ts`

Generates chunks using multi-octave Perlin noise with configurable seed for deterministic worlds.

### Noise Layers

- **Elevation:** Multi-scale (detail, regional, biome, continental) with ridged noise for mountains
- **Moisture:** Biome-scale patterns (~20km) for climate zones
- **Temperature:** Continental-scale (~200km) for large climate bands

### Generation Process

```typescript
const generator = new TerrainGenerator('my-seed', godCraftedSpawner);
generator.generateChunk(chunk, world);
```

1. **Tiles:** Generate terrain type, biome, elevation (-3 to 15), moisture/fertility (0-100)
2. **MapKnowledge:** Update sector terrain data for pathfinding
3. **Entities:** Place trees, rocks, mountains, ore deposits based on biome/noise
4. **Animals:** Spawn wild animals via `WildAnimalSpawningSystem`
5. **God-crafted:** Spawn divine content via `GodCraftedDiscoverySystem` (optional)

### Terrain Types

- `grass`, `dirt`, `forest` - Vegetation
- `water` - Rivers and oceans
- `stone` - Mountains and cliffs
- `sand` - Beaches and deserts

### Biomes

- `plains` - Fertility 70-80, grassland
- `forest` - Fertility 60-70, dense trees
- `river` - Fertility 80-90, water edges
- `desert` - Fertility 20-30, hot/dry
- `mountains` - Fertility 40-50, high elevation (>0.5)
- `ocean` - Deep water, not farmable

### Elevation Mapping

- Water: -3 to -1 (below sea level)
- Plains: -1 to 2 (gentle rolling)
- Hills: 2 to 6 (elevation >0.15)
- Mountains: 6 to 15 (elevation >0.5, uses ridged noise)

### Entity Placement

- **Trees:** 80% in forests (height 1-4), 30% on grass (height 0-2)
- **Rocks:** 50% on stone, 10% on beaches, 25% in desert, 5% near spawn
- **Mountains:** 15% in mountain biome (height 3-18)
- **Ore deposits:** Iron (15%), Coal (10%), Copper (5%), Gold (2% rare)
- **Plants:** Leaf piles (30% forests), Fiber plants (15% grass)

## PerlinNoise

**Location:** `PerlinNoise.ts`

Ken Perlin's improved noise (2002) implementation with seeded random for deterministic generation.

```typescript
const noise = new PerlinNoise(seed);
const value = noise.noise(x, y); // -1 to 1
const octave = noise.octaveNoise(x, y, 6, 0.5); // Multi-frequency
```

**Octave noise:** Combines multiple frequencies (octaves) with persistence for fractal detail.

## Scale Reference

1 tile = 1 meter, humans = 2 tiles tall.

- Detail (0.005): ~200m - hills, groves
- Regional (0.0005): ~2km - forests, valleys
- Biome (0.00005): ~20km - climate zones
- Continental (0.000005): ~200km - land masses

## Utilities

- **HorizonCalculator:** Line-of-sight calculations using elevation
- **TerrainFeatureAnalyzer:** Identify rivers, lakes, coastlines from tiles
- **TerrainDescriptionCache:** LLM-friendly terrain descriptions with caching
