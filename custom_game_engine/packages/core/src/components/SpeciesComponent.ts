/**
 * SpeciesComponent - Defines an entity's species and body plan
 *
 * Links species identity to body plans, supporting:
 * - Standard species (human, elf, insectoid, etc.)
 * - Hybrids (half-elf, chimeras)
 * - Mutations (extra limbs, missing parts)
 * - Species-specific traits and abilities
 */

import { ComponentBase } from '../ecs/Component.js';

// ============================================================================
// Species Traits
// ============================================================================

export interface SpeciesTrait {
  id: string;
  name: string;
  description: string;
  category: 'physical' | 'sensory' | 'magical' | 'spiritual' | 'social';

  // Gameplay effects
  needsModifier?: Record<string, number>;     // e.g., { hunger: 0.5 }
  skillBonus?: Record<string, number>;        // e.g., { crafting: 0.2 }
  abilitiesGranted?: string[];                // e.g., ['flight', 'darkvision']
  vulnerabilities?: string[];                 // e.g., ['iron', 'sunlight']
}

// ============================================================================
// Mutations
// ============================================================================

export type MutationType =
  | 'extra_limb'        // Extra arm/leg/wing/tentacle
  | 'missing_limb'      // Born without expected limb
  | 'enhanced_organ'    // Stronger heart, larger lungs
  | 'diminished_organ'  // Weaker organ
  | 'sensory_change'    // Extra eyes, echolocation, color blindness
  | 'size_change'       // Larger/smaller than normal
  | 'color_change'      // Different skin/scale/fur color
  | 'metabolic'         // Different hunger/thirst rates
  | 'skeletal'          // Bone structure changes
  | 'muscular';         // Muscle density/strength changes

export interface Mutation {
  id: string;
  type: MutationType;
  bodyPartAffected?: string;   // Which body part mutated (if applicable)
  severity: 'minor' | 'moderate' | 'major';
  beneficial: boolean;
  description: string;

  // Effects on gameplay
  statModifiers?: Record<string, number>;  // e.g., { strength: 0.2 }
  needsModifiers?: Record<string, number>; // e.g., { hunger: 1.5 }

  // Hereditary
  canInherit: boolean;
  inheritanceChance: number; // 0-1
}

// ============================================================================
// SpeciesComponent
// ============================================================================

export class SpeciesComponent extends ComponentBase {
  public readonly type = 'species';

  // Species identity
  public speciesId: string;          // e.g., 'human', 'elf', 'thrakeen_insectoid'
  public speciesName: string;        // e.g., 'Human', 'Elf', 'Thrakeen'
  public commonName?: string;        // e.g., 'Human' (for display)
  public name: string;               // Alias for speciesName (for galactic council compatibility)

  // Body plan reference
  public bodyPlanId: string;         // Links to BodyPlanRegistry

  // Galactic-scale properties
  public techLevel: number;          // Technology level (1-15+, space age at 7+)
  public population: number;         // Total population of this species
  public homeworld?: string;         // Name of homeworld planet

  // Hybrid info
  public isHybrid: boolean;
  public parentSpecies?: [string, string];  // ['elf', 'human'] for half-elf
  public hybridGeneration: number;   // 1 = first gen, 2 = second gen, etc.

  // Species traits
  public innateTraits: SpeciesTrait[];

  // Mutation status
  public hasMutation: boolean;
  public mutations: Mutation[];

  // Lifespan (in game years)
  public lifespan: number;           // Expected lifespan
  public lifespanType: 'mortal' | 'long_lived' | 'ageless' | 'immortal';

  // Physical characteristics
  public averageHeight: number;      // cm
  public averageWeight: number;      // kg
  public sizeCategory: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'colossal';

  // Reproduction
  public canReproduce: boolean;
  public gestationPeriod?: number;   // Days (if applicable)
  public maturityAge: number;        // Age when can reproduce (years)

  // Social/Cultural
  public sapient: boolean;           // Intelligent/self-aware
  public socialStructure?: string;   // 'tribal', 'feudal', 'democratic', etc.

  // Language (Phase 4D integration)
  public nativeLanguageId?: string;  // Reference to species' native language

  constructor(
    speciesId: string,
    speciesName: string,
    bodyPlanId: string,
    options: Partial<SpeciesComponent> = {}
  ) {
    super();

    this.speciesId = speciesId;
    this.speciesName = speciesName;
    this.name = options.name ?? speciesName; // Default to speciesName
    this.bodyPlanId = bodyPlanId;

    // Galactic-scale defaults
    this.techLevel = options.techLevel ?? 1;
    this.population = options.population ?? 0;
    this.homeworld = options.homeworld;

    // Defaults
    this.isHybrid = options.isHybrid ?? false;
    this.parentSpecies = options.parentSpecies;
    this.hybridGeneration = options.hybridGeneration ?? 0;
    this.innateTraits = options.innateTraits ?? [];
    this.hasMutation = options.hasMutation ?? false;
    this.mutations = options.mutations ?? [];
    this.lifespan = options.lifespan ?? 70;
    this.lifespanType = options.lifespanType ?? 'mortal';
    this.averageHeight = options.averageHeight ?? 170;
    this.averageWeight = options.averageWeight ?? 70;
    this.sizeCategory = options.sizeCategory ?? 'medium';
    this.canReproduce = options.canReproduce ?? true;
    this.gestationPeriod = options.gestationPeriod ?? 270; // ~9 months
    this.maturityAge = options.maturityAge ?? 18;
    this.sapient = options.sapient ?? true;
    this.socialStructure = options.socialStructure;
    this.commonName = options.commonName ?? speciesName;
    this.nativeLanguageId = options.nativeLanguageId;
  }

