/**
 * VR Training System
 *
 * Virtual Reality training simulations for accelerated skill development.
 * Train for years in minutes. Die a thousand times without consequence.
 *
 * "The beautiful thing about virtual training is that your mistakes
 * are completely free of consequences. The terrifying thing about
 * virtual training is that you carry all those deaths with you anyway."
 *   - Commander Sarah Chen, VR Combat Academy
 *
 * "I can now perform surgery with my eyes closed. Unfortunately,
 * I learned this in a simulation where eyes were optional."
 *   - Dr. Marcus Webb, Holographic Medical School
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SystemId } from '../types.js';

// ============================================================================
// TRAINING TYPES
// ============================================================================

/**
 * Categories of VR training programs
 */
export type TrainingCategory =
  | 'combat'           // Fighting, weapons, tactics
  | 'medical'          // Surgery, diagnosis, treatment
  | 'technical'        // Engineering, repair, crafting
  | 'social'           // Negotiation, leadership, charisma
  | 'artistic'         // Music, art, performance
  | 'athletic'         // Sports, acrobatics, endurance
  | 'academic'         // Languages, sciences, history
  | 'survival'         // Wilderness, disasters, emergencies
  | 'piloting'         // Vehicles, spacecraft, drones
  | 'psychic';         // For worlds with psi abilities

/**
 * Difficulty levels for training programs
 */
export type TrainingDifficulty = 'tutorial' | 'novice' | 'intermediate' | 'advanced' | 'master' | 'impossible';

/**
 * A VR training program definition
 */
export interface TrainingProgram {
  /** Unique program ID */
  id: string;
  /** Program name */
  name: string;
  /** Humorous description */
  description: string;
  /** Category */
  category: TrainingCategory;
  /** Difficulty */
  difficulty: TrainingDifficulty;
  /** Skills trained */
  skills: string[];
  /** Time dilation factor (how much faster than real time) */
  timeDilation: number;
  /** Maximum skill level achievable */
  maxSkillLevel: number;
  /** Required prerequisites */
  prerequisites: string[];
  /** Whether program involves simulated death */
  involvesSimulatedDeath: boolean;
  /** Psychological impact (0-1) */
  psychologicalImpact: number;
  /** Creator entity ID */
  creatorId?: string;
  /** Created tick */
  createdAt: number;
}

/**
 * A training session in progress
 */
export interface TrainingSession {
  /** Session ID */
  id: string;
  /** Program being run */
  programId: string;
  /** Trainee agent ID */
  traineeId: string;
  /** Session start tick (real time) */
  startedAt: number;
  /** Session end tick (real time, null if ongoing) */
  endedAt: number | null;
  /** Simulated time elapsed (with dilation) */
  simulatedTimeElapsed: number;
  /** Simulated deaths during session */
  simulatedDeaths: number;
  /** Skill progress made */
  skillProgress: Map<string, number>;
  /** Current scenario */
  currentScenario: string;
  /** Performance rating (0-1) */
  performanceRating: number;
  /** Instructor notes */
  instructorNotes: string[];
}

/**
 * Training achievement
 */
