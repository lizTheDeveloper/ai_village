/**
 * UpliftedTraitComponent - Marks an entity as genetically uplifted to sapience
 *
 * Tracks origin, awakening moment, and relationship to uplifters.
 * Added to entities that achieve sapience through uplift programs.
 */

import { ComponentBase } from '../ecs/Component.js';

export type UpliftAttitude =
  | 'grateful'      // Thankful for gift of sapience
  | 'resentful'     // Angry about being changed
  | 'neutral'       // Accepts it as fact
  | 'conflicted'    // Mixed feelings
  | 'reverent'      // Worships uplifters as gods
  | 'rebellious';   // Wants independence/revenge

export interface AwakeningMoment {
  tick: number;
  generation: number;
  firstThought: string;          // LLM-generated
  firstQuestion: string;         // Usually "What am I?"
  firstEmotion: string;          // Wonder, fear, joy, confusion
  firstWord: string;             // First spoken word
  witnessIds: string[];          // Who was present
}

export class UpliftedTraitComponent extends ComponentBase {
  public readonly type = 'uplifted_trait';

  // Origin
  public programId: string;              // Uplift program ID
  public sourceSpeciesId: string;        // Original animal species
  public upliftedSpeciesId: string;      // New uplifted species ID
  public generation: number;             // Which generation (0 = first uplifted)

  // Awakening
  public sapientSince: number;           // Tick of awakening
  public awakeningMoment?: AwakeningMoment;
  public naturalBorn: boolean;           // True if born sapient (gen 1+)

  // Identity
  public givenName: string;              // Name given by uplifters
  public chosenName?: string;            // Name they chose for themselves
  public understandsOrigin: boolean;     // Knows they were engineered
  public attitude: UpliftAttitude;

  // Retained Traits
  public retainedInstincts: string[];    // Animal instincts still present
  public enhancedAbilities: string[];    // New sapient abilities

  // Social Integration
  public legalStatus: 'citizen' | 'ward' | 'property' | 'undefined';
  public culturalIdentity: 'uplifter' | 'source_species' | 'hybrid' | 'new';

  // Uplifter Relationships
  public leadScientistId?: string;      // Who led their uplift
  public creatorRelationship?: string;  // Relationship to lead scientist

  constructor(options: Partial<UpliftedTraitComponent> = {}) {
    super();

    this.programId = options.programId ?? '';
    this.sourceSpeciesId = options.sourceSpeciesId ?? '';
    this.upliftedSpeciesId = options.upliftedSpeciesId ?? '';
    this.generation = options.generation ?? 0;

    this.sapientSince = options.sapientSince ?? 0;
    this.awakeningMoment = options.awakeningMoment;
    this.naturalBorn = options.naturalBorn ?? false;

    this.givenName = options.givenName ?? 'Unnamed';
    this.chosenName = options.chosenName;
    this.understandsOrigin = options.understandsOrigin ?? false;
    this.attitude = options.attitude ?? 'neutral';

    this.retainedInstincts = options.retainedInstincts ?? [];
    this.enhancedAbilities = options.enhancedAbilities ?? [];

    this.legalStatus = options.legalStatus ?? 'undefined';
    this.culturalIdentity = options.culturalIdentity ?? 'new';

    this.leadScientistId = options.leadScientistId;
    this.creatorRelationship = options.creatorRelationship;
  }

  /**
   * Get display name (chosen > given)
   */
  getDisplayName(): string {
    return this.chosenName ?? this.givenName;
  }

  /**
   * Check if first generation uplifted
   */
  isFirstGeneration(): boolean {
    return this.generation === 0 && !this.naturalBorn;
  }
}
