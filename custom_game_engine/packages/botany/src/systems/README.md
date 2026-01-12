# Botany Systems

Plant lifecycle simulation systems for the @ai-village/botany package.

## Overview

Four coordinated systems manage complete plant simulation: lifecycle progression, population ecology, disease/pest mechanics, and knowledge discovery.

## Systems

### PlantSystem (Priority 20)

**Core lifecycle engine.** Manages stage transitions (seed→germination→growth→flowering→fruiting→death), health/hydration/nutrition mechanics, genetics application, companion planting effects, and seed production.

**Dependencies:** TimeSystem (3), WeatherSystem (5), SoilSystem (15), StateMutatorSystem (5)

**Update:** Every game hour (3600 ticks). Uses batched deltas for hydration decay, aging, damage.

**Key methods:** `setSpeciesLookup()`, `canPlantAt()`, `tryGerminateSeed()`, `getRepelledPests()`, `getAttractedCreatures()`

**Events:** `plant:stageChanged`, `plant:healthChanged`, `plant:died`, `seed:dispersed`, `seed:germinated`, `plant:nutrientConsumption`, `plant:companionEffect`

### PlantDiseaseSystem (Priority 25)

**Disease and pest simulation.** Manages disease outbreaks, contagion spread between plants, pest infestations, damage application, and environmental modifiers (weather affects disease rates).

**Dependencies:** PlantSystem (20)

**Update:** Every 6 game hours (configurable)

**Configuration:** `baseOutbreakChance`, `basePestChance`, `enableSpread`, `weatherModifiers`

**Events:** `plant:diseaseSpread`, `plant:pestInfestation`, `plant:diseaseCured`

### PlantDiscoverySystem (Priority 45)

**Knowledge and experimentation.** Tracks agent plant knowledge, reveals properties through consumption/use, applies effects (healing/magical/negative), creates discovery memories.

**Dependencies:** None (event-driven)

**Key methods:** `registerSpecies()`, `consumePlant()` returns `PlantUseResult` with effects and discoveries

### WildPlantPopulationSystem (Priority 15)

**Ecological spawning.** Manages wild plant populations via biome-based spawning, density limits, seed banks (dormant seeds in soil), seasonal dynamics.

**Dependencies:** None (runs before PlantSystem)

**Update:** Once per game day (24 hours)

**Configuration:** `maxDensity`, `minPopulation`, `spawnChance`, `crowdingRadius`

**Features:** Chunk-based density tracking, biome-specific species weights, seed viability aging

## System Execution Flow

```
1. WildPlantPopulationSystem (15) - Spawns wild plants
2. PlantSystem (20) - Lifecycle, health, growth
3. PlantDiseaseSystem (25) - Diseases spread, damage
4. PlantDiscoverySystem (45) - Knowledge updates (event-driven)
```

## Performance Notes

- **PlantSystem:** Batched vector deltas (hydration/age/health) via StateMutatorSystem, cached companion queries
- **WildPlantPopulation:** Chunk-based density tracking avoids full world scans
- **PlantDisease:** Configurable update interval (default: 6 game hours) reduces tick load

## Integration

**Component dependencies:** `PlantComponent`, `SeedComponent`, `PlantKnowledgeComponent`

**External systems:** SoilSystem (nutrients/moisture), WeatherSystem (rain/frost), TimeSystem (day/night), MemorySystem (discovery events)

**See:** Package README for full API, genetics, species definitions, and usage examples.
