/**
 * AnimalBeliefTypes - Divine belief systems of intelligent animals
 *
 * Sufficiently intelligent animals can form beliefs in the divine.
 * Their gods emerge from their unique perceptions of the world -
 * a whale's gods are as alien to humans as human gods are to ants.
 *
 * Key concepts:
 * - Intelligence threshold for belief formation
 * - Species-specific divine concepts (whales see different sacred things than wolves)
 * - Animal-gods emerge from collective animal belief
 * - Cross-species belief is possible but rare
 * - Animal worship differs fundamentally from human worship
 */

// ============================================================================
// Intelligence & Belief Capacity
// ============================================================================

/** Minimum intelligence required for various belief activities */
export const BELIEF_INTELLIGENCE_THRESHOLDS = {
  /** Can sense numinous presence */
  awareness: 0.2,

  /** Can recognize sacred places */
  recognition: 0.3,

  /** Can form proto-beliefs */
  proto_belief: 0.4,

  /** Can participate in group belief activities */
  communal_belief: 0.5,

  /** Can hold persistent beliefs about the divine */
  true_belief: 0.6,

  /** Can communicate beliefs to others */
  transmission: 0.7,

  /** Can perform intentional worship */
  worship: 0.75,

  /** Can serve as priest/shaman equivalent */
  clergy: 0.85,

  /** Can create new religious concepts */
  theology: 0.9,
} as const;

/** Check if an animal can form beliefs */
export function canFormBeliefs(intelligence: number): boolean {
  return intelligence >= BELIEF_INTELLIGENCE_THRESHOLDS.true_belief;
}

/** Get the belief capacity level for an intelligence score */
export function getBeliefCapacity(intelligence: number): BeliefCapacity {
  if (intelligence >= BELIEF_INTELLIGENCE_THRESHOLDS.theology) return 'theological';
  if (intelligence >= BELIEF_INTELLIGENCE_THRESHOLDS.clergy) return 'priestly';
  if (intelligence >= BELIEF_INTELLIGENCE_THRESHOLDS.worship) return 'devotional';
  if (intelligence >= BELIEF_INTELLIGENCE_THRESHOLDS.transmission) return 'communicative';
  if (intelligence >= BELIEF_INTELLIGENCE_THRESHOLDS.true_belief) return 'believing';
  if (intelligence >= BELIEF_INTELLIGENCE_THRESHOLDS.communal_belief) return 'communal';
  if (intelligence >= BELIEF_INTELLIGENCE_THRESHOLDS.proto_belief) return 'proto';
  if (intelligence >= BELIEF_INTELLIGENCE_THRESHOLDS.awareness) return 'aware';
  return 'none';
}

export type BeliefCapacity =
  | 'none'           // Cannot perceive the divine
  | 'aware'          // Senses something but can't understand
  | 'proto'          // Forms vague impressions
  | 'communal'       // Participates in group belief
  | 'believing'      // Holds true beliefs
  | 'communicative'  // Can share beliefs with others
  | 'devotional'     // Can perform worship
  | 'priestly'       // Can lead worship
  | 'theological';   // Can develop new beliefs

// ============================================================================
// Species Categories & Divine Perception
// ============================================================================

/** Broad categories of species with shared divine perception */
export type SpeciesCategory =
  | 'cetacean'       // Whales, dolphins, porpoises
  | 'primate'        // Apes, monkeys
  | 'corvid'         // Crows, ravens, jays
  | 'canid'          // Wolves, dogs, foxes
  | 'felid'          // Large cats, domestic cats
  | 'ursid'          // Bears
  | 'pachyderm'      // Elephants
  | 'cephalopod'     // Octopi, squid
  | 'ungulate'       // Horses, deer, cattle
  | 'rodent'         // Intelligent rodents
  | 'avian_raptor'   // Eagles, hawks, owls
  | 'reptilian'      // Intelligent reptiles
  | 'insectoid'      // Hive minds (collective intelligence)
  | 'mythical'       // Dragons, phoenixes, etc.
  | 'other';

