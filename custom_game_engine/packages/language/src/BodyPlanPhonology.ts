/**
 * Body-Plan-Based Phonology
 *
 * Alien species produce sounds based on their anatomy. Different body plans
 * have different sound production mechanisms, creating truly alien languages.
 *
 * This module defines phonological constraints and biases based on physical
 * anatomy, ensuring that languages are grounded in the species' biology.
 */

/**
 * Body plan phonology configuration
 *
 * Defines sound production capabilities and biases for a species based on
 * their physical anatomy (e.g., insectoid mandibles, avian syrinx).
 */
export interface BodyPlanPhonology {
  /** Body plan identifier (e.g., 'insectoid', 'avian', 'humanoid') */
  bodyPlanType: string;

  /** Sound production capabilities */
  soundProduction: {
    /** How sounds are physically made (e.g., 'stridulation', 'syrinx') */
    mechanism: string[];

    /** Phoneme categories this body plan can produce */
    canProduce: string[];

    /** Phoneme categories impossible for this anatomy */
    cannotProduce: string[];

    /** Unique alien phonemes specific to this body plan */
    specialSounds: string[];
  };

  /** Bias weights for phoneme selection */
  phonemeBias: {
    /** Favored sound qualities (e.g., 'percussive', 'liquid') */
    preferTextures: string[];

    /** Difficult or impossible sound qualities */
    avoidTextures: string[];

    /** Body-plan-specific descriptors for language character */
    uniqueQualities: string[];
  };
}

/**
 * Body plan phonology library
 *
 * Configurations for all supported body plans, defining their sound
 * production capabilities and phonological biases.
 */
