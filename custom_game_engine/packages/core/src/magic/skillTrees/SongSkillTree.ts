/**
 * SongSkillTree - Skill tree for the Song paradigm
 *
 * Key mechanics:
 * - Songs as discoverable spells (learned, not invented)
 * - Voice as primary channel, instruments as amplifiers
 * - Harmony (constructive) vs Discord (destructive)
 * - Choir/ensemble magic for amplification
 * - Rhythm and tempo affect spell timing
 * - Musical traditions (bardic, choral, instrumental)
 *
 * Core principle: The universe has a fundamental music - a harmony of
 * creation. Those who learn to hear it can sing along, adding their
 * voice to the cosmic song and shaping reality through resonance.
 *
 * Inspired by:
 * - Tolkien's Music of the Ainur (world sung into being)
 * - Bardic magic traditions
 * - Pythagorean music of the spheres
 * - Aboriginal Australian songlines
 */

import type { MagicSkillTree, MagicSkillNode, MagicXPSource } from '../MagicSkillTree.js';
import {
  createSkillNode,
  createSkillEffect,
  createUnlockCondition,
  createDefaultTreeRules,
} from '../MagicSkillTree.js';

// ============================================================================
// Constants
// ============================================================================

const PARADIGM_ID = 'song';

/** Types of songs that can be learned */
export const SONG_TYPES = {
  working: 'Practical songs for everyday tasks',
  healing: 'Songs that mend body and spirit',
  warding: 'Songs that protect against harm',
  calling: 'Songs that summon or attract',
  binding: 'Songs that hold or trap',
  growing: 'Songs that encourage life and growth',
  breaking: 'Songs of discord that shatter',
  lament: 'Songs of loss that affect emotions',
  celebration: 'Songs of joy that uplift',
  lullaby: 'Songs that induce sleep or calm',
  marching: 'Songs that synchronize and empower groups',
  death: 'Songs for the dying and the dead',
} as const;

/** Musical elements that affect magic */
export const MUSICAL_ELEMENTS = {
  melody: 'The primary tune - carries the main effect',
  harmony: 'Supporting tones - amplifies and stabilizes',
  rhythm: 'The beat - controls timing and duration',
  dynamics: 'Volume and intensity - controls power',
  timbre: 'Tone quality - determines subtle effects',
  silence: 'The space between notes - equally important',
} as const;

/** Instrument categories */
export const INSTRUMENT_TYPES = {
  voice: 'The human voice - most versatile, most personal',
  string: 'Plucked or bowed strings - emotional resonance',
  wind: 'Breath through pipes - carries life force',
  percussion: 'Struck surfaces - raw power and rhythm',
  keyboard: 'Complex mechanisms - precision and range',
} as const;

// ============================================================================
// Foundation Nodes - Basic Musical Magic
// ============================================================================

/** Entry node - hearing the music of the world */
const MUSIC_SENSE_NODE = createSkillNode(
  'music-sense',
  'Music of the World',
  PARADIGM_ID,
  'foundation',
  0,
  25,
  [
    createSkillEffect('unlock_ability', 1, {
      description: 'Sense the ambient music of places and things',
      target: { abilityId: 'world_music_sense' },
    }),
  ],
  {
    description: 'Learn to hear the music that underlies all things',
    lore: `Everything has a song - a tree, a river, a mountain. Most cannot hear it.
But for those with the gift, the world is alive with music: the deep bass
of stone, the high shimmer of sunlight, the complex harmonies of a forest.`,
    maxLevel: 3,
    levelCostMultiplier: 1.3,
    icon: '🎵',
  }
);