/** How different species perceive the divine */
export interface SpeciesDivinePerception {
  /** What senses dominate divine perception */
  primarySenses: DivineSense[];

  /** What concepts are sacred to this species */
  sacredConcepts: string[];

  /** What places are naturally sacred */
  sacredPlaceTypes: string[];

  /** What activities constitute worship */
  worshipActivities: string[];

  /** How do they conceptualize divine beings */
  divineConceptualization: DivineConceptType;

  /** Can they perceive human gods? */
  humanGodPerception: 'none' | 'faint' | 'different' | 'clear';

  /** Can humans perceive their gods? */
  perceptibleToHumans: 'none' | 'faint' | 'different' | 'clear';
}

export type DivineSense =
  | 'echolocation'   // Cetaceans, bats
  | 'song'           // Whales, birds
  | 'scent'          // Canids, many mammals
  | 'vision'         // Raptors, primates
  | 'pressure'       // Deep sea creatures
  | 'magnetism'      // Migratory species
  | 'vibration'      // Insects, spiders
  | 'electrical'     // Sharks, rays
  | 'thermal'        // Snakes
  | 'chemical';      // Insects

export type DivineConceptType =
  | 'anthropomorphic'  // Gods appear as idealized versions of species
  | 'elemental'        // Gods are forces of nature
  | 'ancestral'        // Gods are great ancestors
  | 'abstract'         // Gods are concepts (rare, requires high intelligence)
  | 'pack_spirit'      // Divine is the collective
  | 'territorial'      // Divine is the land itself
  | 'cyclical'         // Divine is the eternal return (seasons, migrations)
  | 'predator_prey';   // Divine duality of hunter and hunted

// ============================================================================
// Cetacean (Whale/Dolphin) Divine System
// ============================================================================

/** Domains specific to cetacean deities */
export type CetaceanDivineDomain =
  | 'the_deep'          // The abyss, darkness, pressure, mysteries below
  | 'the_song'          // Communication, memory, the great songs
  | 'the_breath'        // The surface, air, the world above
  | 'the_current'       // Migration, navigation, the great paths
  | 'the_pod'           // Community, family, belonging
  | 'the_hunt'          // Food, the chase, abundance
  | 'the_silence'       // Death, stillness, the ending
  | 'the_warmth'        // Temperature, the poles, seasonal change
  | 'the_echo'          // Echolocation, truth, seeing truly
  | 'the_breach'        // Joy, play, transcendence
  | 'the_leviathan'     // The great ancestor, primal whale
  | 'the_wound'         // Suffering, harpoons, human threat
  | 'the_remembrance';  // Whale song as sacred history

/** A cetacean deity */
export interface CetaceanDeity {
  id: string;
  entityType: 'animal_deity';
  speciesCategory: 'cetacean';

  /** Name in whale "language" (represented as song pattern) */
  songName: SongPattern;

  /** Human-comprehensible translation/description */
  translatedName: string;

  /** Epithets sung about this deity */
  songEpithets: SongPattern[];

  /** Primary domain */
  domain: CetaceanDivineDomain;

  /** Secondary domains */
  secondaryDomains: CetaceanDivineDomain[];

  /** How the deity is perceived */
  perceivedNature: CetaceanDeityNature;

  /** Manifestation form */
  manifestation: CetaceanManifestation;

  /** What offerings please this deity */
  pleasingActs: CetaceanOffering[];

  /** What offends this deity */
  offensiveActs: string[];

  /** Accumulated belief from cetaceans */
  cetaceanBelief: number;

  /** Can humans perceive this deity? */
  humanPerceptible: boolean;

  /** If perceptible, how do humans interpret it? */
  humanInterpretation?: string;
}

/** Whale song patterns as names/prayers */
export interface SongPattern {
  /** Duration in seconds */
  duration: number;

  /** Frequency range */
  frequencyRange: [number, number];

