import { PlantComponent, type PlantGenetics } from '../components/PlantComponent.js';
import { SeedComponent } from '../components/SeedComponent.js';

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
