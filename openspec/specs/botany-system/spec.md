# Procedural Herbal Botany System Specification

> **System:** botany-system
> **Version:** 1.0
> **Status:** In Progress
> **Last Updated:** 2026-01-02

## Purpose

Procedural herbal system where latitude, biome, and soil affect plant distribution and medicinal chemotypes.

## Overview

Procedural herbal system where latitude, biome, and soil affect plant distribution and medicinal properties. Same species in different regions produces different chemotypes (chemical variations). Includes aquatic ecosystems with depth-based zonation.

**Core Philosophy:** Plants emerge from ecological logic, not manual placement. Create the conditions; distribution becomes inevitable.

## Core Requirements

### Requirement: Latitudinal Flora Distribution

Plants distribute by latitude zones:
- **Polar** (60°-90°) - Lichen, moss, dwarf shrubs, 2-3 month growing season
- **Subpolar** (45°-60°) - Boreal forests, short summers
- **Temperate** (23°-45°) - Maximum biodiversity, four seasons
- **Subtropical** (10°-23°) - Mild winters, long growing season
- **Tropical** (0°-10°) - Year-round growth, intense competition

Temperature modifier calculated from latitude using cosine distribution (warmest at equator, coldest at poles).

### Requirement: Biome-Specific Herbology

Each biome has unique medicinal plants:
- **Forest Understory** - Shade-tolerant, nurse log dependent, mycorrhizal partners (Shadowcap mushroom)
- **Grassland** - Fire-resistant, deep tap roots, wind dispersal (Prairie Sage)
- **Wetland** - Flood-tolerant, aerenchyma tissue, high tannins (Swamp Willow)
- **Desert** - CAM photosynthesis, water storage, volatile oils, long seed dormancy (Desert Sage)

### Requirement: Aquatic Ecosystems

Depth-based plant zonation:
- **Emergent Zone** (0-1 tiles) - Stems in water, leaves in air (Reeds, Cattails)
- **Floating Zone** (surface) - Free-floating or anchored (Lotus, Lily pads)
- **Submerged Zone** (1-15 tiles) - Fully underwater, oxygenating (Watergrass)
- **Benthic Zone** (15-50+ tiles) - Bottom-dwelling, low-light specialists (Deeproot)

Salinity tolerance: freshwater, brackish, marine.

### Requirement: Regional Chemotypes

Same species, different soil → different medicinal properties:
- **Mountain Chamomile** - Volcanic soil → high anti-inflammatory
- **Lowland Chamomile** - River silt → sedative compounds
- **Coastal Chamomile** - Salt-stressed → analgesic salts

Chemotype determined by: soil mineral content, pH, water availability, competition.

## Implementation Files

> **Note:** This system is IN PROGRESS

**Components:**
- `packages/core/src/components/PlantComponent.ts` - Extended with latitude, biome, chemotype
- `packages/core/src/components/SoilComponent.ts` - Soil mineral composition
- `packages/world/src/biomes/BiomeRegistry.ts` - Biome-specific plant lists

**Systems:**
- `packages/core/src/systems/PlantGrowthSystem.ts` - Latitude-aware growth
- `packages/core/src/systems/ChemotypeSystem.ts` - Regional medicinal variation

**Registry:**
- `packages/core/src/plants/PlantSpecies.ts` - All plant definitions
- `packages/core/src/plants/MedicinalCompounds.ts` - Chemical compound library

## Components

### Component: PlantComponent (Extended)
**Type:** `plant`
**Purpose:** Track plant growth and properties

**Properties:**
- `speciesId: string` - Plant species identifier
- `biomes: string[]` - Valid biomes for this species
- `latitudeRange: [number, number]` - Min/max latitude (-90 to 90)
- `shadeTolerance: number` - 0-100 (0 = full sun, 100 = deep shade)
- `waterRequirement: number` - 0-100 (0 = desert, 100 = aquatic)
- `soilType: string[]` - Valid soil types (sandy, loamy, clay, volcanic, etc.)
- `growthStage: number` - 0-1 maturity
- `medicinalProperties: MedicinalCompound[]` - Chemical compounds
- `chemotype: string | null` - Regional variant (mountain, lowland, coastal, etc.)

### Component: PlantSpecies (Type Definition)
**Purpose:** Define plant species characteristics

**Properties:**
- `id: string` - Unique species ID
- `displayName: string` - Human-readable name
- `type: PlantType` - herb, shrub, tree, fungus, grass, aquatic
- `biomes: string[]` - Valid biomes
- `latitudeRange: [number, number]` - Growing latitude
- `canopyLayer: CanopyLayer` - ground, understory, shrub, canopy
- `medicinalProperties: object` - Base medicinal compounds
- `chemotypeVariations: ChemotypeVariation[]` - Regional variants

### Component: MedicinalCompound
**Purpose:** Define chemical compound properties

**Properties:**
- `name: string` - Compound name (salicylic_acid, umbrosin, etc.)
- `potency: number` - 0-100 strength
- `effect: MedicinalEffect` - pain_relief, dark_vision, clarity, heat_resistance, etc.
- `extractionMethod: string` - brewing, distillation, grinding, infusion
- `stabilityDuration: number` - Ticks until compound degrades

### Component: ChemotypeVariation
**Purpose:** Define regional medicinal variants

