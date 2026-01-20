/**
 * UpliftedSpeciesRegistrationSystem - Creates new species for uplifted beings
 *
 * When sapience emerges in an uplift program, this system:
 * - Creates a new species template (uplifted_<source>)
 * - Registers in SpeciesRegistry
 * - Defines body plan for uplifted form
 * - Sets reproduction compatibility
 * - Generates species lore/description
 *
 * NOT YET INTEGRATED - Standalone implementation for testing
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World, Entity } from '../ecs/index.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { UpliftProgramComponent } from '../components/UpliftProgramComponent.js';
import type { SpeciesComponent, SpeciesTrait } from '../components/SpeciesComponent.js';
import type { SpeciesTemplate } from '../species/SpeciesRegistry.js';

/**
 * Registry of uplifted species templates
 * NOT YET INTEGRATED - will connect to SpeciesRegistry
 */
export class UpliftedSpeciesRegistry {
  private upliftedSpecies: Map<string, SpeciesTemplate> = new Map();

  /**
   * Register a new uplifted species
   */
  registerUpliftedSpecies(template: SpeciesTemplate): void {
    this.upliftedSpecies.set(template.speciesId, template);
  }

  /**
   * Get uplifted species template
   */
  getUpliftedSpecies(speciesId: string): SpeciesTemplate | undefined {
    return this.upliftedSpecies.get(speciesId);
  }

  /**
   * Get all uplifted species
   */
  getAllUpliftedSpecies(): SpeciesTemplate[] {
    return Array.from(this.upliftedSpecies.values());
  }

  /**
   * Check if species is uplifted
   */
  isUpliftedSpecies(speciesId: string): boolean {
    return speciesId.startsWith('uplifted_');
  }
}

export class UpliftedSpeciesRegistrationSystem extends BaseSystem {
  readonly id = 'UpliftedSpeciesRegistrationSystem';
  readonly priority = 570;
  readonly requiredComponents = [] as const;
  // Only run when uplift program components exist (O(1) activation check)
  readonly activationComponents = [CT.UpliftProgram] as const;

  protected readonly throttleInterval = 200; // Every 10 seconds

  // Registry of uplifted species (standalone - not yet integrated with SpeciesRegistry)
  private upliftedRegistry: UpliftedSpeciesRegistry = new UpliftedSpeciesRegistry();

  // Track which programs have had species registered
  private registeredPrograms: Set<string> = new Set();

  protected onUpdate(ctx: SystemContext): void {
    // Get all uplift programs in awakening stage
    const programs = ctx.world.query()
      .with(CT.UpliftProgram)
      .executeEntities();

    for (const programEntity of programs) {
      const program = programEntity.getComponent(CT.UpliftProgram) as UpliftProgramComponent;

      // Check if species should be registered
      if (this.shouldRegisterSpecies(program)) {
        this.registerUpliftedSpecies(ctx, program);
      }
    }
  }

  /**
   * Check if species should be registered
   */
  private shouldRegisterSpecies(program: UpliftProgramComponent): boolean {
    // Register when first sapient individual emerges
    return program.stage === 'awakening' &&
           !this.registeredPrograms.has(program.programId);
  }

  /**
   * Register a new uplifted species
   */
  private registerUpliftedSpecies(ctx: SystemContext, program: UpliftProgramComponent): void {
    // Get source species template
    const sourceSpecies = this.getSourceSpeciesTemplate(ctx.world, program.sourceSpeciesId);
    if (!sourceSpecies) {
      console.error(`Source species not found: ${program.sourceSpeciesId}`);
      return;
    }

    // Create uplifted species template
    const upliftedSpecies = this.createUpliftedSpeciesTemplate(sourceSpecies, program);

    // Register in uplifted registry
    this.upliftedRegistry.registerUpliftedSpecies(upliftedSpecies);

    // Mark program as registered
    this.registeredPrograms.add(program.programId);

    // Update program
    program.targetSpeciesId = upliftedSpecies.speciesId;

    // Emit event
    this.events.emit('uplifted_species_registered', {
      speciesId: upliftedSpecies.speciesId,
      speciesName: upliftedSpecies.speciesName,
      programId: program.programId,
      sourceSpeciesId: program.sourceSpeciesId,
    });
  }

