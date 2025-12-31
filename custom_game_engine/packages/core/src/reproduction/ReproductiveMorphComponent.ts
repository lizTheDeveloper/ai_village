/**
 * ReproductiveMorphComponent - Biological sex and reproductive morphology
 *
 * This is about PHYSICAL reproductive characteristics, not:
 * - Sexuality (who you're attracted to) - see SexualityComponent
 * - Gender (social/identity construct) - see IdentityComponent/GenderComponent
 *
 * "Morph" is used instead of "sex" because many species have more than two
 * reproductive morphs, or have morphs that don't map to male/female at all.
 */

import { ComponentBase } from '../ecs/Component.js';
import type { Tick } from '../types.js';
import type { BiologicalSexSystem } from './MatingParadigm.js';

// ============================================================================
// Morph Types
// ============================================================================

/** The entity's current reproductive morph */
export interface ReproductiveMorph {
  /** Unique ID for this morph within the species */
  id: string;

  /** Display name */
  name: string;

  /**
   * Reproductive role in reproduction.
   * - spawner: Produces eggs/offspring (traditionally "female")
   * - fertilizer: Provides genetic material (traditionally "male")
   * - both: Can do either (hermaphroditic)
   * - neither: Cannot reproduce sexually
   * - variable: Changes based on circumstances
   * - carrier: Carries offspring but didn't produce egg
   * - incubator: External incubation role
   */
  reproductiveRole: 'spawner' | 'fertilizer' | 'both' | 'neither' |
                    'variable' | 'carrier' | 'incubator';

  /** Physical characteristics associated with this morph */
  characteristics?: string[];
}

/** How was this morph determined? */
export type MorphDetermination =
  | 'genetic'         // Chromosomes at conception
  | 'temperature'     // Incubation temperature
  | 'social'          // Social environment determines
  | 'age'             // Changes with age
  | 'size'            // Largest becomes certain morph
  | 'random'          // Random at birth
  | 'magical'         // Magical determination
  | 'choice'          // Individual chose
  | 'environmental'   // Environment during development
  | 'partner'         // Changes based on partner
  | 'cycle';          // Cyclical changes

/** State of a morph transition */
export interface MorphTransition {
  fromMorph: string;
  toMorph: string;
  startedAt: Tick;
  estimatedCompletionAt: Tick;
  progress: number; // 0-1
  trigger: string;
  reversible: boolean;
}

/** Fertility state */
export interface FertilityState {
  /** Can this entity currently reproduce? */
  fertile: boolean;

  /** Why fertile or infertile */
  reason?: 'mature' | 'immature' | 'too_old' | 'injured' | 'exhausted' |
           'not_in_season' | 'not_in_kemmer' | 'sterile' | 'recovering' |
           'magical_block' | 'resource_starved';

  /** For cyclical fertility, current cycle phase */
  cyclePhase?: 'follicular' | 'ovulation' | 'luteal' | 'menstruation' |
               'estrus' | 'anestrus' | 'kemmer' | 'somer' | 'refractory';

  /** Days until fertile (if known) */
  daysUntilFertile?: number;

  /** Days fertile remaining (if known) */
  daysFertileRemaining?: number;
}

/** Pregnancy/gestation state */
export interface GestationState {
  /** Is this entity currently gestating? */
  pregnant: boolean;

  /** Partner(s) who contributed genetic material */
  partnerIds?: string[];

  /** When conception occurred */
  conceptionTick?: Tick;

  /** Expected birth tick */
  expectedBirthTick?: Tick;

  /** Number of offspring expected */
  expectedOffspringCount?: number;

  /** Current trimester/stage */
  stage?: 'early' | 'middle' | 'late' | 'imminent' | 'overdue';

  /** Health of pregnancy */
  health?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

  /** Complications if any */
  complications?: string[];
}

/** Track lifetime reproductive statistics */
export interface ReproductiveHistory {
  /** Total offspring produced */
  offspringCount: number;

  /** Total pregnancies/gestations */
  gestationCount: number;

  /** Failed pregnancies/miscarriages */
  failedGestations: number;

  /** Times acted as fertilizer */
  fertilizationCount: number;

