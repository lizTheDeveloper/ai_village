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

import type {
  ClarketechDefinition,
  ClarketechCategory,
  ClarketechTier,
} from '../clarketech/ClarketechSystem.js';

/**
 * Consciousness Studies - Tier 1
 * MUST come after Advanced AI
 */
export const CONSCIOUSNESS_STUDIES_TECH: ClarketechDefinition = {
  id: 'consciousness_studies',
  name: 'Consciousness Studies',
  description:
    'Deep understanding of sapience emergence, self-awareness, and the nature of consciousness. ' +
    'Required foundation for genetic uplift research.',
  tier: 1,
  category: 'mind',

  prerequisiteTechs: ['advanced_ai'], // MUST come after AI
  researchCost: 25000,
  energyCost: 100,
  materialCost: {
    electronics: 500,
    research_papers: 50,
  },

  effects: [
    {
      type: 'scan',
      magnitude: 100,
      target: 'entity',
    },
  ],

  discoveryMessage:
    'We now understand what makes a mind sapient. The path to creating new conscious beings opens before us.',
  flavorText:
    'The hard problem of consciousness has been solved. We know what thought is, and how it emerges.',

  malfunction: null, // Theoretical research, no malfunction risk
};

/**
 * Genetic Engineering - Tier 2
 * Enables CRISPR-like gene editing and uplift programs
 */
export const GENETIC_ENGINEERING_TECH: ClarketechDefinition = {
  id: 'genetic_engineering',
  name: 'Genetic Engineering',
  description:
    'CRISPR-based gene editing allows precise modification of DNA. ' +
    'Enables selective breeding programs and neural enhancement for genetic uplift.',
  tier: 2,
  category: 'nano',

  prerequisiteTechs: ['advanced_ai', 'consciousness_studies'],
  researchCost: 75000,
  energyCost: 500,
  materialCost: {
    biotech: 2000,
    rare_earth: 500,
    research_papers: 100,
  },

  effects: [
    {
      type: 'matter_conversion', // DNA modification
      magnitude: 0.8,
      target: 'entity',
    },
  ],

  discoveryMessage:
    'We can now rewrite the code of life itself. Genetic uplift programs can begin.',
  flavorText:
    'Every genome is now editable. Evolution is no longer random.',

  malfunction: {
    chance: 0.02,
    severity: 'major',
    description: 'Unintended genetic mutation cascades',
    effect: 'matter_corruption',
  },
};

/**
 * Neural Augmentation - Tier 2
 * Direct brain structure modification
 */
export const NEURAL_AUGMENTATION_TECH: ClarketechDefinition = {
  id: 'neural_augmentation',
  name: 'Neural Augmentation',
  description:
    'Direct modification of brain structure and neural pathways. ' +
    'Dramatically accelerates intelligence gain in uplift programs.',
  tier: 2,
  category: 'mind',

  prerequisiteTechs: ['neural_interface', 'genetic_engineering', 'consciousness_studies'],
  researchCost: 100000,
  energyCost: 1000,
  materialCost: {
    neural_matrix: 500,
    biotech: 1000,
    quantum_cores: 50,
  },

  effects: [
    {
      type: 'mind_link',
      magnitude: 2,
      target: 'entity',
    },
    {
      type: 'heal', // Neural repair/growth
      magnitude: 100,
      target: 'entity',
    },
  ],

  discoveryMessage:
    'We can reshape minds as easily as clay. Intelligence itself is now engineerable.',
  flavorText:
    'The brain is no longer fixed at birth. We can grow genius.',

  malfunction: {
    chance: 0.03,
    severity: 'major',
    description: 'Neural pathway disruption causes seizures',
    effect: 'mind_leak',
  },
};

/**
 * Selective Breeding Protocols - Tier 2 (Academic Research)
 * Unlocked via published papers
 */
export const SELECTIVE_BREEDING_PROTOCOLS_TECH: ClarketechDefinition = {
  id: 'selective_breeding_protocols',
  name: 'Selective Breeding Protocols',
  description:
    'Optimized breeding selection based on academic research. ' +
    'Published papers on genetics provide generation time bonuses.',
  tier: 2,
  category: 'mind',

  prerequisiteTechs: ['genetic_engineering'], // Plus published papers
  researchCost: 50000,
  energyCost: 200,
  materialCost: {
    research_papers: 200,
  },

  effects: [
    {
      type: 'scan', // Better trait selection
      magnitude: 50,
      target: 'entity',
    },
  ],

  discoveryMessage:
    'Academic research guides our breeding programs. Every paper published accelerates progress.',
  flavorText:
    'Science builds on science. Knowledge compounds.',

  malfunction: null,
};

/**
 * Advanced Nanofabrication (Uplift-specific) - Tier 3
 * Atom-level gene editing
 */
