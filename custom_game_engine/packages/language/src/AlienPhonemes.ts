/**
 * Alien-Specific Phoneme Inventory
 * 
 * Body-plan-restricted phonemes for alien species based on their sound production mechanisms.
 * These phonemes can only be produced by species with specific anatomical features:
 * - Insectoid: Stridulation, spiracles, mandible clicks
 * - Avian: Syrinx (dual voice box), harmonic production
 * - Aquatic: Echolocation, pressure pulses, bubble streams
 * - Reptilian: Large resonance chambers, infrasonic capability
 * - Multi-throated: Multiple vocal chambers, harmonic stacking
 * - Crystalline: Vibrating mineral structures
 * 
 * See PROCEDURAL_LANGUAGE_SYSTEM.md section 1.5 for full specification.
 */

import type { PhonemeInventory, PhonemeMetadata } from './types.js';

/**
 * Alien phoneme inventory with body-plan restrictions
 * 
 * Extends universal phoneme inventory with sounds impossible for humanoid vocal apparatus.
 * Each phoneme includes full qualities metadata for language character analysis.
 */
export const ALIEN_PHONEMES: PhonemeInventory = {
  consonants: [
    // ====================================================================
    // INSECTOID PHONEMES
    // Mechanism: Stridulation, spiracles, mandible clicks, tymbal vibration
    // ====================================================================

    // Mandible click (front) - Sharp percussive click from mandible closure
    { 
      sound: '!', 
      category: 'consonant', 
      type: 'click',
      qualities: { 
        texture: ['clicking', 'percussive'], 
        hardness: ['sharp'], 
        position: ['front'], 
        manner: ['clipped'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['insectoid'] 
    },

    // Lateral click - Click from side of mandibles/mouth
    { 
      sound: '|', 
      category: 'consonant', 
      type: 'click',
      qualities: { 
        texture: ['clicking', 'percussive'], 
        hardness: ['crisp'], 
        position: ['central'], 
        manner: ['clipped'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['insectoid', 'aquatic'] 
    },

    // Double lateral click - Rapid double-click, requires mastery of single click
    { 
      sound: '||', 
      category: 'consonant', 
      type: 'click',
      qualities: { 
        texture: ['clicking', 'percussive'], 
        hardness: ['harsh'], 
        position: ['central'], 
        manner: ['rapid'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: ['|'] 
      },
      bodyPlanRestriction: ['insectoid'] 
    },

    // Stridulation buzz - Wing/leg rubbing creates sustained buzz
    { 
      sound: 'zz', 
      category: 'consonant', 
      type: 'buzz',
      qualities: { 
        texture: ['buzzing', 'vibrant'], 
        hardness: ['harsh'], 
        position: ['full'], 
        manner: ['sustained'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['insectoid'] 
    },

    // Rapid tick - Fast percussive sound, like cricket chirp
    { 
      sound: 'tk', 
      category: 'consonant', 
      type: 'rapid_stop',
      qualities: { 
        texture: ['percussive', 'chittering'], 
        hardness: ['crisp'], 
        position: ['front'], 
        manner: ['rapid'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: ['t', 'k'] 
      },
      bodyPlanRestriction: ['insectoid'] 
    },

    // ====================================================================
    // AVIAN PHONEMES
    // Mechanism: Syrinx (dual voice box), harmonic resonance
    // ====================================================================

    // Dual harmonic - Two simultaneous tones from dual voice box
    { 
      sound: '**', 
      category: 'consonant', 
      type: 'harmonic',
      qualities: { 
        texture: ['harmonic', 'dual-tone'], 
        hardness: ['smooth'], 
        position: ['full'], 
        manner: ['layered'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['avian', 'multi_throated'] 
    },

    // Trill marker - Rapid tongue/syrinx vibration
    { 
      sound: '~', 
      category: 'consonant', 
      type: 'trill',
      qualities: { 
        texture: ['trilling', 'liquid'], 
        hardness: ['soft'], 
        position: ['front'], 
        manner: ['flowing'] 
      },
      typology: { 
        frequency: 'uncommon', 
        prerequisites: ['r'] 
      },
      bodyPlanRestriction: ['avian'] 
    },

    // Whistle glide up - Rising pitch whistle
    { 
      sound: '↑', 
      category: 'consonant', 
      type: 'whistle_rise',
      qualities: { 
        texture: ['whistling', 'breathy'], 
        hardness: ['smooth'], 
        position: ['high'], 
        manner: ['rising'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['avian'] 
    },

    // Whistle glide down - Falling pitch whistle
    { 
      sound: '↓', 
      category: 'consonant', 
      type: 'whistle_fall',
      qualities: { 
        texture: ['whistling', 'breathy'], 
        hardness: ['smooth'], 
        position: ['low'], 
        manner: ['falling'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['avian'] 
    },

    // ====================================================================
    // AQUATIC PHONEMES
    // Mechanism: Echolocation, pressure pulses, bubble streams, resonance cavities
    // ====================================================================

    // Echolocation click (sharp) - High-frequency click for navigation
    { 
      sound: '◊', 
      category: 'consonant', 
      type: 'echo_click',
      qualities: { 
        texture: ['echoic', 'percussive'], 
        hardness: ['sharp'], 
        position: ['full'], 
        manner: ['rapid'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['aquatic'] 
    },

    // Bubble pop - Expelled air/water creates pop sound
    { 
      sound: '•', 
      category: 'consonant', 
      type: 'pop',
      qualities: { 
        texture: ['liquid', 'percussive'], 
        hardness: ['soft'], 
        position: ['front'], 
        manner: ['clipped'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['aquatic'] 
    },

    // Pressure pulse - Sustained click series, like dolphin echolocation
    { 
      sound: '○', 
      category: 'consonant', 
      type: 'pulse',
      qualities: { 
        texture: ['echoic', 'resonant'], 
        hardness: ['soft'], 
        position: ['full'], 
        manner: ['pulsing'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['aquatic'] 
    },

    // ====================================================================
    // REPTILIAN PHONEMES
    // Mechanism: Resonance chambers, heated air hissing, chest vibration
    // ====================================================================

    // Subsonic rumble - Deep infrasonic vibration from chest cavity
    { 
      sound: 'RR', 
      category: 'consonant', 
      type: 'subsonic',
      qualities: { 
        texture: ['rumbling', 'resonant'], 
        hardness: ['deep'], 
        position: ['back'], 
        manner: ['sustained'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['reptilian'] 
    },

    // Extended hiss - Sustained sibilant from heated air expulsion
    { 
      sound: 'sss', 
      category: 'consonant', 
      type: 'sustained_fricative',
      qualities: { 
        texture: ['sibilant', 'hissing'], 
        hardness: ['harsh'], 
        position: ['front'], 
        manner: ['sustained'] 
      },
      typology: { 
        frequency: 'uncommon', 
        prerequisites: ['s'] 
      },
      bodyPlanRestriction: ['reptilian'] 
    },

    // ====================================================================
    // MULTI-THROATED PHONEMES
    // Mechanism: Triple voice box, harmonic chambers, resonance stacking
    // ====================================================================

    // Triple harmonic chord - Three simultaneous frequencies
    { 
      sound: '***', 
      category: 'consonant', 
      type: 'chord',
      qualities: { 
        texture: ['harmonic', 'polyphonic'], 
        hardness: ['smooth'], 
        position: ['full'], 
        manner: ['layered'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['multi_throated'] 
    },

    // Harmonic stack - Layered resonances creating complex tone
    { 
      sound: '⊕', 
      category: 'consonant', 
      type: 'harmonic_stack',
      qualities: { 
        texture: ['harmonic', 'layered'], 
        hardness: ['resonant'], 
        position: ['full'], 
        manner: ['stacked'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['multi_throated'] 
    },

    // ====================================================================
    // CRYSTALLINE PHONEMES
    // Mechanism: Crystal resonance, harmonic vibration, frequency modulation
    // ====================================================================

    // Crystal chime (high) - High-frequency crystalline resonance
    { 
      sound: '♪', 
      category: 'consonant', 
      type: 'chime',
      qualities: { 
        texture: ['chiming', 'resonant'], 
        hardness: ['crisp'], 
        position: ['high'], 
        manner: ['sustained'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['crystalline'] 
    },

    // Crystal chord (low) - Low-frequency crystalline harmonic
    { 
      sound: '♫', 
      category: 'consonant', 
      type: 'chord_chime',
      qualities: { 
        texture: ['chiming', 'harmonic'], 
        hardness: ['resonant'], 
        position: ['low'], 
        manner: ['sustained'] 
      },
      typology: { 
        frequency: 'rare', 
        prerequisites: [] 
      },
      bodyPlanRestriction: ['crystalline'] 
    },
  ],

  // Most alien species use the standard vowel inventory with possible restrictions
  // based on their body plan. For example, insectoids may avoid rounded vowels (no lips),
  // while aquatic species favor liquid vowels.
  vowels: [],

  // Consonant clusters are generated from allowed consonants during language generation
  clusters: [],

  // Tones can be added based on species capabilities
  tones: [],

  // Syllable patterns inherited from universal inventory or customized per species
  syllablePatterns: [],
};

/**
 * Get all phonemes available to a specific body plan
 * 
 * @param bodyPlanType - The body plan type (insectoid, avian, aquatic, etc.)
 * @returns Array of phoneme metadata available to this body plan
 */
export function getBodyPlanPhonemes(bodyPlanType: string): PhonemeMetadata[] {
  return ALIEN_PHONEMES.consonants.filter(
    p => !p.bodyPlanRestriction || p.bodyPlanRestriction.includes(bodyPlanType)
  );
}

/**
 * Get phonemes unique to a specific body plan (not available to humanoids)
 * 
 * @param bodyPlanType - The body plan type
 * @returns Array of exclusive phonemes for this body plan
 */
export function getExclusivePhonemes(bodyPlanType: string): PhonemeMetadata[] {
  return ALIEN_PHONEMES.consonants.filter(
    p => p.bodyPlanRestriction?.includes(bodyPlanType) ?? false
  );
}

/**
 * Count statistics for alien phoneme inventory
 */
export function getAlienPhonemeStats() {
  const byBodyPlan = new Map<string, number>();
  const byType = new Map<string, number>();

  for (const phoneme of ALIEN_PHONEMES.consonants) {
    // Count by body plan
    if (phoneme.bodyPlanRestriction) {
      for (const bodyPlan of phoneme.bodyPlanRestriction) {
        byBodyPlan.set(bodyPlan, (byBodyPlan.get(bodyPlan) ?? 0) + 1);
      }
    }

    // Count by phoneme type
    if (phoneme.type) {
      byType.set(phoneme.type, (byType.get(phoneme.type) ?? 0) + 1);
    }
  }

  return {
    totalPhonemes: ALIEN_PHONEMES.consonants.length,
    byBodyPlan: Object.fromEntries(byBodyPlan),
    byType: Object.fromEntries(byType),
    bodyPlans: Array.from(byBodyPlan.keys()),
  };
}
