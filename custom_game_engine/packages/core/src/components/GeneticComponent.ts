/**
 * GeneticComponent - Genetic information for reproduction and inheritance
 *
 * Handles:
 * - Genetic alleles (dominant/recessive traits)
 * - Hereditary body modifications (divine wings passed to children)
 * - Mutation rates
 * - Species compatibility for hybrids
 */

import { ComponentBase } from '../ecs/Component.js';

// ============================================================================
// Genetic Alleles
// ============================================================================

export type AlleleExpression = 'dominant' | 'recessive' | 'codominant';

export interface GeneticAllele {
  traitId: string;           // e.g., 'eye_color', 'height', 'wing_presence'
  dominantAllele: string;    // e.g., 'brown', 'tall', 'winged'
  recessiveAllele: string;   // e.g., 'blue', 'short', 'wingless'
  expression: AlleleExpression;

  // Which allele is currently expressed
  expressedAllele: 'dominant' | 'recessive' | 'both';

  // Metadata
  category: 'physical' | 'sensory' | 'metabolic' | 'behavioral';
}

// ============================================================================
// Hereditary Modifications
// ============================================================================

export type GeneticModificationSource = 'divine' | 'magical' | 'genetic_engineering' | 'mutation' | 'natural';

export interface HereditaryModification {
  id: string;

  // Body modifications that can be passed to offspring
  type: 'wings' | 'extra_arms' | 'extra_legs' | 'tail' | 'horns' | 'enhanced_part' | 'extra_organ';

  bodyPartType: string;      // e.g., 'wing', 'arm', 'heart'
  bodyPartCount?: number;    // How many parts (e.g., 2 wings, 4 arms)

  // Inheritance
  inheritanceChance: number; // 0-1, probability offspring inherits this
  dominance: 'dominant' | 'recessive'; // Genetic dominance

  // Source
  source: GeneticModificationSource;
  sourceEntityId?: string;   // Deity who granted it, spell that created it, etc.

  // When acquired
  acquiredAt: number;        // Tick when acquired
  generationsActive: number; // How many generations has this been passed down

  // Properties
  permanent: boolean;        // Can this be removed?
  description: string;
}

// ============================================================================
// GeneticComponent
// ============================================================================

export class GeneticComponent extends ComponentBase {
  public readonly type = 'genetic';

  // Genome - simplified as trait alleles
  public genome: GeneticAllele[];

  // Hereditary body modifications (wings, extra limbs, etc.)
  public hereditaryModifications: HereditaryModification[];

  // Mutation rate for offspring
  public mutationRate: number;  // Default 0.01 (1%)

  // Genetic compatibility
  public compatibleSpecies: string[];  // Can hybridize with these species IDs

  // Genetic health
  public geneticHealth: number; // 0-1, affects mutation resistance and offspring viability
  public inbreedingCoefficient: number; // 0-1, tracks genetic diversity loss

  // Lineage tracking
  public parentIds?: [string, string]; // IDs of biological parents
  public generation: number;           // How many generations from "first" ancestor

  constructor(options: Partial<GeneticComponent> = {}) {
    super();

    this.genome = options.genome ?? [];
    this.hereditaryModifications = options.hereditaryModifications ?? [];
    this.mutationRate = options.mutationRate ?? 0.01; // 1% default
    this.compatibleSpecies = options.compatibleSpecies ?? [];
    this.geneticHealth = options.geneticHealth ?? 1.0;
    this.inbreedingCoefficient = options.inbreedingCoefficient ?? 0.0;
    this.parentIds = options.parentIds;
    this.generation = options.generation ?? 0;
  }

  /**
   * Add a hereditary modification (divine wings, extra arms, etc.)
   */
  addHereditaryModification(modification: HereditaryModification): void {
    this.hereditaryModifications.push(modification);
  }

  /**
   * Remove a hereditary modification
   */
  removeHereditaryModification(modificationId: string): void {
    this.hereditaryModifications = this.hereditaryModifications.filter(
      m => m.id !== modificationId
    );
  }

