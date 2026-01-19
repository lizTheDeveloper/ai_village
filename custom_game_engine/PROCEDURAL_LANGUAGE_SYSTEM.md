# Procedural Language System Specification

## Overview

A generative alien language system that creates unique languages for each planet/species, generates names using Tracery grammars, and builds emergent dictionaries through LLM-powered "translation" of words based on context.

**Philosophy**: Languages evolve organically. We generate phonetically consistent words, then discover their meaning through use, building a living dictionary that grows as the world is explored.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Language System                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Phoneme Inventory → Language Generator → Tracery Grammar   │
│         ↓                    ↓                    ↓          │
│    [Universal]          [Per-Planet]        [Name Gen]       │
│                                                ↓              │
│                                          "X'nir vlef"         │
│                                                ↓              │
│                    ┌──────────────────────────┘              │
│                    ↓                                          │
│              Translation Request                              │
│              (Context + Word)                                 │
│                    ↓                                          │
│               LLM Translation                                 │
│           "vlef = river (flowing)"                           │
│                    ↓                                          │
│            Persistent Dictionary                              │
│              {vlef: "river"}                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 1. Phoneme Inventory

**Universal phoneme sets** that can be mixed to create distinct languages.

### Phoneme Categories

```typescript
interface PhonemeInventory {
  // Consonants
  stops: string[];           // p, t, k, b, d, g
  fricatives: string[];      // f, s, sh, v, z, th
  nasals: string[];          // m, n, ng
  liquids: string[];         // l, r
  glides: string[];          // w, y

  // Vowels
  closeVowels: string[];     // i, u
  midVowels: string[];       // e, o
  openVowels: string[];      // a, ä

  // Special features
  clusters: string[];        // consonant clusters (tr, kr, fl, etc.)
  affricates: string[];      // ch, j
  clicks: string[];          // !, |, ||
  tones: string[];           // ', `, ˆ (tone markers)

  // Syllable structure patterns
  syllablePatterns: string[]; // CV, CVC, CVCC, V, VC, etc.
}
```

### Example Phoneme Sets

```typescript
const UNIVERSAL_PHONEMES: PhonemeInventory = {
  stops: ['p', 't', 'k', 'b', 'd', 'g', 'q', "'"],
  fricatives: ['f', 's', 'sh', 'v', 'z', 'th', 'kh', 'x', 'h'],
  nasals: ['m', 'n', 'ng'],
  liquids: ['l', 'r', 'rr'],
  glides: ['w', 'y'],

  closeVowels: ['i', 'u', 'ü'],
  midVowels: ['e', 'o', 'ö'],
  openVowels: ['a', 'ä'],

  clusters: ['tr', 'kr', 'fl', 'bl', 'gr', 'pr', 'st', 'sk', 'sn'],
  affricates: ['ch', 'j', 'ts', 'dz'],
  clicks: ['!', '|', '||'],
  tones: ["'", "`", "^"],

  syllablePatterns: ['CV', 'CVC', 'CVCC', 'V', 'VC', 'CCV', 'CCVC'],
};
```

## 2. Language Generator

Generates unique languages by selecting subsets of phonemes and defining phonotactic rules.

### Language Configuration

```typescript
interface LanguageConfig {
  id: string;                    // e.g., "volcanic_hisslang"
  name: string;                  // Auto-generated or assigned
  planetType: string;            // Links to planet
  seed: string;                  // Deterministic generation

  // Phoneme selection (subsets of universal inventory)
  selectedConsonants: string[];
  selectedVowels: string[];
  selectedClusters: string[];
  allowedClusters: boolean;
  allowedTones: boolean;

  // Phonotactic constraints
  syllablePatterns: string[];    // Which patterns this language uses
  maxSyllablesPerWord: number;   // 2-5 typically
  vowelHarmony: boolean;         // Vowels must match quality
  consonantHarmony: boolean;     // Voicing harmony

  // Morphology
  wordOrder: 'SVO' | 'SOV' | 'VSO' | 'VOS' | 'OSV' | 'OVS';
  usesAffixes: boolean;
  prefixes: string[];            // Derivational prefixes
  suffixes: string[];            // Derivational suffixes

