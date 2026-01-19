/**
 * PhonemeInventory.ts
 *
 * Universal phoneme inventory with full metadata for procedural language generation.
 * Each phoneme includes descriptive qualities (texture, hardness, position, manner)
 * and typological information (frequency, prerequisites).
 *
 * Based on PROCEDURAL_LANGUAGE_SYSTEM.md specification.
 */

import type { PhonemeInventory, PhonemeMetadata } from './types.js';

// Re-export types for convenience
export type { PhonemeInventory, PhonemeMetadata };

/**
 * Universal phoneme inventory
 *
 * This is the base inventory available to all species, unless restricted by body plan.
 * Contains standard human-producible phonemes organized by type.
 */
export const UNIVERSAL_PHONEMES: PhonemeInventory = {
  consonants: [
    // ==================== STOPS ====================
    // Percussive, clipped sounds

    {
      sound: 'p',
      category: 'consonant',
      type: 'stop',
      qualities: {
        texture: ['percussive'],
        hardness: ['crisp'],
        position: ['front'],
        manner: ['clipped', 'sharp']
      },
      typology: { frequency: 'universal' }
    },
    {
      sound: 't',
      category: 'consonant',
      type: 'stop',
      qualities: {
        texture: ['percussive'],
        hardness: ['crisp'],
        position: ['front'],
        manner: ['clipped', 'sharp']
      },
      typology: { frequency: 'universal' }
    },
    {
      sound: 'k',
      category: 'consonant',
      type: 'stop',
      qualities: {
        texture: ['percussive'],
        hardness: ['crisp'],
        position: ['back'],
        manner: ['clipped']
      },
      typology: { frequency: 'universal' }
    },
    {
      sound: 'b',
      category: 'consonant',
      type: 'stop',
      qualities: {
        texture: ['percussive'],
        hardness: ['soft'],
        position: ['front'],
        manner: ['clipped']
      },
      typology: { frequency: 'common' }
    },
    {
      sound: 'd',
      category: 'consonant',
      type: 'stop',
      qualities: {
        texture: ['percussive'],
        hardness: ['soft'],
        position: ['front'],
        manner: ['clipped']
      },
      typology: { frequency: 'common' }
    },
    {
      sound: 'g',
      category: 'consonant',
      type: 'stop',
      qualities: {
        texture: ['percussive'],
        hardness: ['soft'],
        position: ['back'],
        manner: ['clipped']
      },
      typology: { frequency: 'common' }
    },
    {
      sound: 'q',
      category: 'consonant',
      type: 'stop',
      qualities: {
        texture: ['guttural', 'percussive'],
        hardness: ['harsh'],
        position: ['back'],
        manner: ['clipped', 'sharp']
      },
      typology: { frequency: 'uncommon' }
    },
    {
      sound: "'",
      category: 'consonant',
      type: 'stop',
      qualities: {
        texture: ['percussive'],
        hardness: ['harsh'],
        position: ['back'],
        manner: ['clipped', 'sharp']
      },
      typology: { frequency: 'uncommon' }
    },

    // ==================== FRICATIVES ====================
    // Sibilant, harsh or soft

    {
      sound: 'f',
      category: 'consonant',
      type: 'fricative',
      qualities: {
        texture: ['sibilant'],
        hardness: ['soft'],
        position: ['front'],
        manner: ['flowing']
      },
      typology: { frequency: 'common' }
    },
    {
      sound: 's',
      category: 'consonant',
      type: 'fricative',
      qualities: {
        texture: ['sibilant'],
        hardness: ['crisp'],
        position: ['front'],
        manner: ['sharp']
      },
      typology: { frequency: 'universal' }
    },
    {
      sound: 'sh',
      category: 'consonant',
      type: 'fricative',
      qualities: {
        texture: ['sibilant'],
        hardness: ['soft'],
        position: ['front'],
        manner: ['flowing']
      },
      typology: { frequency: 'common' }
    },
    {
      sound: 'v',
      category: 'consonant',
      type: 'fricative',
      qualities: {
        texture: ['sibilant'],
        hardness: ['soft'],
        position: ['front'],
        manner: ['flowing']
      },
      typology: { frequency: 'common' }
    },
    {
      sound: 'z',
      category: 'consonant',
      type: 'fricative',
      qualities: {
        texture: ['sibilant'],
        hardness: ['soft'],
        position: ['front'],
        manner: ['flowing']
      },
      typology: { frequency: 'common' }
    },
    {
      sound: 'th',
      category: 'consonant',
      type: 'fricative',
      qualities: {
        texture: ['sibilant'],
        hardness: ['soft'],
        position: ['front'],
        manner: ['flowing']
      },
      typology: { frequency: 'uncommon' }
    },
    {
      sound: 'kh',
      category: 'consonant',
      type: 'fricative',
      qualities: {
        texture: ['guttural'],
        hardness: ['harsh', 'rough'],
        position: ['back'],
        manner: ['sharp']
      },
      typology: { frequency: 'uncommon' }
    },
    {
      sound: 'x',
      category: 'consonant',
      type: 'fricative',
      qualities: {
        texture: ['guttural'],
        hardness: ['harsh'],
        position: ['back'],
        manner: ['sharp']
      },
      typology: { frequency: 'uncommon' }
    },
    {
      sound: 'h',
      category: 'consonant',
      type: 'fricative',
      qualities: {
        texture: ['breathy'],
        hardness: ['soft'],
        position: ['back'],
        manner: ['flowing']
      },
      typology: { frequency: 'common' }
    },

    // ==================== NASALS ====================
    // Resonant, soft

    {
      sound: 'm',
      category: 'consonant',
      type: 'nasal',
      qualities: {
        texture: ['nasal'],
        hardness: ['soft'],
        position: ['front'],
        manner: ['resonant', 'rounded']
      },
      typology: { frequency: 'universal' }
    },
    {
      sound: 'n',
      category: 'consonant',
      type: 'nasal',
      qualities: {
        texture: ['nasal'],
        hardness: ['soft'],
        position: ['front'],
        manner: ['resonant']
      },
      typology: { frequency: 'universal' }
    },
    {
      sound: 'ng',
      category: 'consonant',
      type: 'nasal',
      qualities: {
        texture: ['nasal'],
        hardness: ['soft'],
        position: ['back'],
        manner: ['resonant']
      },
      typology: { frequency: 'common' }
    },

    // ==================== LIQUIDS ====================
    // Flowing, smooth

    {
      sound: 'l',
      category: 'consonant',
      type: 'liquid',
      qualities: {
        texture: ['liquid'],
        hardness: ['soft', 'smooth'],
        position: ['front'],
        manner: ['flowing']
      },
      typology: { frequency: 'universal' }
    },
    {
      sound: 'r',
      category: 'consonant',
      type: 'liquid',
      qualities: {
        texture: ['liquid'],
        hardness: ['smooth'],
        position: ['central'],
        manner: ['flowing', 'resonant']
      },
      typology: { frequency: 'common' }
    },
    {
      sound: 'rr',
      category: 'consonant',
      type: 'liquid',
      qualities: {
        texture: ['liquid'],
        hardness: ['rough'],
        position: ['central'],
        manner: ['resonant']
      },
      typology: { frequency: 'uncommon' }
    },

    // ==================== GLIDES ====================
    // Smooth, flowing

    {
      sound: 'w',
      category: 'consonant',
      type: 'glide',
      qualities: {
        texture: ['liquid'],
        hardness: ['smooth'],
        position: ['back'],
        manner: ['flowing', 'rounded']
      },
      typology: { frequency: 'common' }
    },
    {
      sound: 'y',
      category: 'consonant',
      type: 'glide',
      qualities: {
        texture: ['liquid'],
        hardness: ['smooth'],
        position: ['front'],
        manner: ['flowing']
      },
      typology: { frequency: 'common' }
    },

    // ==================== AFFRICATES ====================
    // Complex, percussive

    {
      sound: 'ch',
      category: 'consonant',
      type: 'affricate',
      qualities: {
        texture: ['sibilant', 'percussive'],
        hardness: ['crisp'],
        position: ['front'],
        manner: ['sharp']
      },
      typology: { frequency: 'common', prerequisites: ['t', 'sh'] }
    },
    {
      sound: 'j',
      category: 'consonant',
      type: 'affricate',
      qualities: {
        texture: ['sibilant', 'percussive'],
        hardness: ['soft'],
        position: ['front'],
        manner: ['flowing']
      },
      typology: { frequency: 'common', prerequisites: ['d', 'sh'] }
    },
  ],

  vowels: [
    // ==================== CLOSE VOWELS ====================
    // High, tight

    {
      sound: 'i',
      category: 'vowel',
      type: 'close',
      qualities: {
        texture: ['liquid'],
        hardness: ['crisp'],
        position: ['front', 'high'],
        manner: ['sharp']
      },
      typology: { frequency: 'universal' }
    },
    {
      sound: 'u',
      category: 'vowel',
      type: 'close',
      qualities: {
        texture: ['liquid'],
        hardness: ['soft'],
        position: ['back', 'high'],
        manner: ['rounded']
      },
      typology: { frequency: 'universal' }
    },
    {
      sound: 'ü',
      category: 'vowel',
      type: 'close',
      qualities: {
        texture: ['liquid'],
        hardness: ['crisp'],
        position: ['front', 'high'],
        manner: ['rounded']
      },
      typology: { frequency: 'uncommon', prerequisites: ['i', 'u'] }
    },

    // ==================== MID VOWELS ====================
    // Balanced

    {
      sound: 'e',
      category: 'vowel',
      type: 'mid',
      qualities: {
        texture: ['liquid'],
        hardness: ['smooth'],
        position: ['front', 'central'],
        manner: ['flowing']
      },
      typology: { frequency: 'universal' }
    },
    {
      sound: 'o',
      category: 'vowel',
      type: 'mid',
      qualities: {
        texture: ['liquid'],
        hardness: ['smooth'],
        position: ['back', 'central'],
        manner: ['rounded', 'flowing']
      },
      typology: { frequency: 'universal' }
    },
    {
      sound: 'ö',
      category: 'vowel',
      type: 'mid',
      qualities: {
        texture: ['liquid'],
        hardness: ['smooth'],
        position: ['front', 'central'],
        manner: ['rounded']
      },
      typology: { frequency: 'uncommon', prerequisites: ['e', 'o'] }
    },

    // ==================== OPEN VOWELS ====================
    // Low, resonant

    {
      sound: 'a',
      category: 'vowel',
      type: 'open',
      qualities: {
        texture: ['liquid'],
        hardness: ['soft'],
        position: ['central', 'low'],
        manner: ['resonant', 'flowing']
      },
      typology: { frequency: 'universal' }
    },
    {
      sound: 'ä',
      category: 'vowel',
      type: 'open',
      qualities: {
        texture: ['liquid'],
        hardness: ['soft'],
        position: ['front', 'low'],
        manner: ['resonant']
      },
      typology: { frequency: 'uncommon', prerequisites: ['a'] }
    },
  ],

  clusters: [
    // ==================== CONSONANT CLUSTERS ====================
    // Complex combinations

    {
      sound: 'tr',
      category: 'cluster',
      type: 'complex',
      qualities: {
        texture: ['percussive', 'liquid'],
        hardness: ['crisp'],
        position: ['front'],
        manner: ['flowing']
      },
      typology: { frequency: 'common', prerequisites: ['t', 'r'] }
    },
    {
      sound: 'kr',
      category: 'cluster',
      type: 'complex',
      qualities: {
        texture: ['percussive', 'liquid'],
        hardness: ['harsh'],
        position: ['back'],
        manner: ['flowing']
      },
      typology: { frequency: 'common', prerequisites: ['k', 'r'] }
    },
    {
      sound: 'fl',
      category: 'cluster',
      type: 'complex',
      qualities: {
        texture: ['sibilant', 'liquid'],
        hardness: ['soft'],
        position: ['front'],
        manner: ['flowing']
      },
      typology: { frequency: 'common', prerequisites: ['f', 'l'] }
    },
    {
      sound: 'bl',
      category: 'cluster',
      type: 'complex',
      qualities: {
        texture: ['percussive', 'liquid'],
        hardness: ['soft'],
        position: ['front'],
        manner: ['flowing']
      },
      typology: { frequency: 'common', prerequisites: ['b', 'l'] }
    },
    {
      sound: 'gr',
      category: 'cluster',
      type: 'complex',
      qualities: {
        texture: ['percussive', 'liquid'],
        hardness: ['rough'],
        position: ['back'],
        manner: ['resonant']
      },
      typology: { frequency: 'common', prerequisites: ['g', 'r'] }
    },
    {
      sound: 'st',
      category: 'cluster',
      type: 'complex',
      qualities: {
        texture: ['sibilant', 'percussive'],
        hardness: ['crisp'],
        position: ['front'],
        manner: ['sharp']
      },
      typology: { frequency: 'common', prerequisites: ['s', 't'] }
    },
    {
      sound: 'sk',
      category: 'cluster',
      type: 'complex',
      qualities: {
        texture: ['sibilant', 'percussive'],
        hardness: ['crisp'],
        position: ['back'],
        manner: ['sharp']
      },
      typology: { frequency: 'common', prerequisites: ['s', 'k'] }
    },
  ],

  tones: [
    // ==================== TONES ====================
    // Pitch modulation

    {
      sound: "'",
      category: 'tone',
      type: 'high',
      qualities: {
        texture: ['tonal'],
        hardness: ['crisp'],
        position: ['high'],
        manner: ['sharp']
      },
      typology: { frequency: 'uncommon' }
    },
    {
      sound: "`",
      category: 'tone',
      type: 'low',
      qualities: {
        texture: ['tonal'],
        hardness: ['soft'],
        position: ['low'],
        manner: ['resonant']
      },
      typology: { frequency: 'uncommon' }
    },
    {
      sound: "^",
      category: 'tone',
      type: 'rising',
      qualities: {
        texture: ['tonal'],
        hardness: ['smooth'],
        position: ['central'],
        manner: ['flowing']
      },
      typology: { frequency: 'rare' }
    },
  ],

  syllablePatterns: [
    'CV',    // Consonant-Vowel (most basic)
    'CVC',   // Consonant-Vowel-Consonant
    'CVCC',  // Consonant-Vowel-Consonant-Consonant
    'V',     // Vowel only
    'VC',    // Vowel-Consonant
    'CCV',   // Consonant-Consonant-Vowel (requires clusters)
    'CCVC',  // Consonant-Consonant-Vowel-Consonant
  ],
};

/**
 * Summary statistics for the phoneme inventory
 */
export const PHONEME_STATS = {
  consonants: UNIVERSAL_PHONEMES.consonants.length,
  vowels: UNIVERSAL_PHONEMES.vowels.length,
  clusters: UNIVERSAL_PHONEMES.clusters.length,
  tones: UNIVERSAL_PHONEMES.tones.length,
  total: UNIVERSAL_PHONEMES.consonants.length +
         UNIVERSAL_PHONEMES.vowels.length +
         UNIVERSAL_PHONEMES.clusters.length +
         UNIVERSAL_PHONEMES.tones.length,
};
