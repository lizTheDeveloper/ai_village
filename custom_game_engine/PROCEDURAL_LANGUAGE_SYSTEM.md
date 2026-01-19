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

**Universal phoneme sets with descriptive metadata** that can be mixed to create distinct languages. Each phoneme has tags that Tracery uses to describe the language's character.

### Phoneme Schema

```typescript
interface PhonemeMetadata {
  sound: string;              // The phoneme symbol (e.g., 'kh', 'l', 'a')
  category: 'consonant' | 'vowel' | 'cluster' | 'tone';

  // Descriptive qualities (used by Tracery to describe language)
  qualities: {
    texture: string[];        // guttural, liquid, percussive, sibilant, nasal, breathy
    hardness: string[];       // harsh, soft, crisp, smooth, rough
    position: string[];       // front, back, central, high, low
    manner: string[];         // flowing, clipped, resonant, sharp, rounded
  };

  // Phonetic classification
  type?: string;              // stop, fricative, nasal, liquid, glide, close, mid, open
}

interface PhonemeInventory {
  consonants: PhonemeMetadata[];
  vowels: PhonemeMetadata[];
  clusters: PhonemeMetadata[];
  tones: PhonemeMetadata[];
  syllablePatterns: string[];
}
```

### Phoneme Library with Descriptive Metadata

