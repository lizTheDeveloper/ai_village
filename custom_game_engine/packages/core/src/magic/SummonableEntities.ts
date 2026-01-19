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

// ============================================================================
// DATA LOADER
// ============================================================================

import summonableEntitiesData from '../../data/summonable-entities.json';

/** Pre-configured personality archetypes with dry wit */
export const PERSONALITY_ARCHETYPES: Record<string, { personality: EntityPersonality; flavorText: string }> =
  summonableEntitiesData.personalityArchetypes as Record<string, { personality: EntityPersonality; flavorText: string }>;

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
}> = summonableEntitiesData.negotiationPatterns as Record<string, {
  style: Omit<NegotiationStyle, 'absoluteRequirements' | 'hiddenDesires'>;
  flavorText: string;
}>;

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

export const DEMAND_PATTERNS: DemandPattern[] = summonableEntitiesData.demandPatterns as DemandPattern[];

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

export const SERVICE_TEMPLATES: ServiceTemplate[] = summonableEntitiesData.serviceTemplates as ServiceTemplate[];

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

export const CONTRACT_TEMPLATES: Record<string, { contract: Omit<ContractType, 'id'>; flavorText: string }> =
  summonableEntitiesData.contractTemplates as Record<string, { contract: Omit<ContractType, 'id'>; flavorText: string }>;

// ============================================================================
// QUIRK LIBRARY
// ============================================================================

export const ENTITY_QUIRKS: Record<string, string[]> = summonableEntitiesData.entityQuirks as Record<string, string[]>;

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
}> = summonableEntitiesData.breachPatterns as Record<string, {
  pattern: Omit<BreachConsequence, 'effect'>;
  effectTemplates: string[];
  flavorText: string;
}>;

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

export const APPEARANCE_PATTERNS: Record<EntityCategory, AppearancePattern> =
  summonableEntitiesData.appearancePatterns as Record<EntityCategory, AppearancePattern>;

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
}> = summonableEntitiesData.summoningRequirementPatterns as Record<string, {
  type: SummoningRequirement['type'];
  descriptionTemplates: string[];
  difficultyRange: SummoningRequirement['difficulty'][];
  failureConsequences: string[];
  flavorText: string;
}>;

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
