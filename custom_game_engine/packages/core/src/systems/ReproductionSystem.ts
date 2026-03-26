/**
 * ReproductionSystem - Handles breeding, reproduction, and genetic inheritance
 *
 * Features:
 * - Genetic inheritance (Mendelian genetics)
 * - Hybrid creation (half-elves, etc.)
 * - Mutations (1% default chance)
 * - Hereditary divine transformations (wings passed to children)
 * - Inbreeding tracking
 * - Multi-generation bloodlines
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { ComponentType } from '../types.js';
import { SpeciesComponent, type Mutation, type MutationType } from '../components/SpeciesComponent.js';
import { GeneticComponent } from '../components/GeneticComponent.js';
import type { BodyComponent, BodyPart } from '../components/BodyComponent.js';
import { createBodyComponentFromPlan } from '../components/BodyPlanRegistry.js';
import {
  canHybridize,
  getHybridName,
} from '../species/SpeciesRegistry.js';
import { BiochemistryComponent } from '../components/BiochemistryComponent.js';

// ============================================================================
// Reproduction Configuration
// ============================================================================

export interface ReproductionConfig {
  /** Allow cross-species hybrids */
  allowHybrids: boolean;

  /** Enable mutations */
  enableMutations: boolean;

  /** Track inbreeding */
  trackInbreeding: boolean;

  /** Minimum genetic health for viable offspring */
  minGeneticHealth: number;
}

export const DEFAULT_REPRODUCTION_CONFIG: ReproductionConfig = {
  allowHybrids: true,
  enableMutations: true,
  trackInbreeding: true,
  minGeneticHealth: 0.3,
};

// ============================================================================
// ReproductionSystem
// ============================================================================

export class ReproductionSystem extends BaseSystem {
  public readonly id = 'ReproductionSystem';
  public readonly name = 'ReproductionSystem';
  public readonly priority = 50;
  public readonly requiredComponents: ComponentType[] = [];
  // Lazy activation: Skip entire system when no genetic exists
  public readonly activationComponents = ['genetic'] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private config: ReproductionConfig;

  constructor(config: Partial<ReproductionConfig> = {}) {
    super();
    this.config = {
      ...DEFAULT_REPRODUCTION_CONFIG,
      ...config,
    };
  }

  protected onUpdate(_ctx: SystemContext): void {
    // System provides API for reproduction, doesn't run on its own
  }

  // ==========================================================================
  // Core Reproduction
  // ==========================================================================

  /**
   * Create offspring from two parents
   */
  createOffspring(
    parent1: Entity,
    parent2: Entity,
    world: World
  ): Entity | null {
    const parent1Species = parent1.components.get(CT.Species) as SpeciesComponent | undefined;
    const parent2Species = parent2.components.get(CT.Species) as SpeciesComponent | undefined;
    const parent1Genetics = parent1.components.get(CT.Genetic) as GeneticComponent | undefined;
    const parent2Genetics = parent2.components.get(CT.Genetic) as GeneticComponent | undefined;

    if (!parent1Species || !parent2Species) {
      throw new Error('Both parents must have SpeciesComponent');
    }

    if (!parent1Genetics || !parent2Genetics) {
      throw new Error('Both parents must have GeneticComponent');
    }

    // Check reproduction compatibility
    if (!this.canReproduce(parent1Species, parent2Species, parent1Genetics, parent2Genetics)) {
      return null;
    }

    // Determine offspring species (hybrid or pure)
    const offspringSpecies = this.determineOffspringSpecies(
      parent1Species,
      parent2Species
    );

    // Inherit genetics
    const offspringGenetics = this.inheritGenetics(
      parent1Genetics,
      parent2Genetics,
      parent1.id,
      parent2.id
    );

    // Create body based on species body plan
    let offspringBody = createBodyComponentFromPlan(
      offspringSpecies.bodyPlanId,
      offspringSpecies.speciesId
    );

    // Apply hereditary modifications (divine wings, etc.)
    offspringBody = this.applyHereditaryModifications(
      offspringBody,
      parent1Genetics,
      parent2Genetics,
      world.tick
    );

    // Apply mutations (1% chance by default)
    if (this.config.enableMutations) {
      const mutationOccurred = this.applyMutation(
        offspringBody,
        offspringSpecies,
        offspringGenetics.mutationRate
      );

      if (mutationOccurred) {
        offspringSpecies.hasMutation = true;
      }
    }

    // Create offspring entity
    const offspring = world.createEntity() as EntityImpl;
    offspring.addComponent(offspringSpecies);
    offspring.addComponent(offspringGenetics);
    offspring.addComponent(offspringBody);

    // Epigenetic inheritance: nurture/trauma scores partially transfer to offspring (~15%)
    const offspringBiochem = this.inheritEpigenetics(parent1, parent2);
    if (offspringBiochem) {
      offspring.addComponent(offspringBiochem);
    }

    return offspring;
  }

