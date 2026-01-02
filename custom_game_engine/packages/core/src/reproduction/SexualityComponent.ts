/**
 * SexualityComponent - Individual entity sexuality and attraction
 *
 * Sexuality is separate from biological sex (morph) and gender (identity).
 * This component captures WHO an entity is attracted to and HOW that
 * attraction manifests.
 *
 * Inspired by the split-attraction model and diverse species sexuality.
 */

import { ComponentBase } from '../ecs/Component.js';
import type { EntityId, Tick } from '../types.js';
import type {
  AttractionOnset,
  AttractionFluidity,
} from './MatingParadigm.js';

// ============================================================================
// Attraction Types
// ============================================================================

/** What morphs/sexes is this entity attracted to? */
export type SexualTarget =
  | 'none'              // Asexual - no sexual attraction
  | 'same_morph'        // Homosexual pattern
  | 'different_morph'   // Heterosexual pattern
  | 'any_morph'         // Bisexual/pansexual
  | 'specific_morphs'   // Specific list
  | 'all_except'        // All but specific list
  | 'contextual'        // Depends on situation (kemmer-like)
  | 'resonance_based'   // Based on psychic/magical compatibility
  | 'unknown';          // Not yet determined

/** What genders is this entity attracted to? */
export type GenderTarget =
  | 'none'              // No gender preference
  | 'same_gender'       // Same gender
  | 'different_gender'  // Different gender
  | 'any_gender'        // No preference
  | 'specific_genders'  // Specific list
  | 'agender_only'      // Only those without gender
  | 'contextual';       // Depends on situation

/** A dimension of attraction */
export interface AttractionAxis {
  /** Dimension name (sexual, romantic, aesthetic, sensual, platonic, queerplatonic) */
  dimension: string;

  /** Intensity from 0 (none) to 1 (intense) */
  intensity: number;

  /** Target of attraction for this dimension */
  morphTarget: SexualTarget;
  genderTarget: GenderTarget;

  /** Specific targets if morphTarget is 'specific_morphs' */
  specificMorphs?: string[];

  /** Specific genders if genderTarget is 'specific_genders' */
  specificGenders?: string[];
}

/** When does attraction activate? */
export interface AttractionCondition {
  type: 'always' | 'familiar' | 'emotional_bond' | 'kemmer' |
        'season' | 'moon_phase' | 'ritual' | 'resonance' | 'never';

  /** Required familiarity level (0-100) for 'familiar' type */
  minFamiliarity?: number;

  /** Required emotional bond level for 'emotional_bond' type */
  minEmotionalBond?: number;

  /** Season name for 'season' type */
  activeSeason?: string;

  /** Moon phase for 'moon_phase' type */
  moonPhase?: string;
}

/** Current attraction state toward a specific entity */
export interface ActiveAttraction {
  targetId: EntityId;

  /** Attraction levels by dimension */
  attractions: Record<string, number>; // dimension -> intensity

  /** When this attraction started */
  startedAt: Tick;

  /** Is this reciprocated? (known or unknown) */
  reciprocated: 'yes' | 'no' | 'unknown';

  /** Current intensity (can fluctuate) */
  currentIntensity: number;

  /** Notes/flavor text */
  notes?: string;
}

/** A mate the entity is bonded with */
export interface CurrentMate {
  entityId: EntityId;
  bondType: 'casual' | 'romantic' | 'life_partner' | 'pair_bonded' |
            'soul_bound' | 'quantum_entangled' | 'hive_mate';
  bondedAt: Tick;
  bondStrength: number; // 0-1

  /** Has this bond been consummated? */
  consummated: boolean;

  /** Number of offspring together */
  offspringCount: number;
}

// ============================================================================
// The Component
// ============================================================================

/**
 * SexualityComponent stores an individual entity's sexuality.
 *
 * This is about attraction patterns, not biological sex (which is in
 * ReproductiveMorphComponent) or gender identity (which may be in
 * IdentityComponent or a GenderComponent).
 */
export class SexualityComponent extends ComponentBase {
  public readonly type = 'sexuality';

  // =========================================================================
  // Core Orientation
  // =========================================================================

  /**
   * Labels for this entity's sexuality (for descriptive purposes).
   * E.g., ['bisexual', 'polyamorous', 'demisexual']
   */
  public labels: string[] = [];

  /**
   * All attraction dimensions with their targets and intensities.
   * Allows split-attraction model (romantic attraction != sexual attraction).
   */
  public attractionAxes: AttractionAxis[] = [];