  /** Morphs this entity has been (for sequential species) */
  previousMorphs: Array<{
    morphId: string;
    duration: number;
    endReason: string;
  }>;
}

// ============================================================================
// The Component
// ============================================================================

/**
 * ReproductiveMorphComponent stores an entity's biological sex/reproductive morph.
 *
 * For binary species: morphs might be ['male', 'female']
 * For multi-sex species: morphs might be ['alpha', 'beta', 'gamma', 'neuter']
 * For kemmer species: morphs might be ['somer', 'kemmer_spawner', 'kemmer_fertilizer']
 */
export class ReproductiveMorphComponent extends ComponentBase {
  public readonly type = 'reproductive_morph';

  // =========================================================================
  // Morph System Info
  // =========================================================================

  /**
   * What sex system does this entity's species use?
   */
  public sexSystem: BiologicalSexSystem = 'binary_static';

  /**
   * All possible morphs for this entity's species.
   * Stored here for convenience (also in MatingParadigm).
   */
  public possibleMorphs: ReproductiveMorph[] = [];

  /**
   * How was this entity's morph determined?
   */
  public determination: MorphDetermination = 'genetic';

  // =========================================================================
  // Current Morph State
  // =========================================================================

  /**
   * Current reproductive morph.
   */
  public currentMorph: ReproductiveMorph = {
    id: 'unassigned',
    name: 'Unassigned',
    reproductiveRole: 'neither',
  };

  /**
   * Can this entity change morphs?
   */
  public canChangeMorph: boolean = false;

  /**
   * Conditions under which morph can change.
   */
  public morphChangeConditions?: string[];

  /**
   * Ongoing morph transition (if any).
   */
  public transition?: MorphTransition;

  // =========================================================================
  // Fertility State
  // =========================================================================

  /**
   * Current fertility state.
   */
  public fertility: FertilityState = {
    fertile: false,
    reason: 'immature',
  };

  /**
   * Age when this entity became reproductively mature.
   */
  public maturityAge?: number;

  /**
   * Is this entity naturally sterile?
   */
  public sterile: boolean = false;

  /**
   * Reason for sterility if sterile.
   */
  public sterilityReason?: 'genetic' | 'injury' | 'age' | 'magical' |
                           'disease' | 'intentional' | 'hybrid';

  // =========================================================================
  // Gestation State
  // =========================================================================

  /**
   * Current gestation state (if pregnant/incubating).
   */
  public gestation: GestationState = { pregnant: false };

  /**
   * Gestation period in days (species-specific).
   */
  public gestationPeriodDays: number = 270; // Default human-like

  // =========================================================================
  // History
  // =========================================================================

  /**
   * Reproductive history.
   */
  public history: ReproductiveHistory = {
    offspringCount: 0,
    gestationCount: 0,
    failedGestations: 0,
    fertilizationCount: 0,
    previousMorphs: [],
  };

  // =========================================================================
  // Reproductive Capacity
  // =========================================================================

  /**
   * Maximum offspring per gestation.
   */
  public maxOffspringPerGestation: number = 1;

  /**
   * Minimum recovery time between gestations (days).
   */
  public recoveryPeriodDays: number = 30;

  /**
   * Tick when last gestation ended.
   */
  public lastGestationEndedAt?: Tick;

  // =========================================================================
  // Methods
  // =========================================================================

  /**
   * Get the current reproductive role.
   */
  public getReproductiveRole(): string {
    return this.currentMorph.reproductiveRole;
  }

  /**
   * Can this entity currently produce offspring (as spawner)?
   */
  public canSpawn(): boolean {
    const role = this.currentMorph.reproductiveRole;
    return (
      (role === 'spawner' || role === 'both' || role === 'variable') &&
      this.fertility.fertile &&
      !this.gestation.pregnant &&
      !this.sterile
    );
  }

  /**
   * Can this entity currently fertilize?
   */
  public canFertilize(): boolean {
    const role = this.currentMorph.reproductiveRole;
    return (
      (role === 'fertilizer' || role === 'both' || role === 'variable') &&
      this.fertility.fertile &&
      !this.sterile
    );
  }