  /**
   * Check if two entities can reproduce
   */
  private canReproduce(
    species1: SpeciesComponent,
    species2: SpeciesComponent,
    genetics1: GeneticComponent,
    genetics2: GeneticComponent
  ): boolean {
    // Both must be able to reproduce
    if (!species1.canReproduce || !species2.canReproduce) {
      return false;
    }

    // Same species can always reproduce
    if (species1.speciesId === species2.speciesId) {
      return true;
    }

    // Check hybrid compatibility
    if (!this.config.allowHybrids) {
      return false;
    }

    // Check genetic compatibility
    const compatible = canHybridize(species1.speciesId, species2.speciesId) ||
                      genetics1.isCompatibleWith(genetics2, species2.speciesId) ||
                      genetics2.isCompatibleWith(genetics1, species1.speciesId);

    if (!compatible) {
      return false;
    }

    // Check genetic health
    if (this.config.trackInbreeding) {
      const inbreeding = GeneticComponent.calculateInbreeding(genetics1, genetics2);
      const avgHealth = (genetics1.geneticHealth + genetics2.geneticHealth) / 2;
      const offspringHealth = avgHealth * (1 - inbreeding * 0.5);

      if (offspringHealth < this.config.minGeneticHealth) {
        return false; // Too inbred
      }
    }

    return true;
  }

  // ==========================================================================
  // Species Determination
  // ==========================================================================

  /**
   * Determine offspring species (pure or hybrid)
   */
  private determineOffspringSpecies(
    parent1Species: SpeciesComponent,
    parent2Species: SpeciesComponent
  ): SpeciesComponent {
    if (parent1Species.speciesId === parent2Species.speciesId) {
      // Same species - pure offspring
      return parent1Species.clone();
    } else {
      // Different species - create hybrid
      return this.createHybridSpecies(parent1Species, parent2Species);
    }
  }

  /**
   * Create hybrid species (half-elf, chimera, etc.)
   */
  private createHybridSpecies(
    species1: SpeciesComponent,
    species2: SpeciesComponent
  ): SpeciesComponent {
    const hybridName = getHybridName(species1.speciesId, species2.speciesId);
    const hybridId = `${species1.speciesId}_${species2.speciesId}_hybrid`;

    // Blend body plans - use parent1's plan as base for now
    // In a more sophisticated system, could actually blend plans
    const bodyPlanId = species1.bodyPlanId;

    // Blend traits - take some from each parent
    const blendedTraits = [
      ...species1.innateTraits.slice(0, Math.ceil(species1.innateTraits.length / 2)),
      ...species2.innateTraits.slice(0, Math.ceil(species2.innateTraits.length / 2)),
    ];

    // Average physical characteristics
    const avgHeight = (species1.averageHeight + species2.averageHeight) / 2;
    const avgWeight = (species1.averageWeight + species2.averageWeight) / 2;

    // Average lifespan
    const avgLifespan = (species1.lifespan + species2.lifespan) / 2;

    // Determine lifespan type (take the shorter-lived type)
    let lifespanType: SpeciesComponent['lifespanType'];
    if (species1.lifespanType === 'mortal' || species2.lifespanType === 'mortal') {
      lifespanType = 'mortal';
    } else if (species1.lifespanType === 'long_lived' || species2.lifespanType === 'long_lived') {
      lifespanType = 'long_lived';
    } else {
      lifespanType = species1.lifespanType;
    }

    return new SpeciesComponent(
      hybridId,
      hybridName,
      bodyPlanId,
      {
        commonName: hybridName,
        isHybrid: true,
        parentSpecies: [species1.speciesId, species2.speciesId],
        hybridGeneration: Math.max(species1.hybridGeneration, species2.hybridGeneration) + 1,
        innateTraits: blendedTraits,
        lifespan: avgLifespan,
        lifespanType,
        averageHeight: avgHeight,
        averageWeight: avgWeight,
        sizeCategory: species1.sizeCategory, // Take from parent1
        canReproduce: true,
        gestationPeriod: Math.max(species1.gestationPeriod ?? 0, species2.gestationPeriod ?? 0),
        maturityAge: Math.max(species1.maturityAge, species2.maturityAge),
        sapient: species1.sapient || species2.sapient,
        hasMutation: false,
        mutations: [],
      }
    );
  }

