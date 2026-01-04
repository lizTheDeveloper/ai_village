# Diet Pattern Ecological Mapping

This document maps alien diet patterns to actual in-game items and resources, ensuring ecological coherence between what aliens eat and what resources are available in the game.

## Core Principle

**Predator/Prey Ecological Balance**: The rarity of a diet pattern should match the spawn rate of its food source. Common resources → common diets. Rare resources → rare diets.

## Item Rarity Distribution (from defaultItems.ts + surrealMaterials.ts)

### Common (high spawn rate):
- **Plants**: wood, leaves, fiber, berry, wheat, apple, carrot
- **Resources**: stone, water, sand
- **Animals**: fish, egg, raw_meat
- **Processed**: bread (crafted from wheat)

### Uncommon (medium spawn rate):
- **Food**: cooked_meat, honey, mushroom
- **Materials**: fungus, ice, bone, silk, wax, coral

### Rare (low spawn rate):
- **Magical**: mana_crystal, poison crystal, amber
- **Materials**: frozen music (sound crystal), crystallized toxin

### Legendary (very rare spawn):
- **Realm-Specific**: dream_crystal (dream realm), memory_crystal, shadow_essence
- **Elemental**: eternal_flame

## Diet Pattern → Item Mapping with Ecological Weights

### TERRESTRIAL DIETS (Common - based on common items)

#### herbivore_standard (KEEP - 100% weight)
- **Eats**: berry, wheat, apple, carrot, leaves, fiber
- **Items**: All common
- **Spawn Weight**: 1.0 (100%)
- **Realms**: Any terrestrial realm
- **Ecological Role**: Primary consumers, abundant to support carnivores

#### frugivore (KEEP - 70% weight)
- **Eats**: apple, berry (fruit items)
- **Items**: common
- **Spawn Weight**: 0.7 (70%)
- **Realms**: Forest biomes, celestial realm
- **Ecological Role**: Seed dispersers, support fruit-bearing plants

#### granivore (KEEP - 80% weight)
- **Eats**: wheat (seeds/grains)
- **Items**: common
- **Spawn Weight**: 0.8 (80%)
- **Realms**: Grassland biomes
- **Ecological Role**: Seed eaters, agricultural pest potential

#### folivore (KEEP - 60% weight)
- **Eats**: leaves, fiber
- **Items**: common
- **Spawn Weight**: 0.6 (60%)
- **Realms**: Forest biomes
- **Ecological Role**: Leaf specialists

#### carnivore_predator (KEEP - 70% weight)
- **Eats**: raw_meat (from hunting other creatures)
- **Items**: common (from killing herbivores)
- **Spawn Weight**: 0.7 (70%)
- **Realms**: Any realm with prey
- **Ecological Role**: Population control, requires herbivore prey base

#### omnivore (KEEP - 90% weight)
- **Eats**: berry, wheat, apple, raw_meat, fish, egg
- **Items**: All common
- **Spawn Weight**: 0.9 (90%)
- **Realms**: Any terrestrial realm
- **Ecological Role**: Generalists, highly adaptable

#### insectivore (KEEP - 85% weight)
- **Eats**: insects (implied common resource, not in item list yet)
- **Spawn Weight**: 0.85 (85%)
- **Realms**: Any terrestrial realm
- **Ecological Role**: Pest control
- **NOTE**: Insects should be added as common resource

### AQUATIC DIETS (Common-Uncommon)

#### piscivore (KEEP - 70% weight)
- **Eats**: fish
- **Items**: common (fishing_spot gatherable)
- **Spawn Weight**: 0.7 (70%)
- **Realms**: Aquatic biomes, coastal
- **Ecological Role**: Fish predators

#### filter_feeder (KEEP - 50% weight)
- **Eats**: microscopic particles in water
- **Items**: water (common)
- **Spawn Weight**: 0.5 (50%)
- **Realms**: Aquatic biomes
- **Ecological Role**: Water cleaners

#### nectarivore (KEEP - 40% weight)
- **Eats**: honey (flower nectar)
- **Items**: uncommon
- **Spawn Weight**: 0.4 (40%)
- **Realms**: Forest biomes with flowering plants
- **Ecological Role**: Pollinators