  /**
   * Check if two morphs are compatible for reproduction.
   */
  public isCompatibleWith(otherMorph: ReproductiveMorphComponent): boolean {
    const thisRole = this.currentMorph.reproductiveRole;
    const otherRole = otherMorph.currentMorph.reproductiveRole;

    // Neither can reproduce
    if (thisRole === 'neither' || otherRole === 'neither') return false;

    // Both variable = compatible
    if (thisRole === 'variable' && otherRole === 'variable') return true;

    // Both = compatible (hermaphrodites can mate with anyone)
    if (thisRole === 'both' || otherRole === 'both') return true;

    // Need complementary roles
    if (thisRole === 'spawner' && (otherRole === 'fertilizer' || otherRole === 'variable')) {
      return true;
    }
    if (thisRole === 'fertilizer' && (otherRole === 'spawner' || otherRole === 'variable')) {
      return true;
    }
    if (thisRole === 'variable') return true;

    return false;
  }

  /**
   * Start a morph transition.
   */
  public startMorphTransition(
    toMorphId: string,
    currentTick: Tick,
    durationTicks: number,
    trigger: string,
    reversible: boolean = false,
  ): void {
    const toMorph = this.possibleMorphs.find(m => m.id === toMorphId);
    if (!toMorph) {
      throw new Error(`Unknown morph: ${toMorphId}`);
    }

    this.transition = {
      fromMorph: this.currentMorph.id,
      toMorph: toMorphId,
      startedAt: currentTick,
      estimatedCompletionAt: currentTick + durationTicks,
      progress: 0,
      trigger,
      reversible,
    };
  }

  /**
   * Update morph transition progress.
   */
  public updateTransition(currentTick: Tick): boolean {
    if (!this.transition) return false;

    const totalDuration = this.transition.estimatedCompletionAt - this.transition.startedAt;
    const elapsed = currentTick - this.transition.startedAt;
    this.transition.progress = Math.min(1, elapsed / totalDuration);

    if (this.transition.progress >= 1) {
      this.completeMorphTransition();
      return true;
    }
    return false;
  }

  /**
   * Complete the morph transition.
   */
  private completeMorphTransition(): void {
    if (!this.transition) return;

    const newMorph = this.possibleMorphs.find(m => m.id === this.transition!.toMorph);
    if (!newMorph) {
      throw new Error(`Cannot complete transition: unknown morph ${this.transition.toMorph}`);
    }

    // Record previous morph in history
    this.history.previousMorphs.push({
      morphId: this.currentMorph.id,
      duration: this.transition.estimatedCompletionAt - this.transition.startedAt,
      endReason: this.transition.trigger,
    });

    this.currentMorph = newMorph;
    this.transition = undefined;
  }

  /**
   * Start a pregnancy/gestation.
   */
  public startGestation(
    partnerIds: string[],
    conceptionTick: Tick,
    expectedOffspring: number = 1,
  ): void {
    if (this.gestation.pregnant) {
      throw new Error('Entity is already pregnant');
    }

    this.gestation = {
      pregnant: true,
      partnerIds,
      conceptionTick: conceptionTick,
      expectedBirthTick: conceptionTick + (this.gestationPeriodDays * 24), // Assuming 24 ticks/day
      expectedOffspringCount: expectedOffspring,
      stage: 'early',
      health: 'good',
    };

    this.history.gestationCount++;
  }

  /**
   * Update gestation progress.
   */
  public updateGestation(currentTick: Tick): void {
    if (!this.gestation.pregnant || !this.gestation.conceptionTick || !this.gestation.expectedBirthTick) {
      return;
    }

    const totalDuration = this.gestation.expectedBirthTick - this.gestation.conceptionTick;
    const elapsed = currentTick - this.gestation.conceptionTick;
    const progress = elapsed / totalDuration;

    if (progress < 0.33) {
      this.gestation.stage = 'early';
    } else if (progress < 0.66) {
      this.gestation.stage = 'middle';
    } else if (progress < 0.95) {
      this.gestation.stage = 'late';
    } else if (progress < 1.05) {
      this.gestation.stage = 'imminent';
    } else {
      this.gestation.stage = 'overdue';
    }
  }