  // ==========================================================================
  // Genetic Inheritance
  // ==========================================================================

  /**
   * Inherit genetics from both parents
   */
  private inheritGenetics(
    parent1Genetics: GeneticComponent,
    parent2Genetics: GeneticComponent,
    parent1Id: string,
    parent2Id: string
  ): GeneticComponent {
    // Combine genomes (Mendelian inheritance)
    const offspringGenome = GeneticComponent.combineGenomes(
      parent1Genetics,
      parent2Genetics
    );

    // Combine hereditary modifications
    const offspringMods = GeneticComponent.combineHereditaryModifications(
      parent1Genetics,
      parent2Genetics
    );

    // Calculate inbreeding coefficient
    const inbreeding = this.config.trackInbreeding
      ? GeneticComponent.calculateInbreeding(parent1Genetics, parent2Genetics)
      : 0;

    // Calculate genetic health
    const avgHealth = (parent1Genetics.geneticHealth + parent2Genetics.geneticHealth) / 2;
    const geneticHealth = avgHealth * (1 - inbreeding * 0.5);

    // Mutation rate (average of parents, influenced by inbreeding)
    const mutationRate = ((parent1Genetics.mutationRate + parent2Genetics.mutationRate) / 2) *
                        (1 + inbreeding * 2); // Inbreeding increases mutations

    // Compatible species (union of both parents)
    const compatibleSpecies = [
      ...new Set([
        ...parent1Genetics.compatibleSpecies,
        ...parent2Genetics.compatibleSpecies,
      ]),
    ];

    return new GeneticComponent({
      genome: offspringGenome,
      hereditaryModifications: offspringMods,
      mutationRate,
      compatibleSpecies,
      geneticHealth,
      inbreedingCoefficient: inbreeding,
      parentIds: [parent1Id, parent2Id],
      generation: Math.max(parent1Genetics.generation, parent2Genetics.generation) + 1,
    });
  }

  // ==========================================================================
  // Hereditary Modifications
  // ==========================================================================

  /**
   * Apply hereditary modifications (divine wings passed to children)
   */
  private applyHereditaryModifications(
    body: BodyComponent,
    parent1Genetics: GeneticComponent,
    parent2Genetics: GeneticComponent,
    tick: number
  ): BodyComponent {
    const allModifications = [
      ...parent1Genetics.getInheritableModifications(),
      ...parent2Genetics.getInheritableModifications(),
    ];

    for (const mod of allModifications) {
      // Roll for inheritance
      if (Math.random() < mod.inheritanceChance) {
        // Inherit this modification
        this.applyModificationToBody(body, mod, tick);
      }
    }

    return body;
  }