  /**
   * When does attraction activate?
   */
  public attractionCondition: AttractionCondition = { type: 'always' };

  /**
   * How attraction emerges
   */
  public onset: AttractionOnset = 'immediate';

  /**
   * How fixed/fluid is this entity's sexuality?
   */
  public fluidity: AttractionFluidity = 'fixed';

  // =========================================================================
  // Relationship Preferences
  // =========================================================================

  /**
   * Preferred relationship structure.
   */
  public relationshipStyle: 'monogamous' | 'serially_monogamous' |
    'polyamorous' | 'relationship_anarchist' | 'aromantic' |
    'communal' | 'hive_structure' | 'no_preference' = 'no_preference';

  /**
   * Interest in reproduction (separate from sexuality).
   */
  public reproductiveInterest: 'wants_offspring' | 'open_to_offspring' |
    'no_interest' | 'actively_avoids' | 'instinct_driven' = 'open_to_offspring';

  /**
   * Is this entity open to intimacy?
   */
  public intimacyOpenness: number = 0.5; // 0-1

  // =========================================================================
  // Current State
  // =========================================================================

  /**
   * Is this entity currently "in heat" / kemmer / receptive?
   * For species with cyclical sexuality.
   */
  public inReceptiveCycle: boolean = false;

  /**
   * When the current cycle started (if applicable).
   */
  public cycleStartedAt?: Tick;

  /**
   * Currently active attractions.
   */
  public activeAttractions: ActiveAttraction[] = [];

  /**
   * Current mates/partners.
   */
  public currentMates: CurrentMate[] = [];

  /**
   * Is the entity currently seeking a mate?
   */
  public activelySeeking: boolean = false;

  /**
   * Jealousy intensity (0-1).
   *
   * Varies by species and individual:
   * - 0.0 = No jealousy (polyamorous species, extra-temporal beings, hive minds)
   * - 0.3 = Low jealousy (long-lived species, secure attachments)
   * - 0.5 = Moderate jealousy (typical humans)
   * - 0.7 = High jealousy (monogamous species, anxious attachments)
   * - 1.0 = Extreme jealousy (possessive species, short-lived species)
   *
   * This is BASE jealousy - actual response is modulated by:
   * - personality.neuroticism (multiplies intensity)
   * - relationship strength (stronger bonds = more jealousy)
   * - cultural norms (species mating paradigm)
   */
  public jealousyIntensity: number = 0.5;

  /**
   * Entities this entity has rejected or been rejected by.
   */
  public rejections: Array<{
    entityId: EntityId;
    wasRejector: boolean;
    tick: Tick;
    reason?: string;
  }> = [];

  // =========================================================================
  // History
  // =========================================================================

  /**
   * Past mates (no longer bonded).
   */
  public pastMates: Array<{
    entityId: EntityId;
    bondType: string;
    duration: number;
    endReason: 'death' | 'separation' | 'betrayal' | 'drifted' | 'other';
  }> = [];

  /**
   * Total lifetime mating partners.
   */
  public lifetimePartnerCount: number = 0;

  // =========================================================================
  // Methods
  // =========================================================================

  /**
   * Check if this entity is attracted to a specific morph type.
   */
  public isAttractedToMorph(morphId: string, dimension: string = 'sexual'): boolean {
    const axis = this.attractionAxes.find(a => a.dimension === dimension);
    if (!axis || axis.intensity === 0) return false;

    switch (axis.morphTarget) {
      case 'none':
        return false;
      case 'any_morph':
        return true;
      case 'specific_morphs':
        return axis.specificMorphs?.includes(morphId) ?? false;
      case 'all_except':
        return !(axis.specificMorphs?.includes(morphId) ?? false);
      default:
        return true; // Contextual types need external resolution
    }
  }

  /**
   * Check if this entity is attracted to a specific gender.
   */
  public isAttractedToGender(genderId: string, dimension: string = 'romantic'): boolean {
    const axis = this.attractionAxes.find(a => a.dimension === dimension);
    if (!axis || axis.intensity === 0) return false;

    switch (axis.genderTarget) {
      case 'none':
        return false;
      case 'any_gender':
        return true;
      case 'specific_genders':
        return axis.specificGenders?.includes(genderId) ?? false;
      case 'agender_only':
        return genderId === 'agender' || genderId === 'none';
      default:
        return true;
    }
  }