  // Naming conventions
  nameStructure: 'given' | 'given-family' | 'family-given' | 'single';
  placeNamePattern: string;      // Tracery pattern for place names
}
```

### Generation Algorithm

```typescript
class LanguageGenerator {
  /**
   * Generate a language from planet configuration
   */
  generateLanguage(planetConfig: PlanetConfig, seed: string): LanguageConfig {
    const rng = seededRandom(seed);

    // 1. Select phoneme subset (30-60% of universal set)
    const consonants = selectRandomSubset(
      UNIVERSAL_PHONEMES.stops.concat(
        UNIVERSAL_PHONEMES.fricatives,
        UNIVERSAL_PHONEMES.nasals,
        UNIVERSAL_PHONEMES.liquids
      ),
      rng.intBetween(8, 15)
    );

    const vowels = selectRandomSubset(
      UNIVERSAL_PHONEMES.closeVowels.concat(
        UNIVERSAL_PHONEMES.midVowels,
        UNIVERSAL_PHONEMES.openVowels
      ),
      rng.intBetween(3, 7)
    );

    // 2. Planet-specific phoneme biases
    if (planetConfig.type === 'volcanic') {
      // Add harsh sounds
      consonants.push(...['kh', 'x', 'q']);
      vowels = vowels.filter(v => v !== 'u'); // Prefer open vowels
    } else if (planetConfig.type === 'ocean') {
      // Add liquid sounds
      consonants.push(...['l', 'r', 'w']);
      vowels.push('u', 'o'); // Prefer rounded vowels
    }

    // 3. Define syllable patterns
    const patterns = selectRandomSubset(
      UNIVERSAL_PHONEMES.syllablePatterns,
      rng.intBetween(3, 6)
    );

    // 4. Generate morphology rules
    const config: LanguageConfig = {
      id: `${planetConfig.type}_lang_${seed}`,
      name: '', // Generated later through translation
      planetType: planetConfig.type,
      seed,
      selectedConsonants: consonants,
      selectedVowels: vowels,
      selectedClusters: rng.chance(0.5) ? selectRandomSubset(UNIVERSAL_PHONEMES.clusters, 3) : [],
      allowedClusters: rng.chance(0.5),
      allowedTones: rng.chance(0.3),
      syllablePatterns: patterns,
      maxSyllablesPerWord: rng.intBetween(2, 4),
      vowelHarmony: rng.chance(0.4),
      consonantHarmony: rng.chance(0.3),
      wordOrder: rng.choice(['SVO', 'SOV', 'VSO']),
      usesAffixes: rng.chance(0.7),
      prefixes: generateAffixes(consonants, vowels, 'prefix', 3),
      suffixes: generateAffixes(consonants, vowels, 'suffix', 5),
      nameStructure: rng.choice(['given', 'given-family', 'single']),
      placeNamePattern: '', // Generated below
    };

    return config;
  }
}
```

## 3. Tracery Grammar Integration

Use Tracery to generate words based on the language's phoneme inventory.

### Grammar Generation

```typescript
interface TraceryGrammar {
  origin: string[];
  syllable: string[];
  consonant: string[];
  vowel: string[];
  cluster?: string[];
  tone?: string[];
}

class TraceryGrammarBuilder {
  /**
   * Build Tracery grammar from language config
   */
  buildGrammar(lang: LanguageConfig): TraceryGrammar {
    // Build syllable patterns
    const syllableRules = lang.syllablePatterns.map(pattern => {
      return pattern
        .replace(/C/g, '#consonant#')
        .replace(/V/g, '#vowel#');
    });

    const grammar: TraceryGrammar = {
      // Word generation: 2-4 syllables
      origin: [
        '#syllable##syllable#',
        '#syllable##syllable##syllable#',
        '#syllable##syllable##syllable##syllable#',
      ],

      syllable: syllableRules,
      consonant: lang.selectedConsonants,
      vowel: lang.selectedVowels,
    };

    // Add optional features
    if (lang.allowedClusters && lang.selectedClusters.length > 0) {
      grammar.cluster = lang.selectedClusters;
    }

    if (lang.allowedTones) {
      grammar.tone = ["'", "`", "^"];
      grammar.origin = grammar.origin.map(o => o + '#tone#');
    }

    return grammar;
  }

  /**
   * Generate a word using Tracery
   */
  generateWord(grammar: TraceryGrammar): string {
    const tracery = require('tracery-grammar');
    const gen = tracery.createGrammar(grammar);
    return gen.flatten('#origin#');
  }
}
```

### Specialized Grammars

```typescript
/**
 * Place name patterns with semantic hints
 */
const PLACE_PATTERNS = {
  river: [
    '#waterWord#',                    // Single word
    '#flowWord# #waterWord#',         // flowing river
    '#adjective# #waterWord#',        // great river
  ],

  mountain: [
    '#heightWord#',
    '#stoneWord# #heightWord#',
    '#adjective# #heightWord#',
  ],

  settlement: [
    '#founderName##settlementSuffix#', // Named after founder
    '#featureWord##settlementSuffix#', // Named after feature
    '#directionWord##settlementSuffix#', // East-town
  ],

  forest: [
    '#treeWord#',
    '#darkWord# #treeWord#',
    '#ancientWord# #treeWord#',
  ],
};
```

## 4. Translation System

LLM-powered translation that builds a persistent dictionary.

### Translation Request

```typescript
interface TranslationRequest {
  word: string;                  // Generated alien word
  context: {
    type: 'person' | 'place' | 'river' | 'mountain' | 'forest' | 'settlement' | 'item';
    description: string;         // What it is
    location?: {
      biome: string;
      terrain: string;
      nearbyFeatures: string[];
    };
    cultural?: {
      species: string;
      importance: 'low' | 'medium' | 'high';
    };
  };
  language: LanguageConfig;      // For phonetic context
}

