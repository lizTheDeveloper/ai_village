/**
 * ParadigmSpectrum - Multi-axis configuration for universe magic systems
 *
 * Provides a framework for configuring what magic looks like in a universe
 * along several independent axes:
 *
 * 1. **Magical Intensity** - How magical is the universe?
 *    null → anti-magic → low magic → medium → high → reality-is-magic
 *
 * 2. **Magic Source** - Where does magical power come from?
 *    external (entities grant it) → environmental (ley lines) → internal (innate)
 *
 * 3. **Formality** - How structured is magical practice?
 *    wild/chaotic → intuitive → trained → academic/systematic
 *
 * 4. **Animism Level** - How ensouled is the world? (Kami or no Kami)
 *    only humans conscious → animals too → plants too → objects have spirits → everything has kami
 *
 * These axes are independent - you can have high magic with low animism (D&D wizards),
 * or low magic with high animism (mundane world where everything has a spirit but
 * magic is rare), etc.
 */

// Note: Imports for paradigm references are available but not used in this
// pure-types module. Paradigm resolution uses string IDs rather than imports.

// ============================================================================
// Axis Definitions
// ============================================================================

/**
 * How magical is this universe?
 * This is the fundamental "dial" for magic power level.
 */
export type MagicalIntensity =
  | 'null'           // Magic doesn't exist at all
  | 'anti'           // Magic is actively suppressed
  | 'dead'           // Magic once existed but is gone
  | 'trace'          // Tiny amounts, mostly unnoticed
  | 'low'            // Magic exists but is rare and weak
  | 'medium'         // Magic is present and meaningful
  | 'high'           // Magic is common and powerful
  | 'saturated'      // Magic is everywhere, very powerful
  | 'reality_is_magic'; // Reality itself is magical, no mundane exists

/**
 * Where does magical power originate?
 * Multiple sources can coexist.
 */
export type MagicSourceOrigin =
  | 'none'           // No magic source (for null universes)
  | 'divine'         // Power flows from gods/higher beings
  | 'pact'           // Power granted by entities in exchange
  | 'ancestral'      // Power inherited from ancestors/bloodlines
  | 'environmental'  // Power from ley lines, locations, nature
  | 'internal'       // Power from within (mana pools, life force)
  | 'knowledge'      // Power from knowing secrets (true names, runes)
  | 'emotional'      // Power from feelings and passion
  | 'material'       // Power from substances (metals, blood, components)
  | 'narrative'      // Power from story logic
  | 'universal';     // Power is everywhere, intrinsic to reality

/**
 * How structured/formal is magical practice?
 */
export type MagicFormality =
  | 'chaotic'        // No rules, anything can happen (Wild magic)
  | 'intuitive'      // Works by feel, no formal training (Talent, Emotional)
  | 'traditional'    // Passed down practices, some structure (Song, Shinto)
  | 'trained'        // Requires deliberate learning (Sympathy, Rune)
  | 'academic'       // Highly systematic, university-style (Academic paradigm)
  | 'scientific';    // Magic as rigorous science, fully understood

/**
 * How ensouled/animate is the world?
 * The "Kami or no Kami" axis.
 */
export type AnimismLevel =
  | 'materialist'    // Only physical matter exists, no spirits
  | 'human_only'     // Only humans have souls/consciousness
  | 'mammalian'      // Mammals have some soul/consciousness
  | 'animal'         // All animals have souls
  | 'organic'        // All living things (plants too) have spirits
  | 'object'         // Objects can have spirits (genius loci, item spirits)
  | 'elemental'      // Elements and forces have spirits (fire, wind, etc.)
  | 'abstract'       // Abstract concepts are alive (Tuesday, the number 7)
  | 'panpsychic';    // Everything has consciousness, full animism

// ============================================================================
// Spectrum Configuration
// ============================================================================

/**
 * Complete magic configuration for a universe.
 */