  /**
   * Apply a specific modification to a body
   */
  private applyModificationToBody(
    body: BodyComponent,
    mod: GeneticComponent['hereditaryModifications'][0],
    tick: number
  ): void {
    switch (mod.type) {
      case 'wings':
        this.addWingsToBody(body, mod.bodyPartCount ?? 2);
        break;
      case 'extra_arms':
        this.addArmsToBody(body, mod.bodyPartCount ?? 2);
        break;
      case 'extra_legs':
        this.addLegsToBody(body, mod.bodyPartCount ?? 2);
        break;
      case 'tail':
        this.addTailToBody(body);
        break;
      case 'horns':
        this.addHornsToBody(body);
        break;
      // Add more as needed
    }

    // Track this modification in body
    body.modifications.push({
      id: `hereditary_${mod.type}_${tick}`,
      name: `Hereditary ${mod.type}`,
      source: 'genetic',
      effects: {
        propertyModified: { property: 'hereditaryTrait', value: { type: mod.type } }
      },
      permanent: true,
      createdAt: tick,
    });
  }

  // ==========================================================================
  // Mutations
  // ==========================================================================
  // Epigenetic Inheritance
  // ==========================================================================

  /**
   * Inherit epigenetic marks from parents.
   * Nurture and trauma scores partially transfer to offspring (~15%).
   * - Nurtured parents → offspring start with higher oxytocin baseline
   * - Traumatized parents → offspring start with higher cortisol baseline
   * Creates emergent cycle: nurtured Norns → better parents → bonding-predisposed offspring
   */
  private inheritEpigenetics(parent1: Entity, parent2: Entity): BiochemistryComponent | null {
    const p1Biochem = parent1.components.get(CT.Biochemistry) as BiochemistryComponent | undefined;
    const p2Biochem = parent2.components.get(CT.Biochemistry) as BiochemistryComponent | undefined;

    // If neither parent has biochemistry, no epigenetic marks to pass
    if (!p1Biochem && !p2Biochem) {
      return new BiochemistryComponent();
    }

    const INHERITANCE_RATE = 0.15; // ~15% transfer, matching ImprintingSystem 10% blend pattern

    // Average parent scores, defaulting to 0 if one parent lacks biochemistry
    const p1Nurture = p1Biochem?.nurtureScore ?? 0;
    const p2Nurture = p2Biochem?.nurtureScore ?? 0;
    const avgNurture = (p1Nurture + p2Nurture) / 2;

    // Epigenetic baselines from parents (their own baselines + their accrued scores)
    const p1OxyBaseline = (p1Biochem?.epigeneticOxytocinBaseline ?? 0) + (p1Biochem?.nurtureScore ?? 0);
    const p2OxyBaseline = (p2Biochem?.epigeneticOxytocinBaseline ?? 0) + (p2Biochem?.nurtureScore ?? 0);
    const avgOxyBaseline = (p1OxyBaseline + p2OxyBaseline) / 2;

    // Cortisol baseline from sustained stress/trauma
    const p1CortBaseline = p1Biochem?.epigeneticCortisolBaseline ?? 0;
    const p2CortBaseline = p2Biochem?.epigeneticCortisolBaseline ?? 0;
    // High sustained cortisol in parents creates epigenetic trauma marks
    const p1TraumaContribution = Math.max(0, (p1Biochem?.cortisol ?? 0) - 0.3);
    const p2TraumaContribution = Math.max(0, (p2Biochem?.cortisol ?? 0) - 0.3);
    const avgCortBaseline = ((p1CortBaseline + p1TraumaContribution) + (p2CortBaseline + p2TraumaContribution)) / 2;

    // Apply inheritance rate and clamp
    const inheritedOxyBaseline = Math.min(0.5, avgOxyBaseline * INHERITANCE_RATE);
    const inheritedCortBaseline = Math.min(0.5, avgCortBaseline * INHERITANCE_RATE);
    const inheritedNurture = Math.min(0.3, avgNurture * INHERITANCE_RATE);

    return new BiochemistryComponent({
      oxytocin: 0.1 + inheritedOxyBaseline, // Start slightly above minimum for nurtured offspring
      serotonin: 0.3,
      dopamine: 0.2,
      cortisol: 0.1 + inheritedCortBaseline, // Start higher for traumatized offspring
      handInteractionScore: 0,
      nurtureScore: inheritedNurture,
      epigeneticOxytocinBaseline: inheritedOxyBaseline,
      epigeneticCortisolBaseline: inheritedCortBaseline,
    });
  }