### DECOMPOSER DIETS (Common-Uncommon)

#### decomposer (KEEP - 60% weight)
- **Eats**: dead organic matter (corpses)
- **Items**: Generated from deaths (common in ecosystems)
- **Spawn Weight**: 0.6 (60%)
- **Realms**: Any realm
- **Ecological Role**: Nutrient recyclers, critical for ecosystem

#### scavenger (KEEP - 55% weight)
- **Eats**: raw_meat (from recently dead animals)
- **Items**: common (from deaths)
- **Spawn Weight**: 0.55 (55%)
- **Realms**: Any realm
- **Ecological Role**: Cleanup crew, reduce disease

#### fungivore (KEEP - 50% weight)
- **Eats**: mushroom, fungus material
- **Items**: uncommon
- **Spawn Weight**: 0.5 (50%)
- **Realms**: Dark/underground biomes, underworld
- **Ecological Role**: Fungus controllers

### SPECIALIZED DIETS (Uncommon-Rare)

#### hematophage (KEEP - 40% weight)
- **Eats**: blood (from living creatures)
- **Items**: Generated from living entities
- **Spawn Weight**: 0.4 (40%)
- **Realms**: Any realm with blood-bearing creatures
- **Ecological Role**: Parasitic, disease vectors

#### parasitic (KEEP - 30% weight)
- **Eats**: nutrients from living hosts
- **Items**: Living entities required
- **Spawn Weight**: 0.3 (30%)
- **Realms**: Any realm
- **Ecological Role**: Population control through parasitism

#### lithotroph (KEEP - 20% weight)
- **Eats**: stone, minerals
- **Items**: stone (common), but slow digestion
- **Spawn Weight**: 0.2 (20%)
- **Realms**: Rocky biomes, underground
- **Ecological Role**: Geological processors, rare due to low efficiency

### ELEMENTAL DIETS (Rare)

#### photosynthesis (KEEP - 40% weight)
- **Eats**: stellar radiation (light)
- **Items**: Sunlight (free resource in lit areas)
- **Spawn Weight**: 0.4 (40%)
- **Realms**: Surface areas with light
- **Ecological Role**: Primary producers like plants

#### chemosynthesis (KEEP - 25% weight)
- **Eats**: inorganic chemicals
- **Items**: Various chemicals from geological sources
- **Spawn Weight**: 0.25 (25%)
- **Realms**: Underwater thermal vents, underground
- **Ecological Role**: Primary producers in dark environments

#### radiation_metabolizer (KEEP - 15% weight)
- **Eats**: ionizing radiation
- **Items**: radiation sources (rare)
- **Spawn Weight**: 0.15 (15%)
- **Realms**: Near radioactive materials, void
- **Ecological Role**: Cleanup of radioactive areas

### MAGICAL/RARE DIETS (Rare-Legendary)

#### energy_absorption (KEEP - 20% weight)
- **Eats**: electromagnetic energy
- **Items**: mana_crystal (rare)
- **Spawn Weight**: 0.2 (20%)
- **Realms**: Magically active areas
- **Ecological Role**: Magic consumers

#### crystalline_consumption (KEEP - 15% weight)
- **Eats**: dream_crystal, memory_crystal, resonant_crystal
- **Items**: rare/legendary
- **Spawn Weight**: 0.15 (15%)
- **Realms**: Crystal caves, magical areas
- **Ecological Role**: Crystal ecosystem predators

### REALM-SPECIFIC DIETS

#### dream_feeding (KEEP - REALM-WEIGHTED)
- **Eats**: dream_crystal (material:dream_crystal)
- **Items**: legendary in dream realm
- **Spawn Weight**:
  - Dream Realm: 0.8 (80% - dreams are abundant there)
  - Other Realms: 0.05 (5% - dreams are rare)
- **Realms**: Dream realm (primary), any realm (rare)
- **Ecological Role**: Dream realm apex predators

