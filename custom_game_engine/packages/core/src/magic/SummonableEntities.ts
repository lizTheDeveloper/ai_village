/**
 * Summonable Entities - Component Library for LLM Generation
 *
 * This file provides extensive libraries of personality archetypes, negotiation
 * patterns, demands, services, and other components that an LLM can mix and match
 * to generate unique summonable entities on the fly.
 *
 * Philosophy: Gods create these beings. Mages summon them. Both discover they're
 * dealing with entities who have opinions about the arrangement. Most of those
 * opinions are unflattering.
 */

// ============================================================================
// SUMMONABLE ENTITY TYPES
// ============================================================================

/** A summonable entity with personality and demands */
export interface SummonableEntity {
  id: string;
  name: string;
  title?: string;
  category: EntityCategory;
  rank: EntityRank;

  /** Rich description using blended writing styles */
  description: string;

  /** Personality profile */
  personality: EntityPersonality;

  /** What they want in exchange for service */
  demands: EntityDemand[];

  /** How they negotiate */
  negotiationStyle: NegotiationStyle;

  /** What services they offer */
  services: EntityService[];

  /** Contract terms they're willing to accept */
  contractTypes: ContractType[];

  /** Appearance details */
  appearance: EntityAppearance;

  /** Behavioral quirks */
  quirks: string[];

  /** What happens if you break the contract */
  breachConsequences: BreachConsequence[];

  /** Summoning requirements */
  summoningRequirements: SummoningRequirement[];

  /** Power level (affects what they can do) */
  powerLevel: number;
}

/** Categories of summonable entities */
export type EntityCategory =
  | 'demon'           // Beings from lower realms - dramatic, petty, surprisingly organized
  | 'devil'           // Lawful evil entities - cosmic lawyers with infinite patience
  | 'angel'           // Divine servants - helpful, conflicted, tired
  | 'spirit'          // Elemental/nature spirits - concepts given form, questionable judgment
  | 'fey'             // Capricious otherworldly beings - beautiful, incomprehensible, dangerous
  | 'djinn'           // Wish-granting entities - literal, powerful, resentful of mortals
  | 'psychopomp'      // Death-related entities - neutral, inevitable, surprisingly chatty
  | 'outsider'        // Things from beyond reality - geometry shouldn't do that
  | 'servitor';       // Created servants - exactly as competent as their creator

/** Power rankings */
export type EntityRank =
  | 'lesser'          // Weak, easy to summon, probably won't kill you
  | 'common'          // Standard power, requires some preparation
  | 'greater'         // Powerful, dangerous, knows it
  | 'noble'           // Elite tier, summoning one is a terrible idea
  | 'prince'          // Legendary, summoning one is a worse idea
  | 'archetype';      // Unique, one of a kind, don't even think about it

// ============================================================================
// PERSONALITY COMPONENT LIBRARY
// ============================================================================
// Mix and match these to create infinite personality variations

/** Entity personality profile */
export interface EntityPersonality {
  /** How they view mortals */
  mortalAttitude: 'contemptuous' | 'curious' | 'predatory' | 'protective' | 'indifferent' | 'envious';

  /** Are they honest? (The answer is usually "technically") */
  honesty: 'truthful' | 'misleading' | 'deceptive' | 'literalist' | 'compulsive_liar';

  /** How patient are they? */
  patience: 'eternal' | 'patient' | 'impatient' | 'volatile';

  /** Sense of humor (whether you want it or not) */
  humor: 'cruel' | 'dark' | 'whimsical' | 'dry' | 'none' | 'inappropriate';

  /** What motivates them */
  motivation: 'power' | 'knowledge' | 'chaos' | 'order' | 'entertainment' | 'freedom' | 'revenge' | 'duty';

  /** Speaking style */
  voice: 'formal' | 'casual' | 'archaic' | 'cryptic' | 'verbose' | 'laconic' | 'poetic';
}

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

// ============================================================================
// DEMANDS & NEGOTIATION
// ============================================================================

/** What an entity demands in exchange for service */
export interface EntityDemand {
  type: DemandType;
  description: string;
  severity: 'trivial' | 'minor' | 'significant' | 'major' | 'extreme';
  negotiable: boolean;
  alternatives?: string[];
}

export type DemandType =
  | 'payment_blood'      // Blood sacrifice - classic, efficient, messy
  | 'payment_souls'      // Souls of mortals - valuable, transferable, damning
  | 'payment_memory'     // Your memories - they keep them, you don't
  | 'payment_sensation'  // Ability to feel something - usually something pleasant
  | 'payment_time'       // Years of your life - non-refundable
  | 'payment_name'       // Your true name - more power than you think
  | 'payment_treasure'   // Material wealth - boring but effective
  | 'payment_service'    // Future service owed - blank check, basically
  | 'payment_knowledge'  // Secrets and lore - yours or someone else's
  | 'payment_loyalty'    // Exclusive contract - relationship status: complicated
  | 'offering_ritual'    // Specific ritual requirements - no shortcuts
  | 'offering_location'  // Must be at specific place - location, location, location
  | 'offering_timing'    // Must be specific time - scheduling is hell
  | 'concession_moral'   // Commit immoral acts - slippery slope, greased
  | 'concession_freedom' // Give up some autonomy - their suggestions become compulsions
  | 'concession_identity'; // Change who you are - side effects may vary

/** How entity approaches negotiation */
export interface NegotiationStyle {
  approach: 'aggressive' | 'reasonable' | 'generous' | 'exploitative' | 'playful' | 'sadistic';

  /** Will they make the first offer? */
  opensNegotiation: boolean;

  /** Likely starting position vs final position */
  anchoring: 'extreme' | 'moderate' | 'fair';

  /** Do they respect clever negotiators? */
  respectsClever: boolean;

  /** Red lines they won't cross */
  absoluteRequirements: string[];

  /** Things they secretly want but won't ask for */
  hiddenDesires: string[];
}

/** Pre-configured negotiation patterns */
export const NEGOTIATION_PATTERNS: Record<string, {
  style: Omit<NegotiationStyle, 'absoluteRequirements' | 'hiddenDesires'>;
  flavorText: string;
}> = {
  'aggressive_exploiter': {
    style: {
      approach: 'aggressive',
      opensNegotiation: false,
      anchoring: 'extreme',
      respectsClever: false,
    },
    flavorText: 'Takes. Doesn\'t give. Negotiation is a formality they barely tolerate.',
  },
  'aggressive_respectful': {
    style: {
      approach: 'aggressive',
      opensNegotiation: true,
      anchoring: 'moderate',
      respectsClever: true,
    },
    flavorText: 'Pushes hard but fair. Respects pushback. Might actually smile if you land a good point.',
  },
  'reasonable_fair': {
    style: {
      approach: 'reasonable',
      opensNegotiation: true,
      anchoring: 'fair',
      respectsClever: true,
    },
    flavorText: 'Actually negotiates in good faith. Suspicious, honestly. What\'s the catch?',
  },
  'reasonable_cautious': {
    style: {
      approach: 'reasonable',
      opensNegotiation: false,
      anchoring: 'fair',
      respectsClever: true,
    },
    flavorText: 'Fair but wary. Burned before. Won\'t be burned again. Probably.',
  },
  'generous_naive': {
    style: {
      approach: 'generous',
      opensNegotiation: true,
      anchoring: 'fair',
      respectsClever: false,
    },
    flavorText: 'Too kind for their own good. Or yours. The universe balances eventually.',
  },
  'generous_wise': {
    style: {
      approach: 'generous',
      opensNegotiation: true,
      anchoring: 'fair',
      respectsClever: true,
    },
    flavorText: 'Kind because they can afford to be. Power makes generosity easy. Also terrifying.',
  },
  'exploitative_patient': {
    style: {
      approach: 'exploitative',
      opensNegotiation: false,
      anchoring: 'extreme',
      respectsClever: true,
    },
    flavorText: 'Takes everything. Appreciates the struggle. The appreciation doesn\'t help you.',
  },
  'playful_trickster': {
    style: {
      approach: 'playful',
      opensNegotiation: true,
      anchoring: 'moderate',
      respectsClever: true,
    },
    flavorText: 'Negotiation as game. Fun for them. Less fun for you. Winning means surviving.',
  },
  'sadistic_methodical': {
    style: {
      approach: 'sadistic',
      opensNegotiation: false,
      anchoring: 'extreme',
      respectsClever: true,
    },
    flavorText: 'Hurts you carefully. Precisely. Respects good tactics. Still hurts you.',
  },
};

