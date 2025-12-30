import { PlantComponent, type PlantGenetics, type GeneticMutation } from '../components/PlantComponent.js';
import { SeedComponent } from '../components/SeedComponent.js';
import type { PlantCategory } from '../types/PlantSpecies.js';

/**
 * Cross-breeding compatibility rules
 * Plants can only hybridize within the same category (e.g., crop x crop)
 */
export interface HybridizationResult {
  success: boolean;
  reason?: string;
  seed?: SeedComponent;
  hybridName?: string;
}

/**
 * Hybrid vigor bonus - offspring get a boost from genetic diversity
 */
const HYBRID_VIGOR_BONUS = 0.1; // +10% to all traits

/**
 * Compatibility check for plant hybridization
 * Only plants of the same category can cross-breed
 */
export function canHybridizePlants(
  parent1Category: PlantCategory,
  parent2Category: PlantCategory
): boolean {
  return parent1Category === parent2Category;
}

/**
 * Create a hybrid seed from two parent plants
 * Combines genetics from both parents with a chance for hybrid vigor
 */
export function createHybridSeed(
  parent1: PlantComponent,
  parent2: PlantComponent,
  speciesId1: string,
  speciesId2: string,
  options?: {
    parentEntityId1?: string;
    parentEntityId2?: string;
    agentId?: string;
    gameTime?: number;
  }
): HybridizationResult {
  // REQUIRED: both parents must have genetics
  if (!parent1.genetics || !parent2.genetics) {
    return {
      success: false,
      reason: 'Both parents must have genetics for hybridization'
    };
  }

  // Calculate hybrid vigor based on genetic diversity
  const geneticDiversity = calculateGeneticDiversity(parent1.genetics, parent2.genetics);

  // Blend genetics from both parents
  const hybridGenetics = blendGenetics(
    parent1.genetics,
    parent2.genetics,
    geneticDiversity
  );

  // Calculate seed quality from both parents
  const quality = (calculateParentContribution(parent1) + calculateParentContribution(parent2)) / 2;
  const viability = Math.min(1.0, 0.85 + geneticDiversity * 0.1); // Diversity helps viability
  const vigor = Math.min(100, 80 + geneticDiversity * 20); // Hybrid vigor

  // Higher generation is max of parents + 1
  const generation = Math.max(parent1.generation, parent2.generation) + 1;

  // Create hybrid species ID
  const hybridSpeciesId = createHybridSpeciesId(speciesId1, speciesId2);

  // Build parent plant IDs array
  const parentPlantIds: string[] = [];
  if (options?.parentEntityId1) parentPlantIds.push(options.parentEntityId1);
  if (options?.parentEntityId2) parentPlantIds.push(options.parentEntityId2);

  const seed = new SeedComponent({
    speciesId: hybridSpeciesId,
    genetics: hybridGenetics,
    generation,
    viability,
    vigor,
    quality,
    sourceType: 'cultivated',
    parentPlantIds,
    isHybrid: true,
    hybridParentSpecies: [speciesId1, speciesId2],
    harvestMetadata: {
      fromPlantId: options?.parentEntityId1,
      byAgentId: options?.agentId,
      timestamp: options?.gameTime
    }
  });

  return {
    success: true,
    seed,
    hybridName: hybridSpeciesId
  };
}

/**
 * Calculate genetic diversity between two parents (0-1)
 * Higher diversity = more hybrid vigor
 */
function calculateGeneticDiversity(g1: PlantGenetics, g2: PlantGenetics): number {
  const traits = [
    'growthRate', 'yieldAmount', 'diseaseResistance',
    'droughtTolerance', 'coldTolerance', 'flavorProfile'
  ] as const;

  let totalDifference = 0;
  let traitCount = 0;

  for (const trait of traits) {
    const v1 = g1[trait] as number;
    const v2 = g2[trait] as number;

    // Normalize difference based on trait range
    let maxRange = 100;
    if (trait === 'growthRate' || trait === 'yieldAmount') {
      maxRange = 3;
    }

    const diff = Math.abs(v1 - v2) / maxRange;
    totalDifference += diff;
    traitCount++;
  }

  return totalDifference / traitCount;
}

/**
 * Blend genetics from two parents
 * Each trait has a chance to come from either parent, with some averaging
 */
