/**
 * SpeciesRegistry - Predefined species with body plans and traits
 *
 * Defines standard species for the game world:
 * - Humanoids (human, elf, dwarf, orc)
 * - Insectoids (thrakeen - 4 armed traders)
 * - Celestials (divine/angelic beings)
 * - And more...
 */

import { SpeciesComponent, type SpeciesTrait } from '../components/SpeciesComponent.js';
import { createDefaultGenetics } from '../components/GeneticComponent.js';
import type { GeneticComponent } from '../components/GeneticComponent.js';

// ============================================================================
// Species Template
// ============================================================================

export interface SpeciesTemplate {
  speciesId: string;
  speciesName: string;
  commonName: string;
  description: string;
  bodyPlanId: string;
  innateTraits: SpeciesTrait[];

  // Genetics
  compatibleSpecies: string[];
  mutationRate: number;

  // Physical
  averageHeight: number; // cm
  averageWeight: number; // kg
  sizeCategory: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'colossal';

  // Lifespan
  lifespan: number;
  lifespanType: 'mortal' | 'long_lived' | 'ageless' | 'immortal';
  maturityAge: number;
  gestationPeriod: number; // days

  // Social
  sapient: boolean;
  socialStructure?: string;
}

// ============================================================================
// Common Traits
// ============================================================================

export const TRAIT_ADAPTABLE: SpeciesTrait = {
  id: 'adaptable',
  name: 'Adaptable',
  description: 'Quick learners, versatile in many skills',
  category: 'social',
  skillBonus: { all: 0.05 },
};

export const TRAIT_KEEN_SENSES: SpeciesTrait = {
  id: 'keen_senses',
  name: 'Keen Senses',
  description: 'Enhanced sight and hearing',
  category: 'sensory',
  skillBonus: { perception: 0.3 },
  abilitiesGranted: ['keen_hearing', 'keen_sight'],
};

export const TRAIT_AGELESS: SpeciesTrait = {
  id: 'ageless',
  name: 'Ageless',
  description: 'Does not age like mortals',
  category: 'physical',
  needsModifier: { aging: 0.1 },
};

export const TRAIT_STURDY: SpeciesTrait = {
  id: 'sturdy',
  name: 'Sturdy',
  description: 'Resilient and hardy',
  category: 'physical',
  skillBonus: { endurance: 0.2, mining: 0.15 },
};

export const TRAIT_TUSKED: SpeciesTrait = {
  id: 'tusked',
  name: 'Tusked',
  description: 'Natural piercing weapons',
  category: 'physical',
  skillBonus: { combat: 0.2 },
  abilitiesGranted: ['tusk_attack'],
};

export const TRAIT_FOUR_ARMS: SpeciesTrait = {
  id: 'four_arms',
  name: 'Four Arms',
  description: 'Four arms enable simultaneous tool use',
  category: 'physical',
  skillBonus: { crafting: 0.3, building: 0.2 },
  abilitiesGranted: ['multi_task'],
};

export const TRAIT_COMPOUND_EYES: SpeciesTrait = {
  id: 'compound_eyes',
  name: 'Compound Eyes',
  description: 'Wide field of vision, excellent motion detection',
  category: 'sensory',
  skillBonus: { perception: 0.2 },
  abilitiesGranted: ['360_vision', 'motion_detection'],
};

export const TRAIT_CHITINOUS_ARMOR: SpeciesTrait = {
  id: 'chitinous_armor',
  name: 'Chitinous Armor',
  description: 'Natural exoskeleton provides protection',
  category: 'physical',
  abilitiesGranted: ['natural_armor'],
};

export const TRAIT_DIVINE_WINGS: SpeciesTrait = {
  id: 'divine_wings',
  name: 'Divine Wings',
  description: 'Celestial wings grant flight',
  category: 'physical',
  abilitiesGranted: ['flight', 'celestial_flight'],
};

export const TRAIT_HOLY_AURA: SpeciesTrait = {
  id: 'holy_aura',
  name: 'Holy Aura',
  description: 'Radiates divine presence',
  category: 'spiritual',
  skillBonus: { persuasion: 0.2 },
  abilitiesGranted: ['holy_presence'],
};

// ============================================================================
// Species Definitions
// ============================================================================