/** Basic singing - magical voice */
const VOICE_AWAKENING_NODE = createSkillNode(
  'voice-awakening',
  'Voice Awakening',
  PARADIGM_ID,
  'foundation',
  1,
  50,
  [
    createSkillEffect('voice_range', 10, {
      perLevelValue: 5,
      description: 'Magical range of voice',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'magical_voice' },
      description: 'Voice can carry magical effects',
    }),
  ],
  {
    description: 'Awaken the magical potential of your voice',
    lore: `Your voice is your first and most powerful instrument. Properly trained,
it can carry not just sound but intent, not just melody but magic.`,
    prerequisites: ['music-sense'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

/** Pitch control - precise magical targeting */
const PITCH_CONTROL_NODE = createSkillNode(
  'pitch-control',
  'Perfect Pitch',
  PARADIGM_ID,
  'technique',
  1,
  60,
  [
    createSkillEffect('harmony_bonus', 10, {
      perLevelValue: 5,
      description: '+X% harmony accuracy',
    }),
  ],
  {
    description: 'Develop precise control over pitch and tone',
    lore: 'Magic is particular about pitch. A song sung off-key may fail or worse - create unexpected discord. Perfect pitch ensures clean magic.',
    prerequisites: ['voice-awakening'],
    maxLevel: 5,
    levelCostMultiplier: 1.3,
  }
);

/** Breath control - sustaining magic */
const BREATH_CONTROL_NODE = createSkillNode(
  'breath-control',
  'Breath of Power',
  PARADIGM_ID,
  'technique',
  1,
  50,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'sustained_singing' },
      description: 'Sustain notes for extended magical effects',
    }),
  ],
  {
    description: 'Master breath control for sustained magical singing',
    lore: 'The breath is life force made sound. Control the breath, and you control the flow of power through your songs.',
    prerequisites: ['voice-awakening'],
    maxLevel: 3,
    levelCostMultiplier: 1.4,
  }
);

// ============================================================================
// Harmony Nodes - Constructive Magic
// ============================================================================