interface TranslationResult {
  word: string;                  // Original alien word
  translation: string;           // English meaning
  etymology?: string;            // LLM-provided origin story
  morphemes?: {                  // Breakdown of word parts
    [part: string]: string;
  };
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'proper_noun';
  confidence: number;            // 0-1
}
```

### Translation Prompt

```typescript
class LanguageTranslationService {
  async translateWord(req: TranslationRequest): Promise<TranslationResult> {
    const prompt = this.buildTranslationPrompt(req);

    const response = await this.llmProvider.generate({
      prompt,
      temperature: 0.7,
      maxTokens: 200,
    });

    return this.parseTranslation(response, req.word);
  }

  private buildTranslationPrompt(req: TranslationRequest): string {
    const { word, context, language } = req;

    // Get existing dictionary for context
    const existingWords = this.getDictionaryContext(language.id);

    return `You are a xenolinguist translating an alien language.

LANGUAGE PROFILE:
- Planet type: ${language.planetType}
- Phonemes: ${language.selectedConsonants.join(', ')} (consonants), ${language.selectedVowels.join(', ')} (vowels)
- Syllable patterns: ${language.syllablePatterns.join(', ')}
- Word order: ${language.wordOrder}

EXISTING VOCABULARY:
${existingWords.map(w => `- "${w.word}" = ${w.translation}`).join('\n')}

NEW WORD TO TRANSLATE:
Word: "${word}"
Type: ${context.type}
Context: ${context.description}
${context.location ? `Location: ${context.location.biome} biome, ${context.location.terrain} terrain` : ''}
${context.cultural ? `Cultural importance: ${context.cultural.importance}` : ''}

Based on the phonetic structure and context, what does "${word}" mean in this language?
Provide:
1. Translation (1-3 words in English)
2. Etymology (how the word might have formed)
3. Morpheme breakdown if applicable (e.g., "vlef" might be "vle" (water) + "f" (movement))

Format:
Translation: [meaning]
Etymology: [origin story]
Morphemes: [breakdown]`;
  }

  private getDictionaryContext(langId: string, limit: number = 10): DictionaryEntry[] {
    // Get most relevant existing words for context
    const dict = this.dictionaryService.getDictionary(langId);
    return dict.entries.slice(0, limit);
  }
}
```

## 5. Persistent Dictionary

Store and evolve the language dictionary over time.

### Dictionary Schema

```typescript
interface DictionaryEntry {
  word: string;                  // Alien word
  translation: string;           // English meaning
  etymology?: string;            // Origin story
  morphemes?: Record<string, string>;
  partOfSpeech: string;
  usageCount: number;            // How many times used
  firstUsed: number;             // Tick when first generated
  contexts: string[];            // Where it's been used
}

interface LanguageDictionary {
  languageId: string;
  entries: DictionaryEntry[];
  morphemeLibrary: {             // Common word parts
    [morpheme: string]: {
      meaning: string;
      type: 'root' | 'prefix' | 'suffix';
      frequency: number;
    };
  };
  metadata: {
    totalWords: number;
    createdAt: number;
    lastUpdated: number;
  };
}
```

### Dictionary Service

```typescript
class LanguageDictionaryService {
  private dictionaries: Map<string, LanguageDictionary> = new Map();

  /**
   * Get or create dictionary for language
   */
  getDictionary(languageId: string): LanguageDictionary {
    if (!this.dictionaries.has(languageId)) {
      this.dictionaries.set(languageId, {
        languageId,
        entries: [],
        morphemeLibrary: {},
        metadata: {
          totalWords: 0,
          createdAt: Date.now(),
          lastUpdated: Date.now(),
        },
      });
    }
    return this.dictionaries.get(languageId)!;
  }

  /**
   * Add translation to dictionary
   */
  addEntry(languageId: string, entry: DictionaryEntry): void {
    const dict = this.getDictionary(languageId);

    // Check if word already exists
    const existing = dict.entries.find(e => e.word === entry.word);
    if (existing) {
      existing.usageCount++;
      existing.contexts.push(...entry.contexts);
      return;
    }

    // Add new entry
    dict.entries.push(entry);
    dict.metadata.totalWords++;
    dict.metadata.lastUpdated = Date.now();

    // Update morpheme library
    if (entry.morphemes) {
      for (const [morpheme, meaning] of Object.entries(entry.morphemes)) {
        if (!dict.morphemeLibrary[morpheme]) {
          dict.morphemeLibrary[morpheme] = {
            meaning,
            type: this.classifyMorpheme(morpheme, entry.word),
            frequency: 0,
          };
        }
        dict.morphemeLibrary[morpheme].frequency++;
      }
    }

    this.saveDictionary(dict);
  }