export const HUMAN_SPECIES: SpeciesTemplate = {
  speciesId: 'human',
  speciesName: 'Human',
  commonName: 'Human',
  description: 'Adaptable mortals with short lives but great ambition',
  bodyPlanId: 'humanoid_standard',

  innateTraits: [TRAIT_ADAPTABLE],

  compatibleSpecies: ['elf', 'orc', 'dwarf'],
  mutationRate: 0.01, // 1% mutation chance

  averageHeight: 170,
  averageWeight: 70,
  sizeCategory: 'medium',

  lifespan: 70,
  lifespanType: 'mortal',
  maturityAge: 18,
  gestationPeriod: 270, // ~9 months

  sapient: true,
  socialStructure: 'varied',
};

export const ELF_SPECIES: SpeciesTemplate = {
  speciesId: 'elf',
  speciesName: 'Elf',
  commonName: 'Elf',
  description: 'Long-lived beings of grace and magic, one with nature',
  bodyPlanId: 'humanoid_standard',

  innateTraits: [TRAIT_KEEN_SENSES, TRAIT_AGELESS],

  compatibleSpecies: ['human'],
  mutationRate: 0.005, // Elves mutate less (0.5%)

  averageHeight: 180,
  averageWeight: 65,
  sizeCategory: 'medium',

  lifespan: 750,
  lifespanType: 'long_lived',
  maturityAge: 100,
  gestationPeriod: 365, // ~1 year

  sapient: true,
  socialStructure: 'forest_communities',
};

export const DWARF_SPECIES: SpeciesTemplate = {
  speciesId: 'dwarf',
  speciesName: 'Dwarf',
  commonName: 'Dwarf',
  description: 'Stout and strong, masters of craft and stone',
  bodyPlanId: 'humanoid_standard',

  innateTraits: [TRAIT_STURDY],

  compatibleSpecies: ['human'],
  mutationRate: 0.008,

  averageHeight: 140,
  averageWeight: 80,
  sizeCategory: 'medium',

  lifespan: 250,
  lifespanType: 'long_lived',
  maturityAge: 50,
  gestationPeriod: 300,

  sapient: true,
  socialStructure: 'clan_based',
};

export const ORC_SPECIES: SpeciesTemplate = {
  speciesId: 'orc',
  speciesName: 'Orc',
  commonName: 'Orc',
  description: 'Tusked warriors, strong and fierce',
  bodyPlanId: 'humanoid_standard',

  innateTraits: [TRAIT_TUSKED, TRAIT_STURDY],

  compatibleSpecies: ['human'],
  mutationRate: 0.015, // Orcs mutate more

  averageHeight: 190,
  averageWeight: 95,
  sizeCategory: 'large',

  lifespan: 60,
  lifespanType: 'mortal',
  maturityAge: 14,
  gestationPeriod: 240,

  sapient: true,
  socialStructure: 'tribal',
};

export const THRAKEEN_SPECIES: SpeciesTemplate = {
  speciesId: 'thrakeen',
  speciesName: 'Thrakeen',
  commonName: 'Thrakeen',
  description: 'Four-armed insectoid traders from distant lands',
  bodyPlanId: 'insectoid_4arm',

  innateTraits: [TRAIT_FOUR_ARMS, TRAIT_COMPOUND_EYES, TRAIT_CHITINOUS_ARMOR],

  compatibleSpecies: [], // Cannot hybridize with humanoids
  mutationRate: 0.02, // Insectoids mutate more (2%)

  averageHeight: 175,
  averageWeight: 70,
  sizeCategory: 'medium',

  lifespan: 200,
  lifespanType: 'long_lived',
  maturityAge: 25,
  gestationPeriod: 180, // Lay eggs, shorter gestation

  sapient: true,
  socialStructure: 'hive_based',
};

export const CELESTIAL_SPECIES: SpeciesTemplate = {
  speciesId: 'celestial',
  speciesName: 'Celestial',
  commonName: 'Celestial',
  description: 'Divine beings with wings, servants of the gods',
  bodyPlanId: 'celestial_winged',

  innateTraits: [TRAIT_DIVINE_WINGS, TRAIT_HOLY_AURA],

  compatibleSpecies: ['human'], // Can create divine hybrids (Nephilim)
  mutationRate: 0.0, // Divine beings don't mutate naturally

  averageHeight: 185,
  averageWeight: 70,
  sizeCategory: 'medium',

  lifespan: 0, // Immortal
  lifespanType: 'immortal',
  maturityAge: 0, // Created fully formed
  gestationPeriod: 0, // Not born naturally

  sapient: true,
  socialStructure: 'divine_hierarchy',
};