export interface MagicSpectrumConfig {
  /** How magical is this universe? */
  intensity: MagicalIntensity;

  /** What sources of magic are available? (can be multiple) */
  sources: MagicSourceOrigin[];

  /** How formal/structured is magical practice? */
  formality: MagicFormality;

  /** How ensouled is the world? */
  animism: AnimismLevel;

  /** Additional configuration */
  options?: {
    /** Can magic be learned, or is it innate only? */
    magicIsLearnable?: boolean;

    /** Can magic be taught by others? */
    magicIsTeachable?: boolean;

    /** Is there an afterlife/underworld? */
    hasAfterlife?: boolean;

    /** Do gods physically exist and interact? */
    godsArePresent?: boolean;

    /** Can mortals become divine? */
    ascensionPossible?: boolean;

    /** Is technology vs magic a conflict? */
    techMagicConflict?: boolean;

    /** Power ceiling (how powerful can magic get?) */
    powerCeiling?: 'cantrips' | 'heroic' | 'legendary' | 'godlike' | 'reality_warping' | 'unlimited';
  };
}

/**
 * Describes what paradigms are enabled/disabled at each spectrum position.
 */
export interface SpectrumEffects {
  /** Paradigms that are fully enabled */
  enabledParadigms: string[];

  /** Paradigms that exist but are weakened */
  weakenedParadigms: string[];

  /** Paradigms that are completely disabled */
  disabledParadigms: string[];

  /** Power multiplier for all magic */
  powerMultiplier: number;

  /** Cost multiplier for all magic */
  costMultiplier: number;

  /** Which entities can be interacted with */
  availableEntities: string[];

  /** Description for the LMI/prompts */
  description: string;
}

// ============================================================================
// Preset Configurations
// ============================================================================

/**
 * Preset universe configurations for common settings.
 */
