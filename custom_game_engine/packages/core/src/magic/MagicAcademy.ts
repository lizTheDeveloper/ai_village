/**
 * MagicAcademy - Institutions for learning multiple compatible paradigms
 *
 * Academies are organizations that teach related magic systems together,
 * providing:
 * - Shared curricula between compatible paradigms
 * - Cross-paradigm synergy bonuses
 * - Tutoring/mentorship mechanics
 * - Physical locations with narrative significance
 * - Social structures (ranks, faculty, students)
 *
 * Integrates with:
 * - MagicSkillTree (per-paradigm progression)
 * - ParadigmComposition (multi-paradigm casters)
 * - Literary Surrealism concepts (narrative architecture)
 */

import type { MagicSkillNode, MagicXPSource } from './MagicSkillTree.js';
import type { ParadigmRelationship, HybridAbility } from './ParadigmComposition.js';
import type { MagicTechnique, MagicForm } from '../components/MagicComponent.js';

// ============================================================================
// Academy Core Types
// ============================================================================

/** Categories of magical institution */
export type AcademyType =
  | 'university'       // Formal scholarly institution (Sympathy, Academic, Rune)
  | 'conservatory'     // Performance-based (Song, Emotional, Pun, Narrative)
  | 'temple'           // Relationship with entities (Divine, Shinto, Pact, Daemon)
  | 'guild'            // Practical craft focus (Blood, Breath, Allomancy)
  | 'circle'           // Informal gathering (Dream, Wild)
  | 'monastery'        // Meditative practice (Name, academic disciplines)
  | 'scriptorium';     // Literary Surrealism focus (Narrative, Pun, Poetic)

/** How knowledge is transmitted in this academy */
export type TeachingMethod =
  | 'lecture'          // Traditional classroom instruction
  | 'apprenticeship'   // One-on-one mentorship
  | 'practice'         // Learn by doing
  | 'performance'      // Learn through artistic expression
  | 'ritual'           // Ceremonial transmission
  | 'meditation'       // Internal discovery
  | 'osmosis'          // Passive absorption from environment
  | 'ordeal'           // Trial/challenge-based learning
  | 'composition'      // Create works to learn (writing, music)
  | 'debate';          // Dialectic/argumentative learning

/** Requirements to join an academy */
export interface AcademyAdmissionRequirement {
  /** Type of requirement */
  type: 'skill' | 'aptitude' | 'bloodline' | 'sponsorship' | 'trial' | 'offering' | 'oath';

  /** Human-readable description */
  description: string;

  /** Specific parameters */
  params?: {
    skillId?: string;
    skillLevel?: number;
    aptitudeTest?: string;
    bloodlineType?: string;
    sponsorRank?: string;
    trialId?: string;
    offeringType?: string;
    oathText?: string;
  };

  /** Is this waivable with exceptional circumstances? */
  waivable?: boolean;
}

/** Ranks within an academy */
export interface AcademyRank {
  id: string;
  name: string;
  level: number;  // 0 = novice, higher = more senior

  /** Requirements to achieve this rank */
  requirements: {
    /** Minimum time at previous rank (ticks) */
    minTimeAtPreviousRank?: number;
    /** Nodes that must be unlocked */
    requiredNodes?: string[];
    /** Minimum mastery in primary paradigm */
    minMastery?: number;
    /** Must have taught X students */
    studentsTeaching?: number;
    /** Must have completed specific achievements */
    achievements?: string[];
  };

  /** Privileges granted at this rank */
  privileges: {
    /** Can teach students up to this level below their own */
    canTeachLevelsBelow?: number;
    /** Access to restricted sections */
    accessAreas?: string[];
    /** Voting rights in academy governance */
    votingRights?: boolean;
    /** Can propose new research/curriculum */
    canPropose?: boolean;
    /** Stipend multiplier */
    stipendMultiplier?: number;
  };

  /** Title used for this rank */
  title: string;

  /** Lore description */
  description?: string;
}

// ============================================================================
// Tutoring System
// ============================================================================

/** A tutoring relationship between teacher and student */
export interface TutoringRelationship {
  /** Teacher entity ID */
  teacherId: string;

  /** Student entity ID */
  studentId: string;

  /** Which paradigm(s) being taught */
  paradigmIds: string[];

  /** Academy context (if any) */
  academyId?: string;

  /** Current focus area */
  currentFocus?: {
    nodeId?: string;
    technique?: MagicTechnique;
    form?: MagicForm;
    customTopic?: string;
  };

  /** Teaching quality factors */
  quality: {
    /** Teacher's teaching skill (0-100) */
    teacherSkill: number;
    /** Student's learning aptitude (0-100) */
    studentAptitude: number;
    /** Relationship quality (affects XP transfer) */
    rapport: number;
    /** Teaching method compatibility */
    methodMatch: number;
  };

  /** Session tracking */
  sessions: {
    totalSessions: number;
    lastSessionTick: number;
    averageXpPerSession: number;
    breakthrough: boolean;  // Has had a major learning breakthrough
  };

  /** Bonuses from this relationship */
  bonuses: {
    /** XP multiplier from good teaching */
    xpMultiplier: number;
    /** Reduced cost for node unlocks */
    costReduction: number;
    /** Access to teacher's discovered knowledge */
    sharedDiscoveries: string[];
  };
}

/** Configuration for a tutoring session */
export interface TutoringSession {
  /** Duration in ticks */
  duration: number;

  /** What's being taught */
  topic: {
    nodeId?: string;
    paradigmId: string;
    technique?: MagicTechnique;
    form?: MagicForm;
    customTopic?: string;
  };

  /** Teaching method used */
  method: TeachingMethod;

  /** Location bonuses */
  locationBonus?: number;

  /** Props/materials used */
  materials?: string[];
}

/** Result of a tutoring session */
export interface TutoringResult {
  /** XP gained by student */
  xpGained: number;

  /** Nodes that can now be unlocked (conditions met) */
  nodesUnlocked?: string[];

  /** Discoveries shared */
  discoveriesShared?: string[];

  /** Rapport change */
  rapportChange: number;

  /** Special events */
  events?: Array<{
    type: 'breakthrough' | 'frustration' | 'insight' | 'debate' | 'demonstration';
    description: string;
    effect?: string;
  }>;

  /** Teacher also learned something? */
  teacherInsight?: {
    xpGained: number;
    description: string;
  };
}