#### memory_consumption (KEEP - REALM-WEIGHTED)
- **Eats**: memory_crystal (material:memory_crystal)
- **Items**: legendary
- **Spawn Weight**:
  - Dream Realm: 0.4 (40% - memories form in dreams)
  - Celestial: 0.2 (20% - long-lived beings accumulate memories)
  - Other: 0.05 (5%)
- **Realms**: Dream realm, celestial realm
- **Ecological Role**: Memory recyclers

#### sound_digestion (KEEP - REALM-WEIGHTED)
- **Eats**: frozen_music (material:frozen_music)
- **Items**: rare
- **Spawn Weight**:
  - Areas with audiomancy: 0.4 (40%)
  - Other: 0.08 (8%)
- **Realms**: Musical/acoustic biomes
- **Ecological Role**: Sound predators

#### magnetic_digestion (KEEP - 20% weight)
- **Eats**: metal, forged_steel
- **Items**: uncommon (metal materials)
- **Spawn Weight**: 0.2 (20%)
- **Realms**: Industrial areas, ruins
- **Ecological Role**: Metal recyclers

### DIETS TO REMOVE (No Items or Impossible)

#### quantum_sustenance (REMOVE - NO ITEMS)
- **Problem**: No quantum items exist in game
- **User feedback**: "is that a real thing and can it be *crafted* or is that a bunch of random nonsense"

#### temporal_feeding (REMOVE - NO ITEMS)
- **Problem**: No time-based resources to consume

#### emotional_vampirism (KEEP? - ABSTRACT)
- **Items**: emotions (from sentient beings)
- **Spawn Weight**: 0.1 (10%)
- **Question**: Are emotions tracked as consumable resources?

#### pain_metabolizer (REMOVE - UNETHICAL)
- **Problem**: Requires causing suffering, not desirable mechanic

#### void_consumption (REMOVE - NO ITEMS)
- **Problem**: Eating entropy/heat death has no game representation

#### information_digestion (KEEP? - ABSTRACT)
- **Eats**: books, scrolls, knowledge items
- **Items**: paper (material:folded_parchment) - common
- **Spawn Weight**: 0.2 (20%) if knowledge items exist
- **Realms**: Libraries, celestial realm

#### gravity_feeding (REMOVE - NO ITEMS)
- **Problem**: Gravity is not a harvestable resource

#### dimensional_scavenging (REMOVE - TOO ABSTRACT)
- **Problem**: Pulling food from parallel dimensions breaks ecology

#### stellar_sipping (REMOVE - SCALE MISMATCH)
- **Problem**: Drinking from stars is planetary-scale, breaks game ecology

### MODIFIED DIETS (Need Item Support)

#### symbiotic_farming (KEEP - with internal bacteria)
- **Eats**: internal cultivated organisms
- **Items**: Self-sustaining (bacteria inside creature)
- **Spawn Weight**: 0.3 (30%)
- **Realms**: Any
- **Ecological Role**: Self-sufficient organisms

## Summary Statistics

### Keeping (by rarity tier):
- **Common diets** (70-100% weight): 8 diets
- **Uncommon diets** (40-70% weight): 8 diets
- **Rare diets** (15-40% weight): 8 diets
- **Legendary/Realm-specific** (5-80% realm-dependent): 4 diets

### Removing:
- quantum_sustenance (no items)
- temporal_feeding (no items)
- pain_metabolizer (unethical)
- void_consumption (no items)
- gravity_feeding (no items)
- dimensional_scavenging (breaks ecology)
- stellar_sipping (scale mismatch)

### Total: ~28 ecologically coherent diets

## Ecological Validation Rules

1. **Predator/Prey Balance**: For every carnivore/predator diet, must have 3x herbivore population
2. **Resource Availability**: Diet spawn weight ≤ food source spawn weight
3. **Realm Consistency**: Realm-specific diets must match realm resources
4. **Trophic Levels**: Maximum 4 levels (plants → herbivores → carnivores → apex)

## Implementation Notes

For `AlienSpeciesGenerator.ts`:
- Use `constraints.environment` to filter appropriate diets
- Use `constraints.nativeWorld` realm type to boost realm-specific diet weights
- Apply ecological weights when randomly selecting diets
- Ensure predator diets are rarer than herbivore diets overall