export const NANO_GENE_EDITING_TECH: ClarketechDefinition = {
  id: 'nano_gene_editing',
  name: 'Nano Gene Editing',
  description:
    'Atom-by-atom precision in DNA modification. Near-zero mutation risk, massive acceleration.',
  tier: 3,
  category: 'nano',

  prerequisiteTechs: ['nanofabrication', 'neural_augmentation'],
  researchCost: 200000,
  energyCost: 5000,
  materialCost: {
    nano_assemblers: 1000,
    quantum_cores: 200,
  },

  effects: [
    {
      type: 'fabrication',
      magnitude: 20,
      target: 'entity',
    },
    {
      type: 'matter_conversion',
      magnitude: 0.95,
      target: 'entity',
    },
  ],

  discoveryMessage:
    'We can edit DNA with atomic precision. Uplift is now nearly instantaneous.',
  flavorText:
    'Every nucleotide placed with absolute precision. Perfection in flesh.',

  malfunction: {
    chance: 0.001, // Near-zero risk
    severity: 'minor',
    description: 'Single base-pair error (easily corrected)',
    effect: 'matter_corruption',
  },
};

/**
 * Consciousness Transfer (Uplift application) - Tier 3
 * Direct knowledge download to awakening minds
 */
export const UPLIFT_CONSCIOUSNESS_TRANSFER_TECH: ClarketechDefinition = {
  id: 'uplift_consciousness_transfer',
  name: 'Uplift Consciousness Transfer',
  description:
    'Download language, knowledge, and skills directly into awakening minds. ' +
    'Skip learning phase entirely.',
  tier: 3,
  category: 'mind',

  prerequisiteTechs: ['consciousness_transfer', 'neural_augmentation'],
  researchCost: 250000,
  energyCost: 10000,
  materialCost: {
    neural_matrix: 1000,
    quantum_cores: 500,
  },

  effects: [
    {
      type: 'consciousness_transfer',
      magnitude: 1,
      target: 'entity',
    },
    {
      type: 'mind_link',
      magnitude: 10,
      target: 'entity',
    },
  ],

  discoveryMessage:
    'We can pour knowledge into minds like water into a cup. Sapience emerges instantly.',
  flavorText:
    'Born knowing. The first words are not "I am" but "I understand."',

  malfunction: {
    chance: 0.05,
    severity: 'catastrophic',
    description: 'Personality fragmentation - multiple selves emerge',
    effect: 'consciousness_split',
  },
};

/**
 * Mass Uplift Protocol - Tier 3
 * Species-wide transformation
 */
export const MASS_UPLIFT_PROTOCOL_TECH: ClarketechDefinition = {
  id: 'mass_uplift_protocol',
  name: 'Mass Uplift Protocol',
  description:
    'Uplift entire species populations simultaneously. ' +
    'Reduce generations from 100+ to 3-5 through parallel processing.',
  tier: 3,
  category: 'mind',

  prerequisiteTechs: [
    'nano_gene_editing',
    'uplift_consciousness_transfer',
    'replicator',
  ],
  researchCost: 500000,
  energyCost: 50000,
  materialCost: {
    nano_assemblers: 5000,
    neural_matrix: 5000,
    quantum_cores: 1000,
  },

  effects: [
    {
      type: 'consciousness_transfer',
      magnitude: 100,
      target: 'global',
    },
    {
      type: 'fabrication',
      magnitude: 100,
      target: 'global',
    },
  ],

  discoveryMessage:
    'We can uplift an entire species in a single generation. The age of sapient diversity begins.',
  flavorText:
    'A thousand minds awaken as one. The Cambrian explosion of consciousness.',

  malfunction: {
    chance: 0.01,
    severity: 'catastrophic',
    description: 'Hive mind formation - all uplifted share one consciousness',
    effect: 'mind_leak',
  },
};

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
 * Calculate generation reduction from unlocked technologies
 */
export function calculateTechGenerationReduction(unlockedTechs: Set<string>): number {
  let reduction = 0;

  if (unlockedTechs.has('advanced_ai')) {
    reduction += 0.10; // 10%
  }

  if (unlockedTechs.has('genetic_engineering')) {
    reduction += 0.20; // 20%
  }

  if (unlockedTechs.has('neural_augmentation')) {
    reduction += 0.30; // 30%
  }

  if (unlockedTechs.has('nano_gene_editing')) {
    reduction += 0.40; // 40%
  }

  if (unlockedTechs.has('uplift_consciousness_transfer')) {
    reduction += 0.50; // 50%
  }

  if (unlockedTechs.has('mass_uplift_protocol')) {
    reduction = 0.70; // 70% (max, overrides sum)
  }

  return Math.min(0.85, reduction); // Cap at 85%
}

/**
 * Get technology unlock order
 */
export function getUpliftTechTree(): Record<string, string[]> {
  return {
    // Tier 1
    'consciousness_studies': ['advanced_ai'],

    // Tier 2
    'genetic_engineering': ['advanced_ai', 'consciousness_studies'],
    'neural_augmentation': ['neural_interface', 'genetic_engineering', 'consciousness_studies'],
    'selective_breeding_protocols': ['genetic_engineering'], // + papers

    // Tier 3
    'nano_gene_editing': ['nanofabrication', 'neural_augmentation'],
    'uplift_consciousness_transfer': ['consciousness_transfer', 'neural_augmentation'],
    'mass_uplift_protocol': ['nano_gene_editing', 'uplift_consciousness_transfer', 'replicator'],
  };
}