  /**
   * Look up existing translation
   */
  lookup(languageId: string, word: string): DictionaryEntry | null {
    const dict = this.getDictionary(languageId);
    return dict.entries.find(e => e.word === word) || null;
  }

  /**
   * Find words by morpheme
   */
  findByMorpheme(languageId: string, morpheme: string): DictionaryEntry[] {
    const dict = this.getDictionary(languageId);
    return dict.entries.filter(e =>
      e.morphemes && Object.keys(e.morphemes).includes(morpheme)
    );
  }

  private classifyMorpheme(morpheme: string, fullWord: string): 'root' | 'prefix' | 'suffix' {
    if (fullWord.startsWith(morpheme)) return 'prefix';
    if (fullWord.endsWith(morpheme)) return 'suffix';
    return 'root';
  }

  private saveDictionary(dict: LanguageDictionary): void {
    // Persist to storage
    const path = `data/languages/${dict.languageId}.json`;
    // ... save implementation
  }
}
```

## 6. Name Generation Workflow

Complete workflow for generating names with translation.

### Generate Place Name

```typescript
class PlaceNameGenerator {
  constructor(
    private grammarBuilder: TraceryGrammarBuilder,
    private translationService: LanguageTranslationService,
    private dictionaryService: LanguageDictionaryService
  ) {}

  async generatePlaceName(
    place: {
      type: 'river' | 'mountain' | 'forest' | 'settlement';
      description: string;
      location: { biome: string; terrain: string };
    },
    language: LanguageConfig
  ): Promise<{ name: string; translation: string; etymology?: string }> {

    // 1. Generate alien word using Tracery
    const grammar = this.grammarBuilder.buildGrammar(language);
    const alienWord = this.grammarBuilder.generateWord(grammar);

    // 2. Check if word already exists in dictionary
    const existing = this.dictionaryService.lookup(language.id, alienWord);
    if (existing) {
      return {
        name: alienWord,
        translation: existing.translation,
        etymology: existing.etymology,
      };
    }

    // 3. Request translation from LLM
    const translation = await this.translationService.translateWord({
      word: alienWord,
      context: {
        type: place.type,
        description: place.description,
        location: place.location,
      },
      language,
    });

    // 4. Add to dictionary
    this.dictionaryService.addEntry(language.id, {
      word: alienWord,
      translation: translation.translation,
      etymology: translation.etymology,
      morphemes: translation.morphemes,
      partOfSpeech: 'proper_noun',
      usageCount: 1,
      firstUsed: Date.now(),
      contexts: [place.description],
    });

    return {
      name: alienWord,
      translation: translation.translation,
      etymology: translation.etymology,
    };
  }
}
```

### Generate Person Name

```typescript
async generatePersonName(
  person: {
    species: string;
    gender?: string;
    role?: string;
  },
  language: LanguageConfig
): Promise<{ name: string; meaning?: string }> {

  const grammar = this.grammarBuilder.buildGrammar(language);

  // Generate based on name structure
  let fullName: string;

  switch (language.nameStructure) {
    case 'given':
      fullName = this.grammarBuilder.generateWord(grammar);
      break;

    case 'given-family':
      const givenName = this.grammarBuilder.generateWord(grammar);
      const familyName = this.grammarBuilder.generateWord(grammar);
      fullName = `${givenName} ${familyName}`;
      break;

    case 'single':
      fullName = this.grammarBuilder.generateWord(grammar);
      // Add honorific suffix if high status
      if (person.role && ['leader', 'elder', 'priest'].includes(person.role)) {
        fullName += language.suffixes[0] || '';
      }
      break;
  }

  // Optional: Translate name meaning
  if (person.role) {
    const translation = await this.translationService.translateWord({
      word: fullName,
      context: {
        type: 'person',
        description: `A ${person.species} ${person.role}`,
        cultural: {
          species: person.species,
          importance: 'high',
        },
      },
      language,
    });

    return {
      name: fullName,
      meaning: translation.translation,
    };
  }

  return { name: fullName };
}
```

## 7. Integration Points

### Planet Initialization

```typescript
// In PlanetInitializer.ts
async function initializePlanet(config: PlanetConfig, options: PlanetInitializationOptions) {
  // ... existing planet setup

  // Generate language for planet
  const languageGenerator = new LanguageGenerator();
  const language = languageGenerator.generateLanguage(config, config.seed);

  // Store language with planet
  planet.setLanguage(language);

  // Generate name for planet in its own language
  const nameGen = new PlaceNameGenerator(grammarBuilder, translationService, dictionaryService);
  const planetName = await nameGen.generatePlaceName(
    {
      type: 'settlement', // Or special 'world' type
      description: `A ${config.type} world`,
      location: { biome: config.primaryBiome, terrain: 'varied' },
    },
    language
  );

  planet.setNativeName(planetName.name);

  return planet;
}
```

### Entity Naming

```typescript
// In entity creation (agents, creatures, etc.)
const entity = world.createEntity();