function blendGenetics(
  g1: PlantGenetics,
  g2: PlantGenetics,
  diversity: number
): PlantGenetics {
  const vigorBonus = 1 + (HYBRID_VIGOR_BONUS * diversity);

  // For each trait, either:
  // - Take from parent 1 (25%)
  // - Take from parent 2 (25%)
  // - Average with hybrid vigor (50%)
  const blend = (v1: number, v2: number, trait: string): number => {
    const roll = Math.random();
    let value: number;

    if (roll < 0.25) {
      value = v1;
    } else if (roll < 0.5) {
      value = v2;
    } else {
      value = ((v1 + v2) / 2) * vigorBonus;
    }

    // Clamp based on trait type
    if (trait === 'growthRate' || trait === 'yieldAmount') {
      return Math.max(0.3, Math.min(3.5, value)); // Slightly higher max for hybrids
    }
    return Math.max(0, Math.min(100, value));
  };

  const result: PlantGenetics = {
    growthRate: blend(g1.growthRate, g2.growthRate, 'growthRate'),
    yieldAmount: blend(g1.yieldAmount, g2.yieldAmount, 'yieldAmount'),
    diseaseResistance: blend(g1.diseaseResistance, g2.diseaseResistance, 'diseaseResistance'),
    droughtTolerance: blend(g1.droughtTolerance, g2.droughtTolerance, 'droughtTolerance'),
    coldTolerance: blend(g1.coldTolerance, g2.coldTolerance, 'coldTolerance'),
    flavorProfile: blend(g1.flavorProfile, g2.flavorProfile, 'flavorProfile'),
    mutations: [...g1.mutations, ...g2.mutations]
  };

  // Record hybridization as a special mutation
  result.mutations.push({
    trait: 'hybrid',
    delta: diversity,
    generation: Math.max(
      ...g1.mutations.map(m => m.generation),
      ...g2.mutations.map(m => m.generation),
      0
    ) + 1
  } as GeneticMutation);

  return result;
}

/**
 * Create a hybrid species ID from two parent species
 */
function createHybridSpeciesId(species1: string, species2: string): string {
  // Sort alphabetically for consistent naming
  const sorted = [species1, species2].sort();
  return `hybrid_${sorted[0]}_x_${sorted[1]}`;
}

/**
 * Calculate a parent's contribution to seed quality
 */
function calculateParentContribution(parent: PlantComponent): number {
  const healthFactor = parent.health / 100;
  const careFactor = parent.careQuality / 100;
  const geneticFactor = parent.geneticQuality / 100;

  return (healthFactor + careFactor + geneticFactor) / 3;
}

/**
 * Create a seed from a parent plant with inherited genetics
 */
export function createSeedFromPlant(
  parent: PlantComponent,
  speciesId: string,
  options?: {
    parentEntityId?: string;
    agentId?: string;
    gameTime?: number;
    sourceType?: 'wild' | 'cultivated' | 'traded' | 'generated';
  }
): SeedComponent {
  // REQUIRED: parent must have genetics
  if (!parent.genetics) {
    throw new Error('Cannot create seed from plant - parent missing genetics');
  }

  // Calculate seed quality based on parent health and care
  const quality = calculateSeedQuality(parent);
  const viability = calculateViability(parent);
  const vigor = calculateVigor(parent);

  // Apply mutations to genetics
  const inheritedGenetics = applyMutations(
    parent.genetics,
    parent.generation + 1
  );

  // Build parent plant IDs array
  const parentPlantIds: string[] = [];
  if (options?.parentEntityId) {
    parentPlantIds.push(options.parentEntityId);
  }

  return new SeedComponent({
    speciesId,
    genetics: inheritedGenetics,
    generation: parent.generation + 1,
    viability,
    vigor,
    quality,
    sourceType: options?.sourceType ?? 'cultivated',
    parentPlantIds,
    harvestMetadata: {
      fromPlantId: options?.parentEntityId,
      byAgentId: options?.agentId,
      timestamp: options?.gameTime
    }
  });
}

/**
 * Calculate seed yield from a plant based on health, stage, and agent skill
 * Per spec lines 310-316
 */
export function calculateSeedYield(
  plant: PlantComponent,
  baseSeedsPerPlant: number,
  agentSkill: number = 50 // Default farming skill
): number {
  const healthMod = plant.health / 100;
  const stageMod = plant.stage === 'seeding' ? 1.5 : 1.0;
  const skillMod = 0.5 + (agentSkill / 100);

  return Math.floor(baseSeedsPerPlant * healthMod * stageMod * skillMod);
}

/**
 * Apply random mutations to genetics
 */