/** Basic harmony - strengthening magic */
const BASIC_HARMONY_NODE = createSkillNode(
  'basic-harmony',
  'Harmonic Resonance',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('harmony_bonus', 15, {
      perLevelValue: 5,
      description: '+X% constructive spell power',
    }),
  ],
  {
    description: 'Learn to sing in harmony with the world\'s music',
    lore: `When your song aligns with the existing harmonies of the world,
effects are amplified. This is the foundation of all constructive song magic.`,
    prerequisites: ['pitch-control'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Healing songs */
const HEALING_SONGS_NODE = createSkillNode(
  'healing-songs',
  'Songs of Mending',
  PARADIGM_ID,
  'discovery',
  2,
  125,
  [
    createSkillEffect('unlock_song', 1, {
      description: 'Can learn and sing healing songs',
    }),
  ],
  {
    description: 'Learn the songs that mend body and spirit',
    lore: `The oldest songs are healing songs - mother's lullabies, chants over
the sick, hymns for the wounded. Learn these melodies and your voice
becomes medicine.`,
    prerequisites: ['basic-harmony'],
    unlockConditions: [
      createUnlockCondition(
        'song_learned',
        { songId: 'first_healing_melody' },
        'Must learn your first healing melody'
      ),
    ],
    conditionMode: 'all',
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Warding songs */
const WARDING_SONGS_NODE = createSkillNode(
  'warding-songs',
  'Songs of Protection',
  PARADIGM_ID,
  'discovery',
  2,
  125,
  [
    createSkillEffect('unlock_song', 1, {
      description: 'Can learn and sing protective songs',
    }),
  ],
  {
    description: 'Learn songs that create barriers and wards',
    lore: 'A mother\'s lullaby wards off nightmares. A marching song strengthens resolve. These are the warding songs - protection through harmony.',
    prerequisites: ['basic-harmony'],
  }
);

/** Growing songs - affecting life and growth */
const GROWING_SONGS_NODE = createSkillNode(
  'growing-songs',
  'Songs of Growth',
  PARADIGM_ID,
  'discovery',
  3,
  150,
  [
    createSkillEffect('unlock_song', 1, {
      description: 'Can learn and sing songs of growth',
    }),
  ],
  {
    description: 'Learn songs that encourage life and growth',
    lore: `Farmers have always sung to their crops. There is truth in it - plants
respond to certain frequencies. Master these songs and you can coax
growth from barren soil.`,
    prerequisites: ['healing-songs'],
    unlockConditions: [
      createUnlockCondition(
        'skill_level',
        { skillId: 'farming', skillLevel: 2 },
        'Must have farming experience'
      ),
    ],
    conditionMode: 'any',
  }
);

// ============================================================================
// Discord Nodes - Destructive/Disruptive Magic
// ============================================================================

/** Basic discord - disrupting harmony */
const BASIC_DISCORD_NODE = createSkillNode(
  'basic-discord',
  'Dissonance',
  PARADIGM_ID,
  'technique',
  2,
  100,
  [
    createSkillEffect('discord_resistance', 10, {
      perLevelValue: 5,
      description: '+X% resistance to discord effects on self',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'create_dissonance' },
      description: 'Create disruptive dissonance',
    }),
  ],
  {
    description: 'Learn to create controlled discord',
    lore: `Discord is not evil - it is change, disruption, the breaking of stasis.
Sometimes harmony must be broken before a new harmony can emerge. But
discord is dangerous; it can consume the singer.`,
    prerequisites: ['pitch-control'],
    maxLevel: 3,
    levelCostMultiplier: 1.5,
  }
);

/** Breaking songs - destructive power */
const BREAKING_SONGS_NODE = createSkillNode(
  'breaking-songs',
  'Songs of Shattering',
  PARADIGM_ID,
  'discovery',
  3,
  175,
  [
    createSkillEffect('unlock_song', 1, {
      description: 'Can learn songs that shatter and destroy',
    }),
  ],
  {
    description: 'Learn the songs that break and shatter',
    lore: `The right pitch can shatter glass. The right song can shatter stone,
chains, even magical bonds. These are the songs of breaking - crude but
powerful.`,
    prerequisites: ['basic-discord'],
    unlockConditions: [
      createUnlockCondition(
        'trauma_experienced',
        { traumaType: 'witnessed_destruction' },
        'Must have witnessed significant destruction'
      ),
    ],
    conditionMode: 'any',
  }
);

/** Silencing songs - negating magic */
const SILENCING_SONGS_NODE = createSkillNode(
  'silencing-songs',
  'Songs of Silence',
  PARADIGM_ID,
  'mastery',
  4,
  225,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'magical_silence' },
      description: 'Create zones of magical silence',
    }),
  ],
  {
    description: 'Learn to sing silence itself',
    lore: `Paradoxical: a song of silence. But silence is not the absence of sound -
it is the presence of perfect stillness. Master singers can impose this
stillness on an area, negating all sound-based magic within.`,
    prerequisites: ['breaking-songs', 'breath-control'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'breath-control', level: 3 },
        'Must have mastered breath control'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Instrument Nodes
// ============================================================================

/** Instrument attunement - using instruments */
const INSTRUMENT_ATTUNEMENT_NODE = createSkillNode(
  'instrument-attunement',
  'Instrument Attunement',
  PARADIGM_ID,
  'channeling',
  1,
  75,
  [
    createSkillEffect('instrument_mastery', 10, {
      perLevelValue: 5,
      description: '+X% magical effectiveness with instruments',
    }),
  ],
  {
    description: 'Learn to channel magic through instruments',
    lore: `While the voice is the purest instrument, constructed instruments
offer capabilities beyond the human body - greater range, sustained notes,
multiple simultaneous tones.`,
    prerequisites: ['music-sense'],
    maxLevel: 5,
    levelCostMultiplier: 1.4,
  }
);

/** String instruments - emotional resonance */
const STRING_MASTERY_NODE = createSkillNode(
  'string-mastery',
  'String Mastery',
  PARADIGM_ID,
  'channeling',
  2,
  100,
  [
    createSkillEffect('instrument_mastery', 15, {
      description: 'Bonus with string instruments',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'heartstring_resonance' },
      description: 'String music affects emotions directly',
    }),
  ],
  {
    description: 'Master string instruments for emotional magic',
    lore: `Strings vibrate in sympathy with the human heart. A skilled player can
pluck emotions as easily as strings - drawing out sorrow, inspiring joy,
kindling love or rage.`,
    prerequisites: ['instrument-attunement'],
    unlockConditions: [
      createUnlockCondition(
        'skill_level',
        { skillId: 'string_instruments', skillLevel: 2 },
        'Must have string instrument skill'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Wind instruments - breath magic */
const WIND_MASTERY_NODE = createSkillNode(
  'wind-mastery',
  'Wind Mastery',
  PARADIGM_ID,
  'channeling',
  2,
  100,
  [
    createSkillEffect('instrument_mastery', 15, {
      description: 'Bonus with wind instruments',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'breath_projection' },
      description: 'Project breath/spirit through music',
    }),
  ],
  {
    description: 'Master wind instruments for breath-spirit magic',
    lore: `Wind instruments carry the breath - and breath is spirit. Play a flute
and you breathe your life force into the music. This makes wind magic
personal and powerful, but also draining.`,
    prerequisites: ['instrument-attunement', 'breath-control'],
  }
);

/** Percussion - rhythm and power */
const PERCUSSION_MASTERY_NODE = createSkillNode(
  'percussion-mastery',
  'Percussion Mastery',
  PARADIGM_ID,
  'channeling',
  2,
  100,
  [
    createSkillEffect('instrument_mastery', 15, {
      description: 'Bonus with percussion instruments',
    }),
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'rhythm_control' },
      description: 'Control tempo and timing precisely',
    }),
  ],
  {
    description: 'Master percussion for rhythm-based magic',
    lore: `The drum is the heartbeat of magic. Rhythm entrains the mind, synchronizes
groups, and creates patterns that magic flows along. A master drummer
controls the very tempo of reality.`,
    prerequisites: ['instrument-attunement'],
  }
);