  /**
   * End gestation (birth or failure).
   */
  public endGestation(
    success: boolean,
    actualOffspringCount: number,
    currentTick: Tick,
  ): void {
    if (!this.gestation.pregnant) return;

    if (success) {
      this.history.offspringCount += actualOffspringCount;
    } else {
      this.history.failedGestations++;
    }

    this.gestation = { pregnant: false };
    this.lastGestationEndedAt = currentTick;

    // Enter recovery period
    this.fertility = {
      fertile: false,
      reason: 'recovering',
    };
  }

  /**
   * Record a fertilization (for fertilizer morphs).
   */
  public recordFertilization(): void {
    this.history.fertilizationCount++;
  }

  /**
   * Check if recovered from last gestation.
   */
  public hasRecoveredFromGestation(currentTick: Tick): boolean {
    if (!this.lastGestationEndedAt) return true;
    const recoveryTicks = this.recoveryPeriodDays * 24;
    return currentTick >= this.lastGestationEndedAt + recoveryTicks;
  }

  /**
   * Enter kemmer (for kemmer-type species).
   */
  public enterKemmer(morphId: string, _currentTick: Tick): void {
    const kemmerMorph = this.possibleMorphs.find(m => m.id === morphId);
    if (!kemmerMorph) {
      throw new Error(`Unknown kemmer morph: ${morphId}`);
    }

    this.currentMorph = kemmerMorph;
    this.fertility = {
      fertile: true,
      reason: 'mature',
      cyclePhase: 'kemmer',
    };
  }