export interface TrainingAchievement {
  /** Achievement ID */
  id: string;
  /** Achievement name */
  name: string;
  /** Description */
  description: string;
  /** When earned */
  earnedAt: number;
  /** Which program */
  programId: string;
  /** Rarity (common to legendary) */
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

// ============================================================================
// VR TRAINING COMPONENT
// ============================================================================

/**
 * Component for agents who have done VR training
 */
export interface VRTrainingComponent {
  type: 'vr_training';
  version: number;
  /** Programs completed */
  completedPrograms: string[];
  /** Total simulated hours trained */
  totalSimulatedHours: number;
  /** Total simulated deaths */
  totalSimulatedDeaths: number;
  /** Skills enhanced via VR */
  vrEnhancedSkills: Map<string, number>;
  /** Achievements earned */
  achievements: TrainingAchievement[];
  /** Current session ID (null if not training) */
  currentSessionId: string | null;
  /** Favorite training category */
  favoriteCategory?: TrainingCategory;
  /** VR addiction level (0-1) */
  vrAddictionLevel: number;
  /** Reality disassociation level (0-1) */
  realityDisassociation: number;
}

// ============================================================================
// HUMOROUS CONTENT
// ============================================================================

/**
 * Training program names by category
 */
export const TRAINING_PROGRAM_NAMES: Record<TrainingCategory, string[]> = {
  combat: [
    'Die Hard: The Tutorial',
    'One Thousand Ways To Lose (And One To Win)',
    'The Art of Getting Hit (So You Learn Not To)',
    'Violence: A Comprehensive Overview',
    'How To Punch: A Journey Of Self-Discovery',
    'Sword Training For People Who Flinch',
    'The Opposite Of Pacifism: An Introduction',
  ],
  medical: [
    'Surgery Simulator: Now With Actual Consequences',
    'Do No Harm (In The Real Version)',
    'Blood: It Should Stay Inside (Usually)',
    'Diagnosis: Probably Not What WebMD Said',
    'First Aid For People Who Faint At Blood',
    'Anatomy: Everything Is Connected To Everything',
    'The Hippocratic Suggestion',
  ],
  technical: [
    'Measure Twice, Cut Once, Simulate Infinity',
    'Why Is It On Fire: Engineering Basics',
    'Welding Without Blindness',
    'The Instruction Manual Was Wrong: A Case Study',
    'Percussive Maintenance Certification',
    'It\'s Not Broken, It\'s A Feature',
    'Reading The Error Message: An Advanced Course',
  ],
  social: [
    'Small Talk: The Infinite Horrors',
    'How To Win Friends (Simulated) And Influence People (Also Simulated)',
    'Negotiation: Getting What You Want Without Crying',
    'Public Speaking For Introverts (Audience Also Virtual)',
    'The Art of the Apology (Practice Required)',
    'Leadership: Making Mistakes Confidently',
    'Networking Without Wanting To Die',
  ],
  artistic: [
    'Drawing Hands: The Eternal Struggle',
    'Music Theory: Probably Magic',
    'Acting: Becoming Someone Better Than Yourself',
    'Dance Like Everyone Is A Hologram',
    'Painting With Light (And Regular Paint)',
    'Write What You Know (After Living A Thousand Lives)',
    'The Creative Process: Suffering Optional',
  ],
  athletic: [
    'Running: The Feet Are Supposed To Hurt',
    'Extreme Sports Without The Extreme Consequences',
    'Flexibility: Your Body Is Lying About Its Limits',
    'Endurance Training: Mind Over Simulated Matter',
    'Gymnastics: Fall A Thousand Times',
    'Swimming: Drowning Is A Learning Experience',
    'Climbing: Gravity Is Just A Suggestion',
  ],
  academic: [
    'Every Language: A Babel Fish Replacement',
    'History: Relive The Mistakes So You Don\'t Repeat Them',
    'Mathematics: Numbers Are Real (In Here)',
    'Science: Break Everything Safely',
    'Philosophy: Think In Circles Faster',
    'Economics: Pretend Money Is Real',
    'Logic: Being Right Is Not The Same As Being Happy',
  ],
  survival: [
    'Die In Every Environment Imaginable',
    'Nature Wants You Dead: A Primer',
    'Emergency Response: The Worst Day Ever (Repeated)',
    'Foraging: Is This Edible? Find Out Safely',
    'Shelter Construction: Fail Faster',
    'Fire Starting: Controlled Arson',
    'Bear Encounters: A Statistical Overview',
  ],
  piloting: [
    'Crashing Is Learning',
    'The Ground Is Lava (And Also Approaching Fast)',
    'Space: Where Nobody Can Hear You Make Mistakes',
    'Turbulence Tolerance Training',
    'Landing: The Hard Part',
    'Takeoff: The Second Hardest Part',
    'Navigation: Getting Lost On Purpose',
  ],
  psychic: [
    'Telepathy: Thoughts You Didn\'t Want To Hear',
    'Telekinesis: Breaking Everything From A Distance',
    'Precognition: Spoilers For Your Own Life',
    'Mind Over Simulated Matter',
    'Psychic Shields: Mental Spam Filtering',
    'Remote Viewing: Legal Voyeurism',
    'Empathy Training: Feeling Too Much',
  ],
};

/**
 * Training scenario descriptions
 */
export const TRAINING_SCENARIOS: Record<TrainingDifficulty, string[]> = {
  tutorial: [
    'The enemies are standing still and clearly labeled.',
    'The test has a curve. The curve is lying down.',
    'Failure is literally impossible. We checked.',
    'The only way to lose is to refuse to participate.',
  ],
  novice: [
    'The simulation is being gentle with you. For now.',
    'Mistakes are expected. Learning is optional.',
    'The training wheels are invisible but definitely there.',
    'You can do this. Probably. We have statistics.',
  ],
  intermediate: [
    'Now we find out who was paying attention.',
    'The simulation respects you enough to hurt you.',
    'Previous skills no longer save you automatically.',
    'Competence is the minimum requirement.',
  ],
  advanced: [
    'The simulation has opinions about your performance.',
    'Excellence is expected. Perfection is suggested.',
    'Every mistake costs you. Keep track.',
    'You are competing with the best version of yourself.',
  ],
  master: [
    'The simulation is actively trying to kill you.',
    'Survival is the advanced course. Victory is the final exam.',
    'You have trained for this. You are still not ready.',
    'Flawless execution is the bare minimum.',
  ],
  impossible: [
    'This scenario has never been completed. You will not be the first.',
    'The simulation apologizes in advance.',
    'All exits have been sealed. Metaphorically.',
    'Even the designers don\'t know how to win.',
    'Your simulated death is not a matter of if, but of how many times.',
  ],
};

/**
 * Achievement names and descriptions
 */
export const TRAINING_ACHIEVEMENTS: Array<{
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}> = [
  // Common
  { id: 'first_death', name: 'Welcome To The Machine', description: 'Died in a simulation for the first time.', rarity: 'common' },
  { id: 'hundred_hours', name: 'Time Well Spent (Simulated)', description: 'Accumulated 100 hours of virtual training.', rarity: 'common' },
  { id: 'multi_disciplinary', name: 'Jack of Some Trades', description: 'Completed training in 3 different categories.', rarity: 'common' },

  // Uncommon
  { id: 'hundred_deaths', name: 'Practice Makes Permanent', description: 'Died 100 times in simulations.', rarity: 'uncommon' },
  { id: 'perfect_tutorial', name: 'Overachiever', description: 'Got a perfect score on a tutorial.', rarity: 'uncommon' },
  { id: 'thousand_hours', name: 'The Matrix Has You', description: 'Accumulated 1,000 hours of virtual training.', rarity: 'uncommon' },

  // Rare
  { id: 'master_completion', name: 'The Chosen One (Simulated)', description: 'Completed a master difficulty program.', rarity: 'rare' },
  { id: 'no_death_run', name: 'Deathless (This Time)', description: 'Completed an advanced program without dying.', rarity: 'rare' },
  { id: 'all_categories', name: 'Renaissance (Virtual)', description: 'Completed training in all categories.', rarity: 'rare' },

  // Epic
  { id: 'thousand_deaths', name: 'Death Is A Suggestion', description: 'Died 1,000 times in simulations.', rarity: 'epic' },
  { id: 'impossible_attempt', name: 'Against All Odds', description: 'Attempted an impossible difficulty program.', rarity: 'epic' },
  { id: 'ten_thousand_hours', name: 'Virtual Master', description: 'Accumulated 10,000 hours of virtual training.', rarity: 'epic' },

  // Legendary
  { id: 'impossible_completion', name: 'The Impossible Dream', description: 'Somehow completed an impossible program.', rarity: 'legendary' },
  { id: 'all_master', name: 'Master of Everything (Simulated)', description: 'Completed every category at master difficulty.', rarity: 'legendary' },
  { id: 'perfect_impossible', name: 'This Cannot Be', description: 'Perfect score on impossible difficulty.', rarity: 'legendary' },
];

// ============================================================================
// VR TRAINING SYSTEM
// ============================================================================

/**
 * VR Training System
 * Manages virtual reality training programs and sessions
 */
export class VRTrainingSystem implements System {
  public readonly id: SystemId = 'vr_training';
  public readonly priority: number = 166;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus: EventBus | null = null;