// Get planet's language
const language = world.planet.getLanguage();

// Generate name
const nameGen = new PlaceNameGenerator(grammarBuilder, translationService, dictionaryService);
const name = await nameGen.generatePersonName(
  {
    species: entity.species,
    gender: entity.gender,
    role: entity.role,
  },
  language
);

entity.addComponent({
  type: 'identity',
  name: name.name,
  nativeNameMeaning: name.meaning,
});
```

### Geographic Feature Naming

```typescript
// When discovering/generating geographic features
class TerrainGenerator {
  async generateRiver(chunk: Chunk, language: LanguageConfig) {
    const river = createRiverFeature(chunk);

    // Generate name for river
    const nameGen = new PlaceNameGenerator(grammarBuilder, translationService, dictionaryService);
    const riverName = await nameGen.generatePlaceName(
      {
        type: 'river',
        description: 'A river flowing through plains',
        location: {
          biome: chunk.biome,
          terrain: chunk.terrainType,
        },
      },
      language
    );

    river.nativeName = riverName.name;
    river.translation = riverName.translation;

    return river;
  }
}
```

## 8. Data Persistence

### Storage Schema

```typescript
// Planet data includes language
interface PlanetSnapshot {
  // ... existing fields
  language?: LanguageConfig;
  nativeName?: string;
  dictionary?: LanguageDictionary;
}

// Save/load integration
class PlanetSaveSystem {
  savePlanet(planet: Planet): PlanetSnapshot {
    return {
      // ... existing fields
      language: planet.getLanguage(),
      nativeName: planet.getNativeName(),
      dictionary: planet.getDictionary(),
    };
  }

  loadPlanet(snapshot: PlanetSnapshot): Planet {
    const planet = new Planet(snapshot.config);

    if (snapshot.language) {
      planet.setLanguage(snapshot.language);
    }

    if (snapshot.dictionary) {
      dictionaryService.loadDictionary(snapshot.dictionary);
    }

    return planet;
  }
}
```

## 9. Example Flow

### Complete Example: Naming a River

```typescript
// 1. Generate language for volcanic planet
const volcanoLang = languageGenerator.generateLanguage(
  { type: 'volcanic', seed: 'planet_123' },
  'planet_123'
);
// Result: Heavy on 'k', 'kh', 'x', 'r' sounds, prefers 'a', 'i' vowels

// 2. Build Tracery grammar
const grammar = grammarBuilder.buildGrammar(volcanoLang);
// Grammar: {
//   consonant: ['k', 'kh', 'r', 'x', 't', ...],
//   vowel: ['a', 'i', 'e'],
//   syllable: ['#consonant##vowel#', '#consonant##vowel##consonant#'],
//   origin: ['#syllable##syllable#', '#syllable##syllable##syllable#']
// }

// 3. Generate river name
const riverWord = grammarBuilder.generateWord(grammar);
// Result: "Xakri'khar" (randomized from grammar)

// 4. Build translation request
const translationReq = {
  word: "Xakri'khar",
  context: {
    type: 'river',
    description: 'A river flowing through volcanic plains',
    location: {
      biome: 'volcanic',
      terrain: 'rocky_plains',
      nearbyFeatures: ['lava_flow', 'ash_field'],
    },
  },
  language: volcanoLang,
};

// 5. LLM translates
// Prompt includes: volcanic phonemes, existing words like "khar" = "fire", "xa" = "flow"
const translation = await translationService.translateWord(translationReq);
// Result: {
//   translation: "Fire-Flow River",
//   etymology: "Xak (ancient word for molten stone) + ri' (through) + khar (fire)",
//   morphemes: {
//     xak: "lava/molten",
//     ri: "through/movement",
//     khar: "fire"
//   }
// }

// 6. Store in dictionary
dictionaryService.addEntry(volcanoLang.id, {
  word: "Xakri'khar",
  translation: "Fire-Flow River",
  etymology: "...",
  morphemes: { xak: "lava", ri: "through", khar: "fire" },
  partOfSpeech: 'proper_noun',
  usageCount: 1,
  firstUsed: 12345,
  contexts: ['volcanic river'],
});