// ============================================================================
// Ensemble/Group Nodes
// ============================================================================

/** Duet singing - two-person magic */
const DUET_SINGING_NODE = createSkillNode(
  'duet-singing',
  'Duet Harmony',
  PARADIGM_ID,
  'relationship',
  2,
  100,
  [
    createSkillEffect('choir_coordination', 1, {
      description: 'Can harmonize effectively with one other',
    }),
  ],
  {
    description: 'Learn to harmonize magically with one other singer',
    lore: `When two voices join in harmony, the magic is more than doubled. But
harmonizing requires trust and practice - your magic must blend with
another's without conflict.`,
    prerequisites: ['basic-harmony', 'voice-awakening'],
    unlockConditions: [
      createUnlockCondition(
        'teacher_found',
        { teacherType: 'duet_partner' },
        'Must practice with a harmonizing partner'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Choir magic - group power */
const CHOIR_MAGIC_NODE = createSkillNode(
  'choir-magic',
  'Choir Power',
  PARADIGM_ID,
  'relationship',
  3,
  175,
  [
    createSkillEffect('choir_coordination', 5, {
      perLevelValue: 3,
      description: 'Can coordinate X additional singers',
    }),
  ],
  {
    description: 'Lead a choir in magical song',
    lore: `A single voice is a stream; a choir is an ocean. When many voices unite
in harmony, they can achieve effects impossible for any individual - moving
mountains, calming storms, healing plagues.`,
    prerequisites: ['duet-singing'],
    maxLevel: 5,
    levelCostMultiplier: 1.5,
  }
);

/** Conductor - directing group magic */
const CONDUCTOR_NODE = createSkillNode(
  'conductor',
  'Master Conductor',
  PARADIGM_ID,
  'mastery',
  4,
  250,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'magical_conducting' },
      description: 'Direct magical ensembles without singing',
    }),
    createSkillEffect('choir_coordination', 10, {
      description: 'Major bonus to choir coordination',
    }),
  ],
  {
    description: 'Lead magical ensembles without singing yourself',
    lore: `The conductor does not sing - they shape the singing of others. Through
gesture, intent, and will, they weave individual voices into a single
magical instrument of immense power.`,
    prerequisites: ['choir-magic'],
    unlockConditions: [
      createUnlockCondition(
        'node_level',
        { nodeId: 'choir-magic', level: 3 },
        'Must have significant choir experience'
      ),
    ],
    conditionMode: 'all',
  }
);