  /**
   * Get source species template
   * TODO: Integration point - query actual SpeciesRegistry
   */
  private getSourceSpeciesTemplate(world: World, speciesId: string): SpeciesComponent | null {
    // Get any entity with this species
    const speciesEntities = world.query()
      .with(CT.Species)
      .executeEntities();

    for (const entity of speciesEntities) {
      const species = entity.getComponent(CT.Species) as SpeciesComponent;
      if (species.speciesId === speciesId) {
        return species;
      }
    }

    return null;
  }

  /**
   * Create uplifted species template
   */
  private createUpliftedSpeciesTemplate(
    sourceSpecies: SpeciesComponent,
    program: UpliftProgramComponent
  ): SpeciesTemplate {
    const upliftedId = `uplifted_${sourceSpecies.speciesId}`;
    const neoName = this.generateNeoName(sourceSpecies.speciesName);

    // Retain source traits and add uplift traits
    const innateTraits: SpeciesTrait[] = [
      ...this.getRetainedTraits(sourceSpecies),
      ...this.getUpliftedTraits(),
    ];

    // Determine compatible species (can hybridize with source and other uplifted)
    const compatibleSpecies = this.determineCompatibility(sourceSpecies);

    // Calculate uplifted lifespan (usually extended)
    const upliftedLifespan = this.calculateUpliftedLifespan(sourceSpecies);

    // Size adjustments (brain expansion may increase size)
    const sizeAdjustment = this.calculateSizeAdjustment(program);

    return {
      speciesId: upliftedId,
      speciesName: `Uplifted ${sourceSpecies.speciesName}`,
      commonName: neoName,
      description: this.generateDescription(sourceSpecies, program),
      bodyPlanId: this.determineBodyPlan(sourceSpecies),

      innateTraits,
      compatibleSpecies,
      mutationRate: 0.015, // Default mutation rate for uplifted species

      averageHeight: (sourceSpecies.averageHeight || 100) * sizeAdjustment,
      averageWeight: (sourceSpecies.averageWeight || 50) * sizeAdjustment,
      sizeCategory: this.calculateSizeCategory(sourceSpecies, sizeAdjustment),

      lifespan: upliftedLifespan,
      lifespanType: 'long_lived',
      maturityAge: (sourceSpecies.maturityAge || 2) * 1.5, // Takes longer to mature
      gestationPeriod: (sourceSpecies.gestationPeriod || 100) * 1.2,

      sapient: true, // KEY: Now sapient!
      socialStructure: this.generateSocialStructure(sourceSpecies),
    };
  }

  /**
   * Generate Neo- name
   */
  private generateNeoName(sourceName: string): string {
    return `Neo-${sourceName}`;
  }

  /**
   * Get retained traits from source species
   */
  private getRetainedTraits(sourceSpecies: SpeciesComponent): SpeciesTrait[] {
    const retained: SpeciesTrait[] = [];

    // Retain sensory traits
    if (sourceSpecies.innateTraits) {
      for (const trait of sourceSpecies.innateTraits) {
        if (trait.category === 'sensory' || trait.category === 'physical') {
          retained.push(trait);
        }
      }
    }

    return retained;
  }

  /**
   * Get uplifted-specific traits
   */
  private getUpliftedTraits(): SpeciesTrait[] {
    return [
      {
        id: 'uplifted',
        name: 'Uplifted',
        description: 'Genetically engineered to sapience from non-sapient origins',
        category: 'social' as const,
        skillBonus: {},
      },
      {
        id: 'neural_enhanced',
        name: 'Neural Enhanced',
        description: 'Enhanced brain structure grants superior learning ability',
        category: 'social' as const,
        skillBonus: { learning: 0.2 },
      },
      {
        id: 'hybrid_perspective',
        name: 'Hybrid Perspective',
        description: 'Understands both animal and sapient viewpoints',
        category: 'social' as const,
        skillBonus: { animal_handling: 0.3, empathy: 0.2 },
      },
    ];
  }

  /**
   * Determine species compatibility
   */
  private determineCompatibility(sourceSpecies: SpeciesComponent): string[] {
    const compatible: string[] = [];

    // Can hybridize with source species (if source becomes sapient naturally)
    compatible.push(sourceSpecies.speciesId);

    // Can hybridize with uplifter species (humans, typically)
    compatible.push('human');

    // Can hybridize with other uplifted species
    compatible.push('uplifted_wolf', 'uplifted_raven', 'uplifted_octopus');

    return compatible;
  }