  /**
   * Get hereditary modifications that will pass to offspring
   */
  getInheritableModifications(): HereditaryModification[] {
    return this.hereditaryModifications.filter(m => {
      // Only inheritable if:
      // 1. Has inheritance chance > 0
      // 2. Is permanent (temporary mods don't pass down)
      return m.inheritanceChance > 0 && m.permanent;
    });
  }

  /**
   * Roll for inheritance of a specific modification
   */
  willInherit(modification: HereditaryModification): boolean {
    return Math.random() < modification.inheritanceChance;
  }

  /**
   * Add an allele to the genome
   */
  addAllele(allele: GeneticAllele): void {
    // Remove existing allele for this trait if present
    this.genome = this.genome.filter(a => a.traitId !== allele.traitId);
    this.genome.push(allele);
  }

  /**
   * Get allele for a specific trait
   */
  getAllele(traitId: string): GeneticAllele | undefined {
    return this.genome.find(a => a.traitId === traitId);
  }

  /**
   * Get expressed value for a trait
   */
  getExpressedTrait(traitId: string): string | null {
    const allele = this.getAllele(traitId);
    if (!allele) return null;

    switch (allele.expressedAllele) {
      case 'dominant':
        return allele.dominantAllele;
      case 'recessive':
        return allele.recessiveAllele;
      case 'both':
        // Codominant - return both
        return `${allele.dominantAllele}+${allele.recessiveAllele}`;
      default:
        return null;
    }
  }

  /**
   * Check if compatible with another entity for reproduction
   */
  isCompatibleWith(_otherGenetics: GeneticComponent, otherSpeciesId: string): boolean {
    // Check if other species is in compatible list
    return this.compatibleSpecies.includes(otherSpeciesId);
  }

  /**
   * Combine genomes from two parents (Mendelian inheritance)
   */
  static combineGenomes(
    parent1: GeneticComponent,
    parent2: GeneticComponent
  ): GeneticAllele[] {
    const offspring: GeneticAllele[] = [];
    const processedTraits = new Set<string>();

    // Combine alleles from both parents
    for (const allele1 of parent1.genome) {
      const allele2 = parent2.getAllele(allele1.traitId);

      if (allele2) {
        // Both parents have this trait
        const inheritedAllele = this.inheritAllele(allele1, allele2);
        offspring.push(inheritedAllele);
        processedTraits.add(allele1.traitId);
      } else {
        // Only parent1 has this trait - pass it down
        offspring.push({ ...allele1 });
        processedTraits.add(allele1.traitId);
      }
    }

    // Add any traits from parent2 that parent1 didn't have
    for (const allele2 of parent2.genome) {
      if (!processedTraits.has(allele2.traitId)) {
        offspring.push({ ...allele2 });
      }
    }

    return offspring;
  }

  /**
   * Mendelian inheritance for a single trait
   */
  private static inheritAllele(
    allele1: GeneticAllele,
    allele2: GeneticAllele
  ): GeneticAllele {
    // Randomly pick one allele from each parent
    const fromParent1 = Math.random() < 0.5 ? allele1.dominantAllele : allele1.recessiveAllele;
    const fromParent2 = Math.random() < 0.5 ? allele2.dominantAllele : allele2.recessiveAllele;

    // Determine expression
    let expressedAllele: 'dominant' | 'recessive' | 'both';

    if (allele1.expression === 'codominant' || allele2.expression === 'codominant') {
      // Codominant - both express
      expressedAllele = 'both';
    } else if (fromParent1 === allele1.dominantAllele || fromParent2 === allele2.dominantAllele) {
      // At least one dominant allele
      expressedAllele = 'dominant';
    } else {
      // Both recessive
      expressedAllele = 'recessive';
    }

    return {
      traitId: allele1.traitId,
      dominantAllele: allele1.dominantAllele,
      recessiveAllele: allele1.recessiveAllele,
      expression: allele1.expression,
      expressedAllele,
      category: allele1.category,
    };
  }