// 7. Next time "khar" appears in a word, LLM knows it means "fire"
// Future word: "Vikhar" → LLM sees "khar" (fire) + context → "Smoke-Fire" or "Dark Fire"
```

## 10. Advanced Features

### Morpheme Recognition

Over time, the system learns common word parts:

```typescript
// After many translations, dictionary accumulates morphemes:
morphemeLibrary: {
  'khar': { meaning: 'fire', type: 'root', frequency: 15 },
  'xa': { meaning: 'flow/water', type: 'root', frequency: 8 },
  'ri': { meaning: 'through/movement', type: 'suffix', frequency: 12 },
  'vik': { meaning: 'dark/shadow', type: 'prefix', frequency: 6 },
}

// When translating new word "Kharvik" (fire + dark):
// LLM prompt includes known morphemes → guides translation to "Dark Fire" or "Shadow Flame"
```

### Language Evolution

```typescript
// Track language change over generations
interface LanguageEvolution {
  originalLanguage: LanguageConfig;
  generation: number;
  changes: {
    phonemeShifts: { from: string; to: string }[];
    newLoanwords: string[];
    archivedWords: string[];
  };
}

// Example: Over 100 years, 'k' → 'h' shift
// "Khar" (fire) becomes "Har" in modern dialect
```

### Multi-Language Worlds

```typescript
// For planets with multiple sapient species
interface MultilingualPlanet {
  languages: LanguageConfig[];
  lingua_franca?: LanguageConfig;  // Trade language

  // Loanwords between languages
  loanwords: {
    [targetLangId: string]: {
      word: string;
      sourceLang: string;
      originalWord: string;
    }[];
  };
}
```

## 11. UI/UX Considerations

### Name Display

```typescript
// Show both native name and translation
interface NameDisplay {
  native: string;        // "Xakri'khar"
  translation: string;   // "Fire-Flow River"
  showNative: boolean;   // User preference
}

// Tooltip on hover shows etymology
// "Xakri'khar (Fire-Flow River)
//  Etymology: Xak (molten stone) + ri' (through) + khar (fire)"
```

### Dictionary Browser

- In-game "lexicon" panel showing discovered words
- Filter by type (places, people, items)
- Show morpheme breakdowns
- Etymology stories

## 12. Implementation Phases

### Phase 1: Core System (MVP)
- [ ] Phoneme inventory
- [ ] Language generator
- [ ] Tracery integration
- [ ] Basic grammar generation
- [ ] Simple word generation

### Phase 2: Translation
- [ ] LLM translation service
- [ ] Translation prompt engineering
- [ ] Dictionary storage
- [ ] Persistence

### Phase 3: Integration
- [ ] Planet language generation
- [ ] Place name generation
- [ ] Person name generation
- [ ] UI for displaying names

### Phase 4: Advanced
- [ ] Morpheme learning
- [ ] Consistent translations
- [ ] Etymology generation
- [ ] Dictionary browser UI

### Phase 5: Sophistication
- [ ] Language evolution
- [ ] Multi-language support
- [ ] Loanwords
- [ ] Dialect variation

## 13. Technical Dependencies

```json
{
  "dependencies": {
    "tracery-grammar": "^2.7.0"  // Grammar-based text generation
  }
}
```

## Files to Create

```
packages/language/
├── src/
│   ├── PhonemeInventory.ts       // Universal phoneme sets
│   ├── LanguageGenerator.ts      // Generate language configs
│   ├── TraceryGrammarBuilder.ts  // Build grammars from languages
│   ├── LanguageTranslationService.ts  // LLM translation
│   ├── LanguageDictionaryService.ts   // Persistent dictionary
│   ├── PlaceNameGenerator.ts     // Generate place names
│   ├── PersonNameGenerator.ts    // Generate person names
│   └── types.ts                  // TypeScript interfaces
├── data/
│   └── phonemes.json             // Phoneme inventory data
└── README.md
```

## Example Output

```
Planet: Volcanic world
Language: Harsh, guttural (k, kh, x, r sounds)

Generated Names:
- River: "Xakri'khar" (Fire-Flow River)
- Mountain: "Korthak" (Stone-Peak)
- Settlement: "Vikhareth" (Shadow-Fire-Place)
- Person: "Kor'xa Thakrin" (Stone-Water [given] Fire-Bringer [family])