```typescript
const UNIVERSAL_PHONEMES: PhonemeInventory = {
  consonants: [
    // STOPS - Percussive, clipped
    { sound: 'p', category: 'consonant', type: 'stop',
      qualities: { texture: ['percussive'], hardness: ['crisp'], position: ['front'], manner: ['clipped', 'sharp'] } },
    { sound: 't', category: 'consonant', type: 'stop',
      qualities: { texture: ['percussive'], hardness: ['crisp'], position: ['front'], manner: ['clipped', 'sharp'] } },
    { sound: 'k', category: 'consonant', type: 'stop',
      qualities: { texture: ['percussive'], hardness: ['crisp'], position: ['back'], manner: ['clipped'] } },
    { sound: 'b', category: 'consonant', type: 'stop',
      qualities: { texture: ['percussive'], hardness: ['soft'], position: ['front'], manner: ['clipped'] } },
    { sound: 'd', category: 'consonant', type: 'stop',
      qualities: { texture: ['percussive'], hardness: ['soft'], position: ['front'], manner: ['clipped'] } },
    { sound: 'g', category: 'consonant', type: 'stop',
      qualities: { texture: ['percussive'], hardness: ['soft'], position: ['back'], manner: ['clipped'] } },
    { sound: 'q', category: 'consonant', type: 'stop',
      qualities: { texture: ['guttural', 'percussive'], hardness: ['harsh'], position: ['back'], manner: ['clipped', 'sharp'] } },
    { sound: "'", category: 'consonant', type: 'stop',
      qualities: { texture: ['percussive'], hardness: ['harsh'], position: ['back'], manner: ['clipped', 'sharp'] } },

    // FRICATIVES - Sibilant, harsh or soft
    { sound: 'f', category: 'consonant', type: 'fricative',
      qualities: { texture: ['sibilant'], hardness: ['soft'], position: ['front'], manner: ['flowing'] } },
    { sound: 's', category: 'consonant', type: 'fricative',
      qualities: { texture: ['sibilant'], hardness: ['crisp'], position: ['front'], manner: ['sharp'] } },
    { sound: 'sh', category: 'consonant', type: 'fricative',
      qualities: { texture: ['sibilant'], hardness: ['soft'], position: ['front'], manner: ['flowing'] } },
    { sound: 'v', category: 'consonant', type: 'fricative',
      qualities: { texture: ['sibilant'], hardness: ['soft'], position: ['front'], manner: ['flowing'] } },
    { sound: 'z', category: 'consonant', type: 'fricative',
      qualities: { texture: ['sibilant'], hardness: ['soft'], position: ['front'], manner: ['flowing'] } },
    { sound: 'th', category: 'consonant', type: 'fricative',
      qualities: { texture: ['sibilant'], hardness: ['soft'], position: ['front'], manner: ['flowing'] } },
    { sound: 'kh', category: 'consonant', type: 'fricative',
      qualities: { texture: ['guttural'], hardness: ['harsh', 'rough'], position: ['back'], manner: ['sharp'] } },
    { sound: 'x', category: 'consonant', type: 'fricative',
      qualities: { texture: ['guttural'], hardness: ['harsh'], position: ['back'], manner: ['sharp'] } },
    { sound: 'h', category: 'consonant', type: 'fricative',
      qualities: { texture: ['breathy'], hardness: ['soft'], position: ['back'], manner: ['flowing'] } },

    // NASALS - Resonant, soft
    { sound: 'm', category: 'consonant', type: 'nasal',
      qualities: { texture: ['nasal'], hardness: ['soft'], position: ['front'], manner: ['resonant', 'rounded'] } },
    { sound: 'n', category: 'consonant', type: 'nasal',
      qualities: { texture: ['nasal'], hardness: ['soft'], position: ['front'], manner: ['resonant'] } },
    { sound: 'ng', category: 'consonant', type: 'nasal',
      qualities: { texture: ['nasal'], hardness: ['soft'], position: ['back'], manner: ['resonant'] } },

    // LIQUIDS - Flowing, smooth
    { sound: 'l', category: 'consonant', type: 'liquid',
      qualities: { texture: ['liquid'], hardness: ['soft', 'smooth'], position: ['front'], manner: ['flowing'] } },
    { sound: 'r', category: 'consonant', type: 'liquid',
      qualities: { texture: ['liquid'], hardness: ['smooth'], position: ['central'], manner: ['flowing', 'resonant'] } },
    { sound: 'rr', category: 'consonant', type: 'liquid',
      qualities: { texture: ['liquid'], hardness: ['rough'], position: ['central'], manner: ['resonant'] } },

    // GLIDES - Smooth, flowing
    { sound: 'w', category: 'consonant', type: 'glide',
      qualities: { texture: ['liquid'], hardness: ['smooth'], position: ['back'], manner: ['flowing', 'rounded'] } },
    { sound: 'y', category: 'consonant', type: 'glide',
      qualities: { texture: ['liquid'], hardness: ['smooth'], position: ['front'], manner: ['flowing'] } },

    // AFFRICATES - Complex, percussive
    { sound: 'ch', category: 'consonant', type: 'affricate',
      qualities: { texture: ['sibilant', 'percussive'], hardness: ['crisp'], position: ['front'], manner: ['sharp'] } },
    { sound: 'j', category: 'consonant', type: 'affricate',
      qualities: { texture: ['sibilant', 'percussive'], hardness: ['soft'], position: ['front'], manner: ['flowing'] } },
  ],

  vowels: [
    // CLOSE VOWELS - High, tight
    { sound: 'i', category: 'vowel', type: 'close',
      qualities: { texture: ['liquid'], hardness: ['crisp'], position: ['front', 'high'], manner: ['sharp'] } },
    { sound: 'u', category: 'vowel', type: 'close',
      qualities: { texture: ['liquid'], hardness: ['soft'], position: ['back', 'high'], manner: ['rounded'] } },
    { sound: 'ü', category: 'vowel', type: 'close',
      qualities: { texture: ['liquid'], hardness: ['crisp'], position: ['front', 'high'], manner: ['rounded'] } },

    // MID VOWELS - Balanced
    { sound: 'e', category: 'vowel', type: 'mid',
      qualities: { texture: ['liquid'], hardness: ['smooth'], position: ['front', 'central'], manner: ['flowing'] } },
    { sound: 'o', category: 'vowel', type: 'mid',
      qualities: { texture: ['liquid'], hardness: ['smooth'], position: ['back', 'central'], manner: ['rounded', 'flowing'] } },
    { sound: 'ö', category: 'vowel', type: 'mid',
      qualities: { texture: ['liquid'], hardness: ['smooth'], position: ['front', 'central'], manner: ['rounded'] } },

    // OPEN VOWELS - Low, resonant
    { sound: 'a', category: 'vowel', type: 'open',
      qualities: { texture: ['liquid'], hardness: ['soft'], position: ['central', 'low'], manner: ['resonant', 'flowing'] } },
    { sound: 'ä', category: 'vowel', type: 'open',
      qualities: { texture: ['liquid'], hardness: ['soft'], position: ['front', 'low'], manner: ['resonant'] } },
  ],

  clusters: [
    { sound: 'tr', category: 'cluster', type: 'complex',
      qualities: { texture: ['percussive', 'liquid'], hardness: ['crisp'], position: ['front'], manner: ['flowing'] } },
    { sound: 'kr', category: 'cluster', type: 'complex',
      qualities: { texture: ['percussive', 'liquid'], hardness: ['harsh'], position: ['back'], manner: ['flowing'] } },
    { sound: 'fl', category: 'cluster', type: 'complex',
      qualities: { texture: ['sibilant', 'liquid'], hardness: ['soft'], position: ['front'], manner: ['flowing'] } },
    { sound: 'bl', category: 'cluster', type: 'complex',
      qualities: { texture: ['percussive', 'liquid'], hardness: ['soft'], position: ['front'], manner: ['flowing'] } },
    { sound: 'gr', category: 'cluster', type: 'complex',
      qualities: { texture: ['percussive', 'liquid'], hardness: ['rough'], position: ['back'], manner: ['resonant'] } },
    { sound: 'st', category: 'cluster', type: 'complex',
      qualities: { texture: ['sibilant', 'percussive'], hardness: ['crisp'], position: ['front'], manner: ['sharp'] } },
    { sound: 'sk', category: 'cluster', type: 'complex',
      qualities: { texture: ['sibilant', 'percussive'], hardness: ['crisp'], position: ['back'], manner: ['sharp'] } },
  ],

  tones: [
    { sound: "'", category: 'tone', type: 'high',
      qualities: { texture: ['tonal'], hardness: ['crisp'], position: ['high'], manner: ['sharp'] } },
    { sound: "`", category: 'tone', type: 'low',
      qualities: { texture: ['tonal'], hardness: ['soft'], position: ['low'], manner: ['resonant'] } },
    { sound: "^", category: 'tone', type: 'rising',
      qualities: { texture: ['tonal'], hardness: ['smooth'], position: ['central'], manner: ['flowing'] } },
  ],

  syllablePatterns: ['CV', 'CVC', 'CVCC', 'V', 'VC', 'CCV', 'CCVC'],
};
```

### Language Character Analysis

After selecting phonemes for a language, analyze their qualities to generate a Tracery description:

```typescript
interface LanguageCharacter {
  primaryTexture: string;     // e.g., 'guttural', 'liquid', 'percussive'
  secondaryTexture?: string;  // Optional secondary quality
  primaryHardness: string;    // e.g., 'harsh', 'soft', 'crisp'
  primaryManner: string;      // e.g., 'flowing', 'clipped', 'sharp'
  positions: string[];        // e.g., ['back', 'low'] for deep sounds
}

