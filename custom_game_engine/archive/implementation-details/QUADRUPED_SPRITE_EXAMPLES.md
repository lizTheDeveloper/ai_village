# Quadruped Body Type - Usage Examples

The sprite generation system now supports **quadruped body types**, using PixelLab's proven lion/bear body templates to create convincing aliens, monsters, and creatures.

## Why Quadruped Templates?

Instead of trying to describe complex alien anatomy from scratch, we leverage PixelLab's battle-tested quadruped body structure and modify the details to create unique creatures.

**Benefits:**
- ✅ Proven locomotion (quadruped walk cycles that work)
- ✅ Consistent quality (tested body proportions)
- ✅ Faster generation (known-good templates)
- ✅ Variety through details (colors, textures, features)

## Basic Usage

```typescript
import { lookupSprite } from '@ai-village/renderer';

// Create a quadruped alien
const sprite = lookupSprite({
  species: 'alien',
  bodyType: 'quadruped',
  features: 'crystalline scales, bioluminescent eyes, chitinous armor plates'
});

// Creates description:
// "Quadruped alien creature with powerful four-legged stance similar to a large predator.
// crystalline scales, bioluminescent eyes, chitinous armor plates"
```

## Creature Templates

### Alien Predator
```typescript
lookupSprite({
  species: 'alien',
  bodyType: 'quadruped',
  features: 'metallic silver scales, glowing purple eyes, razor-sharp spines along back'
});
```

**Generated description:**
> "Quadruped alien creature with powerful four-legged stance similar to a large predator. metallic silver scales, glowing purple eyes, razor-sharp spines along back"

### Mutant Beast
```typescript
lookupSprite({
  species: 'beast',
  bodyType: 'quadruped',
  features: 'exposed mechanical parts, green toxic drool, asymmetric mutations'
});
```

**Generated description:**
> "Four-legged beast with muscular build and strong limbs. exposed mechanical parts, green toxic drool, asymmetric mutations"

### Fire Drake
```typescript
lookupSprite({
  species: 'dragon',
  bodyType: 'quadruped',
  features: 'red and gold scales, smoke rising from nostrils, flame patterns on hide'
});
```

**Generated description:**
> "Quadruped dragon-like creature with lizard body on four powerful legs. red and gold scales, smoke rising from nostrils, flame patterns on hide"

### Biomechanical Horror
```typescript
lookupSprite({
  species: 'monster',
  bodyType: 'quadruped',
  features: 'cybernetic implants fused to flesh, glowing circuit patterns, steam vents'
});
```

**Generated description:**
> "Monstrous quadruped with bear-like body structure and imposing presence. cybernetic implants fused to flesh, glowing circuit patterns, steam vents"

### Crystal Elemental
```typescript
lookupSprite({
  species: 'alien',
  bodyType: 'quadruped',
  features: 'translucent crystalline body, internal light refraction, geometric facets'
});
```

**Generated description:**
> "Quadruped alien creature with powerful four-legged stance similar to a large predator. translucent crystalline body, internal light refraction, geometric facets"

### Void Beast
```typescript
lookupSprite({
  species: 'monster',
  bodyType: 'quadruped',
  features: 'shadowy dark matter form, star-like eyes, reality distortion around body'
});
```

**Generated description:**
> "Monstrous quadruped with bear-like body structure and imposing presence. shadowy dark matter form, star-like eyes, reality distortion around body"

## Default Features

If you don't specify `features`, the system applies default alien characteristics:

```typescript
lookupSprite({
  species: 'alien',
  bodyType: 'quadruped'
});
```

**Generated description:**
> "Quadruped alien creature with powerful four-legged stance similar to a large predator. thick scaled hide, bioluminescent markings along spine, powerful clawed feet, distinctive ridge along back"

## Built-in Species Templates

The system has optimized templates for common quadruped species:

| Species | Base Description |
|---------|-----------------|
| `alien` | Quadruped alien creature with powerful four-legged stance similar to a large predator |
| `beast` | Four-legged beast with muscular build and strong limbs |
| `monster` | Monstrous quadruped with bear-like body structure and imposing presence |
| `dragon` | Quadruped dragon-like creature with lizard body on four powerful legs |
| `wolf` | Wolf-like quadruped with sleek muscular body |
| `cat` | Large feline quadruped with agile predator build |