  /** Pattern description */
  description: string;

  /** What pod/population uses this */
  tradition: string;
}

export type CetaceanDeityNature =
  | 'ancient_whale'     // Appears as primal ancestor whale
  | 'ocean_force'       // Is the ocean itself
  | 'song_spirit'       // Exists in the songs
  | 'depth_presence'    // Dwells in the abyss
  | 'current_rider'     // Moves with the migrations
  | 'breath_giver'      // Guards the surface
  | 'pod_ancestor'      // Specific lineage ancestor
  | 'abstract';         // Pure concept (rare)

export interface CetaceanManifestation {
  /** How does the deity appear */
  form: 'great_whale' | 'song_only' | 'water_movement' | 'pressure_change' | 'light_in_depths' | 'school_of_fish';

  /** Size relative to normal whale */
  scale: 'vast' | 'enormous' | 'normal' | 'variable';

  /** Is it visible? */
  visibility: 'always' | 'to_believers' | 'in_sacred_waters' | 'never';

  /** How is presence felt? */
  presenceSigns: string[];
}

export type CetaceanOffering =
  | 'long_song'           // Extended singing
  | 'deep_dive'           // Descending to depths
  | 'synchronized_breach' // Group leaping
  | 'feeding_share'       // Sharing food
  | 'teaching_young'      // Passing on knowledge
  | 'visiting_site'       // Pilgrimage to sacred waters
  | 'silence_keeping'     // Period of quiet
  | 'current_riding';     // Following traditional paths

// ============================================================================
// Pack/Herd Animal Divine System
// ============================================================================

/** Domains for pack/herd animal deities */
export type PackDivineDomain =
  | 'the_alpha'         // Leadership, strength, dominance
  | 'the_pack'          // Unity, family, belonging
  | 'the_hunt'          // Chase, skill, sustenance
  | 'the_territory'     // Land, boundaries, home
  | 'the_howl'          // Communication, connection across distance
  | 'the_moon'          // Night, cycles, mystery
  | 'the_prey'          // Food, sacrifice, gratitude
  | 'the_pup'           // Youth, future, hope
  | 'the_elder'         // Wisdom, memory, guidance
  | 'the_lone'          // Solitude, exile, wandering
  | 'the_winter'        // Hardship, endurance, survival
  | 'the_den';          // Safety, birth, rest

/** A pack/herd deity */
export interface PackDeity {
  id: string;
  entityType: 'animal_deity';
  speciesCategory: 'canid' | 'felid' | 'ursid' | 'ungulate';

  /** How species refers to deity */
  callName: VocalizationPattern;

  /** Human translation */
  translatedName: string;

  domain: PackDivineDomain;
  secondaryDomains: PackDivineDomain[];

  /** Nature of the deity */
  perceivedNature: 'great_ancestor' | 'pack_spirit' | 'territory_guardian' | 'prey_spirit';

  /** How it manifests */
  manifestation: {
    form: 'great_beast' | 'pack_of_spirits' | 'land_presence' | 'prey_herd' | 'aurora';
    presenceSigns: string[];
  };

  /** Acts of devotion */
  devotionActs: string[];

  /** Accumulated belief */
  packBelief: number;
}

export interface VocalizationPattern {
  type: 'howl' | 'bark' | 'growl' | 'roar' | 'call' | 'rumble';
  description: string;
  meaning: string;
}

// ============================================================================
// Corvid (Crow/Raven) Divine System
// ============================================================================

/** Domains for corvid deities */
export type CorvidDivineDomain =
  | 'the_sky'           // Flight, freedom, perspective
  | 'the_shiny'         // Treasure, collection, value
  | 'the_carrion'       // Death, endings, transformation
  | 'the_trick'         // Cleverness, deception, games
  | 'the_murder'        // Flock, community, safety in numbers
  | 'the_cache'         // Memory, storage, future-planning
  | 'the_call'          // Communication, warning, news
  | 'the_roost'         // Home, night, rest
  | 'the_human_edge'    // The boundary with humans (unique to corvids)
  | 'the_tool';         // Tool use, problem solving, innovation