// ============================================================================
// Special Song Types
// ============================================================================

/** Calling songs - summoning */
const CALLING_SONGS_NODE = createSkillNode(
  'calling-songs',
  'Songs of Calling',
  PARADIGM_ID,
  'discovery',
  3,
  150,
  [
    createSkillEffect('unlock_song', 1, {
      description: 'Can learn songs that call and summon',
    }),
  ],
  {
    description: 'Learn songs that call beings or things to you',
    lore: `Everything has a name-song - the melody that is its essence. Sing it,
and you call to that thing. Animals respond readily; spirits sometimes;
people only if they wish to come.`,
    prerequisites: ['basic-harmony'],
  }
);

/** Lament - affecting emotions */
const LAMENT_SONGS_NODE = createSkillNode(
  'lament-songs',
  'Songs of Lament',
  PARADIGM_ID,
  'discovery',
  3,
  150,
  [
    createSkillEffect('unlock_song', 1, {
      description: 'Can learn songs of mourning and loss',
    }),
  ],
  {
    description: 'Learn the songs of mourning that move hearts',
    lore: `Laments are songs of loss - but also songs of power. A true lament can
make the hardest heart weep, can honor the dead so deeply that their
spirits stir, can channel grief into purpose.`,
    prerequisites: ['basic-harmony'],
    unlockConditions: [
      createUnlockCondition(
        'trauma_experienced',
        { traumaType: 'significant_loss' },
        'Must have experienced significant loss'
      ),
    ],
    conditionMode: 'all',
    hidden: true, // Revealed by loss
  }
);

/** Death songs - for the dying */
const DEATH_SONGS_NODE = createSkillNode(
  'death-songs',
  'Songs of Passage',
  PARADIGM_ID,
  'mastery',
  4,
  250,
  [
    createSkillEffect('unlock_song', 1, {
      description: 'Can learn songs for death and the dead',
    }),
  ],
  {
    description: 'Learn the songs that ease death and honor the dead',
    lore: `The greatest singers know the songs of passage - melodies that ease
the dying, hymns that honor the dead, chants that ensure spirits find
their way. These songs walk the border between life and death.`,
    prerequisites: ['lament-songs'],
    unlockConditions: [
      createUnlockCondition(
        'ritual_performed',
        { ritualId: 'death_vigil' },
        'Must have sung at a death vigil'
      ),
    ],
    conditionMode: 'all',
  }
);

/** Power words - single-note magic */
const POWER_WORDS_NODE = createSkillNode(
  'power-words',
  'Words of Power',
  PARADIGM_ID,
  'mastery',
  4,
  275,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'power_word' },
      description: 'Concentrate a song into a single word',
    }),
  ],
  {
    description: 'Concentrate an entire song into a single word of power',
    lore: `Masters learn to compress - to take an entire song and fold it into a
single syllable of absolute power. These words can stop hearts, shatter
walls, or heal mortal wounds - but each use drains the singer utterly.`,
    prerequisites: ['healing-songs', 'breaking-songs', 'breath-control'],
    unlockConditions: [
      createUnlockCondition(
        'xp_accumulated',
        { xpRequired: 1500 },
        'Must have extensive singing experience'
      ),
    ],
    conditionMode: 'all',
    icon: '⚡',
  }
);