// ============================================================================
// Academy Definition
// ============================================================================

/**
 * A magic academy - an institution for learning related paradigms together.
 */
export interface MagicAcademy {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Type of institution */
  type: AcademyType;

  /** Description */
  description: string;

  /** Extended lore */
  lore?: string;

  // ---- Paradigm Configuration ----

  /** Primary paradigms taught (full curriculum) */
  primaryParadigms: string[];

  /** Secondary paradigms (electives, partial access) */
  secondaryParadigms?: string[];

  /** Hybrid paradigms that can be learned here */
  hybridParadigms?: string[];

  /** Relationships between paradigms within this academy */
  internalRelationships: Record<string, ParadigmRelationship>;

  // ---- Curriculum ----

  /** Shared skill nodes available to all academy members */
  sharedCurriculum: AcademySkillNode[];

  /** Cross-paradigm abilities unlocked by academy training */
  crossParadigmAbilities: HybridAbility[];

  /** XP sources specific to this academy */
  academyXpSources: MagicXPSource[];

  // ---- Teaching ----

  /** Preferred teaching methods */
  teachingMethods: TeachingMethod[];

  /** Teaching effectiveness bonuses */
  teachingBonuses: {
    /** XP multiplier for academy-based tutoring */
    tutoringMultiplier: number;
    /** Bonus for matching teaching method */
    methodMatchBonus: number;
    /** Group learning bonus (per additional student, up to cap) */
    groupLearningBonus: number;
    /** Maximum effective group size */
    maxGroupSize: number;
  };

  // ---- Structure ----

  /** Ranks within the academy */
  ranks: AcademyRank[];

  /** Admission requirements */
  admissionRequirements: AcademyAdmissionRequirement[];

  /** Can non-members take classes? */
  allowsVisitors: boolean;

  /** Physical location type */
  locationType?: 'fixed' | 'mobile' | 'virtual' | 'narrative';

  /** Narrative architecture (Literary Surrealism integration) */
  narrativeStructure?: {
    /** Building follows story logic */
    storyStructure?: 'three_act' | 'heros_journey' | 'tragedy' | 'comedy' | 'mystery';
    /** Rooms arranged by narrative beats */
    narrativeRooms?: boolean;
    /** Genre physics apply */
    genrePhysics?: string;
  };

  // ---- Benefits ----

  /** Synergy bonus when studying multiple paradigms here */
  multiParadigmBonus: {
    /** Power modifier when using paradigms together */
    powerMultiplier: number;
    /** Reduced switching cost between paradigms */
    switchingCostReduction: number;
    /** Shared resource pool percentage */
    sharedResourcePercent: number;
  };

  /** Special abilities for academy members */
  memberBenefits: string[];

  // ---- Social ----

  /** Rival/allied academies */
  relationships?: {
    allies?: string[];
    rivals?: string[];
    neutral?: string[];
  };

  /** Famous alumni or faculty */
  notableMembers?: Array<{
    name: string;
    role: 'founder' | 'faculty' | 'alumnus' | 'legendary';
    description: string;
    specialty?: string;
  }>;
}

/** A shared skill node available to all academy students */
export interface AcademySkillNode extends Omit<MagicSkillNode, 'paradigmId'> {
  /** This node is academy-wide, not paradigm-specific */
  academyId: string;

  /** Which paradigms this node synergizes with */
  synergyParadigms?: string[];

  /** Bonus effects when combined with specific paradigms */
  paradigmBonuses?: Record<string, {
    effectMultiplier: number;
    additionalEffects?: string[];
  }>;
}

// ============================================================================
// Academy Membership
// ============================================================================

/** An entity's membership in an academy */
export interface AcademyMembership {
  /** Academy ID */
  academyId: string;

  /** Current rank */
  rankId: string;

  /** When joined */
  joinedTick: number;

  /** When current rank was achieved */
  rankAchievedTick: number;

  /** Academy-specific XP (separate from paradigm XP) */
  academyXp: number;

  /** Unlocked academy nodes */
  unlockedNodes: Record<string, number>;

  /** Tutoring relationships (as teacher) */
  students?: string[];

  /** Tutoring relationship (as student) */
  mentor?: string;

  /** Standing within the academy */
  standing: 'probationary' | 'good' | 'excellent' | 'distinguished';

  /** Special roles held */
  roles?: Array<{
    roleId: string;
    title: string;
    since: number;
  }>;

  /** Achievements earned */
  achievements?: string[];
}

// ============================================================================
// Pre-defined Academies
// ============================================================================

/**
 * Academy of Formal Arts - Knowledge-based magic systems
 * Combines: Academic, Sympathy, Rune, Name
 */
