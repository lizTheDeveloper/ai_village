# Alien Generation

Procedural alien world generation: creatures, plants, weather phenomena with LLM-guided trait composition.

## Overview

Mix-and-match component libraries for generating infinite alien species varieties. Combines trait databases with LLM-powered coherence validation to create biologically plausible xenofauna/xenoflora.

**Core Generator**: `AlienSpeciesGenerator` - LLM-guided procedural alien species creation with automatic naming, sprite prompts, ecological balancing.

## Component Libraries

### Creatures (`creatures/`)

- **Body Plans** (18+): bilateral/radial/crystalline/colonial/phase-shifted/energy beings
- **Locomotion** (22+): quadrupedal/jet propulsion/magnetic levitation/teleportation/burrowing
- **Sensory** (9+): visual/echolocation/electromagnetic/quantum probability/telepathic
- **Diet Patterns** (30+): herbivore/carnivore/photosynthetic/energy absorption/concept consumer - **realm-weighted ecology**
- **Social Structures** (10+): solitary/pack/hive/collective consciousness/incomprehensible
- **Defense Systems** (15+): armor/camouflage/toxins/sonic scream/phase shifting
- **Reproduction** (12+): egg-laying/live birth/budding/spore release/reality anchors
- **Intelligence** (7 levels): instinctual → fully sapient → hive mind → incomprehensible

**Sapient levels** (soul-compatible): proto_sapient, fully_sapient, hive_intelligence, incomprehensible_mind

### Plants (`plants/`)

- **Growth Patterns**: vertical tower/radial sprawl/vine climber/fractal branching/crystalline array
- **Energy Methods**: photosynthesis/chemosynthesis/thermal absorption/dimensional siphon
- **Defense Mechanisms**: thorns/toxins/hallucinogens/temporal displacement/reality anchors
- **Reproduction**: spores/seeds/runners/fragmentation/dimensional propagation

### Weather (`weather/`)

- **Precipitation**: water/acid/molten metal/upward rain/gem storms/living rain/temporal droplets
- **Wind Patterns**: standard/tornadic spirals/magnetic currents/gravity waves/causality winds
- **Atmospheric Phenomena**: standard clouds/metallic fog/living mist/crystalline formations
- **Natural Disasters**: hurricanes/plasma storms/reality tears/dimensional collapses
- **Sky Appearances**: single sun/binary stars/nebula glow/void darkness/impossible geometries

## Usage

```typescript
import { AlienSpeciesGenerator } from '@ai-village/world';

const generator = new AlienSpeciesGenerator(llmProvider);

// Generate sapient species (soul-compatible)
const alien = await generator.generateAlienSpecies({
  requireSapient: true,
  nativeWorld: 'Kepler-442b',
  environment: 'terrestrial',
});

console.log(alien.spritePrompt); // For PixelLab sprite generation
```

**Constraints**: `dangerLevel`, `intelligence`, `environment`, `domesticationPotential`, `requireSapient`, `nativeWorld`

**Output**: Scientific/common names, trait IDs, PixelLab sprite prompt, biology/behavior/cultural notes

## Ecological Balancing

Diet patterns use **realm-weighted ecology** - `ecologicalWeight` and `realmWeights` determine spawn frequency. Deprecated diets (zero weight) filtered out. LLM sees top 60% most-common diets for realistic ecosystems.

**Realms**: `material`, `dream_realm`, `celestial`, `underworld` - each has custom diet weights matching available resources.

## Integration

- **Soul System**: Use `requireSapient: true` for soul-bearing species
- **PixelLab**: `spritePrompt` field contains detailed generation prompts
- **Caching**: Species cached by ID - `getSpecies()`, `getAllSpecies()`, `clearCache()`

## Architecture

**Component Files**: Each trait category in separate file (18 files total) for independent expansion.

**LLM Validation**: Trait selection uses LLM to ensure biological coherence (e.g., jet_propulsion requires compatible body plan). Falls back to random on LLM failure.

**Trait References**: See `ALIEN_GENERATOR_USAGE.md`, `DIET_ECOLOGY_MAPPING.md` for full trait lists and weights.