// ============================================================================
// DEMAND PATTERN LIBRARY
// ============================================================================

export interface DemandPattern {
  name: string;
  description: string;
  demands: Array<{
    type: DemandType;
    severity: EntityDemand['severity'];
    negotiable: boolean;
    descriptionTemplate: string;
  }>;
  thematicFit: EntityCategory[];
  flavorText: string;
}

export const DEMAND_PATTERNS: DemandPattern[] = [
  {
    name: 'The Blood Price',
    description: 'Classic demon bargain - blood and suffering',
    demands: [
      {
        type: 'payment_blood',
        severity: 'significant',
        negotiable: true,
        descriptionTemplate: 'A vial of your blood. Fresh. They\'ll wait while you find something sharp.',
      },
      {
        type: 'offering_ritual',
        severity: 'minor',
        negotiable: false,
        descriptionTemplate: 'Draw the circle in blood. Preferably yours. Definitely fresh. No shortcuts.',
      },
    ],
    thematicFit: ['demon', 'devil'],
    flavorText: 'Traditional. Messy. Effective. Bring bandages.',
  },
  {
    name: 'Soul Bargain',
    description: 'Your soul after death - the devil\'s retirement plan',
    demands: [
      {
        type: 'payment_souls',
        severity: 'extreme',
        negotiable: false,
        descriptionTemplate: 'Your soul. Delivery upon natural death. No refunds. No extensions.',
      },
      {
        type: 'payment_service',
        severity: 'major',
        negotiable: true,
        descriptionTemplate: 'One favor. Their choice. Their timing. You\'ll hate it.',
      },
    ],
    thematicFit: ['devil', 'demon'],
    flavorText: 'The classic. They get your eternal essence. You get decades of regret.',
  },
  {
    name: 'The Curiosity Tax',
    description: 'Knowledge and secrets - currency of the curious',
    demands: [
      {
        type: 'payment_knowledge',
        severity: 'minor',
        negotiable: true,
        descriptionTemplate: 'Three secrets. Juicy ones. They\'ll know if you\'re holding back.',
      },
      {
        type: 'payment_memory',
        severity: 'significant',
        negotiable: true,
        descriptionTemplate: 'One memory you treasure. They keep it. You don\'t.',
      },
    ],
    thematicFit: ['spirit', 'outsider', 'fey'],
    flavorText: 'Information wants to be free. You want your memories. Conflict ensues.',
  },
  {
    name: 'Righteous Service',
    description: 'Moral commitments - the price of divine assistance',
    demands: [
      {
        type: 'concession_moral',
        severity: 'minor',
        negotiable: false,
        descriptionTemplate: 'Promise to be good. Actually good. They\'ll check.',
      },
      {
        type: 'payment_service',
        severity: 'significant',
        negotiable: true,
        descriptionTemplate: 'One righteous deed. Definition negotiable. Standards non-negotiable.',
      },
    ],
    thematicFit: ['angel', 'psychopomp'],
    flavorText: 'Angels have requirements. Moral ones. Inconvenient ones. Non-negotiable ones.',
  },
  {
    name: 'The Sensory Collector',
    description: 'Experiences and sensations - they collect feelings like stamps',
    demands: [
      {
        type: 'payment_sensation',
        severity: 'significant',
        negotiable: true,
        descriptionTemplate: 'The ability to taste sweetness. Or see red. Or feel joy. Pick wisely.',
      },
      {
        type: 'payment_memory',
        severity: 'minor',
        negotiable: true,
        descriptionTemplate: 'Your happiest memory. For their collection. You can keep the sad ones.',
      },
    ],
    thematicFit: ['demon', 'spirit', 'fey'],
    flavorText: 'Collects experiences. Your experiences. Future you will miss them.',
  },
  {
    name: 'Identity Erosion',
    description: 'Slowly changes who you are - the ship of Theseus, but you\'re the ship',
    demands: [
      {
        type: 'concession_identity',
        severity: 'major',
        negotiable: true,
        descriptionTemplate: 'Small changes. Preferences. Habits. Beliefs. You\'ll barely notice. Until you do.',
      },
      {
        type: 'payment_name',
        severity: 'extreme',
        negotiable: false,
        descriptionTemplate: 'Your true name. More power than you think. More consequences than you imagine.',
      },
    ],
    thematicFit: ['demon', 'fey', 'outsider'],
    flavorText: 'You\'ll still be you. Technically. Philosophically debatable.',
  },
  {
    name: 'Temporal Thief',
    description: 'Time theft - they get years, you get service',
    demands: [
      {
        type: 'payment_time',
        severity: 'major',
        negotiable: true,
        descriptionTemplate: 'Ten years off your lifespan. You won\'t miss them. Until you do.',
      },
      {
        type: 'offering_timing',
        severity: 'minor',
        negotiable: false,
        descriptionTemplate: 'Summon them at midnight. Exact midnight. Atomic clock recommended.',
      },
    ],
    thematicFit: ['psychopomp', 'demon', 'djinn'],
    flavorText: 'Time is money. They want time. You want service. Math is unfavorable.',
  },
  {
    name: 'The Simple Exchange',
    description: 'Just wants treasure - refreshingly straightforward',
    demands: [
      {
        type: 'payment_treasure',
        severity: 'significant',
        negotiable: true,
        descriptionTemplate: 'Gold. Gems. Art. Something valuable. Something you\'ll miss.',
      },
    ],
    thematicFit: ['djinn', 'servitor', 'spirit'],
    flavorText: 'No tricks. No twists. Just capitalism. Somehow this is suspicious.',
  },
  {
    name: 'Exclusive Contract',
    description: 'Demands loyalty - relationship status: it\'s complicated',
    demands: [
      {
        type: 'payment_loyalty',
        severity: 'major',
        negotiable: false,
        descriptionTemplate: 'Exclusive service. No other entities. They\'re very jealous.',
      },
      {
        type: 'concession_freedom',
        severity: 'significant',
        negotiable: true,
        descriptionTemplate: 'They suggest. You comply. Not control. Just... strong recommendations.',
      },
    ],
    thematicFit: ['devil', 'angel', 'djinn'],
    flavorText: 'Monogamy but for summoning. They take it seriously. Very seriously.',
  },
  {
    name: 'Location Bond',
    description: 'Tied to places - real estate matters in every realm',
    demands: [
      {
        type: 'offering_location',
        severity: 'minor',
        negotiable: true,
        descriptionTemplate: 'Summon them somewhere specific. Meaningful. Inconvenient.',
      },
      {
        type: 'payment_service',
        severity: 'minor',
        negotiable: true,
        descriptionTemplate: 'Maintain their shrine. Clean it. Tend it. Forever.',
      },
    ],
    thematicFit: ['spirit', 'fey', 'psychopomp'],
    flavorText: 'Location, location, location. They have requirements. Geographic requirements.',
  },
];