  /**
   * Combine hereditary modifications from both parents
   */
  static combineHereditaryModifications(
    parent1: GeneticComponent,
    parent2: GeneticComponent
  ): HereditaryModification[] {
    const offspring: HereditaryModification[] = [];

    // Check each parent's modifications for inheritance
    for (const mod of parent1.getInheritableModifications()) {
      if (parent1.willInherit(mod)) {
        offspring.push({
          ...mod,
          generationsActive: mod.generationsActive + 1,
        });
      }
    }

    for (const mod of parent2.getInheritableModifications()) {
      // Don't duplicate if both parents have same modification
      const alreadyHas = offspring.some(m => m.type === mod.type && m.bodyPartType === mod.bodyPartType);
      if (!alreadyHas && parent2.willInherit(mod)) {
        offspring.push({
          ...mod,
          generationsActive: mod.generationsActive + 1,
        });
      }
    }

    return offspring;
  }

  /**
   * Calculate inbreeding coefficient
   * (Simplified - in reality would need full pedigree analysis)
   */
  static calculateInbreeding(
    parent1: GeneticComponent,
    parent2: GeneticComponent
  ): number {
    // If parents have same parent IDs, they're siblings
    if (parent1.parentIds && parent2.parentIds) {
      const [p1_parent1, p1_parent2] = parent1.parentIds;
      const [p2_parent1, p2_parent2] = parent2.parentIds;

      if ((p1_parent1 === p2_parent1 && p1_parent2 === p2_parent2) ||
          (p1_parent1 === p2_parent2 && p1_parent2 === p2_parent1)) {
        // Full siblings
        return 0.25;
      }

      // Half siblings
      if (p1_parent1 === p2_parent1 || p1_parent1 === p2_parent2 ||
          p1_parent2 === p2_parent1 || p1_parent2 === p2_parent2) {
        return 0.125;
      }
    }

    // Average the parent's inbreeding coefficients
    return (parent1.inbreedingCoefficient + parent2.inbreedingCoefficient) / 2;
  }

  /**
   * Clone this genetic component
   */
  clone(): GeneticComponent {
    return new GeneticComponent({
      genome: this.genome.map(a => ({ ...a })),
      hereditaryModifications: this.hereditaryModifications.map(m => ({ ...m })),
      mutationRate: this.mutationRate,
      compatibleSpecies: [...this.compatibleSpecies],
      geneticHealth: this.geneticHealth,
      inbreedingCoefficient: this.inbreedingCoefficient,
      parentIds: this.parentIds ? [...this.parentIds] : undefined,
      generation: this.generation,
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a default genetic component for a species
 */
export function createDefaultGenetics(
  _speciesId: string,
  compatibleSpecies: string[] = [],
  mutationRate: number = 0.01
): GeneticComponent {
  return new GeneticComponent({
    genome: [],
    hereditaryModifications: [],
    mutationRate,
    compatibleSpecies,
    geneticHealth: 1.0,
    inbreedingCoefficient: 0.0,
    generation: 0,
  });
}

/**
 * Create a hereditary modification for divine transformations
 */
export function createHereditaryModification(
  type: HereditaryModification['type'],
  bodyPartType: string,
  inheritanceChance: number,
  source: GeneticModificationSource,
  tick: number,
  options: Partial<HereditaryModification> = {}
): HereditaryModification {
  return {
    id: `hereditary_${type}_${Date.now()}`,
    type,
    bodyPartType,
    inheritanceChance,
    dominance: options.dominance ?? 'dominant',
    source,
    sourceEntityId: options.sourceEntityId,
    acquiredAt: tick,
    generationsActive: 0,
    permanent: true,
    description: options.description ?? `Hereditary ${type}`,
    bodyPartCount: options.bodyPartCount,
  };
}