  // Registered training programs
  private programs: Map<string, TrainingProgram> = new Map();

  // Active training sessions
  private sessions: Map<string, TrainingSession> = new Map();

  // Tick throttling
  private lastUpdateTick = 0;
  private static readonly UPDATE_INTERVAL = 20;

  constructor() {
    // Register default training programs
    this.registerDefaultPrograms();
  }

  public setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Register default training programs
   */
  private registerDefaultPrograms(): void {
    const categories: TrainingCategory[] = [
      'combat', 'medical', 'technical', 'social', 'artistic',
      'athletic', 'academic', 'survival', 'piloting', 'psychic',
    ];

    const difficulties: TrainingDifficulty[] = [
      'tutorial', 'novice', 'intermediate', 'advanced', 'master',
    ];

    for (const category of categories) {
      const names = TRAINING_PROGRAM_NAMES[category];
      let nameIndex = 0;

      for (const difficulty of difficulties) {
        const name = names[nameIndex % names.length]!;
        const scenarios = TRAINING_SCENARIOS[difficulty];
        const description = scenarios[Math.floor(Math.random() * scenarios.length)]!;

        const program: TrainingProgram = {
          id: `${category}_${difficulty}`,
          name: `${name} (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})`,
          description,
          category,
          difficulty,
          skills: [category],
          timeDilation: this.getTimeDilation(difficulty),
          maxSkillLevel: this.getMaxSkillLevel(difficulty),
          prerequisites: difficulty === 'tutorial' ? [] : [`${category}_${this.getPreviousDifficulty(difficulty)}`],
          involvesSimulatedDeath: difficulty !== 'tutorial',
          psychologicalImpact: this.getPsychologicalImpact(difficulty),
          createdAt: 0,
        };

        this.programs.set(program.id, program);
        nameIndex++;
      }
    }
  }