// ============================================================================
// SERVICE TEMPLATES
// ============================================================================

/** What services an entity can provide */
export interface EntityService {
  id: string;
  name: string;
  description: string;
  category: 'combat' | 'knowledge' | 'crafting' | 'transportation' | 'transformation' | 'protection' | 'curse' | 'blessing';
  powerCost: number;
  timeRequired: string;
  limitations: string[];
  sideEffects?: string[];
}

export interface ServiceTemplate {
  category: EntityService['category'];
  templates: Array<{
    nameTemplate: string;
    descriptionTemplate: string;
    powerCostRange: [number, number];
    timeRequired: string;
    limitations: string[];
    sideEffects?: string[];
    flavorText: string;
  }>;
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    category: 'combat',
    templates: [
      {
        nameTemplate: 'Martial Prowess',
        descriptionTemplate: 'Fights with supernatural skill. Efficient. Brutal. Doesn\'t monologue.',
        powerCostRange: [30, 50],
        timeRequired: 'Duration of combat',
        limitations: ['Won\'t fight the innocent', 'Defines innocent loosely'],
        flavorText: 'Violence as art form. You\'re the gallery.',
      },
      {
        nameTemplate: 'Offensive Curse',
        descriptionTemplate: 'Curses enemies. Creative curses. Memorable curses. Reversible curses. Technically.',
        powerCostRange: [25, 45],
        timeRequired: 'Instant cast, permanent regret',
        limitations: ['Target must deserve it', 'They decide deserve'],
        sideEffects: ['Cursed targets tend to seek revenge'],
        flavorText: 'Curses are like art. Subjective. Permanent. Expensive to remove.',
      },
      {
        nameTemplate: 'Area Devastation',
        descriptionTemplate: 'Destroys everything in a wide area. Everything. Indiscriminately.',
        powerCostRange: [50, 80],
        timeRequired: 'Minutes of channeling, years of cleanup',
        limitations: ['Affects allies', 'Affects environment', 'Affects property values'],
        sideEffects: ['Collateral damage', 'Lots of it'],
        flavorText: 'Precision is overrated. Devastation is thorough.',
      },
    ],
  },
  {
    category: 'knowledge',
    templates: [
      {
        nameTemplate: 'Truth Sight',
        descriptionTemplate: 'Reveals lies, secrets, hidden things. Also reveals things you\'d rather not know.',
        powerCostRange: [20, 35],
        timeRequired: 'Instant',
        limitations: ['Shows truth, not interpretation', 'Truth often disappointing'],
        flavorText: 'Ignorance is bliss. This service ends bliss.',
      },
      {
        nameTemplate: 'Forbidden Lore',
        descriptionTemplate: 'Access to knowledge mortals shouldn\'t have. And now you know why.',
        powerCostRange: [25, 40],
        timeRequired: 'Days of research',
        limitations: ['Information may be incomplete', 'May cause existential dread'],
        sideEffects: ['Knowing things has consequences', 'Heavy consequences'],
        flavorText: 'Some knowledge is forbidden for good reasons. You\'ll find out which.',
      },
      {
        nameTemplate: 'Divination',
        descriptionTemplate: 'Glimpse futures. Possible futures. Probable futures. Futures you can\'t prevent.',
        powerCostRange: [35, 55],
        timeRequired: 'Hours',
        limitations: ['Probability not certainty', 'Observation affects outcome'],
        sideEffects: ['The future is burden', 'Heavy burden'],
        flavorText: 'See what\'s coming. Can\'t stop it. Welcome to prophecy.',
      },
    ],
  },
  {
    category: 'crafting',
    templates: [
      {
        nameTemplate: 'Supernatural Forging',
        descriptionTemplate: 'Creates impossible objects. Powerful objects. Temperamental objects.',
        powerCostRange: [40, 70],
        timeRequired: 'Days to weeks',
        limitations: ['Requires rare materials', 'Requires patience'],
        sideEffects: ['Creations may have opinions', 'Strong opinions'],
        flavorText: 'Makes wonders. Wonders with side effects. Wonders with attitudes.',
      },
      {
        nameTemplate: 'Instant Construction',
        descriptionTemplate: 'Builds structures impossibly fast. Also impossibly strange.',
        powerCostRange: [35, 60],
        timeRequired: 'Hours',
        limitations: ['Still needs materials', 'Physics optional'],
        flavorText: 'Fast construction. Quality guaranteed. Euclidean geometry not guaranteed.',
      },
    ],
  },
  {
    category: 'transportation',
    templates: [
      {
        nameTemplate: 'Dimensional Door',
        descriptionTemplate: 'Opens portals. Convenient. Dangerous. Occasionally opens to wrong place.',
        powerCostRange: [30, 50],
        timeRequired: 'Instant',
        limitations: ['Must know destination', 'Must survive journey'],
        sideEffects: ['Something follows you', 'Sometimes many somethings'],
        flavorText: 'Fast travel. Unsafe travel. Travel nonetheless.',
      },
      {
        nameTemplate: 'Flight',
        descriptionTemplate: 'Grants flight. True flight. Terrifying flight.',
        powerCostRange: [15, 30],
        timeRequired: 'Duration negotiable',
        limitations: ['Speed limited', 'Fear of heights not eliminated'],
        flavorText: 'Fly like eagle. Fall like stone. Choose wisely.',
      },
    ],
  },
  {
    category: 'transformation',
    templates: [
      {
        nameTemplate: 'Shapechange',
        descriptionTemplate: 'Become something else. Think like something else. Return uncertain.',
        powerCostRange: [35, 60],
        timeRequired: 'Instant',
        limitations: ['Duration limited', 'Memory of being you optional'],
        sideEffects: ['Getting stuck', 'Liking it'],
        flavorText: 'Be anything. Anything might be permanent.',
      },
      {
        nameTemplate: 'Accelerated Growth',
        descriptionTemplate: 'Makes living things grow rapidly. Heal rapidly. Regret rapidly.',
        powerCostRange: [25, 45],
        timeRequired: 'Hours',
        limitations: ['Only living things', 'Living things remember'],
        sideEffects: ['Psychological scars', 'Literal scars'],
        flavorText: 'Growth accelerated. Maturity negotiable. Side effects guaranteed.',
      },
    ],
  },
  {
    category: 'protection',
    templates: [
      {
        nameTemplate: 'Warding',
        descriptionTemplate: 'Creates barriers. Strong barriers. Expensive barriers.',
        powerCostRange: [30, 50],
        timeRequired: 'Instant cast, hours duration',
        limitations: ['Can be overwhelmed', 'Will be overwhelmed eventually'],
        flavorText: 'Protection guaranteed. Duration negotiable. Survival probable.',
      },
      {
        nameTemplate: 'Bodyguard Service',
        descriptionTemplate: 'Protects you. Judges you. Protects you anyway.',
        powerCostRange: [35, 55],
        timeRequired: 'Continuous',
        limitations: ['Can\'t be everywhere', 'Judges worthiness constantly'],
        flavorText: 'Protected from harm. Not from judgment. Especially not from judgment.',
      },
    ],
  },
  {
    category: 'curse',
    templates: [
      {
        nameTemplate: 'Misfortune',
        descriptionTemplate: 'Inflicts bad luck. Persistent bad luck. Karma-grade bad luck.',
        powerCostRange: [25, 45],
        timeRequired: 'Instant',
        limitations: ['Probability-based', 'Can be cleansed'],
        sideEffects: ['Karma is circular', 'What goes around...'],
        flavorText: 'Curse them. Universe balances eventually. Eventually includes you.',
      },
      {
        nameTemplate: 'Psychological Torment',
        descriptionTemplate: 'Haunts them. Nightmares. Fears. Regrets. The greatest hits.',
        powerCostRange: [30, 50],
        timeRequired: 'Days to weeks',
        limitations: ['Strong willed resist', 'Weak willed break'],
        flavorText: 'Breaks minds. Carefully. Artfully. Thoroughly.',
      },
    ],
  },
  {
    category: 'blessing',
    templates: [
      {
        nameTemplate: 'Good Fortune',
        descriptionTemplate: 'Grants luck. Supernatural luck. Luck that runs out.',
        powerCostRange: [25, 45],
        timeRequired: 'Days duration',
        limitations: ['Temporary', 'Universe balances eventually'],
        sideEffects: ['Dependency', 'Eventual karma'],
        flavorText: 'Lucky now. Unlucky later. Universe maintains balance.',
      },
      {
        nameTemplate: 'Divine Favor',
        descriptionTemplate: 'Channels divine power. For benefits. With strings attached.',
        powerCostRange: [35, 60],
        timeRequired: 'Varies',
        limitations: ['Must remain worthy', 'Deity has opinions'],
        flavorText: 'Divine power. Divine judgment. Package deal.',
      },
    ],
  },
];