export const SPECTRUM_PRESETS: Record<string, MagicSpectrumConfig> = {
  /**
   * Mundane Earth - Our world, no magic
   */
  mundane: {
    intensity: 'null',
    sources: ['none'],
    formality: 'academic',  // Irrelevant since no magic
    animism: 'human_only',
    options: {
      magicIsLearnable: false,
      hasAfterlife: false,  // Unknown
      godsArePresent: false,
    },
  },

  /**
   * Low Fantasy - Rare, subtle magic (Game of Thrones early seasons)
   */
  low_fantasy: {
    intensity: 'low',
    sources: ['divine', 'ancestral', 'material'],
    formality: 'traditional',
    animism: 'animal',
    options: {
      magicIsLearnable: false,
      magicIsTeachable: false,
      hasAfterlife: true,
      godsArePresent: false,
      powerCeiling: 'heroic',
    },
  },

  /**
   * Classic Fantasy - D&D style magic (Forgotten Realms)
   */
  classic_fantasy: {
    intensity: 'high',
    sources: ['internal', 'divine', 'knowledge', 'pact'],
    formality: 'academic',
    animism: 'organic',
    options: {
      magicIsLearnable: true,
      magicIsTeachable: true,
      hasAfterlife: true,
      godsArePresent: true,
      ascensionPossible: true,
      powerCeiling: 'legendary',
    },
  },

  /**
   * Mythic - Gods walk among mortals (Greek Mythology)
   */
  mythic: {
    intensity: 'saturated',
    sources: ['divine', 'ancestral', 'environmental'],
    formality: 'traditional',
    animism: 'elemental',
    options: {
      magicIsLearnable: false,  // Mostly divine gift
      hasAfterlife: true,
      godsArePresent: true,
      ascensionPossible: true,
      powerCeiling: 'godlike',
    },
  },

  /**
   * Shinto Animism - Everything has a spirit (Japanese folklore)
   */
  shinto_animism: {
    intensity: 'medium',
    sources: ['divine', 'environmental', 'ancestral'],
    formality: 'traditional',
    animism: 'panpsychic',
    options: {
      magicIsLearnable: true,
      hasAfterlife: true,
      godsArePresent: true,  // Kami are everywhere
      powerCeiling: 'legendary',
    },
  },

  /**
   * Hard Magic - Systematic, rule-based (Mistborn, Name of the Wind)
   */
  hard_magic: {
    intensity: 'high',
    sources: ['internal', 'material', 'knowledge'],
    formality: 'scientific',
    animism: 'human_only',
    options: {
      magicIsLearnable: true,
      magicIsTeachable: true,
      hasAfterlife: false,
      godsArePresent: false,
      powerCeiling: 'legendary',
    },
  },

  /**
   * Literary Surrealism - Words are real, metaphors come true
   */
  literary_surrealism: {
    intensity: 'saturated',
    sources: ['narrative', 'knowledge', 'emotional'],
    formality: 'intuitive',
    animism: 'abstract',
    options: {
      magicIsLearnable: true,
      magicIsTeachable: true,
      hasAfterlife: true,
      powerCeiling: 'reality_warping',
    },
  },

  /**
   * Wild Magic - Chaotic, unpredictable (Xanth-style)
   */
  wild_magic: {
    intensity: 'high',
    sources: ['universal'],
    formality: 'chaotic',
    animism: 'organic',
    options: {
      magicIsLearnable: false,
      powerCeiling: 'unlimited',  // But unpredictable
    },
  },

  /**
   * Post-Apocalyptic Magic - Magic was destroyed (Dead magic)
   */
  dead_magic: {
    intensity: 'dead',
    sources: ['none'],
    formality: 'academic',  // Knowledge remains
    animism: 'object',  // Artifacts remember
    options: {
      magicIsLearnable: false,
      hasAfterlife: false,
      powerCeiling: 'cantrips',  // Trace amounts
    },
  },

  /**
   * AI Village Default - Rich animism with multiple magic systems
   */
  ai_village: {
    intensity: 'high',
    sources: ['divine', 'internal', 'knowledge', 'emotional', 'environmental', 'ancestral'],
    formality: 'trained',
    animism: 'elemental',
    options: {
      magicIsLearnable: true,
      magicIsTeachable: true,
      hasAfterlife: true,
      godsArePresent: true,
      ascensionPossible: false,
      powerCeiling: 'legendary',
    },
  },
};

// ============================================================================
// Paradigm Mapping
// ============================================================================

/** Maps intensity levels to enabled paradigm sets */
const INTENSITY_PARADIGM_MAP: Record<MagicalIntensity, { enabled: string[]; disabled: string[] }> = {
  null: {
    enabled: [],
    disabled: ['all'],
  },
  anti: {
    enabled: [],
    disabled: ['all'],
  },
  dead: {
    enabled: [],  // Artifacts might work
    disabled: ['all'],
  },
  trace: {
    enabled: ['talent'],  // Only innate, weak abilities
    disabled: ['academic', 'pact', 'divine'],
  },
  low: {
    enabled: ['talent', 'emotional', 'blood'],
    disabled: ['academic', 'wild'],
  },
  medium: {
    enabled: ['talent', 'emotional', 'blood', 'breath', 'sympathy', 'song', 'rune', 'divine', 'shinto'],
    disabled: ['wild'],
  },
  high: {
    enabled: ['academic', 'pact', 'name', 'breath', 'divine', 'blood', 'emotional', 'shinto', 'sympathy', 'allomancy', 'dream', 'song', 'rune', 'daemon', 'talent', 'narrative'],
    disabled: [],
  },
  saturated: {
    enabled: ['academic', 'pact', 'name', 'breath', 'divine', 'blood', 'emotional', 'shinto', 'sympathy', 'allomancy', 'dream', 'song', 'rune', 'daemon', 'talent', 'narrative', 'pun', 'wild', 'poetic'],
    disabled: [],
  },
  reality_is_magic: {
    enabled: ['all'],
    disabled: [],
  },
};

