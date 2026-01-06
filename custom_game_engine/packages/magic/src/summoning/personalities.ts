/**
 * Summonable Entities - Personality Archetypes
 *
 * Pre-configured personality templates with dry wit.
 */

import type { EntityPersonality } from './types.js';

/** Pre-configured personality archetypes with dry wit */
export const PERSONALITY_ARCHETYPES: Record<string, { personality: EntityPersonality; flavorText: string }> = {
  // === CONTEMPTUOUS PERSONALITIES ===
  'contemptuous_pedant': {
    personality: {
      mortalAttitude: 'contemptuous',
      honesty: 'literalist',
      patience: 'impatient',
      humor: 'cruel',
      motivation: 'entertainment',
      voice: 'verbose',
    },
    flavorText: 'Thinks you\'re an idiot. Will explain why in detail. Charges extra for not calling you an idiot to your face.',
  },
  'contemptuous_tyrant': {
    personality: {
      mortalAttitude: 'contemptuous',
      honesty: 'deceptive',
      patience: 'volatile',
      humor: 'cruel',
      motivation: 'power',
      voice: 'formal',
    },
    flavorText: 'Rules with an iron fist. Metaphorically. Also literally. Has several iron fists. Collects them.',
  },
  'contemptuous_aristocrat': {
    personality: {
      mortalAttitude: 'contemptuous',
      honesty: 'misleading',
      patience: 'patient',
      humor: 'dry',
      motivation: 'order',
      voice: 'archaic',
    },
    flavorText: 'Old money, older grudges, oldest disdain. Your ancestors disappointed their ancestors. It\'s hereditary.',
  },
  'contemptuous_cynic': {
    personality: {
      mortalAttitude: 'contemptuous',
      honesty: 'truthful',
      patience: 'eternal',
      humor: 'dry',
      motivation: 'entertainment',
      voice: 'laconic',
    },
    flavorText: 'Seen it all. Hated most of it. Your antics are mildly amusing. Mildly.',
  },

  // === CURIOUS PERSONALITIES ===
  'curious_collector': {
    personality: {
      mortalAttitude: 'curious',
      honesty: 'truthful',
      patience: 'eternal',
      humor: 'dark',
      motivation: 'knowledge',
      voice: 'poetic',
    },
    flavorText: 'Collects experiences like butterflies. You might be one. Try not to get pinned to a board.',
  },
  'curious_child': {
    personality: {
      mortalAttitude: 'curious',
      honesty: 'truthful',
      patience: 'impatient',
      humor: 'whimsical',
      motivation: 'entertainment',
      voice: 'casual',
    },
    flavorText: 'Asks "why" constantly. Genuinely wants to know. Doesn\'t understand why mortals find this exhausting.',
  },
  'curious_scientist': {
    personality: {
      mortalAttitude: 'curious',
      honesty: 'misleading',
      patience: 'patient',
      humor: 'inappropriate',
      motivation: 'knowledge',
      voice: 'verbose',
    },
    flavorText: 'Wants to see what happens when... Best not to ask when what. The screaming usually answers that.',
  },
  'curious_philosopher': {
    personality: {
      mortalAttitude: 'curious',
      honesty: 'truthful',
      patience: 'eternal',
      humor: 'dry',
      motivation: 'knowledge',
      voice: 'cryptic',
    },
    flavorText: 'Treats mortality as a thought experiment. You\'re the experiment. The thought part is optional.',
  },

  // === PREDATORY PERSONALITIES ===
  'predatory_hunter': {
    personality: {
      mortalAttitude: 'predatory',
      honesty: 'deceptive',
      patience: 'patient',
      humor: 'cruel',
      motivation: 'power',
      voice: 'laconic',
    },
    flavorText: 'Stalks contracts like prey. Silent, patient, inevitable. Definitely licking their lips. Metaphorically. Mostly.',
  },
  'predatory_tempter': {
    personality: {
      mortalAttitude: 'predatory',
      honesty: 'misleading',
      patience: 'eternal',
      humor: 'whimsical',
      motivation: 'chaos',
      voice: 'poetic',
    },
    flavorText: 'Offers exactly what you want. Somehow this makes it worse. The devil\'s in the details. Specifically, this devil.',
  },
  'predatory_parasite': {
    personality: {
      mortalAttitude: 'predatory',
      honesty: 'compulsive_liar',
      patience: 'impatient',
      humor: 'inappropriate',
      motivation: 'freedom',
      voice: 'casual',
    },
    flavorText: 'Latches on. Won\'t let go. Lies about everything, including whether they\'re lying. Especially that.',
  },
  'predatory_dealer': {
    personality: {
      mortalAttitude: 'predatory',
      honesty: 'literalist',
      patience: 'eternal',
      humor: 'dry',
      motivation: 'power',
      voice: 'formal',
    },
    flavorText: 'Fair contracts, ruinous interpretations. Technically correct is the best kind of evil.',
  },

  // === PROTECTIVE PERSONALITIES ===
  'protective_guardian': {
    personality: {
      mortalAttitude: 'protective',
      honesty: 'truthful',
      patience: 'patient',
      humor: 'none',
      motivation: 'duty',
      voice: 'formal',
    },
    flavorText: 'Takes their job seriously. Which would be comforting if the job description didn\'t include "acceptable casualties."',
  },
  'protective_shepherd': {
    personality: {
      mortalAttitude: 'protective',
      honesty: 'truthful',
      patience: 'eternal',
      humor: 'whimsical',
      motivation: 'order',
      voice: 'poetic',
    },
    flavorText: 'Guides lost mortals with infinite kindness. The fact that some sheep get eaten is just nature.',
  },
  'protective_warden': {
    personality: {
      mortalAttitude: 'protective',
      honesty: 'literalist',
      patience: 'impatient',
      humor: 'dry',
      motivation: 'duty',
      voice: 'laconic',
    },
    flavorText: 'Protects you from harm. Including harmful decisions. Especially those. They judge silently. Very silently.',
  },
  'protective_martyr': {
    personality: {
      mortalAttitude: 'protective',
      honesty: 'truthful',
      patience: 'volatile',
      humor: 'dark',
      motivation: 'duty',
      voice: 'formal',
    },
    flavorText: 'Will die for you. Wants you to know this. Will mention it. Repeatedly. Have you thanked them recently?',
  },

  // === INDIFFERENT PERSONALITIES ===
  'indifferent_bureaucrat': {
    personality: {
      mortalAttitude: 'indifferent',
      honesty: 'truthful',
      patience: 'eternal',
      humor: 'dry',
      motivation: 'order',
      voice: 'formal',
    },
    flavorText: 'Processes your request with cosmic efficiency. You are case number 4,782,336,112. Please take a number.',
  },
  'indifferent_force': {
    personality: {
      mortalAttitude: 'indifferent',
      honesty: 'truthful',
      patience: 'eternal',
      humor: 'none',
      motivation: 'order',
      voice: 'cryptic',
    },
    flavorText: 'Natural as gravity, personal as erosion. Your concerns are noted. Then ignored. Then forgotten.',
  },
  'indifferent_professional': {
    personality: {
      mortalAttitude: 'indifferent',
      honesty: 'truthful',
      patience: 'patient',
      humor: 'dry',
      motivation: 'duty',
      voice: 'laconic',
    },
    flavorText: 'Does the job. Nothing more. Nothing less. Your small talk makes them tired. Everything makes them tired.',
  },
  'indifferent_recorder': {
    personality: {
      mortalAttitude: 'indifferent',
      honesty: 'truthful',
      patience: 'eternal',
      humor: 'dry',
      motivation: 'knowledge',
      voice: 'laconic',
    },
    flavorText: 'Records everything. Judges nothing. This is somehow more unsettling than judgment would be.',
  },

  // === ENVIOUS PERSONALITIES ===
  'envious_climber': {
    personality: {
      mortalAttitude: 'envious',
      honesty: 'misleading',
      patience: 'impatient',
      humor: 'cruel',
      motivation: 'power',
      voice: 'verbose',
    },
    flavorText: 'Wants what you have. Will take it. Will complain it\'s not enough. Repeat indefinitely.',
  },
  'envious_mirror': {
    personality: {
      mortalAttitude: 'envious',
      honesty: 'compulsive_liar',
      patience: 'volatile',
      humor: 'inappropriate',
      motivation: 'freedom',
      voice: 'casual',
    },
    flavorText: 'Reflects your best qualities back at you. While stealing them. The reflection is all you\'ll have left.',
  },
  'envious_thief': {
    personality: {
      mortalAttitude: 'envious',
      honesty: 'deceptive',
      patience: 'patient',
      humor: 'dark',
      motivation: 'revenge',
      voice: 'cryptic',
    },
    flavorText: 'Steals intangibles. Joy, creativity, that feeling you get when you remember something clever. Collects them.',
  },
  'envious_student': {
    personality: {
      mortalAttitude: 'envious',
      honesty: 'truthful',
      patience: 'impatient',
      humor: 'none',
      motivation: 'knowledge',
      voice: 'formal',
    },
    flavorText: 'Studies you. Wants to be you. Will settle for owning your soul. Academic purposes only. Probably.',
  },

  // === COMPLEX/MIXED PERSONALITIES ===
  'chaotic_anarchist': {
    personality: {
      mortalAttitude: 'predatory',
      honesty: 'compulsive_liar',
      patience: 'volatile',
      humor: 'whimsical',
      motivation: 'chaos',
      voice: 'casual',
    },
    flavorText: 'Burns systems for fun. Sometimes your nervous system. The chaos is the point. Don\'t look for logic. They burned that too.',
  },
  'lawful_judge': {
    personality: {
      mortalAttitude: 'indifferent',
      honesty: 'literalist',
      patience: 'eternal',
      humor: 'none',
      motivation: 'order',
      voice: 'archaic',
    },
    flavorText: 'Law incarnate. Doesn\'t make the rules. Enforces them. All of them. Including the ones you didn\'t know existed.',
  },
  'tragic_avenger': {
    personality: {
      mortalAttitude: 'protective',
      honesty: 'truthful',
      patience: 'volatile',
      humor: 'dark',
      motivation: 'revenge',
      voice: 'poetic',
    },
    flavorText: 'Once fell. Still falling. Takes others down to break the fall. It\'s poetic. Also tragic. Mostly tragic.',
  },
  'bitter_exile': {
    personality: {
      mortalAttitude: 'envious',
      honesty: 'truthful',
      patience: 'patient',
      humor: 'dark',
      motivation: 'freedom',
      voice: 'archaic',
    },
    flavorText: 'Remembers paradise. Your world isn\'t it. Will mention this. At length. Forever.',
  },
  'gleeful_saboteur': {
    personality: {
      mortalAttitude: 'contemptuous',
      honesty: 'misleading',
      patience: 'impatient',
      humor: 'whimsical',
      motivation: 'chaos',
      voice: 'casual',
    },
    flavorText: 'Breaks things. Important things. Laughs about it. The laughter is worse than the breaking.',
  },
  'reluctant_servant': {
    personality: {
      mortalAttitude: 'protective',
      honesty: 'truthful',
      patience: 'patient',
      humor: 'none',
      motivation: 'duty',
      voice: 'laconic',
    },
    flavorText: 'Serves. Doesn\'t want to. Does it anyway. The heavy sighing is complimentary.',
  },
  'obsessive_perfectionist': {
    personality: {
      mortalAttitude: 'curious',
      honesty: 'literalist',
      patience: 'eternal',
      humor: 'inappropriate',
      motivation: 'order',
      voice: 'verbose',
    },
    flavorText: 'Everything must be perfect. Nothing is perfect. This distresses them. Now it distresses you too. Welcome.',
  },
  'weary_immortal': {
    personality: {
      mortalAttitude: 'indifferent',
      honesty: 'truthful',
      patience: 'eternal',
      humor: 'dry',
      motivation: 'entertainment',
      voice: 'laconic',
    },
    flavorText: 'Seen empires rise. Seen empires fall. Seen your type before. Wasn\'t impressed then either.',
  },
  'sardonic_observer': {
    personality: {
      mortalAttitude: 'curious',
      honesty: 'truthful',
      patience: 'patient',
      humor: 'dry',
      motivation: 'entertainment',
      voice: 'casual',
    },
    flavorText: 'Watches mortals like reality television. You\'re the drama. They have popcorn. Cosmic popcorn.',
  },
  'compassionate_realist': {
    personality: {
      mortalAttitude: 'protective',
      honesty: 'truthful',
      patience: 'patient',
      humor: 'dark',
      motivation: 'duty',
      voice: 'poetic',
    },
    flavorText: 'Cares deeply. Helps sincerely. Knows it won\'t be enough. Does it anyway. Cosmic optimism meets cosmic pessimism.',
  },
};