  /**
   * Calculate uplifted lifespan (typically extended)
   */
  private calculateUpliftedLifespan(sourceSpecies: SpeciesComponent): number {
    const sourceLifespan = sourceSpecies.lifespan || 10;

    // 2-3x extension typical
    const extension = 2 + Math.random();
    return Math.floor(sourceLifespan * extension);
  }

  /**
   * Calculate size adjustment from brain expansion
   */
  private calculateSizeAdjustment(_program: UpliftProgramComponent): number {
    // Brain expansion causes slight size increase
    // Typically 10-30% larger
    return 1.1 + Math.random() * 0.2;
  }

  /**
   * Calculate size category
   */
  private calculateSizeCategory(
    sourceSpecies: SpeciesComponent,
    adjustment: number
  ): 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'colossal' {
    const sourceCategory = sourceSpecies.sizeCategory || 'medium';

    // Usually stays same category unless adjustment is significant
    if (adjustment > 1.5) {
      // Upgrade one category
      const upgrades: Record<string, 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'colossal'> = {
        'tiny': 'small',
        'small': 'medium',
        'medium': 'large',
        'large': 'huge',
        'huge': 'colossal',
        'colossal': 'colossal',
      };
      return upgrades[sourceCategory] || sourceCategory;
    }

    return sourceCategory;
  }