/** Maps animism levels to enabled paradigm sets */
const ANIMISM_PARADIGM_MAP: Record<AnimismLevel, { enabled: string[]; required: string[] }> = {
  materialist: {
    enabled: ['academic', 'sympathy', 'rune', 'blood', 'allomancy'],
    required: [],
  },
  human_only: {
    enabled: ['academic', 'sympathy', 'rune', 'blood', 'allomancy', 'talent', 'emotional', 'breath', 'name'],
    required: [],
  },
  mammalian: {
    enabled: ['academic', 'sympathy', 'rune', 'blood', 'allomancy', 'talent', 'emotional', 'breath', 'name', 'daemon'],
    required: [],
  },
  animal: {
    enabled: ['academic', 'sympathy', 'rune', 'blood', 'allomancy', 'talent', 'emotional', 'breath', 'name', 'daemon', 'dream'],
    required: [],
  },
  organic: {
    enabled: ['academic', 'sympathy', 'rune', 'blood', 'allomancy', 'talent', 'emotional', 'breath', 'name', 'daemon', 'dream', 'song'],
    required: [],
  },
  object: {
    enabled: ['academic', 'sympathy', 'rune', 'blood', 'allomancy', 'talent', 'emotional', 'breath', 'name', 'daemon', 'dream', 'song', 'divine', 'shinto'],
    required: ['shinto'],  // Object spirits require shinto-style magic
  },
  elemental: {
    enabled: ['academic', 'sympathy', 'rune', 'blood', 'allomancy', 'talent', 'emotional', 'breath', 'name', 'daemon', 'dream', 'song', 'divine', 'shinto', 'pact'],
    required: ['shinto'],
  },
  abstract: {
    enabled: ['academic', 'sympathy', 'rune', 'blood', 'allomancy', 'talent', 'emotional', 'breath', 'name', 'daemon', 'dream', 'song', 'divine', 'shinto', 'pact', 'narrative', 'pun', 'poetic'],
    required: ['shinto', 'narrative'],  // Living abstractions require these
  },
  panpsychic: {
    enabled: ['all'],
    required: ['shinto'],  // Everything has a kami
  },
};

/** Maps sources to their associated paradigms */
const SOURCE_PARADIGM_MAP: Record<MagicSourceOrigin, string[]> = {
  none: [],
  divine: ['divine', 'shinto'],
  pact: ['pact'],
  ancestral: ['blood', 'allomancy', 'daemon'],
  environmental: ['sympathy', 'shinto', 'rune'],
  internal: ['academic', 'breath', 'emotional', 'talent'],
  knowledge: ['academic', 'name', 'rune', 'sympathy'],
  emotional: ['emotional', 'song', 'narrative'],
  material: ['blood', 'allomancy', 'rune'],
  narrative: ['narrative', 'pun', 'poetic'],
  universal: ['wild', 'talent'],
};

/** Maps formality to compatible paradigms */
const FORMALITY_PARADIGM_MAP: Record<MagicFormality, { preferred: string[]; discouraged: string[] }> = {
  chaotic: {
    preferred: ['wild', 'pun', 'talent'],
    discouraged: ['academic', 'sympathy', 'rune'],
  },
  intuitive: {
    preferred: ['talent', 'emotional', 'narrative', 'dream', 'song'],
    discouraged: ['academic', 'rune'],
  },
  traditional: {
    preferred: ['song', 'shinto', 'divine', 'blood', 'daemon'],
    discouraged: ['academic'],
  },
  trained: {
    preferred: ['sympathy', 'rune', 'name', 'breath', 'allomancy', 'pact'],
    discouraged: ['wild', 'talent'],
  },
  academic: {
    preferred: ['academic', 'sympathy', 'rune', 'name'],
    discouraged: ['wild', 'talent', 'emotional'],
  },
  scientific: {
    preferred: ['academic', 'sympathy', 'allomancy'],
    discouraged: ['wild', 'narrative', 'pun', 'divine', 'pact'],
  },
};