class PhonemeAnalyzer {
  /**
   * Analyze selected phonemes to determine language character
   */
  analyzeLanguageCharacter(selectedPhonemes: PhonemeMetadata[]): LanguageCharacter {
    const qualityCounts: Record<string, number> = {};

    // Count all quality occurrences
    for (const phoneme of selectedPhonemes) {
      for (const qualityType of Object.values(phoneme.qualities)) {
        for (const quality of qualityType) {
          qualityCounts[quality] = (qualityCounts[quality] || 0) + 1;
        }
      }
    }

    // Find dominant qualities by category
    const textures = this.filterByCategory(qualityCounts, ['guttural', 'liquid', 'percussive', 'sibilant', 'nasal', 'breathy']);
    const hardnesses = this.filterByCategory(qualityCounts, ['harsh', 'soft', 'crisp', 'smooth', 'rough']);
    const manners = this.filterByCategory(qualityCounts, ['flowing', 'clipped', 'sharp', 'resonant', 'rounded']);
    const positions = this.filterByCategory(qualityCounts, ['front', 'back', 'central', 'high', 'low']);

    return {
      primaryTexture: this.getTopQuality(textures),
      secondaryTexture: this.getSecondQuality(textures),
      primaryHardness: this.getTopQuality(hardnesses),
      primaryManner: this.getTopQuality(manners),
      positions: this.getTopQualities(positions, 2),
    };
  }

  private filterByCategory(counts: Record<string, number>, categories: string[]): Record<string, number> {
    return Object.fromEntries(
      Object.entries(counts).filter(([key]) => categories.includes(key))
    );
  }

  private getTopQuality(counts: Record<string, number>): string {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'neutral';
  }

