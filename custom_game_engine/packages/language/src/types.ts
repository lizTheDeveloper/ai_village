/**
 * Phoneme metadata with descriptive qualities for language generation
 */
export interface PhonemeMetadata {
  sound: string;              // The phoneme symbol (e.g., 'kh', 'l', 'a', '!', '◊')
  category: 'consonant' | 'vowel' | 'cluster' | 'tone';

  // Descriptive qualities (used by Tracery to describe language)
  qualities: {
    texture: string[];        // guttural, liquid, percussive, sibilant, nasal, breathy, clicking, buzzing, etc.
    hardness: string[];       // harsh, soft, crisp, smooth, rough, sharp, deep
    position: string[];       // front, back, central, high, low, full
    manner: string[];         // flowing, clipped, resonant, sharp, rounded, sustained, rapid, layered, etc.
  };

  // Phonetic/typological classification
  typology: {
    frequency: 'universal' | 'common' | 'uncommon' | 'rare';
    prerequisites?: string[];      // Required phonemes before this can be used
    incompatibleWith?: string[];   // Cannot coexist with these phonemes
  };

  type?: string;              // stop, fricative, nasal, liquid, glide, close, mid, open, click, buzz, harmonic, etc.
  bodyPlanRestriction?: string[];  // Only producible by these body plans (insectoid, avian, aquatic, etc.)
}

/**
 * Phoneme inventory organized by category
 */
export interface PhonemeInventory {
  consonants: PhonemeMetadata[];
  vowels: PhonemeMetadata[];
  clusters: PhonemeMetadata[];
  tones: PhonemeMetadata[];
  syllablePatterns: string[];
}

/**
 * Language configuration generated for a species/planet
 */
export interface LanguageConfig {
  id: string;                    // e.g., "volcanic_lang_seed123"
  name: string;                  // Auto-generated or assigned (e.g., "Khartongue")
  planetType: string;            // Links to planet type
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
  character?: LanguageCharacter;  // Dominant qualities
  description?: string;           // Tracery-generated description

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
  placeNamePattern?: string;     // Tracery pattern for place names
}

/**
 * Language character analyzed from phoneme qualities
 */
export interface LanguageCharacter {
  primaryTexture: string;         // e.g., 'guttural', 'liquid', 'percussive'
  secondaryTexture?: string;      // Optional secondary quality
  primaryHardness: string;        // e.g., 'harsh', 'soft', 'crisp'
  primaryManner: string;          // e.g., 'flowing', 'clipped', 'sharp'
  positions: string[];            // e.g., ['back', 'low'] for deep sounds
  bodyPlanQualities?: string[];   // Body-plan-specific qualities
}

/**
 * Planet configuration for language generation
 */
export interface PlanetConfig {
  type: string;  // 'volcanic', 'ocean', 'desert', 'forest', 'arctic', 'mountain'
  seed: string;
  primaryBiome?: string;
}

/**
 * Body plan configuration
 */
export interface BodyPlan {
  type: string;  // 'insectoid', 'avian', 'aquatic', 'reptilian', 'multi_throated', 'crystalline', 'humanoid'
}