export function applyMutations(
  parentGenetics: PlantGenetics,
  generation: number
): PlantGenetics {
  const result: PlantGenetics = {
    growthRate: parentGenetics.growthRate,
    yieldAmount: parentGenetics.yieldAmount,
    diseaseResistance: parentGenetics.diseaseResistance,
    droughtTolerance: parentGenetics.droughtTolerance,
    coldTolerance: parentGenetics.coldTolerance,
    flavorProfile: parentGenetics.flavorProfile,
    mutations: [...parentGenetics.mutations]
  };

  // Mutation chance: 10% per trait (per spec)
  const MUTATION_CHANCE = 0.1;
  const MUTATION_MAGNITUDE = 0.1; // ±10% variation

  const traits: Array<keyof PlantGenetics> = [
    'growthRate',
    'yieldAmount',
    'diseaseResistance',
    'droughtTolerance',
    'coldTolerance',
    'flavorProfile'
  ];

  for (const trait of traits) {
    if (Math.random() < MUTATION_CHANCE) {
      const currentValue = result[trait] as number;
      const delta = (Math.random() * 2 - 1) * MUTATION_MAGNITUDE * currentValue;

      let newValue = currentValue + delta;

      // Clamp values to reasonable ranges
      if (trait === 'growthRate' || trait === 'yieldAmount') {
        newValue = Math.max(0.3, Math.min(3.0, newValue));
      } else {
        // Resistance values (0-100)
        newValue = Math.max(0, Math.min(100, newValue));
      }

      (result[trait] as number) = newValue;

      // Record mutation
      result.mutations.push({
        trait,
        delta,
        generation
      });
    }
  }

  return result;
}

/**
 * Apply genetic traits to a calculation
 * @param plant The plant with genetics
 * @param type The type of calculation ('growth', 'yield', 'hydrationDecay', 'frostDamage')
 * @param baseValue Optional base value to modify
 */
export function applyGenetics(
  plant: PlantComponent,
  type: 'growth' | 'yield' | 'hydrationDecay' | 'frostDamage',
  baseValue?: number
): number {
  // REQUIRED: plant must have genetics
  if (!plant.genetics) {
    throw new Error('Cannot apply genetics - plant missing genetics');
  }

  switch (type) {
    case 'growth':
      return plant.genetics.growthRate;

    case 'yield':
      return plant.genetics.yieldAmount;

    case 'hydrationDecay': {
      const baseDecay = baseValue ?? 15; // Default 15% per day (was 5%, too slow to notice)
      const tolerance = plant.genetics.droughtTolerance / 100;
      return baseDecay * (1 - tolerance * 0.5); // Drought tolerance reduces decay
    }

    case 'frostDamage': {
      const temperature = baseValue ?? 0;
      const tolerance = plant.genetics.coldTolerance / 100;

      // If cold tolerant enough, no damage
      if (tolerance >= 0.9) {
        return 0;
      }

      // Otherwise, damage based on temperature and tolerance
      const baseDamage = Math.abs(temperature) * 5;
      return baseDamage * (1 - tolerance);
    }

    default:
      return 1.0;
  }
}

/**
 * Check if a seed can germinate based on viability
 */
export function canGerminate(seed: SeedComponent): boolean {
  return Math.random() < seed.viability;
}

/**
 * Update seed viability based on age
 */
export function updateSeedViability(seed: SeedComponent): void {
  // Viability decreases with age
  const ageFactor = Math.max(0, 1 - seed.ageInDays / 365); // Loses viability over a year
  seed.viability = Math.max(0, seed.viability * ageFactor);
}

/**
 * Check if seed dormancy requirements are met
 */
export function checkDormancyRequirements(
  seed: SeedComponent,
  coldDaysExperienced: number = 0
): boolean {
  if (!seed.dormant) {
    return true; // Not dormant, can germinate
  }

  if (!seed.dormancyRequirements) {
    return true; // No specific requirements
  }

  const reqs = seed.dormancyRequirements;

  // Check cold stratification
  if (reqs.requiresColdStratification && reqs.coldDaysRequired) {
    if (coldDaysExperienced < reqs.coldDaysRequired) {
      return false; // Not enough cold days
    }
  }

  // All requirements met
  return true;
}

/**
 * Break seed dormancy (e.g., after stratification or scarification)
 */
export function breakDormancy(seed: SeedComponent): void {
  seed.dormant = false;
}

/**
 * Calculate seed quality based on parent plant health (0-1 range)
 */
function calculateSeedQuality(parent: PlantComponent): number {
  const healthFactor = parent.health / 100;
  const careFactor = parent.careQuality / 100;
  const geneticFactor = parent.geneticQuality / 100;

  return (healthFactor + careFactor + geneticFactor) / 3;
}

/**
 * Calculate seed viability based on parent health
 */
function calculateViability(parent: PlantComponent): number {
  const healthFactor = parent.health / 100;
  const nutritionFactor = parent.nutrition / 100;

  // Base viability is 0.8, modified by parent condition
  return Math.max(0.1, Math.min(1.0, 0.8 * (healthFactor + nutritionFactor) / 2));
}

/**
 * Calculate seed vigor based on parent quality
 */
function calculateVigor(parent: PlantComponent): number {
  const geneticFactor = parent.geneticQuality / 100;
  const environmentFactor = parent.environmentMatch / 100;

  return Math.max(10, Math.min(100, 75 * (geneticFactor + environmentFactor) / 2));
}