  private getSecondQuality(counts: Record<string, number>): string | undefined {
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[1]?.[0];
  }

  private getTopQualities(counts: Record<string, number>, n: number): string[] {
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key]) => key);
  }
}
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

  // Phoneme selection (actual phoneme metadata objects)
  selectedPhonemes: PhonemeMetadata[];  // Complete phoneme objects with qualities

  // Legacy flat arrays (for Tracery compatibility)
  selectedConsonants: string[];  // Just the sound strings
  selectedVowels: string[];
  selectedClusters: string[];
  allowedClusters: boolean;
  allowedTones: boolean;

  // Language character (analyzed from phonemes)
  character: LanguageCharacter;  // NEW: Dominant qualities
  description: string;           // NEW: Tracery-generated description

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
  private phonemeAnalyzer = new PhonemeAnalyzer();
  private descriptionGrammar = new LanguageDescriptionGrammar();

  /**
   * Generate a language from planet configuration
   */
  generateLanguage(planetConfig: PlanetConfig, seed: string): LanguageConfig {
    const rng = seededRandom(seed);

    // 1. Select phoneme objects (with metadata)
    const selectedConsonants = this.selectPhonemesWithBias(
      UNIVERSAL_PHONEMES.consonants,
      planetConfig.type,
      rng,
      8,
      15
    );

    const selectedVowels = this.selectPhonemesWithBias(
      UNIVERSAL_PHONEMES.vowels,
      planetConfig.type,
      rng,
      3,
      7
    );

    const selectedClusters = rng.chance(0.5)
      ? selectRandomSubset(UNIVERSAL_PHONEMES.clusters, 3)
      : [];

    // Combine all selected phonemes
    const allSelectedPhonemes = [
      ...selectedConsonants,
      ...selectedVowels,
      ...selectedClusters,
    ];

    // 2. Analyze phoneme qualities to determine language character
    const character = this.phonemeAnalyzer.analyzeLanguageCharacter(allSelectedPhonemes);

    // 3. Generate Tracery description based on character
    const description = this.descriptionGrammar.generateDescription(character, planetConfig.type);

    // 4. Define syllable patterns
    const patterns = selectRandomSubset(
      UNIVERSAL_PHONEMES.syllablePatterns,
      rng.intBetween(3, 6)
    );

    // 5. Generate morphology rules
    const config: LanguageConfig = {
      id: `${planetConfig.type}_lang_${seed}`,
      name: '', // Generated later through translation
      planetType: planetConfig.type,
      seed,

      // Store both full phoneme objects and flat arrays
      selectedPhonemes: allSelectedPhonemes,
      selectedConsonants: selectedConsonants.map(p => p.sound),
      selectedVowels: selectedVowels.map(p => p.sound),
      selectedClusters: selectedClusters.map(p => p.sound),
      allowedClusters: rng.chance(0.5),
      allowedTones: rng.chance(0.3),

      // Language character from analysis
      character,
      description,

      syllablePatterns: patterns,
      maxSyllablesPerWord: rng.intBetween(2, 4),
      vowelHarmony: rng.chance(0.4),
      consonantHarmony: rng.chance(0.3),
      wordOrder: rng.choice(['SVO', 'SOV', 'VSO']),
      usesAffixes: rng.chance(0.7),
      prefixes: generateAffixes(
        selectedConsonants.map(p => p.sound),
        selectedVowels.map(p => p.sound),
        'prefix',
        3
      ),
      suffixes: generateAffixes(
        selectedConsonants.map(p => p.sound),
        selectedVowels.map(p => p.sound),
        'suffix',
        5
      ),
      nameStructure: rng.choice(['given', 'given-family', 'single']),
      placeNamePattern: '', // Generated below
    };

    return config;
  }

  /**
   * Select phonemes with planet-type biases
   */
  private selectPhonemesWithBias(
    phonemes: PhonemeMetadata[],
    planetType: string,
    rng: SeededRandom,
    min: number,
    max: number
  ): PhonemeMetadata[] {
    const count = rng.intBetween(min, max);

    // Weight phonemes by planet type
    const weighted = phonemes.map(p => ({
      phoneme: p,
      weight: this.getPhonemeWeight(p, planetType),
    }));

    // Weighted random selection
    const selected: PhonemeMetadata[] = [];
    for (let i = 0; i < count; i++) {
      const phoneme = weightedChoice(weighted, rng);
      if (phoneme && !selected.includes(phoneme)) {
        selected.push(phoneme);
      }
    }

    return selected;
  }

  /**
   * Get weight for phoneme based on planet type
   */
  private getPhonemeWeight(phoneme: PhonemeMetadata, planetType: string): number {
    let weight = 1.0;

    if (planetType === 'volcanic') {
      // Prefer guttural, harsh, sharp
      if (phoneme.qualities.texture.includes('guttural')) weight += 2.0;
      if (phoneme.qualities.hardness.includes('harsh')) weight += 1.5;
      if (phoneme.qualities.manner.includes('sharp')) weight += 1.0;
    } else if (planetType === 'ocean') {
      // Prefer liquid, soft, flowing
      if (phoneme.qualities.texture.includes('liquid')) weight += 2.0;
      if (phoneme.qualities.hardness.includes('soft')) weight += 1.5;
      if (phoneme.qualities.manner.includes('flowing')) weight += 1.0;
    } else if (planetType === 'desert') {
      // Prefer sibilant, crisp, sharp
      if (phoneme.qualities.texture.includes('sibilant')) weight += 2.0;
      if (phoneme.qualities.hardness.includes('crisp')) weight += 1.5;
      if (phoneme.qualities.manner.includes('sharp')) weight += 1.0;
    }

    return weight;
  }
}
```

## 3. Tracery Grammar Integration

Use Tracery to generate both **words** (from phonemes) and **language descriptions** (from analyzed qualities).

### Language Description Grammar

Generate poetic descriptions of the language based on analyzed phoneme qualities:

```typescript
class LanguageDescriptionGrammar {
  /**
   * Build Tracery grammar to describe the language's character
   */
  buildDescriptionGrammar(character: LanguageCharacter, planetType: string): TraceryGrammar {
    // Build contextual adjectives based on planet type
    const contextAdjectives = this.getContextAdjectives(planetType);

    return {
      origin: [
        'A #hardness# #texture# language with #manner# sounds',
        '#texture.capitalize# and #hardness#, like #metaphor#',
        'A #manner# tongue, #texture# and #hardness#',
        'Their speech is #texture# and #hardness#, #manner# like #metaphor#',
        '#context_adj# has shaped their #texture# #hardness# tongue',
      ],

      // Core qualities (from phoneme analysis)
      texture: [character.primaryTexture],
      hardness: [character.primaryHardness],
      manner: [character.primaryManner],

      // Secondary textures for variety
      texture_secondary: character.secondaryTexture ? [character.secondaryTexture] : ['resonant'],

      // Context-specific adjectives
      context_adj: contextAdjectives,

      // Metaphors based on texture + hardness combinations
      metaphor: this.buildMetaphors(character),

      // Modifiers
      'texture.capitalize': [
        character.primaryTexture.charAt(0).toUpperCase() + character.primaryTexture.slice(1)
      ],
    };
  }