  /**
   * Determine body plan ID for uplifted species
   *
   * Maps source species anatomy to appropriate sapient body plan based on:
   * - Base anatomy (quadruped, avian, aquatic, etc.)
   * - Physical adaptations needed for sapience
   * - Tool use capabilities
   * - Communication apparatus
   *
   * BODY PLAN INTEGRATION NOTES:
   * ==========================
   *
   * The body plan IDs returned here reference uplifted body plans that should be
   * added to BodyPlanRegistry (packages/core/src/components/BodyPlanRegistry.ts).
   *
   * Currently defined base plans: humanoid_standard, avian_winged, aquatic_tentacled,
   * aquatic_finned, celestial_winged, demonic_horned, reptilian_standard
   *
   * Uplifted body plans needed (to be implemented):
   *
   * CANINE BODY PLANS:
   * - canine_bipedal: Wolf/dog transitioned to bipedal stance. Digitigrade legs,
   *   enhanced forepaws for manipulation, elongated arms with opposable dewclaws.
   * - canine_tool_adapted: Enhanced quadruped with prehensile paws, shoulder
   *   mobility for tool use while quadrupedal.
   *
   * CORVID BODY PLANS:
   * - corvid_sapient: Enhanced raven/crow with larger skull for brain, reinforced
   *   beak for precision tool use, zygodactyl feet (two forward, two back toes)
   *   for better grasping.
   *
   * CETACEAN BODY PLANS:
   * - cetacean_tool_adapted: Dolphin/whale with evolved pectoral fins into
   *   manipulative appendages (proto-hands), enhanced echolocation for
   *   'seeing' tool interactions underwater.
   *
   * CEPHALOPOD BODY PLANS:
   * - cephalopod_enhanced: Octopus with specialized manipulation tentacles,
   *   enhanced neural ganglia in each arm, better out-of-water respiration.
   *
   * PROBOSCIDEAN BODY PLANS:
   * - proboscidean_enhanced: Elephant with hyper-dexterous trunk (finger-like
   *   projections at tip), enhanced shoulder mobility for tool use.
   *
   * PRIMATE BODY PLANS:
   * - primate_enhanced: Already near-sapient anatomy, minimal changes. Enhanced
   *   larynx for speech, slightly larger cranium.
   *
   * FELINE BODY PLANS:
   * - feline_bipedal: Cat/big cat with bipedal stance, retractable claws in
   *   hand-like forepaws, enhanced balance for upright locomotion.
   * - feline_tool_adapted: Enhanced quadruped with remarkable forepaw dexterity,
   *   partially opposable dewclaws.
   *
   * RODENT BODY PLANS:
   * - rodent_bipedal: Rat/mouse with elongated hindlimbs, hand-like forepaws,
   *   prehensile tail for balance.
   *
   * URSINE BODY PLANS:
   * - ursine_bipedal: Bear with fully bipedal stance (bears already rear up),
   *   plantigrade feet, hand-like forepaws with semi-opposable thumbs.
   *
   * GENERIC FALLBACK PLANS:
   * - quadruped_to_bipedal: Generic quadruped → bipedal transition
   * - quadruped_tool_adapted: Generic enhanced quadruped
   * - avian_sapient: Generic sapient bird
   * - aquatic_tool_adapted: Generic aquatic with manipulation
   * - arthropod_enhanced: Generic insect/arthropod uplift
   * - reptilian_bipedal: Generic reptile → bipedal
   * - reptilian_enhanced: Enhanced reptile anatomy
   *
   * Implementation strategy:
   * 1. Create uplifted body plan templates in BodyPlanRegistry
   * 2. Each plan should define body parts (head, limbs, torso, etc.)
   * 3. Specify manipulators for tool use (hands, tentacles, beaks, etc.)
   * 4. Define locomotion capabilities (bipedal, quadruped, flight, swimming)
   * 5. Set appropriate blood type, skeleton type, size category
   *
   * Example implementation (canine_bipedal):
   * ```typescript
   * canine_bipedal: {
   *   id: 'canine_bipedal',
   *   name: 'Bipedal Canine',
   *   baseType: 'uplifted_quadruped',
   *   symmetry: 'bilateral',
   *   size: 'medium',
   *   blood: 'red',
   *   skeleton: 'internal',
   *   parts: [
   *     { type: 'head', count: 1, vital: true, health: 140,
   *       functions: ['sensory', 'vital_organ', 'communication'] },
   *     { type: 'torso', count: 1, vital: true, health: 180,
   *       functions: ['vital_organ'] },
   *     { type: 'arm', count: 2, vital: false, health: 100,
   *       functions: ['manipulation'], children: [
   *         { type: 'hand', count: 1, vital: false, health: 80,
   *           functions: ['manipulation', 'tool_use'] }
   *       ] },
   *     { type: 'leg', count: 2, vital: false, health: 120,
   *       functions: ['locomotion'], children: [
   *         { type: 'foot', count: 1, vital: false, health: 70,
   *           functions: ['locomotion'] }
   *       ] },
   *     { type: 'tail', count: 1, vital: false, health: 60,
   *       functions: ['balance'] }
   *   ]
   * }
   * ```
   */
  private determineBodyPlan(sourceSpecies: SpeciesComponent): string {
    const sourceBodyPlan = sourceSpecies.bodyPlanId || 'standard';

    // Check for specific source species patterns
    const speciesId = sourceSpecies.speciesId.toLowerCase();

    // Canines (wolves, dogs, foxes) - can go bipedal or enhanced quadruped
    if (speciesId.includes('wolf') || speciesId.includes('dog') || speciesId.includes('canine')) {
      return this.shouldGoBipedal(sourceSpecies) ? 'canine_bipedal' : 'canine_tool_adapted';
    }

    // Corvids (ravens, crows) - already have manipulative beaks, add tool use
    if (speciesId.includes('raven') || speciesId.includes('crow') || speciesId.includes('corvid')) {
      return 'corvid_sapient';
    }

    // Cetaceans (dolphins, whales) - need manipulative appendages
    if (speciesId.includes('dolphin') || speciesId.includes('whale') || speciesId.includes('cetacean')) {
      return 'cetacean_tool_adapted';
    }

    // Octopods - already have manipulation, enhance neural complexity
    if (speciesId.includes('octopus') || speciesId.includes('cephalopod')) {
      return 'cephalopod_enhanced';
    }

    // Elephants - enhanced trunk dexterity
    if (speciesId.includes('elephant') || speciesId.includes('proboscidean')) {
      return 'proboscidean_enhanced';
    }

    // Primates - minimal changes needed
    if (speciesId.includes('ape') || speciesId.includes('primate') || speciesId.includes('monkey')) {
      return 'primate_enhanced';
    }

    // Felines - can go bipedal or tool-adapted quadruped
    if (speciesId.includes('cat') || speciesId.includes('feline') || speciesId.includes('lion') ||
        speciesId.includes('tiger')) {
      return this.shouldGoBipedal(sourceSpecies) ? 'feline_bipedal' : 'feline_tool_adapted';
    }

    // Rodents - typically go bipedal for better tool use
    if (speciesId.includes('rat') || speciesId.includes('mouse') || speciesId.includes('rodent')) {
      return 'rodent_bipedal';
    }

    // Bears - enhanced bipedal (already semi-bipedal)
    if (speciesId.includes('bear') || speciesId.includes('ursine')) {
      return 'ursine_bipedal';
    }

    // Generic fallback by body plan type
    if (sourceBodyPlan.includes('quadruped') || sourceBodyPlan.includes('four_leg')) {
      return this.shouldGoBipedal(sourceSpecies) ? 'quadruped_to_bipedal' : 'quadruped_tool_adapted';
    }

    if (sourceBodyPlan.includes('avian') || sourceBodyPlan.includes('wing')) {
      return 'avian_sapient';
    }

    if (sourceBodyPlan.includes('aquatic') || sourceBodyPlan.includes('fin')) {
      return 'aquatic_tool_adapted';
    }

    if (sourceBodyPlan.includes('insectoid') || sourceBodyPlan.includes('arthropod')) {
      return 'arthropod_enhanced';
    }

    if (sourceBodyPlan.includes('reptile') || sourceBodyPlan.includes('reptilian')) {
      return this.shouldGoBipedal(sourceSpecies) ? 'reptilian_bipedal' : 'reptilian_enhanced';
    }

    // Ultimate fallback
    return `${sourceBodyPlan}_sapient`;
  }