Dictionary Growth:
Initial: 0 words
After exploring: 25 words (15 places, 8 people, 2 items)
After 100 generations: 200+ words, 50 recognized morphemes
```

## 14. LLM Context Integration

### How Language Information Flows into Agent Prompts

Language context is injected at three levels of the agent prompt system:

#### 1. System Prompt (Identity & Culture)

Language and cultural context is added to the agent's system prompt via `buildSystemPrompt()` in `StructuredPromptBuilder.ts`.

**Integration Point**: Extend `PersonalityPromptTemplates.ts` to include species language information.

```typescript
// In PersonalityPromptTemplates.ts
export function generatePersonalityPrompt(options: PersonalityPromptOptions): string {
  const { name, personality, entityId } = options;

  // Get agent's species and language
  const species = options.species;  // NEW: passed from entity
  const language = options.language; // NEW: from planet/species

  let prompt = `You are ${name}, a ${species} villager in this settlement.\n\n`;

  // Add language/culture section
  if (language) {
    prompt += `Your People:\n`;
    prompt += `- You speak ${language.name || 'your ancestral tongue'}, `;
    prompt += `a language shaped by ${language.planetType} landscapes. `;

    // Show phonetic character
    if (language.selectedConsonants.includes('kh') || language.selectedConsonants.includes('x')) {
      prompt += `It's a harsh, guttural language with sharp sounds that echo through volcanic valleys.\n`;
    } else if (language.selectedConsonants.includes('l') || language.selectedConsonants.includes('w')) {
      prompt += `It's a flowing, liquid language like water over stones.\n`;
    }

    // Show morpheme awareness
    const commonMorphemes = getCommonMorphemes(language.id, 5);
    if (commonMorphemes.length > 0) {
      prompt += `- You know the old roots: `;
      prompt += commonMorphemes.map(m => `"${m.morpheme}" (${m.meaning})`).join(', ');
      prompt += `. These sounds carry weight in your tongue.\n`;
    }

    prompt += `\n`;
  }

  prompt += 'Your Personality:\n';
  // ... existing personality code
}
```

**Example Output in System Prompt**:
```
You are Kor'xa Thakrin, a volcanic-dweller villager in this settlement.

Your People:
- You speak Khartongue, a language shaped by volcanic landscapes. It's a harsh, guttural language with sharp sounds that echo through volcanic valleys.
- You know the old roots: "khar" (fire), "xa" (flow), "vik" (shadow), "ri" (through). These sounds carry weight in your tongue.

Your Personality:
- You're methodical and patient, like cooling lava...
```

#### 2. World Context (Current Location)

Place names with translations are added to world context via `WorldContextBuilder.ts`.

**Integration Point**: Extend `buildVisionContext()` to include place name translations for visible landmarks.

```typescript
// In WorldContextBuilder.ts
private buildVisionContext(...): string {
  // ... existing vision code

  // LOCATION NAMES WITH TRANSLATIONS
  if (vision.currentLocation) {
    const locationName = this.getLocationNameWithTranslation(vision.currentLocation, world);
    if (locationName) {
      context += locationName;
    }
  }

  // DISTANT LANDMARKS with translations
  const landmarks = vision.distantLandmarks ?? [];
  if (landmarks.length > 0) {
    context += this.buildLandmarkContext(landmarks, world);
  }

  return context;
}

/**
 * Get current location name with translation
 */
private getLocationNameWithTranslation(locationId: string, world: World): string | null {
  const location = world.getEntity(locationId);
  if (!location) return null;

  const identity = location.components.get('identity') as IdentityComponent | undefined;
  const geographic = location.components.get('geographic_feature') as GeographicFeatureComponent | undefined;

  if (!identity?.nativeName) return null;

  // Get translation from dictionary
  const language = world.planet?.getLanguage();
  if (!language) return `- Location: ${identity.nativeName}\n`;

  const translation = dictionaryService.lookup(language.id, identity.nativeName);

  if (translation) {
    return `- Location: ${identity.nativeName} (${translation.translation})\n`;
  }

  return `- Location: ${identity.nativeName}\n`;
}

/**
 * Build landmark context with translations
 */
private buildLandmarkContext(landmarks: string[], world: World): string {
  const language = world.planet?.getLanguage();
  if (!language) return '';

  const landmarkDescriptions: string[] = [];

  for (const landmarkId of landmarks.slice(0, 5)) {
    const landmark = world.getEntity(landmarkId);
    if (!landmark) continue;

    const identity = landmark.components.get('identity') as IdentityComponent | undefined;
    if (!identity?.nativeName) continue;

    const translation = dictionaryService.lookup(language.id, identity.nativeName);

    if (translation) {
      landmarkDescriptions.push(`${identity.nativeName} (${translation.translation})`);
    } else {
      landmarkDescriptions.push(identity.nativeName);
    }
  }

  if (landmarkDescriptions.length > 0) {
    return `- Landmarks visible: ${landmarkDescriptions.join(', ')} in the distance\n`;
  }

  return '';
}
```

**Example Output in World Context**:
```
Current Situation:
- Hunger: 45% (could eat)
- Energy: 72% (rested)
- Location: Xakri'khar (Fire-Flow River)
- Landmarks visible: Korthak (Stone-Peak), Vikhareth (Shadow-Fire Settlement) in the distance
- You see nearby: Mira (gathering berries)
```

#### 3. Episodic Memories (Past Events)

Place name translations are added to episodic memories so agents understand what locations mean.

**Integration Point**: Extend `buildEpisodicMemories()` in `StructuredPromptBuilder.ts`.

```typescript
// In StructuredPromptBuilder.ts
private buildEpisodicMemories(
  episodicMemory: EpisodicMemoryComponent | undefined,
  world: World
): string {
  if (!episodicMemory?.memories || episodicMemory.memories.length === 0) {
    return '- No significant memories yet\n';
  }

  const language = world.planet?.getLanguage();
  let memoriesText = '';

  const recentMemories = episodicMemory.memories
    .slice(-10)
    .sort((a, b) => b.emotionalImpact - a.emotionalImpact)
    .slice(0, 5);

  for (const memory of recentMemories) {
    let memoryText = memory.description;

    // Enhance memory with place name translations
    if (memory.location && language) {
      memoryText = this.enrichMemoryWithTranslations(memoryText, memory.location, language, world);
    }

    const emotionTag = memory.emotionalImpact > 0.7 ? ' [vivid]' : '';
    memoriesText += `- ${memoryText}${emotionTag}\n`;
  }

  return memoriesText;
}