  /**
   * Generate metaphors based on language character
   */
  private buildMetaphors(character: LanguageCharacter): string[] {
    const metaphors: string[] = [];

    // Texture-based metaphors
    if (character.primaryTexture === 'guttural') {
      if (character.primaryHardness === 'harsh') {
        metaphors.push('stones grinding in a volcanic mill', 'thunder in deep valleys', 'fire crackling on obsidian');
      } else {
        metaphors.push('rumbling earth', 'distant avalanches');
      }
    }

    if (character.primaryTexture === 'liquid') {
      if (character.primaryManner === 'flowing') {
        metaphors.push('water over smooth stones', 'rivers finding their course', 'rain on leaves');
      } else {
        metaphors.push('droplets on glass', 'mist through branches');
      }
    }

    if (character.primaryTexture === 'percussive') {
      if (character.primaryManner === 'clipped') {
        metaphors.push('hammered metal', 'footfalls on stone', 'breaking ice');
      } else {
        metaphors.push('drumbeats', 'stones clicking together');
      }
    }

    if (character.primaryTexture === 'sibilant') {
      if (character.primaryManner === 'sharp') {
        metaphors.push('wind through narrow canyons', 'sand scouring rock', 'hissing steam');
      } else {
        metaphors.push('whispers in tall grass', 'waves on distant shores');
      }
    }

    if (character.primaryTexture === 'nasal') {
      metaphors.push('wind in hollow reeds', 'humming in deep caves', 'resonant chimes');
    }

    if (character.primaryTexture === 'breathy') {
      metaphors.push('sighs of wind', 'morning mist rising', 'breath on cold air');
    }

    // Fallback
    if (metaphors.length === 0) {
      metaphors.push('the sounds of their world');
    }

    return metaphors;
  }