  /**
   * Get the attraction intensity for a specific dimension.
   */
  public getAttractionIntensity(dimension: string): number {
    const axis = this.attractionAxes.find(a => a.dimension === dimension);
    return axis?.intensity ?? 0;
  }

  /**
   * Check if attraction is currently possible (cycle, condition, etc.).
   */
  public canExperienceAttraction(): boolean {
    switch (this.attractionCondition.type) {
      case 'never':
        return false;
      case 'always':
        return true;
      case 'kemmer':
      case 'season':
      case 'moon_phase':
        return this.inReceptiveCycle;
      case 'familiar':
      case 'emotional_bond':
        return true; // Checked per-target
      default:
        return true;
    }
  }

  /**
   * Add a new active attraction.
   */
  public addAttraction(
    targetId: EntityId,
    attractions: Record<string, number>,
    tick: Tick,
  ): void {
    const existing = this.activeAttractions.find(a => a.targetId === targetId);
    if (existing) {
      // Update existing
      Object.assign(existing.attractions, attractions);
      existing.currentIntensity = Math.max(...Object.values(existing.attractions));
    } else {
      this.activeAttractions.push({
        targetId,
        attractions,
        startedAt: tick,
        reciprocated: 'unknown',
        currentIntensity: Math.max(...Object.values(attractions)),
      });
    }
  }

  /**
   * Remove an attraction.
   */
  public removeAttraction(targetId: EntityId): void {
    this.activeAttractions = this.activeAttractions.filter(
      a => a.targetId !== targetId,
    );
  }

  /**
   * Add a mate.
   */
  public addMate(
    entityId: EntityId,
    bondType: CurrentMate['bondType'],
    tick: Tick,
  ): void {
    // Check if already mated
    if (this.currentMates.some(m => m.entityId === entityId)) return;

    this.currentMates.push({
      entityId,
      bondType,
      bondedAt: tick,
      bondStrength: bondType === 'casual' ? 0.3 : 0.7,
      consummated: false,
      offspringCount: 0,
    });

    this.lifetimePartnerCount++;
  }

  /**
   * End a mate bond.
   */
  public endMateBond(
    entityId: EntityId,
    reason: 'death' | 'separation' | 'betrayal' | 'drifted' | 'other',
    currentTick: Tick,
  ): void {
    const mateIndex = this.currentMates.findIndex(m => m.entityId === entityId);
    if (mateIndex < 0) return;

    const mate = this.currentMates[mateIndex]!;
    this.pastMates.push({
      entityId: mate.entityId,
      bondType: mate.bondType,
      duration: currentTick - mate.bondedAt,
      endReason: reason,
    });

    this.currentMates.splice(mateIndex, 1);
  }

  /**
   * Record a rejection.
   */
  public recordRejection(
    entityId: EntityId,
    wasRejector: boolean,
    tick: Tick,
    reason?: string,
  ): void {
    this.rejections.push({ entityId, wasRejector, tick, reason });
  }

  /**
   * Check if entity has been rejected by or rejected another.
   */
  public hasRejectionHistory(entityId: EntityId): boolean {
    return this.rejections.some(r => r.entityId === entityId);
  }

  /**
   * Enter receptive cycle.
   */
  public enterReceptiveCycle(tick: Tick): void {
    this.inReceptiveCycle = true;
    this.cycleStartedAt = tick;
  }

