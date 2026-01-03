# Alien Species Generator Usage Guide

The `AlienSpeciesGenerator` creates unique, biologically coherent alien species using LLM-guided trait selection.

## Basic Usage

```typescript
import { AlienSpeciesGenerator } from '@ai-village/world';
import { llmProvider } from './your-llm-provider';

// Create generator
const generator = new AlienSpeciesGenerator(llmProvider);

// Generate a random alien species
const alien = await generator.generateAlienSpecies();

console.log(alien.name);              // "Crystal Spider"
console.log(alien.scientificName);   // "Crystallis araneus"
console.log(alien.description);      // "A hexapedal creature..."
console.log(alien.spritePrompt);     // "For PixelLab generation"
```

## Constrained Generation

```typescript
// Generate a sapient species (suitable for souls)
const sapientAlien = await generator.generateAlienSpecies({
  requireSapient: true,
  intelligence: 'fully_sapient',
  nativeWorld: 'Kepler-442b',
  environment: 'terrestrial',
});

// Generate a dangerous predator
const predator = await generator.generateAlienSpecies({
  dangerLevel: 'severe',
  intelligence: 'problem_solver',
  domesticationPotential: 'none',
});

// Generate a domesticable creature
const pet = await generator.generateAlienSpecies({
  dangerLevel: 'harmless',
  domesticationPotential: 'excellent',
  environment: 'terrestrial',
});
```

## Integration with Soul System

```typescript
// Generate alien soul with matching species
const alienSoul = {
  soulName: await soulNameGenerator.generateNewSoulName(tick),
  soulOriginCulture: 'exotic',
};

// Generate matching alien species
const alienSpecies = await alienGenerator.generateAlienSpecies({
  requireSapient: true, // Soul-bearing species must be sapient
  nativeWorld: universe.name,
});

// Use sprite prompt for PixelLab
const sprite = await pixelLabAPI.generateCharacter({
  description: alienSpecies.spritePrompt,
  size: 48,
  view: 'high top-down',
  n_directions: 8,
});
```

## Generated Species Structure

```typescript
interface GeneratedAlienSpecies {
  // Basic Info
  id: string;
  name: string;                    // "Crystal Spider"
  scientificName: string;          // "Crystallis araneus"
  description: string;             // Full description

  // Traits (from component libraries)
  bodyPlan: string;               // "crystalline_lattice"
  locomotion: string;             // "hexapod_climbing"
  sensorySystem: string;          // "vibration_detection"
  diet: string;                   // "mineral_crusher"
  socialStructure: string;        // "solitary_territorial"
  defense: string;                // "sonic_scream"
  reproduction: string;           // "egg_laying_abundant"
  intelligence: string;           // "basic_learning"

  // Metadata
  discovered: string;             // ISO timestamp
  nativeWorld: string;            // Homeworld name
  domesticationPotential: string; // none/poor/moderate/good/excellent
  dangerLevel: string;            // harmless/minor/moderate/severe/extinction_level

  // Generation Outputs
  spritePrompt: string;           // For PixelLab sprite generation
  biologyNotes: string;           // Detailed biological notes
  behaviorNotes: string;          // Behavioral patterns
  culturalNotes?: string;         // Only for sapient species
}
```

## Trait Options

### Body Plans
18 options including:
- `bilateral_standard` - Standard bilateral symmetry
- `radial_symmetry` - Radial body plan
- `colonial_swarm` - Distributed colony organism
- `crystalline_lattice` - Living crystal structure
- `tentacle_mass` - Mass of tentacles
- `energy_being` - Pure energy form
- And 12 more...

### Locomotion Methods
22+ options including:
- `quadrupedal_running` - Four-legged movement
- `jet_propulsion` - Water/air jets
- `magnetic_levitation` - Magnetic floating
- `teleportation` - Instant relocation
- `phase_shifting` - Through-matter movement
- And 17 more...

### Sensory Systems
9+ options including:
- `visual_standard` - Normal vision
- `echolocation` - Sound-based sensing
- `electromagnetic_sense` - Magnetic field detection
- `quantum_probability` - Probability sensing
- `telepathic_awareness` - Mind reading
- And 4 more...

### Intelligence Levels
- `instinctual_only` - No learning
- `basic_learning` - Simple conditioning
- `problem_solver` - Tool use
- `proto_sapient` - Early intelligence
- `fully_sapient` - Human-level ✅ Soul-capable
- `hive_intelligence` - Collective mind ✅ Soul-capable
- `incomprehensible_mind` - Beyond understanding ✅ Soul-capable

## Caching

The generator caches all created species:

```typescript
// Generate and cache
const alien1 = await generator.generateAlienSpecies();

// Retrieve cached species
const cached = generator.getSpecies(alien1.id);

// Get all generated species
const allAliens = generator.getAllSpecies();

// Clear cache
generator.clearCache();
```

## PixelLab Integration

The `spritePrompt` field is designed for PixelLab sprite generation:

```typescript
const alien = await generator.generateAlienSpecies({
  requireSapient: true,
});

// Use with PixelLab API
const sprite = await fetch('https://api.pixellab.ai/v1/generate-image-pixflux', {
  method: 'POST',
  body: JSON.stringify({
    prompt: alien.spritePrompt,
    size: 48,
    view: 'high top-down',
    n_directions: 8,
    shading: 'medium shading',
    outline: 'single color outline',
  }),
});
```

## Example: Generating a Complete Alien Civilization

```typescript
async function createAlienCivilization(universe: string) {
  const generator = new AlienSpeciesGenerator(llmProvider);

  // Generate sapient species
  const sapients = await generator.generateAlienSpecies({
    requireSapient: true,
    nativeWorld: universe,
    environment: 'terrestrial',
  });

  // Generate their livestock
  const livestock = await generator.generateAlienSpecies({
    domesticationPotential: 'excellent',
    dangerLevel: 'harmless',
    nativeWorld: universe,
  });

  // Generate dangerous predators
  const predator = await generator.generateAlienSpecies({
    dangerLevel: 'severe',
    intelligence: 'problem_solver',
    nativeWorld: universe,
  });

  return {
    civilization: sapients,
    domesticated: livestock,
    threats: predator,
  };
}
```

## Error Handling

```typescript
try {
  const alien = await generator.generateAlienSpecies(constraints);
  console.log('Generated:', alien.name);
} catch (error) {
  // LLM failures fall back to random generation
  console.warn('Generation had issues:', error);
  // But alien is still returned
}
```

## Best Practices

1. **Cache species for reuse** - Don't regenerate the same alien multiple times
2. **Use constraints** - Guide generation for specific purposes
3. **Sapient species for souls** - Use `requireSapient: true` when creating soul-bearing species
4. **Environment matching** - Match environment to universe type
5. **Sprite generation** - Use `spritePrompt` with PixelLab for consistent visuals

## Future Enhancements

Planned features (not yet implemented):
- Genetic relationships between species
- Evolutionary trees
- Ecosystem balancing
- Cultural trait generation for sapients
- Language/communication system generation
- Homeworld environment generation