/** World song - hearing the cosmic music */
const WORLD_SONG_NODE = createSkillNode(
  'world-song',
  'The World Song',
  PARADIGM_ID,
  'mastery',
  5,
  400,
  [
    createSkillEffect('unlock_ability', 1, {
      target: { abilityId: 'hear_world_song' },
      description: 'Hear the fundamental music of creation',
    }),
  ],
  {
    description: 'Hear the fundamental song of creation itself',
    lore: `Beyond all individual songs lies the World Song - the harmony of creation
itself, the music that was sung before time began. To hear even a fragment
is to understand the universe in a way no other magic allows.`,
    prerequisites: ['music-sense', 'death-songs', 'power-words'],
    unlockConditions: [
      createUnlockCondition(
        'vision_received',
        { visionType: 'musical_revelation' },
        'Must receive a musical revelation'
      ),
    ],
    conditionMode: 'all',
    hidden: true,
    icon: '🌌',
  }
);

// ============================================================================
// XP Sources
// ============================================================================

const XP_SOURCES: MagicXPSource[] = [
  {
    eventType: 'song_performed',
    xpAmount: 10,
    description: 'Perform a magical song',
  },
  {
    eventType: 'song_learned',
    xpAmount: 50,
    description: 'Learn a new magical song',
  },
  {
    eventType: 'harmony_achieved',
    xpAmount: 20,
    description: 'Achieve perfect harmony with another singer',
  },
  {
    eventType: 'discord_controlled',
    xpAmount: 25,
    description: 'Create controlled discord',
  },
  {
    eventType: 'healing_sung',
    xpAmount: 30,
    description: 'Heal someone through song',
  },
  {
    eventType: 'choir_led',
    xpAmount: 50,
    description: 'Lead a magical choir',
  },
  {
    eventType: 'instrument_mastered',
    xpAmount: 75,
    description: 'Master a new instrument type',
  },
  {
    eventType: 'world_music_heard',
    xpAmount: 100,
    description: 'Hear a fragment of the world song',
  },
  {
    eventType: 'death_song_performed',
    xpAmount: 100,
    description: 'Perform a song of passage',
  },
];

// ============================================================================
// Tree Assembly
// ============================================================================

const ALL_NODES: MagicSkillNode[] = [
  // Foundation
  MUSIC_SENSE_NODE,
  VOICE_AWAKENING_NODE,
  PITCH_CONTROL_NODE,
  BREATH_CONTROL_NODE,

  // Harmony
  BASIC_HARMONY_NODE,
  HEALING_SONGS_NODE,
  WARDING_SONGS_NODE,
  GROWING_SONGS_NODE,

  // Discord
  BASIC_DISCORD_NODE,
  BREAKING_SONGS_NODE,
  SILENCING_SONGS_NODE,

  // Instruments
  INSTRUMENT_ATTUNEMENT_NODE,
  STRING_MASTERY_NODE,
  WIND_MASTERY_NODE,
  PERCUSSION_MASTERY_NODE,

  // Ensemble
  DUET_SINGING_NODE,
  CHOIR_MAGIC_NODE,
  CONDUCTOR_NODE,

  // Special Songs
  CALLING_SONGS_NODE,
  LAMENT_SONGS_NODE,
  DEATH_SONGS_NODE,
  POWER_WORDS_NODE,
  WORLD_SONG_NODE,
];

/**
 * The Song skill tree.
 * Anyone can learn, but requires discovering songs and potentially group work.
 */