  /**
   * Get context adjectives based on planet type
   */
  private getContextAdjectives(planetType: string): string[] {
    const contextMap: Record<string, string[]> = {
      volcanic: ['The volcanic wasteland', 'Fire and stone', 'Their harsh world'],
      ocean: ['The endless ocean', 'Water and tide', 'The depths'],
      forest: ['Dense forests', 'Ancient trees', 'Green shadow'],
      desert: ['The burning sands', 'Endless dunes', 'Scorching winds'],
      arctic: ['Frozen wastes', 'Ice and snow', 'The long dark'],
      mountain: ['High peaks', 'Stone and sky', 'Thin air'],
    };

    return contextMap[planetType] || ['Their world'];
  }

  /**
   * Generate a description using Tracery
   */
  generateDescription(character: LanguageCharacter, planetType: string): string {
    const grammar = this.buildDescriptionGrammar(character, planetType);
    const tracery = require('tracery-grammar');
    const gen = tracery.createGrammar(grammar);
    gen.addModifiers(tracery.baseEngModifiers); // For .capitalize
    return gen.flatten('#origin#');
  }
}
```

**Example Outputs:**

```typescript
// Volcanic planet with kh, x, r, k, a, i
// → character: { primaryTexture: 'guttural', primaryHardness: 'harsh', primaryManner: 'sharp' }
generateDescription() →
  "A harsh guttural language with sharp sounds"
  "Guttural and harsh, like stones grinding in a volcanic mill"
  "Fire and stone has shaped their guttural harsh tongue"

// Ocean planet with l, w, r, m, o, u, a
// → character: { primaryTexture: 'liquid', primaryHardness: 'soft', primaryManner: 'flowing' }
generateDescription() →
  "A soft liquid language with flowing sounds"
  "Liquid and soft, like water over smooth stones"
  "The endless ocean has shaped their liquid soft tongue"

// Desert planet with s, t, k, f, i, a, sharp vowels
// → character: { primaryTexture: 'sibilant', primaryHardness: 'crisp', primaryManner: 'sharp' }
generateDescription() →
  "A crisp sibilant language with sharp sounds"
  "Their speech is sibilant and crisp, sharp like wind through narrow canyons"
```

### Word Generation Grammar

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

    // Use Tracery-generated language description
    if (language.description) {
      prompt += `- You speak ${language.name || 'your ancestral tongue'}. ${language.description}.\n`;
    } else {
      // Fallback if description not generated
      prompt += `- You speak ${language.name || 'your ancestral tongue'}, a language shaped by ${language.planetType} landscapes.\n`;
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

/**
 * Helper: Get common morphemes from dictionary
 */
function getCommonMorphemes(languageId: string, limit: number): Array<{ morpheme: string; meaning: string }> {
  const dict = dictionaryService.getDictionary(languageId);

  // Sort morphemes by frequency, return top N
  return Object.entries(dict.morphemeLibrary)
    .sort((a, b) => b[1].frequency - a[1].frequency)
    .slice(0, limit)
    .map(([morpheme, data]) => ({
      morpheme,
      meaning: data.meaning,
    }));
}
```

**Example Output in System Prompt**:
```
You are Kor'xa Thakrin, a volcanic-dweller villager in this settlement.

Your People:
- You speak Khartongue. Fire and stone has shaped their guttural harsh tongue.
- You know the old roots: "khar" (fire), "xa" (flow), "vik" (shadow), "ri" (through). These sounds carry weight in your tongue.

Your Personality:
- You're methodical and patient, like cooling lava...
```

Alternative Tracery-generated descriptions:
```
- You speak Khartongue. A harsh guttural language with sharp sounds.
- You speak Khartongue. Guttural and harsh, like stones grinding in a volcanic mill.
- You speak Khartongue. Their speech is guttural and harsh, sharp like thunder in deep valleys.
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