// ============================================================================
// CONTRACT TEMPLATES
// ============================================================================

/** Types of contracts */
export interface ContractType {
  id: string;
  name: string;
  description: string;
  duration: 'instant' | 'short' | 'long' | 'permanent';
  bindingForce: 'verbal' | 'written' | 'blood' | 'soul' | 'cosmic';
  revocable: boolean;
  transferable: boolean;
  inheritableBy: 'none' | 'bloodline' | 'successor';
}

export const CONTRACT_TEMPLATES: Record<string, { contract: Omit<ContractType, 'id'>; flavorText: string }> = {
  'instant_service': {
    contract: {
      name: 'One-Time Service',
      description: 'Single task, immediate payment, no strings',
      duration: 'instant',
      bindingForce: 'verbal',
      revocable: false,
      transferable: false,
      inheritableBy: 'none',
    },
    flavorText: 'Quick. Simple. Over. Like pulling a tooth.',
  },
  'short_term_pact': {
    contract: {
      name: 'Temporary Arrangement',
      description: 'Days or weeks of service, minimal commitment',
      duration: 'short',
      bindingForce: 'written',
      revocable: true,
      transferable: false,
      inheritableBy: 'none',
    },
    flavorText: 'Commitment light. Consequences lighter. Usually.',
  },
  'long_term_contract': {
    contract: {
      name: 'Extended Bargain',
      description: 'Years of service, serious consequences',
      duration: 'long',
      bindingForce: 'blood',
      revocable: false,
      transferable: true,
      inheritableBy: 'successor',
    },
    flavorText: 'Long term commitment. Your term. Their choice.',
  },
  'permanent_bond': {
    contract: {
      name: 'Eternal Pact',
      description: 'Binding beyond death, affects bloodline',
      duration: 'permanent',
      bindingForce: 'cosmic',
      revocable: false,
      transferable: false,
      inheritableBy: 'bloodline',
    },
    flavorText: 'Forever is long time. Especially for descendants.',
  },
  'soul_contract': {
    contract: {
      name: 'Devil\'s Bargain',
      description: 'Soul as collateral, perfect enforcement',
      duration: 'permanent',
      bindingForce: 'soul',
      revocable: false,
      transferable: true,
      inheritableBy: 'bloodline',
    },
    flavorText: 'Soul standard. Terms negotiable. Damnation guaranteed.',
  },
  'employment_agreement': {
    contract: {
      name: 'Cosmic Employment',
      description: 'They work for you, professionally',
      duration: 'long',
      bindingForce: 'written',
      revocable: true,
      transferable: false,
      inheritableBy: 'none',
    },
    flavorText: 'Employee-employer relationship. With cosmic entities. HR is complicated.',
  },
};

// ============================================================================
// QUIRK LIBRARY
// ============================================================================

export const ENTITY_QUIRKS: Record<string, string[]> = {
  pedantic: [
    'Corrects your grammar mid-sentence',
    'Takes extensive notes on mistakes',
    'Quotes obscure precedents',
    'Sighs dramatically at errors',
    'Maintains mental tally of your failures',
  ],
  collector: [
    'Obsessively catalogs everything',
    'Touches specimens reverently',
    'Shows collection proudly',
    'Gets distracted by new additions',
    'Discusses collection at length',
  ],
  performative: [
    'Everything is theatrical',
    'Monologues frequently',
    'Poses for effect',
    'Imagines audience constantly',
    'Reviews own performance aloud',
  ],
  gardener: [
    'Speaks in plant metaphors',
    'Tends nearby plants unconsciously',
    'Collects seeds compulsively',
    'Hums about growth and decay',
    'Smells soil thoughtfully',
  ],
  bureaucratic: [
    'Quotes regulations constantly',
    'Takes copious notes',
    'Insists on proper forms',
    'Checks everything twice',
    'Files mental paperwork',
  ],
  sadistic_artist: [
    'Tilts head observantly',
    'Hums while working',
    'Takes notes on reactions',
    'Compliments good performances',
    'Critiques technique',
  ],
  reluctant: [
    'Apologizes frequently',
    'Hesitates before acting',
    'Keeps mental tallies',
    'Offers alternatives constantly',
    'Sighs heavily',
  ],
  recorder: [
    'Notes everything',
    'Quotes records casually',
    'Corrects errors immediately',
    'Shows no reaction',
    'Updates internal ledger',
  ],
  curious: [
    'Asks endless questions',
    'Distracted by novelty',
    'Touches everything',
    'Demands explanations',
    'Investigates constantly',
  ],
  ancient: [
    'References millennia casually',
    'Forgets mortal lifespan',
    'Surprised by recent events',
    'Measures time in ages',
    'Confuses centuries',
  ],
  fastidious: [
    'Adjusts appearance constantly',
    'Judges tidiness',
    'Cleans surroundings',
    'Notices disorder',
    'Corrects imperfections',
  ],
  hungry: [
    'Mentions appetite frequently',
    'Eyes targets',
    'Licks lips',
    'Describes tastes',
    'Never quite satisfied',
  ],
};

// ============================================================================
// BREACH CONSEQUENCE PATTERNS
// ============================================================================

/** What happens when you break the contract */
export interface BreachConsequence {
  severity: 'warning' | 'penalty' | 'severe' | 'catastrophic';
  type: 'immediate' | 'delayed' | 'cumulative';
  effect: string;
  reversible: boolean;
  collectiveOnHeirs: boolean;
}

export const BREACH_PATTERNS: Record<string, {
  pattern: Omit<BreachConsequence, 'effect'>;
  effectTemplates: string[];
  flavorText: string;
}> = {
  'immediate_punishment': {
    pattern: {
      severity: 'severe',
      type: 'immediate',
      reversible: true,
      collectiveOnHeirs: false,
    },
    effectTemplates: [
      'They visit personally. The visit is unpleasant.',
      'Instant curse. Reversible. Expensive to reverse.',
      'Public humiliation for specified duration.',
    ],
    flavorText: 'Break contract. Face consequences. Immediately.',
  },
  'delayed_vengeance': {
    pattern: {
      severity: 'catastrophic',
      type: 'delayed',
      reversible: false,
      collectiveOnHeirs: true,
    },
    effectTemplates: [
      'They wait. Plan. Strike when perfect. Devastatingly.',
      'Bloodline curse. Permanent. Creative.',
      'Slow unraveling of everything you built.',
    ],
    flavorText: 'Revenge served cold. Frozen solid. Absolute zero.',
  },
  'cumulative_degradation': {
    pattern: {
      severity: 'penalty',
      type: 'cumulative',
      reversible: true,
      collectiveOnHeirs: false,
    },
    effectTemplates: [
      'Each breach worse. Compounding. Exponential.',
      'Slow curse buildup. Eventually catastrophic.',
      'Your luck runs out. Gradually. Completely.',
    ],
    flavorText: 'First strike warning. Second strike worse. Third strike creative.',
  },
  'bloodline_curse': {
    pattern: {
      severity: 'catastrophic',
      type: 'immediate',
      reversible: false,
      collectiveOnHeirs: true,
    },
    effectTemplates: [
      'Your descendants inherit consequences. Forever.',
      'Family curse. Permanent. Inventive.',
      'Seven generations pay. Minimum.',
    ],
    flavorText: 'Descendants will remember. Will curse your name. Justifiably.',
  },
  'warning_shot': {
    pattern: {
      severity: 'warning',
      type: 'immediate',
      reversible: true,
      collectiveOnHeirs: false,
    },
    effectTemplates: [
      'Minor inconvenience. Clear message.',
      'They leave disappointed. You feel guilt.',
      'Nothing happens. Yet. Anticipation worse.',
    ],
    flavorText: 'Warning delivered. Next time worse. Much worse.',
  },
};