  // ==========================================================================

  /**
   * Apply random mutation to offspring (1% default chance)
   */
  private applyMutation(
    body: BodyComponent,
    species: SpeciesComponent,
    mutationRate: number
  ): boolean {
    if (Math.random() >= mutationRate) {
      return false; // No mutation
    }

    const mutationType = this.rollMutationType();
    const mutation = this.createMutation(mutationType, body);

    if (mutation) {
      species.addMutation(mutation);
      return true;
    }

    return false;
  }

  /**
   * Roll for mutation type
   */
  private rollMutationType(): MutationType {
    const types: MutationType[] = [
      'extra_limb',
      'missing_limb',
      'enhanced_organ',
      'diminished_organ',
      'sensory_change',
      'size_change',
      'color_change',
      'metabolic',
    ];

    const selected = types[Math.floor(Math.random() * types.length)];
    if (!selected) {
      throw new Error('Failed to select mutation type');
    }
    return selected;
  }

  /**
   * Create a mutation based on type
   */
  private createMutation(type: MutationType, body: BodyComponent): Mutation | null {
    switch (type) {
      case 'extra_limb':
        return this.createExtraLimbMutation(body);
      case 'missing_limb':
        return this.createMissingLimbMutation(body);
      case 'size_change':
        return this.createSizeChangeMutation(body);
      case 'enhanced_organ':
        return this.createEnhancedOrganMutation();
      case 'diminished_organ':
        return this.createDiminishedOrganMutation();
      case 'sensory_change':
        return this.createSensoryChangeMutation();
      case 'color_change':
        return this.createColorChangeMutation();
      case 'metabolic':
        return this.createMetabolicMutation();
      default:
        return null;
    }
  }

  /**
   * Create extra limb mutation
   */
  private createExtraLimbMutation(body: BodyComponent): Mutation {
    // Pick a random limb type to add
    const limbTypes = ['arm', 'leg', 'tentacle'] as const;
    const limbType = limbTypes[Math.floor(Math.random() * limbTypes.length)];

    // Add the limb
    if (limbType === 'arm') {
      this.addArmsToBody(body, 1);
    } else if (limbType === 'leg') {
      this.addLegsToBody(body, 1);
    } else if (limbType === 'tentacle') {
      this.addTentacleToBody(body);
    }

    return {
      id: `mutation_extra_${limbType}_${Date.now()}`,
      type: 'extra_limb',
      bodyPartAffected: limbType,
      severity: 'moderate',
      beneficial: true,
      description: `Born with an extra ${limbType}`,
      statModifiers: { manipulation: limbType === 'arm' ? 0.1 : 0 },
      canInherit: true,
      inheritanceChance: 0.3, // 30% chance offspring inherit this
    };
  }

  /**
   * Create missing limb mutation
   */
  private createMissingLimbMutation(body: BodyComponent): Mutation {
    // Pick a random non-vital limb to remove
    const nonVitalParts = Object.values(body.parts).filter(p => !p.vital);
    if (nonVitalParts.length > 0) {
      const partToRemove = nonVitalParts[Math.floor(Math.random() * nonVitalParts.length)]!;
      delete body.parts[partToRemove.id];

      return {
        id: `mutation_missing_${partToRemove.type}_${Date.now()}`,
        type: 'missing_limb',
        bodyPartAffected: partToRemove.type,
        severity: 'moderate',
        beneficial: false,
        description: `Born missing a ${partToRemove.type}`,
        statModifiers: { mobility: partToRemove.type === 'leg' ? -0.3 : 0 },
        canInherit: true,
        inheritanceChance: 0.2,
      };
    }

    return {
      id: `mutation_none_${Date.now()}`,
      type: 'missing_limb',
      severity: 'minor',
      beneficial: false,
      description: 'Minor cosmetic mutation',
      canInherit: false,
      inheritanceChance: 0,
    };
  }