export const ACADEMY_OF_FORMAL_ARTS: MagicAcademy = {
  id: 'formal_arts',
  name: 'The Academy of Formal Arts',
  type: 'university',
  description: 'Where magic is a science, studied through rigorous methodology and precise technique',

  lore: `Founded by scholars who believed magic should be measured, not merely felt.
The Academy treats magical phenomena as natural forces to be understood through
experimentation and logic. Students here learn multiple traditions, finding the
common principles underlying seemingly different systems.

The great insight of the Academy is that sympathy, runes, true names, and academic
spellcraft are all views of the same underlying reality - language that reality
understands. Whether you write a rune, speak a name, or form a sympathetic link,
you are encoding instructions in a grammar the universe must obey.`,

  primaryParadigms: ['academic', 'sympathy', 'rune', 'name'],
  secondaryParadigms: ['breath', 'dimensional'],
  hybridParadigms: ['namebreath'],

  internalRelationships: {
    'academic_sympathy': 'synergistic',
    'academic_rune': 'synergistic',
    'academic_name': 'synergistic',
    'sympathy_rune': 'coexistent',
    'sympathy_name': 'synergistic',
    'rune_name': 'synergistic',
  },

  sharedCurriculum: [
    {
      id: 'formal_foundation',
      academyId: 'formal_arts',
      name: 'Formal Magical Theory',
      description: 'Understanding the mathematical principles underlying all formal magic',
      category: 'foundation',
      tier: 0,
      xpCost: 50,
      maxLevel: 3,
      effects: [
        { type: 'paradigm_proficiency', baseValue: 5, perLevelValue: 3 },
      ],
      unlockConditions: [],
      conditionMode: 'all',
    },
    {
      id: 'precision_training',
      academyId: 'formal_arts',
      name: 'Precision Training',
      description: 'Develops the exactness required for all formal magical work',
      category: 'channeling',
      tier: 1,
      xpCost: 100,
      maxLevel: 5,
      effects: [
        { type: 'rune_precision', baseValue: 10, perLevelValue: 5 },
        { type: 'alar_strength', baseValue: 5, perLevelValue: 3 },
      ],
      unlockConditions: [
        { type: 'node_unlocked', params: { nodeId: 'formal_foundation' }, description: 'Complete Formal Magical Theory' },
      ],
      conditionMode: 'all',
      synergyParadigms: ['rune', 'sympathy'],
    },
    {
      id: 'cross_system_analysis',
      academyId: 'formal_arts',
      name: 'Cross-System Analysis',
      description: 'Learn to see patterns across different magical traditions',
      category: 'hybrid',
      tier: 2,
      xpCost: 200,
      maxLevel: 3,
      effects: [
        { type: 'unlock_ability', baseValue: 1, target: { abilityId: 'paradigm_translation' } },
      ],
      unlockConditions: [
        { type: 'magic_proficiency', params: { proficiencyLevel: 30 }, description: 'Reach proficiency 30 in any two paradigms' },
      ],
      conditionMode: 'all',
    },
  ],

  crossParadigmAbilities: [
    {
      id: 'runic_sympathy',
      name: 'Runic Sympathy',
      description: 'Carve runes that create permanent sympathetic links',
      requiredParadigms: ['rune', 'sympathy'],
      minimumMastery: 30,
      uniqueEffects: ['Runes maintain sympathetic connections indefinitely', 'No alar required to maintain'],
    },
    {
      id: 'named_inscription',
      name: 'Named Inscription',
      description: 'Write true names as runes for amplified effect',
      requiredParadigms: ['rune', 'name'],
      minimumMastery: 40,
      uniqueEffects: ['True name runes command their subjects', 'Cannot be defaced without knowing the name'],
    },
    {
      id: 'academic_naming',
      name: 'Taxonomic Naming',
      description: 'Academic classification reveals partial true names',
      requiredParadigms: ['academic', 'name'],
      minimumMastery: 25,
      uniqueEffects: ['Scientific names grant minor power over creatures', 'Cataloging beings reveals name fragments'],
    },
  ],

  academyXpSources: [
    { eventType: 'research_completed', xpAmount: 50, description: 'Complete a research project' },
    { eventType: 'thesis_defended', xpAmount: 200, description: 'Defend a magical thesis' },
    { eventType: 'student_taught', xpAmount: 20, description: 'Teach a student successfully' },
    { eventType: 'cross_paradigm_discovery', xpAmount: 100, description: 'Discover a cross-paradigm principle' },
  ],

  teachingMethods: ['lecture', 'practice', 'debate', 'apprenticeship'],

  teachingBonuses: {
    tutoringMultiplier: 1.5,
    methodMatchBonus: 0.2,
    groupLearningBonus: 0.1,
    maxGroupSize: 12,
  },

  ranks: [
    { id: 'novice', name: 'Novice', level: 0, title: 'Novice',
      requirements: {}, privileges: {}, description: 'New student' },
    { id: 'apprentice', name: 'Apprentice', level: 1, title: 'Apprentice',
      requirements: { minTimeAtPreviousRank: 10000, minMastery: 15 },
      privileges: { accessAreas: ['library_general'] } },
    { id: 'journeyman', name: 'Journeyman', level: 2, title: 'Journeyman',
      requirements: { minTimeAtPreviousRank: 50000, minMastery: 35 },
      privileges: { canTeachLevelsBelow: 1, accessAreas: ['library_general', 'laboratory'] } },
    { id: 'adept', name: 'Adept', level: 3, title: 'Adept',
      requirements: { minTimeAtPreviousRank: 100000, minMastery: 55, studentsTeaching: 1 },
      privileges: { canTeachLevelsBelow: 2, accessAreas: ['library_general', 'laboratory', 'archives'], canPropose: true } },
    { id: 'master', name: 'Master', level: 4, title: 'Master',
      requirements: { minTimeAtPreviousRank: 200000, minMastery: 75, studentsTeaching: 3 },
      privileges: { canTeachLevelsBelow: 3, votingRights: true, accessAreas: ['all'], stipendMultiplier: 2.0 } },
    { id: 'archmage', name: 'Archmage', level: 5, title: 'Archmage',
      requirements: { minMastery: 90, achievements: ['published_treatise', 'paradigm_mastery'] },
      privileges: { canTeachLevelsBelow: 5, votingRights: true, canPropose: true, stipendMultiplier: 5.0 } },
  ],

  admissionRequirements: [
    { type: 'aptitude', description: 'Pass the Formal Arts Aptitude Examination',
      params: { aptitudeTest: 'formal_aptitude' } },
    { type: 'offering', description: 'Tuition payment or scholarship',
      params: { offeringType: 'tuition' }, waivable: true },
  ],

  allowsVisitors: true,
  locationType: 'fixed',

  multiParadigmBonus: {
    powerMultiplier: 1.3,
    switchingCostReduction: 0.5,
    sharedResourcePercent: 0.2,
  },

  memberBenefits: [
    'Access to the Great Library',
    'Shared laboratory spaces',
    'Cross-paradigm tutoring',
    'Research stipends',
    'Publishing rights',
  ],

  notableMembers: [
    { name: 'Archon Veriditas', role: 'founder', description: 'First to codify cross-paradigm principles',
      specialty: 'Paradigm Translation' },
    { name: 'Master Kvothe', role: 'faculty', description: 'Legendary sympathist and namer',
      specialty: 'Sympathy and Naming' },
  ],
};

/**
 * Conservatory of Expression - Performance and artistic magic
 * Combines: Song, Emotional, Pun, Narrative (+ Literary Surrealism)
 */