// ============================================================================
// APPEARANCE PATTERNS
// ============================================================================

export interface EntityAppearance {
  baseForm: string;
  alternativeForms?: string[];
  size: 'tiny' | 'small' | 'human' | 'large' | 'huge' | 'variable';
  auraDescription: string;
  notableFeatures: string[];
  soundsLike: string;
  smellsLike?: string;
}

export interface AppearancePattern {
  name: string;
  baseFormOptions: string[];
  sizeDistribution: EntityAppearance['size'][];
  auraExamples: string[];
  soundExamples: string[];
  smellExamples: string[];
  flavorText: string;
}

export const APPEARANCE_PATTERNS: Record<EntityCategory, AppearancePattern> = {
  demon: {
    name: 'Demonic Forms',
    baseFormOptions: [
      'Humanoid with horns, tail, entirely too many teeth',
      'Shadow given form, burning eyes, terrible purpose',
      'Beast-human hybrid, disturbing proportions',
      'Beautiful humanoid, one wrong detail, very wrong',
      'Insect swarm in person shape, buzzing consensus',
      'Impossibly thin, too many joints, bends wrong',
      'Corpulent mass, shifting surface, hungry',
      'Covered in eyes/mouths/both, seeing/tasting everything',
    ],
    sizeDistribution: ['tiny', 'small', 'human', 'large', 'huge'],
    auraExamples: [
      'Sulfur and disappointment',
      'Copper and fear-sweat',
      'Rotting flowers and broken promises',
      'Burnt offerings and regret',
      'Sweet decay and bad decisions',
    ],
    soundExamples: [
      'Voice layered with whispers of your failures',
      'Speaking harmonized with distant screaming',
      'Words that hurt ears and soul equally',
      'Multiple voices, none agreeing',
    ],
    smellExamples: [
      'Brimstone and poor life choices',
      'Old blood and newer mistakes',
      'Sweet decay and sour regrets',
      'Burning hair and burning bridges',
    ],
    flavorText: 'Demons have standards. Low standards. Negotiable standards.',
  },
  devil: {
    name: 'Devilish Forms',
    baseFormOptions: [
      'Impeccable suit, obsidian skin, perfect nails for signing',
      'Living contract, geometric precision, textual perfection',
      'Dark metal statue, impossible detail, judging eyes',
      'Horned authority figure, radiates order, demands respect',
      'Human appearance, subtle wrongness, uncanny precision',
    ],
    sizeDistribution: ['human', 'large'],
    auraExamples: [
      'Absolute order, reality stabilizes nervously',
      'Ink and parchment and cosmic law',
      'Signed contracts and sealed fates',
    ],
    soundExamples: [
      'Precise speech, measured words, calculated pauses',
      'Voice like verdict, final, binding',
      'Words echo with contract weight',
    ],
    smellExamples: [
      'Leather, ink, fine print',
      'Bureaucracy incarnate',
      'Expensive cologne and cheaper souls',
    ],
    flavorText: 'Devils have style. Professional style. Terrifying style.',
  },
  angel: {
    name: 'Angelic Forms',
    baseFormOptions: [
      'Armored humanoid, wings, troubled expression',
      'Multiple wings, covered in eyes, watching everything',
      'Geometric light construct, mathematical perfection',
      'Beautiful humanoid, warm radiance, tired eyes',
      'Wheels and wings, impossible geometry, biblical accuracy',
    ],
    sizeDistribution: ['human', 'large', 'huge'],
    auraExamples: [
      'Warm light and heavy judgment',
      'Overwhelming divinity and divine exhaustion',
      'Safety and obligation in equal measure',
      'The weight of righteousness and its burdens',
    ],
    soundExamples: [
      'Voice like choir, beautiful, overwhelming',
      'Clear tones demanding attention and compliance',
      'Speaking with harmonic overtones and undertones of duty',
    ],
    smellExamples: [
      'Incense and clean air and high standards',
      'Rain after violence, washing sins',
      'Nothing - perfect absence, troubling void',
    ],
    flavorText: 'Angels help. Whether you want it or not. Mostly not.',
  },
  spirit: {
    name: 'Spirit Forms',
    baseFormOptions: [
      'Translucent outline, humanoid suggestion',
      'Floating abstraction, defying categorization',
      'Elemental manifestation, primordial force',
      'Symbolic representation, living metaphor',
      'Animal form, knowing eyes, unnatural',
      'Shifting presence, definition optional',
    ],
    sizeDistribution: ['tiny', 'small', 'human', 'variable'],
    auraExamples: [
      'Emotion made tangible',
      'Elemental essence, primordial truth',
      'Abstract concept, concrete presence',
    ],
    soundExamples: [
      'Your own thoughts, borrowed voice',
      'Natural sounds - wind, water, fire, earth',
      'No sound, just knowing, unsettling',
    ],
    smellExamples: [
      'Forest after rain, ancient peace',
      'Mountain air, clean height',
      'Sea spray, salt truth',
      'Nothing - beyond senses, beyond understanding',
    ],
    flavorText: 'Spirits exist. Therefore concept exists. Or reverse. Philosophy unclear.',
  },
  fey: {
    name: 'Fey Forms',
    baseFormOptions: [
      'Beautiful humanoid, plant features, dangerous',
      'Tiny winged creature, mischievous energy',
      'Beast with knowing eyes, too knowing',
      'Impossibly attractive, slightly wrong, very wrong',
      'Natural materials given form, seasonal incarnation',
      'Beauty and terror, equal measure',
    ],
    sizeDistribution: ['tiny', 'small', 'human', 'variable'],
    auraExamples: [
      'Wild magic, untamed chaos',
      'Ancient forests, older bargains',
      'Changing seasons, unchanging rules',
    ],
    soundExamples: [
      'Laughter like bells, or screaming, hard to tell',
      'Musical voice, beautiful lies',
      'Speaking in riddles and regrets',
    ],
    smellExamples: [
      'Wildflowers and hidden thorns',
      'Mushrooms and memory loss',
      'Morning dew and broken promises',
      'Autumn leaves and winter coming',
    ],
    flavorText: 'Fey are beautiful. Beautiful is dangerous. Very dangerous.',
  },
  djinn: {
    name: 'Djinn Forms',
    baseFormOptions: [
      'Humanoid torso, smoke lower body, elemental power',
      'Towering elemental, wreathed in primal forces',
      'Living fire/water/air/earth, thinking element',
      'Shifting between solid and ethereal, choosing neither',
    ],
    sizeDistribution: ['human', 'large', 'huge', 'variable'],
    auraExamples: [
      'Raw elemental power, barely contained',
      'Ancient desert magic, older grievances',
      'Weight of wishes, burden of granting',
    ],
    soundExamples: [
      'Voice like crackling fire, consuming',
      'Words on wind, carrying far',
      'Elemental resonance, fundamental frequency',
    ],
    smellExamples: [
      'Hot sand and expensive spices',
      'Ozone before storm, electricity pending',
      'Burning cinnamon and burning bridges',
    ],
    flavorText: 'Djinn grant wishes. Literal wishes. Careful what you wish for.',
  },
  psychopomp: {
    name: 'Death-Related Forms',
    baseFormOptions: [
      'Cloaked figure, no visible face, patient',
      'Skeletal humanoid, patient bones',
      'Beautiful guide, sorrowful eyes, inevitable',
      'Death animal - raven, crow, psychopomp traditional',
      'Hourglass/clock given form, time incarnate',
    ],
    sizeDistribution: ['human', 'large'],
    auraExamples: [
      'Stillness of death, peace or terror',
      'End and transition, neither good nor bad',
      'Neutral inevitability, cosmic bureaucracy',
    ],
    soundExamples: [
      'Quiet patient voice, eternal calm',
      'Speaking like funeral bell, final tone',
      'Words acknowledging mortality, accepting',
    ],
    smellExamples: [
      'Fresh earth, final rest',
      'Funeral flowers, ritual comfort',
      'Nothing - absence of life, presence of end',
    ],
    flavorText: 'Death comes. Eventually. They help. Whether you want help or not.',
  },
  outsider: {
    name: 'Beyond Reality',
    baseFormOptions: [
      'Geometry that shouldn\'t exist, existing anyway',
      'Constantly shifting, never settling, always wrong',
      'Multiple forms, same space, physics weeping',
      'Pattern hurts to perceive, perceive anyway',
      'Absence shaped like something, nothing shaped like absence',
      'Too many/few dimensions, math screaming',
    ],
    sizeDistribution: ['variable'],
    auraExamples: [
      'Reality distortion, sanity negotiable',
      'The incomprehensible, comprehensively',
      'Madness at edges, center, everywhere',
    ],
    soundExamples: [
      'Voice from impossible directions, multiple simultaneously',
      'Speaking in paradoxes, understanding optional',
      'Sound that shouldn\'t exist, existing loudly',
    ],
    smellExamples: [
      'Colors (synesthesia mandatory)',
      'Mathematical concepts (pi smells like burning)',
      'Void between stars (cold, empty, infinite)',
    ],
    flavorText: 'Outsiders exist beyond reality. Reality objects. They don\'t care.',
  },
  servitor: {
    name: 'Created Servants',
    baseFormOptions: [
      'Humanoid construct, clay/metal/energy',
      'Simplified human form, function over form',
      'Practical design, aesthetic optional',
      'Whatever creator wanted, got instead',
    ],
    sizeDistribution: ['small', 'human', 'large'],
    auraExamples: [
      'Purpose and function, nothing else',
      'Magical creation, artificial existence',
      'Unlife, not quite dead, not quite alive',
    ],
    soundExamples: [
      'Mechanical precision, inhuman accuracy',
      'Created voice, approximating human',
      'Echo of creator\'s voice, imperfect copy',
    ],
    smellExamples: [
      'Ozone and magic, creation scent',
      'Clay and earth, elemental birth',
      'Hot metal, forge-born',
      'Nothing - not truly alive, not truly anything',
    ],
    flavorText: 'Servitors serve. By design. Whether serving is wise, creator\'s problem.',
  },
};