/** Corvid deity - these are notably trickster-like */
export interface CorvidDeity {
  id: string;
  entityType: 'animal_deity';
  speciesCategory: 'corvid';

  callName: {
    pattern: string;  // Description of call
    meaning: string;
  };

  translatedName: string;

  domain: CorvidDivineDomain;
  secondaryDomains: CorvidDivineDomain[];

  /** Corvid gods are often tricksters */
  tricksterAspect: number; // 0-1, how much of a trickster

  /** Nature */
  perceivedNature: 'great_raven' | 'flock_spirit' | 'sky_presence' | 'ancestor_bird';

  manifestation: {
    form: 'enormous_corvid' | 'flock_shape' | 'shadow' | 'shiny_object';
    presenceSigns: string[];
  };

  /** Corvid offerings are unique */
  pleasingGifts: ('shiny_object' | 'food_share' | 'puzzle_solving' | 'trick_played' | 'territory_defended')[];

  corvidBelief: number;
}

// ============================================================================
// Cross-Species Belief
// ============================================================================

/** When animals believe in gods of other species */
export interface CrossSpeciesBelief {
  /** The believing species */
  believerSpecies: SpeciesCategory;

  /** The deity's origin species */
  deityOriginSpecies: SpeciesCategory | 'human';

  /** How well can they perceive the deity? */
  perceptionClarity: 'none' | 'vague' | 'distorted' | 'partial' | 'clear';

  /** How do they interpret the deity? */
  interpretation: string;

  /** Is the belief effective? (Does the deity receive the belief?) */
  beliefTransferRate: number; // 0-1

  /** Can the deity respond to this believer? */
  responseCapability: 'none' | 'limited' | 'full';
}

/** Factors affecting cross-species divine perception */
export function calculateCrossSpeciesPerception(
  believerIntelligence: number,
  believerSpecies: SpeciesCategory,
  deitySpecies: SpeciesCategory | 'human'
): CrossSpeciesBelief['perceptionClarity'] {
  // Same species always clear
  if (believerSpecies === deitySpecies) return 'clear';

  // Need high intelligence for cross-species perception
  if (believerIntelligence < 0.7) return 'none';

  // Similar species can perceive each other
  const similarPairs: Array<[SpeciesCategory, SpeciesCategory]> = [
    ['canid', 'felid'],
    ['canid', 'ursid'],
    ['cetacean', 'cephalopod'],
    ['corvid', 'avian_raptor'],
    ['primate', 'pachyderm'],
  ];

  const areSimilar = similarPairs.some(
    ([a, b]) =>
      (believerSpecies === a && deitySpecies === b) ||
      (believerSpecies === b && deitySpecies === a)
  );

  if (areSimilar) {
    return believerIntelligence >= 0.85 ? 'partial' : 'distorted';
  }

  // Human gods are strange to animals
  if (deitySpecies === 'human') {
    if (believerIntelligence >= 0.9) return 'distorted';
    if (believerIntelligence >= 0.8) return 'vague';
    return 'none';
  }

  // Very high intelligence can perceive any deity faintly
  if (believerIntelligence >= 0.95) return 'vague';

  return 'none';
}

// ============================================================================
// Animal Worship Activities
// ============================================================================

/** Activities that generate belief for animal deities */
export type AnimalWorshipActivity =
  | 'group_vocalization'    // Howling, singing, calling together
  | 'synchronized_movement' // Moving as one
  | 'ritual_feeding'        // Sharing food in particular ways
  | 'territory_marking'     // Scent/sound marking of sacred places
  | 'elder_following'       // Learning from and respecting elders
  | 'death_mourning'        // Grieving behaviors
  | 'birth_celebration'     // Welcoming young
  | 'seasonal_gathering'    // Migration, hibernation preparation
  | 'play_ritual'           // Structured play as worship
  | 'silence_keeping'       // Communal quiet (rare)
  | 'gift_giving'           // Offering items (corvids, primates)
  | 'sacred_site_visit';    // Visiting traditional locations