export const CONSERVATORY_OF_EXPRESSION: MagicAcademy = {
  id: 'expression',
  name: 'The Conservatory of Expression',
  type: 'conservatory',
  description: 'Where magic is art, and art is magic made manifest',

  lore: `Music. Words. Stories. Feelings. These are not mere communication—they are
power. The Conservatory teaches that expression shapes reality directly. A
perfectly told story rewrites causality. A flawless song restructures matter.
A genuine emotion creates tangible force.

The building itself follows narrative logic. The practice halls are arranged
like acts of a play. The corridors rhyme. The architecture has meter. Even
the furniture participates in the story being told within its walls.

Students learn that sincerity is power. The false note fails not because of
physics but because of narrative truth. The forced emotion creates no force.
The derivative story rewrites nothing.`,

  primaryParadigms: ['song', 'emotional', 'narrative', 'pun'],
  secondaryParadigms: ['name', 'breath'],
  hybridParadigms: [],

  internalRelationships: {
    'song_emotional': 'synergistic',
    'song_narrative': 'synergistic',
    'song_pun': 'coexistent',
    'emotional_narrative': 'synergistic',
    'emotional_pun': 'isolated',
    'narrative_pun': 'synergistic',
  },

  sharedCurriculum: [
    {
      id: 'expressive_foundation',
      academyId: 'expression',
      name: 'Fundamentals of Expression',
      description: 'Learn that sincerity is the source of all expressive power',
      category: 'foundation',
      tier: 0,
      xpCost: 40,
      maxLevel: 3,
      effects: [
        { type: 'paradigm_proficiency', baseValue: 5, perLevelValue: 3 },
        { type: 'harmony_bonus', baseValue: 5, perLevelValue: 2 },
      ],
      unlockConditions: [],
      conditionMode: 'all',
    },
    {
      id: 'metaphor_mastery',
      academyId: 'expression',
      name: 'Metaphor Literalization',
      description: 'Learn to make metaphors become literally true',
      category: 'specialization',
      tier: 1,
      xpCost: 150,
      maxLevel: 5,
      effects: [
        { type: 'unlock_ability', baseValue: 1, target: { abilityId: 'literal_metaphor' } },
      ],
      unlockConditions: [
        { type: 'node_unlocked', params: { nodeId: 'expressive_foundation' }, description: 'Complete Fundamentals' },
      ],
      conditionMode: 'all',
      lore: 'Call something "sharp as a tack" and watch it cut',
    },
    {
      id: 'punctuation_magic',
      academyId: 'expression',
      name: 'Punctuation Magic',
      description: 'Master the power of periods, exclamations, and questions',
      category: 'specialization',
      tier: 2,
      xpCost: 200,
      maxLevel: 3,
      effects: [
        { type: 'unlock_ability', baseValue: 1, target: { abilityId: 'punctuation_casting' } },
      ],
      unlockConditions: [
        { type: 'skill_level', params: { skillId: 'calligraphy', skillLevel: 30 }, description: 'Master calligraphy' },
      ],
      conditionMode: 'all',
      lore: 'A perfectly formed exclamation point is a weapon',
    },
    {
      id: 'word_physics',
      academyId: 'expression',
      name: 'Word Physics',
      description: 'Understand that words have mass, momentum, and gravity',
      category: 'foundation',
      tier: 1,
      xpCost: 100,
      maxLevel: 4,
      effects: [
        { type: 'paradigm_proficiency', baseValue: 10, perLevelValue: 5 },
      ],
      unlockConditions: [],
      conditionMode: 'all',
      lore: 'Heavy words sink into the floor. Light words float like bubbles.',
    },
    {
      id: 'narrative_awareness',
      academyId: 'expression',
      name: 'Narrative Awareness',
      description: 'Learn to sense which story you are in',
      category: 'specialization',
      tier: 2,
      xpCost: 250,
      maxLevel: 3,
      effects: [
        { type: 'perception', baseValue: 15, perLevelValue: 10, description: 'Perceive narrative tropes and story beats' },
      ],
      unlockConditions: [
        { type: 'secret_revealed', params: { secretId: 'narrative_nature' }, description: 'Realize you are in a story' },
      ],
      conditionMode: 'all',
    },
  ],

  crossParadigmAbilities: [
    {
      id: 'emotional_song',
      name: 'Songs That Feel',
      description: 'Music that directly channels and transmits emotion',
      requiredParadigms: ['song', 'emotional'],
      minimumMastery: 25,
      uniqueEffects: ['Songs bypass emotional resistance', 'Emotions can be stored in melodies'],
    },
    {
      id: 'story_song',
      name: 'Narrative Ballads',
      description: 'Songs that alter reality through story logic',
      requiredParadigms: ['song', 'narrative'],
      minimumMastery: 35,
      uniqueEffects: ['Ballads make their stories true', 'Prophecy songs become self-fulfilling'],
    },
    {
      id: 'pun_song',
      name: 'Comic Opera',
      description: 'Musical wordplay with doubled effect',
      requiredParadigms: ['song', 'pun'],
      minimumMastery: 20,
      uniqueEffects: ['Sung puns are twice as powerful', 'Rhyming puns cause chain reactions'],
    },
    {
      id: 'narrative_emotion',
      name: 'Genre Moods',
      description: 'Emotions appropriate to the genre are amplified',
      requiredParadigms: ['narrative', 'emotional'],
      minimumMastery: 30,
      uniqueEffects: ['Horror stories create fear entities', 'Romance stories manifest love'],
    },
  ],

  academyXpSources: [
    { eventType: 'performance_given', xpAmount: 30, description: 'Give a magical performance' },
    { eventType: 'audience_moved', xpAmount: 50, description: 'Move an audience emotionally' },
    { eventType: 'story_completed', xpAmount: 40, description: 'Complete a narrative arc' },
    { eventType: 'pun_groaned', xpAmount: 10, description: 'Make someone groan at a pun' },
    { eventType: 'metaphor_literalized', xpAmount: 80, description: 'Successfully literalize a metaphor' },
  ],

  teachingMethods: ['performance', 'practice', 'composition', 'osmosis'],

  teachingBonuses: {
    tutoringMultiplier: 1.4,
    methodMatchBonus: 0.3,
    groupLearningBonus: 0.15,  // Choirs learn together well
    maxGroupSize: 20,
  },

  ranks: [
    { id: 'student', name: 'Student', level: 0, title: 'Student',
      requirements: {}, privileges: {} },
    { id: 'performer', name: 'Performer', level: 1, title: 'Performer',
      requirements: { minMastery: 20, achievements: ['first_performance'] },
      privileges: { accessAreas: ['practice_halls'] } },
    { id: 'artist', name: 'Artist', level: 2, title: 'Artist',
      requirements: { minMastery: 40, achievements: ['standing_ovation'] },
      privileges: { canTeachLevelsBelow: 1, accessAreas: ['practice_halls', 'composition_rooms'] } },
    { id: 'virtuoso', name: 'Virtuoso', level: 3, title: 'Virtuoso',
      requirements: { minMastery: 60, studentsTeaching: 2 },
      privileges: { canTeachLevelsBelow: 2, canPropose: true } },
    { id: 'maestro', name: 'Maestro', level: 4, title: 'Maestro',
      requirements: { minMastery: 80, achievements: ['masterwork_created'] },
      privileges: { canTeachLevelsBelow: 4, votingRights: true, stipendMultiplier: 3.0 } },
  ],

  admissionRequirements: [
    { type: 'aptitude', description: 'Demonstrate artistic talent', params: { aptitudeTest: 'artistic_expression' } },
    { type: 'trial', description: 'Perform an audition piece', params: { trialId: 'audition' } },
  ],

  allowsVisitors: true,
  locationType: 'narrative',

  narrativeStructure: {
    storyStructure: 'heros_journey',
    narrativeRooms: true,
    genrePhysics: 'musical',
  },

  multiParadigmBonus: {
    powerMultiplier: 1.4,
    switchingCostReduction: 0.3,
    sharedResourcePercent: 0.3,
  },

  memberBenefits: [
    'Practice halls with perfect acoustics',
    'Emotional storage facilities',
    'Narrative architecture navigation training',
    'Collaborative performance opportunities',
  ],
};