  /**
   * Create size change mutation
   */
  private createSizeChangeMutation(body: BodyComponent): Mutation {
    const larger = Math.random() < 0.5;

    if (larger && body.size !== 'colossal') {
      const sizes = ['tiny', 'small', 'medium', 'large', 'huge', 'colossal'];
      const currentIndex = sizes.indexOf(body.size);
      body.size = sizes[Math.min(currentIndex + 1, sizes.length - 1)] as BodyComponent['size'];
    } else if (!larger && body.size !== 'tiny') {
      const sizes = ['tiny', 'small', 'medium', 'large', 'huge', 'colossal'];
      const currentIndex = sizes.indexOf(body.size);
      body.size = sizes[Math.max(currentIndex - 1, 0)] as BodyComponent['size'];
    }

    return {
      id: `mutation_size_${Date.now()}`,
      type: 'size_change',
      severity: 'minor',
      beneficial: larger,
      description: `Born ${larger ? 'larger' : 'smaller'} than normal`,
      statModifiers: { strength: larger ? 0.2 : -0.1 },
      needsModifiers: { hunger: larger ? 1.3 : 0.7 },
      canInherit: true,
      inheritanceChance: 0.4,
    };
  }

  /**
   * Create enhanced organ mutation
   */
  private createEnhancedOrganMutation(): Mutation {
    return {
      id: `mutation_enhanced_organ_${Date.now()}`,
      type: 'enhanced_organ',
      bodyPartAffected: 'heart',
      severity: 'moderate',
      beneficial: true,
      description: 'Born with an enhanced heart',
      statModifiers: { endurance: 0.2 },
      canInherit: true,
      inheritanceChance: 0.25,
    };
  }

  /**
   * Create diminished organ mutation
   */
  private createDiminishedOrganMutation(): Mutation {
    const organs = ['lung', 'kidney', 'liver'] as const;
    const organ = organs[Math.floor(Math.random() * organs.length)]!;

    return {
      id: `mutation_diminished_${organ}_${Date.now()}`,
      type: 'diminished_organ',
      bodyPartAffected: organ,
      severity: 'moderate',
      beneficial: false,
      description: `Born with a weakened ${organ}`,
      statModifiers: { endurance: -0.15 },
      canInherit: true,
      inheritanceChance: 0.2,
    };
  }

  /**
   * Create sensory change mutation
   */
  private createSensoryChangeMutation(): Mutation {
    const enhanced = Math.random() < 0.5;
    const senses = ['vision', 'hearing', 'smell'] as const;
    const sense = senses[Math.floor(Math.random() * senses.length)]!;

    return {
      id: `mutation_sensory_${sense}_${Date.now()}`,
      type: 'sensory_change',
      bodyPartAffected: sense === 'vision' ? 'eye' : sense === 'hearing' ? 'ear' : 'nose',
      severity: 'minor',
      beneficial: enhanced,
      description: `${enhanced ? 'Enhanced' : 'Diminished'} ${sense}`,
      statModifiers: { perception: enhanced ? 0.15 : -0.1 },
      canInherit: true,
      inheritanceChance: 0.3,
    };
  }

  /**
   * Create color change mutation
   */
  private createColorChangeMutation(): Mutation {
    return {
      id: `mutation_color_${Date.now()}`,
      type: 'color_change',
      severity: 'minor',
      beneficial: false,
      description: 'Born with unusual coloring',
      canInherit: true,
      inheritanceChance: 0.5,
    };
  }

  /**
   * Create metabolic mutation
   */
  private createMetabolicMutation(): Mutation {
    const faster = Math.random() < 0.5;

    return {
      id: `mutation_metabolic_${Date.now()}`,
      type: 'metabolic',
      severity: 'minor',
      beneficial: !faster, // Slower metabolism = less hunger
      description: `${faster ? 'Fast' : 'Slow'} metabolism`,
      needsModifiers: {
        hunger: faster ? 1.5 : 0.7,
        energy: faster ? 1.2 : 0.9,
      },
      canInherit: true,
      inheritanceChance: 0.35,
    };
  }