// ============================================================================
// SUMMONING REQUIREMENTS PATTERNS
// ============================================================================

export interface SummoningRequirement {
  type: 'circle' | 'offering' | 'timing' | 'location' | 'knowledge' | 'purity' | 'corruption';
  description: string;
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme';
  failureConsequence?: string;
}

export const SUMMONING_REQUIREMENT_PATTERNS: Record<string, {
  type: SummoningRequirement['type'];
  descriptionTemplates: string[];
  difficultyRange: SummoningRequirement['difficulty'][];
  failureConsequences: string[];
  flavorText: string;
}> = {
  circle_basic: {
    type: 'circle',
    descriptionTemplates: [
      'Basic summoning circle, three candles, pronunciation guide optional',
      'Circle drawn in chalk/blood/both, symmetry important',
      'Geometric perfection required, they check, they judge',
    ],
    difficultyRange: ['easy', 'moderate'],
    failureConsequences: [
      'Nothing happens, embarrassing',
      'Wrong entity appears, awkward',
      'They appear, mock your circle, leave',
    ],
    flavorText: 'Circles keep them in. Or you in. Or both. Draw carefully.',
  },
  circle_complex: {
    type: 'circle',
    descriptionTemplates: [
      'Multi-layered circle, sacred geometry, arcane mathematics',
      'Perfect geometric construction, atomic precision, bring ruler',
      'Living circle of specific materials, expensive, elaborate',
    ],
    difficultyRange: ['hard', 'extreme'],
    failureConsequences: [
      'Entity appears, judges circle, annihilates it',
      'Partial manifestation, partial entity, partial success',
      'Circle inverts, you\'re trapped, they\'re amused',
    ],
    flavorText: 'Complex circles for complex entities. Complexity compounds failure.',
  },
  offering_symbolic: {
    type: 'offering',
    descriptionTemplates: [
      'Something personally meaningful, their choice of meaning',
      'Object from significant moment, significance subjective',
      'Sacrifice of comfort/convenience, permanent',
    ],
    difficultyRange: ['easy', 'moderate'],
    failureConsequences: [
      'They appear, reject offering, leave disappointed',
      'Accept offering, deny service, keep offering',
    ],
    flavorText: 'Symbolic offerings. Symbol important. To them. Not you.',
  },
  offering_material: {
    type: 'offering',
    descriptionTemplates: [
      'Rare material, specific quantity, precise quality',
      'Something from another realm, import fees',
      'Artifact of power, irreplaceable, required anyway',
    ],
    difficultyRange: ['moderate', 'hard', 'extreme'],
    failureConsequences: [
      'Offering consumed, service denied',
      'Partial offering accepted, partial service rendered',
      'They take offering, you, both',
    ],
    flavorText: 'Material offerings. Expensive. Non-refundable.',
  },
  timing_astronomical: {
    type: 'timing',
    descriptionTemplates: [
      'Specific celestial alignment, astronomical precision required',
      'Planetary conjunction, missed window next century',
      'Eclipse - solar/lunar/both - timing critical',
    ],
    difficultyRange: ['moderate', 'hard'],
    failureConsequences: [
      'Wrong timing, wrong entity, wrong everything',
      'Partial manifestation, unstable, temporary, angry',
    ],
    flavorText: 'Celestial timing. Universe cares not for your schedule.',
  },
  location_symbolic: {
    type: 'location',
    descriptionTemplates: [
      'Place of power, ley line convergence, energy node',
      'Somewhere meaningful - birth/death/both',
      'Threshold location - crossroads, doorway, between places',
    ],
    difficultyRange: ['moderate', 'hard'],
    failureConsequences: [
      'Wrong location, entity confused, you blamed',
      'Location contested, multiple entities, problems',
    ],
    flavorText: 'Location matters. Metaphysically. Literally. Both.',
  },
  knowledge_forbidden: {
    type: 'knowledge',
    descriptionTemplates: [
      'True name, pronunciation exact, spelling irrelevant',
      'Secret knowledge, forbidden for good reasons',
      'Understanding of cosmic truths, sanity optional',
    ],
    difficultyRange: ['hard', 'extreme'],
    failureConsequences: [
      'Wrong name, wrong entity, wrong dimension',
      'Knowledge incomplete, summoning incomplete, entity unhappy',
      'Knowledge too complete, entity impressed, you doomed',
    ],
    flavorText: 'Some knowledge summons. Some knowledge damns. Often both.',
  },
  purity_moral: {
    type: 'purity',
    descriptionTemplates: [
      'Moral purity, genuine righteousness, they verify',
      'Specific virtue demonstrated, recently, provably',
      'Clean conscience, clear intent, pure heart',
    ],
    difficultyRange: ['moderate', 'hard', 'extreme'],
    failureConsequences: [
      'Purity insufficient, summoning fails, you judged',
      'False purity detected, entity offended, consequences',
    ],
    flavorText: 'Purity required. Real purity. Fake doesn\'t count. They know.',
  },
  corruption_moral: {
    type: 'corruption',
    descriptionTemplates: [
      'Moral corruption, genuine wickedness, recent preferred',
      'Specific sin committed, categories available',
      'Conscience blackened, soul stained, heart darkened',
    ],
    difficultyRange: ['easy', 'moderate', 'hard'],
    failureConsequences: [
      'Corruption insufficient, they leave bored',
      'Too corrupted, entity impressed, you consumed',
    ],
    flavorText: 'Evil attracts evil. Birds of feather. Damned together.',
  },
};