/** Belief generation rates for animal activities */
export const ANIMAL_BELIEF_RATES: Record<AnimalWorshipActivity, number> = {
  group_vocalization: 0.15,
  synchronized_movement: 0.2,
  ritual_feeding: 0.1,
  territory_marking: 0.05,
  elder_following: 0.08,
  death_mourning: 0.5,
  birth_celebration: 0.3,
  seasonal_gathering: 1.0,
  play_ritual: 0.12,
  silence_keeping: 0.25,
  gift_giving: 0.3,
  sacred_site_visit: 0.8,
};

// ============================================================================
// Factory Functions
// ============================================================================

/** Get divine perception for a species category */
export function getSpeciesDivinePerception(species: SpeciesCategory): SpeciesDivinePerception {
  const perceptions: Partial<Record<SpeciesCategory, SpeciesDivinePerception>> = {
    cetacean: {
      primarySenses: ['echolocation', 'song', 'pressure'],
      sacredConcepts: ['the deep', 'the song', 'the breath', 'the current'],
      sacredPlaceTypes: ['deep trenches', 'feeding grounds', 'breeding waters', 'migration paths'],
      worshipActivities: ['singing', 'diving deep', 'breaching', 'pod gathering'],
      divineConceptualization: 'ancestral',
      humanGodPerception: 'faint',
      perceptibleToHumans: 'different',
    },
    corvid: {
      primarySenses: ['vision', 'scent'],
      sacredConcepts: ['cleverness', 'collection', 'the flock', 'death-transformation'],
      sacredPlaceTypes: ['high roosts', 'battlefields', 'crossroads', 'caches'],
      worshipActivities: ['collecting', 'caching', 'mobbing', 'gift-giving'],
      divineConceptualization: 'ancestral',
      humanGodPerception: 'different',
      perceptibleToHumans: 'faint',
    },
    canid: {
      primarySenses: ['scent', 'vision'],
      sacredConcepts: ['the pack', 'the territory', 'the hunt', 'the howl'],
      sacredPlaceTypes: ['dens', 'hunting grounds', 'territory borders', 'gathering places'],
      worshipActivities: ['howling', 'pack running', 'territory patrol', 'elder respect'],
      divineConceptualization: 'pack_spirit',
      humanGodPerception: 'faint',
      perceptibleToHumans: 'faint',
    },
    pachyderm: {
      primarySenses: ['vibration', 'scent'],
      sacredConcepts: ['memory', 'the herd', 'ancestors', 'water'],
      sacredPlaceTypes: ['water holes', 'migration paths', 'bone yards', 'ancient trees'],
      worshipActivities: ['mourning', 'memory-keeping', 'path-following', 'protecting young'],
      divineConceptualization: 'ancestral',
      humanGodPerception: 'different',
      perceptibleToHumans: 'different',
    },
  };

  return (
    perceptions[species] ?? {
      primarySenses: ['vision', 'scent'],
      sacredConcepts: ['survival', 'territory', 'family'],
      sacredPlaceTypes: ['dens', 'feeding areas'],
      worshipActivities: ['group behavior'],
      divineConceptualization: 'territorial',
      humanGodPerception: 'none',
      perceptibleToHumans: 'none',
    }
  );
}