  /**
   * Create a custom training program
   */
  public createProgram(
    world: World,
    creatorEntity: Entity,
    name: string,
    description: string,
    category: TrainingCategory,
    difficulty: TrainingDifficulty,
    skills: string[]
  ): TrainingProgram {
    const program: TrainingProgram = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      difficulty,
      skills,
      timeDilation: this.getTimeDilation(difficulty),
      maxSkillLevel: this.getMaxSkillLevel(difficulty),
      prerequisites: [],
      involvesSimulatedDeath: difficulty !== 'tutorial',
      psychologicalImpact: this.getPsychologicalImpact(difficulty),
      creatorId: creatorEntity.id,
      createdAt: world.tick,
    };

    this.programs.set(program.id, program);

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'vr:program_created' as any,
        source: 'vr-training-system',
        data: {
          programId: program.id,
          name,
          category,
          difficulty,
          creatorId: creatorEntity.id,
        },
      });
    }

    return program;
  }

  /**
   * Start a training session
   */
  public startSession(
    world: World,
    traineeEntity: Entity,
    programId: string
  ): TrainingSession | null {
    const program = this.programs.get(programId);
    if (!program) return null;

    const scenarios = TRAINING_SCENARIOS[program.difficulty];
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]!;

    const session: TrainingSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      programId,
      traineeId: traineeEntity.id,
      startedAt: world.tick,
      endedAt: null,
      simulatedTimeElapsed: 0,
      simulatedDeaths: 0,
      skillProgress: new Map(),
      currentScenario: scenario,
      performanceRating: 0.5,
      instructorNotes: [],
    };

    this.sessions.set(session.id, session);

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'vr:session_started' as any,
        source: 'vr-training-system',
        data: {
          sessionId: session.id,
          programId,
          programName: program.name,
          traineeId: traineeEntity.id,
          difficulty: program.difficulty,
        },
      });
    }

    return session;
  }

  /**
   * Process a simulated death in a training session
   */
  public processSimulatedDeath(
    sessionId: string,
    causeOfDeath: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.simulatedDeaths++;

    // Add instructor note
    const notes = [
      `Died to ${causeOfDeath}. A learning experience.`,
      `${causeOfDeath} claimed another victim. Respawning.`,
      `Death by ${causeOfDeath}. At least it wasn't real.`,
      `${causeOfDeath} was the cause. Note for future runs.`,
    ];
    session.instructorNotes.push(notes[Math.floor(Math.random() * notes.length)]!);

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'vr:simulated_death' as any,
        source: 'vr-training-system',
        data: {
          sessionId,
          traineeId: session.traineeId,
          causeOfDeath,
          deathCount: session.simulatedDeaths,
        },
      });
    }
  }

  /**
   * Complete a training session
   */
  public completeSession(
    world: World,
    sessionId: string,
    performanceRating: number
  ): TrainingAchievement[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    session.endedAt = world.tick;
    session.performanceRating = performanceRating;

    const program = this.programs.get(session.programId);
    const achievements: TrainingAchievement[] = [];

    // Check for achievements
    if (session.simulatedDeaths === 0 && program && program.difficulty !== 'tutorial') {
      achievements.push(this.createAchievement('no_death_run', session.programId, world.tick));
    }

    if (session.simulatedDeaths >= 100) {
      achievements.push(this.createAchievement('hundred_deaths', session.programId, world.tick));
    }

    if (performanceRating >= 0.99 && program?.difficulty === 'tutorial') {
      achievements.push(this.createAchievement('perfect_tutorial', session.programId, world.tick));
    }

    if (program?.difficulty === 'master') {
      achievements.push(this.createAchievement('master_completion', session.programId, world.tick));
    }

    if (program?.difficulty === 'impossible') {
      achievements.push(this.createAchievement('impossible_completion', session.programId, world.tick));
      if (performanceRating >= 0.99) {
        achievements.push(this.createAchievement('perfect_impossible', session.programId, world.tick));
      }
    }

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'vr:session_completed' as any,
        source: 'vr-training-system',
        data: {
          sessionId,
          traineeId: session.traineeId,
          programId: session.programId,
          performanceRating,
          simulatedDeaths: session.simulatedDeaths,
          achievements: achievements.map(a => a.id),
        },
      });
    }

    this.sessions.delete(sessionId);
    return achievements;
  }

  private createAchievement(id: string, programId: string, tick: number): TrainingAchievement {
    const template = TRAINING_ACHIEVEMENTS.find(a => a.id === id);
    return {
      id: `${id}_${tick}`,
      name: template?.name ?? id,
      description: template?.description ?? '',
      earnedAt: tick,
      programId,
      rarity: template?.rarity ?? 'common',
    };
  }

  /**
   * Main update loop
   */
  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    if (world.tick - this.lastUpdateTick < VRTrainingSystem.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = world.tick;

    // Update active sessions
    for (const session of this.sessions.values()) {
      const program = this.programs.get(session.programId);
      if (!program) continue;

      // Accumulate simulated time
      session.simulatedTimeElapsed +=
        VRTrainingSystem.UPDATE_INTERVAL * program.timeDilation;

      // Random skill progress
      for (const skill of program.skills) {
        const current = session.skillProgress.get(skill) ?? 0;
        const gain = Math.random() * 0.01 * program.timeDilation;
        session.skillProgress.set(skill, Math.min(program.maxSkillLevel, current + gain));
      }

      // Random simulated deaths for harder programs
      if (program.involvesSimulatedDeath && Math.random() < this.getDeathChance(program.difficulty)) {
        const causes = ['unexpected enemy', 'environmental hazard', 'own mistakes', 'bad luck', 'hubris'];
        this.processSimulatedDeath(session.id, causes[Math.floor(Math.random() * causes.length)]!);
      }
    }
  }

  private getTimeDilation(difficulty: TrainingDifficulty): number {
    const dilations: Record<TrainingDifficulty, number> = {
      tutorial: 2,
      novice: 5,
      intermediate: 10,
      advanced: 20,
      master: 50,
      impossible: 100,
    };
    return dilations[difficulty];
  }

  private getMaxSkillLevel(difficulty: TrainingDifficulty): number {
    const levels: Record<TrainingDifficulty, number> = {
      tutorial: 0.2,
      novice: 0.4,
      intermediate: 0.6,
      advanced: 0.8,
      master: 0.95,
      impossible: 1.0,
    };
    return levels[difficulty];
  }

  private getPsychologicalImpact(difficulty: TrainingDifficulty): number {
    const impacts: Record<TrainingDifficulty, number> = {
      tutorial: 0,
      novice: 0.1,
      intermediate: 0.2,
      advanced: 0.4,
      master: 0.6,
      impossible: 0.9,
    };
    return impacts[difficulty];
  }

  private getDeathChance(difficulty: TrainingDifficulty): number {
    const chances: Record<TrainingDifficulty, number> = {
      tutorial: 0,
      novice: 0.001,
      intermediate: 0.005,
      advanced: 0.02,
      master: 0.05,
      impossible: 0.2,
    };
    return chances[difficulty];
  }

  private getPreviousDifficulty(difficulty: TrainingDifficulty): TrainingDifficulty {
    const order: TrainingDifficulty[] = ['tutorial', 'novice', 'intermediate', 'advanced', 'master', 'impossible'];
    const index = order.indexOf(difficulty);
    return order[Math.max(0, index - 1)]!;
  }

  /**
   * Get all training programs
   */
  public getPrograms(): TrainingProgram[] {
    return Array.from(this.programs.values());
  }

  /**
   * Get programs by category
   */
  public getProgramsByCategory(category: TrainingCategory): TrainingProgram[] {
    return Array.from(this.programs.values()).filter(p => p.category === category);
  }

  /**
   * Get active sessions
   */
  public getActiveSessions(): TrainingSession[] {
    return Array.from(this.sessions.values());
  }
}

// Singleton instance
let vrTrainingSystemInstance: VRTrainingSystem | null = null;

/**
 * Get the singleton VRTrainingSystem instance
 */
export function getVRTrainingSystem(): VRTrainingSystem {
  if (!vrTrainingSystemInstance) {
    vrTrainingSystemInstance = new VRTrainingSystem();
  }
  return vrTrainingSystemInstance;
}

/**
 * Reset the system (for testing)
 */
export function resetVRTrainingSystem(): void {
  vrTrainingSystemInstance = null;
}