/**
 * Temple of Relationships - Entity-bound magic systems
 * Combines: Divine, Shinto, Pact, Daemon
 */
export const TEMPLE_OF_RELATIONSHIPS: MagicAcademy = {
  id: 'relationships',
  name: 'The Temple of Relationships',
  type: 'temple',
  description: 'Where magic flows through bonds with powers greater than mortals',

  lore: `All magic is relationship. The Temple teaches this fundamental truth.
Whether you pray to gods, negotiate with kami, bargain with demons, or bond
with your daemon, you are entering into covenant with entities of power.

The Temple is unusual in that it teaches traditions many consider opposed.
Divine priests and demonic warlocks study in adjacent wings. Shinto practitioners
and daemon-witches share meditation gardens. The Temple's philosophy is that
understanding all forms of spiritual relationship makes each practitioner
stronger—and wiser about which relationships to enter.

The central precept: "Know who you deal with. Know what they want. Know what
you offer. Then, and only then, negotiate."`,

  primaryParadigms: ['divine', 'shinto', 'pact', 'daemon'],
  secondaryParadigms: ['name', 'emotional'],
  hybridParadigms: ['theurgy'],

  internalRelationships: {
    'divine_shinto': 'coexistent',
    'divine_pact': 'exclusive',
    'divine_daemon': 'coexistent',
    'shinto_pact': 'competitive',
    'shinto_daemon': 'coexistent',
    'pact_daemon': 'coexistent',
  },

  sharedCurriculum: [
    {
      id: 'relationship_foundation',
      academyId: 'relationships',
      name: 'Principles of Sacred Relationship',
      description: 'Understand that all spiritual magic is negotiation',
      category: 'foundation',
      tier: 0,
      xpCost: 60,
      maxLevel: 3,
      effects: [
        { type: 'paradigm_proficiency', baseValue: 5, perLevelValue: 3 },
        { type: 'deity_favor_bonus', baseValue: 5, perLevelValue: 2 },
        { type: 'kami_favor_bonus', baseValue: 5, perLevelValue: 2 },
      ],
      unlockConditions: [],
      conditionMode: 'all',
    },
    {
      id: 'entity_recognition',
      academyId: 'relationships',
      name: 'Entity Recognition',
      description: 'Learn to identify and classify spiritual entities',
      category: 'specialization',
      tier: 1,
      xpCost: 100,
      maxLevel: 4,
      effects: [
        { type: 'spirit_sight', baseValue: 15, perLevelValue: 10 },
      ],
      unlockConditions: [
        { type: 'node_unlocked', params: { nodeId: 'relationship_foundation' }, description: 'Complete Principles' },
      ],
      conditionMode: 'all',
    },
    {
      id: 'taboo_navigation',
      academyId: 'relationships',
      name: 'Taboo Navigation',
      description: 'Learn the restrictions and prohibitions of various entities',
      category: 'specialization',
      tier: 1,
      xpCost: 120,
      maxLevel: 3,
      effects: [
        { type: 'purity_maintenance', baseValue: 10, perLevelValue: 5 },
        { type: 'pollution_resistance', baseValue: 10, perLevelValue: 5 },
      ],
      unlockConditions: [],
      conditionMode: 'all',
    },
    {
      id: 'offering_optimization',
      academyId: 'relationships',
      name: 'Offering Optimization',
      description: 'Learn what entities truly want and how to provide it efficiently',
      category: 'efficiency',
      tier: 2,
      xpCost: 150,
      maxLevel: 5,
      effects: [
        { type: 'offering_effectiveness', baseValue: 15, perLevelValue: 8 },
      ],
      unlockConditions: [],
      conditionMode: 'all',
    },
  ],

  crossParadigmAbilities: [
    {
      id: 'divine_kami',
      name: 'Great Kami Understanding',
      description: 'Recognize major kami as divine beings worthy of worship',
      requiredParadigms: ['divine', 'shinto'],
      minimumMastery: 30,
      uniqueEffects: ['Can worship great kami for divine favor', 'Syncretism reduces conflict between traditions'],
    },
    {
      id: 'daemon_shinto',
      name: 'Spirit Daemon',
      description: 'Understand daemon as external kami of the self',
      requiredParadigms: ['daemon', 'shinto'],
      minimumMastery: 25,
      uniqueEffects: ['Daemon can negotiate with kami', 'Purity affects daemon bond'],
    },
    {
      id: 'entity_negotiation',
      name: 'Universal Negotiation',
      description: 'Apply negotiation principles to any entity type',
      requiredParadigms: ['shinto', 'pact'],
      minimumMastery: 40,
      uniqueEffects: ['Can negotiate with entities outside your tradition', 'Reduced penalty for cross-tradition dealings'],
    },
  ],

  academyXpSources: [
    { eventType: 'ritual_performed', xpAmount: 40, description: 'Perform a proper ritual' },
    { eventType: 'offering_accepted', xpAmount: 30, description: 'Have an offering accepted' },
    { eventType: 'entity_met', xpAmount: 50, description: 'Successfully contact an entity' },
    { eventType: 'taboo_respected', xpAmount: 15, description: 'Properly respect a taboo' },
    { eventType: 'covenant_fulfilled', xpAmount: 100, description: 'Fulfill a spiritual covenant' },
  ],

  teachingMethods: ['ritual', 'meditation', 'apprenticeship', 'ordeal'],

  teachingBonuses: {
    tutoringMultiplier: 1.3,
    methodMatchBonus: 0.25,
    groupLearningBonus: 0.2,  // Community rituals
    maxGroupSize: 50,  // Large congregations
  },

  ranks: [
    { id: 'seeker', name: 'Seeker', level: 0, title: 'Seeker',
      requirements: {}, privileges: {} },
    { id: 'initiate', name: 'Initiate', level: 1, title: 'Initiate',
      requirements: { achievements: ['first_contact'] },
      privileges: { accessAreas: ['outer_temple'] } },
    { id: 'acolyte', name: 'Acolyte', level: 2, title: 'Acolyte',
      requirements: { minMastery: 30 },
      privileges: { accessAreas: ['inner_temple'], canTeachLevelsBelow: 1 } },
    { id: 'priest', name: 'Priest', level: 3, title: 'Priest/Priestess',
      requirements: { minMastery: 50, achievements: ['entity_pact'] },
      privileges: { canTeachLevelsBelow: 2, canPropose: true } },
    { id: 'high_priest', name: 'High Priest', level: 4, title: 'High Priest/Priestess',
      requirements: { minMastery: 70, studentsTeaching: 5 },
      privileges: { votingRights: true, stipendMultiplier: 2.5 } },
  ],

  admissionRequirements: [
    { type: 'oath', description: 'Swear to respect all spiritual traditions',
      params: { oathText: 'respect_oath' } },
    { type: 'trial', description: 'Complete a spiritual purification',
      params: { trialId: 'purification' } },
  ],

  allowsVisitors: true,
  locationType: 'fixed',

  multiParadigmBonus: {
    powerMultiplier: 1.2,
    switchingCostReduction: 0.4,
    sharedResourcePercent: 0.1,
  },

  memberBenefits: [
    'Access to multiple shrines and temples',
    'Entity introduction services',
    'Taboo counseling',
    'Purification facilities',
    'Cross-tradition diplomatic immunity',
  ],
};