  /**
   * Exit receptive cycle.
   */
  public exitReceptiveCycle(): void {
    this.inReceptiveCycle = false;
    this.cycleStartedAt = undefined;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export interface SexualityOptions {
  labels?: string[];
  attractionAxes?: AttractionAxis[];
  attractionCondition?: AttractionCondition;
  onset?: AttractionOnset;
  fluidity?: AttractionFluidity;
  relationshipStyle?: SexualityComponent['relationshipStyle'];
  reproductiveInterest?: SexualityComponent['reproductiveInterest'];
  intimacyOpenness?: number;
}

/**
 * Create a SexualityComponent with default human-like sexuality.
 */
export function createSexualityComponent(options: SexualityOptions = {}): SexualityComponent {
  const component = new SexualityComponent();

  component.labels = options.labels ?? [];

  // Default: attracted to any morph sexually and romantically
  component.attractionAxes = options.attractionAxes ?? [
    {
      dimension: 'sexual',
      intensity: 0.7,
      morphTarget: 'any_morph',
      genderTarget: 'any_gender',
    },
    {
      dimension: 'romantic',
      intensity: 0.7,
      morphTarget: 'any_morph',
      genderTarget: 'any_gender',
    },
    {
      dimension: 'aesthetic',
      intensity: 0.5,
      morphTarget: 'any_morph',
      genderTarget: 'any_gender',
    },
  ];

  component.attractionCondition = options.attractionCondition ?? { type: 'always' };
  component.onset = options.onset ?? 'immediate';
  component.fluidity = options.fluidity ?? 'slow_change';
  component.relationshipStyle = options.relationshipStyle ?? 'serially_monogamous';
  component.reproductiveInterest = options.reproductiveInterest ?? 'open_to_offspring';
  component.intimacyOpenness = options.intimacyOpenness ?? 0.5;

  return component;
}

/**
 * Create asexual/aromantic sexuality.
 */
export function createAsexualAromantic(): SexualityComponent {
  return createSexualityComponent({
    labels: ['asexual', 'aromantic'],
    attractionAxes: [
      {
        dimension: 'sexual',
        intensity: 0,
        morphTarget: 'none',
        genderTarget: 'none',
      },
      {
        dimension: 'romantic',
        intensity: 0,
        morphTarget: 'none',
        genderTarget: 'none',
      },
      {
        dimension: 'aesthetic',
        intensity: 0.5,
        morphTarget: 'any_morph',
        genderTarget: 'any_gender',
      },
      {
        dimension: 'platonic',
        intensity: 0.8,
        morphTarget: 'any_morph',
        genderTarget: 'any_gender',
      },
    ],
    relationshipStyle: 'aromantic',
    reproductiveInterest: 'no_interest',
  });
}

/**
 * Create demisexual sexuality (attraction only after emotional bond).
 */
export function createDemisexual(): SexualityComponent {
  return createSexualityComponent({
    labels: ['demisexual'],
    attractionAxes: [
      {
        dimension: 'sexual',
        intensity: 0.6,
        morphTarget: 'any_morph',
        genderTarget: 'any_gender',
      },
      {
        dimension: 'romantic',
        intensity: 0.7,
        morphTarget: 'any_morph',
        genderTarget: 'any_gender',
      },
    ],
    attractionCondition: {
      type: 'emotional_bond',
      minEmotionalBond: 50,
    },
    onset: 'emotional_bond',
  });
}

/**
 * Create kemmer-style cyclical sexuality (Le Guin's Gethenians).
 */
export function createKemmerSexuality(): SexualityComponent {
  return createSexualityComponent({
    labels: ['kemmer'],
    attractionAxes: [
      {
        dimension: 'sexual',
        intensity: 0.9,
        morphTarget: 'contextual',
        genderTarget: 'contextual',
      },
      {
        dimension: 'romantic',
        intensity: 0.7,
        morphTarget: 'any_morph',
        genderTarget: 'any_gender',
      },
    ],
    attractionCondition: { type: 'kemmer' },
    onset: 'cyclical',
    fluidity: 'rapid_change',
  });
}

/**
 * Create hive sexuality (only attracted during specific colony needs).
 */
export function createHiveSexuality(): SexualityComponent {
  return createSexualityComponent({
    labels: ['hive_reproductive'],
    attractionAxes: [
      {
        dimension: 'sexual',
        intensity: 1.0,
        morphTarget: 'specific_morphs',
        genderTarget: 'none',
        specificMorphs: ['queen', 'king', 'drone'],
      },
    ],
    attractionCondition: { type: 'ritual' },
    onset: 'environmental',
    relationshipStyle: 'hive_structure',
    reproductiveInterest: 'instinct_driven',
  });
}

/**
 * Create mystif-style sexuality (union magic based, resonance attraction).
 */
export function createMystifSexuality(): SexualityComponent {
  return createSexualityComponent({
    labels: ['mystif', 'union_mage'],
    attractionAxes: [
      {
        dimension: 'sexual',
        intensity: 0.9,
        morphTarget: 'any_morph',
        genderTarget: 'any_gender',
      },
      {
        dimension: 'romantic',
        intensity: 0.8,
        morphTarget: 'any_morph',
        genderTarget: 'any_gender',
      },
      {
        dimension: 'magical',
        intensity: 1.0,
        morphTarget: 'any_morph',
        genderTarget: 'any_gender',
      },
    ],
    attractionCondition: { type: 'resonance' },
    onset: 'resonance',
    fluidity: 'rapid_change',
    relationshipStyle: 'polyamorous',
    reproductiveInterest: 'open_to_offspring',
    intimacyOpenness: 0.9,
  });
}