export const BODY_PLAN_PHONOLOGIES: Record<string, BodyPlanPhonology> = {
  /**
   * INSECTOID: Stridulation, spiracles, mandible clicks
   *
   * Examples: Crickets, cicadas, beetles
   *
   * Sound production: Rubbing body parts together (stridulation), forcing air
   * through spiracles, clicking mandibles together, vibrating tymbal membranes
   *
   * Can produce: Rapid clicks, buzzes, chirps, percussive rhythms, high-frequency sounds
   * Cannot produce: Liquid consonants (no tongue), rounded vowels (no lips), bilabials (p, b, m)
   *
   * Language character: Rhythmic, chittering, buzzing - like insect sounds
   * Special phonemes: !, |, ||, zz, tk, kk, tz (clicks, buzzes, rapid stops)
   */
  insectoid: {
    bodyPlanType: 'insectoid',
    soundProduction: {
      mechanism: ['stridulation', 'spiracles', 'mandible_clicks', 'tymbal_vibration'],
      canProduce: ['clicks', 'buzzes', 'chirps', 'percussives', 'high_frequency'],
      cannotProduce: ['liquids', 'rounded_vowels', 'bilabials'],
      specialSounds: ['!', '|', '||', 'zz', 'tk', 'kk', 'tz'],
    },
    phonemeBias: {
      preferTextures: ['percussive', 'clicking', 'buzzing'],
      avoidTextures: ['liquid', 'nasal', 'rounded'],
      uniqueQualities: ['stridulant', 'buzzing', 'rhythmic', 'chittering'],
    },
  },

  /**
   * AVIAN: Syrinx (dual voice box), harmonic production
   *
   * Examples: Songbirds, parrots
   *
   * Sound production: Syrinx at base of trachea produces two independent
   * frequencies simultaneously, air sacs create harmonic resonance
   *
   * Can produce: Two simultaneous tones, complex harmonics, whistles, trills,
   * glides, delicate sounds
   * Cannot produce: Harsh gutturals (delicate vocal apparatus), deep rumbles
   *
   * Language character: Melodic, harmonic, whistling - like birdsong
   * Special phonemes: ** (dual harmonics), ~ (trills), ↑↓ (whistle glides),
   * wh, tl (liquid-heavy sounds)
   */
  avian: {
    bodyPlanType: 'avian',
    soundProduction: {
      mechanism: ['syrinx', 'dual_voice_box', 'harmonic_resonance'],
      canProduce: ['whistles', 'trills', 'harmonics', 'dual_tones', 'glides'],
      cannotProduce: ['harsh_gutturals', 'deep_rumbles'],
      specialSounds: ['**', '~', '↑', '↓', 'wh', 'tl'],
    },
    phonemeBias: {
      preferTextures: ['liquid', 'breathy', 'harmonic'],
      avoidTextures: ['guttural', 'harsh'],
      uniqueQualities: ['harmonic', 'dual-tone', 'trilling', 'melodic', 'whistling'],
    },
  },

  /**
   * AQUATIC: Echolocation, pressure pulses, bubble streams
   *
   * Examples: Dolphins, whales, deep-sea creatures
   *
   * Sound production: Echolocation clicks via melon organ, pressure pulses
   * through blowholes, bubble streams, resonance cavities (water medium)
   *
   * Can produce: Rapid clicks, pops, sustained tones, ultrasonic frequencies,
   * subsonic frequencies, pressure-based sounds
   * Cannot produce: Dry fricatives (require air), breathy sounds (underwater)
   *
   * Language character: Echoic, liquid, resonant - like underwater sonar
   * Special phonemes: ◊ (echo click), • (bubble pop), ○ (pressure pulse),
   * uu, oo (sustained vowels)
   */
  aquatic: {
    bodyPlanType: 'aquatic',
    soundProduction: {
      mechanism: ['echolocation', 'pressure_pulses', 'bubble_streams', 'resonance_cavities'],
      canProduce: ['clicks', 'pops', 'sustained_tones', 'ultrasonic', 'subsonic'],
      cannotProduce: ['dry_fricatives', 'breathy'],
      specialSounds: ['◊', '•', '○', 'uu', 'oo'],
    },
    phonemeBias: {
      preferTextures: ['liquid', 'resonant', 'echoic'],
      avoidTextures: ['dry', 'breathy', 'sibilant'],
      uniqueQualities: ['echoic', 'subsonic', 'pressure-based', 'sonar'],
    },
  },

  /**
   * REPTILIAN: Large resonance chambers, infrasonic capability
   *
   * Examples: Crocodiles, theorized large dinosaurs
   *
   * Sound production: Large resonance chambers in throat/chest produce deep
   * sounds, heated air creates hisses, chest vibration for infrasonic rumbles
   *
   * Can produce: Deep rumbles, hisses, infrasonic booms, sustained drones,
   * low-frequency sounds
   * Cannot produce: High-frequency sounds (large vocal apparatus), rapid trills
   *
   * Language character: Rumbling, hissing, sustained - like thunder and steam
   * Special phonemes: sss (extended hiss), RR (subsonic rumble), hhh (heated air),
   * ggg (deep growl)
   */
  reptilian: {
    bodyPlanType: 'reptilian',
    soundProduction: {
      mechanism: ['resonance_chambers', 'heated_air_hissing', 'chest_vibration'],
      canProduce: ['hisses', 'rumbles', 'infrasonic', 'sustained_drones'],
      cannotProduce: ['high_frequency', 'rapid_trills'],
      specialSounds: ['sss', 'RR', 'hhh', 'ggg'],
    },
    phonemeBias: {
      preferTextures: ['sibilant', 'guttural', 'rumbling'],
      avoidTextures: ['percussive', 'clicking'],
      uniqueQualities: ['rumbling', 'sustained', 'infrasonic', 'hissing'],
    },
  },

  /**
   * MULTI_THROATED: Multiple vocal chambers (throat singing × 3)
   *
   * Examples: Theoretical multi-chambered beings (science fiction)
   *
   * Sound production: Three separate voice boxes produce simultaneous frequencies,
   * harmonic chambers stack resonances, creating complex chords
   *
   * Can produce: 3-4 simultaneous frequencies, complex chords, harmonics,
   * polyrhythms, layered tones
   * Cannot produce: Pure single tones (all sounds are inherently layered)
   *
   * Language character: Polyphonic, chordal, harmonic-stacking - like Tuvan
   * throat singing × 3
   * Special phonemes: *** (triple harmonic), ⊕ (harmonic stack), ≈ (resonance layer)
   */
  multi_throated: {
    bodyPlanType: 'multi_throated',
    soundProduction: {
      mechanism: ['triple_voice_box', 'harmonic_chambers', 'resonance_stacking'],
      canProduce: ['chords', 'harmonics', 'polyrhythms', 'layered_tones'],
      cannotProduce: ['pure_single_tones'],
      specialSounds: ['***', '⊕', '≈'],
    },
    phonemeBias: {
      preferTextures: ['harmonic', 'layered', 'resonant'],
      avoidTextures: ['sharp', 'clipped'],
      uniqueQualities: ['polyphonic', 'chordal', 'harmonic-stacking'],
    },
  },

  /**
   * CRYSTALLINE: Vibrating mineral structures
   *
   * Examples: Silicon-based life, mineral beings (science fiction)
   *
   * Sound production: Crystal lattice resonance produces pure tones, frequency
   * modulation via crystal shape changes, harmonic vibrations
   *
   * Can produce: Resonant chimes, harmonic frequencies, sustained tones,
   * pure tones, bell-like sounds
   * Cannot produce: Soft sounds (rigid structure), fricatives (no air flow),
   * stops (no closure mechanism)
   *
   * Language character: Chiming, crystalline, pure-tone - like resonating bells
   * or singing crystals
   * Special phonemes: ♪ (high chime), ♫ (chord chime), △ (crystalline tone)
   */
  crystalline: {
    bodyPlanType: 'crystalline',
    soundProduction: {
      mechanism: ['crystal_resonance', 'harmonic_vibration', 'frequency_modulation'],
      canProduce: ['chimes', 'sustained_harmonics', 'pure_tones'],
      cannotProduce: ['soft_sounds', 'fricatives', 'stops'],
      specialSounds: ['♪', '♫', '△'],
    },
    phonemeBias: {
      preferTextures: ['resonant', 'harmonic', 'chiming'],
      avoidTextures: ['percussive', 'liquid'],
      uniqueQualities: ['crystalline', 'chiming', 'pure-tone', 'harmonic-resonance'],
    },
  },

  /**
   * HUMANOID: Standard mammalian vocal apparatus
   *
   * Examples: Humans, primates
   *
   * Sound production: Vocal cords vibrate in larynx, tongue shapes sounds,
   * lips and teeth create consonants, nasal cavity adds resonance
   *
   * Can produce: Full range of human phonemes (all standard IPA sounds)
   * Cannot produce: None (baseline body plan)
   *
   * Language character: Baseline for comparison - no special qualities
   * Special phonemes: None (uses universal phoneme inventory only)
   */
  humanoid: {
    bodyPlanType: 'humanoid',
    soundProduction: {
      mechanism: ['vocal_cords', 'tongue', 'lips', 'nasal_cavity'],
      canProduce: ['all_standard_phonemes'],
      cannotProduce: [],
      specialSounds: [],
    },
    phonemeBias: {
      preferTextures: [],
      avoidTextures: [],
      uniqueQualities: [],
    },
  },
};