/**
 * Guild of Vitality - Body-centered magic systems
 * Combines: Blood, Breath, Allomancy
 */
export const GUILD_OF_VITALITY: MagicAcademy = {
  id: 'vitality',
  name: 'The Guild of Vitality',
  type: 'guild',
  description: 'Where power flows from the body itself',

  lore: `The body is not merely a vessel—it is the source. Blood, breath, and the
metals you consume transform the flesh into a conduit for power. The Guild
teaches that the limits of the body are the limits of magic, but those limits
can be pushed far beyond what most believe possible.

Training here is physical as well as mystical. Breath control, blood sacrifice,
metal tolerance—all require the body to be prepared and strengthened. The
weak of body cannot walk these paths.

The Guild's practitioners are often viewed with suspicion. Blood magic carries
stigma. Allomancy is genetic and exclusive. Breath awakening is strange and
foreign. Yet within the Guild's halls, these traditions find common ground:
the sanctity and power of the living body.`,

  primaryParadigms: ['blood', 'breath', 'allomancy'],
  secondaryParadigms: ['emotional', 'sympathy'],
  hybridParadigms: ['hemomancy'],

  internalRelationships: {
    'blood_breath': 'parasitic',  // Blood drains breath
    'blood_allomancy': 'coexistent',
    'breath_allomancy': 'isolated',
  },

  sharedCurriculum: [
    {
      id: 'body_awareness',
      academyId: 'vitality',
      name: 'Somatic Awareness',
      description: 'Develop deep awareness of your body\'s magical potential',
      category: 'foundation',
      tier: 0,
      xpCost: 50,
      maxLevel: 5,
      effects: [
        { type: 'paradigm_proficiency', baseValue: 3, perLevelValue: 2 },
        { type: 'resource_max', baseValue: 10, perLevelValue: 5, target: { resourceType: 'health' } },
      ],
      unlockConditions: [],
      conditionMode: 'all',
    },
    {
      id: 'sacrifice_efficiency',
      academyId: 'vitality',
      name: 'Efficient Sacrifice',
      description: 'Learn to extract maximum power from minimum sacrifice',
      category: 'efficiency',
      tier: 1,
      xpCost: 100,
      maxLevel: 5,
      effects: [
        { type: 'cost_reduction', baseValue: 5, perLevelValue: 3, target: { resourceType: 'health' } },
        { type: 'cost_reduction', baseValue: 5, perLevelValue: 3, target: { resourceType: 'blood' } },
      ],
      unlockConditions: [
        { type: 'node_unlocked', params: { nodeId: 'body_awareness' }, description: 'Complete Somatic Awareness' },
      ],
      conditionMode: 'all',
    },
    {
      id: 'rapid_recovery',
      academyId: 'vitality',
      name: 'Rapid Recovery',
      description: 'Regenerate physical resources faster',
      category: 'resource',
      tier: 1,
      xpCost: 120,
      maxLevel: 4,
      effects: [
        { type: 'resource_regen', baseValue: 10, perLevelValue: 5 },
      ],
      unlockConditions: [],
      conditionMode: 'all',
    },
  ],

  crossParadigmAbilities: [
    {
      id: 'blood_breath',
      name: 'Vital Essence',
      description: 'Blood and breath are both life force, can substitute',
      requiredParadigms: ['blood', 'breath'],
      minimumMastery: 35,
      uniqueEffects: ['Can pay breath costs with blood', 'Can pay blood costs with heightened breath'],
    },
    {
      id: 'metal_blood',
      name: 'Ferrous Blood',
      description: 'Blood infused with metal burns longer',
      requiredParadigms: ['blood', 'allomancy'],
      minimumMastery: 40,
      uniqueEffects: ['Metal reserves regenerate from blood sacrifice', 'Blood magic can push/pull metal'],
    },
  ],

  academyXpSources: [
    { eventType: 'sacrifice_made', xpAmount: 25, description: 'Make a blood sacrifice' },
    { eventType: 'breath_held', xpAmount: 15, description: 'Successfully hold breath for awakening' },
    { eventType: 'metal_burned', xpAmount: 20, description: 'Successfully burn a metal' },
    { eventType: 'endurance_test', xpAmount: 50, description: 'Complete an endurance trial' },
  ],

  teachingMethods: ['practice', 'ordeal', 'apprenticeship'],

  teachingBonuses: {
    tutoringMultiplier: 1.2,
    methodMatchBonus: 0.3,
    groupLearningBonus: 0.05,  // Very individual training
    maxGroupSize: 5,
  },

  ranks: [
    { id: 'neophyte', name: 'Neophyte', level: 0, title: 'Neophyte',
      requirements: {}, privileges: {} },
    { id: 'practitioner', name: 'Practitioner', level: 1, title: 'Practitioner',
      requirements: { achievements: ['first_sacrifice'] },
      privileges: {} },
    { id: 'adept', name: 'Adept', level: 2, title: 'Adept',
      requirements: { minMastery: 35 },
      privileges: { canTeachLevelsBelow: 1 } },
    { id: 'master', name: 'Master', level: 3, title: 'Master',
      requirements: { minMastery: 60 },
      privileges: { canTeachLevelsBelow: 2, stipendMultiplier: 2.0 } },
  ],

  admissionRequirements: [
    { type: 'aptitude', description: 'Physical fitness test',
      params: { aptitudeTest: 'physical_fitness' } },
    { type: 'trial', description: 'Endure a minor blood sacrifice',
      params: { trialId: 'blood_trial' } },
  ],

  allowsVisitors: false,  // Secretive
  locationType: 'fixed',

  multiParadigmBonus: {
    powerMultiplier: 1.35,
    switchingCostReduction: 0.2,
    sharedResourcePercent: 0.15,
  },

  memberBenefits: [
    'Access to metal supplies',
    'Healing facilities',
    'Breath training chambers',
    'Sacrifice preparation',
  ],
};