/**
 * Enrich memory text with place name translations
 *
 * Example: "You courted Mira at Talaxian Lake"
 * Becomes: "You courted Mira at Talaxian Lake (Lover's Lake)"
 */
private enrichMemoryWithTranslations(
  memoryText: string,
  locationId: string,
  language: LanguageConfig,
  world: World
): string {
  const location = world.getEntity(locationId);
  if (!location) return memoryText;

  const identity = location.components.get('identity') as IdentityComponent | undefined;
  if (!identity?.nativeName) return memoryText;

  const translation = dictionaryService.lookup(language.id, identity.nativeName);
  if (!translation) return memoryText;

  // Replace native name with "NativeName (Translation)"
  const nativeNamePattern = new RegExp(`\\b${identity.nativeName}\\b`, 'g');
  return memoryText.replace(
    nativeNamePattern,
    `${identity.nativeName} (${translation.translation})`
  );
}
```

**Example Output in Memories**:
```
Memories:
- You courted Mira at Talaxian Lake (Lover's Lake) [vivid]
- You built a campfire with Kor near Vikhareth (Shadow-Fire Settlement)
- You saw a strange light above Korthak (Stone-Peak)
- You gathered berries along Xakri'khar (Fire-Flow River)
```

### Complete Prompt Example

Here's what a complete agent prompt looks like with language integration:

```
SYSTEM PROMPT:
You are Kor'xa Thakrin, a volcanic-dweller villager in this settlement.

Your People:
- You speak Khartongue, a language shaped by volcanic landscapes. It's a harsh, guttural language with sharp sounds that echo through volcanic valleys.
- You know the old roots: "khar" (fire), "xa" (flow), "vik" (shadow), "ri" (through). These sounds carry weight in your tongue.

Your Personality:
- You're methodical and patient, like cooling lava. Tasks get done—eventually, thoroughly, without fuss.
- [... more personality traits ...]

---

Current Situation:
- Hunger: 45% (could eat)
- Energy: 72% (rested)
- Location: Xakri'khar (Fire-Flow River)
- Landmarks visible: Korthak (Stone-Peak), Vikhareth (Shadow-Fire Settlement) in the distance
- You see nearby: Mira (gathering berries), 3 berry bushes

Memories:
- You courted Mira at Talaxian Lake (Lover's Lake) [vivid]
- You built a campfire with Kor near Vikhareth (Shadow-Fire Settlement)
- You saw a strange light above Korthak (Stone-Peak)

Buildings you can construct:
- campfire (10 stone + 5 wood) - provides warmth
- storage-chest (10 wood) - storage

Available Actions:
["wander", "gather", "build", "talk", "pick_berries"]

What do you want to do next?
```

### Key Benefits

1. **Cultural Immersion**: Agents understand their language's character and history
2. **Place Meaning**: Location names aren't arbitrary - "Fire-Flow River" tells you what to expect
3. **Memory Enrichment**: Past events carry linguistic context - "Lover's Lake" explains why it's special
4. **Morpheme Awareness**: Agents recognize word roots ("khar" = fire) making new names interpretable
5. **Consistent World**: Same language rules apply everywhere, creating coherent alien culture

### Data Flow Summary

```
Planet Generation
    ↓
Language Config Created
    ↓
Place Names Generated (Tracery)
    ↓
LLM Translates Names → Dictionary
    ↓
Agent Prompt Building:
  ├─→ System Prompt: Language identity, morpheme knowledge
  ├─→ World Context: Current location with translation
  └─→ Memories: Past locations with translations
    ↓
Agent Decision (LLM knows what names mean)
```

---

**Next Steps**: Review spec → Implement Phase 1 (core system) → Test with volcanic planet → Iterate