  /**
   * Determine if species should transition to bipedal stance
   * Based on size, current anatomy, and engineering feasibility
   */
  private shouldGoBipedal(sourceSpecies: SpeciesComponent): boolean {
    const size = sourceSpecies.sizeCategory;

    // Very small or very large species don't transition well to bipedal
    if (size === 'tiny' || size === 'huge' || size === 'colossal') {
      return false;
    }

    // Medium to large are good candidates for bipedal transition
    if (size === 'medium' || size === 'large') {
      return true;
    }

    // Small can go either way, 50/50
    return Math.random() > 0.5;
  }

  /**
   * Generate species description
   */
  private generateDescription(sourceSpecies: SpeciesComponent, program: UpliftProgramComponent): string {
    return `Genetically engineered sapient descendants of ${sourceSpecies.speciesName}. ` +
           `Achieved sapience through ${program.acceleratedGenerations} generations of selective ` +
           `breeding and genetic enhancement. Retain many traits of their ancestral species ` +
           `including enhanced senses and physical capabilities, while gaining full ` +
           `sapient consciousness, language, and abstract reasoning abilities.`;
  }

  /**
   * Generate social structure
   */
  private generateSocialStructure(sourceSpecies: SpeciesComponent): string {
    const sourceStructure = sourceSpecies.socialStructure || 'varied';

    // Uplifted social structures blend source instincts with sapient organization
    const structures: Record<string, string> = {
      'pack': 'uplifted_pack_collective',
      'hive': 'uplifted_hive_democracy',
      'flock': 'uplifted_flock_assembly',
      'family': 'uplifted_family_clans',
      'solitary': 'uplifted_individualist',
      'varied': 'uplifted_hybrid',
    };

    return structures[sourceStructure] || 'uplifted_hybrid';
  }

  /**
   * Get uplifted species registry (for testing/access)
   */
  getRegistry(): UpliftedSpeciesRegistry {
    return this.upliftedRegistry;
  }

  /**
   * Apply uplifted species to entities
   * Called when transforming awakened animals to agents
   */
  applyUpliftedSpecies(entity: Entity, programId: string): boolean {
    // Find the program
    const programs = Array.from(this.upliftedRegistry.getAllUpliftedSpecies());
    const program = programs.find(p => p.speciesId.includes(programId));

    if (!program) return false;

    // Update entity's species component
    if (entity.hasComponent(CT.Species)) {
      const species = entity.getComponent(CT.Species) as SpeciesComponent;
      species.speciesId = program.speciesId;
      species.speciesName = program.speciesName;
      species.sapient = true;
    }

    return true;
  }
}