## Other Body Types

The system also supports other non-humanoid body types:

### Avian
```typescript
lookupSprite({
  species: 'phoenix',
  bodyType: 'avian',
  features: 'flaming feathers, golden eyes, smoke trail'
});
```

### Serpentine
```typescript
lookupSprite({
  species: 'wyrm',
  bodyType: 'serpentine',
  features: 'iridescent scales, hypnotic patterns, forked tongue'
});
```

### Insectoid
```typescript
lookupSprite({
  species: 'mantis',
  bodyType: 'insectoid',
  features: 'compound eyes, blade-like forearms, chitinous exoskeleton'
});
```

## Feature Ideas

Good features to add variety:

**Surface Materials:**
- `crystalline scales`
- `metallic plating`
- `bioluminescent skin`
- `shadowy smoke form`
- `translucent jelly body`

**Distinctive Marks:**
- `glowing tribal patterns`
- `circuit-like veins`
- `fractal markings`
- `constellation patterns`

**Unique Elements:**
- `extra eyes along spine`
- `retractable claws`
- `energy emissions`
- `tentacle mane`

**Color Schemes:**
- `iridescent purple and green`
- `deep obsidian with gold accents`
- `arctic white with ice crystals`
- `molten red and orange`

## Full Example: Creating an Alien Encounter

```typescript
// Spawn various alien creatures with quadruped bodies
const alienTypes = [
  {
    species: 'alien',
    bodyType: 'quadruped',
    features: 'hexagonal scale patterns, triple eyes, energy field shimmer'
  },
  {
    species: 'alien',
    bodyType: 'quadruped',
    features: 'obsidian black hide, bone protrusions, acid drool'
  },
  {
    species: 'alien',
    bodyType: 'quadruped',
    features: 'aquamarine scales, webbed feet, gills along neck'
  }
];

for (const traits of alienTypes) {
  const sprite = lookupSprite(traits);
  console.log(sprite.folderId, sprite.status);
  // Each gets queued for generation if not yet created
}
```

## API Integration

When the sprite generation server processes these requests, it will:

1. **Use `create_character` API** for quadrupeds (8-directional sprites)
2. **Include the full description** with body structure + features
3. **Generate walk cycles** using proven quadruped animation
4. **Download to** `packages/renderer/assets/sprites/pixellab/<folderId>/`

## Testing Quadruped Generation

```bash
# Queue a test quadruped sprite
curl -X POST http://localhost:8766/api/sprites/generate \
  -H "Content-Type: application/json" \
  -d '{
    "folderId": "alien-quadruped-crystal",
    "traits": {
      "species": "alien",
      "bodyType": "quadruped",
      "features": "crystalline scales, bioluminescent markings, energy aura"
    },
    "description": "Quadruped alien creature with powerful four-legged stance similar to a large predator. crystalline scales, bioluminescent markings, energy aura"
  }'

# Check queue
curl http://localhost:8766/api/sprites/queue | jq .
```

## Tips for Best Results

1. **Use specific visual features** - "metallic silver scales with blue accents" vs just "shiny"
2. **Describe surface textures** - scales, fur, crystals, smoke, etc.
3. **Add distinctive markings** - patterns, colors, glows
4. **Keep it visual** - describe what you SEE, not behaviors
5. **Leverage the template** - let the quadruped body do the heavy lifting

## Migration from Old Approach

**Before** (trying to describe full anatomy):
```typescript
// Too complex, results vary
description: "Radially symmetric pentagonal alien with five tentacles extending from central body, bioluminescent markings..."
```

**After** (using quadruped template):
```typescript
// Reliable, proven body structure
{
  species: 'alien',
  bodyType: 'quadruped',
  features: 'pentagonal scale patterns, five spine ridges, bioluminescent markings'
}
```

The quadruped template handles the hard part (body structure, proportions, locomotion), you just customize the appearance!