  /**
   * Exit kemmer (return to somer).
   */
  public exitKemmer(): void {
    const somerMorph = this.possibleMorphs.find(m => m.id === 'somer');
    if (somerMorph) {
      this.currentMorph = somerMorph;
    }
    this.fertility = {
      fertile: false,
      reason: 'not_in_kemmer',
      cyclePhase: 'somer',
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export interface ReproductiveMorphOptions {
  sexSystem?: BiologicalSexSystem;
  possibleMorphs?: ReproductiveMorph[];
  currentMorphId?: string;
  determination?: MorphDetermination;
  canChangeMorph?: boolean;
  gestationPeriodDays?: number;
  maxOffspringPerGestation?: number;
  recoveryPeriodDays?: number;
}

/**
 * Create a ReproductiveMorphComponent.
 */
export function createReproductiveMorphComponent(
  options: ReproductiveMorphOptions = {},
): ReproductiveMorphComponent {
  const component = new ReproductiveMorphComponent();

  component.sexSystem = options.sexSystem ?? 'binary_static';
  component.determination = options.determination ?? 'genetic';
  component.canChangeMorph = options.canChangeMorph ?? false;
  component.gestationPeriodDays = options.gestationPeriodDays ?? 270;
  component.maxOffspringPerGestation = options.maxOffspringPerGestation ?? 1;
  component.recoveryPeriodDays = options.recoveryPeriodDays ?? 30;

  // Set up possible morphs
  component.possibleMorphs = options.possibleMorphs ?? [
    {
      id: 'female',
      name: 'Female',
      reproductiveRole: 'spawner',
      characteristics: ['XX chromosomes', 'produces eggs'],
    },
    {
      id: 'male',
      name: 'Male',
      reproductiveRole: 'fertilizer',
      characteristics: ['XY chromosomes', 'produces sperm'],
    },
  ];

  // Set current morph
  const morphId = options.currentMorphId ?? component.possibleMorphs[0]?.id ?? 'unassigned';
  const morph = component.possibleMorphs.find(m => m.id === morphId);
  if (morph) {
    component.currentMorph = morph;
  }

  return component;
}

/**
 * Create a binary female morph.
 */
export function createFemaleMorph(gestationDays: number = 270): ReproductiveMorphComponent {
  return createReproductiveMorphComponent({
    sexSystem: 'binary_static',
    currentMorphId: 'female',
    gestationPeriodDays: gestationDays,
  });
}

/**
 * Create a binary male morph.
 */
export function createMaleMorph(): ReproductiveMorphComponent {
  return createReproductiveMorphComponent({
    sexSystem: 'binary_static',
    currentMorphId: 'male',
  });
}

/**
 * Create a hermaphroditic morph (both roles).
 */
export function createHermaphroditicMorph(): ReproductiveMorphComponent {
  return createReproductiveMorphComponent({
    sexSystem: 'hermaphroditic',
    possibleMorphs: [
      {
        id: 'hermaphrodite',
        name: 'Hermaphrodite',
        reproductiveRole: 'both',
        characteristics: ['both reproductive systems'],
      },
    ],
    currentMorphId: 'hermaphrodite',
  });
}

/**
 * Create a kemmer morph (Le Guin's Gethenians).
 */
export function createKemmerMorph(): ReproductiveMorphComponent {
  return createReproductiveMorphComponent({
    sexSystem: 'kemmer',
    canChangeMorph: true,
    possibleMorphs: [
      {
        id: 'somer',
        name: 'Somer',
        reproductiveRole: 'neither',
        characteristics: ['sexually latent', 'androgynous'],
      },
      {
        id: 'kemmer_spawner',
        name: 'Kemmer (Spawner)',
        reproductiveRole: 'spawner',
        characteristics: ['in kemmer', 'can bear children'],
      },
      {
        id: 'kemmer_fertilizer',
        name: 'Kemmer (Fertilizer)',
        reproductiveRole: 'fertilizer',
        characteristics: ['in kemmer', 'can sire children'],
      },
    ],
    currentMorphId: 'somer',
    determination: 'partner',
    gestationPeriodDays: 250,
  });
}

/**
 * Create a sequential hermaphrodite morph (changes with age/size).
 */
export function createSequentialMorph(startingRole: 'spawner' | 'fertilizer'): ReproductiveMorphComponent {
  return createReproductiveMorphComponent({
    sexSystem: 'binary_sequential',
    canChangeMorph: true,
    possibleMorphs: [
      {
        id: 'protogynous_female',
        name: 'Female Phase',
        reproductiveRole: 'spawner',
      },
      {
        id: 'protogynous_male',
        name: 'Male Phase',
        reproductiveRole: 'fertilizer',
      },
    ],
    currentMorphId: startingRole === 'spawner' ? 'protogynous_female' : 'protogynous_male',
    determination: 'social',
  });
}

/**
 * Create a multi-sex species morph.
 */
export function createMultiSexMorph(
  morphs: ReproductiveMorph[],
  currentMorphId: string,
): ReproductiveMorphComponent {
  return createReproductiveMorphComponent({
    sexSystem: 'multi_sex',
    possibleMorphs: morphs,
    currentMorphId,
    canChangeMorph: false,
  });
}

/**
 * Create a hive caste morph.
 */
export function createHiveCasteMorph(
  caste: 'queen' | 'king' | 'drone' | 'worker',
): ReproductiveMorphComponent {
  const morphs: ReproductiveMorph[] = [
    {
      id: 'queen',
      name: 'Queen',
      reproductiveRole: 'spawner',
      characteristics: ['egg-layer', 'pheromone producer', 'long-lived'],
    },
    {
      id: 'king',
      name: 'King',
      reproductiveRole: 'fertilizer',
      characteristics: ['mate to queen', 'long-lived'],
    },
    {
      id: 'drone',
      name: 'Drone',
      reproductiveRole: 'fertilizer',
      characteristics: ['disposable male', 'exists to mate'],
    },
    {
      id: 'worker',
      name: 'Worker',
      reproductiveRole: 'neither',
      characteristics: ['sterile', 'working caste'],
    },
  ];

  return createReproductiveMorphComponent({
    sexSystem: 'hive_caste',
    possibleMorphs: morphs,
    currentMorphId: caste,
    canChangeMorph: caste === 'worker', // Workers can sometimes become queens
    maxOffspringPerGestation: caste === 'queen' ? 100 : 1,
    gestationPeriodDays: caste === 'queen' ? 3 : 30,
  });
}

/**
 * Create asexual/parthenogenic morph.
 */
export function createAsexualMorph(): ReproductiveMorphComponent {
  return createReproductiveMorphComponent({
    sexSystem: 'parthenogenic',
    possibleMorphs: [
      {
        id: 'parthenogenic',
        name: 'Self-Reproducing',
        reproductiveRole: 'both',
        characteristics: ['self-fertilizing', 'clonal reproduction possible'],
      },
    ],
    currentMorphId: 'parthenogenic',
    canChangeMorph: false,
  });
}
