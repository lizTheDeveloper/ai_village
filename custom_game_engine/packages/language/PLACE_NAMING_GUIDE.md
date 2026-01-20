# Place Naming Guide

**Generate culturally appropriate alien place names like "Proc Paneth" (Proc's Mountain) or "Xak-Kräg" (Fire Mountain).**

## Quick Start

```typescript
import {
  LanguageRegistry,
  PlaceNamingService,
  VocabularyInitializationService,
} from '@ai-village/language';

const registry = LanguageRegistry.getInstance(llmProvider);
const placeNaming = new PlaceNamingService();

// Generate language with geographic vocabulary
const language = await registry.ensureSpeciesLanguage(
  'volcanic_insectoids',
  'volcanic',
  { type: 'insectoid' },
  { initializeVocabulary: true }
);

// Generate place names
const mountain = placeNaming.generatePlaceName(
  'mountain',
  language.component,
  { descriptors: ['fire'] }
);

console.log(mountain);
// {
//   alienName: 'Xak-Kräg',
//   englishTranslation: 'fire mountain',
//   components: [
//     { alien: 'xak', english: 'fire', role: 'descriptor' },
//     { alien: 'kräg', english: 'mountain', role: 'place' }
//   ],
//   pattern: 'descriptor-place'
// }
```

## Naming Patterns

### 1. Simple Names

Just the place type.

```typescript
const name = placeNaming.generatePlaceName(
  'mountain',
  language,
  { pattern: 'simple' }
);
// { alienName: 'Kräg', englishTranslation: 'mountain' }
```

### 2. Descriptor + Place

Most common pattern.

```typescript
const name = placeNaming.generatePlaceName(
  'mountain',
  language,
  { pattern: 'descriptor-place', descriptors: ['high'] }
);
// { alienName: 'Zür-Kräg', englishTranslation: 'high mountain' }

const river = placeNaming.generatePlaceName(
  'river',
  language,
  { descriptors: ['blue', 'sacred'] }
);
// { alienName: 'Blü-Säk-Wät', englishTranslation: 'blue sacred river' }
```

### 3. Place + Descriptor

Reverse order.

```typescript
const name = placeNaming.generatePlaceName(
  'valley',
  language,
  { pattern: 'place-descriptor', descriptors: ['dark'] }
);
// { alienName: 'Val-Dürk', englishTranslation: 'valley dark' }
```

### 4. Person + Place

Named after someone (like "Proc Paneth").

```typescript
const fortress = placeNaming.generatePlaceName(
  'fortress',
  language,
  {
    pattern: 'person-place',
    personName: 'Proc',
  }
);
// { alienName: 'Proc-Tharn', englishTranslation: "Proc's fortress" }

const mountain = placeNaming.generatePlaceName(
  'mountain',
  language,
  {
    pattern: 'person-place',
    personName: 'Paneth',
  }
);
// { alienName: 'Paneth-Kräg', englishTranslation: "Paneth's mountain" }
```

### 5. Place + Person

Reverse order (less common).

```typescript
const temple = placeNaming.generatePlaceName(
  'temple',
  language,
  {
    pattern: 'place-person',
    personName: 'Xaru',
  }
);
// { alienName: 'Tëmp-Xaru', englishTranslation: 'temple of Xaru' }
```

### 6. Compound Names

Multiple descriptors.

```typescript
const peak = placeNaming.generatePlaceName(
  'peak',
  language,
  {
    pattern: 'compound',
    descriptors: ['fire', 'ice', 'cursed'],
  }
);
// { alienName: 'Xak-Grü-Kurs-Pek', englishTranslation: 'fire-ice-cursed-peak' }
```

## Available Place Types

```typescript
type PlaceType =
  | 'mountain'
  | 'valley'
  | 'river'
  | 'lake'
  | 'ocean'
  | 'forest'
  | 'desert'
  | 'city'
  | 'village'
  | 'fortress'
  | 'temple'
  | 'cave'
  | 'peak'
  | 'island'
  | 'peninsula';
```

## Common Descriptors

These are in the core vocabulary (if language initialized with vocabulary):

**Natural:**
- `fire`, `water`, `earth`, `air`, `ice`
- `red`, `blue`, `green`, `black`, `white`
- `high`, `low`, `deep`, `wide`

**Cultural:**
- `sacred`, `cursed`, `ancient`, `new`
- `strong`, `weak`, `broken`

**Emotional:**
- `dark`, `bright`, `hidden`, `lost`

## Generate Variations

Get multiple name options:

```typescript
const variations = placeNaming.generatePlaceNameVariations(
  'mountain',
  language,
  5 // count
);

// Returns 5 different names:
// [
//   { alienName: 'Kräg', englishTranslation: 'mountain' },
//   { alienName: 'Zür-Kräg', englishTranslation: 'high mountain' },
//   { alienName: 'Xak-Kräg', englishTranslation: 'fire mountain' },
//   { alienName: 'Thü-Kräg', englishTranslation: 'ancient mountain' },
//   { alienName: 'Kräg-Zür', englishTranslation: 'mountain high' },
// ]
```

## Custom Separators

Change the separator between components:

```typescript
const name = placeNaming.generatePlaceName(
  'city',
  language,
  {
    descriptors: ['new'],
    separator: ' ', // Use space instead of hyphen
  }
);
// { alienName: 'Nü Cit', englishTranslation: 'new city' }
```

## Complete Example: Volcanic World

```typescript
import { LanguageRegistry, PlaceNamingService } from '@ai-village/language';

// Setup
const registry = LanguageRegistry.getInstance(llmProvider);
const placeNaming = new PlaceNamingService();

// Generate volcanic insectoid language
const language = await registry.ensureSpeciesLanguage(
  'volcanic_insectoids',
  'volcanic',
  { type: 'insectoid' },
  { initializeVocabulary: true }
);

// Name geographic features
const places = [
  // Mountains
  placeNaming.generatePlaceName('mountain', language.component, {
    descriptors: ['fire']
  }), // "Xak-Kräg" (Fire Mountain)

  placeNaming.generatePlaceName('peak', language.component, {
    descriptors: ['high', 'sacred']
  }), // "Zür-Säk-Pek" (High Sacred Peak)

  // Cities
  placeNaming.generatePlaceName('fortress', language.component, {
    pattern: 'person-place',
    personName: 'Proc'
  }), // "Proc-Tharn" (Proc's Fortress)

  placeNaming.generatePlaceName('city', language.component, {
    descriptors: ['red', 'ancient']
  }), // "Kräd-Thü-Cit" (Red Ancient City)

  // Natural features
  placeNaming.generatePlaceName('river', language.component, {
    descriptors: ['lava'] // If 'lava' in vocabulary
  }), // "Läv-Wät" (Lava River)

  placeNaming.generatePlaceName('valley', language.component, {
    descriptors: ['ash']
  }), // "Äsh-Val" (Ash Valley)
];

// Display
places.forEach(place => {
  console.log(`${place.alienName} (${place.englishTranslation})`);
});

// Output:
// Xak-Kräg (fire mountain)
// Zür-Säk-Pek (high sacred peak)
// Proc-Tharn (Proc's fortress)
// Kräd-Thü-Cit (red ancient city)
// Läv-Wät (lava river)
// Äsh-Val (ash valley)
```

## Integration with Maps

```typescript
interface GeographicFeature {
  id: string;
  type: PlaceType;
  position: { x: number; y: number };
  name: PlaceName;
}

function nameAllFeatures(
  features: Array<{ type: PlaceType; position: { x: number; y: number } }>,
  language: LanguageComponent
): GeographicFeature[] {
  const placeNaming = new PlaceNamingService();

  return features.map((feature, index) => ({
    id: `feature_${index}`,
    type: feature.type,
    position: feature.position,
    name: placeNaming.generatePlaceName(
      feature.type,
      language,
      {
        // Auto-generate variations
        pattern: index % 3 === 0 ? 'simple' : 'descriptor-place',
        descriptors: index % 3 === 1 ? ['ancient'] : ['high'],
      }
    ),
  }));
}
```

## Best Practices

### ✅ Do
- Initialize vocabulary before generating place names
- Use planet-appropriate descriptors (fire for volcanic, ice for arctic)
- Mix patterns for variety (simple, descriptor-place, person-place)
- Keep person names short (1-2 syllables)
- Generate variations and let user/AI pick favorites

### ❌ Don't
- Use descriptors not in vocabulary (will throw error)
- Overuse compound names (too long)
- Use same pattern for every place (boring)
- Forget to check if place type has vocabulary entry

## Error Handling

```typescript
try {
  const name = placeNaming.generatePlaceName(
    'mountain',
    language,
    { descriptors: ['magic'] } // 'magic' might not be in vocabulary
  );
} catch (error) {
  console.error('Place naming failed:', error.message);
  // Fallback: use simple pattern
  const fallback = placeNaming.generatePlaceName(
    'mountain',
    language,
    { pattern: 'simple' }
  );
}
```

## Future Enhancements

**Possible additions:**
- Directional descriptors (north, south, east, west)
- Size descriptors (great, small, twin)
- Age/era markers (old, new, first, last)
- Mythological references (from species lore)

---

**Now your aliens can name their world properly.** 🗻⚡