  /**
   * Add a trait to this species
   */
  addTrait(trait: SpeciesTrait): void {
    if (!this.innateTraits.find(t => t.id === trait.id)) {
      this.innateTraits.push(trait);
    }
  }

  /**
   * Remove a trait from this species
   */
  removeTrait(traitId: string): void {
    this.innateTraits = this.innateTraits.filter(t => t.id !== traitId);
  }

  /**
   * Add a mutation
   */
  addMutation(mutation: Mutation): void {
    this.mutations.push(mutation);
    this.hasMutation = true;
  }

  /**
   * Get all traits (including mutations that grant traits)
   */
  getAllTraits(): SpeciesTrait[] {
    return [...this.innateTraits];
  }

  /**
   * Check if this species has a specific trait
   */
  hasTrait(traitId: string): boolean {
    return this.innateTraits.some(t => t.id === traitId);
  }

  /**
   * Get combined needs modifiers from all traits
   */
  getNeedsModifiers(): Record<string, number> {
    const modifiers: Record<string, number> = {};

    for (const trait of this.innateTraits) {
      if (trait.needsModifier) {
        for (const [need, modifier] of Object.entries(trait.needsModifier)) {
          modifiers[need] = (modifiers[need] ?? 1.0) * modifier;
        }
      }
    }

    // Apply mutation modifiers
    for (const mutation of this.mutations) {
      if (mutation.needsModifiers) {
        for (const [need, modifier] of Object.entries(mutation.needsModifiers)) {
          modifiers[need] = (modifiers[need] ?? 1.0) * modifier;
        }
      }
    }

    return modifiers;
  }

  /**
   * Get combined skill bonuses from all traits
   */
  getSkillBonuses(): Record<string, number> {
    const bonuses: Record<string, number> = {};

    for (const trait of this.innateTraits) {
      if (trait.skillBonus) {
        for (const [skill, bonus] of Object.entries(trait.skillBonus)) {
          bonuses[skill] = (bonuses[skill] ?? 0) + bonus;
        }
      }
    }

    // Apply mutation modifiers
    for (const mutation of this.mutations) {
      if (mutation.statModifiers) {
        for (const [stat, modifier] of Object.entries(mutation.statModifiers)) {
          bonuses[stat] = (bonuses[stat] ?? 0) + modifier;
        }
      }
    }

    return bonuses;
  }

  /**
   * Get all abilities granted by traits
   */
  getGrantedAbilities(): string[] {
    const abilities: string[] = [];

    for (const trait of this.innateTraits) {
      if (trait.abilitiesGranted) {
        abilities.push(...trait.abilitiesGranted);
      }
    }

    return [...new Set(abilities)]; // Remove duplicates
  }

  /**
   * Get all vulnerabilities from traits
   */
  getVulnerabilities(): string[] {
    const vulnerabilities: string[] = [];

    for (const trait of this.innateTraits) {
      if (trait.vulnerabilities) {
        vulnerabilities.push(...trait.vulnerabilities);
      }
    }

    return [...new Set(vulnerabilities)];
  }

  /**
   * Check if this species is compatible for reproduction with another
   */
  isCompatibleWith(otherSpecies: SpeciesComponent): boolean {
    // Same species can always reproduce
    if (this.speciesId === otherSpecies.speciesId) {
      return true;
    }

    // Check if either is a hybrid of the other
    if (this.isHybrid && this.parentSpecies) {
      if (this.parentSpecies.includes(otherSpecies.speciesId)) {
        return true;
      }
    }

    if (otherSpecies.isHybrid && otherSpecies.parentSpecies) {
      if (otherSpecies.parentSpecies.includes(this.speciesId)) {
        return true;
      }
    }

    // Otherwise, need to check species registry for compatibility
    // This will be handled by the ReproductionSystem
    return false;
  }

  /**
   * Get a display name for this species
   */
  getDisplayName(): string {
    if (this.isHybrid && this.parentSpecies) {
      const [parent1, parent2] = this.parentSpecies;
      return `${parent1}-${parent2} Hybrid`;
    }
    return this.commonName ?? this.speciesName;
  }

  /**
   * Clone this species component
   */
  clone(): SpeciesComponent {
    return new SpeciesComponent(
      this.speciesId,
      this.speciesName,
      this.bodyPlanId,
      {
        name: this.name,
        techLevel: this.techLevel,
        population: this.population,
        homeworld: this.homeworld,
        isHybrid: this.isHybrid,
        parentSpecies: this.parentSpecies ? [...this.parentSpecies] : undefined,
        hybridGeneration: this.hybridGeneration,
        innateTraits: this.innateTraits.map(t => ({ ...t })),
        hasMutation: this.hasMutation,
        mutations: this.mutations.map(m => ({ ...m })),
        lifespan: this.lifespan,
        lifespanType: this.lifespanType,
        averageHeight: this.averageHeight,
        averageWeight: this.averageWeight,
        sizeCategory: this.sizeCategory,
        canReproduce: this.canReproduce,
        gestationPeriod: this.gestationPeriod,
        maturityAge: this.maturityAge,
        sapient: this.sapient,
        socialStructure: this.socialStructure,
        commonName: this.commonName,
        nativeLanguageId: this.nativeLanguageId,
      }
    );
  }
}