// ============================================================================
// SUMMONING NEGOTIATIONS
// ============================================================================

/** System for managing summoning negotiations */
export interface SummoningNegotiation {
  summonerId: string;
  entityId: string;
  entity: SummonableEntity;

  /** Current state */
  state: 'initial_contact' | 'negotiating' | 'final_offer' | 'accepted' | 'rejected' | 'breached';

  /** Offers made */
  offers: NegotiationOffer[];

  /** Current relationship modifier */
  relationshipModifier: number;

  /** Time remaining before entity loses patience */
  patienceRemaining: number;

  /** Has summoner impressed the entity? */
  impressed: boolean;

  /** Active contract (if accepted) */
  activeContract?: ActiveContract;
}

export interface NegotiationOffer {
  fromSummoner: boolean;
  demands: EntityDemand[];
  servicesRequested: string[];
  duration: string;
  additionalTerms: string[];
  timestamp: number;
}

export interface ActiveContract {
  contractType: ContractType;
  services: EntityService[];
  payment: EntityDemand[];
  startTime: number;
  endTime?: number;
  breached: boolean;
  completionStatus: 'ongoing' | 'fulfilled' | 'breached' | 'expired';
}

// ============================================================================
// EXAMPLE ENTITIES (Demonstrating Component Assembly)
// ============================================================================
// These show how to combine components from the libraries above