/**
 * Circle of Dreams - Mental and consciousness magic
 * Combines: Dream, Wild (carefully)
 */
export const CIRCLE_OF_DREAMS: MagicAcademy = {
  id: 'dreams',
  name: 'The Circle of Dreams',
  type: 'circle',
  description: 'Where reality is optional and the impossible is Tuesday',

  lore: `The Circle gathers those who walk between. Dreamers and chaos-touched,
wild mages and lucid navigators. What unites them is not method but
destination: the realms where normal rules do not apply.

There is no formal structure here—how could there be? The building exists
only when enough members believe in it. Classes happen in shared dreams.
Curriculum is whatever chaos permits today.

Yet there is wisdom here. The elders know that chaos is not randomness but
pattern too complex to see. Dreams are not fantasy but reality wearing a
different face. Those who survive the Circle's training emerge able to
navigate uncertainty itself.`,

  primaryParadigms: ['dream', 'wild'],
  secondaryParadigms: ['narrative', 'emotional'],

  internalRelationships: {
    'dream_wild': 'synergistic',  // Both deal with unreality
  },

  sharedCurriculum: [
    {
      id: 'unreality_foundation',
      academyId: 'dreams',
      name: 'Foundations of Unreality',
      description: 'Learn that reality is a suggestion, not a requirement',
      category: 'foundation',
      tier: 0,
      xpCost: 40,
      maxLevel: 3,
      effects: [
        { type: 'lucidity', baseValue: 10, perLevelValue: 5 },
        { type: 'paradigm_proficiency', baseValue: 5, perLevelValue: 3 },
      ],
      unlockConditions: [],
      conditionMode: 'all',
    },
    {
      id: 'chaos_navigation',
      academyId: 'dreams',
      name: 'Chaos Navigation',
      description: 'Find patterns in apparent randomness',
      category: 'specialization',
      tier: 1,
      xpCost: 100,
      maxLevel: 4,
      effects: [
        { type: 'nightmare_resistance', baseValue: 15, perLevelValue: 10 },
      ],
      unlockConditions: [],
      conditionMode: 'all',
    },
    {
      id: 'shared_dreaming',
      academyId: 'dreams',
      name: 'Shared Dreaming',
      description: 'Enter and share dreams with others',
      category: 'specialization',
      tier: 2,
      xpCost: 200,
      maxLevel: 3,
      effects: [
        { type: 'shared_dreaming', baseValue: 1, perLevelValue: 1 },
      ],
      unlockConditions: [
        { type: 'dream_visited', params: { dreamLocationId: 'collective_dream' }, description: 'Visit the collective dream' },
      ],
      conditionMode: 'all',
    },
  ],

  crossParadigmAbilities: [
    {
      id: 'chaos_dream',
      name: 'Chaos Dreams',
      description: 'Wild magic is more controllable in dream space',
      requiredParadigms: ['dream', 'wild'],
      minimumMastery: 25,
      uniqueEffects: ['Wild surges are narratively appropriate in dreams', 'Can dream-test wild magic safely'],
    },
  ],

  academyXpSources: [
    { eventType: 'lucid_dream', xpAmount: 30, description: 'Achieve lucidity in a dream' },
    { eventType: 'wild_surge_survived', xpAmount: 40, description: 'Survive a wild magic surge' },
    { eventType: 'nightmare_conquered', xpAmount: 60, description: 'Defeat a nightmare' },
    { eventType: 'dream_shared', xpAmount: 35, description: 'Share a dream with another' },
  ],

  teachingMethods: ['meditation', 'osmosis', 'practice'],

  teachingBonuses: {
    tutoringMultiplier: 1.3,
    methodMatchBonus: 0.4,
    groupLearningBonus: 0.25,
    maxGroupSize: 7,
  },

  ranks: [
    { id: 'sleeper', name: 'Sleeper', level: 0, title: 'Sleeper',
      requirements: {}, privileges: {} },
    { id: 'dreamer', name: 'Dreamer', level: 1, title: 'Dreamer',
      requirements: { achievements: ['first_lucid_dream'] },
      privileges: {} },
    { id: 'walker', name: 'Dream Walker', level: 2, title: 'Dream Walker',
      requirements: { minMastery: 30 },
      privileges: { canTeachLevelsBelow: 1 } },
    { id: 'shaper', name: 'Dream Shaper', level: 3, title: 'Dream Shaper',
      requirements: { minMastery: 55 },
      privileges: { canTeachLevelsBelow: 2 } },
    { id: 'warden', name: 'Dream Warden', level: 4, title: 'Dream Warden',
      requirements: { minMastery: 75, achievements: ['nightmare_banished'] },
      privileges: { votingRights: true, stipendMultiplier: 2.0 } },
  ],

  admissionRequirements: [
    { type: 'aptitude', description: 'Demonstrate lucid dreaming ability',
      params: { aptitudeTest: 'lucid_dream_test' } },
  ],

  allowsVisitors: true,  // Building might not exist for them though
  locationType: 'virtual',  // Exists in shared dream

  multiParadigmBonus: {
    powerMultiplier: 1.5,  // High synergy
    switchingCostReduction: 0.6,
    sharedResourcePercent: 0.4,
  },

  memberBenefits: [
    'Shared dream-space access',
    'Nightmare counseling',
    'Chaos stabilization training',
    'Reality anchor services',
  ],
};