// ============================================================================
// Spectrum Resolution
// ============================================================================

/**
 * Given a spectrum configuration, determine which paradigms should be
 * enabled, disabled, or modified.
 */
export function resolveSpectrum(config: MagicSpectrumConfig): SpectrumEffects {
  const enabled = new Set<string>();
  const weakened = new Set<string>();
  const disabled = new Set<string>();

  // Start with intensity-based filtering
  const intensityEffects = INTENSITY_PARADIGM_MAP[config.intensity];
  if (intensityEffects.disabled.includes('all')) {
    // All magic disabled
    return {
      enabledParadigms: [],
      weakenedParadigms: [],
      disabledParadigms: ['all'],
      powerMultiplier: 0,
      costMultiplier: Infinity,
      availableEntities: [],
      description: getIntensityDescription(config.intensity),
    };
  }

  // Add intensity-enabled paradigms
  for (const p of intensityEffects.enabled) {
    enabled.add(p);
  }
  for (const p of intensityEffects.disabled) {
    disabled.add(p);
  }

  // Filter by sources
  for (const source of config.sources) {
    const sourceParadigms = SOURCE_PARADIGM_MAP[source] ?? [];
    for (const p of sourceParadigms) {
      if (!disabled.has(p)) {
        enabled.add(p);
      }
    }
  }

  // Filter by animism
  const animismEffects = ANIMISM_PARADIGM_MAP[config.animism];
  // Only keep paradigms that animism level supports
  for (const p of [...enabled]) {
    if (!animismEffects.enabled.includes(p) && !animismEffects.enabled.includes('all')) {
      enabled.delete(p);
      weakened.add(p);
    }
  }
  // Add required paradigms for this animism level
  for (const p of animismEffects.required) {
    if (!disabled.has(p)) {
      enabled.add(p);
      weakened.delete(p);
    }
  }

  // Apply formality preferences
  const formalityEffects = FORMALITY_PARADIGM_MAP[config.formality];
  for (const p of formalityEffects.discouraged) {
    if (enabled.has(p)) {
      enabled.delete(p);
      weakened.add(p);
    }
  }

  // Calculate power/cost multipliers
  const powerMultiplier = calculatePowerMultiplier(config.intensity);
  const costMultiplier = calculateCostMultiplier(config.intensity, config.formality);

  // Determine available entities
  const entities = determineAvailableEntities(config);

  return {
    enabledParadigms: [...enabled],
    weakenedParadigms: [...weakened],
    disabledParadigms: [...disabled],
    powerMultiplier,
    costMultiplier,
    availableEntities: entities,
    description: generateDescription(config),
  };
}

/**
 * Get a preset configuration by name.
 */
export function getPreset(name: keyof typeof SPECTRUM_PRESETS): MagicSpectrumConfig {
  const preset = SPECTRUM_PRESETS[name];
  if (!preset) {
    throw new Error(`Unknown preset: ${String(name)}`);
  }
  return preset;
}

/**
 * Get all available preset names.
 */