/** Create a cetacean deity with defaults */
export function createCetaceanDeity(
  id: string,
  translatedName: string,
  domain: CetaceanDivineDomain,
  nature: CetaceanDeityNature = 'ancient_whale'
): CetaceanDeity {
  return {
    id,
    entityType: 'animal_deity',
    speciesCategory: 'cetacean',
    songName: {
      duration: 30,
      frequencyRange: [20, 200],
      description: `The song-name of ${translatedName}`,
      tradition: 'all-pods',
    },
    translatedName,
    songEpithets: [],
    domain,
    secondaryDomains: [],
    perceivedNature: nature,
    manifestation: {
      form: nature === 'song_spirit' ? 'song_only' : 'great_whale',
      scale: 'vast',
      visibility: 'to_believers',
      presenceSigns: ['strange currents', 'distant singing', 'unusual light in depths'],
    },
    pleasingActs: ['long_song', 'deep_dive', 'teaching_young'],
    offensiveActs: ['abandoning pod', 'silence when song expected', 'fleeing sacred waters'],
    cetaceanBelief: 0,
    humanPerceptible: false,
  };
}

/** Create predefined whale deities */
export function createWhalePatheon(): CetaceanDeity[] {
  return [
    {
      id: 'whale-god-deep',
      entityType: 'animal_deity',
      speciesCategory: 'cetacean',
      songName: {
        duration: 120,
        frequencyRange: [15, 25],
        description: 'The Deepest Note - a subsonic rumble that travels for miles',
        tradition: 'all-pods',
      },
      translatedName: 'The Dweller in Darkness',
      songEpithets: [
        {
          duration: 20,
          frequencyRange: [15, 30],
          description: 'The Pressure Singer',
          tradition: 'deep-divers',
        },
      ],
      domain: 'the_deep',
      secondaryDomains: ['the_silence', 'the_echo'],
      perceivedNature: 'depth_presence',
      manifestation: {
        form: 'pressure_change',
        scale: 'vast',
        visibility: 'in_sacred_waters',
        presenceSigns: ['crushing pressure', 'bioluminescent flashes', 'the feeling of being watched'],
      },
      pleasingActs: ['deep_dive', 'silence_keeping'],
      offensiveActs: ['surface dwelling', 'fear of depth'],
      cetaceanBelief: 0,
      humanPerceptible: false,
    },
    {
      id: 'whale-god-song',
      entityType: 'animal_deity',
      speciesCategory: 'cetacean',
      songName: {
        duration: 600,
        frequencyRange: [50, 500],
        description: 'The Eternal Song - a complex pattern that takes hours to complete',
        tradition: 'all-pods',
      },
      translatedName: 'The Memory of All Songs',
      songEpithets: [
        {
          duration: 45,
          frequencyRange: [100, 300],
          description: 'Mother of Melodies',
          tradition: 'humpback',
        },
      ],
      domain: 'the_song',
      secondaryDomains: ['the_remembrance', 'the_pod'],
      perceivedNature: 'song_spirit',
      manifestation: {
        form: 'song_only',
        scale: 'variable',
        visibility: 'to_believers',
        presenceSigns: ['harmonics in the water', 'songs from empty ocean', 'remembered melodies'],
      },
      pleasingActs: ['long_song', 'teaching_young'],
      offensiveActs: ['forgetting songs', 'silence'],
      cetaceanBelief: 0,
      humanPerceptible: true,
      humanInterpretation: 'Sailors hear strange singing from the deep - they call it "ghost whales" or "mermaids"',
    },
    {
      id: 'whale-god-breath',
      entityType: 'animal_deity',
      speciesCategory: 'cetacean',
      songName: {
        duration: 5,
        frequencyRange: [200, 1000],
        description: 'The First Gasp - a sharp, rising cry',
        tradition: 'all-pods',
      },
      translatedName: 'She Who Gives Breath',
      songEpithets: [
        {
          duration: 10,
          frequencyRange: [400, 800],
          description: 'The Surface Bringer',
          tradition: 'calving-grounds',
        },
      ],
      domain: 'the_breath',
      secondaryDomains: ['the_breach', 'the_pod'],
      perceivedNature: 'breath_giver',
      manifestation: {
        form: 'great_whale',
        scale: 'enormous',
        visibility: 'always',
        presenceSigns: ['calm waters', 'easy breathing', 'rainbows in spray'],
      },
      pleasingActs: ['synchronized_breach', 'teaching_young', 'feeding_share'],
      offensiveActs: ['leaving calves', 'breathing alone'],
      cetaceanBelief: 0,
      humanPerceptible: true,
      humanInterpretation: 'Whalers sometimes speak of a great white whale that appears before storms - some fear her, others say she saves drowning sailors',
    },
    {
      id: 'whale-god-wound',
      entityType: 'animal_deity',
      speciesCategory: 'cetacean',
      songName: {
        duration: 300,
        frequencyRange: [30, 80],
        description: 'The Mourning Call - a keening, mournful pattern',
        tradition: 'hunted-pods',
      },
      translatedName: 'The Scarred One',
      songEpithets: [
        {
          duration: 60,
          frequencyRange: [40, 60],
          description: 'Bearer of Harpoons',
          tradition: 'hunted-pods',
        },
      ],
      domain: 'the_wound',
      secondaryDomains: ['the_silence', 'the_remembrance'],
      perceivedNature: 'ancient_whale',
      manifestation: {
        form: 'great_whale',
        scale: 'enormous',
        visibility: 'to_believers',
        presenceSigns: ['old scars visible in the water', 'blood in memory', 'the sound of ships'],
      },
      pleasingActs: ['silence_keeping', 'visiting_site'],
      offensiveActs: ['approaching ships willingly', 'forgetting the dead'],
      cetaceanBelief: 0,
      humanPerceptible: false,
      humanInterpretation: undefined,
    },
  ];
}