// ============================================================================
// Academy Registry
// ============================================================================

export const MAGIC_ACADEMY_REGISTRY: Record<string, MagicAcademy> = {
  formal_arts: ACADEMY_OF_FORMAL_ARTS,
  expression: CONSERVATORY_OF_EXPRESSION,
  relationships: TEMPLE_OF_RELATIONSHIPS,
  vitality: GUILD_OF_VITALITY,
  dreams: CIRCLE_OF_DREAMS,
};

/**
 * Get an academy by ID.
 */
export function getAcademy(id: string): MagicAcademy | undefined {
  return MAGIC_ACADEMY_REGISTRY[id];
}

/**
 * Get all academies that teach a specific paradigm.
 */
export function getAcademiesForParadigm(paradigmId: string): MagicAcademy[] {
  return Object.values(MAGIC_ACADEMY_REGISTRY).filter(
    academy =>
      academy.primaryParadigms.includes(paradigmId) ||
      academy.secondaryParadigms?.includes(paradigmId)
  );
}

/**
 * Get academies that allow learning multiple specific paradigms together.
 */
export function getAcademiesForParadigmCombination(paradigmIds: string[]): MagicAcademy[] {
  return Object.values(MAGIC_ACADEMY_REGISTRY).filter(academy => {
    const allParadigms = [...academy.primaryParadigms, ...(academy.secondaryParadigms ?? [])];
    return paradigmIds.every(id => allParadigms.includes(id));
  });
}

// ============================================================================
// Tutoring Functions
// ============================================================================

/**
 * Calculate the XP multiplier for a tutoring session.
 */
export function calculateTutoringMultiplier(
  relationship: TutoringRelationship,
  session: TutoringSession,
  academy?: MagicAcademy
): number {
  let multiplier = 1.0;

  // Base quality factors
  const qualityFactor = (
    relationship.quality.teacherSkill / 100 +
    relationship.quality.studentAptitude / 100 +
    relationship.quality.rapport / 100
  ) / 3;
  multiplier *= (0.5 + qualityFactor);  // 0.5x to 1.5x based on quality

  // Method match bonus
  if (academy?.teachingMethods.includes(session.method)) {
    multiplier *= (1 + (academy.teachingBonuses.methodMatchBonus ?? 0));
  }

  // Academy tutoring multiplier
  if (academy) {
    multiplier *= academy.teachingBonuses.tutoringMultiplier;
  }

  // Location bonus
  if (session.locationBonus) {
    multiplier *= (1 + session.locationBonus);
  }

  // Breakthrough bonus
  if (relationship.sessions.breakthrough) {
    multiplier *= 1.25;
  }

  return multiplier;
}

/**
 * Conduct a tutoring session and calculate results.
 */
export function conductTutoringSession(
  relationship: TutoringRelationship,
  session: TutoringSession,
  academy?: MagicAcademy
): TutoringResult {
  const multiplier = calculateTutoringMultiplier(relationship, session, academy);

  // Base XP from session duration
  const baseXp = Math.floor(session.duration / 100);  // 1 XP per 100 ticks
  const xpGained = Math.floor(baseXp * multiplier);

  // Rapport change based on session quality
  const rapportChange = relationship.quality.methodMatch > 0.5 ? 2 : 0;

  // Check for special events
  const events: TutoringResult['events'] = [];

  // Random chance of breakthrough (higher with good rapport)
  if (Math.random() < relationship.quality.rapport / 500) {
    events.push({
      type: 'breakthrough',
      description: 'A moment of profound understanding!',
      effect: '+50% XP for this session',
    });
  }

  // Teacher insight chance
  let teacherInsight: TutoringResult['teacherInsight'];
  if (Math.random() < 0.1) {
    teacherInsight = {
      xpGained: Math.floor(xpGained * 0.2),
      description: 'Teaching reinforced the teacher\'s own understanding',
    };
  }

  return {
    xpGained: events.some(e => e.type === 'breakthrough') ? Math.floor(xpGained * 1.5) : xpGained,
    rapportChange,
    events: events.length > 0 ? events : undefined,
    teacherInsight,
  };
}

/**
 * Create a new tutoring relationship.
 */
export function createTutoringRelationship(
  teacherId: string,
  studentId: string,
  paradigmIds: string[],
  teacherSkill: number,
  studentAptitude: number,
  academyId?: string
): TutoringRelationship {
  return {
    teacherId,
    studentId,
    paradigmIds,
    academyId,
    quality: {
      teacherSkill,
      studentAptitude,
      rapport: 50,  // Start neutral
      methodMatch: 0.5,  // Start neutral
    },
    sessions: {
      totalSessions: 0,
      lastSessionTick: 0,
      averageXpPerSession: 0,
      breakthrough: false,
    },
    bonuses: {
      xpMultiplier: 1.0,
      costReduction: 0,
      sharedDiscoveries: [],
    },
  };
}

/**
 * Create an academy membership.
 */
export function createAcademyMembership(
  academyId: string,
  currentTick: number
): AcademyMembership {
  const academy = getAcademy(academyId);
  const initialRank = academy?.ranks[0]?.id ?? 'novice';

  return {
    academyId,
    rankId: initialRank,
    joinedTick: currentTick,
    rankAchievedTick: currentTick,
    academyXp: 0,
    unlockedNodes: {},
    standing: 'good',
  };
}