export function getPresetNames(): string[] {
  return Object.keys(SPECTRUM_PRESETS);
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculatePowerMultiplier(intensity: MagicalIntensity): number {
  const multipliers: Record<MagicalIntensity, number> = {
    null: 0,
    anti: 0,
    dead: 0.05,
    trace: 0.1,
    low: 0.3,
    medium: 0.6,
    high: 1.0,
    saturated: 1.5,
    reality_is_magic: 2.0,
  };
  return multipliers[intensity];
}

function calculateCostMultiplier(intensity: MagicalIntensity, formality: MagicFormality): number {
  // Base cost from intensity
  let cost = 1.0;

  // Lower intensity = higher costs (magic is harder)
  const intensityCosts: Record<MagicalIntensity, number> = {
    null: Infinity,
    anti: Infinity,
    dead: 10.0,
    trace: 5.0,
    low: 2.0,
    medium: 1.2,
    high: 1.0,
    saturated: 0.8,
    reality_is_magic: 0.5,
  };
  cost *= intensityCosts[intensity];

  // Formality affects costs
  const formalityCosts: Record<MagicFormality, number> = {
    chaotic: 0.5,      // Cheap but unpredictable
    intuitive: 0.8,    // Slightly cheaper
    traditional: 1.0,  // Standard
    trained: 1.0,      // Standard
    academic: 1.2,     // More resources for research
    scientific: 1.5,   // Highest infrastructure cost
  };
  cost *= formalityCosts[formality];

  return cost;
}

function determineAvailableEntities(config: MagicSpectrumConfig): string[] {
  const entities: string[] = [];

  // Animism determines what's ensouled
  if (config.animism !== 'materialist') {
    entities.push('human_souls');
  }
  if (['mammalian', 'animal', 'organic', 'object', 'elemental', 'abstract', 'panpsychic'].includes(config.animism)) {
    entities.push('animal_spirits');
  }
  if (['organic', 'object', 'elemental', 'abstract', 'panpsychic'].includes(config.animism)) {
    entities.push('plant_spirits', 'nature_spirits');
  }
  if (['object', 'elemental', 'abstract', 'panpsychic'].includes(config.animism)) {
    entities.push('object_spirits', 'place_spirits', 'kami');
  }
  if (['elemental', 'abstract', 'panpsychic'].includes(config.animism)) {
    entities.push('elemental_spirits', 'forces');
  }
  if (['abstract', 'panpsychic'].includes(config.animism)) {
    entities.push('concept_beings', 'emotional_entities', 'living_abstractions');
  }

  // Sources add entities
  if (config.sources.includes('divine')) {
    entities.push('gods', 'angels', 'divine_servants');
  }
  if (config.sources.includes('pact')) {
    entities.push('demons', 'fae', 'patrons');
  }
  if (config.sources.includes('ancestral')) {
    entities.push('ancestor_spirits', 'ghosts');
  }

  // Options
  if (config.options?.hasAfterlife) {
    entities.push('dead_souls', 'underworld_beings');
  }
  if (config.options?.godsArePresent) {
    entities.push('manifest_deities');
  }

  return [...new Set(entities)];
}

function getIntensityDescription(intensity: MagicalIntensity): string {
  const descriptions: Record<MagicalIntensity, string> = {
    null: 'Magic does not exist in this universe. All magical effects are impossible.',
    anti: 'This universe actively suppresses magic. Magical beings weaken, spells unravel.',
    dead: 'Magic once existed here but has been depleted. Only traces remain in ancient artifacts.',
    trace: 'Magic is extremely rare and subtle. Most people never encounter it.',
    low: 'Magic exists but is uncommon and relatively weak. Practitioners are rare.',
    medium: 'Magic is a known force in the world. Practitioners are respected and somewhat common.',
    high: 'Magic is powerful and prevalent. Multiple magical traditions flourish.',
    saturated: 'Magic permeates everything. The supernatural is part of daily life.',
    reality_is_magic: 'The distinction between magical and mundane has no meaning here.',
  };
  return descriptions[intensity];
}

function generateDescription(config: MagicSpectrumConfig): string {
  const parts: string[] = [];

  parts.push(getIntensityDescription(config.intensity));

  if (config.sources.length > 0 && config.sources[0] !== 'none') {
    parts.push(`Power flows from: ${config.sources.join(', ')}.`);
  }

  const animismDescriptions: Record<AnimismLevel, string> = {
    materialist: 'Only physical matter exists.',
    human_only: 'Only humans possess souls or consciousness.',
    mammalian: 'Mammals have some form of soul or awareness.',
    animal: 'All animals possess spirits.',
    organic: 'All living things, including plants, have spirits.',
    object: 'Objects and places can have spirits (genius loci).',
    elemental: 'Elements and forces have their own spirits.',
    abstract: 'Abstract concepts exist as living beings.',
    panpsychic: 'Everything has consciousness. All things have kami.',
  };
  parts.push(animismDescriptions[config.animism]);

  return parts.join(' ');
}

// ============================================================================
// Universe Configuration Questions
// ============================================================================

/**
 * Questions to ask when configuring a universe's magic.
 * These can be used in a UI or during universe creation.
 */
export const CONFIGURATION_QUESTIONS = {
  intensity: {
    question: 'How magical do you want your universe?',
    options: [
      { value: 'null', label: 'No Magic', description: 'Magic doesn\'t exist at all' },
      { value: 'anti', label: 'Anti-Magic', description: 'Magic is actively suppressed' },
      { value: 'dead', label: 'Dead Magic', description: 'Magic used to exist but is gone' },
      { value: 'low', label: 'Low Magic', description: 'Rare and subtle magic (Game of Thrones)' },
      { value: 'medium', label: 'Medium Magic', description: 'Magic is present but not dominant' },
      { value: 'high', label: 'High Magic', description: 'Multiple powerful magic systems (D&D)' },
      { value: 'saturated', label: 'Saturated', description: 'Magic is everywhere (Discworld)' },
      { value: 'reality_is_magic', label: 'Reality IS Magic', description: 'No mundane exists' },
    ],
  },

  source: {
    question: 'Where does magical power come from? (Select all that apply)',
    options: [
      { value: 'divine', label: 'Divine', description: 'Power from gods or higher beings' },
      { value: 'pact', label: 'Pacts', description: 'Power granted by entities in exchange' },
      { value: 'ancestral', label: 'Bloodlines', description: 'Power inherited from ancestors' },
      { value: 'environmental', label: 'Environment', description: 'Ley lines, sacred places, nature' },
      { value: 'internal', label: 'Internal', description: 'Power from within (mana, life force)' },
      { value: 'knowledge', label: 'Knowledge', description: 'Power from secrets (true names, runes)' },
      { value: 'emotional', label: 'Emotional', description: 'Power from feelings and passion' },
      { value: 'material', label: 'Material', description: 'Power from substances (blood, metals)' },
      { value: 'narrative', label: 'Narrative', description: 'Power from story logic' },
    ],
  },

  formality: {
    question: 'How structured is magical practice?',
    options: [
      { value: 'chaotic', label: 'Chaotic', description: 'No rules, anything can happen' },
      { value: 'intuitive', label: 'Intuitive', description: 'Works by feel, no formal training' },
      { value: 'traditional', label: 'Traditional', description: 'Passed down practices' },
      { value: 'trained', label: 'Trained', description: 'Requires deliberate learning' },
      { value: 'academic', label: 'Academic', description: 'University-style systematic study' },
      { value: 'scientific', label: 'Scientific', description: 'Magic as rigorous science' },
    ],
  },

  animism: {
    question: 'How ensouled is the world? (Kami or no Kami)',
    options: [
      { value: 'materialist', label: 'Materialist', description: 'Only physical matter exists' },
      { value: 'human_only', label: 'Humans Only', description: 'Only humans have souls' },
      { value: 'animal', label: 'Animals', description: 'All animals have spirits' },
      { value: 'organic', label: 'All Life', description: 'Plants have spirits too' },
      { value: 'object', label: 'Objects', description: 'Things and places have spirits' },
      { value: 'elemental', label: 'Elemental', description: 'Forces and elements have spirits' },
      { value: 'abstract', label: 'Abstract', description: 'Concepts are alive (Tuesday, the number 7)' },
      { value: 'panpsychic', label: 'Everything', description: 'Full animism - everything has kami' },
    ],
  },
};

// All exports are inline above
