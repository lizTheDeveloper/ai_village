/**
 * UpliftTechnologyDefinitions - Technology definitions for genetic uplift
 *
 * Defines the clarketech technologies required for genetic uplift:
 * - Consciousness Studies (Tier 1) - Understanding sapience
 * - Genetic Engineering (Tier 2) - CRISPR gene editing
 * - Neural Augmentation (Tier 2) - Brain structure modification
 * - Nanofabrication (Tier 3) - Atom-level precision
 * - Consciousness Transfer (Tier 3) - Knowledge download
 *
 * NOT YET INTEGRATED - These will be added to ClarketechSystem
 */

import type { ClarketechDefinition } from '../clarketech/ClarketechSystem.js';
import upliftData from '../../data/uplift-technologies.json';

/**
 * Technology definitions imported from JSON
 */
const techData = upliftData.technologies as Record<string, ClarketechDefinition>;

/**
 * Helper to get a technology definition, throwing if not found
 */
function getTech(id: string): ClarketechDefinition {
  const tech = techData[id];
  if (!tech) {
    throw new Error(`Technology definition not found: ${id}`);
  }
  return tech;
}

/**
 * Consciousness Studies - Tier 1
 * MUST come after Advanced AI
 */
export const CONSCIOUSNESS_STUDIES_TECH: ClarketechDefinition = getTech('consciousness_studies');

/**
 * Genetic Engineering - Tier 2
 * Enables CRISPR-like gene editing and uplift programs
 */
export const GENETIC_ENGINEERING_TECH: ClarketechDefinition = getTech('genetic_engineering');

/**
 * Neural Augmentation - Tier 2
 * Direct brain structure modification
 */
export const NEURAL_AUGMENTATION_TECH: ClarketechDefinition = getTech('neural_augmentation');

/**
 * Selective Breeding Protocols - Tier 2 (Academic Research)
 * Unlocked via published papers
 */
export const SELECTIVE_BREEDING_PROTOCOLS_TECH: ClarketechDefinition = getTech('selective_breeding_protocols');

/**
 * Advanced Nanofabrication (Uplift-specific) - Tier 3
 * Atom-level gene editing
 */
export const NANO_GENE_EDITING_TECH: ClarketechDefinition = getTech('nano_gene_editing');

/**
 * Consciousness Transfer (Uplift application) - Tier 3
 * Direct knowledge download to awakening minds
 */
export const UPLIFT_CONSCIOUSNESS_TRANSFER_TECH: ClarketechDefinition = getTech('uplift_consciousness_transfer');

/**
 * Mass Uplift Protocol - Tier 3
 * Species-wide transformation
 */
export const MASS_UPLIFT_PROTOCOL_TECH: ClarketechDefinition = getTech('mass_uplift_protocol');

/**
 * All uplift technologies
 */
export const UPLIFT_TECHNOLOGIES: ClarketechDefinition[] = [
  CONSCIOUSNESS_STUDIES_TECH,
  GENETIC_ENGINEERING_TECH,
  NEURAL_AUGMENTATION_TECH,
  SELECTIVE_BREEDING_PROTOCOLS_TECH,
  NANO_GENE_EDITING_TECH,
  UPLIFT_CONSCIOUSNESS_TRANSFER_TECH,
  MASS_UPLIFT_PROTOCOL_TECH,
];

/**
 * Technology reduction values
 */
const techReductionMap = upliftData.techReductionMap as Record<string, number>;

/**
 * Helper to get reduction value, throwing if not found
 */
function getReduction(techId: string): number {
  const reduction = techReductionMap[techId];
  if (reduction === undefined) {
    throw new Error(`Technology reduction not found: ${techId}`);
  }
  return reduction;
}

/**
 * Calculate generation reduction from unlocked technologies
 */
export function calculateTechGenerationReduction(unlockedTechs: Set<string>): number {
  let reduction = 0;

  if (unlockedTechs.has('advanced_ai')) {
    reduction += getReduction('advanced_ai');
  }

  if (unlockedTechs.has('genetic_engineering')) {
    reduction += getReduction('genetic_engineering');
  }

  if (unlockedTechs.has('neural_augmentation')) {
    reduction += getReduction('neural_augmentation');
  }

  if (unlockedTechs.has('nano_gene_editing')) {
    reduction += getReduction('nano_gene_editing');
  }

  if (unlockedTechs.has('uplift_consciousness_transfer')) {
    reduction += getReduction('uplift_consciousness_transfer');
  }

  if (unlockedTechs.has('mass_uplift_protocol')) {
    reduction = getReduction('mass_uplift_protocol'); // Max, overrides sum
  }

  return Math.min(0.85, reduction); // Cap at 85%
}

/**
 * Get technology unlock order
 */
export function getUpliftTechTree(): Record<string, string[]> {
  return upliftData.techTree as Record<string, string[]>;
}