**Properties:**
- `regionType: string` - mountain, lowland, coastal, desert, wetland
- `soilRequirement: SoilType` - Required soil composition
- `compoundModifiers: object` - Which compounds change and how
- `potencyMultiplier: number` - Overall potency adjustment

## Systems

### System: PlantGrowthSystem
**Purpose:** Latitude and biome-aware plant growth
**Update Frequency:** Once per in-game day

**Responsibilities:**
- Calculate latitude from world position (cosine temperature distribution)
- Check if plant species compatible with current latitude
- Check biome compatibility
- Apply temperature modifiers from latitude
- Track seasonal growth (growing season length by latitude)
- Emit plant growth events

### System: ChemotypeSystem
**Purpose:** Apply regional medicinal variations
**Update Frequency:** On plant maturity

**Responsibilities:**
- Detect region type from surrounding tiles (mountain, lowland, coastal)
- Sample soil composition (mineral content, pH)
- Determine chemotype based on environmental factors
- Modify medicinal compound potencies
- Apply regional multipliers to compound effects

### System: GatheringSystem (Extended)
**Purpose:** Harvest plants with chemotype awareness
**Update Frequency:** On agent gather action

**Responsibilities:**
- Check plant maturity before harvest
- Extract medicinal compounds at current potency
- Apply chemotype modifiers to harvested items
- Track plant location for future regrowth

## Events

**Emits:**
- `plant:spawned` - New plant generated at location
- `plant:matured` - Plant reached full growth
- `plant:chemotype_determined` - Regional variant assigned
- `plant:harvested` - Plant gathered by agent
- `plant:died` - Plant outside valid latitude/biome

**Listens:**
- `biome:generated` - Spawn appropriate plants
- `soil:analyzed` - Determine chemotype
- `agent:gather_action` - Harvest plant

## Integration Points

- **BiomeSystem** - Biome type determines valid plant species
- **TemperatureSystem** - Latitude modifies local temperature
- **SoilSystem** - Soil composition affects chemotypes
- **CraftingSystem** - Medicinal compounds used in recipes
- **ItemSystem** - Harvested plants become inventory items

## Plant Species Examples

### Forest Understory: Shadowcap Mushroom
- **Biomes:** forest, swamp
- **Latitude:** 30-60° (temperate to subpolar)
- **Requirements:** Shade tolerance 95%, nurse log (dead wood)
- **Compounds:** umbrosin (dark vision 70%), spore toxin (hallucination 20%)
- **Lore:** "Absorbs the last dreams of dying trees"

### Grassland: Prairie Sage
- **Biomes:** grassland, savanna
- **Latitude:** 20-50°
- **Fire Resistance:** 80% (fire-stimulated blooming)
- **Tap Root:** 3m deep for drought tolerance
- **Compounds:** sage oil (clarity 50%), fire essence (purification 30%)

### Wetland: Swamp Willow
- **Biomes:** wetland, swamp
- **Flood Tolerance:** 180 days
- **Aerenchyma:** Internal air channels for anaerobic soil
- **Compounds:** salicylic acid (pain relief 60%), marsh tannin (preservation 40%)

### Desert: Desert Sage
- **Biomes:** desert, badlands
- **CAM Photosynthesis:** Night breathing to conserve water
- **Drought Tolerance:** 365 days without water
- **Seed Dormancy:** Up to 10 years
- **Compounds:** desert resin (focus 80%), solar essence (heat resistance 50%)

### Aquatic: Deeproot (Benthic)
- **Depth Range:** 15-50 tiles (deep water)
- **Salinity:** Freshwater only
- **Bioluminescent:** Yes (low-light environment)
- **Compounds:** abyss extract (underwater breathing 90%)

## Chemotype Example: Chamomile Variants

### Mountain Chamomile (Volcanic Soil)
- **Potency Modifier:** +40%
- **Dominant Compound:** Anti-inflammatory (85%)
- **Secondary:** Sedative (30%)

### Lowland Chamomile (River Silt)
- **Potency Modifier:** +10%
- **Dominant Compound:** Sedative (70%)
- **Secondary:** Anti-inflammatory (40%)

### Coastal Chamomile (Salt-Stressed)
- **Potency Modifier:** +20%
- **Dominant Compound:** Analgesic salts (60%)
- **Secondary:** Calming (50%)

## Performance Considerations

- Latitude calculation cached per chunk
- Chemotype determination runs once at plant maturity
- Plant species filtered by biome before spawn attempts
- Medicinal compound effects pre-calculated and cached
- Growth checks batched per day, not per tick

## Dependencies

**Required:**
- PlantComponent (existing component, extended with latitude/biome)
- BiomeSystem (biome type identification)
- PositionComponent (latitude calculation)

**Optional:**
- SoilComponent (chemotype determination)
- TemperatureSystem (seasonal growth)
- CraftingSystem (medicinal compound usage)

## Open Questions

- How to handle cross-pollination between chemotypes?
- Should rarity scales with latitude distance from optimal range?
- Seasonal blooming cycles for temperate plants?

---

**Related Specs:**
- [Item System](../item-system/spec.md) - Harvested plants become items (pending openspec conversion)
- [Crafting System](../crafting-system/spec.md) - Medicinal compound extraction (pending openspec conversion)

**Original Spec:** `custom_game_engine/architecture/HERBAL_BOTANY_SPEC.md` (comprehensive procedural herbal system with latitudinal distribution and chemotypes)