/** Create a pack deity */
export function createPackDeity(
  id: string,
  speciesCategory: 'canid' | 'felid' | 'ursid' | 'ungulate',
  translatedName: string,
  domain: PackDivineDomain
): PackDeity {
  const vocType: VocalizationPattern['type'] =
    speciesCategory === 'canid'
      ? 'howl'
      : speciesCategory === 'felid'
        ? 'roar'
        : speciesCategory === 'ursid'
          ? 'growl'
          : 'call';

  return {
    id,
    entityType: 'animal_deity',
    speciesCategory,
    callName: {
      type: vocType,
      description: `The ${vocType} that calls ${translatedName}`,
      meaning: translatedName,
    },
    translatedName,
    domain,
    secondaryDomains: [],
    perceivedNature: 'pack_spirit',
    manifestation: {
      form: 'great_beast',
      presenceSigns: ['scent on the wind', 'tracks appearing', 'prey abundance'],
    },
    devotionActs: ['howling together', 'pack running', 'sharing the kill'],
    packBelief: 0,
  };
}

/** Create a corvid deity */
export function createCorvidDeity(
  id: string,
  translatedName: string,
  domain: CorvidDivineDomain,
  tricksterAspect: number = 0.5
): CorvidDeity {
  return {
    id,
    entityType: 'animal_deity',
    speciesCategory: 'corvid',
    callName: {
      pattern: 'A complex series of caws and clicks',
      meaning: translatedName,
    },
    translatedName,
    domain,
    secondaryDomains: [],
    tricksterAspect,
    perceivedNature: 'great_raven',
    manifestation: {
      form: tricksterAspect > 0.7 ? 'shadow' : 'enormous_corvid',
      presenceSigns: ['unusual crow behavior', 'lost items appearing', 'strange calls'],
    },
    pleasingGifts: ['shiny_object', 'food_share', 'puzzle_solving'],
    corvidBelief: 0,
  };
}

/** Calculate belief generation for animal worship */
export function calculateAnimalBeliefGeneration(
  activity: AnimalWorshipActivity,
  intelligence: number,
  groupSize: number = 1
): number {
  const baseRate = ANIMAL_BELIEF_RATES[activity];
  const intelligenceMultiplier = Math.max(0.5, intelligence);
  const groupBonus = Math.log2(Math.max(1, groupSize)) * 0.1;

  return baseRate * intelligenceMultiplier * (1 + groupBonus);
}