export const SONG_SKILL_TREE: MagicSkillTree = {
  id: 'song-tree',
  paradigmId: PARADIGM_ID,
  name: 'The Art of Song',
  description: 'Channel magic through music - healing, protection, destruction, and the fundamental harmonies of creation.',
  lore: `Before there were words, there was music. The universe was sung into being -
a grand harmony of creation that still echoes in all things. Those who learn
to hear this music can add their voices to it, shaping reality through
resonance and melody.

Song magic requires no arcane words or complex gestures - only voice, breath,
and the will to harmonize. It is perhaps the most natural of all magics,
accessible to anyone who can carry a tune. But mastery requires more than
talent: it requires understanding harmony and discord, learning the ancient
songs, and sometimes, singing together with others.

The greatest song mages can hear the World Song itself - the fundamental music
of creation. To sing along with that song is to touch the divine.`,
  nodes: ALL_NODES,
  entryNodes: ['music-sense'],
  connections: [], // Auto-generated from prerequisites
  xpSources: XP_SOURCES,
  rules: {
    ...createDefaultTreeRules(false), // No innate requirement
    allowRespec: true,
    permanentProgress: true,
  },
  version: 1,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get available song types based on unlocked nodes.
 */
export function getAvailableSongTypes(unlockedNodes: Record<string, number>): (keyof typeof SONG_TYPES)[] {
  const types: (keyof typeof SONG_TYPES)[] = ['working']; // Basic always available

  if (unlockedNodes['healing-songs']) types.push('healing');
  if (unlockedNodes['warding-songs']) types.push('warding');
  if (unlockedNodes['growing-songs']) types.push('growing');
  if (unlockedNodes['breaking-songs']) types.push('breaking');
  if (unlockedNodes['calling-songs']) types.push('calling');
  if (unlockedNodes['lament-songs']) types.push('lament');
  if (unlockedNodes['death-songs']) types.push('death');
  if (unlockedNodes['basic-harmony']) {
    types.push('celebration', 'lullaby', 'marching');
  }
  if (unlockedNodes['basic-discord']) {
    types.push('binding'); // Binding uses controlled discord
  }

  return types;
}

/**
 * Calculate harmony bonus percentage.
 */
export function getHarmonyBonus(unlockedNodes: Record<string, number>): number {
  let bonus = 0;

  if (unlockedNodes['pitch-control']) {
    bonus += 10 + (unlockedNodes['pitch-control'] - 1) * 5;
  }
  if (unlockedNodes['basic-harmony']) {
    bonus += 15 + (unlockedNodes['basic-harmony'] - 1) * 5;
  }

  return bonus;
}

/**
 * Calculate maximum choir size.
 */
export function getMaxChoirSize(unlockedNodes: Record<string, number>): number {
  if (!unlockedNodes['duet-singing']) return 1; // Solo only

  let size = 2; // Duet

  if (unlockedNodes['choir-magic']) {
    size += 5 + (unlockedNodes['choir-magic'] - 1) * 3;
  }

  if (unlockedNodes['conductor']) {
    size += 10;
  }

  return size;
}

/**
 * Get instrument proficiency for a type.
 */
export function getInstrumentProficiency(
  instrumentType: keyof typeof INSTRUMENT_TYPES,
  unlockedNodes: Record<string, number>
): number {
  let proficiency = 0;

  if (unlockedNodes['instrument-attunement']) {
    proficiency += 10 + (unlockedNodes['instrument-attunement'] - 1) * 5;
  }

  switch (instrumentType) {
    case 'string':
      if (unlockedNodes['string-mastery']) proficiency += 15;
      break;
    case 'wind':
      if (unlockedNodes['wind-mastery']) proficiency += 15;
      break;
    case 'percussion':
      if (unlockedNodes['percussion-mastery']) proficiency += 15;
      break;
    case 'voice':
      if (unlockedNodes['voice-awakening']) {
        proficiency += 10 + (unlockedNodes['voice-awakening'] - 1) * 5;
      }
      break;
  }

  return proficiency;
}

/**
 * Check if power words are available.
 */
export function hasPowerWords(unlockedNodes: Record<string, number>): boolean {
  return !!unlockedNodes['power-words'];
}