export const AQUATIC_SPECIES: SpeciesTemplate = {
  speciesId: 'aquatic',
  speciesName: 'Aquatic',
  commonName: 'Merfolk',
  description: 'Water-dwelling beings with tentacles or fins',
  bodyPlanId: 'aquatic_tentacled',

  innateTraits: [
    {
      id: 'aquatic_breathing',
      name: 'Aquatic Breathing',
      description: 'Can breathe underwater',
      category: 'physical',
      abilitiesGranted: ['water_breathing', 'swimming'],
    },
    {
      id: 'tentacles',
      name: 'Tentacles',
      description: 'Multiple tentacles for manipulation',
      category: 'physical',
      skillBonus: { swimming: 0.5 },
    },
  ],

  compatibleSpecies: [], // Cannot hybridize with land species
  mutationRate: 0.012,

  averageHeight: 160,
  averageWeight: 60,
  sizeCategory: 'medium',

  lifespan: 120,
  lifespanType: 'long_lived',
  maturityAge: 20,
  gestationPeriod: 300,

  sapient: true,
  socialStructure: 'underwater_cities',
};

// ============================================================================
// Species Registry
// ============================================================================

export const SPECIES_REGISTRY: Record<string, SpeciesTemplate> = {
  human: HUMAN_SPECIES,
  elf: ELF_SPECIES,
  dwarf: DWARF_SPECIES,
  orc: ORC_SPECIES,
  thrakeen: THRAKEEN_SPECIES,
  celestial: CELESTIAL_SPECIES,
  aquatic: AQUATIC_SPECIES,
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a SpeciesComponent from a template
 */
export function createSpeciesFromTemplate(template: SpeciesTemplate): SpeciesComponent {
  return new SpeciesComponent(
    template.speciesId,
    template.speciesName,
    template.bodyPlanId,
    {
      commonName: template.commonName,
      innateTraits: [...template.innateTraits],
      lifespan: template.lifespan,
      lifespanType: template.lifespanType,
      averageHeight: template.averageHeight,
      averageWeight: template.averageWeight,
      sizeCategory: template.sizeCategory,
      canReproduce: true,
      gestationPeriod: template.gestationPeriod,
      maturityAge: template.maturityAge,
      sapient: template.sapient,
      socialStructure: template.socialStructure,
      isHybrid: false,
      hasMutation: false,
      mutations: [],
    }
  );
}

/**
 * Create a GeneticComponent from a template
 */
export function createGeneticsFromTemplate(template: SpeciesTemplate): GeneticComponent {
  return createDefaultGenetics(
    template.speciesId,
    template.compatibleSpecies,
    template.mutationRate
  );
}

/**
 * Get species template by ID
 */
export function getSpeciesTemplate(speciesId: string): SpeciesTemplate | undefined {
  return SPECIES_REGISTRY[speciesId];
}

/**
 * Get all species IDs
 */
export function getAllSpeciesIds(): string[] {
  return Object.keys(SPECIES_REGISTRY);
}

/**
 * Check if two species can hybridize
 */
export function canHybridize(species1Id: string, species2Id: string): boolean {
  const template1 = getSpeciesTemplate(species1Id);
  const template2 = getSpeciesTemplate(species2Id);

  if (!template1 || !template2) return false;

  return (
    template1.compatibleSpecies.includes(species2Id) ||
    template2.compatibleSpecies.includes(species1Id)
  );
}

/**
 * Get hybrid name
 */
export function getHybridName(species1Id: string, species2Id: string): string {
  // Special hybrid names
  if ((species1Id === 'human' && species2Id === 'elf') ||
      (species1Id === 'elf' && species2Id === 'human')) {
    return 'Half-Elf';
  }

  if ((species1Id === 'human' && species2Id === 'orc') ||
      (species1Id === 'orc' && species2Id === 'human')) {
    return 'Half-Orc';
  }

  if ((species1Id === 'human' && species2Id === 'celestial') ||
      (species1Id === 'celestial' && species2Id === 'human')) {
    return 'Nephilim';
  }

  // Generic hybrid name
  const template1 = getSpeciesTemplate(species1Id);
  const template2 = getSpeciesTemplate(species2Id);

  if (template1 && template2) {
    return `${template1.commonName}-${template2.commonName} Hybrid`;
  }

  return 'Hybrid';
}