  // ==========================================================================
  // Body Part Helpers
  // ==========================================================================

  private addWingsToBody(body: BodyComponent, count: number = 2): void {
    for (let i = 0; i < count; i++) {
      const wingId = `wing_hereditary_${Date.now()}_${i}`;
      const wing: BodyPart = {
        id: wingId,
        type: 'wing',
        name: `Wing ${i + 1}`,
        vital: false,
        health: 100,
        maxHealth: 100,
        functions: ['flight'],
        affectsSkills: ['flying'],
        affectsActions: ['fly'],
        injuries: [],
        bandaged: false,
        splinted: false,
        infected: false,
        modifications: [],
      };
      body.parts[wingId] = wing;
    }
  }

  private addArmsToBody(body: BodyComponent, count: number): void {
    const currentArms = Object.values(body.parts).filter(p => p.type === 'arm').length;

    for (let i = 0; i < count; i++) {
      const armId = `arm_hereditary_${currentArms + i + 1}`;
      const arm: BodyPart = {
        id: armId,
        type: 'arm',
        name: `Arm ${currentArms + i + 1}`,
        vital: false,
        health: 100,
        maxHealth: 100,
        functions: ['manipulation'],
        affectsSkills: ['crafting', 'building'],
        affectsActions: ['craft', 'build', 'gather'],
        injuries: [],
        bandaged: false,
        splinted: false,
        infected: false,
        modifications: [],
      };
      body.parts[armId] = arm;
    }
  }

  private addLegsToBody(body: BodyComponent, count: number): void {
    const currentLegs = Object.values(body.parts).filter(p => p.type === 'leg').length;

    for (let i = 0; i < count; i++) {
      const legId = `leg_hereditary_${currentLegs + i + 1}`;
      const leg: BodyPart = {
        id: legId,
        type: 'leg',
        name: `Leg ${currentLegs + i + 1}`,
        vital: false,
        health: 100,
        maxHealth: 100,
        functions: ['locomotion'],
        affectsSkills: ['running'],
        affectsActions: ['move', 'run'],
        injuries: [],
        bandaged: false,
        splinted: false,
        infected: false,
        modifications: [],
      };
      body.parts[legId] = leg;
    }
  }

  private addTentacleToBody(body: BodyComponent): void {
    const currentTentacles = Object.values(body.parts).filter(p => p.type === 'tentacle').length;
    const tentacleId = `tentacle_hereditary_${currentTentacles + 1}`;
    const tentacle: BodyPart = {
      id: tentacleId,
      type: 'tentacle',
      name: `Tentacle ${currentTentacles + 1}`,
      vital: false,
      health: 80,
      maxHealth: 80,
      functions: ['manipulation', 'locomotion'],
      affectsSkills: ['crafting'],
      affectsActions: ['grab', 'manipulate'],
      injuries: [],
      bandaged: false,
      splinted: false,
      infected: false,
      modifications: [],
    };
    body.parts[tentacleId] = tentacle;
  }

  private addTailToBody(body: BodyComponent): void {
    const tailId = `tail_hereditary_${Date.now()}`;
    const tail: BodyPart = {
      id: tailId,
      type: 'tail',
      name: 'Tail',
      vital: false,
      health: 80,
      maxHealth: 80,
      functions: ['balance'],
      affectsSkills: ['acrobatics'],
      affectsActions: [],
      injuries: [],
      bandaged: false,
      splinted: false,
      infected: false,
      modifications: [],
    };
    body.parts[tailId] = tail;
  }

  private addHornsToBody(body: BodyComponent): void {
    const hornId = `horn_hereditary_${Date.now()}`;
    const horn: BodyPart = {
      id: hornId,
      type: 'horn',
      name: 'Horns',
      vital: false,
      health: 150,
      maxHealth: 150,
      functions: ['attack'],
      affectsSkills: ['combat'],
      affectsActions: ['attack'],
      injuries: [],
      bandaged: false,
      splinted: false,
      infected: false,
      modifications: [],
    };
    body.parts[hornId] = horn;
  }
}