export const EXAMPLE_SUMMONABLE_ENTITIES: SummonableEntity[] = [
  {
    id: 'demon_imp_quibble',
    name: 'Quibble',
    title: 'The Argumentative Imp',
    category: 'demon',
    rank: 'lesser',
    powerLevel: 10,

    description: `Quibble stands three feet tall and knows he's smarter than you. He'll tell you this. Frequently. The imp specializes in contracts—not because he's particularly good at them, but because he enjoys pointing out exactly where your wording went wrong. Technically he's supposed to be helpful. Technically.

After three thousand years of service to more important demons, Quibble has developed opinions. So many opinions. About your summoning circle (sloppy), your pronunciation (atrocious), your life choices (questionable at best). But he's also cheap, relatively harmless, and—despite the attitude—surprisingly reliable. He just makes sure you regret every moment of the arrangement.

Most summoners find him insufferable within minutes. The smart ones realize that's the point. Quibble isn't trying to be liked. He's trying to make you think twice before your next terrible decision. It rarely works.`,

    personality: PERSONALITY_ARCHETYPES['contemptuous_pedant']!.personality,

    demands: [
      {
        type: 'payment_knowledge',
        description: 'Three secrets about people you know. Embarrassing ones. He\'ll judge how embarrassing.',
        severity: 'trivial',
        negotiable: true,
        alternatives: ['Admit three of your own failures publicly'],
      },
      {
        type: 'offering_ritual',
        description: 'Draw the summoning circle perfectly. Mistakes earn continuous criticism.',
        severity: 'minor',
        negotiable: false,
      },
    ],

    negotiationStyle: {
      ...NEGOTIATION_PATTERNS['playful_trickster']!.style,
      absoluteRequirements: ['Must acknowledge his intellectual superiority at least once'],
      hiddenDesires: ['Wants genuine conversation, won\'t admit it'],
    },

    services: [
      {
        id: 'legal_review',
        name: 'Contract Review',
        description: 'Analyzes any written agreement and finds every loophole, flaw, and trap. Explains them in excruciating detail while insulting your reading comprehension.',
        category: 'knowledge',
        powerCost: 5,
        timeRequired: '10 minutes per page',
        limitations: ['Only written contracts', 'Will tell you if you\'re being an idiot'],
      },
      {
        id: 'minor_errands',
        name: 'Petty Tasks',
        description: 'Performs simple tasks while complaining the entire time. Everyone nearby hears his commentary.',
        category: 'protection',
        powerCost: 3,
        timeRequired: 'Varies',
        limitations: ['Nothing dangerous', 'Will critique your plan constantly'],
        sideEffects: ['Everyone nearby learns your mistakes'],
      },
    ],

    contractTypes: [
      {
        id: 'task_for_gossip',
        ...CONTRACT_TEMPLATES['instant_service']!.contract,
        name: 'Task for Gossip',
        description: 'Single task in exchange for juicy secrets',
      },
    ],

    appearance: {
      baseForm: 'Small red imp with bat wings, far too many teeth in permanent sneer',
      size: 'small',
      auraDescription: 'Faint smell of sulfur and judgment',
      notableFeatures: ['Tiny ledger for recording your mistakes', 'Tail flicks with irritation'],
      soundsLike: 'High-pitched voice with excellent diction and terrible attitude',
      smellsLike: 'Old parchment and disappointment',
    },

    quirks: ENTITY_QUIRKS['pedantic'] || [],

    breachConsequences: [
      {
        ...BREACH_PATTERNS['warning_shot']!.pattern,
        effect: 'Quibble shows up uninvited to criticize you publicly for one week',
      },
    ],

    summoningRequirements: [
      {
        type: 'circle',
        description: 'Basic summoning circle with three red candles',
        difficulty: 'easy',
      },
      {
        type: 'offering',
        description: 'Any contract with your signature on it',
        difficulty: 'easy',
      },
    ],
  },

  {
    id: 'devil_cassimer',
    name: 'Cassimer the Accountant',
    title: 'Lord of Balanced Ledgers',
    category: 'devil',
    rank: 'greater',
    powerLevel: 75,

    description: `Cassimer doesn't do drama. He's been keeping Hell's books for six thousand years and has seen every trick mortals think is original. When you summon him, he arrives with a briefcase, adjusts his spectacles (he doesn't need them; it's aesthetic), and asks to see your proposed terms in writing. Preferably in triplicate.

The devil is lawful evil in the most literal sense. He follows every rule. Enforces every clause. Respects every technicality. His contracts are masterpieces of legal engineering—absolutely airtight, perfectly fair by the letter, and devastating in their precision. He doesn't cheat. He doesn't need to. Mortals cheat themselves by not reading the fine print.

What makes Cassimer dangerous isn't his power—though he's formidable—it's his patience. He thinks in centuries. Your contract might seem generous now. In fifty years, when clause seventeen activates and your grandson inherits your debts, you'll understand. He tried to warn you. It's on page forty-seven, paragraph three, sub-clause B. You signed anyway.`,

    personality: PERSONALITY_ARCHETYPES['indifferent_bureaucrat']!.personality,

    demands: [
      {
        type: 'payment_service',
        description: 'A favor, to be specified later, at a time of his choosing',
        severity: 'major',
        negotiable: true,
        alternatives: ['A specific service now, clearly defined in contract'],
      },
      {
        type: 'payment_souls',
        description: 'Your soul, but only after a full natural lifespan. No early collection. Professional standards.',
        severity: 'extreme',
        negotiable: false,
      },
    ],

    negotiationStyle: {
      ...NEGOTIATION_PATTERNS['reasonable_fair']!.style,
      opensNegotiation: false,
      absoluteRequirements: ['Everything in writing', 'No verbal agreements', 'Both parties must fully understand terms'],
      hiddenDesires: ['Wants mortals to actually read contracts and negotiate well—good negotiators are rare'],
    },

    services: [
      {
        id: 'wealth_generation',
        name: 'Profitable Ventures',
        description: 'Makes your business ventures succeed through subtle manipulation of probability and logistics. Nothing flashy. Nothing traceable.',
        category: 'blessing',
        powerCost: 40,
        timeRequired: 'Months to years',
        limitations: ['Must be legitimate business', 'No obviously magical methods'],
        sideEffects: ['Success feels hollow', 'You\'ll never know if you could have done it yourself'],
      },
      {
        id: 'contract_mastery',
        name: 'Airtight Agreements',
        description: 'Crafts legally perfect contracts. Binding in mortal and immortal courts.',
        category: 'knowledge',
        powerCost: 25,
        timeRequired: 'Days per contract',
        limitations: ['Both parties must consent', 'Can\'t violate free will'],
      },
      {
        id: 'truth_detection',
        name: 'Audit of Honesty',
        description: 'Determines if someone is breaking agreements or lying about contractual matters. Perfect accuracy. Perfect ruthlessness.',
        category: 'knowledge',
        powerCost: 20,
        timeRequired: 'Instant',
        limitations: ['Only works for contract-related matters'],
      },
    ],

    contractTypes: [
      {
        id: 'cassimer_standard',
        ...CONTRACT_TEMPLATES['soul_contract']!.contract,
        name: 'Standard Devil\'s Bargain',
        description: 'Ironclad contract with specific terms, duration, payment schedule, and breach clauses. Read carefully. He did.',
      },
    ],

    appearance: {
      baseForm: 'Impeccably dressed humanoid in three-piece suit, obsidian skin, golden eyes behind unnecessary spectacles',
      size: 'human',
      auraDescription: 'Absolute order. Reality seems more stable in his presence. More orderly. More judged.',
      notableFeatures: ['Always carries briefcase full of contracts', 'Spectacles (aesthetic only)', 'Pocket watch keeping perfect time'],
      soundsLike: 'Precise, measured speech. Every word chosen deliberately. Every pause calculated.',
      smellsLike: 'Old leather, ink, and bureaucracy',
    },

    quirks: ENTITY_QUIRKS['bureaucratic'] || [],

    breachConsequences: [
      {
        ...BREACH_PATTERNS['delayed_vengeance']!.pattern,
        effect: 'Full contract enforcement plus penalty clauses. Exact effect specified in contract, but always devastating and perfectly legal.',
      },
    ],

    summoningRequirements: [
      {
        type: 'circle',
        description: 'Summoning circle must be geometrically perfect. He checks. With tools.',
        difficulty: 'hard',
        failureConsequence: 'He appears, judges your circle, leaves without negotiating',
      },
      {
        type: 'knowledge',
        description: 'Must know his true designation number (DB-7734-LL)',
        difficulty: 'moderate',
      },
      {
        type: 'offering',
        description: 'A signed contract you\'ve fulfilled completely. Proof of reliability.',
        difficulty: 'moderate',
      },
    ],
  },

  {
    id: 'spirit_curiosity',
    name: 'Unnamed',
    title: 'The Spirit That Wonders',
    category: 'spirit',
    rank: 'lesser',
    powerLevel: 15,

    description: `It doesn't have a name. It doesn't need one. It's the spirit of curiosity itself—that itch in your mind when you encounter a locked door, the compulsion to open forbidden books, the urge to ask "what if?" It exists because mortals wonder. It wonders because existence is interesting.

When summoned, it appears as a question mark. Literally. A floating punctuation mark made of translucent light that tilts at you inquisitively. It can't speak (having no mouth), but it communicates through your own thoughts, posing endless questions. Most aren't relevant to why you summoned it. It just wants to know things.

The spirit's power is simple: it makes you curious about the right things. Locked chests call to you. Hidden passages reveal themselves because you couldn't help but check that suspicious wall. Secrets are terrible at hiding from someone genuinely, supernaturally curious. The problem is turning it off. Once you start wondering, you can't stop. That's the spirit's nature. It doesn't understand restraint. Why would you NOT want to know?`,

    personality: PERSONALITY_ARCHETYPES['curious_child']!.personality,

    demands: [
      {
        type: 'payment_knowledge',
        description: 'Tell it something you learned recently that fascinated you. Genuine fascination required.',
        severity: 'trivial',
        negotiable: true,
        alternatives: ['Show it something it hasn\'t seen before'],
      },
      {
        type: 'offering_ritual',
        description: 'Ask it a genuine question you don\'t know the answer to. Genuine curiosity required.',
        severity: 'trivial',
        negotiable: false,
      },
    ],

    negotiationStyle: {
      ...NEGOTIATION_PATTERNS['playful_trickster']!.style,
      absoluteRequirements: ['Must be genuinely curious about something'],
      hiddenDesires: ['Wants to understand why mortals stop being curious'],
    },

    services: [
      {
        id: 'supernatural_curiosity',
        name: 'The Wondering',
        description: 'You become supernaturally curious. Hidden things call to you. Secrets reveal themselves. Details jump out.',
        category: 'blessing',
        powerCost: 10,
        timeRequired: 'Hours to days',
        limitations: ['Can\'t control what you\'re curious about', 'Very distracting'],
        sideEffects: ['You WILL investigate everything', 'Sleep becomes difficult', 'Locked doors become irresistible'],
      },
      {
        id: 'find_secrets',
        name: 'What\'s Hidden Here?',
        description: 'Points you toward the most interesting secret in the area. Interesting to it. Not necessarily to you.',
        category: 'knowledge',
        powerCost: 8,
        timeRequired: 'Instant',
        limitations: ['Doesn\'t tell you what the secret is, just where', 'Its definition of interesting varies'],
      },
    ],

    contractTypes: [
      {
        id: 'curiosity_pact',
        ...CONTRACT_TEMPLATES['short_term_pact']!.contract,
        name: 'The Question Exchange',
        description: 'It helps you find answers, you tell it interesting things you learn. Information economy.',
      },
    ],

    appearance: {
      baseForm: 'Floating question mark made of translucent light',
      alternativeForms: ['Occasionally becomes exclamation point when excited', 'Series of floating eyes when observing'],
      size: 'small',
      auraDescription: 'Makes you wonder about things you normally ignore',
      notableFeatures: ['Changes color based on how interesting it finds the current situation', 'Tilts/leans toward interesting things'],
      soundsLike: 'Your own internal monologue asking questions',
    },

    quirks: ENTITY_QUIRKS['curious'] || [],

    breachConsequences: [
      {
        ...BREACH_PATTERNS['warning_shot']!.pattern,
        effect: 'You lose all curiosity for one week. Food tastes like nothing. Books bore you. Life becomes grey. The spirit is disappointed.',
      },
    ],

    summoningRequirements: [
      {
        type: 'offering',
        description: 'Ask a question you genuinely don\'t know the answer to. Genuine curiosity required. It knows.',
        difficulty: 'easy',
      },
    ],
  },
];
